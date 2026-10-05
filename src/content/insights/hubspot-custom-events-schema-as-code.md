---
title: "Schema-as-Code for HubSpot Custom Events and Their Properties"
seoTitle: "HubSpot Custom Events API: Define Properties as Code"
description: "Stop mapping HubSpot custom event properties by hand. Keep events in a JSON registry and sync them through the event definitions API in CI, without deleting."
pubDate: 2026-10-09T08:00:00-05:00
pillar: build
tags: ["HubSpot API","Custom Events","Segment","Data Architecture","CI"]
---

HubSpot won't auto-create custom event properties. Every property has to exist on the event definition before you can send a value for it, so a new field from Segment or your product simply has nowhere to land. The fix is to stop defining events in the UI: keep a registry of events and properties in a file in your repo, and have a script sync it through the **event definitions API** (`/events/2026-09/event-definitions`). The script creates missing events and adds missing properties, and never deletes anything.

That's the answer a HubSpot Community thread arrived at when someone was mapping Segment events to HubSpot custom events one property at a time: keep a small schema contract and manage it through the API. Below is the implementation, tested, plus how to run it in CI. Building and maintaining this kind of data plumbing is part of my [custom build and integration work](/services/build/).

## What does HubSpot require before you send an event?

A definition, created first, with every property you'll send. Custom events are available on Professional and Enterprise tiers of Marketing, Sales, Service, Data, Content and Revenue Hub (plus Smart CRM per the knowledge base), and the access token needs the `behavioral_events.event_definitions.read_write` scope. One oddity: the OpenAPI spec embedded on the reference pages lists Enterprise as the tier requirement, while the guide and the knowledge base both say Professional. I go with the guide and the knowledge base.

The limits that shape the design, all from HubSpot's docs:

| Limit | Value |
|---|---|
| Event definitions per account | 500 |
| Custom properties per event | 50 |
| Occurrences per month | 30 million |
| Property and event `name` | Up to 50 characters, starts with a letter, lowercase a–z, 0–9 and `_` only |
| Event `label` | Up to 100 characters (property labels: 50) |
| String values | 256 characters, or 1,024 if the property name contains `url`, `referrer` or `link` |

The endpoints, on the current `2026-09` version:

| Task | Request |
|---|---|
| List definitions | `GET /events/2026-09/event-definitions?includeProperties=true` (paged with `after`, `limit`) |
| Create an event | `POST /events/2026-09/event-definitions` |
| Add a property | `POST /events/2026-09/event-definitions/{eventName}/property` |
| Update label/description | `PATCH /events/2026-09/event-definitions/{eventName}` |
| Delete a property or event | `DELETE .../{eventName}/property/{propertyName}`, `DELETE .../{eventName}` |

A create body takes `label` (required), `name`, `description`, `primaryObject` (`CONTACT` by default, or `COMPANY`, `DEAL`, `TICKET`, a custom object and others, or `NO_OBJECT`), `propertyDefinitions`, and optionally `customMatchingId` and `includeDefaultProperties`. Each property needs `label` and `type`, where type is one of `string`, `number`, `bool`, `date`, `datetime` or `enumeration`. Enumerations need an `options` array with at least one `{label, value}`.

## Why should the schema live in a file and not the UI?

Because several of these choices are permanent, and the UI gives you no review step. HubSpot's docs are explicit:

- An event's `name` and `primaryObject` can't change after creation.
- A property's `name` can't change, and neither can its type. Changing type means deleting and recreating the property.
- Deleting an event deletes all of its occurrences, and a deleted event name can never be reused.

With a file in git, every new event or property arrives as a pull request someone reads. Typos in names get caught before they become permanent, and the history shows who added what and why.

One more detail: when you send occurrences, `eventName` is the `fullyQualifiedName` (formatted `pe{HubID}_{name}`), not the short name. The definitions endpoints use the short `name`. Keep the short name in the registry and look up the full one per account.

## The registry

One JSON file, one entry per event. Property names follow HubSpot's rules, so if your source uses camelCase (Segment track calls often do), map them to snake_case here, once.

```json
{
  "events": [
    {
      "name": "webinar_attended",
      "label": "Webinar attended",
      "description": "Sent by the webinar platform integration when a registrant joins.",
      "primaryObject": "CONTACT",
      "properties": [
        { "name": "webinar_id", "label": "Webinar ID", "type": "string" },
        { "name": "minutes_watched", "label": "Minutes watched", "type": "number" },
        { "name": "attendance_type", "label": "Attendance type", "type": "enumeration",
          "options": [ { "label": "Live", "value": "live" }, { "label": "On demand", "value": "on_demand" } ] }
      ]
    }
  ]
}
```

## The sync script

Python standard library only. It validates the registry against HubSpot's naming rules and the 50-property limit, reads every existing definition (following pagination), then plans: create events that don't exist, add properties that don't exist. It never sends a `DELETE` or `PATCH`. If a property exists with a different type, it reports drift and exits non-zero instead of "fixing" it, because the only fix is a delete.

