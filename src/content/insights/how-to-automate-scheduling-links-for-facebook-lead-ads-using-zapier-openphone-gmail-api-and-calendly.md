---
title: "How to Automate Scheduling Links for Facebook Lead Ads Using Zapier, OpenPhone, Gmail and Calendly"
seoTitle: "Automate Calendly Links for Facebook Lead Ads (Zapier)"
description: "Send every Facebook lead a personal Calendly link by text and email within a minute, using Zapier, Quo (OpenPhone) and Gmail."
pubDate: 2025-04-13
updatedDate: 2026-10-04
pillar: build
tags: ["Calendly","Facebook Lead Ads","Gmail","Quo (OpenPhone)","Zapier"]
legacyUrl: "/insights/how-to-automate-scheduling-links-for-facebook-lead-ads-using-zapier-openphone-gmail-api-and-calendly/"
gsc12mo: "0 clicks / 94 impr / pos 34.2"
---

<!-- TODO(jonathan): run one test lead through the finished Zap (Meta's Lead Ads Testing Tool)
     and confirm the text, the email and the pre-filled Calendly page. Then delete this comment. -->

To get Facebook leads booked without anyone chasing them, build a Zap that fires on each new Lead Ads submission, then texts and emails the lead a Calendly link with their name and email already filled in. Leads get the link while they're still thinking about you, and the booking form takes them seconds. If you text leads in the US, you also need their consent on the form and a registered business number, covered below.

I first built this for a travel agency client running Facebook lead ads. The pieces:

- **Facebook Lead Ads** (Meta instant forms) to capture the lead
- **Zapier** to connect everything
- **Quo**, the business phone app formerly called OpenPhone, to send the text
- **Gmail** to send the email
- **Calendly** for booking

## Step 1: Build the lead form

In Meta Ads Manager, create a campaign with the **Leads** objective and choose **Instant forms** as the place leads are collected.

In the form:

- Ask for **full name**, **email** and **phone number**. Meta can pre-fill these from the person's profile, which keeps the form quick.
- Add one or two qualifying questions if they'll change what happens next, such as which service they're interested in.
- Add your **privacy policy** link.
- If you'll text the lead, add a **custom disclaimer** with a consent checkbox that says they agree to receive texts from your business about their inquiry. Keep a record of that consent; more on why below.
- Set the **completion screen** to tell them a booking link is on its way by text and email.

## Step 2: Start the Zap with new leads

In Zapier, create a Zap:

- **Trigger app:** Facebook Lead Ads
- **Trigger event:** New Lead
- Connect the Facebook account that manages the Page, then choose the **Page** and the **form**.

Submit a test lead with Meta's [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing/) and pull it into Zapier, so you have real field values to map in the next steps.

## Step 3: Build a personal Calendly link

Calendly can pre-fill its booking form from the link itself. Add `name` and `email` to your event link, and the lead only has to pick a time:

```text
https://calendly.com/yourname/intro-call?name=Jane%20Smith&email=jane%40example.com
```

Names and emails contain spaces and symbols, so encode them first. Add a **Formatter by Zapier** step (**Text → URL Encode**) for the name, and another for the email. Then build the link in your messages from your Calendly event link plus the two encoded values. If you added a qualifying question to the form, you can pass its answer to a matching Calendly question with `a1`.

## Step 4: Text the link with Quo

Phone numbers from Facebook arrive in whatever format the person typed. Add **Formatter by Zapier → Numbers → Format Phone Number** and choose the E.164 format (`+15551234567`) so the text goes to a valid number.

Then add the action:

- **App:** Quo (formerly OpenPhone)
- **Action:** Send a Message
- **From:** your registered business number
- **To:** the formatted phone number
- **Message:**

```text
Hi {First name}, it's Jonathan from Khaotic Digital. Thanks for reaching out. Pick a time that works for you here: {personal Calendly link}
Reply STOP to opt out.
```

Keep it short and personal, and say who it's from in the first line. A link from an unknown number gets ignored.

## Step 5: Email the same link with Gmail

Add a second action:

- **App:** Gmail
- **Action:** Send Email
- **To:** the lead's email
- **From name:** your name, not just your company's
- **Subject:** `Your booking link, {First name}`
- **Body:**

```text
Hi {First name},

Thanks for your interest. You can book a time that suits you here:
{personal Calendly link}

It's a 30-minute call, and there's nothing to prepare. If none of the times work, just reply to this email.

Jonathan
```

Sending both covers people who ignore texts from new numbers and people who never check email. Plain-text emails from a real person's Gmail also tend to land in the main inbox more often than designed marketing emails.

## Step 6: Add the lead to your CRM

Add a step that creates or updates the contact in your CRM (HubSpot, Pipedrive or similar), with the lead source set to the Facebook campaign. Otherwise the leads live only in Facebook and Zapier, and nobody can report on them. If you use HubSpot, its native Calendly integration can then log the booked meeting on the same contact.

## Optional refinements

- **Filter:** only send the text if a phone number came through, and only if the consent box was ticked.
- **Paths:** send a different Calendly event depending on a form answer, such as one link per service.
- **Business hours:** a text at 3 a.m. feels like spam. Use **Delay by Zapier → Delay Until** to hold texts until morning, and send the email immediately.
- **Team alert:** post each new lead to Slack so someone can follow up personally if they don't book within a day.

## Texting leads in the US: two rules

**Register your number.** US carriers require business texting from regular 10-digit numbers to be registered through A2P 10DLC, and they've blocked unregistered traffic since February 2025. Quo walks you through registering your business and your use case; do it before you switch the Zap on, or your texts won't arrive. ([Quo's A2P 10DLC guide](https://www.quo.com/blog/what-is-a2p-10dlc/))

**Get consent.** Under the TCPA, marketing texts need the recipient's documented consent. That's what the consent checkbox in step 1 is for. A booking link sent in reply to someone's inquiry is about as welcome as a text gets, but have the consent on record anyway, include an opt-out, and honor it. This isn't legal advice; if texting is a big part of your sales process, have your counsel review the wording.

## Testing it

1. Submit a lead with the Lead Ads Testing Tool, using your own phone number and email.
2. Check that the text arrives from your Quo number with a working link.
3. Check that the email arrives and lands in your main inbox.
4. Open the link and confirm your name and email are already filled in on the Calendly page.
5. Book a test time, then check the contact in your CRM.

## The whole flow

1. Someone submits your Facebook instant form.
2. Zapier picks up the new lead.
3. Formatter cleans the phone number and builds a personal Calendly link.
4. Quo texts the link and Gmail emails it.
5. The lead lands in your CRM, and the booking shows up when they schedule.

Sources: [Calendly: pre-fill invitee information](https://help.calendly.com/hc/en-us/articles/226766767-Pre-populate-invitee-information-on-the-scheduling-page), [Zapier: getting started with Quo](https://help.zapier.com/hc/en-us/articles/39931472609677-How-to-get-started-with-Quo-formerly-OpenPhone-on-Zapier), [Quo: A2P 10DLC registration](https://www.quo.com/blog/what-is-a2p-10dlc/), [Meta Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing/).
