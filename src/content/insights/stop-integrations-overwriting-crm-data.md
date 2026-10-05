---
title: "Field Precedence: Stop Integrations and Enrichment Overwriting CRM Data"
seoTitle: "Stop Enrichment Overwriting HubSpot Data: Field Precedence"
description: "Stop Clay, enrichment and integrations overwriting good HubSpot data: per-field source ranking, fill-if-empty, staging fields and property-history audits."
pubDate: 2026-10-05
pillar: revops
tags: ["HubSpot","Data Quality","Enrichment","Clay","Integrations"]
---

To stop Clay, enrichment tools and other integrations overwriting good CRM data, decide for each field which sources may write it and in what order of trust, then enforce that before the write reaches the CRM. Some fields are "fill if empty" only. Some let a newer value win, but only from a trusted source. Some are never written by automation at all. Anything an untrusted source sends goes into a staging field for review instead of the real one.

HubSpot's API won't do this for you: an update overwrites whatever is there. The rules have to live in your write path, and property history tells you afterwards who changed what. Designing that policy across every tool that writes to a portal is a core part of my [RevOps and CRM architecture work](/services/revops/).

## Why do integrations overwrite good data?

Because every integration assumes it is the source of truth. An enrichment run maps its job title column onto `jobtitle`, a form sync maps its phone field onto `phone`, and each one writes whatever it has. Nobody decided which one wins, so the last writer wins.

The common failure modes:

- **Blanks overwrite values.** A row with an empty enrichment column is mapped to a populated property, and the update writes the blank.
- **Worse data overwrites better data.** A rep confirmed a title on a call; a scraped profile from last year replaces it.
- **Stale data overwrites fresh data.** A batch job built from yesterday's export runs today and reverts changes made in between.
- **Nobody can tell what happened.** Without a record of which tool wrote which value, the cleanup is guesswork.

## Does HubSpot have an "only update if empty" setting?

Not on the API. The CRM object update endpoints have no conditional update, no "only if empty" flag and no version check; a PATCH replaces the value. If an integration should only fill blanks, it has to read the current value first and skip fields that already have one.

HubSpot's own **data enrichment** is different. Under **Settings → Data Management → Data Enrichment**, a Super Admin can set an overwrite rule per property: "Fill empty values only", "Fill empty values and overwrite existing values", or "Do not fill any values". A separate option, **Overwrite incorrect enrichment values**, clears enriched values when the source data turns out to be wrong; HubSpot notes that values set "manually, by workflows, or by integrations won't be overwritten" by it. Two exceptions matter: conversational enrichment and the **Enrich record** workflow action "can overwrite properties regardless of the overwrite rules configured." Those settings govern HubSpot's enrichment only, not what Clay or Zapier send through the API.

Clay's own HubSpot guide covers the blank case. Its **Update object** action has an **Ignore blank values** toggle, so an empty column skips the write instead of clearing the property, and it recommends a conditional run so the update fires only when the new value is present. The guide doesn't describe a switch for "only if the HubSpot field is empty". If you need that, look the record up first and include the current value in the run condition, or route writes through your own middleware.

## What a field precedence policy looks like

A precedence policy is one row per field: the rule, the sources trusted to write it in rank order, and where untrusted values go. Write it down before you touch any mappings.

| Field | Rule | Trusted sources (best first) | Untrusted values go to |
|---|---|---|---|
| Contact owner | Never written by automation | (people only) | Nowhere |
| Industry | Fill if empty | Any mapped source | Ignored |
| Job title | Ranked | Rep, form, enrichment | `enrichment_jobtitle` |
| Phone | Ranked | Rep, form | Ignored |
| Lifecycle stage | Ranked | Workflows only | Ignored |

Three rules cover almost every field:

1. **Never.** Owner, lifecycle overrides, anything a person decides. Automation can suggest, not write.
2. **Fill if empty.** Firmographics, LinkedIn URL, company size. Useful when blank, not worth replacing a value someone already has.
3. **Ranked, newer wins within a rank.** A higher-ranked source always overwrites a lower one. A same-rank source overwrites only if its value is newer. A lower-ranked source never overwrites.

Blank incoming values never write, under any rule.

## How to enforce it in code

Put one function between every integration and the CRM. It takes the policy, the current values with their source and timestamp, and the incoming payload, and returns the properties that are allowed through, plus a reason for every field so you can log decisions.

```javascript
// Decide which incoming values may overwrite the CRM, field by field.
// current[field] = { value, source, at } from property history or your own write log.
const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';

function applyPrecedence(policy, current, incoming, source, at) {
  const update = {};
  const reasons = {};
  for (const [field, value] of Object.entries(incoming)) {
    const rule = policy[field];
    if (!rule) { reasons[field] = 'skipped: no policy for field'; continue; }
    const cur = current[field] ?? {};
    const write = (why) => { update[field] = value; reasons[field] = `written: ${why}`; };
    const hold = (why) => {
      if (rule.staging) update[rule.staging] = value;
      reasons[field] = `${rule.staging ? 'staged' : 'skipped'}: ${why}`;
    };

    if (isBlank(value)) { reasons[field] = 'skipped: blank incoming value'; continue; }
    if (value === cur.value) { reasons[field] = 'skipped: unchanged'; continue; }
    if (rule.mode === 'never') { hold('field is protected'); continue; }

    // 'ranked' fields list trusted sources, best first; anyone else is held back
    const inRank = rule.rank ? rule.rank.indexOf(source) : 0;
    if (inRank === -1) { hold(`${source} is not trusted for ${field}`); continue; }
    if (isBlank(cur.value)) { write('field was empty'); continue; }
    if (rule.mode === 'fill_if_empty') { hold('field already has a value'); continue; }

    const curRank = rule.rank.indexOf(cur.source);
    if (curRank === -1 || inRank < curRank) { write(`${source} outranks ${cur.source}`); continue; }
    if (inRank === curRank && at > cur.at) { write('newer value from a same-rank source'); continue; }
    hold(`existing value from ${cur.source} wins`);
  }
  return { update, reasons };
}

module.exports = { applyPrecedence };
```

