/**
 * npm run check-parity [-- <ids>] [--all] [--save <dir>] [--worker <url>]
 *
 * The same captured scene, drawn by BOTH renderers, and the two pictures compared.
 *
 * WHY THIS EXISTS, AND WHY check-exports CANNOT DO IT
 *
 * check-exports drives the real dialog over all 135 models and compares each exported file against
 * the dialog's canvas. Both of those are drawn on THIS machine, where the canvas and the local
 * render service share a font folder. So `system-ui` means Segoe UI on both sides, the two agree,
 * and the check reports agreement with complete confidence.
 *
 * A visitor's export is not drawn here. It is drawn by the Cloudflare Worker, on Linux, which has
 * neither Segoe UI nor Consolas. A check that compares two things on one machine cannot see a
 * difference that only exists between machines.
 *
 * That gap shipped twice. On 2026-09-25 a card came back with its numbers hanging off the edge.
 * On 2026-09-27, with the capture fonts finally embedding for real, seven chart models still named
 * `system-ui, sans-serif` and nothing we ship, so the embedded faces never applied to them:
 *
 *   pie      names Inter          mean diff 0.13   ink box identical
 *   radar    system-ui only       mean diff 2.85   right edge 87.0 -> 91.0   (4.0% apart)
 *   treemap  system-ui only       mean diff 3.20   right edge 92.3 -> 100.0  (7.8%)
 *
 * 100.0 is ink on the frame: a label running off the exported picture.
 *
 * WHY NOT THE OLD BAR. scripts/check-renderers.cjs asked this question first, but by hand (you had
 * to catch a payload and take a picture yourself) and it judged on PNG byte size, within 10%. That
 * bar is not weak, it is inverted -- a compressed size measures entropy, not position:
 *
 *   treemap   2.3% byte gap   -> passes, and its label is off the frame
 *   pie       6.5% byte gap   -> and pie is correct, ink box identical
 *   radar    13.6% byte gap   -> caught, barely
 *
 * So the bar here is the picture: the mean difference between the two, and where the ink sits in
 * each. The same two measures check-exports already judges a file on.
 *
 * WHY curl AND NOT fetch. Both services check the Origin header, and node's fetch refuses to send
 * one -- it is a forbidden header name, and undici drops it silently. A POST from fetch is a 403.
 */
import { execFile, execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stepFingerprint } from './gate-paths.mjs';
// Not playwright's chromium directly: scripts/browser.mjs is where 'which browser do the checks
// run on' is answered, including the fallback when a policy refuses to start the bundled one.
// These two bypassed it, so they never got the channel workaround either.
import { launchChromium, browserId } from './browser.mjs';
import { createServer } from 'vite';
import { exportServer } from '../server/dev.mjs';
import { ROOT, workingSources } from './model-sources.mjs';

const LOCAL = 'http://127.0.0.1:8787/capture';
const WORKER_DEFAULT = 'https://css-3d-lab-capture.social-posts-pinata.workers.dev/capture';
const LOCAL_ORIGIN = 'http://127.0.0.1:5173';
const SITE_ORIGIN = 'https://css3dlab.edgarasneverdauskas.com';

/** The families the captured scene carries with it (scripts/generate-capture-fonts.mjs). */
const EMBEDDED = /\bInter\b|\bJetBrains Mono\b/i;
/**
 * A family list that names none of those is drawn by whatever the renderer has installed. Lists
 * that name no family at all (`font: 700 4vmin/1.2` with the family inherited) are not judged here:
 * the element inherits from an ancestor this scan cannot resolve, and the render comparison below
 * is what catches those.
 */
const NAMES_A_FAMILY = /[A-Za-z][\w -]*(?=\s*(?:,|$))/;
/**
 * `font-family: inherit` names no family at all -- it takes the parent's, and the parent's own
 * declaration is scanned on its own line. Flagging it reported magnet, whose text inherits Inter
 * from the page, as if it were unpinned.
 */
const CSS_WIDE = /^\s*(inherit|initial|unset|revert|revert-layer)\s*$/i;

