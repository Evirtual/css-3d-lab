/**
 * Is the video capture producing steady motion?
 *
 * Renders a model's frames through the very pipeline the site uses (capture-scene → the export
 * service → ImageBitmap) and reports, for each frame, how much it changed from the one before.
 * A frame that changed nothing is a repeat, and a run of repeats is the stutter you can see.
 *
 *   node scripts/diag-video.mjs cube          60 frames of one model
 *   node scripts/diag-video.mjs cube 90       a longer run
 *
 * Runs on the source through Vite (no build) and starts its own export service on
 * 127.0.0.1:8787, so stop a running `npm run export` first.
 */
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';
import { exportServer } from '../server/dev.mjs';

const id = process.argv[2] ?? 'cube';
const count = Number(process.argv[3] ?? 60);

const service = await exportServer(8787);
const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('  page error:', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('  console:', m.text()));

await page.goto(`${base}/models/${id}/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('iframe[data-ready="true"]', { timeout: 20_000 });
await page.waitForTimeout(500);

const report = await page.evaluate(async ([frames]) => {
  const { captureScene } = await import('/src/capture-scene.ts');
  const { renderedFrames } = await import('/src/capture-client.ts');
  const stage = document.querySelector('.stage[data-demo]');
  const started = performance.now();
  const scene = captureScene(stage, true);
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = Math.round((160 * scene.height) / scene.width);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const diffs = [];
  const times = [];
  let previous = null;
  let last = performance.now();
  for await (const bitmap of renderedFrames(scene, 1, frames)) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const now = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    if (previous) {
      let sum = 0;
      for (let i = 0; i < now.length; i += 4) sum += Math.abs(now[i] - previous[i]) + Math.abs(now[i + 1] - previous[i + 1]) + Math.abs(now[i + 2] - previous[i + 2]) + Math.abs(now[i + 3] - previous[i + 3]);
      diffs.push(sum / (now.length / 4) / 4);
    }
    previous = now;
    times.push(Math.round(performance.now() - last));
    last = performance.now();
  }
  return { diffs, times, seconds: Math.round(performance.now() - started) / 1000, animations: scene.animations.length, size: [scene.width, scene.height], bytes: scene.html.length };
}, [count]);

const { diffs, times } = report;
const still = diffs.filter((d) => d < 0.05).length;
const average = diffs.reduce((a, b) => a + b, 0) / (diffs.length || 1);
const jumps = diffs.filter((d) => d > average * 3).length;
console.log(`${id}: ${diffs.length + 1} frames in ${report.seconds}s, ${report.animations} animations, scene ${report.size.join('×')}, ${(report.bytes / 1024).toFixed(0)} kB of markup`);
console.log(`change per frame: average ${average.toFixed(3)}, ${still} unchanged (repeats), ${jumps} sudden jumps`);
console.log('per frame: ' + diffs.map((d) => d.toFixed(2)).join(' '));
console.log(`server time per frame: median ${times.slice(1).sort((a, b) => a - b)[Math.floor(times.length / 2)]}ms, worst ${Math.max(...times.slice(1))}ms`);

await browser.close();
await vite.close();
service.close();
