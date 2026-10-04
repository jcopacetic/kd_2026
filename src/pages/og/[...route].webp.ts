// WebP versions of post covers for use inside articles (the PNG stays for social cards):
// /og/insights/<slug>-800.webp and -1200.webp.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import sharp from 'sharp';
import { renderOgImage } from '../../lib/og';
import { pillarLabel } from '../../data/site';

export const COVER_WIDTHS = [800, 1200] as const;

export const getStaticPaths = (async () => {
  const posts = await getCollection('insights', ({ data }) => !data.draft);
  return posts.flatMap((p) =>
    COVER_WIDTHS.map((width) => ({
      params: { route: `insights/${p.id}-${width}` },
      props: { width, title: p.data.title, eyebrow: `${p.data.kind === 'guide' ? 'Guide' : 'Insights'} · ${pillarLabel[p.data.pillar]}` },
    })),
  );
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { width, title, eyebrow } = props as { width: number; title: string; eyebrow: string };
  const png = await renderOgImage({ title, eyebrow });
  const webp = await sharp(png).resize({ width }).webp({ quality: 82 }).toBuffer();
  return new Response(new Uint8Array(webp), { headers: { 'Content-Type': 'image/webp' } });
};