/** How different two drawings of one scene may be before it is the drawing and not the encoder. */
const MEAN_TOL = 1.0;   // mean absolute channel difference, both at 400px wide
const EDGE_TOL = 0.01;  // where the ink sits, as a share of the side
/**
 * WHAT A MODEL IS EXPECTED TO DIFFER BY, WHEN ONE FLAT LIMIT IS THE WRONG SHAPE OF RULE.
 *
 * MEAN_TOL asks every model the same question, and the answer is not comparable between them.
 * Measured on 2026-09-28, against the deployed Worker:
 *
 *   cube      0.26   the control: no text at all
 *   radar     0.53
 *   perfume   0.65
 *   activity  0.66
 *   treemap   1.36   by far the most small text
 *
 * The number tracks how much small text a model carries, because the two renderers do not
 * rasterise text identically: the Worker draws Inter on Linux with different hinting and gamma,
 * so the white glyph cores never reach full brightness. 42% fewer bright pixels on treemap, with
 * the text in exactly the same box. That is not the font bug the charts had -- their declarations
 * name Inter and the scan is clean -- and it is not something a model can fix: replacing the
 * labels' blurred text-shadow with eight hard-offset copies moved the bright-pixel gap from
 * 42.13% to 42.4% and the mean from 1.36 to 1.47. The shadow was never the cause.
 *
 * So a model listed here is held to the value it was MEASURED at, plus a margin, instead of to
 * the flat limit. That is tighter than MEAN_TOL for that model, not looser: treemap may now sit
 * anywhere under 1.71 and nowhere else, where an exemption would have let it go to anything. A
 * font substitution, a lost label or a shifted box moves it far past that, and EDGE_TOL still
 * applies unchanged. MEAN_TOL is untouched for all 135 other models.
 *
 * An entry is a measurement with a reason, and it has to be re-earned: change the model and the
 * number moves, which is the point.
 */
const EXPECTED = new Map([
  ['treemap', { mean: 1.36, margin: 0.35, why: 'small white labels, rasterised differently on the Worker: 42% fewer bright pixels, same box, and no change to the shadow moves it' }],
]);

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const VALUED = ['--save', '--worker', '--top'];
const ids = args.filter((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1]));
const WORKER = opt('--worker') ?? WORKER_DEFAULT;
const saveDir = opt('--save');
if (saveDir) mkdirSync(saveDir, { recursive: true });
const TOP = Number(opt('--top') ?? 8);

const sources = workingSources();
const pc = (v) => (v * 100).toFixed(1);
const fail = [];

/* ---------------- 1. the static scan: every model, no network ---------------- */
/**
 * Free, and it is what would have caught the seven charts. Every font declaration in every model's
 * own source: if it names families and none of them travels with the scene, the exported picture
 * depends on the renderer's font folder.
 */
function unpinned() {
  const out = [];
  for (const [id, src] of sources) {
    const text = typeof src.snippet === 'string' ? src.snippet : JSON.stringify(src.snippet ?? '');
    const bad = [];
    for (const m of text.matchAll(/font(?:-family)?:\s*([^;{}]+);/g)) {
      const value = m[1].trim();
      if (EMBEDDED.test(value)) continue;
      if (CSS_WIDE.test(value)) continue;
      if (!NAMES_A_FAMILY.test(value)) continue;
      bad.push(value.replace(/\s+/g, ' '));
    }
    if (bad.length) out.push({ id, bad });
  }
  return out;
}

/* ---------------- 2. the render comparison ---------------- */
/*
 * NOT execFileSync. This used to call curl synchronously, and when no service was already on 8787
 * the script had started its own in THIS process -- so the curl to 127.0.0.1:8787 waited on an
 * event loop that was blocked waiting on curl. Every local render timed out at 240 s and the run
 * reported three "disagreements" that were the script disagreeing with itself (2026-09-30). It had
 * only ever passed with a service somebody else had started. curl is spawned and awaited now.
 */
