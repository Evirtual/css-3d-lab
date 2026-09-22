/**
 * What a check result or a review judged, as fingerprints, so the ledger can tell whether it still
 * describes the model as it is now. Each result depends on exactly what it judged:
 *
 *  - snippet  the RESOLVED snippet: the html, css and js strings as the site loads them, shared
 *             constants (CUBE_FACES, CITY_H, SOLAR, …) interpolated. It is read by bundling
 *             src/models with rolldown (the bundler Vite itself uses) from the files as they are
 *             in the working tree or at some commit, and importing the result;
 *  - play     the ways src/models/interaction.ts says the model is played with, from its tags and its
 *             OVERRIDE table: the checks drive a model by them (a tag no way reads changes nothing);
 *  - boxmark  the model's boxSizing mark in its gallery entry ('content-box by design: <why>'), which
 *             check-boxsizing reads;
 *  - text     title, description, how (the snippet's steps), technique, tags and category: what
 *             the page says about the model;
 *  - paths    a hash of each render-path file a check depends on (the model frame, the export
 *             pipeline, the share-image layout, …), whole or by named part, see RENDER_PATHS.
 *
 * Which result uses which (USES below):
 *  - check-models, check-stages, check-motion: snippet + play + that check's render path;
 *  - check-exports: the same, its path adding the capture and recording code;
 *  - check-media: snippet + play + text (the title is drawn in the image) + its path;
 *  - check-boxsizing: snippet + boxmark + the standalone file (standaloneDoc): it opens only the file;
 *  - check-contrast: snippet + play (it clicks the controls a clicked model has) + standaloneDoc;
 *  - a visual review: snippet + play + the frame. The reviews record what the model looks like
 *    on the canvas (size, pose, centring, themes), not the words, so text does not stale them;
 *  - a text review: text + snippet (it says whether the words describe the code).
 * A check's own script is not part of its fingerprint: a stricter check is a new rule for the
 * next run, not a change in what the old run looked at.
 *
 *   node scripts/fingerprint.mjs <id> [--kind visual|text|models|stages|motion|exports|media]
 *
 * prints the model's fingerprints now (from the working tree), as the JSON a reviewer adds to a
 * docs/reviews/ entry as `fingerprints`. scripts/capture-check.mjs records the same per model with
 * each check result.
 *
 * Results and reviews that recorded a commit but no fingerprints are judged by the fingerprints
 * of the model AS IT WAS at that commit: the files are read from git at that commit and resolved
 * the same way. Those per-commit fingerprints are cached in .cache/fingerprints.json (gitignored),
 * so each commit is resolved once.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { norm, ROOT, sourcesOf } from './model-sources.mjs';

const toPosix = (p) => p.split(sep).join('/');
const h = (value) => createHash('sha1').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex').slice(0, 12);
const git = (args, opts = {}) => execFileSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'ignore'], ...opts });

/* ---------- the render paths ---------- */
/**
 * A render-path part is a whole file, or named top-level declarations in it (`decls`), or the
 * comment-headed sections of a stylesheet that start with the given text (`sections`). Naming the
 * part keeps unrelated edits to the same file (printDoc in snippet-utils, the page layout in
 * _page.scss, the SEO text in generate-pages) from staling every model.
 */
