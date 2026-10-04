---
title: "HubSpot OAuth v1 Shuts Off February 16, 2027: Migration Checklist"
seoTitle: "HubSpot OAuth v1 Migration Checklist (Feb 16, 2027)"
description: "HubSpot retires its OAuth v1 endpoints on February 16, 2027. What changes in token exchange, refresh and introspection, with a tested drop-in module."
pubDate: 2026-10-04
pillar: build
tags: ["HubSpot API","OAuth","Authentication","API Migration","Public Apps"]
---

HubSpot retires its **OAuth v1 endpoints on February 16, 2027**. If your app exchanges authorization codes, refreshes tokens or looks up token details through `/oauth/v1/...`, those calls stop working that day. HubSpot's migration guide moves you to the date-versioned **2026-03** OAuth API. For token exchange and refresh it's a one-line URL change. The token lookup calls are where the work is: two GET endpoints become a single POST, and the response fields that told you what kind of token you had now say something different.

Token refresh is the call that quietly keeps every install of your app working, so this deadline is worth handling early rather than in the second week of February. It's part of the [platform migration work](/services/build/) I do.

## What changes

| v1 | 2026-03 | What's different |
| --- | --- | --- |
| `POST /oauth/v1/token` | `POST /oauth/2026-03/token` | Only the URL. Same form-encoded body, same `grant_type` values. |
| `GET /oauth/v1/access-tokens/{token}` | `POST /oauth/2026-03/token/introspect` | POST, with the token in the body, plus your client ID and secret |
| `GET /oauth/v1/refresh-tokens/{token}` | `POST /oauth/2026-03/token/introspect` | Same endpoint, with `token_type_hint=refresh_token` |
| `DELETE /oauth/v1/refresh-tokens/{token}` | `POST /oauth/2026-03/token/revoke` | POST, with the refresh token in a form-encoded body |

Every 2026-03 call is a form-encoded POST (`application/x-www-form-urlencoded`). Parameters go in the body, not the query string.

## Find your v1 calls

```bash
grep -rn "oauth/v1" .
```

Check the places OAuth code tends to hide: the install callback, the token-refresh job or middleware, any "is this token still valid?" check, and the uninstall or disconnect handler. If you use a library or framework plugin for HubSpot OAuth, check which version it calls and whether an update exists.

## Exchange and refresh: change the URL

The request body is identical. Only the path changes:

```bash
curl --request POST \
  --url https://api.hubapi.com/oauth/2026-03/token \
  --header 'content-type: application/x-www-form-urlencoded' \
  --data 'grant_type=refresh_token&refresh_token=REFRESH_TOKEN&client_id=CLIENT_ID&client_secret=CLIENT_SECRET'
```

The response carries `access_token`, `refresh_token`, `expires_in` (in seconds), `token_type`, `hub_id` and `scopes`. Keep scheduling refreshes from `expires_in` rather than assuming a fixed lifetime.

## Token lookups: the part that breaks code

The v1 lookups were GET requests with the token in the URL. Introspection is a POST with the token in the body, and it needs your app's `client_id` and `client_secret`. The response changed in ways that slip past a quick review:

- **`token_type` is now `"Bearer"`** for both kinds of token. In v1 it was `"access"` or `"refresh"`. Code that checks `token_type === 'access'` will fail every time. Use the new **`token_use`** field, which is `"access_token"` or `"refresh_token"`.
- **There's a new `active` field.** Check that it's `true` before you trust anything else in the response.
- **New identifiers:** `client_id` on both kinds of token, and `app_id` in access-token responses.
- The rest you probably use is still there: `hub_id`, `user_id`, `user`, `hub_domain`, `scopes` and `expires_in` for access tokens.

## Errors: read `error`, not `message`

Errors now follow the OAuth standard, with `error` and `error_description`. HubSpot's own `status` and `message` fields are still included for backward compatibility:

```json
{
  "error": "invalid_grant",
  "error_description": "refresh token is invalid, expired or revoked",
  "status": "BAD_REFRESH_TOKEN",
  "message": "refresh token is invalid, expired or revoked"
}
```

Base your logic on `error`. An `invalid_grant` on refresh means the install is dead: the customer uninstalled the app, or the token was revoked. Mark the connection as needing reauthorization and stop retrying; retrying a dead refresh token just adds noise to your logs.

## A drop-in module

If your OAuth calls are scattered, put them behind one small module. This one covers exchange, refresh and introspection on 2026-03 (Node 18 or later, for the built-in `fetch`):

```javascript
const BASE = 'https://api.hubapi.com/oauth/2026-03';
const { HUBSPOT_CLIENT_ID: client_id, HUBSPOT_CLIENT_SECRET: client_secret } = process.env;

// Every 2026-03 OAuth call is a form-encoded POST.
async function post(path, fields) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id, client_secret, ...fields }),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    // Standard OAuth fields; status/message are HubSpot's older extras.
    const err = new Error(body.error_description ?? body.message ?? `HTTP ${res.status}`);
    err.code = body.error; // e.g. "invalid_grant": the refresh token is dead, reconnect
    throw err;
  }
  return body;
}

// Was POST /oauth/v1/token
const exchangeCode = (code, redirect_uri) => post('/token', { grant_type: 'authorization_code', code, redirect_uri });
const refresh = (refresh_token) => post('/token', { grant_type: 'refresh_token', refresh_token });

// Was GET /oauth/v1/access-tokens/{token} and GET /oauth/v1/refresh-tokens/{token}
async function introspect(token, hint = 'access_token') {
  const info = await post('/token/introspect', { token, token_type_hint: hint });
  if (info.active !== true) return null; // check active before trusting anything else
  return info; // hub_id, user_id, user, scopes, token_use, expires_in…
}
```

For **revoking** a refresh token, for example when a customer disconnects your app, send a form-encoded POST to `/oauth/2026-03/token/revoke` with the refresh token in the body. HubSpot's migration guide describes the call but doesn't spell out the body field name, so confirm it against the current API reference before you ship it.

## Which version to target

HubSpot's migration guide uses **2026-03**, and it's the version that documents all three calls. The token and introspection endpoints also exist under **2026-09**, the current release, which stays supported six months longer. Either clears the February deadline. You'll also see `/oauth/v3/...` endpoints, released in January 2026, but v3 is a numbered version, and HubSpot has said numbered APIs go unsupported in September 2027, so skip it and go straight to a dated one.

## Checklist

1. Find every `/oauth/v1/` call: install callback, refresh, validity checks, disconnect.
2. Switch token exchange and refresh to `/oauth/2026-03/token`.
3. Replace the v1 lookups with introspection, and replace any `token_type` checks with `token_use` and `active`.
4. Handle `invalid_grant` by marking the install for reauthorization.
5. Move revoke to the new endpoint and test a full disconnect.
6. Test the whole cycle in a test account before production: install, refresh, introspect, disconnect.
7. Ship well before February 16, 2027.

*Checked against HubSpot's developer changelog, migration guide and OAuth reference in October 2026. The module is tested against a mock of the 2026-03 endpoints.*

Sources: [v1 OAuth API deprecation](https://developers.hubspot.com/changelog/v1-oauth-api-deprecation), [Migrate from OAuth v1 to the date-versioned API](https://developers.hubspot.com/docs/api-reference/legacy/authentication/oauth-tokens/v1/migration-guide), [Manage OAuth tokens (2026-09)](https://developers.hubspot.com/docs/api-reference/latest/authentication/manage-oauth-tokens), [New OAuth v3 endpoints and standardized errors](https://developers.hubspot.com/changelog/new-oauth-v3-api-endpoints-and-standardized-error-responses), [API versioning](https://developers.hubspot.com/docs/developer-tooling/platform/versioning).
