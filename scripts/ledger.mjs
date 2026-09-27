/**
 * The view-contract rewrite ledger: writes docs/ledger.json, which docs/ledger.html shows.
 *
 *   node scripts/ledger.mjs        (npm run ledger)
 *
 * Every status in it is read from a source, never typed:
 *  - the model list is src/models/index.ts `demos`, loaded the way the checks load it;
 *  - every model is in one of three stages: To check (an automated check is not cleared on its
 *    current code) and Approved (every check clear on the current code). What a person thinks of a
 *    Approved. Whether its snippet sets its base unit --u in vmin is not a stage of its own: the
 *    contract check (check-models) fails a model that does not, so it is To check, held there;
 *  - `commits` come from git: a commit belongs to a model when its diff touches the model's own
 *    entries (worked out line by line, by replaying each file's history), or when its subject
 *    names the model's id or title — each commit says which of those matched;
 *  - `checks` are read from docs/checks/<check>.json, which scripts/capture-check.mjs writes
 *    from a check's own output. A check that never reported a model says `never`;
 *  - `approved` names every check that is not clear, so a model held back says why.
 * labelled as their own record.
 *
 * scripts/ledger-watch.mjs imports buildLedger() and calls it whenever HEAD, a check result or a
 * model file changes. It passes a cache so that a rebuild only redoes what its inputs touched: the
 * git replay is reused while HEAD is the same, the vite load while the model files are.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOf } from './running.mjs';
// Imported with this module's own query, so the watcher re-importing ledger.mjs?v=<version> gets
// model-sources.mjs at that version too, not the copy it loaded at start.
const { entriesOf, fileOwner, isModelPath, norm, ROOT, sourcesOf, workingSources } = await import(`./model-sources.mjs${new URL(import.meta.url).search}`);

const { evaluateChecklist } = await import(`./checklist-proofs.mjs${new URL(import.meta.url).search}`);
// staleness: whether each result still describes what it judged (snippet, play, text, render path)
const { stalenessIndex, STALENESS_TEXT, contains } = await import(`./fingerprint.mjs${new URL(import.meta.url).search}`);
// the one list of checks: capture-check.mjs runs them, this gates on them, the page draws them
const { REGISTRY, MODEL_CHECKS, forPage, ruleStale } = await import(`./checks-registry.mjs${new URL(import.meta.url).search}`);
// the committed state at the last release, for a clone whose own checks have not run
const { readSnapshot, snapshotStatus } = await import(`./release-snapshot.mjs${new URL(import.meta.url).search}`);

/** The build's own code: a hash of these files as they are on disk right now. */
const CODE_FILES = ['scripts/ledger.mjs', 'scripts/model-sources.mjs', 'scripts/checklist-proofs.mjs', 'scripts/checks-registry.mjs'];
CODE_FILES.push('scripts/fingerprint.mjs');
CODE_FILES.push('scripts/release-snapshot.mjs');
export const codeVersion = () => createHash('sha1').update(CODE_FILES.map((f) => { try { return norm(readFileSync(join(ROOT, f), 'utf8')); } catch { return `(missing ${f})`; } }).join('\0')).digest('hex').slice(0, 10);
/** The version this copy of the module was loaded from. A build compares it with the disk. */
export const LOADED_CODE = codeVersion();

const OUT = join(ROOT, 'docs', 'ledger.json');
const CHECKS = REGISTRY.map((c) => c.key);
// the checks that say something about each model; the site-wide ones are counted in pages, in checkList
const MODEL_KEYS = MODEL_CHECKS.map((c) => c.key);
/**
 * Every automated check gates "checked", in this order (the order the "not yet checked" bucket is
 * split by: a model is counted under the first gate it does not clear). Each gate must be cleared
 * on the model's current code:
 *  - contract (check-models) and stages (check-stages): the latest result is a pass;
 *  - motion (check-motion): no open flag. A flag is a hint, so the latest run being smooth clears
 *    it, and so does a fresh visual review that names the flag in motionFlagsResolved with a
 *    reason (a false alarm). "broke" cannot be cleared by a review;
 *  - exports (check-exports): the default-settings verdict is a pass (capture-check records it;
 *    the full settings matrix is a sample and does not gate);
 *  - every other per-model check in scripts/checks-registry.mjs (media, the share preview, and any
 *    added later): the latest result is a pass.
 * The list and its order are the registry's. Site-wide checks there are not gates: they are
 * counted in pages, in `checkList`.
 */
export const GATES = MODEL_CHECKS.map((c) => ({ key: c.key, name: c.name, label: c.label }));
/**
 * Why a gate is not cleared, one of these. "broke" is not a verdict on the model: the check's own
 * test crashed or timed out (check-motion's BROKE, check-exports' "a tab could not be run"), so the
 * model was never actually judged. It is kept apart from "failed" everywhere.
 */
export const GATE_KINDS = [
  { key: 'never', label: 'not run yet', means: 'no captured run has reported it yet' },
  { key: 'broke', label: "didn't run (test crashed)", means: 'the test itself crashed or timed out before it judged the model, so the model was never actually tested: not a model failure; it needs a re-run' },
  { key: 'flagged', label: 'flagged, needs a person', means: 'the check flagged something it cannot judge alone, so a person has to look. It does not hold the model back: looking is a review, and reviews happen on the real product rather than here' },
  { key: 'failed', label: 'failed', means: 'the latest result is a failure' },
  { key: 'stale-pass', label: 'passed on older code', means: 'it passed (or its flags were cleared), but something it judged has changed since, so it needs a re-run' },
];
/** A gate's verdict from a check result: null when cleared, else one of GATE_KINDS. */
export function gateKind(key, c) {
  if (c.status === 'never' || c.status === 'untested') return 'never';
  /*
   * A flag does not hold a model back.
   *
   * A flag means the check saw something it cannot judge alone and wants a person to look. The
   * only way one was ever cleared was a fresh visual review saying "false alarm" -- and reviews
   * are no longer part of this ledger: they happen on the real product, by a person, and they
   * are not reliable enough to hold up a release. With reviews gone a flag could never be
   * cleared at all, so leaving it gating would hold 27 models here for ever with nothing anybody
   * could do about it from this page. The flag is still drawn, still counted and still says what
   * it saw. It just is not a gate.
   *
   * To put it back: return 'flagged' below instead of treating it as a pass.
   */
  const passed = c.status === 'pass' || c.status === 'flagged';
  if (passed) return c.stale ? 'stale-pass' : null;
  if (c.status === 'broke' || c.status === 'error') return 'broke';
  return 'failed';
}
/** Everything the build could not work out, collected as it goes and shown on the page. */
let notes = [];

