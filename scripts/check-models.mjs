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
 *
 * THE RULER IS PAINTED PIXELS, not element boxes. The frame is photographed on nothing
 * (omitBackground), and what the model measures is the box around every pixel the picture
 * actually has ink in. An element box is the wrong ruler in both directions: a circle fills a
 * square box and a ring turning in the screen plane sweeps one, so both read up to a third bigger
 * than what is drawn; and a box-shadow is real ink that no box contains, so a model built out of
 * shadows reads smaller than it looks. The picture has no opinion about either.
 *
 * What the frame clips, the picture cannot show: a model drawn past the canvas edge is measured up
 * to that edge and no further, so its numbers are a floor. Over one or two edges it still fails,
 * only by less than the truth. Over all four it covers the canvas, and is judged as a full-canvas
 * model like anything else that does: the picture cannot tell overflowing from filling.
 */
import { inflateSync } from 'node:zlib';
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';

const BAND = 70; // the model box, with no controls
const WITH_CONTROLS = 56; // the model box when there is a control zone under it
const FLOOR = 40; // nothing may be smaller than this
const WIDEST = 92; // per cent of the canvas width
const CORNER = 14; // the site's badge and menu live in the top corners
const CENTRED = 4; // how far off the middle a model may sit, in vmin
const INK = 24; // alpha out of 255 that counts as drawn, so a faint glow or soft shadow does not

// The site paints the backdrop, not the model: its colour, its dots and its credit are taken off
// the page so the only ink in the picture is the model's own.
const BARE = `html, body, .embed, .stage { background: none !important; border: 0 !important; }
.stage::before, .stage::after { display: none !important; }
.embed__credit, .embed__og { display: none !important; }`;

/**
 * Runs in the frame: freezes every animation on phase `step` of 12, forces :hover from step 12 on,
 * and reports whether a control is on screen. A control zone is a fact about the DOM, not about
 * the picture, so it is still read from the elements.
 */
const POSE = `(body, step) => {
  const win = body.ownerDocument.defaultView, doc = body.ownerDocument;
  const scene = doc.querySelector('#c3d-scene') || doc.body;
  const CONTROL = 'button, label, input, select, textarea, a[href], [role="button"], [role="slider"]';
  const held = doc.querySelector('#c3d-held');
  const css = doc.querySelector('#c3d-code')?.textContent ?? '';
  // remember the frame as it was found, so the run leaves it running the way it arrived
  win.c3dWas ??= { held: held?.textContent ?? '', animations: doc.getAnimations().map(a => ({ a, t: a.currentTime, state: a.playState })) };
  if (held) held.textContent = step >= 12 ? css.replace(/:hover/g, ':not(.c3d-never)') : win.c3dWas.held;
  for (const a of doc.getAnimations()) {
    const timing = a.effect?.getComputedTiming();
    a.pause();
    a.currentTime = typeof timing?.duration === 'number' ? (timing.delay ?? 0) + timing.duration * (step % 12) / 11 : 0;
  }
  const shows = (el) => {
    const cs = win.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    const box = el.getBoundingClientRect();
    return box.width >= 1 && box.height >= 1;
  };
  const inks = (el) => {
    const cs = win.getComputedStyle(el);
    return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' ||
      (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopColor !== 'rgba(0, 0, 0, 0)') ||
      [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) ||
      ['::before', '::after'].some(p => !['none', 'normal'].includes(win.getComputedStyle(el, p).content));
  };
  for (const el of scene.querySelectorAll(CONTROL)) {
    if (!shows(el)) continue;
    if (inks(el) || [...el.querySelectorAll('*')].some(x => shows(x) && inks(x))) return true;
  }
  return false;
}`;

/** Runs in the frame: puts the animations and the hover back the way they were found. */
const RELEASE = `(body) => {
  const doc = body.ownerDocument;
  const was = doc.defaultView.c3dWas;
  if (!was) return;
  const held = doc.querySelector('#c3d-held');
  if (held) held.textContent = was.held;
  for (const { a, t, state } of was.animations) { a.currentTime = t; if (state === 'running') a.play(); }
  delete doc.defaultView.c3dWas;
}`;

/**
 * The box around every pixel of a PNG whose alpha is over `threshold`, in image pixels, or null
 * when the picture is empty. Chromium writes 8-bit PNGs; a shot taken with omitBackground has an
 * alpha channel, and one that came out fully opaque may have none, in which case every pixel is
 * ink and the box is the whole picture.
 */
