/**
 * A HARD CEILING ON WHAT THIS WORKER CAN SPEND, COUNTED SOMEWHERE THAT CAN ACTUALLY COUNT.
 *
 * Cloudflare bills Browser Run by browser time and does not offer a spend cap: on a paid plan, an
 * account that gets hammered keeps rendering and keeps billing. The answer to "I do not want to
 * wake up to a ten thousand dollar bill" therefore cannot be a notification. It has to be
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
 * on the Free plan with the SQLite backend. Every export passes through this one object, so the
 * count is a real count.
 *
 * WHAT IS COUNTED IS EACH EXPORT'S OWN BROWSER TIME, reserved before and settled after.
 *
 * Until 2026-10-05 this charged 180 s when a browser was launched and nothing when an export
 * reused one already open. That under-counted without limit: the largest export the service
 * accepts can keep a browser busy for about sixteen minutes, and back-to-back exports on a reused
 * browser cost the counter nothing. On the free plan Cloudflare's own ten minutes a day hid it; on
 * a paid plan it would have been a bill this object never saw. Now every export gets its own
 * browser, closed when it is done, and:
 *
 *   reserve   before a browser is opened, its WORST CASE (the render's own deadline plus the time
 *             a browser that failed to close would idle before Cloudflare ends it), held as in
 *             flight: the month counts it until it finishes
 *   settle    after it is closed, what it really took, which is what the day, the month and the
 *             visitor are charged
 *
 * A reservation that is never settled (the Worker died mid-export) is charged its whole worst case
 * once that has passed, and its slot is freed. Over-counting is the only safe direction.
 *
 * FOUR THINGS CAN SAY NO, and they are not equally strict, on purpose:
 *
 *   month     STRICT: the whole worst case must fit. This is the money: the monthly ceiling sits
 *             inside the hours a paid plan includes, so nothing past it is ever billed.
 *   busy      STRICT: no more browsers open at once than MAX_BROWSERS. Cloudflare bills browsers
 *             open at once separately ($2 each above 10, averaged); this keeps it well under.
 *   day       allowed while ANY of the day is left, counting what finished. The worst case of a
 *             30 s video is far more than it really costs, and a strict check would refuse videos
 *             with most of the day unspent. The overshoot is bounded: one export per open browser.
 *   visitor   the same, per visitor: one address cannot spend everybody's day. Addresses are kept
 *             only as a salted hash, for the day they are counted in, and deleted after it.
 *
 * AND IT FAILS CLOSED. If this object cannot be reached or cannot answer, the Worker refuses to
 * render. Spending money you cannot count is exactly the thing being prevented.
 */

export type BudgetHit = 'day' | 'month' | 'busy' | 'visitor';

export interface BudgetVerdict {
  ok: boolean;
  /** The reservation to settle when the browser is closed; only when ok. */
  id?: string;
  /** Which limit said no, or null when nothing did. */
  hit: BudgetHit | null;
  /** Seconds until the limit that refused lets go: the UTC rollover, or a guess at a free slot. */
  resetsIn: number;
  /** How long to wait before asking Cloudflare for the browser: this export's start slot. */
  waitMs?: number;
}

/** The longest an export waits in line for its turn to open a browser before it is told "busy". */
const MAX_WAIT = 45_000;

