// Evens out the size and the position of the demos: measures how far each demo reaches from the
// middle of a card's stage over its whole animation AND after it is played with (a menu opened, a
// lid lifted, a card flipped), then records
//  - an offset that puts the middle of what you see at rest in the middle of the stage (a demo
//    drawn low, like a field of cubes seen from above, is moved up), and
//  - the zoom that makes the full reach fit the same safe area in every card (clear of the corner
//    badges).
// Measure a build made with an EMPTY src/demos/sizes.json (echo {} > src/demos/sizes.json &&
// npm run build), or the current offsets are measured on top of themselves.
//   npm run build && node scripts/measure-demos.mjs [id ...]  ->  src/demos/sizes.json
// Scenes that fill the stage are laid out to it and are not measured.
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';

const W = 340;
const H = 260;
// How far the demo may reach from the middle of the stage, at 1x (px). At rest (its own
// animation) it fills the safe area, clear of the corner badges: that is what makes the sizes
// look even. Played with (a lid opened, a menu out) it may use the margins, up to the edge.
const SAFE = { x: 136, top: 88, bottom: 100 };
const EDGE = { x: 162, top: 122, bottom: 124 };
const MIN = 0.7;
const MAX = 1.5;
const OUT = 'src/demos/sizes.json';

const only = process.argv.slice(2);
const vite = await createVite({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { demos } = await vite.ssrLoadModule('/src/demos/index.ts');
const { interactionOf } = await vite.ssrLoadModule('/src/demos/interaction.ts');
await vite.close();

const DIST = resolve('dist');
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
const browser = await chromium.launch();

/**
 * How far what is actually drawn reaches from the scene's middle, in unzoomed px: a screenshot on a
 * transparent page, and the box around every pixel that is clearly there (alpha > ALPHA, about 10%, so a
 * faint glow or a soft shadow does not count). Pixels, not element boxes: a box misses what a
 * ::before / ::after draws outside it (a crystal's tip, a lid's knob), and counts what clip-path
 * cuts away.
 */
const ALPHA = 24;
async function reachOf(page) {
  const png = (await page.screenshot({ omitBackground: true })).toString('base64');
  return page.evaluate(
    async ([png, alpha]) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + png;
      await img.decode();
      const c = new OffscreenCanvas(img.width, img.height);
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, img.width, img.height).data;
      let l = Infinity;
      let r = -1;
      let t = Infinity;
      let b = -1;
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          if (d[(y * img.width + x) * 4 + 3] <= alpha) continue;
          if (x < l) l = x;
          if (x > r) r = x;
          if (y < t) t = y;
          if (y > b) b = y;
        }
      }
      const scene = document.querySelector('.scene');
      const s = scene.getBoundingClientRect();
      const cx = s.left + s.width / 2;
      const cy = s.top + s.height / 2;
      const zoom = parseFloat(getComputedStyle(scene).zoom) || 1;
      if (r < 0) return { l: 0, r: 0, t: 0, b: 0 };
      return { l: (cx - l) / zoom, r: (r + 1 - cx) / zoom, t: (cy - t) / zoom, b: (b + 1 - cy) / zoom };
    },
    [png, ALPHA],
  );
}

/** Runs in the page: puts every animation at time t (ms) and pauses it. */
function at(t) {
  for (const a of document.getAnimations()) {
    a.pause();
    const d = a.effect?.getComputedTiming().duration;
    if (typeof d === 'number' && d > 0) a.currentTime = t % (d * 2);
  }
}

// The page is three cards wide and tall with the demo at a card's scale (--fit 1), so what reaches
// past a card's edge is still on screen to be measured; only the demo is drawn (no backdrop).
const PW = W * 3;
const PH = H * 3;
const BARE =
  '.embed__credit{display:none!important} html{overflow:hidden} html,body,.embed,.stage{background:transparent!important}' +
  '.stage::before,.stage::after{display:none!important} .stage{--fit:1!important;overflow:visible!important}';