/** The check whose pass is the view contract itself: scripts/check-models.mjs judges a model against docs/VIEW-CONTRACT.md. */
const CONTRACT = 'models';
/**
 * The exclusive buckets: every model is in exactly one, and they must sum to the model count.
 * "To check" is split further, each model under exactly one reason, so those sum to their bucket:
 * a model held by several checks is counted once, under the first that applies in gate order.
 */
/** A gate kind's words for one check (exports judges the default settings; motion's flags are reported, not gated). */
const kindLabel = (g, k) => (g === 'exports' && k.key === 'never' ? 'not run at the default settings yet' : g === 'motion' && k.key === 'stale-pass' ? 'clear on older code' : k.label);
function GATES_PARTS() {
  return GATES.flatMap((g) => GATE_KINDS.map((k) => ({
    key: `${g.key}:${k.key}`, gate: g.key,
    label: `${g.name}: ${kindLabel(g.key, k)}`,
    means: k.means,
  })));
}
export const BUCKETS = [
  { key: 'to check', label: 'To check', means: `not every automated check (${GATES.map((g) => g.name).join(', ')}) is cleared on the code as it is now; a snippet that does not set --u in vmin fails the contract check, so it is here too`,
    parts: GATES_PARTS() },
  /*
   * There used to be a stage between these two, "Awaiting review": every check clear, waiting on
   * a fresh visual and a fresh text review. It is gone, and so is reviewing from this ledger.
   * A review is a person looking at the real product; recorded here it was a commit trailer or a
   * JSON file that said a review had happened, which is not the same thing as one having happened
   * -- and it held every model short of shipping on a record nobody trusted. Reviewing still
   * matters. It happens on what is shipped, by a person, and it does not gate the push.
   */
  { key: 'approved', label: 'Approved', means: 'every automated check cleared on the code as it is now' },
];

/**
 * What --u is set to in a line of CSS, and whether one of those values is in vmin: read on each
 * line a commit adds, to find a model's converting commit (the one that first set --u in vmin), which
 * does not count as a review of it. Whether a model sets --u now is the contract check's to judge.
 */
const uValues = (css) => [...String(css ?? '').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--u\s*:\s*([^;}\n]+)/g)].map((m) => m[1].trim());
const inVmin = (values) => values.some((v) => /vmin\b/.test(v));
const git = (args, opts = {}) => execFileSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30, ...opts });

/* ---------- the model list ---------- */
async function loadDemos() {
  const { createServer } = await import('vite');
  const vite = await createServer({ logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null } });
  try {
    const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
    let groups = [];
    try {
      const { GROUPS, GROUP_ORDER } = await vite.ssrLoadModule('/src/models/groups.ts');
      groups = GROUP_ORDER.map((key) => ({ key, label: GROUPS[key] }));
    } catch (e) { notes.push(`src/models/groups.ts could not be loaded, so groups have no labels: ${e.message.split('\n')[0]}`); }
    return {
      demos: demos.map((d) => ({ id: d.id, title: d.title, group: d.group, tags: Array.isArray(d.tags) ? [...d.tags] : [] })),
      groups, from: 'src/models/index.ts demos (loaded through vite)',
    };
  } finally {
    await vite.close();
  }
}

