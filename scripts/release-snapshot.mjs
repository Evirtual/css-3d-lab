/**
 * The release snapshot: the one file about check results that is COMMITTED.
 *
 *   node scripts/release-snapshot.mjs           write docs/release-snapshot.json from the ledger
 *   node scripts/release-snapshot.mjs --check   say whether the committed snapshot still describes
 *                                               the code at HEAD (exit 0 if it does, 1 if not)
 *
 * Why it exists. The raw run records under docs/checks/ are megabytes of one machine's workings:
 * every argument list, every per-model detail blob. They are gitignored, so a fresh clone has no
 * results and the ledger honestly reads "not run yet" until someone captures their own. That is
 * the right default — but it would also throw away the one thing worth keeping across a clone:
 * what the checks said on the commit that was released.
 *
 * So this writes one line per model per check — status, the rule version it was judged under, and
 * when it ran — plus each model's review verdicts and the ledger's counts. No arguments, no
 * details, no fingerprints. scripts/ledger.mjs reads it when a check has no live result and marks
 * every result that came from it, so docs/ledger.html can show it as the state at the last
 * release and never as a fresh run.
 *
 * --check is the release checklist's proof. A snapshot describes the code it was taken on, so it
 * is only still true if nothing the checks judge has changed since: the model sources, the model
 * stylesheets, and the render-path files in scripts/fingerprint.mjs. It prints what changed when
 * it has, which is the list of things to re-capture.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RENDER_FILES } from './fingerprint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = join(ROOT, 'docs/release-snapshot.json');
const LEDGER = join(ROOT, 'docs/ledger.json');
const git = (...a) => execFileSync('git', ['-c', 'core.quotepath=off', ...a], { cwd: ROOT, encoding: 'utf8' }).trim();

/** What the checks judge: a change to any of these makes a snapshot describe code that is gone. */
export const JUDGED = ['src/models', 'src/styles/models', 'src/icons.ts', ...RENDER_FILES];

/** Seconds are enough to say when a run happened; the milliseconds are noise in a committed file. */
const when = (t) => (typeof t === 'string' && t ? t.replace(/\.\d+Z$/, 'Z') : null);

/** The committed snapshot, or null when there is none (a fresh clone before a release, or a bad file). */
export function readSnapshot() {
  if (!existsSync(SNAPSHOT)) return null;
  try { const s = JSON.parse(readFileSync(SNAPSHOT, 'utf8')); return s?.models ? s : null; } catch { return null; }
}

/**
 * Whether the committed snapshot still describes the code at HEAD, in one sentence and as data.
 * Read-only: git's own read commands and one file read, nothing slow. scripts/ledger.mjs shows the
 * answer on the page and scripts/checklist-proofs.mjs uses it as the checklist item's proof, so all
 * three say the same thing about the same file.
 */
export function snapshotStatus() {
  const snap = readSnapshot();
  if (!snap) return { ok: false, head: null, changed: [], why: 'no docs/release-snapshot.json: run node scripts/release-snapshot.mjs' };
  let head = null;
  try { head = git('rev-parse', '--short', 'HEAD'); } catch { return { ok: false, head: snap.head, changed: [], why: 'HEAD could not be read' }; }
  // quiet: git's own "Not a valid object name" would otherwise print above the sentence that says it
  try { execFileSync('git', ['cat-file', '-e', `${snap.head}^{commit}`], { cwd: ROOT, stdio: 'ignore' }); }
  catch { return { ok: false, head: snap.head, changed: [], why: `the snapshot was taken at ${snap.head}, which is not a commit in this repository` }; }
  const changed = git('diff', '--name-only', snap.head, 'HEAD', '--', ...JUDGED).split('\n').filter(Boolean);
  if (changed.length) return { ok: false, head: snap.head, at: head, changed, why: `the snapshot is out of date: ${changed.length} file(s) the checks judge changed between ${snap.head} and ${head}` };
  return { ok: true, head: snap.head, at: head, changed: [], why: `the snapshot matches HEAD: taken at ${snap.head}, and nothing the checks judge has changed since (HEAD is ${head})` };
}

