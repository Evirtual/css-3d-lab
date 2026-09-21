/**
 * Watches every model MOVE, not just where it ends up. check-models.mjs measures size and
 * position; this films each model through its animation and through its hover or interaction,
 * and looks for frames that draw wrong on the way.
 *
 *   node scripts/check-motion.mjs                 every model written in canvas units (--u:)
 *   node scripts/check-motion.mjs book bookshelf  just these (converted or not)
 *   node scripts/check-motion.mjs --all           every model, converted or not
 *   node scripts/check-motion.mjs --size 1280x800 on a full screen instead of a card
 *   node scripts/check-motion.mjs --frames 48     frames per loop (at least 24)
 *
 * ONE CLOCK FOR THE WHOLE PAGE. Time in the page is the check's, not the wall's: Playwright's
 * page.clock is installed before the page loads (a fresh browser context per model, so no clock
 * history carries over), left to run until the model is ready, then paused. From then on the page
 * only moves when the check advances it, 16ms at a time: setTimeout, setInterval,
 * requestAnimationFrame, Date and performance.now run on that clock, and after every 16ms every
 * CSS animation and transition is paused where the same page time puts it (one that started in
 * between counts from then). One that reaches its end is finished for real, so transitionend and
 * animationend fire and a script that waits on them goes on. Script and CSS move together, the
 * way a slow-motion screen recording shows them, however long a frame takes to photograph.
 *
 * For each model it takes:
 *  - THE LOOP: one period of the longest endless CSS animation (twice the duration for an
 *    alternating one), at least 24 frames, more when a short animation would otherwise move too
 *    far between frames. A model with no endless CSS animation moves in script or not at all: it
 *    is filmed for 24 frames 100ms of page time apart instead, and says so.
 *  - EVERY INTERACTION, one at a time, in the same pass. The loop is held on its first frame.
 *    Hover and focus targets are read from the model's own CSS (what stands in front of :hover or
 *    :focus-visible), controls from the DOM. Each hover target gets a real pointer on a point
 *    that elementFromPoint says lands on that very element; then the pointer leaves. A pass
 *    straight across the model follows. Every button is pressed and pressed again (and held down
 *    and let go when the model styles :active), every toggle switched on and off, every radio
 *    chosen, sliders set to min, middle and max, selects run through, focus targets focused by
 *    keyboard and blurred; a model that follows the pointer or is dragged gets a lap round the
 *    canvas, and a scroll model a wheel down and back. Whatever each action starts is filmed: in
 *    12 steps across the CSS transitions it starts, then on, step by step, for as long as anything
 *    it set off (a transition a script starts later, on a timer or on transitionend) still moves;
 *    when it starts no CSS transition, 8 frames 70ms of page time apart. The loop's endless CSS
 *    animations stay held on its first frame throughout; script time keeps running.
 *
 * Two ways to find a glitch:
 *  - AUTOMATIC. The frame is cut into small cells. A cell that is colour A, then a clearly
 *    different colour B, then A again in the next frame, over a patch big enough to be a surface
 *    and not a passing edge, is FLICKER (two surfaces z-fighting, or depth order flipping and
 *    flipping back). Three frames 70-170ms apart cannot tell that from a small part moving fast
 *    across a surface between them (orbiting dots in front of a core look exactly like it), so a
 *    candidate is only flagged once the same stretch, filmed again at most 16ms of page time
 *    apart, still flips: comes in one step with its colour nowhere near the step before, and goes
 *    in one step with its colour nowhere near the step after. The loop's endless CSS animations
 *    are turned back to re-film it; everything else (script, pointer, the transitions an action
 *    starts) is filmed in between as it goes, for this test only. A candidate that turns out to be
 *    motion is reported as dismissed, not dropped. A frame-to-frame change far above the model's own average, and far above the
 *    frames either side of it, is a POP (a jump, or one surface passing through another; only in
 *    frames stepped across a loop or a transition: ones 70-100ms apart are too far apart to tell). For interactions it also says when
 *    the pointer can never land on a part (something else is drawn over it), when a pointer on
 *    it does not hover it, when a part's hit area is mostly over empty canvas, and when an action
 *    changes nothing on screen: under a 0.12 mean change over the whole canvas, and, for an
 *    action on a part (hover, press, focus, and leaving or blurring it), under 1 round the part
 *    too (its box two cells wider, or its label's when it is a hidden input), so a small part's
 *    own tint or focus ring counts though it is a sliver of the canvas. All of it is a hint for a
 *    human to look at, not a verdict.
 *  - VISUAL. One strip per model in .media-tmp/motion/<id>.jpg: every frame in order, numbered,
 *    the flagged ones outlined red (flicker) or amber (pop), so the whole animation can be read
 *    at once by eye or by an agent. report.json beside them holds the numbers.
 *
 * Frames are taken the way check-models.mjs takes them: the embed page on a 360 × 300 card, the
 * site's backdrop removed, the iframe clipped. The backdrop is replaced by one flat colour so a
 * colour change in the picture is always the model's.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { decode, cells as cellsAt, changeNear as changeNearAt, change, far, STILL, STILL_NEAR } from './pixels.mjs';
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';

const OUT = resolve('.media-tmp/motion');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const at = args.indexOf(name);
  return at === -1 ? fallback : args.splice(at, 2)[1];
};
const [VW, VH] = opt('--size', '360x300').split('x').map(Number);
const PER_LOOP = Math.max(24, Number(opt('--frames', 24)));
const MOST = 96; // frames in one loop at the very most, however short its fastest part
const STEPS = 12; // frames through each way of a transition
const all = args.includes('--all');
const wanted = args.filter((a) => !a.startsWith('-'));

// px: the grain the pictures are compared at, the same share of the canvas at any size (set below)
const CELL = Math.max(4, Math.round(Math.min(VW, VH) / 75));
const NEAR = 8; // cells: a colour seen this close in the frame before or after has moved there, not flipped
const FLIP = 70; // a colour change this big (largest channel difference, 0-255) is a different surface
const SAME = 18; // and back within this much is the same surface again
const PATCH = 4; // cells in one connected patch, after the edges are pared off, before a flip counts as a surface
const POP = 2.6; // a change this many times the model's average ...
const LONELY = 1.8; // ... and this many times the frames either side of it, is a pop
const QUIET = 1.5; // a change under this (mean channel difference) is too small to call a pop
const FINE = 16; // ms of page time: a candidate flicker is filmed again at steps this fine before it is flagged

const BARE = `html, body, .embed, .stage { background: none !important; border: 0 !important; }
.stage::before, .stage::after { display: none !important; }
.embed__credit, .embed__og { display: none !important; }
html { background: #10111a !important; }`;

/** The picture averaged into CELL × CELL cells (scripts/pixels.mjs). */
const cells = (img) => cellsAt(img, CELL);
/**
 * The mean change in the cells round a part's box ([left, top, right, bottom] in frame pixels),
 * two cells wider on every side so a focus ring or glow drawn just outside it counts.
 */
