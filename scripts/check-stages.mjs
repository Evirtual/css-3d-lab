/**
 * Judges the OTHER half of docs/VIEW-CONTRACT.md: not "does the model fit the band" (that is
 * scripts/check-models.mjs) but "is it the same model everywhere". A model is measured in vmin of
 * its own canvas on every surface the site shows it on, and the numbers have to agree.
 *
 *   node scripts/check-stages.mjs             every model in the gallery (src/models/index.ts)
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
 *   file        the page a visitor takes away ("Copy as one HTML file", "Open in new tab"): the
 *               standalone document on its own, at 1280 × 800, with no page error
 *   file-400    ...and at 400 × 400
 *
 * Every surface gives the model a different canvas, so nothing here compares pixels: everything is
 * in vmin of the canvas the model is in, which is the unit the contract is written in. A model that
 * holds the contract has the same width, height and offset on every line. A full-canvas scene is
 * the exception: it follows the canvas's shape by design, so it is judged on filling the canvas and
 * showing the same content instead (see FULL-CANVAS SCENES below).
 *
 * Transitions are measured too — before an action, at the first frame the model is measurable
 * again, and after it has settled — because a number that is right at both ends can still jump.
 *
 * Many of these models answer the pointer — a card tilts towards it, a chart opens a tooltip under
 * it — and that is the model working, not a layout. So every reading is of the model AT REST: the
 * pointer is parked off the model (outside its canvas, on the page's own chrome, and checked with
 * elementFromPoint to be on no frame at all), the model's own document is checked to have nothing
 * under :hover, and any transition the pointer started is let finish before the settled reading.
 * The pointer is also moved off straight after every click the check makes, before the next
 * surface has mounted, so the reading taken at the first measurable frame after an action is at
 * rest too and catches the action's doing, not the pointer's. A reading that could not be taken at
 * rest is marked "pointed" and is only ever compared with another pointed one; this check does not
 * set out to measure the pointed pose (a model's hover and drag extents are check-models' business).
 *
 * A BROKEN BROWSER BREAKS ONE MODEL AT MOST (scripts/browser-guard.mjs). A model whose run hits a
 * browser-level error (a protocol error, "Unable to capture screenshot", a goto timeout, a crashed
 * or closed target) is measured again from the start, once, in a fresh browser (and a fresh
 * context and page), and a line "  note: retried after a browser failure" is printed under its
 * readings; only a second failure reports it, as before, with "the run stopped early". Those notes
 * are about the run, not the model, so they are never counted as disagreements. The browser is also
 * replaced every 20 models; a model waits (up to 3 minutes) while free memory is under 1.5 GB, and
 * says "ran under memory pressure" in the same kind of note when it had to go on anyway. A crash
 * inside Playwright prints the report (table, disagreements, tally) for the models finished before
 * it, under a "PARTIAL" line, and exits 3, so scripts/capture-check.mjs still records them.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createServer as createVite } from 'vite';
import { launchChromium } from './browser.mjs';
import { BrowserGuard, crashGuard, isBrowserError } from './browser-guard.mjs';

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
 * It reads the boxes of what paints (a fill, a border, a shadow, and text by the text itself; an
 * element that paints only through its ::before or ::after by the box of what those paint), which
 * is quick enough to take on 13 surfaces; check-models, which judges the
 * band, measures pictures instead, so its numbers can differ from these. It sweeps the whole
 * animation (and a forced :hover) and keeps the widest extent, then puts every clock back where
 * it found it.
 */
