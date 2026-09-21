/**
 * Judges the OTHER half of docs/VIEW-CONTRACT.md: not "does the model fit the band" (that is
 * scripts/check-models.mjs) but "is it the same model everywhere". A model is measured in vmin of
 * its own canvas on every surface the site shows it on, and the numbers have to agree.
 *
 *   node scripts/check-stages.mjs             every converted model
 *   node scripts/check-stages.mjs dice tiles  just these
 *   node scripts/check-stages.mjs --json      the raw numbers as JSON on stdout
 *   node scripts/check-stages.mjs --tol 1.5   how much disagreement is allowed, in vmin
 *
 * The surfaces:
 *   card        the gallery card on /
 *   viewer      the dialog that card opens
 *   page        /models/<id>/
 *   edit-live   the same page with a comment typed into the CSS editor (nothing drawn changes)
 *   edit-reset  ...and after "Reset to original"
 *   edit-saved  a fresh load of the page with that edit already in localStorage c3d-edit:<id>
 *   large       the page at 1600 × 1000
 *   fullscreen  ...with the stage put full screen
 *   1:1 4:3 3:2 16:9 9:16   the export dialog's canvas at each shape
 *
 * Every surface gives the model a different canvas, so nothing here compares pixels: everything is
 * in vmin of the canvas the model is in, which is the unit the contract is written in. A model that
 * holds the contract has the same width, height and offset on every line.
 *
 * Transitions are measured too — before an action, at the first frame the model is measurable
 * again, and after it has settled — because a number that is right at both ends can still jump.
 *
 * Half of these models answer the pointer, so the pointer is part of the measurement: before a
 * settled reading it is parked in the same corner of the canvas on every surface, so a model that
 * tilts, glows or opens under it does so the same way everywhere and the surfaces stay comparable.
 * The reading taken straight after an action leaves the pointer alone, so what it catches is the
 * action's doing and not the tool's.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';

/**
 * What the site was, in one number, so a report can say whether it was still that at the end.
 * A model or a stylesheet saved halfway through a run would otherwise be invisible in the table:
 * the first models measured would be one site and the last ones another.
 */
function siteStamp(dir = 'src', stamp = { files: 0, latest: 0 }) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) siteStamp(path, stamp);
    else if (/\.(ts|scss|json|html)$/.test(entry.name)) {
      stamp.files++;
      stamp.latest = Math.max(stamp.latest, statSync(path).mtimeMs);
    }
  }
  return stamp;
}

