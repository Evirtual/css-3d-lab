/**
 * The board: serves the ledger's page with its buttons, and keeps everything the page shows current
 * while it runs -- docs/ledger.json, the page itself, and the README's list of scripts.
 *
 * docs/ledger.json is rebuilt whenever one of its inputs changes.
 *
 *   node scripts/ledger-watch.mjs     (npm run ledger:watch; Ctrl+C stops it)
 *
 * Every 3 seconds it compares, without reading any file's contents:
 *  - the commit refs/heads/main points to, read from .git/refs/heads/main (or .git/packed-refs).
 *    Not a git hook: agents commit with `git commit-tree` + `git update-ref`, which runs no hooks;
 *  - the modification time and size of docs/checks/*.json and
 *    docs/ledger-queue.json;
 *  - the modification time and size of every model file (src/models/**, src/styles/models/**),
 *    of docs/*.md and of README.md;
 *  - the modification time and size of the render-path files (scripts/fingerprint.mjs
 *    RENDER_FILES: the model frame, the export and share-image code), since a change there can
 *    make a check result stale.
 * The "at risk" list (git status) is refreshed by every rebuild, not watched on its own: running
 * git status every 3 s would not be free.
 * When any of them differs it runs buildLedger() from scripts/ledger.mjs in this process. One build
 * at a time; a change seen during a build queues exactly one more build after it.
 *
 * The queue file is not an input of the ledger (the page reads it directly); it is watched only so
 * that a rebuild follows the lead's record promptly, and a queue-only change reuses everything
 * cached, so it costs about a tenth of a second.
 *
 * The build's own code (scripts/ledger.mjs and scripts/model-sources.mjs) is watched too. When it
 * changes on disk, the next build re-imports ledger.mjs as ledger.mjs?v=<hash of both files>
 * (which imports model-sources.mjs at the same version) and drops the cache the old code filled,
 * so no rebuild ever runs on code older than the disk. The version each build ran on is recorded.
 * This file itself is not reloaded: a change to ledger-watch.mjs still needs a restart.
 *
 * THE PAGE IS BUILT HERE TOO. docs/ledger.html is not in the repository: it is built from
 * src/ledger when this starts and again whenever that source changes (scripts/build-board.mjs
 * says why). An open tab sees the new build through ledger.json's pageBuild and reloads.
 *
 * It writes docs/ledger-watch.json every 30 s and after every build: its pid, when it started,
 * its last heartbeat and its last build. On a clean stop it records that it stopped. The page reads
 * it to tell a quiet project (heartbeat fresh, nothing changed) from a watcher that died.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './model-sources.mjs';
import { RENDER_FILES } from './fingerprint.mjs';
import { serve, isRunning } from './ledger-server.mjs';
import { buildBoard, boardStamp } from './build-board.mjs';
import { writeReadme } from './generate-readme.mjs';

/* ---------- the build code, reloaded whenever it changes on disk ---------- */
let lib = await import('./ledger.mjs');
let codeLoadedAt = new Date().toISOString();
let codeOnDisk = lib.LOADED_CODE;
const writeAtomic = (...a) => lib.writeAtomic(...a);
/** Load the build code again if the disk has moved on. Returns the old version when it did. */
async function freshCode() {
  codeOnDisk = lib.codeVersion();
  if (codeOnDisk === lib.LOADED_CODE) return null;
  const was = lib.LOADED_CODE;
  lib = await import(`./ledger.mjs?v=${codeOnDisk}`);
  codeLoadedAt = new Date().toISOString();
  for (const k of Object.keys(cache)) delete cache[k]; // filled by the old code; its shapes may differ
  return was;
}

const TICK = 3000;
const BEAT = 30000;
const GIT = join(ROOT, '.git');
const BEAT_FILE = join(ROOT, 'docs', 'ledger-watch.json');
const MODEL_DIRS = [join(ROOT, 'src', 'models'), join(ROOT, 'src', 'styles', 'models')];

