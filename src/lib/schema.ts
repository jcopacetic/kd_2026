// JSON-LD builders (site-content/04 → Structured data).
// Every page emits ONE connected @graph: Organization, Person, WebSite, the page's own node
// (WebPage or a subtype), its BreadcrumbList, plus page-specific nodes (Service, Article,
// ItemList…). Nodes reference each other by @id so search engines and AI systems can see that
// the site, the business, the person and each page belong together.
import { site, prices, pillars } from '../data/site';

export const abs = (path: string) => new URL(path, site.url).href;

export const ids = {
  org: `${site.url}/#org`,
  person: `${site.url}/#person`,
  website: `${site.url}/#website`,
  logo: `${site.url}/#logo`,
  blog: `${site.url}/insights/#blog`,
  page: (path: string) => `${abs(path)}#webpage`,
  breadcrumb: (path: string) => `${abs(path)}#breadcrumb`,
  service: (path: string) => `${abs(path)}#service`,
  article: (path: string) => `${abs(path)}#article`,
  image: (path: string) => `${abs(path)}#primaryimage`,
};

const LANG = 'en-US';

/** Services sold, with the published floors (site-content/02). Used in the org's catalog. */
const catalog = [
  { name: 'Systems Audit', path: '/audit/', min: 3500, max: 5000 },
  { name: 'Website & Online-Presence Audit', path: '/audit/website/', min: 1000, max: 1500 },
  { name: pillars.revops.name, path: pillars.revops.href, min: 15000 },
  { name: pillars['ai-crm'].name, path: pillars['ai-crm'].href, min: 9000 },
  { name: pillars.build.name, path: pillars.build.href, min: 15000 },
  { name: 'Embedded Systems Partner retainer', path: '/retainers/', min: 5000, unit: 'MON' },
];

function priceSpec(min: number, max?: number, unit?: string) {
  return {
    '@type': unit ? 'UnitPriceSpecification' : 'PriceSpecification',
    priceCurrency: 'USD',
    minPrice: min,
    ...(max ? { maxPrice: max } : {}),
    ...(unit ? { unitCode: unit, referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: unit } } : {}),
  };
}

export function organization() {
  return {
    '@type': 'ProfessionalService',
    '@id': ids.org,
    name: site.name,
    legalName: site.legalName,
    url: `${site.url}/`,
    description:
      'Business systems engineering for B2B teams: RevOps, AI in the CRM, and custom apps and integrations, led by Jonathan Sumner.',
    slogan: site.tagline,
    logo: { '@type': 'ImageObject', '@id': ids.logo, url: abs('/icon-512.png'), contentUrl: abs('/icon-512.png'), width: 512, height: 512, caption: site.name },
    image: { '@id': ids.logo },
    founder: { '@id': ids.person },
    employee: { '@id': ids.person },
    address: { '@type': 'PostalAddress', addressLocality: 'Amarillo', addressRegion: 'TX', addressCountry: 'US' },
    areaServed: { '@type': 'Country', name: 'United States' },
    priceRange: `${prices.hourlyFrom.replace('/hr', '')} – ${prices.buildRange}`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      url: abs('/contact/'),
      areaServed: 'US',
      availableLanguage: 'English',
    },
    knowsAbout: ['Revenue operations', 'CRM integration', 'HubSpot', 'Marketing automation', 'AI agents', 'Python', 'Django'],
    sameAs: [site.links.linkedinCompany, site.links.upwork, site.links.github],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: catalog.map((c) => ({
        '@type': 'Offer',
        itemOffered: { '@id': ids.service(c.path) },
        priceSpecification: priceSpec(c.min, c.max, c.unit),
        url: abs(c.path),
      })),
    },
  };
}