const P = {
  doc: { file: 'src/models/snippet-utils.ts', decls: ['RESIZE_SNAP', 'standaloneDoc'] },
  preview: { file: 'src/preview.ts' },
  embed: { file: 'src/embed.ts' },
  fit: { file: 'src/fit.ts' },
  embedCss: { file: 'src/styles/_page.scss', sections: ['// /embed/<id>/'] },
  video: { file: 'src/video.ts' },
  lazy: { file: 'src/lazy-mount.ts' },
  scene: { file: 'src/capture-scene.ts' },
  client: { file: 'src/capture-client.ts' },
  record: { file: 'src/record.ts' },
  render: { file: 'server/render.mjs' },
  embedPage: { file: 'scripts/generate-pages.mjs', decls: ['embedPage'] },
  ogCss: { file: 'src/styles/_page.scss', sections: ['// The share image (?og=1)'] },
  media: { file: 'scripts/generate-media.mjs' },
  ogShot: { file: 'scripts/og-shot.mjs' },
};
/** The model in its frame: the page standaloneDoc makes, the frame preview.ts mounts, the embed page around it. */
const FRAME = [P.doc, P.preview, P.embed, P.fit, P.embedCss];
export const RENDER_PATHS = {
  frame: FRAME,
  models: FRAME,
  motion: FRAME,
  // the card and the export dialog's canvas at every shape, besides the frame
  stages: [...FRAME, P.video, P.lazy],
  // the file the dialog makes: the scene captured, sent to the render service, recorded
  exports: [...FRAME, P.video, P.scene, P.client, P.record, P.render],
  // the page standaloneDoc makes, opened on its own (check-boxsizing, check-contrast)
  file: [P.doc],
  // the share image: the og layout on the embed page, shot by generate-media through og-shot
  media: [...FRAME, P.embedPage, P.ogCss, P.media, P.ogShot],
};
/** What each kind of result depends on. `path` names its RENDER_PATHS entry. */
export const USES = {
  models: { parts: ['snippet', 'play'], path: 'models' },
  stages: { parts: ['snippet', 'play'], path: 'stages' },
  motion: { parts: ['snippet', 'play'], path: 'motion' },
  exports: { parts: ['snippet', 'play'], path: 'exports' },
  media: { parts: ['snippet', 'play', 'text'], path: 'media' },
  boxsizing: { parts: ['snippet', 'boxmark'], path: 'file' },
  contrast: { parts: ['snippet', 'play'], path: 'file' },
  visual: { parts: ['snippet', 'play'], path: 'frame' },
  text: { parts: ['text', 'snippet'], path: null },
};
export const usesFor = (kind) => USES[kind] ?? { parts: ['snippet', 'play'], path: 'frame' };
export const partLabel = (p) => p.decls ? `${p.file} (${p.decls.join(', ')})` : p.sections ? `${p.file} (${p.sections.map((s) => s.replace(/^\/\/\s*/, '')).join(', ')})` : p.file;
const ALL_PARTS = [...new Map(Object.values(RENDER_PATHS).flat().map((p) => [partLabel(p), p])).values()];
export const RENDER_FILES = [...new Set(ALL_PARTS.map((p) => p.file))];

/** The text of the named declarations: from each one's first line to the line closing it at column 0. */
export function declText(text, names) {
  const lines = text.split('\n');
  const out = [];
  for (const name of names) {
    const start = lines.findIndex((l) => new RegExp(`^(export\\s+)?(async\\s+)?(const|let|function)\\s+${name}\\b`).test(l));
    if (start < 0) { out.push(`(no ${name})`); continue; }
    let end = start;
    if (!/;\s*$/.test(lines[start]) || /[{(\[`]\s*$/.test(lines[start])) {
      while (end + 1 < lines.length && !/^(\}|\};|\];|`;|\);)\s*$/.test(lines[end])) end++;
    }
    out.push(lines.slice(start, end + 1).join('\n'));
  }
  return out.join('\n\0\n');
}
/** The sections of a stylesheet that start with a column-0 comment beginning with `heads`, each up to the next such comment after a blank line. */
export function sectionText(text, heads) {
  const lines = text.split('\n');
  const out = [];
  for (const head of heads) {
    const start = lines.findIndex((l) => l.startsWith(head));
    if (start < 0) { out.push(`(no ${head})`); continue; }
    let end = start + 1;
    while (end < lines.length && !(lines[end].startsWith('//') && !lines[end - 1].trim())) end++;
    out.push(lines.slice(start, end).join('\n'));
  }
  return out.join('\n\0\n');
}
export function partHash(p, text) {
  if (text == null) return 'missing';
  return h(p.decls ? declText(text, p.decls) : p.sections ? sectionText(text, p.sections) : text);
}

/* ---------- files: the working tree or a commit ---------- */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}
/** What resolving needs: src/models, src/icons.ts (interaction.ts draws its badge with it) and the render-path files. */
const wanted = (p) => /^src\/models\/.+\.ts$/.test(p) || /^src\/styles\/models\/_[^/]+\.scss$/.test(p) || p === 'src/icons.ts' || RENDER_FILES.includes(p);
export function workingFiles() {
  const out = new Map();
  for (const f of [...walk(join(ROOT, 'src/models')), ...[...RENDER_FILES, 'src/icons.ts'].map((p) => join(ROOT, p))]) {
    const p = toPosix(relative(ROOT, f));
    if (!wanted(p) || !existsSync(f)) continue;
    out.set(p, norm(readFileSync(f, 'utf8')));
  }
  return out;
}
function filesAt(commit) {
  const paths = git(['ls-tree', '-r', '--name-only', commit, '--', 'src/models', 'src/styles/models', 'src/icons.ts', ...RENDER_FILES]).split('\n').filter(wanted);
  const out = new Map();
  if (!paths.length) return out;
  const batch = execFileSync('git', ['cat-file', '--batch'], { cwd: ROOT, input: paths.map((p) => `${commit}:${p}`).join('\n') + '\n', maxBuffer: 1 << 30 });
  let at = 0;
  for (const p of paths) {
    const headerEnd = batch.indexOf(10, at);
    const size = Number(batch.slice(at, headerEnd).toString().split(' ')[2]);
    if (!Number.isFinite(size)) { at = headerEnd + 1; continue; }
    out.set(p, norm(batch.slice(headerEnd + 1, headerEnd + 1 + size).toString('utf8')));
    at = headerEnd + 1 + size + 1;
  }
  return out;
}

