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

/** Runs in the page: how far visible parts reach from the scene's middle, in unzoomed px. */
function reach() {
  const scene = document.querySelector('.scene');
  const s = scene.getBoundingClientRect();
  const cx = s.left + s.width / 2;
  const cy = s.top + s.height / 2;
  const zoom = parseFloat(getComputedStyle(scene).zoom) || 1;
  const out = { l: 0, r: 0, t: 0, b: 0 };
  for (const el of scene.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    // only what is drawn: an invisible hit area or wrapper is not part of the model
    const alpha = (c) => c !== 'transparent' && !c.endsWith(', 0)') && !c.endsWith('/ 0)');
    const paints =
      alpha(cs.backgroundColor) ||
      cs.backgroundImage !== 'none' ||
      (parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) > 0 && alpha(cs.borderTopColor)) ||
      cs.boxShadow !== 'none' ||
      /^(svg|img|canvas|video)$/i.test(el.tagName) ||
      // drawn by its ::before / ::after (their box is about the element's)
      ['::before', '::after'].some((pe) => getComputedStyle(el, pe).content !== 'none') ||
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!paints) continue;
    // inside a part that clips it (a glare inside a card): only what shows through counts
    let { left, right, top, bottom } = r;
    for (let p = el.parentElement; p && p !== scene; p = p.parentElement) {
      if (getComputedStyle(p).overflow === 'visible') continue;
      const c = p.getBoundingClientRect();
      left = Math.max(left, c.left);
      right = Math.min(right, c.right);
      top = Math.max(top, c.top);
      bottom = Math.min(bottom, c.bottom);
    }
    if (right - left < 1 || bottom - top < 1) continue;
    out.l = Math.max(out.l, cx - left);
    out.r = Math.max(out.r, right - cx);
    out.t = Math.max(out.t, cy - top);
    out.b = Math.max(out.b, bottom - cy);
  }
  for (const k in out) out[k] /= zoom;
  return out;
}

/** Runs in the page: puts every animation at time t (ms) and pauses it. */
function at(t) {
  for (const a of document.getAnimations()) {
    a.pause();
    const d = a.effect?.getComputedTiming().duration;
    if (typeof d === 'number' && d > 0) a.currentTime = t % (d * 2);
  }
}

async function measure(demo) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(`${base}/embed/${demo.id}/`);
  await page.addStyleTag({ content: '.embed__credit{display:none!important} html{overflow:hidden}' });
  await page.waitForTimeout(500);
  const rest = { l: 0, r: 0, t: 0, b: 0 };
  const played = { l: 0, r: 0, t: 0, b: 0 };
  let max = rest;
  const take = async () => {
    const m = await page.evaluate(reach);
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
  const cx = W / 2;
  const cy = H / 2;
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