const changeNear = (p, q, box) => changeNearAt(p, q, box, CELL);

/**
 * Whether the colour of cell k in frame p is found within NEAR cells of k in frame q. A surface
 * that moves shows its colour somewhere close by in the frame before or after; a surface that
 * flips to the front for one frame and back (z-fighting, depth order popping) does not.
 */
function nearby(p, o, k, q) {
  const x0 = k % p.cols, y0 = (k / p.cols) | 0;
  for (let y = Math.max(0, y0 - NEAR); y <= Math.min(p.rows - 1, y0 + NEAR); y++)
    for (let x = Math.max(0, x0 - NEAR); x <= Math.min(p.cols - 1, x0 + NEAR); x++) {
      const j = (y * p.cols + x) * 3;
      if (Math.abs(q.rgb[j] - p.rgb[o]) <= SAME && Math.abs(q.rgb[j + 1] - p.rgb[o + 1]) <= SAME && Math.abs(q.rgb[j + 2] - p.rgb[o + 2]) <= SAME) return true;
    }
  return false;
}

/** The biggest connected patch of cells, as a count, among the marked ones. */
function biggestPatch(marked, cols, rows) {
  const seen = new Uint8Array(marked.length);
  let best = 0;
  for (let i = 0; i < marked.length; i++) {
    if (!marked[i] || seen[i]) continue;
    let size = 0;
    const todo = [i];
    seen[i] = 1;
    while (todo.length) {
      const j = todo.pop();
      size++;
      const x = j % cols, y = (j / cols) | 0;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const k = ny * cols + nx;
        if (marked[k] && !seen[k]) { seen[k] = 1; todo.push(k); }
      }
    }
    best = Math.max(best, size);
  }
  return best;
}

/**
 * Pares a cell off every side of the marked cells: an edge that moved a cell is a strip one or two
 * cells wide and goes; a surface that flipped is an area and keeps its middle.
 */
function pare(marked, cols) {
  const core = new Uint8Array(marked.length);
  for (let k = 0; k < marked.length; k++) {
    const x = k % cols;
    core[k] = marked[k] && x > 0 && x < cols - 1 && marked[k - 1] && marked[k + 1] && marked[k - cols] && marked[k + cols] ? 1 : 0;
  }
  return core;
}

/**
 * Whether a candidate flicker holds up when filmed finely. Three frames 100-170ms apart cannot
 * tell a flip from fast motion: a small part that crosses a surface between two of them (a dot
 * orbiting in front of a core) shows up out of nowhere and is gone again, exactly like a surface
 * flipping. `seq` is the same stretch filmed again, from the frame before the candidate to the
 * frame after it, at most FINE ms apart. There a part that moves shows each cell's new colour close
 * by in the step before, and its old colour close by in the step after; a surface that flips
 * (z-fighting, depth order popping, a keyframe that jumps) turns up in one step with its colour
 * nowhere near in the step before, and goes in one step with its colour nowhere near in the step
 * after. The candidate's cells that come and go like that must still make a patch of PATCH cells
 * after paring, as in judge().
 */
function confirmFlicker(seq, marked) {
  const first = seq[0], last = seq.at(-1);
  const flips = new Uint8Array(marked.length);
  for (let k = 0; k < marked.length; k++) {
    if (!marked[k]) continue;
    const o = k * 3;
    let into = -1, outOf = -1;
    for (let s = 0; s + 1 < seq.length; s++) if (into < 0 && far(seq[s + 1], first, o) >= FLIP) into = s;
    for (let s = seq.length - 1; s > 0; s--) if (outOf < 0 && far(seq[s - 1], last, o) >= FLIP) outOf = s - 1;
    if (into < 0 || outOf < 0) continue;
    if (!nearby(seq[into + 1], o, k, seq[into]) && !nearby(seq[outOf], o, k, seq[outOf + 1])) flips[k] = 1;
  }
  return biggestPatch(pare(flips, first.cols), first.cols, first.rows) >= PATCH;
}

/**
 * Flicker and pops in one run of frames. `cyclic` when the last frame leads back into the first
 * (a loop), not for a transition. Returns per-frame flags and the change curve.
 */
function judge(frames, cyclic, fromFirst = true) {
  const n = frames.length;
  const at = (i) => frames[cyclic ? (i + n) % n : i];
  const diffs = [];
  for (let i = 0; i < (cyclic ? n : n - 1); i++) diffs.push(change(at(i), at(i + 1)));
  const flicker = [], pops = [];
  for (let i = cyclic ? 0 : 1; i < (cyclic ? n : n - 1); i++) {
    const a = at(i - 1), b = at(i), c = at(i + 1);
    const marked = new Uint8Array(b.cols * b.rows);
    for (let k = 0; k < marked.length; k++) {
      const o = k * 3;
      if (far(a, c, o) <= SAME && far(a, b, o) >= FLIP && far(c, b, o) >= FLIP && !nearby(b, o, k, a) && !nearby(b, o, k, c)) marked[k] = 1;
    }
    const patch = biggestPatch(pare(marked, b.cols), b.cols, b.rows);
    if (patch >= PATCH) flicker.push({ frame: i, cells: patch, marked });
  }
  const mean = diffs.reduce((s, d) => s + d, 0) / (diffs.length || 1);
  // the first step after an action is the new state's own start: a colour or a class that is
  // not transitioned changes there at once, by design, so that step is not judged as a pop
  for (let i = fromFirst ? 0 : 1; i < diffs.length; i++) {
    const before = cyclic ? diffs[(i - 1 + diffs.length) % diffs.length] : diffs[i - 1];
    const after = cyclic ? diffs[(i + 1) % diffs.length] : diffs[i + 1];
    const beside = Math.max(before ?? 0, after ?? 0);
    if (diffs[i] > QUIET && diffs[i] > POP * mean && diffs[i] > LONELY * beside) pops.push({ from: i, to: (i + 1) % n, change: +diffs[i].toFixed(2), mean: +mean.toFixed(2) });
  }
  return { diffs: diffs.map((d) => +d.toFixed(2)), mean: +mean.toFixed(2), flicker, pops };
}

