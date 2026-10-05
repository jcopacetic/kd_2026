---
title: "Auditing an Inherited CRM Before You Rebuild It (HubSpot and Zoho)"
seoTitle: "Auditing an Inherited HubSpot CRM Before You Rebuild It"
description: "How to audit a messy, inherited HubSpot or Zoho CRM before a rebuild: what to inventory first, how to decide keep, fix or rebuild, and what order to fix it in."
pubDate: 2026-10-05
pillar: revops
tags: ["CRM Audit","HubSpot","Zoho CRM","RevOps","Data Quality"]
---

Before you rebuild an inherited CRM, spend a week finding out what is actually running in it: which integrations write to it and who authorized them, which workflows still enroll records, which properties nothing reads, how records really move through your lifecycle and pipeline stages, how many duplicates you have, and where lead source gets lost. Change nothing while you look. Then sort every finding into keep, fix, rebuild or retire, and fix in a fixed order: the things that write data first, definitions second, reports last.

Skip the inventory and a rebuild copies the old problems into a clean-looking portal. This is the work I do in a [Systems Audit](/audit/), and the starting point for most of my [RevOps engagements](/services/revops/). Below is the method, so you can run it yourself or know what to expect from whoever does.

## What does an inherited CRM usually look like?

It's half-built, and the person who built it has left. The portal went through several iterations. An admin or contractor set up integrations and workflows, then moved on without documentation. Sales doesn't trust the dashboards. Leadership asks for a rebuild, or "tell us what to automate."

Both requests are premature. You can't decide what to automate until you know what already is, and you can't rebuild safely while unknown integrations keep writing to the fields you're redesigning.

## What should you inventory first?

Start with whatever writes to the CRM, because anything that writes will keep undoing your cleanup. Then move to what the CRM contains. In order:

### 1. Integrations, and who owns them

In HubSpot, go to **Settings → Integrations → Connected Apps**. For each app, note **Installed by**, **Last activity date** and the **App owner**. The **Connections insights** tab adds an app log of connections and setting changes, record event counts by app, and daily API call usage for private apps.

Two risks show up here. First, a connected app whose installer is gone. HubSpot makes you reassign the App owner when you deactivate that user, but nobody may know what the app does. Second, legacy private apps: HubSpot documents that removing the user who created a private app can make some calls fail with `USER_DOES_NOT_HAVE_PERMISSIONS`. I've covered [keeping integrations alive when an admin leaves](/insights/hubspot-integration-user-admin-leaves/) separately.

Connected Apps won't show everything. Also list Zapier and Make accounts (and whose login owns them), workflow webhooks, custom code secrets, and any script holding a HubSpot token. For each, note what it writes, to which properties, and who can log in to fix it.

### 2. Workflows that still fire

Under **Automation → Workflows**, filter by status *On*, then by creator and action type. On Professional and Enterprise, the **Health** tab counts workflows marked *Needs review* and **unused workflows**, meaning no enrollments for at least 90 days. Each workflow's action logs can be filtered to errors, and **View → Revision history** shows who changed what and when.

The ones that matter most set properties, change lifecycle stage, rotate owners or send email, because they quietly overrule what the team does by hand. Record each trigger and action before you touch anything. A deleted workflow can be restored within 90 days, but HubSpot restores it as a new, inactive workflow with no history or past versions. If you want to pull workflow definitions programmatically, know the limits first: I've written up [what the Workflows API can and can't read](/insights/hubspot-workflows-api-what-you-can-read/).

### 3. Properties nothing reads

Open any property in **Settings → Properties**. The property editor's **Monitor** section shows **Usage** (where the property is used in the CRM, and its fill rate) and **Data sources** (the tools that update it). Under **Data Management → Data Quality**, property insights flags properties as *No data*, *Unused* or *Duplicates*.

Look for properties nobody fills, properties nothing reads, and near-duplicates such as three "lead source" fields written by three tools. That last group hurts most, because each integration believes it owns the field. Before you consolidate, decide which source wins. See [stopping integrations from overwriting CRM data](/insights/stop-integrations-overwriting-crm-data/) for how to set that up.

### 4. Lifecycle and stage definitions against reality

Ask three people what makes a contact an SQL, or what a deal needs before it moves to *Proposal*. If you get three answers, the reports can't be trusted no matter how well they're built.

Then compare the definitions to the data. HubSpot records **Date entered** and **Date exited** for each lifecycle stage. Its default automation moves stages forward only: creating a deal sets *Opportunity*, a closed-won deal sets *Customer*. Moving a record backward means clearing the value first. Look for records that jumped stages, stages nobody ever enters, and deals that sit in one stage for months because there are no exit criteria.

### 5. Duplicates

HubSpot automatically deduplicates contacts by email address and companies by primary domain. Deals and tickets aren't deduplicated that way; imports can match them on Record ID, and you can create up to ten custom properties that require unique values. The **Manage duplicates** tool under **Data Management → Data Quality** lists suspected duplicate contacts and companies for review.

In an audit, count duplicates and find their source; don't merge them. HubSpot merges can't be reversed, and the primary record's values generally win (lifecycle stage takes the furthest of the two). Merging before you know what keeps creating duplicates hides the evidence.

### 6. Lead-source capture

Trace each way a lead arrives (form, import, integration, manual entry, phone) to its record, and check what source value lands. Imported event lists often arrive with none. On deals, HubSpot's **Original Traffic Source** comes from the associated contact with the earliest activity. Deal-create and revenue attribution reports are Marketing Hub Enterprise only, so on Professional the source fields themselves have to be right.

## How do you decide keep, fix or rebuild?

Judge each piece on two separate questions: is the *intent* right, and is the *implementation* right?

