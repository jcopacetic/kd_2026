---
title: "Production LLM Workflows That Update Your CRM (Without Wrecking It)"
seoTitle: "LLM Workflows That Update Your CRM Safely in Production"
description: "How to use OpenAI or Claude to extract structured data into HubSpot: schema output, validation, confidence thresholds, guarded upserts and an audit trail."
pubDate: 2026-10-05
pillar: ai-crm
tags: ["AI","HubSpot API","Structured Outputs","Data Quality","Automation"]
---

To let an LLM update your CRM safely, don't let the model write to the CRM. Have it return JSON that a schema enforces. Validate that JSON in your own code, then decide field by field what's allowed to change: fill blanks, never overwrite a value a person set, and send low-confidence answers to a review queue. Only then upsert by a unique key and log every write so you can trace and undo it.

The model is the easy part. The layer around it, which turns a guess into a safe write, is where these projects succeed or fail, and it's most of the [AI in the CRM work](/services/ai-crm/) I do. Below is the full pipeline, with tested code for the step most builds skip.

## What does the pipeline look like?

It has nine stages, and each one exists because skipping it breaks something specific.

| Stage | What it does | What breaks without it |
|---|---|---|
| 1. Trigger | Form fill, inbound email, new record, call transcript | Nothing runs, or it runs twice |
| 2. Extract | Model returns JSON constrained by a schema | Free text you have to parse with regex |
| 3. Validate | Check stop reason, parse, check ranges and options | A refusal or truncated reply reaches the CRM |
| 4. Confidence gate | Below a threshold, don't write | Confident-sounding guesses become "data" |
| 5. Guarded write | Read the record, compare, write only allowed fields | AI overwrites what a rep typed yesterday |
| 6. Upsert by unique key | Create or update in one call, matched on a unique property | Duplicates on every retry |
| 7. Review queue | Low-confidence or invalid answers go to a person | They're silently dropped or silently written |
| 8. Audit trail | Every change is attributable to the AI's own app | Nobody can tell what the AI changed |
| 9. Alert on failure | A failed run notifies someone | It stops working and no one notices for a month |

Stages 2, 3 and 5 decide whether you can trust the result.

## How do you get consistent JSON out of OpenAI or Claude?

Use the provider's schema-enforced output mode, not a prompt that says "respond in JSON". Both major APIs now constrain generation to a JSON Schema you supply.

- **Anthropic (Claude):** structured outputs are generally available through `output_config.format` with `type: "json_schema"`. The older `output_format` parameter and its beta header are deprecated. The JSON comes back in the first text content block.
- **OpenAI:** Structured Outputs with `strict: true`. In the Responses API it's `text.format` with `type: "json_schema"`, a `name` and the `schema`. Every object needs `additionalProperties: false` and every field must be listed in `required`. Make a field optional with a null union instead of leaving it out of `required`.

Here's the shape for Claude, for one field. Each field carries its own value and a confidence, and `null` means "I don't know":

```json
{
  "output_config": {
    "format": {
      "type": "json_schema",
      "schema": {
        "type": "object",
        "properties": {
          "lead_category": {
            "type": "object",
            "properties": {
              "value": { "anyOf": [
                { "type": "string", "enum": ["partner", "customer_prospect", "vendor", "spam"] },
                { "type": "null" } ] },
              "confidence": { "type": "number" }
            },
            "required": ["value", "confidence"],
            "additionalProperties": false
          }
        },
        "required": ["lead_category"],
        "additionalProperties": false
      }
    }
  }
}
```

Put your CRM's actual dropdown options in the `enum`. If the model can only answer with valid internal values, you skip a whole class of failed writes.

Two caveats matter. First, neither API supports all of JSON Schema. Anthropic documents that numeric constraints like `minimum` and `maximum` and string length limits aren't supported, so "confidence between 0 and 1" can't be enforced by the schema. Second, the guarantee has gaps: on Claude, a `refusal` or `max_tokens` stop reason can return output that doesn't match the schema, and OpenAI returns refusals as a separate `refusal` item. A model's self-reported confidence also isn't calibrated. Treat it as a routing signal you tune against real data, not a probability.

