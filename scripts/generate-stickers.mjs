// Transparent animated WebP of every demo ("stickers"), for dropping a model onto any background:
// a slide, a page, a Notion doc, a chat. The MP4 reels (generate-reels.mjs) are for Reels, Shorts
// and TikTok, where a video is expected and transparency is not supported; a WebP behaves like an
// image instead, and every browser and most apps show it.
//
//   stickers/<id>.webp   cropped to the model itself, transparent everywhere else
//
// Filmed from the BUILT site (dist/), like the reels: the page is stripped to the model (no
// backdrop, no dots, no corner mark), every frame is stepped by hand so the loop is exact, and the
// frames are measured first so the sticker is cropped to what is actually drawn.
//
// Run after `npm run build`:  npm run stickers -- <id ...>   (or --all)
//   --fps 16 --q 50 --max 600 --jobs 2 --resume --lossless

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const DIST = resolve('dist');
const OUT = resolve('stickers');

/* ---------- arguments ---------- */
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args.splice(i, 2)[1]);
};
const fps = opt('fps', 16);
const quality = opt('q', 50);
const maxWidth = opt('max', 600); // the sticker's longest side, in pixels
const maxSeconds = opt('seconds', 8);
const jobs = Math.max(1, opt('jobs', 2));
const lossless = args.includes('--lossless'); // every pixel exact: much larger files
const resume = args.includes('--resume');
const all = args.includes('--all');
const ids = args.filter((a) => !a.startsWith('--'));

if (!existsSync(join(DIST, 'embed'))) throw new Error('dist/embed not found — run "npm run build" first');
const known = JSON.parse(readFileSync('src/generated/model-ids.json', 'utf8'));
const unknown = ids.filter((id) => !known.some((d) => d.id === id));
if (unknown.length) throw new Error(`No such demo: ${unknown.join(', ')}`);
const demos = all ? known : known.filter((d) => ids.includes(d.id));
if (!demos.length) {
  console.log('Usage: npm run stickers -- <id> [<id> ...]   or   npm run stickers -- --all');
  process.exit(1);
}

/* ---------- ffmpeg ---------- */
const FFMPEG = spawnSync('ffmpeg', ['-version']).status === 0 ? 'ffmpeg' : createRequire(import.meta.url)('ffmpeg-static');

/* ---------- tiny static server for dist/ ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  let path = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path)) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(readFileSync(path));
});
await new Promise((ok) => server.listen(0, ok));
const base = `http://127.0.0.1:${server.address().port}`;

/* ---------- in the page ---------- */

/** Every CSS animation and transition paused and put at the film's time (same as the reels). */
function stepAnimations([t, dt]) {
  for (const a of document.getAnimations()) {
    if (a.__t0 === undefined) a.__t0 = t - dt - (Number(a.currentTime) || 0);
    a.pause();
    a.currentTime = t - a.__t0;
  }
}

/** The length of the longest endless CSS loop, in ms (0 if there is none). */
function loopLength() {
  let longest = 0;
  for (const a of document.getAnimations()) {
    const timing = a.effect?.getComputedTiming();
    if (timing?.iterations === Infinity && typeof timing.duration === 'number' && timing.duration <= 16000) {
      longest = Math.max(longest, timing.duration * (timing.direction?.startsWith('alternate') ? 2 : 1));
    }
  }
  return longest;
}

/** What the model actually draws right now, in page pixels (its 3D shape, not its layout box). */
function drawnBox() {
  const root = document.querySelector('.stage') ?? document.body;
  let l = Infinity;
  let t = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (const el of root.querySelectorAll('*')) {
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const cs = getComputedStyle(el);
    const paints =
      cs.backgroundImage !== 'none' ||
      cs.boxShadow !== 'none' ||
      !/rgba\(.*, 0\)|transparent/.test(cs.backgroundColor) ||
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) + parseFloat(cs.borderBottomWidth) > 0 ||
      [].some.call(el.childNodes, (n) => n.nodeType === 3 && n.textContent.trim());
    if (!paints) continue;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    l = Math.min(l, box.left);
    t = Math.min(t, box.top);
    r = Math.max(r, box.right);
    b = Math.max(b, box.bottom);
  }
  return l < Infinity ? { l, t, r, b } : null;
}

/* ---------- filming ---------- */
const W = 720;
const H = 1280;
const ZOOM = W / 540; // the reel layout is drawn for 540 × 960
// no backdrop, no dots, no corner mark: the model alone, on nothing
const BARE = `html, body, .embed, .stage, .embed .stage { background: transparent !important; }
.stage::before, .stage::after, .embed::before, .embed::after, .embed__credit, .embed__mark { display: none !important; }`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const failures = [];

