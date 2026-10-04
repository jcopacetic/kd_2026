// Legacy /kd-insights/* URLs (Search Console history, site-content/04). Their full slugs
// were truncated in the audit, so match by prefix and 301 to the new home.
import type { APIRoute } from 'astro';

export const prerender = false;

const MAP: [prefix: string, to: string][] = [
  ['web-application-development-in-django-and-docker', '/insights/web-application-development-in-django-and-docker/'],
  ['marketing-pro-the-online-presence-breakdown', '/insights/the-online-presence-breakdown-i-shouldnt-be-sharing/'],
  ['decoding-hubspot-templates', '/insights/hubspot-website-development-customization/'],
];

export const GET: APIRoute = ({ params, redirect }) => {
  const rest = params.rest ?? '';
  const hit = MAP.find(([prefix]) => rest.startsWith(prefix));
  return redirect(hit ? hit[1] : '/insights/', 301);
};
