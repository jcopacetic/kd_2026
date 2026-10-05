---
title: "Generating a PDF From a HubSpot Form Submission (Build vs Buy)"
seoTitle: "Generate a PDF From a HubSpot Form Submission"
description: "HubSpot can't natively turn a form submission into a PDF. The three real options (an app, Quotes, or a small service) and how to attach the file to the record."
pubDate: 2026-10-05
pillar: build
tags: ["HubSpot Workflows","HubSpot Forms","Files API","PDF Generation","Custom Code Actions"]
---

HubSpot has no built-in way to generate a PDF from a form submission. The only native template-to-PDF feature is **Quotes**, which run from deals, not forms. For anything driven by form data you have two real choices: install a marketplace document-generation app, or run a small service that renders the PDF, uploads it through the **Files API** and attaches it to the contact as a note.

Below is how to choose, and the HubSpot side of the build option with tested code. If you'd rather have the whole thing built and maintained, that's the kind of [custom app and integration work](/services/build/) I do.

## What can HubSpot do natively?

Quotes are the only feature that fills a template and produces a PDF. The Documents tool, which people often reach for first, shares files you already have.

- **Quotes.** HubSpot's knowledge base lists quotes for Revenue Hub Professional and Enterprise, and says "A Revenue Hub seat is required to create and edit quotes." Workflows can create one with the **Create quote** action, but only "in a deal-based workflow." You can download the quote as a PDF. That makes quotes a fit when the form really is a request for pricing that becomes a deal. It's not a general document generator: a quote template has quote-shaped content, and a contact-based form workflow can't use the action.
- **Documents.** In HubSpot's words, the documents tool lets your team "upload and share documents with your contacts" and see who engaged with them. There's no template or merge-field generation. It's useful for sending the same brochure to everyone, not a PDF built from one person's answers.

HubSpot doesn't document any other way to merge form or record data into a PDF. That gap is why the marketplace has a whole category of document apps.

## Should you buy an app or build it?

Buy if the documents are simple and someone non-technical needs to own the template. Build if the PDF depends on logic, data from other systems, or volume that makes per-document pricing hurt.

