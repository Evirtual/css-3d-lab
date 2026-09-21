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
 * TWO THRESHOLDS, FOR TWO JOBS. Position and size (centred, tallest, shortest, widest) are judged
 * on SOLID ink, alpha 128/255 and over: the eye reads where a model is and how big it is from its
 * solid body, and a soft shadow, a glow, steam or a translucent floor hanging off one side would
 * otherwise drag the measured middle away from the body a person sees (the coffee cup's steam put
 * its cup 8vmin low while the check passed). Edges (the canvas edge, the top-corner clearance, and
 * whether a full-canvas model covers the canvas) are judged on ALL ink, alpha over 24/255: a leak
 * is a leak however faint, so a glow that runs off the canvas or under the site's badge still
 * fails.
 *
 * THE RESTING POSE IS JUDGED ON ITS OWN TOO. Everything above is measured on the union of every
 * state, which a model can pass while being small or off centre at rest, so long as its open or
 * mid-animation state is big and centred (a closed book beside an open one that is centred). But
 * a paused card, and every card parked offscreen, shows exactly the resting pose: the first moment
 * of the loop, with no pointer and nothing clicked (VIEW-CONTRACT.md, ground rule 9). So that one
 * picture must itself be centred (the same 4vmin, vertically 11 with a control zone at rest) and at
 * least the 40vmin floor tall, judged on solid ink like the rest. The union checks stand as they
 * are: the resting pose is judged as well as, not instead of, every state.
 *
 * NO MOMENT SLIPS BETWEEN THE PICTURES. The timeline is photographed at 12 regular moments per
 * loop (see momentsOf), which on a 24s loop is one picture every 2s: a part that overshoots for
 * less than that can break the band unseen. So before the pictures, a quick pass puts the timeline
 * at up to 480 moments (FINEST), no closer than 16ms, and reads the scene's element boxes at each
 * (cheap: no picture); the moments where they reach furthest in each direction, and are tallest
 * and widest, are photographed and measured on ink like the regular ones. Element boxes only
 * choose the moments; the ink still does the measuring. With :hover forced the pass is made again.
 * Its limit: a ::before, ::after or shadow has no box of its own, so an overshoot drawn only by one
 * of those is found only when its element's own box overshoots with it.
 *
 * EACH MODEL FROM A CLEAN START. A model's numbers must not depend on what was judged before it,
 * so every model gets a browser context of its own (a new page, no pointer anywhere yet, nothing
 * focused, no storage or cache from the model before), the code as it is on disk when its turn
 * comes, and its fonts loaded, before anything is measured. The Vite server does not watch files
 * (see below), and without watching it would go on serving every module as it was first asked
 * for: a run that started while a model was being edited judged that model on the half-edited
 * code of the moment the run began, while a run of that model alone, later, saw the finished
 * code. So its module cache is emptied before every model instead.
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
const FLOOR = 40; // nothing may be smaller than this
const WIDEST = 92; // per cent of the canvas width
const CORNER = 14; // the site's badge and menu live in the top corners
const CENTRED = 4; // how far off the middle a model may sit, in vmin
const INK = 24; // alpha out of 255 over which a pixel is drawn at all: the edges are judged on this
const FINEST = 480; // at most this many moments in GUIDE's quick pass over the timeline (and at most one per 16ms)
const SOLID = 128; // alpha out of 255 from which a pixel is solid body: position and size are judged on this

// The site paints the backdrop, not the model: its colour, its dots and its credit are taken off
// the page so the only ink in the picture is the model's own.
const BARE = `html, body, .embed, .stage { background: none !important; border: 0 !important; }
.stage::before, .stage::after { display: none !important; }
.embed__credit, .embed__og { display: none !important; }`;

/**
 * Runs in the frame: what the model's timeline is. `periods` are the endless animations' loops
 * (twice the duration when alternating), `lead` the longest delay among them, `end` when the last
 * animation that runs a set number of times and was there from the start is over. The animations
 * there at the first call are the page's own timeline; ones started later (transitions, and
 * one-shots a click or hover sets off) begin whenever the visitor acts, so they are not part of it.
 */
