/**
 * Serves the ledger page, and runs the checks when the page asks.
 *
 * WHY THIS EXISTS
 *
 * The ledger has to stand on its own. Somebody who clones this repository should be able to run one
 * command, open a page, press a button, and be told whether the app is ready to ship -- without an
 * AI, without knowing which script does what, and without a second dev server running just so the
 * page has somewhere to be served from.
 *
 *   npm run board      then open the address it prints
 *
 * Nothing here knows anything about how the app was built. That is somebody else's business.
 *
 * WHAT IT WILL RUN
 *
 * Only a check named in scripts/checks-registry.mjs, or the whole run. The name arrives from the
 * page and is looked up in that list; it is never passed to a shell, never interpolated into a
 * string, and anything not on the list is refused.
 *
 * HOW MANY AT ONCE
 *
 * Several, but not any several. Checking one model while another model's check runs is a thing you
 * actually want, and refusing it made the board slower than the terminal it replaced. Two rules
 * hold, and they are not preferences:
 *
 *   One run per check.  Every run of a check rewrites that check's own result file, docs/checks/
 *                       <key>.json, with the verdicts it gathered. Two runs of the same check
 *                       finish in some order and the later one wins the whole file -- so the first
 *                       run's work is not merged, it is deleted, and the board would show a green
 *                       tick for models nothing had judged. This is exactly the class of lie the
 *                       ledger exists to catch, so the second run is refused instead.
 *   "Everything" runs alone.  The whole run walks every check in turn and rewrites every one of
 *                       those files, so anything beside it hits the rule above sooner or later.
 *
 * On top of those there is a limit on how many at once, because each check drives a real browser
 * over real models and this is somebody's laptop. BOARD_MAX_RUNS moves it; the default is two.
 *
 * It listens on 127.0.0.1 only. This is a local tool for the person sitting at the machine.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { ROOT } from './model-sources.mjs';
import { REGISTRY } from './checks-registry.mjs';
import { runningCheck } from './running.mjs';
import { existsSync, writeFileSync as write, rmSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';

const DOCS = join(ROOT, 'docs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8' };

/** Every name the page may ask for, and what each one actually runs. */
const RUNNABLE = new Map(REGISTRY.map((c) => [c.key, ['scripts/capture-check.mjs', c.key]]));
RUNNABLE.set('all', ['scripts/verify.mjs']);

/**
 * Every model id there is, read once, so an id that arrived from the page can be checked against
 * something real before it becomes an argument.
 *
 * Same rule as the check names: the page may ASK for anything, and only a name that exists in this
 * repository is ever passed on. Nothing reaches a shell either way, but an unchecked id would still
 * let a caller put arbitrary text on a command line, and there is no reason to allow that.
 */
let KNOWN_MODELS = null;
function knownModels() {
  if (KNOWN_MODELS) return KNOWN_MODELS;
  try {
    const ids = JSON.parse(readFileSync(join(ROOT, 'src', 'generated', 'model-ids.json'), 'utf8'));
    KNOWN_MODELS = new Set(ids.map((d) => d.id));
  } catch { KNOWN_MODELS = new Set(); }
  return KNOWN_MODELS;
}

/**
 * Pausing is a flag file, not a suspended process.
 *
 * Suspending works on Linux and macOS and has no native equivalent on Windows, and it would stop a
 * check in the middle of driving a browser. The checks look at this file between models, in
 * BrowserGuard.run, which is the one moment when nothing is half-finished. So pausing takes effect
 * at the end of the model in flight, not instantly -- and a browser is never left wedged.
 */
const PAUSE_FILE = join(ROOT, '.media-tmp', 'runs', 'paused');
const paused = () => existsSync(PAUSE_FILE);
function setPaused(on) {
  if (on) { mkdirSync(join(ROOT, '.media-tmp', 'runs'), { recursive: true }); write(PAUSE_FILE, new Date().toISOString()); }
  else { try { rmSync(PAUSE_FILE); } catch { /* already gone */ } }
  return { ok: true, paused: on };
}

/** what -> { what, label, models, startedAt, child }. Keyed by check, which is the thing that can
    only have one of itself: see HOW MANY AT ONCE above. */
const runs = new Map();
const MAX_RUNS = Math.max(1, Number(process.env.BOARD_MAX_RUNS ?? 2) || 2);

/**
 * A run this server did not start.
 *
 * Checks are also started from a terminal, or by the overnight chain, and capture-check flags the
 * check's own result file while it works. Reporting only what THIS process spawned put "Nothing
 * running" on the page directly above the ledger's own "media running 58/135" -- two notions of
 * running on one screen, which is the confusion the whole board exists to remove. So the answer is
 * the same either way: something is running, and here is what.
 */
function state() {
  const mine = [...runs.values()].map((r) => ({
    what: r.what, label: r.label, models: r.models ?? [], startedAt: r.startedAt, pid: r.child.pid, mine: true,
  }));
  const out = { runs: mine, paused: paused(), max: MAX_RUNS };
  // A run this server did not start: checks are also started from a terminal, and capture-check
  // flags the check's own result file while it works. Reporting only what THIS process spawned put
  // "Nothing running" on the page directly above the ledger's own "media running 58/135" -- two
  // notions of running on one screen, which is the confusion the board exists to remove.
  const other = runningCheck(ROOT);
  // Not ours, so there is no pid here to stop: the page offers pause, which is a file both watch,
  // and does not offer a Stop that would do nothing.
  if (other && !runs.has(other.check)) out.runs.push({ what: other.check, label: other.check, models: [], startedAt: null, pid: null, mine: false, done: other.done, total: other.total });
  return out;
}

