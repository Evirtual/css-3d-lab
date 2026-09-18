// Films demos as 4K videos, from the BUILT site (dist/):
//   reels/<id>-9x16.mp4   2160 × 3840  vertical: Reels / Shorts / TikTok
//   reels/<id>-16x9.mp4   3840 × 2160  landscape: YouTube, X, LinkedIn
// 60 fps, H.264 High profile at a very high quality setting (CRF 10), so the platforms' own
// re-encode starts from a clean master.
//
// It does not screen-record. Time is stepped by hand — CSS animations through the Web Animations
// API, timers and requestAnimationFrame through Playwright's fake clock — and every frame is a
// screenshot, so the video is perfectly smooth however slow the machine is.
//
//   npm run build
//   npm run reels -- cube dice            some demos
//   npm run reels -- --all                every demo (takes a while)
//   options: --ratio 9:16 | 16:9 | both   (default 9:16)
//            --fps 30   --seconds 8       (default: 60 fps; length fitted to the demo's loop)
//            --scale 2                    (1080p instead of 4K: 4x fewer pixels, much faster)
//            --mbps 60                    (constant bitrate instead of constant quality)
//            --crf 18                     (quality: lower is better and bigger; default 10)
//            --jobs 3                     (films this many demos at once; default 1)
//            --resume                     (skip videos already in reels/)
// Default is constant QUALITY (CRF 10, visually lossless): the bitrate then follows the picture —
// a dark, mostly flat scene needs only ~10-20 Mbit/s for that. --mbps pins the rate instead, for
// platforms or editors that expect a given upload bitrate.
//
// Needs ffmpeg: either on PATH, or `npm i --no-save ffmpeg-static`.
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const DIST = resolve('dist');
const OUT = resolve('reels');

/* ---------- arguments ---------- */
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args.splice(i, 2)[1]);
};
const fps = opt('fps', 60);
const scale = opt('scale', 4); // the 540 × 960 layout is zoomed 4x: 2160 × 3840
const ratioAt = args.indexOf('--ratio');
const ratioArg = ratioAt === -1 ? '9:16' : args.splice(ratioAt, 2)[1];
const FORMATS = { '9:16': { name: '9x16', reel: 'tall', W: 540, H: 960 }, '16:9': { name: '16x9', reel: 'wide', W: 960, H: 540 } };
const formats = ratioArg === 'both' ? Object.values(FORMATS) : [FORMATS[ratioArg]];
if (!formats[0]) throw new Error('--ratio must be 9:16, 16:9 or both');
const fixedSeconds = opt('seconds', 0);
const mbps = opt('mbps', 0);
// prettier-ignore
const RATE = mbps
  ? ['-b:v', `${mbps}M`, '-minrate', `${mbps}M`, '-maxrate', `${mbps}M`, '-bufsize', `${mbps * 2}M`, '-x264-params', 'nal-hrd=cbr:force-cfr=1']
  : ['-crf', String(opt('crf', 10))];
const jobs = Math.max(1, opt('jobs', 1));
const all = args.includes('--all');
const ids = args.filter((a) => !a.startsWith('--'));

if (!existsSync(join(DIST, 'embed'))) throw new Error('dist/embed not found — run "npm run build" first');
const known = JSON.parse(readFileSync('src/generated/demo-ids.json', 'utf8'));
const unknown = ids.filter((id) => !known.some((d) => d.id === id));
if (unknown.length) throw new Error(`No such demo: ${unknown.join(', ')}`);
const demos = all ? known : known.filter((d) => ids.includes(d.id));
if (!demos.length) {
  console.log('Usage: npm run reels -- <id> [<id> ...]   or   npm run reels -- --all');
  process.exit(1);
}

/* ---------- ffmpeg ---------- */
function findFfmpeg() {
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  try {
    return createRequire(import.meta.url)('ffmpeg-static');
  } catch {
    throw new Error('ffmpeg not found. Install it, or run:  npm i --no-save ffmpeg-static');
  }
}
const FFMPEG = findFfmpeg();

/* ---------- tiny static server for dist/ ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  let path = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path)) return void res.writeHead(404).end('not found');
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const failures = [];

/** Runs in the page: every CSS animation / transition is paused and put at the film's time. */
function stepAnimations([t, dt]) {
  for (const a of document.getAnimations()) {
    // First seen now: it started during the last frame. (Without the dt, a transition that is
    // retargeted on every frame — a card following the pointer — would never get anywhere.)
    if (a.__t0 === undefined) a.__t0 = t - dt - (Number(a.currentTime) || 0);
    a.pause();
    a.currentTime = t - a.__t0;
  }
}