async function film(demo) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const file = join(OUT, `${demo.id}${lossless ? '-lossless' : ''}.webp`);
  try {
    await page.clock.install({ time: new Date('2026-01-01T10:09:30') });
    await page.goto(`${base}/embed/${demo.id}/?reel=tall&zoom=${ZOOM}&clean=1`);
    await page.waitForSelector('html[data-ready]');
    await page.addStyleTag({ content: BARE });
    await page.waitForTimeout(300);
    await page.clock.pauseAt(new Date('2026-01-01T10:09:32'));

    // a hover or pointer demo shows its effect: the pointer rests on the model for the whole loop
    const interactive = demo.hover || demo.pointer || demo.how === 'click' || demo.how === 'drag';
    if (interactive) await page.mouse.move(W / 2, H / 2);

    // Whole loops, so the sticker loops seamlessly. A model that never moves on its own (its
    // effect is the hover pose) becomes a single frame: a still transparent image.
    const loop = await page.evaluate(loopLength);
    const seconds = loop ? Math.min(maxSeconds, loop / 1000) : 0;
    const frames = seconds ? Math.round(seconds * fps) : 1;

    // Measure first: step through the loop and keep the largest box the model ever fills, so a
    // turning model is never clipped at its widest moment.
    let box = null;
    for (let f = 0; f < frames; f += Math.max(1, Math.round(frames / 12))) {
      await page.evaluate(stepAnimations, [(f * 1000) / fps, 1000 / fps]);
      const now = await page.evaluate(drawnBox);
      if (!now) continue;
      box = box ? { l: Math.min(box.l, now.l), t: Math.min(box.t, now.t), r: Math.max(box.r, now.r), b: Math.max(box.b, now.b) } : now;
    }
    if (!box) throw new Error('nothing drawn');

    const pad = 12;
    const clip = {
      x: Math.max(0, Math.floor(box.l - pad)),
      y: Math.max(0, Math.floor(box.t - pad)),
      width: Math.min(W, Math.ceil(box.r + pad)) - Math.max(0, Math.floor(box.l - pad)),
      height: Math.min(H, Math.ceil(box.b + pad)) - Math.max(0, Math.floor(box.t - pad)),
    };
    // scaled down to the sticker size, and kept even (some encoders dislike odd sizes)
    const shrink = Math.min(1, maxWidth / Math.max(clip.width, clip.height));
    const out = { w: Math.round((clip.width * shrink) / 2) * 2, h: Math.round((clip.height * shrink) / 2) * 2 };

    const ffmpeg = spawn(
      FFMPEG,
      // prettier-ignore
      ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
       '-vf', `scale=${out.w}:${out.h}:flags=lanczos`, '-c:v', 'libwebp_anim', ...(lossless ? ['-lossless', '1'] : ['-lossless', '0', '-q:v', String(quality)]),
       '-compression_level', '6', '-loop', '0', '-pix_fmt', 'yuva420p', '-f', 'webp', `${file}.part`],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    const encoded = new Promise((ok, fail) => ffmpeg.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited with ${code}`)))));

    let clock = 0;
    for (let f = 0; f < frames; f++) {
      const t = (f * 1000) / fps;
      const due = Math.round(t) - clock;
      if (due > 0) await page.clock.runFor(due);
      clock += Math.max(due, 0);
      await page.evaluate(stepAnimations, [t, 1000 / fps]);
      const shot = await page.screenshot({ type: 'png', omitBackground: true, clip });
      if (!ffmpeg.stdin.write(shot)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
      if (f % fps === 0) process.stdout.write('.');
    }
    ffmpeg.stdin.end();
    await encoded;
    renameSync(`${file}.part`, file);
    const mb = statSync(file).size / 1e6;
    console.log(` ${demo.id}${lossless ? '-lossless' : ''}.webp  ${out.w}×${out.h}  ${seconds ? `${seconds.toFixed(1)}s` : 'still'}  ${mb.toFixed(2)} MB`);
  } finally {
    await ctx.close();
    rmSync(`${file}.part`, { force: true });
  }
}

const queue = demos.filter((d) => !(resume && existsSync(join(OUT, `${d.id}${lossless ? '-lossless' : ''}.webp`))));
await Promise.all(
  Array.from({ length: jobs }, async () => {
    for (let demo = queue.shift(); demo; demo = queue.shift()) {
      try {
        await film(demo);
      } catch (err) {
        failures.push(`${demo.id}: ${err.message}`);
        console.log(` ${demo.id} FAILED`);
      }
    }
  }),
);

await browser.close();
server.close();

console.log(`\nstickers: ${demos.length - failures.length} of ${demos.length} into ${OUT}`);
if (failures.length) {
  console.error(`FAILED (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exitCode = 1;
}
