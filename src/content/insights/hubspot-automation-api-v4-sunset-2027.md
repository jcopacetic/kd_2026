---
title: "HubSpot Automation API v4 Ends March 30, 2027: What to Do Now"
seoTitle: "HubSpot Automation API v4 Sunset, March 2027: What to Do"
description: "HubSpot's Automation v4 API goes unsupported March 30, 2027, and the workflows replacement is still beta. What to do now, what to wait for, a tested adapter."
pubDate: 2026-10-05
pillar: build
tags: ["HubSpot API","Workflows","Automation API","API Migration","Integrations"]
---

HubSpot's v4 APIs, including the Automation v4 endpoints under `/automation/v4/flows`, move to an unsupported state on **March 30, 2027**. The awkward part: neither generally available dated version (**2026-03** or **2026-09**) has any workflow endpoints yet. Workflows exist only as a **beta**, at `/automation/v4/2027-03-beta/flows`, and one thing integrations rely on, per-workflow performance data, has no dated successor at all.

So the right move today isn't a migration. It's putting every workflow call behind one adapter, so that when a GA version ships, the swap is one file and a test run. If you have audit tools, dashboards or sync jobs reading workflows and want a second pair of hands on that, it's the kind of [platform migration work](/services/build/) I do.

## What exactly ends on March 30, 2027?

Support for every v4 API, Automation included. HubSpot's changelog says that on that date "HubSpot v4 APIs will move to an unsupported state", and that unsupported versions "may continue to function for some period of time, but they are not guaranteed to remain stable or available." Treat March 30 as the last day you can count on.

This is one deadline in a series. The v1 to v3 APIs, legacy public apps and legacy private apps go unsupported in **September 2027** (HubSpot hasn't given a day). I keep the full list, with a post for each, in the [2027 API sunset checklist](/insights/hubspot-api-sunset-2027-migration-checklist/). The pattern is the same as the [Pipelines API v1 move to 2026-09](/insights/hubspot-pipelines-api-v1-migration-2026-09/), except that this time the destination isn't finished.

## Where is the replacement?

Only in beta, for now. Here's what HubSpot publishes for automation as of October 2026:

| Version | Status | Workflows (`flows`)? | What it does have |
|---|---|---|---|
| `/automation/v4/` | Legacy, unsupported from Mar 30, 2027 | Yes | Flows, batch read, custom actions |
| `2026-03` | GA | No | Sequences, custom workflow action definitions |
| `2026-09` | GA ("latest") | No | Sequences, custom workflow actions, email templates |
| `2026-09-beta` / `2027-03-beta` | Beta | Yes | Flows, batch read, revisions, email campaigns, action types, v3-to-v4 ID mappings |

Two details trip people up. First, the beta paths keep the `v4` segment: it's `/automation/v4/2027-03-beta/flows`, not `/automation/2027-03-beta/flows`. Second, the `2026-09-beta` doc pages now redirect to `2027-03-beta`, and the spec publishes each endpoint under both beta paths.

HubSpot's v4 deprecation notice recommends moving to version 2026-03, which doesn't contain workflows. Its September changelog is more candid: "Not all legacy replacement paths are finalized yet. The March 2027 DBV release will include full per-endpoint replacement documentation for every legacy API."

## Should you move to the beta now?

Not as your production path. HubSpot's own advice for the 2027 migrations is "Migrate directly from any legacy version to date-based versioning (DBV). Do not use v3 or v4 as an intermediate step." A beta isn't a stable target either: the docs say it is "subject to change based on testing and feedback", and you agree to HubSpot's Developer Beta Terms by using it.

Use the beta for what it's good at:

- **Testing your mapping.** Point a staging copy of your code at the beta and check your parsing still holds.
- **Using what the beta documents.** It includes a revisions endpoint and a `workflow-id-mappings` batch read that maps old v3 workflow IDs to flow IDs, useful if you still store v3 IDs anywhere.
- **Spotting gaps early.** If something you call has no beta equivalent, you want to know now, not on March 29.

One more reason not to leave v4 calls lying around: from September 15, 2026, HubSpot flags apps that use APIs becoming unsupported, and "detection checks API calls at runtime, not your source code." A forgotten cron job keeps the warning on even after the main codebase moves.

## What has no replacement yet?

Per-workflow performance data. Some audit tools read enrollment volume from `GET /automation/v4/flows/performance/{flowId}`, an endpoint HubSpot doesn't document even in its v4 reference. Nothing equivalent exists under either beta path. HubSpot's migration guide covers this case in one line: "If you can't locate an equivalent endpoint for a legacy API you're using, it may not yet be available."

The obvious fallback doesn't work either. Property history on a record carries `sourceType`, `sourceId`, `sourceLabel`, `updatedByUserId`, `value` and `timestamp`, and none of those is a workflow ID. Developers report that workflow writes show an enrollment and action index in `sourceId`, and no public endpoint maps that back to a flow. (I go through what the workflows API can and can't read, field by field, in [auditing HubSpot workflows through the API](/insights/hubspot-workflows-api-what-you-can-read/).)

