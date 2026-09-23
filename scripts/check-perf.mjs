/**
 * What a model costs to run: how much it draws, how long its frames take, how fast it answers the
 * pointer, and whether playing with it over and over makes it grow.
 *
 *   node scripts/check-perf.mjs                every model
 *   node scripts/check-perf.mjs confetti cube  just these
 *   node scripts/check-perf.mjs --pass         a line for the passes too (capture-check adds it)
 *   node scripts/check-perf.mjs --json         every reading as JSON, no verdict (for setting budgets)
 *   node scripts/check-perf.mjs --try f.mjs    a model that is not in the gallery (a default export
 *                                              { title, html, css, js }), which is how the check is
 *                                              proved on deliberately heavy copies in .media-tmp/perf/
 *
 * WHY. confetti froze its page and the export dialog on fast clicking: every click made a new set
 * of pieces and none was ever taken away, so the element count climbed until the page stopped
 * answering. Nothing measured that. This check does, for every model, and holds each one to a
 * budget taken from what the other 134 actually do.
 *
 * HOW. The model's standalone document (standaloneDoc: what "Copy as one HTML file" hands over)
 * is opened on its own at the card's own size, 340 × 280, in a fresh context, in REAL time — no
 * fake clock, because frame times are the thing being measured. After it has loaded, its fonts
 * are in and it has had SETTLE ms to reach its resting pose:
 *
 *  1. ELEMENTS. How many elements the model draws (everything under #c3d-scene). A model is a
 *     snippet somebody copies into their own page, so its size is its own cost.
 *  2. FRAME TIME while it runs. A rAF trace of TRACE ms, reported as the median and the 95th of
 *     the gaps between frames. This Chromium paces frames at about 8.3ms however little the page
 *     does, so that is a FLOOR, not zero: a model whose style, layout and paint fit inside it
 *     reads the floor and nothing finer can be said about it here. What the trace does measure is
 *     a model that does NOT fit — the gap then grows with the work. The same trace is taken on an
 *     empty document once per run and printed beside the models, so the floor of the machine that
 *     ran it is on the record and a slow machine is visible rather than blamed on a model.
 *  3. RESPONSE. The model's main interaction (src/models/interaction.ts: hover, move, drag, click
 *     or scroll) is done once with a real pointer through CDP, on a target found the way
 *     check-access finds one — a control for a click, a :hover head from the model's own CSS for a
 *     hover, the middle of the scene for move and drag. Response is the moment the next frame is
 *     produced, less the moment the input was sent: how long the page took to answer on screen.
 *     A model with no interaction is not held to this, and says so.
 *  4. PILE-UP. The same interaction REPEATS times, as fast as a person can click (GAP ms apart),
 *     with the element count read after each one. A model may make what it then reuses, so the
 *     first WARMUP interactions are its warm-up; what is judged is whether it keeps making more
 *     after that, and how high the count goes at the peak. This is the confetti bug, and it is the
 *     one part of this check that would have caught it.
 *
 * THE BUDGETS, and where each number comes from. Every number below was measured, not guessed:
 * all 135 models were run through `--json` on 2026-09-23 on this machine, in the full Chromium
 * build headless, and the budget is set a little above the worst reading a good model gave.
 * Two readings are capped by the browser rather than by the models: this Chromium produces a
 * frame about every 8.3ms whatever the page does, so a frame time and a response that read 8.3ms
 * mean "as fast as this browser will show anything", not "8.3ms of work".
 *
 *   ELEMENTS   <= 250.  Measured: stairs 158, wavegrid 123, sphere 122, flaptext 86, and the rest
 *                       below 80. 250 is about half again the worst, and a snippet past it is not
 *                       a model any more, it is a page.
 *   FRAME p95  <= 40ms. Measured: only two models do enough work per frame to show above the
 *                       browser's floor at all — stairs 25.1ms and hourglass 25.0ms; every other
 *                       model reads 8.4–8.5ms, which is the floor. 40ms is about half again the
 *                       worst, and is still a frame a person would not call stuck.
 *   RESPONSE   <= 120ms. Measured: every model answers at the floor, 7.5–8.3ms — nothing today
 *                       comes near a budget set from the spread, so this one is set from what a
 *                       person notices instead: past about 120ms a press stops feeling connected
 *                       to what it does. It is here to catch an interaction that blocks the main
 *                       thread, which is how the confetti freeze was felt before it was counted.
 *   PILE-UP    at most 8 more elements between the fifth interaction and the thirtieth, and at
 *                       most 300 at the peak. Measured: after the first five interactions NOT ONE
 *                       of the 135 adds a single element — every one of them is +0 — and the
 *                       biggest peak is confetti's 134, which is its pool of pieces, made once on
 *                       the first click and thrown again and again. So a model may make what it
 *                       reuses (the first five interactions are its warm-up) but may not keep
 *                       making more, and 8 is slack, not licence. The leaky copy in .media-tmp/perf/
 *                       adds 900 over the same thirty clicks and reaches 1118 at the peak.
 *
 * Lines: `pass <id> …` and `FAILS <id> …` with each problem indented under a failure, and a
 * closing `N/M models are within the performance budgets.` scripts/capture-check.mjs records them.
 */
