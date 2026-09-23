/**
 * Does editing a model leave its live frame alone? On /models/cube/ (served from source by Vite,
 * no build needed) it pauses the animations at 1137 ms, then asserts that the frame's document,
 * the cube's box, the scene's zoom and the animation clocks are unchanged after: a whitespace-only
 * CSS edit, a colour edit, "Reset to original", and opening the Image dialog (whose live view must
 * keep the same document). Exits non-zero on the first difference or any page error.
 *
 *   node scripts/preview-check.mjs
 */
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { launchChromium } from './browser.mjs';

const vite = await createServer({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await vite.listen();
const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(vite.resolvedUrls.local[0] + 'models/cube/');
  await page.waitForSelector('iframe[data-ready="true"]');
  const read = () => page.evaluate(() => {
    const f = document.querySelector('[data-demo] iframe');
    const d = f.contentDocument;
    const el = d.querySelector('.cube');
    const r = el.getBoundingClientRect();
    return { marker: d.body.dataset.test, rect: [r.x, r.y, r.width, r.height], zoom: d.querySelector('#c3d-scene').style.zoom, times: d.getAnimations().map(a => Number(a.currentTime)) };
  });
  await page.evaluate(() => {
    const d = document.querySelector('[data-demo] iframe').contentDocument;
    d.body.dataset.test = 'persistent';
    for (const a of d.getAnimations()) { a.pause(); a.currentTime = 1137; }
  });
  const before = await read();
  const editor = page.getByRole('textbox', { name: 'CSS code, editable', exact: true });
  const original = await editor.inputValue();
  await editor.fill(original + '\n/* whitespace must not remount or reframe */');
  await page.waitForTimeout(600);
  const after = await read();
  assert.deepEqual(after, before, 'CSS edit changed document, framing or paused animation');
  await editor.fill(original + '\n.cube > * { color: rgb(255, 0, 0); }');
  await page.waitForTimeout(600);
  assert.deepEqual(await read(), before, 'Color edit changed document or geometry');
  await page.locator('[data-reset]').click();
  await page.waitForTimeout(100);
  assert.deepEqual(await read(), before, 'Reset remounted unchanged markup');
  await page.locator('[data-make="image"]').first().click();
  await page.waitForTimeout(400);
  assert.equal(await page.locator('[data-live] iframe').evaluate(f => f.contentDocument.body.dataset.test), 'persistent', 'Opening export lost live document');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS: CSS edits, color change, reset, animation pose, export modal document continuity');
} finally { await browser.close(); await vite.close(); }
