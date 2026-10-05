---
title: "Deal and Revenue Attribution on HubSpot Marketing Hub Professional"
seoTitle: "HubSpot Deal Attribution on Marketing Hub Professional"
description: "HubSpot deal and revenue attribution reports need Marketing Hub Enterprise. How to report which channel drives pipeline on Professional, and what you give up."
pubDate: 2026-10-05
pillar: revops
tags: ["HubSpot","Attribution","Reporting","Marketing Hub","RevOps"]
---

On Marketing Hub Professional you get **contact create attribution** reports only. **Deal create** and **revenue attribution** reports are Marketing Hub Enterprise only. You can still answer "which channel drives pipeline" on Professional: every deal already carries an **Original Traffic Source** that HubSpot fills in, and a deal-based workflow can copy your campaign and UTM fields onto the deal when it's created. Report deals by those fields, and use lifecycle "Date entered" stamps for funnel timing.

That gives you reliable single-touch reporting, not multi-touch attribution. Below is how to set it up and where it stops. If you want someone to build and sanity-check the reporting with you, that's part of my [RevOps work](/services/revops/).

## What does Professional include, and what needs Enterprise?

Professional gives you contact create attribution; deal and revenue attribution need Enterprise. HubSpot's attribution reports page lists the tiers:

| Report | Who can use it |
| --- | --- |
| Contact create attribution | Marketing Hub Professional, Enterprise; Content Hub Professional, Enterprise |
| Deal create attribution | Marketing Hub Enterprise only |
| Revenue attribution | Marketing Hub Enterprise only |

The attribution reports support First Touch, Last Touch, Linear, Time Decay and an Empirical model. On Professional, those models apply to contact creation: which interactions get credit for a new contact. That tells you where leads come from. It doesn't tell you which of those leads became pipeline, which is the question most B2B teams are actually asking.

## What's already on the deal?

More than most teams realise. HubSpot's default deal properties include:

- **Original Traffic Source**: "the original traffic source of the associated contact with the earliest activity for the deal", plus **Original Traffic Source Drill-down 1** and **Drill-down 2**.
- **Latest Traffic Source**, its two drill-downs, and **Latest Traffic Source Date**, based on the associated contact with the most recent session.
- **Record Source** and **Record Source Detail 1–3**: "how the deal was created", set automatically by HubSpot.
- **Campaign / Medium / Source of Last Booking in Meetings Tool**: UTM values from the most recent meetings-link booking by an associated contact.

So for channel-level reporting ("Organic Search vs Paid Social vs Offline"), you don't need to copy anything. Build a deal report grouped by Original Traffic Source and you're most of the way there.

Two caveats. These values are derived from the associated contacts, so adding or removing a contact on the deal can change them. And Original Traffic Source is a channel, not a campaign: it won't tell you which webinar or which ad set.

## How do you get campaign and UTM data onto the deal?

Capture it on the contact, then copy it to the deal with a deal-based workflow at creation. Deal-based workflows are included in Marketing Hub Professional.

1. **Capture UTMs on the contact.** HubSpot doesn't give you raw UTM contact properties out of the box. Create contact properties (`utm_source`, `utm_medium`, `utm_campaign`, and a first-touch campaign if you want one) and fill them with hidden form fields, which HubSpot supports for passing URL query values into contact properties. Hidden fields write on every submission, so if you want a first-touch value to stick, copy it into a separate first-touch property with a contact workflow that only sets it when it's empty.
2. **Create matching deal properties.** For example: *Source at deal create*, *Campaign at deal create*, *UTM source / medium / campaign at deal create*. Name them so nobody confuses them with HubSpot's own properties.
3. **Build a deal-based workflow** that enrolls deals when they're created. Add a short delay first, because deals created by hand or by integrations often get their contact associated a moment later.
4. **Branch on whether the associated contact has a value.** HubSpot's docs warn that copying from an empty source property may leave the target blank or error, and recommend checking first.
5. **Use the Edit record action** to copy each contact property to the deal property. HubSpot supports copying values between associated records with this action.
6. **Copy Original Traffic Source too**, into your own *Source at deal create* property. That freezes the value as it was when the deal opened, so later contact associations don't rewrite history.
7. **Backfill existing deals** by re-enrolling them, and spot-check a sample against the contacts.