import { createServer as createVite } from 'vite';
import { launchChromium } from './browser.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BrowserGuard, crashGuard } from './browser-guard.mjs';
import { cssHeads } from './css-heads.mjs';

const WIDTH = 340; // the card's own stage, so the reading is the cost of a model in the gallery
const HEIGHT = 280;
const SETTLE = 1200; // ms for the model to load, lay itself out and reach its resting pose
const TRACE = 2000; // ms of frames measured while it runs
const REPEATS = 30; // how many times the main interaction is repeated
const GAP = 110; // ms between them: about as fast as a person can click

/* ---------- the budgets (see the header for where each number comes from) ---------- */
const MAX_ELEMENTS = 250;
const MAX_FRAME_P95 = 40; // ms
const MAX_RESPONSE = 120; // ms
const WARMUP = 5; // interactions the model may use to make whatever it reuses afterwards
const PILE_GROWTH = 8; // elements it may still add between the warm-up and the thirtieth
const MAX_PEAK = 300; // elements it may have at the peak of being played with

const argv = process.argv.slice(2);
const showPasses = argv.includes('--pass');
const asJson = argv.includes('--json');
const at = argv.indexOf('--try');
const TRY = at >= 0 ? argv[at + 1] : null;
const wanted = argv.filter((a, i) => !a.startsWith('-') && !(at >= 0 && i === at + 1));

const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, watch: null } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { snippets } = await vite.ssrLoadModule('/src/models/snippets.ts');
const { standaloneDoc } = await vite.ssrLoadModule('/src/models/snippet-utils.ts');
const { interactionOf } = await vite.ssrLoadModule('/src/models/interaction.ts');

let tried = null;
if (TRY) {
  const mod = await import(pathToFileURL(resolve(TRY)).href);
  tried = { title: 'try', js: '', how: [], tags: [], ...(mod.default ?? mod) };
}
const ids = TRY ? [`try:${TRY.replace(/\\/g, '/').split('/').pop().replace(/\.m?js$/, '')}`] : wanted.length ? wanted : demos.map((d) => d.id);
const unknown = TRY ? [] : ids.filter((id) => !demos.some((d) => d.id === id));
if (unknown.length) {
  console.error(`check-perf: no such model: ${unknown.join(', ')}`);
  await vite.close();
  process.exit(2);
}

/** The model's file, and the way it is played with. */
function modelOf(id) {
  if (tried) return { title: tried.title, snippet: tried, way: tried.interaction ?? interactionOf({ id: 'try', tags: tried.tags ?? [] }) };
  const demo = demos.find((d) => d.id === id);
  return { title: demo.title, snippet: { how: [], ...snippets[id] }, way: interactionOf(demo) };
}

/* ---------- what runs inside the page ---------- */

/** Elements the model draws: everything under its scene. */
const COUNT = () => document.querySelectorAll('#c3d-scene *').length;

/**
 * Starts a frame trace: every frame's end, on the page's own clock, so a gap is the time the
 * renderer took to make that frame — down to this browser's own floor of about 8.3ms, which is
 * the fastest it will produce one whatever the page does.
 */
const TRACE_ON = () => {
  window.__c3dTrace = [];
  const tick = (t) => { window.__c3dTrace.push(t); if (window.__c3dTrace.length < 5000) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};
/** The gaps between the frames traced since a moment, sorted. */
const GAPS = (since) => {
  const t = (window.__c3dTrace ?? []).filter((x) => x >= since);
  const g = [];
  for (let i = 1; i < t.length; i++) g.push(t[i] - t[i - 1]);
  return g.sort((a, b) => a - b);
};

/** The place the main interaction happens, in page coordinates, and what it is. */
function TARGET({ way, heads }) {
  const scene = document.querySelector('#c3d-scene') || document.body;
  const shows = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width >= 4 && r.height >= 4;
  };
  const middle = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const pick = (sel) => [...scene.querySelectorAll(sel)].filter(shows)[0] ?? null;
  const matching = (s) => { try { return [...document.querySelectorAll(s)].filter((el) => scene.contains(el) && el !== scene && shows(el)); } catch { return []; } };
  const NATIVE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary';
  const ROLE = '[role="button"], [role="slider"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="option"], [role="menuitem"]';

  let el = null, what = '';
  if (way === 'click') {
    el = pick(NATIVE) ?? pick(ROLE) ?? [...scene.querySelectorAll('label')].filter(shows)[0] ?? null;
    what = el ? `a click on ${el.tagName.toLowerCase()}` : '';
  } else if (way === 'hover') {
    el = heads.flatMap(matching)[0] ?? null;
    what = el ? `the pointer onto ${el.tagName.toLowerCase()}` : '';
  } else if (way === 'scroll') {
    el = [...scene.querySelectorAll('*')].filter((x) => shows(x) && x.scrollHeight > x.clientHeight + 4)[0] ?? scene;
    what = 'a scroll inside it';
  }
  if (!el && (way === 'move' || way === 'drag' || way === 'hover' || way === 'scroll')) { el = scene; what = way === 'drag' ? 'a drag across it' : 'the pointer across it'; }
  if (!el) return null;
  // a hidden input reached through its label
  if (el.matches?.('input') && !shows(el)) { const lab = [...(el.labels ?? [])].filter(shows)[0]; if (lab) el = lab; }
  return { at: middle(el), what: what || `the pointer on ${el.tagName?.toLowerCase() ?? 'it'}` };
}