const LOOK = `() => {
  const win = window, doc = document;
  const scene = doc.querySelector('#c3d-scene') || doc.body;
  const unit = Math.min(win.innerWidth, win.innerHeight) / 100;
  const CONTROL = 'button, label, input, select, textarea, a[href], [role="button"], [role="slider"]';
  const held = doc.querySelector('#c3d-held');
  const css = doc.querySelector('#c3d-code')?.textContent ?? '';
  const was = held?.textContent ?? '';
  // For two frames after its canvas changes size the frame turns transitions off, so the model
  // lands on its new size instead of gliding there (src/models/snippet-utils.ts, RESIZE_SNAP). A
  // reading taken in those two frames would force :hover and see no turn, only its two ends: it is
  // lifted for the sweep and put back after.
  const resizing = doc.documentElement.hasAttribute('data-c3d-resizing');
  if (resizing) { doc.documentElement.removeAttribute('data-c3d-resizing'); doc.documentElement.getBoundingClientRect(); }
  const animations = doc.getAnimations();
  const saved = animations.map(a => ({ a, t: a.currentTime, state: a.playState }));
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity, controls = false;
  // For a full-canvas scene, a box in vmin is the wrong ruler: it fills whatever shape it is given,
  // and a tipped plane's box runs off to thousands of vmin while the plane's clip shows a screenful.
  // So what is IN VIEW is kept as well, per element, at 12 instants of the scene: each drawn
  // element's box cut to the canvas and to every ancestor that clips, in two rulers, as a share of
  // the canvas and in vmin from the scene's vanishing point. The comparison (sameView) judges the
  // whole scene in ONE of them. An instant is one time on one clock for every animation (the snow at 2.4s,
  // every flake where it is at 2.4s), not each animation at the same share of its own loop: that
  // lines every flake of a depth up at one height, a picture the scene never shows.
  const W = win.innerWidth, H = win.innerHeight;
  const index = new Map([...scene.querySelectorAll('*')].map((el, i) => [el, i]));
  const view = [];
  const cover = { minW: Infinity, minH: Infinity, l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
  const clipOf = (el) => {
    let cl = 0, ct = 0, cr = W, cb = H;
    for (let p = el.parentElement; p && p !== doc.body; p = p.parentElement) {
      const ps = win.getComputedStyle(p);
      if (ps.overflowX !== 'visible' || ps.overflowY !== 'visible') {
        const q = p.getBoundingClientRect();
        cl = Math.max(cl, q.left); ct = Math.max(ct, q.top); cr = Math.min(cr, q.right); cb = Math.min(cb, q.bottom);
      }
    }
    return [cl, ct, cr, cb];
  };
  // Does a ::before / ::after paint anything: a fill, a border, a shadow, or text?
  const NONE = ['none', 'normal'];
  const pseudoPaints = (ps) => !NONE.includes(ps.content) && ps.display !== 'none' && (
    ps.backgroundColor !== 'rgba(0, 0, 0, 0)' || ps.backgroundImage !== 'none' || ps.boxShadow !== 'none' ||
    (parseFloat(ps.borderTopWidth) > 0 && ps.borderTopColor !== 'rgba(0, 0, 0, 0)') ||
    (parseFloat(ps.borderLeftWidth) > 0 && ps.borderLeftColor !== 'rgba(0, 0, 0, 0)') ||
    /url\\(|gradient\\(/.test(ps.content) || /^"[^"]*\\S[^"]*"$/.test(ps.content));
  // An element that paints ONLY through a ::before or ::after is measured by what those paint, not
  // by its own box: a 0 × 0 anchor with a big ::before draws the ::before's size, and the anchor's
  // box would say nothing is there. A pseudo-element has no box to read, so for one moment it is
  // stood in for by a real element with every computed property of the pseudo (the same place in
  // the tree, the same containing block, the same transform), read, and taken out again; the
  // pseudo is switched off meanwhile so the stand-in takes its place in the flow.
  const offStyle = doc.createElement('style');
  offStyle.textContent = '[data-c3d-off="before"]::before, [data-c3d-off="after"]::after { display: none !important; }';
  let pseudoOnly = 0;
  const pseudoBox = (el) => {
    let box = null;
    for (const p of ['::before', '::after']) {
      const ps = win.getComputedStyle(el, p);
      if (!pseudoPaints(ps)) continue;
      if (!offStyle.isConnected) doc.head.append(offStyle);
      const stand = doc.createElement('c3d-pseudo');
      for (let i = 0; i < ps.length; i++) {
        const name = ps[i];
        if (name === 'content' || name.startsWith('animation') || name.startsWith('transition')) continue;
        stand.style.setProperty(name, ps.getPropertyValue(name));
      }
      const text = /^"(.*)"$/.exec(ps.content);
      if (text) stand.textContent = text[1].replace(/\\\\(.)/g, '$1');
      el.setAttribute('data-c3d-off', p.slice(2));
      if (p === '::before') el.prepend(stand); else el.append(stand);
      const q = stand.getBoundingClientRect();
      stand.remove();
      el.removeAttribute('data-c3d-off');
      if (q.width < 1 || q.height < 1) continue;
      box = box ? { left: Math.min(box.left, q.left), top: Math.min(box.top, q.top), right: Math.max(box.right, q.right), bottom: Math.max(box.bottom, q.bottom) } : q;
    }
    return box;
  };
  // One reading of everything drawn: extents always, and what is in view when asked.
  const read = (step, keep) => {
    let sl = Infinity, st = Infinity, sr = -Infinity, sb = -Infinity;
    for (const el of scene.querySelectorAll('*')) {
      const cs = win.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const own = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' ||
        (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopColor !== 'rgba(0, 0, 0, 0)');
      const pseudo = !own && ['::before', '::after'].some(p => !NONE.includes(win.getComputedStyle(el, p).content));
      // Text is measured where the text is, not by the box it sits in: a line of words in a box
      // the size of the canvas (the confetti's "click" over its whole clickable scene) is a few
      // vmin of ink, not a full-canvas drawing.
      const words = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
      let box = own ? el.getBoundingClientRect() : pseudo ? pseudoBox(el) : null;
      if (pseudo && box && step === 0) pseudoOnly++;
      if (words.length) {
        const range = doc.createRange();
        for (const n of words) {
          range.selectNodeContents(n);
          const q = range.getBoundingClientRect();
          if (q.width < 1 || q.height < 1) continue;
          box = box ? { left: Math.min(box.left, q.left), top: Math.min(box.top, q.top), right: Math.max(box.right, q.right), bottom: Math.max(box.bottom, q.bottom) } : q;
        }
      }
      if (!box) continue;
      // The extents count what is at least a pixel. What is in view counts down to a tenth of a
      // vmin instead, the same share of every canvas: a far post 0.7px wide on a 221px canvas is
      // 1.2px on the page's 378px one, and a pixel rule would call it missing from the small one.
      if (box.right - box.left >= 1 && box.bottom - box.top >= 1) {
        if (el.closest(CONTROL)) controls = true;
        l = Math.min(l, box.left); t = Math.min(t, box.top); r = Math.max(r, box.right); b = Math.max(b, box.bottom);
      }
      if (!keep) continue;
      const [cl, ct, cr, cb] = clipOf(el);
      const x0 = Math.max(box.left, cl), y0 = Math.max(box.top, ct), x1 = Math.min(box.right, cr), y1 = Math.min(box.bottom, cb);
      if (x1 - x0 < unit / 10 || y1 - y0 < unit / 10) continue; // drawn, but not in view
      sl = Math.min(sl, x0); st = Math.min(st, y0); sr = Math.max(sr, x1); sb = Math.max(sb, y1);
      if (keep === 'view') view.push([step, index.get(el) ?? -1, x0, y0, x1, y1]);
    }
    if (keep) {
      cover.minW = Math.min(cover.minW, Number.isFinite(sl) ? (sr - sl) / W : 0);
      cover.minH = Math.min(cover.minH, Number.isFinite(st) ? (sb - st) / H : 0);
      if (Number.isFinite(sl)) { cover.l = Math.min(cover.l, sl); cover.t = Math.min(cover.t, st); cover.r = Math.max(cover.r, sr); cover.b = Math.max(cover.b, sb); }
    }
  };
  // every animation at the same share of its own loop (the sweep for the widest extent)
  const atShare = (k) => {
    for (const a of doc.getAnimations()) {
      const timing = a.effect?.getComputedTiming();
      a.pause();
      a.currentTime = typeof timing?.duration === 'number' ? (timing.delay ?? 0) + timing.duration * k / 11 : 0;
    }
  };
  // every animation at the same time on one clock: instant k of 12 across the longest loop
  const atInstant = (k) => {
    const all = doc.getAnimations();
    const longest = Math.max(0, ...all.map(a => a.effect?.getComputedTiming()?.duration).filter(d => typeof d === 'number' && Number.isFinite(d)));
    for (const a of all) { a.pause(); a.currentTime = longest * k / 11; }
  };
  try {
    // steps 0-11: at rest, the loop swept; they also say whether the scene covers the canvas
    for (let k = 0; k < 12; k++) { atShare(k); read(k, 'cover'); }
    // steps 12-23, only for a scene that covers the canvas: what is in view at 12 instants
    const covers = Number.isFinite(cover.l) && (cover.r - cover.l) / W >= 0.95 && (cover.b - cover.t) / H >= 0.95;
    if (covers) for (let k = 0; k < 12; k++) { atInstant(k); read(12 + k, 'view'); }
    // steps 24-35: the same sweep with :hover forced, for the widest extent only
    if (held) held.textContent = css.replace(/:hover/g, ':not(.c3d-never)');
    for (let k = 0; k < 12; k++) { atShare(k); read(24 + k, null); }
  } finally {
    if (held) held.textContent = was;
    offStyle.remove();
    // The forced :hover started transitions of its own, and taking it off again starts the way
    // back. Left running, they are still there for the next reading, which then scrubs a way back
    // instead of the hover (flip, businesscard and rollbutton read smaller on every surface reached
    // by an action, because each of those is read twice). They are the check's own doing, so they
    // go: the model is back at rest, as the visitor left it, and the next reading starts where
    // this one did.
    const before = new Set(animations);
    for (const a of doc.getAnimations()) if (!before.has(a) && a.constructor.name === 'CSSTransition') a.cancel();
    for (const { a, t: time, state } of saved) { a.currentTime = time; if (state === 'running') a.play(); }
    if (resizing) doc.documentElement.setAttribute('data-c3d-resizing', '');
  }
  if (!Number.isFinite(l)) return null;
  const mx = W / 2, my = H / 2;
  const coversW = Number.isFinite(cover.l) ? (cover.r - cover.l) / W : 0, coversH = Number.isFinite(cover.t) ? (cover.b - cover.t) / H : 0;
  const full = coversW >= 0.95 && coversH >= 0.95;
  // The scene's vanishing point: the perspective-origin of the outermost element that has a
  // perspective (the canvas middle when none has). A scene laid out in the canvas's unit holds
  // its vmin distances about this point, and about no other, because perspective scales about it.
  let vx = mx, vy = my, vanish = 'the canvas middle (no perspective)';
  for (const el of [scene, ...scene.querySelectorAll('*')]) {
    const cs = win.getComputedStyle(el);
    if (cs.perspective === 'none') continue;
    const q = el.getBoundingClientRect(), [ox, oy] = cs.perspectiveOrigin.split(' ').map(parseFloat);
    vx = q.left + ox; vy = q.top + oy; vanish = 'perspective-origin';
    break;
  }
  return {
    width: (r - l) / unit,
    height: (b - t) / unit,
    offX: ((l + r) / 2 - mx) / unit,
    offY: ((t + b) / 2 - my) / unit,
    canvasW: W,
    canvasH: H,
    controls,
    // elements measured by what their ::before / ::after paints, because they paint nothing themselves
    pseudoOnly,
    // what is in view, for the full-canvas judgement (kept only when it covers the canvas)
    cover: { w: coversW, h: coversH, minW: cover.minW, minH: cover.minH },
    vanish: { x: vx / unit, y: vy / unit, from: vanish }, // in vmin from the canvas's top left
    view: full ? view.map(([s, i, x0, y0, x1, y1]) => [s, i,
      // a share of the canvas, in thousandths
      Math.round(x0 / W * 1000), Math.round(y0 / H * 1000), Math.round(x1 / W * 1000), Math.round(y1 / H * 1000),
      // vmin from the vanishing point, in tenths
      Math.round((x0 - vx) / unit * 10), Math.round((y0 - vy) / unit * 10), Math.round((x1 - vx) / unit * 10), Math.round((y1 - vy) / unit * 10)]) : null,
  };
}`;
const lookFn = new Function('return ' + LOOK)();

