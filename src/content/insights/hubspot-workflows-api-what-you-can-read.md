---
title: "Auditing HubSpot Workflows Through the API: What You Can and Can't Read"
seoTitle: "HubSpot Workflows API: What You Can and Can't Read"
description: "Why the HubSpot workflows API seems to return one branch, where branch conditions live now, the 'Flow must be accessible' 403, and rules for audit tools."
pubDate: 2026-10-05
pillar: build
tags: ["HubSpot API","Workflows","Automation API","CRM Audit","Integrations"]
---

If the HubSpot workflows API only returns one branch, you're almost certainly calling the old v3 endpoint, `/automation/v3/workflows/{id}`. Developers have reported for years that it returns only the first path of a branched workflow. Use the flows API instead (`/automation/v4/flows/{flowId}`, or its date-versioned beta at `/automation/v4/2027-03-beta/flows/{flowId}`). HubSpot's current schema for it models every branch as an action with its full filter conditions, and you can write them back through the same schema.

That fixes branches. It doesn't make workflows fully auditable: some flows are reported to be hidden behind a 403, property history can't tell you which workflow made a change, and per-workflow performance data has no dated replacement. Below is what you can read, where, and how to build an audit tool that doesn't lie when it can't. Workflow audits and the tooling behind them are part of the [custom apps and platform work](/services/build/) I do.

## Why does the workflows API only return one branch?

Because v3 predates branching as HubSpot builds it now. Community threads describe `GET /automation/v3/workflows/{id}` returning a `BRANCH` action with one path of `acceptActions` and `rejectActions` while other branches are missing. HubSpot's docs don't describe this behaviour, so treat it as reported rather than specified. There's no fix for it in v3 either way, and v3 goes unsupported in September 2027.

Move the read to the flows API. The v4 path stops being supported on **March 30, 2027** and the dated replacement is still in beta, which I cover separately in [what to do about the Automation API v4 deadline](/insights/hubspot-automation-api-v4-sunset-2027/).

## Where are the branch conditions in the current API?

In the `actions` array of a single flow. The beta schema defines three branch action types:

| `type` | Where the logic lives | What it means |
|---|---|---|
| `LIST_BRANCH` | `listBranches[].filterBranch`, plus `defaultBranch` | If/then branches built from filters, with AND/OR nesting |
| `STATIC_BRANCH` | `inputValue` plus `staticBranches[].branchValue` | Branch on one property's value |
| `AB_TEST_BRANCH` | `testBranches[].percentage` | Random split by percentage |

Each branch has a `connection` with the `nextActionId` it leads to, so you can walk the whole graph from `startActionId`.