export function person() {
  return {
    '@type': 'Person',
    '@id': ids.person,
    name: site.person.name,
    givenName: 'Jonathan',
    familyName: 'Sumner',
    jobTitle: site.person.jobTitle,
    description:
      'Business systems engineer building RevOps systems, AI in the CRM, and custom apps and integrations. Building for the web since 2004 and in HubSpot since 2014.',
    url: abs('/about/'),
    image: { '@type': 'ImageObject', url: abs('/images/jonathan-sumner.jpg'), width: 800, height: 1000, caption: 'Jonathan Sumner' },
    worksFor: { '@id': ids.org },
    knowsAbout: ['Revenue operations', 'HubSpot', 'CRM integration', 'Django', 'Python', 'AI agents', 'Model Context Protocol'],
    sameAs: [site.links.github, site.links.upwork],
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': ids.website,
    url: `${site.url}/`,
    name: site.name,
    description: site.tagline,
    inLanguage: LANG,
    publisher: { '@id': ids.org },
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbs(path: string, items: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': ids.breadcrumb(path),
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export type PageType = 'WebPage' | 'AboutPage' | 'ProfilePage' | 'ContactPage' | 'CollectionPage' | 'FAQPage';

/** The page's own node. FAQ items, when present, make it an FAQPage as well. */
export function webPage(opts: {
  path: string;
  name: string;
  description: string;
  types?: PageType[];
  hasBreadcrumb?: boolean;
  about?: string; // @id
  mainEntity?: object; // @id ref or node
  faq?: { q: string; a: string }[];
  datePublished?: Date;
  dateModified?: Date;
}) {
  const types = new Set<PageType>(opts.types?.length ? opts.types : ['WebPage']);
  if (opts.faq?.length) types.add('FAQPage');
  const typeList = [...types];
  return {
    '@type': typeList.length === 1 ? typeList[0] : typeList,
    '@id': ids.page(opts.path),
    url: abs(opts.path),
    name: opts.name,
    description: opts.description,
    inLanguage: LANG,
    isPartOf: { '@id': ids.website },
    primaryImageOfPage: { '@id': ids.image(opts.path) },
    image: { '@id': ids.image(opts.path) },
    ...(opts.hasBreadcrumb ? { breadcrumb: { '@id': ids.breadcrumb(opts.path) } } : {}),
    ...(opts.about ? { about: { '@id': opts.about } } : {}),
    ...(opts.faq?.length
      ? { mainEntity: opts.faq.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })) }
      : opts.mainEntity
        ? { mainEntity: opts.mainEntity }
        : {}),
    ...(opts.datePublished ? { datePublished: opts.datePublished.toISOString() } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified.toISOString() } : {}),
  };
}

export function primaryImage(path: string, image: string, caption: string) {
  return {
    '@type': 'ImageObject',
    '@id': ids.image(path),
    url: abs(image),
    contentUrl: abs(image),
    width: 1200,
    height: 630,
    caption,
    inLanguage: LANG,
  };
}

/** Where the local (/amarillo/) services are offered. */
export const localAreas = [
  { '@type': 'City', name: 'Amarillo', containedInPlace: { '@type': 'State', name: 'Texas' } },
  { '@type': 'City', name: 'Canyon', containedInPlace: { '@type': 'State', name: 'Texas' } },
  { '@type': 'AdministrativeArea', name: 'Texas Panhandle' },
];

export function service(opts: {
  name: string;
  path: string;
  description: string;
  serviceType?: string;
  price?: { min: number; max?: number; unit?: string };
  /** Defaults to the US-wide B2B service; local pages pass their own cities and audience. */
  areaServed?: object | object[];
  audience?: string;
}) {
  return {
    '@type': 'Service',
    '@id': ids.service(opts.path),
    name: opts.name,
    serviceType: opts.serviceType ?? opts.name,
    url: abs(opts.path),
    description: opts.description,
    provider: { '@id': ids.org },
    areaServed: opts.areaServed ?? { '@type': 'Country', name: 'United States' },
    audience: { '@type': 'BusinessAudience', audienceType: opts.audience ?? 'B2B companies' },
    mainEntityOfPage: { '@id': ids.page(opts.path) },
    ...(opts.price
      ? {
          offers: {
            '@type': 'Offer',
            url: abs(opts.path),
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            priceSpecification: priceSpec(opts.price.min, opts.price.max, opts.price.unit),
            seller: { '@id': ids.org },
          },
        }
      : {}),
  };
}

export function article(p: {
  path: string;
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  section: string;
  tags: string[];
  wordCount: number;
  technical: boolean;
  guide: boolean;
}) {
  return {
    '@type': p.technical ? 'TechArticle' : p.guide ? 'Article' : 'BlogPosting',
    '@id': ids.article(p.path),
    headline: p.title.length > 110 ? `${p.title.slice(0, 107)}…` : p.title,
    name: p.title,
    description: p.description,
    url: abs(p.path),
    mainEntityOfPage: { '@id': ids.page(p.path) },
    isPartOf: { '@id': ids.blog },
    datePublished: p.pubDate.toISOString(),
    dateModified: (p.updatedDate ?? p.pubDate).toISOString(),
    author: { '@id': ids.person },
    publisher: { '@id': ids.org },
    image: { '@id': ids.image(p.path) },
    articleSection: p.section,
    keywords: p.tags.join(', '),
    wordCount: p.wordCount,
    inLanguage: LANG,
  };
}

export function blog() {
  return {
    '@type': 'Blog',
    '@id': ids.blog,
    name: `${site.name} Insights`,
    url: abs('/insights/'),
    description: 'Tutorials, frameworks and fixes from client work: CRM integrations, RevOps, AI and web development.',
    publisher: { '@id': ids.org },
    author: { '@id': ids.person },
    inLanguage: LANG,
    mainEntityOfPage: { '@id': ids.page('/insights/') },
  };
}

export function itemList(path: string, items: { name: string; path?: string; id?: string }[]) {
  return {
    '@type': 'ItemList',
    '@id': `${abs(path)}#itemlist`,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.path ? { url: abs(it.path) } : {}),
      ...(it.id ? { item: { '@id': it.id } } : {}),
    })),
  };
}

export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
