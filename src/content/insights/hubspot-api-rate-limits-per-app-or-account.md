---
title: "HubSpot API Rate Limits: Per App or Per Account?"
seoTitle: "HubSpot API Rate Limits: Per App or Per Account?"
description: "HubSpot's documented API limits by app type: 110 per 10s per install for marketplace apps, per-app bursts and shared daily caps for private apps, Search at 5/s."
pubDate: 2026-10-09T14:00:00-05:00
pillar: build
tags: ["HubSpot API","Rate Limits","Error Handling","Integrations","Marketplace Apps"]
---

It depends on how the app is distributed. A marketplace (publicly distributed OAuth) app gets **110 requests every 10 seconds for each HubSpot account that installs it**, so its burst limit is per app, per account. Privately distributed apps, legacy private apps and Service Keys get a **burst limit per app** (100 to 250 per 10 seconds by tier) but a **daily limit shared by all of them in the account**. The CRM Search API sits outside the general limits at **five requests per second per account**.

That's what HubSpot's usage guidelines say. Several things they don't say, such as whether two apps share the Search budget, are listed below as open questions rather than guessed at. Below that is a tested client-side limiter and retry helper. Building integrations that stay inside these limits is a routine part of my [integration and custom build work](/services/build/).

## What are the documented limits for each app type?

HubSpot's usage guidelines split apps into two groups, and the split is distribution, not authentication method.

| App type | Burst (per 10 seconds) | Daily | Scope of the limit |
|---|---|---|---|
| Marketplace / publicly distributed OAuth app (legacy public apps and 2025.2/2026.03 apps) | 110 | Not stated | Per installing account |
| Privately distributed app, legacy private app, Service Key: Free or Starter | 100 | 250,000 | Burst per app, daily per account |
| Same, Professional | 190 | 625,000 | Burst per app, daily per account |
| Same, Enterprise | 190 | 1,000,000 | Burst per app, daily per account |
| Same, with API Limit Increase | 250 | +1,000,000 per increase (max two) | Burst per app, daily per account |

Service Keys are documented as having the same limits as privately distributed apps. The API Limit Increase add-on does not raise marketplace app limits. The 110 figure explicitly excludes the CRM Search API.

So, for the common question "can my marketplace app starve a customer's other integrations?": by the docs, your 110 per 10 seconds is your own, counted per installed account. A customer's private apps each have their own burst limit too, but they all draw from one daily pool. The guidelines don't say whether a marketplace app's calls count against that pool.

## Which APIs have their own limits?

The usage guidelines flag three APIs with limits "unique from or stricter than the general limits": Associations, CRM Search and GraphQL. Two of them matter for most integrations.

| API | Documented limit |
|---|---|
| CRM Search (`POST /crm/objects/2026-09/{object}/search`) | 5 requests per second per account; 200 results per page; 10,000 results per query; 3,000-character request body |
| Associations | Burst 100 per 10 s (Free/Starter), 150 (Professional/Enterprise), 200 max with the limit increase; daily 500,000, 1,000,000 max with the increase |
| Batch associations | 1,000 inputs per batch read, 2,000 per batch create |
| Object batch endpoints (e.g. contacts) | 100 records per request |
| Custom event occurrences | 1,250 requests per second; batches of 500 |

The associations guide lists tier-based numbers that don't match the general table, and it doesn't say which app types they apply to. That's the "conflicting documentation" developers run into. My reading is that associations calls have their own budget, but HubSpot doesn't state how it interacts with the 110 for marketplace apps.

## What does HubSpot tell you in the response?

Every response carries rate limit headers, with documented exceptions:

| Header | Meaning |
|---|---|
| `X-HubSpot-RateLimit-Max` | Requests allowed in the current window |
| `X-HubSpot-RateLimit-Remaining` | Requests left in that window |
| `X-HubSpot-RateLimit-Interval-Milliseconds` | Window length (10000 = 10 seconds) |
| `X-HubSpot-RateLimit-Daily` | Daily allowance. Not sent for OAuth requests |
| `X-HubSpot-RateLimit-Daily-Remaining` | Daily requests left. Not sent for OAuth requests |

