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
 * The queue of running and planned work is docs/ledger-queue.json, which the lead session keeps
 * by hand. It is not read here: the page shows it separately, labelled as the lead's record.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { entriesOf, fileOwner, isModelPath, norm, ROOT, workingSources } from './model-sources.mjs';

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

const notes = [];
const git = (args, opts = {}) => execFileSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30, ...opts });

/* ---------- the model list ---------- */
async function loadDemos() {
  const { createServer } = await import('vite');
  const vite = await createServer({ logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null } });
  try {
    const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
    let snippets = null;
    try { ({ snippets } = await vite.ssrLoadModule('/src/models/snippets.ts')); } catch (e) { notes.push(`the snippet map could not be loaded, so the runtime cross-check of --u: was skipped: ${e.message.split('\n')[0]}`); }
    return { demos: demos.map((d) => ({ id: d.id, title: d.title, group: d.group })), snippets, from: 'src/models/index.ts demos (loaded through vite)' };
  } finally {
    await vite.close();
  }
}

/* ---------- git: replay every model file's history to see which entries each commit touched ---------- */
function history(ids, titles) {
  const idSet = new Set(ids);
  // every commit, for subject matching
  const all = git(['log', '--format=%H%x1f%h%x1f%cI%x1f%an%x1f%s%x1f%b%x1e']).split('\x1e').map((s) => s.replace(/^\n/, '')).filter(Boolean).map((rec) => {
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
        h.plus.forEach((line, k) => whose(now, h.c + k).forEach((id) => hit(id, line.includes('--u:'))));
      }
    }
  }

  // the replay must end where HEAD is, or its line numbers were wrong somewhere
  const paths = [...state.keys()].filter(isModelPath);
  let bad = 0;
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
  return { perModel, commitCount: all.length, headLines };
}

/** Whether the snippet in HEAD (not the working tree) already has `--u:`. */
function convertedAt(lines, id) {
  if (!lines) return null;
  const e = entriesOf(lines).find((x) => x.id === id && x.kind === 'snippet');
  if (!e) return null;
  const body = lines.slice(e.start - 1, e.end).join('\n');
  const at = body.search(/^    css:/m);
  return at >= 0 && body.slice(at).includes('--u:');
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

/* ---------- build ---------- */
const { demos, snippets, from } = await loadDemos();
const ids = demos.map((d) => d.id);
const titles = Object.fromEntries(demos.map((d) => [d.id, d.title]));
const sources = workingSources();
const { perModel, commitCount, headLines } = history(ids, titles);
const checkFiles = readChecks();
const generatedAt = new Date().toISOString();
const head = git(['rev-parse', '--short', 'HEAD']).trim();

const models = demos.map((d) => {
  const src = sources.get(d.id);
  const snippet = src?.snippet ?? null;
  const converted = snippet ? snippet.css.includes('--u:') : false;
  const why = [];
  if (!snippet) why.push('no snippet found for this id');
  const runtime = snippets?.[d.id]?.css;
  if (runtime != null && runtime.includes('--u:') !== converted) why.push(`the loaded snippet CSS ${runtime.includes('--u:') ? 'has' : 'lacks'} --u: but the source text ${converted ? 'has' : 'lacks'} it`);

  let convertedInHead = null;
  if (snippet) {
    if (snippet.found === 'grep') convertedInHead = convertedAt(headLines.get(snippet.file), d.id);
    else {
      const lines = headLines.get(snippet.file);
      if (lines) { const t = lines.join('\n'); const at = t.indexOf('css:'); convertedInHead = at >= 0 && t.slice(at).includes('--u:'); }
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
  const reviews = commits.filter((c) => c.review && c.matchedBy.includes('diff') && c.hash !== converting?.hash);
  const textReviews = commits.filter((c) => c.textReview);
  const missing = [];
  if (!converted) missing.push('not converted: the snippet CSS has no --u:');
  if (contract.status === 'never') missing.push('the contract check (check-models) has never reported this model');
  else if (contract.status !== 'pass') missing.push(`the contract check's last result is "${contract.status}"`);
  else if (contract.stale) missing.push('the contract check passed, but on source that has changed since');
  if (!reviews.length) missing.push('no review commit (a Reviewed-by: trailer or a "Review …" subject) touching it, other than the converting commit');
  if (!textReviews.length) missing.push('no text-review commit (a Text-reviewed-by: trailer or a "Text review …" subject) for it');
  const approved = missing.length === 0;
  const checked = converted && contractPass;
  const status = approved ? 'approved' : checked ? 'checked' : converted ? 'converted' : 'not converted';

  return {
    id: d.id, title: d.title, group: d.group, status,
    converted, convertedInHead,
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
  sources: {
    models: from,
    converted: 'snippet CSS (from its `    css:` line to the end of the `  <id>: {` entry, or a chart file\'s css) contains --u:, working tree',
    commits: `git log, ${commitCount} commits; diff matches by replaying src/models and src/styles/models line by line`,
    checks: Object.fromEntries(CHECKS.map((c) => [c, checkFiles[c] ? `docs/checks/${c}.json, updated ${checkFiles[c].updatedAt}` : 'no result file: this check has never been captured'])),
    contractCheck: CONTRACT,
    review: 'a commit touching the model (by diff), not its converting commit, with a Reviewed-by: trailer or a subject starting "Review"',
    textReview: 'a commit matched to the model with a Text-reviewed-by: trailer or a subject starting "Text review" / "Review the text"',
    queue: 'docs/ledger-queue.json is kept by hand by the lead session and is not read by this script',
  },
  counts: {
    models: models.length,
    converted: count((m) => m.converted),
    convertedInHead: count((m) => m.convertedInHead === true),
    checked: count((m) => m.status === 'checked' || m.status === 'approved'),
    approved: count((m) => m.approved),
    notConverted: count((m) => !m.converted),
    byStatus: Object.fromEntries(['not converted', 'converted', 'checked', 'approved'].map((s) => [s, count((m) => m.status === s)])),
    checks: Object.fromEntries(CHECKS.map((c) => {
      const tally = {};
      for (const m of models) { const r = m.checks[c]; const k = r.status === 'never' ? 'never' : `${r.status}${r.stale ? ' (stale)' : ''}`; tally[k] = (tally[k] ?? 0) + 1; }
      return [c, tally];
    })),
    reviewCommits: count((m) => m.commits.some((c) => c.review)),
    textReviewCommits: count((m) => m.commits.some((c) => c.textReview)),
  },
  notes,
  models,
};
writeFileSync(OUT, JSON.stringify(ledger, null, 1));
const c = ledger.counts;
console.log(`docs/ledger.json: ${c.models} models — ${c.converted} converted (${c.convertedInHead} of them in HEAD), ${c.checked} checked, ${c.approved} approved.`);
for (const name of CHECKS) console.log(`  ${name.padEnd(7)} ${Object.entries(c.checks[name]).map(([k, v]) => `${v} ${k}`).join(', ')}`);
for (const n of notes) console.log(`  note: ${n}`);