async function render(endpoint, scene, tmp) {
  const origin = endpoint.includes('127.0.0.1') ? LOCAL_ORIGIN : SITE_ORIGIN;
  writeFileSync(tmp, JSON.stringify({ ...scene, count: 1, fps: 30, frame: 'png' }));
  const out = await new Promise((resolve, reject) => {
    execFile('curl', ['-s', '--max-time', '240', '-X', 'POST',
      '-H', 'Content-Type: application/json', '-H', 'Origin: ' + origin,
      '--data-binary', '@' + tmp, '-w', '\nHTTPSTATUS:%{http_code}', endpoint],
    { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' },
    (err, stdout, stderr) => (err ? reject(new Error(`curl to ${endpoint} failed (exit ${err.code ?? '?'}${err.code === 28 ? ', timed out after 240 s' : ''})${String(stderr ?? '').trim() ? `: ${String(stderr).trim().split('\n')[0]}` : ''}`)) : resolve(stdout)));
  });
  const code = (out.match(/HTTPSTATUS:(\d+)/) ?? [])[1] ?? '?';
  const body = out.replace(/\nHTTPSTATUS:\d+$/, '');
  for (const line of body.split('\n')) {
    if (!line.trim()) continue;
    let j; try { j = JSON.parse(line); } catch { continue; }
    if (j.error) throw new Error(`HTTP ${code}: ${j.error}`);
    if (typeof j.png === 'string') return j.png;
  }
  throw new Error(`HTTP ${code}: ${body.slice(0, 160) || '(empty body)'}`);
}

/* ---------------- run ---------------- */
/*
 * A scan hit is a RISK, not a verdict, and it took perfume to see the difference.
 *
 * perfume asks for `Georgia, 'Times New Roman', serif`, none of which travels with the scene and
 * none of which a Linux renderer has. So the scan flags it -- correctly. But drawn twice it comes
 * back at mean 0.66 and 0.3% of ink edge: whatever serif the Worker substitutes is close enough
 * that the picture holds. Failing the gate on that would be failing on a structural worry while
 * the thing the worry is about demonstrably did not happen.
 *
 * radar and treemap, flagged the same way, came back at 2.85/4.0% and 3.20/7.8%. The measurement
 * separates them; the scan cannot. So the scan chooses what to draw twice, and the drawing judges.
 */
/*
 * MODELS THAT NAME SOMETHING WE DO NOT SHIP, AND ARE FINE ANYWAY.
 *
 * The scan asks one question -- does this model's text name a family the scene carries -- and it
 * is the half that catches regressions, because a new model naming `system-ui` is how the seven
 * charts happened. It costs nothing and needs no network, so it runs on every gate.
 *
 * The render comparison is the other half and cannot gate anything: it needs the Worker, and the
 * Worker has a daily budget. Being blocked by a rate limit is not a quality signal. It runs with
 * --render, and what it proves gets written here.
 *
 * perfume asks for Georgia and gets whatever serif Linux has. Drawn on both renderers on
 * 2026-09-27 it came back at mean 0.66 and 0.3% of ink edge -- the worry is real and the thing
 * worried about does not happen, so it is listed with its measurement rather than left to fail the
 * gate every night. Anything NOT on this list that the scan flags is a new one, and fails.
 */
const PROVEN_FINE = new Map([
  ['perfume', 'Georgia, and whatever serif the renderer has: drawn on both on 2026-09-27, mean 0.66, ink edge 0.3%'],
]);
const RENDER = flag('--render') || ids.length > 0;

const loose = unpinned();
console.log(`check-parity: ${sources.size} models scanned for a family the scene does not carry`);
const newly = [];
for (const { id, bad } of loose) {
  const why = PROVEN_FINE.get(id);
  const names = [...new Set(bad)].join(' | ');
  if (why) console.log(`  known    ${id}: ${names} — ${why}`);
  else { console.log(`  OFF      ${id}: ${names}`); newly.push(id); }
}
if (!loose.length) console.log('  every font declaration names a family the scene carries');
if (newly.length) {
  for (const id of newly) fail.push(`${id}: names a family the scene does not carry, so the renderer picks its own`);
}

if (!RENDER) {
  console.log('');
  console.log(newly.length
    ? `check-parity: ${newly.length} model(s) name a family that does not travel with the scene.`
    : `check-parity: every model's text names a family the scene carries${loose.length ? `, apart from ${loose.length} measured and listed as fine` : ''}.`);
  console.log('The two renderers were not asked: that needs the Worker and its daily budget, and a');
  console.log('release should not turn on somebody else\'s rate limit. Run it with --render.');
  // Nothing has been started yet -- the server and the browser are below -- so there is nothing
  // to close on the way out.
  process.exit(newly.length ? 1 : 0);
}

/*
 * SPEND THE BUDGET ONLY WHEN THERE IS SOMETHING NEW TO LEARN.
 *
 * Cloudflare's Browser Rendering free plan allows TEN MINUTES of browser time PER DAY, for the
 * whole account -- and that same ten minutes is what every visitor's export draws on. Every run of
 * this check took a bite out of the feature the site exists to demonstrate, and on 2026-09-29 it
 * took the last of it: the Worker answered "out of exports for today", and the checklist line sat
 * unanswerable until the next morning.
 *
 * But asking again teaches nothing when nothing has changed. This step declares the fifty files it
 * depends on -- the scene, both renderers, the models -- so when their fingerprint is the hash it
 * already has, the picture the Worker would draw is the picture it drew last time.
 *
 * THREE THINGS MUST MATCH, and each one has a reason:
 *
 *   the fingerprint   nothing it judges has changed
 *   the browser       a number measured on Brave is not comparable with one measured on Chromium.
 *                     The doctor says the same thing about check-perf; this is that rule applied
 *                     to the half of the comparison that runs HERE.
 *   the age           and this is the one that cannot be derived from any file. The Worker's
 *                     Chromium is Cloudflare's, and it can change under a scene that did not.
 *                     Nothing in this repository would move, so nothing in the fingerprint would
 *                     either. An answer kept for ever would eventually be about a renderer that no
 *                     longer exists. It is re-measured at least weekly, so the record is never
 *                     older than its subject by more than that.
 *
 * A previous FAILURE is never reused: a red is a thing to retry, not a thing to cache.
 * --force ignores all of this and asks anyway.
 */
const MAX_AGE_DAYS = Number(process.env.C3D_PARITY_MAX_AGE_DAYS || 7);
const RECORD = join(ROOT, 'docs', 'checks', 'parity.json');
if (!flag('--force')) {
  let prior = null;
  try { prior = JSON.parse(readFileSync(RECORD, 'utf8')); } catch { /* none yet: ask */ }
  const now = stepFingerprint('parity');
  const here = browserId();
  const ageDays = prior?.at ? (Date.now() - new Date(prior.at).getTime()) / 86400000 : Infinity;
  const sameBrowser = prior?.browser?.name === here?.name && prior?.browser?.version === here?.version;
  if (prior && prior.ok === true && prior.fp?.hash === now?.hash && sameBrowser && ageDays < MAX_AGE_DAYS) {
    const when = new Date(prior.at).toISOString().slice(0, 16).replace('T', ' ');
    console.log('');
    console.log(`check-parity: not asked, and nothing was lost by not asking.`);
    console.log(`  The two renderers agreed at ${when}, on ${prior.drawn?.length ?? 0} model(s).`);
    console.log(`  The ${now.files} files this compares -- the scene, both renderers, the models -- are byte-for-byte`);
    console.log(`  what they were then, and the same browser draws this half (${here?.name ?? '?'} ${here?.version ?? ''}).`);
    console.log(`  So the Worker would draw the picture it already drew, for a bite out of a daily`);
    console.log(`  budget the site's own visitors export from.`);
    console.log(`  It is asked again after ${MAX_AGE_DAYS} days regardless, because Cloudflare's Chromium can`);
    console.log(`  change under a scene that did not. Ask now with --force.`);
    process.exit(0);
  }
  /* Why it IS asking, so a run that spends budget always says what it is buying. */
  if (prior) {
    const why = prior.ok !== true ? 'the last run did not end in agreement'
      : prior.fp?.hash !== now?.hash ? 'the files it compares have changed since'
      : !sameBrowser ? `it was measured on ${prior.browser?.name ?? '?'} ${prior.browser?.version ?? ''}, and this is ${here?.name ?? '?'} ${here?.version ?? ''}`
      : `the last answer is ${Math.floor(ageDays)} day(s) old`;
    console.log(`check-parity: asking the Worker — ${why}.`);
  } else {
    console.log('check-parity: asking the Worker — nothing has been recorded yet.');
  }
}

// Which models to actually draw twice: anything the scan flagged, then the text-heaviest, because
// a model with no words in it cannot show a font difference however wrong the font is.
const byText = [...sources.entries()]
  .map(([id, src]) => {
    const t = typeof src.snippet === 'string' ? src.snippet : '';
    return { id, n: [...t.matchAll(/font(?:-family)?:\s*[^;{}]+;/g)].length };
  })
  .filter((x) => x.n > 0)
  .sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));
