/**
 * Pause and access: every model stops when the site pauses it, every control has a name, the
 * keyboard reaches everything a mouse can use, and the pointer reaches every control where it is
 * drawn (`elementFromPoint` and a real click, at rest and in its states, on a card and at 1280 × 900).
 *
 *   node scripts/check-access.mjs                   every model
 *   node scripts/check-access.mjs clock dice        just these
 *   node scripts/check-access.mjs --try file.mjs    a model that is not in the gallery (a default
 *                                                   export { title, html, css, js }), mounted the
 *                                                   same way: how the check is proved on broken
 *                                                   copies in .media-tmp/access/
 *   node scripts/check-access.mjs --jobs 3          models side by side (default 3), one browser
 *
 * Each model is mounted the way check-models and check-motion mount it: its embed page
 * (/embed/<id>/) on a 360 × 300 card, the model in the site's own frame (src/preview.ts), the
 * site's backdrop replaced by one flat colour, the frame clipped. Then, in this order:
 *
 *  1. DOES IT MOVE. Pictures 0.5s and 1s after the first, unpaused: if any differs, the model moves
 *     on its own, and step 3 must see it move again.
 *  2. PAUSE. The site's paused state is set the way the Pause switch sets it (data-paused on the
 *     page's root; the frame follows it into its own <html data-paused>, which is the signal a
 *     model's script reads, docs/VIEW-CONTRACT.md) and prefers-reduced-motion: reduce is emulated
 *     as well. After 0.5s a picture, then one 1s later and one 3s after that (a slow timer): all
 *     three must be the same picture, bar at most TINY pixels. A model that keeps moving FAILS,
 *     whether a CSS animation, a transition set off by a timer, or a script draws the change.
 *  3. RESUME. Un-paused and the emulation taken off, a model that moved in step 1 must move again:
 *     four pictures 0.5s apart, and one of them must differ.
 *  4. NAMES. Paused again, every rendered element in the model a visitor can focus or operate (a,
 *     button, input, select, textarea, summary, [tabindex] ≥ 0, [contenteditable], and the widget
 *     roles) must have an accessible name. The name is Chromium's own, from its accessibility tree over
 *     CDP (aria-labelledby, aria-label, label[for], a wrapping label, alt, title, content), so a
 *     visually hidden radio is named through its label exactly as a screen reader hears it. A
 *     focusable element without a widget role (a hover-only div with tabindex="0") has no name
 *     from content in that tree; its text content counts instead, as a screen reader reads it.
 *     A focusable element the accessibility tree ignores (inside aria-hidden) fails too.
 *  5. KEYBOARD. Tab is pressed from the page into the frame until focus leaves it or comes round
 *     again, and every stop is recorded. Everything a mouse can use must be among them:
 *      - native controls and widget roles (a radio or a roving tab is reached when one of its
 *        group is: the rest are an arrow key away); an input the page does not draw
 *        (display: none) but whose label is on screen is a mouse control Tab can never reach;
 *      - elements the model's script listens to for click, pointer or mouse events (read from
 *        CDP's event listeners), when neither they nor anything inside or around them is a stop;
 *      - hover targets: the part of each selector in front of :hover in the model's own CSS, as
 *        scripts/css-heads.mjs reads them (check-motion reads them the same way). A hover target
 *        that is not a native control must be a stop (or hold one, or sit in one), and the CSS
 *        must give it the same effect on focus: some selector with :focus, :focus-visible or
 *        :focus-within must name it or a part around it (docs/ADDING-MODELS.md rule 10).
 *     And focus must show: each stop's picture is compared with the picture before any stop, round
 *     the stop (its box two cells wider, or its label's when it is a hidden input) and over the
 *     canvas, with check-motion's own measure and thresholds (scripts/pixels.mjs: STILL_NEAR round
 *     the part, STILL over the canvas). A stop that changes neither shows no focus.
 *  6. POINTER. Every control a mouse is meant to use must take the mouse's own hit: the native
 *     controls and widget roles of step 5 (a hidden input through its drawn label), every element
 *     with tabindex ≥ 0, and every element the script listens to for click, press or drag. Chrome
 *     drops 3D content lying behind the plane of its 3D context's root from the hit test, so a
 *     control tipped behind a flat wrapper is drawn and listed first by elementsFromPoint, while
 *     elementFromPoint and a real click land on the wrapper (the padlock's wheel 1 down key and
 *     the controller's Y, Home and bumpers, 2026-10-11; docs/ADDING-MODELS.md rule 17). So, still
 *     paused, each control is aimed at the middle of where it is drawn in front (a 9 × 9 grid over
 *     its box, every 1.5px when that finds nothing in front, the points where elementsFromPoint
 *     puts it or a part of it first, the one nearest their centre), and:
 *      - at rest, with no pointer over the model, document.elementFromPoint there must be the
 *        control or something in it; and the same for a model that moves on its own, with every
 *        animation seeked to 12.5%, 25% … 87.5% of its loop, so a sway that hides a control for
 *        part of the loop fails whatever moment the pause landed on (heatmap, 2026-10-11);
 *      - then, from the resting pose, the mouse moves there and, once whatever it hovers has
 *        settled, the same must hold at the pointer; and a real click there (held 80ms) must reach
 *        it: the pointerdown's and the click's target are the control or something in it, or, when
 *        the script captured the pointer on the press (a knob's drag on its dial), the click went
 *        to what captured it.
 *     The pointing and clicking go round every control twice, in order, so a control is also tried
 *     in the state the others leave behind (open and shut, on and off), and a control that is not
 *     drawn in one state is tried in the next. All of it runs on the card and again on a fresh
 *     1280 × 900 page (check-stages' viewer size). A control no state lets the pointer reach at
 *     all (pointer-events: none on it, or always under another part) fails too.
 *
 * Prints `pass <id> …` or `FAILS <id> …` with each problem indented under it, and a tally.
 * Exits 1 when a model fails (or could not be checked). The three pictures of a model that moved
 * while paused, and report.json with every model's numbers, go to .media-tmp/access/.
 *
 * A BROKEN BROWSER BREAKS ONE MODEL AT MOST (scripts/browser-guard.mjs). A model whose run hits a
 * browser-level error (a protocol error, "Unable to capture screenshot", a goto timeout, a crashed
 * or closed target) is checked again, once, in a fresh browser (the models beside it finish first,
 * or are retried with it), and its line ends "retried after a browser failure"; only a second
 * failure makes it "could not be checked". The browser is also replaced every 20 models; a model
 * waits (up to 3 minutes) while free memory is under 1.5 GB, and its line ends "ran under memory
 * pressure" when it had to go on anyway; and a crash inside Playwright writes report.json with the
 * models checked so far and exits 3, rather than dying silently.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer as createVite } from 'vite';
import { launchChromium } from './browser.mjs';
import { BrowserGuard, crashGuard, isBrowserError, unlessBrowser } from './browser-guard.mjs';
import { decode, cells, changeNear, change, STILL, STILL_NEAR } from './pixels.mjs';
import { cssHeads } from './css-heads.mjs';

const OUT = resolve('.media-tmp/access');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const at = args.indexOf(name);
  return at === -1 ? fallback : args.splice(at, 2)[1];
};
const JOBS = Math.max(1, Number(opt('--jobs', 3)));
const TRY = opt('--try', null);
const wanted = args.filter((a) => !a.startsWith('-'));
const VW = 360, VH = 300;
const BIG = { width: 1280, height: 900 }; // step 6 again at check-stages' viewer size
const MOMENTS = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]; // shares of its loop a moving model is aimed at in
const SETTLE = 550; // ms for what a hover or a click sets off to come to rest (most transitions are under 0.5s)
const CELL = Math.max(4, Math.round(Math.min(VW, VH) / 75)); // check-motion's grain at this size
const DIFF = 10; // a pixel whose largest channel moved more than this has changed ...
const TINY = 8; // ... and a model whose picture changed in more pixels than this is not still
const MOST_TABS = 80;

const BARE = `html, body, .embed, .stage { background: none !important; border: 0 !important; }
.stage::before, .stage::after { display: none !important; }
.embed__credit, .embed__og { display: none !important; }
html { background: #10111a !important; }`;

/** Pixels whose largest channel differs by more than DIFF between two decoded pictures. */
function pixelsChanged(a, b) {
  let n = 0;
  for (let i = 0; i < a.rgba.length; i += 4)
    if (Math.max(Math.abs(a.rgba[i] - b.rgba[i]), Math.abs(a.rgba[i + 1] - b.rgba[i + 1]), Math.abs(a.rgba[i + 2] - b.rgba[i + 2])) > DIFF) n++;
  return n;
}

