---
title: "Migrating a HubSpot Classic CRM Card to an App Card (Before October 31)"
seoTitle: "Migrate a HubSpot Classic CRM Card to an App Card"
description: "Classic CRM cards stop on October 31, 2026. How to rebuild one as a React app card, what the converter misses, and the backend changes nobody mentions."
pubDate: 2026-10-04
pillar: build
tags: ["HubSpot API","CRM Cards","UI Extensions","App Cards","Developer Platform"]
---

HubSpot's classic CRM cards, the sidebar cards an app defines with a data fetch URL and a JSON response, are fully sunset on **October 31, 2026**. The replacement is an **app card**: a React component built with UI extensions, inside an app on HubSpot's projects framework (version 2025.2 or newer). HubSpot provides a converter that reproduces a basic classic card, and an API that swaps the new card into your users' record views. The API and the swap screen keep working until **December 1, 2026**, but the cards themselves stop on October 31.

The converter is the easy half. The half that catches people out is the backend: the new cards sign requests differently and send less about the record, so an endpoint that served a classic card won't accept the new requests unchanged. That's covered below, with tested code. If your app is in the middle of a wider platform migration, this is the kind of work I do as part of [custom apps and platform development](/services/build/).

## Who needs to do this?

Any app that defined a card through the legacy CRM cards API. You'll recognize it by its setup: a **target URL** HubSpot calls when someone opens a record, a JSON response with up to five `results`, and action types like `IFRAME`, `ACTION_HOOK` or `CONFIRMATION_ACTION_HOOK`. New classic cards couldn't be added after June 16, 2025, so anything still running one has been on borrowed time since then.

Cards already built as React UI extensions are app cards, and aren't affected by this date.

## The migration, in order

1. **Get the app onto the projects framework**, version 2025.2 or newer (2026.09 is current). App cards only exist there. If the app itself still needs migrating, follow HubSpot's guide for [public apps](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/migrate-an-app/migrate-an-existing-public-app) or [private apps](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/migrate-an-app/migrate-an-existing-private-app) first, and do the work in a test account.
2. **Build the app card**, either from scratch or starting from HubSpot's [Legacy CRM Card Converter](https://github.com/HubSpot/ui-extensions-examples/tree/main/legacy-card-converter).
3. **Update the backend** for the new request format (next sections).
4. **Upload and check** that the card appears and loads data on real records.
5. **Swap the views** so users see the new card where the old one was.
6. **Delete the classic card** once the swap has finished.

## What the converter does, and what it misses

The converter is a sample app card that "works just like legacy CRM cards." You retrieve your classic card's definition through the API, paste the JSON into `src/app/cards/definition/DEFINITION.json`, add your endpoint to `permittedUrls`, set the object types, then run `hs project install-deps` and `hs project upload`. It needs CLI 7.9.0 or later. It calls your existing target URL and renders the response as tiles with expandable details and action buttons.

According to its README, it **doesn't** support:

| Classic card feature | What to do instead |
| --- | --- |
| `IFRAME` actions (modals) | Rebuild the modal as part of the React card |
| `ACTION_HOOK` and `CONFIRMATION_ACTION_HOOK` | Buttons that call your backend with `hubspot.fetch()`, plus a confirm step in the card |
| `primaryAction` | A button in the card |
| `settingsAction` in the footer | A link or button in the card |
| Dynamic titles (like a count of results) | Show the count inside the card |

If your classic card is read-only, the converter may be most of the job. If people click things in it, plan on writing those interactions properly. That's also the chance to drop the five-result limit and build what users actually need.

It also flags one change on the wire: POST, PUT and PATCH requests now send a **JSON body**, not a URL-encoded form.

## The backend changes

App cards reach your server through `hubspot.fetch()`. Three differences matter.

**1. A different signature.** Classic cards sent an `X-HubSpot-Signature` header. `hubspot.fetch()` sends `X-HubSpot-Signature-v3`, an HMAC that includes a timestamp (`X-HubSpot-Request-Timestamp`). If your endpoint validates the old header, every request from the new card fails. Here's a v3 check for an Express server:

```javascript
const crypto = require('crypto');

// HubSpot signs the URL with these characters decoded in the query string.
const DECODE = { '%3A': ':', '%2F': '/', '%3F': '?', '%40': '@', '%21': '!', '%24': '$', '%27': "'", '%28': '(', '%29': ')', '%2A': '*', '%2C': ',', '%3B': ';' };

function isFromHubSpot(req, rawBody, clientSecret) {
  const signature = req.get('X-HubSpot-Signature-v3');
  const timestamp = req.get('X-HubSpot-Request-Timestamp');
  if (!signature || !timestamp) return false;
  if (Date.now() - Number(timestamp) > 5 * 60 * 1000) return false; // older than 5 minutes

  let uri = `https://${req.hostname}${req.originalUrl}`;
  const q = uri.indexOf('?');
  if (q !== -1) {
    uri = uri.slice(0, q + 1) + uri.slice(q + 1).replace(/%3A|%2F|%3F|%40|%21|%24|%27|%28|%29|%2A|%2C|%3B/g, (m) => DECODE[m]);
  }

  const expected = crypto
    .createHmac('sha256', clientSecret)
    .update(`${req.method}${uri}${rawBody}${timestamp}`)
    .digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

