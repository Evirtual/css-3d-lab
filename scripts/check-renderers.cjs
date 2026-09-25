/**
 * npm run check-renderers   (after: node scripts/capture-payload.cjs, then take a picture)
 *
 * THE CHECK THAT WAS MISSING. check-exports drives the real dialog over 135 models and passes --
 * against the LOCAL render service, every time. Nothing ever asked the OTHER renderer the same
 * question, so the gate proved the app asks correctly and never proved the service on the far end
 * answers correctly. A font that exists on this laptop and not on the Worker shipped to the live
 * site on 2026-09-25 because of that gap, and a person found it by opening the dialog.
 *
 * The same payload, to both renderers, and what comes back.
 *
 * The page asks for exactly the same thing in both places -- 336x336 at scale 4.762 -- so if the
 * pictures differ, the difference is in the drawing, not the asking. This sends the captured
 * payload to the local Playwright service and to the Cloudflare Worker and reports each frame's
 * real pixel size and where the model sits inside it.
 *
 *   node .media-tmp/compare-renderers.cjs
 */
const { readFileSync, writeFileSync } = require('fs');
const LOCAL = 'http://127.0.0.1:8787/capture';
const WORKER = 'https://css-3d-lab-capture.social-posts-pinata.workers.dev/capture';
const body = readFileSync('.media-tmp/payload.json');
const asked = JSON.parse(body.toString());
/** PNG width/height straight out of the IHDR chunk. */
function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(12) !== 0x49484452) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
async function render(name, url) {
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: url.includes('127.0.0.1') ? 'http://localhost:5183' : 'https://css3dlab.edgarasneverdauskas.com' },
      body,
    });
  } catch (e) {
    console.log(`${name.padEnd(8)} FAILED to reach: ${e.message}`);
    return null;
  }
  if (!res.ok) {
    console.log(`${name.padEnd(8)} ${res.status} ${res.statusText} — ${(await res.text()).slice(0, 120)}`);
    return null;
  }
  const text = await res.text();
  const ms = Date.now() - t0;
  const line = text.split('\n').find((l) => l.trim());
  if (!line) { console.log(`${name.padEnd(8)} no frames in ${ms} ms`); return null; }
  let obj;
  try { obj = JSON.parse(line); } catch { console.log(`${name.padEnd(8)} unreadable: ${line.slice(0, 100)}`); return null; }
  const b64 = obj.png ?? obj.webp;
  if (!b64) { console.log(`${name.padEnd(8)} frame has no image: ${Object.keys(obj).join(',')}`); return null; }
  const buf = Buffer.from(b64, 'base64');
  const size = pngSize(buf);
  writeFileSync(`.media-tmp/frame-${name}.png`, buf);
  console.log(`${name.padEnd(8)} ${ms.toString().padStart(6)} ms  ${(buf.length / 1024).toFixed(0).padStart(5)} KB  ${size ? size.w + 'x' + size.h : 'not a PNG'}  -> .media-tmp/frame-${name}.png`);
  return { buf, size, ms };
}
(async () => {
  console.log(`asked for: ${asked.width}x${asked.height} at scale ${asked.scale} = ${Math.round(asked.width * asked.scale)}px, frame ${asked.frame}\n`);
  const local = await render('local', LOCAL);
  const worker = await render('worker', WORKER);
  if (local && worker) {
    console.log('');
    console.log('same pixel size:', local.size && worker.size && local.size.w === worker.size.w && local.size.h === worker.size.h);
    console.log('identical bytes:', local.buf.equals(worker.buf));
    console.log(`worker is ${(worker.ms / local.ms).toFixed(1)}x the local time`);
    // Byte-identical is not the bar: two PNG encoders and two antialiasers never agree exactly.
    // A picture drawn with the wrong font is a DIFFERENT picture, and that shows as size: before
    // the fonts travelled with the scene these two were 495 KB and 537 KB, an 8% gap that was a
    // card with its numbers hanging off the edge. Same size, within a tenth, is the bar.
    const near = Math.abs(local.buf.length - worker.buf.length) / Math.max(local.buf.length, worker.buf.length);
    const sameSize = Boolean(local.size && worker.size && local.size.w === worker.size.w && local.size.h === worker.size.h);
    const ok = sameSize && near < 0.1;
    console.log("");
    console.log(ok
      ? `ok   both renderers agree: ${local.size.w}x${local.size.h}, within ${(near * 100).toFixed(1)}% of bytes`
      : `BAD  the renderers disagree${sameSize ? "" : " on pixel size"} by ${(near * 100).toFixed(0)}% of bytes — open the two PNGs`);
    process.exitCode = ok ? 0 : 1;
  }
})();