// Everything below runs only when this file is the command: importing it must never write.
const MAIN = process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/release-snapshot.mjs');
if (!MAIN) { /* imported for readSnapshot / snapshotStatus / JUDGED */ } else {

if (process.argv.includes('--check')) {
  const s = snapshotStatus();
  console.log(s.why);
  for (const f of s.changed.slice(0, 20)) console.log(`  ${f}`);
  if (s.changed.length > 20) console.log(`  … and ${s.changed.length - 20} more`);
  if (!s.ok && s.changed.length) console.log('re-capture the checks and run node scripts/release-snapshot.mjs');
  process.exit(s.ok ? 0 : 1);
}

if (!existsSync(LEDGER)) {
  console.error('release-snapshot: no docs/ledger.json. Run `npm run ledger` first (after capturing the checks).');
  process.exit(1);
}
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));

const models = {};
for (const m of ledger.models) {
  const checks = {};
  for (const [key, c] of Object.entries(m.checks ?? {})) {
    if (!c || !c.status) continue;
    checks[key] = { status: c.status, ruleVersion: c.ruleVersion ?? null, ranAt: when(c.ranAt) };
  }
  const reviews = (m.reviews ?? [])
    .filter((r) => !r.stale)
    .map((r) => ({ kind: r.kind, verdict: r.verdict, reviewedAt: when(r.reviewedAt), reviewer: r.reviewer }));
  models[m.id] = { status: m.status, checks, ...(reviews.length ? { reviews } : {}) };
}

const snapshot = {
  what: 'One line per model per check, from the ledger, on the commit named below. Not a fresh run: docs/ledger.html shows it as the state at the last release. The raw run records it came from (docs/checks/) are gitignored; capture your own with `npm run capture -- <check>`.',
  head: ledger.head,
  takenAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  counts: {
    models: ledger.counts.models,
    toCheck: ledger.counts.toCheck,
    checked: ledger.counts.checked,
    approved: ledger.counts.approved,
  },
  // the rule each check was at when the snapshot was taken, so a later run under a newer rule is
  // not mistaken for the same verdict
  checks: Object.fromEntries((ledger.checkList ?? []).map((c) => [c.key, { scope: c.scope, ruleVersion: c.ruleVersion ?? null }])),
  models,
};

/**
 * JSON, written so a verdict is ONE LINE: `"contrast": {"status":"pass","ruleVersion":2,…}`.
 * Fully indented, the same 1485 verdicts came to 184 kB over 9000 lines, most of it punctuation;
 * a line each is under half that, and a diff between two releases then shows the checks that
 * changed their minds rather than a wall of re-indented braces. The header stays indented, since
 * it is read by people. JSON.parse round-trips it: it is ordinary JSON, only wrapped differently.
 */
function render(snap) {
  const { models: ms, ...head } = snap;
  const top = JSON.stringify(head, null, 1).replace(/\n}$/, '');
  const body = Object.entries(ms).map(([id, m]) => {
    const checks = Object.entries(m.checks).map(([k, c]) => `   ${JSON.stringify(k)}: ${JSON.stringify(c)}`).join(',\n');
    const reviews = m.reviews ? `,\n  "reviews": [\n${m.reviews.map((r) => `   ${JSON.stringify(r)}`).join(',\n')}\n  ]` : '';
    return ` ${JSON.stringify(id)}: {\n  "status": ${JSON.stringify(m.status)},\n  "checks": {\n${checks}\n  }${reviews}\n }`;
  }).join(',\n');
  return `${top},\n "models": {\n${body}\n }\n}\n`;
}

const text = render(snapshot);
// never write a file that cannot be read back as what it was built from
const back = JSON.parse(text);
if (JSON.stringify(back) !== JSON.stringify(snapshot)) {
  console.error('release-snapshot: the file written does not parse back to the snapshot built. Nothing was written.');
  process.exit(1);
}
writeFileSync(SNAPSHOT, text);
const kb = (Buffer.byteLength(text) / 1024).toFixed(1);
const lines = Object.values(models).reduce((n, m) => n + Object.keys(m.checks).length, 0);
console.log(`docs/release-snapshot.json: ${Object.keys(models).length} models, ${lines} check verdicts, at ${snapshot.head} — ${kb} kB, ${text.split('\n').length - 1} lines`);

}
