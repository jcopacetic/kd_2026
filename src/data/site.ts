// Single source for facts, prices and links used across pages.
// Prices and proof figures come from site-content/02 and site-content/06 — change them here only.

export const site = {
  name: 'Khaotic Digital',
  legalName: 'Khaotic Digital, LLC',
  url: 'https://khaoticdigital.com',
  person: {
    name: 'Jonathan Sumner',
    jobTitle: 'Business Systems Engineer',
    // No email here on purpose: the address is never published (anti-scraping). Contact is
    // the /contact/ form; the receiving mailbox lives only in server env vars (GMAIL_USER).
    location: 'Amarillo, Texas',
  },
  tagline: 'I build the RevOps and AI systems that configurators can’t.',
  links: {
    upwork: 'https://www.upwork.com/freelancers/jonathansumner2',
    // TODO(jonathan): confirm handle — the planner lists GitHub profile "jcopacetic".
    github: 'https://github.com/jcopacetic',
    linkedinCompany: 'https://www.linkedin.com/company/khaotic-digital',
    /** X handle for twitter:site, e.g. '@khaoticdigital'. Empty until the account is active again. */
    x: '',
  },
  /** TODO(jonathan): confirm the response-time promise used on forms and CTAs. */
  replyTime: 'one business day',
  /** Leave empty until the booking link exists; CTAs then fall back to /contact/. */
  calendlyUrl: '',
  ga4Id: 'G-9JLYGBRC1N',
  /** HubSpot tracking script (loaded only after consent). Off: forms now email directly.
   *  Set to '21372035' to turn it back on. */
  hubspotPortalId: '',
} as const;

export const proof = {
  stats: [
    { value: '98%', label: 'Job Success' },
    { value: 'Top Rated Plus', label: 'on Upwork' },
    { value: '$300K+', label: 'delivered' },
    { value: '265', label: 'projects' },
    { value: '4,485', label: 'hours billed' },
    { value: 'Since 2015', label: 'building in HubSpot' },
  ],
  badges: ['US-based', 'Veteran-owned', 'GitHub since 2015'],
  testimonials: [
    { quote: 'A spectacular engineer… instantaneous value… hit the ground running on day one.', context: 'AI startup, application portal build' },
    { quote: 'Able to solve a problem that our development team AND the HubSpot support team couldn’t figure out.', context: 'Client review, Upwork' },
    { quote: 'Senior-level development knowledge… offered insights and recommendations to help our website shine.', context: 'Client review, Upwork' },
    { quote: 'Very professional, efficient, and brought real insight and domain knowledge.', context: 'EdTech SaaS, API integration' },
    { quote: 'His HubSpot development work was top-tier.', context: 'Client review, Upwork' },
    { quote: 'This is my second time hiring Jonathan.', context: 'Repeat client, Upwork' },
  ],
};

export const prices = {
  audit: '$3,500–$5,000',
  auditNote: 'fixed fee, scoped on intake',
  websiteAudit: 'from $1,000',
  websiteAuditRange: '$1,000–$1,500',
  buildFrom: '$15,000',
  buildRange: '$15K–$25K+',
  aiSprintFrom: '$9,000',
  aiSprintRange: '$9K–$20K for 2–4 weeks',
  aiRetainer: '$2,500–$6,000/mo',
  partnerRetainerFrom: '$5,000/mo',
  fractional: '$5,000–$10,000/mo',
  carePlanFrom: '$750/mo',
  /** site-content/02 FAQ: "$150 floor" for small hourly work. */
  hourlyFrom: '$150/hr',
};

export type Pillar = 'revops' | 'ai-crm' | 'build' | 'website';

export const pillars: Record<Exclude<Pillar, 'website'>, { name: string; tagline: string; href: string; icon: string; problem: string }> = {
  revops: {
    name: 'RevOps for SaaS',
    tagline: 'Engineered, not bolted on.',
    href: '/services/revops/',
    icon: 'sales-ops-pipelines',
    problem: 'Pipeline, routing and reporting spread across tools, with nobody owning the whole system.',
  },
  'ai-crm': {
    name: 'AI in Your CRM',
    tagline: 'In production, not a demo.',
    href: '/services/ai-crm/',
    icon: 'ai-crm',
    problem: 'AI that works on your customer data inside the CRM, built to handle messy records.',
  },
  build: {
    name: 'Custom Apps & Platform Dev',
    tagline: 'When the platform runs out of road.',
    href: '/services/build/',
    icon: 'apps-integrations',
    problem: 'Integrations, apps, themes and migrations the drag-and-drop editor can’t do.',
  },
};

export const pillarLabel: Record<Pillar, string> = {
  revops: 'RevOps',
  'ai-crm': 'AI in your CRM',
  build: 'Custom builds',
  website: 'Website & presence',
};
