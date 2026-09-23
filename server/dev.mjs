/**
 * The render service for development: recordings, snapshots and prints are drawn here when the
 * site runs under `npm run dev` (src/capture-client.ts falls back to this address when
 * VITE_CAPTURE_URL is not set).
 *
 *   npm run export        (node server/dev.mjs) listens on http://127.0.0.1:8787/capture
 *
 * POST /capture with a scene from src/capture-scene.ts; the frames come back as newline-delimited
 * JSON, one PNG each (WebP for an MP4), drawn by server/render.mjs in a fresh Chromium per request. Only pages on
 * localhost / 127.0.0.1 may call it. exportServer(port) is also imported by the scripts that need
 * a service of their own (compare-capture, diag-record, diag-video, check-exports, verify).
 * Production runs the same render.mjs in the Cloudflare Worker in worker/.
 */
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { launchChromium } from '../scripts/browser.mjs';
import { readCapture, renderCapture } from './render.mjs';

// Loopback-only development equivalent of the Worker, using the identical render implementation.
export function exportServer(port = 8787) {
  const server = createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (origin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) { res.writeHead(403).end(); return; }
    res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    if (req.method !== 'POST' || req.url !== '/capture') { res.writeHead(404).end(); return; }
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    try {
      const request = new Request('http://localhost/capture', { method: 'POST', body: Readable.toWeb(req), duplex: 'half' });
      const payload = await readCapture(request);
      const browser = await launchChromium({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
      const stream = await renderCapture(browser, payload, abort.signal);
      res.setHeader('Content-Type', 'application/x-ndjson');
      Readable.fromWeb(stream).on('error', () => res.destroy()).pipe(res);
    } catch (err) { res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: err.message })); }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/server/dev.mjs')) {
  await exportServer();
  console.log('Local export service: http://127.0.0.1:8787/capture');
}
