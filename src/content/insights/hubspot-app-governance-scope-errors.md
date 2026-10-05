---
title: "HubSpot App Governance and Scope Errors, Decoded"
seoTitle: "HubSpot App Governance and Scope Errors, Decoded"
description: "\"This app hasn't been approved to access the required scopes\", BAD_CLIENT_ID, the AUP install block and greyed-out scopes in HubSpot: causes and fixes."
pubDate: 2026-10-05
pillar: build
tags: ["HubSpot API","App Governance","OAuth","Scopes","Developer Platform"]
---

If a HubSpot connection fails with **"this app hasn't been approved to access the required scopes"**, a Super Admin in that account has to approve the app and the scopes it asks for under **Settings › Integrations › Connected Apps › Approved apps**, then you reconnect. That's HubSpot's App Governance, which has been in public beta since April 14, 2026, and applies on every plan. The other errors on this page look similar but have different owners: some are fixed by an admin, some by the app's developer, and one by the account's subscription.

Each section below is one error string, with its cause and its fix. If you're building or maintaining a HubSpot app and keep hitting these, sorting out auth, scopes and distribution is part of my [custom apps and platform work](/services/build/).

| Error | Who fixes it |
|---|---|
| "this app hasn't been approved to access the required scopes" | Super Admin of the installing account |
| "scope isn't available to this app" (sensitive data) | App developer, possibly with HubSpot |
| "Your account doesn't have access to this scope" | Developer: app type and account tier |
| `BAD_CLIENT_ID` "missing or unknown client id" | Developer: credentials |
| "app developer has not signed the acceptable use policy" | App developer |

## "This app hasn't been approved to access the required scopes"

**The app asked for a scope that the account's Super Admin hasn't approved in App Governance.** Being a Super Admin yourself doesn't skip the check: someone has to approve the scope first, then the connection has to be made again.

The message starts like this, with the blocked scopes in brackets:

> Authorization failed because this app hasn't been approved to access the required scopes [...]

HubSpot's knowledge base doesn't print this message. It's quoted in an integration vendor's docs and in community threads, so treat the wording after that first sentence as reported, not documented.

App Governance lets Super Admins control which Marketplace apps can be installed and which data they get. That covers Zapier and Make, and HubSpot's changelog names AI connectors like ChatGPT, Claude and Gemini too. HubSpot's own apps (Gmail, Outlook, Google Calendar, WhatsApp Business, social and ads apps, and a few others) are excluded. Non-admin users who try to install an unapproved app get a page that asks for approval instead.

**How to fix it:**

1. Sign in as a **Super Admin** of the account that's connecting.
2. Go to **Settings › Integrations › Connected Apps** and open the **Approved apps** tab.
3. Click **Approve apps**, find the app, and choose who can install it: Admins, specific users and teams, or everyone.
4. Click **Next: Review data permissions**. Required permissions can't be turned off. Turn on every **optional** permission the integration actually uses, not only the one named in the error. That was the accepted fix in community threads about Make.
5. Click **Approve app**. If the app is already approved, use **Manage access** to change its permissions.
6. Disconnect and reconnect the integration so the new token carries the new scopes.

The same thing happens with AI connectors. When a connector can read but not write, the write scopes are usually blocked by App Governance rather than by the consent screen. I've covered that case in [connecting Claude to HubSpot with write access](/insights/connect-claude-to-hubspot-write-access/).

HubSpot's docs describe App Governance in terms of Marketplace apps. They don't say how it treats privately distributed apps or legacy private apps, so I wouldn't assume either way.

## "Scope isn't available to this app" (sensitive data scopes)

**The app is asking for a sensitive data scope, like `crm.objects.contacts.sensitive.read`, that its distribution type isn't allowed to declare.** Developers report seeing this as a project deploy error. HubSpot doesn't document that exact string, but its sensitive data docs explain the rules behind it.

How you get sensitive data scopes depends on how the app is distributed:

| App type | How it gets sensitive scopes |
|---|---|
| New-platform app, **private** distribution | Declare them in `app-hsmeta.json` |
| **Marketplace** distribution (legacy public apps, and platform 2025.2 / 2026.03) | Request them from HubSpot's Ecosystem Quality team, who allowlist them if approved |
| Legacy private app | Tick them in the app's scope settings |

So if your app is set to `distribution: marketplace`, the likely cause is that HubSpot hasn't allowlisted the scope for it yet. That's my inference from the docs, not a documented explanation of the error.

The installing account also needs:

