/**
 * No reliance on outside CSS: a model must draw the same whether or not the page around it makes
 * every box border-box. The site's own stylesheet once did (`*, *::before, *::after { box-sizing:
 * border-box }`), and models were written and sized against it; in the model's own frame, and in
 * the file a visitor copies, nothing sets it, so a card with padding and a border drew bigger than
 * its numbers (tilt 320 × 216 for a 280 × 176 card, the hovercards 9 units off their slots). The
 * sweep that found those eight (tilt, hovercards, pricing, polaroid, accordion, magnet,
 * shapeshift, cone) is this check, kept.
 *
 *   node scripts/check-boxsizing.mjs              every model
 *   node scripts/check-boxsizing.mjs fold cube    just these
 *   node scripts/check-boxsizing.mjs --pass       print a line for the passes too (capture-check adds it)
 *   node scripts/check-boxsizing.mjs --try f.mjs  a model that is not in the gallery (a default export
 *                                                 { title, html, css, js, boxSizing? }): how the check
 *                                                 is proved on broken copies in .media-tmp/boxsizing/
 *
 * HOW. The model's standalone document (standaloneDoc, what "Copy as one HTML file" hands over) is
 * opened on its own at SIZE × SIZE, several times, each in a fresh page with the same seeded
 * Math.random and a paused fake clock (Playwright's page.clock: Date, timers and
 * requestAnimationFrame stand still, then run exactly SETTLE ms), so a script-driven model is at
 * the same moment in each: twice as it is (A1, A2) and twice with the site's old rule injected
 * ahead of the model's own CSS (B1, B2), after one opening that is thrown away (and two more of
 * each, when a model is found to differ, before it fails). In each, every CSS animation is put at
 * the start of its timeline and paused, and every transition finished; that picture is the rest
 * state. Then
 * :hover is forced (the model's CSS written again with every :hover made to match, as check-models
 * does) and the transitions it starts are finished: the hover state.
 *
 * WHAT COUNTS. A pixel differs when one of its channels is more than DIFF (of 255) apart: under
 * that is antialiasing. A state's difference is the share of the canvas's pixels that differ
 * between A and B (the closest pair), less the share that differ between two openings of the
 * same file (the closest such pair: what changes on its own, which box-sizing did not do; Chromium
 * rasters one paused 3D scene one of two ways, 1.5% of the cube apart). A model DEPENDS on outside
 * CSS when that difference is over LIMIT in either state. LIMIT is 0.25% of the canvas: the eight models fixed in the sweep differed
 * by 0.6% to 17% before and by 0 to 0.08% after, and a single 1-unit border that grows by 2 units
 * round one small box is well under it.
 *
 * THE FIX IS IN THE MODEL. A model says in its own CSS which box its numbers mean: border-box where
 * they are outside sizes (the eight of the sweep), content-box where they are the inside (a ring
 * whose width is its hole, a floor with a hairline edge round it: gyro, rings, tunnel, door, fold and
 * thirteen more declare it). Then no page can change it, the copied file included.
 *
 * NO SILENT SKIP. A model that cannot say it in its CSS may say it in its gallery entry instead,
 * `boxSizing: 'content-box by design: <why>'` (src/models/types.ts), and the check reads it:
 *  - it differs and carries the mark: pass, and its line says "content-box by design", the reason
 *    and how much it differs, so every use is visible in every run;
 *  - it differs and has no mark: FAILS, with how much each state differs;
 *  - it carries the mark but does NOT differ: FAILS too ("marked content-box by design, but ...
 *    draws the same"), so a mark cannot outlive the design it describes;
 *  - a mark that does not start "content-box by design:" and give a reason: FAILS.
 *
 * Lines: `pass <id> …` and `FAILS <id> …`, the problems indented under a failure, and a closing
 * `N/M models do not depend on outside CSS.` scripts/capture-check.mjs records them.
 */
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BrowserGuard, crashGuard } from './browser-guard.mjs';
import { decode } from './pixels.mjs';

const SIZE = 400; // the standalone file at 400 × 400, as check-stages opens it too
const SETTLE = 800; // ms of the model's own (fake) time before the first picture
const DIFF = 24; // of 255: a channel this far apart is a pixel that differs, under it antialiasing
const LIMIT = 0.25; // per cent of the canvas, over the model's own noise: over it, the model depends on outside CSS
const BORDER_BOX = '*, *::before, *::after { box-sizing: border-box; }';
const MARK = /^content-box by design:\s*\S/;

