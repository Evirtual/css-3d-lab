// Takes the social preview image for every demo from the BUILT site (dist/):
//   dist/media/<id>.jpg   2400×1260 (1200×630 laid out at 2x, so 3D stays sharp): the og:image of
//                          /models/<id>/, text on the left and the demo on the right
//   dist/media/home.jpg   the same template with the site's cube (/embed/cover/): home and group pages
//
// This is what makes a shared link show a picture in chat apps and on social sites. It is done at
// build time because a web page cannot screenshot itself (and DOM-to-canvas libraries do not
// support CSS 3D), whereas a headless browser renders the demo exactly as visitors see it.
//
// Run after `npm run build`:  npm run media [id ...]
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const DIST = resolve('dist');
const OUT = join(DIST, 'media');
const CONCURRENCY = 4;
const only = process.argv.slice(2); // optional list of ids, for testing

if (!existsSync(join(DIST, 'embed'))) throw new Error('dist/embed not found — run "npm run build" first');
const demos = JSON.parse(readFileSync('src/generated/model-ids.json', 'utf8')).filter((d) => !only.length || only.includes(d.id));

/* ---------- tiny static server for dist/ ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
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

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const failures = [];

async function shoot(demo) {
  const ctx = await browser.newContext({ viewport: { width: 2400, height: 1260 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  try {
    const page = await ctx.newPage();
    await page.goto(`${base}/embed/${demo.id}/?og=1&zoom=2`);
    await page.waitForSelector('html[data-ready]');
    // hover / pointer demos look alive with the pointer parked off-centre over them
    if (demo.pointer) await page.mouse.move(1740, 560); // over the demo (the right side), a little off centre
    await page.waitForTimeout(1400); // let entrance transitions settle and loops get going
    await page.screenshot({ path: join(OUT, `${demo.id}.jpg`), type: 'jpeg', quality: 88 });
  } finally {
    await ctx.close();
  }
}

async function shootHome() {
  const ctx = await browser.newContext({ viewport: { width: 2400, height: 1260 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  try {
    const page = await ctx.newPage();
    await page.goto(`${base}/embed/cover/?og=1&zoom=2`);
    await page.waitForSelector('html[data-ready]');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(OUT, 'home.jpg'), type: 'jpeg', quality: 88 });
  } finally {
    await ctx.close();
  }
}
if (!only.length) {
  try {
    await shootHome();
  } catch (err) {
    failures.push(`home: ${err.message}`);
  }
}

const queue = [...demos];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let demo = queue.shift(); demo; demo = queue.shift()) {
      try {
        await shoot(demo);
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

const made = readdirSync(OUT).filter((f) => f.endsWith('.jpg'));
const mb = (made.reduce((n, f) => n + statSync(join(OUT, f)).size, 0) / 1e6).toFixed(1);
console.log(`\nmedia: ${made.length} preview images, ${mb} MB in total`);

if (failures.length) {
  console.error(`FAILED (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exit(1); // never deploy pages whose og:image points at a file that does not exist
}