/* ---------- resolving the snippets from a set of files ---------- */
const ENTRY = '\0fingerprint-entry';
const V = '\0f/';
/**
 * Bundles src/models from `files` (path → text) and imports it: { snippets, demos, interactionsOf }.
 * Rejects after `timeout` ms instead of hanging.
 */
export async function resolveFiles(files, { timeout = 60000 } = {}) {
  const { rolldown } = await import('rolldown');
  const has = (p) => files.has(p);
  const withInteraction = has('src/models/interaction.ts');
  const entry = [
    `export { snippets } from '/src/models/snippets.ts';`,
    `export { demos } from '/src/models/index.ts';`,
    withInteraction ? `export { interactionsOf } from '/src/models/interaction.ts';` : 'export const interactionsOf = null;',
  ].join('\n');
  const plugin = {
    name: 'files',
    resolveId(source, importer) {
      if (source === ENTRY) return ENTRY;
      if (/\.(s?css|svg|png|jpg)(\?.*)?$/.test(source)) return `${V}empty`;
      const from = importer && importer.startsWith(V) ? posix.dirname(importer.slice(V.length)) : '';
      if (!source.startsWith('.') && !source.startsWith('/')) return { id: source, external: true };
      const base = source.startsWith('/') ? source.slice(1) : posix.normalize(posix.join(from, source));
      for (const c of [base, `${base}.ts`, `${base}.mjs`, `${base}.js`, `${base}/index.ts`]) if (has(c)) return V + c;
      if (base.replace(/\.m?js$/, '.ts') !== base && has(base.replace(/\.m?js$/, '.ts'))) return V + base.replace(/\.m?js$/, '.ts');
      throw new Error(`fingerprint: cannot resolve ${source} from ${from || 'the entry'}`);
    },
    load(id) {
      if (id === ENTRY) return { code: entry, moduleType: 'js' };
      if (id === `${V}empty`) return { code: 'export default "";', moduleType: 'js' };
      if (id.startsWith(V)) {
        const p = id.slice(V.length);
        return { code: files.get(p), moduleType: p.endsWith('.ts') ? 'ts' : 'js' };
      }
      return null;
    },
  };
  let timer;
  const work = (async () => {
    const bundle = await rolldown({ input: ENTRY, plugins: [plugin], logLevel: 'silent', treeshake: false, onwarn() {} });
    try {
      const { output } = await bundle.generate({ format: 'esm' });
      const code = output[0].code;
      return await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    } finally { await bundle.close(); }
  })();
  try {
    return await Promise.race([work, new Promise((_, no) => { timer = setTimeout(() => no(new Error(`fingerprint: resolving the models took over ${timeout / 1000} s, so it was given up`)), timeout); })]);
  } finally { clearTimeout(timer); }
}

/**
 * Every model's fingerprints from a set of files: { models: { id: { snippet, play, text, own } },
 * paths: { label: hash } }. `own` is model-sources.mjs' fingerprint of the model's own source text,
 * the one capture-check recorded before fingerprints existed: it tells whether an old result ran on
 * the committed code.
 */
