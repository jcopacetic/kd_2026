// Prerendered share images: /og/home.png, /og/services/revops.png, /og/insights/<slug>.png …
import type { APIRoute, GetStaticPaths } from 'astro';
import { getPublishedPosts } from '../../lib/posts';
import { renderOgImage } from '../../lib/og';
import { ogPages, ogImagePath } from '../../data/og';
import { pillarLabel } from '../../data/site';

export const getStaticPaths = (async () => {
  const pages = Object.entries(ogPages).map(([path, card]) => ({ path, card }));
  const posts = (await getPublishedPosts()).map((p) => ({
    path: `/insights/${p.id}/`,
    card: { title: p.data.title, eyebrow: `${p.data.kind === 'guide' ? 'Guide' : 'Insights'} · ${pillarLabel[p.data.pillar]}` },
  }));
  return [...pages, ...posts].map(({ path, card }) => ({
    params: { route: ogImagePath(path).replace(/^\/og\/|\.png$/g, '') },
    props: card,
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgImage(props as { title: string; eyebrow: string; photo?: string });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
