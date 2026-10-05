---
title: "Zoho Marketing Automation Leads Not Syncing to Zoho CRM: Causes and Fixes"
seoTitle: "Zoho Marketing Automation Leads Not Syncing to CRM: Fixes"
description: "Zoho Marketing Automation leads not reaching Zoho CRM? Check sync direction, Push Data settings, mandatory fields, mapping, permissions and limits, in order."
pubDate: 2026-10-08T08:00:00-05:00
pillar: revops
tags: ["Zoho CRM","Zoho Marketing Automation","CRM Sync","Lead Management","Troubleshooting"]
---

When leads from Zoho Marketing Automation don't show up in Zoho CRM, the cause is usually that nothing is configured to send them. The Zoho CRM sync you set up under Integrations runs **from CRM into Marketing Automation**. Leads only go the other way through a form response action or a journey's **Push Data** step (**Push to Zoho CRM** in the older version). If that push exists, Zoho documents why it skips leads: missing or invalid mandatory field data, CRM permission denials, the wrong module, sync criteria and plan limits, and fields that can't be mapped.

This is a common state for a Zoho setup someone started and didn't finish: forms live, sync half-configured, nobody sure which way data flows. Untangling that is the kind of [RevOps repair work](/services/revops/) I do. Below is the order I'd check things in, one cause per section.

## Which direction is broken?

Work out which way the data should be flowing before touching any setting. "Leads not syncing" means two different failures:

- **CRM → Marketing Automation**: records in CRM's Leads or Contacts module aren't appearing as contacts in Marketing Automation. This is the **sync** you set up on the Zoho CRM integration.
- **Marketing Automation → CRM**: people who filled in a Marketing Automation signup form or landing page aren't becoming leads in CRM. This only happens through a **push**: a signup form response action, or the **Push Data** component in a journey.

Zoho's Marketing Automation 2.0 documentation lists what flows back to CRM: opt-out status, contact score and contact stage (each to a custom field of the right type), campaign data in CRM's Campaigns module, and leads pushed through journeys. New form leads aren't in the sync. If nobody set up a push, nothing is broken; it was never built.

Two account-level rules also stop things before they start. Only one CRM account can be integrated with Marketing Automation, and a Zoho CRM account can integrate with Zoho Marketing Automation or Zoho Campaigns, not both. In an inherited setup, check that someone didn't connect Campaigns first.

## Is the push actually configured?

Find every place that's supposed to create CRM leads and open its settings. There are two:

1. **The signup form's response action.** Zoho's own walkthrough describes a form action to "Push new contacts to Zoho CRM (update existing or update existing and add new)." If it's set to **update existing** only, new people are never created in CRM. This is the most likely answer to "form submission not creating lead in CRM".
2. **The journey's Push Data component.** In Marketing Automation 2.0, you add a trigger to the journey, add **Push Data** under Actions, click **Edit**, select the CRM module, and use **View Mapped Fields** to check the mapping. Contacts are pushed "based on the criteria set in the trigger", so a journey that's paused, never published, or triggered by a list the form doesn't feed will push nobody.

In the older Zoho Marketing Automation (documented under its earlier name, Zoho MarketingHub), the journey component is **Push to Zoho CRM**, dragged in from the **Process** section. It offers two options: push all leads, creating CRM records for new ones, or update only leads that already exist in CRM, where "new records will not be created". Same trap.

## Are mandatory fields missing or invalid?

Zoho's FAQ for the push says leads are skipped when mandatory fields have no data or when field data is invalid. This is the most common silent failure, because the form can collect less than CRM demands.

- CRM's **Leads** module has one system-defined mandatory field, Last Name, and admins often add their own required fields on top. If your Marketing Automation form only asks for an email, the push has nothing to send for those fields.
- Zoho Campaigns, the sister product, documents its push requirements explicitly: first name, last name and email for a Lead, plus company name for a Contact. Marketing Automation doesn't publish an equivalent list, so compare against your CRM layout instead.
- For contacts flowing into Marketing Automation, Zoho requires an email address or mobile number, with phone numbers in E.164 format (`+11234567890`).

**Fix it** by adding the required fields to the form, or by agreeing with the CRM admin which fields really need to be mandatory for marketing-sourced leads. Zoho doesn't document whether CRM validation rules are applied to pushed records, so if you have validation rules on Leads, test a push that breaks one before assuming they're not involved.

## Do the field mappings and picklists line up?

A mapping can exist and still fail on data. Zoho's 2.0 integration guide lists **inconsistent data type mappings** and **field length** violations as reasons records are skipped.

- **Picklists**: if Marketing Automation sends a value CRM's picklist doesn't have ("USA" into a field whose options say "United States"), treat that as invalid field data until a test shows otherwise. Make the form's options match CRM's exactly.
- **Types and lengths**: a text field mapped to a number, or a long text answer mapped to a short CRM field, will be skipped.
- **Fields that can't be mapped at all**: Modified By, Created By, Modified Time, Layout, Wizard, lookup and multi-user lookup fields, profile and record images, file and image uploads, subforms, Data Processing Basis, Last Follow Up By and Territories. If your process depends on one of these (an Account lookup, say), the mapping can't carry it.
- **Tags** don't sync directly. Zoho's workaround is a custom multi-picklist or text field in Marketing Automation mapped to CRM's tags field.

Open **View Mapped Fields** on the Push Data step and the **Field Mapping** tab on the integration, and check every mapped field against its CRM type.

## Does the integration have CRM permissions?