/**
 * Runs in the model's frame: what the model draws, in vmin, measured from the canvas middle.
 * It is scripts/check-models.mjs's own measurement, with the canvas size added to what it returns,
 * so a number here means exactly what a number there means. It sweeps the whole animation (and a
 * forced :hover) and keeps the widest extent, then puts every clock back where it found it.
 */
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
    canvasW: win.innerWidth,
    canvasH: win.innerHeight,
    controls,
  };
}`;
const lookFn = new Function('return ' + LOOK)();

/** The models this pass is about: the ones already written to the contract. */
const CONVERTED = ['candles', 'dice', 'turntable', 'cubenav', 'explode', 'sphere', 'cubegrid', 'tilt', 'paycard', 'door', 'ripple', 'wavegrid', 'tiles'];
const SHAPES = ['1:1', '4:3', '3:2', '16:9', '9:16'];
const STAGES = ['card', 'viewer', 'page', 'edit-live', 'edit-reset', 'edit-saved', 'large', 'fullscreen', ...SHAPES];

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const tolArg = args.indexOf('--tol');
const TOL = tolArg >= 0 ? Number(args[tolArg + 1]) : 2; // vmin: "the same within a couple of vmin"
const wanted = args.filter((a, i) => !a.startsWith('-') && !(tolArg >= 0 && i === tolArg + 1));
const ids = wanted.length ? wanted : CONVERTED;

const say = (line) => { if (!asJson) console.log(line); };
const n1 = (v) => (v >= 0 ? ' ' : '') + v.toFixed(1);
const show = (s) => (s ? `${s.width.toFixed(1)}×${s.height.toFixed(1)} @${n1(s.offX)},${n1(s.offY)}` : '—');

// No watcher and no HMR: a model file saved while this is running would otherwise reload the page
// under the measurement, and half a run would be of one version of the model and half of another.
const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0, watch: null, hmr: false } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { snippets } = await vite.ssrLoadModule('/src/models/snippets.ts');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on('pageerror', (e) => say(`  page error: ${e.message}`));

/**
 * Measures the model inside the one frame under `selector`. Returns null, never a guess, when
 * there is no frame there or it never says it is ready.
 */
async function look(selector, { timeout = 20_000, settle = false, park = true } = {}) {
  const handle = await page.waitForSelector(`${selector} iframe[data-ready="true"]`, { timeout, state: 'attached' }).catch(() => null);
  if (!handle) return null;
  const frame = await handle.contentFrame().catch(() => null);
  if (!frame) return null;
  // The pointer is parked in the same corner of the canvas on every stage. Half of these models
  // answer the pointer, so it has to be somewhere; what must not differ between two stages is
  // WHERE, in the model's own canvas. (Off the canvas is not available: full screen is the
  // canvas.) A model's hover and drag extents are check-models' business, not this tool's.
  // Two moves, not one: a mouse already sitting on the spot sends nothing, and a model that
  // answers the pointer would then be measured at rest on one stage and pointed at on the next.
  let box = await handle.boundingBox().catch(() => null);
  let parked = !park;
  for (let tries = 0; park && box && tries < 3 && !parked; tries++) {
    // A tenth of the way in from the top left: the same PLACE in the model's own canvas on every
    // surface, and clear of the middle, where most of these models are drawn.
    const x = box.x + box.width * 0.1;
    const y = box.y + box.height * 0.1;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2).catch(() => {});
    // a model that has only just mounted may not have its pointer listener on yet, and a move
    // that lands too early leaves it at rest while every other surface has it pointed at
    await page.waitForTimeout(150);
    await page.mouse.move(x, y, { steps: 3 }).catch(() => {});
    // ...and the pointer has to be ON the model: a card still sliding into place, or a bar of the
    // site's own chrome, can leave it on the page instead, and then one surface is measured at
    // rest and the next one pointed at. Checked rather than assumed, and said so when it fails.
    parked = await page
      .evaluate(([x, y]) => document.elementFromPoint(x, y)?.tagName === 'IFRAME', [x, y])
      .catch(() => false);
    if (!parked) {
      await page.waitForTimeout(300);
      box = await handle.boundingBox().catch(() => box);
    }
  }
  // A model that is still gliding into place is measured mid-glide, which is a moment, not a
  // layout. Settled measurements wait for its transitions to land first.
  if (settle) {
    await page.waitForTimeout(200); // let the pointer's own transitions start before waiting on them
    await frame.evaluate(() => Promise.race([
      Promise.allSettled(document.getAnimations().filter((a) => a.constructor.name === 'CSSTransition').map((a) => a.finished)),
      new Promise((done) => setTimeout(done, 2500)),
    ])).catch(() => {});
  }
  const seen = await frame.evaluate(lookFn).catch(() => null);
  if (!seen) return null;
  // the canvas the model was given, on the page's own scale: proof the frame really fills the stage
  return { ...seen, frameW: box?.width ?? null, frameH: box?.height ?? null, parked };
}

/**
 * An action, then the model as soon as it can be measured, and again once it has settled. The
 * first is what the eye would catch; the second is the layout the stage ends up with.
 */
async function move(label, selector, act, settle = 700) {
  await act();
  // Nothing touches the pointer for this one: the question is whether the ACTION moved the model,
  // and parking the pointer first would answer a different question on a model that follows it.
  const first = await look(selector, { park: false });
  await page.waitForTimeout(settle);
  const after = await look(selector, { settle: true });
  return { label, first, after };
}

const CARD = (id) => `.card:has([data-open="${id}"]) .stage`;
const VIEWER = '#viewer .stage--lg';
const PAGE = '.stage-wrap .stage';
const MAKER = '.maker [data-frame] .stage';

/**
 * Brings one card onto the screen. The grid reveals a page of cards at a time, so the search box
 * is used rather than scrolling through everything: a card's width comes from the grid's track,
 * which is the same whether one card matches or all of them do.
 */
async function revealCard(id, title) {
  const sel = CARD(id);
  await page.fill('#search', title);
  await page.waitForTimeout(400);
  for (let i = 0; i < 12 && !(await page.locator(sel).isVisible().catch(() => false)); i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
  }
  await page.locator(sel).scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600); // mounted, and no longer .is-offscreen (so not paused)
}

/** So a report can be pinned to the version of the model it was made from. */
const fingerprint = (text) => {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0');
};

const before = siteStamp();
const results = [];
for (const id of ids) {
  const row = { id, css: snippets?.[id]?.css ? fingerprint(snippets[id].css) : null, stages: {}, moves: [], notes: [] };
  results.push(row);
  say(`\n${id}`);
  try {

  /* ---------- the gallery card, and the dialog it opens ---------- */
  await context.clearCookies();
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const demo = demos.find((d) => d.id === id);
  if (!demo) { row.notes.push('no such model'); say('  no such model'); continue; }
  await revealCard(id, demo.title);
  row.stages.card = await look(CARD(id), { settle: true });

  const open = await move('card → viewer', VIEWER, async () => {
    await page.locator(`[data-open="${id}"]`).click();
  });
  row.stages.viewer = open.after ?? open.first;
  row.moves.push({ ...open, before: row.stages.card });

  const shut = await move('viewer → card', CARD(id), async () => {
    await page.keyboard.press('Escape');
  }, 600);
  row.moves.push({ ...shut, before: row.stages.viewer });

  /* ---------- the model's own page ---------- */
  await page.goto(`${base}/models/${id}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  row.stages.page = await look(PAGE, { settle: true });

  // the page draws the listing that is IN the page, not the snippet module: if generate-pages has
  // not been run since the model was rewritten, the page is a different model and says so here
  const listed = await page.evaluate(() => document.querySelector('[data-pane-body="css"] textarea')?.value ?? null);
  const current = snippets?.[id]?.css ?? null;
  if (listed != null && current != null && listed.trim() !== current.trim()) {
    row.notes.push('the page listing is not the current snippet — run npm run generate (page, edit-*, large, fullscreen and the export shapes all draw the listing)');
  }

  /* ---------- editing: a comment appended, then reset ---------- */
  const area = page.locator('[data-pane-body="css"] textarea');
  const live = await move('page → editing', PAGE, async () => {
    const css = await area.inputValue();
    await area.fill(`${css}\n/* c3d qa: this comment changes nothing drawn */`);
    await page.waitForTimeout(450); // the editor waits 350ms before remounting
  });
  row.stages['edit-live'] = live.after ?? live.first;
  row.moves.push({ ...live, before: row.stages.page });

  const reset = await move('editing → reset', PAGE, async () => {
    await page.locator('[data-reset]').click();
    await page.waitForTimeout(450);
  });
  row.stages['edit-reset'] = reset.after ?? reset.first;
  row.moves.push({ ...reset, before: row.stages['edit-live'] });

  /* ---------- the export dialog, at every shape ---------- */
  const image = page.locator('[data-make="image"]').first();
  const toMaker = await move('page → export dialog', MAKER, async () => {
    await image.click();
  });
  row.moves.push({ ...toMaker, before: row.stages['edit-reset'] });
  let last = toMaker.after ?? toMaker.first;
  for (const shape of SHAPES) {
    const step = await move(`export ${shape}`, MAKER, async () => {
      await page.locator(`[data-pick="imageRatio"][data-value="${shape}"]`).click();
    }, 600);
    row.stages[shape] = step.after ?? step.first;
    row.moves.push({ ...step, before: last });
    last = row.stages[shape];
  }
  const back = await move('export dialog → page', PAGE, async () => {
    await page.locator('.maker [data-close]').click();
    await page.waitForTimeout(400);
  });
  row.moves.push({ ...back, before: last });

  /* ---------- a saved edit, from a cold load ---------- */
  const pageCss = await page.evaluate(() => document.querySelector('[data-pane-body="css"] textarea')?.value ?? '');
  await page.evaluate(
    ([key, css]) => localStorage.setItem(key, JSON.stringify({ css })),
    [`c3d-edit:${id}`, `${pageCss}\n/* c3d qa: this comment changes nothing drawn */`],
  );
  await page.goto(`${base}/models/${id}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const edited = await page.evaluate(() => !document.querySelector('[data-edited]')?.hasAttribute('hidden'));
  row.stages['edit-saved'] = await look(PAGE, { settle: true });
  if (!edited) row.notes.push('the saved edit was not picked up (the "your edited version" bar stayed hidden)');
  await page.evaluate((key) => localStorage.removeItem(key), `c3d-edit:${id}`);

  /* ---------- a large viewport, and full screen ---------- */
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(`${base}/models/${id}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  row.stages.large = await look(PAGE, { settle: true });

  const fs = await move('page → full screen', PAGE, async () => {
    await page.locator('[data-fullscreen]').first().click();
    await page.waitForTimeout(500);
  }, 600);
  const isFull = await page.evaluate(() => Boolean(document.fullscreenElement));
  if (isFull) {
    row.stages.fullscreen = fs.after ?? fs.first;
    row.moves.push({ ...fs, before: row.stages.large });
    await page.evaluate(() => document.exitFullscreen()).catch(() => {});
    await page.waitForTimeout(400);
  } else {
    row.notes.push('full screen could not be entered in this browser, so that stage was not measured');
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  } catch (err) {
    // a stage that could not be driven is reported as unmeasured, never guessed at
    row.notes.push(`the run stopped early: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    await page.evaluate(() => document.exitFullscreen()).catch(() => {});
    await page.setViewportSize({ width: 1280, height: 900 }).catch(() => {});
  }

  for (const stage of STAGES) if (!(stage in row.stages)) row.stages[stage] = null;
  const adrift = STAGES.filter((s) => row.stages[s] && row.stages[s].parked === false);
  if (adrift.length) row.notes.push(`the pointer could not be put on the model on: ${adrift.join(', ')} — a model that answers the pointer is at rest there and pointed at everywhere else, so those lines are not comparable`);
  say(STAGES.map((s) => `  ${s.padEnd(11)} ${show(row.stages[s])}${row.stages[s] ? `   canvas ${Math.round(row.stages[s].canvasW)}×${Math.round(row.stages[s].canvasH)}` : ''}`).join('\n'));
  for (const note of row.notes) say(`  note: ${note}`);
}

/* ---------- the report ---------- */
const after = siteStamp();
const moved = after.files !== before.files || after.latest !== before.latest;
if (asJson) {
  console.log(JSON.stringify({ steady: !moved, results }, null, 2));
} else {
  if (moved) {
    console.log(`\nWARNING: src changed while this ran (last saved ${new Date(after.latest).toLocaleTimeString()}).`);
    console.log('The models measured first and the ones measured last may not be the same site. Run it again on a quiet tree.');
  }
  const gap = (a, b) => Math.max(Math.abs(a.width - b.width), Math.abs(a.height - b.height), Math.abs(a.offX - b.offX), Math.abs(a.offY - b.offY));
  console.log('\nAll numbers are vmin of the canvas the model is in: width × height @ offset from the middle.\n');
  console.log(['model'.padEnd(11), ...STAGES.map((s) => s.padEnd(26))].join(''));
  for (const row of results) {
    console.log([row.id.padEnd(11), ...STAGES.map((s) => show(row.stages[s]).padEnd(26))].join(''));
  }

  let bad = 0;
  console.log('\nDisagreements (against the model\'s own page):');
  for (const row of results) {
    const ref = row.stages.page;
    const off = [];
    if (!ref) off.push('the model page could not be measured');
    else for (const s of STAGES) {
      const seen = row.stages[s];
      if (s === 'page') continue;
      if (!seen) { off.push(`${s}: not measured`); continue; }
      const d = gap(ref, seen);
      if (d > TOL) off.push(`${s}: ${show(seen)} against ${show(ref)} — ${d.toFixed(1)}vmin apart`);
    }
    for (const m of row.moves) {
      if (!m.before || !m.first) continue;
      const j = gap(m.before, m.first);
      const settled = m.after ? gap(m.first, m.after) : 0;
      if (j > TOL) off.push(`jump on "${m.label}": ${show(m.before)} → ${show(m.first)} (${j.toFixed(1)}vmin)`);
      else if (settled > TOL) off.push(`settles after "${m.label}": ${show(m.first)} → ${show(m.after)} (${settled.toFixed(1)}vmin)`);
    }
    for (const note of row.notes) off.push(note);
    if (off.length) { bad++; console.log(`  ${row.id}\n${off.map((o) => `    ${o}`).join('\n')}`); }
  }
  if (!bad) console.log('  none.');

  // "Nothing jumps" is worth a number even when nothing is wrong: this is the largest movement
  // measured across every transition, so a quiet report says how quiet it was.
  console.log('\nThe biggest movement on any transition (before → the first frame it could be measured again):');
  for (const row of results) {
    let worst = null;
    for (const m of row.moves) {
      if (!m.before || !m.first) continue;
      const d = gap(m.before, m.first);
      const s = m.after ? gap(m.first, m.after) : 0;
      if (!worst || Math.max(d, s) > Math.max(worst.d, worst.s)) worst = { label: m.label, d, s, m };
    }
    console.log(
      worst
        ? `  ${row.id.padEnd(11)} ${worst.d.toFixed(1)}vmin on "${worst.label}"${worst.s > 0.05 ? `, and ${worst.s.toFixed(1)}vmin more before it settled` : ''}`
        : `  ${row.id.padEnd(11)} no transition could be measured`,
    );
  }

  console.log(`\n${results.length - bad}/${results.length} models are the same everywhere, within ${TOL}vmin.`);
}

await browser.close();
await vite.close();
