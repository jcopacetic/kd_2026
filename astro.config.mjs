// @ts-check
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import legacyRedirects from './integrations/legacy-redirects.mjs';
import { readdirSync, readFileSync } from 'node:fs';

// lastmod for posts in the sitemap, from each post's updatedDate (or pubDate). Other pages get
// no lastmod rather than a misleading build date.
const postDates = Object.fromEntries(
  readdirSync('./src/content/insights')
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const fm = readFileSync(`./src/content/insights/${f}`, 'utf8').split('---')[1] ?? '';
      const date = (fm.match(/^updatedDate:\s*(\S+)/m) ?? fm.match(/^pubDate:\s*(\S+)/m))?.[1];
      return [`https://khaoticdigital.com/insights/${f.replace(/\.md$/, '')}/`, date];
    }),
);

/** @param {string} destination */
const r = (destination) => ({ status: /** @type {301} */ (301), destination });

export default defineConfig({
  site: 'https://khaoticdigital.com',
  trailingSlash: 'always',
  // Inline the (small) stylesheet into each page: removes a render-blocking request.
  build: { format: 'directory', inlineStylesheets: 'always' },
  // Pages are static; only src/pages/api/* opts out (prerender = false) and runs as a function.
  adapter: vercel(),
  integrations: [
    legacyRedirects(),
    mdx(),
    sitemap({
      filter: (page) => !/\/(contact\/thanks|404)\/?$/.test(page),
      serialize: (item) => {
        const date = postDates[item.url];
        return date ? { ...item, lastmod: new Date(date).toISOString() } : item;
      },
    }),
  ],
  // Server secrets for the contact form. `access: 'secret'` means they're read from the
  // environment at request time and never compiled into the bundle (import.meta.env would be).
  env: {
    schema: {
      GMAIL_USER: envField.string({ context: 'server', access: 'secret', optional: true }),
      GMAIL_APP_PASSWORD: envField.string({ context: 'server', access: 'secret', optional: true }),
      FORM_NOTIFY_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Public (it's in the page HTML anyway). Read at build time, so redeploy after changing it.
      TURNSTILE_SITE_KEY: envField.string({ context: 'server', access: 'public', optional: true }),
    },
  },
  // Content-Security-Policy. Astro hashes every script and stylesheet it renders and emits a
  // <meta http-equiv> CSP per page, so no 'unsafe-inline' for scripts. Third parties allowed:
  // GA4 (loaded only after consent) and Cloudflare Turnstile (only if a site key is set).
  // If you turn HubSpot tracking back on (site.hubspotPortalId), add its hosts here too.
  // frame-ancestors can't be set from a <meta> tag; it's sent as a header in vercel.json.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com",
        "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
        "font-src 'self'",
        'frame-src https://challenges.cloudflare.com',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        'upgrade-insecure-requests',
      ],
      scriptDirective: { resources: ["'self'", 'https://www.googletagmanager.com', 'https://challenges.cloudflare.com'] },
      // style="" attributes in templates are harmless; allow them without opening up <style> elements.
      styleDirective: { resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
  markdown: {
    // High-contrast variants: the default GitHub themes fail WCAG AA contrast on some tokens.
    shikiConfig: { themes: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' } },
  },
  // 301 map — site-content/04 + 07, checked against the Site Planner inventory.
  // www → apex is a Vercel domain setting (and a host rule in vercel.json), not a route.
  redirects: {
    '/frequently-asked-questions/': r('/faq/'),
    '/get-in-touch/': r('/contact/'),
    '/services/web-development/': r('/services/build/'),
    '/services/apps-integrations/': r('/services/build/'),
    '/services/marketing-consulting/': r('/services/revops/'),
    '/services/sales-operations/': r('/services/revops/'),
    '/services/content-strategy/': r('/insights/content-strategy-and-development/'),
    '/services/consulting/': r('/audit/'),
    '/resources/': r('/insights/'),
    '/resources/[slug]': r('/insights/[slug]'),
    // /kd-insights/* is handled by src/pages/kd-insights/[...rest].ts (prefix matching).
    // /seamless-integration-* (legacy, truncated in the audit) → /services/build/ is a prefix rule in vercel.json.
    '/profile/u/jcopacetic/': r('/about/'),
    '/search/contractors/': r('/'),
  },
});
