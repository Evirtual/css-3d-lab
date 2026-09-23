/**
 * Does the export dialog make what it says, and what the canvas shows?
 *
 * docs/VIEW-CONTRACT.md promises that a recording and a snapshot are the model exactly as the
 * dialog's canvas shows it, at the settings asked for, neither drifting nor resizing. This drives
 * the real dialog on the real model page — the chips are clicked, the file is made by the service,
 * and the file that comes back is decoded and measured — and checks five things:
 *
 *   dims      every image shape × size, and every video shape × quality: the file's actual pixel
 *             size is what the dialog's caption said, and its aspect is the shape picked
 *   picture   the model's box in the file, as fractions of the file, against its box on the
 *             dialog's canvas, as fractions of the canvas (and a downscaled picture difference).
 *             A scene that paints the whole canvas (starfield, grid, room…) has the canvas as its
 *             box, so its file must fill the frame and its picture must line up with the canvas's,
 *             tile by tile (FULL_CANVAS, align())
 *   slider    at 70% the file is the canvas; asked for 25/50/100%, the dialog gives min(asked, the
 *             model's top end — its range's max, which its hint must name), the model is scaled
 *             by that / 0.7 and stays centred, on screen and in the file, and above 70% the file
 *             never shows it inside the 4vmin margin (src/fill-limit.ts). The margin is judged to
 *             one pixel of the canvas, not of the file: the file is the canvas drawn at another
 *             size, so a canvas pixel of anti-aliasing is two or more file pixels, and the file's
 *             box cannot be told apart from the canvas's more finely than that. A full-canvas scene
 *             (FULL_CANVAS) is not judged on the margin: it fills the canvas by design
 *   drift     a loop recording, decoded frame by frame: the model's box per frame and the change
 *             per frame. What FAILS here is what the file can be held to on its own: the model
 *             missing from its first frame or from more than a twentieth of them, a file the app
 *             says joins up whose last frame is not its first, and a live take of a model that
 *             was standing still. How fast the box moves between frames is printed as a `look:`
 *             reading and fails nothing: a recording of the model's own loop is its own timeline
 *             drawn again, so its fast moments look exactly like a stutter from the outside (the
 *             same frames are flagged at 1:1, 16:9 and 9:16), and a person decides.
 *             A model with no loop is filmed live for two seconds, untouched.
 *   formats   PNG and JPEG have the stage's backdrop, PNG clear has none (not judged on a full-canvas scene, which paints the canvas by design), WebM clear is asked for
 *
 *   node scripts/check-exports.mjs                     the sample of converted models, every setting
 *   node scripts/check-exports.mjs cube dice           just these
 *   node scripts/check-exports.mjs --defaults cube     the dialog's default settings only
 *   node scripts/check-exports.mjs --quick             800 px and 480p only, drift at 1:1 only
 *   node scripts/check-exports.mjs --only dims,drift   a subset of the checks
 *   node scripts/check-exports.mjs --json out.json     also write every number measured
 *
 * Two jobs, two runs. With no flag every setting is made, every shape × size × quality, the slider
 * and every format: about 11 minutes a model, a proof of the pipeline, run on the SAMPLE below.
 * --defaults makes exactly the settings the per-model verdict counts (scripts/export-defaults.mjs,
 * which scripts/capture-check.mjs reads too): the image at 1:1 (its canvas, and a 1600 px PNG for
 * dims, picture and detail), an 800 px PNG for the format check, the video at 9:16 (a 1080p live
 * take for dims and picture; the model's own loop at 480p for drift and loop frame 0), and nothing
 * else. Each of those rows is measured by the same code, at the same settings, as the row of the
 * same name in the full run. It is the per-model proof, run over all 135 models through
 * `npm run capture -- exports --defaults <ids>`. --defaults with --quick is refused (they ask for
 * different settings); SIZES is ignored under it.
 *
 * The export service: if something already answers on 127.0.0.1:8787 (`npm run export`) it is
 * used, and the report says so; otherwise one is started in this process.
 *
 * How the model is separated from its backdrop: the stage's dots are switched off (localStorage
 * c3d-dots=0, the dialog's own "Off" button), and the site's switches on the stage (dots, theme,
 * Pause, full screen) are hidden for the instant of each screenshot, so the canvas is the model on
 * one flat colour. That colour is read from a screenshot of the canvas with the scene hidden, not
 * assumed. "Ink" is any pixel more than INK levels away from it; the model's box is the box of the
 * ink. The file is measured the same way against the same colour (see-through files are composited
 * over it first), so the two boxes mean the same thing. A video's backdrop is read off its own
 * border, which the encoder shifts a little, unless that border is the scene's own paint.
 *
 * The animations are held at one moment (CAPTURE_T ms, as compare-capture does) so the screen and
 * the file are of the same pose. A model that moves by script as well is caught (two screenshots
 * apart differ) and flagged, since its screen and file cannot be of the same instant.
 *
 * A BROKEN BROWSER BREAKS ONE MODEL AT MOST (scripts/browser-guard.mjs). A model whose run hits a
 * browser-level error (a protocol error, "Unable to capture screenshot", a goto timeout, a crashed
 * or closed target) is run again from the start, both tabs, once, in a fresh browser: its name is
 * printed again, what the broken try printed is dropped (scripts/capture-check.mjs starts the
 * model's section afresh at its name), and "    note: retried after a browser failure" is printed
 * at the end of its section. Only a second failure gives it `MISMATCH run browser: …  [harness]`.
 * Such an error is never reported as a tab that could not be run. The browser is also replaced
 * every 20 models; a model waits (up to 3 minutes) while free memory is under 1.5 GB, and says
 * "ran under memory pressure" in the same kind of note when it had to go on anyway; and a crash
 * inside Playwright is said on stderr with exit 3, the sections printed before it kept.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer as createVite } from 'vite';
import { launchChromium } from './browser.mjs';
import { BrowserGuard, crashGuard, isBrowserError } from './browser-guard.mjs';
import { exportServer } from '../server/dev.mjs';
import { DEFAULTS } from './export-defaults.mjs';

const SAMPLE = ['candles', 'dice', 'paycard', 'cube', 'browser', 'coverflow', 'switch', 'starfield'];
const IMAGE_SHAPES = ['1:1', '4:3', '3:2', '16:9', '9:16', 'auto'];
const SIZES = (process.env.SIZES || '800,1600,3200').split(',').map(Number);
const VIDEO_SHAPES = ['9:16', '1:1', '16:9'];
const QUALITIES = [480, 720, 1080, 2160];
const ASPECT = { '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9, '9:16': 9 / 16 };
const FILLS = [25, 50, 100];
const T = Number(process.env.CAPTURE_T || 1137);
const INK = 28; // levels (0-255) from the backdrop that count as the model
// levels from the same canvas with the scene hidden that count as the scene's at all: the slider's
// scaling is judged on this footprint (see screen())
const FAINT = 6;
const TOL = 0.015; // a box edge may be this share of the side off before it is a mismatch
const PIC_TOL = 6; // mean luminance difference (0-255) between screen and file, downscaled
const LIVE_MS = 1200; // a live take for the size matrix
const MAKE_MS = 20 * 60_000; // how long to wait for one export to come back (see make())

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const quick = flag('--quick');
const defaultsOnly = flag('--defaults');
if (defaultsOnly && quick) { console.error('--defaults and --quick ask for different settings; give one.'); process.exit(2); }
const jsonOut = opt('--json');
const only = new Set((opt('--only') ?? 'dims,picture,slider,drift,formats').split(','));
const ids = args.filter((a, i) => !a.startsWith('--') && !['--json', '--only'].includes(args[i - 1]));
const models = ids.length ? ids : SAMPLE;
const D = DEFAULTS;
const imageShapes = defaultsOnly ? [D.image.shape] : IMAGE_SHAPES;
const sizes = defaultsOnly ? [D.image.size] : quick ? [800] : SIZES;
const videoShapes = defaultsOnly ? [D.video.shape] : VIDEO_SHAPES;
const qualities = defaultsOnly ? [D.video.quality] : quick ? [480, 2160] : QUALITIES;
const driftShapes = defaultsOnly ? [D.drift.shape] : quick ? ['1:1'] : VIDEO_SHAPES;
const sliderShapes = defaultsOnly ? [] : quick ? ['1:1'] : ['1:1', '9:16', '16:9'];
const formatPictures = defaultsOnly ? D.formats.image : ['png', 'png-clear', 'jpeg'];

/* ---------------- services ---------------- */
async function serviceAnswers() {
  try {
    const r = await fetch('http://127.0.0.1:8787/capture', { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:5173' }, signal: AbortSignal.timeout(2000) });
    return r.status === 204;
  } catch { return false; }
}
let service = null;
const external = await serviceAnswers();
if (!external) service = await exportServer(8787);
if (!(await serviceAnswers())) { console.error('The export service does not answer on 127.0.0.1:8787.'); process.exit(2); }
console.log(`export service: ${external ? 'already running on 127.0.0.1:8787 (used as is)' : 'started in this process'}`);
console.log(`settings: ${defaultsOnly ? `the defaults only (image ${D.image.shape} at ${D.image.size} px ${D.image.picture}, format ${formatPictures.join('/')} at ${D.formats.size} px; video ${D.video.shape} at ${D.video.quality}p, drift ${driftShapes.join('/')} at ${D.drift.quality}p, two seconds of the held model filmed live; the full-length loop drift stays on the sample run)` : quick ? 'quick (800 px, 480p and 2160p, drift at 1:1)' : `every shape, size (${sizes.join(', ')} px) and quality (${qualities.join(', ')}p), the slider and every format`}; checks: ${[...only].filter((k) => !(defaultsOnly && k === 'slider')).join(', ')}`);

// A cache of its own, so two runs side by side (or another agent's dev server) do not fight over
// node_modules/.vite while its dependencies are being optimised.
const cacheDir = mkdtempSync(join(tmpdir(), 'check-exports-vite-'));
const vite = await createVite({ logLevel: 'error', cacheDir, server: { host: '127.0.0.1', port: 0, watch: null, hmr: false } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
// the browser, its one context and the lab page: all made again whenever scripts/browser-guard.mjs
// launches a fresh browser (after one breaks, and every 20 models); started once HELPERS exists, below
let context, lab;
const guard = new BrowserGuard({
  launch: () => launchChromium({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }),
  setup: async (browser) => {
    context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await context.addInitScript(() => { try { localStorage.setItem('c3d-dots', '0'); } catch {} });
    await context.addInitScript({ content: HELPERS });
    lab = await context.newPage();
    await lab.goto("about:blank");
    await lab.evaluate(HELPERS);
  },
});

/* ---------------- pixel work, done in a browser ---------------- */
// Installed in the lab page and the model page alike. Everything returns fractions of the image.
const HELPERS = `
window.__px = {
  async decode(src) {
    const blob = src instanceof Blob ? src : await (await fetch(src)).blob();
    const bmp = await createImageBitmap(blob);
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(bmp, 0, 0); bmp.close();
    return x.getImageData(0, 0, c.width, c.height);
  },
  fromB64(b64, type = 'image/png') {
    const bin = atob(b64); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type });
  },
  // the median colour of an image (sampled), and how far from it the furthest pixel is
  flat(img) {
    const d = img.data, n = d.length / 4, step = Math.max(1, Math.floor(n / 20000));
    const ch = [[], [], []];
    for (let i = 0; i < n; i += step) for (let k = 0; k < 3; k++) ch[k].push(d[i * 4 + k]);
    const med = ch.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
    let worst = 0, off = 0;
    for (let i = 0; i < n; i++) { const e = Math.max(Math.abs(d[i*4]-med[0]), Math.abs(d[i*4+1]-med[1]), Math.abs(d[i*4+2]-med[2])); if (e > worst) worst = e; if (e > ${INK}) off++; }
    return { color: med, worst, off: off / n };
  },
  // median of the one-pixel border: the backdrop of a frame, even with a model in it
  border(img) {
    const { width: w, height: h, data: d } = img, ch = [[], [], []];
    const take = (x, y) => { const i = (y * w + x) * 4; for (let k = 0; k < 3; k++) ch[k].push(d[i + k]); };
    for (let x = 0; x < w; x++) { take(x, 0); take(x, h - 1); }
    for (let y = 0; y < h; y++) { take(0, y); take(w - 1, y); }
    return ch.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
  },
  // the model's box: pixels (composited over bg) more than INK from bg, ignoring stray pixels
  // ref: a second picture of the same size to compare against pixel by pixel instead of bg
  box(img, bg, ink = ${INK}, ref = null) {
    const { width: w, height: h, data: d } = img, e = ref?.data;
    const rows = new Uint32Array(h), cols = new Uint32Array(w);
    let count = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, a = d[i + 3] / 255;
      const r = d[i] * a + bg[0] * (1 - a), g = d[i + 1] * a + bg[1] * (1 - a), b = d[i + 2] * a + bg[2] * (1 - a);
      const off = e ? Math.max(Math.abs(r - e[i]), Math.abs(g - e[i + 1]), Math.abs(b - e[i + 2])) : Math.max(Math.abs(r - bg[0]), Math.abs(g - bg[1]), Math.abs(b - bg[2]));
      if (off > ink) { rows[y]++; cols[x]++; count++; }
    }
    const minR = Math.max(1, Math.round(w / 400)), minC = Math.max(1, Math.round(h / 400));
    let l = 0, r = w - 1, t = 0, b = h - 1;
    while (l < w && cols[l] < minC) l++;
    while (r >= 0 && cols[r] < minC) r--;
    while (t < h && rows[t] < minR) t++;
    while (b >= 0 && rows[b] < minR) b--;
    if (l > r || t > b) return null;
    return { l: l / w, t: t / h, r: (r + 1) / w, b: (b + 1) / h, share: count / (w * h), w, h };
  },
  // alpha: how much of the picture is see-through, and the corners' most opaque pixel
  alpha(img) {
    const { width: w, height: h, data: d } = img;
    let clear = 0, opaque = 0;
    for (let i = 3; i < d.length; i += 4) { if (d[i] === 0) clear++; if (d[i] === 255) opaque++; }
    const cs = Math.max(2, Math.round(Math.min(w, h) * 0.04));
    let corner = 0; const cornerRGB = [];
    for (const [x0, y0] of [[0, 0], [w - cs, 0], [0, h - cs], [w - cs, h - cs]]) {
      let m = 0;
      for (let y = y0; y < y0 + cs; y++) for (let x = x0; x < x0 + cs; x++) m = Math.max(m, d[(y * w + x) * 4 + 3]);
      corner = Math.max(corner, m);
      const i = ((y0 + (cs >> 1)) * w + x0 + (cs >> 1)) * 4; cornerRGB.push([d[i], d[i + 1], d[i + 2], d[i + 3]]);
    }
    return { clear: clear / (w * h), opaque: opaque / (w * h), cornerAlpha: corner, cornerRGB };
  },
  // How a file's picture lines up with the canvas's, for a scene that paints the whole canvas, where
  // a box of ink says nothing (see FULL_CANVAS). Both at the canvas's own size, luminance only; the
  // dialog's rounded corners (whatever the canvas shows with the scene hidden that is not its
  // backdrop) are left out. diff: the mean difference, aligned as they are. tiles: the canvas cut
  // 3 x 3, each tile slid over the file by up to R pixels each way; the slide that fits best is
  // where that part of the picture really is in the file. An offset moves every tile the same way,
  // a crop or zoom moves the outer tiles apart; a tile with nothing in it to line up (flat sky)
  // fits every slide about as well and is not counted.
  async align(screenImg, bareImg, bg, file) {
    const W = screenImg.width, H = screenImg.height;
    const c = new OffscreenCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high';
    x.drawImage(file, 0, 0, W, H);
    const f = x.getImageData(0, 0, W, H).data, s = screenImg.data, b = bareImg.data;
    const A = new Float32Array(W * H), F = new Float32Array(W * H), M = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) {
      const i = p * 4;
      A[p] = s[i] * .299 + s[i + 1] * .587 + s[i + 2] * .114;
      F[p] = f[i] * .299 + f[i + 1] * .587 + f[i + 2] * .114;
      M[p] = Math.max(Math.abs(b[i] - bg[0]), Math.abs(b[i + 1] - bg[1]), Math.abs(b[i + 2] - bg[2])) <= ${INK} ? 1 : 0;
    }
    let sum = 0, n = 0;
    const shift = [0, 0, 0]; // file less canvas, per channel: a colour cast, where the diff is not the framing
    for (let p = 0; p < W * H; p++) if (M[p]) { sum += Math.abs(A[p] - F[p]); n++; for (let k = 0; k < 3; k++) shift[k] += f[p * 4 + k] - s[p * 4 + k]; }
    // The tiles are lined up on detail only: each picture less its own blur. Left in, a smooth
    // gradient (a sunset sky) plus the encoder's slight shift of colour fits best slid along the
    // gradient, which says nothing about where the picture is.
    const detail = (L) => {
      const k = 4, I = new Float64Array((W + 1) * (H + 1));
      for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += L[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
      const out = new Float32Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const x0 = Math.max(0, x - k), x1 = Math.min(W, x + k + 1), y0 = Math.max(0, y - k), y1 = Math.min(H, y + k + 1);
        const mean = (I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0));
        out[y * W + x] = L[y * W + x] - mean;
      }
      return out;
    };
    const dA = detail(A), dF = detail(F);
    const R = Math.max(3, Math.round(Math.min(W, H) * 0.04));
    const tiles = [];
    for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 3; tx++) {
      const x0 = R + Math.floor(tx * (W - 2 * R) / 3), x1 = R + Math.floor((tx + 1) * (W - 2 * R) / 3);
      const y0 = R + Math.floor(ty * (H - 2 * R) / 3), y1 = R + Math.floor((ty + 1) * (H - 2 * R) / 3);
      const fits = [];
      let best = null, at0 = null;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        let t = 0, k = 0;
        for (let y = y0; y < y1; y++) for (let xx = x0; xx < x1; xx++) {
          const p = y * W + xx, q = (y + dy) * W + xx + dx;
          if (M[p] && M[q]) { t += Math.abs(dA[p] - dF[q]); k++; }
        }
        if (!k) continue;
        const d = t / k;
        fits.push(d);
        if (!dx && !dy) at0 = d;
        if (!best || d < best.d - 1e-9 || (Math.abs(d - best.d) <= 1e-9 && Math.hypot(dx, dy) < Math.hypot(best.dx, best.dy))) best = { dx, dy, d };
      }
      if (!best) continue;
      fits.sort((p, q) => p - q);
      const typical = fits[fits.length >> 1];
      // Something to line up: sliding it off its best fit costs something. The file's own noise
      // (H.264 on a dark sky is about half a level) is there at every slide alike, so a sparse
      // starfield's tile is telling at a small margin: a few bright pixels moving onto dark ones.
      // A slide counts as the picture being off only if it fits clearly better than no slide at all,
      // by the same margin: a repeating pattern (a tunnel's rings a few pixels apart) fits about as
      // well one period along as where it is.
      const clear = (worse, better) => worse - better >= 0.15 && worse >= 1.15 * better;
      tiles.push({ dx: best.dx, dy: best.dy, best: best.d, at0, typical, telling: clear(typical, best.d), moved: at0 === null || clear(at0, best.d) });
    }
    return { diff: n ? sum / n : Infinity, rgb: shift.map((v) => (n ? v / n : 0)), tiles, R, W, H };
  },
  // both pictures over bg, downscaled to the same small size: mean luminance difference
  async likeness(a, b, bg) {
    a = await createImageBitmap(a); b = await createImageBitmap(b);
    const W = 96, H = Math.max(1, Math.round(W * a.height / a.width));
    const small = async (img) => {
      const c = new OffscreenCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
      x.fillStyle = 'rgb(' + bg.join(',') + ')'; x.fillRect(0, 0, W, H);
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, W, H);
      return x.getImageData(0, 0, W, H).data;
    };
    const p = await small(a), q = await small(b);
    let s = 0;
    for (let i = 0; i < p.length; i += 4) s += Math.abs((p[i]*.299+p[i+1]*.587+p[i+2]*.114) - (q[i]*.299+q[i+1]*.587+q[i+2]*.114));
    return s / (p.length / 4);
  },
};`;
await guard.start();

/* ---------------- the report ---------------- */
const results = [];
const mismatches = [];
const untestable = [];
const say = (s) => console.log(s);
const pc = (v) => (v * 100).toFixed(1);
const boxText = (b) => (b ? `${pc(b.l)}-${pc(b.r)} x ${pc(b.t)}-${pc(b.b)}` : 'none');
function miss(model, check, what, detail, fault) {
  mismatches.push({ model, check, what, detail, fault });
  say(`    MISMATCH ${check} ${what}: ${detail}  [${fault}]`);
}
/**
 * A reading the check cannot turn into a verdict: it is printed, kept in the report and left for a
 * person, and it is not a mismatch, so it does not fail the model. Used where a recording of the
 * model's OWN loop cannot be told apart from the model's own motion by looking at the file alone.
 */
const observations = [];
function look(model, check, what, detail, why) {
  observations.push({ model, check, what, detail, why });
  say(`      look: ${check} ${what}: ${detail} — ${why}`);
}
/** Largest distance between two boxes' edges, as a share of the side. */
const boxGap = (a, b) => (a && b ? Math.max(Math.abs(a.l - b.l), Math.abs(a.r - b.r), Math.abs(a.t - b.t), Math.abs(a.b - b.b)) : Infinity);

/* ---------------- driving the dialog ---------------- */
let page;

const dlg = (fn, arg) => page.evaluate(fn, arg);
const click = (selector) => dlg((s) => { const el = document.querySelector(s); if (!el) return false; el.click(); return true; }, selector);
const pick = (name, value) => click(`.maker [data-pick="${name}"][data-value="${value}"]`);

async function frameOf() {
  const handle = await page.waitForSelector('.maker [data-live] iframe[data-ready="true"]', { timeout: 20_000, state: 'attached' });
  return handle.contentFrame();
}

/** Waits for the dialog's canvas to stop changing size (the frame eases to a new shape). */
async function settle() {
  let last = '';
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(120);
    const now = await dlg(() => { const f = document.querySelector('.maker [data-live] iframe'); const r = f?.getBoundingClientRect(); return r ? `${r.width}x${r.height}` : ''; });
    if (now && now === last) break;
    last = now;
  }
  await page.waitForTimeout(150);
}

/** Holds every animation in the model's frame at T ms. */
async function freeze() {
  const frame = await frameOf();
  return frame.evaluate((t) => {
    const all = document.getAnimations();
    for (const a of all) { a.pause(); a.currentTime = t; }
    return all.length;
  }, T);
}

/** The canvas on screen: its size, a screenshot with the site's switches hidden, and one with the scene hidden too. */
async function screen() {
  const frame = await frameOf();
  const info = await dlg(() => {
    const f = document.querySelector('.maker [data-live] iframe');
    const r = f.getBoundingClientRect();
    const body = f.contentDocument.body;
    const wrap = f.closest('.stage-wrap');
    const hidden = [];
    // everything on the stage that is the site's, not the model's
    for (const el of wrap ? [...wrap.children].filter((c) => !c.classList.contains('stage')) : []) { hidden.push([el, el.style.visibility]); el.style.visibility = 'hidden'; }
    for (const el of f.closest('.stage').children) if (el !== f) { hidden.push([el, el.style.visibility]); el.style.visibility = 'hidden'; }
    window.__hidden = hidden;
    return { x: r.x, y: r.y, w: r.width, h: r.height, cw: body.clientWidth, ch: body.clientHeight };
  });
  await page.waitForTimeout(60);
  const clip = { x: info.x, y: info.y, width: info.w, height: info.h };
  const withModel = (await page.screenshot({ clip, timeout: 90_000 })).toString('base64');
  await page.waitForTimeout(200);
  const again = (await page.screenshot({ clip, timeout: 90_000 })).toString('base64');
  await frame.evaluate(() => { const s = document.getElementById('c3d-scene'); s.dataset.was = s.style.opacity; s.style.opacity = '0'; });
  await page.waitForTimeout(60);
  const without = (await page.screenshot({ clip, timeout: 90_000 })).toString('base64');
  await frame.evaluate(() => { const s = document.getElementById('c3d-scene'); s.style.opacity = s.dataset.was; });
  await dlg(() => { for (const [el, v] of window.__hidden) el.style.visibility = v; });
  const m = await lab.evaluate(async ([a, b, c, faint]) => {
    const A = await __px.decode(__px.fromB64(a)), B = await __px.decode(__px.fromB64(b)), C = await __px.decode(__px.fromB64(c));
    const flat = __px.flat(C);
    // ink is what the scene adds to the canvas: the same pixel with the scene hidden is the
    // reference, so the frame's rounded corners (which show the dialog behind) cancel out
    const box = __px.box(A, flat.color, undefined, C);
    // The scene's whole footprint, for the slider's scaling: every pixel the scene changes at all.
    // INK alone is not scale-free. Dice's top face is white on a near-white stage and its edge is
    // a hairline 1.5 units wide; at 70% that line clears INK, at 25% it is a third of a pixel and
    // does not, so the INK box starts lower on a smaller die and reads its height at x0.336 where
    // the DOM (and this footprint, of the same pixels) says x0.357. Against the scene-hidden
    // reference the backdrop cancels exactly, so a low threshold picks up no noise. The file is
    // still compared with the INK box, measured the same way on both.
    const full = __px.box(A, flat.color, faint, C);
    let moved = 0; for (let i = 0; i < A.data.length; i += 4) if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) > 30) moved++;
    return { bg: flat.color, bgWorst: flat.worst, bgOff: flat.off, box, full, moving: moved / (A.data.length / 4) };
  }, [withModel, again, without, FAINT]);
  return { ...info, ...m, png: withModel, bare: without };
}

/**
 * A scene that paints the whole canvas (a sky, a floor, a room): its ink box is the canvas on
 * screen, so a box cannot say where anything in it is. Such a file is judged on two things
 * instead: it fills the frame (its box against the canvas's backdrop is the whole frame, so a crop
 * or an offset shows as a strip of backdrop), and its picture lines up with the canvas's (align()).
 */
const FULL_CANVAS = (box) => Boolean(box && box.l < 0.003 && box.t < 0.003 && box.r > 0.997 && box.b > 0.997 && box.share >= 0.5);
const SHIFT_TOL = 1; // pixels of the canvas a tile's best fit may be off (the file is drawn at another size)

/**
 * A full-canvas file's picture against the canvas: a line for the report, and a mismatch for each
 * way it is off. A picture with nothing in it to line up is not passed: it is listed as untested.
 */
function judgeAlign(a, { id, what, fault, indent }) {
  const telling = a.tiles.filter((t) => t.telling);
  const moved = telling.filter((t) => Math.max(Math.abs(t.dx), Math.abs(t.dy)) > SHIFT_TOL && t.moved !== false);
  // An offset moves every tile and a crop or zoom every outer one; one tile alone fitting better
  // elsewhere (a soft glow in a corner that is otherwise dark) is not the picture being off.
  const off = moved.length >= 2 ? moved : [];
  const worst = telling.reduce((w, t) => Math.max(w, Math.abs(t.dx), Math.abs(t.dy)), 0);
  const periodic = telling.filter((t) => Math.max(Math.abs(t.dx), Math.abs(t.dy)) > SHIFT_TOL && t.moved === false).length;
  const text = `picture diff ${a.diff.toFixed(1)} (mean R,G,B ${a.rgb.map((v) => (v >= 0 ? '+' : '') + v.toFixed(1)).join(',')}) at the canvas's ${a.W}×${a.H}, ${telling.length}/9 tiles to line up, worst best-fit shift ${worst}px (±${a.R} searched)${periodic ? `, ${periodic} of them a repeat that fits as well in place` : ''}${moved.length === 1 ? `, 1 lone tile fits best at (${moved[0].dx},${moved[0].dy})px (${moved[0].best.toFixed(2)} vs ${moved[0].at0?.toFixed(2)} in place) with every other in place` : ''}`;
  const misses = [];
  // When every tile is in place the difference is the picture's colour, not where it is: say so.
  const [r, g, b] = a.rgb.map((v) => (v >= 0 ? '+' : '') + v.toFixed(1));
  const cast = `file less canvas: R ${r}, G ${g}, B ${b}`;
  if (a.diff > PIC_TOL) misses.push(`the picture differs from the canvas by ${a.diff.toFixed(1)} levels on average (${cast})${telling.length && !off.length ? ' — every tile is in place, so this is its colour, not its framing' : ''}`);
  if (off.length) misses.push(`${off.length} of ${telling.length} tiles fit best shifted: ${off.map((t) => `(${t.dx},${t.dy})px, fit ${t.best.toFixed(2)} there vs ${t.at0?.toFixed(2)} in place`).join('; ')} — the picture is offset, cropped or zoomed against the canvas`);
  say(`${indent}full canvas: ${text}`);
  if (!only.has('picture')) return;
  for (const m of misses) miss(id, 'picture', what, m, fault);
  if (!telling.length) untestable.push(`${id}: ${what} — a full-canvas scene with nothing in any tile to line up, so where its picture sits in the file is not proven (it fills the frame, and its mean difference is ${a.diff.toFixed(1)})`);
}

/** Presses the dialog's button and waits for the file (or its error). Returns the file as base64. */
async function make({ live = false } = {}) {
  await dlg(() => { window.__drawn = []; const n = document.querySelector('.maker [data-note]'); if (n) n.textContent = ''; });
  const caption = await dlg(() => document.querySelector('.maker [data-caption]')?.textContent ?? '');
  const started = Date.now();
  await click('.maker [data-go]');
  if (live) { await page.waitForTimeout(LIVE_MS); await click('.maker [data-stop]'); }
  const done = await page.waitForFunction(() => {
    const f = document.querySelector('.maker [data-frame]');
    const file = f?.querySelector('img, video');
    const note = document.querySelector('.maker [data-note]')?.textContent ?? '';
    if (file) return { ok: true, note };
    if (/did not work/.test(note)) return { ok: false, note };
    return false;
  // Long enough for the largest export the dialog offers: a 30 s loop is 900 frames, and the page's
  // own watchdog (src/capture-client.ts) gives the service 70 s + 1 s a frame, about 16 minutes, so
  // a shorter wait here would call a render that is still going "timed out" instead of letting the
  // app say what happened. 4 minutes did exactly that to five heavy models once the service's own
  // deadline stopped cutting them short.
  }, null, { timeout: MAKE_MS, polling: 250 }).then((h) => h.jsonValue()).catch(() => ({ ok: false, note: `timed out after ${MAKE_MS / 1000}s` }));
  const took = (Date.now() - started) / 1000;
  if (!done.ok) return { caption, note: done.note, took, error: done.note };
  // the first bitmap made is the service's first frame; the app then makes one of the file itself
  const drawnList = await dlg(() => window.__drawn.slice());
  const drawn = drawnList[0] ? { width: drawnList[0][0], height: drawnList[0][1] } : null;
  const file = await dlg(async () => {
    const el = document.querySelector('.maker [data-frame] img, .maker [data-frame] video');
    const blob = await (await fetch(el.src)).blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let head = ''; for (let i = 0; i < 12; i++) head += bytes[i].toString(16).padStart(2, '0');
    const out = { type: blob.type, size: blob.size, head, src: el.src, tag: el.tagName };
    if (el.tagName === 'VIDEO') {
      const v = document.createElement('video'); v.muted = true; v.src = el.src;
      await new Promise((ok, no) => { v.onloadedmetadata = ok; v.onerror = () => no(new Error('the video would not open')); });
      out.width = v.videoWidth; out.height = v.videoHeight; out.duration = v.duration;
    } else {
      const bmp = await createImageBitmap(blob); out.width = bmp.width; out.height = bmp.height; bmp.close();
      let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      out.b64 = btoa(s);
    }
    return out;
  }).catch((e) => ({ error: e.message }));
  return { caption, note: done.note, took, ...file, drawn };
}

async function back() {
  await click('.maker [data-again]');
  await page.waitForFunction(() => !document.querySelector('.maker [data-frame] img, .maker [data-frame] video'), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(150);
}

const captionSize = (text) => { const m = /(\d+)\s*×\s*(\d+)/.exec(text ?? ''); return m ? { width: +m[1], height: +m[2] } : null; };

/** Measures an image file against a screen measurement. */
async function measureImage(file, scr) {
  return lab.evaluate(async ([b64, type, bg, screenPng, bare, full]) => {
    const img = await __px.decode(__px.fromB64(b64, type));
    const box = __px.box(img, bg);
    const alpha = __px.alpha(img);
    const like = await __px.likeness(__px.fromB64(screenPng), __px.fromB64(b64, type), bg);
    let align = null;
    if (full) {
      // over the backdrop, as the canvas shows it
      const bmp = await createImageBitmap(__px.fromB64(b64, type));
      const c = new OffscreenCanvas(bmp.width, bmp.height), x = c.getContext('2d');
      x.fillStyle = 'rgb(' + bg.join(',') + ')'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0); bmp.close();
      align = await __px.align(await __px.decode(__px.fromB64(screenPng)), await __px.decode(__px.fromB64(bare)), bg, c);
    }
    return { box, alpha, like, align };
  }, [file.b64, file.type, scr.bg, scr.png, scr.bare, FULL_CANVAS(scr.box)]);
}

/**
 * Decodes a video frame by frame: the model's box and the change from the frame before.
 *
 * Measured at the file's own size, never shrunk: the box's edges are found by ink, and a model's
 * edge can be a hairline on a backdrop of nearly its own colour (dice's top face is white on the
 * light stage, outlined by a line about a pixel wide). Shrunk below the canvas's size, that line
 * blurs under INK and the edge is found a few percent inside where it is — on the file and not the
 * screen, which is measured at full size. `first` measures frame 0 only.
 */
async function measureVideo(file, scr, { first: firstOnly = false } = {}) {
  const bg = scr.bg;
  const full = FULL_CANVAS(scr.box);
  const out = await dlg(async ([src, bg, ink, firstOnly, full]) => {
    const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = src;
    await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = () => no(new Error('the video would not open')); });
    const W = v.videoWidth, H = v.videoHeight;
    const c = new OffscreenCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
    const n = firstOnly ? 1 : Math.max(1, Math.round(v.duration * 30));
    const frames = []; let prev = null, first = null, backdrop = bg, f0png = null;
    for (let i = 0; i < n; i++) {
      v.currentTime = Math.min(v.duration - 0.001, (i + 0.5) / 30);
      await new Promise((ok) => { v.onseeked = ok; });
      x.drawImage(v, 0, 0, W, H);
      const img = x.getImageData(0, 0, W, H);
      if (!first) {
        first = img;
        // The frame's border is the backdrop, read off the file itself so the encoder's slight
        // shift of colour does not count as ink — unless the border is the scene's own paint (a
        // sky reaching every edge), which is nowhere near the canvas's backdrop. Then the canvas's
        // backdrop is the one to measure against, as the screen was.
        const edge = __px.border(img);
        backdrop = Math.max(...[0, 1, 2].map((k) => Math.abs(edge[k] - bg[k]))) <= ink ? edge : bg;
        // frame 0, lossless, to be lined up with the canvas in the lab page (see below)
        if (full) {
          const u = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer());
          let s = ''; for (let k = 0; k < u.length; k += 0x8000) s += String.fromCharCode.apply(null, u.subarray(k, k + 0x8000));
          f0png = btoa(s);
        }
      }
      const box = __px.box(img, backdrop, ink);
      let diff = 0;
      if (prev) { for (let k = 0; k < img.data.length; k += 4) diff += Math.abs(img.data[k] - prev.data[k]) + Math.abs(img.data[k+1] - prev.data[k+1]) + Math.abs(img.data[k+2] - prev.data[k+2]); diff /= (img.data.length / 4) * 3; }
      frames.push({ box, diff });
      prev = img;
    }
    let wrap = 0; for (let k = 0; k < first.data.length; k += 4) wrap += Math.abs(first.data[k] - prev.data[k]) + Math.abs(first.data[k+1] - prev.data[k+1]) + Math.abs(first.data[k+2] - prev.data[k+2]);
    return { frames, backdrop, f0png, wrap: wrap / (first.data.length / 4) / 3, n };
  }, [file.src, bg, INK, firstOnly, full]);
  // A full-canvas scene's frame 0 lined up with the canvas. Done in the lab page, which is not the
  // model's: nothing the model page does to its own pictures can touch the reference.
  out.align = full ? await lab.evaluate(async ([f0, png, bare, bg]) => {
    const bmp = await createImageBitmap(__px.fromB64(f0));
    try { return await __px.align(await __px.decode(__px.fromB64(png)), await __px.decode(__px.fromB64(bare)), bg, bmp); } finally { bmp.close(); }
  }, [out.f0png, scr.png, scr.bare, bg]) : null;
  delete out.f0png;
  return out;
}