const chosen = ids.length ? ids
  : flag('--all') ? byText.map((x) => x.id)
  : [...new Set([...loose.map((l) => l.id), ...byText.map((x) => x.id)])].slice(0, TOP);

const vite = await createServer({ server: { port: 0 }, logLevel: 'silent' });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const serviceAnswers = async () => {
  try {
    const r = await fetch(LOCAL, { method: 'OPTIONS', headers: { Origin: LOCAL_ORIGIN }, signal: AbortSignal.timeout(2000) });
    return r.status === 204;
  } catch { return false; }
};
const external = await serviceAnswers();
const service = external ? null : await exportServer(8787);
console.log(`export service: ${external ? 'already running on 127.0.0.1:8787 (used as is)' : 'started in this process'}`);
console.log(`worker: ${WORKER}`);
console.log(`\ndrawing ${chosen.length} model(s) twice, once here and once there:\n`);

const browser = await launchChromium();
const meter = await (await browser.newContext({ viewport: { width: 420, height: 420 } })).newPage();
await meter.goto('about:blank');

/** Mean difference and each picture's ink box, both drawn to one size so the comparison is fair. */
const compare = (a, z) => meter.evaluate(async ([A, Z]) => {
  const load = async (s) => createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob());
  const [ia, iz] = await Promise.all([load(A), load(Z)]);
  const W = 400, H = Math.max(1, Math.round(W * ia.height / ia.width));
  const draw = (img) => {
    const c = new OffscreenCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, W, H);
    return x.getImageData(0, 0, W, H).data;
  };
  const da = draw(ia), dz = draw(iz);
  let sum = 0, n = 0;
  for (let i = 0; i < da.length; i += 4) {
    sum += (Math.abs(da[i] - dz[i]) + Math.abs(da[i + 1] - dz[i + 1]) + Math.abs(da[i + 2] - dz[i + 2])) / 3;
    n++;
  }
  const box = (d) => {
    const bg = [d[0], d[1], d[2]];
    let l = 1, r = 0, t = 1, b = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2])) > 28) {
        if (x / W < l) l = x / W;
        if ((x + 1) / W > r) r = (x + 1) / W;
        if (y / H < t) t = y / H;
        if ((y + 1) / H > b) b = (y + 1) / H;
      }
    }
    return [l, r, t, b];
  };
  return { diff: sum / n, a: box(da), z: box(dz) };
}, [a, z]);

