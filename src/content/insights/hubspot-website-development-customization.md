---
title: "HubSpot Themes, Templates and Modules: When to Build Custom and When to Buy a Theme"
seoTitle: "HubSpot Themes: Build Custom or Buy a Marketplace Theme?"
description: "How HubSpot themes, templates and modules fit together, how to judge theme quality, and why a marketplace theme usually beats custom."
pubDate: 2025-04-01
updatedDate: 2026-10-04
pillar: build
tags: ["HubSpot CMS","Themes","Templates","Modules","Website Development"]
legacyUrl: "/resources/hubspot-website-development-customization/"
gsc12mo: "0 clicks / 52 impr / pos 37.3"
kind: guide
---

For most HubSpot websites, a well-built marketplace theme plus a few custom modules beats a fully custom theme. It costs a fraction as much, it's ready in hours instead of weeks, and good themes give editors more control than most custom builds do. A custom theme earns its cost when a design genuinely doesn't fit any theme, or when a single page needs to do something unusual.

I've built hundreds of HubSpot templates and many custom themes, and I still recommend marketplace themes to most clients, even though it costs me billable hours. This guide explains how HubSpot's themes, templates and modules fit together, how to judge a theme's quality, what a custom build involves, and how to set up a marketplace theme properly.

## How HubSpot themes work

Every HubSpot page is built on a template. After naming a new page, the next step is choosing one.

### Legacy templates and modern themes

HubSpot's earlier design system used standalone **templates**, usually built with the drag-and-drop template builder in the Design Manager. Templates could share folders and assets, but nothing tied them together or enforced consistent styles.

The current system is built around **themes**: coded templates, modules and assets packaged together with global settings. That brought:

- **Global settings.** A `fields.json` file defines theme-wide options, like colors, fonts and spacing, that editors can change in one place.
- **Consistency.** Templates belong to a theme, so you don't mix up templates from unrelated projects.
- **Scale.** Developers can build a real design system inside HubSpot.

