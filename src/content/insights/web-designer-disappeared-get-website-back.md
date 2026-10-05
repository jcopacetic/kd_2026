---
title: "My Web Designer Disappeared: Get Your Website, Domain and Email Back"
seoTitle: "Web Designer Disappeared? Get Your Website and Domain Back"
description: "Web designer disappeared or the web company closed? The order to recover your domain, email, website and Google listing, and how to find who controls each."
pubDate: 2026-10-10T08:00:00-05:00
pillar: website
tags: ["Website Rescue","Domain Names","Business Email","Small Business","ICANN"]
---

If your web designer has disappeared or the web company closed, recover things in this order: the **domain** first, then **email**, then the **website and hosting**, then **Google Business Profile and other logins**. The domain comes first because your website and your email both depend on it. If it expires or stays in someone else's name, everything else goes down with it. Most of this is recoverable without the old designer, using public lookups and the registrar's own process.

If you're in Amarillo or Canyon and would rather hand this to someone, this is exactly what my [website rescue service](/amarillo/agency-closed/) does. The rest of this post is the order I work in, so you can do it yourself.

## What do you need to find out first?

You need to know who controls four things: the domain, the email, the website and its hosting, and your Google listing. Each can be with a different company, and each can be in a different person's name.

| Piece | What it is | Why it matters |
| --- | --- | --- |
| Domain | Your name on the internet (yourbusiness.com), rented yearly from a **registrar** | If it lapses, the site and email stop |
| DNS | The settings on the domain that say where the site and email live | Whoever controls it controls both |
| Email | The service that receives mail for @yourbusiness.com | Customers, invoices, password resets |
| Hosting and site | Where the website's files live, and the admin login | The site itself |
| Google Business Profile | Your listing on Google Search and Maps | Calls, directions, reviews |

## Step 1: Who controls your domain?

