/**
 * What the site itself costs: the gallery, built and served as it is deployed, loaded once and
 * scrolled to the bottom of all 135 models and back.
 *
 *   npm run build && node scripts/check-app.mjs      the built site in dist/
 *   node scripts/check-app.mjs --dist <dir>          another built copy (a deliberately heavy one)
 *   node scripts/check-app.mjs --pass                a line for a page that passes (capture adds it)
 *   node scripts/check-app.mjs --json                every reading, no verdict (for setting budgets)
 *   npm run capture -- app                           and record it in the ledger's Site block
 *
 * WHY. check-perf holds each model to what one model may cost. Nothing held the PAGE to what 135
 * of them together may cost, and that is where it is felt: the gallery reveals a page of cards at
 * a time as you scroll, mounts a model's document as its card comes near and gives it back once
 * the card is two screens away (src/lazy-mount.ts). Whether that actually keeps the page answering
 * over the whole 135 is a thing to measure, not to assume.
 *
 * HOW. dist/ is served over HTTP from a local port, exactly the files a visitor would get, and
 * opened at VIEWPORT in the full Chromium build. Then:
 *
 *   load      the page is opened and waited for until it is idle; `load` is the moment the load
 *             event fires, and `firstCard` the moment the first card is in the DOM.
 *   scroll    the window is scrolled down in STEP px steps, PAUSE ms apart, until all 135 cards
 *             are revealed and the bottom is reached, and then back to the top the same way.
 *             Every frame is traced. This Chromium paces frames at about 8.3ms however little
 *             the page does, so that is the floor a gap can reach; above it, a gap is the work
 *             that frame cost. `longtask` entries are collected over the same trip.
 *   mounted   how many model frames are in the DOM at the bottom, and again at the top.
 *   memory    the JS heap and the document count, from CDP, at the top and at the bottom, each
 *             after two forced collections so a number is what is HELD, not what is merely not
 *             collected yet.
 *   errors    page errors and console errors over the whole run.
 *   drift     a card's own top on the page, before the trip and after it: the placeholder an
 *             unmounted model leaves must keep the page exactly as tall as it was.
 *
 * THE BUDGETS, and where each number comes from. Every number below was measured on the built
 * site on 2026-09-23, on this machine, after the three-ring unmounting landed, and the budget is
 * set above the worst of what it read — with more room where the reading depends on the machine
 * (a local file server is not a network, and when a collection happens is not ours to say) and
 * less where it is the code that decides.
 *
 *   load        <= 1500ms. Measured: the load event at 326ms, the first card at 368ms. A local
 *                          file server is not a network, so this is a floor and not a promise
 *                          about the live site; the budget is here to catch a build that starts
 *                          doing something expensive before it draws.
 *   frame p95   <= 60ms.   Measured: over 3833 frames of the trip down and back, median 8.4ms
 *                          (this browser's own floor), 95th 33.3ms, worst 141.6ms. The slow
 *                          frames are the ones that reveal a page of twelve cards. 60ms is most
 *                          of the way again above the 95th, and a frame a person would not call
 *                          stuck.
 *   long tasks  <= 8, and none over 200ms. Measured: 2, of 72ms and 53ms. A long task is the main
 *                          thread held over 50ms, which is what a scroll that judders is made of.
 *   mounted     <= 40 model frames at the bottom. Measured: 6 at the top, 12 at the bottom, 12
 *                          back at the top. The far ring is two screens, so a wider or taller
 *                          window holds more; 40 is room for that, and the fault this catches is
 *                          the one that was there to begin with — all 135 staying mounted.
 *   memory      <= 40 MB of JS heap held at the bottom. Measured: 6.2 MB at the top, 8.6 MB at
 *                          the bottom, 8.6 MB back at the top, each after two forced collections.
 *   documents   <= 40 held after collection at the bottom. Measured: 7, then 15, then 15 — the
 *                          page and its mounted frames, and nothing else. A frame whose document
 *                          is never released is the leak this catches, and 135 of them could not
 *                          hide under 40.
 *   drift       0 px. Measured: 0. A card's top may not move over the trip at all — an unmounted
 *                          model's placeholder keeps the stage's own height, so nothing reflows.
 *   errors      0. Measured: none. A page error or a console error during the trip fails the page.
 *
 * PROVED ON A COPY THAT DOES NOT UNMOUNT: a build with lazy-mount's far ring pushed out of reach
 * (`window.innerHeight * 20000`), kept in .media-tmp/perf/dist-nounmount and never committed.
 * The same trip over it reads 135 model frames still mounted at the bottom, 55 MB of heap and 138
 * documents held after two collections, against 12, 8.6 MB and 15 on the real build. The check
 * fails it on three lines, each naming what it exceeded.
 *
 * Lines, in check-seo's shape, so scripts/capture-check.mjs records this the same way: one
 * `readings <page> <every number this run took>` line whatever the verdict, then
 * `FAIL <page> <rule>: <what>` for each budget the page broke, or `pass <page> <readings>` when
 * it broke none, and a closing `N/M pages are within the app budgets.` The page is `/`, the
 * gallery: this check judges the site, not a model, so the ledger shows it in its Site block.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { launchChromium } from './browser.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const DIST = resolve(ROOT, opt('--dist') ?? 'dist');
const showPasses = args.includes('--pass');
const asJson = args.includes('--json');

const VIEWPORT = { width: 1280, height: 900 };
const STEP = 700; // px per scroll step: a wheel flick, not a jump
const PAUSE = 80; // ms between steps
const MODELS = 135; // every model must be revealed before the trip counts as finished

/* ---------- the budgets (see the header for where each number comes from) ---------- */
const MAX_LOAD = 1500; // ms
const MAX_FRAME_P95 = 60; // ms
const MAX_LONG_TASKS = 8;
const MAX_LONG_TASK = 200; // ms
const MAX_MOUNTED = 40; // model frames still in the DOM at the bottom
const MAX_HEAP_MB = 40;
const MAX_DOCUMENTS = 40; // held after collection
const MAX_DRIFT = 0; // px a card's top may move over the trip

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`check-app: no ${relative(ROOT, DIST) || DIST}/index.html: run npm run build first`);
  process.exit(2);
}

