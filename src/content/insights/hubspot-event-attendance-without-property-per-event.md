---
title: "Tracking Event and Webinar Attendance in HubSpot Without a Property Per Event"
seoTitle: "HubSpot Webinar Attendance Without a Property Per Event"
description: "Stop creating a HubSpot property per webinar. Track registrations and attendance with marketing events, custom events or a custom object, by tier."
pubDate: 2026-10-08T14:00:00-05:00
pillar: revops
tags: ["HubSpot","Marketing Events","Webinars","Workflows","Segments"]
---

Don't create a contact property for every webinar. HubSpot already has an object for this: the **marketing event**, which stores who registered, attended and cancelled for each event, on every plan. Create one marketing event per webinar, record participation on it (through a native integration, a CSV import, a workflow action or the API), and build follow-up from the marketing event filters in segments. Custom events (Professional) and custom objects (Enterprise) are for the cases marketing events don't cover.

The property-per-event pattern is one of the things I find most often when I'm [cleaning up a HubSpot portal's data model](/services/revops/). It works for the first three webinars. By the thirtieth you have thirty near-identical properties, thirty forms and a workflow nobody wants to touch.

## Why is a property per event a bad idea?

It turns every new event into schema work. Each webinar needs a new property, a new form or form field, new list filters and edits to every workflow that cares about "attended anything". Reporting across events means stitching properties together. And a single property can only hold one value, so a contact who registers, cancels and registers again loses the history.

Event participation is a many-to-many relationship: many contacts, many events, a status for each pair. HubSpot gives you three places to put that, depending on your tier.

## What are your options?

| Option | Tier | Stores per contact, per event | Best for |
|---|---|---|---|
| Property per event | Any | One value, overwritten | Nothing at scale. Don't. |
| **Marketing events object** | All plans (workflows need Professional) | Registered, attended, cancelled, no-show, attendance duration | Webinars and events, which is most cases |
| **Custom events** | Professional and Enterprise | Each occurrence with up to 50 properties | Activity marketing events don't model, like session-level or in-app behaviour |
| **Custom object** | Enterprise only | Whatever you design | Registrations with their own lifecycle: tickets, payments, sessions, owners |

My recommendation by tier: on Starter or Free, use marketing events with a native integration or CSV imports. On Professional, use marketing events plus workflows, and add custom events only if you need data marketing events can't hold. On Enterprise, still start with marketing events, and reach for a custom object only when a registration is a record with its own fields and process, like a paid conference ticket.

## What does the marketing events object store?

A marketing event is a CRM object, like contacts and companies, for a webinar, conference or other event. HubSpot's knowledge base lists it as available on all products and plans. The event itself has properties like name, type, organizer, start and end date, plus counts of **Registrations**, **Attendees**, **Cancellations** and **No shows**.

The useful part is per contact. Each contact record gets a **Marketing events** card showing every event they've touched, with a status of **Registered**, **Attended**, **Canceled** or **No Show**, along with registration, participation and cancellation dates. So the event's attendance list lives on the event, and the contact's history lives on the contact. No custom properties involved.

Participation gets in four ways:

1. **Native integrations.** HubSpot syncs marketing events from Zoom, GoToWebinar, Microsoft Teams webinars and Eventbrite. If your platform is on that list, connect it and you're mostly done.
2. **Import.** For in-person events or platforms without an integration, create the event under **Marketing > Events > Create marketing event**, then open it and use **Actions > Import event contacts** with a CSV. Email is the unique identifier, so existing contacts are updated rather than duplicated.
3. **Workflow action.** **Add participant to marketing event** registers a contact (for example, after a form submission). It needs Professional for workflows and only works on events created manually in HubSpot, not ones synced from an integration.
4. **The Marketing Events API**, for any other webinar platform. More on that below.

## How do you use one form for many webinars?

Reuse one registration form on every webinar landing page, and decide which event a submission belongs to by where it was submitted. When this came up on the HubSpot Community, a HubSpot community manager confirmed that routing to different webinars from a dropdown in one form "is not a native option", and the suggested approach was one form reused across landing pages, narrowed by the submission page.

In practice, on Professional:

1. Put the same form on each webinar's landing page.
2. Create the marketing event for each webinar manually (so the workflow action can use it).
3. Build a workflow per webinar that enrolls on that form submitted on that webinar's page, and runs **Add participant to marketing event** for the matching event.

HubSpot's knowledge base doesn't spell out the page-level refinement on the form submission trigger. Community answers report you can narrow the trigger to the page the form was submitted on, but only for pages hosted on HubSpot, so check it in your portal before building around it.

That's still one small workflow per event, but it's a copy-and-change-two-fields job rather than a new property, a new form and edits to every downstream list. If your webinar platform has a native integration, let the integration do the registration instead and skip the workflow entirely.

## How do you follow up attended vs registered-but-no-show?

Build segments from the marketing event filters, then drive workflows from segment membership. In the segment editor, the **Events** tab has a **Marketing events** category with four filters: **Registered for marketing event**, **Attended marketing event**, **Canceled marketing event registration** and **Attendance duration**.

For each webinar (or a series, if you pick several events):

- **Attended**: "Attended marketing event" is the webinar. Enroll these in the thank-you and recording sequence, and route hot ones to sales.
- **Registered, no-show**: "Registered for marketing event" is the webinar, then branch the follow-up workflow on whether the contact is also in the attended segment. Non-attendees get the "sorry we missed you" recording email.
- **Engaged attendees**: "Attendance duration" lets you split people who stayed for the demo from people who left after five minutes.

