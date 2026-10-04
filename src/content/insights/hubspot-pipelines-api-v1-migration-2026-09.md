---
title: "HubSpot Pipelines API v1 Stops on December 4: Migrating to 2026-09"
seoTitle: "HubSpot Pipelines API v1 to 2026-09 Migration"
description: "HubSpot's Pipelines API v1 stops responding on December 4, 2026. An endpoint and field map to version 2026-09, the new delete checks, and a tested adapter."
pubDate: 2026-10-04
pillar: build
tags: ["HubSpot API","Pipelines","Deals","Tickets","API Migration"]
---

HubSpot's **Pipelines API v1**, the endpoints under `/crm-pipelines/v1/pipelines/`, stops responding on **December 4, 2026**. The replacement is the date-versioned **2026-09** Pipelines API at `/crm/pipelines/2026-09/{objectType}`, generally available since September 9. The move is mostly mechanical, but the response shape changed: `pipelineId` is now `id`, `active` became `archived` (inverted), timestamps are ISO strings, and stage metadata comes back as strings. Code that reads v1 responses will break quietly rather than loudly, so it's worth knowing exactly what moved.

If you're on HubSpot's official client libraries, you're probably not calling v1: the current Node client, for example, uses `/crm/v3/pipelines`. The v3 endpoints aren't part of the December cutoff, though they go unsupported with the other numbered API versions in September 2027, so 2026-09 is still where to end up. This is the kind of integration cleanup I do as part of [custom apps and platform development](/services/build/).

## Am I calling v1?

Search your code, scripts and workflow custom code actions for:

```bash
grep -rn "crm-pipelines/v1" .
```

Anything that matches stops working on December 4. Also check scripts that run outside your main codebase: scheduled jobs, one-off sync scripts on a server, and custom code in workflows, which is easy to forget because it lives in HubSpot, not in your repository.

## Endpoint map

| v1 | 2026-09 |
| --- | --- |
| `GET /crm-pipelines/v1/pipelines/{object_type}` (list) | `GET /crm/pipelines/2026-09/{objectType}` |
| `POST /crm-pipelines/v1/pipelines/{object_type}` (create) | `POST /crm/pipelines/2026-09/{objectType}` |
| Calls for a single pipeline under `/crm-pipelines/v1/pipelines/{object_type}/...` | The same operation under `/crm/pipelines/2026-09/{objectType}/{pipelineId}` (GET, PUT, PATCH, DELETE) |

2026-09 also has endpoints for single stages (`.../{pipelineId}/stages` and `.../stages/{stageId}`, with GET, POST, PUT, PATCH and DELETE), and audit endpoints (`.../{pipelineId}/audit` and `.../stages/{stageId}/audit`) that show who changed a pipeline or stage and when. Both are worth using: changing one stage doesn't have to touch the rest of the pipeline, and the audit trail answers "who renamed this stage?" without guesswork.

v1 handled deals and tickets. 2026-09 also covers leads, appointments, courses, listings, orders, services and custom objects. `objectType` in the path can be a name like `deals` or an object type ID like `0-3`.

## Field map

| v1 | 2026-09 | Watch out for |
| --- | --- | --- |
| `pipelineId` | `id` | Rename everywhere you read it |
| `stages[].stageId` | `stages[].id` | Same |
| `active: true` | `archived: false` | Inverted; a straight rename gets it backwards |
| `default` | (none) | HubSpot's built-in deal pipeline has the ID `default` |
| `objectType: "DEAL"` | (none) | It's in the URL instead |
| `createdAt`, `updatedAt` as epoch milliseconds | ISO 8601 strings | Date math and comparisons break silently |
| `metadata.probability` as a number | a string, like `"0.2"` | `"0.2" > 0.1` works in JavaScript by coercion; `"0.2" + 0.1` doesn't |

When you write, the rules are the same as before: `label`, `displayOrder` and `stages` for a pipeline; `label`, `displayOrder` and `metadata` for a stage. Deal stages need a `probability` between 0 and 1, and ticket stages take a `ticketState` of `OPEN` or `CLOSED`. Stage labels must be unique within a pipeline. Deals, tickets and custom objects allow up to 100 stages per pipeline; the other objects allow 30.

