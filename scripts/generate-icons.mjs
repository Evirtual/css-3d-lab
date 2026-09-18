// Draws the brand mark and renders every icon the platforms ask for into public/. Run once, or
// again after changing the mark:  npm run icons   (the outputs are committed; the build does not
// depend on this script).
//
// The mark: one glass cube in the site's colours (see src/logo.ts, which spins it on the site).
// Its far faces are drawn too and show through the tinted near ones.
//  - bare (favicon, icon.svg, app icons with purpose "any"): just the cube, no background, nearly
//    edge to edge (its corners 240 of the 256 half-width from the centre), so it reads at 16-32 px;
//  - on a tile (the maskable icon, the Apple touch icon): a dark square to the edge, because
//    Android crops it to its own shape and iOS fills transparency with black. On the maskable icon
//    the cube stays inside Android's safe zone (a circle of 80% of the width: radius 205); iOS
//    only rounds the corners, so there it is a little bigger.
// These sizes are the ones the icons have always had; only the look of the cube changed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

// The tile's backdrop gets the site's faint blueprint grid (the page's --grid lines), a little
// stronger than on the page so it survives being shrunk to an app icon: 8 cells across.
const GRID = Array.from({ length: 7 }, (_, i) => {
  const v = 64 * (i + 1);
  return `<path d="M${v} 0V512M0 ${v}H512"/>`;
})
  .join('')
  .replace(/^/, '<g stroke="rgb(140 150 220)" stroke-opacity="0.08" stroke-width="2.5" fill="none">')
  .concat('</g>');

const BARE = { e: 240 };
const MASKABLE = { e: 179, tile: true };
const APPLE = { e: 192, tile: true };

function mark({ e, tile = false }) {
  // one isometric cube; the three far faces are drawn first and show through the tinted near ones.
  // e: how far its corners are from the centre of the 512 grid
  const c = Math.cos(Math.PI / 6);
  const [cx, cy] = [256, 256];
  const V = { top: [cx, cy - e], rt: [cx + e * c, cy - e / 2], rb: [cx + e * c, cy + e / 2], bottom: [cx, cy + e], lb: [cx - e * c, cy + e / 2], lt: [cx - e * c, cy - e / 2], c: [cx, cy] };
  const back = [cx, cy]; // the far corner projects onto the same point as the near one
  const pts = (...p) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  const edge = 'stroke="#ffffff" stroke-opacity="0.55" stroke-width="7" stroke-linejoin="round"';
  const far = `<polygon points="${pts(V.lb, back, V.rb, V.bottom)}" fill="url(#t)" fill-opacity="0.55"/>
    <polygon points="${pts(V.lt, V.top, back, V.lb)}" fill="url(#r)" fill-opacity="0.5"/>
    <polygon points="${pts(V.top, V.rt, V.rb, back)}" fill="url(#l)" fill-opacity="0.5"/>`;
  const near = `<polygon points="${pts(V.top, V.rt, V.c, V.lt)}" fill="url(#t)" fill-opacity="0.92" ${edge}/>
    <polygon points="${pts(V.lt, V.c, V.bottom, V.lb)}" fill="url(#l)" fill-opacity="0.9" ${edge}/>
    <polygon points="${pts(V.c, V.rt, V.rb, V.bottom)}" fill="url(#r)" fill-opacity="0.9" ${edge}/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>
  <linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9bfaf1"/><stop offset="1" stop-color="#2ee6d6"/></linearGradient>
  <linearGradient id="l" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#a58cff"/><stop offset="1" stop-color="#5b3be8"/></linearGradient>
  <linearGradient id="r" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#ff86bd"/><stop offset="1" stop-color="#d81e74"/></linearGradient>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#171a36"/><stop offset="1" stop-color="#07080f"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.55" r="0.5"><stop offset="0" stop-color="#8b6cff" stop-opacity="0.55"/><stop offset="1" stop-color="#8b6cff" stop-opacity="0"/></radialGradient>
</defs>${tile ? `<rect width="512" height="512" fill="url(#bg)"/>${GRID}<circle cx="256" cy="270" r="230" fill="url(#glow)"/>` : ''}${far}${near}</svg>
`;
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon.svg', mark(BARE));

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(file, size, look) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${mark(look)}`);
  await page.screenshot({ path: `public/${file}`, omitBackground: true });
  console.log('public/' + file);
}
await png('favicon-32.png', 32, BARE);
await png('icon-192.png', 192, BARE);
await png('icon-512.png', 512, BARE);
await png('icon-maskable-512.png', 512, MASKABLE); // Android crops this to its own shape
await png('apple-touch-icon.png', 180, APPLE); // iOS rounds the corners and does not support transparency
await browser.close();