const PLAN = `(body) => {
  const win = body.ownerDocument.defaultView, doc = body.ownerDocument;
  win.c3dFirst ??= new Set(doc.getAnimations());
  const out = { periods: [], lead: 0, end: 0 };
  for (const a of doc.getAnimations()) {
    const t = a.effect?.getComputedTiming();
    if (!t || typeof t.duration !== 'number' || !(t.duration > 0)) continue;
    if (t.iterations === Infinity) {
      out.periods.push(t.duration * (/alternate/.test(t.direction) ? 2 : 1));
      out.lead = Math.max(out.lead, t.delay ?? 0);
    } else if (win.c3dFirst.has(a) && isFinite(t.endTime)) out.end = Math.max(out.end, t.endTime);
  }
  return out;
}`;

/**
 * The moments to photograph, in ms of the page's own timeline: one shared time for every
 * animation, so parts that start at different moments (delays, offsets) are seen together only
 * as they really are together. The span is the longest loop, or the whole-set loop when the parts
 * have different periods (the least common multiple, cut at four of the longest loops), after the
 * longest delay, and long enough for every run-once animation to end. Twelve moments per longest
 * loop, at most 48, and never fewer than 12 (a model that moves in script is still seen at 12
 * moments of real time). Those alone can step over a pose that lasts less than a twelfth of a loop
 * (a wall that stands up as one tall plank for a moment), so look() adds the moments extremes()
 * finds between them.
 */
function momentsOf({ periods, lead, end }) {
  const longest = Math.max(0, ...periods);
  let loop = longest;
  if (longest) {
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    let whole = 1;
    for (const p of periods.map((p) => Math.max(1, Math.round(p / 10)))) {
      whole = (whole / gcd(whole, p)) * p;
      if (whole * 10 > 4 * longest) break;
    }
    loop = Math.min(whole * 10, 4 * longest);
  }
  const span = Math.max(Math.max(0, lead) + loop, end);
  const n = span ? Math.min(48, Math.max(12, Math.ceil((12 * span) / (longest || span)))) : 12;
  const times = Array.from({ length: n }, (_, k) => (span * k) / n);
  // a run-once animation is seen at its end too (an endless one is back at its start there)
  if (end > 0 || (!longest && span)) times.push(span);
  times.span = span;
  return times;
}

/**
 * Runs in the frame: puts every animation at time `t` of the page's timeline (the same t for all,
 * so delays and offsets hold), forces :hover when `hover`, and reports whether a control is on
 * screen. An animation started after the page's timeline (see PLAN) is put at `k` of `n` of its
 * own length instead: the visitor can set it off at any moment, so any of its moments is real.
 * A control zone is a fact about the DOM, not about the picture, so it is still read from the
 * elements.
 */