const SHAPES = ['1:1', '4:3', '3:2', '16:9', '9:16'];
const FILES = [['file', 1280, 800], ['file-400', 400, 400]];
const STAGES = ['card', 'viewer', 'page', 'edit-live', 'edit-reset', 'edit-saved', 'large', 'fullscreen', ...SHAPES, ...FILES.map(([name]) => name)];

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const tolArg = args.indexOf('--tol');
const TOL = tolArg >= 0 ? Number(args[tolArg + 1]) : 2; // vmin: "the same within a couple of vmin"
const wanted = args.filter((a, i) => !a.startsWith('-') && !(tolArg >= 0 && i === tolArg + 1));

const say = (line) => { if (!asJson) console.log(line); };
const n1 = (v) => (v >= 0 ? ' ' : '') + v.toFixed(1);
const show = (s) => (s ? `${s.width.toFixed(1)}×${s.height.toFixed(1)} @${n1(s.offX)},${n1(s.offY)}` : '—');

/*
 * FULL-CANVAS SCENES (VIEW-CONTRACT.md, "Full-canvas models": inset: 0, sized in percentages).
 * Their footprint is the canvas, so it follows the canvas's shape, and their boxes are no ruler: a
 * plane tipped towards the camera measures thousands of vmin while its clip shows one screenful.
 * A model whose own page covers the canvas (95% both ways, check-models' test, on what is in view)
 * is judged on what the contract asks of it instead, on every surface and across every transition:
 *   - it fills the canvas: 98% both ways at every moment, so no gap on any shape;
 *   - the same scene is in view: every drawn thing in view, at each of 12 instants of the scene
 *     (one clock for every animation), is in the same place, across and down, on ONE mapping from
 *     canvas to canvas for the whole scene. Each axis is read in one ruler: as a share of the
 *     canvas (a scene laid out in percentages, the contract's way), or in vmin from the scene's
 *     vanishing point (a scene laid out in the canvas's unit, where a wider canvas shows more at
 *     the sides: the crawl, hinged on the bottom edge with its perspective-origin there; things are
 *     then compared on the area both canvases show). The vanishing point is the perspective-origin
 *     of the outermost element with a perspective, or the canvas middle. Of the four
 *     mappings the one that places most of the scene the same, over every surface against the
 *     page, is the scene's, and every surface and every transition is judged on that one. A
 *     thing is placed the same when its start, end or middle is (a moon placed by its right edge
 *     and sized in units keeps its right edge). A thing that is placed differently, or is in view
 *     on one canvas and missing from the area both show, counts against the scene; more than
 *     FULL_SHARE of what is in view is a different view.
 *     This used to take the best of seven rulers for every thing on its own (a share, or vmin from
 *     the canvas's start, middle or end), and a scene wrong in a consistent way passed: snow
 *     falling in vmin from the top matched "vmin from the start" flake by flake, while its trees
 *     and hill stood in shares. One mapping for the whole scene is what "the same scene" means,
 *     and vmin is only measured from the vanishing point: perspective scales about that point, so
 *     it is the only one a thing in depth can keep its vmin distance from on two canvas shapes.
 * Random scenes (the snow, the confetti) are made the same on every surface by seeding
 * Math.random in every frame, so the flakes are the same flakes wherever the model is.
 */
