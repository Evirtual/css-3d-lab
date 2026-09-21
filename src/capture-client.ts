import type { CapturedScene } from './capture-scene';

export async function* renderedFrames(scene: CapturedScene, scale: number, count: number, signal?: AbortSignal): AsyncGenerator<ImageBitmap> {
  const endpoint = import.meta.env.VITE_CAPTURE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8787/capture' : '');
  if (!endpoint) throw new Error('Export service is not configured yet.');
  const abort = new AbortController();
  const cancel = () => abort.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  const timeout = window.setTimeout(cancel, 185_000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...scene, scale, count, fps: 30 }), signal: abort.signal });
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
        const frame = JSON.parse(text.slice(0, end));
        text = text.slice(end + 1);
        if (frame.error) throw new Error(frame.error);
        if (frame.index !== received++ || typeof frame.png !== 'string') throw new Error('Export frames arrived out of order.');
        const bytes = Uint8Array.from(atob(frame.png), c => c.charCodeAt(0));
        yield await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
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
