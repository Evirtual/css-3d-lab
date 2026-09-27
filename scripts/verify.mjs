/**
 * One runner: every check, one at a time, recorded where the ledger reads it.
 *
 *   npm run verify                  every check over every model
 *   npm run verify -- --fast        the cheap ones only, for after a change
 *   npm run verify -- cube dice     only these models
 *   npm run verify -- --no-build    qa on the dist/ already there, not a fresh build
 *
 * WHY THIS REPLACED THE OLD GATE
 *
 * There used to be two systems running the same checks over the same 135 models.
 *
 *   the ledger's way   `npm run capture -- stages`, which records every model's verdict in
 *                      docs/checks/stages.json and updates a progress count every second, so the
 *                      page can show a board and a "running 40/135"
 *   the gate's way     scripts/verify.mjs ran the check scripts itself, in shards, parsed their
 *                      output, and wrote the result to a log file and nowhere else
 *
 * So the gate measured all 135 models and the board never moved: its verdicts were not recorded,
 * and neither was its progress. On 2026-09-26 it re-checked every model between 13:20 and 13:41
 * while docs/checks/stages.json still said 12:03. The page looked idle for two and a half hours,
 * and `GATE HOLDS` was a claim you could not see the working for.
 *
 * Worse, the overnight chain ran BOTH: eight checks the ledger's way, then five of them again the
 * gate's way. check-stages alone was 53 minutes in the first pass and 27 in the second -- an hour
 * and twenty minutes to answer one question twice, and the second answer went into a log nobody
 * read.
 *
 * This file now runs each check THROUGH scripts/capture-check.mjs, which is the thing the ledger
 * already reads. Recording and progress come for free, there is one system instead of two, and
 * "ready to ship" has one meaning: every tick on the board is green, and none of them is old.
 *
 * ONE CHECK AT A TIME, ONE BROWSER STREAM
 *
 * The old gate ran two shards at once, which halved check-stages (53 -> 27 minutes) and cost the
 * machine: 87% of memory, 100% of the processor, 37 browser processes, and a laptop nobody could
 * use. Sharding also forced the gate to keep its own books, because two shards writing one result
 * file race each other -- which is how the two systems came apart in the first place.
 *
 * So: no shards. Each check runs to the end before the next begins, one model at a time inside it.
 * A full run takes longer in wall-clock and leaves the machine usable, which matters more when the
 * alternative is a run you have to stop halfway.
 */
import { spawn, execFileSync } from 'node:child_process';
import { freemem } from 'node:os';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './model-sources.mjs';
import { REGISTRY, RUN_ORDER, PREPARE } from './checks-registry.mjs';

const args = process.argv.slice(2);
const fast = args.includes('--fast');
const noBuild = args.includes('--no-build');
const models = args.filter((a) => !a.startsWith('--'));

/** Cheapest first, so a failure shows up before the long ones have been paid for. */
/**
 * The order, from the registry, with qa put where it belongs.
 *
 * It used to be a second copy of the list kept here, which drifted from the one the page shows:
 * the board listed Contract first, under a heading reading "in gate order", while this began with
 * Box. One list now, in scripts/checks-registry.mjs, so the page cannot describe a sequence that
 * does not happen.
 *
 * qa is not a registry check -- it records no per-model verdicts -- so it has no place in that
 * list and is inserted after media, where it costs two minutes before anything expensive starts.
 */
const ORDER = (() => {
  const keys = [...RUN_ORDER];
  keys.splice(keys.indexOf('perf'), 0, 'qa');
  // parity is not a registry check either, and it goes straight after exports because it asks the
  // one question exports cannot: exports compares a file against the dialog's canvas, and both are
  // drawn on this machine. The renderer a visitor's export comes from is a Worker on Linux with a
  // different font folder, and a check that compares two things on one machine cannot see a
  // difference that only exists between machines. That gap shipped a card with its numbers hanging
  // off the edge on 2026-09-25, and seven chart models on 2026-09-27, under green ticks both times.
  keys.splice(keys.indexOf('exports') + 1, 0, 'parity');
  // The three that were never in the gate: real scripts, each proving a release-checklist line, and
  // none of them run by anything, so what they proved went stale the day after somebody ran it.
  keys.splice(keys.indexOf('qa') + 1, 0, 'snippets', 'preview', 'compare');
  // The three that need a network: a fetch, a preflight, a variable list. Seconds, and they were
  // the reason three checklist lines could only ever be true of the day somebody typed them.
  keys.unshift('remote');
  return keys;
})();
/**
 * qa is not in the registry, so it has no per-model verdicts and nothing on the board.
 * It still runs -- it catches page errors on the BUILT site, which nothing else looks at -- and its
 * line says plainly that it left no record, rather than borrowing another check's green.
 */
