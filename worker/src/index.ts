import { launch, limits } from '@cloudflare/playwright';
import { readCapture, renderCapture } from '../../server/render.mjs';
import { ExportBudget, type BudgetHit } from './budget';

export { ExportBudget };

/**
 * ONE BROWSER PER EXPORT, CLOSED WHEN IT IS DONE.
 *
 * Until 2026-10-05 a browser was kept up for three minutes after each export, waiting for the next
 * one, and every export that came in meanwhile reused it. Two things were wrong with that. The
 * waiting is browser time and Cloudflare bills it: a visitor taking one picture cost about three
 * minutes, which on a paid plan's 10 included hours is under two hundred visits a month. And the
 * counter charged a launch but never a reuse, so the time it said was spent and the time that was
 * billed could drift apart without limit (src/budget.ts says how).
 *
 * The keep-alive existed for the free plan, which allows one NEW browser every 20 seconds: closing
 * after each picture meant a second picture straight after the first was refused. That is now a
 * short wait (launchBrowser) instead of a refusal, and on a paid plan, which allows three new
 * browsers a second, it does not happen at all.
 */

/**
 * The most browser time one export can take, in seconds: what is reserved before it starts.
 * Launch and page load, then server/render.mjs's own deadline (60 s plus 1 s a frame, at most 900
 * frames), then the 60 s Cloudflare leaves an idle browser up if closing it failed.
 */
const worstCase = (count: number) => 30 + 60 + Math.min(count, 900) + 60;

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

async function reserveBrowserTime(env: Env, seconds: number, who: string) {
  try {
    const r = await budgetOf(env).fetch(`https://budget/reserve?seconds=${seconds}&who=${who}`);
    return await r.json() as { ok: boolean; id?: string; hit: BudgetHit | null; resetsIn: number };
  } catch (error) {
    console.error('Budget unreachable, refusing to render:', error);
    return { ok: false, hit: 'day' as const, resetsIn: 60 };
  }
}

/** What the export really took. Never allowed to fail the request: the work is done. */
async function settleBrowserTime(env: Env, id: string, used: number) {
  await budgetOf(env).fetch(`https://budget/settle?id=${id}&used=${Math.ceil(used)}`)
    .catch(() => { /* unsettled, it stays charged at its worst case: the safe way to be wrong */ });
}

/**
 * Who is asking, as a salted hash that changes every UTC day: enough to give each visitor a share
 * of the day, not enough to follow anybody from one day to the next. It is never stored past the
 * day it counts in (src/budget.ts deletes it).
 */
