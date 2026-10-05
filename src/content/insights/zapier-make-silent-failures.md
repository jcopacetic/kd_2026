---
title: "Why Your Zap or Make Scenario Fails Silently (and How to Make It Loud)"
seoTitle: "Zapier, Make and n8n Silent Failures: How to Fix Them"
description: "Why a Zap, Make scenario or n8n workflow fails with no error, sends duplicates or drops leads, and how to add idempotency, retries and alerts someone sees."
pubDate: 2026-10-05
pillar: build
tags: ["Zapier","Make","n8n","Webhooks","Error Handling"]
---

A Zap or Make scenario "fails silently" for one of three reasons: the platform treated the failure as a success (a halted run, a skipped bundle, a handled error), the alert went somewhere nobody looks, or the run succeeded twice and nobody noticed the duplicate. None of these show up as a red error. The fix is the same on Zapier, Make and n8n: give every event a key so repeats are harmless, retry only what's safe to retry, tag every run with an ID you can search, and send failures to one place a named person watches.

Below: how each platform behaves, what to switch on, and when a scenario should become code. Making integrations observable is a large part of the [integration and custom build work](/services/build/) I do.

## Why do automations fail without an error?

Because "no error" and "it worked" are different statuses, and the platforms only alert on some failures.

**Zapier.** A run can end as *Errored*, *Safely halted* (usually a search step that found nothing), *On hold* (a disconnected app, task limit or flood protection), *Handled error*, or *Scheduled* when autoreplay will retry it. Only errors email you, and not straight away:

- With **autoreplay** on (Professional, Team and Enterprise plans), Zapier retries an errored step up to 5 times, at 5 minutes, 30 minutes, 1 hour, 3 hours and 6 hours, and sends no error email until the final attempt fails. That's a gap of over ten hours.
- Autoreplay does not replay safely halted runs. A "Find contact" step that comes back empty halts the run, and nothing tells you.
- A **custom error handler** (an alternative path that runs when a step fails) marks the run *Stopped/Handled*, and Zapier sends no error email when a handler runs. It can't be added to the trigger or to a Paths step, only to steps inside a path. Publishing one turns autoreplay off for that Zap.
- A Zap that errors on 95% or more of its runs over 7 days is turned off by default.

**Make.** There are five error handlers: **Skip**, **Retry**, **Resume**, **Commit** and **Rollback**. Make renamed two of them, so older tutorials call Skip "Ignore" and Retry "Break". Skip drops the failed bundle and carries on. Resume swaps in a substitute value and carries on. Commit stops the run and ends with a *Warning*, not an error. All three can hide a lost lead. With no handler and incomplete executions turned off, Rollback is the default, and after 3 consecutive errored runs (the default setting) Make disables the scenario.

**n8n.** Each node's **On Error** setting can be *Stop Workflow*, *Continue* or *Continue (using error output)*. Plain *Continue* moves on using the last valid data, which is a silent failure by design. **Retry On Fail** reruns a failing node. Failures only reach you if the workflow has an **Error workflow** set (more below).

## Why do I get duplicate records and double-sent messages?

Because webhooks are delivered at least once, not exactly once, and retries resend work that half-succeeded. Both are documented. HubSpot retries a failed webhook up to 10 times over 24 hours, counts any response slower than five seconds as failed, and says outright it may send the same notification more than once. Stripe retries for up to three days in live mode and also warns that endpoints "might occasionally receive the same event more than once." Neither guarantees order.

Duplicates come from three places:

1. **The sender retries** because your endpoint, or the platform's catch hook, answered slowly or with an error.
2. **Your own retry repeats a step that worked.** The SMS went out, the next step failed, and the whole run was replayed. Zapier's autoreplay only replays errored steps, but replaying an entire run starts again from the trigger.
3. **Two triggers fire for one real-world event**, such as a form and a CRM workflow both reacting to the same new contact. The [two-way sync post](/insights/two-way-crm-sync-without-loops/) covers the loop version of this.

## How do I make a webhook handler idempotent?

Build a key from the event, record it before you act, and refuse to act on a key you've already finished. Use the sender's event ID when it has a reliable one. HubSpot notes its `eventId` "is not guaranteed to be unique", so combine fields: source, event type, object ID and the occurrence time. Store the key with an expiry longer than the sender's retry window (days, not minutes).

