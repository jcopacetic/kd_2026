---
title: "Your Domain Expired: The Timeline, and How to Get It (and Your Email) Back"
seoTitle: "Domain Expired? The Timeline and How to Get It Back"
description: "My domain expired, how do I get it back? The stages after expiry (grace, redemption, deletion), what to do at each, and why your email stopped working."
pubDate: 2026-10-11T14:00:00-05:00
pillar: website
tags: ["Domains","Business Email","ICANN","Small Business"]
---

If your domain just expired, you can almost always still get it back: renew it at the registrar where it's registered, today. For .com, .net, .org and other generic domains, ICANN's rules give the registrant a window to renew after expiry, then a 30-day redemption period after the registrar deletes it, where a restore fee may apply. Once both have passed, the domain is released and anyone can register it.

Your website and email stopped because the registrar switched off the domain's DNS, the settings that point it at your site and mail server. Renewing turns them back on. If you can't get into the registrar account because a former designer or agency set it up, my [website rescue page](/amarillo/agency-closed/) covers what I do in that case.

## Why did my email stop working?

Because email depends on the domain's DNS. ICANN's Expired Registration Recovery Policy (ERRP) requires the registrar to interrupt DNS before it deletes the domain: from the moment it expires if the registrar deletes it within eight days, otherwise for at least the last eight days you can still renew. Once that happens, the records that tell other mail servers where to deliver your mail (MX records) stop answering. Mail to you@yourbusiness.com stops arriving, and the website shows an "expired" page or nothing.

ICANN says this disruption "is intended to be a last mechanism to inform you that your domain name has expired." It hits harder when the renewal reminders went to an address on the same domain. Once DNS is off, those reminders can't reach you either, which is why ICANN recommends a secondary email "that is not associated with the domain name itself."

When you renew, the registrar must restore your DNS "immediately or as soon as is commercially reasonable." It can take a few hours for every network to see the change.

## What happens after a domain expires? The timeline

There are five stages, and the early ones are where registrars vary most. ICANN sets minimums, but how many days you get at each stage and what it costs are set by your registrar's terms.

| Stage | What's happening | Site and email | What you can do |
| --- | --- | --- | --- |
| **1. Before expiry** | The registrar must send at least two reminders: about a month and about a week before. | Working | Renew. Check the date and who gets the reminders. |
| **2. Just expired** | The registrar must send at least one more notice within five days after expiry. It may offer an auto-renew grace period; ICANN describes it as "a 1-45-day period", and some registrars delete sooner. | Switched off at some point in this stage, at the latest eight days before deletion | Renew at your registrar now, usually at the normal or a late-renewal price. You can also transfer it out, unless you owe for a previous period. |
| **3. Redemption (30 days)** | The registrar has deleted it. Generic registries must hold it for 30 days so the registrant can restore it. | Off | Ask the registrar that deleted it to restore it. A restore fee may apply. It can't be transferred until restored. |
| **4. Pending delete** | ICANN describes a 5-day pending-delete status after redemption ends. | Off | Nothing can be restored. Watch the name. |
| **5. Released** | It's available "on a first-come-first-served basis". | Off, or someone else's | Register it if it's free. If someone else got it, see below. |

Two warnings about stage 2. First, ICANN notes that during the auto-renew period the domain "may be available to third parties" and could be auctioned by your registrar, depending on its terms of service. Second, ICANN's rules let registrars "delete registrations at any time after they expire", so don't plan around the longest grace period you've heard of. Read your own registrar's terms, or just renew today.

Registrars must publish their renewal, late-renewal and restore fees on their website, so you can check the price before you pay.

## How do I get my domain back at each stage?

Find the registrar, prove you're the registrant, and pay. The details depend on the stage.

