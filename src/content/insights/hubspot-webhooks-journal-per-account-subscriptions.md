---
title: "Per-Account Webhook Subscriptions With the HubSpot Webhooks Journal"
seoTitle: "HubSpot Webhooks Journal: Per-Account Subscriptions"
description: "Use the HubSpot Webhooks Journal API when each customer picks the properties to watch: per-portal subscriptions, client credentials and a safe poller."
pubDate: 2026-10-06T14:00:00-05:00
pillar: build
tags: ["HubSpot API","Webhooks","Webhooks Journal","Marketplace Apps","Python"]
---

If your HubSpot app needs different webhook subscriptions for each installed account, such as properties each customer picks in your settings page, use the **Webhooks Journal and management APIs**. You create subscriptions per account through the API, with a `portalId` on each one. HubSpot writes matching events to a journal that your app **polls**. Nothing is pushed to you. The journal keeps three days of events, so the part you actually have to engineer is the poller: where it checkpoints, how it skips duplicates, and how it catches up after downtime.

The APIs shipped in the dated **2026-03** release (March 30, 2026) and are in the current **2026-09** reference without a beta label. Below: auth, per-account subscriptions, and a tested poller. If you'd rather not build this yourself, it's the kind of [HubSpot app development](/services/build/) I do.

## When do classic app webhooks fall short?

Classic app webhooks are configured in your project's `*-hsmeta.json` webhooks file and deployed with the app, so they're part of the app's build, not of any one install. That's fine when every customer needs the same events. It doesn't work when customer A wants changes to `region` and customer B wants changes to a custom property that only exists in their account.

| | Classic app webhooks | Webhooks Journal |
|---|---|---|
| Where subscriptions live | App config file, deployed with the project | API calls, one set per installed account |
| Per-account properties | No | Yes (`portalId` and `properties` on each subscription) |
| Delivery | HubSpot POSTs to your `targetUrl` | You poll the journal and download event files |
| Missed events | Depends on your endpoint staying up | Readable for three days |
| Auth | App config | Client credentials token |

HubSpot's docs say the journal APIs "are managed by API only because they are install-specific, and don't work with the feature component functionality". You can't declare them in the config file.

## How do you authenticate?

Request a **client credentials** token. POST form-encoded `grant_type=client_credentials`, your app's `client_id` and `client_secret`, and a space-separated `scope` to `https://api.hubapi.com/oauth/2026-09/token`. No refresh token comes back, and the docs' example shows `expires_in` of 1800 seconds, so request a new token when the old one expires. The journal is currently the only feature that uses client credentials tokens.

Scopes:

- `developer.webhooks_journal.read`: read the journal
- `developer.webhooks_journal.subscriptions.read` and `.subscriptions.write`: manage subscriptions
- `developer.webhooks_journal.snapshots.read` and `.snapshots.write`: snapshots
- the object scopes for whatever you subscribe to, such as `crm.objects.contacts.read`

If the token call returns `400 BAD_CLIENT_ID` "missing or unknown client id", the cause is usually the ID you're sending, not your scopes. The [BAD_CLIENT_ID section of my scope errors post](/insights/hubspot-app-governance-scope-errors/) lists what to check.

## How do you create a subscription for one account?

POST to `/webhooks-journal/subscriptions/2026-09` with the account's `portalId`, the object type, the actions and the properties that customer chose:

```json
{
  "objectTypeId": "0-1",
  "subscriptionType": "OBJECT",
  "portalId": 12345,
  "actions": ["CREATE", "UPDATE"],
  "properties": ["email", "region", "renewal_tier"]
}
```

The response includes a subscription `id`. Store it against the portal and the customer's settings. The rest of the lifecycle:

- **Subscription types** are `OBJECT`, `ASSOCIATION`, `APP_LIFECYCLE_EVENT` and `LIST_MEMBERSHIP`.
- **Installs and uninstalls**: subscribe with `subscriptionType` `APP_LIFECYCLE_EVENT` (event type `4-1909196` for install, `4-1916193` for uninstall). An install event in the journal is your cue to create that account's subscriptions.
- **Customer changes their picks**: delete with `DELETE /webhooks-journal/subscriptions/2026-09/{subscriptionId}` and create the new one. HubSpot's docs title the endpoint "Create or update" but don't show an update request, so test it before relying on it.
- **Uninstall**: `DELETE /webhooks-journal/subscriptions/2026-09/portals/{portalId}` removes every subscription for that account.
- **List what exists**: `GET /webhooks-journal/subscriptions/2026-09`. Compare this against your own table on a schedule, so drift shows up.

**Can you subscribe to all property changes?** Not as far as the docs show. `properties` is optional, but HubSpot never says that leaving it out means "every property". Its best-practice note is "only subscribe to properties you need." Test it in a developer account before you design around it.

To narrow events on HubSpot's side, attach **filters** with `POST /webhooks-journal/subscriptions/2026-09/filters` (for example, `lifecycle_stage` `EQ` `customer`). Conditions within one filter are ANDed, and separate filters are ORed. Filters only apply to CREATE and UPDATE subscriptions, and they can't be edited: you create a new one and delete the old.

## How does reading the journal work?

You ask for a journal entry and get a pointer back, not events:

```json
{ "url": "https://s3.amazonaws.com/...", "expiresAt": "...", "currentOffset": "550e8400-..." }
```

The `url` is a pre-signed file containing `journalEvents`: each event has `portalId`, `objectTypeId`, `objectId`, `action`, `occurredAt` and, for updates, `propertyChanges`. The endpoints:

| Purpose | Endpoint |
|---|---|
| First available entry | `GET /webhooks-journal/journal/2026-09/earliest` |
| Most recent entry | `GET /webhooks-journal/journal/2026-09/latest` |
| Entry after a checkpoint | `GET /webhooks-journal/journal/2026-09/offset/{offset}/next` |
| Up to 100 entries after a checkpoint | `GET /webhooks-journal/journal/2026-09/batch/{offset}/next/{count}` |
| One account only | the same paths under `/journal-local/`, with `installPortalId` |

The **global** journal covers every account that installed your app. Each event carries `portalId`, so one poller can serve all customers. Use the **local** journal when you want a worker per account. HubSpot's July 2026 rollup raised file size from 100 records to "up to 10,000 or 5MB (whichever comes first)", so a single file can be large. (The batch section of the docs also shows these paths as `/webhooks/2026-09/journal/batch/...` in places; the cURL examples use `/webhooks-journal/`.) The journal endpoints allow 100 requests per second per app.

## How should the poller be structured?

The docs' guidance is short: process files in order, "always store and use the `currentOffset`", and download files promptly because the URLs expire. In practice that means:

1. **One checkpoint per journal**, stored durably, and updated only after a file's events are processed.
2. **Commit the events and the checkpoint together**, so a crash replays the whole file rather than skipping part of it.
3. **A dedupe key per event.** Replays happen, so the same event must be a no-op the second time. The same rule applies to any [at-least-once webhook handler](/insights/zapier-make-silent-failures/).
4. **Downstream writes must be idempotent too.** If your handler writes back to HubSpot, your own update produces a journal event. Tag your writes so you don't react to them, as you would in a [two-way sync](/insights/two-way-crm-sync-without-loops/).

Here's that loop in Python, standard library only:

```python
import json, sqlite3, urllib.request

API = "https://api.hubapi.com/webhooks-journal/journal/2026-09"

def get_json(url, token=None):
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as resp:  # 4xx/5xx raise
        body = resp.read()
        return json.loads(body) if body else None  # empty 204: nothing new

def open_store(path):
    db = sqlite3.connect(path)
    db.execute("CREATE TABLE IF NOT EXISTS checkpoint (id INTEGER PRIMARY KEY CHECK (id = 1), offset TEXT)")
    db.execute("CREATE TABLE IF NOT EXISTS seen (key TEXT PRIMARY KEY)")
    return db

def poll_once(db, token, handle, api=API, max_files=50):
    row = db.execute("SELECT offset FROM checkpoint").fetchone()
    for _ in range(max_files):
        url = f"{api}/offset/{row[0]}/next" if row else f"{api}/earliest"
        entry = get_json(url, token)
        if not entry or not entry.get("url"):
            return "caught-up"
        batch = get_json(entry["url"])  # pre-signed file: no auth header
        with db:  # events and checkpoint commit together, or not at all
            for event in batch.get("journalEvents", []):
                key = json.dumps(event, sort_keys=True)
                if db.execute("INSERT OR IGNORE INTO seen VALUES (?)", (key,)).rowcount:
                    handle(event)
            db.execute("INSERT OR REPLACE INTO checkpoint VALUES (1, ?)",
                       (entry["currentOffset"],))
        row = (entry["currentOffset"],)
    return "more"
```

Run `poll_once` on a schedule. When it returns `"more"`, call it again straight away. If `handle` raises, nothing from that file is committed and the next run retries it. Events already handled earlier in that file run again, which is why the handler has to be idempotent as well. Prune `seen` rows older than three days, since nothing older can be replayed.

One gap: HubSpot doesn't document what `/next` returns when you're fully caught up, or when your offset has aged out. The general error table lists `204 No Content` as a success code without saying where it's used. The code treats an empty response as "nothing new" and lets any error status raise. Check what your app actually gets back, and keep errors loud rather than letting them look like "caught up".

## How do you catch up after downtime?

You have three days. Inside that window, the poller resumes from its checkpoint and works forward, and the batch endpoint (up to 100 entries per call) gets you through a backlog faster. Outside it, the journal can't fill the gap. Re-read the affected records from the CRM, or use the snapshots API, then set the checkpoint from `/latest` and carry on.

Alert well before the window closes: if the checkpoint hasn't moved in a few hours while the latest entry has, page someone. A poller that stopped quietly on Friday evening has lost data by Monday night.

## What to do this week

- List which customers need different properties. If none do, classic webhooks are simpler. Stop here.
- Store `portalId`, subscription `id` and the chosen properties in your own table, and reconcile it against `GET /webhooks-journal/subscriptions/2026-09` daily.
- Subscribe to `APP_LIFECYCLE_EVENT` so installs and uninstalls create and remove subscriptions automatically.
- Build the poller with a durable checkpoint, a dedupe table and an idempotent handler before you write any business logic.
- Add one alert: checkpoint age. Then test a forced crash mid-file in a developer account.

*Checked against HubSpot's Webhooks Journal, subscriptions and authentication developer docs (2026-03 and 2026-09) and the July 2026 developer rollup in October 2026. Code tested with Python 3.12 against a local mock of the journal endpoints, covering checkpoint resume, duplicate events, a mid-file crash and an unknown offset.*

Sources: [Webhooks journal and management APIs (2026-09)](https://developers.hubspot.com/docs/api-reference/latest/webhooks-journal/guide), [Webhook journal APIs](https://developers.hubspot.com/docs/api-reference/latest/webhooks-journal/journal-entries/guide), [Webhooks journal management APIs](https://developers.hubspot.com/docs/api-reference/latest/webhooks-journal/subscriptions/guide), [Webhooks journal guide (2026-03)](https://developers.hubspot.com/docs/api-reference/2026-03/webhooks-journal/guide), [Manage OAuth tokens](https://developers.hubspot.com/docs/api-reference/latest/authentication/manage-oauth-tokens), [Authentication overview](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/overview), [Configure webhooks](https://developers.hubspot.com/docs/apps/developer-platform/add-features/configure-webhooks), [July 2026 rollup](https://developers.hubspot.com/changelog/july-2026-rollup), [Spring 2026 Spotlight](https://developers.hubspot.com/changelog/spring-2026-spotlight).