A `LIST_BRANCH` branch looks like this (the shape is from HubSpot's schema; the values are mine):

```json
{
  "branchName": "UK companies",
  "connection": { "edgeType": "STANDARD", "nextActionId": "2" },
  "filterBranch": {
    "filterBranchType": "OR", "filterBranchOperator": "OR", "filters": [],
    "filterBranches": [{
      "filterBranchType": "AND", "filterBranchOperator": "AND", "filterBranches": [],
      "filters": [{
        "filterType": "PROPERTY", "property": "country",
        "operation": { "operationType": "STRING", "operator": "IS_EQUAL_TO",
                       "value": "United Kingdom", "includeObjectsWithNoValueSet": false }
      }]
    }]
  }
}
```

HubSpot's action reference says each `filterBranch` "is configured using the syntax and formatting outlined in the list filters documentation." So the operators are list-filter operators: for strings, `IS_EQUAL_TO`, `IS_NOT_EQUAL_TO`, `CONTAINS`, `DOES_NOT_CONTAIN`, `STARTS_WITH`, `ENDS_WITH`, `HAS_EVER_BEEN_EQUAL_TO`, `HAS_NEVER_BEEN_EQUAL_TO`, `HAS_EVER_CONTAINED` and `HAS_NEVER_CONTAINED`. A community answer on the most-viewed thread about this lists `EQ` and `CONTAINS_STRING`; those aren't list-filter operators (`EQ` is CRM search syntax), so don't build a parser around them. The workflow schema types `operator` as a free string with no enum, so log any value you don't recognise rather than failing.

Filter branches nest. List filters start with a root `OR` containing `AND` groups, and the branch types the schema allows are `OR`, `AND`, `NOT_ALL`, `NOT_ANY`, `RESTRICTED`, `UNIFIED_EVENTS` and `ASSOCIATION`.

## Can you write branches through the API?

Yes. The create (`POST /flows`) and update (`PUT /flows/{flowId}`) request schemas include the same branch actions and filter types. Two rules from HubSpot's guide matter for anyone editing flows programmatically:

- **`PUT` replaces the whole flow.** Anything you don't send is removed, including actions. Always start from a fresh `GET`.
- **Send the current `revisionId`** and the `type`, and drop `createdAt`, `updatedAt` and `dataSources` from the `GET` body to avoid validation errors.

## What does "Flow must be accessible via external APIs" mean?

HubSpot doesn't say. The message isn't in its docs, and the only documented restriction is about sensitive data. Developers have reported this exact error on `GET /automation/v4/flows/{flowId}`:

```text
403 Access denied. Flow must be accessible via external APIs and contain no sensitive properties unless appropriate sensitive data scopes are provided.
```

In the same reports, `POST /flows/batch/read` returns `207` with `FLOW_NOT_FOUND_BY_FLOW_ID` for those flows, and `GET /flows` returns `200` but leaves them out. One report describes it on flows with an "Edit record" action that only touched ordinary properties, on both the v4 and beta paths, from an OAuth app. None of that is documented, and the cause hasn't been confirmed.

What HubSpot does document (in a March 2025 changelog and the Workflows API guide): reading flows that reference sensitive data needs `crm.objects.{contacts|companies|deals|custom}.sensitive.read`, changing them needs the matching `.sensitive.write`, this applies to every version of the Workflows API, and automation doesn't support data marked as highly sensitive at all.

If you hit it: check whether the flow touches sensitive properties and whether your app has the sensitive scopes, record the flow as **unreadable** (not missing, not empty), and send HubSpot the `correlationId` from the error body.

## Can you tell which workflow changed a property?

Not through any documented field. Property history entries carry `value`, `timestamp`, `sourceType`, `sourceId`, `sourceLabel` and `updatedByUserId`. None is a workflow ID. Developers report that workflow writes show `sourceType` `AUTOMATION_PLATFORM` with a `sourceId` made of an enrollment ID and an action index, and no public endpoint maps an enrollment back to a flow. The beta's `workflow-id-mappings` endpoint maps v3 workflow IDs to flow IDs, which is a different problem.

## What you can read, and where

| What you want | Where to read it | Caveat |
|---|---|---|
| Inventory of workflows | `GET /flows` (v4 or beta) | Key fields only (`id`, `isEnabled`, `objectTypeId`, `revisionId`); `name` isn't required. Reportedly omits some flows. |
| Full definition | `GET /flows/{flowId}`, `POST /flows/batch/read` | HubSpot warns that actions with incomplete required fields can cause errors |
| Branch conditions | `LIST_BRANCH`, `STATIC_BRANCH`, `AB_TEST_BRANCH` actions | v3 reportedly returns one path only |
| Enrollment triggers | `enrollmentCriteria` on the flow | Same list-filter syntax |
| Revisions | `GET /flows/{flowId}/revisions/{revisionId}` (beta) | Beta |
| Action definitions | `GET /action-types` (beta) | Compare against what each action returns |
| v3 to flow ID mapping | `POST /workflow-id-mappings/batch/read` (beta) | Beta |
| Per-workflow performance | No dated endpoint | v4 ends March 30, 2027 |
| Which workflow wrote a value | Nowhere | Property history has no workflow ID |
| Flows with sensitive data | Needs `sensitive.read` scopes | Highly sensitive data isn't supported |

The GA date versions, 2026-03 and 2026-09, have no workflow endpoints at all.

## A tested branch walker

Here's a function that walks a flow's actions and lists every branch with its condition and the action it leads to. I tested it with Node's built-in test runner against a fixture built from the beta schema: a `LIST_BRANCH` with a root `OR` of `AND` groups, a `STATIC_BRANCH` on lifecycle stage, an A/B split, a `NOT_ANY` group with a non-property filter, and a branch whose `filterBranch` key is missing.

```javascript
// branches.js: list every branch in a flow and the condition that sends records down it.
const UNKNOWN = 'UNKNOWN (key missing from response)';

function describeBranches(flow) {
  if (!Array.isArray(flow.actions)) return null; // unknown, not "no branches"
  const rows = [];
  for (const a of flow.actions) {
    const row = (branch, condition, next) => rows.push({ actionId: a.actionId, kind: a.type, branch, condition, next });
    if (a.type === 'LIST_BRANCH') {
      for (const b of a.listBranches ?? []) {
        const cond = 'filterBranch' in b ? describeFilterBranch(b.filterBranch) : UNKNOWN;
        row(b.branchName ?? null, cond, b.connection?.nextActionId ?? null);
      }
      if (a.defaultBranch) row(a.defaultBranchName ?? null, 'none of the above', a.defaultBranch.nextActionId);
    } else if (a.type === 'STATIC_BRANCH') {
      const input = 'inputValue' in a ? describeValue(a.inputValue) : UNKNOWN;
      for (const b of a.staticBranches ?? []) {
        row(b.branchValue, `${input} = ${JSON.stringify(b.branchValue)}`, b.connection?.nextActionId ?? null);
      }
      if (a.defaultBranch) row(a.defaultBranchName ?? null, 'no value matched', a.defaultBranch.nextActionId);
    } else if (a.type === 'AB_TEST_BRANCH') {
      for (const b of a.testBranches ?? []) {
        row(null, b.percentage == null ? UNKNOWN : `${b.percentage}% split`, b.connection?.nextActionId ?? null);
      }
    }
  }
  return rows;
}

function describeFilterBranch(fb) {
  if (!fb || typeof fb !== 'object') return UNKNOWN;
  const parts = [
    ...(fb.filters ?? []).map(describeFilter),
    ...(fb.filterBranches ?? []).map(describeFilterBranch),
  ];
  const type = fb.filterBranchType ?? 'UNKNOWN_TYPE';
  if ((type === 'AND' || type === 'OR') && parts.length === 1) return parts[0];
  if (type === 'AND' || type === 'OR') return `(${parts.join(` ${type} `)})`;
  return `${type}(${parts.join(', ')})`; // NOT_ALL, NOT_ANY, ASSOCIATION, UNIFIED_EVENTS...
}

function describeFilter(f) {
  if (f.filterType !== 'PROPERTY') return `[${f.filterType ?? 'UNKNOWN'} filter]`;
  const op = f.operation ?? {};
  const value = 'value' in op ? JSON.stringify(op.value) : 'values' in op ? JSON.stringify(op.values) : '';
  return `${f.property} ${op.operator ?? '?'} ${value}`.trim();
}

function describeValue(v) {
  if (v?.type === 'OBJECT_PROPERTY') return v.propertyName;
  if (v?.type === 'STATIC_VALUE') return JSON.stringify(v.staticValue);
  return `[${v?.type ?? 'UNKNOWN'} value]`;
}

module.exports = { describeBranches };
```

For a list branch with country and email filters, it returns `(country IS_EQUAL_TO "United Kingdom" AND email DOES_NOT_CONTAIN "gmail.com")`. Note what it does with gaps: a missing `filterBranch` prints `UNKNOWN`, and a flow with no `actions` key returns `null` rather than an empty list. That's the first rule below.

## Defensive rules for audit tools

**An absent key means "unknown", not "empty".** In September 2026 developers reported that internal-notification actions stopped returning `user_ids` (the key was gone, not an empty list) while notifications kept being delivered. HubSpot fixed it, per the community thread. An audit tool that read the gap as "no recipients" would have flagged working workflows as broken. Compare each action against its definition from `/action-types` and record missing fields as missing.

**A list endpoint isn't a complete inventory.** If `GET /flows` can leave flows out, a workflow that isn't in your results may still be running. Keep every flow ID you've ever seen, re-read known IDs with batch read, and label the inventory "as returned by the API on this date".

**Keep raw responses.** Store the full JSON with `revisionId` and a timestamp. When HubSpot fixes a bug or a new version renames a field, you can re-derive your report without guessing what the old one meant. This is the same quiet shape-change problem I mapped for the [Pipelines API v1 move to 2026-09](/insights/hubspot-pipelines-api-v1-migration-2026-09/).

**Separate "couldn't read" from "nothing there".** A 403, a 207 with `FLOW_NOT_FOUND_BY_FLOW_ID`, and a flow with zero branches are three different rows in your report.

## Before you trust a workflow audit

- [ ] Reads use `/automation/v4/flows`, not v3, and the base path lives in one place.
- [ ] The app has the `automation` scope, plus `sensitive.read` scopes if flows touch sensitive data.
- [ ] Every flow ID ever seen is kept and re-read, not just today's list.
- [ ] Missing keys, 403s and `FLOW_NOT_FOUND_BY_FLOW_ID` are recorded as unreadable.
- [ ] Raw responses are stored with `revisionId` and a timestamp.
- [ ] Nobody switches a workflow off based on data marked unknown.

If this is part of taking over a portal someone else built, workflows are one piece of a bigger job: here's how I approach [auditing an inherited CRM before rebuilding it](/insights/audit-inherited-crm-before-rebuild/), and the full list of 2027 deadlines is in the [API sunset checklist](/insights/hubspot-api-sunset-2027-migration-checklist/).

*Checked against HubSpot's Workflows API (BETA) reference and OpenAPI specs, the action and enrollment reference, the list filters reference, the CRM objects reference and the developer changelog in October 2026. Code tested on Node 22 with node:test against a fixture built from the 2027-03-beta schema.*

Sources: [Workflows API (BETA), 2027-03-beta](https://developers.hubspot.com/docs/api-reference/2027-03-beta/automation/workflows/guide), [Retrieve a workflow (2027-03-beta)](https://developers.hubspot.com/docs/api-reference/2027-03-beta/automation/workflows/get-workflow), [Create a workflow (2027-03-beta)](https://developers.hubspot.com/docs/api-reference/2027-03-beta/automation/workflows/create-workflow), [Retrieve a list of automation flows (2027-03-beta)](https://developers.hubspot.com/docs/api-reference/2027-03-beta/automation/workflows/get-workflows), [Get action types (2027-03-beta)](https://developers.hubspot.com/docs/api-reference/2027-03-beta/automation/workflows/action-types/get-action-types), [Action and enrollment types reference](https://developers.hubspot.com/docs/api-reference/legacy/automation/workflows/action-enrollment-reference), [List filters](https://developers.hubspot.com/docs/api-reference/legacy/crm/lists/list-filters), [Bugfix: Workflows API and sensitive data access](https://developers.hubspot.com/changelog/bugfix-workflows-api-and-sensitive-data-access), [CRM objects 2026-03: property history fields](https://developers.hubspot.com/docs/api-reference/2026-03/crm/objects/contacts/get-contact), [Deprecating support for HubSpot v4 APIs](https://developers.hubspot.com/changelog/deprecating-support-for-hubspot-v4-apis), [Legacy APIs and legacy apps: what's going unsupported and when](https://developers.hubspot.com/changelog/legacy-apis-and-legacy-apps-whats-going-unsupported-and-when).
