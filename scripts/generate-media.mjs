// Films every demo from the BUILT site (dist/) and writes, per demo, into dist/media/:
//   <id>.png   1200×630 social preview image (og:image), with the title strip
//   <id>.mp4   short looping clip          } need ffmpeg; skipped with a clear message without it,
//   <id>.gif   same, smaller, for chat     } or a hard failure when MEDIA_REQUIRE_FFMPEG=1 (CI)
//
// Why at build time: a web page cannot record itself reliably (screen capture needs a permission
// prompt and gives WebM; DOM-to-canvas libraries do not support CSS 3D). A headless browser can.
//
// Run after `npm run build`:  npm run media
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const DIST = resolve('dist');
const OUT = join(DIST, 'media');
const TMP = resolve('.media-tmp');
const CLIP = { width: 800, height: 500, seconds: 4 };
const CONCURRENCY = 4;
const only = process.argv.slice(2); // optional list of ids, for testing

if (!existsSync(join(DIST, 'embed'))) throw new Error('dist/embed not found — run "npm run build" first');
const demos = JSON.parse(readFileSync('src/generated/demo-ids.json', 'utf8')).filter((d) => !only.length || only.includes(d.id));

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
if (!hasFfmpeg && process.env.MEDIA_REQUIRE_FFMPEG) throw new Error('ffmpeg is required (MEDIA_REQUIRE_FFMPEG is set) but was not found');
if (!hasFfmpeg) console.warn('! ffmpeg not found: writing PNG previews only; MP4/GIF are produced in CI');

/* ---------- tiny static server for dist/ ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  let path = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path)) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const failures = [];

/** Slow ellipse over the stage so hover / pointer demos have something to react to. */
async function wander(page, ms) {
  const { width, height } = page.viewportSize();
  const start = Date.now();
  while (Date.now() - start < ms) {
    const t = ((Date.now() - start) / ms) * Math.PI * 2;
    await page.mouse.move(width / 2 + Math.cos(t) * width * 0.22, height / 2 + Math.sin(t) * height * 0.2);
    await page.waitForTimeout(40);
  }
}

async function film(demo) {
  // 1) still image with the title strip
  const still = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  const p1 = await still.newPage();
  await p1.goto(`${base}/embed/${demo.id}/?og=1`);
  await p1.waitForSelector('html[data-ready]');
  if (demo.pointer) await p1.mouse.move(600 + 140, 315 - 60);
  await p1.waitForTimeout(1400); // let entrance transitions settle and loops get going
  await p1.screenshot({ path: join(OUT, `${demo.id}.png`) });
  await still.close();
  if (!hasFfmpeg) return;

  // 2) clip: Playwright records the whole context lifetime to WebM; ffmpeg trims the load-in
  const dir = join(TMP, demo.id);
  const ctx = await browser.newContext({ viewport: CLIP, deviceScaleFactor: 1, colorScheme: 'dark', recordVideo: { dir, size: CLIP } });
  const p2 = await ctx.newPage();
  await p2.goto(`${base}/embed/${demo.id}/`);
  await p2.waitForSelector('html[data-ready]');
  const lead = 1200;
  if (demo.pointer) await wander(p2, lead + CLIP.seconds * 1000);
  else await p2.waitForTimeout(lead + CLIP.seconds * 1000);
  await ctx.close(); // flushes the video file
  const webm = join(dir, readdirSync(dir).find((f) => f.endsWith('.webm')));

  const run = (args) => {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`ffmpeg failed for ${demo.id}: ${r.stderr}`);
  };
  const trim = ['-ss', String(lead / 1000 + 0.3), '-t', String(CLIP.seconds), '-i', webm];
  run([...trim, '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-movflags', '+faststart', join(OUT, `${demo.id}.mp4`)]);
  run([...trim, '-vf', 'fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', join(OUT, `${demo.id}.gif`)]);
}

const queue = [...demos];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let demo = queue.shift(); demo; demo = queue.shift()) {
      try {
        await film(demo);
        process.stdout.write('.');
      } catch (err) {
        failures.push(`${demo.id}: ${err.message}`);
        process.stdout.write('x');
      }
    }
  }),
);

await browser.close();
server.close();
rmSync(TMP, { recursive: true, force: true });

const made = readdirSync(OUT);
const size = (ext) => (made.filter((f) => f.endsWith(ext)).reduce((n, f) => n + statSync(join(OUT, f)).size, 0) / 1e6).toFixed(1);
console.log(`\nmedia: ${made.filter((f) => f.endsWith('.png')).length} png (${size('.png')} MB), ${made.filter((f) => f.endsWith('.mp4')).length} mp4 (${size('.mp4')} MB), ${made.filter((f) => f.endsWith('.gif')).length} gif (${size('.gif')} MB)`);

if (failures.length) {
  console.error(`FAILED (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exit(1); // never deploy pages whose og:image points at a file that does not exist
}