/** UTC day and month keys. Cloudflare's own counters reset at 00:00 UTC, so these agree. */
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
     * One row per window, not one row per export. A ledger of every export would be the honest
     * shape and would grow without bound in an object whose whole job is to be cheap and always
     * available; the counter is what the decision needs. Visitor windows are 'who:<day>:<hash>'
     * and are deleted once their day is over.
     */
    this.#sql.exec(`CREATE TABLE IF NOT EXISTS spent (
      window TEXT PRIMARY KEY,
      seconds REAL NOT NULL DEFAULT 0
    )`);
    // Exports in flight: what each reserved, against which windows, and when its worst case ends.
    this.#sql.exec(`CREATE TABLE IF NOT EXISTS active (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      month TEXT NOT NULL,
      who TEXT NOT NULL,
      seconds REAL NOT NULL,
      until INTEGER NOT NULL
    )`);
  }

  /** What the limits are, from vars, so they can be changed without a code change. */
  limits() {
    const num = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const env = this.env as any;
    /*
     * Defaults are set so that the MONTHLY ceiling sits inside the 10 browser hours that Workers
     * Paid includes: 9.5 hours. Staying under it is what makes the bill $5 and nothing else, by
     * construction rather than by watching. wrangler.jsonc sets the real values per plan.
     */
    const day = num(env.DAILY_BROWSER_SECONDS, 1_800);
    return {
      day,
      month: num(env.MONTHLY_BROWSER_SECONDS, 34_200),
      browsers: num(env.MAX_BROWSERS, 3),
      visitor: num(env.VISITOR_DAILY_SECONDS, Math.round(day / 3)),
      // Cloudflare's own spacing between NEW browsers: one every 20 s on the free plan (plus half a
      // second of margin), three a second on a paid one, where it is not worth queueing for.
      launchEvery: env.NEW_BROWSER_SECONDS !== undefined ? Math.max(0, Number(env.NEW_BROWSER_SECONDS) || 0)
        : (env.PLAN ?? 'free') === 'free' ? 20.5 : 0,
    };
  }

  #used(window: string): number {
    const row = [...this.#sql.exec('SELECT seconds FROM spent WHERE window = ?', window)][0];
    return Number(row?.seconds ?? 0);
  }

  #add(window: string, seconds: number) {
    this.#sql.exec(
      `INSERT INTO spent (window, seconds) VALUES (?, ?)
       ON CONFLICT(window) DO UPDATE SET seconds = MAX(0, seconds + excluded.seconds)`,
      window, seconds,
    );
  }

  /**
   * In flight now. An export whose worst case has passed without being settled (the Worker died
   * mid-export) is charged that whole worst case here, and its slot is freed.
   */
  #active(now: number): number {
    for (const row of [...this.#sql.exec('SELECT day, month, who, seconds FROM active WHERE until < ?', now)]) {
      for (const w of [row.day, row.month, row.who]) this.#add(String(w), Number(row.seconds));
    }
    this.#sql.exec('DELETE FROM active WHERE until < ?', now);
    return Number([...this.#sql.exec('SELECT COUNT(*) AS n FROM active')][0]?.n ?? 0);
  }

  /** The worst cases of the exports still running, against one month. */
  #inFlight(month: string): number {
    return Number([...this.#sql.exec('SELECT COALESCE(SUM(seconds), 0) AS s FROM active WHERE month = ?', month)][0]?.s ?? 0);
  }

  #reserve(seconds: number, who: string, now: Date): BudgetVerdict {
    const k = keysFor(now);
    const lim = this.limits();
    const reset = rollovers(now);
    // yesterday's visitors are nobody's business today
    this.#sql.exec("DELETE FROM spent WHERE window LIKE 'who:%' AND window NOT LIKE ?", `who:${k.day}:%`);
    const whoKey = `who:${k.day}:${who}`;
    /*
     * SPENT IS WHAT FINISHED, AT ITS REAL TIME; IN FLIGHT IS WHAT IS RUNNING, AT ITS WORST CASE.
     * Only the month counts both: it is the money, and a running export could still take its worst
     * case. The day and a visitor's share count what finished. When they counted the worst cases
     * too (2026-10-06), two pictures in flight -- 151 s each, against about 6 s real -- filled a
     * visitor's 190 s, and a third was told the share was used after 26 s of it had been.
     */
    const running = this.#active(now.getTime());
    const hit: BudgetHit | null =
      this.#used(k.month) + this.#inFlight(k.month) + seconds > lim.month ? 'month'
      : running >= lim.browsers ? 'busy'
      : this.#used(k.day) >= lim.day ? 'day'
      : this.#used(whoKey) >= lim.visitor ? 'visitor'
      : null;
    if (hit) return { ok: false, hit, resetsIn: hit === 'month' ? reset.month : hit === 'busy' ? 30 : reset.day };
    // A start time, handed out here so that two exports never ask Cloudflare for a new browser
    // closer together than the plan allows. Each one moves the next slot on, so exports that arrive
    // together queue instead of being refused; a queue longer than MAX_WAIT is "busy".
    const at = now.getTime();
    const slot = Math.max(at, this.#used('launch:next'));
    const waitMs = slot - at;
    if (waitMs > MAX_WAIT) return { ok: false, hit: 'busy', resetsIn: Math.ceil(waitMs / 1000) };
    if (lim.launchEvery > 0) this.#set('launch:next', slot + lim.launchEvery * 1000);
    const id = crypto.randomUUID();
    this.#sql.exec('INSERT INTO active (id, day, month, who, seconds, until) VALUES (?, ?, ?, ?, ?, ?)',
      id, k.day, k.month, whoKey, seconds, slot + seconds * 1000);
    return { ok: true, id, hit: null, resetsIn: reset.day, waitMs };
  }

  #set(window: string, value: number) {
    this.#sql.exec(
      `INSERT INTO spent (window, seconds) VALUES (?, ?)
       ON CONFLICT(window) DO UPDATE SET seconds = excluded.seconds`,
      window, value,
    );
  }

  /** What the browser really took, charged to the windows its reservation was made in. */
  #settle(id: string, used: number) {
    const row = [...this.#sql.exec('SELECT day, month, who FROM active WHERE id = ?', id)][0];
    if (!row) return; // settled already, or its worst case passed and it was charged in full
    this.#sql.exec('DELETE FROM active WHERE id = ?', id);
    const real = Math.max(0, used);
    if (real > 0) for (const w of [row.day, row.month, row.who]) this.#add(String(w), real);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const now = new Date();
    const q = url.searchParams;
    if (url.pathname === '/reserve') {
      const seconds = Number(q.get('seconds') ?? 0);
      if (!Number.isFinite(seconds) || seconds <= 0) return Response.json({ ok: false, hit: 'day', resetsIn: 60 });
      return Response.json(this.#reserve(seconds, q.get('who') ?? 'unknown', now));
    }
    if (url.pathname === '/settle') {
      this.#settle(q.get('id') ?? '', Number(q.get('used') ?? 0));
      return Response.json({ ok: true });
    }
    if (url.pathname === '/state') {
      const k = keysFor(now);
      const lim = this.limits();
      return Response.json({
        usedDay: this.#used(k.day), capDay: lim.day,
        usedMonth: this.#used(k.month), capMonth: lim.month,
        inFlight: this.#inFlight(k.month),
        active: this.#active(now.getTime()), maxBrowsers: lim.browsers,
        visitorDay: lim.visitor,
        resetsIn: rollovers(now).day,
      });
    }
    return new Response('Not found', { status: 404 });
  }
}
