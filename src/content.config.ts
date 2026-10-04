import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pillar = z.enum(['revops', 'ai-crm', 'build', 'website']);

const insights = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/insights' }),
  schema: z.object({
    title: z.string(),
    /** Shorter <title> for search results (≤ 60 chars) when the headline is long. */
    seoTitle: z.string().max(60).optional(),
    description: z.string().max(160),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    pillar,
    tags: z.array(z.string()).default([]),
    kind: z.enum(['post', 'guide']).default('post'),
    /** Path on the old site, for the redirect map and analytics continuity. */
    legacyUrl: z.string().optional(),
    /** Search Console, last 12 months, from the Site Planner — not rendered. */
    gsc12mo: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/work' }),
  schema: z.object({
    title: z.string(), // outcome-framed
    client: z.string(), // "an AI startup" unless written permission to name
    pillar,
    summary: z.string(),
    stack: z.array(z.string()).default([]),
    metrics: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    quote: z.string().optional(),
    rating: z.number().optional(),
    order: z.number().default(99),
    /** Drafts show as a card on /work/ but get no page until written. */
    draft: z.boolean().default(true),
  }),
});

export const collections = { insights, work };
