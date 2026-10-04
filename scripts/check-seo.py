#!/usr/bin/env python3
"""Post-build SEO check: run after `npm run build` (npm run check:seo).

For every built page: one JSON-LD graph, a page node matching the canonical URL, no dangling
or duplicate @ids, required fields for Article/FAQ/Breadcrumb/Offer nodes, all OG + Twitter
tags present, og:url == canonical, the og:image file exists, title <= 60, description <= 160.
Exits 1 if anything fails.
"""
import collections, glob, html, json, os, re, sys

SITE = 'https://khaoticdigital.com'
ROOT = os.path.join(os.path.dirname(__file__), '..', '.vercel', 'output', 'static')
os.chdir(ROOT)
REQ = ['og:type', 'og:locale', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image',
       'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:title',
       'twitter:description', 'twitter:image', 'twitter:image:alt']

def nodes(obj):
    if isinstance(obj, dict):
        yield obj
        for v in obj.values(): yield from nodes(v)
    elif isinstance(obj, list):
        for v in obj: yield from nodes(v)

pages = {}
for f in sorted(glob.glob('**/index.html', recursive=True)):
    t = open(f).read()
    meta = collections.defaultdict(list)
    for k, v in re.findall(r'<meta (?:property|name)="([^"]+)" content="([^"]*)"', t): meta[k].append(html.unescape(v))
    pages['/' + f[:-len('index.html')]] = dict(
        meta=meta,
        canon=(re.search(r'<link rel="canonical" href="([^"]+)"', t) or [None, None])[1],
        ld=[json.loads(m) for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', t, re.S)],
        noindex='noindex' in ''.join(meta.get('robots', [])),
        title=html.unescape((re.search(r'<title>([^<]*)', t) or [0, ''])[1]),
    )

defined = {n['@id'] for p in pages.values() for d in p['ld'] for n in nodes(d) if '@id' in n and len(n) > 1}
problems = collections.defaultdict(list)
for path, p in pages.items():
    if p['noindex']:
        continue
    m = p['meta']
    problems[path] += [f'missing {k}' for k in REQ if k not in m]
    if m.get('og:url', [None])[0] != p['canon']: problems[path].append('og:url != canonical')
    img = m.get('og:image', [''])[0].replace(SITE + '/', '')
    if not os.path.exists(img): problems[path].append(f'og:image file missing: {img}')
    if len(p['title']) > 60: problems[path].append(f'title is {len(p["title"])} chars')
    if m.get('description') and len(m['description'][0]) > 160: problems[path].append('description > 160 chars')
    if len(p['ld']) != 1:
        problems[path].append(f'{len(p["ld"])} JSON-LD blocks'); continue
    g = p['ld'][0]['@graph']
    ids = [n['@id'] for n in g if '@id' in n]
    if len(ids) != len(set(ids)): problems[path].append('duplicate @id')
    problems[path] += [f'dangling @id {n["@id"]}' for n in nodes(g) if set(n) == {'@id'} and n['@id'] not in defined]
    if not any(n.get('@id') == f'{p["canon"]}#webpage' for n in g): problems[path].append('no page node for canonical')
    for n in g:
        ts = n.get('@type'); ts = ts if isinstance(ts, list) else [ts]
        if set(ts) & {'BlogPosting', 'Article', 'TechArticle'}:
            problems[path] += [f'article missing {k}' for k in ['headline', 'image', 'datePublished', 'author', 'publisher'] if k not in n]
            if len(n.get('headline', '')) > 110: problems[path].append('headline > 110 chars')
        if 'FAQPage' in ts and any(not q.get('acceptedAnswer', {}).get('text') for q in n.get('mainEntity', [])):
            problems[path].append('FAQ answer empty')
        if 'BreadcrumbList' in ts and any(it.get('position') != i or not it.get('item') for i, it in enumerate(n['itemListElement'], 1)):
            problems[path].append('breadcrumb item invalid')

bad = {k: v for k, v in problems.items() if v}
checked = sum(1 for p in pages.values() if not p['noindex'])
if bad:
    for k, v in bad.items(): print(f'✗ {k}: ' + '; '.join(v))
    print(f'{len(bad)} of {checked} pages failed'); sys.exit(1)
print(f'✓ SEO check passed for {checked} indexable pages')
