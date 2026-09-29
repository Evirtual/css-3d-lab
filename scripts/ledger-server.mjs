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
import { spawn, execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { cpus, freemem, totalmem } from 'node:os';
import { ROOT } from './model-sources.mjs';
import { REGISTRY } from './checks-registry.mjs';
import { JOBS, JOB, GATE_STEPS, blockedBy, whatIsNeeded } from './jobs.mjs';
import { statSync as statOf } from 'node:fs';
/*
 * THE RULES, AS THEY ARE ON DISK NOW. This process runs for hours and scripts/gate-paths.mjs is a
 * file somebody edits; imported once, its rules would be the ones from when the board started. It
 * is imported again whenever the file has changed, keyed by its modification time, so the step
 * list judges by the same rules a fresh process would.
 */
let rules = await import('./gate-paths.mjs');
let rulesAt = null;
async function freshRules() {
  let at = null;
  try { at = statOf(new URL('./gate-paths.mjs', import.meta.url)).mtimeMs; } catch { return; }
  if (at === rulesAt) return;
  if (rulesAt !== null) rules = await import(`./gate-paths.mjs?m=${at}`);
  rulesAt = at;
}
await freshRules();
const stepFingerprint = (...a) => rules.stepFingerprint(...a);
const fingerprintAt = (...a) => rules.fingerprintAt(...a);
const whatChanged = (...a) => rules.whatChanged(...a);
import { MIN_FREE_GB, MAX_BROWSERS } from './browser-guard.mjs';
import { runningCheck, runningChecks } from './running.mjs';
import { existsSync, writeFileSync as write, rmSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';

const DOCS = join(ROOT, 'docs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8' };

/** Every name the page may ask for, and what each one actually runs. */
const RUNNABLE = new Map(REGISTRY.map((c) => [c.key, ['scripts/capture-check.mjs', c.key]]));
RUNNABLE.set('all', ['scripts/verify.mjs']);
/*
 * And every other process this project has (scripts/jobs.mjs). The board could run a CHECK and
 * nothing else, so the gate, the live-site check, the renderer comparison and the export matrix
 * existed only as something to type -- which means they needed somebody who already knew the
 * command. Same guard as the checks: only a key from that list ever becomes an argument.
 */
for (const j of JOBS) RUNNABLE.set(`job:${j.key}`, j.argv);

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
/*
 * WHAT THE MACHINE HAS LEFT.
 *
 * Every check drives a fleet of real browsers over real models, and this is somebody's laptop. The
 * board already refuses some combinations (see refuse()), but a refusal explains itself only at the
 * moment you press a button. This is the number behind it, on screen the whole time.
 *
 * It is read here, once per poll, because the page asks this server for its state anyway. Nothing
 * is spawned to get it: os.freemem() and os.cpus() are counters the kernel already keeps.
 */
/*
 * Busy share of all cores, 0-1, sampled on a clock of its own.
 *
 * Measured between successive CALLS it was nonsense: two polls a millisecond apart divide a
 * near-zero window, and a laptop running twenty Chromium renderers reported 0%. The window has to
 * be the sampler's, not the caller's, so this ticks once a second and the reading is always the
 * last full second. unref() so it never holds the process open.
 */
const CPU_MS = 1000;
let cpuPrev = null, cpuNow = null;
const cpuTotals = () => cpus().reduce((a, c) => {
  for (const k of Object.keys(c.times)) a[k] = (a[k] ?? 0) + c.times[k];
  return a;
}, {});
setInterval(() => { cpuPrev = cpuNow; cpuNow = cpuTotals(); }, CPU_MS).unref();
cpuNow = cpuTotals();
function cpuBusy() {
  if (!cpuPrev || !cpuNow) return null;
  const total = Object.keys(cpuNow).reduce((s, k) => s + (cpuNow[k] - (cpuPrev[k] ?? 0)), 0);
  if (total <= 0) return null;
  return Math.min(1, Math.max(0, 1 - (cpuNow.idle - cpuPrev.idle) / total));
}

/*
 * Temperature, honestly.
 *
 * Windows exposes it through WMI's MSAcpi_ThermalZoneTemperature, which on most consumer laptops
 * is either missing or needs administrator rights -- so this asks ONCE, keeps the answer, and says
 * plainly that it is unavailable rather than showing a number it does not have. Spawning
 * PowerShell on every poll to learn that again would cost more than everything else here put
 * together.
 */
let temp = { c: null, why: 'not read yet' };
let temped = false;
function readTemp() {
  if (temped) return;
  temped = true;
  if (process.platform !== 'win32') { temp = { c: null, why: 'only read on Windows so far' }; return; }
  execFile('powershell', ['-NoProfile', '-Command',
    "try { (Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop | Select-Object -First 1).CurrentTemperature } catch { '' }"],
    { timeout: 8000, windowsHide: true }, (err, out) => {
      const raw = Number(String(out ?? '').trim());
      // WMI reports tenths of a kelvin
      if (!err && Number.isFinite(raw) && raw > 0) temp = { c: Math.round((raw / 10 - 273.15) * 10) / 10, why: null };
      else temp = { c: null, why: 'this machine does not expose it to WMI (usually needs admin, or the laptop has no ACPI thermal zone)' };
    });
}

/*
 * WHEN MEMORY IS LOW, SAY WHAT IS HOLDING IT.
 *
 * "0.4 GB free" is a number you cannot act on. On 2026-09-29 a gate step budgeted at two minutes
 * took fifty-three, because the machine had 0.39 GB free and browser-guard makes every model WAIT
 * under the floor. The board showed the 0.4 the whole time and never said why, so the run simply
 * looked broken -- and the first guess was that the checks themselves were the problem. They were
 * not: every node process this project had running came to 0.35 GB between them. A game in the
 * background was holding 3.11.
 *
 * So when free memory is under the floor, this names the largest holder. That is the difference
 * between a number and something a person can do something about, and it is the same three parts
 * the doctor uses: WHAT is slow, WHERE the memory went, WHY the run is waiting.
 *
 * It costs a PowerShell spawn, so it is sampled at most every 30 seconds and ONLY while low --
 * the state endpoint is polled every few seconds and paying for this on a healthy machine would
 * cost more than everything else on the page together, which is the rule readTemp() follows above.
 */
let hog = null;
let hogAt = 0;
let hogBusy = false;
function biggestUser(low) {
  if (!low) { hog = null; return; }
  if (process.platform !== 'win32') return;
  if (hogBusy || Date.now() - hogAt < 30000) return;
  hogBusy = true;
  hogAt = Date.now();
  execFile('powershell', ['-NoProfile', '-Command',
    "try { Get-Process | Group-Object ProcessName | ForEach-Object { '{0}|{1}' -f $_.Name, [math]::Round((($_.Group | Measure-Object WorkingSet64 -Sum).Sum/1GB),2) } | Sort-Object { [double]($_ -split '\\|')[1] } -Descending | Select-Object -First 1 } catch { '' }"],
    { timeout: 8000, windowsHide: true }, (err, out) => {
      hogBusy = false;
      const [name, gb] = String(out ?? '').trim().split('|');
      /* No answer is its own answer: a guess about where the memory went is worse than silence. */
      hog = !err && name && Number(gb) > 0 ? { name, gb: Number(gb) } : null;
    });
}

function machine() {
  readTemp();
  const free = freemem() / 2 ** 30, total = totalmem() / 2 ** 30;
  const busy = cpuBusy();
  return {
    memFreeGB: Math.round(free * 10) / 10,
    memTotalGB: Math.round(total * 10) / 10,
    floorGB: MIN_FREE_GB,
    // under the floor a model WAITS before it starts (browser-guard), so this is the number that
    // decides whether a second run helps or just makes both slower
    low: free < MIN_FREE_GB,
    /* Named only while low, and null until the first sample comes back. */
    hog: (biggestUser(free < MIN_FREE_GB), hog),
    cpuPercent: busy == null ? null : Math.round(busy * 100),
    cores: cpus().length,
    tempC: temp.c,
    tempWhy: temp.why,
    maxBrowsers: MAX_BROWSERS,
    maxRuns: MAX_RUNS,
  };
}

function state() {
  const mine = [...runs.values()].map((r) => ({
    what: r.what, label: r.label, models: r.models ?? [], startedAt: r.startedAt, pid: r.child.pid, mine: true,
    /*
     * WHAT THIS JOB IS EXPECTED TO COST, so its bar can say something true while it runs.
     *
     * A job is not a check: nothing writes per-model progress for it, so its bar had no numbers
     * and sat on "starting..." from the first second to the last. A run that says "starting" for
     * three minutes is a run that looks stuck, and it was read that way twice today -- once by me,
     * about a gate step that was working.
     *
     * There is no honest percentage to show, so none is shown. The estimate travels instead, and
     * the bar says elapsed against it, labelled as the estimate it is.
     */
    estMin: String(r.what).startsWith('job:') ? (JOB.get(String(r.what).slice(4))?.minutes ?? null) : null,
  }));
  const out = { runs: mine, paused: paused(), max: MAX_RUNS, machine: machine() };
  // A run this server did not start: checks are also started from a terminal, and capture-check
  // flags the check's own result file while it works. Reporting only what THIS process spawned put
  // "Nothing running" on the page directly above the ledger's own "media running 58/135" -- two
  // notions of running on one screen, which is the confusion the board exists to remove.
  // Not ours, so there is no pid here to stop: the page offers pause, which is a file both watch,
  // and does not offer a Stop that would do nothing. All of them, not the first found: two checks
  // started from a terminal had only one reported, and the other column drew a play button over
  // its own progress bar.
  for (const other of runningChecks(ROOT)) if (!runs.has(other.check)) out.runs.push({ what: other.check, label: other.check, models: [], startedAt: null, pid: null, mine: false, done: other.done, total: other.total, runner: other.runner ?? null });
  return out;
}

/** Why this run cannot start, in the words the page will show, or null if it can. */
// the checks that cannot share the machine, from the one place that says so
const ALONE = new Set(REGISTRY.filter((c) => c.alone).map((c) => c.key));

/*
 * A gate run covers every check, so nothing runs beside it -- and that was expressed as the
 * literal string "all". The jobs list adds three more ways to start one (the whole gate, the
 * checklist steps, the cheap ones), and a rule written as an equality check would have let a
 * second run start underneath any of them.
 */
const COVERS_ALL = (k) => k === 'all' || String(k).startsWith('job:gate');
function refuse(what) {
  if (runs.has(what)) return `${what} is already running`;
  // a check that measures speed needs an idle machine, in both directions
  const busy = [...runs.keys()].find((k) => ALONE.has(k));
  if (busy) return `${busy} is running and has to have the machine to itself: it measures how fast a model draws, so anything running beside it lands in its numbers`;
  if (ALONE.has(what) && runs.size) return `${what} measures how fast a model draws, so it waits for an idle machine: ${[...runs.keys()].join(' and ')} ${runs.size === 1 ? 'is' : 'are'} running`;
  const gate = [...runs.keys()].find(COVERS_ALL);
  if (gate) return `${gate === 'all' ? 'the whole run' : gate.replace('job:', '')} is going: it covers every check, so nothing can run beside it`;
  if (COVERS_ALL(what) && runs.size) return `${[...runs.keys()].join(' and ')} ${runs.size === 1 ? 'is' : 'are'} running: a gate run covers every check, so it waits for them`;
  if (runs.size >= MAX_RUNS) return `${runs.size} checks are already running, which is the limit on this machine`;
  const outside = runningChecks(ROOT);
  const aloneOutside = outside.find((o) => ALONE.has(o.check));
  if (aloneOutside) return `${aloneOutside.check} is running, started outside this board, and it has to have the machine to itself`;
  if (ALONE.has(what) && outside.length) return `${outside.map((o) => o.check).join(' and ')} ${outside.length === 1 ? 'is' : 'are'} running, started outside this board: ${what} measures how fast a model draws and waits for an idle machine`;
  const other = outside.find((o) => o.check === what) ?? (what === 'all' ? outside[0] : null);
  if (other) return `${other.check} is running, started outside this board`;
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
/** Ends a process and everything under it. A runner outlives its step, so the tree is the target. */
function killTree(pid) {
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-pid, 'SIGTERM');
    return true;
  } catch {
    try { process.kill(pid, 'SIGTERM'); return true; } catch { return false; }
  }
}

/*
 * Stopping a run this server did not start.
 *
 * A long run is started from a terminal, and until now the page could only pause it: the pid in a
 * check's result file is the CHECK, and killing that makes the runner move straight on to the next
 * step -- thirteen of them, so Stop would have looked broken twelve times.
 *
 * verify now tells each step who is running it (C3D_RUNNER / C3D_RUNNER_PID) and capture-check
 * records that, so there is a pid for the RUN. Killing its tree ends the runner and the step it is
 * on together, which is what Stop means to someone watching it.
 */
function stopForeign(what) {
  const r = runningCheck(ROOT, what);
  const runner = r?.runner;
  if (!runner?.pid) return { ok: false, why: `${what} was not started from here and does not say what is running it, so there is no run to stop` };
  const ok = killTree(runner.pid);
  return ok
    ? { ok: true, stopped: [what], run: runner.name, pid: runner.pid, whole: true }
    : { ok: false, why: `could not stop ${runner.name} (pid ${runner.pid}): it may have finished already` };
}

/*
 * Every run there is, whoever started it.
 *
 * "no name stops the lot" only ever meant the lot THIS SERVER started, so a Stop beside
 * "everything" left a terminal run going and said it had stopped everything. The board exists to
 * stop exactly that kind of sentence. Foreign runs are stopped through their runners, and a runner
 * is killed once however many of its steps are showing.
 */
function stopEverything() {
  const mine = [...runs.values()];
  for (const { child } of mine) killTree(child.pid);
  const seen = new Set();
  const foreign = [];
  for (const other of runningChecks(ROOT)) {
    if (runs.has(other.check)) continue;
    const pid = other.runner?.pid;
    if (!pid || seen.has(pid)) { if (!pid) foreign.push({ check: other.check, stopped: false }); continue; }
    seen.add(pid);
    foreign.push({ check: other.check, run: other.runner.name, pid, stopped: killTree(pid) });
  }
  if (mine.length) setPaused(false);
  const left = foreign.filter((f) => !f.stopped).map((f) => f.check);
  return {
    ok: Boolean(mine.length || seen.size),
    stopped: [...mine.map((t) => t.what), ...foreign.filter((f) => f.stopped).map((f) => f.check)],
    // said rather than swallowed: a check running with nothing that claims to be running it
    left: left.length ? left : undefined,
    why: !mine.length && !seen.size ? 'nothing is running that this page can stop' : undefined,
  };
}

function stop(what) {
  // A named check stops that one; no name stops every run there is, this server's or not.
  // A run this server did not start is stopped through its runner instead (stopForeign).
  if (!what) return stopEverything();
  const targets = [runs.get(what)].filter(Boolean);
  if (!targets.length) return stopForeign(what);
  for (const { child } of targets) killTree(child.pid);
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
    if (url.pathname === '/api/gate' && req.method === 'POST') {
      /* Only step names from GATE_STEPS ever become an argument: the page may ask for anything. */
      const asked = (url.searchParams.get('steps') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
      const known = new Set(GATE_STEPS.map((x) => x.key));
      const bad = asked.filter((k) => !known.has(k));
      if (bad.length) return json(res, 400, { ok: false, why: `not a gate step: ${bad.slice(0, 3).join(', ')}` });
      const argv = asked.length && asked.length < GATE_STEPS.length ? ['scripts/verify.mjs', '--step', asked.join(',')] : ['scripts/verify.mjs'];
      RUNNABLE.set('job:gate-chosen', argv);
      const r = start('job:gate-chosen', []);
      return json(res, r.ok ? 200 : 409, r);
    }
/*
 * WHAT THE DOCTOR FOUND, SO THE BOARD CAN SAY IT TOO.
 *
 * `npm run doctor` prints what this machine can and cannot do, and writes the same rows to
 * docs/checks/machine.json. Printing it in a terminal only helps somebody who already knew to
 * run it -- which is the whole failure this board exists to end. The board asks here instead,
 * and shows the three parts the doctor writes: what failed, where, and why, in the words of
 * whatever refused.
 *
 * `known: false` is NOT `ready: true`. Nobody having asked is a different answer from nothing
 * being wrong, and the board says the first rather than assuming the second.
 */
    if (url.pathname === '/api/machine') {
      try {
        const m = JSON.parse(readFileSync(join(ROOT, 'docs', 'checks', 'machine.json'), 'utf8'));
        return json(res, 200, { known: true, ...m });
      } catch {
        return json(res, 200, { known: false });
      }
    }
/*
 * IS THIS STEP'S RECORDED RESULT STILL ABOUT THE CODE ON DISK?
 *
 * "Only what is stale" in the run dialog used to read L.gate.done -- the record a gate writes
 * WHILE IT RUNS -- and pick the steps with ok === false. Two mistakes in one button. With nothing
 * running that list is empty, so the button selected nothing, every time; and had it found
 * anything, failed is not stale. A step that passed and whose files then changed is exactly the
 * one you want to run again, and it was the one case the button could never return.
 *
 * The fingerprints have been here since the gate learned to record them: every step names the
 * files it judges, and stepFingerprint hashes them as they are now. So the question has a real
 * answer, and it is asked here rather than guessed on the page.
 *
 * THREE STATES, NOT TWO. A step whose recorded fingerprint matches is current. One whose hash has
 * moved is stale, and says how many files moved. One that never recorded a fingerprint -- the
 * older steps, and anything that has never run -- is UNKNOWN, which is not the same as current and
 * is not reported as if it were. It cannot be shown to be about today's code, so it is offered for
 * re-running with that as its reason.
 */
/** Up to three changed paths and a count for the remainder, or null if git cannot say. */
function movedNames(rec, now) {
  if (!rec.commit) return null;
  try {
    const was = fingerprintAt(rec.commit, rec.key);
    const d = whatChanged(was, now);
    if (!d || !d.total) return null;
    const all = [...d.edited, ...d.added, ...d.gone];
    const show = all.slice(0, 3).join(', ');
    return d.total > 3 ? `${show} and ${d.total - 3} more` : show;
  } catch {
    /* An old commit that has been garbage collected, or a step whose paths git cannot resolve.
       Saying nothing here lets the caller fall back to the count, which is still true. */
    return null;
  }
}

/**
 * A step that is one of the registered checks is judged by the results themselves.
 *
 * Those checks can be run four ways -- the gate, a column, a group, one model -- and only the gate
 * wrote the gate's record. So a column run over all 135 left the step list describing the run
 * before it. The ledger already keeps the one true account of those results: per model, fresh or
 * stale, by fingerprint, and it is what the columns and the bars are drawn from. The step list
 * reads the same tally, so the list and the column cannot say different things about one check.
 *
 * Returns null for a step that is not a registered check: those have only the gate's record.
 */
function stepFromResults(key) {
  let c = null;
  try { c = (JSON.parse(readFileSync(join(ROOT, 'docs', 'ledger.json'), 'utf8')).checkList ?? []).find((x) => x.key === key) ?? null; } catch { return null; }
  if (!c?.tally) return null;
  const t = c.tally;
  const of = c.total ?? Object.values(t).reduce((a, b) => a + b, 0);
  const unit = c.unit ?? 'models';
  const n = (k) => Number(t[k] ?? 0);
  if (n('fail') || n('broke')) return { state: 'failed', why: `${n('fail') + n('broke')} of ${of} ${unit} failed or did not run to the end, in the results the column shows` };
  if (n('never')) return { state: 'unknown', why: `${n('never')} of ${of} ${unit} have no result yet` };
  if (n('stale')) return { state: 'stale', why: `${n('stale')} of ${of} ${unit} passed on older code: something they were judged on has changed since` };
  if (n('flag')) return { state: 'stale', why: `${n('flag')} of ${of} ${unit} have a flag open for a person to look at` };
  return { state: 'current', why: `all ${of} ${unit} have a result on the code as it is now: the same results the column shows` };
}

/**
 * What the push is waiting for, as things this board can run. Read from the ledger's own verdict,
 * so it is the same list the checklist shows as open and the pre-push hook would refuse on.
 */
function neededNow() {
  try {
    const open = JSON.parse(readFileSync(join(ROOT, 'docs', 'ledger.json'), 'utf8')).readiness?.checklist?.verdict?.stages?.before?.open ?? null;
    if (!open) return null;
    let rec = [];
    try { rec = JSON.parse(readFileSync(join(ROOT, 'docs', 'checks', 'gate.json'), 'utf8')).steps ?? []; } catch { /* no gate has run */ }
    const by = new Map(rec.map((r) => [r.key, r]));
    const states = Object.fromEntries(GATE_STEPS.map((g) => [g.key, (stepFromResults(g.key) ?? stepState(by.get(g.key))).state]));
    return { open: open.length, ...whatIsNeeded(open, states) };
  } catch { return null; }
}

function stepState(rec) {
  if (!rec) return { state: 'unknown', why: 'this step has no recorded result at all' };
  if (rec.ok === false) return { state: 'failed', why: 'it failed the last time it ran' };
  if (!rec.fp?.hash) return { state: 'unknown', why: 'its result predates fingerprints, so it cannot be shown to be about the code as it is now' };
  try {
    const now = stepFingerprint(rec.key);
    if (now.hash === rec.fp.hash) return { state: 'current', why: `the ${now.files} files it judges are unchanged since it ran` };
    /*
     * THE RULE CHANGED, NOT THE CODE -- and those are not the same news.
     *
     * If the list of files this step depends on was redefined since the result was recorded, the
     * contents hash is not comparable with the old one and says nothing about whether anything
     * this step judges actually moved. Reporting that as "stale" would be asserting a change to
     * the code that may never have happened.
     */
    if (rec.fp.pathsHash && now.pathsHash !== rec.fp.pathsHash) {
      return { state: 'unknown', why: `what this step depends on was redefined since it ran (${rec.fp.files} files then, ${now.files} now), so its old result cannot be compared with today's` };
    }
    /*
     * NAME THEM. A count is not an answer to "what changed?".
     *
     * "the files it judges have changed (268 then, 125 now)" tells a person that something moved
     * and nothing about what, so the next move is a guess or a four-hour run. The record keeps only
     * {files, hash} -- per-file hashes would put thousands of lines in gate.json -- but it keeps the
     * COMMIT, and fingerprintAt reads that commit's version of those files out of git in one
     * batch. So the comparison is available without having been stored.
     *
     * Three names, then a count for the rest: enough to recognise the change, not so many that the
     * line stops being readable. If git cannot reach that commit the count still stands on its own.
     */
    const moved = movedNames(rec, now);
    return { state: 'stale', why: moved
      ? `${moved} changed since it ran`
      : `the files it judges have changed since it ran (${rec.fp.files} then, ${now.files} now)` };
  } catch (e) {
    /* A fingerprint that cannot be taken is not a pass. Say which, and why. */
    return { state: 'unknown', why: `its fingerprint could not be taken now: ${String(e?.message ?? e).split('\n')[0]}` };
  }
}

    if (url.pathname === '/api/jobs') {
      await freshRules();
      let machine = null;
      try { machine = JSON.parse(readFileSync(join(ROOT, 'docs', 'checks', 'machine.json'), 'utf8')); } catch { /* no doctor run */ }
      const { known, blocked } = blockedBy(machine);
      return json(res, 200, {
        machineKnown: known,
        steps: (() => {
          let rec = [];
          try { rec = JSON.parse(readFileSync(join(ROOT, 'docs', 'checks', 'gate.json'), 'utf8')).steps ?? []; } catch { /* no gate has run */ }
          const by = new Map(rec.map((r) => [r.key, r]));
          return GATE_STEPS.map((g) => ({ ...g, ...(stepFromResults(g.key) ?? stepState(by.get(g.key))) }));
        })(),
        needed: neededNow(),
        jobs: JOBS.map((j) => ({
          key: j.key, name: j.name, minutes: j.minutes, blurb: j.blurb, answers: j.answers,
          needs: j.needs, safe: j.safe, blockedWhy: blocked.get(j.key) ?? null,
        })),
      });
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