Search API responses include none of these headers. The `X-HubSpot-RateLimit-Secondly` headers still appear but are deprecated, and the limit they describe is no longer enforced.

Over the limit, HubSpot returns `429` for all subsequent calls, with a body like this (from the docs):

```json
{
  "status": "error",
  "message": "You have reached your daily limit.",
  "errorType": "RATE_LIMIT",
  "correlationId": "c033cdaa-2c40-4a64-ae48-b4cec88dad24",
  "policyName": "DAILY",
  "requestId": "3d3e35b7-0dae-4b9f-a6e3-9c230cbcf8dd"
}
```

`policyName` tells you which limit you hit. The docs show `DAILY` and name `TEN_SECONDLY_ROLLING` for the burst limit. The daily limit resets at midnight in the account's time zone. Error responses should stay under 5% of your daily requests, and marketplace certification requires it.

## What don't the docs answer?

These are the gaps. I haven't measured them, and I'm not going to guess:

- **Whether Search's five per second is shared across apps.** "Per account" suggests every app in the account draws from one budget, but HubSpot doesn't say so.
- **The `policyName` on a Search 429**, or on an associations 429. Only `DAILY` and `TEN_SECONDLY_ROLLING` are documented.
- **Associations headers.** The guidelines say headers come on every response except Search. Developers report that `/crm/v4/associations/*` responses come back without them. If you rely on headers to pace yourself, don't rely on them there.
- **Whether each Service Key gets its own burst limit**, as each private app does. The docs only say "same limits as privately distributed apps."
- **`Retry-After`.** The usage guidelines don't mention it. The helper below uses it if present and falls back to backoff if not.
- **A daily cap for marketplace apps.** None is listed.

## A client-side limiter and retry helper

Pace yourself before HubSpot has to. The helper has two parts: a token bucket per account, and a retry wrapper that only retries `429`.

One subtlety: HubSpot's burst limit is a rolling 10-second window. A token bucket holding 110 tokens and refilling at 11 per second can send 220 requests inside 10 seconds (110 at once, then 110 more as it refills). So the bucket below starts with a small burst and refills at a rate where burst plus refill never exceeds the limit.

```javascript
// Client-side limiter for one HubSpot account + retry on 429 only. Node 18+ (global fetch).
const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Token bucket: `burst` tokens up front, refilled so that burst + refill over one
// window never exceeds `limit`. A bucket of 110 refilled at 11/s would allow 220
// requests in a rolling 10 seconds.
function createBucket({ limit, windowMs, burst = Math.ceil(limit / 10), now = Date.now, sleep = realSleep }) {
  const perMs = (limit - burst) / windowMs;
  let tokens = burst;
  let last = now();
  return async function take() {
    for (;;) {
      const t = now();
      tokens = Math.min(burst, tokens + (t - last) * perMs);
      last = t;
      if (tokens >= 1) { tokens -= 1; return; }
      await sleep(Math.ceil((1 - tokens) / perMs));
    }
  };
}

function retryAfterMs(value, now = Date.now) {
  if (!value) return null;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : Math.max(0, at - now());
}

async function withRetry(doRequest, { take, maxRetries = 5, baseMs = 1000, capMs = 30000,
  random = Math.random, sleep = realSleep, now = Date.now } = {}) {
  for (let attempt = 0; ; attempt++) {
    await take();
    const res = await doRequest();
    if (res.status !== 429 || attempt >= maxRetries) return res;
    const body = await res.clone().json().catch(() => ({}));
    if (body.policyName === 'DAILY') return res; // won't clear until midnight in the account's time zone
    const wait = retryAfterMs(res.headers.get('retry-after'), now)
      ?? random() * Math.min(capMs, baseMs * 2 ** attempt); // full jitter
    await sleep(wait);
  }
}

module.exports = { createBucket, retryAfterMs, withRetry };
```

