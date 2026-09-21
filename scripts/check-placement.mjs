/**
 * Is a model framed the same way everywhere?
 *
 * For every model this opens the gallery card, the viewer dialog, the model's own page and the
 * same page with an edit saved, then measures two things on each:
 *
 *   reach   where the model is drawn inside its own frame, as fractions of that frame
 *           (cx/cy is the middle of the drawing, w/h its size — 0.667 is the house rule)
 *   frame   where that frame sits in the stage, as fractions of the stage
 *
 * The model is framed consistently when `reach` is the same on every surface and every frame is
 * centred in its stage. A surface that differs is printed, and the run fails.
 *
 *   node scripts/check-placement.mjs            every model
 *   node scripts/check-placement.mjs cube dice  just these
 */
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';

const TOLERANCE = 0.02;

/** Runs in the page: the drawn reach of `root`, in the model's own units (its zoom divided out). */
const REACH = `(root, zoom) => {
  const win = root.ownerDocument.defaultView;
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  const origin = root.getBoundingClientRect();
  for (const el of root.querySelectorAll('*')) {
    const cs = win.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const ink = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' ||
      (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopColor !== 'rgba(0, 0, 0, 0)') ||
      [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) ||
      ['::before', '::after'].some(p => !['none', 'normal'].includes(win.getComputedStyle(el, p).content));
    const box = el.getBoundingClientRect();
    if (!ink || box.width < 1 || box.height < 1) continue;
    l = Math.min(l, box.left); t = Math.min(t, box.top); r = Math.max(r, box.right); b = Math.max(b, box.bottom);
  }
  if (!Number.isFinite(l)) return null;
  // In the model's own units: its size, and how far its middle sits from the middle of the frame.
  // Those are what must not change between a card, the viewer, a page and an edit.
  return {
    cx: ((l + r) / 2 - (origin.left + origin.width / 2)) / zoom,
    cy: ((t + b) / 2 - (origin.top + origin.height / 2)) / zoom,
    w: (r - l) / zoom,
    h: (b - t) / zoom,
    fills: (b - t) / origin.height,
    // a model drawn right to the sides of its frame is meant to, and is allowed to be wider on a
    // wider stage; its height and its middle still have to match everywhere
    bleeds: (r - l) >= origin.width * 0.98,
  };
}`;

/** Runs in the page: the model's frame inside `stage`, and the reach inside that frame. */
const MEASURE = `(stage) => {
  const reach = ${REACH};
  if (!stage) return null;
  const box = stage.getBoundingClientRect();
  const frame = stage.querySelector('iframe');
  const here = (rect) => ({ x: (rect.left - box.left) / box.width, y: (rect.top - box.top) / box.height, w: rect.width / box.width, h: rect.height / box.height });
  if (!frame) {
    const inner = stage.firstElementChild;
    return inner ? { frame: here(box), reach: reach(stage, 1), kind: 'inline' } : null;
  }
  const doc = frame.contentDocument;
  if (!doc || !doc.body) return null;
  // Same moment of the animation everywhere, or a spinning model would measure differently on
  // each surface simply because it was caught at a different angle.
  for (const a of doc.getAnimations()) { try { a.pause(); a.currentTime = 0; } catch {} }
  doc.body.getBoundingClientRect();
  const scene = doc.querySelector('#c3d-scene');
  const zoom = parseFloat(scene?.style.zoom || '1') || 1;
  return { frame: here(frame.getBoundingClientRect()), reach: reach(doc.body, zoom), zoom, kind: 'frame' };
}`;

// Sizes and offsets are in the model's own pixels, so the same picture at a different stage size
// gives the same numbers. A model may be a few pixels wider mid-animation, hence a small margin.
const PIXELS = 4;
// A model whose own layout is written in percentages follows the stage it is on, so a few per
// cent either way is the model doing what it was written to do, not a framing difference.
const near = (a, b) => Math.abs(a - b) <= Math.max(PIXELS, 0.04 * Math.max(Math.abs(a), Math.abs(b)));
const sameReach = (a, b) => {
  if (!a?.reach || !b?.reach) return false;
  const keys = a.reach.bleeds || b.reach.bleeds ? ['cx', 'cy', 'h'] : ['cx', 'cy', 'w', 'h'];
  return keys.every((k) => near(a.reach[k], b.reach[k]));
};
const centred = (p) => p?.frame && Math.abs(p.frame.x + p.frame.w / 2 - 0.5) <= TOLERANCE && Math.abs(p.frame.y + p.frame.h / 2 - 0.5) <= TOLERANCE;
const show = (p) =>
  p?.reach
    ? `${Math.round(p.reach.w)}×${Math.round(p.reach.h)} px, ${p.reach.cx >= 0 ? '+' : ''}${Math.round(p.reach.cx)},${p.reach.cy >= 0 ? '+' : ''}${Math.round(p.reach.cy)} from the middle, filling ${(p.reach.fills * 100).toFixed(0)}% of the stage`
    : 'nothing drawn';