## Why validate output that's already schema-enforced?

The schema controls shape. It doesn't cover refusals, truncation, out-of-range numbers or your business rules. Run a validator on every response before anything touches the CRM:

```javascript
// Run on every model response before planUpdate. Schema-enforced output still
// fails on refusals and truncation, and the schema can't enforce 0-1 ranges.
function parseExtraction(stopReason, text, props) {
  if (stopReason !== 'end_turn') throw new Error(`unusable response: ${stopReason}`);
  const data = JSON.parse(text);
  for (const prop of props) {
    const f = data[prop];
    if (!f || typeof f.confidence !== 'number' || f.confidence < 0 || f.confidence > 1) {
      throw new Error(`bad or missing field: ${prop}`);
    }
  }
  return data;
}
module.exports = { parseExtraction };
```

A thrown error here should go to the failure path (stage 9), not a silent retry loop.

## How do you stop the AI from overwriting good CRM data?

Read the record, compare, then write only what your rules allow. HubSpot has no native "only update if empty" option: the objects API has no conditional update, so any value you send replaces the stored one. The guard has to live in your own code.

HubSpot gives you what you need to build it. Request the record with `propertiesWithHistory` and each change comes back with a `sourceType`. `CRM_UI` means a person changed it in HubSpot. `INTEGRATION` means a connected app did, with the app's ID as `sourceId`. That lets you write rules like "the AI may replace its own earlier answer, but never one a rep typed."

This function takes the validated extraction, the record's history and a per-property policy, and returns three lists: what to write, what needs a human, and what to leave alone.

```javascript
// Decide what an LLM extraction is allowed to write to one CRM record.
// extraction: validated model output, e.g. { industry: { value, confidence }, ... }
// history: HubSpot propertiesWithHistory for the record, keyed by property name
// rules: per-property policy, e.g. { industry: { mode: 'fill-if-empty', options: [...] } }
function planUpdate(extraction, history, rules, { minConfidence = 0.8, trusted = ['CRM_UI'] } = {}) {
  const update = {}, review = [], skipped = [];
  for (const [prop, rule] of Object.entries(rules)) {
    const proposed = extraction[prop];
    if (!proposed || proposed.value === null) continue;            // model had nothing to say
    const { value, confidence } = proposed;
    const latest = [...(history[prop] ?? [])]
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
    const current = latest?.value ?? '';

    if (rule.options && !rule.options.includes(value)) {
      review.push({ prop, value, reason: 'not a valid option' });
    } else if (String(current) === String(value)) {
      skipped.push({ prop, reason: 'already set to this value' });
    } else if (current !== '' && rule.mode === 'fill-if-empty') {
      skipped.push({ prop, reason: 'has a value; fill-if-empty' });
    } else if (current !== '' && trusted.includes(latest.sourceType)) {
      skipped.push({ prop, reason: `last set by trusted source ${latest.sourceType}` });
    } else if (confidence < minConfidence) {
      review.push({ prop, value, current, reason: `confidence ${confidence} < ${minConfidence}` });
    } else {
      update[prop] = value;
    }
  }
  return { update, review, skipped };
}
module.exports = { planUpdate };
```

A few design choices are deliberate:

- **`null` never clears a field.** "The model doesn't know" is different from "the value is empty".
- **Order matters.** Invalid options go to review even at 0.99 confidence. Protected fields are skipped before confidence is checked, so a person's value never ends up in a review queue just because the model disagrees with it.
- **Same value means no write.** A retried run produces an empty update, which keeps retries idempotent and property history clean.
- **Trusted sources are configurable.** If a billing system is your source of truth for company size, add a check on its app ID next to `CRM_UI`.

The same rules carry over to Clay, enrichment tools and form syncs. [Field precedence across integrations](/insights/stop-integrations-overwriting-crm-data/) covers that side.

## How do you write the result without creating duplicates?

