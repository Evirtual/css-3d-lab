import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { chromium } from 'playwright';
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
      const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
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