/* ---------- the built site, served to the browser ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let path = join(DIST, decodeURIComponent(url.pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

/* ---------- what runs in the page ---------- */
const TRACE_ON = () => {
  window.__app = { frames: [], long: [] };
  const tick = (t) => { window.__app.frames.push(t); if (window.__app.frames.length < 20000) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__app.long.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] }); } catch { /* not in this browser: the reading says 0 and the run says so */ }
};
const COUNTS = () => ({
  frames: document.querySelectorAll('#grid .card iframe, .card[data-mount] iframe').length,
  placeholders: document.querySelectorAll('.card .stage__placeholder').length,
  cards: document.querySelectorAll('#grid .card:not([hidden]), .card[data-mount]').length,
  height: Math.round(document.documentElement.scrollHeight),
  scrollY: Math.round(window.scrollY),
});

const report = [];
const errors = [];
const browser = await launchChromium();
let readings = null;
try {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  page.on('pageerror', (e) => errors.push(`page error: ${e.message.split('\n')[0]}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console error: ${m.text().replace(/\s+/g, ' ').slice(0, 140)}`); });

  /** The heap and the document count, after two collections: what is HELD, not what is uncollected. */
  const held = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(400);
    await cdp.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(400);
    const dom = await cdp.send('Memory.getDOMCounters');
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    return { heapMB: +(m.JSHeapUsedSize / 1e6).toFixed(1), documents: dom.documents, nodes: dom.nodes, listeners: dom.jsEventListeners };
  };

  const t0 = Date.now();
  await page.goto(`${base}/`, { waitUntil: 'load' });
  const load = Date.now() - t0;
  await page.waitForSelector('.card, #grid .card');
  const firstCard = Date.now() - t0;
  await page.waitForTimeout(1500);
  const top = { ...(await page.evaluate(COUNTS)), ...(await held()) };
  // the card whose place on the page must not move over the trip
  const markAt = await page.evaluate(() => {
    const c = document.querySelectorAll('#grid .card:not([hidden])')[4];
    return c ? Math.round(c.getBoundingClientRect().top + window.scrollY) : null;
  });

  await page.evaluate(TRACE_ON);
  const traceFrom = await page.evaluate(() => performance.now());

  /** Down to the bottom, revealing every card on the way; then back to the top the same way. */
  const trip = async (down) => {
    let last = -1, still = 0;
    for (let i = 0; i < 500; i++) {
      const at = await page.evaluate((step) => {
        window.scrollBy(0, step);
        return [Math.round(window.scrollY), Math.round(document.documentElement.scrollHeight - window.innerHeight), document.querySelectorAll('#grid .card:not([hidden])').length];
      }, down ? STEP : -STEP);
      await page.waitForTimeout(PAUSE);
      if (at[0] === last) { if (++still > 5) break; } else still = 0;
      last = at[0];
      if (down && at[2] >= MODELS && at[0] >= at[1] - 2) break;
      if (!down && at[0] <= 0) break;
    }
  };
  await trip(true);
  await page.waitForTimeout(1200);
  const bottom = { ...(await page.evaluate(COUNTS)), ...(await held()) };
  await trip(false);
  await page.waitForTimeout(1200);
  const backTop = { ...(await page.evaluate(COUNTS)), ...(await held()) };

  const trace = await page.evaluate((from) => {
    const t = (window.__app.frames ?? []).filter((x) => x >= from);
    const g = [];
    for (let i = 1; i < t.length; i++) g.push(t[i] - t[i - 1]);
    g.sort((a, b) => a - b);
    const q = (p) => (g.length ? +g[Math.min(g.length - 1, Math.floor(g.length * p))].toFixed(1) : null);
    return { frames: g.length, median: q(0.5), p95: q(0.95), worst: g.length ? +g.at(-1).toFixed(1) : null, long: window.__app.long ?? [] };
  }, traceFrom);

  // a card came back: is its model running again, and is it where it was?
  const back = await page.evaluate((want) => {
    const c = document.querySelectorAll('#grid .card:not([hidden])')[4];
    const f = c?.querySelector('.stage iframe');
    return { mounted: !!f, ready: f?.dataset.ready ?? null, topNow: c ? Math.round(c.getBoundingClientRect().top + window.scrollY) : null, wanted: want };
  }, markAt);
  const drift = back.topNow == null || markAt == null ? null : back.topNow - markAt;

  readings = { load, firstCard, top, bottom, backTop, trace, back, drift, errors: [...new Set(errors)] };
  await context.close();
} finally {
  await browser.close();
  server.close();
}

