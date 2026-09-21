// Shared by the Cloudflare Worker and local Playwright service. No files, sessions or images
// are persisted. A stream owns exactly one isolated browser context and disposes it on cancel.
// Not run on its own: imported by server/dev.mjs (npm run export) and worker/src/index.ts.
// validateCapture / readCapture check a posted scene (at most 8 MB, 900 frames, 30 fps, 8192 px a
// side, MAX_PIXELS device pixels a frame); renderCapture draws it and streams one
// `{ index, png }` JSON line per frame.
export const MAX_BODY = 8 * 1024 * 1024;

/**
 * How big a frame may be drawn. The real limit is the pixel budget: the page is drawn at
 * ceil(scale) device pixels per CSS pixel, and width × height × ceil(scale)² device pixels is what
 * a frame costs. MAX_SCALE is only a sanity bound on the device pixel ratio, far above what any
 * canvas the dialog shows needs (a 3200 px picture of a 200 px canvas is 16×). src/record.ts
 * imports these, so the page asks for exactly what this accepts.
 */
export const MAX_PIXELS = 34_000_000;
export const MAX_SCALE = 32;
export function renderFits(width, height, scale) {
  return Number.isFinite(scale) && scale >= .1 && scale <= MAX_SCALE && width * height * Math.ceil(scale) ** 2 <= MAX_PIXELS;
}

export function validateCapture(p) {
  if (!p || typeof p.html !== 'string' || p.html.length > MAX_BODY || !Array.isArray(p.animations) || p.animations.length > 3000) throw new Error('Invalid scene');
  for (const k of ['width', 'height']) if (!Number.isInteger(p[k]) || p[k] < 1 || p[k] > 8192) throw new Error('Invalid viewport');
  if (!renderFits(p.width, p.height, p.scale)) throw new Error('Export resolution is too large');
  if (!Number.isInteger(p.count) || p.count < 1 || p.count > 900) throw new Error('Invalid frame count');
  if (p.fps !== 30) throw new Error('Invalid frame rate');
  // A live take sends one pose per frame instead of a clock to wind on.
  if (p.poses !== undefined) {
    if (!Array.isArray(p.poses) || p.poses.length !== p.count) throw new Error('Invalid poses');
    for (const pose of p.poses) {
      if (!Array.isArray(pose) || pose.length > 5000) throw new Error('Invalid pose');
      for (const change of pose) if (!Array.isArray(change) || change.length !== 2 || !Number.isInteger(change[0]) || change[0] < 0 || typeof change[1] !== 'string') throw new Error('Invalid pose');
    }
  }
  return p;
}

export async function readCapture(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing scene');
  let length = 0, text = '';
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY) { await reader.cancel(); throw new Error('Scene exceeds 8 MB'); }
      text += decoder.decode(value, { stream: true });
    }
    return validateCapture(JSON.parse(text + decoder.decode()));
  } finally { reader.releaseLock(); }
}

export async function renderCapture(browser, payload, signal) {
  let context;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
    await browser.close().catch(() => {});
  };
  const abort = () => { void close(); };
  const timeout = setTimeout(abort, 180_000);
  signal?.addEventListener('abort', abort, { once: true });
  try {
    if (signal?.aborted) throw new Error('Export cancelled');
    context = await browser.newContext({ viewport: { width: payload.width, height: payload.height }, deviceScaleFactor: Math.ceil(payload.scale), serviceWorkers: 'block' });
    // Defence in depth: even hostile submitted markup cannot fetch arbitrary URLs.
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    await page.setContent(payload.html, { waitUntil: 'load' });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate((items) => {
      const animations = [];
      for (const item of items) {
        const el = document.querySelector(`[data-capture-id="${Number(item.target)}"]`);
        if (!el) continue;
        const effect = new KeyframeEffect(el, item.frames, { ...item.timing, iterations: item.timing.iterations === -1 ? Infinity : item.timing.iterations, pseudoElement: item.pseudo });
        const a = new Animation(effect, document.timeline);
        a.pause(); a.currentTime = item.time;
        animations.push({ a, time: item.time, rate: item.rate });
      }
      window.__captureAnimations = animations;
    }, payload.animations);
    let index = 0;
    const encoder = new TextEncoder();
    return new ReadableStream({
      async pull(controller) {
        try {
          if (closed) throw new Error('Export timed out or was cancelled');
          if (payload.poses) {
            // A live take: each frame is a pose that was sampled in the visitor's own browser,
            // so nothing here has to guess what the model was doing at that moment.
            await page.evaluate((pose) => {
              for (const [id, style] of pose) document.querySelector(`[data-capture-id="${id}"]`)?.setAttribute('style', style);
            }, payload.poses[index]);
          }
          await page.evaluate(t => {
            for (const { a, time, rate } of window.__captureAnimations) a.currentTime = time + t * rate;
          }, index * 1000 / payload.fps);
          const image = await page.screenshot({ type: 'png', omitBackground: true, animations: 'allow', timeout: 15_000 });
          controller.enqueue(encoder.encode(JSON.stringify({ index, png: image.toString('base64') }) + '\n'));
          if (++index === payload.count) { await close(); controller.close(); }
        } catch (error) {
          console.warn('Capture failed:', error.message);
          await close();
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'The render could not finish. Try a smaller export.' }) + '\n'));
          controller.close();
        }
      },
      cancel: close,
    }, { highWaterMark: 1 });
  } catch (err) { await close(); throw err; }
}