With a policy like this:

```javascript
const policy = {
  hubspot_owner_id: { mode: 'never' },
  industry: { mode: 'fill_if_empty' },
  jobtitle: { mode: 'ranked', rank: ['rep', 'form', 'clay'], staging: 'enrichment_jobtitle' },
  phone: { mode: 'ranked', rank: ['rep', 'form'] },
};
```

an enrichment payload of `{ industry: 'Logistics', jobtitle: 'Head of Ops', city: 'Leeds' }` against a contact with an empty industry and a rep-entered title produces `{ industry: 'Logistics', enrichment_jobtitle: 'Head of Ops' }`. The title the rep confirmed stays; the enriched one waits in the staging field; `city` has no policy, so it's dropped and logged. Fields with no policy are skipped on purpose: a new mapping should fail closed until someone decides who owns it.

Two practical notes. A value whose source you can't identify (an old import, say) ranks below every trusted source, so a trusted write replaces it. And read-before-write has a small race window; for high-volume fields, run writes for one record through a single queue so two jobs can't read the same old value at once.

## Where does the "current source" come from?

From HubSpot's property history, or from your own log of writes. HubSpot records a source for every property change. Read a record with the `propertiesWithHistory` parameter and each version comes back with `value`, `timestamp`, `sourceType`, `sourceId`, `sourceLabel` and `updatedByUserId`. Writes made by an app show `sourceType` **INTEGRATION** with the app's ID as `sourceId`.

That only helps if each writer has its own identity. If Clay, your form sync and an LLM workflow all write through the same app or token, history shows one INTEGRATION source for all of them. Give each writer its own app or key, and keep a small map from app ID to the source names in your policy (`clay`, `form`, and so on). Changes people make in the UI map to `rep`.

If you'd rather not read history on every write, keep a side table of the last write per record and field (`source`, `at`). It's cheaper, and it's the same log you'll want for auditing.

## Use staging fields for untrusted data

A staging field is a second property, such as `enrichment_jobtitle`, that holds what a lower-ranked source wanted to write. It keeps the data without letting it win.

That gives you options the overwrite never did. A view of contacts where the staging value differs from the real one becomes a review queue. A workflow can promote the staged value when the real field is still empty a week later. And you can compare sources: if enrichment titles get accepted most of the time, raise their rank. It's the same review-before-write pattern as in [LLM workflows that update the CRM](/insights/llm-workflows-update-crm-production/), where model output is the untrusted source.

## How to audit overwrites after the fact

Pull property history for the fields that matter and look for changes from INTEGRATION sources that replaced a value set by a person. That's the signature of an overwrite problem.

1. Pick the five to ten fields that drive routing, reporting or outreach.
2. For a sample of recently updated records, read those fields with `propertiesWithHistory`.
3. Flag any version where the previous value came from a user and the new one from an integration, and note the app ID.
4. Group by app ID. One or two integrations usually account for most of it.
5. Restore from history where the old value was right, then put that integration behind the precedence check.

If the portal is one you've inherited and nobody knows which apps write where, do this as part of [auditing the CRM before you rebuild it](/insights/audit-inherited-crm-before-rebuild/). Overwrites that happen silently are also one of the failure classes in [why Zapier and Make scenarios fail without telling you](/insights/zapier-make-silent-failures/). If the overwrites come from a sync between two CRMs rather than enrichment, see [two-way CRM sync without loops](/insights/two-way-crm-sync-without-loops/).

## What to do this week

- List every tool that writes to the CRM, and the properties each one maps.
- For your top ten fields, write the rule (never, fill if empty, ranked) and the trusted sources in order.
- Turn on **Ignore blank values** on every Clay update action, and add a run condition so updates fire only when there's a value.
- Check HubSpot's data enrichment overwrite rules per property, and look for workflows using **Enrich record**, which ignores them.
- Give each integration its own app or key so property history can tell them apart.
- Create staging properties for any field enrichment shouldn't overwrite directly.
- Route API writes through one precedence function, and log its reasons.

*Checked against HubSpot's developer documentation, developer changelog and knowledge base, and Clay's HubSpot guide, in October 2026. Code tested with Node 22's built-in test runner against fixtures for each rule.*

Sources: [Using object APIs (HubSpot)](https://developers.hubspot.com/docs/guides/crm/using-object-apis), [Integrations and CRM property change sources (HubSpot changelog)](https://developers.hubspot.com/changelog/bugfix-integrations-and-crm-property-change-sources), [Get a contact, 2026-03 reference (HubSpot)](https://developers.hubspot.com/docs/api-reference/2026-03/crm/objects/contacts/get-contact), [HubSpot's change sources (HubSpot KB)](https://knowledge.hubspot.com/properties/hubspots-change-sources), [Manage data enrichment settings (HubSpot KB)](https://knowledge.hubspot.com/records/manage-data-enrichment-settings), [How to mass-update HubSpot records (Clay)](https://www.clay.com/guides/how-to-mass-update-hubspot-records).
