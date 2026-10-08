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
    return await r.json() as { ok: boolean; id?: string; hit: BudgetHit | null; resetsIn: number; waitMs?: number };
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
async function visitorKey(request: Request, env: Env) {
  if (await fromTheChecks(request, env)) return 'checks';
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`css-3d-lab:${day}:${ip}`));
  return [...new Uint8Array(bytes)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The project's own checks, which are not a visitor and have no share of a visitor's day.
 *
 * Every release and comparison runs from one laptop, so it counted as one visitor, used that
 * visitor's 3 minutes, and then refused the release itself: on 2026-10-06 and 2026-10-07 the share
 * was raised by hand for each run and put back after. The checks now send X-Release-Key, a secret
 * held as the Worker's RELEASE_KEY and in release-key.local on the machine that runs them (never
 * committed). A browser cannot send it: the header is not one this Worker allows across origins.
 * It skips the per-visitor share and nothing else -- the day, the month and the browsers at once
 * still count it, so the checks can never spend what the day does not have.
 */
async function fromTheChecks(request: Request, env: Env) {
  const key = (env as any).RELEASE_KEY as string | undefined;
  const sent = request.headers.get('X-Release-Key');
  if (!key || !sent) return false;
  const a = new TextEncoder().encode(key), b = new TextEncoder().encode(sent);
  if (a.byteLength !== b.byteLength) return false;
  // every byte compared, whatever the first difference: the time taken says nothing about the key
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A new browser, at the start time the budget handed out.
 *
 * Cloudflare allows one NEW browser every 20 s on the free plan and refuses one asked for sooner.
 * It does not say so usefully: on 2026-10-06 a second picture straight after a first was refused
 * with timeUntilNextAllowedBrowserAcquisition reading 0, so waiting for what it reported waited
 * for nothing. The spacing is therefore kept here, not asked for: the budget (src/budget.ts) gives
 * each export a slot at least 20 s after the last one, and the export waits for it before asking.
 * A refusal can still come (a launch that took longer than its slot, a clock a little off), and is
 * tried once more a whole spacing later: on 2026-10-06 the retry after 3 s was refused as well
 * and cardfan was never drawn. Queue and retry together stay inside the dialog's own watchdog.
 */
async function launchBrowser(env: Env) {
  try { return await launch(env.BROWSER); }
  catch (error) {
    if (!atBrowserLimit(error) || spentForToday(error)) throw error;
    await sleep(21_000);
    return await launch(env.BROWSER);
  }
}

/**
 * Whether Cloudflare refused because the day's browser time is used, in its own words ("Browser
 * time limit exceeded for today"), as opposed to "Too many requests" for a browser asked for too
 * soon. Read from the error, not guessed from the state: the guess (no wait reported, nothing
 * open) became true after every export once browsers were closed when done, and told a visitor
 * "out of exports for today" over a 20 s wait.
 */
function spentForToday(error: unknown) {
  return /time limit exceeded/i.test(String((error as Error)?.message ?? error));
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
      const verdict = await reserveBrowserTime(env, worstCase(payload.count), await visitorKey(request, env));
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
      if (verdict.waitMs) await sleep(verdict.waitMs);
      // From the moment a browser is ASKED for, not from when launch() returns: Cloudflare counts
      // from handing it over, and the launch was several seconds that this missed (2026-10-06:
      // three pictures of about 6 s each were counted as 12 s together). A launch that fails was
      // no browser at all, and is charged nothing.
      started = Date.now();
      const browser = await launchBrowser(env).catch((error) => { started = 0; settle(); throw error; });
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
        // Two very different things arrive here as one 429: a browser asked for too soon (wait a
        // moment) and a daily allowance that is spent (wait until tomorrow). Cloudflare's own
        // message says which; telling a visitor either one when it is the other is untrue.
        const seen = await limits(env.BROWSER).catch(() => null);
        console.error('At the browser limit:', JSON.stringify(seen));
        const wait = Math.ceil((seen?.timeUntilNextAllowedBrowserAcquisition ?? 0) / 1000);
        const spent = spentForToday(error);
        const say = spent
          ? 'out of exports for today — it resets tomorrow'
          // not known to be the day: say the likely thing, and what it means if it persists
          : `no browser free — try again in ${Math.max(20, wait)}s (if this keeps happening, today's export time is used up)`;
        return new Response(say, { status: 429, headers: { ...headers, 'Retry-After': String(Math.max(1, wait || 60)) } });
      }
      return new Response('The rendering service is unavailable', { status: 503, headers });
    }
  },
} satisfies ExportedHandler<Env>;
