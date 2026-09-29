/**
 * WHAT EACH GATE STEP'S RESULT DEPENDS ON.
 *
 * docs/checks/gate.json used to be judged by one question: is its commit HEAD? Any commit at all
 * retired the whole record -- a typo in the README, a line in scripts/check-live.mjs, a colour in
 * the board's own stylesheet -- and six release-checklist lines went red until somebody spent four
 * and a half hours re-earning evidence that nothing had invalidated.
 *
 * On 2026-09-28 that cost three extra gate runs in one day. It also produced a choice nobody should
 * have to make: at one point the README said "seventeen steps" one line above the run printing 18,
 * and fixing that sentence would have thrown away a four-hour record. A correct README or a green
 * gate, pick one.
 *
 * The per-model checks never had this problem. scripts/fingerprint.mjs gives each kind of result a
 * RENDER PATH -- the files that actually decide what it judged -- and a result dies when something
 * on its own path changes, not when anything changes. This is the same idea for the gate's steps.
 *
 * WHY A SEPARATE TABLE. fingerprint.mjs's `wanted()` deliberately restricts itself to model sources
 * and the render-path files, because widening it would change what stales 135 models' worth of
 * recorded verdicts. A gate step depends on coarser things -- whole directories, build config -- so
 * it gets its own table and its own hash, and model staleness is left exactly as it was.
 *
 * HOW TO READ AN ENTRY. Each is a list of paths, relative to the repository, and a directory means
 * every file under it. Err towards naming MORE than you think: a step that stales too eagerly costs
 * a re-run, and a step that does not stale when it should reports a pass for code it never saw.
 * That is the expensive direction, and the whole point of the board.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const toPosix = (p) => p.split(sep).join('/');
// the same shape of hash fingerprint.mjs uses, and line endings normalised for the same reason:
// a checkout that rewrites CRLF must not look like an edit
const norm = (s) => s.replace(/\r\n/g, '\n');
const h = (value) => createHash('sha1').update(value).digest('hex').slice(0, 12);

/* Building the site is `generate && tsc && vite build`, so anything the generators read, the
   compiler sees or the bundler bundles decides whether that build still means anything. */
const BUILD = [
  'src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts',
  'scripts/generate-pages.mjs', 'scripts/generate-capture-fonts.mjs',
];
/* The model sources and the one file that turns a snippet into a standalone document. */
/* Which browser draws, and how a crash is handled. scripts/browser.mjs decides whether the pixels
   come from Playwright's Chromium or a signed system browser, and a result measured on one is not
   comparable with a result measured on the other. It was on no path at all until 2026-09-29 -- in
   the machinery built that same morning to stop a result outliving what it judged. */
const BROWSER = ['scripts/browser.mjs', 'scripts/browser-guard.mjs'];
const SNIPPETS = ['src/models', 'src/models/snippet-utils.ts', 'scripts/snippet-check.mjs'];

export const STEP_PATHS = {
  // tsc covers every .ts in the project, the board's own page included: a change there really does
  // mean the last "TypeScript is clean" was about other code.
  typescript: ['src', 'tsconfig.json', 'package.json'],
  build: BUILD,
  // qa opens the BUILT site, so it depends on everything the build does, plus its own rule
  qa: [...BUILD, ...BROWSER, 'scripts/qa.mjs'],
  snippets: [...SNIPPETS, ...BROWSER],
  // preview-check watches a model's frame survive an edit
  preview: [...BROWSER, 'src/preview.ts', 'src/lazy-mount.ts', 'src/fit.ts', 'src/models', 'scripts/preview-check.mjs'],
  // compare draws every model twice: on the page, and through the dialog's own capture code
  compare: [
    ...BROWSER,
    'src/models', 'src/preview.ts', 'src/fit.ts', 'src/embed.ts', 'src/capture-scene.ts',
    'src/capture-client.ts', 'src/fonts/capture-fonts.ts', 'src/models/snippet-utils.ts',
    'server/render.mjs', 'scripts/compare-capture.mjs',
  ],
  // the looks open the export dialog on one model and read what it hands over. docs/RELEASE-CHECKLIST.md
  // is on the path because three-looks.mjs finds its item numbers by matching each item's words:
  // reword an item and the look is answering about a line that no longer says that.
  looks: [
    ...BROWSER,
    'src/video.ts', 'src/print.ts', 'src/file-name.ts', 'src/main.ts', 'src/capture-client.ts',
    'server/render.mjs', 'scripts/three-looks.mjs', 'docs/RELEASE-CHECKLIST.md',
  ],
  /* Not gate steps, but the same question: these two write records of their own, and judging
     them by "is the commit HEAD" made a parity pass go red an hour after it was measured, for a
     commit that touched neither the scene nor either renderer. */
  // the scene the dialog posts and the two things that draw it
  parity: [...BROWSER, 'src/models', 'src/capture-scene.ts', 'src/capture-client.ts', 'src/fonts/capture-fonts.ts', 'server/render.mjs', 'worker/src', 'scripts/check-worker-parity.mjs'],
  // the full export matrix: the dialog, what it records, and what draws the file
  matrix: [...BROWSER, 'src/models', 'src/video.ts', 'src/record.ts', 'src/capture-scene.ts', 'src/capture-client.ts', 'src/file-name.ts', 'server/render.mjs', 'scripts/check-exports.mjs'],
};

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    // node_modules and build output are never sources; dist/ is what the build MAKES, not what
    // decides it, and hashing it would stale every step on every build
    if (/^(node_modules|dist|\.media-tmp|\.vite)$/.test(name)) continue;
    if (statSync(full).isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}

/**
 * The files one step depends on, as repository-relative posix paths, sorted.
 * A path that does not exist is simply absent: the hash then records its absence, which is a real
 * difference from it being there.
 */
export function filesFor(key) {
  const paths = STEP_PATHS[key];
  if (!paths) return null;
  const out = new Set();
  for (const p of paths) {
    const full = join(ROOT, p);
    if (!existsSync(full)) continue;
    if (statSync(full).isDirectory()) for (const f of walk(full)) out.add(toPosix(relative(ROOT, f)));
    else out.add(toPosix(p));
  }
  return [...out].sort();
}

/**
 * One hash for everything a step depends on, read from the WORKING TREE rather than from a commit.
 * The working tree is what a run actually judged: a gate that ran with an uncommitted edit judged
 * that edit, and a fingerprint taken from HEAD would quietly disagree.
 *
 * Returns null for a step with no declared path, and the caller must treat that as "cannot say"
 * rather than as unchanged -- a missing rule is not a passing one.
 */
export function stepFingerprint(key) {
  const files = filesFor(key);
  if (!files) return null;
  const parts = [];
  for (const f of files) {
    try { parts.push(`${f}\0${h(norm(readFileSync(join(ROOT, f), 'utf8')))}`); }
    catch { parts.push(`${f}\0unreadable`); }
  }
  return { files: files.length, hash: h(parts.join('\n')) };
}

/** Every declared step, fingerprinted now. What scripts/verify.mjs writes into its record. */
export function allFingerprints() {
  const out = {};
  for (const key of Object.keys(STEP_PATHS)) out[key] = stepFingerprint(key);
  return out;
}