```python
"""Sync a local registry of HubSpot custom events. Creates and adds; never deletes."""
import json, os, re, sys, urllib.request

BASE = "https://api.hubapi.com/events/2026-09/event-definitions"
NAME = re.compile(r"^[a-z][a-z0-9_]{0,49}$")
TYPES = {"bool", "date", "datetime", "enumeration", "number", "string"}


def http(method, url, body=None):
    req = urllib.request.Request(url, method=method, headers={
        "Authorization": f"Bearer {os.environ['HUBSPOT_TOKEN']}",
        "Content-Type": "application/json"})
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(req, data=data, timeout=30) as res:
        return json.load(res)


def validate(registry):
    problems = []
    for ev in registry["events"]:
        props = ev.get("properties", [])
        if not NAME.match(ev["name"]):
            problems.append(f"{ev['name']}: invalid event name")
        if len(props) > 50:
            problems.append(f"{ev['name']}: {len(props)} properties (max 50)")
        for p in props:
            if not NAME.match(p["name"]) or p["type"] not in TYPES:
                problems.append(f"{ev['name']}.{p['name']}: bad name or type")
            if p["type"] == "enumeration" and not p.get("options"):
                problems.append(f"{ev['name']}.{p['name']}: enumeration needs options")
    return problems


def fetch_existing(send):
    found, after = {}, None
    while True:
        url = f"{BASE}?includeProperties=true&limit=100" + (f"&after={after}" if after else "")
        page = send("GET", url)
        for d in page["results"]:
            found[d["name"]] = {p["name"]: p for p in d.get("properties", [])}
        after = page.get("paging", {}).get("next", {}).get("after")
        if not after:
            return found


def plan(registry, existing):
    actions, drift = [], []
    for ev in registry["events"]:
        props = ev.get("properties", [])
        if ev["name"] not in existing:
            body = {k: ev[k] for k in ("name", "label", "description", "primaryObject") if k in ev}
            body["propertyDefinitions"] = props
            actions.append(("POST", BASE, body))
            continue
        have = existing[ev["name"]]
        for p in props:
            if p["name"] not in have:
                actions.append(("POST", f"{BASE}/{ev['name']}/property", p))
            elif have[p["name"]]["type"] != p["type"]:
                drift.append(f"{ev['name']}.{p['name']}: HubSpot has {have[p['name']]['type']}, registry says {p['type']}")
    return actions, drift


def main(path, apply=False, send=http):
    with open(path) as f:
        registry = json.load(f)
    problems = validate(registry)
    if problems:
        print("\n".join(problems)); return 2
    actions, drift = plan(registry, fetch_existing(send))
    for method, url, body in actions:
        print(("APPLY " if apply else "PLAN  ") + f"{method} {url} {body['name']}")
        if apply:
            send(method, url, body)
    for d in drift:
        print("DRIFT " + d)
    return 1 if drift else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], apply="--apply" in sys.argv))
```

Run `python sync_events.py events.json` to see the plan, and add `--apply` to make the changes. Running it twice is safe: the second run finds everything in place and makes only `GET` requests.

It was tested against an in-memory fake of the definitions API with pagination: creating a missing event with its properties, adding only the missing properties to an existing event, leaving properties that aren't in the registry alone, dry runs making no writes, type drift reported and left unchanged, an invalid registry blocked before any request, and the real `urllib` path against a local HTTP server. One thing I couldn't confirm without a live portal is the exact `type` string HubSpot returns for each event property type. Run a dry run against a test account first and check that existing properties don't show as drift.

## How do you run it in CI?

Plan on every pull request, apply on merge. That way a reviewer sees exactly which events and properties will appear in HubSpot before they do.

1. Store an access token with the `behavioral_events.event_definitions.read_write` scope as a CI secret named `HUBSPOT_TOKEN`. Use a separate token per portal.
2. On pull requests that touch the registry, run the script without `--apply` and post the output to the PR. Exit code 2 (invalid registry) or 1 (drift) fails the check.
3. On merge to main, run it with `--apply` against a test or sandbox portal, then production.
4. Deploy the code that sends the new property *after* the apply step, so occurrences never reference a property that doesn't exist yet.

Removals stay manual on purpose. If a property should go, delete it in HubSpot by hand, knowing past occurrences keep their values, and then take it out of the file.

## Which attributes belong on the event, and which on the contact?

Keep most attributes on the event; promote to a contact property only what you filter, score or route on. Event properties keep every occurrence with its own values, which is what you want for "which webinars, how long, live or recorded." A contact property holds one current value and overwrites it each time.

| Keep on the event | Promote to a contact property |
|---|---|
| Per-occurrence detail: IDs, durations, page URLs, variants | Values that drive list membership or workflow enrollment |
| Anything you'll only see on the timeline or in event reports | Lead scoring inputs |
| High-cardinality values | Routing and assignment criteria |
| Fields you're unsure you'll need | Personalization tokens in email |

Promoted values should be written by a workflow or your integration from the event, and they need the same care as any other synced field. If several systems write them, set [field precedence so integrations don't overwrite good data](/insights/stop-integrations-overwriting-crm-data/). For a worked example of this split applied to webinars, see [event attendance without a property per event](/insights/hubspot-event-attendance-without-property-per-event/).

## What to do this week

- Export your current definitions with `GET /events/2026-09/event-definitions?includeProperties=true` and turn them into the registry file. Leave out HubSpot's default `hs_` properties.
- Check every name against the rules: lowercase, starts with a letter, 50 characters or fewer.
- Count events against the 500 cap and properties against 50 per event.
- Run the script as a dry run against a test portal and confirm it reports no drift.
- Wire the plan step into pull requests and the apply step into merges.
- Write down which event properties are promoted to contact properties, and why.

*Checked against HubSpot's custom events developer guides, API reference and usage guidelines in October 2026. Code tested against a mocked event definitions API (Python 3.12, standard library).*

Sources: [Define custom events (2026-09)](https://developers.hubspot.com/docs/api-reference/latest/events/define-events/guide), [Get all event definitions (API reference)](https://developers.hubspot.com/docs/api-reference/latest/events/define-events/get-event-definitions), [Send custom event occurrences: limits](https://developers.hubspot.com/docs/api-reference/latest/events/send-event-data/guide#limits), [API usage guidelines and limits](https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines), [Create custom events (Knowledge Base)](https://knowledge.hubspot.com/reports/create-custom-events).
