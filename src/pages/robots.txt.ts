// robots.txt — decided 2026-10-04:
//   allow  search engines, AI search/answer bots, AI user-triggered fetches (so AI can read and cite)
//   block  AI model-training crawlers, SEO-tool crawlers and data scrapers
// robots.txt is a request, not enforcement: well-behaved bots follow it, bad actors don't.
// For hard blocking, add a Vercel Firewall custom rule on the user agents in BLOCK (see README).
// A bot named in a group follows ONLY that group, so every group repeats the private paths.
import type { APIRoute } from 'astro';

const PRIVATE = ['/api/', '/contact/thanks/'];

const ALLOW: Record<string, string[]> = {
  'Search engines': ['Googlebot', 'Googlebot-Image', 'Bingbot', 'DuckDuckBot', 'Applebot', 'YandexBot'],
  // Index pages so AI answers can cite and link them.
  'AI search': ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'DuckAssistBot'],
  // Fetch a page when a person asks an assistant about it.
  'AI user-triggered fetches': ['ChatGPT-User', 'Claude-User', 'Perplexity-User', 'MistralAI-User', 'meta-externalfetcher'],
};

const BLOCK: Record<string, string[]> = {
  // Model training. Google-Extended and Applebot-Extended are control tokens, not crawlers:
  // disallowing them opts out of Gemini / Apple Intelligence training without affecting search.
  'AI training': ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Meta-ExternalAgent', 'Amazonbot', 'cohere-training-data-crawler', 'AI2Bot', 'Ai2Bot-Dolma'],
  // Backlink/SEO-tool crawlers. Their site-audit bots (AhrefsSiteAudit, SiteAuditBot) are left
  // alone so you can still audit your own site with those tools.
  'SEO tool crawlers': ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'BLEXBot', 'DataForSeoBot', 'Barkrowler', 'serpstatbot', 'SeekportBot', 'ZoominfoBot'],
  // Bulk data scrapers and dataset builders with no search or citation benefit.
  'Scrapers': ['Bytespider', 'Diffbot', 'ImagesiftBot', 'omgili', 'omgilibot', 'Timpibot', 'img2dataset', 'Scrapy', 'magpie-crawler', 'Kangaroo Bot', 'Sidetrade indexer bot', 'PanguBot'],
};

const group = (title: string, agents: string[], rules: string[]) =>
  [`# ${title}`, ...agents.map((a) => `User-agent: ${a}`), ...rules].join('\n');

export const GET: APIRoute = ({ site }) => {
  const allowRules = ['Allow: /', ...PRIVATE.map((p) => `Disallow: ${p}`)];
  const body = [
    '# Khaotic Digital — robots.txt',
    '# Search engines and AI assistants may read and cite this site. Model training, SEO-tool',
    '# crawlers and data scrapers are not permitted.',
    '',
    ...Object.entries(ALLOW).map(([t, a]) => group(t, a, allowRules) + '\n'),
    ...Object.entries(BLOCK).map(([t, a]) => group(t, a, ['Disallow: /']) + '\n'),
    group('Everyone else', ['*'], allowRules),
    '',
    `Sitemap: ${new URL('sitemap-index.xml', site).href}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