The handler below uses SQLite from the Python standard library. It has three states: *new* (do the work), *done* (answer 200 and do nothing), and *busy*, when another delivery of the same event is mid-flight (answer 409 so the sender tries again later). If the side effect fails, it releases the key and returns 500 so the sender's retry can try again, which is the "retry without double-send" rule in one place.

```python
import json, sqlite3, threading, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DB = sqlite3.connect("idempotency.db", check_same_thread=False, isolation_level=None)
DB.execute("CREATE TABLE IF NOT EXISTS seen (key TEXT PRIMARY KEY, status TEXT, expires REAL)")
LOCK = threading.Lock()
LEASE, KEEP = 60, 7 * 86400  # seconds: in-flight claim, then how long to remember "done"

def claim(key):
    """Return 'new', 'done' or 'busy'. Only 'new' may run the side effect."""
    now = time.time()
    with LOCK:
        DB.execute("DELETE FROM seen WHERE key = ? AND expires < ?", (key, now))
        try:
            DB.execute("INSERT INTO seen VALUES (?, 'processing', ?)", (key, now + LEASE))
            return "new"
        except sqlite3.IntegrityError:
            (status,) = DB.execute("SELECT status FROM seen WHERE key = ?", (key,)).fetchone()
            return "done" if status == "done" else "busy"

def finish(key, ok):
    with LOCK:
        if ok:
            DB.execute("UPDATE seen SET status = 'done', expires = ? WHERE key = ?", (time.time() + KEEP, key))
        else:
            DB.execute("DELETE FROM seen WHERE key = ?", (key,))  # let the sender's retry try again

def send_sms(event):  # the side effect you must not repeat (mocked)
    pass

class Hook(BaseHTTPRequestHandler):
    def do_POST(self):
        event = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        key = f"{event['source']}:{event['type']}:{event['id']}"
        cid = self.headers.get("X-Correlation-Id") or str(uuid.uuid4())
        state = claim(key)
        print(json.dumps({"cid": cid, "key": key, "state": state}), flush=True)
        if state == "new":
            try:
                send_sms(event)
                finish(key, ok=True)
            except Exception:
                finish(key, ok=False)
                return self.reply(500, cid)  # non-2xx: the sender retries
        self.reply(409 if state == "busy" else 200, cid)

    def reply(self, code, cid):
        self.send_response(code)
        self.send_header("X-Correlation-Id", cid)
        self.end_headers()

    def log_message(self, *args):
        pass

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8080), Hook).serve_forever()
```

It was tested with sequential duplicates, ten concurrent deliveries of one event (one send, nine 409s), a failed send then a retry (one send), an expired key, and a crashed worker's stale claim. Three caveats. In production, put the store in Postgres or Redis (`SET key value NX EX seconds`) so every instance shares it. If the work takes more than a few seconds, acknowledge first and process from a queue, since HubSpot treats anything slower than five seconds as a failure. And no key makes delivery exactly-once: a crash between "SMS sent" and "mark done" can still repeat once after the lease expires. When the downstream API accepts its own idempotency key, pass yours through.

Without code, the same idea is a first-step lookup in a data store or table keyed on the event ID, plus a filter that stops the run when the key exists. It fails when two deliveries arrive at once, because "check then write" across two steps isn't atomic.

## How do I trace one event across every step?

Give each event a correlation ID at the first step and carry it everywhere: into every log line, CRM note, Slack alert and outbound request header. Use the incoming event ID if there is one, otherwise a UUID, as the handler above does with `X-Correlation-Id`. Then you search one string across run history and the CRM instead of matching timestamps. Write it to a CRM property too, so a record shows which run last touched it. This matters most when an LLM step writes to the CRM; the [production LLM workflows post](/insights/llm-workflows-update-crm-production/) covers that case.

## Where should failures go?

To one channel, owned by a named person, with enough context to act on. The account owner's inbox doesn't count.

| Platform | What to turn on | What it sends |
|---|---|---|
| Zapier | Notification settings per Zap: *Immediately*, *Immediately, then hourly summary* or *Hourly summary* (never *Never*), plus labels in the subject line | Email per error or digest |
| Zapier | A custom error handler whose path posts to Slack or a ticket, since handled errors send no email | Your own alert |
| Make | A **Retry** handler (needs *Store incomplete executions*) on modules that call flaky APIs, plus your own alert route | Incomplete executions you can retry |
| n8n | A workflow starting with the **Error Trigger** node, selected under *Options → Settings → Error workflow* in each production workflow | Workflow name, execution URL, last node, error message |

