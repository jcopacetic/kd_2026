---
title: "Brand Style Guide Colors: Primary, Secondary, Neutrals and How to Use Them"
seoTitle: "Brand Style Guide Colors: Roles, Contrast and Tokens"
description: "What each brand color is for, from primary to neutrals, the contrast rules that decide what can be text, and a worked example."
pubDate: 2025-04-01
updatedDate: 2026-10-04
pillar: website
tags: ["Brand","Style Guides","Color","Accessibility","Design Tokens"]
legacyUrl: "/insights/decoding-the-importance-of-colors-in-your-brand-style-guide/"
gsc12mo: "1 click / 382 impr / pos 20.7"
---

A brand style guide's colors work best as a small set of **roles**: one primary color people recognize you by, one or two secondary or accent colors, a dark and a light for text and backgrounds, and a scale of grays for everything in between. Give each role a job, check every text-and-background pair against accessibility contrast rules, and write the palette down as named values your website and documents can use directly.

Below: what each role does, how many colors you actually need, the contrast numbers that decide what can be text, and how I applied all of it to my own brand.

## The color roles

| Role | Its job | Typical use |
| --- | --- | --- |
| **Primary** | The color people recognize you by | Logo, main buttons, key highlights |
| **Secondary** | Supports the primary and adds range | Section backgrounds, illustrations, secondary buttons |
| **Tertiary / accent** | Small, deliberate emphasis | Badges, alerts, charts, a single highlighted word |
| **Quaternary** | Optional extra for specific needs | Data visualization, product lines, campaigns |
| **Dark** | Weight and legibility | Headings, body text, dark sections, footers |
| **Light** | Space and contrast | Page backgrounds, text on dark sections |
| **Gray (neutral scale)** | Structure without competing | Borders, dividers, muted text, disabled states, card backgrounds |
| **Background** | The surface everything sits on | Page and section backgrounds, usually light or dark |
| **Body (text)** | Readable running text | Paragraphs, form labels, captions |

Background and body color usually come from your dark, light and gray roles rather than being extra colors. Naming them separately is still worth it, because it records the decision. "Body text is our near-black, not pure black" is the kind of rule that otherwise gets lost.

## How many colors you need

Fewer than most guides list. A primary, one secondary or accent, a dark, a light and a gray scale cover almost every website and document. Tertiary and quaternary colors earn a place when you have a specific job for them, like separate product lines or charts that need several distinct series. Without a job, they turn into decoration and weaken the primary.

A useful proportion to start from is the 60-30-10 rule: about 60% neutral (backgrounds), 30% your dark and supporting colors, 10% the primary or accent. When the brand color appears only where it means something, people notice it.

## Contrast decides what can be text

A color that looks right can still be unreadable. The Web Content Accessibility Guidelines (WCAG 2.2, level AA) set minimum contrast ratios between text and its background:

- **Normal text:** at least **4.5:1**
- **Large text** (about 24px regular, or 18.5px bold, and up): at least **3:1**
- **Buttons, form borders, icons and focus outlines:** at least **3:1** against what's next to them

Check every pair your guide allows, in both directions if you have dark sections. Bright brand colors often fail as text on white even though they look great as fills. That doesn't rule them out; it means the guide should say "fill only" and provide a darker version for text.

## A worked example: my own brand

When I rebuilt the Khaotic Digital brand, I used a near-black, an off-white and one green signal color. These are the measured contrast ratios that set the rules:

| Color pair | Ratio | Rule it led to |
| --- | --- | --- |
| Ink `#0a0a0a` on white | 19.80:1 | Default text color |
| Gray `#636765` on white | 5.74:1 | Muted text on light backgrounds |
| Signal mint `#2ee59d` on white | **1.64:1** | Never text on light; fills and accents only |
| Deep mint `#006c46` on white | 6.49:1 | A darker version of the brand green for links and accent text |
| Ink on a Signal mint button | 12.08:1 | Button text is always ink, never white |
| Signal mint on Ink | 12.08:1 | On dark sections, the bright green can be text |
| Off-white `#f5f5f4` on Ink | 18.15:1 | Default text on dark sections |
| Gray `#a1a6a4` on Ink | 8.02:1 | Muted text on dark sections |

The brand color fails badly as text on white at 1.64:1, so the guide splits it into two roles: the bright version for fills, buttons and highlights, and a deep version that passes for text. On dark backgrounds the bright version works as text. Writing these as rules means nobody has to remember the numbers.

## Turn the palette into tokens

A style guide that only lives in a PDF gets drifted from. Write the colors as named values your website uses directly. In CSS, that means custom properties:

```css
:root {
  /* Primitives: the actual colors */
  --brand-ink: #0a0a0a;
  --brand-paper: #f5f5f4;
  --brand-mint: #2ee59d;       /* fills only on light backgrounds */
  --brand-mint-deep: #006c46;  /* text-safe on light */
  --gray-600: #636765;

  /* Roles: what components use */
  --color-bg: #ffffff;
  --color-text: var(--brand-ink);
  --color-text-muted: var(--gray-600);
  --color-link: var(--brand-mint-deep);
  --color-primary: var(--brand-mint);
  --color-on-primary: var(--brand-ink);
}
```

Components use the role names (`--color-link`), never the hex values. Then a dark mode, or a future brand refresh, means changing the roles in one place.

If your site runs on HubSpot, map the same roles to your theme's color settings. Most themes expose primary, secondary and text colors there, and filling them from the guide keeps editors from picking colors by eye. Add the palette to HubSpot's brand settings too, so emails and other tools use the same values.

## What to put in the guide

For each color, record:

- **Name and role**, such as "Signal mint, primary"
- **Values:** HEX for the web, RGB, CMYK for print, and a Pantone match if you print spot colors
- **Where to use it, and where not to**, such as "fills only on light backgrounds"
- **Approved pairings** with their contrast ratios
- **Proportion**, for example "mint covers no more than about a tenth of any layout"

Add one or two examples of correct and incorrect use. People follow examples more readily than rules.

Sources: [W3C: Understanding contrast (minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C: Understanding non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
