/**
 * Runs one of the model checks exactly as it is, shows its output as it comes, and keeps what it
 * said per model in docs/checks/<check>.json for scripts/ledger.mjs to read.
 *
 *   node scripts/capture-check.mjs models [args…]   scripts/check-models.mjs
 *   node scripts/capture-check.mjs stages [args…]   scripts/check-stages.mjs
 *   node scripts/capture-check.mjs motion [args…]   scripts/check-motion.mjs
 *   node scripts/capture-check.mjs exports [args…]  scripts/check-exports.mjs
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
 *  - exports: a model's name on its own line starts its section, `    MISMATCH <check> <what>: …`
 *    lines belong to it, and the next name (or the closing tally) ends it. The check prints no
 *    per-model verdict, so the wrapper records two things from those lines. The model's STATUS is
 *    the verdict at the export dialog's DEFAULT settings (src/video.ts: image 1:1 at 1600 px PNG,
 *    video 9:16 at 1080p, a loop, fill 70%): "pass" when the run included those settings and none
 *    of its mismatches is about them, "fail" when one is, "error" when a tab could not be run, and
 *    "untested" when the run's arguments left the defaults out (--quick, SIZES, --only). Everything
 *    else it printed (other shapes, sizes, qualities, the slider) is kept apart as `matrix`: the
 *    settings matrix, which is run on a sample and is not part of the per-model verdict.
 *
 * Each model's entry is replaced only when this run reported it, so a run over two models keeps
 * the last known result of the other 133. Every entry carries the moment its line was printed, the
 * run it came from, HEAD at the time, and a fingerprint of the model's own source (see
 * model-sources.mjs) taken when the run started, so the ledger can tell a result that still
 * describes the code from one that is stale.
 *
 * While the run goes, the file is rewritten as each model's result arrives (at most every half
 * second), with `running: true` and `progress: { done, total, … }`, so the ledger and its page can
 * show a run in progress. `total` is what the check will go through, worked out from the same
 * arguments the check reads; `totalIsEstimate` says when it is inferred rather than named on the
 * command line. check-stages only gives its verdicts in the report at the end, so during its run
 * `done` counts the models it has started measuring and no result is written until the end.
 * The final write clears `running`. If the wrapper dies without it, `progress.pid` lets a reader
 * see the run is gone.
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fingerprints, ROOT, workingSources } from './model-sources.mjs';

const CHECKS = { models: 'check-models.mjs', stages: 'check-stages.mjs', motion: 'check-motion.mjs', exports: 'check-exports.mjs' };
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
  exports(line) {
    if (/^[A-Za-z0-9_-]+$/.test(line) && known.has(line)) {
      if (current && results[current]) { results[current].complete = true; finalizeExport(current); }
      current = line;
      results[line] = { status: 'unreported', summary: '', detail: [], at: now(), mismatches: [] };
      return;
    }
    const m = /^\s+MISMATCH (\S+) (.+?): (.*?)(?:\s+\[(.*)\])?$/.exec(line);
    if (m && current && results[current]) { results[current].mismatches.push({ check: m[1], what: m[2], detail: m[3], fault: m[4] ?? null }); results[current].at = now(); return; }
    if (/^\d+ mismatch(es)? in [\d.]+ min:$/.test(line)) { if (current && results[current]) { results[current].complete = true; finalizeExport(current); } summaryLine = line.trim(); }
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

/** The export dialog's defaults (src/video.ts fresh()), and which of the check's mismatch labels are about them. */
const EXPORT_DEFAULTS = { image: '1:1 at 1600 px, PNG', video: '9:16 at 1080p, MP4, a loop', fill: '70%' };
const isDefault = (x) => x.check === 'run'
  || (x.check === 'dims' && ['image 1:1 canvas', 'image 1:1 1600', 'video 9:16 1080p'].includes(x.what))
  || (x.check === 'picture' && ['image 1:1 1600', 'video 9:16 1080p', 'video 9:16 loop frame 0'].includes(x.what))
  || (x.check === 'detail' && x.what === 'image 1:1 1600')
  || (x.check === 'drift' && x.what === '9:16')
  || (x.check === 'formats' && x.what === 'png');
