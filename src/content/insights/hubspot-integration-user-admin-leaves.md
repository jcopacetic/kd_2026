---
title: "Keep HubSpot Integrations Alive When the Admin Leaves"
seoTitle: "Keep HubSpot Integrations Alive When the Admin Leaves"
description: "What breaks in HubSpot when the user who installed your integrations leaves: connected apps, private apps, Zapier. A runbook and an integration user setup."
pubDate: 2026-10-05
pillar: revops
tags: ["HubSpot","Integrations","User Management","Service Keys","RevOps"]
---

When the person who set up your HubSpot integrations leaves, the real risk is **legacy private apps**. HubSpot documents that removing the user who created a private app makes some calls using its token fail with `USER_DOES_NOT_HAVE_PERMISSIONS` until you rotate the token. Connected (marketplace/OAuth) apps are safer: each has an **App owner**, and HubSpot makes you reassign it before it lets you deactivate that user. Third-party tools like Zapier are a separate problem, because their HubSpot connections belong to a person too.

The fix is an inventory, a dedicated integration user, and moving internal integrations off personal credentials. Below is a runbook for doing it. If you'd rather hand the whole integration estate to someone, that's part of my [RevOps work](/services/revops/).

## What actually breaks when the user is removed?

It depends on how each integration authenticates. HubSpot documents some of this and is silent on the rest, so here is what is documented and what isn't.

| Integration type | What HubSpot documents | What to do |
| --- | --- | --- |
| Connected app (marketplace / OAuth) | Has an App owner. Deactivating that user prompts you to reassign ownership first. | Reassign owner; reconnect from the integration user if the vendor ties the connection to a person. |
| Legacy private app | Removing its creator, or removing their super admin permissions, makes association calls fail with `USER_DOES_NOT_HAVE_PERMISSIONS`. | Rotate the token, recreate the app, or reinstate the user. Then move it to a Service Key. |
| Service Key | Account-level key. The docs say nothing about what happens when the creator is removed. | Create from the integration user anyway, and test before relying on it. |
| Zapier, Make and similar | Outside HubSpot. The connection is an authorization made by a person. | Transfer ownership in the tool; reconnect HubSpot as the integration user. |

### Connected apps

HubSpot's connected apps page says the installer "is automatically assigned as the app owner," and that a super admin or a user with App Marketplace access can change it under **Settings → Integrations → Connected Apps**, then the app, then **Manage** next to App owner. If you deactivate a user who owns apps, "HubSpot prompts you to reassign ownership before completing the deactivation."

What HubSpot doesn't say is whether the OAuth tokens behind the app survive the installer leaving. HubSpot's OAuth docs don't address it. Developers on the HubSpot Community report that the install is account-wide: deleting the authorizing user doesn't invalidate the tokens, and only uninstalling does. That's community-reported, not documented, and some vendors' own help centres say their app stops syncing when the connecting user goes inactive. Behaviour varies by app.

Two practical consequences:

- **App owner is an accountability field.** HubSpot doesn't say that reassigning it re-authorizes anything, so don't assume the connection now runs as the new owner.
- **Check each vendor's help centre** for what happens when the connecting user is deactivated. Where it says the connection breaks, reconnect it as the integration user before offboarding.

### Legacy private apps

This is the documented break. HubSpot's private apps docs: "If you remove the user who originally created a private app, some API calls that previously used the app's access token will fail" with `USER_DOES_NOT_HAVE_PERMISSIONS`. The knowledge base on removing users is more specific: association calls fail, and it also happens if you only remove the creator's super admin permissions. The documented fixes are to rotate the token, create a new app, or reinstate the user.

The docs describe removal. They don't say whether deactivation alone triggers it, so I don't treat deactivation as safe either.

Only super admins can access private apps, so the person doing the inventory needs that access.

### Service Keys

Service Keys are account-level credentials created under **Development → Keys → Service keys** by super admins or users with the Developer tools access permission. They don't expire on their own and rotate with a 7-day grace period. HubSpot's documentation says nothing about whether a key depends on the user who created it. Until HubSpot documents it, create keys from the integration user and include user removal in your tests.

### Zapier and other automation tools

Your Zaps call HubSpot through a connection someone authorized. Zapier's docs say that when you remove a member from a Team or Company account, their Zaps and app connections transfer to a user you pick. Shared connections keep working "as long as the user's app account exists." Read that literally: the HubSpot connection is still the departed person's HubSpot authorization. Also, Catch Hook webhook URLs change on transfer, so anything posting to them needs updating. Make and similar tools have the same shape of problem, so check each one.

## How to set up a dedicated integration user

Create one HubSpot user for integrations, with a company-controlled email (a shared mailbox or distribution list), its login and MFA in your password manager, and nobody using it day to day. HubSpot has no official "integration user" type. This is practice, not a HubSpot feature.