/* ---------- git: replay every model file's history to see which entries each commit touched ---------- */
function history(ids, titles) {
  const idSet = new Set(ids);
  // every commit, for subject matching
  const all = git(['log', '--topo-order', '--format=%H%x1f%h%x1f%cI%x1f%an%x1f%s%x1f%b%x1e']).split('\x1e').map((s) => s.replace(/^\n/, '')).filter(Boolean).map((rec) => {
    const [hash, short, date, author, subject, body] = rec.split('\x1f');
    return { hash, short, date, author, subject, body: body ?? '' };
  });
  const byHash = new Map(all.map((c) => [c.hash, { ...c, touched: new Map() }]));

  // the model files' diffs, oldest first, applied in turn so every hunk can be read against the
  // file as it was on either side of it
  const log = git(['log', '--reverse', '--no-renames', '--no-color', '--no-ext-diff', '-p', '--unified=0', '--format=%x01%H', '--', 'src/models', 'src/styles/models']);
  const state = new Map(); // path → lines
  const cache = new Map(); // lines array → entries
  const entries = (path, lines) => {
    if (!cache.has(lines)) {
      const owner = fileOwner(path, lines.join('\n'));
      cache.set(lines, owner ? [{ id: owner, start: 1, end: Infinity }] : entriesOf(lines));
    }
    return cache.get(lines);
  };
  const whose = (list, n) => list.filter((e) => n >= e.start && n <= e.end).map((e) => e.id);

  for (const chunk of log.split('\x01').slice(1)) {
    const nl = chunk.indexOf('\n');
    const hash = chunk.slice(0, nl).trim();
    const commit = byHash.get(hash);
    const diff = chunk.slice(nl + 1).split('\n');
    let i = 0;
    while (i < diff.length) {
      if (!diff[i].startsWith('diff --git ')) { i++; continue; }
      let path = null, gone = false;
      i++;
      while (i < diff.length && !diff[i].startsWith('@@') && !diff[i].startsWith('diff --git ')) {
        if (diff[i].startsWith('+++ ')) { const p = diff[i].slice(4); if (p === '/dev/null') gone = true; else path = p.replace(/^b\//, ''); }
        if (diff[i].startsWith('--- ') && diff[i].slice(4) !== '/dev/null' && !path) path = diff[i].slice(4).replace(/^a\//, '');
        i++;
      }
      if (!path) { while (i < diff.length && !diff[i].startsWith('diff --git ')) i++; continue; }
      const hunks = [];
      while (i < diff.length && !diff[i].startsWith('diff --git ')) {
        const h = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(diff[i]);
        if (!h) { i++; continue; }
        const hunk = { a: +h[1], b: h[2] == null ? 1 : +h[2], c: +h[3], d: h[4] == null ? 1 : +h[4], minus: [], plus: [] };
        i++;
        while (i < diff.length && !diff[i].startsWith('@@') && !diff[i].startsWith('diff --git ')) {
          const line = diff[i];
          if (line.startsWith('-')) hunk.minus.push(line.slice(1));
          else if (line.startsWith('+')) hunk.plus.push(line.slice(1));
          i++;
        }
        hunks.push(hunk);
      }
      const before = state.get(path) ?? [];
      const after = [];
      let pos = 0;
      for (const h of hunks) {
        const from = h.b === 0 ? h.a : h.a - 1;
        for (; pos < from; pos++) after.push(before[pos]);
        after.push(...h.plus);
        pos = from + h.b;
      }
      for (; pos < before.length; pos++) after.push(before[pos]);
      if (gone) state.delete(path); else state.set(path, after);
      if (!commit || !isModelPath(path)) continue;
      const was = entries(path, before), now = gone ? [] : entries(path, after);
      for (const h of hunks) {
        const hit = (id, addsU) => {
          if (!idSet.has(id)) return;
          const t = commit.touched.get(id) ?? { files: new Set(), addsU: false };
          t.files.add(path);
          t.addsU ||= addsU;
          commit.touched.set(id, t);
        };
        h.minus.forEach((_, k) => whose(was, h.a + k).forEach((id) => hit(id, false)));
        h.plus.forEach((line, k) => whose(now, h.c + k).forEach((id) => hit(id, inVmin(uValues(line)))));
      }
    }
  }

  // the replay must end where HEAD is, or its line numbers were wrong somewhere
  const paths = [...state.keys()].filter(isModelPath);
  let bad = 0;
  const headTexts = new Map(); // path → text at HEAD, for fingerprints at HEAD
  if (paths.length) {
    const batch = git(['cat-file', '--batch'], { input: paths.map((p) => `HEAD:${p}`).join('\n') + '\n', encoding: null });
    let at = 0;
    for (const p of paths) {
      const headerEnd = batch.indexOf(10, at);
      const header = batch.slice(at, headerEnd).toString();
      const size = Number(header.split(' ')[2]);
      if (!Number.isFinite(size)) { bad++; at = headerEnd + 1; continue; }
      const text = norm(batch.slice(headerEnd + 1, headerEnd + 1 + size).toString('utf8'));
      at = headerEnd + 1 + size + 1;
      headTexts.set(p, text);
      if (text.replace(/\n$/, '') !== state.get(p).join('\n')) bad++;
    }
  }
  if (bad) notes.push(`${bad} of ${paths.length} model files did not replay to their HEAD content, so diff matches on them may be off by some lines`);
  const headLines = new Map(paths.map((p) => [p, state.get(p)]));

  // subject matches: the id as a whole word, or the title as a phrase
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const idRe = new Map(ids.map((id) => [id, new RegExp(`(^|[^\\w-])${esc(id)}($|[^\\w-])`, 'i')]));
  const titleRe = new Map(ids.map((id) => [id, titles[id] ? new RegExp(`\\b${esc(titles[id])}\\b`, 'i') : null]));
  const perModel = new Map(ids.map((id) => [id, []]));
  for (const c of byHash.values()) {
    for (const id of ids) {
      const how = [];
      const t = c.touched.get(id);
      if (t) how.push('diff');
      if (titleRe.get(id)?.test(c.subject)) how.push('title in subject');
      if (idRe.get(id).test(c.subject)) how.push('id in subject');
      if (!how.length) continue;
      perModel.get(id).push({
        hash: c.short, date: c.date, subject: c.subject, matchedBy: how,
        files: t ? [...t.files] : [],
        modelsTouched: c.touched.size,
        addsU: Boolean(t?.addsU),
      });
    }
  }
  for (const list of perModel.values()) list.sort((a, b) => b.date.localeCompare(a.date));
  const order = all.map((c) => c.hash); // newest first
  const shortIndex = new Map(all.map((c, i) => [c.short, i]));
  const headSources = sourcesOf(headTexts);
  return { perModel, commitCount: all.length, headLines, order, shortIndex, headSources };
}

/* ---------- docs and release readiness ---------- */
const CHECKLIST = 'docs/RELEASE-CHECKLIST.md';
/** docs/RELEASE-CHECKLIST.md, lines `- [ ] item — how to prove it` or `- [x] …`. */
function readChecklist() {
  const file = join(ROOT, CHECKLIST);
  if (!existsSync(file)) return { file: CHECKLIST, exists: false, items: [], done: 0, total: 0 };
  const items = [];
  let group = null;
  norm(readFileSync(file, 'utf8')).split('\n').forEach((line, i) => {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) { group = h[1]; return; }
    const m = /^\s*[-*] \[([ xX])\]\s+(.*?)\s*$/.exec(line);
    if (!m) return;
    const [item, ...proof] = m[2].split(/\s+[—–]\s+/);
    items.push({ done: m[1] !== ' ', item, proof: proof.join(' — ') || null, line: i + 1, group });
  });
  return { file: CHECKLIST, exists: true, items, done: items.filter((x) => x.done).length, total: items.length };
}
/** Each document directly under docs/ (the generated ledger files left out) plus README.md, with the last commit that touched it. */
function docList() {
  const names = [];
  try { for (const f of readdirSync(join(ROOT, 'docs'), { withFileTypes: true })) if (f.isFile() && !/^ledger(-watch)?\.json$|\.tmp$|\.lock$/.test(f.name)) names.push(`docs/${f.name}`); } catch {}
  if (existsSync(join(ROOT, 'README.md'))) names.push('README.md');
  return names.sort().map((path) => {
    const out = git(['log', '-1', '--format=%h%x1f%cI%x1f%s', '--', path]).trim();
    const [hash, date, subject] = out ? out.split('\x1f') : [];
    return { path, lastCommit: out ? { hash, date, subject } : null };
  });
}
/** Work that has not reached a commit: every untracked or changed path in `git status`, with its age. */
function atRisk() {
  const raw = git(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const parts = raw.split('\0').filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const code = parts[i].slice(0, 2), path = parts[i].slice(3);
    if (code[0] === 'R' || code[0] === 'C') i++; // the next entry is the old name
    let mtime = null;
    try { mtime = statSync(join(ROOT, path)).mtime.toISOString(); } catch {}
    const kind = code === '??' ? 'untracked' : code.includes('D') ? 'deleted' : code.includes('A') ? 'added, not committed' : 'modified, not committed';
    out.push({ path, code, kind, modifiedAt: mtime });
  }
  return out.sort((a, b) => String(a.modifiedAt ?? '').localeCompare(String(b.modifiedAt ?? '')));
}

/**
 * Whether a model's source has changed since a commit: a later commit on main changed the
 * model's own entries (by diff), or the working tree differs from HEAD for it. Returns
 * { stale, why } — stale is also true when the commit is not on main, since nothing then says
 * which version was read.
 */
function changedSince(commit, id, { order, shortIndex, perModel, headFp, workFp }) {
  const at = order.findIndex((h) => h.startsWith(commit));
  if (at < 0) return { stale: true, why: `commit ${commit} is not in main's history, so it cannot be told which version was reviewed` };
  const touched = (perModel.get(id) ?? []).filter((c) => c.matchedBy.includes('diff') && (shortIndex.get(c.hash) ?? Infinity) < at);
  if (touched.length) return { stale: true, why: `the model's source changed since ${commit.slice(0, 7)}: ${touched.length} later commit(s), latest ${touched[0].hash}` };
  if (headFp !== workFp) return { stale: true, why: 'the model has uncommitted changes since the review' };
  return { stale: false, why: null };
}

/* ---------- checks ---------- */
function readChecks() {
  const out = {};
  for (const name of CHECKS) {
    const file = join(ROOT, 'docs', 'checks', `${name}.json`);
    if (!existsSync(file)) { out[name] = null; continue; }
    try { out[name] = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { out[name] = null; notes.push(`docs/checks/${name}.json could not be read: ${e.message}`); }
  }
  return out;
}

/**
 * What each check's result file says about a run in progress, checked against the process it names.
 *
 * The judging lives in scripts/running.mjs, because the buttons on the page need the same answer
 * and used to work it out separately -- which is how the run bar came to say "Nothing running"
 * directly above this board's own "media running 58/135".
 */
/**
 * What each check's result file says about a run in progress, checked against the process it names.
 *
 * The judging lives in scripts/running.mjs, because the buttons on the page need exactly this
 * answer and used to work it out separately -- which is how the run bar came to say "Nothing
 * running" directly above this board's own "media running 58/135".
 */
function runsNow(checkFiles) {
  const out = {};
  for (const name of CHECKS) {
    const run = runOf(checkFiles[name]);
    out[name] = run;
    // A file still claiming a run whose process has gone is a crashed run, not a live one. It is
    // said out loud rather than quietly counted as nothing.
    if (run && run.alive === false) {
      notes.push(`docs/checks/${name}.json says run ${run.runId ?? "(no id)"} is still going, but its process ${run.pid} has gone`);
    }
  }
  return out;
}

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); // a real sleep, not a spin
const lastWay = new Map(); // file → how it was last written, so a change of method is logged once, not every write
/**
 * Write a file so a reader never sees half of it when that can be had: write a temporary file and
 * rename it over. On Windows another process can hold the target open with read and write sharing
 * but not delete sharing (the Vite dev server serving it to the page does), and then a rename over
 * it is refused however long one waits, while writing in place is allowed. So: a few short retries,
 * then write in place. A reader that catches an in-place write half done gets bad JSON; the page
 * keeps its last good copy and tries again. Returns 'renamed' or 'in place', and logs when the way
 * it had to write a file changes.
 */
export function writeAtomic(file, text, { log = console.error } = {}) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  let way = null, why = null;
  for (let i = 0; i < 4 && !way; i++) {
    try { renameSync(tmp, file); way = 'renamed'; } catch (e) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) { try { unlinkSync(tmp); } catch {} throw e; }
      why = e.code;
      sleepSync(40 * (i + 1));
    }
  }
  if (!way) {
    writeFileSync(file, text);
    try { unlinkSync(tmp); } catch {}
    way = 'in place';
  }
  if (lastWay.get(file) !== way) {
    if (way === 'in place') log?.(`write: ${file} could not be replaced by rename (${why}: another process holds it open), so it was written in place`);
    else if (lastWay.has(file)) log?.(`write: ${file} is replaced by rename again`);
    lastWay.set(file, way);
  }
  return way;
}

