/**
 * Where each model's own source text lives, read straight from the files. Shared by
 * scripts/ledger.mjs (what is converted, which commits touched what) and
 * scripts/capture-check.mjs (a fingerprint of each model's source at the moment a check ran).
 *
 * A model's own text is:
 *  - its snippet entry, the line `  <id>: {` in a src/models/*.ts map, up to the next entry;
 *  - its gallery entry, the `  {` object in a demo array whose `    id: '<id>'` names it;
 *  - src/models/charts/<file>.ts as a whole, for the charts that keep model and snippet together;
 *  - src/styles/models/_<id>.scss.
 * Shared helpers outside those entries (a `rep()` or `lines()` at the top of a file) belong to no
 * one model, so a change to them does not count as a change to any model.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const ROOT = process.cwd();
const KEY = /^  ([A-Za-z_$][\w$]*): \{/;
const OBJ = /^  \{\s*$/;
// `];` or `};` closing the whole map or array. A bare `}` is not one: CSS inside a snippet's
// template literal closes its rules at column 0 too.
const END = /^(\];?|\};)\s*$/;
const ID = /^    id: '([^']+)'/;
const CHART_ID = /\bid: '([^']+)'/;

export const norm = (text) => text.replace(/\r\n/g, '\n');
const posix = (p) => p.split(sep).join('/');

/**
 * The entries of one file, as [{ id, kind: 'snippet'|'demo', start, end }] with 1-based,
 * inclusive line numbers. `lines` is the file split on \n.
 */
export function entriesOf(lines) {
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    const k = KEY.exec(lines[i]);
    if (k) starts.push({ i, id: k[1], kind: 'snippet' });
    else if (OBJ.test(lines[i])) starts.push({ i, id: null, kind: 'demo' });
    else if (END.test(lines[i])) starts.push({ i, id: null, kind: 'end' });
  }
  const out = [];
  for (let s = 0; s < starts.length; s++) {
    const here = starts[s];
    if (here.kind === 'end') continue;
    const stop = s + 1 < starts.length ? starts[s + 1].i - 1 : lines.length - 1;
    let id = here.id;
    if (here.kind === 'demo') {
      for (let j = here.i + 1; j <= stop; j++) {
        const m = ID.exec(lines[j]);
        if (m) { id = m[1]; break; }
      }
      if (!id) continue;
    }
    out.push({ id, kind: here.kind, start: here.i + 1, end: stop + 1 });
  }
  return out;
}

/** Which model a whole file belongs to, if it belongs to one: a chart file or a model stylesheet. */
export function fileOwner(path, text) {
  const p = posix(path);
  const scss = /^src\/styles\/models\/_([^/]+)\.scss$/.exec(p);
  if (scss) return scss[1];
  if (/^src\/models\/charts\/[^/]+\.ts$/.test(p) && text != null) {
    const m = CHART_ID.exec(text);
    if (m) return m[1];
  }
  return null;
}

/** Whether a path holds model source this module understands. */
export const isModelPath = (path) => /^src\/(models\/.+\.ts|styles\/models\/_[^/]+\.scss)$/.test(posix(path));

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * Every model's own source in the working tree, keyed by id:
 * { snippet: { file, line, css, text } | null, parts: [{ file, start, end }], fingerprint }.
 * `css` is the snippet entry from its `css:` line to the entry's end (the part the contract
 * speaks about); `text` is the whole entry.
 */
export function workingSources() {
  const files = [...walk(join(ROOT, 'src/models')), ...walk(join(ROOT, 'src/styles/models'))]
    .map((f) => posix(relative(ROOT, f)))
    .filter(isModelPath)
    .sort();
  const byId = new Map();
  const get = (id) => {
    if (!byId.has(id)) byId.set(id, { snippet: null, parts: [], chunks: [] });
    return byId.get(id);
  };
  for (const file of files) {
    const text = norm(readFileSync(join(ROOT, file), 'utf8'));
    const owner = fileOwner(file, text);
    if (owner) {
      const m = get(owner);
      m.parts.push({ file, start: 1, end: text.split('\n').length, whole: true });
      m.chunks.push(`${file}\n${text}`);
      if (file.includes('/charts/') && !m.snippet) {
        const at = text.indexOf('css:');
        m.chartFile = { file, css: at >= 0 ? text.slice(at) : '', line: at >= 0 ? text.slice(0, at).split('\n').length : null };
      }
      continue;
    }
    const lines = text.split('\n');
    for (const e of entriesOf(lines)) {
      const m = get(e.id);
      const body = lines.slice(e.start - 1, e.end).join('\n');
      m.parts.push({ file, start: e.start, end: e.end, kind: e.kind });
      m.chunks.push(`${file}#${e.kind}\n${body}`);
      // the spec's lookup: grep `  <id>: {` in src/models, preferring a snippet file
      if (e.kind === 'snippet' && (!m.snippet || (!/snippet/.test(m.snippet.file) && /snippet/.test(file)))) {
        const cssAt = body.search(/^    css:/m);
        m.snippet = { file, line: e.start, css: cssAt >= 0 ? body.slice(cssAt) : '', found: 'grep' };
      }
    }
  }
  for (const m of byId.values()) {
    if (!m.snippet && m.chartFile) m.snippet = { ...m.chartFile, found: 'chart file (no `  <id>: {` line; the snippet sits in the chart module)' };
    delete m.chartFile;
    m.fingerprint = createHash('sha1').update(m.chunks.sort().join('\n\0\n')).digest('hex').slice(0, 16);
    delete m.chunks;
  }
  return byId;
}

/** id → fingerprint, for recording beside a check result. */
export function fingerprints() {
  return Object.fromEntries([...workingSources()].map(([id, m]) => [id, m.fingerprint]));
}