/** Whether this run's arguments made the default settings at all (check-exports' own rules for --quick, SIZES and --only). */
function exportsCovered() {
  const why = [];
  if (args.includes('--quick')) why.push('--quick makes 800 px and 480p/2160p only');
  const sizes = (process.env.SIZES || '800,1600,3200').split(',').map(Number);
  if (!sizes.includes(1600)) why.push(`SIZES=${process.env.SIZES} leaves out 1600 px`);
  const at = args.indexOf('--only');
  if (at >= 0) { const only = new Set(String(args[at + 1]).split(',')); for (const k of ['dims', 'picture', 'drift', 'formats']) if (!only.has(k)) why.push(`--only leaves out ${k}`); }
  return { covered: why.length === 0, why };
}
function finishExports() {
  for (const [id, r] of Object.entries(results)) {
    if (!r.complete) { delete results[id]; continue; } // its section never finished: nothing to say about it
    finalizeExport(id);
  }
  return true;
}
/** One model's export verdict, made as soon as its section ends, so progress writes carry it. */
function finalizeExport(id) {
  const r = results[id];
  if (!r || r.status !== 'unreported') return;
  const cov = exportsCovered();
  {
    const def = r.mismatches.filter(isDefault);
    const harness = def.filter((x) => x.check === 'run');
    r.status = !cov.covered ? 'untested' : harness.length ? 'error' : def.length ? 'fail' : 'pass';
    r.summary = r.status === 'untested' ? `default settings not in this run: ${cov.why.join('; ')}`
      : r.status === 'error' ? `a tab could not be run: ${harness.map((x) => x.detail).join('; ')}`
      : r.status === 'fail' ? `${def.length} mismatch(es) at the default settings`
      : `the default picture and video match the canvas (${EXPORT_DEFAULTS.image}; ${EXPORT_DEFAULTS.video})`;
    r.detail = def.map((x) => `${x.check} ${x.what}: ${x.detail}${x.fault ? ` [${x.fault}]` : ''}`);
    r.extra = { defaults: EXPORT_DEFAULTS, matrix: { note: 'every setting this run made, not only the defaults; the full matrix is run on a sample of models', args, sizes: process.env.SIZES || null, mismatches: r.mismatches.filter((x) => !isDefault(x)) } };
  }
}

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

/* ---------- what the run will go through (for progress only; the check decides for itself) ---------- */
function expectedTotal() {
  const named = args.filter((a, i) => !a.startsWith('-') && !(i > 0 && ['--tol', '--size', '--frames', '--only', '--json'].includes(args[i - 1])));
  if (named.length) return { total: named.length, totalIsEstimate: false, totalFrom: 'the model ids named on the command line' };
  try {
    const src = workingSources();
    const demoIds = [...src].filter(([, m]) => m.parts.some((p) => p.kind === 'demo' || (p.whole && p.file.includes('/charts/')))).map(([id]) => id);
    const converted = demoIds.filter((id) => src.get(id)?.snippet?.css.includes('--u:'));
    if (check === 'models') return { total: demoIds.length, totalIsEstimate: true, totalFrom: 'every model with a gallery entry in src/models, as check-models runs with no ids' };
    if (check === 'motion') return args.includes('--all')
      ? { total: demoIds.length, totalIsEstimate: true, totalFrom: 'every model (--all)' }
      : { total: converted.length, totalIsEstimate: true, totalFrom: 'the converted models (snippet CSS with --u:), as check-motion runs with no ids' };
    if (check === 'exports') {
      const list = /const SAMPLE = \[([^\]]*)\]/.exec(readFileSync(join(ROOT, 'scripts', CHECKS.exports), 'utf8'));
      if (list) return { total: (list[1].match(/'[^']+'/g) ?? []).length, totalIsEstimate: true, totalFrom: 'check-exports\' own SAMPLE list, as it runs with no ids' };
    }
    if (check === 'stages') {
      const list = /const CONVERTED = \[([^\]]*)\]/.exec(readFileSync(join(ROOT, 'scripts', CHECKS.stages), 'utf8'));
      if (list) return { total: (list[1].match(/'[^']+'/g) ?? []).length, totalIsEstimate: true, totalFrom: 'check-stages\' own CONVERTED list, as it runs with no ids' };
    }
  } catch {}
  return { total: null, totalIsEstimate: true, totalFrom: 'unknown' };
}
const expected = record ? expectedTotal() : null;

