// Does the export draw what the screen shows? For every demo (or the ids given), the real stage is
// screenshotted by the browser and the same stage is captured through captureImage — the exact
// code the Video / Image / Print dialog runs — and the two pictures are compared pixel by pixel.
// Demos that differ beyond the threshold are listed, and a sheet of [screen | capture | diff]
// strips for them is written to qa/capture-diff.png so the difference can be looked at.
//
//   npm run compare [-- id ...]                      (same as below)
//   node scripts/compare-capture.mjs [id ...]        (needs no build: runs on the source)
//   CAPTURE_MEAN=8 CAPTURE_PART=0.04 …               (looser thresholds)
//   CAPTURE_T=2500 … / CAPTURE_T=none …               (the moment the animations are held at / not held)
//
// Both pictures come from a browser, but not the same one: the screenshot is this page, the
// capture is the export service drawing the scene that was sent to it. They will never be
// identical to the pixel (anti-aliasing, text hinting), so what is measured is the mean luminance
// difference over a downscaled picture and the share of pixels that differ clearly. A model that
// comes out wrong — a missing face, a shifted glow, a lost letter — is far above both.
//
// The export service is started here, on the loopback address, so the run needs nothing else.
// It always binds 127.0.0.1:8787, so stop a running `npm run export` first.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';
import { exportServer } from '../server/dev.mjs';

const service = await exportServer(8787);

const only = process.argv.slice(2);
const MEAN = Number(process.env.CAPTURE_MEAN || 6); // 0–255, over the whole picture
const PART = Number(process.env.CAPTURE_PART || 0.03); // share of pixels that differ by more than 40
const T = process.env.CAPTURE_T === 'none' ? null : Number(process.env.CAPTURE_T || 1137); // ms into the animations