export async function fingerprintFiles(files, opts) {
  const { snippets, demos, interactionsOf } = await resolveFiles(files, opts);
  const own = sourcesOf(files);
  const models = {};
  for (const d of demos) {
    const s = snippets[d.id] ?? null;
    const tags = Array.isArray(d.tags) ? d.tags : [];
    const textFields = { title: d.title, description: d.description, how: s?.how ?? null, technique: d.technique ?? null, tags, category: d.category ?? null };
    models[d.id] = {
      snippet: s ? h([s.html ?? '', s.css ?? '', s.js ?? '']) : 'none',
      // what the checks act on is the ways interaction.ts derives from the tags (and its OVERRIDE
      // table), not the tags themselves: a tag no way reads (sass-loop, 3d) does not change play
      play: h(interactionsOf ? { ways: interactionsOf(d) } : { tags: [...tags].sort() }),
      text: h(textFields),
      boxmark: h(d.boxSizing ?? null),
      textParts: Object.fromEntries(Object.entries(textFields).map(([k, v]) => [k, h(v ?? null)])),
      own: own.get(d.id)?.fingerprint ?? null,
    };
  }
  const paths = Object.fromEntries(ALL_PARTS.map((p) => [partLabel(p), partHash(p, files.get(p.file))]));
  return { models, paths };
}

/* ---------- the cache of fingerprints at commits ---------- */
const CACHE = join(ROOT, '.cache', 'fingerprints.json');
// changes whenever what is fingerprinted changes, so a cache made by other rules is not trusted
// (bump v whenever what fingerprintFiles() computes changes)
const VERSION = h({ v: 2, parts: ALL_PARTS.map(partLabel) });
let cache = null;
function loadCache() {
  if (cache) return cache;
  try { cache = JSON.parse(readFileSync(CACHE, 'utf8')); } catch { cache = null; }
  if (cache?.version !== VERSION) cache = { version: VERSION, note: 'Fingerprints of every model at a commit, written by scripts/fingerprint.mjs. A cache: delete it at will.', commits: {} };
  return cache;
}
let dirty = false;
export function saveCache() {
  if (!dirty || !cache) return;
  mkdirSync(join(ROOT, '.cache'), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(cache));
  dirty = false;
}
/**
 * main's history, oldest first, read once per HEAD with one git log: each commit's full hash, its
 * commit date and the files it touched. (main is linear: agents commit with a single parent.)
 */
let history = null;
function mainHistory() {
  // HEAD as stalenessIndex() last read it (headMoved), or read now when called on its own
  const head = memo.head ?? git(['rev-parse', 'HEAD']).trim();
  if (history?.head === head) return history;
  const list = git(['log', '--reverse', '--topo-order', '--no-renames', '--format=%x01%H %cI', '--name-only', 'HEAD']).split('\x01').filter(Boolean).map((chunk) => {
    const [first, ...files] = chunk.split('\n').filter(Boolean);
    const [hash, date] = first.split(' ');
    return { hash, date: Date.parse(date), files };
  });
  history = { head, list, index: new Map(list.map((c, i) => [c.hash, i])) };
  return history;
}
/** The commits after `from` on the way to HEAD that touch any of `where` (files or folders; null: any), oldest first; with `until`, only those committed by then. */
function commitsAfter(from, where, until = null) {
  const hist = mainHistory();
  const i = hist.index.get(from);
  if (i == null) return git(['rev-list', '--reverse', '--topo-order', ...(until ? [`--until=${until}`] : []), `${from}..HEAD`, ...(where ? ['--', ...where] : [])]).split('\n').filter(Boolean);
  const cut = until ? Date.parse(until) : Infinity;
  const hits = (file) => !where || where.some((w) => file === w || file.startsWith(`${w}/`));
  return hist.list.slice(i + 1).filter((c) => c.date <= cut && (!where || c.files.some(hits))).map((c) => c.hash);
}
const fullHash = new Map();
/** A commit's full hash, or null when it is not in this repository. */
export function commitHash(c) {
  if (fullHash.has(c)) return fullHash.get(c);
  const lc = String(c).toLowerCase();
  const matches = /^[0-9a-f]{4,40}$/.test(lc) ? mainHistory().list.filter((x) => x.hash.startsWith(lc)) : [];
  let full = matches.length === 1 ? matches[0].hash : null;
  if (!full) { try { full = git(['rev-parse', '--verify', '--quiet', `${c}^{commit}`]).trim() || null; } catch { full = null; } }
  fullHash.set(c, full);
  return full;
}
/** Every model's fingerprints as the code was at `commit` (cached). */
export async function fingerprintsAt(commit, opts) {
  const full = commitHash(commit);
  if (!full) throw new Error(`commit ${commit} is not in this repository`);
  const c = loadCache();
  if (c.commits[full]) return c.commits[full];
  const fp = await fingerprintFiles(filesAt(full), opts);
  c.commits[full] = fp;
  dirty = true;
  return fp;
}
let workingMemo = null;
/** Every model's fingerprints in the working tree now (reused while no file it reads has changed). */
export async function fingerprintsNow(opts) {
  const files = workingFiles();
  const key = h([...files].map(([p, t]) => `${p}\0${t}`).join('\0'));
  if (workingMemo?.key === key) return workingMemo.value;
  const value = await fingerprintFiles(files, opts);
  workingMemo = { key, value };
  return value;
}