| | Marketplace app | Quotes | Small service you own |
|---|---|---|---|
| Triggered by a form | Yes, via the app's workflow action | No, deal-based workflows only | Yes, via webhook or custom code |
| Template editing | The vendor's editor | Quote templates | HTML and CSS in your code |
| Logic and outside data | Whatever the app supports | Deal, line items, quote fields | Anything you can query |
| HubSpot tier needed | Depends on the app | Revenue Hub Pro or Enterprise, plus a seat | Data Hub Pro or Enterprise for the trigger |
| Ongoing cost | Vendor subscription (check how it's metered) | Included in the tier | Hosting, plus maintenance |
| Who fixes it when it breaks | The vendor | HubSpot | You, or whoever built it |

Two practical notes on apps. First, set up the template in the vendor's dashboard before you build the workflow; a common forum question is a workflow action showing configuration fields but no template picker, because the template doesn't exist yet. Second, check where the generated file ends up. Some apps return a link to their own storage rather than putting the file in HubSpot, which matters if you need the PDF on the contact record for years.

## How does the build option work?

A workflow triggers on the form submission, your service renders the PDF from HTML, uploads it to HubSpot's file manager, and creates a note on the contact with the file attached. HubSpot then shows the PDF on the record's timeline like any other attachment.

1. **Trigger.** A contact-based workflow enrolls on the form submission. It either calls your service with the **Send a webhook** action, or runs a **custom code action** that calls it. Both need Data Hub Professional or Enterprise.
2. **Render.** Your service fills an HTML template with the submission data and converts it to PDF. In a Django stack, WeasyPrint does this from ordinary templates and CSS; a serverless function with a headless browser or a PDF API works too.
3. **Upload.** `POST /files/2026-09/files` as multipart form data with the file, a folder (`folderId` or `folderPath`) and an `options` JSON field whose `access` value is required. The response includes the file's `id` and `url`.
4. **Attach.** `POST /crm/objects/2026-09/notes` with `hs_attachment_ids` set to the file ID and an association to the contact.
5. **Email it (optional).** Send the follow-up email from the workflow with a link, or attach the file from your service.

### Where to do the rendering

Render outside HubSpot. Custom code actions must "finish running within 20 seconds" and "can only use up to 128 MB of memory," and you can't install a PDF engine in them anyway. A custom code action is fine as the trigger: it passes the contact ID and form fields to your service and returns. My post on [address validation on form submit](/insights/how-to-verify-address-city-zip-code-state-and-country-on-hubspot-form-submit-using-google-places-api/) shows a full custom code action on a form workflow.

The **Send a webhook** action is often simpler, because there's no code in HubSpot at all. HubSpot retries failed webhooks for up to three days, with no retry on most 4xx responses (429 is the exception). Retries mean your service can be called twice for the same submission, so make it idempotent: key each job on the contact ID and submission time, and skip the upload if that key already produced a file.

## The HubSpot side, in code

This is the upload and attach step, using only Node's built-in `fetch`, `FormData` and `Blob`. It takes the PDF bytes your renderer produced.

```javascript
// Upload a PDF to HubSpot's file manager and attach it to a contact as a note.
// Uses Node's built-in fetch, FormData and Blob (Node 18+). No SDK needed.
const API = 'https://api.hubapi.com';

async function hubspot(path, init, token, fetchImpl = fetch) {
  const res = await fetchImpl(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`HubSpot ${res.status} on ${path}: ${body.message ?? 'no message'}`);
  return body;
}

async function attachPdfToContact({ pdf, fileName, contactId, token, fetchImpl }) {
  const form = new FormData();
  form.append('file', new Blob([pdf], { type: 'application/pdf' }), fileName);
  form.append('fileName', fileName);
  form.append('folderPath', '/generated-pdfs');
  form.append('options', JSON.stringify({ access: 'PRIVATE' }));
  // Don't set Content-Type yourself: fetch adds the multipart boundary.
  const file = await hubspot('/files/2026-09/files', { method: 'POST', body: form }, token, fetchImpl);

  const note = await hubspot('/crm/objects/2026-09/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: `Generated PDF: ${fileName}`,
        hs_attachment_ids: String(file.id),
      },
      associations: [{
        to: { id: contactId },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }], // note to contact
      }],
    }),
  }, token, fetchImpl);

  return { fileId: file.id, noteId: note.id };
}
module.exports = { attachPdfToContact };
```

A few details that trip people up:

- **Don't set the multipart `Content-Type` header by hand.** Without the boundary HubSpot can't parse the body. Let `fetch` set it from the `FormData`.
- **`access` decides who can open the URL.** `PRIVATE` is right for anything personal. A private file's `url` won't open for the recipient; HubSpot's Files guide has a `GET /files/2026-09/files/{fileId}/signed-url` endpoint for a temporary link, or you can choose a public access level for documents that aren't sensitive.
- **`hs_attachment_ids` is a string.** For several files, separate the IDs with semicolons.
- **The association type matters.** `202` is note to contact in HubSpot's Notes guide. Use the matching type if you attach to a deal or company instead.
- **Use the dated API paths.** The `2026-09` paths above are current. If you're still on `/v3/` endpoints, the [2027 API sunset checklist](/insights/hubspot-api-sunset-2027-migration-checklist/) covers what's changing.

The service authenticates with a token that has access to files and to notes on contacts. For a new internal service that's a Service Key or a project app, not a new legacy private app.

## What to do this week

- [ ] Decide what the PDF is for: if it's pricing that becomes a deal, try Quotes first.
- [ ] Write down the template, the data it needs, and where that data lives. If it's all on the form and the contact, price two marketplace apps.
- [ ] If you're building, confirm the account has Data Hub Professional or Enterprise for the webhook or custom code trigger.
- [ ] Build the render step outside HubSpot and test it with real submissions, including long answers and non-Latin characters.
- [ ] Add the upload and note step, with `PRIVATE` access unless the document is public.
- [ ] Make the service idempotent before switching the workflow on, so retries don't create duplicate PDFs.

*Checked against HubSpot's knowledge base (quotes, documents, workflow webhooks) and developer docs (Files, Notes, custom code actions) in October 2026. Code tested on Node 22 against mocked HubSpot responses, including the multipart body and note payload.*

Sources: [Create and send quotes](https://knowledge.hubspot.com/quotes/create-and-send-quotes), [Use documents](https://knowledge.hubspot.com/documents/use-documents), [Use webhooks with HubSpot workflows](https://knowledge.hubspot.com/workflows/how-do-i-use-webhooks-with-hubspot-workflows), [Files API guide](https://developers.hubspot.com/docs/api-reference/latest/files/guide), [Notes API](https://developers.hubspot.com/docs/api-reference/crm-notes-v3/basic), [Custom code actions](https://developers.hubspot.com/docs/api-reference/latest/automation/workflow-actions/custom-code-actions), [WeasyPrint documentation](https://doc.courtbouillon.org/weasyprint/stable/).