const argv = process.argv.slice(2);
const showPasses = argv.includes('--pass');
const at = argv.indexOf('--try');
const TRY = at >= 0 ? argv[at + 1] : null;
const wanted = argv.filter((a, i) => !a.startsWith('-') && !(at >= 0 && i === at + 1));

const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, watch: null } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { snippets } = await vite.ssrLoadModule('/src/models/snippets.ts');
const { standaloneDoc } = await vite.ssrLoadModule('/src/models/snippet-utils.ts');

let tried = null;
if (TRY) {
  const mod = await import(pathToFileURL(resolve(TRY)).href);
  tried = { title: 'try', js: '', how: [], ...(mod.default ?? mod) };
}
const ids = TRY ? [`try:${TRY.replace(/\\/g, '/').split('/').pop().replace(/\.m?js$/, '')}`] : wanted.length ? wanted : demos.map((d) => d.id);
const unknown = TRY ? [] : ids.filter((id) => !demos.some((d) => d.id === id));
if (unknown.length) {
  console.error(`check-boxsizing: no such model: ${unknown.join(', ')}`);
  await vite.close();
  process.exit(2);
}

/** The model's file, and the mark its gallery entry carries (or the --try copy's). */
function modelOf(id) {
  if (tried) return { title: tried.title, snippet: tried, mark: tried.boxSizing ?? null };
  const demo = demos.find((d) => d.id === id);
  return { title: demo.title, snippet: { how: [], ...snippets[id] }, mark: demo.boxSizing ?? null };
}

/** Runs in the page: every animation at the start of the page's timeline and paused, every transition landed. */
const FREEZE = () => {
  const doc = document;
  window.c3dFirst ??= new Set(doc.getAnimations());
  for (const a of doc.getAnimations()) {
    if (a instanceof CSSTransition) { a.finish(); continue; }
    a.pause();
    const t = a.effect?.getComputedTiming();
    // one started after the page's timeline (by a script or a hover) is seen at its end, like a transition
    a.currentTime = window.c3dFirst.has(a) || !isFinite(t?.endTime) ? 0 : t.endTime;
  }
};

