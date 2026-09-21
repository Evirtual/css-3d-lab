/**
 * Measures where each model sits in its frame and writes src/models/placements.json.
 *
 * The measuring itself is not done here: the page does it, with the very code the site runs
 * (reachOf and placeIn in src/preview.ts). This script opens each model, plays with it the way
 * its badge says it is played with — hover, click, drag, scroll — and asks after each state how
 * far the model now reaches. Where the model sits and how big it is come from what it shows on
 * its own; what it does when it is played with can only make it smaller, so a menu that swings
 * open on a click stays inside the frame instead of hanging over the edge.
 *
 *   node scripts/measure-placement.mjs            every model
 *   node scripts/measure-placement.mjs cube dice  just these, leaving the rest of the file alone
 *
 * A model the measuring gets wrong is corrected by hand in src/models/placement-overrides.json,
 * which this script never touches and which wins wherever the model is drawn.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';

const FILE = new URL('../src/models/placements.json', import.meta.url);

const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { interactionsOf } = await vite.ssrLoadModule('/src/models/interaction.ts');
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const ids = wanted.length ? wanted : demos.map((d) => d.id);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.addInitScript(() => { window.__c3dRemeasure = true; });
page.on('pageerror', (e) => console.log('  page error:', e.message));

/** Asks the page how far the model reaches in the state it is in now, and widens what we have. */
const widen = (had) =>
  page.evaluate(async ([before]) => {
    const { reachOf, widen } = await import('/src/preview.ts');
    const frame = document.querySelector('iframe');
    const doc = frame?.contentDocument;
    const scene = doc?.querySelector('#c3d-scene');
    if (!scene) return before;
    const css = doc.querySelector('#c3d-code')?.textContent ?? '';
    return widen(before, reachOf(scene, css));
  }, [had]);

const out = JSON.parse(readFileSync(FILE, 'utf8'));
let done = 0;
for (const id of ids) {
  const demo = demos.find((d) => d.id === id);
  await page.goto(`${base}/embed/${id}/`, { waitUntil: 'domcontentloaded' });
  const there = await page
    .waitForFunction(() => document.querySelector('iframe[data-placement]')?.dataset.placement, null, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!there) {
    console.log(`  ${id}: never appeared — left as it was`);
    continue;
  }
  await page.waitForTimeout(150);

  const shows = await widen(null);
  let played = shows;
  const box = await page.locator('.stage[data-demo], .stage').first().boundingBox();
  const ways = demo ? interactionsOf(demo) : [];
  if (box) {
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const frame = page.frameLocator('iframe');
    for (const way of ways) {
      if (way === 'click') {
        // every control, one after another: a menu that opens, a slide that advances, a face that
        // turns — each leaves the model somewhere else, and all of it has to fit the same frame
        const controls = frame.locator('#c3d-scene button:not([disabled]), #c3d-scene label, #c3d-scene input[type="radio"], #c3d-scene input[type="checkbox"]');
        const many = Math.min(await controls.count(), 8);
        for (let i = 0; i < many; i++) {
          await controls.nth(i).click({ force: true, timeout: 4000 }).catch(() => {});
          await page.waitForTimeout(450);
          played = await widen(played);
        }
        if (!many) {
          await page.mouse.click(cx, cy);
          await page.waitForTimeout(450);
          played = await widen(played);
        }
        const sliders = frame.locator('#c3d-scene input[type="range"]');
        if (await sliders.count()) {
          for (const end of ['Home', 'End']) {
            await sliders.first().press(end).catch(() => {});
            await page.waitForTimeout(350);
            played = await widen(played);
          }
        }
      } else if (way === 'drag') {
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        for (const dx of [-110, 110]) {
          await page.mouse.move(cx + dx, cy + 20, { steps: 8 });
          await page.waitForTimeout(250);
          played = await widen(played);
        }
        await page.mouse.up();
      } else if (way === 'move' || way === 'hover') {
        // the corners: a model that leans toward the pointer leans furthest there
        for (const [dx, dy] of [[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]]) {
          await page.mouse.move(cx + box.width * dx, cy + box.height * dy, { steps: 4 });
          await page.waitForTimeout(250);
          played = await widen(played);
        }
      } else if (way === 'scroll') {
        await page.mouse.move(cx, cy);
        for (const by of [400, -800]) {
          await page.mouse.wheel(0, by);
          await page.waitForTimeout(350);
          played = await widen(played);
        }
      }
    }
  }

  const placement = await page.evaluate(async ([own, all]) => {
    const { placeIn } = await import('/src/preview.ts');
    return placeIn(own, undefined, undefined, all);
  }, [shows, played]);
  out[id] = placement;
  done++;
  process.stdout.write('.');
}

// keyed in the order models are listed, so the file reads like the gallery and diffs stay small
const sorted = {};
for (const d of demos) if (out[d.id]) sorted[d.id] = out[d.id];
for (const [id, place] of Object.entries(out)) if (!sorted[id]) sorted[id] = place;
writeFileSync(FILE, JSON.stringify(sorted, null, 0).replaceAll('},', '},\n ').replace('{"', '{\n "').replace(/}$/, '\n}') + '\n');
console.log(`\nmeasured ${done}/${ids.length} models`);
await browser.close();
await vite.close();