/** What to record beside a result of `kind` for one model: only the parts it depends on. */
export function recordFor(kind, all, id) {
  const m = all.models[id];
  if (!m) return null;
  const u = usesFor(kind);
  const out = { kind };
  for (const p of u.parts) out[p] = m[p];
  if (u.parts.includes('text')) out.textParts = m.textParts;
  if (u.path) out.paths = Object.fromEntries(RENDER_PATHS[u.path].map((p) => [partLabel(p), all.paths[partLabel(p)]]));
  return out;
}

/**
 * What changed between a recorded fingerprint and now, for a result of `kind`, as a list of
 * { part, what } (empty when nothing it depends on changed). `then` and `now` are recordFor()
 * shapes or the full per-commit ones.
 */
export function differences(kind, then, now) {
  const u = usesFor(kind);
  const out = [];
  const say = { boxmark: 'its boxSizing mark', snippet: 'the snippet (html, css, js as the site loads them)', play: 'how it is played (the ways interaction.ts gives it)', text: 'its text (title, description, how, technique, tags, category)' };
  for (const p of u.parts) {
    if ((then?.[p] ?? null) === (now?.[p] ?? null)) continue;
    // which of the text's fields, when both sides say
    const fields = p === 'text' && then?.textParts && now?.textParts ? Object.keys(now.textParts).filter((k) => then.textParts[k] !== now.textParts[k]) : null;
    out.push({ part: p, what: say[p], fields: fields?.length ? fields : null });
  }
  if (u.path) for (const part of RENDER_PATHS[u.path]) {
    const label = partLabel(part);
    const a = then?.paths?.[label], b = now?.paths?.[label];
    if (a === undefined) continue; // recorded before this part was on the path: nothing to compare
    if (a !== b) out.push({ part: `path:${label}`, file: part.file, what: `shared file ${label}` });
  }
  return out;
}

/**
 * The first commit after `from` (on the way to HEAD) at which `part` changed for model `id`, or
 * null when no commit did (the change is uncommitted). Scans only commits touching the files the
 * part is made of, each resolved once (cached).
 */