- an **Enterprise** subscription (ticket sensitive scopes are the exception: they're available to all accounts),
- Sensitive Data turned on in the account settings, and
- a **Super Admin** to do the install.

**How to fix it:** for a single-customer integration, use private distribution and declare the scopes. For a Marketplace app, ask HubSpot for access through the sensitive data request form before you ship the feature, and keep the scope out of your config until it's approved.

## "Your account doesn't have access to this scope" (Custom Channels)

**The `conversations.custom_channels` scopes need a new-platform app, and the account needs a paid Sales or Service Hub tier.** Developers report seeing this as hover text on a greyed-out scope in the scope picker, even as Super Admin. HubSpot doesn't document the string.

HubSpot's Custom Channels guide says the endpoints are **not supported in legacy private apps**. You build an app on the developer platform and register the channel with your developer credentials and the app ID. On tier, HubSpot's docs disagree: the Custom Channels guide shows Sales Hub or Service Hub **Professional**, and the scopes reference says **Enterprise**. A free account has neither.

**How to fix it:** build a developer-platform app, not a legacy private app, and test in an account with the Sales or Service Hub tier the feature needs. If the scope is still greyed out on Professional, try Enterprise.

## `BAD_CLIENT_ID`: "missing or unknown client id"

**HubSpot doesn't recognise the `client_id` you sent, or you didn't send one.** Sending a made-up client ID, or none, to the token endpoint returns:

```json
{"status":"BAD_CLIENT_ID","message":"missing or unknown client id","error":"invalid_request","error_description":"missing or unknown client id"}
```

It comes back as HTTP 400. HubSpot checks the client ID **before** the grant type, so this error hides anything else wrong with the request. Fix the client ID first, then see what fails next. If you send the body as JSON, you get **HTTP 415** instead, because the token endpoint only accepts `application/x-www-form-urlencoded`.

HubSpot doesn't list the causes of this error. The common ones:

- **Wrong value.** The app ID, a developer API key or a private app token pasted where the Client ID goes. The Client ID is on the app's **Auth** tab.
- **Wrong app.** A test app and a production app have different credentials. In one community thread, the error came from a separate test app while the main app worked.
- **Whitespace or quoting** picked up from an environment variable.
- **Old endpoint.** Developers report that `client_credentials` on `/oauth/v1/token` fails with `BAD_GRANT_TYPE`. Use the dated endpoint. If you're still on v1 for other grants, see my [OAuth v1 migration checklist](/insights/hubspot-oauth-v1-migration-checklist/).

This request sends the credentials the way the docs expect and turns the error into something you can act on:

```javascript
// Client-credentials token request that says what BAD_CLIENT_ID actually means.
async function getClientCredentialsToken({ clientId, clientSecret, scopes }, base = 'https://api.hubapi.com') {
  const res = await fetch(`${base}/oauth/2026-09/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: (clientId ?? '').trim(),
      client_secret: (clientSecret ?? '').trim(),
      scope: scopes.join(' '),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (body.status === 'BAD_CLIENT_ID') {
    throw new Error('BAD_CLIENT_ID: use the Client ID from this app\'s Auth tab, not the app ID or a token.');
  }
  if (!res.ok) throw new Error(`${res.status} ${body.status ?? ''}: ${body.message ?? 'token request failed'}`);
  return body; // access_token and expires_in; no refresh token for this grant
}
module.exports = { getClientCredentialsToken };
```

Right now the only feature that uses client-credentials tokens is the Webhooks Journal API. It needs the `developer.webhooks_journal.*` scopes plus the object scopes, for example `crm.objects.contacts.read`.

## "The app developer has not signed the acceptable use policy"

**The app's developer hasn't signed HubSpot's Acceptable Use Policy (AUP), so the app can only be installed in developer test accounts.** The full message reads: "The app could not be installed because the app developer has not signed the acceptable use policy." The account trying to install it can't fix this. Only the developer can.

The AUP is signed per app, not per developer account:

1. Open the app in your developer account and go to its **Distribution** tab.
2. Click **Begin publishing**.
3. Review and sign the Acceptable Use Policy. If you close the panel, **Continue publishing** brings it back.

This applies to Marketplace-distributed OAuth apps. Unlisted Marketplace apps are limited to 25 installs until they're listed. The docs don't describe an AUP step for private distribution, which uses an allowlist and is limited to 10 accounts.

## For app builders: ask for less

**Every scope you ask for is something a Super Admin has to approve, so fewer scopes means faster approvals and fewer of the errors above.** On the developer platform, `app-hsmeta.json` has three scope lists:

- `requiredScopes`: needed to install. Keep this to what the core feature can't work without.
- `optionalScopes`: the installer can leave these out. If they do, the scope isn't included in the resulting access or refresh token, so your code has to check which scopes it actually got.
- `conditionallyRequiredScopes`: required only when your install URL's `scope` parameter includes them, so you can offer separate install URLs for advanced features or higher tiers.

Static-auth apps can only use required scopes. Don't ask for `.write` on objects you only read. Leave sensitive data scopes out unless a feature truly needs them. Write down why you need each scope, in words an admin can paste into an approval request.

Scope errors aren't the only thing account settings can trigger. Since 2026-09, account rules can also fail API writes, which I covered in [the 400 VALIDATION_ERROR post](/insights/hubspot-api-400-validation-error-2026-09/).

## What to do this week

- **Admins:** open **Connected Apps › Approved apps** and approve the integrations you depend on, including Zapier, Make and any AI connectors, with the optional permissions they need. That's easier now than during an outage.
- **Developers:** check that each Marketplace app has a signed AUP on its Distribution tab before you send an install link.
- **Developers:** audit `requiredScopes`. Move anything non-essential to `optionalScopes`, and handle tokens that come back without it.
- **Developers:** if you need sensitive data scopes on a Marketplace app, send HubSpot the allowlist request now.
- **Developers:** log the token endpoint's `status` field. `BAD_CLIENT_ID` hides any later errors until you fix it.

*Checked against HubSpot's knowledge base, developer documentation and developer changelog in October 2026. Code tested on Node 22 against a mock token endpoint that reproduces HubSpot's BAD_CLIENT_ID and 415 responses.*

Sources: [Manage access to apps](https://knowledge.hubspot.com/integrations/manage-access-to-apps), [Spring 2026 Spotlight](https://developers.hubspot.com/changelog/spring-2026-spotlight), [Resolve a "Request for Integration Permissions" error](https://knowledge.hubspot.com/integrations/resolve-a-request-for-integration-permissions-error), [Scopes](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/scopes), [App configuration](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/app-configuration), [Sensitive data](https://developers.hubspot.com/docs/api-reference/latest/crm/properties/sensitive-data), [Custom channels guide](https://developers.hubspot.com/docs/api-reference/latest/conversations/custom-channels/guide), [Manage OAuth tokens](https://developers.hubspot.com/docs/api-reference/latest/authentication/manage-oauth-tokens), [Authentication overview](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/overview), [Manage apps in HubSpot](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/manage-apps-in-hubspot).
