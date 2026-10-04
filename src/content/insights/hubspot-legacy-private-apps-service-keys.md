---
title: "HubSpot Private Apps Are Going Away: Service Keys or a Project App?"
seoTitle: "HubSpot Private Apps Sunset: Service Keys or Project App?"
description: "From October 26, 2026 you can't create legacy private apps in existing HubSpot accounts. What to use instead, and how to move existing integrations."
pubDate: 2026-10-04
pillar: build
tags: ["HubSpot API","Private Apps","Service Keys","Developer Platform","Integrations"]
---

From **October 26, 2026**, existing HubSpot accounts can no longer create legacy private apps (accounts created on or after September 28 lost the option then). Private apps you already have keep working. They become unsupported in **September 2027**, meaning no more bug fixes or security updates. For anything new, HubSpot's answer is one of two things:

- a **Service Key**, if the integration only makes REST API calls, or
- a **project-based app** with private distribution and static auth, if it needs webhooks, app cards or other developer-platform features.

The rest of this post is how to pick between them, and how to move the private apps you already run before the 2027 cutoff. If you'd rather have someone map your integrations and plan the move, that's part of my [custom apps and platform work](/services/build/).

## What exactly changes on October 26?

Only creation. HubSpot's changelog says the ability to create new legacy private apps is removed from the account UI, and that "all existing legacy private apps continue to work as-is." Tokens you've already issued keep authenticating, and your scripts, workflows and connectors keep running.

The deadline that forces a move is September 2027, when legacy private apps, along with the v1–v3 APIs and legacy public apps, become unsupported. Between now and then, the practical change is that a new integration can't start life as a legacy private app, so the replacement has to be ready the next time someone needs a token.

## What are Service Keys?

A Service Key is a scoped API credential you create in the account, without building an app. HubSpot positions it as the replacement for legacy private apps for "lightweight integrations, internal tools, and AI agent integrations."

What you need to know:

- **Status:** public beta since February 2026, and still listed as beta in HubSpot's Fall 2026 spotlight. Fine to use; expect details to change.
- **Who can create one:** super admins, or users with the Developer tools access permission. Go to **Development → Keys → Service keys → Create service key**.
- **Scopes:** object-specific, like `crm.objects.contacts.read`. A key can only get scopes the person creating it already has, so have a super admin create keys that need broad access.
- **How you use it:** exactly like a private app token, as a Bearer token.
- **Housekeeping:** you can see when each key was last used and its API activity, and rotate it with a 7-day grace period so the old value keeps working while you swap it out.
- **Limits:** the same rate limits as privately distributed apps.

```bash
curl --request GET \
  --url "https://api.hubapi.com/crm/v3/objects/contacts?limit=10" \
  --header "Authorization: Bearer YOUR_SERVICE_KEY"
```

What a Service Key **can't** do: receive webhooks, power UI extensions or app cards, or use any developer-platform feature other than making REST API requests. If your private app has a Webhooks tab in use, a Service Key alone won't replace it.

## Which one should you use?

| What the integration does | Use |
| --- | --- |
| Scripts, cron jobs, data syncs that call the API | Service Key |
| BI tools and data warehouses pulling CRM data | Service Key |
| Workflow custom code actions calling the API | Service Key |
| Connectors like Zapier or Make that ask for a private app token | Service Key, if the connector only makes API calls |
| An AI agent or MCP server reading or writing CRM records | Service Key, with the narrowest scopes that work |
| Anything that **receives webhooks** from HubSpot | Project-based app (private distribution, static auth) |
| App cards or other UI extensions in the CRM | Project-based app |
| Installed in more than one HubSpot account | Project-based app with OAuth |

If a private app's token is only pasted into a script, a connector or a custom code action, it belongs in the first group, and those are the easy moves.

## Moving a REST-only private app to a Service Key

1. **Inventory first.** Under **Development → Legacy apps**, list every private app, its scopes and, most importantly, what uses its token. Check workflow custom code secrets, connector settings, server environment variables and your password manager. A token with no known consumer is the one that breaks something when you revoke it.
2. **Create the Service Key** with the same scopes, or fewer. Drop any scope the integration doesn't actually use; legacy apps tend to collect them.
3. **Swap the credential** wherever the old token lives. In code that uses HubSpot's Node client, nothing else changes:

   ```javascript
   const hubspot = require('@hubspot/api-client');
   const client = new hubspot.Client({ accessToken: process.env.HUBSPOT_SERVICE_KEY });
   ```

   For workflow custom code actions, update the secret's value. Secrets are shared across the account's custom code actions, so every action that uses that secret switches at once. (The [address validation workflow](/insights/how-to-verify-address-city-zip-code-state-and-country-on-hubspot-form-submit-using-google-places-api/) is an example of an action that only needs a key like this.)
4. **Watch the key's activity** for a few days to confirm calls are arriving, and that nothing still calls with the old token.
5. **Delete the legacy private app** once its token has gone quiet. Deleting it revokes the token, which is the point: an unused credential with broad scopes is a liability.

## Moving a private app that needs webhooks or cards

These need a project-based app, built with the HubSpot CLI. HubSpot's migration guide is clear that there's no automatic conversion for existing private apps; you build the replacement and point your service at it.

1. Install the latest CLI (`npm install -g @hubspot/cli@latest`) and authenticate it to the account.
2. Create the project with private distribution and static auth, which limits the app to that one account:

   ```bash
   hs project create --distribution private --auth static --project-base app
   ```

3. Recreate the configuration: scopes in the app's `app-hsmeta.json`, webhook subscriptions in `webhooks/webhooks-hsmeta.json`, and any cards under `cards/`. Set `platformVersion` to `2026.09` in `hsproject.json`, the current release with an 18-month support window.
4. Upload with `hs project upload`, install the app, and copy its access token from the app's settings.
5. Point your service at the new token and your webhook endpoint at the new subscriptions. Run both apps side by side until you've seen the new one deliver events, then delete the legacy app.

If the legacy app also renders a **classic CRM card**, that's on a shorter clock: classic cards stop rendering on October 31, 2026, so move the card first.

## What to do this month

- **Before October 26:** make sure whoever builds integrations in your account has Developer tools access, so the next "we need an API token" doesn't stall.
- **This quarter:** inventory every legacy private app and label each one *Service Key* or *project app*.
- **Before September 2027:** finish the moves, delete the legacy apps, and rotate anything whose consumer you couldn't identify.

None of this is urgent in the "it breaks on Monday" sense, which is exactly why it gets left until it is. Private apps are often undocumented, created by someone who has since left, with scopes nobody remembers granting. Doing the inventory now turns a 2027 fire drill into a few tidy swaps.

*Checked against HubSpot's developer changelog and documentation in October 2026.*

Sources: [Legacy private app creation being disabled](https://developers.hubspot.com/changelog/legacy-private-app-creation-sunset), [Legacy APIs and apps: what's going unsupported and when](https://developers.hubspot.com/changelog/legacy-apis-and-legacy-apps-whats-going-unsupported-and-when), [Service Keys public beta](https://developers.hubspot.com/changelog/service-keys), [Make API requests using a service key](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys), [Fall 2026 spotlight](https://developers.hubspot.com/changelog/fall-2026-spotlight), [Migrate an existing private app to the projects framework](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/migrate-an-app/migrate-an-existing-private-app), [Authentication overview](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/overview), [Legacy private apps](https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview), [Custom code actions](https://developers.hubspot.com/docs/api-reference/latest/automation/workflow-actions/custom-code-actions).
