---
title: "Connecting Claude to HubSpot With Write Access, Safely"
seoTitle: "Connect Claude to HubSpot With Write Access, Safely"
description: "How to connect Claude to HubSpot with write access: what the connector can change, the Super Admin permission step, auditing AI edits, and fixing reauth errors."
pubDate: 2026-10-05
pillar: ai-crm
tags: ["HubSpot","Claude","MCP","AI in CRM","App Governance"]
---

To connect Claude to HubSpot with write access, install HubSpot's official connector in Claude, then have a **Super Admin** grant the connector's optional write permissions in **Settings › Integrations › Connected Apps › Approved apps › Manage access › Data permissions**. After that, disconnect and reconnect HubSpot in Claude so the new permissions are issued. The connector can **create and update** records but never delete them, and bulk writes are capped at **10 records** at a time.

Switching writes on is easy. The harder part is deciding what the AI may change and being able to see what it changed. That's the work I do under [AI in your CRM](/services/ai-crm/). This post covers both, plus the error states people are reporting right now.

## What can Claude actually do in HubSpot?

Through the connector, Claude can read most of the CRM and create or update a defined set of objects. It cannot delete anything.

The connector runs on HubSpot's remote MCP server at `mcp.hubspot.com`. The server requires OAuth with PKCE, and HubSpot says that "all actions respect your existing HubSpot user permissions." Claude can't do anything in HubSpot that the connected user can't.

| | What HubSpot documents for the Claude connector |
| --- | --- |
| **Create and update** | Contacts, leads, companies, deals, tickets, custom objects, line items, products, pipelines, properties, campaigns, landing pages, website pages, blog posts, marketing emails, marketing events, engagements (calls, meetings, notes, tasks, emails) |
| **Beta** | Quotes. The MCP server docs also list revenue objects (carts, invoices, orders) as beta. |
| **Delete** | Not supported, on any object |
| **Bulk writes** | 10 records at a time |
| **Validation** | Conditional property rules and pipeline stage validations are applied. Association label validations are not. |
| **Sensitive Data** | If it's turned on, activity and conversation data are blocked |
| **Plan** | A paid Claude plan (Pro, Max, Team or Enterprise) |

The server exposes about 30 tools. For writes, the important ones are `manage_crm_objects` ("Create or update CRM records or activities"), `manage_custom_properties` and `manage_custom_pipelines`. `get_user_details` reports what the current connection is allowed to do. The tools you see depend on your account, plan and the permissions granted.

### Can Claude create lists?

HubSpot's own sources disagree. The MCP server docs say `manage_segment` can create static and dynamic segments. The Claude connector help page lists segments (lists) as read-only, and a HubSpot community manager has said list creation through the connector isn't supported. Assume Claude can't create lists until `manage_segment` shows up in your tool list and a test run works.

## How to turn on write access

Writes are optional permissions that a Super Admin has to grant to the connector account-wide. Each user then needs a fresh connection to pick them up.

1. **Connect the connector in Claude.** HubSpot says Super Admins can connect without approval. Other users need a Super Admin to approve the connector first.
2. **As a Super Admin, open the app's access settings:** **Settings › Integrations › Connected Apps › Approved apps**, find the HubSpot connector for Claude, and click **Manage access**.
3. **Open Data permissions.** Required permissions are listed and can't be turned off. Optional permissions have toggles. Turn on only the write permissions you've decided to allow (more on that below). There's an **Enable all** button. Don't use it.
4. **Check Install permissions** on the same screen. This controls who in the account can install the connector. Limit it to the people who should have it.
5. **Disconnect and reconnect HubSpot in Claude.** HubSpot's connector page says you need to "disconnect and reauthenticate" to get write access. Existing connections don't gain new permissions on their own.
6. **Start a new chat** so Claude reloads the tool list. HubSpot doesn't document this step. It's a common community suggestion, and it costs nothing.
7. **In Claude's connector tool settings, set Write tools to "Needs Approval".** HubSpot recommends this. Every create or update then waits for a human to approve it.

The admin screen sets the ceiling for the whole account. A user's consent screen can't grant more than that, so reconnecting alone never adds write tools. App Governance and scope errors more generally are covered in [App Governance and scope errors, decoded](/insights/hubspot-app-governance-scope-errors/).

### Does it work for EU and other data centers?

HubSpot says the connector "respects your data center location": for example, EU-hosted accounts route through the EU data center. HubSpot doesn't name the other regions explicitly, and it doesn't document any region being excluded.

## What should you allow, and what should you hold back?

Allow writes where a mistake is cheap to spot and cheap to undo. Hold back anything that triggers automation, changes revenue numbers or changes the structure of the CRM.

| Allow (with approval on) | Hold back for now |
| --- | --- |
| Notes, tasks and logged calls or meetings | Pipelines and pipeline stages |
| Updating contact and company fields a rep would edit by hand | Creating or editing properties |
| Creating contacts and companies from a conversation | Marketing emails, landing pages and website pages |
| Moving a deal's stage, if your stage validations are set up | Quotes and revenue objects (beta) |
| Tickets, if your support team works in Claude | Owner changes and lifecycle stage on large sets of records |