const tmp = join(saveDir ?? ROOT, '.parity-scene.json');
for (const id of chosen) {
  let scene = null;
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.route('**/capture', async (r) => {
      if (!scene) { try { scene = JSON.parse(r.request().postData() ?? 'null'); } catch { /* not ours */ } }
      await r.continue();
    });
    await page.goto(`${base}/models/${id}/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForSelector('.stage iframe[data-ready="true"]', { timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.click('[data-make="image"]');
    await page.waitForSelector('.maker [data-live] iframe[data-ready="true"]', { timeout: 20_000, state: 'attached' });
    // The pointer off the preview. It was left where the button had been, which the dialog's live
    // copy opens under: when the treemap's ETH tile caught it, the scene was the hovered map, glow
    // and caption included, and its mean read 2.36 against a limit measured on the plain one, 1.71.
    // Four runs in a row on 2026-10-05, and twice before -- a "flake" that was a different picture.
    await page.mouse.move(1, 1);
    await page.waitForTimeout(800);
    await page.click('.maker [data-go]');
    for (let i = 0; i < 160 && !scene; i++) await page.waitForTimeout(250);
    if (!scene) throw new Error('the dialog never posted a scene');
  } catch (e) {
    console.log(`  ${id.padEnd(13)} could not capture a scene: ${e.message.split('\n')[0]}`);
    fail.push(`${id}: no scene`);
    await context.close();
    continue;
  }
  await context.close();

  try {
    const here = await render(LOCAL, scene, tmp);
    const there = await render(WORKER, scene, tmp);
    if (saveDir) {
      writeFileSync(join(saveDir, `${id}-local.png`), Buffer.from(here, 'base64'));
      writeFileSync(join(saveDir, `${id}-worker.png`), Buffer.from(there, 'base64'));
    }
    const c = await compare(here, there);
    const edge = Math.max(...[0, 1, 2, 3].map((i) => Math.abs(c.a[i] - c.z[i])));
    const exp = EXPECTED.get(id);
    const limit = exp ? exp.mean + exp.margin : MEAN_TOL;
    const ok = c.diff <= limit && edge <= EDGE_TOL;
    if (!ok) fail.push(`${id}: mean ${c.diff.toFixed(2)} over ${limit.toFixed(2)}, worst ink edge ${pc(edge)}%`);
    console.log(`  ${ok ? (exp ? 'as-is' : 'same ') : 'OFF  '} ${id.padEnd(13)} mean ${c.diff.toFixed(2).padStart(5)}  worst ink edge ${pc(edge).padStart(5)}%`
      + (exp ? `  (measured ${exp.mean.toFixed(2)}, held under ${limit.toFixed(2)}: ${exp.why})` : '')
      + (ok ? '' : `\n        here  ${pc(c.a[0])}-${pc(c.a[1])} x ${pc(c.a[2])}-${pc(c.a[3])}`
             + `\n        there ${pc(c.z[0])}-${pc(c.z[1])} x ${pc(c.z[2])}-${pc(c.z[3])}`
             + (c.z[1] >= 0.999 || c.z[0] <= 0.001 ? '  — ink on the frame: something is drawn off the picture' : '')));
  } catch (e) {
    console.log(`  ${id.padEnd(13)} ${e.message.split('\n')[0]}`);
    fail.push(`${id}: ${e.message.split('\n')[0]}`);
  }
}

try { unlinkSync(tmp); } catch { /* already gone */ }
await browser.close();
await service?.close?.();

/*
 * WHAT THE TWO RENDERERS DREW, WRITTEN DOWN.
 *
 * This printed its numbers and exited, so the release-checklist line it answers read "not
 * evaluated" however often it ran -- including an hour after it had just proved itself. That is
 * the same hole three-looks, snippet-check, preview-check and compare-capture all had, and it is
 * why a week of real answers left no trace.
 *
 * Only a --render run records: the scan alone proves the precondition, not the picture.
 */
/*
 * A RUN THAT COULD NOT ASK MUST NOT ERASE THE ANSWER FROM ONE THAT COULD.
 *
 * At 03:55 on 2026-09-29 this drew three models on both renderers and they agreed. At 04:15 it
 * ran again, the browser would not start (Smart App Control), every model failed to render, and
 * the record was overwritten with ok:false. The board then said "drawn on both renderers and
 * they disagreed", which is a sentence about pixels describing a machine that never drew any.
 *
 * A failure that is the renderer refusing to start, or the service refusing the request, says
 * nothing about whether the two renderers agree. So when every failure is of that kind, the
 * previous record stands and this run says it could not ask.
 */
/*
 * CHARACTER CLASSES, NOT BACKSLASH-d, AND THAT IS NOT A STYLE CHOICE.
 *
 * This read `HTTP 4dd|HTTP 5dd`. It was meant to be `HTTP 4[backslash]d[backslash]d`, and the two
 * backslashes were eaten on the way into the file. What was left matches the literal text
 * "HTTP 4dd", which nothing ever says, so the whole quota-and-refusal half of this guard was dead
 * from the day it was written.
 *
 * It cost a real result on 2026-09-29: the Worker answered "HTTP 429: out of exports for today",
 * couldNotAsk came out false, and a good measurement of the two renderers agreeing was overwritten
 * with ok:false -- the board then reporting that they DISAGREED, about pixels the Worker had
 * refused to draw. A false red, from two missing characters. docs/checks is not committed, so the
 * measurement it replaced is gone until the quota resets.
 *
 * [0-9] says the same thing and cannot be silently disarmed by anything that strips backslashes.
 */
const COULD_NOT_ASK = /browserType.launch|Target crashed|could not capture a scene|spawn UNKNOWN|Application Control|ECONNREFUSED|HTTP 4[0-9][0-9]|HTTP 5[0-9][0-9]|no scene/i;
const couldNotAsk = fail.length > 0 && fail.every((f) => COULD_NOT_ASK.test(String(f)));
if (RENDER && couldNotAsk) {
  console.log(`
check-parity: could not ask -- ${fail.length} model(s) never drew (${String(fail[0]).split(":").slice(1).join(":").trim()}).`);
  console.log(`Whatever was recorded before stands: a run that could not draw says nothing about whether the two renderers agree.`);
}
if (RENDER && !couldNotAsk) {
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    writeFileSync(join(ROOT, 'docs', 'checks', 'parity.json'), `${JSON.stringify({
      note: 'Written by scripts/check-worker-parity.mjs on a --render run: the same scene drawn here and on the Worker visitors export from.',
      at: new Date().toISOString(),
      commit,
      worker: WORKER,
      // what drew it: a calibrated number measured on another browser is not comparable
      browser: browserId(),
      fp: stepFingerprint('parity'),
      drawn: chosen,
      failures: fail,
      ok: fail.length === 0,
    }, null, 2)}\n`);
  } catch (e) {
    console.log(`(could not write docs/checks/parity.json: ${String(e?.message ?? e).split('\n')[0]})`);
  }
}
await vite.close();

console.log('');
const atRisk = loose.length ? ` ${loose.length} model(s) name a family the scene does not carry (${loose.map((l) => l.id).join(', ')}); they were drawn twice and agreed.` : '';
if (fail.length && couldNotAsk) {
  // Refused, not compared: calling these "disagreements" and advising a font change sent the
  // reader after a problem nobody had measured (2026-10-04, the daily budget spent). Still a
  // failure, because the line is unanswered, not answered yes.
  console.log(`check-parity: not measured -- the Worker drew none of the ${fail.length} model(s), so nothing was compared.`);
  console.log(`Ask again once it answers${/out of exports for today/i.test(String(fail[0])) ? ' (the daily export budget resets at 00:00 UTC)' : ''}.`);
  process.exitCode = 1;
} else if (fail.length) {
  console.log(`check-parity: ${fail.length} disagreement(s) between this machine and the renderer visitors use:`);
  for (const f of fail) console.log(`  ${f}`);
  console.log(`\nA model whose text names a family the scene does not carry is drawn in whatever the`);
  console.log(`Worker has installed. Name one it carries -- Inter or JetBrains Mono -- as the others do.`);
  process.exitCode = 1;
} else {
  console.log(`check-parity: both renderers drew the same picture for ${chosen.length} model(s).${atRisk}`);
}
