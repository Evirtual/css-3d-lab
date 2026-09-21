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
 * For each model it takes:
 *  - THE LOOP: every CSS animation paused and stepped together through one period of the longest
 *    of them (twice the duration for an alternating one), at least 24 frames, more when a short
 *    animation would otherwise move too far between frames. A model with no CSS animation moves in
 *    script, which cannot be paused, so it is photographed in real time instead and says so.
 *  - THE INTERACTION: a real pointer over the middle (and, for a model that follows the pointer,
 *    a sweep round the canvas); where the pointer lands on nothing, :hover is forced the way
 *    check-models.mjs forces it. The transitions that starts are paused and stepped in, then the
 *    hover is taken away and the way back is stepped too. A model with controls has its first
 *    control clicked and that transition stepped.
 *
 * Two ways to find a glitch:
 *  - AUTOMATIC. The frame is cut into small cells. A cell that is colour A, then a clearly
 *    different colour B, then A again in the next frame, over a patch big enough to be a surface
 *    and not a passing edge, is FLICKER (two surfaces z-fighting, or depth order flipping and
 *    flipping back). A frame-to-frame change far above the model's own average, and far above the
 *    frames either side of it, is a POP (a jump, or one surface passing through another). Both are
 *    hints for a human to look at, not verdicts: a fast legitimate move can trip them too.
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
import { inflateSync } from 'node:zlib';
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
const PATCH = 6; // cells in one connected patch before a flip counts as a surface and not an edge
const POP = 2.6; // a change this many times the model's average ...
const LONELY = 1.8; // ... and this many times the frames either side of it, is a pop
const QUIET = 1.5; // a change under this (mean channel difference) is too small to call a pop

const BARE = `html, body, .embed, .stage { background: none !important; border: 0 !important; }
.stage::before, .stage::after { display: none !important; }
.embed__credit, .embed__og { display: none !important; }
html { background: #10111a !important; }`;

/** A PNG as RGBA bytes. Chromium writes 8-bit RGB or RGBA PNGs. */
function decode(png) {
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
  const channels = { 2: 3, 6: 4 }[kind];
  if (depth !== 8 || !channels) throw new Error(`cannot read this PNG (depth ${depth}, colour type ${kind})`);
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const row = Buffer.alloc(stride), above = Buffer.alloc(stride);
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0, read = 0; y < height; y++) {
    const filter = raw[read++];
    raw.copy(row, 0, read, read + stride);
    read += stride;
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
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4, s = x * channels;
      rgba[o] = row[s]; rgba[o + 1] = row[s + 1]; rgba[o + 2] = row[s + 2]; rgba[o + 3] = channels === 4 ? row[s + 3] : 255;
    }
  }
  return { width, height, rgba };
}

/** The picture averaged into CELL × CELL cells: { cols, rows, rgb: Float32Array } */
function cells({ width, height, rgba }) {
  const cols = Math.floor(width / CELL), rows = Math.floor(height / CELL);
  const rgb = new Float32Array(cols * rows * 3);
  for (let cy = 0; cy < rows; cy++)
    for (let cx = 0; cx < cols; cx++) {
      let r = 0, g = 0, b = 0;
      for (let y = 0; y < CELL; y++)
        for (let x = 0; x < CELL; x++) {
          const o = ((cy * CELL + y) * width + cx * CELL + x) * 4;
          r += rgba[o]; g += rgba[o + 1]; b += rgba[o + 2];
        }
      const c = (cy * cols + cx) * 3, n = CELL * CELL;
      rgb[c] = r / n; rgb[c + 1] = g / n; rgb[c + 2] = b / n;
    }
  return { cols, rows, rgb };
}

const far = (p, q, i) => Math.max(Math.abs(p.rgb[i] - q.rgb[i]), Math.abs(p.rgb[i + 1] - q.rgb[i + 1]), Math.abs(p.rgb[i + 2] - q.rgb[i + 2]));
const change = (p, q) => {
  let sum = 0;
  for (let i = 0; i < p.rgb.length; i++) sum += Math.abs(p.rgb[i] - q.rgb[i]);
  return sum / p.rgb.length;
};

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
 * Flicker and pops in one run of frames. `cyclic` when the last frame leads back into the first
 * (a loop), not for a transition. Returns per-frame flags and the change curve.
 */