Look it up on [ICANN Lookup](https://lookup.icann.org/), the free tool from ICANN, the body that sets the rules for domain registrars. ICANN describes it as a tool to "look up the current registration data for domain names." Type in your domain, without the "www".

Write down three things from the result:

1. **Registrar.** The company the domain is registered through (for example GoDaddy, Squarespace, Namecheap, Network Solutions). This is who you'll deal with.
2. **Expiration date.** If it's within the next 60 days, this is now your most urgent job.
3. **Name servers.** These tell you which company runs the domain's DNS (often the registrar, sometimes the host, sometimes a service like Cloudflare).

Don't be surprised if the owner's name and email show as redacted. Registrars now hide most contact details for privacy, so the lookup tells you *where* the domain is, not always *whose* it is. (The older "WHOIS" system is being replaced by a newer one called RDAP, which ICANN Lookup uses. Since January 2025, registries and registrars no longer have to run WHOIS for most domain endings, so RDAP is the reliable place to look.)

**If the expiry date is close,** call the registrar today. Explain that the business's web provider has closed and ask what they need from you to renew it and move it into your name. Ask specifically whether you can pay the renewal yourself while the ownership question is sorted out. Their policy decides it, and only they can tell you. If it has already expired, see [what to do when your domain has expired](/insights/domain-expired-get-it-back/), because the timeline matters.

## Step 2: Where does your email live?

Your email provider is set by **MX records** in your domain's DNS. Look them up with Google's free [Dig tool](https://toolbox.googleapps.com/apps/dig/): enter your domain and choose **MX**.

- Results ending in `google.com` or `googlemail.com` mean Google Workspace.
- `outlook.com` or `protection.outlook.com` means Microsoft 365.
- Anything else is often the old web company's own mail server, or a host's.

If your email is in Google Workspace or Microsoft 365 and you have an admin login, you're in good shape: make sure the admin account is yours and the billing card is yours. If the email runs on the old company's server, **this is the riskiest piece**: when their server goes away, your inbox goes with it. Start forwarding or exporting important mail now, and plan to move to a provider in your own name once you control the domain.

## Step 3: Where is your website hosted, and can you get a copy?

Run the same Dig tool with **A** selected to get the address your website points to, then look that address up on ICANN Lookup (it handles IP addresses too). The result usually names the hosting company or data centre.

Then get a copy of the site while it's still online:

- **If anyone still has the website's admin login** (a staff member, a past contractor), use it now: export the content, download images and any backup the platform offers.
- **If you have no login but the site still loads,** a technical person can make a static copy of the public pages, and you can save your own text and photos page by page. Do this before the hosting bill goes unpaid.
- **If the site is already offline,** the [Internet Archive's Wayback Machine](https://web.archive.org/) may have saved copies of public pages. It's a last resort: you'll usually get text and some images, not a working site.

Contact the host too. Hosts handle closed resellers more often than you'd think, and they'll tell you what proof they need to release an account to the business whose site it is.

Sometimes rebuilding is the better option. If the old site was on a proprietary builder you can't export from, or it's years out of date, recover the content and the domain and build fresh. The domain is what carries your name; the site can be replaced.

## Step 4: Google Business Profile and everything else

Your Google listing is separate from the website. Sign in at [business.google.com](https://business.google.com/) with every Google account you've ever used for the business and see whether any has access. If none does, use Google's [request ownership](https://support.google.com/business/answer/4566671) process: Google emails the current owner, who has **3 days** to respond, and if they don't, you may be offered a way to claim and verify the profile yourself.

Then work through the rest: Google Analytics, Search Console, your Facebook page, any directory listings, and the payment on any recurring bill. My [10-minute ownership check](/insights/who-owns-your-website-ownership-check/) lists every account and what "owning" each one means.

## What if the domain is in the designer's name?

Go through the registrar. The registrar's rules come from ICANN, and the person or business listed as the registrant (ICANN's term is "Registered Name Holder") is who those rules protect. Registrars have their own processes for disputed or orphaned accounts, and they usually ask for proof that the business is yours.

What to gather before you call:

- Business formation or assumed-name (DBA) records showing your business name
- Invoices or bank statements showing you paid for the website or domain
- Any contract or emails with the web company about the site
- A photo ID that matches the business owner on those records
- Proof the domain has been in use by your business (your Google listing, printed materials)

Under ICANN's [Transfer Policy](https://www.icann.org/resources/pages/transfer-policy-2016-06-01-en), once you *are* the registrant, the registrar must give you the transfer code (the "AuthInfo" code) and unlock the domain within **five calendar days** of your request. Two catches: changing the registrant can trigger a **60-day lock** on moving to another registrar (registrars may let you opt out before the change), and a domain can't move registrars within 60 days of being registered or last transferred.

If the old designer is reachable but won't hand it over, that's a different situation; I cover it in [your web designer won't give you your domain](/insights/web-designer-wont-give-domain/). If a registrar won't follow its own obligations, ICANN accepts [complaints about transfers](https://www.icann.org/compliance/complaint) through its Contractual Compliance team.

This isn't legal advice. If there's a contract dispute or real money involved, talk to a business attorney, and use ICANN's [registrants' benefits and responsibilities](https://www.icann.org/resources/pages/benefits-2013-09-16-en) page as the plain-English summary of where you stand.

## How do you make sure this never happens again?

Put every account in the business's name, with a business email address you control, and keep the logins somewhere a second person can reach.

Once you're back in control:

1. **Domain:** registrant is your business, the account email is yours, auto-renew is on, and the card on file is current. Add a reminder a month before expiry anyway.
2. **Email:** an admin account you own at Google Workspace or Microsoft 365, plus a second admin (a partner, office manager or trusted contractor).
3. **Website and hosting:** you hold the main login; contractors get their own logins, not yours. Keep a recent backup somewhere outside the host.
4. **Google Business Profile:** you are the primary owner. Anyone who helps you is added as a manager.
5. **A one-page record** of every account, the login email, the renewal date and who to call. Store it in a password manager with a shared emergency contact.

## What to do this week

- [ ] Look up your domain on ICANN Lookup and note the registrar and expiry date
- [ ] If expiry is under 60 days away, call the registrar today
- [ ] Look up your MX records and confirm where your email lives
- [ ] Save a copy of your website's text and photos while it's still online
- [ ] Sign in to business.google.com and check who controls your listing
- [ ] Gather your proof-of-business documents in one folder

If you're in Amarillo or Canyon, I do this in person, from the first lookup to every login back in your name: [website rescue](/amarillo/agency-closed/).

*Checked against ICANN's Transfer Policy, ICANN Lookup, ICANN's RDAP and registrant pages, and Google Business Profile Help in October 2026.*

Sources: [ICANN Transfer Policy](https://www.icann.org/resources/pages/transfer-policy-2016-06-01-en), [ICANN Lookup](https://lookup.icann.org/), [ICANN: Registration Data Access Protocol (RDAP)](https://www.icann.org/rdap), [ICANN: Registrants' Benefits and Responsibilities](https://www.icann.org/resources/pages/benefits-2013-09-16-en), [ICANN Contractual Compliance: Submit a complaint](https://www.icann.org/compliance/complaint), [Google: Request ownership of a Business Profile](https://support.google.com/business/answer/4566671), [Google Admin Toolbox: Dig](https://toolbox.googleapps.com/apps/dig/), [Internet Archive Wayback Machine](https://web.archive.org/).
