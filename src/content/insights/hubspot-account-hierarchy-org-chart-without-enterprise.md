---
title: "Account Hierarchies and Org Charts in HubSpot Without Enterprise"
seoTitle: "HubSpot Account Hierarchy and Org Charts Without Enterprise"
description: "Model parent/child companies, contact reporting lines and group revenue rollups in HubSpot on Professional, without Enterprise or a paid org chart app."
pubDate: 2026-10-07T14:00:00-05:00
pillar: revops
tags: ["HubSpot","Association Labels","Account Hierarchy","Data Model","RevOps"]
---

You can model account hierarchies and org charts in HubSpot without Enterprise. Parent and child company associations are on every plan. Reporting lines between contacts work as a paired custom association label such as **Manager / Direct report** on contact-to-contact associations, which needs any Professional hub. Rollup properties, also Professional, can then total values across labelled associations. What you don't get without extra work is a visual org chart: HubSpot's own stakeholder view, buying groups, is a beta on Sales or Service Hub Professional and up.

Below is the data model I'd set up on Professional, how to keep it from rotting, and where it stops. If you want it designed and wired into your reporting, that's part of my [RevOps work](/services/revops/).

## What does HubSpot give you natively for company hierarchies?

Parent and child company associations, on all plans. HubSpot's knowledge base calls them default **Parent company** and **Child company** association labels. A parent can have many child companies, but a child company can only have one parent. You add them from the Companies card on a company record, or in bulk with an import that maps an associated company column to the Parent Company label.

Two default company properties come with it: **Parent company** (the parent's company ID) and **Number of child companies**. A child can itself be a parent, so you can build several levels. HubSpot blocks merging companies when parent/child associations would form a loop through a chain of connections, which is a hint to keep the tree clean.

What the native setup doesn't do is roll anything up. **Total revenue** on a company is "the total value of deals closed with the company". HubSpot's definition says nothing about child companies, so don't assume a parent's figure includes its subsidiaries.

## How do you model reporting lines between contacts?

With a paired custom association label on contact-to-contact associations. Create the pair once, for example **Manager** on one side and **Direct report** on the other. When you label one contact as another's manager, HubSpot applies the paired label to the other side automatically.

The facts that matter:

- **Tier:** custom association labels need Marketing, Sales, Service, Data, Content Hub or Smart CRM **Professional or Enterprise**. Any one Pro hub is enough.
- **Limit:** 50 labels per object pair, and a paired label counts as one.
- **Who:** only Super Admins can create labels.
- **Limits per label:** you can cap how many records each side can have. Setting **Manager** to one per contact stops a person from having two managers by accident.

Other labels worth adding on the same pair: **Assistant / Executive**, or a dotted-line pair if your buyers have matrix structures. Keep the list short. Every label is something a rep has to choose correctly.

For buying roles that aren't reporting lines (economic buyer, champion, technical evaluator), put a label on the **contact-to-deal** association instead. Roles change from deal to deal; reporting lines don't.

## How do you roll revenue up to the parent company?

With a rollup property on companies. Rollup (calculation) properties need a Professional subscription, and HubSpot documents that they can calculate "based on all associated records of that object or for specific association labels, including same object associations." So on the company object you can create a **Sum** rollup of **Total revenue** from associated companies, filtered to the **Child company** label. That gives each parent the total of its direct children.

Two caveats, both things HubSpot's article doesn't spell out:

1. **Depth.** A rollup reads directly associated records. For a three-level group, you'd need the top level to sum a rollup on the middle level. The docs don't say whether a rollup can read another rollup property, so test this in your portal before promising a "whole group" number.
2. **Own revenue plus children.** The rollup above sums the children only. For a group total, add the parent's own Total revenue with a custom equation property, or report the two side by side.

There's also a per-subscription cap on how many calculation properties you can create (listed in HubSpot's Products & Services Catalog), so don't spend them carelessly.

## Can you use the labels in segments, workflows and reports?

Yes. HubSpot's association label docs list segments (lists), workflow triggers and actions, custom reports (as axes, breakdowns or filters) and imports. Practical uses:

- **Segments:** every contact labelled **Manager** at target accounts, or every child company whose parent is a customer.
- **Workflows:** when a contact gets a **Direct report** association, create a task for the account owner to confirm the reporting line.
- **Reports:** deals by parent company, or pipeline grouped by the parent of the deal's company. Build these as custom reports so you can filter on the label.

## How do you keep the hierarchy maintained?

The data model is easy. Keeping it right is the work. People change jobs, companies get acquired, and a hierarchy nobody maintains is worse than none because reports trust it.

1. **Assign an owner.** One person, usually RevOps or sales ops, owns company hierarchy changes. Reps propose, the owner confirms.
2. **Set label limits.** One manager per contact, and you can't create a second parent company anyway.
3. **Watch for leavers.** When a contact's email bounces or their company changes, a workflow should flag their reporting-line associations for review.
4. **Import, don't click, for big changes.** Acquisitions and restructures go through an import file you can review and keep, not forty manual edits.
5. **Audit quarterly.** A saved view of child companies with no owner, parents with zero children, and contacts labelled **Direct report** with no manager catches most drift.

If you're inheriting a portal where someone already improvised this with text properties like "Parent account name", plan the clean-up before you build. My guide to [auditing an inherited CRM before you rebuild it](/insights/audit-inherited-crm-before-rebuild/) covers how to find and retire those.

## What can't you do without Enterprise or a paid app?

| Need | On Professional | What fills the gap |
| --- | --- | --- |
| Parent/child companies | Yes, all plans | Nothing needed |
| Manager / Direct report on contacts | Yes, custom paired label | Nothing needed |
| Sum child revenue onto the parent | Yes, rollup property (one level is documented) | Test multi-level, or compute it via the API |
| Visual org chart of contacts | Buying groups beta (Sales or Service Hub Pro+, with a seat) | Marketplace org chart apps, or a custom app card |
| Visual account tree | Not documented. Third parties describe an "account map" beta; check your portal | Marketplace apps |
| A dedicated "business unit" or "subsidiary" object with its own properties and pipeline | No. Custom objects are Enterprise only | Use companies with labels, or a custom app |

Buying groups are worth a look first if you have Sales or Service Hub Professional. HubSpot describes them as a way to review a company's stakeholders and assign buying roles. They're a beta that a Super Admin has to opt into, and creating or editing one needs a Sales or Service seat; Core and View-only seats can only view. Marketplace apps exist that draw org charts from contact-to-contact labels and write associations back, which is a reasonable buy if your reps live in the visual view.

If neither fits, an app card that reads the labelled associations and draws the tree is a small build on HubSpot's developer platform, because the data model above is already the source of truth.

The same "copy the field onto the record you report on" thinking applies to attribution, which I covered in [deal attribution on Marketing Hub Professional](/insights/hubspot-deal-attribution-marketing-professional/).

## What to do this week

- Check that you have at least one Professional hub, then create the **Manager / Direct report** paired label on contact-to-contact, with Manager capped at one.
- Import parent/child links for your top 20 accounts from a reviewed spreadsheet.
- Create a Sum rollup of Total revenue from child companies on the company object, and check it against a hand-calculated group.
- Build one custom report: pipeline grouped by parent company.
- Name the owner of hierarchy changes and put the quarterly audit view on their calendar.

*Checked against HubSpot's knowledge base (association labels, parent and child companies, calculation and rollup properties, default company properties, buying groups, custom objects) in October 2026.*

Sources: [Create and use association labels](https://knowledge.hubspot.com/object-settings/create-and-use-association-labels), [Add a parent or child company](https://knowledge.hubspot.com/records/add-a-parent-or-child-company), [Create calculation properties](https://knowledge.hubspot.com/properties/create-calculation-properties), [HubSpot's default company properties](https://knowledge.hubspot.com/properties/hubspot-crm-default-company-properties), [Review stakeholders with buying groups](https://knowledge.hubspot.com/prospecting/review-stakeholders-with-buying-groups), [Create custom objects](https://knowledge.hubspot.com/object-settings/create-custom-objects).