Run the no-show logic after the attendance data has landed. If the workflow fires the moment the webinar ends, an integration or import that's still catching up will make every attendee look like a no-show. A short delay at the start of the workflow avoids that. If a reply should stop the sequence, that's its own problem: see [stopping CRM follow-up when the lead replies](/insights/stop-crm-follow-up-when-lead-replies/).

## How do you write attendance through the Marketing Events API?

If your webinar platform has no native integration, a small job can record registrations and attendance on the event. The 2026-09 API creates the event with `POST /marketing/marketing-events/2026-09/events` (required: `eventName`, `eventOrganizer`, `externalAccountId`, `externalEventId`, `customProperties`), then records participation by email:

```javascript
// Record webinar participation on a HubSpot marketing event (2026-09 API).
// state: 'REGISTERED' | 'ATTENDED' | 'CANCELLED'
// people: [{ email, at, joinedAt?, leftAt?, firstname?, lastname? }] from your webinar platform
async function recordParticipation({ token, externalAccountId, externalEventId, state, people, fetchImpl = fetch }) {
  const url = 'https://api.hubapi.com/marketing/marketing-events/2026-09/attendance/'
    + `${encodeURIComponent(externalEventId)}/${state}/email-create`
    + `?externalAccountId=${encodeURIComponent(externalAccountId)}`;
  const inputs = people.map((p) => ({
    email: p.email,
    // Use the platform's own timestamp, never Date.now(): HubSpot treats a repeat
    // of the same contact + interactionDateTime as the same activity.
    interactionDateTime: new Date(p.at).getTime(),
    properties: state === 'ATTENDED' && p.joinedAt ? { joinedAt: p.joinedAt, leftAt: p.leftAt } : {},
    // Only used when HubSpot has to create the contact; ignored for existing ones.
    contactProperties: { firstname: p.firstname ?? '', lastname: p.lastname ?? '' },
  }));
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs }),
  });
  const body = await res.json();
  if (!res.ok || body.numErrors) {
    throw new Error(`Marketing event ${externalEventId} ${state}: ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.results;
}
module.exports = { recordParticipation };
```

Things that matter here, all from HubSpot's API guide and reference:

- **Scopes**: `crm.objects.marketing_events.write` to write, `.read` to read.
- **Same app only.** Endpoints that take `externalEventId` and `externalAccountId` only work for the app that created the event. Another app gets a 404. Endpoints that take the event's `objectId` (its Record ID) work for any app with the scopes.
- **New contacts are created** when the email doesn't match one. `contactProperties` only applies to those; existing contacts aren't updated.
- **Idempotency** holds as long as the contact and `interactionDateTime` don't change, which is why the code uses the platform's timestamp. Re-running a sync then doesn't create duplicate activity.
- **Timeline events**: this endpoint adds one to each contact, so sales sees the webinar on the record. The older `/upsert` and `/email-upsert` endpoints don't.
- **Counts can differ.** The API's participation counters reflect each contact's current state; the marketing events page in HubSpot counts every activity, so register, cancel, re-register shows up three times there.

## When should you use custom events or a custom object instead?

Use **custom events** when you need to record behaviour marketing events can't hold: which sessions of a multi-track event someone joined, poll answers, or in-product activity. They're available on Professional and Enterprise, allow up to 50 properties per event, can be sent by API, tracking code, import or (with Data Hub) webhooks, and show up in workflow triggers, segments and reports. Define them as code so they stay consistent; I cover that in [HubSpot custom events as schema-as-code](/insights/hubspot-custom-events-schema-as-code/).

Use a **custom object** only on Enterprise, and only when a registration is a thing in its own right: a paid ticket with an amount, a seat, a session, an owner and a status that sales works. That's a real data model, with associations to contacts, companies and deals. For "did they come to the webinar", it's overkill.

## What to do this week

- [ ] Count the event-specific properties on your contact object. Stop adding new ones today.
- [ ] Check whether your webinar platform syncs natively (Zoom, GoToWebinar, Microsoft Teams webinars, Eventbrite).
- [ ] Create a marketing event for your next webinar and put one shared registration form on its landing page.
- [ ] Build two segments for it, attended and registered, and a follow-up workflow that branches on them.
- [ ] For past events, import attendance into marketing events from your old properties or platform exports, then retire the properties once nothing reads them.

*Checked against HubSpot's knowledge base (marketing events, marketing event properties, custom events, custom objects) and the Marketing Events API 2026-09 guide and reference in October 2026. Code tested in Node 22 against a mocked fetch and a local mock server.*

Sources: [Use marketing events](https://knowledge.hubspot.com/integrations/use-marketing-events), [Import marketing event participants](https://knowledge.hubspot.com/integrations/import-marketing-event-participants), [View marketing events on contact records](https://knowledge.hubspot.com/integrations/view-marketing-events-on-contact-records), [HubSpot's default marketing event properties](https://knowledge.hubspot.com/integrations/hubspots-default-marketing-event-properties), [Marketing events API guide](https://developers.hubspot.com/docs/api-reference/latest/marketing/marketing-events/guide), [Record attendance by participant email and external event ID](https://developers.hubspot.com/docs/api-reference/latest/marketing/marketing-events/attendance/set-attendance-email-externalId), [Create a marketing event](https://developers.hubspot.com/docs/api-reference/latest/marketing/marketing-events/create-event), [Create custom events](https://knowledge.hubspot.com/reports/create-custom-events), [Create custom objects](https://knowledge.hubspot.com/object-settings/create-custom-objects).
