// Review tool: renders each snippet's standalone page (what "Copy as one HTML file" gives) with no
// build, reports script errors or empty pages, and photographs them all into .media-tmp/snippets.jpg.
//   node scripts/snippet-check.mjs <id> [<id> ...]      (no build; .media-tmp/ must exist)
//
// "Empty" is judged from the picture, not from the element tree. Counting elements bigger than a
// few pixels called two good models empty: `flipper` draws its faces as pseudo-elements, which are
// in no element list, and `starfield` is hundreds of 2 px stars. What both of them do is paint, so
// that is what is measured: the share of pixels that differ from the page's own backdrop, read
// from the corners. A blank page paints nothing and still fails.
import { createServer } from 'vite';
import { launchChromium } from './browser.mjs';
import { decode } from './pixels.mjs';

/** Painted share of the picture: pixels more than JUST_NOISE from the backdrop the corners show. */
const JUST_NOISE = 8; // per channel, so a gradient backdrop does not read as paint
const BLANK_UNDER = 0.002; // 0.2% of the canvas; `starfield`, the thinnest model here, paints 1.1%
function painted(png) {
  const { width, height, rgba } = decode(png);
  const at = (x, y) => { const o = (y * width + x) * 4; return [rgba[o], rgba[o + 1], rgba[o + 2]]; };
  const corners = [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)];
  let lit = 0;
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const isBack = corners.some((c) => Math.abs(rgba[o] - c[0]) <= JUST_NOISE
      && Math.abs(rgba[o + 1] - c[1]) <= JUST_NOISE && Math.abs(rgba[o + 2] - c[2]) <= JUST_NOISE);
    if (!isBack) lit++;
  }
  return lit / (width * height);
}

// `--blank` adds a page that paints nothing but the backdrop, so the emptiness rule can be watched
// failing on purpose: `node scripts/snippet-check.mjs --blank cube` must print PROBLEM blank.
const BLANK = '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#0b0d18}</style><body></body>';
const args = process.argv.slice(2);
const ids = args.filter((a) => a !== '--blank');
if (args.includes('--blank')) ids.unshift('blank');
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { snippets, standaloneDoc } = await vite.ssrLoadModule('/src/models/snippets.ts');
await vite.close();
const b = await launchChromium();
const shots = [];
for (const id of ids) {
  const page = await b.newPage({ viewport: { width: 380, height: 280 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent(id === 'blank' ? BLANK : standaloneDoc(id, snippets[id]));
  await page.waitForTimeout(1200);
  const ink = painted(await page.screenshot({ type: 'png' }));
  shots.push({ id, img: (await page.screenshot({ type: 'jpeg', quality: 75 })).toString('base64'), errors, ink });
  await page.close();
}
const sheet = await b.newPage({ viewport: { width: 1560, height: 400 } });
await sheet.setContent(`<style>body{margin:0;padding:6px;background:#222;color:#fff;font:700 13px system-ui;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}img{width:100%;display:block}em{color:#f66}</style>` + shots.map((s) => `<figure style="margin:0"><figcaption>${s.id} ${s.errors.length ? `<em>${s.errors[0].slice(0, 80)}</em>` : ''}</figcaption><img src="data:image/jpeg;base64,${s.img}"></figure>`).join(''));
await sheet.screenshot({ path: '.media-tmp/snippets.jpg', type: 'jpeg', quality: 80, fullPage: true });
await b.close();
for (const s of shots) {
  if (s.errors.length || s.ink < BLANK_UNDER) {
    console.log('PROBLEM', s.id, `${(s.ink * 100).toFixed(2)}% painted`, s.errors.join(' | '));
  }
}
console.log('checked', shots.length);