async function visitorKey(request: Request) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`css-3d-lab:${day}:${ip}`));
  return [...new Uint8Array(bytes)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A new browser, waiting for one when the platform says when.
 *
 * Cloudflare limits how often a NEW browser may be acquired (one every 20 s on the free plan) and
 * refuses straight away, but it also says how long until the next is allowed. Up to 25 s of that is
 * waited out here: the dialog shows "drawing" a little longer, which beats telling a visitor to try
 * again. When it reports no wait, one try after 3 s, as before -- a refusal with nothing to wait
 * for is the daily allowance being spent, and that should say so, not retry all night.
 */
async function launchBrowser(env: Env) {
  try { return await launch(env.BROWSER); }
  catch (error) {
    if (!atBrowserLimit(error)) throw error;
    const seen = await limits(env.BROWSER).catch(() => null);
    const wait = seen?.timeUntilNextAllowedBrowserAcquisition ?? 0;
    if (wait > 25_000) throw error;
    await sleep(wait > 0 ? wait + 500 : 3_000);
    return await launch(env.BROWSER);
  }
}

/**
 * This project's own ceiling, reached. Distinct from Cloudflare refusing a browser: that is their
 * limit and says "wait"; this is ours, and a visitor deserves to be told which one, and when it
 * lets go.
 */
class BudgetSpent extends Error {
  constructor(readonly hit: BudgetHit | null, readonly resetsIn: number) {
    super('export budget spent');
  }
}

/** The dialog prefixes 'It did not work: ' and shows up to 120 characters of these. */
const SAY: Record<BudgetHit, string> = {
  month: 'this site is out of export time for the month — it resets on the 1st',
  day: 'this site is out of export time for today — it resets at midnight UTC',
  visitor: 'you have used your share of exports for today — it resets at midnight UTC',
  busy: 'every export browser is in use — try again in a minute',
};

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
 *   counted   this Worker's own count (src/budget.ts): each export's real browser time once it has
 *             finished, its worst case while it is still running. Close to what Cloudflare bills,
 *             never under it; Cloudflare's own figure is on its dashboard, not readable from here.
 *   platform  what Cloudflare says right now: browsers open, and whether a new one would wait.
 * Open to any origin: it is a few numbers about this Worker, nothing about anyone who used it.
 */
async function budgetReport(env: Env): Promise<Response> {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
  const counted = await budgetOf(env).fetch('https://budget/state').then((r) => r.json()).catch(() => null);
  const seen = await limits(env.BROWSER).catch(() => null);
  return new Response(JSON.stringify({
    at: new Date().toISOString(),
    counted,
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
  async fetch(request, env, ctx): Promise<Response> {
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
    // Checked before anything is reserved or opened: a scene past the limits (more than 900 frames,
    // 8 MB, 8192 px a side) costs nothing, however it was sent.
    let payload;
    try { payload = await readCapture(request); }
    catch { return new Response('Invalid scene or export dimensions', { status: 400, headers }); }

    let settle = (_extra = 0) => {};
    try {
      const verdict = await reserveBrowserTime(env, worstCase(payload.count), await visitorKey(request));
      if (!verdict.ok || !verdict.id) throw new BudgetSpent(verdict.hit, verdict.resetsIn);
      const id = verdict.id;
      let started = 0, settled = false;
      settle = (extra = 0) => {
        if (settled) return;
        settled = true;
        // a couple of seconds over what was measured here: the browser starts a little before
        // launch() returns and ends a little after close() does
        ctx.waitUntil(settleBrowserTime(env, id, started ? (Date.now() - started) / 1000 + 2 + extra : 0));
      };
      const browser = await launchBrowser(env).catch((error) => { settle(); throw error; });
      started = Date.now();
      // renderCapture closes what it is given when the last frame is out, on cancel, or on its
      // deadline. Closing is the moment the billing stops, so it is the moment the time is settled.
      // A close that failed leaves the browser idling until Cloudflare's 60 s timeout: charged too.
      const counted = {
        newContext: (options: unknown) => browser.newContext(options as any),
        close: async () => {
          let failed = false;
          try { await browser.close(); } catch { failed = true; }
          settle(failed ? 60 : 0);
        },
      };
      const body = await renderCapture(counted, payload, request.signal, false);
      return new Response(body, { headers });
    } catch (error) {
      settle();
      /*
       * OUR LIMITS, SAID IN OUR OWN WORDS.
       *
       * Not a 503 and not "the rendering service is unavailable": nothing is broken. Retry-After is
       * real -- seconds to the UTC rollover of the window that refused, or a short wait for a free
       * browser -- so a client that honours it waits the right amount of time.
       */
      if (error instanceof BudgetSpent) {
        console.warn('Export refused by the budget:', error.hit);
        return new Response(SAY[error.hit ?? 'day'], { status: 429, headers: { ...headers, 'Retry-After': String(Math.max(1, error.resetsIn)) } });
      }
      // Logged, not swallowed: an empty catch here meant a 503 carried no reason at all, and a
      // refused browser looked exactly like a broken scene from the outside.
      console.error('Capture could not start:', error);
      if (atBrowserLimit(error)) {
        // Two very different things arrive here as one 429: a browser that is busy this minute
        // (wait a moment) and a daily rendering allowance that is spent (wait until tomorrow).
        // Telling a visitor "try again shortly" for the second one is simply untrue.
        const seen = await limits(env.BROWSER).catch(() => null);
        console.error('At the browser limit:', JSON.stringify(seen));
        const wait = Math.ceil((seen?.timeUntilNextAllowedBrowserAcquisition ?? 0) / 1000);
        const spent = wait <= 0 && (seen?.activeSessions?.length ?? 0) === 0;
        const say = spent
          ? 'out of exports for today — it resets tomorrow'
          : `no browser free — try again in ${Math.max(1, wait)}s`;
        return new Response(say, { status: 429, headers: { ...headers, 'Retry-After': String(Math.max(1, wait || 60)) } });
      }
      return new Response('The rendering service is unavailable', { status: 503, headers });
    }
  },
} satisfies ExportedHandler<Env>;