const NO_RECORD = new Set(['qa', 'parity', 'snippets', 'preview', 'compare', 'remote']);
/**
 * What the steps outside the registry are, in words, for the line this prints when each starts.
 * That sentence used to be one hardcoded string -- qa's -- so the moment a second such step
 * existed it would have run under qa's description.
 */
const OUTSIDE = {
  qa: 'page errors on the built site (no per-model record)',
  parity: 'the same scene drawn by both renderers, here and on the Worker (no per-model record)',
  snippets: 'every standalone snippet runs without a script error (no per-model record)',
  preview: 'editing a model never remounts or moves its frame (no per-model record)',
  compare: 'the snapshots match the screen (no per-model record)',
  remote: 'the remote, the Worker origins and the workflow variable (no per-model record)',
};
/** What `--fast` is: the checks that answer in a couple of minutes over all 135. */
const FAST = new Set(['boxsizing', 'contrast', 'access', 'media', 'qa']);

const listed = new Map(REGISTRY.map((c) => [c.key, c]));
const missing = ORDER.filter((k) => !listed.has(k) && !NO_RECORD.has(k));
if (missing.length) { console.error(`verify: not in the registry: ${missing.join(', ')}`); process.exit(2); }

const run = ORDER.filter((k) => !fast || FAST.has(k));

/**
 * Free memory, in MB.
 *
 * os.freemem() is in Node on every platform and answers instantly. This used to shell out to
 * PowerShell, which meant it returned nothing at all on macOS or Linux -- and cost about a second
 * of process start on Windows, once per step, to read a number Node already had.
 */
const mb = () => Math.round(freemem() / 1024 / 1024);

/** Every headless browser a check left behind, so the next one starts from nothing. */
/**
 * Every headless browser a check left behind, so the next one starts from nothing.
 *
 * Only ever browsers this project drives: matched on --headless or --remote-debugging-pipe, which
 * the checks pass and a person's own browser does not. It has to be a command on each platform
 * because there is no Node call for "kill things matching this command line", and this used to do
 * nothing at all anywhere but Windows -- so on a Mac the browsers simply accumulated.
 */
const sweep = () => {
  try {
    if (process.platform === 'win32') {
      execFileSync('powershell', ['-NoProfile', '-Command',
        "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*--headless*' -or $_.CommandLine -like '*--remote-debugging-pipe*' } | ForEach-Object { taskkill /PID $_.ProcessId /T /F 2>$null | Out-Null }",
      ], { stdio: 'ignore', timeout: 30000 });
    } else {
      // -f matches the whole command line. A non-zero exit here means "nothing matched", which is
      // the good case, so the failure is swallowed either way.
      execFileSync('pkill', ['-f', '--headless|--remote-debugging-pipe'], { stdio: 'ignore', timeout: 30000 });
    }
  } catch { /* nothing to sweep, or it could not look: neither is this run's problem */ }
};

