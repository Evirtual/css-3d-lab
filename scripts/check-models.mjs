/**
 * Judges every model against docs/VIEW-CONTRACT.md. It does not adjust anything: a model that
 * fails here is a model whose own code has to change.
 *
 *   node scripts/check-models.mjs            every model
 *   node scripts/check-models.mjs cube dice  just these
 *   node scripts/check-models.mjs --pass     list the ones that pass too
 *
 * Everything is reported in vmin, one hundredth of the canvas's short side, which is the unit
 * models are written in. The canvas is the model's frame, so these numbers mean the same thing
 * whatever size the stage is.
 */
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';

const BAND = 70; // the model box, with no controls
const WITH_CONTROLS = 56; // the model box when there is a control zone under it
const FLOOR = 40; // nothing may be smaller than this
const WIDEST = 92; // per cent of the canvas width
const CORNER = 14; // the site's badge and menu live in the top corners
const CENTRED = 4; // how far off the middle a model may sit, in vmin

/** Runs in the frame: what the model draws right now, in vmin, measured from the canvas middle. */
const LOOK = `() => {
  const win = window, doc = document;
  const scene = doc.querySelector('#c3d-scene') || doc.body;
  const unit = Math.min(win.innerWidth, win.innerHeight) / 100;
  const CONTROL = 'button, label, input, select, textarea, a[href], [role="button"], [role="slider"]';
  const held = doc.querySelector('#c3d-held');
  const css = doc.querySelector('#c3d-code')?.textContent ?? '';
  const was = held?.textContent ?? '';
  const animations = doc.getAnimations();
  const saved = animations.map(a => ({ a, t: a.currentTime, state: a.playState }));
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity, controls = false;
  try {
    for (let step = 0; step < 24; step++) {
      if (step === 12 && held) held.textContent = css.replace(/:hover/g, ':not(.c3d-never)');
      for (const a of doc.getAnimations()) {
        const timing = a.effect?.getComputedTiming();
        a.pause();
        a.currentTime = typeof timing?.duration === 'number' ? (timing.delay ?? 0) + timing.duration * (step % 12) / 11 : 0;
      }
      for (const el of scene.querySelectorAll('*')) {
        const cs = win.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        const ink = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' ||
          (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopColor !== 'rgba(0, 0, 0, 0)') ||
          [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) ||
          ['::before', '::after'].some(p => !['none', 'normal'].includes(win.getComputedStyle(el, p).content));
        const box = el.getBoundingClientRect();
        if (!ink || box.width < 1 || box.height < 1) continue;
        if (el.closest(CONTROL)) controls = true;
        l = Math.min(l, box.left); t = Math.min(t, box.top); r = Math.max(r, box.right); b = Math.max(b, box.bottom);
      }
    }
  } finally {
    if (held) held.textContent = was;
    for (const { a, t: time, state } of saved) { a.currentTime = time; if (state === 'running') a.play(); }
  }
  if (!Number.isFinite(l)) return null;
  const mx = win.innerWidth / 2, my = win.innerHeight / 2;
  return {
    width: (r - l) / unit,
    height: (b - t) / unit,
    offX: ((l + r) / 2 - mx) / unit,
    offY: ((t + b) / 2 - my) / unit,
    // how close the drawing comes to each top corner, and how much of the canvas it covers
    corner: Math.min(Math.hypot(Math.max(0, l - 0), Math.max(0, t - 0)), Math.hypot(Math.max(0, win.innerWidth - r), Math.max(0, t - 0))) / unit,
    coversW: (r - l) / win.innerWidth,
    coversH: (b - t) / win.innerHeight,
    controls,
  };
}`;

const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { interactionsOf } = await vite.ssrLoadModule('/src/models/interaction.ts');
const args = process.argv.slice(2);
const showPasses = args.includes('--pass');
const wanted = args.filter((a) => !a.startsWith('-'));
const ids = wanted.length ? wanted : demos.map((d) => d.id);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('  page error:', e.message));

const widest = (a, b) => {
  if (!a || !b) return a ?? b;
  return {
    ...b,
    width: Math.max(a.width, b.width),
    height: Math.max(a.height, b.height),
    offX: Math.abs(a.offX) > Math.abs(b.offX) ? a.offX : b.offX,
    offY: Math.abs(a.offY) > Math.abs(b.offY) ? a.offY : b.offY,
    corner: Math.min(a.corner, b.corner),
    coversW: Math.max(a.coversW, b.coversW),
    coversH: Math.max(a.coversH, b.coversH),
    controls: a.controls || b.controls,
  };
};
const look = () => page.frameLocator('iframe').locator('body').evaluate(new Function('return ' + LOOK)()).catch(() => null);

