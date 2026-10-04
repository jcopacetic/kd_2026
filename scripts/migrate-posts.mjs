// One-off migration: pulls the 9 Insights posts and 4 Resources guides from the live
// Django/Wagtail site into Markdown files in src/content/insights/.
// Re-run safely: it overwrites the generated files. Images are downloaded into
// public/media/insights/<slug>/ so nothing depends on the old server.
//
//   npm run migrate            # only creates posts that don't exist yet
//   npm run migrate -- --force # overwrite existing files (destroys rewrites!)
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import TurndownService from 'turndown';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://khaoticdigital.com';
const OUT = join(ROOT, 'src/content/insights');
const MEDIA = join(ROOT, 'public/media/insights');

// pillar: which service pillar the post links to (see site-content/01).
// gsc: 12-month Search Console figures from the Site Planner, kept for prioritising refreshes.
const SOURCES = [
  { path: '/insights/smart-address-autocomplete-in-hubspot-forms-using-google-places-api/', pillar: 'build', gsc: '110 clicks / 12,185 impr / pos 18.7' },
  { path: '/insights/how-to-deploy-cookiecutter-django-on-a-digitalocean-droplet-ubuntu-2204/', pillar: 'build', gsc: '31 clicks / 3,715 impr / pos 11.8' },
  { path: '/insights/web-application-development-in-django-and-docker/', pillar: 'build', gsc: '3 clicks / 2,556 impr / pos 12.3' },
  { path: '/insights/how-to-verify-address-city-zip-code-state-and-country-on-hubspot-form-submit-using-google-places-api/', pillar: 'build', gsc: '6 clicks / 1,393 impr / pos 11.6' },
  { path: '/insights/decoding-the-importance-of-colors-in-your-brand-style-guide/', pillar: 'website', gsc: '1 click / 382 impr / pos 20.7' },
  { path: '/insights/the-online-presence-breakdown-i-shouldnt-be-sharing/', pillar: 'website', gsc: '0 clicks / 205 impr / pos 13.8' },
  { path: '/insights/how-to-automate-scheduling-links-for-facebook-lead-ads-using-zapier-openphone-gmail-api-and-calendly/', pillar: 'build', gsc: '0 clicks / 94 impr / pos 34.2' },
  { path: '/insights/aligning-buyer-personas-journeys-campaigns-pipelines/', pillar: 'revops', gsc: '0 clicks / 18 impr / pos 5.3' },
  { path: '/insights/increase-website-performance-with-this-one-trick/', pillar: 'website', gsc: '0 clicks / 4 impr / pos 21.3' },
  { path: '/resources/developing-effective-pipelines-for-sales-operations-and-after-service/', pillar: 'revops', gsc: '0 clicks / 1,242 impr / pos 12.0', kind: 'guide' },
  { path: '/resources/building-buyer-centric-marketing-campaigns/', pillar: 'revops', gsc: '1 click / 855 impr / pos 20.1', kind: 'guide' },
  { path: '/resources/hubspot-website-development-customization/', pillar: 'build', gsc: '0 clicks / 52 impr / pos 37.3', kind: 'guide' },
  { path: '/resources/content-strategy-and-development/', pillar: 'revops', gsc: '0 clicks / 1 impr / pos 102', kind: 'guide' },
];

// Known source typos (site-content/07 "Known content fixes").
const FIXES = [
  ['**Google Places API**A: utocomplete', '**Google Places API:** Autocomplete'],
  ['developling', 'developing'], ['Lean about', 'Learn about'], ['for for your', 'for your'],
  ['minumums', 'minimums'], ['compaigns', 'campaigns'], ['egaging', 'engaging'],
];

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
   .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

const meta = (html, re) => decode((html.match(re) || [])[1] || '').trim();

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*' });
td.addRule('fencedWithLanguage', {
  filter: (node) => node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE',
  replacement: (_c, node) => {
    const code = node.firstChild;
    const lang = ((code.getAttribute('class') || '').match(/language-(\S+)/) || [])[1] || '';
    const text = code.textContent.replace(/\n+$/, '');
    const fence = text.includes('```') ? '````' : '```';
    return `\n\n${fence}${lang}\n${text}\n${fence}\n\n`;
  },
});
td.remove(['script', 'style']);