// ---- in the frame ----

const ROLES = 'button link slider tab switch checkbox radio menuitem menuitemcheckbox menuitemradio option spinbutton textbox combobox searchbox scrollbar treeitem gridcell'.split(' ');
const NATIVE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary';

/**
 * Marks every element of the model (data-c3d-n) so CDP can find it, and returns what the checks
 * need: the focusable or operable ones (named), the mouse controls, the hover targets with
 * whether the CSS gives them a focus counterpart.
 */
function survey({ ROLES, NATIVE, heads }) {
  const scene = document.querySelector('#c3d-scene') || document.body;
  const els = [...scene.querySelectorAll('*')];
  els.forEach((el, n) => el.setAttribute('data-c3d-n', String(n)));
  const shows = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1;
  };
  const rendered = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const describe = (el) => {
    const cls = [...el.classList].filter((c) => !c.startsWith('c3d')).slice(0, 2).map((c) => '.' + c).join('');
    const type = el.matches('input') ? `[type=${el.type}]` : el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : '';
    const same = el.parentElement ? [...el.parentElement.children].filter((c) => c.tagName === el.tagName && c.className === el.className) : [];
    return `${el.tagName.toLowerCase()}${type}${cls}${same.length > 1 ? `#${same.indexOf(el) + 1}` : ''}`;
  };
  const roleSel = ROLES.map((r) => `[role="${r}"]`).join(', ');
  const n = (el) => Number(el.getAttribute('data-c3d-n'));
  // the part of the frame a change it makes would show in: itself, or a hidden input's labels
  const boxOf = (el) => {
    const own = el.getBoundingClientRect();
    const hidden = !shows(el) || (el.matches('input') && (+getComputedStyle(el).opacity < 0.05 || (own.width <= 2 && own.height <= 2)));
    const boxes = (hidden ? [...(el.labels ?? [])] : [el]).filter(shows).map((x) => x.getBoundingClientRect());
    return boxes.length ? [Math.min(...boxes.map((b) => b.left)), Math.min(...boxes.map((b) => b.top)), Math.max(...boxes.map((b) => b.right)), Math.max(...boxes.map((b) => b.bottom))] : null;
  };

  // focusable or operable: needs a name
  // only what is rendered: a visually hidden input (opacity, clip) is, and is named through its
  // label; one with display: none is not in the page for anyone, and step 5 judges its label
  const named = els.filter((el) => {
    if (!rendered(el)) return false;
    if (el.matches(NATIVE) || el.matches(roleSel) || el.isContentEditable) return !el.disabled;
    return el.hasAttribute('tabindex') && el.tabIndex >= 0;
  });

  // mouse controls: native and widget-role ones that are drawn, or reached through a drawn label
  const controls = [];
  for (const el of els) {
    if (!(el.matches(NATIVE) || el.matches(roleSel)) || el.disabled) continue;
    const viaLabel = el.matches('input') && [...(el.labels ?? [])].some(shows);
    if (!shows(el) && !viaLabel && !(el.matches('input') && rendered(el))) continue;
    controls.push({ n: n(el), name: describe(el), unfocusable: el.matches('input') && !rendered(el) && viaLabel,
      group: el.matches('input[type="radio"]') && el.name ? `radio:${el.name}` : el.matches('[role="tab"], [role="radio"], [role="option"], [role="menuitem"], [role="treeitem"], [role="gridcell"]') && el.parentElement ? `roving:${n(el.parentElement)}` : null });
  }

  // hover and focus heads from the model's own CSS, read in Node by scripts/css-heads.mjs (as
  // check-motion reads them)
  const matching = (sel) => { try { return [...document.querySelectorAll(sel)].filter((el) => scene.contains(el) && el !== scene); } catch { return []; } };
  const focusEls = new Set([...heads.focus].flatMap(matching));
  const hover = [];
  for (const head of heads.hover) {
    for (const el of matching(head)) {
      // a disabled control is out of use for the mouse too
      if (!shows(el) || el.disabled || hover.some((h) => h.n === n(el))) continue;
      const native = el.matches(NATIVE) || el.matches(roleSel) || (el.matches('label') && !!el.control);
      // the same effect on focus: a focus selector names it, something round it, or something in it
      let counterpart = native;
      for (const f of focusEls) if (f === el || f.contains(el) || el.contains(f)) { counterpart = true; break; }
      hover.push({ n: n(el), name: describe(el), head, native, counterpart, control: el.matches('label') && el.control && scene.contains(el.control) ? n(el.control) : null });
    }
  }
  return {
    count: els.length,
    disabled: els.filter((el) => el.disabled).map(n),
    named: named.map((el) => ({ n: n(el), name: describe(el), generic: !el.matches(NATIVE) && !el.matches(roleSel) && !el.isContentEditable,
      text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), box: boxOf(el) })),
    controls,
    hover,
    parents: Object.fromEntries(els.map((el) => [n(el), el.parentElement && scene.contains(el.parentElement) && el.parentElement !== scene ? n(el.parentElement) : -1])),
  };
}