Three reasons for the right-hand column:

- **Property and pipeline edits change the schema** that workflows, reports and integrations depend on. The breakage shows up far from the chat that caused it.
- **Field updates trigger workflows.** A lifecycle stage set by Claude enrolls contacts exactly as a human edit would. The 10-record cap limits one batch, not ten batches in a row.
- **Association labels aren't validated** on connector writes. If your data model relies on them, check AI-created associations.

No delete is a real safeguard, but an update that blanks or overwrites a field is just as destructive and harder to notice. Approval prompts are your protection. For AI writes that run without a human in the chat, such as classifying leads, use a pipeline with schema-checked output and guarded writes instead of a connector. See [production LLM workflows that update your CRM](/insights/llm-workflows-update-crm-production/).

## How do you audit what the AI changed?

HubSpot records every property change with its source, so you can separate AI edits from human ones. HubSpot also says every connector action is attributed "to both the user and the Claude connector" in the account's audit log.

- **In the UI:** open a record, view a property's history, and check the source. HubSpot's change sources documentation says "Integration" means a connected app. The connector is a connected app, so its edits should show up that way. Make one test edit and confirm what your account shows before you rely on it.
- **Through the API:** request a record with `propertiesWithHistory`. Each change comes back with `sourceType`, `sourceId` and `sourceLabel`. HubSpot's changelog says app writes have `sourceType` set to `INTEGRATION` and `sourceId` set to the app's ID.
- **In the audit log:** use it to see who did what across the account, since property history only shows one record at a time.

This only works if each AI path writes as its own app. Shared credentials make the history useless. For scripts, give each one its own [Service Key](/insights/hubspot-legacy-private-apps-service-keys/) with the narrowest scopes that work.

HubSpot's **Agent CLI**, a terminal tool for AI agents that appears to still be in beta, *can* delete records. It previews every change before it runs, but don't assume the connector's no-delete rule covers it.

## Troubleshooting: the error states people are reporting

None of the states below are documented by HubSpot. They come from user reports on HubSpot's community forum in late September and early October 2026. The fixes are what the community suggested, and nobody has confirmed a root cause, so treat them as things to try in order.

### `get_user_details` returns REQUIRES_REAUTHORIZATION

**Reported symptom:** reads work, but `get_user_details` shows `REQUIRES_REAUTHORIZATION` against contact write (and list read/write), and `manage_crm_objects` is unavailable. Reconnecting doesn't help.

**Likely cause:** the write permissions were never granted in the account's Approved apps settings, so the connection can't get them however often you reauthorize. A HubSpot community manager gave this explanation. The original poster didn't confirm it.

**Try:** a Super Admin enables the write toggles under **Approved apps › Manage access › Data permissions**, then each user disconnects and reconnects, then starts a new chat. If list write still shows this state after that, see the list section above. It may simply not be supported.

### "Re-authenticate to enable" is greyed out

**Reported symptom:** HubSpot's app access screen lists the write permissions with a "Re-authenticate to enable" button that can't be clicked, even for a Super Admin.

**Try:** the same fix as above. The button reportedly doesn't do the granting. The Data permissions toggles do. Reconnect from Claude's side, not from that button.

### "No accounts match that search" when connecting

**Reported symptom:** HubSpot's "Choose an account" page is empty during connection. In the one report I found, the account was on the NA3 data center. The global account page showed no portals, while the regional host listed it.

**Try:** sign out everywhere and clear cookies for all hubspot.com hosts, sign in only through your regional host, and start the connection again. Confirm you have install rights on that account. If it's still empty, send HubSpot support screenshots of both account pages. The thread was marked solved, but nobody confirmed which step worked.

## What to do this week

- Decide which objects Claude may write to, using the allow / hold back table, and write the list down.
- Have a Super Admin grant only those permissions under **Approved apps › Manage access › Data permissions**, and restrict **Install permissions**.
- Set Claude's connector Write tools to **Needs Approval** for every user.
- Make one test edit and confirm how it shows in property history and the audit log.
- Move any unattended AI writes off the connector and into a pipeline you control.

*Checked against HubSpot's knowledge base (the Claude connector, managing app access and change sources articles) and HubSpot's developer documentation and changelog in October 2026.*

Sources: [Set up and use the HubSpot connector for Claude](https://knowledge.hubspot.com/integrations/set-up-and-use-the-hubspot-connector-for-claude), [Manage access to apps](https://knowledge.hubspot.com/integrations/manage-access-to-apps), [Integrate with the remote HubSpot MCP server](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server.md), [HubSpot's change sources](https://knowledge.hubspot.com/properties/hubspots-change-sources), [Integrations and CRM property change sources](https://developers.hubspot.com/changelog/bugfix-integrations-and-crm-property-change-sources), [Claude write access to CRM (beta)](https://developers.hubspot.com/changelog/claude-write-access-to-crm), [Agent CLI](https://developers.hubspot.com/docs/build-with-ai/agent-cli), [Model Context Protocol authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization), [HubSpot Community: MCP & Agents](https://community.hubspot.com/).
