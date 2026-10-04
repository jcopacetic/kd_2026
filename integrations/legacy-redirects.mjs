// Post-build fix for @astrojs/vercel + trailingSlash: 'always'.
// The adapter emits redirect sources like ^/get-in-touch$ AFTER its trailing-slash rule, so
// the old site's real URLs (/get-in-touch/, with slash) never match and fall through to 404.
// This makes the slash optional and moves the 301s first, so each legacy URL is one 301 hop.
//
// Also drops the on-demand /_image route. Every page is prerendered and its images are
// optimised at build time, so nothing uses it, and left open it would resize any local image
// to any size on request (free CPU for anyone who wants to burn our function quota).
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export default function legacyRedirects() {
  return {
    name: 'kd-legacy-redirects',
    hooks: {
      'astro:build:done': async ({ logger }) => {
        const file = new URL('../.vercel/output/config.json', import.meta.url);
        if (!existsSync(file)) return;
        const config = JSON.parse(await readFile(file, 'utf8'));
        const isRedirect = (r) => (r.status === 301 || r.status === 302) && r.headers?.Location;
        const redirects = config.routes.filter(isRedirect).map((r) => ({
          ...r,
          src: r.src.replace(/\$$/, '/?$'),
          headers: { ...r.headers, Location: r.headers.Location.replace(/([^/])$/, '$1/') },
        }));
        const rest = config.routes.filter((r) => !isRedirect(r));
        const at = rest.findIndex((r) => r.status === 308); // first trailing-slash rule
        rest.splice(at === -1 ? 0 : at, 0, ...redirects);
        config.routes = rest.filter((r) => !(r.dest === '_render' && r.src.startsWith('^/_image')));
        await writeFile(file, JSON.stringify(config, null, 2));
        logger.info(`${redirects.length} legacy 301s accept a trailing slash and run before slash normalisation; /_image route removed`);
      },
    },
  };
}
