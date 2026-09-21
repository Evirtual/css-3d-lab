// QA for every demo, on the BUILT site (run `npm run build` first):
//  - page errors / console errors while it runs and while it is played with;
//  - does it fit a card's stage (340 × 260) or does something get clipped;
//  - does the interaction its badge promises (hover, move, drag, click, scroll) change anything.
//   node scripts/qa.mjs [id ...]
//
// Every model runs in a frame of its own (src/preview.ts), so the looking is done inside that
// frame; the clicking and hovering is done on the page, where a visitor's pointer is.
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';

const DIST = resolve('dist');
const placements = JSON.parse(readFileSync('src/models/placements.json', 'utf8'));
const only = process.argv.slice(2);
const vite = await createVite({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { interactionOf } = await vite.ssrLoadModule('/src/models/interaction.ts');
await vite.close();

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

const W = Number(process.env.QA_W || 340); // QA_W / QA_H: test a bigger stage (the demo is then zoomed)
const H = Number(process.env.QA_H || 260);
const problems = [];

async function check(demo) {
  const how = interactionOf(demo);
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${base}/embed/${demo.id}/`);
  await page.addStyleTag({ content: '.embed__credit{display:none!important}' });
  await page.waitForSelector('iframe[data-ready="true"]', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(700);
  // the model itself lives in the frame; everything measured below is measured in there
  const inner = page.frames().find((fr) => fr !== page.mainFrame());
  if (!inner) {
    problems.push(`${demo.id}: the model never appeared`);
    await page.close();
    return;
  }

  // 1. fit: anything visible drawn outside the frame? (models drawn to the edges are meant to)
  const spill = await inner.evaluate(() => {
    const w = innerWidth, h = innerHeight;
    let out = 0;
    for (const el of document.querySelectorAll('#c3d-scene *')) {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      // only what is drawn: an invisible hit area or wrapper may reach further (same rule as measure-models)
      const alpha = (c) => c !== 'transparent' && !c.endsWith(', 0)') && !c.endsWith('/ 0)');
      const paints =
        alpha(cs.backgroundColor) ||
        cs.backgroundImage !== 'none' ||
        (parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) > 0 && alpha(cs.borderTopColor)) ||
        cs.boxShadow !== 'none' ||
        /^(svg|img|canvas|video|input)$/i.test(el.tagName) ||
        ['::before', '::after'].some((pe) => getComputedStyle(el, pe).content !== 'none') ||
        [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!paints) continue;
      // clipped by a parent inside the demo (a glare inside a card): not visible outside it
      let clipped = false;
      for (let p = el.parentElement; p && !p.classList.contains('scene'); p = p.parentElement) {
        if (getComputedStyle(p).overflow !== 'visible') clipped = true;
      }
      if (clipped) continue;
      out = Math.max(out, -r.left, -r.top, r.right - w, r.bottom - h);
    }
    return Math.round(out);
  });
  // a model measured as drawn to its edges (a floor, a tunnel) is meant to reach past them
  if (spill > 6 && !placements[demo.id]?.bleed) problems.push(`${demo.id}: something sticks out of the card stage by ${spill}px`);

  // 2. interaction: freeze time-based motion, play, and see whether the picture changes
  if (how !== 'none') {
    const freeze = () => inner.evaluate(() => document.getAnimations().forEach((a) => a.effect?.getComputedTiming().iterations === Infinity && a.pause()));
    await freeze();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
    const before = await page.screenshot();
    let changedDuring = false;
    const snap = async () => {
      await page.waitForTimeout(450);
      if (!(await page.screenshot()).equals(before)) changedDuring = true;
    };
    const cx = W / 2;
    const cy = H / 2;
    if (how === 'hover') {
      // the badge says hover: try the middle and a few points around it
      for (const [x, y] of [[cx, cy], [cx - 40, cy - 25], [cx + 40, cy + 25], [cx, cy - 30]]) {
        await page.mouse.move(x, y, { steps: 3 });
        await snap();
      }
    } else if (how === 'move') {
      await page.mouse.move(cx + 60, cy - 40, { steps: 6 });
    } else if (how === 'drag') {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 90, cy + 10, { steps: 8 });
      await page.mouse.up();
    } else if (how === 'click' && (await inner.$('#c3d-scene input[type=range]'))) {
      // a slider: move it with the keyboard, the way a label click cannot
      await (await inner.$('#c3d-scene input[type=range]')).focus();
      for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
      await snap();
    } else if (how === 'click') {
      // the LAST control: the first is often the one already selected
      // visible controls first; bare radios / checkboxes only when there is nothing else
      let targets = await inner.$$('#c3d-scene button:not([disabled]), #c3d-scene label');
      if (!targets.length) targets = await inner.$$('#c3d-scene input[type=radio]:not(:checked), #c3d-scene input[type=checkbox]');
      if (targets.length) await targets[targets.length - 1].click({ force: true });
      else await page.mouse.click(cx, cy);
      await snap();
    } else if (how === 'scroll') {
      await page.mouse.move(cx, cy);
      await page.mouse.wheel(0, 400);
    }
    await page.waitForTimeout(1300);
    await freeze();
    const after = await page.screenshot();
    if (before.equals(after) && !changedDuring) problems.push(`${demo.id}: ${how} changed nothing on screen`);
  }
  if (errors.length) problems.push(`${demo.id}: errors: ${[...new Set(errors)].join(' | ').slice(0, 200)}`);
  await page.close();
}

const list = only.length ? demos.filter((d) => only.includes(d.id)) : demos;
const queue = [...list];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let d = queue.shift(); d; d = queue.shift()) {
      try {
        await check(d);
      } catch (err) {
        problems.push(`${d.id}: QA itself failed: ${(err.stack ?? err.message).split('\n').slice(0, 3).join(' | ')}`);
      }
      process.stdout.write('.');
    }
  }),
);
await browser.close();
server.close();
console.log(`\nQA: ${list.length} demos, ${problems.length} problem(s)`);
for (const p of problems.sort()) console.log('  ' + p);
