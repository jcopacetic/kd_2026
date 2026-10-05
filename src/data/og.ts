// Share-card text for every static page. Posts are added automatically from the
// insights collection (see src/pages/og/[...route].png.ts). Keep titles short: the card
// is read at thumbnail size.
import { site } from './site';

export const ogPages: Record<string, { title: string; eyebrow: string; photo?: string }> = {
  '/': { title: site.tagline, eyebrow: 'Business Systems Engineer' },
  '/services/': { title: 'Business systems, engineered end to end', eyebrow: 'Services' },
  '/services/revops/': { title: 'RevOps for B2B SaaS teams', eyebrow: 'Engineered, not bolted on' },
  '/services/ai-crm/': { title: 'AI in your CRM, running on production data', eyebrow: 'In production, not a demo' },
  '/services/build/': { title: 'Custom apps, integrations and platform development', eyebrow: 'Custom builds' },
  '/audit/': { title: 'Know what’s broken, what to fix first, and what it’s worth', eyebrow: 'Systems Audit' },
  '/audit/website/': { title: 'Find the gaps costing you leads', eyebrow: 'Website & Presence Audit' },
  '/work/': { title: 'Client work', eyebrow: 'Case studies' },
  '/insights/': { title: 'Notes from client work', eyebrow: 'Insights' },
  '/retainers/': { title: 'Fewer, deeper relationships', eyebrow: 'Retainers' },
  '/about/': { title: 'I’m a developer, not a salesperson', eyebrow: 'About Jonathan Sumner', photo: 'src/assets/photos/og-cutout.png' },
  '/faq/': { title: 'Straight answers', eyebrow: 'FAQ' },
  '/contact/': { title: 'Talk to the person who writes the code', eyebrow: 'Contact' },
  '/amarillo/': { title: 'Websites and local search for Amarillo and Canyon businesses', eyebrow: 'Local · Amarillo & Canyon' },
  '/amarillo/websites/': { title: 'Websites you own, built and looked after locally', eyebrow: 'Local · Websites' },
  '/amarillo/google-business-profile/': { title: 'Show up on the map when people search nearby', eyebrow: 'Local · Google Business Profile' },
  '/amarillo/local-seo/': { title: 'Get found by people searching in Amarillo', eyebrow: 'Local · Local SEO' },
  '/amarillo/agency-closed/': { title: 'Your web company closed. Let’s get your site back.', eyebrow: 'Local · Website rescue' },
};

/** /services/revops/ → /og/services/revops.png ; / → /og/home.png */
export const ogImagePath = (pathname: string) => {
  const key = pathname.replace(/^\/|\/$/g, '');
  return `/og/${key || 'home'}.png`;
};