The practical consequence: after March 30, a "dead workflow" report may have nothing to report. Plan for that in your data model now.

## Build an adapter so the swap is one file

Put every workflow call behind one module that owns the base path and maps HubSpot's response into your own shape. The rest of your code never sees a HubSpot URL or field name. When a GA version ships, you change the base path, adjust the mapping if fields moved, and run the tests.

```javascript
// workflows.js: the only file in the codebase that knows which Automation API path is live.
const BASE_PATHS = {
  v4: '/automation/v4', // unsupported from March 30, 2027
  beta: '/automation/v4/2027-03-beta', // beta: can change before it goes GA
};

function createWorkflows({ token, base = 'v4', fetchImpl = fetch }) {
  const root = 'https://api.hubapi.com' + (BASE_PATHS[base] ?? base);

  async function call(path) {
    const res = await fetchImpl(root + path, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(`HubSpot ${res.status}: ${body?.message ?? 'no body'}`);
      Object.assign(err, { status: res.status, body });
      throw err;
    }
    return body;
  }

  return {
    async listWorkflows() {
      const out = [];
      let after;
      do {
        const query = after ? `&after=${encodeURIComponent(after)}` : '';
        const page = await call(`/flows?limit=100${query}`);
        out.push(...page.results.map(toSummary));
        after = page.paging?.next?.after;
      } while (after);
      return out;
    },
    async getWorkflow(flowId) {
      return toWorkflow(await call(`/flows/${encodeURIComponent(flowId)}`));
    },
  };
}

// Your shape, not HubSpot's. A missing field stays null; it never becomes 0, false or [].
function toSummary(f) {
  return {
    id: String(f.id),
    name: f.name ?? null,
    enabled: f.isEnabled ?? null,
    objectTypeId: f.objectTypeId ?? null,
    revisionId: f.revisionId ?? null,
  };
}

function toWorkflow(f) {
  return { ...toSummary(f), actionCount: Array.isArray(f.actions) ? f.actions.length : null, raw: f };
}

// Enrollment activity: "unavailable" and "error" are stored as such, never as zero.
async function readActivity(flowId, getCount) {
  const checkedAt = new Date().toISOString();
  if (!getCount) {
    return { flowId, status: 'unavailable', enrollments: null, reason: 'no supported endpoint', checkedAt };
  }
  try {
    return { flowId, status: 'ok', enrollments: await getCount(flowId), checkedAt };
  } catch (e) {
    return { flowId, status: 'error', enrollments: null, reason: e.message, checkedAt };
  }
}

module.exports = { createWorkflows, readActivity };
```

Three choices in there matter more than the code:

1. **`base` accepts a raw path.** When HubSpot publishes the GA path, you pass it in without touching the module. Switching is config, so you can run v4 and the beta side by side against the same account and diff the results.
2. **The mapper keeps absent fields as `null`.** The flow listing doesn't require `name`, and the full flow can come back without fields you expect. A `0` or `false` you made up looks exactly like real data in a report.
3. **`raw` stays attached.** When the next version renames something, you can rebuild your records from stored responses instead of calling HubSpot again.

Use it like this:

```javascript
const wf = createWorkflows({ token: process.env.HUBSPOT_TOKEN, base: 'v4' });
const flows = await wf.listWorkflows();
const detail = await wf.getWorkflow(flows[0].id);
```