Three details in there are easy to get wrong:

- **Decode the query string, and only those characters.** `hubspot.fetch()` always adds `userEmail` to the URL, so the `@` arrives as `%40`, but HubSpot signs it decoded. Skip that step and every request fails validation.
- **Use the raw body**, and an empty string for GET requests. HubSpot's own example uses `JSON.stringify(body)`, which signs `{}` for a GET with no body. Capture the raw body with `express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); } })` and pass `req.rawBody || ''`.
- **Check the length before `timingSafeEqual`**, which throws when the buffers differ in length. If you use the official Node client's `Signature.isValid()` instead, know that it throws, rather than returning `false`, when the timestamp is stale, so wrap it in a `try`.

The URL has to be exactly the one HubSpot called. Behind a load balancer or proxy, configure the server to trust it (`app.set('trust proxy', true)` in Express), or `req.hostname` will be the internal one.

**2. Less context in the request.** A classic card's request carried `associatedObjectId`, `associatedObjectType` and the record properties you'd listed in the card settings. `hubspot.fetch()` only appends `userId`, `portalId`, `userEmail` and `appId`. The card has to send the record itself:

```jsx
import React, { useEffect, useState } from 'react';
import { hubspot, Text, LoadingSpinner, Alert } from '@hubspot/ui-extensions';

hubspot.extend(({ context }) => <OrderCard context={context} />);

const OrderCard = ({ context }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const { objectId, objectTypeId } = context.crm;
    const params = new URLSearchParams({ objectId: String(objectId), objectTypeId });
    hubspot
      .fetch(`https://api.example.com/hubspot/card?${params}`, { method: 'GET', timeout: 5000 })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert title="Couldn't load orders" variant="error">{error}</Alert>;
  if (!data) return <LoadingSpinner label="Loading orders" />;
  return <Text>{data.orders.length} open orders</Text>;
};
```

If the backend relied on properties arriving in the request, either read them in the card and send them along, or look them up from the backend with the record ID.

**3. New limits.** Fetch URLs must be HTTPS and listed in `permittedUrls.fetch` in the card's `-hsmeta.json` (entries match as prefixes). Requests time out after 15 seconds by default (2 minutes at most), responses are capped at 1 MB, and each app gets 20 concurrent requests per account. Locally, a `local.json` proxy can point the HTTPS URL at your development server.

## Swapping the card into users' views

Users have the classic card placed in their record views. Uploading an app card doesn't move it there. Use the swap in the project's UI, or call the migrate views API:

```bash
curl --request POST \
  --url "https://api.hubapi.com/crm/v3/extensions/cards-dev/YOUR_APP_ID/views/migrate?hapikey=YOUR_DEVELOPER_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{ "legacyCrmCardId": "LEGACY_CARD_ID", "appCardId": "APP_CARD_ID" }'
```

It authenticates with your developer account's API key, not an app token. The app ID and app card ID are in the projects tool; the classic card's ID comes from the legacy cards API's "retrieve cards" endpoint. Add `helpdeskAppCardId` if the classic card appears on tickets in the help desk, and `allowDuplicateAppCardIds` if you're consolidating several classic cards into one app card.

The swap runs in the background across all installs, and some users may briefly see both cards. To check progress, send the same request again: it reports how many installs are still processing, and when it's finished, confirms the views were migrated and the classic card hidden. Then delete the classic card.

Both the swap UI and this API stop on **December 1, 2026**, and the classic card itself stops rendering a month before that. Run the swap as soon as the app card works, not in November.

## Timeline

| Date | What happens |
| --- | --- |
| June 16, 2025 | No new classic cards; new Marketplace apps can't list with them |
| **October 31, 2026** | Classic CRM cards fully sunset |
| December 1, 2026 | Migrate views API and swap UI discontinued |

*Checked against HubSpot's developer changelog, documentation and the converter's README in October 2026. The signature check was tested against the official Node client's v3 implementation.*

Sources: [Deprecating classic CRM cards](https://developers.hubspot.com/changelog/deprecating-support-for-classic-crm-cards), [Migrate a legacy CRM card to an app card](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/migrate-an-app/migrate-legacy-crm-cards-to-app-cards), [Legacy CRM Card Converter](https://github.com/HubSpot/ui-extensions-examples/tree/main/legacy-card-converter), [Legacy CRM cards reference](https://developers.hubspot.com/docs/api-reference/latest/crm/extensions/crm-cards/guide), [Fetching data for UI extensions](https://developers.hubspot.com/docs/apps/developer-platform/add-features/ui-extensions/fetching-data), [Validating requests](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/request-validation), [UI extension context](https://developers.hubspot.com/docs/apps/developer-platform/add-features/ui-extensions/ui-extensions-sdk/context), [April 2026 developer rollup](https://developers.hubspot.com/changelog/april-2026-rollup).
