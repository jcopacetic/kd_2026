# khaoticdigital.com — Astro site

Built from `../site-content/` (the spec) and `../brand/` (the identity). Static Astro 7 +
MDX on Vercel; the only server code is the contact endpoint and the legacy `/kd-insights/*`
redirect.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # → .vercel/output (static pages + 2 functions)
npm run check      # types
npm run check:seo  # after a build: JSON-LD graph, OG/Twitter tags, title/description lengths
npm run migrate    # pull legacy posts that don't exist yet; --force overwrites (would undo rewrites)
```
Requires Node 22.12+.

## Where things live
| What | Where |
|---|---|
| Prices, proof figures, links, GA/HubSpot IDs, reply-time promise | `src/data/site.ts` (single source) |
| Brand tokens (copied from `brand/tokens/tokens.css`) | `src/styles/tokens.css` |
| Site styles | `src/styles/global.css` |
| Blog posts + guides (migrated, Markdown) | `src/content/insights/` |
| Case studies (drafts from the Upwork bank) | `src/content/work/` — set `draft: false` to publish a page |
| 301 map | `astro.config.mjs` → `redirects`, plus `src/pages/kd-insights/[...rest].ts` |
| Post-build redirect fix | `integrations/legacy-redirects.mjs` (see comment inside) |
| Contact/audit form endpoint | `src/pages/api/contact.ts` → spam checks → email via Google Workspace (Gmail SMTP) |
| robots.txt policy | `src/pages/robots.txt.ts`: allow search + AI search/user fetches; block AI training, SEO-tool crawlers, scrapers |
| Sitemap | `@astrojs/sitemap` in `astro.config.mjs` (posts get lastmod from frontmatter) |
| JSON-LD | `src/lib/schema.ts` (one connected @graph per page, assembled in `BaseLayout`) |
| Share images (1200×630, generated at build) | `src/lib/og.ts` (design) · `src/data/og.ts` (card text per page — add new pages here) · output at `/og/…png`; posts get theirs automatically and show it as the post cover |

## Before launch
**Needs Jonathan**
- [ ] **Forms → email.** In Vercel, set `GMAIL_USER` (e.g. you@yourdomain.com) and
      `GMAIL_APP_PASSWORD` (Google Account → Security → 2-Step Verification → App passwords;
      if the option is missing, App passwords may be disabled in the Workspace admin console).
      Optional: `FORM_NOTIFY_TO` to send notifications elsewhere. Until set, forms reply
      "isn't connected yet". Submit one test from each form (audit, website audit, contact).
- [ ] Recommended: Cloudflare Turnstile keys (`turnstileSiteKey` in `site.ts`,
      `TURNSTILE_SECRET_KEY` in Vercel). Honeypot, timing, link-count and origin checks are
      already in place; dropped submissions are logged in Vercel as `contact: dropped as spam`.
- [ ] Parked: store a copy of each submission (Supabase table, decided 2026-10-04 to wait).
      The email is currently the only record.
- [ ] Confirm in `site.ts`: GitHub handle, reply-time promise, `$150/hr` hourly floor; add
      the Calendly link if you want a "book a fit call" button.
- [ ] Headshot (About page + `Person` schema image).
- [ ] Write up 4–6 case studies (`src/content/work/*.md`): permission to name, problem →
      what I built → outcome; flip `draft: false`.
- [ ] Review the provisional icons `src/assets/icons/ai-crm.svg` and `audit.svg` (drawn to
      the brand icon rules; not from the brand files).
- [ ] Review the draft privacy notice and the rewritten FAQ answers (pricing changed from
      the old $85/hr model).
- [ ] Pick the lead magnet (`site-content/01` funnel) — no capture block is built yet.

**Content**
- [x] Rewrite the Places autocomplete post for HubSpot's new form editor (done 2026-10-04).
- [ ] Test that post's final code snippet on a portal (updated-editor form, standard embed), then remove the TODO comment at its top.
- [x] Rewrite the address verification post (Address Validation API + workflow custom code; done 2026-10-04).
- [ ] Test its custom code action on three test addresses (see the TODO comment at its top), then remove the comment.
- [x] Rewrite the Cookiecutter Django deploy post (done 2026-10-04).
- [ ] Walk through it once on a fresh droplet (see its TODO comment), then remove the comment.
- [x] Rewrite "Aligning Buyer Personas…" (tables rebuilt as HTML, full-size diagram, unsourced stats removed; done 2026-10-04).
- [ ] Pull the full legacy URL for `/seamless-integration-…` from Search Console and add a rule.
- [x] Content strategy guide: kept, updated for AI search and rewritten as a how-to (done 2026-10-04).
- [x] "Building Buyer-Centric Marketing Campaigns": refocused on campaigns, current diagram, HubSpot campaigns tool facts checked (done 2026-10-04).
- [x] Facebook lead ads post: Quo rename, real templates, pre-filled Calendly links, A2P 10DLC/TCPA section (done 2026-10-04).
- [ ] Run one test lead through the Zap it describes (see its TODO comment), then remove the comment.
- [x] Remaining posts rewritten (pipelines guide, Django & Docker, brand colors, online presence, HubSpot themes, image optimization; done 2026-10-04). All 13 migrated posts now updated.
- [ ] Test the Django & Docker guide's commands on a fresh project (see its TODO comment).
- [ ] Optional: re-run the image-format comparison with your own image and add it to the image optimization post (the old Mario still was removed as copyrighted material).

**Deploy**
- [ ] Vercel project → root directory `site/`; add `khaoticdigital.com` + `www` (www → apex).
- [ ] On the first preview deploy, confirm `vercel.json` headers apply and spot-check
      redirects: `/get-in-touch/`, `/frequently-asked-questions/`, `/resources/<slug>/`,
      `/kd-insights/<anything>`.
- [ ] Search Console: verify, submit `/sitemap-index.xml`; add Bing Webmaster.
- [ ] Optional hard block: robots.txt is only a request. In Vercel → Firewall, add a custom rule
      "User-Agent contains any of" the BLOCK list in `src/pages/robots.txt.ts` → Deny. Don't
      enable a blanket "AI bots" managed rule; it would also block the AI search bots we allow.
- [ ] GA4: create the AI-referrer channel group (`site-content/04`); mark `audit_booked`
      and `contact_submitted` as key events.
- [ ] Vercel → Firewall: add a rate limit on `/api/contact/` (e.g. 5 requests / 10 min per IP →
      Deny). Serverless functions can't hold a reliable counter themselves.
- [ ] After a few weeks on HTTPS with no problems: add `; preload` to the HSTS header in
      `vercel.json` and submit at hstspreload.org (hard to undo, so not on day one).
- [ ] Prune dead subdomains (`shop.`, `services.`, `tonic.`, `connect.`, `cdn-0.`).

## Notes
- Consent: GA4 loads only after "Allow". HubSpot tracking is off (`hubspotPortalId: ''` in
  `site.ts`); turning it back on also adds it to the consent banner text.
- `npm audit` (2026-10-04): `path-to-regexp` (ReDoS) comes in via `@vercel/routing-utils`,
  which the adapter imports into the function but never feeds request input, and `fflate`
  via `satori`, which only runs at build time on our own fonts. The suggested `--force` fixes
  downgrade the adapter/satori by major versions; don't. Recheck when the adapter updates.
- Security headers: Astro emits a hashed `<meta>` CSP per page (`security.csp` in
  `astro.config.mjs`); HSTS, `frame-ancestors` and the rest are in `vercel.json`. A new
  third-party script needs its host added to `scriptDirective.resources` or it won't run.
  Don't use `define:vars` on scripts: Astro can't hash them, so the CSP blocks them.
- `/_image` is deliberately removed from the function routes (see
  `integrations/legacy-redirects.mjs`); all images are optimised at build time.