function judge(frames, cyclic) {
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
    const patch = biggestPatch(marked, b.cols, b.rows);
    if (patch >= PATCH) flicker.push({ frame: i, cells: patch });
  }
  const mean = diffs.reduce((s, d) => s + d, 0) / (diffs.length || 1);
  for (let i = 0; i < diffs.length; i++) {
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
  const out = { count: 0, loop: 0, fastest: Infinity, lead: 0 };
  for (const a of document.getAnimations()) {
    const t = a.effect?.getComputedTiming?.();
    if (!t || typeof t.duration !== 'number' || !(t.duration > 0)) continue;
    const period = t.duration * (/alternate/.test(t.direction) ? 2 : 1);
    out.count++;
    out.loop = Math.max(out.loop, period);
    out.fastest = Math.min(out.fastest, period);
    out.lead = Math.max(out.lead, t.delay ?? 0);
  }
  return out;
}

/** Every animation paused at time `t` of the page's clock. */
function pauseAt(_, t) {
  for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
}

/** Remembers the animations there are now, so the ones an action starts can be told apart. */
function know() { window.c3dKnown = new Set(document.getAnimations()); }

/** The transitions (and animations) started since know(), paused, and how long they all take. */
function started() {
  const fresh = document.getAnimations().filter((a) => !(window.c3dKnown ?? new Set()).has(a));
  let length = 0;
  for (const a of fresh) {
    a.pause();
    const t = a.effect?.getComputedTiming?.();
    const whole = typeof t?.activeDuration === 'number' && isFinite(t.activeDuration) ? t.activeDuration : typeof t?.duration === 'number' ? t.duration : 0;
    length = Math.max(length, (t?.delay ?? 0) + whole);
  }
  window.c3dFresh = fresh;
  window.c3dLength = length;
  return { count: fresh.length, length };
}

/** Those transitions set to `phase` (0..1) of their length. */
function phaseAt(_, phase) { for (const a of window.c3dFresh ?? []) a.currentTime = window.c3dLength * phase; }

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
        const head = s.slice(0, at).trim();
        if (head && !/[\s>+~(]$/.test(head)) heads[kind].add(head);
      }
    }
  }
  const all = (window.c3dParts = []);
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
          if (at && (at === el || el.contains(at) || (el.control && at === el.control))) hits.push([x, y]);
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
    return { i: all.length - 1, kind, name: describe(el), ...reach(el), ...extra };
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
    // a hidden input is reached through its label, so the label is what the pointer must land on
    const target = !shows(el) && el.labels?.length ? [...el.labels].find(shows) : el;
    if (target !== el && controls.some((c) => all[c.i] === target)) continue;
    controls.push(add(target, kind, { input: all.push(input ?? target) - 1, min: +(el.min || 0), max: +(el.max || 100), options: el.options?.length ?? 0 }));
  }
  return { hover, focus, controls };
}

