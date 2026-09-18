// Review tool: photographs demos from the BUILT site into contact sheets, two moments per demo,
// so a batch of new demos can be checked by eye in one look.
//   npm run build && node scripts/contact-sheet.mjs [id ...]      -> .media-tmp/sheet-<n>.jpg
// Options: --light (light theme)  --per 10 (demos per sheet)  --reel (the 9:16 video layout)
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const DIST = resolve('dist');
const OUT = resolve('.media-tmp');
const args = process.argv.slice(2);
const light = args.includes('--light');
const reel = args.includes('--reel');
const [VW, VH] = reel ? [270, 480] : [380, 280];
const perAt = args.indexOf('--per');
const per = perAt === -1 ? 10 : Number(args.splice(perAt, 2)[1]);
const ids = args.filter((a) => !a.startsWith('--'));
const known = JSON.parse(readFileSync('src/generated/model-ids.json', 'utf8'));
const demos = ids.length ? ids.map((id) => known.find((d) => d.id === id) ?? { id, pointer: false }) : known;

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
const shots = [];
const queue = [...demos];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let demo = queue.shift(); demo; demo = queue.shift()) {
      const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await page.goto(`${base}/embed/${demo.id}/${reel ? '?reel=tall&zoom=0.5' : ''}`);
      if (light) await page.evaluate(() => (document.documentElement.dataset.theme = 'light'));
      await page.waitForTimeout(900);
      const a = await page.screenshot({ type: 'jpeg', quality: 80 });
      if (demo.pointer) await page.mouse.move(VW / 2 + 40, VH / 2 - 30);
      await page.waitForTimeout(1300);
      const b = await page.screenshot({ type: 'jpeg', quality: 80 });
      shots.push({ id: demo.id, a, b, errors });
      await ctx.close();
      process.stdout.write('.');
    }
  }),
);
shots.sort((x, y) => demos.findIndex((d) => d.id === x.id) - demos.findIndex((d) => d.id === y.id));

const sheet = await (await browser.newContext({ viewport: { width: 1560, height: 600 } })).newPage();
for (let n = 0; n * per < shots.length; n++) {
  const group = shots.slice(n * per, (n + 1) * per);
  const img = (buf) => `<img src="data:image/jpeg;base64,${buf.toString('base64')}">`;
  await sheet.setContent(`<style>body{margin:0;padding:8px;background:#222;color:#fff;font:700 15px system-ui;display:grid;grid-template-columns:repeat(${reel ? 4 : 2},1fr);gap:8px}
    figure{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:2px}figcaption{grid-column:1/-1}img{width:100%;display:block}em{color:#f66;font-weight:400}</style>
    ${group.map((s) => `<figure><figcaption>${s.id} ${s.errors.length ? `<em>${s.errors.join(' | ').slice(0, 160)}</em>` : ''}</figcaption>${img(s.a)}${img(s.b)}</figure>`).join('')}`);
  await sheet.screenshot({ path: join(OUT, `sheet-${n + 1}.jpg`), type: 'jpeg', quality: 82, fullPage: true });
}
await browser.close();
server.close();
const bad = shots.filter((s) => s.errors.length);
console.log(`\n${shots.length} demos on ${Math.ceil(shots.length / per)} sheet(s) in ${OUT}${bad.length ? `; page errors in: ${bad.map((s) => s.id).join(', ')}` : ''}`);
