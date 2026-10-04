---
title: "How to Verify Address, City, ZIP Code, State, and Country on HubSpot Form Submit Using Google Places API"
seoTitle: "Verify Addresses on HubSpot Form Submit with Google"
description: "Check and standardize addresses from HubSpot form submissions with Google's Address Validation API, run from a workflow custom code action."
pubDate: 2025-04-14
updatedDate: 2026-10-04
pillar: build
tags: ["Google Places API","Address Validation API","HubSpot Forms","HubSpot Workflows"]
legacyUrl: "/insights/how-to-verify-address-city-zip-code-state-and-country-on-hubspot-form-submit-using-google-places-api/"
gsc12mo: "6 clicks / 1,393 impr / pos 11.6"
---

<!-- TODO(jonathan): run the custom code action against a test contact (one good US address,
     one with a missing unit, one nonsense address) and confirm the outputs and the branch
     before publishing. Then delete this comment. -->

The most reliable way to verify an address from a HubSpot form is after the submission: a workflow sends the address to Google's Address Validation API in a custom code action, saves the standardized version when Google accepts it, and flags it for a person when it doesn't. Checking in the browser before submit is no longer practical with HubSpot's updated forms, for reasons covered below.

This is the follow-up to [Smart Address Autocomplete in HubSpot Forms Using Google Places API](/insights/smart-address-autocomplete-in-hubspot-forms-using-google-places-api/). Autocomplete helps people type a good address. Verification catches the ones that still get through.

## Why verify after submit

The first version of this guide intercepted the form's submit event and geocoded the address in the browser. Two things changed.

Forms built in HubSpot's updated editor are embedded in an iframe by default, so a script on your page can't catch the submit event or stop it. And geocoding was always the wrong tool for this job. The Geocoding API tells you where an address probably is. Google's **Address Validation API** tells you whether it's a real, deliverable address, which parts it corrected, and what to do next.

Checking inside a workflow also covers contacts that never touched the form: imports, records sales created by hand, and integrations that write addresses to HubSpot.

## What you need

- **Data Hub Professional or Enterprise.** Custom code actions in workflows need one of them.
- **A Google Cloud project with the Address Validation API enabled** and a key restricted to that API. This key runs on HubSpot's servers, not in a browser, so store it as a secret in HubSpot rather than restricting it by website.
- **Countries you sell into on Google's coverage list.** The API doesn't support every country. For unsupported ones, the code below marks the address as not checked and leaves it alone.

## Step 1: Add a property to hold the result

Create a contact property called **Address check** (internal name `address_check`) as a dropdown with these options:

| Value | What it means |
| --- | --- |
| `ACCEPT` | Google found no problems. Safe to use the standardized address. |
| `CONFIRM` | Minor issues. Someone should confirm it with the contact. |
| `CONFIRM_ADD_SUBPREMISES` | Probably missing an apartment or suite number. |
| `FIX` | Significant problems. The address needs correcting. |
| `NOT_CHECKED` | Couldn't be checked (unsupported country, missing data, or an API error). |

The first four are the values Google returns in `verdict.possibleNextAction`, so the property maps straight onto the API's answer.

## Step 2: Build the workflow

Create a contact-based workflow:

- **Enroll** when the contact submits your address form (or any form you choose) and **Street address is known**.
- **Re-enroll** when Street address, City, State/Region, Postal code or Country changes, so edits get checked too.

Then add a **Custom code** action with:

- **Secret:** `GOOGLE_ADDRESS_KEY`, holding your Google key.
- **Properties to include in code:** `address`, `city`, `state`, `zip`, `country`.
- **Outputs** (all strings): `check`, `address`, `city`, `state`, `zip`.

## Step 3: The custom code