/* ---------- what is looked at each tick ---------- */
function mainRef() {
  try { return readFileSync(join(GIT, 'refs', 'heads', 'main'), 'utf8').trim(); } catch {}
  try {
    const m = /^([0-9a-f]{40}) refs\/heads\/main$/m.exec(readFileSync(join(GIT, 'packed-refs'), 'utf8'));
    if (m) return m[1];
  } catch {}
  return null;
}
const stamp = (file) => { try { const s = statSync(file); return `${s.mtimeMs}:${s.size}`; } catch { return 'missing'; } };
function statTree(dir, out) {
  let names;
  try { names = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const d of names) {
    const full = join(dir, d.name);
    if (d.isDirectory()) statTree(full, out);
    else out.push(`${full}=${stamp(full)}`);
  }
  return out;
}
function jsonStamps(dir, ext = '.json') {
  let names = [];
  try { names = readdirSync(dir).filter((n) => n.endsWith(ext)).sort(); } catch {}
  return names.map((n) => `${n}=${stamp(join(dir, n))}`).join('|');
}
function look() {
  return {
    head: mainRef(),
    checks: jsonStamps(join(ROOT, 'docs', 'checks')),
      queue: stamp(join(ROOT, 'docs', 'ledger-queue.json')),
    docs: `${jsonStamps(join(ROOT, 'docs'), '.md')}|README.md=${stamp(join(ROOT, 'README.md'))}`,
    models: MODEL_DIRS.flatMap((d) => statTree(d, [])).join('|'),
    render: RENDER_FILES.map((f) => `${f}=${stamp(join(ROOT, f))}`).join('|'),
    code: ['ledger.mjs', 'model-sources.mjs', 'checklist-proofs.mjs', 'gate-paths.mjs', 'push-gate.mjs'].map((f) => stamp(join(ROOT, 'scripts', f))).join('|'),
    page: boardStamp(),
    scripts: `${['scripts', 'server'].map((d) => jsonStamps(join(ROOT, d), 'js')).join('|')}|package.json=${stamp(join(ROOT, 'package.json'))}`,
  };
}
const LABEL = { head: 'main moved', checks: 'check results', reviews: 'review log', docs: 'docs', code: 'build code', queue: 'queue', models: 'model files', render: 'render-path files', page: "the page's source", scripts: 'scripts' };

/* ---------- heartbeat ---------- */
/**
 * What the watching tools have failed to do, from the file scripts/now.mjs appends to. The log
 * itself is under .media-tmp and does not ship; this copy is small, last-24-hours, and rides on the
 * heartbeat the page already reads, so the page can show that an instrument was not working without
 * anyone having to go and look for it.
 */
const INSTRUMENTS_LOG = join(ROOT, '.media-tmp', 'runs', 'instruments.log');
function readInstruments() {
  try {
    const cut = Date.now() - 24 * 3600 * 1000;
    const rows = readFileSync(INSTRUMENTS_LOG, 'utf8').split('\n').filter(Boolean)
      .map((l) => { const at = Date.parse(l.slice(0, 24)); return Number.isFinite(at) ? { at: new Date(at).toISOString(), what: l.slice(25) } : null; })
      .filter((r) => r && Date.parse(r.at) > cut);
    // A count and the last few: a hundred identical timeouts is one fact, not a hundred
    return { count: rows.length, since: rows[0]?.at ?? null, last: rows.slice(-5) };
  } catch { return { count: 0, since: null, last: [] }; }
}

const startedAt = new Date().toISOString();
let lastBuild = null;
let stopped = null;
function beat() {
  const at = new Date().toISOString();
  try {
    writeAtomic(BEAT_FILE, JSON.stringify({
      note: 'Written by scripts/ledger-watch.mjs. heartbeatAt is refreshed every 30 s while it runs; stoppedAt is set only on a clean stop.',
      pid: process.pid, startedAt, heartbeatAt: at, beatEverySeconds: BEAT / 1000, tickEverySeconds: TICK / 1000,
      stoppedAt: stopped, lastBuild, lastPage,
      // The instruments' own failures, carried onto the page. A tool that times out and prints one
      // grey line into a terminal nobody is reading teaches nothing: on 2026-09-25 a process list
      // timed out at 15:34 while the WORK block beside it had separately decided the run was over,
      // and the two together read as one confident obituary for a gate that had twenty Chromium
      // renderers working. The rule that came out of it is that an instrument's failures are
      // findings. They belong where the findings are, not only in a scrollback.
      instruments: readInstruments(),
      code: { loaded: lib.LOADED_CODE, loadedAt: codeLoadedAt, onDisk: codeOnDisk, files: ['scripts/ledger.mjs', 'scripts/model-sources.mjs', 'scripts/checklist-proofs.mjs'], note: 'versions are a hash of those files; loaded differs from onDisk only until the next build reloads it' },
    }, null, 1));
  } catch (e) { console.error(`ledger-watch: could not write the heartbeat: ${e.message}`); }
}

/* ---------- building ---------- */
const cache = {};
let seen = null;
let building = false;
let again = null; // why a build was asked for during the one running
const clock = () => new Date().toTimeString().slice(0, 8);