/** Does the model's main interaction once, with a real pointer. */
async function act(page, way, [x, y]) {
  if (way === 'click') { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up(); return; }
  if (way === 'hover') { await page.mouse.move(x - 40, y - 30); await page.mouse.move(x, y); return; }
  if (way === 'scroll') { await page.mouse.move(x, y); await page.mouse.wheel(0, 120); return; }
  if (way === 'drag') { await page.mouse.move(x - 30, y); await page.mouse.down(); await page.mouse.move(x + 30, y, { steps: 4 }); await page.mouse.up(); return; }
  // move, and anything else: the pointer across it
  await page.mouse.move(x - 40, y - 20);
  await page.mouse.move(x + 40, y + 20, { steps: 4 });
}
/** The pointer away from the model, so a hover does not stay on between takes. */
const away = (page) => page.mouse.move(2, HEIGHT - 2);

async function measure(id, browser) {
  const { title, snippet, way } = modelOf(id);
  const heads = cssHeads(snippet.css).hover;
  const html = standaloneDoc(title, snippet, 'dark'); // with a stage, as a card shows it: the model in #c3d-scene, filling the frame
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
  const errors = [];
  try {
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
    const url = `${base}/__c3d-file/perf.html`;
    await page.route(url, (r) => r.fulfill({ contentType: 'text/html', body: html }));
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(SETTLE);

    const rest = await page.evaluate(COUNT);

    // 2. frame time while it runs
    await page.evaluate(TRACE_ON);
    const from = await page.evaluate(() => performance.now());
    await page.waitForTimeout(TRACE);
    const gaps = await page.evaluate(GAPS, from);
    const q = (p) => (gaps.length ? +gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))].toFixed(2) : null);
    const frame = { frames: gaps.length, median: q(0.5), p95: q(0.95), worst: gaps.length ? +gaps.at(-1).toFixed(2) : null };

    // 3. response, and 4. pile-up, on the model's main interaction
    let response = null, pile = null, target = null;
    if (way !== 'none') {
      target = await page.evaluate(TARGET, { way, heads });
    }
    if (target) {
      await away(page);
      await page.waitForTimeout(200);
      // response: the first frame produced after the input, less the moment the input was sent
      await page.evaluate(TRACE_ON);
      const sent = await page.evaluate(() => performance.now());
      await act(page, way, target.at);
      await page.waitForTimeout(400);
      const after = await page.evaluate((t) => (window.__c3dTrace ?? []).filter((x) => x > t)[0] ?? null, sent);
      response = after === null ? null : +(after - sent).toFixed(1);

      // pile-up: the same interaction, REPEATS times, as fast as a person can click
      await away(page);
      await page.waitForTimeout(300);
      const before = await page.evaluate(COUNT);
      const counts = [];
      for (let i = 0; i < REPEATS; i++) {
        await act(page, way, target.at);
        if (way === 'hover' || way === 'move') await away(page);
        await page.waitForTimeout(GAP);
        counts.push(await page.evaluate(COUNT));
      }
      await away(page);
      await page.waitForTimeout(1500); // let anything the burst made and takes away, go
      const settled = await page.evaluate(COUNT);
      pile = { before, warm: Math.max(...counts.slice(0, WARMUP)), later: Math.max(...counts.slice(WARMUP)), peak: Math.max(...counts), settled, what: target.what, counts };
    }
    return { id, way, rest, frame, response, target, pile, errors: [...new Set(errors)] };
  } finally {
    await context.close().catch(() => {});
  }
}