async function measure(demo) {
  const page = await browser.newPage({ viewport: { width: PW, height: PH } });
  await page.goto(`${base}/embed/${demo.id}/`);
  await page.addStyleTag({ content: BARE });
  await page.waitForTimeout(500);
  const rest = { l: 0, r: 0, t: 0, b: 0 };
  const played = { l: 0, r: 0, t: 0, b: 0 };
  let max = rest;
  const take = async () => {
    const m = await reachOf(page);
    for (const k in max) max[k] = Math.max(max[k], m[k]);
  };
  // the whole idle animation: 16 moments over 16 s
  for (let i = 0; i < 16; i++) {
    await page.evaluate(at, i * 1000 + 137);
    await take();
  }
  await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
  // played with
  Object.assign(played, rest);
  max = played;
  const how = interactionOf(demo);
  const cx = PW / 2;
  const cy = PH / 2;
  if (how === 'hover' || how === 'move') {
    for (const [x, y] of [[cx, cy], [cx - 60, cy - 40], [cx + 60, cy + 40]]) {
      await page.mouse.move(x, y, { steps: 3 });
      await page.waitForTimeout(900);
      await take();
    }
  } else if (how === 'click') {
    let targets = await page.$$('.scene button:not([disabled]), .scene label');
    if (!targets.length) targets = await page.$$('.scene input[type=radio]:not(:checked), .scene input[type=checkbox]');
    for (const t of targets.slice(-3)) {
      await t.click({ force: true }).catch(() => {});
      await page.waitForTimeout(900);
      await take();
    }
  }
  await page.close();
  if (process.env.DEBUG) console.log(demo.id, JSON.stringify({ rest, played }));
  // Where to put it: aim for the resting picture centred, but where a demo grows one way when
  // played with (a lid opening upward), pick the offset between "rest centred" and "everything
  // centred" that lets it be drawn biggest. Small differences are left alone (the design).
  const fits = (m, a) => Math.min(a.x / Math.max(m.l, m.r, 1), a.top / Math.max(m.t, 1), a.bottom / Math.max(m.b, 1));
  const shifted = (m, x, y) => ({ l: m.l - x, r: m.r + x, t: m.t - y, b: m.b + y });
  const scaleAt = (x, y) => Math.min(fits(shifted(rest, x, y), SAFE), fits(shifted(played, x, y), EDGE));
  const range = (a, b) => {
    const lo = Math.round(Math.min(a, b));
    const hi = Math.round(Math.max(a, b));
    return Array.from({ length: Math.floor((hi - lo) / 2) + 1 }, (_, i) => lo + i * 2);
  };
  let best = { x: 0, y: 0, s: scaleAt(0, 0) };
  for (const x of range((rest.l - rest.r) / 2, (played.l - played.r) / 2)) {
    for (const y of range((rest.t - rest.b) / 2, (played.t - played.b) / 2)) {
      const s = scaleAt(x, y);
      // bigger wins; at the same size, the one closer to the resting picture's centre
      const d = Math.hypot(x - (rest.l - rest.r) / 2, y - (rest.t - rest.b) / 2);
      if (s > best.s + 0.01 || (Math.abs(s - best.s) <= 0.01 && d < best.d)) best = { x, y, s, d };
    }
  }
  const x = Math.abs(best.x) < 4 ? 0 : best.x;
  const y = Math.abs(best.y) < 4 ? 0 : best.y;
  const scale = scaleAt(x, y);
  return { scale: Math.max(MIN, Math.min(MAX, Math.floor(scale * 20) / 20)), x, y, reach: shifted(played, x, y) };
}

const list = demos.filter((d) => !d.fill && (!only.length || only.includes(d.id)));
const sizes = existsSync(OUT) && only.length ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const report = [];
const queue = [...list];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let d = queue.shift(); d; d = queue.shift()) {
      const { scale, x, y, reach: m } = await measure(d);
      if (scale === 1 && !x && !y) delete sizes[d.id];
      else sizes[d.id] = x || y ? { size: scale, x, y } : { size: scale };
      report.push(`${d.id.padEnd(12)} ${scale.toFixed(2)}  move ${x},${y}  reach L${m.l.toFixed(0)} R${m.r.toFixed(0)} T${m.t.toFixed(0)} B${m.b.toFixed(0)}`);
      process.stdout.write('.');
    }
  }),
);
await browser.close();
server.close();
writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.entries(sizes).sort()), null, 2) + '\n');
console.log(`\n${report.sort().join('\n')}\n${list.length} measured -> ${OUT}`);