/** Where focus is in the frame now: the element's number and what is needed to judge it. */
function focusNow() {
  const a = document.activeElement;
  if (!a || a === document.body || a === document.documentElement) return null;
  const own = a.getBoundingClientRect();
  const shows = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const hidden = a.matches('input') && (+getComputedStyle(a).opacity < 0.05 || (own.width <= 2 && own.height <= 2) || !shows(a));
  const boxes = (hidden ? [...(a.labels ?? [])] : [a]).filter(shows).map((x) => x.getBoundingClientRect());
  const box = boxes.length ? [Math.min(...boxes.map((b) => b.left)), Math.min(...boxes.map((b) => b.top)), Math.max(...boxes.map((b) => b.right)), Math.max(...boxes.map((b) => b.bottom))] : null;
  const cls = [...a.classList].filter((c) => !c.startsWith('c3d')).slice(0, 2).map((c) => '.' + c).join('');
  return { n: a.hasAttribute('data-c3d-n') ? Number(a.getAttribute('data-c3d-n')) : -1, name: `${a.tagName.toLowerCase()}${cls}`, box, visible: a.matches(':focus-visible') };
}

/**
 * Step 6, in the frame. The controls are marked data-c3d-r="<k>" (by their data-c3d-n on the card,
 * by the path of child indexes from #c3d-scene on the big page, which survey has not numbered).
 *   { op: 'mark', ns } / { op: 'mark', paths }  marks them; returns each one's path and words
 *   { op: 'aim', k }       where the control is drawn in front, and what elementFromPoint hits there
 *   { op: 'test', k, at }  what elementFromPoint hits at that point now
 *   { op: 'seek', f }      every running animation to share f of its loop (0: the resting pose)
 *   { op: 'arm' }          starts recording pointerdown and click targets afresh
 *   { op: 'judge', k }     whether the first recorded pointerdown and click reached the control
 * A hidden input is aimed at through its drawn labels; the control, its labels and anything inside
 * them count as reaching it.
 */