// ---- runs in the frame (Playwright hands each of these the frame's <body> first) ----

/**
 * Every running animation, and what one loop of them is. The loop is the longest period
 * (duration, twice it when alternating); `fastest` is the shortest, which sets how many frames it
 * takes for nothing to move too far between two of them.
 */
function timingOf() {
  const out = { count: 0, loop: 0, fastest: Infinity, lead: 0, periods: [] };
  for (const a of document.getAnimations()) {
    const t = a.effect?.getComputedTiming?.();
    if (!t || typeof t.duration !== 'number' || !(t.duration > 0)) continue;
    // one that runs once and stops is not the loop: the page clock plays it out where it falls
    if (t.iterations !== Infinity) continue;
    const period = t.duration * (/alternate/.test(t.direction) ? 2 : 1);
    out.count++;
    out.loop = Math.max(out.loop, period);
    out.fastest = Math.min(out.fastest, period);
    out.lead = Math.max(out.lead, t.delay ?? 0);
    out.periods.push(period);
  }
  return out;
}

/**
 * Page time `V` (ms since the page clock was paused) applied to every CSS animation and
 * transition: each is paused where V puts it, counted from when it started (the first time it is
 * seen here, never more than one 16ms step late). Once the loop is held, its endless animations
 * stay on its first frame. One that has reached its end is finished for real, so its animationend
 * or transitionend fires. `mark` is the page time an action was taken at: what started since is
 * fresh, and `length` is how long after the mark the last fresh one ends.
 */
function sync(_, { V, mark, adopt = null }) {
  const birth = (window.c3dBirth ??= new Map());
  const held = window.c3dHold ?? new Map();
  const out = { ended: 0, running: 0, fresh: 0, length: 0 };
  for (const a of document.getAnimations()) {
    // adopt: the first call, on the clock just paused, takes each as far on as it already is
    // (and `adopt` ms more, how far ahead the clock was paused)
    if (!birth.has(a)) birth.set(a, adopt !== null ? V - (a.currentTime ?? 0) - adopt : V);
    if (held.has(a)) { a.pause(); a.currentTime = held.get(a); continue; }
    const b = birth.get(a), tm = a.effect?.getComputedTiming?.() ?? {};
    const end = typeof tm.endTime === 'number' && isFinite(tm.endTime) ? tm.endTime : Infinity;
    if (b >= mark) {
      out.fresh++;
      out.length = Math.max(out.length, b - mark + (isFinite(end) ? end : (tm.delay ?? 0) + (typeof tm.duration === 'number' ? tm.duration : 0)));
    }
    if (V - b >= end) {
      if (a.playState !== 'finished') { try { a.finish(); out.ended++; } catch {} }
    } else {
      a.pause();
      a.currentTime = V - b;
      if (isFinite(end)) out.running++;
    }
  }
  return out;
}

/**
 * The loop starts at page time V: every endless animation counted `start` into its run (a whole
 * loop past the longest delay, so all are in their steady state), anything else left where it is.
 * The endless ones are remembered: they are what is held after the loop.
 */
function startLoop(_, { V, start }) {
  const birth = (window.c3dBirth ??= new Map());
  window.c3dLoop = [];
  for (const a of document.getAnimations()) {
    const endless = a.effect?.getComputedTiming?.().iterations === Infinity;
    birth.set(a, V - (endless ? start : a.currentTime ?? 0));
    if (endless) window.c3dLoop.push(a);
  }
}

/** Turns the loop's endless animations to `at` ms into the loop (at page time V; see startLoop). */
function seekLoop(_, { V, start, at }) {
  const birth = window.c3dBirth;
  for (const a of window.c3dLoop ?? []) birth.set(a, V - start - at);
}

/** Holds the loop's endless animations on its first frame from now on. */
function holdLoop(_, start) { window.c3dHold = new Map((window.c3dLoop ?? []).map((a) => [a, start])); }

/** :hover forced on everything the way check-models.mjs forces it (on), or taken off again. */
function holdHover(_, on) {
  const held = document.querySelector('#c3d-held');
  const css = document.querySelector('#c3d-code')?.textContent ?? '';
  window.c3dHeldWas ??= held?.textContent ?? '';
  if (held) held.textContent = on ? css.replace(/:hover/g, ':not(.c3d-never)') : window.c3dHeldWas;
  return !!held && /:hover/.test(css);
}

/**
 * Everything in the model that can be played with, each with where the pointer can reach it.
 * Hover and focus targets come from the model's own CSS: the part of every selector in front of
 * :hover or :focus(-visible) names what has to be pointed at or focused. Controls come from the
 * DOM. For each, a 9 × 9 grid over its box is tried with elementFromPoint, and only points where
 * the pointer really lands on that element (or inside it) count: a part drawn under something
 * else, or turned away, is a part the pointer cannot reach, and a hover that "does nothing" is
 * often exactly that.
 */