/** Whether part `i` is hovered, focused (visibly) or checked right now. */
function stateOf(_, i) {
  const el = window.c3dParts[i];
  return { hovered: el.matches(':hover'), focused: el.matches(':focus'), visible: el.matches(':focus-visible'), checked: !!el.checked };
}
function clickPart(_, i) { window.c3dParts[i].click(); }
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
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('  page error:', e.message));
const sheet = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
const inFrame = (fn, arg) => page.frameLocator('iframe').locator('body').evaluate(fn, arg);
const BG = [16, 17, 26];
const suffix = VW === 360 && VH === 300 ? '' : `@${VW}x${VH}`;

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
  await page.goto(`${base}/embed/${id}/`, { waitUntil: 'domcontentloaded' });
  const there = await page.waitForSelector('iframe[data-ready="true"]', { timeout: 20_000 }).then(() => true).catch(() => false);
  if (!there) return { id, broke: 'never appeared' };
  await page.addStyleTag({ content: BARE });
  await page.mouse.move(1, 1);
  await page.waitForTimeout(300);
  const clip = await page.locator('iframe').first().boundingBox();
  if (!clip) return { id, broke: 'no frame' };
  const runs = [];
  const notes = []; // interaction findings that are not about frames: { run, text }

  // THE LOOP
  const timing = await inFrame(timingOf);
  const loop = { name: 'loop', cyclic: true, frames: [], labels: [] };
  if (timing.count) {
    const n = Math.min(MOST, Math.max(PER_LOOP, Math.ceil((PER_LOOP * timing.loop) / timing.fastest / 2) * 2));
    // start on a whole loop past the longest delay, so every animation is in its steady state
    const start = Math.ceil((timing.lead + 1) / timing.loop) * timing.loop;
    loop.what = `${n} frames over ${(timing.loop / 1000).toFixed(2)}s, stepped`;
    for (let i = 0; i < n; i++) {
      const t = start + (timing.loop * i) / n;
      await inFrame(pauseAt, t);
      loop.frames.push(await shoot(clip));
      loop.labels.push(`${((t - start) / 1000).toFixed(2)}s`);
    }
    // everything after this is filmed with the loop held still on its first frame
    await inFrame(pauseAt, start);
  } else {
    loop.what = `${PER_LOOP} frames in real time (it moves in script, or not at all)`;
    loop.cyclic = false;
    const t0 = Date.now();
    for (let i = 0; i < PER_LOOP; i++) {
      loop.frames.push(await shoot(clip));
      loop.labels.push(`${((Date.now() - t0) / 1000).toFixed(2)}s`);
      await page.waitForTimeout(60);
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
   * Films what `act` sets off. CSS transitions are paused and stepped through; when it starts
   * none (the change is made by script, or there is none), frames are taken in real time. Says so
   * when the picture after is the picture before.
   */
  const through = async (name, act) => {
    const before = await shoot(clip);
    await inFrame(know);
    await act();
    await page.waitForTimeout(40);
    const s = await inFrame(started);
    const run = { name, cyclic: false, frames: [before], labels: ['before'] };
    if (s.count && s.length > 0) {
      run.what = `${s.count} transitions over ${(s.length / 1000).toFixed(2)}s, stepped`;
      for (let i = 0; i <= STEPS; i++) {
        await inFrame(phaseAt, i / STEPS);
        run.frames.push(await shoot(clip));
        run.labels.push(`${Math.round((100 * i) / STEPS)}%`);
      }
      await inFrame(phaseAt, 1);
    } else {
      run.what = 'no CSS transition started; real time';
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(70);
        run.frames.push(await shoot(clip));
        run.labels.push(`${70 * (i + 1)}ms`);
      }
    }
    const moved = change(before.grid, run.frames.at(-1).grid);
    const most = Math.max(...run.frames.map((f) => change(before.grid, f.grid)));
    run.changed = +moved.toFixed(2);
    if (most < 0.12) notes.push({ run: name, text: 'changes nothing on screen' });
    runs.push(run);
    return run;
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
    const run = { name: ways.includes('drag') ? 'drag lap' : 'pointer lap', cyclic: false, frames: [], labels: [], what: 'pointer round the canvas, real time' };
    await page.mouse.move(cx, cy, { steps: 3 });
    if (ways.includes('drag')) await page.mouse.down();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      await page.mouse.move(cx + Math.cos(a) * box.width * 0.4, cy + Math.sin(a) * box.height * 0.4, { steps: 3 });
      await page.waitForTimeout(90);
      run.frames.push(await shoot(clip));
      run.labels.push(`${Math.round((360 * i) / 16)}°`);
    }
    if (ways.includes('drag')) await page.mouse.up();
    runs.push(run);
    await away();
    await page.waitForTimeout(500);
  }

  if (ways.includes('scroll')) {
    const run = { name: 'scroll', cyclic: false, frames: [], labels: [], what: 'wheel down then up, real time' };
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 16; i++) {
      await page.mouse.wheel(0, i < 8 ? 120 : -120);
      await page.waitForTimeout(90);
      run.frames.push(await shoot(clip));
      run.labels.push(i < 8 ? `down ${i + 1}` : `up ${i - 7}`);
    }
    runs.push(run);
    await away();
  }

  // every hoverable part in turn, with a real pointer on a point that lands on it
  if (parts.hover.length) {
    await away();
    await page.waitForTimeout(150);
    if (parts.hover.length > 1) {
      // and one pass straight across the model, as a visitor's pointer would go
      const run = { name: 'across', cyclic: false, frames: [], labels: [], what: 'pointer left to right through the middle, real time' };
      for (let i = 0; i <= 16; i++) {
        await page.mouse.move(box.x + (box.width * (i + 0.5)) / 17, cy, { steps: 2 });
        await page.waitForTimeout(80);
        run.frames.push(await shoot(clip));
        run.labels.push(`${Math.round((100 * i) / 16)}%`);
      }
      runs.push(run);
      await away();
      await page.waitForTimeout(800);
    }
    for (const part of parts.hover) {
      const at = aim(part, 'hover');
      if (!at) continue;
      await through(`hover ${part.name}`, () => toFrame(...at));
      const state = await inFrame(stateOf, part.i);
      if (!state.hovered) notes.push({ run: `hover ${part.name}`, text: `the pointer at ${at.map(Math.round).join(',')} did not hover it` });
      await through(`leave ${part.name}`, away);
    }
  } else if (ways.includes('hover') && (await inFrame(holdHover, false))) {
    await through('hover (forced)', () => inFrame(holdHover, true));
    await through('leave (forced)', () => inFrame(holdHover, false));
  }

  // every control in turn, clicked where the pointer lands on it, and back again
  const click = async (part, name) => {
    const at = aim(part, 'click');
    return through(name, async () => {
      if (at) await page.mouse.click(clip.x + at[0], clip.y + at[1]);
      else await inFrame(clickPart, part.i);
    });
  };
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
      await click(part, `choose ${part.name}`);
      if (!(await inFrame(stateOf, part.input)).checked) notes.push({ run: `choose ${part.name}`, text: 'clicking it did not choose it' });
    } else {
      await click(part, `press ${part.name}`);
      await click(part, `press ${part.name} again`);
    }
    await away();
  }
  if (ways.includes('click') && !parts.controls.length) await through('click the middle', () => page.mouse.click(cx, cy));

  // keyboard focus, where the model styles :focus or :focus-visible
  for (const part of parts.focus) {
    await through(`focus ${part.name}`, () => inFrame(focusPart, part.i));
    const state = await inFrame(stateOf, part.i);
    if (!state.focused) notes.push({ run: `focus ${part.name}`, text: 'could not be focused' });
    else if (!state.visible) notes.push({ run: `focus ${part.name}`, text: 'focused, but the browser did not treat it as :focus-visible (a limit of this check)' });
    await through(`blur ${part.name}`, () => inFrame(blurAll));
  }

  const judged = runs.map((r) => ({ name: r.name, what: r.what, changed: r.changed, ...judge(r.frames.map((f) => f.grid), r.cyclic) }));
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
  console.log(`${found.length ? 'LOOK AT' : 'smooth '} ${id.padEnd(16)} ${hover} hover, ${controls} controls, ${focus} focus; ${result.files.length} strip(s)`);
  for (const f of found) console.log(`          ${f}`);
}
writeFileSync(join(OUT, `report${suffix}.json`), JSON.stringify(report, null, 1));
const flagged = report.filter((r) => r.broke || r.notes.length || r.runs.some((x) => x.flicker.length || x.pops.length));
console.log(`\n${report.length - flagged.length}/${report.length} pass the automatic check. It only flags; the strips in ${OUT} have to be looked at.`);
await browser.close();
await vite.close();