## The change that can stop a cleanup script: delete checks

In 2026-09, HubSpot [checks references before it deletes](https://developers.hubspot.com/changelog/pipeline-stage-validation-true) a pipeline or a stage. By default, a delete is **refused** if records are still in that pipeline or stage, or something else refers to it, and the error lists the stage IDs and record IDs involved.

That's a sensible default, and it will break any script that deleted stages and expected the records to sort themselves out. You can turn the check off with `validateDealStageUsagesBeforeDelete=false` for deals, or `validateReferencesBeforeDelete=false` for other objects, but the better fix is usually to move the records first and then delete. If your script deletes stages at all, test that path against 2026-09 before December.

## Switch the endpoint first, refactor later

If a lot of code reads v1-shaped pipelines, you don't have to rewrite it all before the deadline. Point the request at 2026-09 and reshape the response at the edge:

```javascript
// Reshape a 2026-09 pipeline into the v1 shape older code expects, so you can switch the
// endpoint first and refactor the rest later.
function toV1Pipeline(p, objectType) {
  const ms = (iso) => (iso ? Date.parse(iso) : null);
  return {
    pipelineId: p.id,
    objectType, // v1 returned "DEAL" or "TICKET"; 2026-09 only has it in the URL
    label: p.label,
    displayOrder: p.displayOrder,
    active: !p.archived,
    default: p.id === 'default', // v1's flag; HubSpot's built-in pipeline has the id "default"
    createdAt: ms(p.createdAt),
    updatedAt: ms(p.updatedAt),
    stages: p.stages.map((s) => ({
      stageId: s.id,
      label: s.label,
      displayOrder: s.displayOrder,
      active: !s.archived,
      createdAt: ms(s.createdAt),
      updatedAt: ms(s.updatedAt),
      // 2026-09 returns every metadata value as a string.
      metadata: Object.fromEntries(
        Object.entries(s.metadata ?? {}).map(([k, v]) => [k, k === 'probability' ? Number(v) : v]),
      ),
    })),
  };
}
module.exports = { toV1Pipeline };
```

Use it where you used to call v1:

```javascript
const res = await fetch('https://api.hubapi.com/crm/pipelines/2026-09/deals', {
  headers: { Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}` },
});
if (!res.ok) throw new Error(`Pipelines request failed: ${res.status}`);
const { results } = await res.json();
const pipelines = results.map((p) => toV1Pipeline(p, 'DEAL'));
```

Treat it as a bridge. Once the endpoint switch is live, move the rest of the code to the new field names and delete the adapter, so you aren't carrying two shapes forever.

## A short checklist

1. Find every `crm-pipelines/v1` call, including workflow custom code and scheduled scripts.
2. Switch the endpoints, using the adapter if the codebase is large.
3. Fix the inverted `active`/`archived` logic and any date or probability math.
4. Test anything that deletes stages or pipelines against the new delete checks.
5. Deploy before December 4, then move from the adapter to the new field names when you can.

If you're doing this, it's also the moment to check what else the integration calls. The rest of the numbered v1–v3 APIs go unsupported in September 2027, and an integration that touches pipelines usually touches deals, owners and properties too.

*Checked against HubSpot's developer changelog and API reference in October 2026. The adapter is tested against sample 2026-09 responses.*

Sources: [Pipelines API v1 sunset](https://developers.hubspot.com/changelog/pipelines-api-v1-sunset), [Pipelines API (2026-09)](https://developers.hubspot.com/docs/api-reference/latest/crm/pipelines/guide), [Legacy Pipelines v1: create a pipeline](https://br.developers.hubspot.com/docs/api-reference/legacy/crm/pipelines/v1/create-pipeline), [Legacy APIs and apps: what's going unsupported and when](https://developers.hubspot.com/changelog/legacy-apis-and-legacy-apps-whats-going-unsupported-and-when), [Delete validation in 2026-09](https://developers.hubspot.com/changelog/pipeline-stage-validation-true).