/** Why this run cannot start, in the words the page will show, or null if it can. */
function refuse(what) {
  if (runs.has(what)) return `${what} is already running`;
  if (runs.has('all')) return 'the whole run is going: it covers every check, so nothing can run beside it';
  if (what === 'all' && runs.size) return `${[...runs.keys()].join(' and ')} ${runs.size === 1 ? 'is' : 'are'} running: the whole run covers every check, so it waits for them`;
  if (runs.size >= MAX_RUNS) return `${runs.size} checks are already running, which is the limit on this machine`;
  const other = runningCheck(ROOT);
  if (other && (other.check === what || what === 'all')) return `${other.check} is running, started outside this board`;
  return null;
}

function start(what, models = []) {
  const base = RUNNABLE.get(what);
  if (!base) return { ok: false, why: `not a check: ${String(what).slice(0, 40)}` };
  const no = refuse(what);
  if (no) return { ok: false, why: no };
  const known = knownModels();
  const bad = models.filter((id) => !known.has(id));
  if (bad.length) return { ok: false, why: `not a model: ${bad.slice(0, 3).join(', ')}` };
  /*
   * exports is always a defaults run, and always names its models.
   *
   * Two traps, and the board fell into both while the gate avoided them:
   *
   *   Without --defaults it runs the whole settings matrix, which is about 38 minutes for ONE
   *   model. Pressing the Export column -- every model, no ids -- would have asked for days of
   *   work. What the per-model verdict actually counts is the dialog's default settings, which
   *   is what --defaults makes.
   *
   *   Without ids, check-exports falls back to its own eight-model sample and reports that as
   *   the lot. That is exactly how 127 export verdicts came to sit two days stale through a week
   *   of font changes -- the one thing exports judge -- while the column read a confident 8.
   *
   * scripts/verify.mjs has always done both (argsFor). This is the same rule, so the button and
   * the gate ask for the same run.
   */
  const args = what === 'exports'
    ? ['--defaults', ...(models.length ? models : [...knownModels()])]
    : models;
  const argv = [...base, ...args];
  // No shell, and argv comes from the registry rather than from the page.
  // The pause flag is one file that every check watches, so clearing it here would resume runs the
  // presser said nothing about. It is cleared only when there is nothing else to resume.
  if (!runs.size) setPaused(false);
  // detached on anything but Windows, so the child leads its own process group: stop() signals
  // -pid to take the browsers with it, and that only works on a group leader. Without it the
  // signal went nowhere, the fallback killed Node alone, and every browser it had opened stayed
  // up holding memory. Windows has no process groups to speak of; taskkill /T walks the tree.
  const child = spawn(process.execPath, argv, { cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true, stdio: 'ignore', detached: process.platform !== 'win32' });
  const label = models.length === 1 ? `${what} on ${models[0]}`
    : models.length ? `${what} on ${models.length} models`
    : what;
  runs.set(what, { what, label, models, startedAt: new Date().toISOString(), child });
  console.log(`${new Date().toTimeString().slice(0, 8)} board: started ${label} (pid ${child.pid})`);
  child.on('close', (code) => {
    console.log(`${new Date().toTimeString().slice(0, 8)} board: ${what} ended, exit ${code}`);
    runs.delete(what);
  });
  return { ok: true, ...state() };
}

/**
 * Stops the run, and everything it started.
 *
 * A check is a Node process that opens browsers, so killing the Node alone leaves the browsers
 * behind holding memory. On Windows taskkill /T takes the tree; elsewhere the process group does.
 */
function stop(what) {
  // A named check stops that one; no name stops the lot, which is what a Stop beside "everything"
  // means. Either way only runs this server started can be stopped: there is no pid for the others.
  const targets = what ? [runs.get(what)].filter(Boolean) : [...runs.values()];
  if (!targets.length) return { ok: false, why: what ? `${what} is not running here` : 'nothing is running here' };
  for (const { child } of targets) {
    try {
      if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      else process.kill(-child.pid, 'SIGTERM');
    } catch { try { child.kill('SIGTERM'); } catch { /* it had already gone */ } }
  }
  // Pausing is one flag for the whole machine, so it is only lifted when the last run has gone.
  if (targets.length === runs.size) setPaused(false);
  return { ok: true, stopped: targets.map((t) => t.what) };
}

const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };

async function serveFile(res, url) {
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  const path = join(DOCS, rel === '' ? 'ledger.html' : rel);
  // never outside docs/, whatever the url said
  if (!path.startsWith(DOCS)) { res.writeHead(403).end('outside docs/'); return; }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); }
}

export function serve(port = 5178) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/api/state') return json(res, 200, state());
    if (url.pathname === '/api/run' && req.method === 'POST') {
      const what = url.searchParams.get('check') ?? '';
      const models = (url.searchParams.get('models') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
      const r = start(what, models);
      return json(res, r.ok ? 200 : 409, r);
    }
    if (url.pathname === '/api/pause' && req.method === 'POST') return json(res, 200, setPaused(true));
    if (url.pathname === '/api/resume' && req.method === 'POST') return json(res, 200, setPaused(false));
    if (url.pathname === '/api/stop' && req.method === 'POST') {
      const r = stop(url.searchParams.get('check') || null);
      return json(res, r.ok ? 200 : 409, r);
    }
    if (url.pathname === '/api/checks') return json(res, 200, { checks: REGISTRY.map((c) => ({ key: c.key, name: c.name, short: c.short, scope: c.scope })) });
    if (req.method !== 'GET') { res.writeHead(405).end('GET only'); return; }
    await serveFile(res, url);
  });
  return new Promise((resolve) => {
    server.on('error', (e) => { console.error(`board: could not listen on ${port}: ${e.message}`); resolve(null); });
    server.listen(port, '127.0.0.1', () => resolve({ port, close: () => server.close() }));
  });
}

export const isRunning = () => state();