Use batch upsert keyed on a unique property. On HubSpot's current API that's `POST /crm/objects/2026-09/{objectType}/batch/upsert`, up to 100 inputs per call. Each input names the unique property and its value. Existing records are updated, missing ones are created:

```json
{ "inputs": [ { "id": "jane@example.com", "idProperty": "email", "properties": { "lead_category": "customer_prospect" } } ] }
```

Use `email` for contacts or a custom unique-value property for other objects. HubSpot notes that partial upserts aren't supported when `email` is the `idProperty` for contacts. A retry of the same input lands on the same record instead of creating a second one.

Upsert handles duplicate records. It doesn't handle duplicate side effects, like a second Slack alert or a second task for the rep. Key each run on the trigger's own ID (the form submission, email message or transcript ID) and record that the run finished, so a webhook delivered twice is processed once. On the 2026-09 API, account validation rules also apply to writes, so [read the 400 errors properly](/insights/hubspot-api-400-validation-error-2026-09/) rather than retrying them.

## What happens to low-confidence answers?

They go to a person, with context, in a place that person already works. That can be a HubSpot task on the record, a view filtered on a "needs AI review" property, or a Slack message with approve and reject buttons that write back through the same guarded path. Include the proposed value, the current value, the confidence and the source text the model read. A reviewer who has to open three tabs to decide will stop reviewing.

Track how often reviewers accept each field's suggestions. That's how you tune `minConfidence` per field instead of guessing.

## How do you audit what the AI changed?

Give each AI workflow its own HubSpot app and token. Every write then shows in property history as source type `INTEGRATION` with that app's ID, so you can answer "what did the classifier change last week" and reverse it if a prompt change goes wrong. If several automations share one token, you lose that. The same logic applies to Claude writing through HubSpot's connector, covered in [connecting Claude to HubSpot with write access](/insights/connect-claude-to-hubspot-write-access/).

Store your own log next to it: input ID, model and prompt version, raw response, the `update`, `review` and `skipped` lists, and the HubSpot response. When a rep asks why a field changed, that log is the answer.

## How do you know when it breaks?

Alert on failure, and alert on silence. A thrown validation error, a 4xx from HubSpot or a provider outage should notify a named person with the record and reason. A workflow that normally processes 50 leads a day and processed none today should also alert, because the most common failure is the one that throws nothing. [Silent failures in Zapier and Make](/insights/zapier-make-silent-failures/) covers the patterns.

## What to do before this goes live

1. List every property the AI may touch, and set a mode for each: fill-if-empty, overwrite-unless-a-person-set-it, or never.
2. Put the CRM's real dropdown values into the schema's `enum`.
3. Reject any response whose stop reason isn't a normal finish.
4. Read `propertiesWithHistory` before every write and run it through a guard like `planUpdate`.
5. Upsert on a unique property and dedupe runs on the trigger's ID.
6. Create a dedicated app for the workflow so its writes are attributable.
7. Run it in review-only mode for a week, compare the suggestions with what people chose, then set per-field thresholds.
8. Set up alerts for errors and for zero volume.

*Checked against Anthropic's structured outputs documentation, OpenAI's Structured Outputs guide, and HubSpot's CRM objects API reference, change sources documentation and developer changelog in October 2026. Code tested with Node 22 against fixture records and mocked model responses (refusal, truncation, out-of-range confidence, invalid option, retries).*

Sources: [Structured outputs (Anthropic)](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Structured Outputs (OpenAI)](https://developers.openai.com/api/docs/guides/structured-outputs), [Using object APIs (HubSpot)](https://developers.hubspot.com/docs/guides/crm/using-object-apis), [Batch upsert objects (HubSpot)](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/objects/batch/upsert-objects), [Integrations and CRM property change sources (HubSpot changelog)](https://developers.hubspot.com/changelog/bugfix-integrations-and-crm-property-change-sources), [August 2022 developer updates: CRM_UI source (HubSpot changelog)](https://developers.hubspot.com/changelog/august-2022-developer-updates), [HubSpot's change sources (HubSpot KB)](https://knowledge.hubspot.com/properties/hubspots-change-sources).
