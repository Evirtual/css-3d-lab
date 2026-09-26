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
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './model-sources.mjs';
import { REGISTRY } from './checks-registry.mjs';

const args = process.argv.slice(2);
const fast = args.includes('--fast');
const noBuild = args.includes('--no-build');
const models = args.filter((a) => !a.startsWith('--'));

/** Cheapest first, so a failure shows up before the long ones have been paid for. */
const ORDER = ['boxsizing', 'contrast', 'access', 'media', 'qa', 'perf', 'models', 'motion', 'stages', 'exports', 'app', 'seo'];
/**
 * qa is not in the registry, so it has no per-model verdicts and nothing on the board.
 * It still runs -- it catches page errors on the BUILT site, which nothing else looks at -- and its
 * line says plainly that it left no record, rather than borrowing another check's green.
 */
const NO_RECORD = new Set(['qa']);
/** What `--fast` is: the checks that answer in a couple of minutes over all 135. */
const FAST = new Set(['boxsizing', 'contrast', 'access', 'media', 'qa']);

const listed = new Map(REGISTRY.map((c) => [c.key, c]));
const missing = ORDER.filter((k) => !listed.has(k) && !NO_RECORD.has(k));
if (missing.length) { console.error(`verify: not in the registry: ${missing.join(', ')}`); process.exit(2); }

const run = ORDER.filter((k) => !fast || FAST.has(k));

const mb = () => {
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory'], { encoding: 'utf8', timeout: 20000 });
    return Math.round(Number(out.trim()) / 1024);
  } catch { return null; }
};

/** Every headless browser a check left behind, so the next one starts from nothing. */
const sweep = () => {
  if (process.platform !== 'win32') return;
  try {
    execFileSync('powershell', ['-NoProfile', '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*--headless*' -or $_.CommandLine -like '*--remote-debugging-pipe*' } | ForEach-Object { taskkill /PID $_.ProcessId /T /F 2>$null | Out-Null }",
    ], { stdio: 'ignore', timeout: 30000 });
  } catch { /* nothing to sweep, or it could not look: neither is this run's problem */ }
};

const hhmm = () => new Date().toTimeString().slice(0, 5);
const mins = (ms) => `${Math.floor(ms / 60000)}m${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}s`;

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

function spawnStep(key) {
  return new Promise((resolve) => {
    const argv = NO_RECORD.has(key) ? ['scripts/qa.mjs', ...models] : ['scripts/capture-check.mjs', key, ...argsFor(key), ...models];
    const child = spawn(process.execPath, argv, { cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true });
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

console.log(`verify: ${run.length} check${run.length === 1 ? '' : 's'}, one at a time, ${models.length ? `${models.length} model(s)` : 'every model'}`);
console.log(`each one records where the ledger reads it, so the page shows it running and keeps the result`);
console.log(`${mb() ?? '?'} MB free at the start${noBuild ? ' (--no-build: qa reads the dist/ already there)' : ''}\n`);

const began = Date.now();
const results = [];
for (const [i, key] of run.entries()) {
  const c = listed.get(key) ?? { name: 'page errors on the built site (no per-model record)' };
  const at = Date.now();
  console.log(`\n[${i + 1}/${run.length}] ${hhmm()}  ${key} — ${c.name}${key === 'exports' && !models.length ? ' (every model, at the dialog\'s defaults)' : ''}`);
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
process.exit(held ? 0 : 1);