function pointer({ op, k, at, ns, paths, f }) {
  const scene = document.querySelector('#c3d-scene') || document.body;
  if (op === 'mark') {
    document.querySelectorAll('[data-c3d-r]').forEach((el) => el.removeAttribute('data-c3d-r'));
    const pathOf = (el) => { const out = []; for (let x = el; x && x !== scene; x = x.parentElement) out.unshift([...x.parentElement.children].indexOf(x)); return out.join('/'); };
    const byPath = (p) => p.split('/').reduce((x, i) => x?.children[Number(i)], scene);
    const els = ns ? ns.map((n) => document.querySelector(`[data-c3d-n="${n}"]`)) : paths.map(byPath);
    return els.map((el, i) => {
      if (!el) return null;
      el.setAttribute('data-c3d-r', String(i));
      const words = (el.getAttribute('aria-label') || [...(el.labels ?? [])].map((l) => l.innerText).join(' ') || el.innerText || el.title || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 32);
      return { path: pathOf(el), words };
    });
  }
  if (op === 'seek') {
    // every running animation to the same share of its own loop (0 is the resting pose the
    // contract judges): how many there are
    const anims = document.getAnimations().filter((a) => { const t = a.effect?.getComputedTiming?.(); return t && Number.isFinite(t.duration) && t.duration > 0; });
    for (const a of anims) {
      const t = a.effect.getComputedTiming();
      a.pause();
      a.currentTime = Math.max(0, t.delay) + f * t.duration;
    }
    return anims.length;
  }
  if (op === 'arm') {
    window.__c3dHits = [];
    if (!window.__c3dArmed) {
      window.__c3dArmed = true;
      for (const t of ['pointerdown', 'gotpointercapture', 'click']) window.addEventListener(t, (e) => window.__c3dHits.push({ t, el: e.target }), true);
      // a click is about where it lands, not where it leads: no link is followed, no form sent
      window.addEventListener('click', (e) => { if (e.target.closest?.('a[href]')) e.preventDefault(); }, true);
      window.addEventListener('submit', (e) => e.preventDefault(), true);
    }
    return true;
  }
  const describe = (x) => {
    if (!x) return 'nothing';
    if (x === document.documentElement) return 'html';
    if (x === document.body) return 'body';
    const cls = [...x.classList].filter((c) => !c.startsWith('c3d')).slice(0, 2).map((c) => '.' + c).join('');
    const own = `${x.tagName.toLowerCase()}${x.id ? '#' + x.id : ''}${cls}`;
    // a part of another control says whose: another block's roof, a neighbouring key's cap
    const other = x.closest('[data-c3d-r]');
    // (by its first class only: a state class such as .open would split one failure into two lines)
    if (other && other !== x) return `${own} in ${other.tagName.toLowerCase()}${other.classList[0] ? '.' + other.classList[0] : ''} "${(other.getAttribute('aria-label') || other.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 32)}"`;
    if (other) return `${own} "${(other.getAttribute('aria-label') || other.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 32)}"`;
    return own;
  };
  const el = document.querySelector(`[data-c3d-r="${k}"]`);
  if (!el) return { skip: 'gone' };
  const shows = (x) => {
    const cs = getComputedStyle(x);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = x.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1;
  };
  const own = el.getBoundingClientRect();
  const hiddenInput = el.matches('input') && (!shows(el) || +getComputedStyle(el).opacity < 0.05 || (own.width <= 2 && own.height <= 2));
  const parts = hiddenInput ? [...(el.labels ?? [])].filter(shows) : shows(el) ? [el] : [];
  const within = (x) => !!x && x.nodeType === 1 && (x === el || el.contains(x) || parts.some((p) => p === x || p.contains(x)));
  if (op === 'judge') {
    const hits = window.__c3dHits ?? [];
    const down = hits.find((h) => h.t === 'pointerdown'), click = hits.find((h) => h.t === 'click');
    // a script that captures the pointer on the press (a knob's drag, on its dial) is sent the
    // click itself, wherever the release was: that click was reached through the control
    const captured = hits.some((h) => h.t === 'gotpointercapture' && h.el === click?.el);
    return { down: down ? describe(down.el) : 'nothing', downOk: within(down?.el), click: click ? describe(click.el) : 'nothing', clickOk: within(click?.el) || (captured && within(down?.el)) };
  }
  if (op === 'test') {
    const hit = document.elementFromPoint(at[0], at[1]);
    return { ok: within(hit), hit: describe(hit), front: within(document.elementsFromPoint(at[0], at[1])[0]) };
  }
  // aim
  if (!parts.length) return { skip: 'not drawn' };
  let inShape = [], front = [];
  const sample = (grid) => {
    inShape = []; front = [];
    for (const p of parts) {
      const r = p.getBoundingClientRect();
      const gx = grid(r.width), gy = grid(r.height);
      for (let i = 0; i < gx; i++) for (let j = 0; j < gy; j++) {
        const x = r.left + ((i + 0.5) * r.width) / gx, y = r.top + ((j + 0.5) * r.height) / gy;
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
        const list = document.elementsFromPoint(x, y);
        if (!list.some(within)) continue;
        inShape.push([x, y]);
        if (within(list[0])) front.push([x, y]);
      }
    }
  };
  sample(() => 9);
  // nothing in front on a 9 × 9 grid: a sliver may still show past what is in front of it (a low
  // block behind a tall one shows 5% of its roof), so look again every 1.5px, up to 60 a side
  if (!front.length) sample((len) => Math.min(60, Math.max(9, Math.ceil(len / 1.5))));
  if (!inShape.length) return { skip: 'not under the pointer' };
  const cx = inShape.reduce((s, q) => s + q[0], 0) / inShape.length, cy = inShape.reduce((s, q) => s + q[1], 0) / inShape.length;
  const pool = front.length ? front : inShape;
  const pt = pool.reduce((best, q) => (Math.hypot(q[0] - cx, q[1] - cy) < Math.hypot(best[0] - cx, best[1] - cy) ? q : best));
  const hit = document.elementFromPoint(pt[0], pt[1]);
  const first = document.elementsFromPoint(pt[0], pt[1])[0];
  return { at: pt, ok: within(hit), hit: describe(hit), front: within(first), cover: front.length ? null : describe(first) };
}

