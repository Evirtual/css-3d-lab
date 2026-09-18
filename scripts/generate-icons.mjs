// Draws the brand mark and renders every icon the platforms ask for into public/. Run once, or
// again after changing the mark:  npm run icons   (the outputs are committed; the build does not
// depend on this script).
//
// The mark: one glass cube in the site's colours (see src/logo.ts, which spins it on the site).
// Its far faces are drawn too and show through the tinted near ones.
//  - bare (favicon, icon.svg, app icons with purpose "any"): just the cube, as big as it fits;
//  - on a tile (the maskable icon, the Apple touch icon): a dark square to the edge, because
//    Android crops it to its own shape and iOS fills transparency with black; the cube sits well
//    inside Android's safe zone.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

function mark({ tile = false } = {}) {
  // one isometric cube; the three far faces are drawn first and show through the tinted near ones
  const e = tile ? 118 : 172;
  const c = Math.cos(Math.PI / 6);
  const [cx, cy] = [256, 262];
  const V = { top: [cx, cy - e], rt: [cx + e * c, cy - e / 2], rb: [cx + e * c, cy + e / 2], bottom: [cx, cy + e], lb: [cx - e * c, cy + e / 2], lt: [cx - e * c, cy - e / 2], c: [cx, cy] };
  const back = [cx, cy]; // the far corner projects onto the same point as the near one
  const pts = (...p) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  const edge = 'stroke="#ffffff" stroke-opacity="0.55" stroke-width="7" stroke-linejoin="round"';
  const far = `<polygon points="${pts(V.lb, back, V.rb, V.bottom)}" fill="url(#t)" fill-opacity="0.5"/>
    <polygon points="${pts(V.lt, V.top, back, V.lb)}" fill="url(#r)" fill-opacity="0.45"/>
    <polygon points="${pts(V.top, V.rt, V.rb, back)}" fill="url(#l)" fill-opacity="0.45"/>`;
  const near = `<polygon points="${pts(V.top, V.rt, V.c, V.lt)}" fill="url(#t)" fill-opacity="0.8" ${edge}/>
    <polygon points="${pts(V.lt, V.c, V.bottom, V.lb)}" fill="url(#l)" fill-opacity="0.78" ${edge}/>
    <polygon points="${pts(V.c, V.rt, V.rb, V.bottom)}" fill="url(#r)" fill-opacity="0.78" ${edge}/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>
  <linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9bfaf1"/><stop offset="1" stop-color="#2ee6d6"/></linearGradient>
  <linearGradient id="l" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#a58cff"/><stop offset="1" stop-color="#5b3be8"/></linearGradient>
  <linearGradient id="r" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#ff86bd"/><stop offset="1" stop-color="#d81e74"/></linearGradient>
</defs>${tile ? '<rect width="512" height="512" fill="#100d26"/>' : ''}${far}${near}</svg>
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