const FULL = 0.95; // covers this much both ways: a full-canvas scene
const FILLS = 0.98; // and must cover this much, both ways, at every moment
const PLACE = 3; // % of the canvas a thing may move and still be in the same place (share ruler)
const FULL_SHARE = 0.1; // at most this share of what is in view may be placed differently
const MAPPINGS = [['share', 'share'], ['share', 'vmin'], ['vmin', 'share'], ['vmin', 'vmin']]; // [across, down]
const VMIN = 'vmin from the vanishing point';
const mappingName = ([x, y]) => (x === y ? `${x === 'share' ? 'shares of the canvas' : VMIN} both ways`
  : `${x === 'share' ? 'a share' : VMIN} across, ${y === 'share' ? 'a share' : VMIN} down`);
const isFull = (s) => Boolean(s?.view);
// the canvas on one axis (0 across, 1 down) in vmin from its vanishing point: [start, end]
const spanOf = (s, ax) => {
  const u = Math.min(s.canvasW, s.canvasH) / 100, at = ax ? s.vanish.y : s.vanish.x;
  return [-at, (ax ? s.canvasH : s.canvasW) / u - at];
};
/**
 * How much of what is in view on a and b is placed differently, on one mapping. A view entry is
 * [step, element, share x0 y0 x1 y1 (thousandths), vmin from the vanishing point x0 y0 x1 y1 (tenths)].
 */
function sameView(a, b, [rx, ry]) {
  const key = (v) => `${v[0]}:${v[1]}`;
  const A = new Map(a.view.map((v) => [key(v), v])), B = new Map(b.view.map((v) => [key(v), v]));
  // on a vmin axis only the area both canvases show is compared, about the vanishing point
  const lim = [0, 1].map((ax) => {
    if ((ax ? ry : rx) !== 'vmin') return [-Infinity, Infinity];
    const [a0, a1] = spanOf(a, ax), [b0, b1] = spanOf(b, ax);
    return [Math.max(a0, b0), Math.min(a1, b1)];
  });
  // a thing's start, end and middle on one axis, in its axis's ruler: a share in % of the canvas,
  // or vmin from the vanishing point cut to the shared area; null when none of it is there
  const points = (v, ax) => {
    if ((ax ? ry : rx) === 'share') { const s0 = v[2 + ax] / 10, s1 = v[4 + ax] / 10; return [s0, s1, (s0 + s1) / 2]; }
    const m0 = Math.max(v[6 + ax] / 10, lim[ax][0]), m1 = Math.min(v[8 + ax] / 10, lim[ax][1]);
    return m1 - m0 >= 0.1 ? [m0, m1, (m0 + m1) / 2] : null; // a tenth of a vmin, as in view is counted
  };
  const tol = (ax) => ((ax ? ry : rx) === 'share' ? PLACE : TOL);
  let total = 0, differ = 0;
  for (const k of new Set([...A.keys(), ...B.keys()])) {
    const x = A.get(k), y = B.get(k);
    const px = x && [points(x, 0), points(x, 1)], py = y && [points(y, 0), points(y, 1)];
    const inX = px && px[0] && px[1], inY = py && py[0] && py[1]; // in the area both canvases show
    if (!inX && !inY) continue; // outside what both show, on both: not this comparison's business
    total++;
    if (!inX || !inY) { differ++; continue; } // there on one, missing from the same area on the other
    if (![0, 1].every((ax) => px[ax].some((p, i) => Math.abs(p - py[ax][i]) <= tol(ax)))) differ++;
  }
  return { share: total ? differ / total : 0, differ, total };
}
/**
 * The scene's mapping: of the four, the one that places the most of it the same over every
 * surface against the page (ties go to shares, the contract's way). Null when fewer than two
 * surfaces could be compared.
 */