/** Frame-to-frame steps of the box: centre and size, as shares of the frame. */
function steps(frames) {
  const out = [];
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1].box, b = frames[i].box;
    if (!a || !b) { out.push(null); continue; }
    out.push({
      cx: Math.abs((a.l + a.r) / 2 - (b.l + b.r) / 2), cy: Math.abs((a.t + a.b) / 2 - (b.t + b.b) / 2),
      w: Math.abs((a.r - a.l) - (b.r - b.l)), h: Math.abs((a.b - a.t) - (b.b - b.t)),
    });
  }
  return out;
}
const median = (a) => { const s = a.filter((v) => Number.isFinite(v)).sort((p, q) => p - q); return s.length ? s[s.length >> 1] : 0; };

/* ---------------- one model ---------------- */
async function openDialog(id, kind) {
  page = await context.newPage();
  page.on('pageerror', (e) => say(`    page error: ${e.message}`));
  // The size the service drew each frame at, before the app scales it into the file: every frame
  // the service sends becomes an ImageBitmap (capture-client.ts), so their sizes are noted as
  // they are made. Watching only; nothing is changed. (A streamed response's body cannot be read
  // back through the protocol, so this is the one place the number can be had.)
  await page.addInitScript(() => {
    const made = window.createImageBitmap;
    window.__drawn = [];
    window.createImageBitmap = async function (src, ...rest) {
      const bmp = await made.call(this, src, ...rest);
      if (src instanceof Blob && src.type === 'image/png') window.__drawn.push([bmp.width, bmp.height]);
      return bmp;
    };
  });
  await page.goto(`${base}/models/${id}/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForSelector('.stage iframe[data-ready="true"]', { timeout: 30_000 });
  await page.waitForTimeout(500);
  const shownShape = await dlg(() => { const r = document.querySelector('.stage').getBoundingClientRect(); return r.width / r.height; });
  await page.mouse.move(4, 4);
  await click(`[data-make="${kind}"]`);
  await page.waitForSelector('.maker[open]', { timeout: 10_000 });
  await frameOf();
  await settle();
  const animations = await freeze();
  return { shownShape, animations };
}

async function checkImages(id) {
  const { shownShape, animations } = await openDialog(id, 'image');
  say(`  image tab: ${animations} animations held at ${T}ms; the page's stage is ${shownShape.toFixed(3)}:1 ("As shown")`);
  const row = { id, kind: 'image', shownShape, shapes: {} };
  results.push(row);
  const doDims = only.has('dims') || only.has('picture');

  for (const shape of doDims ? imageShapes : [D.image.shape]) {
    await pick('imageRatio', shape);
    await pick('picture', D.image.picture);
    await settle();
    await freeze();
    const scr = await screen();
    const want = ASPECT[shape] ?? shownShape;
    const canvasAspect = scr.cw / scr.ch;
    const entry = { screen: { canvas: [scr.cw, scr.ch], box: scr.box, bg: scr.bg, bgWorst: scr.bgWorst, moving: scr.moving }, files: {} };
    row.shapes[shape] = entry;
    say(`  ${shape.padEnd(5)} canvas ${scr.cw}×${scr.ch} (${canvasAspect.toFixed(3)}, wanted ${want.toFixed(3)}), model on screen ${boxText(scr.box)}${scr.moving > 0.002 ? `, MOVES BY SCRIPT (${pc(scr.moving)}% of pixels changed in 200ms)` : ''}${scr.bgOff > 0.01 ? `, backdrop not flat (${pc(scr.bgOff)}% of the canvas off its colour with the scene hidden)` : ''}`);
    if (Math.abs(canvasAspect / want - 1) > 0.01) miss(id, 'dims', `image ${shape} canvas`, `the dialog's canvas is ${canvasAspect.toFixed(3)}:1, the shape is ${want.toFixed(3)}:1`, 'app');
    if (!doDims) break;
    for (const size of sizes) {
      await pick('size', size);
      const file = await make();
      if (file.error) { miss(id, 'dims', `image ${shape} ${size}`, `no file: ${file.error}`, 'app'); continue; }
      const said = captionSize(file.caption);
      const m = await measureImage(file, scr);
      const aspect = file.width / file.height;
      entry.files[size] = { caption: file.caption, note: file.note, width: file.width, height: file.height, drawn: file.drawn, took: file.took, box: m.box, like: m.like, head: file.head };
      const gap = boxGap(m.box, scr.box);
      say(`    ${String(size).padEnd(4)} caption "${file.caption}" -> file ${file.width}×${file.height} (${aspect.toFixed(3)}), drawn at ${file.drawn?.width ? `${file.drawn.width}×${file.drawn.height}` : file.drawn?.error ?? "?"}, model ${boxText(m.box)}, edge gap ${pc(gap)}%, picture diff ${m.like.toFixed(1)}, ${file.took.toFixed(1)}s`);
      if (!said || said.width !== file.width || said.height !== file.height) miss(id, 'dims', `image ${shape} ${size}`, `caption says ${file.caption}, file is ${file.width}×${file.height}`, 'app');
      if (Math.max(file.width, file.height) !== size) miss(id, 'dims', `image ${shape} ${size}`, `long side is ${Math.max(file.width, file.height)}, asked for ${size}`, 'app');
      if (Math.abs(aspect / want - 1) > 2 / Math.min(file.width, file.height) + 0.001) miss(id, 'dims', `image ${shape} ${size}`, `file aspect ${aspect.toFixed(4)}, shape ${want.toFixed(4)}`, 'app');
      if (file.drawn?.width && Math.max(file.drawn.width / file.width, file.drawn.height / file.height) < 0.999) miss(id, 'detail', `image ${shape} ${size}`, `drawn at ${file.drawn.width}×${file.drawn.height} and stretched up to ${file.width}×${file.height} (${(file.width / file.drawn.width).toFixed(2)}×): the file has fewer real pixels than it says`, 'app');
      if (only.has('picture')) {
        if (!(gap <= TOL)) miss(id, 'picture', `image ${shape} ${size}`, `model on screen ${boxText(scr.box)}, in the file ${boxText(m.box)} (worst edge ${pc(gap)}% off)`, scr.moving > 0.002 ? 'model (still moving after the freeze — its script, or a transition started since — so screen and file are different moments)' : 'app');
        if (m.like > PIC_TOL) miss(id, 'picture', `image ${shape} ${size}`, `downscaled picture differs from the canvas by ${m.like.toFixed(1)} levels on average`, scr.moving > 0.002 ? 'model (still moving after the freeze: its script, or a transition started since)' : 'app');
        if (m.align) {
          entry.files[size].align = m.align;
          judgeAlign(m.align, { id, what: `image ${shape} ${size}`, fault: scr.moving > 0.002 ? 'model (still moving after the freeze: its script, or a transition started since)' : 'app', indent: '         ' });
        }
      }
      await back();
    }
  }

  if (only.has('slider')) {
    for (const shape of sliderShapes) {
      await pick('imageRatio', shape);
      await pick('size', 800);
      await pick('picture', 'png');
      const at = {};
      for (const fill of [70, ...FILLS]) {
        await dlg((v) => { const s = document.querySelector('.maker [data-zoom]'); s.value = String(v); s.dispatchEvent(new Event('input', { bubbles: true })); }, fill);
        await settle();
        await freeze();
        // The slider stops at the model's top end (src/fill-limit.ts): the most it can fill and
        // still clear every edge by 4vmin, which the range's max and the hint both say. Asked
        // for more, the dialog must give min(asked, top) and draw the file at that.
        const got = await dlg(() => {
          const s = document.querySelector('.maker [data-zoom]');
          const hint = document.querySelector('.maker [data-zoom-hint]')?.textContent ?? '';
          return { value: Number(s.value), max: Number(s.max), hint: Number((hint.match(/max (\d+)%/) ?? [])[1] ?? NaN), zoom: document.querySelector('.maker [data-live] .stage')?.style.getPropertyValue('--zoom') ?? '' };
        });
        const want = Math.min(fill, got.max);
        if (got.value !== want) miss(id, 'slider', `${shape} ${fill}%`, `the dialog gives ${got.value}%, want min(asked ${fill}%, top end ${got.max}%) = ${want}%`, 'app');
        if (got.hint !== got.max) miss(id, 'slider', `${shape} ${fill}%`, `the hint says max ${got.hint}%, the slider stops at ${got.max}%`, 'app');
        if (Math.abs(Number(got.zoom) - got.value / 70) > 0.001) miss(id, 'slider', `${shape} ${fill}%`, `the stage's --zoom is ${got.zoom}, want ${(got.value / 70).toFixed(4)} for ${got.value}%`, 'app');
        const scr = await screen();
        const file = await make();
        if (file.error) { miss(id, 'slider', `${shape} ${fill}%`, `no file: ${file.error}`, 'app'); continue; }
        const m = await measureImage(file, scr);
        at[fill] = { screen: scr.box, full: scr.full, file: m.box, like: m.like, value: got.value, top: got.max, canvas: [scr.cw, scr.ch] };
        await back();
      }
      await dlg(() => { const s = document.querySelector('.maker [data-zoom]'); s.value = '70'; s.dispatchEvent(new Event('input', { bubbles: true })); });
      row.slider ??= {};
      row.slider[shape] = at;
      // scaling and centre are judged on the footprint; the file against the screen on INK
      const ref = at[70]?.full;
      // a full-canvas scene fills the canvas edge to edge by design (VIEW-CONTRACT.md): the 4vmin
      // margin is not for it, and its top end is 70% (bigger would only crop it)
      const fullScene = FULL_CANVAS(at[70]?.screen);
      if (fullScene) say(`  slider ${shape}: a full-canvas scene, so the 4vmin margin is not judged (its top end is ${at[70]?.top}%)`);
      for (const fill of [70, ...FILLS]) {
        const s = at[fill]; if (!s || !ref || !s.full) continue;
        const f = s.full;
        const k = s.value / 70; // what the dialog gave: the asked value, or its top end
        // the file never shows the model past the 4vmin margin, to within one pixel of the canvas
        if (!fullScene && s.file && s.canvas?.[0] && s.canvas?.[1]) {
          const [cw, ch] = s.canvas;
          const mx = (0.04 * Math.min(cw, ch) - 1) / cw, my = (0.04 * Math.min(cw, ch) - 1) / ch;
          const past = Math.max(mx - s.file.l, s.file.r - (1 - mx), my - s.file.t, s.file.b - (1 - my));
          if (s.value > 70 && past > 0) miss(id, 'slider', `${shape} ${fill}%`, `at ${s.value}% the file shows the model ${pc(past)}% into the 4vmin margin (${boxText(s.file)})`, 'app (the top end lets it past the margin)');
        }
        const touches = (b) => b.l < 0.003 || b.t < 0.003 || b.r > 0.997 || b.b > 0.997;
        const wr = (f.r - f.l) / (ref.r - ref.l), hr = (f.b - f.t) / (ref.b - ref.t);
        // Scaling about the canvas centre moves a box whose middle is off the centre towards it
        // (or away) by the same ratio: a model drawn 2% low at 70% is 0.7% low at 25%. So the
        // centre is judged against where scaling about the canvas middle puts it.
        const expect = (c) => 0.5 + (c - 0.5) * k;
        const dcx = (f.l + f.r) / 2 - expect((ref.l + ref.r) / 2), dcy = (f.t + f.b) / 2 - expect((ref.t + ref.b) / 2);
        const gap = boxGap(s.file, s.screen);
        say(`  slider ${shape} ${String(fill).padStart(3)}%${s.value !== fill ? ` -> ${s.value}% (top end ${s.top}%)` : ''}: screen ${boxText(s.screen)} footprint ${boxText(f)} (w ×${wr.toFixed(3)}, h ×${hr.toFixed(3)}, want ×${k.toFixed(3)}; centre off scaling-about-the-middle by ${pc(dcx)}%,${pc(dcy)}%), file ${boxText(s.file)} (edge gap ${pc(gap)}%, diff ${s.like.toFixed(1)})`);
        if (!(gap <= TOL)) miss(id, 'slider', `${shape} ${fill}%`, `file ${boxText(s.file)} vs screen ${boxText(s.screen)} (${pc(gap)}% off)`, 'app');
        if (fill === 70) continue;
        const clipped = touches(f);
        const refFull = ref.l < 0.003 && ref.r > 0.997;
        if (!clipped && !refFull) {
          // within 4%, or 2 px at each edge, whichever is more: the footprint's edge on a soft
          // shadow's faint tail is found to about a pixel either way, which on a thin model (the
          // pointer-lit headline is ~20 px tall at 25% in 9:16) is more than 4% of the side
          const [cw = 0, ch = 0] = s.canvas ?? [];
          const slack = (side) => Math.max(0.04, side > 0 ? 4 / side : 0);
          const hTol = slack(ch * (ref.b - ref.t) * k), wTol = slack(cw * (ref.r - ref.l) * k);
          if (Math.abs(hr / k - 1) > hTol) miss(id, 'slider', `${shape} ${fill}%`, `height scaled ×${hr.toFixed(3)}, want ×${k.toFixed(3)} (±${pc(hTol)}%)`, 'app (the zoom does not scale the model by the ratio) — or model, if it sizes by something other than vmin');
          if (Math.abs(wr / k - 1) > wTol) miss(id, 'slider', `${shape} ${fill}%`, `width scaled ×${wr.toFixed(3)}, want ×${k.toFixed(3)} (±${pc(wTol)}%)`, 'app (or model)');
          if (hTol > 0.04 || wTol > 0.04) {
            // not a pass to 4%: too few pixels on the dialog's canvas to tell, and the report says so
            say(`    (a thin model: its scaling is judged to 2 px at each edge, ±${pc(Math.max(hTol, wTol))}%, not 4%)`);
            untestable.push(`${id}: slider ${shape} ${fill}% — the model is too thin on the ${cw}×${ch} canvas to judge its scaling to 4%; judged to 2 px at each edge (±${pc(Math.max(hTol, wTol))}%) instead`);
          }
        }
        if (Math.abs(dcx) > TOL || Math.abs(dcy) > TOL) miss(id, 'slider', `${shape} ${fill}%`, `centre is ${pc(dcx)}% across, ${pc(dcy)}% down from where scaling about the canvas middle puts it${clipped ? ' (clipped at the edge)' : ''}`, clipped ? 'expected when the model outgrows the canvas' : 'app');
      }
    }
  }

  if (only.has('formats')) {
    await pick('imageRatio', D.image.shape);
    await pick('size', D.formats.size);
    await pick('picture', 'png');
    await settle();
    await freeze();
    const scr = await screen();
    row.formats = {};
    for (const picture of formatPictures) {
      await pick('picture', picture);
      const file = await make();
      if (file.error) { miss(id, 'formats', picture, `no file: ${file.error}`, 'app'); continue; }
      const m = await measureImage(file, scr);
      const sig = file.head.startsWith('89504e47') ? 'png' : file.head.startsWith('ffd8ff') ? 'jpeg' : file.head;
      row.formats[picture] = { type: file.type, sig, alpha: m.alpha, box: m.box };
      const corner = m.alpha.cornerRGB[0];
      const offBg = Math.max(...[0, 1, 2].map((k) => Math.abs(corner[k] - scr.bg[k])));
      say(`  format ${picture.padEnd(9)} ${sig} ${file.type}, see-through ${pc(m.alpha.clear)}%, opaque ${pc(m.alpha.opaque)}%, corner alpha max ${m.alpha.cornerAlpha}, corner rgb ${corner.slice(0, 3).join(',')} (stage ${scr.bg.join(',')}), model ${boxText(m.box)}`);
      if (picture === 'png-clear') {
        if (sig !== 'png') miss(id, 'formats', picture, `file is ${sig}`, 'app');
        // a full-canvas scene paints the whole canvas by design (VIEW-CONTRACT.md), so its clear
        // PNG has nothing see-through to show: that test is not for it, and the report says so
        if (FULL_CANVAS(scr.box)) say(`    png-clear: a full-canvas scene paints the canvas edge to edge by design, so the see-through test is not applied (${pc(m.alpha.clear)}% of pixels clear)`);
        else if (m.alpha.clear < 0.2 || m.alpha.cornerAlpha > 0) miss(id, 'formats', picture, `not see-through: ${pc(m.alpha.clear)}% of pixels clear, corners reach alpha ${m.alpha.cornerAlpha}`, 'model (paints its own backdrop) or app');
      } else {
        if (sig !== (picture === 'jpeg' ? 'jpeg' : 'png')) miss(id, 'formats', picture, `file is ${sig}`, 'app');
        if (m.alpha.opaque < 0.999) miss(id, 'formats', picture, `only ${pc(m.alpha.opaque)}% opaque: the backdrop is missing`, 'app');
        if (offBg > (picture === 'jpeg' ? 8 : 3) && !FULL_CANVAS(scr.box)) miss(id, 'formats', picture, `corner is ${corner.slice(0, 3).join(',')}, the stage is ${scr.bg.join(',')}`, 'app');
      }
      await back();
    }
  }
  await page.close();
}

async function checkVideos(id) {
  const { animations } = await openDialog(id, 'video');
  const env = await dlg(async () => {
    const { motionSeconds, h264Codec } = await import('/src/record.ts');
    // the codec the app itself asks for at each 4K shape, and whether this browser has it
    const own = async (width, height) => { const codec = h264Codec(width, height); return codec ? `${codec} ${(await ask(codec, width, height)) ? 'yes' : 'no'}` : 'no level holds it'; };
    const stage = document.querySelector('.maker .stage');
    const ask = async (codec, width, height, alpha = 'discard') => { try { return (await VideoEncoder.isConfigSupported({ codec, width, height, bitrate: 8e6, framerate: 30, alpha })).supported; } catch { return false; } };
    return {
      loop: motionSeconds(stage),
      loopChip: !document.querySelector('.maker [data-pick="motion"][data-value="loop"]')?.disabled,
      clearChip: !document.querySelector('.maker [data-pick="movie"][data-value="webm-clear"]')?.disabled,
      vp9alpha: await ask('vp09.00.10.08', 480, 854, 'keep'),
      h264: { '2160x3840': await own(2160, 3840), '2160x2160': await own(2160, 2160), '3840x2160': await own(3840, 2160), '1080x1920': await own(1080, 1920) },
      fourK: !document.querySelector('.maker [data-pick="quality"][data-value="2160"]')?.hasAttribute('data-off'),
      // the sizes the dialog shows but does not offer (data-off: "coming later", or too big for
      // the render service): no file can be asked for at those, and the app says which they are
      off: [...document.querySelectorAll('.maker [data-pick="quality"][data-off]')].map((c) => ({ quality: Number(c.dataset.value), why: (c.textContent || '').replace(/\s+/g, ' ').trim() })),
    };
  });
  say(`  video tab: ${animations} animations; own loop ${env.loop}s (${env.loopChip ? 'offered' : 'not offered'}); WebM clear chip ${env.clearChip ? 'enabled' : 'disabled'}; VP9+alpha encodable here: ${env.vp9alpha}; H.264 the app asks for, and encodable here: ${Object.entries(env.h264).map(([k, v]) => `${k} ${v}`).join(', ')}; 4K chip ${env.fourK ? 'offered' : 'not offered'}${env.off.length ? `; sizes the dialog shows disabled, so no file is asked for: ${env.off.map((o) => `${o.quality}p ("${o.why}")`).join(', ')}` : ''}`);
  const row = { id, kind: 'video', env, shapes: {} };
  results.push(row);

  for (const shape of videoShapes) {
    await pick('ratio', shape);
    await settle();
    await freeze();
    const scr = await screen();
    const want = ASPECT[shape];
    const entry = { screen: { canvas: [scr.cw, scr.ch], box: scr.box }, takes: {} };
    row.shapes[shape] = entry;
    say(`  ${shape.padEnd(5)} canvas ${scr.cw}×${scr.ch} (${(scr.cw / scr.ch).toFixed(3)}), model on screen ${boxText(scr.box)}`);

    if (only.has('dims') || only.has('picture')) {
      for (const q of qualities) {
        await pick('motion', 'live');
        // A size the dialog shows but does not offer — one this browser cannot encode, or one the
        // app is holding back ("coming later") — has no file to ask for, and that is not a fault.
        // Which sizes those are is read from the dialog itself, so the app says it once.
        const off = env.off.find((o) => o.quality === q);
        if (off) {
          untestable.push(`${id}: ${q}p video — the dialog shows it disabled ("${off.why}"), so no file is asked for`);
          continue;
        }
        await pick('quality', q);
        const file = await make({ live: true });
        if (file.error) {
          const why = q === 2160 ? ` (the app asks for ${Object.entries(env.h264).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')})` : '';
          miss(id, 'dims', `video ${shape} ${q}p`, `the dialog offers it and it fails: "${file.error}"${why}`, 'app');
          entry.takes[q] = { error: file.error, caption: file.caption };
          continue;
        }
        const said = captionSize(file.caption);
        const vid = await measureVideo(file, scr, { first: true });
        const f0 = vid.frames[0]?.box;
        const gap = boxGap(f0, scr.box);
        entry.takes[q] = { caption: file.caption, width: file.width, height: file.height, duration: file.duration, box0: f0, align: vid.align };
        say(`    ${String(q).padEnd(4)} caption "${file.caption}" -> file ${file.width}×${file.height} ${file.type}, ${file.duration.toFixed(2)}s live, frame 0 model ${boxText(f0)} (edge gap ${pc(gap)}%)`);
        if (!said || said.width !== file.width || said.height !== file.height) miss(id, 'dims', `video ${shape} ${q}p`, `caption says ${file.caption}, file is ${file.width}×${file.height}`, 'app');
        if (Math.min(file.width, file.height) !== q) miss(id, 'dims', `video ${shape} ${q}p`, `short side ${Math.min(file.width, file.height)}`, 'app');
        if (Math.abs(file.width / file.height / want - 1) > 0.01) miss(id, 'dims', `video ${shape} ${q}p`, `aspect ${(file.width / file.height).toFixed(3)}, shape ${want.toFixed(3)}`, 'app');
        if (only.has('picture') && !(gap <= TOL * 1.5)) miss(id, 'picture', `video ${shape} ${q}p`, `frame 0 ${boxText(f0)} vs screen ${boxText(scr.box)} (${pc(gap)}% off)`, scr.moving > 0.002 ? 'model (still moving after the freeze: its script, or a transition started since)' : 'app');
        if (vid.align) {
          judgeAlign(vid.align, { id, what: `video ${shape} ${q}p frame 0`, fault: scr.moving > 0.002 ? 'model (still moving after the freeze: its script, or a transition started since)' : 'app', indent: '         ' });
        }
        await back();
      }
    }

    if (only.has('drift') && driftShapes.includes(shape)) {
      await pick('quality', D.drift.quality);
      // The per-model run (--defaults) films the held model live for two seconds: 60 frames the
      // recorder must draw all alike, which is the drift a file can be held to on its own, and
      // about a minute a model instead of the five a 900-frame loop takes. The full-length loop
      // drift — the model's whole turn, decoded frame by frame — stays on the sample run.
      const live = !env.loopChip || defaultsOnly;
      await pick('motion', live ? 'live' : 'loop');
      await freeze();
      const file = live ? await (async () => {
        // an untouched model, filmed live for two seconds
        await click('.maker [data-go]'); await page.waitForTimeout(2000); await click('.maker [data-stop]');
        await page.waitForFunction(() => document.querySelector('.maker [data-frame] video') || /did not work/.test(document.querySelector('.maker [data-note]')?.textContent ?? ''), null, { timeout: MAKE_MS });
        const note = await dlg(() => document.querySelector('.maker [data-note]')?.textContent ?? '');
        if (/did not work/.test(note)) return { error: note };
        return dlg(async () => { const el = document.querySelector('.maker [data-frame] video'); const v = document.createElement('video'); v.src = el.src; await new Promise((ok) => { v.onloadedmetadata = ok; }); return { src: el.src, width: v.videoWidth, height: v.videoHeight, duration: v.duration, note: document.querySelector('.maker [data-note]').textContent }; });
      })() : await make();
      if (file.error) { miss(id, 'drift', `${shape}`, `no file: ${file.error}`, 'app'); continue; }
      const vid = await measureVideo(file, scr);
      const st = steps(vid.frames);
      const diffs = vid.frames.slice(1).map((f) => f.diff);
      const med = { c: median(st.map((s) => s && Math.max(s.cx, s.cy))), s: median(st.map((s) => s && Math.max(s.w, s.h))), d: median(diffs) };
      const worst = { c: Math.max(0, ...st.map((s) => (s ? Math.max(s.cx, s.cy) : 0))), s: Math.max(0, ...st.map((s) => (s ? Math.max(s.w, s.h) : 0))), d: Math.max(0, ...diffs) };
      const jumpAt = st.map((s, i) => (s && (Math.max(s.cx, s.cy) > Math.max(0.01, 4 * med.c) || Math.max(s.w, s.h) > Math.max(0.01, 4 * med.s)) ? i + 1 : -1)).filter((i) => i >= 0);
      const spikeAt = diffs.map((d, i) => (d > Math.max(1, 3 * med.d) ? i + 1 : -1)).filter((i) => i >= 0);
      const missing = vid.frames.filter((f) => !f.box).length;
      const boxes = vid.frames.map((f) => f.box).filter(Boolean);
      const range = boxes.length ? { l: [Math.min(...boxes.map((b) => b.l)), Math.max(...boxes.map((b) => b.l))], t: [Math.min(...boxes.map((b) => b.t)), Math.max(...boxes.map((b) => b.t))], r: [Math.min(...boxes.map((b) => b.r)), Math.max(...boxes.map((b) => b.r))], b: [Math.min(...boxes.map((b) => b.b)), Math.max(...boxes.map((b) => b.b))] } : null;
      const gap0 = boxGap(vid.frames[0]?.box, scr.box);
      const last = boxes[boxes.length - 1], first = boxes[0];
      entry.drift = { live, width: file.width, height: file.height, duration: file.duration, frames: vid.n, median: med, worst, jumpAt, spikeAt, missing, range, wrap: vid.wrap, gap0, align: vid.align, perFrame: diffs.map((d) => +d.toFixed(2)), boxes: vid.frames.map((f) => f.box && [f.box.l, f.box.t, f.box.r, f.box.b].map((v) => +v.toFixed(4))) };
      say(`    drift ${live ? 'live 2s, untouched' : 'own loop'} ${file.width}×${file.height}, ${vid.n} frames: change per frame median ${med.d.toFixed(2)} worst ${worst.d.toFixed(2)}; box step median ${pc(med.c)}%/${pc(med.s)}% worst ${pc(worst.c)}%/${pc(worst.s)}% (centre/size); end→start ${vid.wrap.toFixed(2)}; frame 0 vs screen ${pc(gap0)}%`);
      if (range) say(`      box range over the clip: left ${pc(range.l[0])}-${pc(range.l[1])} top ${pc(range.t[0])}-${pc(range.t[1])} right ${pc(range.r[0])}-${pc(range.r[1])} bottom ${pc(range.b[0])}-${pc(range.b[1])}`);
      say(`      per frame: ${diffs.map((d) => d.toFixed(1)).join(' ')}`);
      // What a step between two frames cannot say, and what it can. A recording of the model's own
      // loop is the model's own timeline drawn again, so a box that moves fast between frames is
      // how fast the model moves, not proof that the file is wrong: the same frames are flagged at
      // every shape (phone, rubik and flipper flag the same frames at 1:1, 16:9 and 9:16). Those
      // readings are printed for a person to look at, and what stays a mismatch is what the file
      // can be held to on its own: its first frame against the screen, the model missing from a
      // stretch of it, and a file the app says joins up that does not.
      const blank = vid.frames.map((f, i) => (f.box ? -1 : i)).filter((i) => i >= 0);
      if (missing && (!vid.frames[0]?.box || missing > vid.n * 0.05)) miss(id, 'drift', shape, `${missing} of ${vid.n} frames have no model in them${vid.frames[0]?.box ? '' : ', the first one included'}`, 'app');
      else if (missing) look(id, 'drift', shape, `${missing} of ${vid.n} frames have no model in them (${blank.slice(0, 10).join(', ')}${blank.length > 10 ? '…' : ''})`, 'a scene may empty the canvas for a moment by design — the rocket leaves the frame before the next one is on the pad, and its blanks repeat with its 10s turn');
      if (jumpAt.length) look(id, 'drift', shape, `the model's box jumps at frame${jumpAt.length > 1 ? 's' : ''} ${jumpAt.slice(0, 12).join(', ')}${jumpAt.length > 12 ? '…' : ''}`, `a step over ${pc(Math.max(0.01, Math.max(4 * med.c, 4 * med.s)))}% of the canvas, which fast motion of the model's own looks exactly like`);
      if (spikeAt.length) look(id, 'drift', shape, `change spikes at frame${spikeAt.length > 1 ? 's' : ''} ${spikeAt.slice(0, 12).join(', ')}${spikeAt.length > 12 ? '…' : ''} (over 3× the median ${med.d.toFixed(2)})`, 'the same: how much the picture changes from frame to frame is the model moving');
      // A live take is of a model held still, so every frame of it must be the same picture in the
      // same place: what changes between the first frame and any other is the recorder's doing, and
      // a slow creep (a fraction of a pixel a frame) shows here even though no single step does.
      // Unless the model does not stand still when its animations are held: flaptext starts a
      // flap-land from its script after the freeze, and the clock ticks on a timer. The canvas
      // itself settles that — the same screen, shot before the take and again after it. If the
      // model changed there too, the change in the file is the model's, not the recorder's.
      const crept = Math.max(0, ...boxes.map((b) => boxGap(boxes[0], b)));
      if (live && (worst.d > 0.5 || crept > 0.005)) {
        const after = await screen();
        const moved = await lab.evaluate(([a, b, bg]) => __px.likeness(__px.fromB64(a), __px.fromB64(b), bg), [scr.png, after.png, scr.bg]);
        const what = `an untouched model changes by up to ${worst.d.toFixed(2)} a frame, and its box wanders ${pc(crept)}% of the canvas from the first frame`;
        if (scr.moving > 0.002 || moved > 0.5) look(id, 'drift', shape, what, `the model does not stand still while its animations are held (its own script or a timer): the canvas itself differs by ${moved.toFixed(2)} levels between the shot before the take and the one after it`);
        else miss(id, 'drift', shape, `${what}, while the canvas before and after the take differs by only ${moved.toFixed(2)} levels`, 'app');
      }
      // The app says whether the file joins up: a model whose turn is longer than the dialog
      // records (rings takes 277s, the file is 30s) is cut, and its last frame is not its first.
      const joins = !/does not join up/.test(String(file.note ?? ''));
      if (!live && first && last && boxGap(first, last) > 0.03) {
        if (joins) miss(id, 'drift', shape, `last frame's box ${boxText(last)} does not return to the first ${boxText(first)}`, 'app or model');
        else look(id, 'drift', shape, `last frame's box ${boxText(last)} does not return to the first ${boxText(first)}`, `the app says so itself: "${String(file.note ?? '').replace(/ This is the file\.$/, '')}"`);
      }
      if (only.has('picture') && !(gap0 <= TOL * 1.5)) miss(id, 'picture', `video ${shape} ${live ? 'live' : 'loop'} frame 0`, `${boxText(vid.frames[0]?.box)} vs screen ${boxText(scr.box)}`, 'app');
      if (vid.align) {
        judgeAlign(vid.align, { id, what: `video ${shape} ${live ? 'live' : 'loop'} frame 0`, fault: 'app', indent: '      ' });
      }
      await back();
    }
  }

  if (only.has('formats') && !defaultsOnly) {
    // WebM clear: offered only when this browser can encode a see-through film
    row.webmClear = { chip: env.clearChip, encodable: env.vp9alpha };
    if (env.clearChip !== env.vp9alpha) miss(id, 'formats', 'webm-clear', `chip ${env.clearChip ? 'enabled' : 'disabled'} but VP9 with alpha is ${env.vp9alpha ? '' : 'not '}encodable`, 'app');
    if (!env.vp9alpha) untestable.push(`${id}: WebM clear — this Chromium cannot encode VP9 with alpha, so the dialog (correctly) disables the chip and no see-through video can be made or checked here`);
  }
  await page.close();
}

/* ---------------- run ---------------- */
const started = Date.now();
crashGuard('check-exports', async () => console.error(`check-exports: the sections printed before the crash are kept; ${mismatches.length} mismatch(es) in them`));
for (const id of models) {
  let notes = [];
  // a try that the browser broke leaves nothing behind: each try starts by dropping what an earlier
  // one added, and the name printed again starts the model's section afresh for capture-check
  const mark = { results: results.length, mismatches: mismatches.length, untestable: untestable.length, observations: observations.length };
  try {
    ({ notes } = await guard.run(id, async () => {
      results.length = mark.results; mismatches.length = mark.mismatches; untestable.length = mark.untestable; observations.length = mark.observations;
      say(`\n${id}`);
      try { await checkImages(id); } catch (e) { await page?.close().catch(() => {}); if (isBrowserError(e)) throw e; miss(id, 'run', 'image tab', e.message.split('\n')[0], 'harness'); }
      try { await checkVideos(id); } catch (e) { await page?.close().catch(() => {}); if (isBrowserError(e)) throw e; miss(id, 'run', 'video tab', e.message.split('\n')[0], 'harness'); }
    }));
  } catch (e) {
    // the retry broke its browser too
    notes = e.notes ?? [];
    miss(id, 'run', 'browser', e.message.split('\n')[0], 'harness');
  }
  for (const n of notes) say(`    note: ${n}`);
}

say(`\n${mismatches.length} mismatch${mismatches.length === 1 ? '' : 'es'} in ${((Date.now() - started) / 60000).toFixed(1)} min:`);
for (const m of mismatches) say(`  ${m.model.padEnd(10)} ${m.check.padEnd(8)} ${m.what}: ${m.detail}  [${m.fault}]`);
if (observations.length) {
  say(`\n${observations.length} reading${observations.length === 1 ? '' : 's'} left for a person to look at (not failures: the file alone cannot tell them from the model's own motion):`);
  for (const o of observations) say(`  ${o.model.padEnd(10)} ${o.check.padEnd(8)} ${o.what}: ${o.detail} — ${o.why}`);
}
if (untestable.length) { say('\nnot testable here:'); for (const u of [...new Set(untestable)]) say(`  ${u}`); }
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ T, INK, TOL, mode: defaultsOnly ? 'defaults' : quick ? 'quick' : 'full', models, results, mismatches, observations, untestable }, null, 2));

await guard.close();
await vite.close();
service?.close();
rmSync(cacheDir, { recursive: true, force: true });
process.exit(mismatches.length ? 1 : 0);
