/**
 * The view-contract rewrite ledger: writes docs/ledger.json, which docs/ledger.html shows.
 *
 *   node scripts/ledger.mjs        (npm run ledger)
 *
 * Every status in it is read from a source, never typed:
 *  - the model list is src/models/index.ts `demos`, loaded the way the checks load it;
 *  - `converted` is whether the model's snippet CSS contains `--u:` in the working tree (the
 *    snippet is found by its `  <id>: {` line; see model-sources.mjs), and `convertedInHead`
 *    the same question asked of HEAD;
 *  - `commits` come from git: a commit belongs to a model when its diff touches the model's own
 *    entries (worked out line by line, by replaying each file's history), or when its subject
 *    names the model's id or title — each commit says which of those matched;
 *  - `checks` are read from docs/checks/<check>.json, which scripts/capture-check.mjs writes
 *    from a check's own output. A check that never reported a model says `never`;
 *  - `approved` needs four facts and names each one that is missing.
 * The queue of running and planned work is docs/ledger-queue.json, which the lead session and its
 * agents report through scripts/queue.mjs. It is not read here: the page shows it separately,
 * labelled as their own record.
 *
 * scripts/ledger-watch.mjs imports buildLedger() and calls it whenever HEAD, a check result or a
 * model file changes. It passes a cache so that a rebuild only redoes what its inputs touched: the
 * git replay is reused while HEAD is the same, the vite load while the model files are.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entriesOf, fileOwner, isModelPath, norm, ROOT, sourcesOf, workingSources } from './model-sources.mjs';

const OUT = join(ROOT, 'docs', 'ledger.json');
const CHECKS = ['models', 'stages', 'motion'];
/** The check whose pass counts as "checked" and towards approval: scripts/check-models.mjs judges a model against docs/VIEW-CONTRACT.md. */
const CONTRACT = 'models';
/**
 * How a review is recorded in git. A commit is a REVIEW of a model when it touches the model and
 * carries a `Reviewed-by:` trailer, or its subject starts with "Review". It is a TEXT REVIEW when
 * it carries a `Text-reviewed-by:` trailer, or its subject starts with "Text review" or
 * "Review the text". These are the only markers the ledger accepts; a commit without one is not a
 * review, however it is worded.
 */
const REVIEW = { trailer: /^Reviewed-by:/im, subject: /^Review\b/i };
const TEXT_REVIEW = { trailer: /^Text-reviewed-by:/im, subject: /^(Text review|Review the text)\b/i };

let notes = [];

/**
 * The exclusive buckets: every model is in exactly one, and they must sum to the model count.
 * Two of them are split further, each model under exactly one reason, so those sum to their bucket.
 * For "checked, awaiting approval" a model missing several things is counted once, under the first
 * reason that applies in the order written here.
 */
export const BUCKETS = [
  { key: 'not converted', label: 'Not converted', means: 'the snippet does not set --u in vmin' },
  { key: 'converted', label: 'Converted, not yet checked', means: 'sets --u in vmin, but has no passing contract check on the code as it is now',
    parts: [
      { key: 'stale-pass', label: 'passed on older code', means: 'the contract check passed, but the model changed since' },
      { key: 'failed', label: 'failed the check', means: 'the latest contract check did not pass' },
      { key: 'never', label: 'never checked', means: 'no captured contract check has reported it' },
    ] },
  { key: 'checked', label: 'Checked, awaiting approval', means: 'a fresh contract pass, but its reviews do not yet approve it',
    parts: [
      { key: 'no-visual', label: 'no visual review', means: 'no visual review at all' },
      { key: 'no-text', label: 'no text review', means: 'no text review at all' },
      { key: 'stale-review', label: 'stale review', means: 'every review of one kind is on older code' },
      { key: 'problem', label: 'a review found a problem', means: 'the latest fresh review of one kind says "problem"' },
    ] },
  { key: 'approved', label: 'Approved', means: 'checked, plus a fresh visual and a fresh text review, neither "problem"' },
];

