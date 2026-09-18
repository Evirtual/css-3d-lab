// Draws the brand mark (an isometric cube in the site's gradient) and renders every icon the
// platforms ask for into public/. Run once, or again after changing the mark:  npm run icons
// The outputs are committed, so the normal build does not depend on this script.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

// Cube geometry on a 512 grid: centre (256,256), vertical edge 160, half-width 138.
const P = { top: '256,96', rt: '394,176', rb: '394,336', bottom: '256,416', lb: '118,336', lt: '118,176', c: '256,256' };

/**
 * Two kinds of icon:
 *  - bare (favicon, app icons with purpose "any", icon.svg): just the cube, no background, as big
 *    as the square allows (it spans about 94% of the height), so it reads at 16-32 px;
 *  - on a background (the maskable icon, the Apple touch icon): a square to the very edge, because
 *    Android crops it to a circle / squircle and iOS fills transparency with black. The cube is
 *    scaled to sit inside Android's safe zone (a circle of 80% of the width) with room to spare.
 * The cube's corners are at most 160 units from the centre of the 512 grid; `scale` sizes it.
 */
const mark = ({ bleed, scale }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#171a36"/><stop offset="1" stop-color="#07080f"/></linearGradient>
    <linearGradient id="top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ff5ea"/><stop offset="1" stop-color="#2ee6d6"/></linearGradient>
    <linearGradient id="left" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9d83ff"/><stop offset="1" stop-color="#6a45f5"/></linearGradient>
    <linearGradient id="right" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6fb0"/><stop offset="1" stop-color="#e0257a"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.55" r="0.5"><stop offset="0" stop-color="#8b6cff" stop-opacity="0.55"/><stop offset="1" stop-color="#8b6cff" stop-opacity="0"/></radialGradient>
  </defs>
  ${bleed ? '<rect width="512" height="512" fill="url(#bg)"/><circle cx="256" cy="270" r="230" fill="url(#glow)"/>' : ''}
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)" stroke="#07080f" stroke-width="${(6 / scale).toFixed(2)}" stroke-linejoin="round">
    <polygon points="${P.top} ${P.rt} ${P.c} ${P.lt}" fill="url(#top)"/>
    <polygon points="${P.lt} ${P.c} ${P.bottom} ${P.lb}" fill="url(#left)"/>
    <polygon points="${P.c} ${P.rt} ${P.rb} ${P.bottom}" fill="url(#right)"/>
  </g>
</svg>
`;

mkdirSync('public', { recursive: true });
const BARE = { bleed: false, scale: 1.5 }; // 160 x 1.5 = 240 of the 256 half-width: nearly edge to edge
const MASKABLE = { bleed: true, scale: 1.12 }; // 179 of Android's 205 safe radius
const APPLE = { bleed: true, scale: 1.2 }; // iOS only rounds the corners, so a little bigger

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
