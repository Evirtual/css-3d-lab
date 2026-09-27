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
import { execFileSync } from 'node:child_process';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
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
function render(endpoint, scene, tmp) {
  const origin = endpoint.includes('127.0.0.1') ? LOCAL_ORIGIN : SITE_ORIGIN;
  writeFileSync(tmp, JSON.stringify({ ...scene, count: 1, fps: 30, frame: 'png' }));
  const out = execFileSync('curl', ['-s', '--max-time', '240', '-X', 'POST',
    '-H', 'Content-Type: application/json', '-H', 'Origin: ' + origin,
    '--data-binary', '@' + tmp, '-w', '\nHTTPSTATUS:%{http_code}', endpoint],
    { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' });
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
const loose = unpinned();
console.log(`check-parity: ${sources.size} models scanned for a family the scene does not carry`);
if (loose.length) {
  for (const { id, bad } of loose) console.log(`  at risk  ${id}: ${[...new Set(bad)].join(' | ')} — drawn twice below`);
} else {
  console.log('  every font declaration names Inter or JetBrains Mono, both of which travel');
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

const browser = await chromium.launch();
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
    const here = render(LOCAL, scene, tmp);
    const there = render(WORKER, scene, tmp);
    if (saveDir) {
      writeFileSync(join(saveDir, `${id}-local.png`), Buffer.from(here, 'base64'));
      writeFileSync(join(saveDir, `${id}-worker.png`), Buffer.from(there, 'base64'));
    }
    const c = await compare(here, there);
    const edge = Math.max(...[0, 1, 2, 3].map((i) => Math.abs(c.a[i] - c.z[i])));
    const ok = c.diff <= MEAN_TOL && edge <= EDGE_TOL;
    if (!ok) fail.push(`${id}: mean ${c.diff.toFixed(2)}, worst ink edge ${pc(edge)}%`);
    console.log(`  ${ok ? 'same' : 'OFF '} ${id.padEnd(13)} mean ${c.diff.toFixed(2).padStart(5)}  worst ink edge ${pc(edge).padStart(5)}%`
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
await vite.close();

console.log('');
const atRisk = loose.length ? ` ${loose.length} model(s) name a family the scene does not carry (${loose.map((l) => l.id).join(', ')}); they were drawn twice and agreed.` : '';
if (fail.length) {
  console.log(`check-parity: ${fail.length} disagreement(s) between this machine and the renderer visitors use:`);
  for (const f of fail) console.log(`  ${f}`);
  console.log(`\nA model whose text names a family the scene does not carry is drawn in whatever the`);
  console.log(`Worker has installed. Name one it carries -- Inter or JetBrains Mono -- as the others do.`);
  process.exitCode = 1;
} else {
  console.log(`check-parity: both renderers drew the same picture for ${chosen.length} model(s).${atRisk}`);
}
