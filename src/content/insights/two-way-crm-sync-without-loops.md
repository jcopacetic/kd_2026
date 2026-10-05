---
title: "Two-Way CRM Sync Without Loops: Ownership, ID Maps and Echo Checks"
seoTitle: "Two-Way CRM Sync Without Infinite Loops or Conflicts"
description: "How to build a two-way CRM sync, such as Pipedrive and GoHighLevel, without webhook loops: one owner per field, an ID map, echo suppression and conflict rules."
pubDate: 2026-10-05
pillar: build
tags: ["CRM Integration","Two-Way Sync","Webhooks","Pipedrive","Data Quality"]
---

A two-way CRM sync stays out of loops when every synced field has exactly one system of record, every record pair is linked in an ID map, and your sync recognises its own writes when they come back as webhooks and drops them. Conflicts are settled by rules you decide up front, not by whichever webhook lands last. And the two systems have to be deduplicated and linked before the sync is switched on, or it will multiply the mess.

That holds whether the pair is Pipedrive and GoHighLevel, HubSpot and a custom app, or two databases from an abandoned build, and whether the plumbing is Make, Zapier or code. If you want it designed and built properly, that's the kind of [integration work I do](/services/build/).

## Why do two-way syncs loop?

Because a write is also an event. Your sync updates a contact in system B, B fires a "contact updated" webhook, your sync sees a change in B and writes it to A, A fires its own webhook, and the cycle repeats. Nothing in either CRM knows the change came from the sync.

Loops show up as runaway task counts in Make or Zapier, rate-limit errors, and records whose "last modified" never stops changing. The quieter version is a ping-pong between two values: each side's update arrives after the other's, and the field flips back and forth.

Retries make it worse. Webhook senders deliver at least once, not exactly once. HubSpot's webhooks guide says it retries failed deliveries "up to 10 times" over 24 hours, that it may "send you the same notification multiple times", and that it doesn't guarantee order. Pipedrive's webhooks v2 retry three times, after 3, 30 and 150 seconds, when you return a non-2xx or take longer than 10 seconds. A sync has to tolerate duplicates and out-of-order events by design.

## Decide one system of record per field

Each synced field gets one owner. The owner's value flows to the other side; changes on the other side are either blocked, ignored or flagged. "Two-way" should mean different fields flow in different directions, not that every field flows both ways.

A typical split when sales live in one CRM and marketing automation in another:

| Field | System of record | Flows to | If edited on the other side |
|---|---|---|---|
| Name, email, phone | Whichever created the contact, then sales CRM | Marketing | Flag for review |
| Deal stage | Sales CRM | Marketing (as a trigger) | Overwritten on next sync |
| Deal value, owner | Sales CRM | Marketing | Overwritten |
| Opt-in / consent | Marketing | Sales CRM | Never overwritten from sales |
| Lead source, UTM fields | Marketing | Sales CRM | Ignored |
| Appointment status | Whichever books it | Both | Newest wins |

Only fields like appointment status, where either side legitimately changes the value, need a true two-way rule. Keep that list short. For how to rank more than two writers on one field, see [field precedence for integrations and enrichment](/insights/stop-integrations-overwriting-crm-data/).

## Keep an ID map

Store the link between records explicitly: one row per pair, with system A's ID, system B's ID, and when the link was made. Don't match on email or phone on every event.

