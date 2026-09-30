/**
 * A picture of a model, so a person can look at it.
 *
 *   node scripts/shot.mjs <id> [<id> ...] [--at 0,1200,2400]
 *
 * Writes .media-tmp/shots/<id>-<stage>-<moment>.png: the model's standalone file (what "Copy as
 * one HTML file" hands over) on a card's 360 × 300 canvas, on the dark stage and the light one, at
 * rest and with :hover forced, at each moment asked for (ms into its own timeline; 0 and 1200 by
 * default). Prints each file's path and the box of ink it holds, in vmin.
 *
 * WHY. The contract says whether the 3D is right and whether the motion reads as the thing is for
 * a person to judge by watching, and nothing gave that person anything to watch: every check
 * measures and none saves a picture. On 2026-09-30 a Newton's cradle whose balls swung inward
 * over their neighbours, and a knob whose cap hid its own far ticks, passed every check; three of
 * the eight people adding a model that day wrote a script like this one for themselves.
 *
 * It judges nothing and records nothing for the ledger: it is for eyes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer as createVite } from 'vite';
import { launchChromium } from './browser.mjs';
import { ROOT } from './model-sources.mjs';
import { decode } from './pixels.mjs';

const args = process.argv.slice(2);
const atArg = args.indexOf('--at');
const MOMENTS = atArg >= 0 ? args[atArg + 1].split(',').map(Number) : [0, 1200];
const ids = args.filter((a, i) => !a.startsWith('--') && !(atArg >= 0 && i === atArg + 1));
if (!ids.length) { console.error('shot: which model? node scripts/shot.mjs <id> [<id> ...] [--at 0,1200]'); process.exit(2); }

const W = 360, H = 300;
const OUT = join(ROOT, '.media-tmp', 'shots');
mkdirSync(OUT, { recursive: true });

const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, watch: null } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { snippets } = await vite.ssrLoadModule('/src/models/snippets.ts');
const { standaloneDoc } = await vite.ssrLoadModule('/src/models/snippet-utils.ts');

const unknown = ids.filter((id) => !demos.some((d) => d.id === id));
if (unknown.length) { console.error(`shot: no such model: ${unknown.join(', ')}`); await vite.close(); process.exit(2); }

/** Every animation paused at `ms` into the page's own timeline. */
const AT = (ms) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; } };
const vmin = Math.min(W, H) / 100;
/** The box of ink in a picture, in vmin: where it starts, then its width × height. A pixel is ink when its
    alpha is over 24/255 -- the same bar check-models uses for the canvas edge. */
function inkBox(png) {
  const { width, height, rgba } = decode(png);
  let l = width, t = height, r = -1, b = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (rgba[(y * width + x) * 4 + 3] > 24) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  }
  if (r < 0) return null;
  return `from ${(l / vmin).toFixed(0)},${(t / vmin).toFixed(0)}: ${((r - l + 1) / vmin).toFixed(0)} × ${((b - t + 1) / vmin).toFixed(0)} vmin`;
}

const browser = await launchChromium();
try {
  for (const id of ids) {
    const demo = demos.find((d) => d.id === id);
    for (const stage of ['dark', 'light']) {
      const html = standaloneDoc(demo.title, { how: [], ...snippets[id] }, stage);
      const context = await browser.newContext({ viewport: { width: W, height: H } });
      const page = await context.newPage();
      const url = `${base}/__c3d-file/shot-${id}.html`;
      await page.route(url, (r) => r.fulfill({ contentType: 'text/html', body: html }));
      await page.goto(url, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      for (const ms of MOMENTS) {
        for (const hover of [false, true]) {
          if (hover) await page.evaluate(() => {
            const held = document.querySelector('#c3d-held');
            if (held) held.textContent = (document.querySelector('#c3d-code')?.textContent ?? '').replace(/:hover/g, ':not(.c3d-never)');
          });
          await page.evaluate(AT, ms);
          await page.waitForTimeout(150);
          /* two pictures: the ink is measured on a see-through one (the page paints no backdrop), and
             the file a person opens has the stage painted under it, as the site would paint it */
          const ink = inkBox(await page.screenshot({ omitBackground: true }));
          await page.evaluate((bg) => { document.documentElement.style.background = bg; }, stage === 'dark' ? '#07080f' : '#f3f4fc');
          const png = await page.screenshot();
          await page.evaluate(() => { document.documentElement.style.background = ''; });
          const file = join(OUT, `${id}-${stage}-${ms}ms${hover ? '-hover' : ''}.png`);
          writeFileSync(file, png);
          console.log(`${file.replace(ROOT, '.').replace(/\\/g, '/')}  ink ${ink ?? 'none'}`);
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close().catch(() => {});
  await vite.close().catch(() => {});
}