const hhmm = () => new Date().toTimeString().slice(0, 5);
// One rounding, not two: rounding the remainder on its own turns 241m59.7s into "241m60s".
const mins = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`; };

/**
 * exports at the dialog's DEFAULTS over every model.
 *
 * Without the ids, check-exports falls back to its own eight-model sample and reports that as the
 * export step. It did exactly that in every overnight run until 2026-09-26, so 127 of the 135
 * export verdicts sat at a commit from two days earlier -- through every font change of the week,
 * which is the one thing exports actually judge.
 */
function argsFor(key) {
  if (key !== 'exports') return [];
  if (models.length) return ['--defaults'];
  const ids = JSON.parse(readFileSync(join(ROOT, 'src', 'generated', 'model-ids.json'), 'utf8')).map((d) => d.id);
  return ['--defaults', ...ids];
}

/**
 * What a check needs in place before it can judge anything.
 *
 * check-media compares each model's share image against a fresh render, so the images have to exist
 * -- and `npm run build` empties dist/, which is where they live. The old gate made them first and
 * said so. Rewriting the runner dropped that, and check-media then failed all 135 models for a
 * missing file on 2026-09-26 at 14:29, twice in one day: once because a rebuild wiped them, and once
 * because the step that remade them had been deleted.
 *
 * A check that cannot run is not a check that failed, so this is not left to luck.
 */


function prepare(key) {
  const argv = PREPARE[key];
  if (!argv) return Promise.resolve(0);
  console.log(`        first: ${argv[0]} (check-${key} reads what it makes)`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, argv, { cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true, stdio: 'ignore' });
    child.on('close', resolve);
  });
}

function spawnStep(key) {
  return new Promise((resolve) => {
    // snippet-check wants the ids spelled out; the other two take none or an optional filter.
    const everyId = () => JSON.parse(readFileSync(join(ROOT, 'src', 'generated', 'model-ids.json'), 'utf8')).map((d) => d.id);
    const argv = key === 'parity' ? ['scripts/check-worker-parity.mjs', ...models]
      : key === 'snippets' ? ['scripts/snippet-check.mjs', ...(models.length ? models : everyId())]
      : key === 'preview' ? ['scripts/preview-check.mjs']
      : key === 'compare' ? ['scripts/compare-capture.mjs', ...models]
      : key === 'remote' ? ['scripts/check-remote.mjs']
      : NO_RECORD.has(key) ? ['scripts/qa.mjs', ...models]
      : ['scripts/capture-check.mjs', key, ...argsFor(key), ...models];
    // The step is told who is running it, so the board can offer a Stop that stops the RUN
    // rather than the step. Stopping one check of a thirteen-step run only makes the runner move
    // on to the next one, which is not what Stop means to anyone watching.
    const child = spawn(process.execPath, argv, { cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0', C3D_RUNNER: 'verify', C3D_RUNNER_PID: String(process.pid) }, windowsHide: true });
    let tail = '';
    const keep = (b) => { tail = (tail + b.toString()).slice(-4000); process.stdout.write(b); };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    child.on('close', (code) => resolve({ code, tail }));
  });
}

/**
 * What this run proved, read back from the file it just wrote.
 *
 * Counted over the models THIS RUN covered, not over the whole board. Reading the board instead
 * made a two-model run print "135/135 pass", and made it fail the run over a model it had never
 * looked at. A count has to mean what the run did.
 */
function tally(key) {
  const file = join(ROOT, 'docs', 'checks', `${key}.json`);
  if (!existsSync(file)) return null;
  let j; try { j = JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
  const m = j.models ?? {};
  const out = { pass: 0, fail: 0, other: 0, total: 0, board: Object.keys(m).length };
  const mine = models.length ? models.filter((id) => m[id]) : Object.keys(m);
  for (const id of mine) {
    out.total++;
    const s = m[id].status;
    if (s === 'pass') out.pass++;
    else if (s === 'fail') out.fail++;
    else out.other++;
  }
  return out;
}

/**
 * The steps that judge `dist/` rather than the dev server, and the build that has to come first.
 *
 * --no-build has always been documented as "qa on the dist/ already there, not a fresh build",
 * which says the default is a fresh build. It was not: the flag was read once, used to change a
 * printed sentence, and nothing ever ran `npm run build`. So these four judged whatever build
 * happened to be on disk, at whatever age.
 *
 * On 2026-09-27 that failed all seven chart models on the share check -- correctly, and for a
 * reason that had nothing to do with them: "the built page runs different model code from
 * src/models now: dist/ is older than the model". The models had been edited forty minutes
 * earlier. check-media was right, verify was the one making a claim it had not earned.
 */
const NEEDS_DIST = new Set(['media', 'qa', 'app', 'seo']);
const willUseDist = run.filter((k) => NEEDS_DIST.has(k));

console.log(`verify: ${run.length} check${run.length === 1 ? '' : 's'}, one at a time, ${models.length ? `${models.length} model(s)` : 'every model'}`);
console.log(`each one records where the ledger reads it, so the page shows it running and keeps the result`);
console.log(`${mb() ?? '?'} MB free at the start${noBuild && willUseDist.length ? ` (--no-build: ${willUseDist.join(', ')} read the dist/ already there)` : ''}\n`);

let builtOk = null;
if (willUseDist.length && !noBuild) {
  console.log(`first: npm run build — ${willUseDist.join(', ')} judge dist/, not the dev server`);
  const at = Date.now();
  try {
    // shell: true on Windows because npm is npm.cmd there, and Node refuses to execFile a .cmd
    // without a shell. Without it this threw EINVAL instantly -- "BUILD FAILED after 0m00s" --
    // so the step that exists to stop dist/ going stale did nothing at all on the machine it
    // was written on.
    execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'],
      { cwd: ROOT, stdio: 'ignore', shell: process.platform === 'win32', env: { ...process.env, FORCE_COLOR: '0' } });
    builtOk = true;
    console.log(`       built in ${mins(Date.now() - at)}\n`);
  } catch (e) {
    builtOk = false;
    // Not fatal here on purpose: the build's own failure is what `qa` and `seo` are for, and
    // stopping now would skip the ten steps that do not need dist/ at all. It says WHY, because
    // "BUILD FAILED" on its own was how a spawn error passed for a broken build.
    console.log(`       BUILD FAILED after ${mins(Date.now() - at)} (${String(e?.message ?? e).split('\n')[0]})`);
    console.log(`       the dist/ steps below judge whatever is on disk\n`);
  }
}

const began = Date.now();
const results = [];
for (const [i, key] of run.entries()) {
  const c = listed.get(key) ?? { name: OUTSIDE[key] ?? '(no per-model record)' };
  const at = Date.now();
  console.log(`\n[${i + 1}/${run.length}] ${hhmm()}  ${key} — ${c.name}${key === 'exports' && !models.length ? ' (every model, at the dialog\'s defaults)' : ''}`);
  await prepare(key);
  const { code } = await spawnStep(key);
  sweep();
  const t = tally(key);
  const took = mins(Date.now() - at);
  const line = t
    ? `${t.pass}/${t.total} pass${t.fail ? `, ${t.fail} FAILED` : ''}${t.other ? `, ${t.other} other` : ''}${t.total < t.board ? ` (of ${t.board} on the board)` : ''}`
    : code === 0 ? 'ran, no per-model record' : `exit ${code}`;
  console.log(`[${i + 1}/${run.length}] ${hhmm()}  ${key}: ${line} — ${took}, ${mb() ?? '?'} MB free`);
  results.push({ key, code, tally: t, took });
}

/* ---------- one summary ---------- */
console.log(`\n${'='.repeat(64)}`);
console.log(`every check, ${mins(Date.now() - began)}\n`);
let held = true;
for (const r of results) {
  const t = r.tally;
  const bad = r.code !== 0 || (t && t.fail > 0);
  if (bad) held = false;
  const what = t ? `${String(t.pass).padStart(3)}/${String(t.total).padEnd(3)}${t.fail ? `  ${t.fail} failed` : ''}${t.other ? `  ${t.other} other` : ''}` : `exit ${r.code}`;
  console.log(`  ${bad ? 'FAILS' : 'holds'}  ${r.key.padEnd(10)} ${what.padEnd(22)} ${r.took}`);
}
console.log('');
const scope = models.length ? `the ${models.length} model(s) asked for` : 'every model';
console.log(held
  ? `GATE HOLDS: every check held over ${scope}, and every result that has a place on the board is on it.`
  : 'GATE FAILS: see the lines marked FAILS above; the board holds the detail per model.');
console.log('Ready to ship means both: the board is green, and nothing on it is old.');

/*
 * WHAT THE GATE DID, WRITTEN DOWN.
 *
 * Every step's result was printed and thrown away. The checks that record per model are read back
 * by the ledger; the ones that do not -- the build, qa, the three scripts that only ever ran by
 * hand -- left nothing, so their release-checklist lines answered "not evaluated: it is slow",
 * which is true of RUNNING them and says nothing about the run that just finished. The work
 * happened. Nobody wrote it down.
 *
 * Small on purpose: what ran, whether it passed, when, and at which commit. It is evidence of this
 * run, not a second copy of the board.
 */
try {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  writeFileSync(join(ROOT, 'docs', 'checks', 'gate.json'), `${JSON.stringify({
    note: 'Written by scripts/verify.mjs. What this run ran and how each step ended. Not a second copy of the board.',
    finishedAt: new Date().toISOString(),
    commit,
    scope: models.length ? models : 'every model',
    held,
    // the build is its own thing: it runs before the steps that judge dist/, and `npm run build`
    // is generate && tsc && vite build, so one exit code answers for all three
    build: { ran: builtOk !== null, ok: builtOk === true, cmd: 'npm run build (generate && tsc && vite build)' },
    steps: results.map((r) => ({ key: r.key, ok: r.code === 0 && !(r.tally && r.tally.fail > 0), code: r.code, took: r.took })),
  }, null, 2)}\n`);
} catch (e) {
  // A gate that cannot write its own record has still run: say so and do not change the verdict.
  console.log(`(could not write docs/checks/gate.json: ${String(e?.message ?? e).split('\n')[0]})`);
}
process.exit(held ? 0 : 1);