Email and phone change, get shared by couples and front desks, and are formatted differently in each system. Matching on them at sync time is how one edit creates a duplicate. Use them once, to create the link, then sync by ID. Where a CRM lets you store an external ID on the record (a custom field holding the other system's ID), write it there too, so the link survives if your database doesn't. The ID map is also where your echo markers live.

## How to stop your sync reacting to its own writes

Check two things on every incoming event: who made the change, and whether the values are the ones you just wrote. If either says "this was us", drop the event.

**Who made the change.** Run the sync as a dedicated integration user, then compare the event's actor with it. Pipedrive's webhooks v2 include `meta.user_id` (the user who triggered it) and `meta.change_source`, which is either `app` or `api`. `api` alone isn't enough, since every integration uses the API; the user ID is what identifies yours. HubSpot webhook events carry a `changeSource`, using the same sources as property history.

**What changed.** After every write, store a hash of the synced fields you wrote and the time. When an event arrives, hash the record's current synced fields and compare. A match means the event is your echo, or a change to a field you don't sync; either way there's nothing to send.

```javascript
const { createHash } = require('node:crypto');

// Hash only the fields you sync, in a fixed order, after normalising.
function fingerprint(fields, synced) {
  const norm = synced.map((k) => [k, String(fields[k] ?? '').trim().toLowerCase()]);
  return createHash('sha256').update(JSON.stringify(norm)).digest('hex');
}

// Call after every write you make to a system: system + record ID -> what you wrote, when.
function rememberWrite(store, system, id, fields, synced, at) {
  store.set(`${system}:${id}`, { hash: fingerprint(fields, synced), at });
}

// Call for every incoming change event before you sync it anywhere.
function classifyChange(store, system, id, event, synced, ownActorIds = []) {
  if (ownActorIds.includes(event.actorId)) return 'echo';      // written by our integration user
  const mark = store.get(`${system}:${id}`);
  if (!mark) return 'propagate';
  if (fingerprint(event.fields, synced) === mark.hash) return 'echo'; // same values we wrote
  if (event.at < mark.at) return 'stale';                       // older than our last write: re-read
  return 'propagate';
}

module.exports = { fingerprint, rememberWrite, classifyChange };
```

`echo` is dropped. `propagate` goes to the other system, through the field ownership rules. `stale` means the event happened before your last write, which is what out-of-order delivery looks like; re-read the record rather than acting on the old payload.

Two details matter in practice. First, many webhooks carry only the changed property (a HubSpot property-change event has one `propertyName` and `propertyValue`), so `event.fields` should be the record's current synced fields, read from the API or merged into your last known state, not the raw payload. Second, the normaliser lowercases everything because it's only for comparing; never write the normalised values anywhere.

A time-window rule ("ignore anything within 30 seconds of our write") is a common shortcut. It also drops a real human edit made in that window. The hash doesn't.

## What happens when both sides change the same field?

You need a rule per two-way field, chosen in advance: the system of record wins, the newest change wins, or the conflict goes to a person. Pick one and log every time it fires.

- **System of record wins** for anything with an owner. Simple and predictable.
- **Newest wins** only for genuinely shared fields, and only compare the time each change happened (`occurredAt`, `meta.timestamp`), never the time you received the webhook.
- **Flag for review** for identity fields like email, where a wrong merge is expensive. Write the conflicting value to a note or a staging field and leave the record as it was.

## Backfill and dedupe before you turn it on

Switching on a sync between two CRMs that already hold the same customers creates a duplicate for every unmatched record, on both sides. Link first, then sync.

1. Export both systems and dedupe each one on its own, using normalised email, normalised phone and name.
2. Match across the two systems. Exact matches on email or phone become links in the ID map; fuzzy matches go to a review list.
3. Decide, per field, which side's value is kept on the linked pairs, using the ownership table, and write it once.
4. Create records that exist on only one side, and add their links.
5. Turn on the sync for a small segment (one pipeline, one owner) and watch the echo and conflict logs for a few days.
6. Widen it.

If the existing data is a mess you've inherited, start with [an audit of the CRM before you rebuild anything](/insights/audit-inherited-crm-before-rebuild/).

## Buy a sync tool or write it?

Buy when both systems are supported by a sync product, your fields map cleanly, and its conflict rules match your ownership table. Write it when the rules are specific to your business, or when one side is a custom system.

| Situation | Better choice |
|---|---|
| Common CRM pair, standard objects, a vendor connector that supports per-field direction | Sync tool or native connector |
| Field-level ownership the tool can't express | Code |
| Custom objects, or a custom app on one side | Code |
| Make or Zapier scenario that already loops or duplicates | Code, or add echo checks and an ID map to the scenario |
| Low volume, one direction only | Make or Zapier |

Before buying, check three things in the vendor's docs: whether direction can be set per field, how it detects its own writes, and how it matches existing records on first run. If the answer to any is vague, expect to write those parts yourself. Whatever you choose, make failures loud; a sync that stops quietly is worse than none. More on that in [why Zapier and Make scenarios fail silently](/insights/zapier-make-silent-failures/).

## Before you switch a two-way sync on

- Write the ownership table: every synced field, its owner, and what happens on the other side.
- Create a dedicated integration user in each system and record its user ID.
- Build the ID map and backfill it from a deduplicated match.
- Store a hash and timestamp after every write; drop events from your own user or with matching hashes.
- Re-read records instead of trusting partial webhook payloads.
- Respond to webhooks fast, queue the work, and make every write safe to repeat.
- Pick a conflict rule for each two-way field and log every conflict.
- Start with one segment, then widen.

*Checked against HubSpot's webhooks API guide and Pipedrive's webhooks v2 guide in October 2026. Code tested with Node 22's built-in test runner against fixtures for echoes, own-user events, unsynced-field changes, human edits and out-of-order events.*

Sources: [Webhooks API guide (HubSpot)](https://developers.hubspot.com/docs/api-reference/legacy/webhooks/guide), [Guide for webhooks v2 (Pipedrive)](https://pipedrive.readme.io/docs/guide-for-webhooks-v2), [Create generic webhook subscriptions (HubSpot)](https://developers.hubspot.com/docs/apps/legacy-apps/public-apps/create-generic-webhook-subscriptions).