async function build(why) {
  if (building) { again = again ? `${again}, ${why}` : why; return; }
  building = true;
  try {
    let was = null;
    try { was = await freshCode(); } catch (e) { console.log(`${clock()} could not load the new build code (${e.message.split('\n')[0]}); building with ${lib.LOADED_CODE}`); }
    if (was) console.log(`${clock()} build code changed on disk: reloaded ${was} → ${lib.LOADED_CODE}`);
    const r = await lib.buildLedger({ by: 'npm run ledger:watch', reason: why, cache, sourcesKey: seen.models, quiet: true });
    const c = r.counts;
    const reused = [r.reusedGitReplay && 'git', r.reusedModelLoad && 'models'].filter(Boolean);
    const run = Object.entries(r.running).filter(([, p]) => p).map(([k, p]) => ` · ${k} running ${p.done}/${p.total ?? '?'}${p.alive === false ? ' (process gone)' : ''}`).join('');
    lastBuild = { at: new Date().toISOString(), reason: why, ms: r.ms, ok: true, head: r.head, codeVersion: lib.LOADED_CODE, balanced: r.balanced };
    console.log(`${clock()} rebuilt (${why}) in ${(r.ms / 1000).toFixed(1)} s${reused.length ? `, reused ${reused.join('+')}` : ''}: ${c.toCheck} to check, ${c.approved} approved, of ${c.models}${run}${r.notes.length ? ` · ${r.notes.length} note(s)` : ''}${r.balanced === false ? ' · DOES NOT BALANCE' : ''} [code ${lib.LOADED_CODE}]`);
  } catch (e) {
    lastBuild = { at: new Date().toISOString(), reason: why, ok: false, error: e.message.split('\n')[0], codeVersion: lib.LOADED_CODE };
    console.log(`${clock()} build FAILED (${why}): ${lastBuild.error}`);
  } finally {
    building = false;
    beat();
  }
  if (again) { const w = again; again = null; await build(w); }
}

/**
 * The page, built from its source. Synchronous on purpose: it takes about a second, and a ledger
 * built while the page is half written would name assets that are not there yet.
 */
let lastPage = null;
function page(why) {
  const r = buildBoard();
  lastPage = { at: new Date().toISOString(), ok: r.ok, ms: r.ms, error: r.error ?? null, reason: why };
  console.log(r.ok
    ? `${clock()} built the page (${why}) in ${(r.ms / 1000).toFixed(1)} s`
    : `${clock()} the page did NOT build (${why}): ${r.error} -- serving the last one that did`);
  return r.ok;
}

/** The README's list of scripts, rewritten from the scripts when it no longer matches them. */
function readme(why) {
  try {
    const r = writeReadme();
    if (r.error) console.log(`${clock()} the README's list of scripts was NOT written (${why}): ${r.error}`);
    else if (r.changed) console.log(`${clock()} rewrote the README's list of scripts (${why}): commit README.md`);
  } catch (e) { console.log(`${clock()} the README's list of scripts was NOT written (${why}): ${String(e?.message ?? e).split('\n')[0]}`); }
}

function tick() {
  const now = look();
  const changed = Object.keys(now).filter((k) => now[k] !== seen[k]);
  if (!changed.length) return;
  if (changed.includes('scripts')) { readme('a script changed'); now.page = look().page; if (now.page !== seen.page && !changed.includes('page')) changed.push('page'); }
  if (changed.includes('page')) { page("its source changed"); now.docs = look().docs; }
  const why = changed.map((k) => (k === 'head' ? `main → ${now.head?.slice(0, 7) ?? 'unreadable'}` : LABEL[k])).join(', ');
  seen = now;
  build(why);
}

function stop() {
  stopped = new Date().toISOString();
  beat();
  console.log(`${clock()} ledger-watch stopped.`);
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('SIGBREAK', stop);

if (!existsSync(GIT)) { console.error(`ledger-watch: no .git directory at ${GIT}`); process.exit(2); }
seen = look();
console.log(`${clock()} ledger-watch: pid ${process.pid}, looking every ${TICK / 1000} s at main (${seen.head?.slice(0, 7) ?? 'unreadable'}), docs/checks, the queue and the model files.`);
beat();
setInterval(beat, BEAT).unref();
setInterval(tick, TICK);
readme('start');
page('start');
seen = look();
build('start');

/* ---------- the page, and the buttons on it ----------
   Serving docs/ here means a person who cloned this repository needs one command and no second
   server: the address below IS the ledger, and the buttons on it run the checks. PORT=... moves it. */
const port = Number(process.env.PORT ?? 5178);
const board = await serve(port);
if (board) console.log(clock() + " the ledger is at http://127.0.0.1:" + board.port + "/ledger.html — the buttons on it run the checks");
