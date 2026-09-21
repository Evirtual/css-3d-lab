/**
 * Measures where each model sits in its frame and writes src/models/placements.json.
 *
 * The measuring is not done here: the page does it, with the very code the site runs
 * (Preview.measure in src/preview.ts). This script only opens each model with the "measure again"
 * flag set and writes down the answer, so the file can never drift from the rule.
 *
 *   node scripts/measure-placement.mjs            every model
 *   node scripts/measure-placement.mjs cube dice  just these, leaving the rest of the file alone
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';

const FILE = new URL('../src/models/placements.json', import.meta.url);

const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const ids = wanted.length ? wanted : demos.map((d) => d.id);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.addInitScript(() => { window.__c3dRemeasure = true; });
page.on('pageerror', (e) => console.log('  page error:', e.message));

const out = JSON.parse(readFileSync(FILE, 'utf8'));
let done = 0;
for (const id of ids) {
  await page.goto(`${base}/embed/${id}/`, { waitUntil: 'domcontentloaded' });
  const placement = await page
    .waitForFunction(() => document.querySelector('iframe[data-placement]')?.dataset.placement, null, { timeout: 20_000 })
    .then((h) => h.jsonValue())
    .catch(() => null);
  if (!placement) {
    console.log(`  ${id}: no measurement — left as it was`);
    continue;
  }
  out[id] = JSON.parse(placement);
  done++;
}

// keyed in the order models are listed, so the file reads like the gallery and diffs stay small
const sorted = {};
for (const d of demos) if (out[d.id]) sorted[d.id] = out[d.id];
for (const [id, place] of Object.entries(out)) if (!sorted[id]) sorted[id] = place;
writeFileSync(FILE, JSON.stringify(sorted, null, 0).replaceAll('},', '},\n ').replace('{"', '{\n "').replace(/}$/, '\n}') + '\n');
console.log(`measured ${done}/${ids.length} models`);
await browser.close();
await vite.close();
