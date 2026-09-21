/**
 * Records a model exactly as the maker does, then plays the file back frame by frame and reports
 * what actually came out: how many frames the player saw, how evenly they are spaced, how many
 * are repeats of the one before, and whether the end meets the beginning again.
 *
 *   node scripts/diag-record.mjs cube
 *   node scripts/diag-record.mjs cube 480      a smaller, quicker video
 *
 * Runs on the source through Vite (no build) and starts its own export service on
 * 127.0.0.1:8787, so stop a running `npm run export` first.
 */
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';
import { exportServer } from '../server/dev.mjs';

const id = process.argv[2] ?? 'cube';
const quality = Number(process.argv[3] ?? 480);

const service = await exportServer(8787);
const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => console.log('  page error:', e.message));

await page.goto(`${base}/models/${id}/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('iframe[data-ready="true"]', { timeout: 20_000 });
await page.waitForTimeout(400);

const out = await page.evaluate(async ([q]) => {
  const { recordModel, motionSeconds } = await import('/src/record.ts');
  const stage = document.querySelector('.stage[data-demo]');
  const started = performance.now();
  const made = await recordModel({ stage, ratio: '1:1', backdrop: 'dark', quality: q });
  const took = Math.round(performance.now() - started) / 1000;

  // play it back and look at every frame the player actually shows
  const video = document.createElement('video');
  video.src = URL.createObjectURL(made.blob);
  video.muted = true;
  await new Promise((ok, no) => { video.onloadedmetadata = ok; video.onerror = () => no(new Error('the file would not open')); });
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = Math.round((120 * video.videoHeight) / video.videoWidth);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const seen = [];
  const diffs = [];
  let previous = null;
  let first = null;
  await new Promise((done) => {
    const step = (_now, meta) => {
      seen.push(meta.mediaTime);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const now = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      first ??= now;
      if (previous) {
        let sum = 0;
        for (let i = 0; i < now.length; i += 4) sum += Math.abs(now[i] - previous[i]) + Math.abs(now[i + 1] - previous[i + 1]) + Math.abs(now[i + 2] - previous[i + 2]);
        diffs.push(sum / (now.length / 4) / 3);
      }
      previous = now;
      if (!video.ended) video.requestVideoFrameCallback(step);
      else done();
    };
    video.requestVideoFrameCallback(step);
    video.onended = () => done();
    void video.play();
  });
  let wrap = 0;
  for (let i = 0; i < first.length; i += 4) wrap += Math.abs(first[i] - previous[i]) + Math.abs(first[i + 1] - previous[i + 1]) + Math.abs(first[i + 2] - previous[i + 2]);
  URL.revokeObjectURL(video.src);
  return {
    took, size: [made.width, made.height], seconds: made.seconds, loops: made.loops, turn: made.turn,
    bytes: made.blob.size, duration: video.duration, motion: motionSeconds(stage),
    frames: seen.length, gaps: seen.slice(1).map((t, i) => Math.round((t - seen[i]) * 1000)),
    diffs, wrap: wrap / (first.length / 4) / 3,
  };
}, [quality]);

const gaps = out.gaps.filter((g) => g > 0);
const median = gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
const still = out.diffs.filter((d) => d < 0.05).length;
console.log(`${id}: ${out.size.join('×')}, asked for ${out.seconds}s (${(out.seconds * 30).toFixed(0)} frames), file says ${out.duration.toFixed(2)}s, made in ${out.took}s, ${(out.bytes / 1024).toFixed(0)} kB`);
console.log(`whole turn ${out.turn}s, joins up: ${out.loops}`);
console.log(`played back: ${out.frames} frames, gap between frames median ${median}ms, longest ${Math.max(...out.gaps)}ms, shortest ${Math.min(...out.gaps)}ms`);
console.log(`${still} of ${out.diffs.length} frames are the same as the one before; end-to-start difference ${out.wrap.toFixed(2)}`);
console.log('gaps: ' + out.gaps.join(' '));

await browser.close();
await vite.close();
service.close();