```javascript
const axios = require('axios');

// Address Validation needs a two-letter region code. Map the country names your forms use.
const REGION = { 'united states': 'US', usa: 'US', us: 'US', canada: 'CA', 'united kingdom': 'GB', uk: 'GB', australia: 'AU' };

exports.main = async (event, callback) => {
  const { address, city, state, zip, country } = event.inputFields;
  const regionCode = REGION[(country || '').trim().toLowerCase()];

  if (!address) {
    return callback({ outputFields: { check: 'NOT_CHECKED' } });
  }

  const lines = [address, [city, state, zip].filter(Boolean).join(' ')].filter(Boolean);
  if (!regionCode && country) lines.push(country);

  let result;
  try {
    const res = await axios.post(
      `https://addressvalidation.googleapis.com/v1:validateAddress?key=${process.env.GOOGLE_ADDRESS_KEY}`,
      { address: { regionCode, addressLines: lines }, enableUspsCass: regionCode === 'US' },
      { timeout: 10000 },
    );
    result = res.data.result;
  } catch (err) {
    const status = err.response?.status;
    // Rate limits and server errors: throw so HubSpot retries the action.
    if (status === 429 || status >= 500) throw err;
    // Anything else (an unsupported country, a bad request): leave the address alone.
    return callback({ outputFields: { check: 'NOT_CHECKED' } });
  }

  const postal = result.address?.postalAddress ?? {};
  callback({
    outputFields: {
      check: result.verdict?.possibleNextAction ?? 'FIX',
      address: (postal.addressLines ?? []).join(', '),
      city: postal.locality ?? '',
      state: postal.administrativeArea ?? '',
      zip: postal.postalCode ?? '',
    },
  });
};
```

Some notes on the choices in there:

- **Region code.** HubSpot's Country property is usually free text like "United States", while the API wants a two-letter code. Add the names your forms actually collect to the `REGION` map. If a country isn't in the map, its name goes in as an extra address line instead.
- **US addresses** get `enableUspsCass`, which runs USPS CASS standardization on top of Google's own checks.
- **Retries.** HubSpot retries a custom code action when it throws on a 429 or 5xx error, so those errors are thrown on purpose. Every other failure returns `NOT_CHECKED` so the workflow carries on.
- **Time limit.** Custom code actions have 20 seconds to finish. The 10-second request timeout stops one slow response from using up the whole window.

## Step 4: Act on the result

After the code action:

1. **Edit record:** set **Address check** to the action's `check` output.
2. **If/then branch** on the **Address check** property. Branching on a saved property is more dependable than branching on the code action's output directly:
   - **ACCEPT:** edit the record again and copy the `address`, `city`, `state` and `zip` outputs into the matching properties, so the CRM holds Google's standardized version.
   - **CONFIRM** or **CONFIRM_ADD_SUBPREMISES:** create a task for the contact owner to confirm the address on their next call or email.
   - **FIX:** create a task, and if address accuracy matters for routing, hold the contact out of territory assignment until it's corrected.
   - **NOT_CHECKED:** do nothing, or add the contact to a list you review now and then.

Only overwriting on `ACCEPT` matters. Replacing an address Google wasn't sure about can make a bad address worse, and the contact typed their version for a reason.

## Testing it

Enroll a test contact three times with three addresses: a complete US address, the same address without its apartment number, and a made-up one. You'd typically expect `ACCEPT`, `CONFIRM_ADD_SUBPREMISES` and `FIX`, though Google's verdict depends on its data for that area. Then check that only the accepted one had its properties rewritten, and that the others produced tasks.

In Google Cloud, set a budget alert on the project. The API charges per request, and the re-enrollment trigger means every address edit is a new check.

## Can I check before the form submits?

Not reliably with updated-editor forms, since the embed doesn't let your page block a submission. The best you can do in the browser is help people pick a valid address in the first place, which is what the [autocomplete guide](/insights/smart-address-autocomplete-in-hubspot-forms-using-google-places-api/) covers. The two work well together: autocomplete for most visitors, and this workflow for everything that slips through.

Sources: [Google Address Validation requests](https://developers.google.com/maps/documentation/address-validation/requests-validate-address), [Understanding the response](https://developers.google.com/maps/documentation/address-validation/understand-response), [Building validation logic](https://developers.google.com/maps/documentation/address-validation/build-validation-logic), [Coverage](https://developers.google.com/maps/documentation/address-validation/coverage), [HubSpot custom code actions](https://developers.hubspot.com/docs/api-reference/latest/automation/workflow-actions/custom-code-actions).
