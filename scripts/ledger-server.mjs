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
 * string, and anything not on the list is refused. One run at a time, so pressing a button twice
 * cannot put two of them on the same machine.
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

let running = null; // { what, startedAt, child }

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
  if (running) return { running: running.what, label: running.label, models: running.models ?? [], startedAt: running.startedAt, pid: running.child.pid, paused: paused(), mine: true };
  const other = runningCheck(ROOT);
  // Not ours, so there is no pid here to stop: the buttons say so rather than offering a Stop that
  // would do nothing.
  if (other) return { running: other.check, label: other.check, models: [], startedAt: null, pid: null, paused: paused(), mine: false, done: other.done, total: other.total };
  return { running: null, label: null, models: [], startedAt: null, pid: null, paused: paused(), mine: false };
}

function start(what, models = []) {
  if (running) return { ok: false, why: `${running.what} is already running` };
  const base = RUNNABLE.get(what);
  if (!base) return { ok: false, why: `not a check: ${String(what).slice(0, 40)}` };
  const known = knownModels();
  const bad = models.filter((id) => !known.has(id));
  if (bad.length) return { ok: false, why: `not a model: ${bad.slice(0, 3).join(', ')}` };
  // exports over a named model is a defaults run: the full matrix is 38 minutes for one model
  const args = what === 'exports' && models.length ? ['--defaults', ...models] : models;
  const argv = [...base, ...args];
  // No shell, and argv comes from the registry rather than from the page.
  setPaused(false);
  // detached on anything but Windows, so the child leads its own process group: stop() signals
  // -pid to take the browsers with it, and that only works on a group leader. Without it the
  // signal went nowhere, the fallback killed Node alone, and every browser it had opened stayed
  // up holding memory. Windows has no process groups to speak of; taskkill /T walks the tree.
  const child = spawn(process.execPath, argv, { cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true, stdio: 'ignore', detached: process.platform !== 'win32' });
  const label = models.length === 1 ? `${what} on ${models[0]}`
    : models.length ? `${what} on ${models.length} models`
    : what;
  running = { what, label, models, startedAt: new Date().toISOString(), child };
  console.log(`${new Date().toTimeString().slice(0, 8)} board: started ${label} (pid ${child.pid})`);
  child.on('close', (code) => {
    console.log(`${new Date().toTimeString().slice(0, 8)} board: ${what} ended, exit ${code}`);
    running = null;
  });
  return { ok: true, ...state() };
}

/**
 * Stops the run, and everything it started.
 *
 * A check is a Node process that opens browsers, so killing the Node alone leaves the browsers
 * behind holding memory. On Windows taskkill /T takes the tree; elsewhere the process group does.
 */
function stop() {
  if (!running) return { ok: false, why: 'nothing is running' };
  const { child, what } = running;
  setPaused(false);
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGTERM');
  } catch { try { child.kill('SIGTERM'); } catch { /* it had already gone */ } }
  return { ok: true, stopped: what };
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
      const r = stop();
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
