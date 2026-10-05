// Scheduled publishing. Vercel Cron calls this twice a day (see vercel.json "crons"); it triggers
// a fresh production build through a Vercel deploy hook, and that build includes any post whose
// pubDate has now passed (src/lib/posts.ts). Vercel sends `Authorization: Bearer $CRON_SECRET`
// with cron requests, so anything else is refused.
import type { APIRoute } from 'astro';
import { CRON_SECRET, DEPLOY_HOOK_URL } from 'astro:env/server';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!DEPLOY_HOOK_URL) {
    console.error('publish: DEPLOY_HOOK_URL not set');
    return new Response('Deploy hook not configured', { status: 503 });
  }
  const res = await fetch(DEPLOY_HOOK_URL, { method: 'POST', signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    console.error('publish: deploy hook failed', res.status);
    return new Response('Deploy hook failed', { status: 502 });
  }
  return Response.json({ triggered: true });
};
