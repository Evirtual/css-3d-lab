/**
 * A HARD CEILING ON WHAT THIS WORKER CAN SPEND, COUNTED SOMEWHERE THAT CAN ACTUALLY COUNT.
 *
 * Cloudflare bills Browser Rendering by browser time and does not offer a spend cap: on a paid
 * plan, an account that gets hammered keeps rendering and keeps billing. The answer to "I do not
 * want to wake up to a ten thousand dollar bill" therefore cannot be a notification. It has to be
 * something that REFUSES.
 *
 * WHY NOT THE RATE LIMITING BINDING, which this Worker already has. Cloudflare's own documentation
 * rules it out for this job, three ways:
 *
 *   - its period "must be either 10 or 60" seconds, so it cannot express a day or a month;
 *   - "for each unique key you pass to your rate limiting binding, there is a unique limit per
 *     Cloudflare location", so a 120/minute limit is 120 per minute IN EVERY CITY, not in total;
 *   - it is "permissive, eventually consistent, and intentionally designed to not be used as an
 *     accurate accounting system" -- their words.
 *
 * It is a fine burst guard and a useless accountant. EXPORT_LIMIT stays for what it is good at.
 *
 * A Durable Object is the opposite: one instance, one thread, strongly consistent, and available
 * on the Free plan with the SQLite backend. Every request for a browser passes through this one
 * object, so the count is a real count.
 *
 * WHAT IS COUNTED IS BROWSER SECONDS, because that is what Cloudflare charges for. It is counted
 * PESSIMISTICALLY: a launched browser is charged for its whole keep-alive window up front, whether
 * or not anybody uses it again. Over-counting means the real bill is always at or under the cap,
 * which is the only direction that makes a cap worth having. Connecting to a browser that is
 * already up costs nothing here, because its time has already been paid for.
 *
 * AND IT FAILS CLOSED. If this object cannot be reached or cannot answer, the Worker refuses to
 * render. Spending money you cannot count is exactly the thing being prevented.
 */

export interface BudgetVerdict {
  ok: boolean;
  /** Seconds committed so far in the window that refused, and its ceiling. */
  usedDay: number;
  capDay: number;
  usedMonth: number;
  capMonth: number;
  /** Which window said no: 'day', 'month', or null when nothing did. */
  hit: 'day' | 'month' | null;
  /** Seconds until the window that refused rolls over. */
  resetsIn: number;
}

const DAY = 86_400;

/** UTC day and month keys. Cloudflare's own free-tier counters reset at 00:00 UTC, so these agree. */
const keysFor = (now: Date) => ({
  day: now.toISOString().slice(0, 10),      // 2026-09-29
  month: now.toISOString().slice(0, 7),     // 2026-09
});

/** Seconds until the next UTC midnight, and until the first of the next UTC month. */
function rollovers(now: Date) {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const firstOfNext = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return {
    day: Math.max(1, Math.round((midnight - now.getTime()) / 1000)),
    month: Math.max(1, Math.round((firstOfNext - now.getTime()) / 1000)),
  };
}

export class ExportBudget implements DurableObject {
  #sql: SqlStorage;

  constructor(state: DurableObjectState, private env: Env) {
    this.#sql = state.storage.sql;
    /*
     * One row per window, not one row per request. A ledger of every export would be the honest
     * shape and would grow without bound in an object whose whole job is to be cheap and always
     * available; the counter is what the decision needs.
     */
    this.#sql.exec(`CREATE TABLE IF NOT EXISTS spent (
      window TEXT PRIMARY KEY,
      seconds REAL NOT NULL DEFAULT 0
    )`);
  }

  /** What the caps are, from vars, so they can be changed without a code change. */
  #caps() {
    const num = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    /*
     * Defaults are set so that the MONTHLY ceiling sits inside the 10 browser-hours that Workers
     * Paid includes: 9.5 hours, leaving room for the estimate being an estimate. Staying under it
     * is what makes the bill $5 and nothing else, by construction rather than by watching.
     *
     * The daily ceiling exists so one bad afternoon cannot eat the month before anybody notices.
     */
    return {
      day: num((this.env as any).DAILY_BROWSER_SECONDS, 1_800),      // 30 minutes
      month: num((this.env as any).MONTHLY_BROWSER_SECONDS, 34_200), // 9.5 hours
    };
  }

  #used(window: string): number {
    const row = [...this.#sql.exec('SELECT seconds FROM spent WHERE window = ?', window)][0];
    return Number(row?.seconds ?? 0);
  }

  #add(window: string, seconds: number) {
    this.#sql.exec(
      `INSERT INTO spent (window, seconds) VALUES (?, ?)
       ON CONFLICT(window) DO UPDATE SET seconds = seconds + excluded.seconds`,
      window, seconds,
    );
  }

  /**
   * Commit `seconds` of browser time if both windows can carry it, and say so either way.
   *
   * All-or-nothing: a reservation that partly succeeded would leave the day charged for a browser
   * the month refused to allow, and the next request would be refused over time nobody spent.
   */
  #reserve(seconds: number, now: Date): BudgetVerdict {
    const k = keysFor(now);
    const caps = this.#caps();
    const reset = rollovers(now);
    const usedDay = this.#used(k.day);
    const usedMonth = this.#used(k.month);
    const overDay = usedDay + seconds > caps.day;
    const overMonth = usedMonth + seconds > caps.month;
    const hit = overMonth ? 'month' : overDay ? 'day' : null;
    if (!hit) {
      this.#add(k.day, seconds);
      this.#add(k.month, seconds);
    }
    return {
      ok: !hit,
      usedDay: usedDay + (hit ? 0 : seconds),
      capDay: caps.day,
      usedMonth: usedMonth + (hit ? 0 : seconds),
      capMonth: caps.month,
      hit,
      resetsIn: hit === 'month' ? reset.month : hit === 'day' ? reset.day : reset.day,
    };
  }

  /**
   * Give back the difference when a browser cost less than it was charged for.
   *
   * The charge is the worst case -- a whole keep-alive window -- and most browsers are released
   * sooner than that. Refunding what was not used keeps the ceiling from being far stricter in
   * practice than it says it is, which would be its own kind of untruth: a cap that says 30
   * minutes and delivers 8 is not a 30 minute cap.
   */
  #refund(seconds: number, now: Date) {
    if (!(seconds > 0)) return;
    const k = keysFor(now);
    this.#add(k.day, -seconds);
    this.#add(k.month, -seconds);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const now = new Date();
    const seconds = Number(url.searchParams.get('seconds') ?? 0);
    if (url.pathname === '/reserve') {
      if (!Number.isFinite(seconds) || seconds <= 0) return Response.json({ ok: false, hit: 'day', usedDay: 0, capDay: 0, usedMonth: 0, capMonth: 0, resetsIn: 60 });
      return Response.json(this.#reserve(seconds, now));
    }
    if (url.pathname === '/refund') {
      this.#refund(seconds, now);
      return Response.json({ ok: true });
    }
    if (url.pathname === '/state') {
      const k = keysFor(now);
      const caps = this.#caps();
      return Response.json({
        usedDay: this.#used(k.day), capDay: caps.day,
        usedMonth: this.#used(k.month), capMonth: caps.month,
        resetsIn: rollovers(now).day,
      });
    }
    return new Response('Not found', { status: 404 });
  }
}
