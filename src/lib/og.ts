// Branded 1200×630 share images, rendered at build time (satori → SVG → resvg → PNG).
// Brand rules (site-content/03): Ink background, Paper text, Signal mint only on the status
// dot and the domain, pulse pattern behind empty space, never behind the title.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const root = process.cwd();
const font = (pkg: string, file: string) => readFileSync(join(root, 'node_modules/@fontsource', pkg, 'files', file));
const dataUri = (file: string) => `data:image/svg+xml;base64,${readFileSync(join(root, file)).toString('base64')}`;
const pngUri = (file: string) => `data:image/png;base64,${readFileSync(join(root, file)).toString('base64')}`;

let assets: { fonts: Parameters<typeof satori>[1]['fonts']; logo: string; pulse: string } | undefined;
function load() {
  assets ??= {
    fonts: [
      { name: 'Space Grotesk', data: font('space-grotesk', 'space-grotesk-latin-700-normal.woff'), weight: 700, style: 'normal' },
      { name: 'Inter', data: font('inter', 'inter-latin-400-normal.woff'), weight: 400, style: 'normal' },
      { name: 'JetBrains Mono', data: font('jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff'), weight: 500, style: 'normal' },
    ],
    logo: dataUri('src/assets/logo/khaotic-logo-horizontal-reversed.svg'),
    pulse: dataUri('public/patterns/pulse-ink.svg'),
  };
  return assets;
}

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children, ...extra },
});

/** Title size steps down as the title gets longer, so it always fits in ≤ 4 lines. */
function titleSize(title: string) {
  const n = title.length;
  if (n <= 32) return 84;
  if (n <= 56) return 70;
  if (n <= 85) return 58;
  return 48;
}

/** `photo`: a transparent cut-out PNG (630px tall), shown on the right in front of the pulse rings. */
export async function renderOgImage({ title, eyebrow, photo }: { title: string; eyebrow: string; photo?: string }) {
  const { fonts, logo, pulse } = load();
  const portrait = photo ? pngUri(photo) : undefined;
  const textWidth = portrait ? 540 : 960;
  const tree = h(
    'div',
    { width: OG_WIDTH, height: OG_HEIGHT, position: 'relative', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', backgroundColor: '#0a0a0a', color: '#f5f5f4', fontFamily: 'Inter' },
    [
      h('img', { position: 'absolute', right: -330, top: -150, width: 930, height: 930, opacity: 0.55 }, undefined, { src: pulse, width: 930, height: 930 }),
      ...(portrait ? [h('img', { position: 'absolute', right: -12, bottom: 0, width: 603, height: 630 }, undefined, { src: portrait, width: 603, height: 630 })] : []),
      h('img', { height: 56, width: 197 }, undefined, { src: logo, width: 197, height: 56 }),
      h('div', { flexDirection: 'column', maxWidth: textWidth }, [
        h('div', { alignItems: 'center', fontFamily: 'JetBrains Mono', fontSize: 24, letterSpacing: 2.5, textTransform: 'uppercase', color: '#a1a6a4', marginBottom: 26 }, [
          h('div', { width: 14, height: 14, borderRadius: 7, backgroundColor: '#2ee59d', marginRight: 16 }),
          eyebrow,
        ]),
        h('div', { fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: portrait ? Math.min(titleSize(title), 66) : titleSize(title), lineHeight: 1.06, letterSpacing: -2, color: '#f5f5f4' }, title),
      ]),
      portrait
        ? h('div', { alignItems: 'center', borderTop: '1px solid #333635', paddingTop: 24, fontSize: 22, color: '#a1a6a4', width: textWidth }, [
            'Business Systems Engineer · ',
            h('div', { fontFamily: 'JetBrains Mono', color: '#2ee59d', fontSize: 22, marginLeft: 8 }, 'khaoticdigital.com'),
          ])
        : h('div', { justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #333635', paddingTop: 24, fontSize: 24, color: '#a1a6a4' }, [
            'Jonathan Sumner · Business Systems Engineer',
            h('div', { fontFamily: 'JetBrains Mono', color: '#2ee59d', fontSize: 24 }, 'khaoticdigital.com'),
          ]),
    ],
  );
  const svg = await satori(tree as never, { width: OG_WIDTH, height: OG_HEIGHT, fonts });
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
}