/**
 * What `--u` is set to in some CSS, comments left out. A model is CONVERTED when its snippet sets
 * --u in vmin (the contract's unit, e.g. `--u: 0.3vmin`). One that sets --u only in some other
 * unit (lattice's `--u: 50px` spacing) is not converted; it is listed apart, as "uses --u but not
 * in vmin".
 */
export const uValues = (css) => [...String(css ?? '').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--u\s*:\s*([^;}\n]+)/g)].map((m) => m[1].trim());
export const inVmin = (values) => values.some((v) => /vmin\b/.test(v));
/** 'vmin' | 'other' | null (no --u at all) */
const unitOf = (css) => { const v = uValues(css); return !v.length ? null : inVmin(v) ? 'vmin' : 'other'; };
const git = (args, opts = {}) => execFileSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30, ...opts });

/* ---------- the model list ---------- */
async function loadDemos() {
  const { createServer } = await import('vite');
  const vite = await createServer({ logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null } });
  try {
    const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
    let snippets = null;
    try { ({ snippets } = await vite.ssrLoadModule('/src/models/snippets.ts')); } catch (e) { notes.push(`the snippet map could not be loaded, so the runtime cross-check of --u: was skipped: ${e.message.split('\n')[0]}`); }
    let groups = [];
    try {
      const { GROUPS, GROUP_ORDER } = await vite.ssrLoadModule('/src/models/groups.ts');
      groups = GROUP_ORDER.map((key) => ({ key, label: GROUPS[key] }));
    } catch (e) { notes.push(`src/models/groups.ts could not be loaded, so groups have no labels: ${e.message.split('\n')[0]}`); }
    return {
      demos: demos.map((d) => ({ id: d.id, title: d.title, group: d.group, tags: Array.isArray(d.tags) ? [...d.tags] : [] })),
      groups, snippets, from: 'src/models/index.ts demos (loaded through vite)',
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
        review: REVIEW.trailer.test(c.body) || REVIEW.subject.test(c.subject),
        textReview: TEXT_REVIEW.trailer.test(c.body) || TEXT_REVIEW.subject.test(c.subject),
      });
    }
  }
  for (const list of perModel.values()) list.sort((a, b) => b.date.localeCompare(a.date));
  const order = all.map((c) => c.hash); // newest first
  const shortIndex = new Map(all.map((c, i) => [c.short, i]));
  const headSources = sourcesOf(headTexts);
  return { perModel, commitCount: all.length, headLines, order, shortIndex, headSources };
}

/** Whether the snippet in HEAD (not the working tree) already sets --u in vmin. */
function convertedAt(lines, id) {
  if (!lines) return null;
  const e = entriesOf(lines).find((x) => x.id === id && x.kind === 'snippet');
  if (!e) return null;
  const body = lines.slice(e.start - 1, e.end).join('\n');
  const at = body.search(/^    css:/m);
  return at >= 0 && unitOf(body.slice(at)) === 'vmin';
}

