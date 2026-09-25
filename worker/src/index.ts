import { connect, launch, limits, sessions } from '@cloudflare/playwright';
import { readCapture, renderCapture } from '../../server/render.mjs';

/**
 * How long an idle browser stays up waiting for the next export, in milliseconds.
 *
 * Cloudflare rate limits ACQUIRING a browser, not drawing in one, and it answers a refused
 * acquisition straight away. Launching a fresh browser for every picture and closing it at the end
 * meant the second picture of the same model -- seconds after a first that worked -- was refused,
 * and the dialog said "Export service could not start the capture" while nothing was wrong with
 * the scene. Three minutes covers a visitor taking a few pictures of a model and comparing them,
 * and is short enough that a browser nobody comes back to does not sit there spending browser time.
 */
const KEEP_ALIVE = 180_000;

/** A browser to draw in: one that is already up, or a new one when none will take us. */
async function openBrowser(env: Env) {
  // ANY live session will do. Each export draws in its own freshly made context, and a context --
  // not a browser -- is the isolation boundary, so two exports can share one browser without ever
  // seeing each other. Connecting to a session is not rate limited; only acquiring a new browser
  // is. A session whose previous connection has not been released yet simply refuses, which is why
  // this tries each one in turn instead of reading connectionId and giving up: that read said
  // "busy" a second after a picture finished, so every session was skipped and every export went
  // back to acquiring, which is the thing that gets refused.
  for (const { sessionId } of await sessions(env.BROWSER)) {
    try { return await connect(env.BROWSER, sessionId); }
    catch { /* in use, or it ended between the listing and the connect */ }
  }
  try { return await launch(env.BROWSER, { keep_alive: KEEP_ALIVE }); }
  catch (error) {
    if (!atBrowserLimit(error)) throw error;
    // One backoff, then one more try. Cloudflare limits how often a NEW browser may be acquired and
    // refuses within a second, reporting no wait to serve -- so a second picture of the SAME model,
    // taken a moment after the first, was refused while the same picture of a DIFFERENT model
    // succeeded, purely because walking to another model took longer than the window. Three seconds
    // is the whole difference between those two cases. It is one retry, so an allowance that is
    // genuinely spent costs three seconds and then says so, instead of retrying all night.
    await new Promise(resolve => setTimeout(resolve, 3_000));
    return await launch(env.BROWSER, { keep_alive: KEEP_ALIVE });
  }
}

/** Whether a failure is the platform refusing a NEW browser, which is a wait, not a fault. */
function atBrowserLimit(error: unknown) {
  return /rate limit|unable to create new browser|429/i.test(String((error as Error)?.message ?? error));
}

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
      const browser = await openBrowser(env);
      // The browser stays up for the next export; renderCapture disposes the context it drew in.
      const body = await renderCapture(browser, payload, request.signal, true);
      return new Response(body, { headers });
    } catch (error) {
      // Logged, not swallowed: an empty catch here meant a 503 carried no reason at all, and a
      // refused browser looked exactly like a broken scene from the outside -- the dialog said the
      // capture could not start when the true answer was "wait a moment".
      console.error('Capture could not start:', error);
      if (atBrowserLimit(error)) {
        // What the platform actually allows, in its own words, so a refusal can say WHICH limit it
        // was. Two very different things arrive here as one 429: a browser that is busy this minute
        // (wait a moment) and a daily rendering allowance that is spent (wait until tomorrow).
        // Telling a visitor "try again shortly" for the second one is simply untrue.
        const seen = await limits(env.BROWSER).catch(() => null);
        console.error('At the browser limit:', JSON.stringify(seen));
        const wait = Math.ceil((seen?.timeUntilNextAllowedBrowserAcquisition ?? 0) / 1000);
        // Nothing running, no wait to serve, and a new browser still refused: what is exhausted is
        // the allowance for the day, not this minute.
        const spent = wait <= 0 && (seen?.activeSessions?.length ?? 0) === 0;
        // The dialog prefixes 'It did not work: ', so these are short fragments, not sentences.
        const say = spent
          ? 'out of exports for today — it resets tomorrow'
          : `no browser free — try again in ${Math.max(1, wait)}s`;
        return new Response(say, { status: 429, headers: { ...headers, 'Retry-After': String(Math.max(1, wait || 60)) } });
      }
      return new Response('The rendering service is unavailable', { status: 503, headers });
    }
  },
} satisfies ExportedHandler<Env>;