function bodyOf(html, kind) {
  let start, end;
  if (kind === 'guide') {
    start = html.indexOf('<div class="col-md-9 col-12">');
    end = html.indexOf('<div class="col-md-3 col-12');
  } else {
    const g = html.indexOf('post-image-gallery');
    start = html.indexOf('</div>', g) + 6;
    end = html.indexOf('<div class="col-3 d-none d-md-block"');
  }
  if (start < 0 || end < 0 || end <= start) throw new Error('body boundaries not found');
  return html.slice(start, end);
}

async function localiseImages(html, slug) {
  const srcs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  for (const src of new Set(srcs)) {
    const url = new URL(src, ORIGIN).href;
    const file = basename(new URL(url).pathname);
    const dir = join(MEDIA, slug);
    await mkdir(dir, { recursive: true });
    const res = await fetch(url);
    if (!res.ok) { console.warn(`  ! image ${url} -> ${res.status}`); continue; }
    await writeFile(join(dir, file), Buffer.from(await res.arrayBuffer()));
    html = html.split(src).join(`/media/insights/${slug}/${file}`);
  }
  return html;
}

async function lastmods() {
  const xml = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
  const map = {};
  for (const m of xml.matchAll(/<loc>[^<]*?(\/[^<]*)<\/loc><lastmod>([^<]+)<\/lastmod>/g)) map[m[1]] = m[2];
  return map;
}

const yaml = (s) => JSON.stringify(s); // JSON strings are valid YAML scalars

const months = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
function parseDate(text) {
  const m = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})/);
  return m ? `${m[3]}-${String(months[m[1]]).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}

await mkdir(OUT, { recursive: true });
const mods = await lastmods();

const FORCE = process.argv.includes('--force');

for (const src of SOURCES) {
  const slug = src.path.split('/').filter(Boolean).pop();
  if (!FORCE && existsSync(join(OUT, `${slug}.md`))) { console.log(`- ${slug} exists, skipped (use --force to overwrite)`); continue; }
  const res = await fetch(ORIGIN + src.path);
  if (!res.ok) { console.error(`x ${src.path} -> ${res.status}`); continue; }
  const html = await res.text();

  const rawTitle = meta(html, /<h1[^>]*>([\s\S]*?)<\/h1>/) || meta(html, /<title>([^<]*)<\/title>/);
  const title = rawTitle.replace(/\s*\|\s*Insights\s*\|\s*Khaotic Digital\s*$/i, '').replace(/<[^>]+>/g, '').trim();
  const description = meta(html, /<meta name="description" content="([^"]*)"/);
  const tags = [...html.matchAll(/href="None\?tag=([^"]+)"/g)].map((m) => decode(m[1])).filter((t) => t !== 'AI Generated Reference');
  const published = parseDate(meta(html, /<p class="meta">([\s\S]*?)<span/)) || mods[src.path] || '2025-04-01';

  let body = bodyOf(html, src.kind).replace(/<br\s*\/?>\s*<\/li>/g, '</li>');
  body = await localiseImages(body, slug);
  let md = td.turndown(body)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^# /gm, '## ') // the page template owns the only H1
    .replace(/^(#{2,6} )\*\*(.+?)\*\*\s*$/gm, '$1$2') // no bold inside headings
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/^```other$/gm, '```')
    .trim();
  for (const [bad, good] of FIXES) md = md.split(bad).join(good);

  const fm = [
    '---',
    `title: ${yaml(title)}`,
    `description: ${yaml(description)}`,
    `pubDate: ${published}`,
    mods[src.path] ? `updatedDate: ${mods[src.path]}` : null,
    `pillar: ${src.pillar}`,
    `tags: ${JSON.stringify(tags)}`,
    `legacyUrl: ${yaml(src.path)}`,
    `gsc12mo: ${yaml(src.gsc)}`,
    src.kind === 'guide' ? 'kind: guide' : null,
    '---',
  ].filter(Boolean).join('\n');

  await writeFile(join(OUT, `${slug}.md`), `${fm}\n\n${md}\n`);
  console.log(`✓ ${slug} (${md.split(/\s+/).length} words)`);
}
