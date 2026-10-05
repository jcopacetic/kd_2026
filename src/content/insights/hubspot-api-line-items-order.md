---
title: "Getting HubSpot Deal Line Items in the Order the UI Shows Them"
seoTitle: "HubSpot API Line Items Order: Match the Deal UI"
description: "HubSpot's API doesn't return deal line items in UI order. How to sort them with hs_position_on_quote, what to do when it's empty, and setting order on create."
pubDate: 2026-10-05
pillar: build
tags: ["HubSpot API","Line Items","Deals","Quotes","Integrations"]
---

HubSpot's API has no documented way to read a deal's line items in the order the UI shows them. The association endpoints don't promise any order, so you have to sort the items yourself. The closest thing to a display order is a line item property called **`hs_position_on_quote`**: request it in a batch read, sort by it, fall back to creation date and then record ID when it's empty, and set it yourself whenever your code creates line items.

That property is not in HubSpot's Line Items API guide. Everything known about it comes from HubSpot Community threads, so treat it as useful but unofficial. Below is what's documented, what isn't, and a tested sort you can drop into an integration. If you're building a quote-to-cash sync or an invoicing integration on top of deals, that's the kind of [custom integration work](/services/build/) I do.

## Why don't line items come back in UI order?

Because nothing in the API is designed to return them that way. The associations guide describes `GET /crm/objects/2026-09/deals/{dealId}/associations/line_items` and the batch associations read, and says nothing about the order of results.

A HubSpot employee confirmed on the Community forum in 2022 that association reads don't preserve the UI order, and the related idea was moved to the Ideas board. A thread revived in 2026 still lists open ideas around line item numbering and ordering. I checked the current Line Items API guide for this post: it covers creating, reading, updating and associating line items, and doesn't mention ordering, position or `hs_position_on_quote` at all.

So the rule is simple: treat the list you get from associations as unordered, even if it happens to look right in your test deal.

## What is hs_position_on_quote?

It's a numeric line item property that stores an item's position. HubSpot doesn't document it; developers on the Community forum report how it behaves:

- It's set when line items are added or rearranged in the deal's line item editor, or arranged on a quote. A deal doesn't need a quote for the value to be there.
- It has been reported as **null** for items added in the editor while creating the deal. A later reply on the Ideas thread about exactly that says it has been fixed for new deals, but deals created before then can still have empty values.
- Line items created through the API get no value unless you send one.
- Developers report that setting it on create, or later with a batch update, controls the order the deal shows.

The name is misleading: it's not only about quotes. The beta Contracts API also exposes a `positionOnQuote` field on line items, which suggests HubSpot treats it as the line item's position generally. Still, nothing official says the deal UI sorts by it, so verify on a test deal in your own account before you rely on it.

## How to get line items in display order

Fetch the associated IDs, batch-read the items with `hs_position_on_quote` requested, and sort client-side with a fallback for missing values.

1. `GET /crm/objects/2026-09/deals/{dealId}/associations/line_items` to collect line item IDs (follow `paging.next.after` if present).
2. `POST /crm/objects/2026-09/line_items/batch/read` with those IDs, in chunks of 100, requesting `hs_position_on_quote` and `createdate` along with the fields you need.
3. Sort: position ascending, items without a position last, then oldest `createdate` first, then lowest record ID. The last two keys make the result stable, so the same deal always sorts the same way even when every position is empty.

The sort, with each fallback explicit:

```javascript
// Sort HubSpot line items into a stable display order.
// 1. hs_position_on_quote (numeric; null or empty goes last)
// 2. createdate (oldest first)
// 3. record ID (numeric, so "10" sorts after "9")
function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function compareIds(a, b) {
  const x = BigInt(a), y = BigInt(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

function compareLineItems(a, b) {
  const pa = num(a.properties?.hs_position_on_quote);
  const pb = num(b.properties?.hs_position_on_quote);
  if (pa !== pb) {
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pa - pb;
  }
  const ca = Date.parse(a.properties?.createdate ?? a.createdAt) || 0;
  const cb = Date.parse(b.properties?.createdate ?? b.createdAt) || 0;
  if (ca !== cb) return ca - cb;
  return compareIds(a.id, b.id);
}

const sortLineItems = (items) => [...items].sort(compareLineItems);
module.exports = { sortLineItems, compareLineItems };
```

Property values come back from the API as strings, which is why the position goes through `Number()` and an empty string counts as missing. Record IDs are compared as `BigInt` because HubSpot IDs can be longer than JavaScript numbers handle exactly, and as strings `"10"` would sort before `"9"`.

The read, using that sort:

```javascript
const { sortLineItems } = require('./sort-line-items.js');
const API = 'https://api.hubapi.com';

async function call(path, init, token, fetchImpl) {
  const res = await fetchImpl(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`HubSpot ${res.status} on ${path}: ${body.message ?? 'no message'}`);
  return body;
}

// Read a deal's line items and return them in display order.
async function getDealLineItemsInOrder(dealId, token, fetchImpl = fetch) {
  const ids = [];
  let after;
  do {
    const qs = after ? `?after=${encodeURIComponent(after)}` : '';
    const page = await call(`/crm/objects/2026-09/deals/${dealId}/associations/line_items${qs}`,
      { method: 'GET' }, token, fetchImpl);
    for (const r of page.results) ids.push(String(r.toObjectId ?? r.id));
    after = page.paging?.next?.after;
  } while (after);

  const items = [];
  for (let i = 0; i < ids.length; i += 100) { // batch read takes up to 100 IDs
    const batch = await call('/crm/objects/2026-09/line_items/batch/read', {
      method: 'POST',
      body: JSON.stringify({
        inputs: ids.slice(i, i + 100).map((id) => ({ id })),
        properties: ['name', 'quantity', 'price', 'hs_position_on_quote', 'createdate'],
        propertiesWithHistory: [],
      }),
    }, token, fetchImpl);
    items.push(...batch.results);
  }
  return sortLineItems(items);
}

// Build batch/create inputs that fix the order explicitly.
function lineItemInputs(dealId, lines, start = 0) {
  return lines.map((line, i) => ({
    properties: { ...line, hs_position_on_quote: String(start + i) },
    associations: [{
      to: { id: String(dealId) },
      types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 20 }], // line item to deal
    }],
  }));
}
module.exports = { getDealLineItemsInOrder, lineItemInputs };
```

## How to keep the order when you create line items

Send `hs_position_on_quote` on every line item you create, so the order never depends on timing or on someone opening the editor. `lineItemInputs` above builds the `inputs` array for `POST /crm/objects/2026-09/line_items/batch/create`, numbering items in the order you pass them and associating each to the deal with type `20`, the line-item-to-deal type in HubSpot's Line Items guide.

Three things to decide up front:

- **Where numbering starts.** HubSpot doesn't document whether positions start at 0 or 1. Arrange a test deal in the UI, read the values back, and pass the same base as `start`, so items you add alongside UI-created ones slot in correctly.
- **Appending to an existing deal.** Read the current items first and start numbering after the highest position, rather than restarting at zero.
- **Fixing deals that already exist.** For deals with empty positions, sort them with the fallback above and write the result back with a batch update. Do that only after you've confirmed on a test deal that the UI follows the values you write.

Remember that line items belong to one parent record. HubSpot's guide says line items should be individual to each object, so if you copy a deal's items to an invoice or another deal, create new items and number them again rather than reassociating the old ones.

If the integration still calls `/crm/v3/` paths, the dated `2026-09` paths above are the current ones; the [2027 API sunset checklist](/insights/hubspot-api-sunset-2027-migration-checklist/) covers the move.

## What to do this week

- [ ] Find every place your code reads deal line items and assumes the association order is the display order.
- [ ] Request `hs_position_on_quote` and `createdate` in those reads and sort with a stable fallback.
- [ ] Check a few real deals: how many line items have an empty position? That tells you how often the fallback decides the order.
- [ ] On a test deal, arrange items in the UI, read the positions back, and note the starting number.
- [ ] Set `hs_position_on_quote` on every line item your code creates.
- [ ] Log any deal where two items share a position, so you notice if the UI and your data drift apart.

*Checked against HubSpot's developer docs (Line Items, batch read, associations, object API limits) in October 2026. `hs_position_on_quote` behaviour is from HubSpot Community threads, not official documentation. Code tested on Node 22 with fixtures covering null, empty and duplicate positions, long IDs, pagination and batching, against mocked HubSpot responses.*

Sources: [Line Items API guide](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/line-items/guide), [Batch read line items](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/line-items/batch/get-line-items), [Associate records guide](https://developers.hubspot.com/docs/api-reference/latest/crm/associations/associate-records/guide), [Using object APIs](https://developers.hubspot.com/docs/api-reference/latest/crm/using-object-apis), [Community: control the display order of line items on a deal](https://community.hubspot.com/t5/APIs-Integrations/How-can-I-control-the-display-order-of-line-items-on-a-deal/m-p/341968), [Community: line items not setting position value on deal creation](https://community.hubspot.com/t5/HubSpot-Ideas/Deal-line-items-not-setting-position-value-on-deal-creation/m-p/438408), [Community: order of line items created by API](https://community.hubspot.com/t5/APIs-Integrations/Order-of-line-items-created-by-API/m-p/994861).
