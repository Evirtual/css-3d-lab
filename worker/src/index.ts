import { launch } from '@cloudflare/playwright';
import { readCapture, renderCapture } from '../../server/render.mjs';

export default {
  async fetch(request, env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    if (!env.ALLOWED_ORIGINS.split(',').includes(origin)) return new Response('Origin not allowed', { status: 403 });
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/x-ndjson',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/capture') return new Response('Not found', { status: 404, headers });
    const { success } = await env.EXPORT_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'unknown' });
    if (!success) return new Response('Too many exports', { status: 429, headers });
    let payload;
    try { payload = await readCapture(request); }
    catch { return new Response('Invalid scene or export dimensions', { status: 400, headers }); }
    try {
      const browser = await launch(env.BROWSER);
      const body = await renderCapture(browser, payload, request.signal);
      return new Response(body, { headers });
    } catch {
      return new Response('The rendering service is unavailable', { status: 503, headers });
    }
  },
} satisfies ExportedHandler<Env>;