function mappingOf(row) {
  const ref = row.stages.page;
  const seen = STAGES.filter((s) => s !== 'page' && isFull(row.stages[s]) && row.stages[s].pose === ref.pose).map((s) => row.stages[s]);
  if (!seen.length) return { mapping: MAPPINGS[0], scores: [] };
  const scores = MAPPINGS.map((m) => {
    let differ = 0, total = 0;
    for (const s of seen) { const v = sameView(ref, s, m); differ += v.differ; total += v.total; }
    return { m, share: total ? differ / total : 0 };
  });
  const best = scores.reduce((p, q) => (q.share < p.share - 1e-9 ? q : p));
  return { mapping: best.m, scores };
}
const pct = (v) => `${(v * 100).toFixed(0)}%`;
const fills = (s) => `${pct(s.cover.minW)} × ${pct(s.cover.minH)}`;
/**
 * How far apart two readings are, and whether that is too far: in vmin for a model in the band,
 * and for a full-canvas scene (when `mapping`, the scene's one mapping, is given) as the share of
 * what is in view that is placed differently on it, with a gap on either canvas said first.
 */
function apart(a, b, mapping) {
  if (!mapping) {
    const d = Math.max(Math.abs(a.width - b.width), Math.abs(a.height - b.height), Math.abs(a.offX - b.offX), Math.abs(a.offY - b.offY));
    return { d, bad: d > TOL, size: `${d.toFixed(1)}vmin` };
  }
  for (const s of [a, b]) {
    if (!isFull(s)) return { d: Infinity, bad: true, size: `does not fill the canvas (covers ${pct(s.cover.w)} × ${pct(s.cover.h)})` };
    if (s.cover.minW < FILLS || s.cover.minH < FILLS) return { d: Infinity, bad: true, size: `leaves a gap: fills ${fills(s)} of the canvas at its emptiest moment` };
  }
  const v = sameView(a, b, mapping);
  return { d: v.share * 100, bad: v.share > FULL_SHARE, size: `${v.differ} of ${v.total} things in view placed differently (${pct(v.share)})` };
}
const showFull = (s) => (isFull(s) ? `fills ${fills(s)}` : show(s));

// No watcher and no HMR: a model file saved while this is running would otherwise reload the page
// under the measurement, and half a run would be of one version of the model and half of another.
const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0, watch: null, hmr: false } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { snippets } = await vite.ssrLoadModule('/src/models/snippets.ts');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { standaloneDoc } = await vite.ssrLoadModule('/src/models/snippet-utils.ts');
// every model the gallery shows, as check-models runs with no ids
const ids = wanted.length ? wanted : demos.map((d) => d.id);

// one context and page for the whole run, made again whenever scripts/browser-guard.mjs launches a
// fresh browser (after one breaks, and every 20 models)
let context, page;
const guard = new BrowserGuard({
  launch: () => launchChromium(),
  setup: async (browser) => {
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    // every frame draws the same random numbers, from the same seed: a scene that scatters its parts
    // with Math.random (the snow, the confetti) is then the same scene on every surface
    await context.addInitScript(() => {
      let seed = 0x2f6b4a1d;
      Math.random = () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    });
    page = await context.newPage();
    page.on('pageerror', (e) => say(`  page error: ${e.message}`));
  },
});
await guard.start();

/**
 * Puts the pointer on no part of any model: on the page's own chrome, off every frame. Tried in
 * order: the viewport's corners and edges, then (for full screen, where the stage IS the screen)
 * the centre of any control laid over it, and only when none of those is off a frame, just
 * outside the viewport. One move, straight there: a move in steps would cross whatever lies
 * between. Returns where it went, with what elementFromPoint found there.
 */