/** One opening of the file: its rest picture, then its hover picture. */
async function render(browser, html) {
  const context = await browser.newContext({ viewport: { width: SIZE, height: SIZE } });
  const errors = [];
  try {
    await context.addInitScript(() => {
      let seed = 0x2f6b4a1d;
      Math.random = () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
    await page.clock.install({ time: new Date('2026-01-01T10:08:30Z') });
    await page.clock.pauseAt(new Date('2026-01-01T10:08:30Z'));
    const url = `${base}/__c3d-file/boxsizing.html`;
    await page.route(url, (r) => r.fulfill({ contentType: 'text/html', body: html }));
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.clock.runFor(SETTLE);
    await page.evaluate(FREEZE);
    // (no waiting on requestAnimationFrame here: the clock is paused, so it would never come)
    await page.clock.runFor(40);
    await page.waitForTimeout(150); // real time: the compositor draws the paused pose before the picture
    const rest = await page.screenshot();
    await page.evaluate(() => {
      const held = document.querySelector('#c3d-held');
      held.textContent = (document.querySelector('#c3d-code')?.textContent ?? '').replace(/:hover/g, ':not(.c3d-never)');
      document.documentElement.getBoundingClientRect();
    });
    await page.clock.runFor(40);
    await page.evaluate(FREEZE);
    await page.clock.runFor(40);
    await page.waitForTimeout(150);
    const hover = await page.screenshot();
    return { rest: decode(rest), hover: decode(hover), errors };
  } finally {
    await context.close().catch(() => {});
  }
}

/** The share of the canvas, in per cent, whose pixels differ between two pictures. */
function differs(p, q) {
  let n = 0;
  for (let i = 0; i < p.rgba.length; i += 4) {
    if (Math.abs(p.rgba[i] - q.rgba[i]) > DIFF || Math.abs(p.rgba[i + 1] - q.rgba[i + 1]) > DIFF || Math.abs(p.rgba[i + 2] - q.rgba[i + 2]) > DIFF) n++;
  }
  return (100 * n) / (p.width * p.height);
}

async function judge(id, browser) {
  const { title, snippet, mark } = modelOf(id);
  const doc = standaloneDoc(title, snippet).replace('</head>', '<style id="c3d-held"></style>\n</head>');
  // the site's old rule, ahead of the model's own CSS, where a site stylesheet would be
  const bbDoc = doc.replace('<style id="c3d-code">', `<style id="c3d-outside">${BORDER_BOX}</style>\n<style id="c3d-code">`);
  // Chromium does not always raster the same paused 3D scene the same way: the cube, in the same
  // pose with the same matrix, comes out one of two ways, 1.5% of its pixels apart, the first
  // opening in a browser nearly always the other way. So a first opening is made and thrown away,
  // then each way is opened twice (as it is: A1, A2; with the rule: B1, B2), and a state differs by
  // the closest A-B pair, less the closest pair of two openings of the same way (its noise): a
  // real difference is in every pair, a raster coin-toss is not. A model found to differ is opened
  // four times more, and judged on all eight, before it is failed.
  await render(browser, doc);
  const as = [], bs = [];
  const judgeStates = () => ['rest', 'hover'].map((s) => {
    const same = [...as.flatMap((x, i) => as.slice(i + 1).map((y) => differs(x[s], y[s]))), ...bs.flatMap((x, i) => bs.slice(i + 1).map((y) => differs(x[s], y[s])))];
    const noise = Math.min(...same);
    const raw = Math.min(...as.flatMap((a) => bs.map((b) => differs(a[s], b[s]))));
    return { state: s, raw, noise, over: Math.max(0, raw - noise) };
  });
  let states;
  for (let round = 0; round < 2; round++) {
    for (let k = 0; k < 2; k++) { as.push(await render(browser, doc)); bs.push(await render(browser, bbDoc)); }
    states = judgeStates();
    if (!states.some((s) => s.over > LIMIT)) break;
  }
  const worst = states.reduce((w, s) => (s.over > w.over ? s : w));
  const depends = worst.over > LIMIT;
  const said = states.map((s) => `${s.state} ${s.raw.toFixed(2)}%${s.noise ? ` (noise ${s.noise.toFixed(2)}%)` : ''}`).join(', ');
  const problems = [];
  if (mark != null && !MARK.test(String(mark))) problems.push(`its boxSizing mark must read "content-box by design: <why>", and it reads "${mark}"`);
  else if (depends && mark == null) problems.push(`draws differently when the page makes every box border-box: ${said} of the canvas differ, over the ${LIMIT}% limit. Say in the model's own CSS which box its numbers mean: box-sizing: border-box where they are outside sizes, content-box where they are the inside (or, only if it cannot say, mark its gallery entry boxSizing: 'content-box by design: <why>')`);
  else if (!depends && mark != null) problems.push(`marked content-box by design, but draws the same under border-box (${said}, within ${LIMIT}%): the mark is not needed, take it out`);
  const errors = [...new Set([...as, ...bs].flatMap((r) => r.errors))];
  for (const e of errors) problems.push(`page error: ${e}`);
  return { id, problems, states, said, depends, mark };
}

const results = [];
crashGuard('check-boxsizing', async () => console.error(`check-boxsizing: ${results.length} of ${ids.length} model(s) judged before the crash, each on its own line above`));
const guard = new BrowserGuard({ launch: () => chromium.launch() });
await guard.start();
try {
  for (const id of ids) {
    let r, notes = [];
    try {
      ({ value: r, notes } = await guard.run(id, (browser) => judge(id, browser)));
    } catch (e) {
      r = { id, broke: e.message.split('\n')[0] };
      notes = e.notes ?? [];
    }
    const also = notes.length ? `; ${notes.join('; ')}` : '';
    results.push(r);
    if (r.broke) console.log(`FAILS ${id} could not be checked: ${r.broke}${also}`);
    else if (r.problems.length) {
      console.log(`FAILS ${id} ${r.problems.length} problem(s)${also}`);
      for (const p of r.problems) console.log(`          ${p}`);
    } else if (r.mark) console.log(`pass  ${id} content-box by design, differs ${r.said} under border-box: ${String(r.mark).replace(/^content-box by design:\s*/, '')}${also}`);
    else if (showPasses || also) console.log(`pass  ${id} the same under border-box (${r.said})${also}`);
  }
} finally {
  await guard.close();
  await vite.close();
}
const failed = results.filter((r) => r.broke || r.problems.length);
console.log(`\n${results.length - failed.length}/${results.length} models do not depend on outside CSS.`);
if (failed.length) console.log(`failing: ${failed.map((r) => r.id).join(' ')}`);
process.exit(failed.length ? 1 : 0);
