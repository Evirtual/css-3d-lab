// What the compositor makes of one demo: every face it collects, where it lands, and how it is
// drawn — for finding out why a capture differs from the screen (see compare-capture.mjs).
//   node scripts/diag-capture.mjs <id> [selector]     (selector: only faces whose element matches)
//   node scripts/diag-capture.mjs <id> --raster <selector>   the first match drawn flat, to qa/raster.png
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';

const [id, ...rest] = process.argv.slice(2);
const rasterOf = rest[0] === '--raster' ? rest[1] : null;
const onClone = rest.includes('--clone');
const hide = rest.includes('--hide') ? rest[rest.indexOf('--hide') + 1] : ''; // paint taken off these, to see what is behind // the stand-in copy the dialog draws from, not the live stage
const selector = rasterOf || rest[0] === '--clone' ? null : rest[0];
import { mkdirSync, writeFileSync } from 'node:fs';
if (!id) throw new Error('which demo?');
const vite = await createVite({ appType: 'mpa', logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 420, height: 340 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto(`${base}/embed/${id}/`);
await page.waitForTimeout(700);
if (rasterOf) {
  const extra = rest.includes('--css') ? rest[rest.indexOf('--css') + 1] : '';
  const got = await page.evaluate(async ([sel, extra]) => {
    const { rasterise } = await import('/src/render3d.ts');
    const { styleSheetText } = await import('/src/record.ts');
    const stage = document.querySelector('.stage');
    // the same CSS the dialog's capture gives the renderer
    let css = styleSheetText(document, stage) + '\n' + extra;
    const pseudo = (sel.match(/::(before|after)$/) || [])[0];
    const el = stage.querySelector(pseudo ? sel.slice(0, -pseudo.length) : sel);
    if (!el) return { error: 'no match' };
    let markup = '';
    const r = await rasterise(el, 2, getComputedStyle(el).transformStyle !== 'preserve-3d', pseudo, (holder, rules) => {
      markup = rules + '\n' + holder.outerHTML;
    });
    if (!r) return { error: 'nothing drawn (no size)' };
    const ps = pseudo ? getComputedStyle(el, pseudo) : null;
    const box = ps ? [ps.left, ps.top, ps.width, ps.height, 'origin', ps.transformOrigin, 'tf', ps.transform, '\n  page paints:', ps.backgroundColor, ps.backgroundImage.slice(0, 220), '\n  rules:', [...css.matchAll(/[^\n{}]*d-city[^{}]*::before[^{]*\{[^}]*\}/g)].map((m) => m[0].replace(/\s+/g, ' ').slice(0, 300)).join('\n  ')].join(' ') : '';
    const d = r.bitmap.getContext('2d').getImageData(0, 0, r.bitmap.width, r.bitmap.height).data;
    let covered = 0;
    const seen = new Map();
    for (let i = 3; i < d.length; i += 4) { if (d[i] > 8) covered++; const k = d[i-3] + ',' + d[i-2] + ',' + d[i-1] + '/' + d[i]; seen.set(k, (seen.get(k) || 0) + 1); }
    const colours = [...seen].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => k + ' x' + n).join('  ');
    return { markup, colours, box, width: r.width, height: r.height, pad: r.pad, bitmap: [r.bitmap.width, r.bitmap.height], covered: covered / (d.length / 4), png: r.bitmap.toDataURL('image/png') };
  }, [rasterOf, extra]);
  if (got.error) console.log(got.error);
  else {
    mkdirSync('qa', { recursive: true });
    writeFileSync('qa/raster.png', Buffer.from(got.png.split(',')[1], 'base64'));
    if (got.box) console.log('pseudo box:', got.box);
    console.log('colours:', got.colours);
    if (rest.includes('--markup')) { writeFileSync('qa/markup.html', got.markup); console.log('markup -> qa/markup.html'); }
    console.log(`raster of ${rasterOf}: box ${got.width}x${got.height}, pad ${JSON.stringify(got.pad)}, bitmap ${got.bitmap.join('x')}, ${(got.covered * 100).toFixed(1)}% of pixels drawn -> qa/raster.png`);
  }
  await browser.close();
  await vite.close();
  process.exit(0);
}
const out = await page.evaluate(async ([selector, onClone, hide]) => {
  if (hide) for (const el of document.querySelectorAll(hide)) el.style.cssText += ';background:none !important;box-shadow:none !important;border:0 !important';
  const { scene3D } = await import('/src/render3d.ts');
  let stage = document.querySelector('.stage');
  if (onClone) {
    const box = stage.getBoundingClientRect();
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;top:0;left:0;z-index:-1;width:' + box.width + 'px;height:' + box.height + 'px;transform:translateX(-20000px);pointer-events:none';
    const copy = stage.cloneNode(true);
    copy.style.width = box.width + 'px';
    copy.style.height = box.height + 'px';
    host.append(copy);
    document.body.append(host);
    for (const a of copy.getAnimations({ subtree: true })) a.pause();
    stage = copy;
  }
  const scene = scene3D(stage, 1);
  const drawn = await scene.draw(1);
  const png = drawn.toDataURL('image/png');
  const last = scene.last();
  scene.close();
  const tree = [...stage.querySelectorAll(selector || '*')].slice(0, 80).map((el) => {
    const cs = getComputedStyle(el);
    const ps = ['::before', '::after'].map((p) => { const s = getComputedStyle(el, p); return s.content !== 'none' && s.content !== 'normal' ? `${p}${s.transform !== 'none' ? '(3d)' : ''}` : ''; }).join('');
    return `${el.tagName.toLowerCase()}${el.classList[0] ? '.' + el.classList[0] : ''} ${el.offsetWidth}x${el.offsetHeight} ${cs.transformStyle}${cs.perspective !== 'none' ? ' persp' : ''}${cs.transform !== 'none' ? ' tf' : ''}${cs.overflow !== 'visible' ? ' ov:' + cs.overflow : ''}${cs.backfaceVisibility === 'hidden' ? ' bfh' : ''} op${cs.opacity}${ps}`;
  });
  return { faces: last.faces, list: last.list, tree, png };
}, [selector || '', onClone, hide]);
mkdirSync('qa', { recursive: true });
writeFileSync('qa/scene.png', Buffer.from(out.png.split(',')[1], 'base64'));
console.log(`elements (${selector || 'all'}):`);
for (const line of out.tree) console.log('  ' + line);
console.log(`\nfaces drawn: ${out.faces}`);
for (const line of out.list) console.log('  ' + line);
await browser.close();
await vite.close();
