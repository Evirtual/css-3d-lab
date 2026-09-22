import type { CapturedScene } from './capture-scene';

/**
 * The frames of a scene, drawn by the render service, in order. `frame` is how they travel: 'png'
 * (lossless, for pictures and see-through video) or 'webp' (lossy with alpha, about a fifth of the
 * bytes, for an MP4, which is lossy and opaque anyway). A service that predates 'webp' sends PNG.
 */
export async function* renderedFrames(scene: CapturedScene, scale: number, count: number, signal?: AbortSignal, frame: 'png' | 'webp' = 'png'): AsyncGenerator<ImageBitmap> {
  const endpoint = import.meta.env.VITE_CAPTURE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8787/capture' : '');
  if (!endpoint) throw new Error('Export service is not configured yet.');
  const abort = new AbortController();
  const cancel = () => abort.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  // A watchdog for a service that stopped answering, not a budget for the work: it scales with the
  // frames asked for, a little above the service's own deadline (server/render.mjs: 60 s + 1 s a
  // frame), so a slow render ends with the service's own message and not with a silent cancel here.
  // A flat 185 s cut the longest exports the dialog offers (a 30 s loop is 900 frames) short.
  const timeout = window.setTimeout(cancel, 70_000 + Math.min(count, 900) * 1_000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...scene, scale, count, fps: 30, frame }), signal: abort.signal });
    if (!response.ok) throw new Error(response.status === 429 ? 'Export service is busy. Please try again shortly.' : 'Export service could not start the capture.');
    if (!response.body) throw new Error('Export service returned no frames.');
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = '', received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      text += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let end;
      while ((end = text.indexOf('\n')) !== -1) {
        const line = JSON.parse(text.slice(0, end));
        text = text.slice(end + 1);
        if (line.error) throw new Error(line.error);
        const type = typeof line.webp === 'string' ? 'webp' : 'png';
        if (line.index !== received++ || typeof line[type] !== 'string') throw new Error('Export frames arrived out of order.');
        const bytes = Uint8Array.from(atob(line[type]), c => c.charCodeAt(0));
        yield await createImageBitmap(new Blob([bytes], { type: 'image/' + type }));
      }
      if (text.length > 64 * 1024 * 1024) throw new Error('Export frame is too large.');
      if (done) break;
    }
    if (received !== count) throw new Error('Export ended before all frames arrived.');
  } finally {
    await reader?.cancel().catch(() => {});
    reader?.releaseLock();
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
    abort.abort();
  }
}