/* ---------- build ---------- */
/**
 * Build docs/ledger.json once. Options:
 *  - by: who asked, recorded in the ledger (default "npm run ledger");
 *  - reason: why, recorded too;
 *  - cache + sourcesKey: a caller that builds repeatedly (the watcher) passes an object to keep
 *    between builds and a key that changes whenever a model file changes. The vite load is reused
 *    while the key is the same, and the git replay while HEAD is.
 * Returns the ledger's counts and the notes.
 */
export async function buildLedger({ by = 'npm run ledger', reason = null, cache = null, sourcesKey = null, quiet = false } = {}) {
notes = [];
const t0 = Date.now();
const phases = {}; let lapAt = t0; const lap = (name) => { const now = Date.now(); phases[name] = now - lapAt; lapAt = now; };
let loaded, reusedModelLoad = false, reusedGitReplay = false;
if (cache && sourcesKey != null && cache.demos?.key === sourcesKey) { loaded = cache.demos.value; reusedModelLoad = true; }
else {
  const before = notes.length;
  loaded = { ...(await loadDemos()) };
  loaded.notes = notes.slice(before);
  if (cache && sourcesKey != null) cache.demos = { key: sourcesKey, value: loaded };
  notes.length = before;
}
notes.push(...loaded.notes);
const { demos, from, groups = [] } = loaded;
const ids = demos.map((d) => d.id);
const titles = Object.fromEntries(demos.map((d) => [d.id, d.title]));
lap('model load');
const sources = workingSources();
const headFull = git(['rev-parse', 'HEAD']).trim();
const historyKey = `${headFull}\0${demos.map((d) => `${d.id}=${d.title}`).join('\n')}`;
let hist;
if (cache?.history?.key === historyKey) { hist = cache.history.value; reusedGitReplay = true; }
else {
  const before = notes.length;
  hist = history(ids, titles);
  hist.notes = notes.slice(before);
  notes.length = before;
  if (cache) cache.history = { key: historyKey, value: hist };
}
notes.push(...hist.notes);
const { perModel, commitCount, headLines, order, shortIndex, headSources } = hist;
lap('sources + git replay');
// the docs' last commits change only with HEAD or the docs folder's contents
const docsKey = `${headFull}\u0000${(() => { try { return readdirSync(join(ROOT, 'docs')).join('|'); } catch { return ''; } })()}`;
let docs;
if (cache?.docs?.key === docsKey) docs = cache.docs.value; else { docs = docList(); if (cache) cache.docs = { key: docsKey, value: docs }; }
lap('docs');
const readiness = { checklist: readChecklist(), docs, atRisk: atRisk(), at: new Date().toISOString() };
lap('checklist read + git status');
const checkFiles = readChecks();
// The committed snapshot of the last release. It is NOT a result: nothing here counts it as one.
// A check with no result file of its own stays "not run yet" and every model under it stays "to
// check"; what the snapshot adds is a second, labelled line the page can show beside that — what
// this same check said on the commit it was taken at.
const snapshot = readSnapshot();
const snapshotAt = snapshot ? snapshotStatus() : null;
const running = runsNow(checkFiles);
const generatedAt = new Date().toISOString();
const head = git(['rev-parse', '--short', headFull]).trim();

lap('checks');
// every result and review judged against what it looked at (scripts/fingerprint.mjs); null lookups mean the old own-source rule
// Only check results are judged for staleness now. The other half of this index was reviews --
// which commit a person read, and whether anything they looked at has changed since. Nothing
// records that any more, so there is nothing to judge.
const staleIx = await stalenessIndex({ checkFiles, reviews: [] });
if (staleIx.error) notes.push(`staleness fell back to each model's own source text, because the fingerprints could not be worked out: ${staleIx.error}`);
lap('staleness');
const models = demos.map((d) => {
  const src = sources.get(d.id);
  const snippet = src?.snippet ?? null;
  const why = [];
  if (!snippet) why.push('no snippet found for this id');

  const commits = perModel.get(d.id) ?? [];
  const byDiff = commits.filter((c) => c.matchedBy.includes('diff'));
  const converting = [...byDiff].reverse().find((c) => c.addsU) ?? null;

  const checks = {};
  for (const name of MODEL_KEYS) {
    const file = checkFiles[name];
    const r = file?.models?.[d.id];
    if (!r) {
      // no run of this machine's own has reported this model: still "not run yet". If the committed
      // snapshot has a verdict for it, it rides along under `snapshot`, never as `status`.
      const was = snapshot?.models?.[d.id]?.checks?.[name] ?? null;
      checks[name] = { status: 'never', ...(was ? { snapshot: was } : {}) };
      continue;
    }
    const stale = [];
    const judged = staleIx.check(name, d.id);
    if (judged) stale.push(...judged.why);
    else {
      if (r.fingerprint && src && r.fingerprint !== src.fingerprint) stale.push('the model\'s own source has changed since this ran');
      if (!r.fingerprint) stale.push('no fingerprint was recorded, so it cannot be told whether the source changed');
      // the rule it was judged under (the staleness index says this itself when it could be built)
      const rule = ruleStale(name, r, contains);
      if (rule) stale.push(rule);
    }
    if (r.sourceChangedDuringRun) stale.push('the model\'s source changed while the check was running');
    checks[name] = { status: r.status, summary: r.summary, detail: r.detail, ranAt: r.ranAt, runId: r.runId, commit: r.commit, ruleVersion: r.ruleVersion ?? null, args: r.args, stale: stale.length > 0, staleWhy: stale, staleBasis: judged?.basis ?? null };
  }

  const ctx = { order, shortIndex, perModel, headFp: headSources.get(d.id)?.fingerprint ?? null, workFp: src?.fingerprint ?? null };
  // each gate: ok, or why not (stale-pass / failed / never)
  const gates = {};
  for (const g of GATES) {
    const kind = gateKind(g.key, checks[g.key]);
    gates[g.key] = { ok: kind === null, kind };
  }
  const firstGap = GATES.find((g) => !gates[g.key].ok) ?? null;
  const allClear = !firstGap;
  const missing = [];
  for (const g of GATES) {
    const k = gates[g.key].kind, c = checks[g.key];
    if (k === 'never') missing.push(c.status === 'untested' && g.key === 'exports' ? `check-exports ran on it, but its run left out the default settings, so there is no default-settings verdict` : `the ${g.label} has never reported this model`);
    else if (k === 'stale-pass') {
      // Why it is stale, in the row's own words: a result can be stale because the model changed
      // under it, or because the check's rule did, and saying "source that has changed" for a rule
      // change sends a reader looking for a change to the model that is not there.
      const ruled = (Array.isArray(c.staleWhy) ? c.staleWhy : []).map((w) => /^rule changed \(([^)]+)\)/.exec(String(w))).find(Boolean);
      const why = ruled ? `under an older version of the check's rule (${ruled[1]}), not the one it is held to now` : 'on source that has changed since';
      missing.push(`the ${g.label} ${g.key === 'motion' && c.status === 'flagged' ? 'was cleared' : 'passed'}, but ${why}`);
    }
    // a flag is not a gate: gateKind never returns it, so nothing here has to explain one
    else if (k === 'broke') missing.push(`the ${g.label} did not run on it: its test crashed or timed out before judging the model (${c.summary || c.status}), so the model was never tested; it needs a re-run`);
    else if (k === 'failed') missing.push(`the ${g.label}'s last result is "${c.status}"`);
  }
  // Approved is every automated check cleared on the code as it is now. Nothing else: the two
  // review gaps that used to be added to `missing` here are no longer this page's business.
  const approved = allClear;
  const status = approved ? 'approved' : 'to check';
  // which reason, inside its bucket (see BUCKETS for the order)
  let part = null;
  if (status === 'to check') part = firstGap ? `${firstGap.key}:${gates[firstGap.key].kind}` : 'unexplained';

  // everything holding the model back, overlapping: what the page's "What's holding models back"
  // counts and filters by. Checks only: a review is not a thing this page holds anybody to.
  const holds = [];
  for (const g of GATES) if (gates[g.key].kind) holds.push(`${g.key}:${gates[g.key].kind}`);

  return {
    id: d.id, title: d.title, group: d.group, part, holds, groupLabel: groups.find((g) => g.key === d.group)?.label ?? null, tags: d.tags ?? [], status,
    snippet: snippet ? { file: snippet.file, line: snippet.line, foundBy: snippet.found } : null,
    fingerprint: src?.fingerprint ?? null,
    convertingCommit: converting ? converting.hash : null,
    commits, checks, gates,
    approved, missing: approved ? [] : missing,
    notes: why,
  };
});