async function parkOff() {
  for (let tries = 0; tries < 3; tries++) {
    const spot = await page.evaluate(() => {
      const W = window.innerWidth, H = window.innerHeight;
      // no frame (the model's canvas), and not on a card or a stage, whose own :hover styles could
      // move the frame the model is measured in
      const off = (x, y) => {
        const el = document.elementFromPoint(x, y);
        return el && el.tagName !== 'IFRAME' && !el.closest('iframe, .card, .stage') ? el : null;
      };
      const name = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') +
        (typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/)[0]}` : '');
      const spots = [[4, 4], [W - 4, 4], [4, H - 4], [W - 4, H - 4], [W / 2, 4], [W / 2, H - 4], [4, H / 2], [W - 4, H / 2]];
      for (const c of document.querySelectorAll('button, [role="button"]')) {
        const r = c.getBoundingClientRect();
        if (r.width >= 4 && r.height >= 4) spots.push([r.left + r.width / 2, r.top + r.height / 2]);
      }
      for (const [x, y] of spots) {
        const el = off(x, y);
        if (el) return { x, y, on: name(el) };
      }
      return null;
    }).catch(() => null);
    const to = spot ?? { x: -2, y: -2, on: 'outside the viewport' };
    await page.mouse.move(to.x, to.y).catch(() => {});
    // checked after the move as well as before it: a dialog sliding in can put a frame there
    const still = spot
      ? await page.evaluate(([x, y]) => {
          const el = document.elementFromPoint(x, y);
          return Boolean(el && el.tagName !== 'IFRAME' && !el.closest('iframe, .card, .stage'));
        }, [to.x, to.y]).catch(() => false)
      : true; // off the viewport, elementFromPoint has nothing to find, which is the point
    if (still) return to;
    await page.waitForTimeout(150);
  }
  return null;
}

/**
 * A click on one of the site's own controls, and the pointer straight off the page: what the click
 * does (a dialog, full screen) lands after it, and a spot that is chrome now can be the model's
 * canvas then — full screen puts the frame under every point of the screen. Outside the viewport
 * nothing can arrive under the pointer. The caller parks it properly once the surface is up.
 */
async function press(locator) {
  await locator.click();
  await page.mouse.move(-2, -2).catch(() => {});
}

/**
 * Measures the model inside the one frame under `selector`, AT REST: the pointer off it, nothing
 * in its document under :hover, and (for a settled reading) every transition landed. Returns
 * null, never a guess, when there is no frame there or it never says it is ready.
 */
/**
 * The file a visitor takes away: the standalone document ("Copy as one HTML file" and "Open in
 * new tab" both hand over standaloneDoc with no stage: the body a centred grid, always dark, no
 * #c3d-scene and no resize snap), opened on its own in a tab of the given size, as a page of its
 * own. The pointer never enters that tab. The one thing added is an empty #c3d-held, so the
 * reading can force :hover for the widest extent as it does on every other surface. Every page
 * error is kept: a file that throws is not the model the site showed.
 */
async function lookFile(id, title, width, height) {
  const html = standaloneDoc(title, { how: [], ...snippets[id] }).replace('</head>', '<style id="c3d-held"></style>\n</head>');
  const tab = await context.newPage();
  const errors = [];
  tab.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
  try {
    await tab.setViewportSize({ width, height });
    const url = `${base}/__c3d-file/${id}.html`;
    await tab.route(url, (r) => r.fulfill({ contentType: 'text/html', body: html }));
    await tab.goto(url, { waitUntil: 'load' });
    await tab.waitForTimeout(800); // the model's own script, and a first frame of its animation
    const hovered = await tab.evaluate(() => document.querySelector(':hover') !== null).catch(() => true);
    const seen = await tab.evaluate(lookFn).catch(() => null);
    return { seen: seen && { ...seen, frameW: width, frameH: height, pose: hovered ? 'pointed' : 'rest', parkedOn: 'nothing (the pointer never entered)' }, errors };
  } finally {
    await tab.close();
  }
}

async function look(selector, { timeout = 20_000, settle = false } = {}) {
  const handle = await page.waitForSelector(`${selector} iframe[data-ready="true"]`, { timeout, state: 'attached' }).catch(() => null);
  if (!handle) return null;
  const frame = await handle.contentFrame().catch(() => null);
  if (!frame) return null;
  const box = await handle.boundingBox().catch(() => null);
  // The pointer is off the model, and the model's own document agrees: a frame the pointer is on
  // has at least its <html> under :hover, and a frame it has left has nothing.
  let parkedOn = null, hovered = true;
  for (let tries = 0; tries < 3 && hovered; tries++) {
    if (tries) await page.waitForTimeout(200);
    parkedOn = (await parkOff())?.on ?? null;
    hovered = await frame.evaluate(() => document.querySelector(':hover') !== null).catch(() => true);
  }
  // A pointer that was on the model has started it back to rest, and a model still gliding into
  // place is measured mid-glide: a moment, not a layout. Settled readings let every transition land.
  if (settle) {
    await page.waitForTimeout(200); // let a leave's transitions start before waiting on them
    await frame.evaluate(() => Promise.race([
      Promise.allSettled(document.getAnimations().filter((a) => a.constructor.name === 'CSSTransition').map((a) => a.finished)),
      new Promise((done) => setTimeout(done, 2500)),
    ])).catch(() => {});
  }
  const seen = await frame.evaluate(lookFn).catch(() => null);
  if (!seen) return null;
  // the canvas the model was given, on the page's own scale: proof the frame really fills the stage
  return { ...seen, frameW: box?.width ?? null, frameH: box?.height ?? null, pose: hovered ? 'pointed' : 'rest', parkedOn };
}

/**
 * An action, then the model as soon as it can be measured, and again once it has settled. The
 * first is what the eye would catch; the second is the layout the stage ends up with. The pointer
 * is off the model before the action and straight after each of its clicks (see press), so both
 * are readings of the action's doing, and of the model at rest.
 */
async function move(label, selector, act, settle = 700) {
  await parkOff();
  await act();
  await parkOff();
  const first = await look(selector);
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
// a crash inside Playwright: the report of every model finished before it, then exit 3
crashGuard('check-stages', async () => {
  const done = results.filter((row) => row.done);
  console.log(`\nPARTIAL: the run crashed after ${done.length} of ${ids.length} model(s); the report below covers those only.`);
  results.splice(0, results.length, ...done);
  report();
});
for (const id of ids) {
  const row = { id, css: snippets?.[id]?.css ? fingerprint(snippets[id].css) : null, stages: {}, moves: [], notes: [] };
  results.push(row);
  say(`\n${id}`);
  try {
    ({ notes: row.guard } = await guard.run(id, () => {
      // every attempt starts from nothing: a retry after a broken browser keeps nothing of the first
      row.stages = {}; row.moves = []; row.notes = [];
      return measureModel(id, row);
    }));
  } catch (err) {
    // a browser that broke twice: reported like any stage that could not be driven
    row.notes.push(`the run stopped early: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    row.guard = err.notes;
  }
  finishRow(row);
}

/** A model's readings and notes, printed as it finishes. What scripts/browser-guard.mjs had to do (row.guard) is printed as notes too, but never counted as a disagreement. */
function finishRow(row) {
  for (const stage of STAGES) if (!(stage in row.stages)) row.stages[stage] = null;
  const pointed = STAGES.filter((s) => row.stages[s]?.pose === 'pointed');
  if (pointed.length) row.notes.push(`the model still had something under the pointer on: ${pointed.join(', ')} after the pointer was parked off it — those lines are of the pointed pose and are compared only with each other`);
  say(STAGES.map((s) => `  ${s.padEnd(11)} ${showFull(row.stages[s])}${row.stages[s] ? `   canvas ${Math.round(row.stages[s].canvasW)}×${Math.round(row.stages[s].canvasH)}${row.stages[s].pose === 'pointed' ? '   POINTED' : ''}   pointer on ${row.stages[s].parkedOn ?? '?'}` : ''}`).join('\n'));
  for (const note of row.notes) say(`  note: ${note}`);
  for (const note of row.guard ?? []) say(`  note: ${note}`);
  row.done = true;
}

/** One model on every surface, into row. Throws a browser-level error for scripts/browser-guard.mjs to retry. */
async function measureModel(id, row) {
  try {
  /* ---------- the gallery card, and the dialog it opens ---------- */
  await context.clearCookies();
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await parkOff(); // the pointer stays where the last page left it, which may be where this one draws a model
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await parkOff();
  const demo = demos.find((d) => d.id === id);
  if (!demo) { row.notes.push('no such model'); say('  no such model'); return; }
  await revealCard(id, demo.title);
  row.stages.card = await look(CARD(id), { settle: true });

  const open = await move('card → viewer', VIEWER, async () => {
    await press(page.locator(`[data-open="${id}"]`));
  });
  row.stages.viewer = open.after ?? open.first;
  row.moves.push({ ...open, before: row.stages.card });

  const shut = await move('viewer → card', CARD(id), async () => {
    await page.keyboard.press('Escape');
  }, 600);
  row.moves.push({ ...shut, before: row.stages.viewer });

  /* ---------- the model's own page ---------- */
  await page.goto(`${base}/models/${id}/`, { waitUntil: 'domcontentloaded' });
  await parkOff(); // the pointer stays where the last page left it, which may be where this one draws a model
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
    await press(page.locator('[data-reset]'));
    await page.waitForTimeout(450);
  });
  row.stages['edit-reset'] = reset.after ?? reset.first;
  row.moves.push({ ...reset, before: row.stages['edit-live'] });

  /* ---------- the export dialog, at every shape ---------- */
  const image = page.locator('[data-make="image"]').first();
  const toMaker = await move('page → export dialog', MAKER, async () => {
    await press(image);
  });
  row.moves.push({ ...toMaker, before: row.stages['edit-reset'] });
  let last = toMaker.after ?? toMaker.first;
  for (const shape of SHAPES) {
    const step = await move(`export ${shape}`, MAKER, async () => {
      await press(page.locator(`[data-pick="imageRatio"][data-value="${shape}"]`));
    }, 600);
    row.stages[shape] = step.after ?? step.first;
    row.moves.push({ ...step, before: last });
    last = row.stages[shape];
  }
  const back = await move('export dialog → page', PAGE, async () => {
    await press(page.locator('.maker [data-close]'));
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
  await parkOff(); // the pointer stays where the last page left it, which may be where this one draws a model
  await page.waitForTimeout(600);
  const edited = await page.evaluate(() => !document.querySelector('[data-edited]')?.hasAttribute('hidden'));
  row.stages['edit-saved'] = await look(PAGE, { settle: true });
  if (!edited) row.notes.push('the saved edit was not picked up (the "your edited version" bar stayed hidden)');
  await page.evaluate((key) => localStorage.removeItem(key), `c3d-edit:${id}`);

  /* ---------- a large viewport, and full screen ---------- */
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(`${base}/models/${id}/`, { waitUntil: 'domcontentloaded' });
  await parkOff(); // the pointer stays where the last page left it, which may be where this one draws a model
  await page.waitForTimeout(500);
  row.stages.large = await look(PAGE, { settle: true });

  const fs = await move('page → full screen', PAGE, async () => {
    await press(page.locator('[data-fullscreen]').first());
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

  /* ---------- the file a visitor takes away ---------- */
  for (const [name, width, height] of FILES) {
    const file = await lookFile(id, demo.title, width, height);
    row.stages[name] = file.seen;
    for (const e of file.errors) row.notes.push(`${name} (${width} × ${height}): page error: ${e}`);
  }

  } catch (err) {
    // a browser that broke: scripts/browser-guard.mjs measures the model again in a fresh one
    if (isBrowserError(err)) throw err;
    // a stage that could not be driven is reported as unmeasured, never guessed at
    row.notes.push(`the run stopped early: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    await page.evaluate(() => document.exitFullscreen()).catch(() => {});
    await page.setViewportSize({ width: 1280, height: 900 }).catch(() => {});
  }
}

report();
await guard.close();
await vite.close();

/* ---------- the report ---------- */
function report() {
  const after = siteStamp();
  const moved = after.files !== before.files || after.latest !== before.latest;
  // A row is judged as a full-canvas scene when its own page shows it covering the canvas, on the one
  // mapping that places most of it the same (see FULL-CANVAS SCENES)
  for (const row of results) {
    row.full = isFull(row.stages.page);
    if (!row.full) continue;
    const { mapping, scores } = mappingOf(row);
    row.mapping = mapping;
    row.mappings = scores.map((x) => ({ mapping: mappingName(x.m), placedDifferently: Math.round(x.share * 1000) / 10 }));
  }
  if (asJson) {
    // what was in view is thousands of numbers per reading: it did its job in the comparison
    console.log(JSON.stringify({ steady: !moved, results }, (key, value) => (key === 'view' ? undefined : value), 2));
  } else {
    if (moved) {
      console.log(`\nWARNING: src changed while this ran (last saved ${new Date(after.latest).toLocaleTimeString()}).`);
      console.log('The models measured first and the ones measured last may not be the same site. Run it again on a quiet tree.');
    }
    console.log('\nAll numbers are vmin of the canvas the model is in: width × height @ offset from the middle.');
    console.log('A full-canvas scene says instead how much of the canvas it fills at its emptiest moment.\n');
    // a pose is only ever compared with the same pose: at rest with at rest (every reading this check
    // sets out to take), pointed with pointed
    const alike = (a, b) => a.pose === b.pose;
    const ID = Math.max(11, ...results.map((row) => row.id.length + 1)); // capture-check splits the table on whitespace
    console.log(['model'.padEnd(ID), ...STAGES.map((s) => s.padEnd(26))].join(''));
    for (const row of results) {
      console.log([row.id.padEnd(ID), ...STAGES.map((s) => showFull(row.stages[s]).padEnd(26))].join(''));
    }

    const scenes = results.filter((row) => row.full);
    if (scenes.length) {
      // which mapping each full-canvas scene was judged on, and how the others did: a scene that
      // fits two about equally well is laid out the same in both where it is measured
      console.log('\nFull-canvas scenes, each judged on one mapping (placed differently, over every surface against the page):');
      for (const row of scenes) {
        console.log(`  ${row.id.padEnd(ID)}${mappingName(row.mapping)}   (${row.mappings.map((x) => `${x.mapping}: ${x.placedDifferently}%`).join('; ')})`);
      }
    }

    let bad = 0;
    console.log('\nDisagreements (against the model\'s own page):');
    for (const row of results) {
      const ref = row.stages.page;
      const full = row.full ? row.mapping : null; // a full-canvas scene is judged on its one mapping
      const off = [];
      if (!ref) off.push('the model page could not be measured');
      else for (const s of STAGES) {
        const seen = row.stages[s];
        if (s === 'page') continue;
        if (!seen) { off.push(`${s}: not measured`); continue; }
        if (!alike(ref, seen)) continue; // said once, in the note on pointed lines
        const d = apart(ref, seen, full);
        if (d.bad) off.push(full ? `${s}: ${d.size}, against the page` : `${s}: ${show(seen)} against ${show(ref)} — ${d.size} apart`);
      }
      for (const m of row.moves) {
        if (!m.before || !m.first) continue;
        if (!alike(m.before, m.first) || (m.after && !alike(m.first, m.after))) {
          off.push(`"${m.label}" not compared: the pointer was on the model for part of it (${[m.before, m.first, m.after].filter(Boolean).map((x) => x.pose).join(' → ')})`);
          continue;
        }
        const j = apart(m.before, m.first, full);
        const settled = m.after ? apart(m.first, m.after, full) : null;
        if (j.bad) off.push(full ? `jump on "${m.label}": ${j.size}` : `jump on "${m.label}": ${show(m.before)} → ${show(m.first)} (${j.size})`);
        else if (settled?.bad) off.push(full ? `settles after "${m.label}": ${settled.size}` : `settles after "${m.label}": ${show(m.first)} → ${show(m.after)} (${settled.size})`);
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
        if (!m.before || !m.first || !alike(m.before, m.first) || (m.after && !alike(m.first, m.after))) continue;
        const d = apart(m.before, m.first, row.full ? row.mapping : null).d;
        const s = m.after ? apart(m.first, m.after, row.full ? row.mapping : null).d : 0;
        if (!worst || Math.max(d, s) > Math.max(worst.d, worst.s)) worst = { label: m.label, d, s, m };
      }
      console.log(
        worst
          ? `  ${row.id.padEnd(11)} ${Number.isFinite(worst.d) ? `${worst.d.toFixed(1)}${row.full ? '% of what is in view moved' : 'vmin'}` : 'a gap'} on "${worst.label}"${worst.s > 0.05 ? `, and ${Number.isFinite(worst.s) ? `${worst.s.toFixed(1)}${row.full ? '%' : 'vmin'} more` : 'a gap'} before it settled` : ''}`
          : `  ${row.id.padEnd(11)} no transition could be measured`,
      );
    }

    console.log(`\n${results.length - bad}/${results.length} models are the same everywhere, within ${TOL}vmin (a full-canvas scene: filling the canvas, with no more than ${pct(FULL_SHARE)} of what is in view placed differently).`);
  }
}
