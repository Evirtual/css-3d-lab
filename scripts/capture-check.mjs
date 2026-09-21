/**
 * Runs one of the model checks exactly as it is, shows its output as it comes, and keeps what it
 * said per model in docs/checks/<check>.json for scripts/ledger.mjs to read.
 *
 *   node scripts/capture-check.mjs models [args…]   scripts/check-models.mjs
 *   node scripts/capture-check.mjs stages [args…]   scripts/check-stages.mjs
 *   node scripts/capture-check.mjs motion [args…]   scripts/check-motion.mjs
 *   (npm run capture -- models cube dice)
 *
 * It does not change what a check does. It reads the lines the check already prints:
 *  - models: `FAILS <id> …` and `holds <id> …`. A pass only prints its line under --pass, so the
 *    wrapper adds --pass when it is missing. That flag changes what is printed, not what is judged.
 *  - stages: the table's rows (what was measured) and the "Disagreements" section (what failed).
 *    Under --json the check prints raw numbers and no verdict, so a --json run is passed through
 *    and not recorded: the wrapper will not re-derive a verdict the check did not give.
 *  - motion: `smooth <id>`, `LOOK AT <id>` and `BROKE <id>`, with the lines under them. The check
 *    itself says it only flags; "smooth" means no automatic flag, not that a human looked.
 *
 * Each model's entry is replaced only when this run reported it, so a run over two models keeps
 * the last known result of the other 133. Every entry carries the moment its line was printed, the
 * run it came from, HEAD at the time, and a fingerprint of the model's own source (see
 * model-sources.mjs) taken when the run started, so the ledger can tell a result that still
 * describes the code from one that is stale.
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fingerprints, ROOT } from './model-sources.mjs';

const CHECKS = { models: 'check-models.mjs', stages: 'check-stages.mjs', motion: 'check-motion.mjs' };
const [check, ...rest] = process.argv.slice(2);
if (!CHECKS[check]) {
  console.error(`usage: node scripts/capture-check.mjs <${Object.keys(CHECKS).join('|')}> [args for the check]`);
  process.exit(2);
}
const args = [...rest];
if (check === 'models' && !args.includes('--pass')) args.push('--pass');
const record = !(check === 'stages' && args.includes('--json'));
if (!record) console.error('capture-check: --json prints numbers without a verdict, so this run is shown but not recorded.');

const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const startedAt = new Date().toISOString();
const runId = `${check}-${startedAt.replace(/[:.]/g, '-')}`;
const commit = git('rev-parse', '--short', 'HEAD');
const dirty = (git('status', '--porcelain', '--', 'src/models', 'src/styles/models') ?? '').split('\n').filter(Boolean).length;
const printsBefore = fingerprints();

/* ---------- what each check's lines mean ---------- */
const results = {}; // id → { status, summary, detail[], at }
const warnings = [];
let summaryLine = null;
let pending = []; // indented lines printed before the result line they belong to (check-models)
let current = null; // the last model a result or header line named
const now = () => new Date().toISOString();

const parsers = {
  models(line) {
    const m = /^(FAILS|holds)\s+(\S+)\s*(.*)$/.exec(line);
    if (m) {
      const detail = [...pending];
      pending = [];
      results[m[2]] = { status: m[1] === 'holds' ? 'pass' : 'fail', summary: m[3], detail, at: now() };
      return;
    }
    if (/^\s+(page error|could not measure):/.test(line)) { pending.push(line.trim()); return; }
    if (/models hold the contract\.$/.test(line)) summaryLine = line.trim();
  },
  // stages: headers are timed as they arrive; the verdict is read from the report at the end
  stages(line) {
    if (/^[A-Za-z0-9_-]+$/.test(line) && known.has(line)) { current = line; results[line] = { status: 'unreported', summary: '', detail: [], at: now() }; }
    if (/^WARNING: src changed while this ran/.test(line)) warnings.push(line.trim());
    if (/models are the same everywhere/.test(line)) summaryLine = line.trim();
  },
  motion(line) {
    const m = /^(smooth|LOOK AT|BROKE)\s+(\S+)\s*(.*)$/.exec(line);
    if (m) {
      current = m[2];
      results[current] = { status: { smooth: 'pass', 'LOOK AT': 'flagged', BROKE: 'broke' }[m[1]], summary: m[3], detail: [], at: now() };
      return;
    }
    if (/^ {10}\S/.test(line) && current && results[current]) { results[current].detail.push(line.trim()); return; }
    if (/pass the automatic check/.test(line)) summaryLine = line.trim();
  },
};
const known = new Set(Object.keys(printsBefore));

