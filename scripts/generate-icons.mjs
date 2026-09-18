// Draws the brand mark and renders every icon the platforms ask for into public/. Run once, or
// again after changing the mark:  npm run icons   (the outputs are committed; the build does not
// depend on this script).
//
// The mark: a cube of 8 little cubes (2 x 2 x 2) with small gaps (see src/logo.ts, which animates it on the
// site). The still version is one moment of that animation: each little cube a little outward.
//  - bare (favicon, icon.svg, app icons with purpose "any"): just the cube, as big as it fits;
//  - on a tile (the maskable icon, the Apple touch icon): a dark square to the edge, because
//    Android crops it to its own shape and iOS fills transparency with black; the cube sits well
//    inside Android's safe zone.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

function mark({ tile = false } = {}) {
  let seed = 11; // the same layout as src/logo.ts
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const gap = 0.14;
  const open = 0.09; // how far out this moment is, as a share of a slot
  const c = Math.cos(Math.PI / 6);
  const size = tile ? 250 : 360; // across, in the 512 box
  const s = size / (2 * c * 2) * 1.02;
  const P = (x, y, z) => [(x - y) * s * c, (x + y) * s * 0.5 - z * s];
  const cells = [];
  for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) {
    const out = (v) => (v * 2 - 1) * (0.35 + Math.abs(rnd()) * 0.65) * open * 2;
    const o = [out(x), out(y), out(z)];
    rnd(); rnd(); rnd(); // turn, time, delay in logo.ts: keep the sequence in step
    cells.push([x + gap / 2 + o[0], y + gap / 2 + o[1], z + gap / 2 + o[2]]);
  }
  const mid = P(1, 1, 1);
  const Q = (x, y, z) => { const [a, b] = P(x, y, z); return [256 + a - mid[0], 256 + b - mid[1]]; };
  const pts = (...p) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  cells.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2])); // back to front
  const w = 1 - gap;
  const g = 'stroke="#07080f" stroke-opacity="0.45" stroke-width="3" stroke-linejoin="round"';
  const body = cells
    .map(([x, y, z]) => {
      const top = [Q(x, y, z + w), Q(x + w, y, z + w), Q(x + w, y + w, z + w), Q(x, y + w, z + w)];
      const left = [Q(x, y + w, z + w), Q(x + w, y + w, z + w), Q(x + w, y + w, z), Q(x, y + w, z)];
      const right = [Q(x + w, y, z + w), Q(x + w, y + w, z + w), Q(x + w, y + w, z), Q(x + w, y, z)];
      return `<polygon points="${pts(...top)}" fill="url(#t)" ${g}/><polygon points="${pts(...left)}" fill="url(#l)" ${g}/><polygon points="${pts(...right)}" fill="url(#r)" ${g}/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>
  <linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9bfaf1"/><stop offset="1" stop-color="#2ee6d6"/></linearGradient>
  <linearGradient id="l" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#a58cff"/><stop offset="1" stop-color="#5b3be8"/></linearGradient>
  <linearGradient id="r" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#ff86bd"/><stop offset="1" stop-color="#d81e74"/></linearGradient>
</defs>${tile ? '<rect width="512" height="512" fill="#100d26"/>' : ''}${body}</svg>
`;
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon.svg', mark());

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(file, size, tile) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${mark({ tile })}`);
  await page.screenshot({ path: `public/${file}`, omitBackground: true });
  console.log('public/' + file);
}
await png('favicon-32.png', 32, false);
await png('icon-192.png', 192, false);
await png('icon-512.png', 512, false);
await png('icon-maskable-512.png', 512, true);
await png('apple-touch-icon.png', 180, true);
await browser.close();
