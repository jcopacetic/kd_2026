---
title: "Smart Address Autocomplete in HubSpot Forms Using Google Places API"
seoTitle: "Address Autocomplete in HubSpot Forms (Google Places)"
description: "Add Google Places address autocomplete to forms built in HubSpot's updated form editor, using PlaceAutocompleteElement and HubSpot's form JavaScript API."
pubDate: 2025-04-13
updatedDate: 2026-10-04
pillar: build
tags: ["Autocomplete","Google Places API","HubSpot Forms","Locations APIs"]
legacyUrl: "/insights/smart-address-autocomplete-in-hubspot-forms-using-google-places-api/"
gsc12mo: "110 clicks / 12,185 impr / pos 18.7"
---

To add address autocomplete to a HubSpot form today, put Google's `PlaceAutocompleteElement` next to the form and copy the selected address into the form with HubSpot's `setFieldValue()`. The older approach, where you attach Google's widget directly to the form's address input, stopped being a good option in 2025 for two reasons covered below.

I first wrote this guide in April 2025. This version is rewritten for HubSpot's updated form editor and Google's current Places library.

## What changed since the first version

**Google.** As of March 1, 2025, `google.maps.places.Autocomplete` is no longer available to new Google Maps Platform customers. Existing setups keep working, but the class only gets fixes for major regressions, and Google has promised at least 12 months' notice before it's discontinued. The replacement is `PlaceAutocompleteElement`, part of Places API (New). The new element creates its own text input. You can't attach it to an input that already exists, which rules out the "upgrade the form's address field" trick.

**HubSpot.** Forms built in the updated editor are embedded in an iframe by default, so scripts on your page can't reach into the form's HTML. HubSpot's raw-HTML "developer code" embed avoids the iframe, but it needs a Professional or Enterprise subscription. The supported route on every plan is HubSpot's form JavaScript API, which lets you read and set field values without touching the HTML.

Put together: the search box lives outside the form, and the form's own address fields get filled in through the API. Visitors can still see and correct every field before they submit, and the submission stays a normal HubSpot submission, with tracking, workflows and the contact record behaving as usual.

## What you need

- A Google Cloud project with **Maps JavaScript API** and **Places API (New)** enabled.
- A browser API key restricted to your site's domains (HTTP referrer restriction) and to those two APIs.
- A HubSpot form built in the updated editor, with the standard address properties on it: `address`, `city`, `state`, `zip` and `country`.

## Step 1: Mark where the search box goes

Add an empty container where you want the address search to appear, usually right above the form:

```html
<div id="address-search"></div>
```

On a HubSpot page, a Rich Text or custom HTML module above the form works. On another site, put it next to the form's embed code.

## Step 2: Listen for the form before it loads

HubSpot fires `hs-form-event:on-ready` when the form has rendered, and you can get the form instance from that event. HubSpot's docs say to register the listener before the form embed code runs, so this script goes above the embed:

```html
<script>
  // Internal names of the form fields to fill. "0-1" means contact properties.
  const ADDRESS_FIELDS = {
    street: '0-1/address',
    city: '0-1/city',
    state: '0-1/state',
    zip: '0-1/zip',
    country: '0-1/country',
  };

  let hubspotForm;
  window.addEventListener('hs-form-event:on-ready', (event) => {
    hubspotForm = HubSpotFormsV4.getFormFromEvent(event);
  });
</script>
```

If the page has more than one form, check `hubspotForm.getFormId()` against the form you want before you keep it.

## Step 3: Load Google's library and fill the form

