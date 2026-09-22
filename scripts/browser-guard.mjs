/**
 * Keeps a long browser-driven check going when its browser breaks. Used by check-models,
 * check-stages, check-motion, check-access, check-media, check-exports and qa. Not run on its own.
 *
 * Why: in a recorded motion run the laptop fell to 0.4 GB free, one screenshot failed ("Unable to
 * capture screenshot"), and from then on every model in that process failed with
 * "page.setContent: Timeout 30000ms exceeded", even after memory had come back: one bad moment
 * poisoned the rest of the run. Another run died inside Playwright itself ("Unexpected end of JSON
 * input") and said nothing. So, per model:
 *
 *  1. ISOLATION. guard.run(id, fn) runs one model. When it throws a browser-level error (a
 *     protocol error, a target or page crashed or closed, a goto or setContent timeout, "Unable to
 *     capture screenshot", the browser disconnected: isBrowserError), or it returns but the browser
 *     is gone, that browser is closed (killed if it will not close), a fresh one is launched, and
 *     the model runs ONCE more. The check then says "retried after a browser failure". Only a
 *     second failure makes the model fail (or BROKE), and the next model gets a fresh browser too.
 *     Any other error is the check's or the model's own and is passed straight back, untouched.
 *  2. A FRESH BROWSER EVERY RELAUNCH_EVERY MODELS, so memory cannot creep up across a long run.
 *  3. A LOW-MEMORY GUARD. Before each model, free physical memory (os.freemem()) is read. Under
 *     MIN_FREE_GB, it waits, polling every POLL_S seconds for up to WAIT_S, and logs "waiting for
 *     memory: X GB free". Still low after that, the model runs anyway and its result says "ran under
 *     memory pressure". It never kills anything but its own browser.
 *  4. A CRASH IS SAID, NOT SWALLOWED. crashGuard(name, flush) catches an unhandled rejection or
 *     exception at process level, lets the check write or print what it has so far (flush), says
 *     CRASHED on stderr and exits 3. scripts/capture-check.mjs records each model as its line
 *     arrives, so a crash keeps every result printed before it. A rejection that is itself a
 *     browser-level error (a page event firing into a browser that just died) is logged and left
 *     to the model's own run, which fails on it and is retried.
 *
 * Several workers may share one guard (check-access, check-media and qa run models side by side in
 * one browser): a relaunch waits until no model is running in the old browser, and every worker
 * whose model broke in the same browser waits for the same relaunch.
 *
 * Messages about the browser go to stderr, prefixed "browser-guard:", so a check's own stdout lines
 * (which capture-check parses) are unchanged; the notes a model's result carries are the check's to
 * print, from what run() returns.
 *
 * Settings, for a run or a test (environment):
 *   C3D_RELAUNCH_EVERY=20   models per browser before a fresh one
 *   C3D_MIN_FREE_GB=1.5     the low-memory threshold (set it high to see the guard wait)
 *   C3D_MEM_WAIT_S=180      how long to wait for memory before running anyway
 *   C3D_FAULT=kill-after:3  kill the browser once, after the 3rd model finishes (a test of 1)
 *   C3D_FAULT=kill-during:3 kill the browser once, 3 seconds into the 3rd model
 *   C3D_FAULT=crash-after:3 throw an unhandled rejection after the 3rd model (a test of 4)
 */
import { freemem } from 'node:os';

// A fresh browser after this many models: a Chromium that has run 20 models is thrown away before
// its memory can grow across a 135-model run; relaunching costs about a second.
export const RELAUNCH_EVERY = Number(process.env.C3D_RELAUNCH_EVERY || 20);
// Under this much free physical memory a model waits before it starts: the broken run had 0.4 GB.
export const MIN_FREE_GB = Number(process.env.C3D_MIN_FREE_GB || 1.5);
const WAIT_S = Number(process.env.C3D_MEM_WAIT_S || 180);
const POLL_S = 10;
const CLOSE_MS = 10_000; // a browser that will not close in this long is killed

