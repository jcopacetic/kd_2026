// Scheduling: a post is live once it isn't a draft and its pubDate has passed *at build time*.
// Future-dated posts aren't built at all (no page, no sitemap entry, no share image), and the
// twice-daily scheduled rebuild (vercel.json "crons" → /api/publish) picks them up when due.
// In `astro dev` scheduled posts are included so you can preview them.
import { getCollection, type CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'insights'>;

export const isScheduled = (p: Post) => p.data.pubDate.valueOf() > Date.now();

export const isPublished = (p: Post) => !p.data.draft && (import.meta.env.DEV || !isScheduled(p));

export const getPublishedPosts = (filter: (p: Post) => boolean = () => true) =>
  getCollection('insights', (p) => isPublished(p) && filter(p));