const POSE = `(body, { t, hover, k, n }) => {
  const win = body.ownerDocument.defaultView, doc = body.ownerDocument;
  const scene = doc.querySelector('#c3d-scene') || doc.body;
  const CONTROL = 'button, label, input, select, textarea, a[href], [role="button"], [role="slider"]';
  const held = doc.querySelector('#c3d-held');
  const css = doc.querySelector('#c3d-code')?.textContent ?? '';
  // remember the frame as it was found, so the run leaves it running the way it arrived
  win.c3dWas ??= { held: held?.textContent ?? '', animations: doc.getAnimations().map(a => ({ a, t: a.currentTime, state: a.playState })) };
  win.c3dFirst ??= new Set(doc.getAnimations());
  if (held) held.textContent = hover ? css.replace(/:hover/g, ':not(.c3d-never)') : win.c3dWas.held;
  for (const a of doc.getAnimations()) {
    const timing = a.effect?.getComputedTiming();
    a.pause();
    if (typeof timing?.duration !== 'number') { a.currentTime = 0; continue; }
    const own = timing.iterations !== Infinity && !win.c3dFirst.has(a) && isFinite(timing.endTime);
    a.currentTime = own ? timing.endTime * k / Math.max(1, n - 1) : t;
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

/**
 * Runs in the frame: a quick first pass over the timeline, to find the moments worth a picture.
 * For each of `ts` (many, closely spaced) it puts every animation there the way POSE does, with
 * :hover forced when `hover`, and reads the box round every element in the scene that is showing
 * (getBoundingClientRect, which takes 3D transforms and perspective into account). It is only a
 * guide, not the ruler: element boxes miss shadows and overstate circles (see THE RULER), but a
 * part that reaches out for a moment reaches out in its box too, and that moment is then
 * photographed like the others.
 */
const GUIDE = `(body, { ts, hover, span }) => {
  const win = body.ownerDocument.defaultView, doc = body.ownerDocument;
  const scene = doc.querySelector('#c3d-scene') || doc.body;
  const held = doc.querySelector('#c3d-held');
  const css = doc.querySelector('#c3d-code')?.textContent ?? '';
  win.c3dWas ??= { held: held?.textContent ?? '', animations: doc.getAnimations().map(a => ({ a, t: a.currentTime, state: a.playState })) };
  win.c3dFirst ??= new Set(doc.getAnimations());
  if (held) held.textContent = hover ? css.replace(/:hover/g, ':not(.c3d-never)') : win.c3dWas.held;
  const els = [...scene.querySelectorAll('*')];
  const out = [];
  for (const t of ts) {
    for (const a of doc.getAnimations()) {
      const timing = a.effect?.getComputedTiming();
      a.pause();
      if (typeof timing?.duration !== 'number') { a.currentTime = 0; continue; }
      const own = timing.iterations !== Infinity && !win.c3dFirst.has(a) && isFinite(timing.endTime);
      a.currentTime = own ? timing.endTime * (span ? Math.min(1, t / span) : 0) : t;
    }
    let l = Infinity, tp = Infinity, r = -Infinity, b = -Infinity;
    for (const el of els) {
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const box = el.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;
      l = Math.min(l, box.left); tp = Math.min(tp, box.top); r = Math.max(r, box.right); b = Math.max(b, box.bottom);
    }
    out.push(r < l ? null : [l, tp, r, b]);
  }
  return out;
}`;

/**
 * The moments GUIDE says to photograph besides the regular ones: where the scene's boxes reach
 * furthest left, up, right and down, and where they are tallest and widest. The union is made of
 * exactly those extremes, so a pose that breaks the band for a moment between two regular
 * moments is photographed at its worst.
 */
async function extremes(times, hover) {
  const span = times.span ?? Math.max(...times, 0);
  if (!span) return [];
  const steps = Math.min(FINEST, Math.ceil(span / 16));
  const ts = Array.from({ length: steps + 1 }, (_, i) => (span * i) / steps);
  const boxes = await frame().evaluate(new Function('return ' + GUIDE)(), { ts, hover, span });
  const pick = new Set();
  const best = (score) => {
    let at = -1, top = -Infinity;
    boxes.forEach((box, i) => { if (box && score(box) > top + 0.5) { top = score(box); at = i; } });
    if (at >= 0) pick.add(ts[at]);
  };
  best(([l]) => -l); best(([, t]) => -t); best(([, , r]) => r); best(([, , , b]) => b);
  best(([, t, , b]) => b - t); best(([l, , r]) => r - l);
  return [...pick].filter((t) => !times.includes(t));
}

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
 * The box around every pixel of a PNG whose alpha is over `faint` (all ink), and the box around
 * every pixel whose alpha is `solid` or more (solid ink), in image pixels; each is null when the
 * picture has no such pixel. Chromium writes 8-bit PNGs; a shot taken with omitBackground has an
 * alpha channel, and one that came out fully opaque may have none, in which case every pixel is
 * ink and the box is the whole picture.
 */
function inkBoxes(png, faint, solid) {
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
  const opaque = channels === 1 || channels === 3; // no alpha channel: all of it is solid ink
  const all = { l: Infinity, t: Infinity, r: -1, b: -1 };
  const body = { l: Infinity, t: Infinity, r: -1, b: -1 };
  const grow = (box, x, y) => {
    if (x < box.l) box.l = x;
    if (x > box.r) box.r = x;
    if (y < box.t) box.t = y;
    if (y > box.b) box.b = y;
  };
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
    if (opaque) { for (const box of [all, body]) { grow(box, 0, y); grow(box, width - 1, y); } continue; }
    for (let x = 0; x < width; x++) {
      const alpha = row[x * channels + channels - 1];
      if (alpha <= faint) continue;
      grow(all, x, y);
      if (alpha >= solid) grow(body, x, y);
    }
  }
  const out = (box) => (box.r < 0 ? null : { l: box.l, t: box.t, r: box.r + 1, b: box.b + 1, width, height });
  return { all: out(all), solid: out(body) };
}

// No hot reload and no watching: a save anywhere in src (someone else's, mid-run) would reload
// the page under the camera and put the site's own backdrop back into the picture. Not watching
// also means nothing tells Vite a file changed, so freshCode() empties its cache before each model.
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
// a new one for every model, in a context of its own: see EACH MODEL FROM A CLEAN START
let page;

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
    edge: a.edge || b.edge,
    faint: a.faint && b.faint,
    controls: a.controls || b.controls,
  };
};

const frame = () => page.frameLocator('iframe').locator('body');

/**
 * What the model draws in the state it is in now, in vmin, measured from the canvas middle: its
 * real timeline photographed at the moments momentsOf() picks, then at the same moments with
 * :hover forced on. Its size and offset are the box around the solid ink in all of them; its
 * corner clearance, whether it reaches the canvas edge and how much of the canvas it covers are
 * the box around all the ink in all of them. `rest` is the first of those pictures on its own (the
 * start of the timeline, no :hover), measured the same way; it is the resting pose only on the
 * first look, before anything has been clicked, dragged, swept or scrolled.
 */
async function look() {
  try {
    // the picture is the frame and nothing else: the page around it is wider than the canvas
    // (the site keeps a scrollbar gutter), so its middle is not the canvas's middle
    const clip = await page.locator('iframe').first().boundingBox();
    if (!clip) return null;
    // a page that reloaded has lost the bare backdrop and the state it was driven into
    if (!(await page.evaluate(() => window.c3dBare === true))) throw new Error('the page reloaded under the camera');
    let seen = null, body = null, controls = false, first = null;
    const join = (a, b) => (a ? { ...b, l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) } : b);
    const times = momentsOf(await frame().evaluate(new Function('return ' + PLAN)()));
    const poses = [];
    for (const hover of [false, true]) {
      const n = times.length, span = times.span ?? Math.max(...times, 0);
      poses.push(...times.map((t, k) => ({ t, hover, k, n })));
      // the regular moments first (the first is the resting pose), then the extremes between them
      for (const t of await extremes(times, hover)) poses.push({ t, hover, k: span ? (t / span) * (n - 1) : 0, n });
    }
    for (const pose of poses) {
      const shows = await frame().evaluate(new Function('return ' + POSE)(), pose);
      controls = shows || controls;
      const ink = inkBoxes(await page.screenshot({ omitBackground: true, clip }), INK, SOLID);
      // the first pose is the start of the timeline with no :hover: the resting pose, on a first look
      first ??= { solid: ink.solid, all: ink.all, controls: shows };
      if (ink.all) seen = join(seen, ink.all);
      if (ink.solid) body = join(body, ink.solid);
    }
    await frame().evaluate(new Function('return ' + RELEASE)());
    if (!seen) return null;
    const { l, t, r, b, width, height } = seen;
    const unit = Math.min(width, height) / 100;
    // a drawing with no solid ink at all has no body to place or size
    const s = body ?? { l: width / 2, t: height / 2, r: width / 2, b: height / 2 };
    const f = first?.solid;
    const rest = {
      drawn: Boolean(first?.all),
      faint: !f,
      width: f ? (f.r - f.l) / unit : 0,
      height: f ? (f.b - f.t) / unit : 0,
      offX: f ? ((f.l + f.r) / 2 - width / 2) / unit : 0,
      offY: f ? ((f.t + f.b) / 2 - height / 2) / unit : 0,
      controls: Boolean(first?.controls),
    };
    return {
      rest,
      // position and size: the solid body
      width: (s.r - s.l) / unit,
      height: (s.b - s.t) / unit,
      offX: ((s.l + s.r) / 2 - width / 2) / unit,
      offY: ((s.t + s.b) / 2 - height / 2) / unit,
      faint: !body,
      // edges: all the ink, however faint. How close it comes to each top corner, whether it
      // reaches the canvas edge, and how much of the canvas it covers
      corner: Math.min(Math.hypot(Math.max(0, l - 0), Math.max(0, t - 0)), Math.hypot(Math.max(0, width - r), Math.max(0, t - 0))) / unit,
      edge: l <= 0 || t <= 0 || r >= width || b >= height,
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

/** Forgets every module Vite has transformed, so the next page load reads the files as they are now. */
function freshCode() {
  for (const env of Object.values(vite.environments ?? {})) env.moduleGraph?.invalidateAll();
  vite.moduleGraph?.invalidateAll();
}

const rows = [];
for (const id of ids) {
  freshCode();
  // Judged on a card, the tightest canvas there is and the one most of the gallery is seen at.
  const context = await browser.newContext({ viewport: { width: 360, height: 300 } });
  page = await context.newPage();
  page.on('pageerror', (e) => console.log('  page error:', e.message));
  try {
    await judgeModel(id);
  } finally {
    await context.close();
  }
}

async function judgeModel(id) {
  const demo = demos.find((d) => d.id === id);
  await page.goto(`${base}/embed/${id}/`, { waitUntil: 'domcontentloaded' });
  const there = await page.waitForSelector('iframe[data-ready="true"]', { timeout: 20_000 }).then(() => true).catch(() => false);
  if (!there) {
    rows.push({ id, broke: ['never appeared'] });
    console.log(`FAILS   ${id.padEnd(14)} never appeared`);
    return;
  }
  await page.addStyleTag({ content: BARE });
  await page.evaluate(() => { window.c3dBare = true; });
  // the model's fonts, and the page's, are in before the first picture: text drawn in a fallback
  // font is another size
  await page.evaluate(() => document.fonts.ready);
  await frame().evaluate((body) => body.ownerDocument.fonts.ready);
  await page.waitForTimeout(200);
  let seen = await look();
  // the first look, before any interaction, is the only one whose first picture is the resting pose
  const rest = seen?.rest;
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
    // the band is what everything drawn must fit, model and control zone together; the 50vmin model
    // is the model box inside it, which is why a model with a row is smaller
    const tallest = BAND;
    if (full) {
      // a full-canvas model is judged only on actually filling the canvas
      if (seen.coversW < 0.98 || seen.coversH < 0.98) broke.push(`claims the canvas but leaves a gap`);
    } else {
      if (seen.faint) broke.push('no solid ink, only faint');
      if (seen.edge) broke.push('reaches the canvas edge');
      if (seen.height > tallest) broke.push(`${seen.height.toFixed(0)}vmin tall, over ${tallest}`);
      if (seen.height < FLOOR) broke.push(`${seen.height.toFixed(0)}vmin tall, under ${FLOOR}`);
      if (seen.width > WIDEST) broke.push(`${seen.width.toFixed(0)}vmin wide, over ${WIDEST}`);
      if (Math.abs(seen.offX) > CENTRED) broke.push(`${seen.offX.toFixed(0)}vmin off centre sideways`);
      if (Math.abs(seen.offY) > CENTRED + (seen.controls ? 7 : 0)) broke.push(`${seen.offY.toFixed(0)}vmin off centre vertically`);
      if (seen.corner < CORNER) broke.push(`within ${seen.corner.toFixed(0)}vmin of a top corner`);
      // the resting pose, on its own: what a paused or offscreen card shows
      if (rest && !rest.drawn) broke.push('at rest: nothing drawn');
      else if (rest?.faint) broke.push('at rest: no solid ink, only faint');
      else if (rest) {
        if (rest.height < FLOOR) broke.push(`at rest: ${rest.height.toFixed(0)}vmin tall, under ${FLOOR}`);
        if (Math.abs(rest.offX) > CENTRED) broke.push(`at rest: ${rest.offX.toFixed(0)}vmin off centre sideways`);
        if (Math.abs(rest.offY) > CENTRED + (rest.controls ? 7 : 0)) broke.push(`at rest: ${rest.offY.toFixed(0)}vmin off centre vertically`);
      }
    }
  }
  rows.push({ id, broke, seen });
  if (broke.length) console.log(`FAILS   ${id.padEnd(14)} ${broke.join('; ')}`);
  else if (showPasses) console.log(`holds   ${id.padEnd(14)} ${seen.width.toFixed(0)} × ${seen.height.toFixed(0)} vmin${seen.controls ? ', with controls' : ''}${rest ? `; at rest ${rest.width.toFixed(0)} × ${rest.height.toFixed(0)} vmin, off ${rest.offX.toFixed(0)}, ${rest.offY.toFixed(0)}` : ''}`);
  else process.stdout.write('.');
}

const bad = rows.filter((r) => r.broke.length);
console.log(`\n${rows.length - bad.length}/${rows.length} models hold the contract.`);
if (bad.length) console.log('To rewrite: ' + bad.map((r) => r.id).join(', '));
await browser.close();
await vite.close();
process.exit(bad.length ? 1 : 0);
