/**
 * The one gate every model has to pass: runs every check over every model and prints one summary.
 *
 *   npm run verify                      every check below over all models
 *   npm run verify -- --fast            only the quick ones (check-models, qa), for after every change
 *   npm run verify -- cube dice         only these models
 *   npm run verify -- --jobs 6          how many workers run at once (default: see JOBS below)
 *   npm run verify -- --no-build        qa on the dist/ already there, not a fresh build (it says how old)
 *
 * The checks, which this file only runs and reads, never changes:
 *   check-models   scripts/check-models.mjs   the view contract, on a card
 *   qa             scripts/qa.mjs             page errors, and whether the badge's interaction does anything
 *                                             (on the BUILT site, so the site is built first)
 *   check-stages   scripts/check-stages.mjs   the same model on every surface and export shape
 *   check-exports  scripts/check-exports.mjs  recordings and snapshots at every setting (only if the file exists)
 *   check-media    scripts/check-media.mjs    each model's share preview: image, tags, headline, picture
 *                                             (on the BUILT site, after its images are made with
 *                                             generate-media, which this runs for the models checked)
 *
 * Sharding: each check's model list is split into shards, and at most --jobs shards run at a time.
 * Every shard is a process of its own, so it has its own browser and its own Vite server on its own
 * port (the checks listen on port 0). check-exports goes one model per shard, since a single model
 * takes many minutes; the export service it talks to is shared, and started here if nothing already
 * answers on 127.0.0.1:8787, so the shards do not race to start one each.
 *
 * Converted or not: a model is converted when its snippet CSS sets `--u:`. Until the conversion pass
 * is done the unconverted ones are expected to fail, so every result is split in two, and a failure
 * in a converted model is never hidden among them.
 *
 * A model a check did not report on (the shard crashed, hung, or the check is missing) is "no
 * verdict", counted and named apart, never counted as held.
 *
 * Exit code: 0 everything held; 1 a converted model failed or had no verdict, or the build or a
 * check could not run; 2 only unconverted models failed.
 *
 * Every shard's full output is kept in a log directory, printed at the start and the end.
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, createWriteStream } from 'node:fs';
import { availableParallelism, freemem, totalmem, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer as createVite } from 'vite';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const fast = args.includes('--fast');
const noBuild = args.includes('--no-build');
const jobsAt = args.indexOf('--jobs');
const cores = availableParallelism();
const GB = 2 ** 30;
// Every worker is a Node process with Vite in it plus a Chromium, about a gigabyte between them, and
// the export shards make the service open a Chromium per file on top. So the default is what the
// free memory holds, never more than half the cores, and never under two.
const JOBS = jobsAt >= 0 ? Math.max(1, Number(args[jobsAt + 1]) || 1) : Math.max(2, Math.min(Math.floor(cores / 2), 8, Math.floor(freemem() / GB)));
const jobsWhy = jobsAt >= 0 ? 'as asked' : `default, from ${(freemem() / GB).toFixed(1)} GB free of ${(totalmem() / GB).toFixed(1)} GB and ${cores} cores`;
const wanted = args.filter((a, i) => !a.startsWith('--') && !(jobsAt >= 0 && i === jobsAt + 1));
const QUIET_LIMIT = 15 * 60_000; // a shard that prints nothing for this long is taken as hung

const started = Date.now();
const clock = (ms) => { const s = Math.round(ms / 1000); return s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor(s / 60) % 60).padStart(2, '0')}m` : s >= 60 ? `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s` : `${s}s`; };
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
const LOGS = join(tmpdir(), 'css-3d-lab-verify', stamp);
mkdirSync(LOGS, { recursive: true });

/* ---------------- the models, and which are converted ---------------- */
const vite = await createVite({ root: ROOT, server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom', logLevel: 'error' });
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { snippets } = await vite.ssrLoadModule('/src/models/snippets.ts');
await vite.close();
const all = demos.map((d) => d.id);
const unknown = wanted.filter((id) => !all.includes(id));
if (unknown.length) { console.error(`No such model: ${unknown.join(', ')}`); process.exit(1); }
const ids = wanted.length ? all.filter((id) => wanted.includes(id)) : all;
const converted = new Set(ids.filter((id) => /--u\s*:/.test(snippets?.[id]?.css ?? '')));

/* ---------------- the checks, and how to read each one's output ---------------- */
// Each parser returns { verdicts: Map(id -> { ok, why }), finished } for the ids it was given. An
// id missing from the map is "no verdict". `finished` is whether the check got to its own summary.
const CHECKS = [
  {
    name: 'check-models',
    script: 'scripts/check-models.mjs',
    fast: true,
    args: ['--pass'],
    // `FAILS   <id> <reasons>` or `holds   <id> <size>`, one line per model
    parse(out) {
      const verdicts = new Map();
      for (const line of out.split(/\r?\n/)) {
        const m = /^(FAILS|holds)\s+(\S+)\s*(.*)$/.exec(line);
        if (m) verdicts.set(m[2], { ok: m[1] === 'holds', why: m[1] === 'FAILS' ? m[3] : '' });
      }
      return { verdicts, finished: /models hold the contract\./.test(out) };
    },
  },
  {
    name: 'qa',
    script: 'scripts/qa.mjs',
    fast: true,
    args: [],
    needsBuild: true,
    // `QA: N demos, M problem(s)` then `  <id>: <problem>`; a model it does not name held
    parse(out, shard) {
      const at = out.search(/^QA: \d+ demos, \d+ problem/m);
      const verdicts = new Map();
      if (at < 0) return { verdicts, finished: false };
      const why = new Map();
      for (const line of out.slice(at).split(/\r?\n/).slice(1)) {
        const m = /^ {2}(\S+?): (.*)$/.exec(line);
        if (m && shard.includes(m[1])) why.set(m[1], [...(why.get(m[1]) ?? []), m[2]]);
      }
      for (const id of shard) verdicts.set(id, why.has(id) ? { ok: false, why: why.get(id).join('; ') } : { ok: true, why: '' });
      return { verdicts, finished: true };
    },
  },
  {
    name: 'check-stages',
    script: 'scripts/check-stages.mjs',
    fast: false,
    args: [],
    // `Disagreements (against the model's own page):` then `  <id>` and its `    <reason>` lines,
    // or `  none.`; it ends with `N/M models are the same everywhere`
    parse(out, shard) {
      const verdicts = new Map();
      const finished = /models are the same everywhere/.test(out);
      const at = out.indexOf("Disagreements (against the model's own page):");
      if (!finished || at < 0) return { verdicts, finished: false };
      const why = new Map();
      let current = null;
      for (const line of out.slice(at).split(/\r?\n/).slice(1)) {
        if (!line.trim()) break;
        const head = /^ {2}(\S+)$/.exec(line);
        if (head && shard.includes(head[1])) { current = head[1]; why.set(current, []); continue; }
        if (current && /^ {4}/.test(line)) why.get(current).push(line.trim());
      }
      for (const id of shard) verdicts.set(id, why.has(id) ? { ok: false, why: why.get(id).join('; ') } : { ok: true, why: '' });
      if (/WARNING: src changed while this ran/.test(out)) for (const v of verdicts.values()) v.unsteady = true;
      return { verdicts, finished: true };
    },
  },
  {
    name: 'check-media',
    script: 'scripts/check-media.mjs',
    fast: false,
    args: [],
    needsBuild: true,
    needsMedia: true,
    // `pass <id> …` or `FAILS <id> …` (reasons indented under it); it ends with `N/M share previews are right.`
    parse(out) {
      const verdicts = new Map();
      let current = null;
      for (const line of out.split(/\r?\n/)) {
        const m = /^(FAILS|pass)\s+(\S+)\s*(.*)$/.exec(line);
        if (m) { current = m[2]; verdicts.set(current, { ok: m[1] === 'pass', why: '' }); continue; }
        if (current && /^ {10}\S/.test(line) && !verdicts.get(current).ok) verdicts.get(current).why += (verdicts.get(current).why ? '; ' : '') + line.trim();
      }
      return { verdicts, finished: /share previews are right/.test(out) };
    },
  },
  {
    name: 'check-exports',
    script: 'scripts/check-exports.mjs',
    fast: false,
    args: [],
    perModel: true,
    needsService: true,
    // `N mismatches in X min:` then `  <id> <check> <what>: <detail>  [fault]`; `not testable here:`
    // lists what this browser cannot make, which is not a failure
    parse(out, shard) {
      const verdicts = new Map();
      const at = out.search(/^\d+ mismatch(es)? in [\d.]+ min:/m);
      if (at < 0) return { verdicts, finished: false };
      const why = new Map();
      for (const line of out.slice(at).split(/\r?\n/).slice(1)) {
        if (/^not testable here:/.test(line)) break;
        const m = /^ {2}(\S+)\s+(.*)$/.exec(line);
        if (m && shard.includes(m[1])) why.set(m[1], [...(why.get(m[1]) ?? []), m[2].replace(/\s+/, ' ')]);
      }
      for (const id of shard) verdicts.set(id, why.has(id) ? { ok: false, why: why.get(id).join('; ') } : { ok: true, why: '' });
      return { verdicts, finished: true };
    },
  },
];

const checks = CHECKS.filter((c) => !fast || c.fast);
const missing = checks.filter((c) => !existsSync(join(ROOT, c.script)));
const runnable = checks.filter((c) => !missing.includes(c));

console.log(`verify: ${ids.length} model${ids.length === 1 ? '' : 's'} (${converted.size} converted, ${ids.length - converted.size} not yet), ` +
  `${checks.map((c) => c.name).join(', ')}${fast ? ' (--fast)' : ''}; ${JOBS} jobs (${jobsWhy})`);
console.log(`logs: ${LOGS}`);
for (const c of missing) console.log(`MISSING ${c.script}: ${c.name} cannot run, so every model has no verdict for it`);

/* ---------------- processes ---------------- */
const children = new Set();
function killTree(child) {
  if (child.exitCode !== null) return;
  // a check's Chromium is a grandchild: on Windows killing Node alone leaves it running
  if (process.platform === 'win32') { try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} }
  else child.kill('SIGKILL');
}
process.on('SIGINT', () => { for (const c of children) killTree(c); process.exit(130); });

/** Runs one command to its end; its output goes to `log`. Resolves with { code, out, hung, ms }. */
function run(command, argv, log) {
  return new Promise((done) => {
    const t0 = Date.now();
    const file = createWriteStream(log);
    const child = spawn(command, argv, { cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0' }, shell: false, windowsHide: true });
    children.add(child);
    let out = '', hung = false;
    let quiet = setTimeout(stall, QUIET_LIMIT);
    function stall() { hung = true; file.write(`\n[verify] no output for ${clock(QUIET_LIMIT)}: stopped as hung\n`); killTree(child); }
    const take = (b) => { out += b; file.write(b); clearTimeout(quiet); quiet = setTimeout(stall, QUIET_LIMIT); };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('error', (e) => take(`\n[verify] could not start: ${e.message}\n`));
    child.on('close', (code) => { clearTimeout(quiet); children.delete(child); file.end(); done({ code, out, hung, ms: Date.now() - t0 }); });
  });
}

/* ---------------- the build qa needs ---------------- */
let buildOk = true, buildNote = '';
if (runnable.some((c) => c.needsBuild)) {
  if (noBuild) {
    const dist = join(ROOT, 'dist', 'index.html');
    buildOk = existsSync(dist);
    buildNote = buildOk ? `qa ran on the dist/ already there, built ${clock(Date.now() - statSync(dist).mtimeMs)} ago (--no-build)` : 'no dist/ to run qa on (--no-build)';
    console.log(buildNote);
  } else {
    process.stdout.write('building the site for qa (npm run build)... ');
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    // npm.cmd has to go through the shell on Windows
    const b = await new Promise((done) => {
      const t0 = Date.now();
      const log = join(LOGS, 'build.log');
      const file = createWriteStream(log);
      const child = spawn(npm, ['run', 'build'], { cwd: ROOT, shell: process.platform === 'win32', windowsHide: true, env: { ...process.env, FORCE_COLOR: '0' } });
      children.add(child);
      child.stdout.pipe(file, { end: false });
      child.stderr.pipe(file, { end: false });
      child.on('close', (code) => { children.delete(child); file.end(); done({ code, ms: Date.now() - t0 }); });
    });
    buildOk = b.code === 0;
    buildNote = buildOk ? `built in ${clock(b.ms)}` : `the build FAILED (exit ${b.code}, ${clock(b.ms)}): see ${join(LOGS, 'build.log')}`;
    console.log(buildNote);
  }
}

/* ---------------- the share images check-media looks at ---------------- */
let mediaOk = true, mediaNote = '';
if (buildOk && runnable.some((c) => c.needsMedia)) {
  process.stdout.write('making the share images for check-media (generate-media)... ');
  const m = await run(process.execPath, ['scripts/generate-media.mjs', ...(wanted.length ? ids : [])], join(LOGS, 'media.log'));
  mediaOk = m.code === 0;
  mediaNote = mediaOk ? `share images made in ${clock(m.ms)}` : `generate-media FAILED (exit ${m.code}): see ${join(LOGS, 'media.log')}`;
  console.log(mediaNote);
}

/* ---------------- the export service, one for every shard ---------------- */
let service = null, serviceNote = '';
if (runnable.some((c) => c.needsService)) {
  const answers = async () => {
    try { return (await fetch('http://127.0.0.1:8787/capture', { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:5173' }, signal: AbortSignal.timeout(2000) })).status === 204; }
    catch { return false; }
  };
  if (await answers()) serviceNote = 'export service: one already answered on 127.0.0.1:8787 and every shard used it';
  else {
    const { exportServer } = await import('../server/dev.mjs');
    service = await exportServer(8787);
    serviceNote = (await answers()) ? 'export service: started by verify on 127.0.0.1:8787, shared by every shard' : 'export service: could NOT be started on 127.0.0.1:8787';
  }
  console.log(serviceNote);
}

/* ---------------- shards, and the queue they run from ---------------- */
function split(list, n) {
  // round robin, so converted and unconverted models, and heavy and light ones, spread over the shards
  const out = Array.from({ length: Math.min(n, list.length) }, () => []);
  list.forEach((id, i) => out[i % out.length].push(id));
  return out;
}
const results = new Map(checks.map((c) => [c.name, { verdicts: new Map(), notes: [], first: null, last: null }]));
const tasks = [];
for (const c of runnable) {
  if (c.needsBuild && !buildOk) { results.get(c.name).notes.push(`not run: ${buildNote}`); continue; }
  if (c.needsMedia && !mediaOk) { results.get(c.name).notes.push(`not run: ${mediaNote}`); continue; }
  const shards = c.perModel ? ids.map((id) => [id]) : split(ids, JOBS);
  shards.forEach((shard, i) => tasks.push({ check: c, shard, n: i + 1, of: shards.length }));
}
// the quick checks first, so their answer is in early; the slow ones fill the workers after them
let done = 0;
const total = tasks.length;
async function worker() {
  for (let task = tasks.shift(); task; task = tasks.shift()) {
    const { check, shard, n, of } = task;
    const r = results.get(check.name);
    r.first ??= Date.now();
    const log = join(LOGS, `${check.name}-${String(n).padStart(3, '0')}.log`);
    const res = await run(process.execPath, [check.script, ...check.args, ...shard], log);
    r.last = Date.now();
    let parsed;
    try { parsed = check.parse(res.out, shard); } catch (e) { parsed = { verdicts: new Map(), finished: false }; r.notes.push(`shard ${n}: could not read its output (${e.message})`); }
    for (const id of shard) if (parsed.verdicts.has(id)) r.verdicts.set(id, parsed.verdicts.get(id));
    const lost = shard.filter((id) => !parsed.verdicts.has(id));
    if (res.hung) r.notes.push(`shard ${n} (${shard.length === 1 ? shard[0] : `${shard.length} models`}) hung and was stopped`);
    else if (!parsed.finished) r.notes.push(`shard ${n} (${shard.length === 1 ? shard[0] : `${shard.length} models`}) stopped before its summary (exit ${res.code}): ${log}`);
    if ([...parsed.verdicts.values()].some((v) => v.unsteady)) r.notes.push(`shard ${n}: src changed while it ran, so its models may have been measured on two versions of the site`);
    const held = shard.filter((id) => parsed.verdicts.get(id)?.ok).length;
    const failed = shard.filter((id) => parsed.verdicts.get(id) && !parsed.verdicts.get(id).ok).length;
    done++;
    console.log(`[${String(done).padStart(String(total).length)}/${total}] ${check.name} ${of > 1 ? `shard ${n}/${of}` : ''} ${shard.length === 1 ? shard[0] : `${shard.length} models`}` +
      ` in ${clock(res.ms)}: ${held} held, ${failed} failed${lost.length ? `, ${lost.length} no verdict` : ''}  (${clock(Date.now() - started)} so far)`);
  }
}
await Promise.all(Array.from({ length: Math.min(JOBS, total || 1) }, worker));
service?.close();

/* ---------------- the summary ---------------- */
const line = '='.repeat(78);
console.log(`\n${line}\nverify: ${ids.length} models (${converted.size} converted, ${ids.length - converted.size} not yet converted), ${JOBS} jobs, ${clock(Date.now() - started)}`);
if (buildNote) console.log(buildNote);
if (mediaNote) console.log(mediaNote);
if (serviceNote) console.log(serviceNote);
console.log(line);

const list = (xs) => (xs.length ? xs.join(', ') : '-');
let convertedBad = 0, unconvertedBad = 0, broken = missing.length > 0 || !buildOk || !mediaOk;
const badConverted = new Set(), badUnconverted = new Set();
for (const c of checks) {
  const r = results.get(c.name);
  const ran = r.first ? ` (${clock(r.last - r.first)})` : '';
  console.log(`\n${c.name}${missing.includes(c) ? ' — MISSING, not run' : ran}`);
  for (const [label, group] of [['converted', ids.filter((id) => converted.has(id))], ['unconverted', ids.filter((id) => !converted.has(id))]]) {
    if (!group.length) continue;
    const held = group.filter((id) => r.verdicts.get(id)?.ok);
    const failed = group.filter((id) => r.verdicts.has(id) && !r.verdicts.get(id).ok);
    const none = group.filter((id) => !r.verdicts.has(id));
    console.log(`  ${label.padEnd(11)} ${held.length}/${group.length} held, ${failed.length} failed${none.length ? `, ${none.length} no verdict` : ''}`);
    if (label === 'converted') {
      // the regressions: each with its reason, cut short (the log has it all)
      for (const id of failed) console.log(`    FAIL ${id.padEnd(14)} ${r.verdicts.get(id).why.slice(0, 150)}`);
      failed.forEach((id) => badConverted.add(id));
      none.forEach((id) => badConverted.add(id));
      convertedBad += failed.length + none.length;
    } else {
      if (failed.length) console.log(`    failed: ${list(failed)}`);
      failed.forEach((id) => badUnconverted.add(id));
      unconvertedBad += failed.length;
      if (none.length) broken = true;
    }
    if (none.length) console.log(`    no verdict: ${list(none)}`);
  }
  for (const note of r.notes) console.log(`  note: ${note}`);
}

console.log(`\n${line}`);
const code = broken || convertedBad ? 1 : unconvertedBad ? 2 : 0;
if (code === 0) console.log(`GATE HOLDS: every model held every check.`);
else {
  if (badConverted.size) console.log(`GATE FAILS: ${badConverted.size} converted model${badConverted.size === 1 ? '' : 's'} failed or had no verdict: ${list([...badConverted])}`);
  if (badUnconverted.size) console.log(`${badUnconverted.size} unconverted model${badUnconverted.size === 1 ? '' : 's'} failed (expected until they are converted): ${list([...badUnconverted])}`);
  if (missing.length) console.log(`missing check${missing.length === 1 ? '' : 's'}: ${missing.map((c) => c.script).join(', ')}`);
  if (!buildOk) console.log(`qa did not run: ${buildNote}`);
}
console.log(`exit ${code}   logs: ${LOGS}`);
process.exit(code);