const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const ids = wanted.length ? wanted : demos.map((d) => d.id);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('  page error:', e.message));

/** Waits until the stage holds a model that has finished starting up. */
const settle = async (where) => {
  await page
    .waitForFunction(
      (sel) => {
        const stage = document.querySelector(sel);
        if (!stage) return false;
        const frame = stage.querySelector('iframe');
        if (frame) return frame.dataset.ready === 'true';
        return Boolean(stage.firstElementChild?.childElementCount);
      },
      where,
      { timeout: 15_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(300);
};

const measure = async (sel) => {
  for (let go = 0; go < 3; go++) {
    try {
      return await page.evaluate(([code, s]) => new Function('return ' + code)()(document.querySelector(s)), [MEASURE, sel]);
    } catch (error) {
      // a page still settling can navigate under the measurement; give it a moment and look again
      if (go === 2) throw error;
      await page.waitForTimeout(500);
    }
  }
  return null;
};

const rows = [];
for (const id of ids) {
  const at = {};
  // 1. the card in the gallery
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.card', { timeout: 15_000 });
  // The gallery shows a first batch and keeps the rest behind "show more": open enough of them
  // for this model's card to have a box on the page at all.
  await page.evaluate(async (mid) => {
    const of = () => document.querySelector(`.card:has([data-open="${mid}"])`);
    for (let i = 0; i < 20 && of() && !of().getBoundingClientRect().width; i++) {
      document.querySelector('[data-more]')?.click();
      await new Promise((r) => setTimeout(r, 120));
    }
    const card = of();
    card?.scrollIntoView({ block: 'center' });
    card?.setAttribute('data-probe', '');
  }, id);
  await settle('.card[data-probe] .stage');
  at.card = await measure('.card[data-probe] .stage');

  // 2. the viewer dialog, opened from that card
  await page.evaluate((mid) => document.querySelector(`[data-open="${mid}"]`)?.click(), id);
  await settle('dialog[open] .stage');
  at.viewer = await measure('dialog[open] .stage');

  // 3. the model's own page
  await page.goto(`${base}/models/${id}/`, { waitUntil: 'domcontentloaded' });
  await settle('.stage[data-demo]');
  at.page = await measure('.stage[data-demo]');

  // 4. the same page with an edit saved: a comment, which changes nothing that is drawn
  const edited = await page.evaluate((mid) => {
    const css = document.querySelector('[data-pane-body="css"] pre code')?.textContent;
    if (!css) return false;
    localStorage.setItem(`c3d-edit:${mid}`, JSON.stringify({ css: css + '\n/* edited */' }));
    return true;
  }, id);
  if (edited) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await settle('.stage[data-demo]');
    at.edited = await measure('.stage[data-demo]');
    await page.evaluate((mid) => localStorage.removeItem(`c3d-edit:${mid}`), id);
  }

  const off = Object.keys(at).filter((k) => k !== 'card' && !sameReach(at.card, at[k]));
  const loose = Object.keys(at).filter((k) => !centred(at[k]));
  rows.push({ id, at, off, loose });
  const trouble = [...off, ...loose.map((k) => k + ' (off centre)')];
  console.log(
    `${trouble.length ? 'DIFFERS' : 'same   '} ${id.padEnd(14)} card ${show(at.card)}` +
      (trouble.length ? '\n' + [...new Set([...off, ...loose])].map((k) => `          ${k.padEnd(7)} ${show(at[k])}`).join('\n') : ''),
  );
}

const bad = rows.filter((r) => r.off.length || r.loose.length);
console.log(`\n${rows.length - bad.length}/${rows.length} models are framed the same everywhere.`);
if (bad.length) console.log('Differ: ' + bad.map((r) => r.id).join(', '));
await browser.close();
await vite.close();
process.exit(bad.length ? 1 : 0);