const log = (s) => console.error(`browser-guard: ${s}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gb = () => freemem() / 2 ** 30;
const first = (e) => String(e?.message ?? e).split('\n')[0];

/** Whether an error is the browser's (dead, crashed, hung, unreachable) rather than the check's or the model's. */
export function isBrowserError(e) {
  const m = String(e?.message ?? e);
  return /Protocol error|Target (page, context or browser )?(has been )?(closed|crashed)|Target crashed|Page crashed|Browser (has been )?(closed|disconnected)|browser has disconnected|Browser closed|Unable to capture screenshot|(page|frame)\.(setContent|goto|reload): Timeout|Navigation failed because page crashed|Connection closed|WebSocket (is not open|error)|has been closed/i.test(m);
}

/**
 * For a check's own `.catch(() => fallback)`: the fallback for the check's kind of failure (a
 * selector that never showed), but a browser-level error is thrown on, so the model is retried
 * rather than reported as "never appeared". `.catch(unlessBrowser(false))`
 */
export const unlessBrowser = (fallback) => (e) => {
  if (isBrowserError(e)) throw e;
  return fallback;
};

const fault = (() => {
  const m = /^(kill-after|kill-during|crash-after):(\d+)$/.exec(process.env.C3D_FAULT ?? '');
  return m ? { kind: m[1], n: Number(m[2]), done: false } : null;
})();

export class BrowserGuard {
  /**
   * launch: () => Promise<Browser>. setup: async (browser) => {}, run after every launch, to open
   * what the check keeps per browser (a shared context, a contact-sheet page, comparison pages).
   */
  constructor({ launch, setup = async () => {} }) {
    this.launchFn = launch;
    this.setup = setup;
    this.browser = null;
    this.pid = null;
    this.gen = 0; // which browser this is: 1 for the first
    this.inBrowser = 0; // models started in this browser
    this.active = 0; // models running now
    this.relaunching = null;
    this.stale = false; // the last model's retry broke too: the next one starts in a fresh browser
    this.finished = 0;
    this.launches = 0;
  }

  async start() {
    this.browser = await this.launchFn();
    this.gen++;
    this.launches++;
    this.inBrowser = 0;
    this.pid = null;
    try {
      const s = await this.browser.newBrowserCDPSession();
      const { processInfo } = await s.send('SystemInfo.getProcessInfo');
      this.pid = processInfo.find((p) => p.type === 'browser')?.id ?? null;
      await s.detach().catch(() => {});
    } catch {}
    await this.setup(this.browser);
    return this.browser;
  }

  /** Closes the browser, and kills it when it will not close. */
  async stop() {
    const b = this.browser;
    if (!b) return;
    this.browser = null;
    const closed = await Promise.race([b.close().then(() => true, () => false), sleep(CLOSE_MS).then(() => false)]);
    if (!closed && this.pid) { try { process.kill(this.pid); } catch {} }
  }

  /** A fresh browser, once per broken one, when no model is running in the old one. */
  async relaunch(gen, why) {
    if (this.relaunching) return this.relaunching;
    if (gen !== this.gen) return; // someone else already replaced it
    this.relaunching = (async () => {
      while (this.active > 0) await sleep(200);
      log(`${why}: a fresh browser (#${this.launches + 1})`);
      await this.stop();
      await this.start();
    })();
    try { await this.relaunching; } finally { this.relaunching = null; }
  }

  async memory(id) {
    let free = gb();
    if (free >= MIN_FREE_GB) return null;
    const until = Date.now() + WAIT_S * 1000;
    while (free < MIN_FREE_GB && Date.now() < until) {
      log(`waiting for memory: ${free.toFixed(2)} GB free (under ${MIN_FREE_GB} GB) before ${id}`);
      await sleep(POLL_S * 1000);
      free = gb();
    }
    if (free >= MIN_FREE_GB) { log(`memory back: ${free.toFixed(2)} GB free, going on with ${id}`); return null; }
    log(`still ${free.toFixed(2)} GB free after ${WAIT_S}s: ${id} runs under memory pressure`);
    return `ran under memory pressure (${free.toFixed(2)} GB free, under ${MIN_FREE_GB} GB)`;
  }

  async enter() {
    while (this.relaunching) await this.relaunching.catch(() => {});
    if (!this.browser) await this.relaunch(this.gen, 'no browser');
    else if (this.stale) { this.stale = false; await this.relaunch(this.gen, 'the last model broke its browser twice'); }
    else if (this.inBrowser >= RELAUNCH_EVERY) await this.relaunch(this.gen, `${this.inBrowser} models in this browser (periodic relaunch every ${RELAUNCH_EVERY})`);
    while (this.relaunching) await this.relaunching.catch(() => {});
    this.active++;
    this.inBrowser++;
    return this.gen;
  }

  kill(why) {
    log(`C3D_FAULT: killing the browser (pid ${this.pid ?? '?'}) ${why}`);
    if (this.pid) { try { process.kill(this.pid); return; } catch {} }
    this.browser?.close().catch(() => {});
  }

  /**
   * Runs fn(browser, notes) for one model, retried once in a fresh browser after a browser-level
   * failure. `notes` is the list of notes so far (memory pressure; a retry), for the check to put on
   * the model's line. Returns { value, notes }. Throws the error of a retry that broke too, or any
   * error that is not the browser's, with .notes on it.
   */
  async run(id, fn) {
    const notes = [];
    const pressure = await this.memory(id);
    if (pressure) notes.push(pressure);
    for (let attempt = 1; ; attempt++) {
      const gen = await this.enter();
      let timer = null;
      if (fault && !fault.done && fault.kind === 'kill-during' && this.finished + 1 === fault.n) {
        fault.done = true;
        timer = setTimeout(() => this.kill(`3s into ${id}, the model started after ${fault.n - 1} had finished`), 3000);
      }
      try {
        const value = await fn(this.browser, notes);
        if (!this.browser?.isConnected()) throw new Error('Browser disconnected during the model (it returned, but its browser is gone)');
        this.active--;
        clearTimeout(timer);
        this.finished++;
        if (fault && !fault.done && this.finished === fault.n) {
          fault.done = true;
          if (fault.kind === 'kill-after') this.kill(`after model ${fault.n} (${id})`);
          if (fault.kind === 'crash-after') setTimeout(() => Promise.reject(new Error(`C3D_FAULT: a deliberate crash after model ${fault.n}, standing in for one inside Playwright`)), 0);
        }
        return { value, notes };
      } catch (e) {
        this.active--;
        clearTimeout(timer);
        const browserFault = isBrowserError(e) || !this.browser?.isConnected();
        if (!browserFault) { e.notes = notes; throw e; }
        if (attempt >= 2) {
          log(`${id}: the retry broke too (${first(e)})`);
          this.stale = true;
          this.finished++;
          e.notes = notes;
          throw e;
        }
        log(`${id}: the browser failed (${first(e)}); retrying it once in a fresh browser`);
        notes.push(`retried after a browser failure (${first(e).slice(0, 120)})`);
        await this.relaunch(gen, `after ${id} broke its browser`);
      }
    }
  }

  async close() {
    while (this.relaunching) await this.relaunching.catch(() => {});
    await this.stop();
  }
}

/**
 * Process-level catch for a check: an unhandled rejection or exception writes what the check has
 * (flush) and exits 3 with a clear message on stderr, instead of dying silently. A browser-level
 * rejection is logged and left to the model's run (see 4 at the top).
 */
export function crashGuard(name, flush = async () => {}) {
  let crashing = false;
  const die = async (kind, err) => {
    if (!crashing && isBrowserError(err)) { log(`a stray ${kind} from a broken browser, left to the model's own retry: ${first(err)}`); return; }
    if (crashing) return;
    crashing = true;
    console.error(`\n${name}: CRASHED (${kind}): ${first(err)}`);
    if (err?.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    try { await flush(err); console.error(`${name}: the results printed before the crash are kept; the run stops here, exit 3.`); }
    catch (e) { console.error(`${name}: could not write the results so far: ${first(e)}`); }
    process.exit(3);
  };
  process.on('unhandledRejection', (r) => { die('unhandled rejection', r); });
  process.on('uncaughtException', (e) => { die('uncaught exception', e); });
}