Using it, with one bucket per account and a separate one for Search:

```javascript
const { createBucket, withRetry } = require('./hubspotLimiter');

// One bucket per HubSpot account (portal), shared by every request your app makes there.
const general = createBucket({ limit: 100, windowMs: 10_000 }); // documented 110; keep headroom
const search = createBucket({ limit: 4, windowMs: 1_000, burst: 1 }); // documented 5/s per account

async function searchContacts(token, filterGroups) {
  const res = await withRetry(() => fetch('https://api.hubapi.com/crm/objects/2026-09/contacts/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filterGroups, limit: 200 }),
  }), { take: search });
  if (!res.ok) throw new Error(`HubSpot search failed: ${res.status}`);
  return res.json();
}
module.exports = { general, search, searchContacts };
```

It was tested with Node's built-in test runner, a fake clock and mocked responses: over 1,000 requests the bucket never put more than 110 into any rolling 10-second window (and didn't fall far below it); `Retry-After` in seconds and as an HTTP date is honoured; without it, backoff doubles from 1 second and caps at 30 seconds with full jitter; `400`, `500` and a `DAILY` 429 are returned without retrying; and retries pass through the bucket too, so they can't cause a second burst.

Two caveats. The bucket lives in one process, so if you run several workers against the same account, they need a shared counter (Redis or similar) or a per-worker share of the limit. And the client doesn't retry `5xx`. Whether a write is safe to repeat is an idempotency question, which I cover in [why automations fail silently](/insights/zapier-make-silent-failures/).

## How do you need fewer requests in the first place?

Use the batch endpoints, stop polling, and keep Search for lookups rather than bulk sync. HubSpot's own advice is to batch and cache, and to receive changes by webhook instead of asking for them.

1. **Batch reads and writes.** 100 records per object batch call and 1,000 or 2,000 per associations batch, against one request each.
2. **Cache settings.** Properties, owners and pipelines rarely change. Fetch them once per run, not once per record.
3. **Don't page through Search for a full sync.** At five per second with no headers and a 10,000-result ceiling, it's the wrong tool. Use the list endpoints for full syncs, and keep Search with a last-modified filter for small incremental pulls.
4. **Subscribe to changes.** A sync that receives webhooks makes a fraction of the calls one that polls makes. If it runs both ways, design it so your own writes don't trigger more writes: [two-way sync without loops](/insights/two-way-crm-sync-without-loops/).

## What to check this week

- Find out which bucket your app is in: marketplace OAuth, private distribution, legacy private app or Service Key.
- For private apps and Service Keys, add up every integration in the account against the shared daily limit. `X-HubSpot-RateLimit-Daily-Remaining` shows it on non-OAuth requests.
- Put a bucket per account in front of general calls, and a separate one in front of Search.
- Log `policyName` and `correlationId` on every 429, and alert on `DAILY`.
- Track your error rate against the 5% guideline if you're listing on the marketplace.
- If you're moving to the dated APIs at the same time, work through the [2027 HubSpot API migration checklist](/insights/hubspot-api-sunset-2027-migration-checklist/).

*Checked against HubSpot's API usage guidelines, the CRM Search, Associations and Service Keys documentation in October 2026. Code tested against mocked responses with a fake clock (Node 22, node:test). Nothing here was measured against a live HubSpot account.*

Sources: [API usage guidelines and limits](https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines), [Search the CRM: limits](https://developers.hubspot.com/docs/api-reference/latest/crm/search-the-crm#limits), [Associations API: limits](https://developers.hubspot.com/docs/api-reference/latest/crm/associations/associate-records/guide#limits), [Make API requests using a service key](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys), [Contacts API](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/contacts/guide), [Send custom event occurrences: limits](https://developers.hubspot.com/docs/api-reference/latest/events/send-event-data/guide#limits).