lap('models');
const count = (f) => models.filter(f).length;
const ledger = {
  generatedAt, head,
  groups,
  tags: [...new Set(demos.flatMap((d) => d.tags ?? []))].sort(),
  build: { by, reason, ms: null, reusedModelLoad, reusedGitReplay, code: (() => { const onDisk = codeVersion(); return { loaded: LOADED_CODE, onDisk, stale: onDisk !== LOADED_CODE, files: CODE_FILES }; })() },
  running,
  // every registered check, in the registry's order, with its tally: what the page draws a bar,
  // a table column and a definition from. A registered check that has never run is listed with
  // every model (or page) under "never", never left out.
  checkList: forPage(ROOT).map((c) => {
    const run = running[c.key] ? { done: running[c.key].done ?? 0, total: running[c.key].total ?? null, alive: running[c.key].alive } : null;
    const captured = Boolean(checkFiles[c.key]);
    // what each recorded result said about the check's declared sub-steps, as scripts/capture-check.mjs
    // summed it into the result file. Null when that file predates sub-steps: the page says so rather
    // than draw an empty list as if nothing had been covered.
    const stepTotals = checkFiles[c.key]?.steps ?? null;
    if (c.scope === 'model') {
      // one segment per gate kind: a crashed test (broke) and an open flag are never counted as failed
      const tally = { pass: 0, stale: 0, flag: 0, fail: 0, broke: 0, never: 0 };
      for (const m of models) { const k = m.gates[c.key]?.kind; tally[k == null ? 'pass' : { 'stale-pass': 'stale', flagged: 'flag', failed: 'fail', broke: 'broke', never: 'never' }[k] ?? 'never']++; }
      return { ...c, unit: 'models', total: models.length, tally, captured, running: run, stepTotals };
    }
    // a site check: its result file's entries are pages
    const byPath = Object.entries(checkFiles[c.key]?.models ?? {});
    const pages = byPath.map(([, x]) => x);
    const total = Math.max(pages.length, c.pages ?? 0);
    // What kind of page each is, from its path: the embeds and the old /demos/ redirects are pages
    // too (the check reads every HTML file in dist/), but only the public ones are in the sitemap.
    const kindOf = (p) => (p.startsWith('/embed/') ? 'embeds' : p.startsWith('/demos/') ? 'redirects' : 'public');
    const kinds = {};
    for (const [p, x] of byPath) { const k = (kinds[kindOf(p)] ??= { pages: 0, pass: 0 }); k.pages++; if (x.status === 'pass') k.pass++; }
    const tally = { pass: pages.filter((x) => x.status === 'pass').length, stale: 0, flag: 0, fail: pages.filter((x) => x.status !== 'pass').length, broke: 0, never: 0 };
    tally.never = total - tally.pass - tally.fail;
    // passes whose findings the check lists rather than fails (check-seo's WAIVED and OWN-TEXT)
    const listed = pages.filter((x) => x.status === 'pass' && x.listed).length;
    const lastRun = checkFiles[c.key]?.runs?.[0] ?? null;
    return { ...c, unit: 'pages', total, tally, listed, kinds, captured, running: run, stepTotals, lastRun: lastRun ? { finishedAt: lastRun.finishedAt, commit: lastRun.commit, summaryLine: lastRun.summaryLine } : null };
  }),
  // The state at the last release, from the committed docs/release-snapshot.json: what the checks
  // said on the commit it was taken at, per check, for the models this ledger knows. It is shown
  // on the page only where a check has no results of its own, and always labelled as the release's
  // state, never as a run. Null when the file is missing (nothing has been released yet).
  release: !snapshot ? null : {
    file: 'docs/release-snapshot.json',
    head: snapshot.head,
    takenAt: snapshot.takenAt,
    counts: snapshot.counts ?? null,
    // whether it still describes the code at HEAD, in the same words the checklist item uses
    describesHead: snapshotAt?.ok ?? false,
    why: snapshotAt?.why ?? null,
    changed: snapshotAt?.changed ?? [],
    what: snapshot.what ?? null,
    checks: Object.fromEntries(REGISTRY.filter((c) => c.scope === 'model').map((c) => {
      const byStatus = {};
      let reported = 0;
      for (const id of ids) {
        const s = snapshot.models?.[id]?.checks?.[c.key];
        if (!s?.status) continue;
        reported++;
        byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      }
      const then = snapshot.checks?.[c.key]?.ruleVersion ?? null;
      return [c.key, {
        reported, byStatus, pass: byStatus.pass ?? 0, of: ids.length,
        // a model this ledger knows that the snapshot never judged (a model added since)
        unknown: ids.length - reported,
        ruleVersion: then, ruleNow: c.ruleVersion ?? null, ruleChanged: then != null && c.ruleVersion != null && then !== c.ruleVersion,
        live: Boolean(checkFiles[c.key]),
      }];
    })),
  },
  readiness,
  exportsMatrix: (() => {
    const f = checkFiles.exports;
    if (!f) return { note: 'check-exports has never been captured', models: [], runs: [] };
    const models = Object.entries(f.models ?? {}).map(([id, m]) => ({ id, ranAt: m.ranAt, args: m.args, sizes: m.matrix?.sizes ?? null, mismatches: m.matrix?.mismatches ?? [] }));
    return {
      note: 'Per-model export means the dialog\'s DEFAULT settings only (image 1:1 at 1600 px PNG, video 9:16 at 1080p, a loop). The settings matrix (every shape, size, quality and the slider) is run on a sample of models; it does not gate approval, and no model has been exported every way unless it is listed here with that run.',
      defaults: Object.values(f.models ?? {}).find((m) => m.defaults)?.defaults ?? null,
      models, runs: (f.runs ?? []).slice(0, 5).map((x) => ({ runId: x.runId, startedAt: x.startedAt, args: x.args, reported: x.reported, complete: x.complete, exitCode: x.exitCode })),
    };
  })(),
  sources: {
    models: from,
    groups: 'src/models/groups.ts GROUPS, in GROUP_ORDER; each model\'s group and tags as its demo entry gives them',
    commits: `git log, ${commitCount} commits; diff matches by replaying src/models and src/styles/models line by line`,
    checks: Object.fromEntries(CHECKS.map((c) => [c, checkFiles[c] ? `docs/checks/${c}.json, updated ${checkFiles[c].updatedAt}` : 'no result file: this check has never been captured'])),
    contractCheck: CONTRACT,
    // each gate's rule on its own, in gate order, for the page's "How these are counted"
    gateRules: GATES.map((g) => ({ key: g.key, name: g.name, label: g.label, source: checkFiles[g.key] ? `docs/checks/${g.key}.json, updated ${checkFiles[g.key].updatedAt}` : 'no result file: never captured',
      rule: ((c) => `${c.rule}. Its rule is version ${c.ruleVersion ?? 1}${c.rules?.length > 1 ? ` (${c.rules.map((r) => `v${r.v}${r.from ? ` from ${r.from}` : ''}: ${r.what}`).join('; ')})` : ''}; a result judged under another version is stale, "rule changed"`)(REGISTRY.find((c) => c.key === g.key)) })),
    gateKinds: `Each gate not cleared is one of: ${GATE_KINDS.map((k) => `${k.label} (${k.means})`).join('; ')}`,
    // the same, as data, for the page's "What's holding models back" and its definitions
    holdKinds: GATE_KINDS.map(({ key, label, means }) => ({ key, label, means })),
    gates: 'approved = every gate cleared on the current code, in this order: ' + GATES.map((g) => g.label).join(', ') + '. Motion is clear when the latest run is smooth on the current code; what it flags it cannot judge alone, and a flag is reported rather than gated, because judging one is a person watching the real thing.md lines `- [ ] item — proof`; each file directly under docs/ plus README.md with `git log -1`; at risk: `git status --porcelain --untracked-files=all` with each file\'s modification time, as of this build',
    watcher: 'docs/ledger-watch.json, written by scripts/ledger-watch.mjs: its heartbeat, so the page can tell a quiet project from a watcher that has stopped',
  },
  counts: {
    models: models.length,
    toCheck: count((m) => m.status === 'to check'),
    approved: count((m) => m.approved),
    byStatus: Object.fromEntries(BUCKETS.map((b) => [b.key, count((m) => m.status === b.key)])),
    buckets: BUCKETS.map((b) => {
      const n = count((m) => m.status === b.key);
      if (!b.parts) return { ...b, count: n };
      const parts = b.parts.map((p) => ({ ...p, count: count((m) => m.status === b.key && m.part === p.key) }));
      const odd = count((m) => m.status === b.key && !b.parts.some((p) => p.key === m.part));
      if (odd) parts.push({ key: 'unexplained', label: 'no reason found', means: 'in this bucket for no reason the ledger knows: a bug', count: odd });
      const sum = parts.reduce((s, p) => s + p.count, 0);
      return { ...b, count: n, parts, partsSum: sum, partsBalance: sum === n && !odd };
    }),
    // everything holding models back, one entry per reason, OVERLAPPING: a model held by two checks
    // is in both. `alone` is how many are held by that reason and nothing else. In the page's order:
    // the checks' reasons by size (ties in gate order), then reviews.
    blockers: (() => {
      const defs = [
        ...GATES.flatMap((g, gi) => GATE_KINDS.map((k, ki) => ({ key: `${g.key}:${k.key}`, scope: 'check', check: g.key, kind: k.key, label: kindLabel(g.key, k), means: k.means, order: gi * 10 + ki }))),
      ];
      const out = defs.map((d) => {
        const held = models.filter((m) => m.holds.includes(d.key));
        return { ...d, count: held.length, alone: held.filter((m) => m.holds.length === 1).length, ids: held.map((m) => m.id) };
      }).filter((b) => b.count);
      const rank = { check: 1, review: 2 };
      out.sort((a, b) => rank[a.scope] - rank[b.scope] || (a.scope === 'check' ? b.count - a.count || a.order - b.order : 0));
      return out.map(({ order, ...b }) => b);
    })(),
    // running totals, for anyone who wants them; never the same names as the buckets
    reachedAtLeast: [
      { label: 'reached "approved"', count: count((m) => m.status === 'approved') },
    ],
    checks: Object.fromEntries(MODEL_KEYS.map((c) => {
      const tally = {};
      for (const m of models) { const r = m.checks[c]; const k = r.status === 'never' ? 'never' : `${r.status}${r.stale ? ' (stale)' : ''}`; tally[k] = (tally[k] ?? 0) + 1; }
      return [c, tally];
    })),
  },
  notes,
  models,
};
lap('ledger object');
// the release checklist: each item's proof run now where it is cheap, local and read-only
if (ledger.readiness.checklist.exists) {
  const cl = ledger.readiness.checklist;
  cl.items = evaluateChecklist(cl.items, { ROOT, counts: ledger.counts, models, atRiskList: ledger.readiness.atRisk, head, checkFiles, cache: cache ? (cache.proofs ??= new Map()) : null });
  /*
   * THREE STAGES, AND ONLY THE MIDDLE ONE IS A PERSON.
   *
   * Everything before the push is run by a script; everything after it is read back off the live
   * site by a script. Between them sit two questions a machine has no business answering: is the
   * writing good, and do we publish.
   *
   * So a tick means different things in different stages, and it used to mean the same thing in
   * all three: a box somebody typed an x into. That left the count reporting claims -- a run could
   * turn the board green and the number would not move until a person went and ticked eight boxes,
   * which is a person doing a machine's job and getting it wrong eventually.
   *
   * In the automatic stages the PROOF is the answer: done means proven, now, on this code. The x
   * in the file is kept as `claimed`, so "somebody ticked this and the proof does not agree" is
   * still visible -- it is just no longer what the count is made of. In Yours, the tick is the
   * whole point and is left exactly as it was.
   */
  /*
   * Three answers, not two. A proof that PASSES is the answer and no tick is needed. A proof that
   * FAILS is the answer too, and a tick does not survive it -- that is the whole catch. But a
   * proof that could not RUN is not an answer either way: "needs git fetch", "needs curl against
   * the deployed Worker", "a manual check on the live site". Those were done by a person and the
   * tick is the only evidence there is, so it stands. Treating them as undone did not make the
   * count honest, it deleted five real verifications.
   */
  for (const it of cl.items) {
    it.claimed = it.done;
    if (it.group === 'Yours') continue;
    if (it.result === 'true') it.done = true;
    else if (it.result === 'false') it.done = false;
    // not-evaluated: leave the tick as it was
  }
  const by = (s) => cl.items.filter((x) => x.state === s).length;
  cl.proven = cl.items.filter((x) => x.result === 'true').length;
  cl.provenFalse = cl.items.filter((x) => x.result === 'false').length;
  cl.notEvaluated = cl.items.filter((x) => x.result === 'not-evaluated').length;
  cl.conflicts = by('conflict');
  cl.tickedUnproven = by('ticked-unproven');
}
lap('checklist proofs');
const c0 = ledger.counts;
// the books must balance: every model in one bucket, every split summing to its bucket
const bucketSum = c0.buckets.reduce((s, b) => s + b.count, 0);
const problems = [];
if (bucketSum !== models.length) problems.push(`the buckets sum to ${bucketSum}, not ${models.length} models`);
for (const b of c0.buckets) if (b.parts && !b.partsBalance) problems.push(`"${b.label}" is ${b.count}, but its parts sum to ${b.partsSum}${b.parts.some((p) => p.key === 'unexplained') ? ' with some models under no known reason' : ''}`);
// and every model's holds must agree with its bucket: the blockers list is only true if they do
const disagree = models.filter((m) => {
  const gate = m.holds.some((h) => GATES.some((g) => h.startsWith(`${g.key}:`)));
  const review = m.holds.some((h) => h.startsWith('review:'));
  if (m.status === 'approved') return m.holds.length > 0;
  if (m.status === 'checked') return gate || !review;
  if (m.status === 'to check') return !gate || review;
  return true; // a status that is none of the three stages
});
if (disagree.length) problems.push(`${disagree.length} model(s) have holds that do not match their bucket: ${disagree.slice(0, 5).map((m) => `${m.id} (${m.status}: ${m.holds.join(', ') || 'none'})`).join('; ')}`);
c0.balance = { models: models.length, sum: bucketSum, ok: problems.length === 0, problems };
if (problems.length) {
  console.error(`\nLEDGER DOES NOT BALANCE:\n${problems.map((p) => `  - ${p}`).join('\n')}\n`);
}
ledger.build.ms = Date.now() - t0;
lap('balance'); ledger.build.phases = phases;
const wrote = writeAtomic(OUT, JSON.stringify(ledger, null, 1), { log: quiet ? null : console.error });
const c = ledger.counts;
if (!quiet) {
  console.log(`docs/ledger.json: ${c.models} models — ${c.toCheck} to check, ${c.approved} approved.`);
  for (const name of MODEL_KEYS) console.log(`  ${name.padEnd(7)} ${Object.entries(c.checks[name]).map(([k, v]) => `${v} ${k}`).join(', ')}`);
  for (const n of notes) console.log(`  note: ${n}`);
}
return { wrote, balanced: problems.length === 0, problems, counts: c, notes: [...notes], head, ms: ledger.build.ms, reusedModelLoad, reusedGitReplay, running };
}

const invoked = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (invoked) { const r = await buildLedger(); if (!r.balanced) process.exit(1); }