/** Runs in the page: the length of the longest endless CSS loop, in ms (0 if there is none). */
function loopLength() {
  let longest = 0;
  for (const a of document.getAnimations()) {
    const timing = a.effect?.getComputedTiming();
    if (timing?.iterations === Infinity && typeof timing.duration === 'number' && timing.duration <= 16000) {
      const once = timing.duration * (timing.direction?.startsWith('alternate') ? 2 : 1);
      longest = Math.max(longest, once);
    }
  }
  return longest;
}

async function film(demo, { name, reel, W, H }) {
  // Real 4K layout (page zoomed 4x at 1 device pixel per CSS pixel), not 4x device pixels: Chrome
  // draws 3D layers at one pixel per CSS pixel, so device scaling left them blurry.
  const ctx = await browser.newContext({ viewport: { width: W * scale, height: H * scale }, deviceScaleFactor: 1, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const file = join(OUT, `${demo.id}-${name}.mp4`);
  try {
    await page.clock.install({ time: new Date('2026-01-01T10:09:30') });
    await page.goto(`${base}/embed/${demo.id}/?reel=${reel}&zoom=${scale}`);
    await page.waitForSelector('html[data-ready]');
    await page.waitForTimeout(300); // fonts and first layout, in real time
    await page.clock.pauseAt(new Date('2026-01-01T10:09:32'));

    // whole loops, so the video itself loops seamlessly
    const loop = await page.evaluate(loopLength);
    const seconds = fixedSeconds || (loop ? Math.min(14, (loop * Math.ceil(6000 / loop)) / 1000) : 8);
    const frames = Math.round(seconds * fps);

    const ffmpeg = spawn(
      FFMPEG,
      // prettier-ignore
      ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
       '-c:v', 'libx264', '-preset', 'slow', ...RATE, '-profile:v', 'high', '-pix_fmt', 'yuv420p',
       '-r', String(fps), '-movflags', '+faststart', '-f', 'mp4', `${file}.part`],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    const encoded = new Promise((ok, fail) => ffmpeg.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited with ${code}`)))));

    let clock = 0;
    for (let f = 0; f < frames; f++) {
      const t = (f * 1000) / fps;
      const phase = (f / frames) * Math.PI * 2;
      // pointer / hover demos: the pointer wanders over the demo on a closed path (it loops too)
      // pure-CSS hover demos need the pointer to LEAVE as well: in and out, twice per video
      const away = demo.hover && Math.sin(2 * phase) < 0;
      if (away) await page.mouse.move(4, 4);
      else if (demo.pointer) {
        const x = W / 2 + 0.28 * Math.min(W, H) * Math.sin(phase);
        const y = H / 2 + 0.2 * Math.min(W, H) * Math.sin(2 * phase + 0.6);
        await page.mouse.move(x * scale, y * scale); // the viewport is in 4K pixels
      }
      // demos with a button (roll, next...): press it every two seconds
      // (a click demo with no button, like confetti: click the scene itself)
      if (demo.pointer && f % (fps * 2) === fps) {
        const pressed = await page.evaluate(() => {
          const btn = document.querySelector('.scene button');
          btn?.click();
          return Boolean(btn);
        });
        if (!pressed && demo.how === 'click') await page.mouse.click((W / 2) * scale, (H / 2) * scale);
      }
      const due = Math.round(t) - clock;
      if (due > 0) await page.clock.runFor(due);
      clock += Math.max(due, 0);
      await page.evaluate(stepAnimations, [t, 1000 / fps]);
      const shot = await page.screenshot({ type: 'jpeg', quality: 100 });
      if (!ffmpeg.stdin.write(shot)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
      if (f % fps === 0) process.stdout.write('.');
    }
    ffmpeg.stdin.end();
    await encoded;
    renameSync(`${file}.part`, file); // only a finished video gets the real name (see --resume)
    const mb = statSync(file).size / 1e6;
    console.log(` ${demo.id}-${name}.mp4  ${W * scale}×${H * scale}  ${seconds.toFixed(1)}s  ${mb.toFixed(1)} MB  ${((mb * 8) / seconds).toFixed(0)} Mbit/s`);
  } finally {
    await ctx.close();
    rmSync(`${file}.part`, { force: true });
  }
}

const queue = demos
  .flatMap((demo) => formats.map((format) => [demo, format]))
  .filter(([demo, format]) => !(args.includes('--resume') && existsSync(join(OUT, `${demo.id}-${format.name}.mp4`))));
await Promise.all(
  Array.from({ length: jobs }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const [demo, format] = job;
      try {
        await film(demo, format);
      } catch (err) {
        failures.push(`${demo.id} ${format.name}: ${err.message}`);
        console.log(` ${demo.id}-${format.name} FAILED`);
      }
    }
  }),
);

await browser.close();
server.close();

const total = demos.length * formats.length;
console.log(`\nreels: ${total - failures.length} of ${total} filmed into ${OUT}`);
if (failures.length) {
  console.error(`FAILED (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
