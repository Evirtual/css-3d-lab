/**
 * Writes the README's list of scripts from the scripts themselves.
 *
 *   npm run readme               rewrite the list in README.md
 *   npm run readme -- --check    say whether it is current, and change nothing (exit 1 if not)
 *
 * WHY IT IS GENERATED. Every script here opens with a comment saying what it is for, and the README
 * said it again, by hand, in a table of sixty rows. Two descriptions of one thing drift: on
 * 2026-09-29 a new script was missing from the table until a release-checklist proof said so, and
 * the row for `signoff` still described a command that had been removed. The comment at the top of
 * the file is the one a person changing the script is looking at, so it is the one that is kept,
 * and the table is copied from it.
 *
 * WHAT IT WRITES. Everything between the two marker lines in README.md, and nothing outside them:
 * one row per npm script in package.json, in its order, then one per file in scripts/ and server/
 * that no npm script runs. "What it is for" is the first paragraph of the file's opening comment,
 * with the lines that only show how to run it left out. The file has the rest.
 *
 * WHO RUNS IT. scripts/ledger-watch.mjs, when the board starts and whenever a script or
 * package.json changes, so the README on disk is current while anybody is working. It is a
 * committed file, so the change still has to be committed; nothing here commits.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './model-sources.mjs';

export const START = '<!-- scripts:start (written by scripts/generate-readme.mjs from each file\'s opening comment: edit the comment, not this table) -->';
export const END = '<!-- scripts:end -->';
/** The folders whose files are listed, and the kinds of file in them that are scripts. */
const FOLDERS = ['scripts', 'server'];
const IS_SCRIPT = /\.(mjs|cjs)$/;

/** The opening comment of a file as plain lines: a block comment, or a run of // lines. */
function openingComment(text) {
  const t = text.replace(/\r\n/g, '\n').replace(/^#![^\n]*\n/, '').trimStart();
  if (t.startsWith('/*')) {
    const end = t.indexOf('*/');
    if (end < 0) return [];
    return t.slice(2, end).split('\n').map((l) => l.replace(/^\s*\*? ?/, (m) => (m.includes('*') ? '' : m)).replace(/^\*\s?/, ''));
  }
  const out = [];
  for (const l of t.split('\n')) {
    if (!l.startsWith('//')) break;
    out.push(l.replace(/^\/\/ ?/, ''));
  }
  return out;
}

/**
 * The first paragraph that says what the file is for.
 *
 * Lines that show how to run it are not prose: they are indented under the sentence they follow, or
 * they begin with the command. They are skipped wherever they fall, because some files open with
 * their usage and say what they are for underneath it.
 */
export function purpose(text) {
  const usage = (l) => /^\s{2,}\S/.test(l) || /^\s*(npm run|node |npx )/.test(l) || /^\s+-\s/.test(l);
  const paras = [];
  let cur = [];
  for (const l of openingComment(text)) {
    if (!l.trim() || usage(l)) { if (cur.length) paras.push(cur); cur = []; continue; }
    cur.push(l.trim());
  }
  if (cur.length) paras.push(cur);
  const first = paras[0];
  if (!first) return null;
  return first.join(' ').replace(/\s+/g, ' ').replace(/:$/, '.').replace(/\|/g, '\\|');
}

/** Which file an npm script runs, when it runs one: `node scripts/x.mjs ...` and nothing chained. */
const fileOf = (command) => (/&&|\|\||;/.test(command) ? null : /^node ((?:scripts|server)\/[\w.-]+\.(?:mjs|cjs))(?:\s|$)/.exec(command)?.[1] ?? null);
/** A file other scripts import and nobody runs: it says so in its own opening comment. */
const isModule = (text) => /not run on (its|their) own|\bshared by\b|\bused by\b/i.test(openingComment(text).join(' '));

export function table() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const read = (f) => { try { return readFileSync(join(ROOT, f), 'utf8'); } catch { return null; } };
  const rows = [];
  const listed = new Set();
  for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
    const file = fileOf(command);
    if (file) listed.add(file);
    const why = file ? purpose(read(file) ?? '') : null;
    rows.push([`\`npm run ${name}\``, file ? `\`${file}\`` : `\`${command.replace(/\|/g, '\\|')}\``,
      why ?? (file ? '(its opening comment does not say)' : 'A command line, not a script of this project: the column to the left is all of it.')]);
  }
  const files = FOLDERS.flatMap((d) => { try { return readdirSync(join(ROOT, d)).filter((f) => IS_SCRIPT.test(f)).map((f) => `${d}/${f}`); } catch { return []; } }).sort();
  for (const file of files) {
    if (listed.has(file)) continue;
    const text = read(file) ?? '';
    rows.push([isModule(text) ? 'imported, not run' : `\`node ${file}\``, `\`${file}\``, purpose(text) ?? '(its opening comment does not say)']);
  }
  return [
    START,
    '',
    `${rows.length} rows: the ${Object.keys(pkg.scripts ?? {}).length} npm scripts in \`package.json\`, then every other file in \`scripts/\` and \`server/\`.`,
    'Each file says how to run it, and why it exists, in the comment at its top.',
    '',
    '| Run it with | What runs | What it is for |',
    '| --- | --- | --- |',
    ...rows.map((r) => `| ${r.join(' | ')} |`),
    '',
    END,
  ].join('\n');
}

/** README.md with the list rewritten, or null when the markers are not there to write between. */
export function rewritten(readme) {
  const crlf = readme.includes('\r\n');
  const t = readme.replace(/\r\n/g, '\n');
  const a = t.indexOf(START.slice(0, 19)); // "<!-- scripts:start": the rest of the line may be reworded
  const b = t.indexOf(END);
  if (a < 0 || b < 0 || b < a) return null;
  const lineStart = t.lastIndexOf('\n', a) + 1;
  const out = `${t.slice(0, lineStart)}${table()}${t.slice(b + END.length)}`;
  return crlf ? out.replace(/\n/g, '\r\n') : out;
}

/** Rewrites README.md when the list in it is not the one the scripts describe. Says what it did. */
export function writeReadme({ check = false } = {}) {
  const file = join(ROOT, 'README.md');
  const was = readFileSync(file, 'utf8');
  const now = rewritten(was);
  if (now === null) return { ok: false, changed: false, error: 'README.md has no "<!-- scripts:start" and "<!-- scripts:end -->" lines to write between' };
  if (now === was) return { ok: true, changed: false };
  if (!check) writeFileSync(file, now);
  return { ok: !check, changed: true };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const check = process.argv.includes('--check');
  const r = writeReadme({ check });
  if (r.error) { console.error(`generate-readme: ${r.error}`); process.exit(2); }
  console.log(!r.changed ? 'README.md: the list of scripts is current.'
    : check ? 'README.md: the list of scripts is NOT current. npm run readme rewrites it.'
      : 'README.md: the list of scripts was rewritten. Commit it.');
  process.exit(r.ok ? 0 : 1);
}
