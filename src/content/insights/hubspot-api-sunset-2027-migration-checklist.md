---
title: "The HubSpot API Sunset: Every Deadline Through September 2027, in One Checklist"
seoTitle: "HubSpot API Sunset 2027: Every Deadline in One Checklist"
description: "Every HubSpot API and app deadline from October 2026 to September 2027: what stops, what replaces it, and how to find what your integrations still call."
pubDate: 2026-10-05
pillar: build
tags: ["HubSpot API","API Migration","Developer Platform","Private Apps","OAuth"]
---

HubSpot is retiring its numbered APIs and its legacy apps on a fixed schedule. The short version: **v4 APIs go unsupported on March 30, 2027**, and **v1–v3 APIs, legacy public apps and legacy private apps go unsupported in September 2027**. Several individual endpoints and features stop earlier than that, starting this month. The target for everything is HubSpot's date-versioned APIs (`2026-03`, `2026-09` and later) and apps built on the projects framework.

This page lists every date with what actually changes, links to a detailed guide for each, and shows how to find what your integrations still call. If you'd rather have someone inventory your integrations and plan the moves, that's the kind of [platform work I do](/services/build/).

## Every deadline, in order

| Date | What changes | Guide |
| --- | --- | --- |
| Live since Sept 8, 2026 | The `2026-09` CRM API enforces account validation rules on writes | [400 VALIDATION_ERROR after upgrading](/insights/hubspot-api-400-validation-error-2026-09/) |
| Oct 26, 2026 | Existing accounts can't create legacy private apps (new accounts lost it on Sept 28) | [Service Keys or a project app](/insights/hubspot-legacy-private-apps-service-keys/) |
| Oct 31, 2026 | Classic CRM cards stop rendering | [Classic CRM card to app card](/insights/migrate-hubspot-classic-crm-card-to-app-card/) |
| Dec 1, 2026 | The tools for swapping classic cards into users' views stop | Same guide |
| Dec 4, 2026 | Pipelines API v1 stops responding | [Pipelines v1 to 2026-09](/insights/hubspot-pipelines-api-v1-migration-2026-09/) |
| Feb 16, 2027 | OAuth v1 token endpoints shut off | [OAuth v1 migration checklist](/insights/hubspot-oauth-v1-migration-checklist/) |
| March 2027 | Projects on platform version 2025.2 or older must move to 2026.09 | HubSpot's [platform version guide](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/migrate-an-app/migrate-to-the-latest-platform-version) |
| Mar 30, 2027 | All v4 APIs unsupported, including Automation (workflows) v4 | [Automation API v4 deadline](/insights/hubspot-automation-api-v4-sunset-2027/) |
| September 2027 | v1–v3 APIs, legacy public apps and legacy private apps unsupported | This page |

HubSpot hasn't given an exact day in September 2027. Plan for September 1.

## What "unsupported" means

It doesn't mean the calls stop on the day. HubSpot's v4 notice says unsupported versions "may continue to function for some period of time, but they are not guaranteed to remain stable or available," and its September announcement says there will be no more bug fixes, reliability improvements or security updates for them. An integration that keeps calling v3 after September 2027 is running on something that can break at any time, with nobody obliged to fix it.

The dates that do mean "stops working" are the specific ones above: private app creation (October 26), classic cards (October 31), Pipelines v1 (December 4) and OAuth v1 (February 16).

## Go straight to the dated versions

HubSpot's guidance is explicit: "Do not use v3 or v4 as an intermediate step." A call moved from v1 to v3 today only has to move again within a year. Move each call to a dated path instead, such as `/crm/objects/2026-09/contacts` instead of `/crm/v3/objects/contacts`.

Two things make that harder than it sounds:

- **Not everything has a dated replacement yet.** The released `2026-03` and `2026-09` versions have no workflow endpoints at all. Workflows exist only as a beta at `/automation/v4/2027-03-beta/`. For those APIs, the plan is an adapter now and a swap when the dated version is released.
- **HubSpot's own SDKs lag behind.** The Node client (`@hubspot/api-client` 14.0.1) and the Python client (`hubspot-api-client` 12.0.0) don't have date-versioned paths. Workflow custom code actions ship with the Node client at `^10`. Until that changes, use the SDK's generic request method or plain `fetch`/`requests` for the dated endpoints, and keep the SDK for everything else.