1. **Find the registrar and status.** Search the domain at [ICANN Lookup](https://lookup.icann.org/). The "Registrar" field names the company, and the status field shows if it's in redemption (`redemptionPeriod`) or pending delete (`pendingDelete`).
2. **Log in and renew.** If the domain is in your own account, renew it, then confirm the website and email come back within a few hours.
3. **If you can't log in,** use the registrar's account recovery. If the account belongs to a former designer or agency, contact them and the registrar the same day. Time matters more here than at any other point. The policy gives renewal rights to the registrant at expiration, so if the designer registered the domain in their own name, you need their cooperation. Read [what to do when your web designer won't give you your domain](/insights/web-designer-wont-give-domain/).
4. **In redemption,** ask the registrar to restore it. Only the registrar that deleted it can, and a restore fee may apply on top of the renewal.
5. **If the registrar won't renew or restore it,** and you're within the windows above, ICANN accepts Renewal/Redemption complaints through [Contractual Compliance](https://www.icann.org/compliance/complaint). ICANN also takes complaints about missing reminders. It can enforce the registrar's obligations, but it "does not have the ability or authority to transfer or return a domain name to anyone."
6. **If someone else registered it,** ICANN's [lost domain names page](https://www.icann.org/resources/pages/lost-domain-names) lists the options: make an offer to the new holder, wait to see if they let it expire, go to court if it was obtained unlawfully, or, only where a trademark is involved, use the UDRP. This is not legal advice; talk to a lawyer before you act on any of it.

## What about .us and other country-code domains?

They follow their own registry's rules, not ICANN's. ICANN says it "has no contractual authority to address complaints involving country code top-level domains (ccTLDs), such as .us." Grace and redemption periods for .us, .co.uk and others may differ, so check your registrar's terms or the registry's own policy. The [IANA root zone database](https://www.iana.org/domains/root/db) lists who runs each one.

## How do I stop this happening again?

The usual weak points are a lapsed card and reminders going to an inbox nobody reads. Fix both.

- **Turn on auto-renew, and keep the card current.** ICANN's guidance: if you use auto-renew, "be sure to keep payment information up-to-date."
- **Use a registrant email you control that isn't on the same domain.** A Gmail or Outlook address you check, or a second domain. Then reminders still reach you if DNS goes off.
- **Renew for several years.** Registrations can usually run for one to ten years. A three- or five-year renewal means fewer chances to miss one.
- **Put the domain in your business's name, in your own account.** If a designer manages it, give them access, not ownership. My [website ownership check](/insights/who-owns-your-website-ownership-check/) walks through this.
- **Add the renewal date to your calendar,** a month ahead.
- **Save the registrar's sending address as a safe sender** so its reminders don't land in spam. ICANN recommends this too.

## What to do today if your domain has expired

- [ ] Look up the domain at ICANN Lookup: registrar, expiry date, status.
- [ ] Log in to the registrar and renew, or start account recovery.
- [ ] If a former designer holds the account, contact them and the registrar today. If they've gone quiet, follow [getting your website back when the designer disappears](/insights/web-designer-disappeared-get-website-back/).
- [ ] Once it's renewed, send a test email to your business address from an outside account.
- [ ] Turn on auto-renew, change the registrant email to one off the domain, and consider a multi-year renewal.

If you're in Amarillo or Canyon and want help getting the domain, website and email back, I do it in person: [website rescue](/amarillo/agency-closed/).

*Checked against ICANN's Expired Registration Recovery Policy, its ERRP registrant guide, Domain Name Renewals and Expiration FAQs, and Contractual Compliance complaint page in October 2026.*

Sources: [ICANN: Expired Registration Recovery Policy](https://www.icann.org/resources/pages/errp-2013-02-28-en), [ICANN: 5 Things Every Registrant Should Know About the ERRP](https://www.icann.org/resources/pages/registrant-about-errp-2018-12-07-en), [ICANN: FAQs for Registrants: Domain Name Renewals and Expiration](https://www.icann.org/resources/pages/domain-name-renewal-expiration-faqs-2018-12-07-en), [ICANN: Submitting a Complaint to ICANN Contractual Compliance](https://www.icann.org/compliance/complaint), [ICANN: About Lost Domain Names](https://www.icann.org/resources/pages/lost-domain-names), [ICANN Lookup](https://lookup.icann.org/), [IANA: Root Zone Database](https://www.iana.org/domains/root/db)