const rows = [];
for (const id of ids) {
  const demo = demos.find((d) => d.id === id);
  await page.goto(`${base}/embed/${id}/`, { waitUntil: 'domcontentloaded' });
  const there = await page.waitForSelector('iframe[data-ready="true"]', { timeout: 20_000 }).then(() => true).catch(() => false);
  if (!there) {
    rows.push({ id, broke: ['never appeared'] });
    console.log(`FAILS   ${id.padEnd(14)} never appeared`);
    continue;
  }
  await page.waitForTimeout(200);
  let seen = await look();
  const box = await page.locator('.stage[data-demo], .stage').first().boundingBox();
  if (box && seen) {
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const frame = page.frameLocator('iframe');
    for (const way of demo ? interactionsOf(demo) : []) {
      if (way === 'click') {
        const controls = frame.locator('#c3d-scene button:not([disabled]), #c3d-scene label, #c3d-scene input[type="radio"], #c3d-scene input[type="checkbox"]');
        const many = Math.min(await controls.count(), 6);
        for (let i = 0; i < many; i++) {
          await controls.nth(i).click({ force: true, timeout: 4000 }).catch(() => {});
          await page.waitForTimeout(400);
          seen = widest(seen, await look());
        }
        if (!many) { await page.mouse.click(cx, cy); await page.waitForTimeout(400); seen = widest(seen, await look()); }
      } else if (way === 'drag') {
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        for (const dx of [-110, 110]) { await page.mouse.move(cx + dx, cy + 20, { steps: 6 }); await page.waitForTimeout(220); seen = widest(seen, await look()); }
        await page.mouse.up();
      } else if (way === 'move' || way === 'hover') {
        for (const [dx, dy] of [[-0.4, -0.4], [0.4, -0.4], [0.4, 0.4], [-0.4, 0.4]]) {
          await page.mouse.move(cx + box.width * dx, cy + box.height * dy, { steps: 4 });
          await page.waitForTimeout(220);
          seen = widest(seen, await look());
        }
      } else if (way === 'scroll') {
        await page.mouse.move(cx, cy);
        for (const by of [400, -800]) { await page.mouse.wheel(0, by); await page.waitForTimeout(300); seen = widest(seen, await look()); }
      }
    }
  }

  const broke = [];
  if (!seen) broke.push('nothing drawn');
  else {
    const full = seen.coversW >= 0.95 && seen.coversH >= 0.95;
    const tallest = seen.controls ? WITH_CONTROLS : BAND;
    if (full) {
      // a full-canvas model is judged only on actually filling the canvas
      if (seen.coversW < 0.98 || seen.coversH < 0.98) broke.push(`claims the canvas but leaves a gap`);
    } else {
      if (seen.height > tallest) broke.push(`${seen.height.toFixed(0)}vmin tall, over ${tallest}`);
      if (seen.height < FLOOR) broke.push(`${seen.height.toFixed(0)}vmin tall, under ${FLOOR}`);
      if (seen.width > WIDEST) broke.push(`${seen.width.toFixed(0)}vmin wide, over ${WIDEST}`);
      if (Math.abs(seen.offX) > CENTRED) broke.push(`${seen.offX.toFixed(0)}vmin off centre sideways`);
      if (Math.abs(seen.offY) > CENTRED + (seen.controls ? 7 : 0)) broke.push(`${seen.offY.toFixed(0)}vmin off centre vertically`);
      if (seen.corner < CORNER) broke.push(`within ${seen.corner.toFixed(0)}vmin of a top corner`);
    }
  }
  rows.push({ id, broke, seen });
  if (broke.length) console.log(`FAILS   ${id.padEnd(14)} ${broke.join('; ')}`);
  else if (showPasses) console.log(`holds   ${id.padEnd(14)} ${seen.width.toFixed(0)} × ${seen.height.toFixed(0)} vmin${seen.controls ? ', with controls' : ''}`);
  else process.stdout.write('.');
}

const bad = rows.filter((r) => r.broke.length);
console.log(`\n${rows.length - bad.length}/${rows.length} models hold the contract.`);
if (bad.length) console.log('To rewrite: ' + bad.map((r) => r.id).join(', '));
await browser.close();
await vite.close();
process.exit(bad.length ? 1 : 0);