// ---- the run ----

const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, watch: null } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
let tried = null;
if (TRY) {
  const mod = await import(pathToFileURL(resolve(TRY)).href);
  tried = { title: 'try', js: '', ...(mod.default ?? mod) };
}
const ids = TRY ? [`try:${TRY.replace(/\\/g, '/').split('/').pop().replace(/\.m?js$/, '')}`] : wanted.length ? wanted : demos.map((d) => d.id);
const unknown = TRY ? [] : ids.filter((id) => !demos.some((d) => d.id === id));
if (unknown.length) {
  console.error(`check-access: no such model: ${unknown.join(', ')}`);
  await vite.close();
  process.exit(2);
}

mkdirSync(OUT, { recursive: true });
// replaced by a fresh one when it breaks, and every 20 models (scripts/browser-guard.mjs)
const guard = new BrowserGuard({ launch: () => launchChromium() });
await guard.start();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkModel(id, browser) {
  const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    return await checkOn(id, page, context, errors, browser);
  } catch (e) {
    if (isBrowserError(e)) throw e; // the browser's, not the model's: scripts/browser-guard.mjs retries it
    return { id, broke: e.message.split('\n')[0] };
  } finally {
    await context.close().catch(() => {});
  }
}

/** The model's embed page in `page`, bare: its frame and the frame's box on the page, or why not. */
async function mount(id, page) {
  await page.goto(`${base}/embed/${tried ? demos[0].id : id}/`, { waitUntil: 'domcontentloaded' });
  if (!(await page.waitForSelector('iframe[data-ready="true"]', { timeout: 20_000 }).then(() => true).catch(unlessBrowser(false)))) return { broke: 'never appeared' };
  if (tried) {
    // the tried model in place of the page's own, through the same Preview the site mounts with
    await page.evaluate(async (code) => {
      const { Preview } = await import('/src/preview.ts');
      const stage = document.querySelector('[data-demo]');
      const p = new Preview('try', code.title, code, code, 'dark');
      stage.replaceChildren(p.frame);
    }, { title: tried.title, html: tried.html, css: tried.css, ...(tried.js ? { js: tried.js } : {}) });
    if (!(await page.waitForSelector('iframe[data-ready="true"]', { timeout: 20_000 }).then(() => true).catch(unlessBrowser(false)))) return { broke: 'the tried model never appeared' };
  }
  await page.addStyleTag({ content: BARE });
  await page.mouse.move(1, 1);
  const frame = await (await page.$('iframe')).contentFrame();
  const clip = await page.locator('iframe').first().boundingBox();
  return { frame, clip };
}

/** The site's paused state, set the way the Pause switch sets it, with reduced motion emulated. */
async function setPausedOn(page, on) {
  await page.emulateMedia({ reducedMotion: on ? 'reduce' : 'no-preference' });
  await page.evaluate((on) => document.documentElement.toggleAttribute('data-paused', on), on);
  await page.waitForFunction((on) => document.querySelector('iframe')?.contentDocument?.documentElement.hasAttribute('data-paused') === on, on, { timeout: 5000 });
}

/**
 * Step 6 on one page: every control aimed at at rest, then pointed at and clicked, twice round.
 * `marked` is pointer()'s mark result. Returns, per control, the states it was reached in and
 * what it failed in.
 */
async function reach(page, frame, clip, marked, size) {
  const out = marked.map(() => ({ tried: 0, fails: [], skips: [] }));
  // what: 'hit <el>' (elementFromPoint there, or the press), 'the click went to <el>' (pressed, then lost), 'covered by <el>'
  const fail = (k, state, round, what, front = false) => out[k].fails.push({ state, round, size, what, front });
  await frame.evaluate(() => document.activeElement?.blur?.());
  await page.mouse.move(1, 1);
  await wait(SETTLE);
  // at rest, no pointer over it; and, for a model that moves on its own, at seven more moments of
  // its loop, since a sway can hide a control for part of it (heatmap's low block behind a tall
  // one, 2026-10-11). Where the pause happened to land would decide it otherwise
  for (const f of MOMENTS) {
    if ((await frame.evaluate(pointer, { op: 'seek', f })) === 0 && f > 0) break;
    for (let k = 0; k < marked.length; k++) {
      if (!marked[k]) continue;
      const r = await frame.evaluate(pointer, { op: 'aim', k });
      if (r.skip) { out[k].skips.push(r.skip); continue; }
      out[k].tried++;
      if (!r.ok) fail(k, f ? `at ${Math.round(f * 1000) / 10}% of its loop` : 'at rest', 1, r.cover ? `covered by ${r.cover}` : `hit ${r.hit}`, r.front);
    }
  }
  // pointed at, then clicked, twice round, from the resting pose
  await frame.evaluate(pointer, { op: 'seek', f: 0 });
  await frame.evaluate(pointer, { op: 'arm' });
  for (const round of [1, 2]) {
    for (let k = 0; k < marked.length; k++) {
      if (!marked[k]) continue;
      const r = await frame.evaluate(pointer, { op: 'aim', k });
      if (r.skip) { out[k].skips.push(r.skip); continue; }
      out[k].tried++;
      const x = clip.x + r.at[0], y = clip.y + r.at[1];
      await page.mouse.move(x, y);
      await wait(SETTLE);
      const t = await frame.evaluate(pointer, { op: 'test', k, at: r.at });
      if (!t.ok) fail(k, 'pointed at', round, `hit ${t.hit}`, t.front);
      await frame.evaluate(pointer, { op: 'arm' });
      await page.mouse.down();
      await wait(80); // held as a finger holds it, so a press that moves the control away shows
      await page.mouse.up();
      await wait(60);
      const j = await frame.evaluate(pointer, { op: 'judge', k });
      if (!j.downOk) fail(k, 'clicked', round, `hit ${j.down}`);
      else if (!j.clickOk) fail(k, 'clicked', round, `the click went to ${j.click}`);
      await wait(SETTLE);
    }
  }
  await page.mouse.move(1, 1);
  return out;
}