In n8n, the Error Trigger only fires for automatic runs, so a manual test run won't trigger it. The **Stop And Error** node raises your own failures (say, "LLM returned invalid JSON") into the same error workflow.

Alert on absence too: a daily count of "forms received" against "contacts created" catches halted and skipped runs that never raise an error.

## What is a dead-letter queue, and do I need one?

It's where failed events wait, with their payloads, until someone fixes the cause and replays them. You need one wherever losing an event costs money. Make's incomplete executions are a built-in version: the Retry handler stores the failed bundle with its data, and with *Automatically complete execution* on, Make retries 3 times at 15-minute intervals by default; otherwise it waits for you. Zapier's Zap history plus replay plays the same role for errored runs. In code, it's a table of failed events and a replay script that goes through the idempotent handler, so replaying twice is safe.

## When should a scenario move into code?

When correctness depends on things the platform can't do atomically or can't show you.

| Keep it in Zapier, Make or n8n | Move it into code |
|---|---|
| Low volume, a missed or doubled run is an annoyance | A duplicate costs money or reputation: SMS, invoices, orders |
| One trigger, a few steps, no shared state | Dedupe, ordering or concurrency matters |
| Errors are rare and someone checks the history | You need correlation IDs, payload logs and replay |
| The person maintaining it isn't a developer | Branches and workarounds have outgrown the canvas |

A common middle ground: put a small idempotent endpoint in front of the platform, so every event is deduplicated and logged before the scenario sees it. The [stop-on-reply post](/insights/stop-crm-follow-up-when-lead-replies/) is a case where that split works well.

## What to do this week

1. **List every automation that sends something** (SMS, email, invoice) and what happens if it runs twice.
2. **Check the alert route for each one.** Zapier notification frequency, Make's scenario settings, n8n's *Error workflow*. Point all of them at one channel with a named owner.
3. **Search the run history for quiet outcomes:** Zapier's *Safely halted* and *Stopped/Handled* runs, Make runs that ended in *Warning*, n8n nodes set to *Continue*.
4. **Add a dedupe key** to the first step of anything that sends a message.
5. **Add a daily count check** of events in versus records out.
6. **Pick the one scenario** where a duplicate or a drop would hurt most, and decide whether it belongs in code.

*Checked against Zapier's help center, Make's Help Center, the n8n docs, and HubSpot's and Stripe's webhook documentation in October 2026. Code tested on Python 3.12 (standard library only) with simulated duplicate, concurrent and failed deliveries.*

Sources: [Zapier: What is replay?](https://help.zapier.com/hc/en-us/articles/19220226086797-What-is-replay), [Zapier: Set up custom error handling](https://help.zapier.com/hc/en-us/articles/22495436062605-Set-up-custom-error-handling), [Zapier: Troubleshoot errors in Zaps](https://help.zapier.com/hc/en-us/articles/8496037690637-Troubleshoot-errors-in-Zapier), [Zapier: Replay an entire Zap run](https://help.zapier.com/hc/en-us/articles/24098445317389-Replay-an-entire-Zap-run-starting-from-your-trigger), [Zapier: Decide how your Zap handles errors](https://help.zapier.com/hc/en-us/articles/14167175792909-Decide-how-your-Zap-handles-errors-with-advanced-settings), [Zapier: Manage notifications when errors occur](https://help.zapier.com/hc/en-us/articles/8496289225229-Manage-notifications-when-errors-occur-in-Zap-workflows), [Make: Error handlers](https://help.make.com/error-handlers), [Make: Overview of error handling](https://help.make.com/Overview-of-error-handling), [Make: Retry error handler](https://help.make.com/retry-error-handler), [Make: Automatic retry of incomplete executions](https://help.make.com/automatic-retry-of-incomplete-executions), [Make Community: Error handlers update](https://community.make.com/t/error-handlers-update/109506), [n8n: Error Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.errortrigger), [n8n: Work with nodes](https://docs.n8n.io/build/understand-workflows/workflow-components/work-with-nodes), [HubSpot: Webhooks API guide](https://developers.hubspot.com/docs/api-reference/2026-03/webhooks/guide), [Stripe: Receive events in your webhook endpoint](https://docs.stripe.com/webhooks).
