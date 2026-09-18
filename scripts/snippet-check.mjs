// Review tool: renders each snippet's standalone page (what "Copy as one HTML file" gives) with no
// build, reports script errors or empty pages, and photographs them all into .media-tmp/snippets.jpg.
//   node scripts/snippet-check.mjs <id> [<id> ...]
import { createServer } from 'vite';
import { chromium } from 'playwright';
const ids = process.argv.slice(2);
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { snippets, standaloneDoc } = await vite.ssrLoadModule('/src/demos/snippets.ts');
await vite.close();
const b = await chromium.launch();
const shots = [];
for (const id of ids) {
  const page = await b.newPage({ viewport: { width: 380, height: 280 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent(standaloneDoc(id, snippets[id]));
  await page.waitForTimeout(1200);
  const visible = await page.evaluate(() => [...document.body.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; }).length);
  shots.push({ id, img: (await page.screenshot({ type: 'jpeg', quality: 75 })).toString('base64'), errors, visible });
  await page.close();
}
const sheet = await b.newPage({ viewport: { width: 1560, height: 400 } });
await sheet.setContent(`<style>body{margin:0;padding:6px;background:#222;color:#fff;font:700 13px system-ui;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}img{width:100%;display:block}em{color:#f66}</style>` + shots.map((s) => `<figure style="margin:0"><figcaption>${s.id} ${s.errors.length ? `<em>${s.errors[0].slice(0, 80)}</em>` : ''}</figcaption><img src="data:image/jpeg;base64,${s.img}"></figure>`).join(''));
await sheet.screenshot({ path: '.media-tmp/snippets.jpg', type: 'jpeg', quality: 80, fullPage: true });
await b.close();
for (const s of shots) if (s.errors.length || s.visible < 2) console.log('PROBLEM', s.id, s.visible, s.errors.join(' | '));
console.log('checked', shots.length);