```html
<script>
  async function initAddressSearch() {
    const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');

    const search = new PlaceAutocompleteElement();
    search.includedRegionCodes = ['us', 'ca']; // limit suggestions to the countries you serve
    search.includedPrimaryTypes = ['street_address', 'premise', 'subpremise']; // addresses, not businesses
    document.getElementById('address-search').append(search);

    search.addEventListener('gmp-select', async ({ placePrediction }) => {
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ['addressComponents'] });

      const part = (type, short = false) => {
        const c = (place.addressComponents || []).find((component) => component.types.includes(type));
        return c ? (short ? c.shortText : c.longText) : '';
      };

      const values = {
        street: [[part('street_number'), part('route')].filter(Boolean).join(' '), part('subpremise')]
          .filter(Boolean)
          .join(', '), // "1600 Main Street, Apt 4B"
        city: part('locality') || part('postal_town') || part('sublocality'),
        state: part('administrative_area_level_1', true), // "TX", not "Texas"
        zip: part('postal_code'),
        country: part('country'),
      };

      if (!hubspotForm) {
        console.warn('Address picked before the HubSpot form was ready');
        return;
      }
      for (const [key, fieldName] of Object.entries(ADDRESS_FIELDS)) {
        // Skip parts Google didn't return, so they don't wipe out what the visitor typed.
        if (values[key]) hubspotForm.setFieldValue(fieldName, values[key]);
      }
    });
  }
</script>
<script async
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_BROWSER_KEY&loading=async&libraries=places&callback=initAddressSearch">
</script>

<!-- Your HubSpot form embed code goes here, after the scripts above. -->
```

A few details in there are worth explaining:

- **Street address.** Google returns the house number, the street and any unit (`subpremise`) as separate components, so they're joined into one line for HubSpot's `address` property: "1600 Main Street, Apt 4B". If you'd rather keep the unit in its own field, add an address-line-2 property to the form and map `subpremise` to it instead.
- **Addresses only.** `includedPrimaryTypes` keeps businesses and landmarks out of the suggestions. Their results often have no street number, which would leave the address field half filled.
- **City.** `locality` covers most addresses. UK addresses often use `postal_town` instead, and some cities only return `sublocality`, so the code falls back through all three.
- **State.** I use the short form (`TX`) because that's what most sales teams filter on. If your `state` property is a dropdown, the value has to match one of its options exactly, so change it to `longText` if your options are full names.
- **Country.** The same rule applies if `country` is a dropdown. Check the option values in the property settings.
- **Empty parts.** If Google doesn't return a part (some rural addresses have no ZIP, for example), that field is left as it was rather than cleared.
- **Content Security Policy.** If your site sends a CSP header, allow `https://maps.googleapis.com` in `script-src`, `https://places.googleapis.com` and `https://maps.googleapis.com` in `connect-src`, and HubSpot's form hosts (`js.hsforms.net`, `forms.hsforms.com`) in `script-src` and `frame-src`. Otherwise the browser blocks the scripts and nothing happens.

## Country or state only

The first version of this guide also autocompleted standalone country and state fields. I'd now use a dropdown property for those. A dropdown can't be misspelled, it costs nothing per lookup, and it gives your reports a fixed list of values to group by. Save Places autocomplete for full street addresses, where typing errors are common and the structured data is worth paying for.

## Testing it

1. Load the page with the browser console open and confirm there are no errors from either script.
2. Type part of an address that has an apartment or suite number, pick a suggestion, and check that the address (including the unit), city, state, ZIP and country fields fill in.
3. Edit one of the filled fields by hand to make sure visitors can still correct it.
4. Submit, then open the contact record and confirm all five properties were saved.
5. In Google Cloud, check that requests appear under Places API (New), and set a budget alert while you're there.

## Legacy-editor forms

This guide covers forms built in HubSpot's updated form editor. Forms from the legacy editor use a different JavaScript API (`hbspt.forms.create` with `onFormReady` callbacks), and the first version of this guide was written around that older setup. If your form still uses the legacy editor, rebuilding it in the new editor is the cleanest way to use the approach above.

## Validating the address on submit

Autocomplete helps people enter a good address, but it can't stop someone from ignoring the suggestions. To check the address when the form is submitted, see the follow-up: [How to Verify Address, City, ZIP Code, State, and Country on HubSpot Form Submit Using Google Places API](/insights/how-to-verify-address-city-zip-code-state-and-country-on-hubspot-form-submit-using-google-places-api/).

*Code last checked against HubSpot's and Google's documentation in October 2026.*

Sources: [HubSpot global form events](https://developers.hubspot.com/docs/api-reference/latest/marketing/forms/global-form-events), [Google Place Autocomplete widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new), [Google Places widgets reference](https://developers.google.com/maps/documentation/javascript/reference/places-widget), [Google Places migration overview](https://developers.google.com/maps/documentation/javascript/places-migration-overview).