export async function changedAt(from, id, part, opts, start) {
  const f = commitHash(from);
  if (!f) return null;
  if (!memo.head) headMoved();
  const pathPart = part.startsWith('path:') ? ALL_PARTS.find((p) => `path:${partLabel(p)}` === part) : null;
  // a render-path part is the same for every model, so its answer is shared
  const answerKey = `${f}\0${part}\0${pathPart ? '' : id}\0${start ?? ''}`;
  if (memo.answers.has(answerKey)) return memo.answers.get(answerKey);
  const where = pathPart ? [pathPart.file] : ['src/models', 'src/icons.ts'];
  const revKey = `${f}\0${where.join('|')}`;
  if (!memo.revs.has(revKey)) memo.revs.set(revKey, commitsAfter(f, where));
  const at = async (c) => (pathPart ? partAt(c, pathPart) : (await fingerprintsAt(c, opts)).models[id]?.[part] ?? null);
  let answer = null;
  // from the value the result recorded, when it recorded one, else from the model at `from`
  let before = start !== undefined ? start : await at(f);
  for (const c of memo.revs.get(revKey)) {
    const now = await at(c);
    if (now !== before) { answer = c.slice(0, 7); break; }
    before = now;
  }
  memo.answers.set(answerKey, answer);
  return answer;
}
// memos for one process (the watcher keeps them between builds); answers are dropped when HEAD moves
const memo = { head: null, revs: new Map(), parts: new Map(), answers: new Map() };
function headMoved() {
  const head = git(['rev-parse', 'HEAD']).trim();
  if (memo.head !== head) { memo.head = head; memo.revs.clear(); memo.answers.clear(); }
}
/** A render-path part's hash at a commit, read with git show (a commit never changes, so it is kept). */
function partAt(commit, p) {
  const k = `${commit}\0${partLabel(p)}`;
  if (!memo.parts.has(k)) {
    let text = null;
    try { text = norm(execFileSync('git', ['show', `${commit}:${p.file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })); } catch {}
    memo.parts.set(k, partHash(p, text));
  }
  return memo.parts.get(k);
}

/* ---------- staleness: what a result judged, then and now ---------- */
/** The rule in words, for the ledger's definitions dialog. */
export const STALENESS_TEXT = 'A result or review is stale when something it judged has changed since, and only then. '
  + 'What each depends on: the contract, stage and motion checks: the RESOLVED snippet (html, css and js as the site loads them, shared constants such as CUBE_FACES filled in), how the model is played (the ways interaction.ts gives it from its tags), and that check\'s render path; '
  + 'the export check: the same, its render path adding the capture and recording code; the share-preview check: the same plus the text (the title is drawn in the image); the box-sizing check: the snippet, its boxSizing mark and the standalone file; the contrast check: the snippet, how it is played and the standalone file; '
  + 'a visual review: the snippet, how it is played, and the model frame; a text review: the text (title, description, how, technique, tags, category) and the snippet it describes. '
  + `The render paths: ${Object.entries(RENDER_PATHS).map(([k, list]) => `${k}: ${list.map(partLabel).join(', ')}`).join('; ')}. `
  + 'A check\'s own script is not part of it. New results record these fingerprints (capture-check writes them; reviewers add `node scripts/fingerprint.mjs <id> --kind visual|text`); an older one that names only a commit is judged by the model as it was at that commit, rebuilt from git. '
  + 'The reason says what changed and at which commit: "render changed at <commit>", "text changed (description) at <commit>", "shared file <file> changed at <commit>", or "(not committed yet)".';
const WORD = { boxmark: 'its boxSizing mark changed', snippet: 'render changed', play: 'how it is played changed (interaction.ts)', text: 'text changed' };
/**
 * Whether one result still describes the model: { stale, why: [..], basis }. `r` is
 * { kind, id, commit, fingerprints?, own?, ranAt? }: the result's kind (a check key, 'visual' or 'text'),
 * the commit it names, the fingerprints it recorded (if any), and for an old check result the
 * own-source fingerprint capture-check recorded then (to tell whether it ran on the committed code).
 * `now` is fingerprintsNow().
 */
export async function judge(r, now, opts) {
  let at = r.commit ? commitHash(r.commit) : null;
  let then, basis;
  if (r.fingerprints && typeof r.fingerprints === 'object') { then = r.fingerprints; basis = 'recorded'; }
  else {
    if (!r.commit) return { stale: true, why: ['nothing recorded says what it judged: no fingerprints and no commit'], basis: null };
    if (!at) return { stale: true, why: [`commit ${String(r.commit).slice(0, 7)} is not in this repository, so what it judged cannot be rebuilt`], basis: null };
    const all = await fingerprintsAt(at, opts);
    const m = all.models[r.id];
    if (!m) return { stale: true, why: [`the model did not exist at ${at.slice(0, 7)}`], basis: `commit ${at.slice(0, 7)}` };
    then = { ...m, paths: all.paths };
    basis = `commit ${at.slice(0, 7)}`;
    if (r.own && m.own && r.own !== m.own) {
      // The run started on uncommitted changes. When a commit made before its result was printed
      // holds exactly the source it recorded, that commit is what it saw; otherwise it cannot be told.
      const later = r.ranAt ? commitsAfter(at, null, r.ranAt) : [];
      let found = null;
      for (const c of later) {
        const x = await fingerprintsAt(c, opts);
        if (x.models[r.id]?.own === r.own) { found = c; then = { ...x.models[r.id], paths: x.paths }; break; }
      }
      if (!found) return { stale: true, why: [`it ran on uncommitted source (what it recorded is not the model at ${at.slice(0, 7)}, nor at any commit made before its result), so what it judged cannot be rebuilt`], basis: null };
      basis = `commit ${found.slice(0, 7)} (the run started at ${at.slice(0, 7)} on changes committed in ${found.slice(0, 7)} before its result)`;
      at = found;
    }
  }
  const diffs = differences(r.kind, then, now.models[r.id] ? { ...now.models[r.id], paths: now.paths } : null);
  if (!now.models[r.id]) return { stale: true, why: ['the model no longer exists'], basis };
  const why = [];
  for (const d of diffs) {
    const was = basis === 'recorded' ? (d.part.startsWith('path:') ? then.paths?.[d.part.slice(5)] : then[d.part]) : undefined;
    const when = at ? await changedAt(at, r.id, d.part, opts, was) : null;
    const word = d.part.startsWith('path:') ? `shared file ${d.part.slice(5)} changed` : d.fields ? `${WORD[d.part]} (${d.fields.join(', ')})` : WORD[d.part];
    why.push(`${word}${when ? ` at ${when}` : at ? ' (not committed yet)' : ''}`);
  }
  return { stale: why.length > 0, why, basis };
}

/**
 * The ledger's hook: judges every check result in `checkFiles` (key → docs/checks/<key>.json) and
 * every review it may list, and returns lookups the ledger's per-model loop calls synchronously:
 *  - check(key, id) → { stale, why[], basis } | null
 *  - review(kind, id, commit, fingerprints) → the same | null
 * `reviews` is [{ kind, id, commit, fingerprints? }]: the review log's entries and the review
 * commits. Never throws: when resolving fails it returns null lookups and says why in `error`, and
 * the ledger then falls back to its own-source rule.
 */
export async function stalenessIndex({ checkFiles, reviews }, opts) {
  const out = new Map();
  const key = (...a) => a.map((x) => (x && typeof x === 'object' ? h(x) : String(x ?? ''))).join('\0');
  let error = null;
  try {
    headMoved();
    const now = await fingerprintsNow(opts);
    for (const [ck, file] of Object.entries(checkFiles ?? {})) {
      for (const [id, r] of Object.entries(file?.models ?? {})) {
        out.set(key('check', ck, id), await judge({ kind: ck, id, commit: r.commit, fingerprints: r.fingerprints, own: r.fingerprint, ranAt: r.ranAt }, now, opts));
      }
    }
    for (const rv of reviews ?? []) {
      const k = key('review', rv.kind, rv.id, rv.commit, rv.fingerprints);
      if (!out.has(k)) out.set(k, await judge({ kind: rv.kind, id: rv.id, commit: rv.commit, fingerprints: rv.fingerprints }, now, opts));
    }
  } catch (e) { error = e.message.split('\n')[0]; }
  finally { saveCache(); }
  return {
    error,
    check: (ck, id) => (error ? null : out.get(key('check', ck, id)) ?? null),
    review: (kind, id, commit, fingerprints) => (error ? null : out.get(key('review', kind, id, commit, fingerprints)) ?? null),
  };
}

/* ---------- the helper reviewers call ---------- */
const invoked = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (invoked) {
  const args = process.argv.slice(2);
  const k = args.indexOf('--kind');
  const kind = k >= 0 ? args[k + 1] : null;
  const ids = args.filter((a, i) => !a.startsWith('--') && !(k >= 0 && i === k + 1));
  if (!ids.length || (kind && !USES[kind])) {
    console.error(`usage: node scripts/fingerprint.mjs <id>… [--kind ${Object.keys(USES).join('|')}]\n  prints each model's fingerprints now; with --kind, only what that kind of result depends on`);
    process.exit(2);
  }
  const all = await fingerprintsNow();
  const out = {};
  for (const id of ids) {
    if (!all.models[id]) { console.error(`fingerprint: no model "${id}"`); process.exit(1); }
    out[id] = kind ? recordFor(kind, all, id) : { ...all.models[id], paths: Object.fromEntries(Object.entries(RENDER_PATHS).map(([n, list]) => [n, Object.fromEntries(list.map((p) => [partLabel(p), all.paths[partLabel(p)]]))])) };
  }
  console.log(JSON.stringify(ids.length === 1 ? out[ids[0]] : out, null, 2));
  process.exit(0);
}