| Finding | Intent | Implementation | Decision |
| --- | --- | --- | --- |
| Works, is used, someone owns it | Right | Right | **Keep**, and document it |
| Right idea, broken or fragile | Right | Wrong | **Fix** in place |
| Built on a definition the business no longer uses | Wrong | Any | **Rebuild** from the new definition |
| No reader, no writer, no owner | None | Any | **Retire**, after a recorded export |

Rebuild is the right call less often than people expect. Most inherited portals have a few wrong foundations (a pipeline mixing two sales motions, a lifecycle stage used for two meanings) and many fixable details. A full rebuild makes sense only when the foundations are wrong and most of the system depends on them.

## What order should you fix things in?

Fix in dependency order, so nothing you clean gets dirtied again.

1. **Credentials and ownership.** Move integrations to an owner who will still be there next year, and rotate tokens nobody can account for.
2. **Writers that corrupt data.** Pause or correct integrations and workflows that overwrite good values, create duplicates or set the wrong stage.
3. **Definitions.** Agree on lifecycle stages, pipeline entry and exit criteria, and lead-source values with sales and marketing in the room.
4. **Data.** Merge duplicates, consolidate properties, backfill sources where you can, and retire what's unused.
5. **Reports.** Rebuild dashboards only now, on definitions people agreed to.
6. **New automation.** "What should we automate?" has a real answer at this point: the audit shows where people still do the same task by hand every day.

## What should a written audit hand back?

A ranked list of findings, not a slide of observations. Each finding should state:

- **What:** the specific integration, workflow, property or definition.
- **Evidence:** the screen, log or count that proves it.
- **Impact:** what it breaks, such as wrong reports, lost leads or duplicate sends.
- **Risk of changing it:** what depends on it, and what could break.
- **Effort:** hours or days, with a price range for anything bigger than a quick fix.
- **Decision:** keep, fix, rebuild or retire, and in what order.

It should also separate quick wins your team can do this week from scoped work, and list anything running on APIs or app types HubSpot is retiring, with deadlines. That's the shape of my [Systems Audit](/audit/): read-only access, a working session with the people who use the system, and a written roadmap ranked by impact and effort. It's a fixed fee of $3,500–$5,000, set at intake by the size of the system, and the roadmap is yours to act on with me or anyone else.

## What's different in Zoho CRM?

The method is the same; the tools have different names. Zoho CRM's **Audit Log**, under Data Administration, tracks actions taken in a module or on a record. For duplicates, **Find & Merge Duplicates** works from a single record, and the **De-duplicate** tool checks a whole module (Leads, Accounts, Contacts, Deals, Vendors and custom modules), merging at most three records at a time. Edition availability varies, so check Zoho's feature-availability page for yours.

If Zoho Marketing Automation is in the stack, check sync direction first. CRM-to-ZMA syncs and ZMA's *Push to CRM* journey action are separate mechanisms. A push is skipped when mandatory fields are missing or invalid or CRM permissions fail, a common cause of "leads aren't syncing" after a half-finished setup.

## What to do this week

- [ ] Export the Connected Apps list with installer, owner and last activity. Add every Zapier, Make and script credential.
- [ ] List every active workflow that sets properties, changes stages or sends email, with its trigger.
- [ ] Open the *Unused* and *No data* lists in property insights. Don't delete anything yet.
- [ ] Write down your lifecycle and pipeline stage definitions, and have sales and marketing sign them.
- [ ] Count duplicate contacts and companies, and note which source created them.
- [ ] Trace one lead from each source to its record, and check the source value it ends up with.
- [ ] Rank what you find by impact and effort before anyone starts rebuilding.

If the list gets long or the dependencies get tangled, that's what the [Systems Audit](/audit/) is for.

*Checked against HubSpot's Knowledge Base and Zoho CRM's help documentation in October 2026.*

Sources: [Manage your connected apps](https://knowledge.hubspot.com/integrations/manage-your-connected-apps), [Private apps overview](https://developers.hubspot.com/docs/guides/apps/private-apps/overview), [Organize and manage your workflows](https://knowledge.hubspot.com/workflows/organize-your-workflows), [Monitor your workflow health](https://knowledge.hubspot.com/workflows/monitor-your-workflow-health), [View and revert changes to your workflow](https://knowledge.hubspot.com/workflows/view-workflow-changes), [Delete and restore workflows](https://knowledge.hubspot.com/workflows/delete-and-restore-workflows), [Understand the property editor](https://knowledge.hubspot.com/properties/understand-the-property-editor), [Use data quality tools](https://knowledge.hubspot.com/data-management/use-data-quality-tools), [Use lifecycle stages](https://knowledge.hubspot.com/records/use-lifecycle-stages), [Deduplication of records](https://knowledge.hubspot.com/records/deduplication-of-records), [Merge records](https://knowledge.hubspot.com/records/merge-records), [HubSpot's default deal properties](https://knowledge.hubspot.com/properties/hubspots-default-deal-properties), [Create attribution reports](https://knowledge.hubspot.com/reports/create-attribution-reports), [Zoho CRM Data Administration](https://help.zoho.com/portal/en/kb/crm/data-administration/overview/articles/data-administration-overview), [Zoho CRM: De-duplicate records](https://help.zoho.com/portal/en/kb/crm/manage-crm-data/duplication-management/articles/auto-merge-duplicates), [Zoho CRM: Merging duplicate records](https://help.zoho.com/portal/en/kb/crm/manage-crm-data/duplication-management/articles/merge-duplicate-record), [Zoho Marketing Automation: set up sync with Zoho CRM](https://help.zoho.com/portal/en/kb/marketing-automation-2-0/user-guide/settings/sync-services/articles/how-to-setup-sync-with-zoho-crm).