function partsOf() {
  const scene = document.querySelector('#c3d-scene') || document.body;
  const css = (document.querySelector('#c3d-code')?.textContent ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
  const heads = { hover: new Set(), focus: new Set() };
  for (const m of css.matchAll(/([^{}]+)\{/g)) {
    const text = m[1].trim();
    if (!text || text.startsWith('@') || /^(from|to|[\d.]+%)/.test(text)) continue;
    for (const s of text.split(/,(?![^(]*\))/)) {
      for (const [kind, re] of [['hover', /:hover/], ['focus', /:focus(-visible|-within)?/]]) {
        const at = s.search(re);
        if (at < 0) continue;
        // .key:is(:hover, :focus-visible) names .key
        const head = s.slice(0, at).trim().replace(/:(is|where)\($/, '');
        if (head && !/[\s>+~(]$/.test(head)) heads[kind].add(head);
      }
    }
  }
  const all = (window.c3dParts = []);
  // what a real press lands on, which is not always what elementFromPoint says: the browser's
  // hit test for events and the one it answers elementFromPoint with can disagree on 3D layers
  if (!window.c3dDown) {
    window.c3dDown = null;
    document.addEventListener('pointerdown', (e) => { window.c3dDown = e.target; }, true);
  }
  const describe = (el) => {
    if (!el) return 'nothing';
    const cls = [...el.classList].filter((c) => !c.startsWith('c3d')).slice(0, 2).map((c) => '.' + c).join('');
    const label = el.getAttribute('aria-label') || el.getAttribute('title') || (el.matches('button, label') ? el.textContent.trim().slice(0, 16) : '');
    const same = el.parentElement ? [...el.parentElement.children].filter((c) => c.tagName === el.tagName && c.className === el.className) : [];
    return `${el.tagName.toLowerCase()}${cls}${same.length > 1 ? `#${same.indexOf(el) + 1}` : ''}${label ? ` "${label}"` : ''}`;
  };
  const reach = (el) => {
    const r = el.getBoundingClientRect();
    const middle = [r.left + r.width / 2, r.top + r.height / 2];
    const hits = [];
    let tried = 0;
    if (r.width >= 1 && r.height >= 1)
      for (let i = 0; i < 9; i++)
        for (let j = 0; j < 9; j++) {
          const x = r.left + (r.width * (i + 0.5)) / 9, y = r.top + (r.height * (j + 0.5)) / 9;
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
          tried++;
          const at = document.elementFromPoint(x, y);
          // a hidden input is reached through anything inside its label
          if (at && (at === el || el.contains(at) || (el.control && at === el.control) || [...(el.labels ?? [])].some((l) => l.contains(at)))) hits.push([x, y]);
        }
    hits.sort((a, b) => Math.hypot(a[0] - middle[0], a[1] - middle[1]) - Math.hypot(b[0] - middle[0], b[1] - middle[1]));
    const onMiddle = middle[0] >= 0 && middle[1] >= 0 && middle[0] < innerWidth && middle[1] < innerHeight ? document.elementFromPoint(...middle) : null;
    return { tried, hits, middle: onMiddle && onMiddle !== el && !el.contains(onMiddle) ? describe(onMiddle) : null };
  };
  const shows = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1;
  };
  const add = (el, kind, extra = {}) => {
    all.push(el);
    // where a change it makes would show: the part itself, or, when it is a hidden input (the
    // usual custom-control trick), its labels, which is where its focus ring or tint is drawn
    const own = el.getBoundingClientRect();
    const hidden = !shows(el) || (el.matches('input') && (+getComputedStyle(el).opacity < 0.05 || (own.width <= 2 && own.height <= 2)));
    const boxes = (hidden ? [...(el.labels ?? [])] : [el]).filter(shows).map((x) => x.getBoundingClientRect());
    const box = boxes.length ? [Math.min(...boxes.map((b) => b.left)), Math.min(...boxes.map((b) => b.top)), Math.max(...boxes.map((b) => b.right)), Math.max(...boxes.map((b) => b.bottom))] : null;
    return { i: all.length - 1, kind, name: describe(el), box, ...reach(el), ...extra };
  };
  const matching = (sels) => {
    const out = [];
    for (const s of sels) {
      try {
        for (const el of document.querySelectorAll(s)) if (!out.includes(el) && el !== document.documentElement && el !== document.body && scene.contains(el)) out.push(el);
      } catch {}
    }
    return out;
  };
  const hover = matching(heads.hover).filter(shows).slice(0, 16).map((el) => add(el, 'hover'));
  const focus = matching(heads.focus).filter((el) => shows(el) && el.tabIndex >= 0).slice(0, 8).map((el) => add(el, 'focus'));
  const found = [...scene.querySelectorAll('button, input, select, label, [role="button"], [role="switch"], [role="slider"], [role="tab"]')];
  const controls = [];
  for (const el of found) {
    if (controls.length >= 12) break;
    if (el.matches('input[type="hidden"]') || el.disabled) continue;
    // a label is only its own control when what it names is hidden (the checkbox hack)
    if (el.matches('label') && el.control && shows(el.control) && found.includes(el.control)) continue;
    if (!shows(el) && !(el.matches('input') && [...(el.labels ?? [])].some(shows))) continue;
    const input = el.matches('label') ? el.control : el;
    const kind = el.matches('select') ? 'select'
      : el.matches('input[type="range"], [role="slider"]') ? 'slider'
      : input?.matches?.('input[type="checkbox"], [role="switch"]') || el.matches('[role="switch"]') ? 'toggle'
      : input?.matches?.('input[type="radio"]') ? 'radio'
      : el.matches('input[type="text"], input[type="number"], textarea') ? 'text' : 'button';
    if (kind === 'text') continue;
    // a hidden input (not displayed, see-through, or clipped to nothing: the usual custom-control
    // trick) is reached through its label, so the label is what the pointer must land on
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const unseen = !shows(el) || (el.matches('input') && (+cs.opacity < 0.05 || cs.clip !== 'auto' || (r.width <= 2 && r.height <= 2)));
    const target = unseen && el.labels?.length ? [...el.labels].find(shows) ?? el : el;
    if (target !== el && controls.some((c) => all[c.i] === target)) continue;
    controls.push(add(target, kind, { input: all.push(input ?? target) - 1, min: +(el.min || 0), max: +(el.max || 100), options: el.options?.length ?? 0 }));
  }
  return { hover, focus, controls };
}

/** Whether part `i` is hovered, focused (visibly) or checked right now. */
function stateOf(_, i) {
  const el = window.c3dParts[i];
  const current = el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-selected') === 'true' || el.hasAttribute('aria-current') || ['active', 'is-active', 'on', 'is-on', 'selected', 'is-selected', 'current'].some((c) => el.classList.contains(c));
  return { hovered: el.matches(':hover'), focused: el.matches(':focus'), visible: el.matches(':focus-visible'), checked: !!el.checked, current,
    // a lone aria-pressed button toggles; one of a row of them is a choice, like a radio
    toggles: el.hasAttribute('aria-pressed') && (el.parentElement?.querySelectorAll(':scope > [aria-pressed]').length ?? 0) < 2 };
}
function clickPart(_, i) { window.c3dParts[i].click(); }
/** What the last real press landed on, as a name, and whether that is part i (or inside it). */
function pressedOn(_, i) {
  const el = window.c3dParts[i], at = window.c3dDown;
  if (!at) return { ok: false, name: 'nothing (no press arrived)' };
  const ok = at === el || el.contains(at) || (el.control && at === el.control) || [...(el.labels ?? [])].some((l) => l.contains(at));
  const cls = [...at.classList].slice(0, 2).map((c) => '.' + c).join('');
  return { ok, name: at.tagName.toLowerCase() + cls };
}
function focusPart(_, i) { window.c3dParts[i].focus({ focusVisible: true }); }
function blurAll() { document.activeElement?.blur?.(); }
function setValue(_, [i, value]) {
  const el = window.c3dParts[i];
  if (el.matches('select')) el.selectedIndex = value;
  else el.value = String(value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ---- the camera ----

const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, watch: null } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { snippets } = await vite.ssrLoadModule('/src/models/snippets.ts');
const { interactionsOf } = await vite.ssrLoadModule('/src/models/interaction.ts');
const converted = (id) => /--u\s*:/.test(snippets[id]?.css ?? '');
const ids = wanted.length ? wanted : demos.map((d) => d.id).filter((id) => all || converted(id));

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let page; // a new one for every model, in a context of its own: see film()
const sheet = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
const inFrame = (fn, arg) => page.frameLocator('iframe').locator('body').evaluate(fn, arg);
const BG = [16, 17, 26];
const suffix = VW === 360 && VH === 300 ? '' : `@${VW}x${VH}`;

/**
 * Page time, moved by the check alone (see ONE CLOCK at the top), 16ms at a time. `V` is the
 * page time since the clock was paused, `mark` the page time the action being filmed was taken.
 */
const CHUNK = 16;
let V = 0, mark = 0;
async function tick(ms) {
  let s = null, left = ms;
  do {
    const d = Math.min(CHUNK, left);
    if (d > 0) await page.clock.runFor(d);
    V += d;
    left -= d;
    s = await inFrame(sync, { V, mark });
    // something finished: give its animationend or transitionend a real moment to reach the
    // script, then pick up what the script started in answer, at this same page time
    if (s.ended) {
      await page.waitForTimeout(30);
      s = await inFrame(sync, { V, mark });
    }
  } while (left > 0);
  return s;
}

/** One frame: the PNG for the strip and its cells for the judging. */
async function shoot(clip) {
  const png = await page.screenshot({ clip });
  return { png, grid: cells(decode(png)) };
}

/** Whether the picture has the model's ink (not the flat backdrop) under frame point x, y. */
function inkAt(grid, x, y) {
  const cx = Math.min(grid.cols - 1, Math.floor(x / CELL)), cy = Math.min(grid.rows - 1, Math.floor(y / CELL));
  const o = (cy * grid.cols + cx) * 3;
  return Math.max(Math.abs(grid.rgb[o] - BG[0]), Math.abs(grid.rgb[o + 1] - BG[1]), Math.abs(grid.rgb[o + 2] - BG[2])) > 14;
}

async function film(id) {
  const demo = demos.find((d) => d.id === id);
  // a context of its own: a page clock of its own, installed before anything in the page runs
  page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('  page error:', e.message));
  await page.clock.install();
  try {
    return await filmOn(id, demo);
  } finally {
    await page.context().close();
  }
}

async function filmOn(id, demo) {
  await page.goto(`${base}/embed/${id}/`, { waitUntil: 'domcontentloaded' });
  const there = await page.waitForSelector('iframe[data-ready="true"]', { timeout: 20_000 }).then(() => true).catch(() => false);
  if (!there) return { id, broke: 'never appeared' };
  await page.addStyleTag({ content: BARE });
  await page.mouse.move(1, 1);
  await page.waitForTimeout(300);
  // from here on the page moves only when tick() moves it. The clock cannot be paused in its own
  // past, so it is paused AHEAD ms on from now, and the CSS already running is taken as that much
  // further on too, to stay level with it
  // The page clock runs on while the check reads it and asks for the pause, so on a busy machine
  // that round trip can take longer than AHEAD and the pause lands in the clock's past ("Cannot
  // fast-forward to the past"): then read it again and ask further ahead.
  let AHEAD = 50;
  for (;;) {
    try {
      await page.clock.pauseAt((await page.evaluate(() => Date.now())) + AHEAD);
      break;
    } catch (e) {
      if (!/fast-forward to the past/.test(e.message) || AHEAD >= 5000) throw e;
      AHEAD *= 4;
    }
  }
  V = 0;
  mark = 0;
  await inFrame(sync, { V, mark, adopt: AHEAD });
  const clip = await page.locator('iframe').first().boundingBox();
  if (!clip) return { id, broke: 'no frame' };
  const runs = [];
  const notes = []; // interaction findings that are not about frames: { run, text }
  /**
   * tick(ms) for a run that cannot be turned back (script, pointer, a transition an action
   * started), filming the moments in between at most FINE ms apart as it goes: they are kept, as
   * run.between[i] between frames i and i + 1, only to confirm a candidate flicker (see
   * confirmFlicker), and the strip does not show them.
   */
  const tickFine = async (run, ms) => {
    const pieces = Math.max(1, Math.ceil(ms / FINE));
    const between = [];
    let s = null, done = 0;
    for (let p = 1; p <= pieces; p++) {
      const to = Math.round((ms * p) / pieces);
      s = await tick(to - done);
      done = to;
      if (p < pieces) between.push((await shoot(clip)).grid);
    }
    if (run.frames.length) (run.between ??= [])[run.frames.length - 1] = between;
    return s;
  };

  // THE LOOP
  const timing = await inFrame(timingOf);
  const loop = { name: 'loop', cyclic: true, frames: [], labels: [] };
  if (timing.count) {
    const n = Math.min(MOST, Math.max(PER_LOOP, Math.ceil((PER_LOOP * timing.loop) / timing.fastest / 2) * 2));
    // start on a whole loop past the longest delay, so every animation is in its steady state
    const start = Math.ceil((timing.lead + 1) / timing.loop) * timing.loop;
    // the last frame leads back into the first only when every endless animation fits the loop a
    // whole number of times; otherwise the seam is a jump the picture really has, not a glitch
    loop.cyclic = timing.periods.every((p) => Math.abs(timing.loop / p - Math.round(timing.loop / p)) < 0.01);
    loop.what = `${n} frames over ${(timing.loop / 1000).toFixed(2)}s, stepped on the page clock${loop.cyclic ? '' : ' (not a whole loop of every animation, so the seam is not judged)'}`;
    const V0 = V;
    await inFrame(startLoop, { V, start });
    for (let i = 0; i < n; i++) {
      await tick(V0 + Math.round((timing.loop * i) / n) - V);
      loop.frames.push(await shoot(clip));
      loop.labels.push(`${((V - V0) / 1000).toFixed(2)}s`);
    }
    // a candidate flicker is filmed again FINE ms at a time from the frame before it to the frame
    // after (see confirmFlicker): the loop's endless animations are turned back to those moments,
    // which their own time allows; script time is not turned back
    loop.fine = new Map();
    const at = (i) => Math.round((timing.loop * i) / n);
    for (const { frame: i } of judge(loop.frames.map((f) => f.grid), loop.cyclic).flicker) {
      const from = at(i - 1), to = at(i + 1), steps = Math.max(2, Math.ceil((to - from) / FINE));
      const seq = [];
      for (let s = 0; s <= steps; s++) {
        await inFrame(seekLoop, { V, start, at: from + Math.round(((to - from) * s) / steps) });
        await tick(0);
        seq.push((await shoot(clip)).grid);
      }
      loop.fine.set(i, seq);
    }
    // everything after this is filmed with the loop's CSS held still on its first frame; script
    // time goes on
    await inFrame(holdLoop, start);
    await tick(0);
  } else {
    loop.what = `${PER_LOOP} frames 100ms of page time apart (no endless CSS animation: it moves in script, or not at all)`;
    loop.cyclic = false;
    loop.coarse = true;
    const V0 = V;
    for (let i = 0; i < PER_LOOP; i++) {
      if (i) await tickFine(loop, 100);
      loop.frames.push(await shoot(clip));
      loop.labels.push(`${((V - V0) / 1000).toFixed(2)}s`);
    }
  }
  runs.push(loop);

  // THE INTERACTION
  const box = await page.locator('.stage[data-demo], .stage').first().boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const ways = demo ? interactionsOf(demo) : [];
  const away = () => page.mouse.move(box.x + 1, box.y + 1);
  const toFrame = (x, y) => page.mouse.move(clip.x + x, clip.y + y, { steps: 3 });

  /**
   * Films what `act` sets off, on the page clock: across the CSS transitions it starts in STEPS
   * steps, and on while anything it set off still moves; or, when it starts none (the change is
   * made by script, or there is none), 8 frames 70ms apart. Says so when the picture after is the
   * picture before.
   */
  const through = async (name, act, quietOk = false, box = null) => {
    const before = await shoot(clip);
    mark = V;
    await act();
    // what the action started starts now: getAnimations() in sync() applies the style change
    const s = await tick(0);
    const run = { name, cyclic: false, frames: [before], labels: ['before'], response: true };
    const stepped = s.fresh > 0 && s.length > 0;
    // across the transitions it started in STEPS steps; then on, a step at a time, for as long as
    // anything is still moving (what a script started later, on a timer or on transitionend)
    const dt = stepped ? Math.max(1, Math.round(s.length / STEPS)) : 70;
    const least = stepped ? STEPS : 8;
    run.what = stepped ? `${s.fresh} transitions over ${(s.length / 1000).toFixed(2)}s, stepped on the page clock` : 'no CSS transition started; 70ms of page time apart';
    run.coarse = !stepped;
    run.frames.push(await shoot(clip));
    run.labels.push('0ms');
    let i = 1;
    for (; ; i++) {
      const now = await tickFine(run, dt);
      run.frames.push(await shoot(clip));
      run.labels.push(`${V - mark}ms`);
      if (i >= least && !now.running) break;
      if (i >= least * 3) { run.what += ', still moving when the film stopped'; break; }
    }
    if (i > least) run.what += `, and ${i - least} steps more while what it set off still moved`;
    const moved = change(before.grid, run.frames.at(-1).grid);
    const most = Math.max(...run.frames.map((f) => change(before.grid, f.grid)));
    // a small part (an 8vmin pill's tint, a thin focus ring) is a small share of the canvas: what
    // it changes is also measured round the part itself
    const near = box ? Math.max(...run.frames.map((f) => changeNear(before.grid, f.grid, box))) : 0;
    if (box) run.changedNear = +near.toFixed(2);
    run.changed = +moved.toFixed(2);
    if (most < STILL && near < STILL_NEAR && !quietOk) notes.push({ run: name, text: 'changes nothing on screen' });
    runs.push(run);
    return run;
  };

  /** A pointer lap, a drag or a scroll that leaves every frame as it was does nothing on screen. */
  const still = (run) => {
    if (Math.max(...run.frames.map((f) => change(run.frames[0].grid, f.grid))) < STILL) notes.push({ run: run.name, text: 'changes nothing on screen' });
  };
  const rest = await shoot(clip);
  const parts = await inFrame(partsOf);
  /** Reachability findings for one part; returns the point to put the pointer on, or null. */
  const aim = (part, verb) => {
    if (!part.tried) { notes.push({ run: `${verb} ${part.name}`, text: 'is outside the canvas or has no box' }); return null; }
    if (!part.hits.length) {
      notes.push({ run: `${verb} ${part.name}`, text: `the pointer can never land on it: at its middle it lands on ${part.middle ?? 'nothing'}` });
      return null;
    }
    const empty = part.hits.filter(([x, y]) => !inkAt(rest.grid, x, y)).length;
    if (part.hits.length >= 5 && empty / part.hits.length > 0.6)
      notes.push({ run: `${verb} ${part.name}`, text: `its hit area is mostly over empty canvas (${empty} of ${part.hits.length} reachable points draw nothing)` });
    return part.hits[0];
  };

  if (ways.includes('move') || ways.includes('drag')) {
    // it follows the pointer in script: a slow lap round the canvas, photographed as it goes
    const run = { name: ways.includes('drag') ? 'drag lap' : 'pointer lap', cyclic: false, frames: [], labels: [], what: 'pointer round the canvas, 90ms of page time apart', coarse: true };
    await page.mouse.move(cx, cy, { steps: 3 });
    if (ways.includes('drag')) await page.mouse.down();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      await page.mouse.move(cx + Math.cos(a) * box.width * 0.4, cy + Math.sin(a) * box.height * 0.4, { steps: 3 });
      await tickFine(run, 90);
      run.frames.push(await shoot(clip));
      run.labels.push(`${Math.round((360 * i) / 16)}°`);
    }
    if (ways.includes('drag')) await page.mouse.up();
    runs.push(run);
    still(run);
    await away();
    await tick(500);
  }

  if (ways.includes('scroll')) {
    const run = { name: 'scroll', cyclic: false, frames: [], labels: [], what: 'wheel down then up, 90ms of page time apart', coarse: true };
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 16; i++) {
      await page.mouse.wheel(0, i < 8 ? 120 : -120);
      await tickFine(run, 90);
      run.frames.push(await shoot(clip));
      run.labels.push(i < 8 ? `down ${i + 1}` : `up ${i - 7}`);
    }
    runs.push(run);
    still(run);
    await away();
  }

  // every hoverable part in turn, with a real pointer on a point that lands on it
  if (parts.hover.length) {
    await away();
    await tick(150);
    if (parts.hover.length > 1) {
      // and one pass straight across the model, as a visitor's pointer would go
      const run = { name: 'across', cyclic: false, frames: [], labels: [], what: 'pointer left to right through the middle, 80ms of page time apart', coarse: true };
      for (let i = 0; i <= 16; i++) {
        await page.mouse.move(box.x + (box.width * (i + 0.5)) / 17, cy, { steps: 2 });
        await tickFine(run, 80);
        run.frames.push(await shoot(clip));
        run.labels.push(`${Math.round((100 * i) / 16)}%`);
      }
      runs.push(run);
      await away();
      await tick(800);
    }
    for (const part of parts.hover) {
      const at = aim(part, 'hover');
      if (!at) continue;
      await through(`hover ${part.name}`, () => toFrame(...at), false, part.box);
      const state = await inFrame(stateOf, part.i);
      if (!state.hovered) notes.push({ run: `hover ${part.name}`, text: `the pointer at ${at.map(Math.round).join(',')} did not hover it` });
      await through(`leave ${part.name}`, away, false, part.box);
    }
  } else if (ways.includes('hover') && (await inFrame(holdHover, false))) {
    await through('hover (forced)', () => inFrame(holdHover, true));
    await through('leave (forced)', () => inFrame(holdHover, false));
  }

  // every control in turn, clicked where the pointer lands on it, and back again
  // quietOk: choosing what is already chosen, or pressing a plain button a second time, may
  // rightly change nothing
  const click = async (part, name, quietOk = false) => {
    const at = aim(part, 'click');
    const run = await through(name, async () => {
      if (at) await page.mouse.click(clip.x + at[0], clip.y + at[1]);
      else await inFrame(clickPart, part.i);
    }, quietOk, part.box);
    if (at) {
      const got = await inFrame(pressedOn, part.i);
      if (!got.ok) notes.push({ run: name, text: `the press at ${at.map(Math.round).join(',')} landed on ${got.name}, not on it, although elementFromPoint says that point is it` });
    }
    return run;
  };
  const pressable = /:active/.test(snippets[id]?.css ?? '');
  for (const part of parts.controls) {
    if (part.kind === 'slider') {
      aim(part, 'slide');
      for (const [word, v] of [['min', part.min], ['middle', (part.min + part.max) / 2], ['max', part.max]])
        await through(`slider ${part.name} to ${word}`, () => inFrame(setValue, [part.input, v]));
    } else if (part.kind === 'select') {
      for (let o = 1; o < Math.min(part.options, 4); o++) await through(`select ${part.name} option ${o + 1}`, () => inFrame(setValue, [part.input, o]));
    } else if (part.kind === 'toggle') {
      const on = await click(part, `toggle ${part.name} on`);
      const flipped = (await inFrame(stateOf, part.input)).checked;
      await click(part, `toggle ${part.name} off`);
      if (flipped === (await inFrame(stateOf, part.input)).checked) notes.push({ run: `toggle ${part.name}`, text: 'clicking twice did not switch it back and forth' });
      void on;
    } else if (part.kind === 'radio') {
      await click(part, `choose ${part.name}`, (await inFrame(stateOf, part.input)).checked);
      if (!(await inFrame(stateOf, part.input)).checked) notes.push({ run: `choose ${part.name}`, text: 'clicking it did not choose it' });
    } else {
      const was = await inFrame(stateOf, part.input);
      await click(part, `press ${part.name}`, was.current || pressable);
      await click(part, `press ${part.name} again`, !was.toggles);
      // a model that styles :active is filmed with the button held down, then let go
      const at = part.hits[0];
      if (pressable && at) {
        await page.mouse.move(clip.x + at[0], clip.y + at[1]);
        await through(`hold ${part.name} down`, () => page.mouse.down());
        await through(`let go of ${part.name}`, () => page.mouse.up());
      }
    }
    await away();
  }
  if (ways.includes('click') && !parts.controls.length) await through('click the middle', () => page.mouse.click(cx, cy));

  // keyboard focus, where the model styles :focus or :focus-visible
  for (const part of parts.focus) {
    // a key press first, so the browser treats the focus as keyboard focus (:focus-visible)
    await through(`focus ${part.name}`, async () => { await page.keyboard.press('Shift'); await inFrame(focusPart, part.i); }, false, part.box);
    const state = await inFrame(stateOf, part.i);
    if (!state.focused) notes.push({ run: `focus ${part.name}`, text: 'could not be focused' });
    else if (!state.visible) notes.push({ run: `focus ${part.name}`, text: 'focused, but the browser did not treat it as :focus-visible (a limit of this check)' });
    await through(`blur ${part.name}`, () => inFrame(blurAll), false, part.box);
  }

  // the same finding from a second click on the same part is said once
  const said = new Set();
  notes.splice(0, notes.length, ...notes.filter((n) => !said.has(n.run + n.text) && said.add(n.run + n.text)));
  const judged = runs.map((r) => {
    const j = { name: r.name, what: r.what, changed: r.changed, changedNear: r.changedNear, ...judge(r.frames.map((f) => f.grid), r.cyclic, !r.response) };
    // a candidate flicker is flagged only when the same stretch, filmed FINE ms at a time, flips
    // too (confirmFlicker); the ones that turn out to be motion are kept apart as `dismissed`
    const g = (i) => r.frames[r.cyclic ? (i + r.frames.length) % r.frames.length : i].grid;
    const seqAt = (i) => r.fine?.get(i) ?? [g(i - 1), ...(r.between?.[i - 1] ?? []), g(i), ...(r.between?.[i] ?? []), g(i + 1)];
    j.dismissed = [];
    j.flicker = j.flicker.filter(({ frame, cells, marked }) => {
      const seq = seqAt(frame);
      if (confirmFlicker(seq, marked)) return true;
      j.dismissed.push({ frame, cells, steps: seq.length - 1 });
      return false;
    }).map(({ frame, cells }) => ({ frame, cells }));
    // frames 70-100ms of page time apart are too far apart for a quick transition between two
    // of them to be anything but a jump in the picture, not in the model: no pops from those
    if (r.coarse) j.pops = [];
    return j;
  });
  const files = await strips(id, runs, judged, notes);
  return { id, parts: { hover: parts.hover.length, controls: parts.controls.length, focus: parts.focus.length }, notes, runs: judged, files };
}

/** The strips: every frame of every run, numbered, flagged ones outlined; split into pages. */
async function strips(id, runs, judged, notes) {
  const w = VW > 600 ? 180 : 132, cols = 12;
  const block = (run, r) => {
    const bad = new Map();
    for (const p of judged[r].pops) bad.set(p.to, 'pop');
    for (const f of judged[r].flicker) bad.set(f.frame, 'flicker');
    const flags = [
      judged[r].flicker.length ? `flicker at ${judged[r].flicker.map((f) => `${f.frame} (${f.cells} cells)`).join(', ')}` : '',
      judged[r].pops.length ? `pop ${judged[r].pops.map((p) => `${p.from}→${p.to} (${p.change} vs mean ${p.mean})`).join(', ')}` : '',
      judged[r].dismissed.length ? `not flicker, only fast motion when filmed ${FINE}ms at a time: ${judged[r].dismissed.map((f) => f.frame).join(', ')}` : '',
      ...notes.filter((n) => n.run === run.name).map((n) => n.text),
    ].filter(Boolean).join('; ');
    const tiles = run.frames.map((f, i) => `<figure class="${bad.get(i) ?? ''}"><img src="data:image/png;base64,${f.png.toString('base64')}"><figcaption>${i} · ${run.labels[i]}</figcaption></figure>`).join('');
    return { rows: Math.ceil(run.frames.length / cols), html: `<h2>${run.name} <small>${run.what}</small>${flags ? ` <em>${flags}</em>` : ''}</h2><div class="row">${tiles}</div>` };
  };
  const pages = [[]];
  let rows = 0;
  runs.forEach((run, r) => {
    const b = block(run, r);
    if (rows + b.rows > 10 && pages.at(-1).length) { pages.push([]); rows = 0; }
    pages.at(-1).push(b.html);
    rows += b.rows;
  });
  const loose = notes.filter((n) => !runs.some((r) => r.name === n.run));
  const files = [];
  for (let p = 0; p < pages.length; p++) {
    await sheet.setContent(`<style>
body{margin:0;padding:8px;background:#222;color:#ddd;font:12px system-ui;width:${cols * (w + 5)}px}
h1{font-size:15px;margin:0 0 6px}h2{font-size:12px;margin:8px 0 4px}small{color:#999;font-weight:400}em{color:#ff8a8a;font-style:normal}
p{margin:2px 0;color:#ff8a8a}
.row{display:grid;grid-template-columns:repeat(${cols},${w}px);gap:5px}
figure{margin:0;outline:2px solid transparent}figure.flicker{outline-color:#ff3b3b}figure.pop{outline-color:#ffb020}
img{display:block;width:${w}px}figcaption{font-size:10px;color:#aaa}
</style><h1>${id} <small>${VW} × ${VH}${pages.length > 1 ? `, page ${p + 1} of ${pages.length}` : ''}</small></h1>
${p === 0 ? loose.map((n) => `<p>${n.run}: ${n.text}</p>`).join('') : ''}${pages[p].join('')}`);
    const file = `${id}${suffix}${p ? `-${p + 1}` : ''}.jpg`;
    await sheet.screenshot({ path: join(OUT, file), type: 'jpeg', quality: 85, fullPage: true });
    files.push(file);
  }
  return files;
}

const report = [];
for (const id of ids) {
  let result;
  try {
    result = await film(id);
  } catch (e) {
    result = { id, broke: e.message.split('\n')[0] };
  }
  report.push(result);
  if (result.broke) { console.log(`BROKE   ${id.padEnd(16)} ${result.broke}`); continue; }
  const found = [
    ...result.runs.flatMap((r) => [
      ...(r.flicker.length ? [`${r.name}: flicker at ${r.flicker.map((f) => f.frame).join(',')}`] : []),
      ...(r.pops.length ? [`${r.name}: pop ${r.pops.map((p) => `${p.from}→${p.to}`).join(',')}`] : []),
    ]),
    ...result.notes.map((n) => `${n.run}: ${n.text}`),
  ];
  const { hover, controls, focus } = result.parts;
  const dismissed = result.runs.reduce((sum, r) => sum + r.dismissed.length, 0);
  console.log(`${found.length ? 'LOOK AT' : 'smooth '} ${id.padEnd(16)} ${hover} hover, ${controls} controls, ${focus} focus; ${result.files.length} strip(s)${dismissed ? `; ${dismissed} flicker candidate(s) dismissed as motion on a ${FINE}ms re-film` : ''}`);
  for (const f of found) console.log(`          ${f}`);
}
writeFileSync(join(OUT, `report${suffix}.json`), JSON.stringify(report, null, 1));
const flagged = report.filter((r) => r.broke || r.notes.length || r.runs.some((x) => x.flicker.length || x.pops.length));
console.log(`\n${report.length - flagged.length}/${report.length} pass the automatic check. It only flags; the strips in ${OUT} have to be looked at.`);
await browser.close();
await vite.close();