One gap HubSpot's docs don't cover: which contact's value gets copied when a deal has several associated contacts. Test it in your portal with a deal that has two contacts with different sources. If the answer isn't what you want, agree a rule (for example, the contact who created the deal or the first one associated) and make your process enforce it.

Offline sources need the same discipline. Tradeshow lists and purchased lists lose their source on import unless you set one. Add source and campaign columns to every import, so those contacts arrive with values the workflow can copy.

## Which reports answer "which channel drives pipeline"?

Three single-object reports cover most of what a Professional team needs:

- **Pipeline by source.** Deals created in the period, grouped by *Source at deal create* (or *Campaign at deal create*), summing Amount. This is your sourced pipeline.
- **Revenue by source.** The same, filtered to closed won deals, by close date.
- **Lifecycle conversion by source.** Contacts grouped by original source, counting how many have a value in **Date entered** for each lifecycle stage (lead, MQL, SQL, opportunity, customer). HubSpot records "Date entered [stage]" automatically for contacts and companies. That shows where each channel's leads stall.

Professional also unlocks **Latest time in** and **Cumulative time in** lifecycle stage properties, which give you time-in-stage by channel. On deals, **Date entered current stage** is Professional and up too, if you need stage timing on the pipeline side. For how stages should be defined in the first place, see my guide to [designing pipelines](/insights/developing-effective-pipelines-for-sales-operations-and-after-service/).

## What this can't do

Be honest about this with whoever reads the dashboard. Everything above is single-touch.

| Question | Professional workaround | Enterprise attribution |
| --- | --- | --- |
| Which channel sourced this deal? | Yes, first touch or frozen at create | Yes |
| Which campaign sourced it? | Yes, if UTMs are captured and copied | Yes |
| What did every touch before the deal contribute? | No | Yes, multi-touch models |
| Credit split across several contacts on a deal | No, one value per deal | Yes |
| Revenue credited to content and interactions | No | Yes, revenue attribution |

If the business decision is "should we keep spending on paid social", sourced pipeline and closed revenue by channel are usually enough to make it. If the decision depends on how mid-funnel content or events influence deals already in play, you're asking a multi-touch question, and that's where Enterprise or a dedicated attribution tool earns its cost.

Before you buy either, check the data underneath. Wrong lifecycle logic, duplicate contacts and missing import sources will skew Enterprise attribution just as much. That's usually what an [inherited CRM audit](/insights/audit-inherited-crm-before-rebuild/) finds first.

## What to do this week

- Build a deal report grouped by Original Traffic Source. If most deals show "Offline Sources" or are blank, fix capture before anything else.
- Create UTM contact properties and add hidden fields to your main forms.
- Create the "at deal create" deal properties and the copy workflow, with a delay and a has-value branch.
- Test the workflow on a deal with two contacts from different sources, and write down the rule.
- Add source and campaign columns to your import template.
- Build the three reports: pipeline by source, revenue by source, lifecycle conversion by source.

*Checked against HubSpot's knowledge base (attribution reports, default deal properties, lifecycle stages, workflow object types, editing records with workflows, hidden form fields) in October 2026.*

Sources: [Create attribution reports](https://knowledge.hubspot.com/reports/create-attribution-reports), [HubSpot's default deal properties](https://knowledge.hubspot.com/properties/hubspots-default-deal-properties), [Use lifecycle stages](https://knowledge.hubspot.com/records/use-lifecycle-stages), [Understand workflow object types](https://knowledge.hubspot.com/workflows/understand-workflow-object-types), [Edit records using workflows](https://knowledge.hubspot.com/workflows/edit-records-using-workflows), [Pass contact property values with hidden form fields](https://knowledge.hubspot.com/forms/pass-contact-property-values-with-hidden-form-fields).