/* ---------- the result file ---------- */
const dir = join(ROOT, 'docs', 'checks');
const file = join(dir, `${check}.json`);
let old = null;
function readOld() {
  if (old) return old;
  old = { models: {}, runs: [] };
  if (existsSync(file)) { try { old = JSON.parse(readFileSync(file, 'utf8')); } catch { warnings.push(`the previous ${check}.json could not be read and was replaced`); } }
  // a run that died mid-way left its flag behind; it is not this run's
  delete old.running; delete old.progress;
  return old;
}
function entry(r, printsNow) {
  const extra = r.extra ?? {};
  const id = r.id;
  return {
    status: r.status,
    summary: r.summary,
    detail: r.detail,
    ranAt: r.at,
    runId,
    commit,
    args,
    fingerprint: printsBefore[id] ?? null,
    sourceChangedDuringRun: (printsBefore[id] ?? null) !== (printsNow[id] ?? null),
    ...extra,
  };
}
function writeOut(out) {
  mkdirSync(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(out, null, 1));
  for (let i = 0; ; i++) {
    try { renameSync(tmp, file); return; } catch (e) {
      if (i >= 20 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      const until = Date.now() + 25 * (i + 1);
      while (Date.now() < until) { /* a reader has the file open; try again shortly */ }
    }
  }
}
const reportedNow = () => Object.entries(results).filter(([, r]) => r.status !== 'unreported');
/** Mid-run: everything reported so far, merged over the last known results, flagged as running. */
function writeProgress() {
  const o = readOld();
  const printsNow = fingerprints();
  const models = { ...(o.models ?? {}) };
  const done = reportedNow();
  if (check !== 'stages') for (const [id, r] of done) models[id] = entry({ ...r, id }, printsNow);
  const started = Object.keys(results).length;
  writeOut({
    check,
    note: 'Written by scripts/capture-check.mjs from the check\'s own printed output. Do not edit by hand.',
    updatedAt: now(),
    running: true,
    progress: {
      runId, startedAt, pid: process.pid, script: `scripts/${CHECKS[check]}`, args, commit,
      done: check === 'stages' ? started : done.length,
      counts: check === 'stages' ? 'models started (check-stages gives its verdicts only at the end)' : 'models reported',
      ...expected,
      last: current ?? done.at(-1)?.[0] ?? null,
      updatedAt: now(),
    },
    models,
    runs: o.runs ?? [],
  });
}
let progressTimer = null;
let lastProgress = 0;
function progressSoon() {
  if (!record || progressTimer) return;
  const wait = Math.max(0, 500 - (Date.now() - lastProgress));
  progressTimer = setTimeout(() => {
    progressTimer = null;
    lastProgress = Date.now();
    try { writeProgress(); } catch (e) { console.error(`capture-check: could not write progress: ${e.message}`); }
  }, wait);
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
  const seen = `${Object.keys(results).length}:${Object.values(results).reduce((n, r) => n + r.detail.length, 0)}`;
  if (seen !== lastSeen) { lastSeen = seen; progressSoon(); }
});
let lastSeen = '0:0';
if (record) progressSoon(); // done 0 of total, straight away
child.stderr.on('data', (chunk) => process.stderr.write(chunk));
// Ctrl+C reaches the check too; stay alive long enough to record what it managed to report
process.on('SIGINT', () => {});

child.on('close', (code, signal) => {
  if (partial) parsers[check](partial.replace(/^\.+/, ''));
  if (!record) process.exit(code ?? 1);
  if (progressTimer) { clearTimeout(progressTimer); progressTimer = null; }
  const finishedAt = now();
  let complete = true;
  if (check === 'stages') complete = finishStages(all);
  if (check === 'exports') complete = finishExports();
  if (check === 'stages' && !complete) for (const id of Object.keys(results)) delete results[id];
  const printsAfter = fingerprints();

  const o = readOld();
  const models = { ...(o.models ?? {}) };
  for (const [id, r] of Object.entries(results)) models[id] = entry({ ...r, id }, printsAfter);
  const run = {
    runId, startedAt, finishedAt, script: `scripts/${CHECKS[check]}`, args, exitCode: code, signal,
    commit, uncommittedModelFiles: dirty, reported: Object.keys(results).length,
    expected: expected?.total ?? null, expectedIsEstimate: expected?.totalIsEstimate ?? true,
    summaryLine, warnings, complete: complete && code != null,
  };
  const out = {
    check,
    note: 'Written by scripts/capture-check.mjs from the check\'s own printed output. Do not edit by hand.',
    updatedAt: finishedAt,
    running: false,
    models,
    runs: [run, ...(o.runs ?? [])].slice(0, 30),
  };
  writeOut(out);
  console.error(`\ncapture-check: recorded ${run.reported} model result(s) in docs/checks/${check}.json${run.complete ? '' : ' (the run did not finish normally)'}.`);
  process.exit(code ?? 1);
});