/* ---------- the verdict ---------- */
if (!readings) {
  console.log('FAIL / run: the gallery could not be opened and measured at all');
  console.log('\n0/1 pages are within the app budgets.');
  process.exit(1);
}
const r = readings;
const problems = [];
const F = (rule, what) => problems.push([rule, what]);
if (r.load > MAX_LOAD) F('load', `the gallery took ${r.load}ms to load, over the ${MAX_LOAD}ms budget (first card at ${r.firstCard}ms)`);
if (r.bottom.cards < MODELS) F('scroll', `only ${r.bottom.cards} of ${MODELS} cards were revealed at the bottom: the trip did not reach the end of the gallery`);
if (r.trace.p95 !== null && r.trace.p95 > MAX_FRAME_P95) F('frames', `frame time ${r.trace.p95}ms at the 95th over the whole trip, over the ${MAX_FRAME_P95}ms budget (median ${r.trace.median}ms, worst ${r.trace.worst}ms, ${r.trace.frames} frames)`);
if (r.trace.long.length > MAX_LONG_TASKS) F('longtasks', `${r.trace.long.length} long tasks over the trip, over the ${MAX_LONG_TASKS} budget (worst ${Math.max(...r.trace.long)}ms)`);
if (r.trace.long.some((x) => x > MAX_LONG_TASK)) F('longtasks', `a long task of ${Math.max(...r.trace.long)}ms, over the ${MAX_LONG_TASK}ms any single one may take`);
if (r.bottom.frames > MAX_MOUNTED) F('mounted', `${r.bottom.frames} model frames are still mounted at the bottom of all ${MODELS}, over the ${MAX_MOUNTED} budget: a card far from the viewport must give its document back (src/lazy-mount.ts)`);
if (r.bottom.heapMB > MAX_HEAP_MB) F('memory', `${r.bottom.heapMB} MB of JS heap held at the bottom, over the ${MAX_HEAP_MB} MB budget (${r.top.heapMB} MB at the top)`);
if (r.bottom.documents > MAX_DOCUMENTS) F('memory', `${r.bottom.documents} documents held at the bottom after collection, over the ${MAX_DOCUMENTS} budget, with ${r.bottom.frames} frames mounted: a frame's document is not being released`);
if (r.drift === null) F('drift', 'the card whose place was marked could not be found again after the trip');
else if (Math.abs(r.drift) > MAX_DRIFT) F('drift', `a card's top moved ${r.drift}px over the trip, over the ${MAX_DRIFT}px budget: something an unmounted model left behind is not the size it was`);
if (!r.back.mounted) F('remount', 'the card that was marked has no model mounted after scrolling back to it');
for (const e of r.errors) F('errors', e);

const said = `loaded in ${r.load}ms (first card ${r.firstCard}ms); ${r.bottom.cards} cards revealed; frames median ${r.trace.median}ms, p95 ${r.trace.p95}ms, worst ${r.trace.worst}ms over ${r.trace.frames}; ${r.trace.long.length} long task(s); mounted ${r.top.frames} at the top, ${r.bottom.frames} at the bottom, ${r.backTop.frames} back at the top; held ${r.top.heapMB}→${r.bottom.heapMB}→${r.backTop.heapMB} MB and ${r.top.documents}→${r.bottom.documents}→${r.backTop.documents} documents; drift ${r.drift}px; ${r.back.mounted ? 'the card that came back is running' : 'the card that came back is NOT running'}`;

if (asJson) {
  console.log(JSON.stringify({ budgets: { MAX_LOAD, MAX_FRAME_P95, MAX_LONG_TASKS, MAX_LONG_TASK, MAX_MOUNTED, MAX_HEAP_MB, MAX_DOCUMENTS, MAX_DRIFT }, readings: r, problems }, null, 1));
  process.exit(0);
}
console.log(`check-app: ${relative(ROOT, DIST) || DIST} served at ${VIEWPORT.width} × ${VIEWPORT.height}, scrolled to the bottom of all ${MODELS} models and back in ${STEP}px steps.\n`);
// every run says what it read, pass or fail, so a budget can be argued with from the numbers
console.log(`readings / ${said}`);
if (problems.length) for (const [rule, what] of problems) console.log(`FAIL / ${rule}: ${what}`);
else if (showPasses) console.log(`pass / ${said}`);
const pages = 1;
console.log(`\n${problems.length ? 0 : 1}/${pages} pages are within the app budgets.`);
process.exit(problems.length ? 1 : 0);