Zoho skips a push when permission is denied for the lead or for the CRM account. Only users with admin roles in both Zoho CRM and Marketing Automation can set up the integration, so check who connected it. If that person has left or been downgraded, the connection may still exist while its permissions don't. That's a pattern worth checking in any [inherited CRM audit](/insights/audit-inherited-crm-before-rebuild/).

## Are you pushing to the right module?

Leads and Contacts are separate modules in Zoho CRM, and the Push Data step pushes to whichever one you selected. Sales may be watching Leads while the journey pushes to Contacts, or the reverse. On the sync side, you choose Leads, Contacts or a custom module; Accounts and Deals data only comes across through associated contacts.

Zoho Campaigns warns against configuring the same mailing list for both Leads and Contacts because it becomes unclear which module a contact goes to. The same logic applies to Marketing Automation: one source list, one target module.

Neither product documents a separate duplicate-check setting for the push. If you suspect duplicates are being blocked, check CRM's own duplicate and unique-field settings for that module.

## Are sync criteria, exclusions or limits filtering records out?

For the CRM → Marketing Automation direction, the sync itself decides who gets through.

- **Immediate sync** picks up new CRM records in about five to ten minutes. It's for paid plans, has no criteria, and can't be used for Accounts or Deals.
- **Periodic sync** runs daily, weekly or monthly, and can use criteria or custom views. A narrow view excludes everyone outside it.
- **Limits** in Zoho's sync documentation: 10 active syncs at a time, 50 syncs initiated per month, and 5 immediate syncs per module.
- **Email-quality exclusions**: Zoho won't sync bounced, blocked or do-not-mail addresses, role-based addresses (info@, support@), duplicates, invalid email patterns or empty emails.
- **Other skips**: contacts opted out in CRM, deleted from CRM, over your plan's marketing contact limit, or in a module that no longer exists.

Each sync's **Sync History** tab shows the sync date, total records and how many were **Added**, **Updated** and **Skipped**. A high Skipped count tells you it's data, not configuration. In the older version, journey actions can also carry an **action skip criteria**, which suppresses the push for anyone who matches it. Check for one.

## Test with one record

Don't fix everything and re-run the whole database. Prove the path with a single person:

1. Submit the live form with a new test email and every field filled in, using values that match CRM's picklists.
2. Confirm the contact appears in Marketing Automation and lands in the list or trigger the push depends on.
3. Watch the journey or form action, then check the exact CRM module it targets.
4. If the record doesn't arrive, remove one variable at a time: fill a mandatory field, change a picklist value, switch the module.
5. Once one record works, check the sync's **Sync History** and the journey's reports for anyone skipped since the break, and push them again.

## What to do this week

- [ ] Write down the intended direction for each data flow: what syncs CRM → Marketing Automation, what pushes back.
- [ ] Check every signup form's response action for "update existing" vs "update existing and add new".
- [ ] List CRM's mandatory fields on Leads and Contacts and compare them with each form.
- [ ] Check picklist values, field types and lengths on every mapped field.
- [ ] Confirm who connected the integration and that they're still an admin in both apps.
- [ ] Read the Skipped counts in Sync History and fix the largest category first.
- [ ] Once leads flow, make sure the handover doesn't keep emailing people who've already replied to sales: see [stopping follow-up when a lead replies](/insights/stop-crm-follow-up-when-lead-replies/).

*Checked against Zoho's Marketing Automation 2.0, Zoho MarketingHub, Zoho Campaigns and Zoho CRM API documentation in October 2026.*

Sources: [Zoho CRM integration with Zoho Marketing Automation 2.0](https://help.zoho.com/portal/en/kb/marketing-automation-2-0/user-guide/settings/integrations/articles/zoho-crm-integration-with-zoho-marketing-automation-2-0), [Set up sync with Zoho CRM](https://help.zoho.com/portal/en/kb/marketing-automation-2-0/user-guide/settings/sync-services/articles/how-to-setup-sync-with-zoho-crm), [Integrate with a Zoho application](https://help.zoho.com/portal/en/kb/marketing-automation-2-0-beta/user-guide/settings/integrations/articles/how-to-integrate-with-zoho-application), [Why are a few contacts not synced from Zoho CRM to Zoho Marketing Automation?](https://help.zoho.com/portal/en/kb/marketing-automation-2-0/faqs/settings/sync-services/articles/why-are-a-few-contacts-not-synced-from-zoho-crm-to-zoho-marketing-automation), [When will a lead be skipped while pushing lead data to Zoho CRM?](https://help.zoho.com/portal/en/kb/marketing-automation/faqs/lead-journey/articles/when-will-a-lead-be-overlooked-while-pushing-lead-data-to-zoho-crm), [What is an action skip criteria?](https://help.zoho.com/portal/en/kb/marketing-automation/faqs/lead-journey/articles/what-is-an-action-skip-criteria), [Zoho CRM API: Insert Records](https://www.zoho.com/crm/developer/docs/api/v8/insert-records.html), [Understanding Journeys (Zoho MarketingHub user manual, PDF)](https://www.zoho.com/sites/default/files/marketinghub/user-manuals-journeys.pdf), [Push data to Zoho CRM (Zoho Campaigns)](https://help.zoho.com/portal/en/kb/campaigns/user-guide/integrate-with-zoho-crm/articles/push-data-to-zoho-crm), [Marketer's Space: Automating CRM actions with journeys, part 2 (Zoho Community)](https://help.zoho.com/portal/en/community/topic/marketer%e2%80%99s-space-automating-crm-actions-with-journeys-%e2%80%93-part-2).
