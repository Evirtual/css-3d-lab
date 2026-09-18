// Draws the brand mark and renders every icon the platforms ask for into public/. Run once, or
// again after changing the mark:  npm run icons   (the outputs are committed; the build does not
// depend on this script).
//
// The mark: one glass cube in the site's colours (see src/logo.ts, which spins it on the site).
// Its far faces are drawn too and show through the tinted near ones.
//  - bare (favicon, icon.svg, app icons with purpose "any"): just the cube, no background, nearly
//    edge to edge (its corners 240 of the 256 half-width from the centre), so it reads at 16-32 px;
//  - on a tile (the maskable icon, the Apple touch icon): a flat square to the edge in the splash
//    screen's colour (manifest background_color, the page's --bg), just the cube on it, because
//    Android crops it to its own shape and iOS fills transparency with black. On the maskable icon
//    the cube stays inside Android's safe zone (a circle of 80% of the width: radius 205); iOS
//    only rounds the corners, so there it is a little bigger.
// These sizes are the ones the icons have always had; only the look of the cube changed.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

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
</defs>${tile ? '<rect width="512" height="512" fill="#07080f"/>' : ''}${far}${near}</svg>
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
await png('favicon-16.png', 16, BARE);
await png('favicon-32.png', 32, BARE);
await png('favicon-48.png', 48, BARE); // Google wants a favicon a multiple of 48px
await png('icon-192.png', 192, BARE);
await png('icon-512.png', 512, BARE);
await png('icon-maskable-512.png', 512, MASKABLE); // Android crops this to its own shape
await png('apple-touch-icon.png', 180, APPLE); // iOS rounds the corners and does not support transparency
await browser.close();

// favicon.ico at the root: search engines and old browsers ask for it by that name whatever the
// page says. An ICO can simply hold PNGs: a 6-byte header, a 16-byte entry per size, the files.
const sizes = [16, 32, 48];
const pngs = sizes.map((n) => readFileSync(`public/favicon-${n}.png`));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2); // 1 = icon
head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((n, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(n, e); // width
  head.writeUInt8(n, e + 1); // height
  head.writeUInt16LE(1, e + 4); // colour planes
  head.writeUInt16LE(32, e + 6); // bits per pixel
  head.writeUInt32LE(pngs[i].length, e + 8);
  head.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
writeFileSync('public/favicon.ico', Buffer.concat([head, ...pngs]));
console.log('public/favicon.ico');
