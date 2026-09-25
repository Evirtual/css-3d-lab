// Shared by the Cloudflare Worker and local Playwright service. No files, sessions or images
// are persisted. A stream owns exactly one isolated browser context and disposes it on cancel.
// Not run on its own: imported by server/dev.mjs (npm run export) and worker/src/index.ts.
// validateCapture / readCapture check a posted scene (at most 8 MB, 900 frames, 30 fps, 8192 px a
// side, MAX_PIXELS device pixels a frame); renderCapture draws it and streams one
// `{ index, png }` (or `{ index, webp }`, when asked for) JSON line per frame.
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

/**
 * How each frame comes back. PNG is lossless and see-through, for pictures and transparent video.
 * An MP4 cannot be see-through and is lossy anyway, so its frames can be lossy WebP, which keeps
 * the alpha the page composites over its backdrop and is about a fifth of the PNG's bytes: on
 * Cloudflare, moving the frame from the browser to the Worker is most of a frame's time.
 */
export const FRAME_TYPES = ['png', 'webp'];
const WEBP_QUALITY = 90;

export function validateCapture(p) {
  if (!p || typeof p.html !== 'string' || p.html.length > MAX_BODY || !Array.isArray(p.animations) || p.animations.length > 3000) throw new Error('Invalid scene');
  for (const k of ['width', 'height']) if (!Number.isInteger(p[k]) || p[k] < 1 || p[k] > 8192) throw new Error('Invalid viewport');
  if (!renderFits(p.width, p.height, p.scale)) throw new Error('Export resolution is too large');
  if (!Number.isInteger(p.count) || p.count < 1 || p.count > 900) throw new Error('Invalid frame count');
  if (p.fps !== 30) throw new Error('Invalid frame rate');
  if (p.frame !== undefined && !FRAME_TYPES.includes(p.frame)) throw new Error('Invalid frame type');
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

export async function renderCapture(browser, payload, signal, keepBrowser = false) {
  let context;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
    // The context always goes: it owns the page, and with it the frames' memory. The BROWSER stays
    // when the caller asked to keep it. On Cloudflare it is ACQUIRING a browser that is rate
    // limited, not drawing in one, so closing the browser after every picture is what made a second
    // picture -- seconds after a first that worked -- come back as "could not start the capture".
    await context?.close().catch(() => {});
    if (!keepBrowser) await browser.close().catch(() => {});
  };
  const abort = () => { void close(); };
  // The whole render's deadline: a watchdog for a browser that stopped answering, not a budget for
  // the work. Every frame already has its own 15 s guard below, and the stream is closed as soon as
  // the client goes away. A flat 3 minutes killed exactly the largest exports the dialog offers: a
  // 30 s loop is 900 frames, and a heavy model's frame at 1080p takes a few hundred ms, so 18
  // models (solar, ferris, planet, rocket… every long loop with a lot to draw) ended in "The render
  // could not finish" while lighter 900-frame models finished. It scales with the frames asked for:
  // one second each, which is well over the worst frame seen and still bounded (at most ~16 min,
  // since validateCapture caps a scene at 900 frames).
  const timeout = setTimeout(abort, 60_000 + Math.min(payload.count, 900) * 1_000);
  signal?.addEventListener('abort', abort, { once: true });
  try {
    if (signal?.aborted) throw new Error('Export cancelled');
    const dpr = Math.ceil(payload.scale);
    context = await browser.newContext({ viewport: { width: payload.width, height: payload.height }, deviceScaleFactor: dpr, serviceWorkers: 'block' });
    // Defence in depth: even hostile submitted markup cannot fetch arbitrary URLs.
    await context.route('**/*', route => route.abort());
    const type = payload.frame ?? 'png';
    // One Page.captureScreenshot per frame, straight over CDP. Playwright's page.screenshot makes
    // about eight round trips to the browser for one picture (sizes, styles, fonts, background,
    // then the capture), which on Cloudflare cost more than the picture itself. The clip's scale
    // is the device pixel ratio because this CDP session does not carry Playwright's own device
    // metrics; the picture is the same pixels page.screenshot gave.
    const shot = { format: type, ...(type === 'webp' ? { quality: WEBP_QUALITY } : {}), clip: { x: 0, y: 0, width: payload.width, height: payload.height, scale: dpr } };
    // One page. Three pages drawing frames side by side was 2.6× faster in a probe on Cloudflare,
    // but deployed, the first frame never came back within 15 s; the cause was not found.
    const view = await openPage(context, payload);
    let index = 0;
    const encoder = new TextEncoder();
    return new ReadableStream({
      async pull(controller) {
        try {
          if (closed) throw new Error('Export timed out or was cancelled');
          const data = await within(drawFrame(view, index, payload, shot), 15_000);
          // CDP already hands the picture over as base64: it goes out as it came in.
          controller.enqueue(encoder.encode(JSON.stringify({ index, [type]: data }) + '\n'));
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

/** A page with the scene on it, its animations held still, ready to be wound to any frame. */
async function openPage(context, payload) {
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
  const cdp = await context.newCDPSession(page);
  // what omitBackground did: the page's own background stays see-through
  await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  return { page, cdp };
}

/** Frame i, as base64: one round trip to wind the page to it, one to take the picture. */
async function drawFrame(view, i, payload, shot) {
  // A live take: each frame is a pose that was sampled in the visitor's own browser, so nothing
  // here has to guess what the model was doing at that moment. A pose holds only what changed
  // since the one before.
  const poses = payload.poses ? [payload.poses[i]] : [];
  await view.page.evaluate(({ poses, t }) => {
    for (const pose of poses) for (const [id, style] of pose) document.querySelector(`[data-capture-id="${id}"]`)?.setAttribute('style', style);
    for (const { a, time, rate } of window.__captureAnimations) a.currentTime = time + t * rate;
  }, { poses, t: i * 1000 / payload.fps });
  const { data } = await view.cdp.send('Page.captureScreenshot', shot);
  return data;
}

function within(promise, ms) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Frame timed out')), ms); })]).finally(() => clearTimeout(timer));
}