function inkBox(png, threshold) {
  let at = 8, width = 0, height = 0, depth = 0, kind = 0;
  const parts = [];
  while (at + 8 <= png.length) {
    const size = png.readUInt32BE(at);
    const tag = png.toString('latin1', at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + size);
    if (tag === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; kind = data[9]; }
    else if (tag === 'IDAT') parts.push(data);
    else if (tag === 'IEND') break;
    at += size + 12;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[kind];
  if (depth !== 8 || !channels) throw new Error(`cannot read this PNG (depth ${depth}, colour type ${kind})`);
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const row = Buffer.alloc(stride);
  const above = Buffer.alloc(stride);
  const solid = channels === 1 || channels === 3; // no alpha channel: all of it is ink
  let l = Infinity, t = Infinity, r = -1, b = -1;
  for (let y = 0, read = 0; y < height; y++) {
    const filter = raw[read++];
    raw.copy(row, 0, read, read + stride);
    read += stride;
    // undo the row filter (PNG spec 9.2), which is written against the pixel to the left and above
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? row[i - channels] : 0;
      const corner = i >= channels ? above[i - channels] : 0;
      if (filter === 1) row[i] = (row[i] + left) & 255;
      else if (filter === 2) row[i] = (row[i] + above[i]) & 255;
      else if (filter === 3) row[i] = (row[i] + ((left + above[i]) >> 1)) & 255;
      else if (filter === 4) {
        const guess = left + above[i] - corner;
        const dl = Math.abs(guess - left), du = Math.abs(guess - above[i]), dc = Math.abs(guess - corner);
        row[i] = (row[i] + (dl <= du && dl <= dc ? left : du <= dc ? above[i] : corner)) & 255;
      }
    }
    row.copy(above);
    if (solid) { l = 0; t = Math.min(t, y); r = width - 1; b = y; continue; }
    for (let x = 0; x < width; x++) {
      if (row[x * channels + channels - 1] <= threshold) continue;
      if (x < l) l = x;
      if (x > r) r = x;
      if (y < t) t = y;
      if (y > b) b = y;
    }
  }
  return r < 0 ? null : { l, t, r: r + 1, b: b + 1, width, height };
}

// No hot reload and no watching: a save anywhere in src (someone else's, mid-run) would reload
// the page under the camera and put the site's own backdrop back into the picture.
const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, watch: null } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { interactionsOf } = await vite.ssrLoadModule('/src/models/interaction.ts');
const args = process.argv.slice(2);
const showPasses = args.includes('--pass');
const wanted = args.filter((a) => !a.startsWith('-'));
const ids = wanted.length ? wanted : demos.map((d) => d.id);

const browser = await chromium.launch();
// Judged on a card, the tightest canvas there is and the one most of the gallery is seen at.
const page = await browser.newPage({ viewport: { width: 360, height: 300 } });
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

const frame = () => page.frameLocator('iframe').locator('body');

/**
 * What the model draws in the state it is in now, in vmin, measured from the canvas middle: the
 * whole of its animation photographed at 24 moments — twelve of the loop, then the same twelve
 * with :hover forced on — and the box around all the ink in all of them.
 */
async function look() {
  try {
    // the picture is the frame and nothing else: the page around it is wider than the canvas
    // (the site keeps a scrollbar gutter), so its middle is not the canvas's middle
    const clip = await page.locator('iframe').first().boundingBox();
    if (!clip) return null;
    // a page that reloaded has lost the bare backdrop and the state it was driven into
    if (!(await page.evaluate(() => window.c3dBare === true))) throw new Error('the page reloaded under the camera');
    let seen = null, controls = false;
    for (let step = 0; step < 24; step++) {
      controls = (await frame().evaluate(new Function('return ' + POSE)(), step)) || controls;
      const ink = inkBox(await page.screenshot({ omitBackground: true, clip }), INK);
      if (!ink) continue;
      seen = seen
        ? { ...ink, l: Math.min(seen.l, ink.l), t: Math.min(seen.t, ink.t), r: Math.max(seen.r, ink.r), b: Math.max(seen.b, ink.b) }
        : ink;
    }
    await frame().evaluate(new Function('return ' + RELEASE)());
    if (!seen) return null;
    const { l, t, r, b, width, height } = seen;
    const unit = Math.min(width, height) / 100;
    return {
      width: (r - l) / unit,
      height: (b - t) / unit,
      offX: ((l + r) / 2 - width / 2) / unit,
      offY: ((t + b) / 2 - height / 2) / unit,
      // how close the drawing comes to each top corner, and how much of the canvas it covers
      corner: Math.min(Math.hypot(Math.max(0, l - 0), Math.max(0, t - 0)), Math.hypot(Math.max(0, width - r), Math.max(0, t - 0))) / unit,
      coversW: (r - l) / width,
      coversH: (b - t) / height,
      controls,
    };
  } catch (e) {
    // a measurement that broke is not a model that draws nothing: say which it was
    console.log('  could not measure:', e.message.split('\n')[0]);
    return null;
  }
}

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
  await page.addStyleTag({ content: BARE });
  await page.evaluate(() => { window.c3dBare = true; });
  await page.waitForTimeout(200);
  let seen = await look();
  const box = await page.locator('.stage[data-demo], .stage').first().boundingBox();
  if (box && seen) {
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const frames = page.frameLocator('iframe');
    for (const way of demo ? interactionsOf(demo) : []) {
      if (way === 'click') {
        const controls = frames.locator('#c3d-scene button:not([disabled]), #c3d-scene label, #c3d-scene input[type="radio"], #c3d-scene input[type="checkbox"]');
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
        // the corners and the sides of the canvas, a hair inside it: a model that follows the
        // pointer leans furthest when the pointer is as far out as it can go, and a sweep that
        // stops short of the edge never sees the pose the visitor sees
        for (const [dx, dy] of [[-0.49, -0.49], [0.49, -0.49], [0.49, 0.49], [-0.49, 0.49], [0, -0.49], [0.49, 0], [0, 0.49], [-0.49, 0]]) {
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
    // the band is what everything drawn must fit, model and control zone together; WITH_CONTROLS
    // is the model box inside it, which is why a model with a row is smaller
    const tallest = BAND;
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