/** The frame-time floor of this machine: an empty document traced the same way. */
async function floorOf(browser) {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
  try {
    const page = await context.newPage();
    const url = `${base}/__c3d-file/perf-floor.html`;
    await page.route(url, (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>floor</title><body style="margin:0">' }));
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(TRACE_ON);
    const from = await page.evaluate(() => performance.now());
    await page.waitForTimeout(TRACE);
    const gaps = await page.evaluate(GAPS, from);
    const q = (p) => (gaps.length ? +gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))].toFixed(2) : null);
    return { median: q(0.5), p95: q(0.95) };
  } finally {
    await context.close().catch(() => {});
  }
}

/** The budgets, on one reading. */
function judge(r) {
  const problems = [];
  if (r.rest > MAX_ELEMENTS) problems.push(`draws ${r.rest} elements, over the ${MAX_ELEMENTS} budget`);
  if (r.frame.p95 !== null && r.frame.p95 > MAX_FRAME_P95) problems.push(`frame time ${r.frame.p95}ms at the 95th while it runs, over the ${MAX_FRAME_P95}ms budget (median ${r.frame.median}ms, worst ${r.frame.worst}ms)`);
  if (r.response !== null && r.response > MAX_RESPONSE) problems.push(`answers ${r.target.what} in ${r.response}ms, over the ${MAX_RESPONSE}ms budget`);
  if (r.pile) {
    const grew = r.pile.later - r.pile.warm;
    if (grew > PILE_GROWTH) problems.push(`${REPEATS} × ${r.pile.what} piles elements up: ${r.pile.before} at rest, ${r.pile.warm} after the first ${WARMUP}, ${r.pile.later} by the thirtieth — ${grew} more, over the ${PILE_GROWTH} a settled model may still add. Whatever the interaction makes must be made once and used again, or taken away`);
    if (r.pile.peak > MAX_PEAK) problems.push(`${REPEATS} × ${r.pile.what} reaches ${r.pile.peak} elements at the peak, over the ${MAX_PEAK} budget`);
  }
  for (const e of r.errors) problems.push(`page error: ${e}`);
  return problems;
}

const said = (r) => {
  const p = r.pile ? `, ${REPEATS}× ${r.way}: ${r.pile.before} at rest, ${r.pile.warm} warm, ${r.pile.later} by the last, ${r.pile.settled} once it settles` : '';
  const resp = r.response === null ? ', no interaction' : `, answers in ${r.response}ms`;
  return `${r.rest} elements, frame p95 ${r.frame.p95}ms (median ${r.frame.median}ms)${resp}${p}`;
};

const results = [];
crashGuard('check-perf', async () => console.error(`check-perf: ${results.length} of ${ids.length} model(s) measured before the crash, each on its own line above`));
const guard = new BrowserGuard({ launch: () => launchChromium() });
await guard.start();
let floor = null;
try {
  floor = await guard.run('floor', (browser) => floorOf(browser)).then((x) => x.value).catch(() => null);
  if (!asJson) console.log(`check-perf: ${ids.length} model(s) at ${WIDTH} × ${HEIGHT}, ${TRACE}ms of frames each, ${REPEATS} interactions ${GAP}ms apart. Budgets: <= ${MAX_ELEMENTS} elements, frame p95 <= ${MAX_FRAME_P95}ms, answer <= ${MAX_RESPONSE}ms, no more than ${PILE_GROWTH} elements added after the first ${WARMUP} interactions, ${MAX_PEAK} at the peak. This machine's floor (an empty document): median ${floor?.median}ms, p95 ${floor?.p95}ms.\n`);
  for (const id of ids) {
    let r, notes = [];
    try {
      ({ value: r, notes } = await guard.run(id, (browser) => measure(id, browser)));
    } catch (e) {
      r = { id, broke: e.message.split('\n')[0] };
      notes = e.notes ?? [];
    }
    const also = notes.length ? `; ${notes.join('; ')}` : '';
    if (!r.broke) r.problems = judge(r);
    results.push(r);
    if (asJson) continue;
    if (r.broke) console.log(`FAILS ${id} could not be measured: ${r.broke}${also}`);
    else if (r.problems.length) {
      console.log(`FAILS ${id} ${r.problems.length} problem(s) (${said(r)})${also}`);
      for (const p of r.problems) console.log(`          ${p}`);
    } else if (showPasses || also) console.log(`pass  ${id} ${said(r)}${also}`);
  }
} finally {
  await guard.close();
  await vite.close();
}
if (asJson) {
  console.log(JSON.stringify({ floor, budgets: { MAX_ELEMENTS, MAX_FRAME_P95, MAX_RESPONSE, WARMUP, PILE_GROWTH, MAX_PEAK }, models: results }, null, 1));
  process.exit(0);
}
const failed = results.filter((r) => r.broke || r.problems.length);
console.log(`\n${results.length - failed.length}/${results.length} models are within the performance budgets.`);
if (failed.length) console.log(`failing: ${failed.map((r) => r.id).join(' ')}`);
process.exit(failed.length ? 1 : 0);