The module was tested with Node's built-in test runner and a mocked `fetch`: the same calls against both base paths, paging through two pages of listings, a passed-through custom path, a 403 surfacing its status and message, and missing fields staying `null`.

## Store "unavailable" separately from "zero"

When you can't read a number, store that fact, not a zero. A workflow with zero enrollments last month is a candidate for switching off. A workflow whose activity you couldn't read is unknown, and switching it off on that basis is how a renewal reminder or a lead-routing branch quietly stops.

That's what `readActivity` in the module does. Pass it your existing v4 performance call while it still works, and pass `null` once it doesn't:

| Status | `enrollments` | Meaning |
|---|---|---|
| `ok` | a number, including 0 | HubSpot answered |
| `unavailable` | `null` | No supported endpoint for this data |
| `error` | `null` | The call failed; the reason is stored |

Every record gets a `checkedAt` timestamp. Dashboards should show `unavailable` as a grey "no data", never as a zero bar, and any "unused workflows" list should only include rows with status `ok`. If you're doing that cleanup as part of taking over a portal someone else built, the wider process is in [auditing an inherited CRM before you rebuild it](/insights/audit-inherited-crm-before-rebuild/).

## What about the official SDKs?

They don't help here yet. The Node client, `@hubspot/api-client`, is at **14.0.1** and the Python client, `hubspot-api-client`, at **12.0.0**. Neither has date-versioned paths or a workflows (`flows`) client. Use the Node client's generic `apiRequest({ method, path })` helper or plain `fetch`, which is what the adapter above does.

Workflow **custom code actions** are a separate runtime: HubSpot lists the Node SDK available there as `@hubspot/api-client` `^10`. If a custom code action reads or edits workflows through the API, give it the same treatment: a small wrapper around `fetch` with the base path in one place.

## What to do now, and what to do at GA

**This month:**

1. Search your code, scheduled jobs and custom code actions for `/automation/v4/` and `/automation/v3/`. Check HubSpot's migrations tab too, since it reports what actually runs.
2. Move every workflow call behind one adapter. No HubSpot paths or field names outside it.
3. Start storing raw responses and a `status` next to any activity metric.
4. Run the adapter against the beta in staging and note any field your mapping can't find.

**Before March 30, 2027:**

5. Decide what your reports show when performance data is `unavailable`, and get whoever reads them to agree.
6. Record the v3-to-v4 ID mappings for anything that still stores old workflow IDs.
7. Watch the developer changelog for the 2027-03 release and its per-endpoint replacement docs.

**When a dated version with workflows goes GA:**

8. Change the base path, run the tests, diff a full listing against v4, and switch production.
9. Remove the v4 path from the adapter so nothing can fall back to it.

*Checked against HubSpot's developer changelog, the Workflows API (BETA) reference and specs, the legacy migration guide, npm and PyPI in October 2026. Code tested on Node 22 with node:test and mocked HubSpot responses.*

Sources: [Deprecating support for HubSpot v4 APIs](https://developers.hubspot.com/changelog/deprecating-support-for-hubspot-v4-apis), [Legacy APIs and legacy apps: what's going unsupported and when](https://developers.hubspot.com/changelog/legacy-apis-and-legacy-apps-whats-going-unsupported-and-when), [Workflows API (BETA), 2027-03-beta](https://developers.hubspot.com/docs/api-reference/2027-03-beta/automation/workflows/guide), [Retrieve a list of automation flows (2027-03-beta)](https://developers.hubspot.com/docs/api-reference/2027-03-beta/automation/workflows/get-workflows), [Legacy API migration guide](https://developers.hubspot.com/docs/api-reference/legacy/migration-guide), [HubSpot API documentation index](https://developers.hubspot.com/docs/llms.txt), [Custom code actions](https://developers.hubspot.com/docs/api-reference/latest/automation/workflow-actions/custom-code-actions), [@hubspot/api-client on npm](https://www.npmjs.com/package/@hubspot/api-client), [hubspot-api-client on PyPI](https://pypi.org/project/hubspot-api-client/), [CRM objects 2026-03: property history fields](https://developers.hubspot.com/docs/api-reference/2026-03/crm/objects/contacts/get-contact).
