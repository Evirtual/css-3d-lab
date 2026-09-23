/**
 * Pause and access: every model stops when the site pauses it, every control has a name, and the
 * keyboard reaches everything a mouse can use.
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
    return await checkOn(id, page, context, errors);
  } catch (e) {
    if (isBrowserError(e)) throw e; // the browser's, not the model's: scripts/browser-guard.mjs retries it
    return { id, broke: e.message.split('\n')[0] };
  } finally {
    await context.close().catch(() => {});
  }
}

async function checkOn(id, page, context, errors) {
  const problems = [];
  const facts = {};
  await page.goto(`${base}/embed/${tried ? demos[0].id : id}/`, { waitUntil: 'domcontentloaded' });
  if (!(await page.waitForSelector('iframe[data-ready="true"]', { timeout: 20_000 }).then(() => true).catch(unlessBrowser(false)))) return { id, broke: 'never appeared' };
  if (tried) {
    // the tried model in place of the page's own, through the same Preview the site mounts with
    await page.evaluate(async (code) => {
      const { Preview } = await import('/src/preview.ts');
      const stage = document.querySelector('[data-demo]');
      const p = new Preview('try', code.title, code, code, 'dark');
      stage.replaceChildren(p.frame);
    }, { title: tried.title, html: tried.html, css: tried.css, ...(tried.js ? { js: tried.js } : {}) });
    if (!(await page.waitForSelector('iframe[data-ready="true"]', { timeout: 20_000 }).then(() => true).catch(unlessBrowser(false)))) return { id, broke: 'the tried model never appeared' };
  }
  await page.addStyleTag({ content: BARE });
  await page.mouse.move(1, 1);
  const frame = await (await page.$('iframe')).contentFrame();
  const clip = await page.locator('iframe').first().boundingBox();
  const shot = async () => decode(await page.screenshot({ clip }));
  const save = (name, png) => writeFileSync(join(OUT, `${id.replace(/[:/\\]/g, '_')}-${name}.png`), png);
  const setPaused = async (on) => {
    await page.emulateMedia({ reducedMotion: on ? 'reduce' : 'no-preference' });
    await page.evaluate((on) => document.documentElement.toggleAttribute('data-paused', on), on);
    await page.waitForFunction((on) => document.querySelector('iframe')?.contentDocument?.documentElement.hasAttribute('data-paused') === on, on, { timeout: 5000 });
  };
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
    else if (!r.problems.length) console.log(`pass  ${id} ${f.moves ? 'stops when paused, starts again' : 'still on its own, still when paused'}; ${f.named} named; ${f.tabStops} tab stop(s)${also}`);
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
console.log(`\n${results.length - failed.length} of ${results.length} models pass the access check (pause, names, keyboard) in ${((Date.now() - started) / 60000).toFixed(1)} min.`);
if (failed.length) console.log(`failing: ${failed.map((r) => r.id).join(' ')}`);
process.exit(failed.length ? 1 : 0);
