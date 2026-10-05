import { connect, launch, limits, sessions } from '@cloudflare/playwright';
import { readCapture, renderCapture } from '../../server/render.mjs';
import { ExportBudget } from './budget';

export { ExportBudget };

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

/*
 * ASKING THE BUDGET BEFORE SPENDING ANY OF IT.
 *
 * Everything below goes through one Durable Object. See src/budget.ts for why it is a Durable
 * Object and not the rate limiting binding this Worker already has -- briefly: that binding cannot
 * express a period longer than 60 seconds, counts separately in every Cloudflare location, and is
 * documented as "intentionally designed to not be used as an accurate accounting system".
 *
 * FAILING CLOSED IS THE POINT. If the budget cannot be reached, this returns a refusal rather than
 * an allowance. A guard that opens when it breaks is not a guard, and the whole reason this exists
 * is that Cloudflare will happily keep rendering -- and keep charging -- for as long as the
 * requests keep coming.
 */
const budgetOf = (env: Env) => env.EXPORT_BUDGET.get(env.EXPORT_BUDGET.idFromName('global'));

async function reserveBrowserTime(env: Env, seconds: number) {
  try {
    const r = await budgetOf(env).fetch(`https://budget/reserve?seconds=${seconds}`);
    return await r.json() as { ok: boolean; hit: 'day' | 'month' | null; usedDay: number; capDay: number; usedMonth: number; capMonth: number; resetsIn: number };
  } catch (error) {
    console.error('Budget unreachable, refusing to render:', error);
    return { ok: false, hit: 'day' as const, usedDay: 0, capDay: 0, usedMonth: 0, capMonth: 0, resetsIn: 60 };
  }
}

/** Hand back what a browser did not use. Never allowed to fail the request: the work is done. */
function refundBrowserTime(env: Env, seconds: number) {
  if (!(seconds > 0)) return;
  budgetOf(env).fetch(`https://budget/refund?seconds=${seconds}`).catch(() => { /* the ceiling stays a little lower until the window rolls over, which is the safe way to be wrong */ });
}

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
  /*
   * ONLY A NEW BROWSER COSTS ANYTHING HERE.
   *
   * Reusing a session above is free at this point: its time is already bought and running, and the
   * keep-alive window it is inside was charged for in full when it was launched. Charging again for
   * a connect would count the same seconds twice and make the ceiling arbitrary.
   */
  const charge = KEEP_ALIVE / 1000;
  const verdict = await reserveBrowserTime(env, charge);
  if (!verdict.ok) throw new BudgetSpent(verdict);
  try { return await launch(env.BROWSER, { keep_alive: KEEP_ALIVE }); }
  catch (error) {
    if (!atBrowserLimit(error)) { refundBrowserTime(env, charge); throw error; }
    // One backoff, then one more try. Cloudflare limits how often a NEW browser may be acquired and
    // refuses within a second, reporting no wait to serve -- so a second picture of the SAME model,
    // taken a moment after the first, was refused while the same picture of a DIFFERENT model
    // succeeded, purely because walking to another model took longer than the window. Three seconds
    // is the whole difference between those two cases. It is one retry, so an allowance that is
    // genuinely spent costs three seconds and then says so, instead of retrying all night.
    await new Promise(resolve => setTimeout(resolve, 3_000));
    try {
      return await launch(env.BROWSER, { keep_alive: KEEP_ALIVE });
    } catch (again) {
      // Nothing was drawn and no browser was held, so the seconds reserved for it go back.
      refundBrowserTime(env, charge);
      throw again;
    }
  }
}

/**
 * This project's own ceiling, reached. Distinct from Cloudflare refusing a browser: that is their
 * limit and says "wait"; this is ours and says "not today", and a visitor deserves to be told
 * which, because only one of them is going to resolve on its own in a few seconds.
 */
class BudgetSpent extends Error {
  constructor(readonly verdict: { hit: 'day' | 'month' | null; resetsIn: number }) {
    super('export budget spent');
  }
}

/** Whether a failure is the platform refusing a NEW browser, which is a wait, not a fault. */
function atBrowserLimit(error: unknown) {
  return /rate limit|unable to create new browser|429/i.test(String((error as Error)?.message ?? error));
}

/**
 * HOW MUCH OF TODAY IS LEFT, WITHOUT SPENDING ANY OF IT.
 *
 * GET /budget. Before this, the only way to learn the allowance was spent was to ask for a picture
 * and be refused, which is how two releases on 2026-10-04 found out, and how every visitor did for
 * the rest of that day. This reads; it never launches a browser.
 *
 * Two numbers, and they are not the same thing, so they are not given one name:
 *   counted   this Worker's own ceiling (src/budget.ts): 180 s charged for each browser it opens,
 *             nothing for reusing one. An estimate of browser time, close but not Cloudflare's.
 *   platform  what Cloudflare says right now: browsers open, and whether a new one would be
 *             refused. Cloudflare does not tell a Worker how much of its free daily time is left;
 *             nothing here pretends to know that.
 * Open to any origin: it is three numbers about this Worker, nothing about anyone who used it.
 */
async function budgetReport(env: Env): Promise<Response> {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
  const counted = await budgetOf(env).fetch('https://budget/state').then((r) => r.json()).catch(() => null);
  const seen = await limits(env.BROWSER).catch(() => null);
  return new Response(JSON.stringify({
    at: new Date().toISOString(),
    counted,
    browserSeconds: KEEP_ALIVE / 1000,
    // Cloudflare's plan as wrangler.jsonc says it is: on free, 10 minutes a day refuse before this
    // Worker's own ceiling does. Change PLAN when the plan changes; nothing can read it from here.
    plan: (env as any).PLAN ?? 'free',
    platform: seen && {
      browsersOpen: seen.activeSessions?.length ?? 0,
      maxConcurrent: seen.maxConcurrentSessions ?? null,
      newBrowserWaitSeconds: Math.ceil((seen.timeUntilNextAllowedBrowserAcquisition ?? 0) / 1000),
    },
  }), { headers });
}

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method === 'GET' && new URL(request.url).pathname === '/budget') return budgetReport(env);
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
      /*
       * OUR CEILING, SAID IN OUR OWN WORDS.
       *
       * Not a 503 and not "the rendering service is unavailable": nothing is broken, the site has
       * simply spent what it allows itself today. Retry-After is real -- it is the seconds to the
       * UTC rollover of whichever window refused -- so a client that honours it waits the right
       * amount of time instead of hammering a door that will not open until tomorrow.
       */
      if (error instanceof BudgetSpent) {
        const { hit, resetsIn } = error.verdict;
        const say = hit === 'month'
          ? 'this site is out of export time for the month — it resets on the 1st'
          : 'this site is out of export time for today — it resets at midnight UTC';
        console.warn('Export budget spent:', JSON.stringify(error.verdict));
        return new Response(say, { status: 429, headers: { ...headers, 'Retry-After': String(Math.max(1, resetsIn)) } });
      }
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