const vite = await createVite({ appType: 'mpa', logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = 420;
const H = 340;
const S = 96; // compared at this size, so anti-aliasing is not what is measured

const results = [];
const strips = [];

async function compare(demo) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/embed/${demo.id}/`);
  await page.addStyleTag({ content: '.embed__credit{display:none!important} html{overflow:hidden}' });
  await page.waitForTimeout(600);
  // one fixed moment for both pictures: every animation held part-way through
  if (T !== null) {
    await page.evaluate((t) => {
      for (const a of document.getAnimations()) {
        a.pause();
        const d = a.effect?.getComputedTiming().duration;
        if (typeof d === 'number' && d > 0) a.currentTime = t % d;
      }
    }, T);
  }
  await page.waitForTimeout(150);
  const stage = page.locator('.stage').first();
  const box = await stage.boundingBox();
  if (!box) {
    results.push({ id: demo.id, error: 'no stage' });
    await page.close();
    return;
  }
  const shot = (await stage.screenshot({ type: 'png' })).toString('base64');
  // the capture, through the dialog's own code, at the stage's own size and shape
  const made = await page.evaluate(
    async ([shotB64, size, small]) => {
      const { captureImage } = await import('/src/record.ts');
      const stage = document.querySelector('.stage');
      let blob;
      try {
        blob = await captureImage(stage, { size, backdrop: 'stage', saveAspect: stage.offsetWidth / stage.offsetHeight });
      } catch (e) {
        return { error: String(e) };
      }
      const load = (src) =>
        new Promise((ok, fail) => {
          const img = new Image();
          img.onload = () => ok(img);
          img.onerror = () => fail(new Error('could not read a picture'));
          img.src = src;
        });
      const [a, b] = await Promise.all([load(`data:image/png;base64,${shotB64}`), load(URL.createObjectURL(blob))]);
      const grey = (img) => {
        const c = document.createElement('canvas');
        c.width = small;
        c.height = small;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, small, small);
        const d = x.getImageData(0, 0, small, small).data;
        const out = new Float32Array(small * small);
        for (let i = 0; i < out.length; i++) out[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
        return out;
      };
      const ga = grey(a);
      const gb = grey(b);
      let sum = 0;
      let far = 0;
      const diff = document.createElement('canvas');
      diff.width = small;
      diff.height = small;
      const dx = diff.getContext('2d');
      const dd = dx.createImageData(small, small);
      for (let i = 0; i < ga.length; i++) {
        const delta = Math.abs(ga[i] - gb[i]);
        sum += delta;
        if (delta > 40) far++;
        dd.data[i * 4] = 255;
        dd.data[i * 4 + 1] = 255 - Math.min(255, delta * 3);
        dd.data[i * 4 + 2] = 255 - Math.min(255, delta * 3);
        dd.data[i * 4 + 3] = 255;
      }
      dx.putImageData(dd, 0, 0);
      // the strip: screen | capture | diff, at a size one can look at
      const T = 180;
      const strip = document.createElement('canvas');
      strip.width = T * 3 + 8;
      strip.height = T + 16;
      const sx = strip.getContext('2d');
      sx.fillStyle = '#fff';
      sx.fillRect(0, 0, strip.width, strip.height);
      sx.drawImage(a, 0, 16, T, T);
      sx.drawImage(b, T + 4, 16, T, T);
      sx.drawImage(diff, T * 2 + 8, 16, T, T);
      sx.fillStyle = '#000';
      sx.font = 'bold 12px sans-serif';
      return { mean: sum / ga.length, part: far / ga.length, strip: strip.toDataURL('image/png'), width: b.width, height: b.height };
    },
    [shot, Math.round(box.width), S],
  );
  await page.close();
  if (made.error) return void results.push({ id: demo.id, error: made.error });
  const bad = made.mean > MEAN || made.part > PART;
  results.push({ id: demo.id, mean: made.mean, part: made.part, bad, errors });
  if (bad || only.length) strips.push({ id: demo.id, strip: made.strip, mean: made.mean, part: made.part });
}

const list = only.length ? demos.filter((d) => only.includes(d.id)) : demos;
for (const demo of list) {
  await compare(demo);
  process.stdout.write(results.at(-1).error ? 'E' : results.at(-1).bad ? 'X' : '.');
}
process.stdout.write('\n');
await browser.close();
await vite.close();
service.close();

// the sheet of strips, for looking at what differed
if (strips.length) {
  const sheet = await (async () => {
    const b = await chromium.launch();
    const p = await b.newPage({ viewport: { width: 560, height: 200 } });
    const png = await p.evaluate(async (items) => {
      const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
      const imgs = await Promise.all(items.map((s) => load(s.strip)));
      const c = document.createElement('canvas');
      c.width = imgs[0].width;
      c.height = imgs.reduce((h, i) => h + i.height, 0);
      const x = c.getContext('2d');
      let y = 0;
      imgs.forEach((img, k) => {
        x.drawImage(img, 0, y);
        x.fillStyle = '#000';
        x.font = 'bold 12px sans-serif';
        x.fillText(`${items[k].id}  mean ${items[k].mean.toFixed(1)}  differing ${(items[k].part * 100).toFixed(1)}%   screen | capture | diff`, 4, y + 12);
        y += img.height;
      });
      return c.toDataURL('image/png');
    }, strips);
    await b.close();
    return Buffer.from(png.split(',')[1], 'base64');
  })();
  mkdirSync(resolve('qa'), { recursive: true });
  writeFileSync(resolve('qa/capture-diff.png'), sheet);
}

const bad = results.filter((r) => r.bad);
const failed = results.filter((r) => r.error);
console.log(`Capture vs screen: ${results.length} demos, ${bad.length} differ, ${failed.length} could not be captured`);
for (const r of bad) console.log(`  ${r.id}: mean ${r.mean.toFixed(1)}, ${(r.part * 100).toFixed(1)}% of pixels differ`);
for (const r of failed) console.log(`  ${r.id}: ${r.error}`);
if (strips.length) console.log(`  sheet: qa/capture-diff.png`);
process.exit(bad.length + failed.length ? 1 : 0);