The cost is more complexity for developers, who need to understand the file structure, HubL (HubSpot's template language), HTML, CSS and JavaScript.

### What's in a theme

- **`theme.json`** describes the theme to HubSpot.
- **`fields.json`** defines the global settings editors see.
- **Templates and modules**, as coded files.
- **Assets:** CSS, JavaScript, fonts and images.

**Templates** combine HTML and HubL, with optional CSS and JavaScript and some metadata at the top of the file. Most extend a base layout, usually `templates/layouts/base.html`, which defines shared regions like `{% block header %}` and `{% block footer %}`. Page templates extend it and fill in `{% block content %}`. Layout files like `base.html` can't be chosen for new pages; they're scaffolding.

**Partials** are reusable fragments, such as `header.html` and `footer.html`, included into those blocks.

**Modules** are the heart of the editing experience. Each one has editable fields (configured in the Design Manager or in code) and its own HTML with HubL, CSS and JavaScript. HubL only works in the HTML part, but you can load CSS and JavaScript conditionally from there with `require_css` and `require_js`. Modules can repeat, include style controls, and attach their own asset files.

Keep modules focused. A good module is either minimal, leaning on the theme's global styles, or tightly scoped and styled for one job. Its editable fields are what give marketers flexibility in the page editor.

## Four levels of template quality

If you're having a theme built, or evaluating one, this is the scale I use:

1. **Hard-coded templates.** You can build a HubSpot site from almost plain HTML, CSS and JavaScript. The only required HubL is `{{ standard_header_includes }}` in the `<head>` and `{{ standard_footer_includes }}` before `</body>`. But every page's content is fixed in code, so every change needs a developer. It defeats the point of a CMS.
2. **Default modules injected into templates.** HubSpot's standard text, rich text, image and heading modules replace the static content, so editors can change words and images. They still can't change the layout.
3. **Flexible columns.** An older approach where whole sections act as containers: editors can add, remove and reorder modules inside them. You'll still meet these in older themes, but they've been superseded.
4. **Drag-and-drop templates.** The current standard. Templates define a layout grid, and editors add and arrange sections, columns and modules within it.

Any quality theme today should use drag-and-drop areas for website pages, landing pages and blog templates. If someone offers you hard-coded or injected templates, politely decline.

Modules for drag-and-drop should be built for cells, not full rows. I usually add container and spacing controls, though sections and columns can handle some of that. A module that works both full-width and inside a narrow column needs responsive thinking; adding breakpoint controls to the module's settings is one effective way to handle it.

## Building a custom theme

### Start from the boilerplate

HubSpot's **CMS boilerplate** is a starter theme with the standard wrappers, starter modules, templates and a solid set of theme settings. It's a good base. I usually extend it, for example with mobile type sizes.

The **HubSpot CLI** (installed with npm) lets you upload, fetch and watch files locally, and generate templates, modules and serverless functions. You can define module fields in JSON by hand, but I find it faster to create them in the Design Manager, which writes the JSON for you, and switch between local and in-HubSpot work as it suits the task.

### How I put one together

- Start from the boilerplate.
- Use drag-and-drop templates throughout.
- Build modular, cell-friendly modules.
- Create section templates (partials with drag-and-drop layouts) and use them in templates to stage default content.
- Use **global modules** for headers, footers and site-wide elements like a blog subscribe block. Decide whether a module is global when you create it. Their content is edited in the global content editor and changes everywhere at once. Still give them editable fields, such as a menu field for navigation or a form field for the subscribe form.

### Balance flexibility against cost

A custom theme usually starts from one specific design, so it doesn't need every option a marketplace theme offers. It does need to let editors build and update pages on their own. Build too little and every small change becomes a development ticket. Build too much and you pay for flexibility nobody uses. Does your theme need a setting to change the site's background color if the design fixes it? Maybe, maybe not. Good theme development is that balance between performance, flexibility and the editing experience.

### Time

A custom theme typically takes **10 to 60 hours** to build, depending on how many templates and modules it needs. I recommend going custom mainly when:

- a client needs a single, highly customized landing page, or
- a client brings an elaborate design that no existing theme can match.

I build custom themes regularly, including several of my own that are live on the web, but only when it makes strategic sense.

## Why a marketplace theme usually wins

*I'm not affiliated with the theme developers mentioned here and don't get paid for recommending them.*

Compare the numbers. A custom site with seven templates might take **40 hours** of development, before project management and revisions. Even then, it often lacks the polish and settings of a top marketplace theme.

A premium marketplace theme is a one-time purchase for a single HubSpot account, typically in the hundreds of dollars up to around a thousand. It comes with:

- extensive theme settings
- flexible, reusable modules
- ready-made templates
- responsive design
- optimized code and performance
- ongoing updates and support
- documentation, and often a Figma file for planning pages

An experienced developer can set one up (creating the child theme, configuring settings and training your team to build pages) in **one to three hours**, against 40 or more for a custom build. If the theme lacks something, like a quote calculator, a timeline or a testimonial slider, a developer can usually add that module in one to four hours. A testimonial slider might take 45 minutes; an advanced three-level mega menu closer to ten hours.

### Common objections

**"Themes are bulky and slow."** Sometimes true, especially of free themes, which can be poorly built and unsupported. The best paid themes are optimized for speed and accessibility. Look for ones that are lightweight, actively maintained, well documented, and customizable through settings or an override stylesheet.

**"Themes aren't customizable."** Most are very flexible within the system they were designed for. Design your pages in the theme's own Figma file and you can build them without workarounds. The usual sticking point is matching a header and footer from a main site on another platform. In that case, replace the theme's header and footer with your own global modules, scope their styles with unique class names so they don't clash with the theme, and avoid themes that style common elements too broadly.

**"Themes don't look unique."** Used straight out of the box, a site can look like others on the same theme. But theme settings allow a lot of variation in color, type and spacing, and an override stylesheet covers the rest, like line heights and layout tweaks.

**"Themes are expensive."** Not compared to custom development. A theme plus a few hours of setup costs a fraction of building the same quality from scratch, and takes hours instead of six to eight weeks.

## Themes I recommend

These consistently score well in performance tests, have thorough component catalogs, and are favorites with my clients for ease of use. Check each listing for current pricing.

| Theme | Developer | Why I like it | Links |
| --- | --- | --- | --- |
| **Power** | Maka Agency | My personal favorite. Focused, intuitive settings with enough control for a completely branded site. A lighter starter version is available. | [Marketplace](https://ecosystem.hubspot.com/marketplace/website/power-theme-by-maka-agency) · [Starter](https://ecosystem.hubspot.com/marketplace/website/power-starter-theme-by-maka-agency) · [Components](https://www.maka-agency.com/power-theme) |
| **Clean Pro** | Helpful Hero | A client favorite, helped by excellent onboarding videos and guides. The settings can feel like a lot at first, but they unlock a great deal of design control. A lite version is available. | [Marketplace](https://ecosystem.hubspot.com/marketplace/website/clean-theme-by-helpful-hero) · [Lite](https://ecosystem.hubspot.com/marketplace/website/clean-lite-theme-by-helpful-hero) · [Components](https://www.clean.pro) |
| **Act3** | Neambo | Neambo has made HubSpot themes for years; I used one of their older themes before drag-and-drop existed. Act3 is modern, affordable and feature-rich. | [Marketplace](https://ecosystem.hubspot.com/marketplace/website/act3-theme-by-neambo) · [Docs](https://neambo.com/support/act3) |

Every marketplace listing has a "What's included" section. Compare a few, choose one that covers what you need now, and note what you'd have to add with custom modules.

## Setting up a marketplace theme

After you buy a theme, it appears in the Design Manager under the `@marketplace` folder, in a subfolder named for the developer.

1. **Create a child theme.** Right-click the theme and create a child theme. You can't edit a marketplace theme's own files, and building directly on the parent causes problems later. Always work in a child.
2. **Make every change in the child.** Apply settings and build pages from the child theme's templates, so your changes stick and you can still receive the parent's updates.
3. **Use more than one child if it helps.** Separate children can test a new design or run several sites with different styles in the same HubSpot account. Each has its own settings and global content.
4. **Swap templates freely.** With drag-and-drop themes, you can change a page's template and its modules and content come along, which makes trying different layouts quick.

Used well, a marketplace theme delivers most of what a high-end custom build would, without the timeline or the cost. Spend the development budget on the few custom modules that make your site yours.