/** check-stages' verdict, read from its report: every row of the table was measured; a row named under "Disagreements" failed. */
function finishStages(text) {
  const lines = text.split(/\r?\n/);
  const head = lines.findIndex((l) => /^model\s+card\s/.test(l));
  if (head < 0) return false;
  const measured = [];
  for (let i = head + 1; i < lines.length && lines[i].trim(); i++) measured.push(lines[i].split(/\s+/)[0]);
  const dis = lines.findIndex((l) => l.startsWith('Disagreements'));
  const failed = {};
  if (dis >= 0) {
    let who = null;
    for (let i = dis + 1; i < lines.length && lines[i].trim(); i++) {
      const top = /^ {2}(\S+)$/.exec(lines[i]);
      if (top) { who = top[1]; failed[who] = []; continue; }
      if (who && /^ {4}/.test(lines[i])) failed[who].push(lines[i].trim());
    }
  }
  const moves = lines.findIndex((l) => l.startsWith('The biggest movement'));
  const biggest = {};
  if (moves >= 0) for (let i = moves + 1; i < lines.length && lines[i].trim(); i++) {
    const m = /^ {2}(\S+)\s+(.*)$/.exec(lines[i]);
    if (m) biggest[m[1]] = m[2];
  }
  for (const id of measured) {
    const r = results[id] ?? { at: now() };
    results[id] = {
      status: failed[id] ? 'fail' : 'pass',
      summary: failed[id] ? `${failed[id].length} disagreement(s)` : 'same on every surface',
      detail: [...(failed[id] ?? []), ...(biggest[id] ? [`biggest movement: ${biggest[id]}`] : [])],
      at: r.at,
    };
  }
  for (const [id, r] of Object.entries(results)) if (r.status === 'unreported') delete results[id]; // started, never reached the report
  return true;
}

/* ---------- run it ---------- */
const child = spawn(process.execPath, [join('scripts', CHECKS[check]), ...args], { cwd: ROOT, stdio: ['inherit', 'pipe', 'pipe'] });
let all = '';
let partial = '';
child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  const text = chunk.toString('utf8');
  all += text;
  partial += text;
  const lines = partial.split(/\r?\n/);
  partial = lines.pop();
  for (const line of lines) parsers[check](line.replace(/^\.+/, '')); // check-models prints a dot per quiet pass, with no newline
});
child.stderr.on('data', (chunk) => process.stderr.write(chunk));
// Ctrl+C reaches the check too; stay alive long enough to record what it managed to report
process.on('SIGINT', () => {});

child.on('close', (code, signal) => {
  if (partial) parsers[check](partial.replace(/^\.+/, ''));
  if (!record) process.exit(code ?? 1);
  const finishedAt = now();
  let complete = true;
  if (check === 'stages') complete = finishStages(all);
  if (check === 'stages' && !complete) for (const id of Object.keys(results)) delete results[id];
  const printsAfter = fingerprints();

  const dir = join(ROOT, 'docs', 'checks');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${check}.json`);
  let old = { models: {}, runs: [] };
  if (existsSync(file)) { try { old = JSON.parse(readFileSync(file, 'utf8')); } catch { warnings.push(`the previous ${check}.json could not be read and was replaced`); } }
  const models = { ...(old.models ?? {}) };
  for (const [id, r] of Object.entries(results)) {
    models[id] = {
      status: r.status,
      summary: r.summary,
      detail: r.detail,
      ranAt: r.at,
      runId,
      commit,
      args,
      fingerprint: printsBefore[id] ?? null,
      sourceChangedDuringRun: (printsBefore[id] ?? null) !== (printsAfter[id] ?? null),
    };
  }
  const run = {
    runId, startedAt, finishedAt, script: `scripts/${CHECKS[check]}`, args, exitCode: code, signal,
    commit, uncommittedModelFiles: dirty, reported: Object.keys(results).length,
    summaryLine, warnings, complete: complete && code != null,
  };
  const out = {
    check,
    note: 'Written by scripts/capture-check.mjs from the check\'s own printed output. Do not edit by hand.',
    updatedAt: finishedAt,
    models,
    runs: [run, ...(old.runs ?? [])].slice(0, 30),
  };
  writeFileSync(`${file}.tmp`, JSON.stringify(out, null, 1));
  renameSync(`${file}.tmp`, file);
  console.error(`\ncapture-check: recorded ${run.reported} model result(s) in docs/checks/${check}.json${run.complete ? '' : ' (the run did not finish normally)'}.`);
  process.exit(code ?? 1);
});