1. **Pick the email.** Something like `integrations@yourcompany.com`, owned by IT, not a person.
2. **Give it the permissions installs need.** HubSpot requires Super Admin or App Marketplace access to install apps. Private apps need a super admin. Service Keys need super admin or Developer tools access.
3. **Check the seat before assuming it's free.** HubSpot's seat docs say View-Only seats can't be given Super Admin access, and Developer Seats can't be combined with Super Admin permissions. The docs don't say what an integration user with super admin will cost on your subscription, so check your seat allocation before you build the plan around it.
4. **Lock it down.** MFA on, credentials in the vault, a named person accountable for it. Use App Governance and approved apps to keep scopes narrow; I've covered [what App Governance does to scopes](/insights/hubspot-app-governance-scope-errors/) separately.

## The offboarding runbook

Do this before the person leaves, not after. Deactivate them last.

1. **Inventory connected apps.** For each app under Connected Apps, record the App owner, the vendor, and how it authenticates (OAuth install, API key pasted into the vendor, or a private app token).
2. **Inventory private apps.** Under **Development → Legacy apps**, list every private app, who created it, its scopes, and every place its token is used: workflow custom code secrets, connector settings, server environment variables.
3. **Inventory third-party tools.** Zapier, Make, data warehouses, BI tools, enrichment. For each, note whose HubSpot authorization it uses.
4. **Create the integration user** as above.
5. **Reassign App owners** to the integration user.
6. **Reconnect user-authenticated apps** from the integration user, starting with the least critical, and confirm each one syncs.
7. **Replace private apps.** For REST-only integrations, create a Service Key from the integration user and swap the token. My [private apps to Service Keys guide](/insights/hubspot-legacy-private-apps-service-keys/) walks through the move. Where you can't migrate yet, rotate the private app's token after the creator leaves, and watch for `USER_DOES_NOT_HAVE_PERMISSIONS`.
8. **Transfer third-party tool ownership** and reconnect HubSpot in each as the integration user.
9. **Deactivate the old user.** Reassign the remaining App owners when HubSpot prompts you. Watch integration error logs for a week before removing them entirely.

If you've inherited a portal and nobody can tell you who built what, this inventory is the first step of a [CRM audit](/insights/audit-inherited-crm-before-rebuild/) anyway.

## Why October 26 matters here

From **October 26, 2026**, existing HubSpot accounts can't create new legacy private apps. Existing ones keep working until they become unsupported in September 2027.

That removes one of the three documented fixes. Today, if a private app's creator leaves, you can rotate the token, recreate the app, or reinstate the user. After October 26, "recreate the app" is gone, so you rotate or migrate.

It also hits sandboxes. On the HubSpot developer forum, an engineer pointed out that once creation is off, a refreshed or new sandbox can't get a copy of an existing legacy private app. If your test setup depends on recreating private apps in a sandbox, move that provisioning to Service Keys before the cutoff.

## What to do this week

- List your connected apps with their App owners, and flag every app owned by a person rather than the integration user.
- List every legacy private app, its creator and where its token lives. Any app created by someone who has left already: rotate the token now.
- Create the integration user and confirm what seat it takes.
- Move one REST-only private app to a Service Key created by that user, so the rest are routine.
- List the Zapier/Make connections that use a personal HubSpot login.
- Add "transfer integrations" to your offboarding checklist, before "deactivate user."

*Checked against HubSpot's knowledge base (connected apps, removing users, seats, app installs), HubSpot's developer docs (private apps, Service Keys) and Zapier's help centre in October 2026.*

Sources: [Manage your connected apps](https://knowledge.hubspot.com/integrations/manage-your-connected-apps), [Remove users from your HubSpot account](https://knowledge.hubspot.com/user-management/remove-hubspot-users), [Legacy private apps](https://developers.hubspot.com/docs/guides/apps/private-apps/overview), [Make API requests using a service key](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys), [Install apps from the HubSpot Marketplace](https://knowledge.hubspot.com/marketplace/install-apps-in-the-hubspot-marketplace), [Manage seats](https://knowledge.hubspot.com/account-management/manage-seats), [OAuth guide](https://developers.hubspot.com/docs/api-reference/auth-oauth-v3/guide), [Legacy private app creation being disabled](https://developers.hubspot.com/changelog/legacy-private-app-creation-sunset), [Remove members from your Team or Company account (Zapier)](https://help.zapier.com/hc/en-us/articles/8496281082253-Remove-members-from-your-Team-or-Company-account), [HubSpot Community: OAuth token works for deleted user](https://community.hubspot.com/t5/APIs-Integrations/OAuth-2-0-Access-Refresh-Token-works-for-deleted-user/td-p/223724).