## How to find what you still call

HubSpot already knows. The developer home has a tasks card ("X of your apps use APIs becoming unsupported") and a migrations tab. Its detection "checks API calls at runtime, not your source code." That cuts both ways: it catches calls you didn't know about, and it keeps flagging you until the old traffic actually stops, even after you've changed the code.

To find the calls in your own code first, search for numbered API paths and skip the dated ones:

```bash
grep -rnE '/v[1-4]/' --include='*.js' --include='*.ts' --include='*.py' --include='*.php' --include='*.rb' src | grep -vE '/v[1-4]/20[0-9]{2}-[0-9]{2}'
```

It matches any `/v1/` to `/v4/` path segment, so review the results: non-HubSpot URLs will show up too. It won't find paths assembled at runtime from variables, which is one reason HubSpot's runtime view is worth checking alongside it.

Then check the places integration code hides outside your repository:

- **Workflow custom code actions.** The code lives in HubSpot, not in your repo, and it uses the older SDK.
- **Scheduled jobs and one-off scripts** on a server or in a cloud function that nobody has opened in a year.
- **Third-party connectors** (Zapier, Make, n8n, marketplace apps). Their vendors handle the migration, but check that the app is maintained.
- **Private app tokens** pasted into tools. The token itself keeps working until September 2027; what calls it might not.

## The sandbox gap

After October 26, an existing account can't create a legacy private app. If your sandbox refresh process recreates the integration by making a new private app in the refreshed sandbox, that step breaks in the next refresh. Move sandbox provisioning to Service Keys, or to a project-based app, before your next refresh, and test that you can rebuild the integration's credentials from scratch using only supported paths.

## Marketplace apps: two separate tracks

If you publish an app, there are two separate requirements:

1. **The app itself** must be on the projects framework. Legacy public apps go unsupported in September 2027.
2. **Its API calls** must move to dated versions. HubSpot's runtime detection flags v1–v4 calls regardless of how the app is built.

Doing one doesn't satisfy the other. A projects-based app still calling `/crm/v3/` is still flagged.

## The checklist

1. Open the developer home tasks card and the migrations tab. List every app and every flagged API.
2. Run the search above on every repository, then check custom code actions, scheduled jobs and connectors.
3. Before October 26: give whoever builds integrations Developer tools access, so new integrations can start on Service Keys.
4. Before October 31: move classic CRM cards and run the view swap. Before December 4: move Pipelines v1 calls.
5. Before February 16: move OAuth token exchange, refresh and introspection to the dated endpoints.
6. Before March 30: move every v4 call, and put an adapter around workflow calls until their dated version is released.
7. Before September 2027: move the remaining v1–v3 calls and legacy apps, then watch the tasks card until it's clear.

*Checked against HubSpot's developer changelog and API documentation in October 2026. The search command is tested against sample legacy and dated paths.*

Sources: [Legacy APIs and apps: what's going unsupported and when](https://developers.hubspot.com/changelog/legacy-apis-and-legacy-apps-whats-going-unsupported-and-when), [Deprecating support for HubSpot v4 APIs](https://developers.hubspot.com/changelog/deprecating-support-for-hubspot-v4-apis), [Legacy private app creation being disabled](https://developers.hubspot.com/changelog/legacy-private-app-creation-sunset), [Deprecating classic CRM cards](https://developers.hubspot.com/changelog/deprecating-support-for-classic-crm-cards), [Pipelines API v1 sunset](https://developers.hubspot.com/changelog/pipelines-api-v1-sunset), [v1 OAuth API deprecation](https://developers.hubspot.com/changelog/v1-oauth-api-deprecation), [CRM API write validation enforcement](https://developers.hubspot.com/changelog/crm-api-write-validation-enforcement), [Workflows API (2027-03 beta)](https://developers.hubspot.com/docs/api-reference/2027-03-beta/automation/workflows/guide), [Node client changelog](https://github.com/HubSpot/hubspot-api-nodejs/blob/master/CHANGELOG.md), [API versioning](https://developers.hubspot.com/docs/developer-tooling/platform/versioning).