async function checkOn(id, page, context, errors, browser) {
  const problems = [];
  const facts = {};
  const mounted = await mount(id, page);
  if (mounted.broke) return { id, broke: mounted.broke };
  const { frame, clip } = mounted;
  const shot = async () => decode(await page.screenshot({ clip }));
  const save = (name, png) => writeFileSync(join(OUT, `${id.replace(/[:/\\]/g, '_')}-${name}.png`), png);
  const setPaused = (on) => setPausedOn(page, on);
  await wait(1500);

  // 1. does it move on its own
  const u = [await shot()];
  for (let i = 0; i < 2; i++) { await wait(500); u.push(await shot()); }
  const moved = Math.max(pixelsChanged(u[0], u[1]), pixelsChanged(u[0], u[2]), pixelsChanged(u[1], u[2]));
  facts.moves = moved > TINY;

  // 2. pause
  await setPaused(true);
  await wait(500);
  const p0png = await page.screenshot({ clip });
  const p0 = decode(p0png);
  await wait(1000);
  const p1png = await page.screenshot({ clip });
  await wait(3000);
  const p2png = await page.screenshot({ clip });
  const still1 = pixelsChanged(p0, decode(p1png)), still3 = pixelsChanged(p0, decode(p2png));
  facts.paused = { after1s: still1, after4s: still3 };
  if (still1 > TINY || still3 > TINY) {
    problems.push(`keeps moving while paused (prefers-reduced-motion emulated too): ${still1} pixels changed after 1s, ${still3} after 4s (at most ${TINY} allowed)`);
    save('paused-0', p0png);
    save('paused-1s', p1png);
    save('paused-4s', p2png);
  }

  // 3. resume
  if (facts.moves) {
    await setPaused(false);
    await wait(300);
    const r = [await shot()];
    for (let i = 0; i < 3; i++) { await wait(500); r.push(await shot()); }
    let most = 0;
    for (let i = 1; i < r.length; i++) most = Math.max(most, pixelsChanged(r[0], r[i]));
    facts.resumed = most;
    if (most <= TINY) problems.push(`moved before it was paused, but not after it was un-paused (${most} pixels changed over 1.5s)`);
    await setPaused(true);
    await wait(600);
  }

  // 4. names
  const heads = cssHeads(await frame.evaluate(() => document.querySelector('#c3d-code')?.textContent ?? ''));
  const info = await frame.evaluate(survey, { ROLES, NATIVE, heads });
  facts.elements = info.count;
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('Accessibility.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const backend = new Map(); // data-c3d-n -> backendNodeId
  const walk = (node) => {
    if (node.attributes) for (let i = 0; i < node.attributes.length; i += 2) if (node.attributes[i] === 'data-c3d-n') backend.set(Number(node.attributes[i + 1]), node.backendNodeId);
    for (const c of node.children ?? []) walk(c);
    if (node.contentDocument) walk(node.contentDocument);
    for (const c of node.shadowRoots ?? []) walk(c);
  };
  walk(root);
  let namedOk = 0;
  for (const el of info.named) {
    const backendNodeId = backend.get(el.n);
    if (!backendNodeId) { problems.push(`${el.name}: could not be found in the DOM over CDP`); continue; }
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId, fetchRelatives: false });
    const ax = nodes.find((x) => x.backendDOMNodeId === backendNodeId) ?? nodes[0];
    const name = (ax?.name?.value ?? '').trim();
    if (ax?.ignored) { problems.push(`${el.name}: can be focused but is hidden from screen readers (${(ax.ignoredReasons ?? []).map((r) => r.name).join(', ') || 'ignored'})`); continue; }
    if (name || (el.generic && el.text)) { namedOk++; continue; }
    problems.push(`${el.name}: has no accessible name (role ${ax?.role?.value ?? '?'}; no aria-label, aria-labelledby, label, alt, title or text)`);
  }
  facts.named = `${namedOk}/${info.named.length}`;

  // elements the script listens to for the mouse
  const MOUSE = /^(click|dblclick|pointerdown|pointerup|pointermove|pointerenter|pointerover|mousedown|mouseup|mousemove|mouseenter|mouseover|touchstart|wheel)$/;
  const listened = [];
  for (const [n, backendNodeId] of backend) {
    const { object } = await cdp.send('DOM.resolveNode', { backendNodeId }).catch(() => ({}));
    if (!object?.objectId) continue;
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: object.objectId, depth: 0 }).catch(() => ({ listeners: [] }));
    const types = [...new Set(listeners.map((l) => l.type).filter((t) => MOUSE.test(t)))];
    if (types.length) listened.push({ n, types });
  }
  await cdp.detach().catch(() => {});

  // 5. keyboard: Tab through the frame
  await page.evaluate(() => { document.activeElement?.blur?.(); });
  await frame.evaluate(() => document.activeElement?.blur?.());
  await wait(300);
  const before = cells(await shot(), CELL);
  const stops = [];
  let entered = false;
  for (let k = 0; k < MOST_TABS; k++) {
    await page.keyboard.press('Tab');
    await wait(350);
    const inFrame = await page.evaluate(() => document.activeElement?.tagName === 'IFRAME');
    const at = inFrame ? await frame.evaluate(focusNow) : null;
    if (!at) { if (entered) break; if (k > 6) break; continue; }
    entered = true;
    if (stops.some((s) => s.n === at.n && at.n >= 0)) break;
    const grid = cells(await shot(), CELL);
    at.near = at.box ? changeNear(before, grid, at.box.map((v) => Math.max(0, v)), CELL) : 0;
    at.whole = change(before, grid);
    stops.push(at);
  }
  facts.tabStops = stops.length;
  for (const s of stops)
    if (s.near < STILL_NEAR && s.whole < STILL) problems.push(`${s.name}: focus does not show (nothing changes on screen when Tab reaches it: ${s.near.toFixed(2)} round it, ${s.whole.toFixed(3)} over the canvas)`);

  const stopSet = new Set(stops.map((s) => s.n));
  const up = (n) => { const out = []; for (let p = info.parents[n]; p !== undefined && p >= 0; p = info.parents[p]) out.push(p); return out; };
  const inside = (n) => [...stopSet].some((s) => up(s).includes(n));
  const reached = (n) => stopSet.has(n);
  const groupsReached = new Set(info.controls.filter((c) => c.group && reached(c.n)).map((c) => c.group));
  for (const c of info.controls) {
    if (reached(c.n) || (c.group && groupsReached.has(c.group))) continue;
    problems.push(c.unfocusable
      ? `${c.name}: its label is on screen for the mouse, but the input is not drawn (display: none or visibility: hidden), so Tab cannot reach it; hide it visually instead`
      : `${c.name}: a mouse can use it, but Tab never reaches it`);
  }
  const controlSet = new Set(info.controls.map((c) => c.n));
  const nameOf = (n) => info.named.find((x) => x.n === n)?.name ?? info.hover.find((x) => x.n === n)?.name ?? `element #${n}`;
  for (const l of listened) {
    if (info.disabled.includes(l.n)) continue;
    if (controlSet.has(l.n) || reached(l.n) || inside(l.n) || up(l.n).some(reached)) continue;
    const desc = await frame.evaluate((n) => { const el = document.querySelector(`[data-c3d-n="${n}"]`); const cls = [...el.classList].slice(0, 2).map((c) => '.' + c).join(''); return `${el.tagName.toLowerCase()}${cls}`; }, l.n);
    problems.push(`${desc}: its script answers the mouse (${l.types.join(', ')}), but Tab never reaches it or anything in it`);
  }
  for (const h of info.hover) {
    // a native control is judged above; a label is reached through its control (or its group)
    const control = h.control !== null ? info.controls.find((c) => c.n === h.control) : null;
    if (control) continue;
    if (h.native && (reached(h.n) || controlSet.has(h.n))) continue;
    const reach = reached(h.n) || inside(h.n) || up(h.n).some(reached);
    if (!reach) { problems.push(`${h.name}: has a :hover effect (${h.head}:hover), but Tab never reaches it, anything in it or anything round it; give it tabindex="0"`); continue; }
    if (!h.counterpart) problems.push(`${h.name}: Tab reaches it, but no :focus, :focus-visible or :focus-within rule gives it the effect ${h.head}:hover has`);
  }

  // 6. pointer: every control takes the mouse's own hit, on the card and on a big page
  const PRESS = /^(click|dblclick|pointerdown|pointerup|mousedown|mouseup|touchstart)$/;
  const targets = [];
  const addTarget = (n, name) => { if (!targets.some((t) => t.n === n) && !info.disabled.includes(n)) targets.push({ n, name }); };
  for (const c of info.controls) addTarget(c.n, c.name);
  for (const el of info.named) if (el.generic) addTarget(el.n, el.name);
  for (const l of listened) if (l.types.some((t) => PRESS.test(t))) addTarget(l.n, await frame.evaluate((n) => { const el = document.querySelector(`[data-c3d-n="${n}"]`); const cls = [...el.classList].filter((c) => !c.startsWith('c3d')).slice(0, 2).map((c) => '.' + c).join(''); return `${el.tagName.toLowerCase()}${cls}`; }, l.n));
  facts.pointer = { targets: targets.length };
  if (targets.length) {
    const marked = await frame.evaluate(pointer, { op: 'mark', ns: targets.map((t) => t.n) });
    const runs = [await reach(page, frame, clip, marked, `${VW}×${VH}`)];
    // the same on a fresh page at the viewer's size, the controls found again by their place
    const big = await browser.newContext({ viewport: BIG, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    try {
      const bigPage = await big.newPage();
      bigPage.on('pageerror', (e) => errors.push(`${e.message} (at ${BIG.width}×${BIG.height})`));
      const m = await mount(id, bigPage);
      if (m.broke) problems.push(`could not be pointed at on a ${BIG.width}×${BIG.height} page: it ${m.broke}`);
      else {
        await wait(1500);
        await setPausedOn(bigPage, true);
        await wait(600);
        const again = await m.frame.evaluate(pointer, { op: 'mark', paths: marked.map((x) => x?.path ?? '') });
        runs.push(await reach(bigPage, m.frame, m.clip, again, `${BIG.width}×${BIG.height}`));
      }
    } finally {
      await big.close().catch(() => {});
    }
    let reachable = 0;
    targets.forEach((t, k) => {
      const tried = runs.reduce((s, r) => s + r[k].tried, 0);
      const fails = runs.flatMap((r) => r[k].fails);
      const name = `${t.name}${marked[k]?.words ? ` "${marked[k].words}"` : ''}`;
      if (!tried) { problems.push(`${name}: the pointer cannot reach it in any state tried (${[...new Set(runs.flatMap((r) => r[k].skips))].join(', ')}): pointer-events: none on it, or it is never drawn`); return; }
      if (!fails.length) { reachable++; return; }
      // one line per thing it hit, with the states and sizes it hit it in
      const by = new Map();
      for (const f of fails) by.set(f.what, [...(by.get(f.what) ?? []), f]);
      for (const [what, list] of by) {
        const loop = [...new Set(list.map((f) => /^at ([\d.]+)% of its loop$/.exec(f.state)?.[1]).filter(Boolean))];
        const states = [...new Set(list.map((f) => f.state))].filter((st) => !st.endsWith('of its loop')).map((st) =>
          st === 'at rest' || list.some((f) => f.state === st && f.round === 1) ? st : `${st} (second round only)`);
        if (loop.length) states.splice(states[0] === 'at rest' ? 1 : 0, 0, loop.length === MOMENTS.length - 1 ? 'all through its loop' : `at ${loop.join('%, ')}% of its loop`);
        const sizes = [...new Set(list.map((f) => f.size))];
        const why = list.some((f) => f.front) ? "; elementsFromPoint puts it first there, so it is drawn but lies behind the plane of its 3D context's root, which the hit test drops"
          : what.startsWith('the click') ? '; the press reached it, but it had moved from under the pointer by the release' : '';
        problems.push(`${name}: ${what} (${states.join(', ')}; ${sizes.join(' and ')})${why}`);
      }
    });
    facts.pointer.reachable = reachable;
  }
  facts.reach = `${facts.pointer.reachable ?? 0}/${targets.length}`;
  // one line per problem that repeats across a row of the same parts
  const seen = new Map();
  for (const p of problems) {
    const key = p.replace(/#\d+/, '#n').replace(/nth-(child|of-type)\(\d+\)/, 'nth-$1(n)');
    seen.set(key, [...(seen.get(key) ?? []), p]);
  }
  const merged = [...seen.entries()].map(([key, list]) => (list.length > 1 ? `${key} (×${list.length})` : list[0]));
  for (const e of errors) merged.push(`page error: ${e}`);
  return { id, problems: merged, facts };
}

const results = [];
const queue = [...ids];
const started = Date.now();
const reportFile = join(OUT, TRY ? `report-${ids[0].replace(/[:/\\]/g, '_')}.json` : 'report.json');
// a crash inside Playwright: the models checked so far go to the report (capture-check has each line already)
crashGuard('check-access', async () => {
  writeFileSync(reportFile, JSON.stringify({ at: new Date().toISOString(), partial: `crashed after ${results.length} of ${ids.length} model(s)`, tolerance: { DIFF, TINY }, results }, null, 2));
  console.error(`check-access: ${reportFile} has the ${results.length} model(s) checked before the crash`);
});
async function worker() {
  while (queue.length) {
    const id = queue.shift();
    let r, notes = [];
    try {
      ({ value: r, notes } = await guard.run(id, (browser) => checkModel(id, browser)));
    } catch (e) {
      r = { id, broke: e.message.split('\n')[0] };
      notes = e.notes ?? [];
    }
    if (notes.length) r.guard = notes;
    const also = notes.length ? `; ${notes.join('; ')}` : ''; // what scripts/browser-guard.mjs had to do, on the model's own line
    results.push(r);
    const f = r.facts ?? {};
    if (r.broke) console.log(`FAILS ${id} could not be checked: ${r.broke}${also}`);
    else if (!r.problems.length) console.log(`pass  ${id} ${f.moves ? 'stops when paused, starts again' : 'still on its own, still when paused'}; ${f.named} named; ${f.tabStops} tab stop(s); ${f.reach} reachable${also}`);
    else {
      console.log(`FAILS ${id} ${r.problems.length} problem(s)${also}`);
      for (const p of r.problems) console.log(`          ${p}`);
    }
  }
}
try {
  await Promise.all(Array.from({ length: Math.min(JOBS, ids.length) }, worker));
} finally {
  await guard.close();
  await vite.close();
}
const failed = results.filter((r) => r.broke || r.problems.length);
writeFileSync(reportFile, JSON.stringify({ at: new Date().toISOString(), tolerance: { DIFF, TINY }, results }, null, 2));
console.log(`\n${results.length - failed.length} of ${results.length} models pass the access check (pause, names, keyboard, pointer) in ${((Date.now() - started) / 60000).toFixed(1)} min.`);
if (failed.length) console.log(`failing: ${failed.map((r) => r.id).join(' ')}`);
process.exit(failed.length ? 1 : 0);