/* ---------- docs and release readiness ---------- */
const CHECKLIST = 'docs/RELEASE-CHECKLIST.md';
/** docs/RELEASE-CHECKLIST.md, lines `- [ ] item — how to prove it` or `- [x] …`. */
function readChecklist() {
  const file = join(ROOT, CHECKLIST);
  if (!existsSync(file)) return { file: CHECKLIST, exists: false, items: [], done: 0, total: 0 };
  const items = [];
  norm(readFileSync(file, 'utf8')).split('\n').forEach((line, i) => {
    const m = /^\s*[-*] \[([ xX])\]\s+(.*?)\s*$/.exec(line);
    if (!m) return;
    const [item, ...proof] = m[2].split(/\s+[—–]\s+/);
    items.push({ done: m[1] !== ' ', item, proof: proof.join(' — ') || null, line: i + 1 });
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

/* ---------- reviews: commit markers and the review log ---------- */
const REVIEW_DIR = join(ROOT, 'docs', 'reviews');
const KINDS = ['text', 'visual'];
const VERDICTS = ['fine', 'fixed', 'problem'];
/**
 * docs/reviews/*.json, written by review agents. A file holds one entry, an array of them, or
 * { entries: [...] }. An entry is { model, kind: "text" | "visual", reviewer,
 * verdict: "fine" | "fixed" | "problem", reviewedAt, commit }, where commit is the HEAD the
 * reviewer read. A "fixed" entry may carry fixCommit, the commit holding the fix; staleness is
 * then judged from that commit, so the fix itself does not make the review stale. An entry that does not fit is left out, and the notes say which and why.
 */
function readReviewLog(known) {
  const entries = [];
  let files = [];
  try { files = readdirSync(REVIEW_DIR).filter((f) => f.endsWith('.json')).sort(); } catch { return { entries, files: 0 }; }
  for (const f of files) {
    let data;
    try { data = JSON.parse(readFileSync(join(REVIEW_DIR, f), 'utf8')); } catch (e) { notes.push(`docs/reviews/${f} is not valid JSON, so none of its reviews count: ${e.message}`); continue; }
    const list = Array.isArray(data) ? data : Array.isArray(data?.entries) ? data.entries : [data];
    list.forEach((e, i) => {
      const where = `docs/reviews/${f}${list.length > 1 ? ` entry ${i + 1}` : ''}`;
      const bad = [];
      if (!known.has(e?.model)) bad.push(`"${e?.model}" is not a model id`);
      if (!KINDS.includes(e?.kind)) bad.push(`kind "${e?.kind}" is not text or visual`);
      if (!VERDICTS.includes(e?.verdict)) bad.push(`verdict "${e?.verdict}" is not fine, fixed or problem`);
      if (typeof e?.commit !== 'string' || !/^[0-9a-f]{4,40}$/i.test(e.commit)) bad.push('no commit (the HEAD the reviewer read)');
      if (!e?.reviewer) bad.push('no reviewer');
      if (!Number.isFinite(Date.parse(e?.reviewedAt))) bad.push('no valid reviewedAt');
      if (bad.length) { notes.push(`${where} was left out: ${bad.join('; ')}`); return; }
      const fix = typeof e.fixCommit === 'string' && /^[0-9a-f]{4,40}$/i.test(e.fixCommit) ? e.fixCommit.toLowerCase() : null;
      if (e.fixCommit != null && !fix) notes.push(`${where}: fixCommit "${e.fixCommit}" is not a commit hash, so staleness is judged from commit instead`);
      entries.push({ model: e.model, kind: e.kind, reviewer: String(e.reviewer), verdict: e.verdict, reviewedAt: e.reviewedAt, commit: e.commit.toLowerCase(), fixCommit: fix, file: `docs/reviews/${f}` });
    });
  }
  return { entries, files: files.length };
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

/** Whether a process id is alive on this machine. A capture that says it is running records its pid. */
function alive(pid) {
  if (!Number.isInteger(pid)) return null;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

/** What each check's result file says about a run in progress, checked against the process it names. */
function runsNow(checkFiles) {
  const out = {};
  for (const name of CHECKS) {
    const f = checkFiles[name];
    if (!f?.running) { out[name] = null; continue; }
    const p = f.progress ?? {};
    const isAlive = alive(p.pid);
    out[name] = { ...p, alive: isAlive };
    if (isAlive === false) notes.push(`docs/checks/${name}.json says run ${p.runId ?? '(no id)'} is still going, but its process (pid ${p.pid}) is gone: it stopped without finishing. The ${p.done ?? '?'} result(s) it wrote are kept; the rest of that run never reported.`);
  }
  return out;
}

/** Write through a temporary file and a rename, so a reader never sees half a file. Windows can refuse the rename while the file is open elsewhere, so it is retried briefly. */
export function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  for (let i = 0; ; i++) {
    try { renameSync(tmp, file); return; } catch (e) {
      if (i >= 20 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      const until = Date.now() + 25 * (i + 1);
      while (Date.now() < until) { /* brief wait; the lock is usually a reader finishing */ }
    }
  }
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
const { demos, snippets, from, groups = [] } = loaded;
const ids = demos.map((d) => d.id);
const titles = Object.fromEntries(demos.map((d) => [d.id, d.title]));
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
const reviewLog = readReviewLog(new Set(ids));
// the docs' last commits change only with HEAD or the docs folder's contents
const docsKey = `${headFull} ${(() => { try { return readdirSync(join(ROOT, 'docs')).join('|'); } catch { return ''; } })()}`;
let docs;
if (cache?.docs?.key === docsKey) docs = cache.docs.value; else { docs = docList(); if (cache) cache.docs = { key: docsKey, value: docs }; }
const readiness = { checklist: readChecklist(), docs, atRisk: atRisk(), at: new Date().toISOString() };
const checkFiles = readChecks();
const running = runsNow(checkFiles);
const generatedAt = new Date().toISOString();
const head = git(['rev-parse', '--short', headFull]).trim();

const models = demos.map((d) => {
  const src = sources.get(d.id);
  const snippet = src?.snippet ?? null;
  const unit = snippet ? unitOf(snippet.css) : null;
  const converted = unit === 'vmin';
  const why = [];
  if (!snippet) why.push('no snippet found for this id');
  const runtime = snippets?.[d.id]?.css;
  if (runtime != null && (unitOf(runtime) === 'vmin') !== converted) why.push(`the loaded snippet CSS ${unitOf(runtime) === 'vmin' ? 'sets' : 'does not set'} --u in vmin but the source text ${converted ? 'does' : 'does not'}`);

  let convertedInHead = null;
  if (snippet) {
    if (snippet.found === 'grep') convertedInHead = convertedAt(headLines.get(snippet.file), d.id);
    else {
      const lines = headLines.get(snippet.file);
      if (lines) { const t = lines.join('\n'); const at = t.indexOf('css:'); convertedInHead = at >= 0 && unitOf(t.slice(at)) === 'vmin'; }
    }
  }

  const commits = perModel.get(d.id) ?? [];
  const byDiff = commits.filter((c) => c.matchedBy.includes('diff'));
  const converting = [...byDiff].reverse().find((c) => c.addsU) ?? null;

  const checks = {};
  for (const name of CHECKS) {
    const file = checkFiles[name];
    const r = file?.models?.[d.id];
    if (!r) { checks[name] = { status: 'never' }; continue; }
    const stale = [];
    if (r.fingerprint && src && r.fingerprint !== src.fingerprint) stale.push('the model\'s own source has changed since this ran');
    if (!r.fingerprint) stale.push('no fingerprint was recorded, so it cannot be told whether the source changed');
    if (r.sourceChangedDuringRun) stale.push('the model\'s source changed while the check was running');
    checks[name] = { status: r.status, summary: r.summary, detail: r.detail, ranAt: r.ranAt, runId: r.runId, commit: r.commit, args: r.args, stale: stale.length > 0, staleWhy: stale };
  }

  const contract = checks[CONTRACT];
  const contractPass = contract.status === 'pass' && !contract.stale;
  const ctx = { order, shortIndex, perModel, headFp: headSources.get(d.id)?.fingerprint ?? null, workFp: src?.fingerprint ?? null };
  const reviews = [
    ...commits.filter((c) => c.review && c.matchedBy.includes('diff') && c.hash !== converting?.hash)
      .map((c) => ({ kind: 'visual', source: 'commit', commit: c.hash, reviewedAt: c.date, reviewer: null, verdict: null, subject: c.subject })),
    ...commits.filter((c) => c.textReview)
      .map((c) => ({ kind: 'text', source: 'commit', commit: c.hash, reviewedAt: c.date, reviewer: null, verdict: null, subject: c.subject })),
    ...reviewLog.entries.filter((e) => e.model === d.id).map(({ model, ...e }) => ({ ...e, source: 'log' })),
  ].map((r) => { const against = r.fixCommit ?? r.commit; const s = changedSince(against, d.id, ctx); return { ...r, judgedAgainst: against, stale: s.stale, staleWhy: s.why }; })
    .sort((a, b) => Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt));
  // the latest fresh review of a kind decides; a stale one says nothing about the code as it is
  const judge = (kind, how) => {
    const list = reviews.filter((r) => r.kind === kind);
    if (!list.length) return `no ${kind} review (${how}) for it`;
    const fresh = list.filter((r) => !r.stale);
    if (!fresh.length) return `its ${kind} review${list.length > 1 ? 's are all' : ' is'} stale: ${list[0].staleWhy}`;
    if (fresh[0].verdict === 'problem') return `the latest ${kind} review (${fresh[0].reviewer}, ${fresh[0].reviewedAt.slice(0, 10)}) found a problem`;
    return null;
  };
  const missing = [];
  if (!converted) missing.push(unit === 'other' ? `not converted: the snippet sets --u only in another unit (${uValues(snippet.css).join(', ')}), not vmin` : 'not converted: the snippet CSS does not set --u');
  if (contract.status === 'never') missing.push('the contract check (check-models) has never reported this model');
  else if (contract.status !== 'pass') missing.push(`the contract check's last result is "${contract.status}"`);
  else if (contract.stale) missing.push('the contract check passed, but on source that has changed since');
  const visualGap = judge('visual', 'a docs/reviews/ entry, or a commit touching it with a Reviewed-by: trailer or a "Review …" subject, other than the converting commit');
  const textGap = judge('text', 'a docs/reviews/ entry, or a commit with a Text-reviewed-by: trailer or a "Text review …" subject');
  if (visualGap) missing.push(visualGap);
  if (textGap) missing.push(textGap);
  const approved = missing.length === 0;
  const checked = converted && contractPass;
  const status = approved ? 'approved' : checked ? 'checked' : converted ? 'converted' : 'not converted';
  // which reason, inside its bucket (see BUCKETS for the order)
  let part = null;
  if (status === 'converted') part = contract.status === 'pass' ? 'stale-pass' : contract.status === 'never' ? 'never' : 'failed';
  if (status === 'checked') {
    const of = (k) => reviews.filter((r) => r.kind === k);
    const fresh = (k) => of(k).filter((r) => !r.stale);
    part = !of('visual').length ? 'no-visual'
      : !of('text').length ? 'no-text'
      : !fresh('visual').length || !fresh('text').length ? 'stale-review'
      : fresh('visual')[0].verdict === 'problem' || fresh('text')[0].verdict === 'problem' ? 'problem'
      : 'unexplained'; // cannot happen while approval is defined as it is; shown, and fails the balance, if it ever does
  }

  return {
    id: d.id, title: d.title, group: d.group, part, groupLabel: groups.find((g) => g.key === d.group)?.label ?? null, tags: d.tags ?? [], status,
    converted, convertedInHead,
    uNotVmin: unit === 'other' ? uValues(snippet.css) : null,
    reviews,
    snippet: snippet ? { file: snippet.file, line: snippet.line, foundBy: snippet.found } : null,
    fingerprint: src?.fingerprint ?? null,
    convertingCommit: converting ? converting.hash : null,
    commits, checks,
    approved, missing: approved ? [] : missing,
    notes: why,
  };
});

const count = (f) => models.filter(f).length;
const ledger = {
  generatedAt, head,
  groups,
  tags: [...new Set(demos.flatMap((d) => d.tags ?? []))].sort(),
  build: { by, reason, ms: null, reusedModelLoad, reusedGitReplay },
  running,
  readiness,
  sources: {
    models: from,
    groups: 'src/models/groups.ts GROUPS, in GROUP_ORDER; each model\'s group and tags as its demo entry gives them',
    converted: 'snippet CSS (from its `    css:` line to the end of the `  <id>: {` entry, or a chart file\'s css), comments left out, sets --u in vmin; working tree',
    commits: `git log, ${commitCount} commits; diff matches by replaying src/models and src/styles/models line by line`,
    checks: Object.fromEntries(CHECKS.map((c) => [c, checkFiles[c] ? `docs/checks/${c}.json, updated ${checkFiles[c].updatedAt}` : 'no result file: this check has never been captured'])),
    contractCheck: CONTRACT,
    review: 'a visual review: a docs/reviews/ entry of kind "visual", or a commit touching the model (by diff), not its converting commit, with a Reviewed-by: trailer or a subject starting "Review"',
    textReview: 'a text review: a docs/reviews/ entry of kind "text", or a commit matched to the model with a Text-reviewed-by: trailer or a subject starting "Text review" / "Review the text"',
    reviewLog: `docs/reviews/*.json: ${reviewLog.files} file(s), ${reviewLog.entries.length} valid entr${reviewLog.entries.length === 1 ? 'y' : 'ies'}. A review is stale when the model's source changed after the commit it names; approval needs the latest fresh review of each kind not to be "problem"`,
    queue: 'docs/ledger-queue.json is reported by the lead session and its agents through scripts/queue.mjs and is not read by this script',
    readiness: 'docs/RELEASE-CHECKLIST.md lines `- [ ] item — proof`; each file directly under docs/ plus README.md with `git log -1`; at risk: `git status --porcelain --untracked-files=all` with each file\'s modification time, as of this build',
    watcher: 'docs/ledger-watch.json, written by scripts/ledger-watch.mjs: its heartbeat, so the page can tell a quiet project from a watcher that has stopped',
  },
  counts: {
    models: models.length,
    converted: count((m) => m.converted),
    convertedInHead: count((m) => m.convertedInHead === true),
    checked: count((m) => m.status === 'checked' || m.status === 'approved'),
    approved: count((m) => m.approved),
    notConverted: count((m) => !m.converted),
    uNotVmin: count((m) => m.uNotVmin),
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
    // running totals, for anyone who wants them; never the same names as the buckets
    reachedAtLeast: [
      { label: 'reached at least "converted"', count: count((m) => m.status !== 'not converted') },
      { label: 'reached at least "checked"', count: count((m) => m.status === 'checked' || m.status === 'approved') },
      { label: 'reached "approved"', count: count((m) => m.status === 'approved') },
    ],
    checks: Object.fromEntries(CHECKS.map((c) => {
      const tally = {};
      for (const m of models) { const r = m.checks[c]; const k = r.status === 'never' ? 'never' : `${r.status}${r.stale ? ' (stale)' : ''}`; tally[k] = (tally[k] ?? 0) + 1; }
      return [c, tally];
    })),
    reviewCommits: count((m) => m.commits.some((c) => c.review)),
    textReviewCommits: count((m) => m.commits.some((c) => c.textReview)),
    reviewLogEntries: reviewLog.entries.length,
    reviewed: Object.fromEntries(KINDS.map((k) => [k, {
      fresh: count((m) => m.reviews.some((r) => r.kind === k && !r.stale)),
      staleOnly: count((m) => m.reviews.some((r) => r.kind === k) && !m.reviews.some((r) => r.kind === k && !r.stale)),
      problem: count((m) => m.reviews.find((r) => r.kind === k && !r.stale)?.verdict === 'problem'),
    }])),
  },
  notes,
  models,
};
const c0 = ledger.counts;
// the books must balance: every model in one bucket, every split summing to its bucket
const bucketSum = c0.buckets.reduce((s, b) => s + b.count, 0);
const problems = [];
if (bucketSum !== models.length) problems.push(`the buckets sum to ${bucketSum}, not ${models.length} models`);
for (const b of c0.buckets) if (b.parts && !b.partsBalance) problems.push(`"${b.label}" is ${b.count}, but its parts sum to ${b.partsSum}${b.parts.some((p) => p.key === 'unexplained') ? ' with some models under no known reason' : ''}`);
c0.balance = { models: models.length, sum: bucketSum, ok: problems.length === 0, problems };
if (problems.length) {
  console.error(`\nLEDGER DOES NOT BALANCE:\n${problems.map((p) => `  - ${p}`).join('\n')}\n`);
}
ledger.build.ms = Date.now() - t0;
writeAtomic(OUT, JSON.stringify(ledger, null, 1));
const c = ledger.counts;
if (!quiet) {
  console.log(`docs/ledger.json: ${c.models} models — ${c.converted} converted (${c.convertedInHead} of them in HEAD), ${c.checked} checked, ${c.approved} approved.`);
  for (const name of CHECKS) console.log(`  ${name.padEnd(7)} ${Object.entries(c.checks[name]).map(([k, v]) => `${v} ${k}`).join(', ')}`);
  for (const n of notes) console.log(`  note: ${n}`);
}
return { balanced: problems.length === 0, problems, counts: c, notes: [...notes], head, ms: ledger.build.ms, reusedModelLoad, reusedGitReplay, running };
}

const invoked = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (invoked) { const r = await buildLedger(); if (!r.balanced) process.exit(1); }
