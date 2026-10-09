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
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const toPosix = (p) => p.split(sep).join('/');
// the same shape of hash fingerprint.mjs uses, and line endings normalised for the same reason:
// a checkout that rewrites CRLF must not look like an edit
const norm = (s) => s.replace(/\r\n/g, '\n');
const h = (value) => createHash('sha1').update(value).digest('hex').slice(0, 12);

/**
 * The part of a file a step actually judges, where that is less than the whole file.
 *
 * THE CHECKLIST IS THE ONE CASE, and it was a deadlock. A step depends on
 * docs/RELEASE-CHECKLIST.md because it finds its items by their WORDS: reword one and the look is
 * answering about a line that no longer says that. But the whole file was hashed, and the file is
 * also where a tick, a re-check note and the sign-off are written. So signing off -- which is an
 * edit to this file, made only once everything is green -- turned the step stale, which made
 * everything not green. While nothing refused a push nobody met it. With scripts/pre-push.mjs in
 * place it would have refused every push for ever, each time for a reason the push itself created.
 *
 * What is judged is the names of the items, in order: each checkbox line up to its first dash,
 * without the box. A tick, a note or a stamp changes none of that. A reworded, added, removed or
 * reordered item changes it, which is exactly when the look has to be taken again.
 */
const judged = (file, text) => (file !== 'docs/RELEASE-CHECKLIST.md' ? text
  : text.split('\n').map((l) => l.match(/^\s*-\s*\[.\]\s*(.+)$/)?.[1]).filter(Boolean).map((t) => t.split(' — ')[0].trim()).join('\n'));

/* Building the site is `generate && tsc && vite build`, so anything the generators read, the
   compiler sees or the bundler bundles decides whether that build still means anything. */
const BUILD = [
  'src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts',
  'scripts/generate-pages.mjs', 'scripts/generate-capture-fonts.mjs',
  // the home page is the bundler's main input, and the site's name, address and dates are read by
  // both the generator and vite.config.ts. Neither was here until 2026-10-09, so a change to the
  // home page's title or structured data left "the build is clean" standing over the old page.
  'index.html', 'site.config.json',
  // the board's own page: built by vite.ledger.config.ts, excluded by tsconfig.json, and not in
  // dist/. It cannot change what generate, tsc or vite build produce, so it does not stale them.
  '!src/ledger',
];
/* The model sources and the one file that turns a snippet into a standalone document. */
/* Which browser draws, and how a crash is handled. scripts/browser.mjs decides whether the pixels
   come from Playwright's Chromium or a signed system browser, and a result measured on one is not
   comparable with a result measured on the other. It was on no path at all until 2026-09-29 -- in
   the machinery built that same morning to stop a result outliving what it judged. */
const BROWSER = ['scripts/browser.mjs', 'scripts/browser-guard.mjs'];
const SNIPPETS = ['src/models', 'src/models/snippet-utils.ts', 'scripts/snippet-check.mjs'];
/* Every per-model check runs inside scripts/capture-check.mjs, which reads the registry to know
   what it is running, the model sources to know what to run it over, and the fingerprint rules to
   know when a verdict has died. A change to any of them changes what the check did. */
const HARNESS = [
  'scripts/capture-check.mjs', 'scripts/checks-registry.mjs', 'scripts/model-sources.mjs',
  'scripts/fingerprint.mjs', 'scripts/export-defaults.mjs',
];
/*
 * WHAT A PER-MODEL CHECK DEPENDS ON -- DELIBERATELY COARSE.
 *
 * These checks start vite and render a model, so in practice anything under src/ can change what
 * they see. Twelve of the eighteen steps had NO declared paths at all, which meant the board could
 * never say whether their results were about today's code: they read "not known" for ever, and
 * "anything not proved current" came to fourteen steps and four hours.
 *
 * src/ wholesale is not precision and is not pretending to be. The asymmetry decides it: declaring
 * too much costs re-runs that were not strictly needed, and declaring too little lets a step report
 * CURRENT over a result that is nothing of the sort -- a false green, which is the one failure this
 * whole record exists to prevent. The steps that are narrower than this (compare, looks, preview)
 * are narrow because somebody reasoned through each file. Narrowing these is safe to do the same
 * way, one step at a time, with evidence.
 */
const RENDERS_MODELS = ['src', '!src/ledger', ...BROWSER, ...HARNESS];

export const STEP_PATHS = {
  // tsc covers every .ts in the project, the board's own page included: a change there really does
  // mean the last "TypeScript is clean" was about other code.
  // tsconfig.json excludes src/ledger, so a change there is not a change tsc looked at.
  typescript: ['src', '!src/ledger', 'tsconfig.json', 'package.json'],
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
  parity: [...BROWSER, 'src/models', 'src/capture-scene.ts', 'src/capture-client.ts', 'src/fonts/capture-fonts.ts', 'server/render.mjs', 'worker/src', 'scripts/check-worker-parity.mjs', 'scripts/parity-judge.mjs', 'scripts/check-glyphs.mjs', 'scripts/model-sources.mjs'],
  // the full export matrix: the dialog, what it records, and what draws the file
  matrix: [...BROWSER, 'src/models', 'src/video.ts', 'src/record.ts', 'src/capture-scene.ts', 'src/capture-client.ts', 'src/file-name.ts', 'server/render.mjs', 'scripts/check-exports.mjs'],

  /* ---- the per-model checks, which had no paths at all until 2026-09-29 ---- */
  boxsizing: [...RENDERS_MODELS, 'scripts/check-boxsizing.mjs', 'scripts/pixels.mjs'],
  contrast: [...RENDERS_MODELS, 'scripts/check-contrast.mjs', 'scripts/pixels.mjs'],
  access: [...RENDERS_MODELS, 'scripts/check-access.mjs', 'scripts/pixels.mjs', 'scripts/css-heads.mjs'],
  perf: [...RENDERS_MODELS, 'scripts/check-perf.mjs', 'scripts/css-heads.mjs'],
  models: [...RENDERS_MODELS, 'scripts/check-models.mjs'],
  motion: [...RENDERS_MODELS, 'scripts/check-motion.mjs', 'scripts/pixels.mjs', 'scripts/css-heads.mjs'],
  stages: [...RENDERS_MODELS, 'scripts/check-stages.mjs'],
  // exports runs the real render service, so what draws the file is on the path too
  exports: [...RENDERS_MODELS, 'scripts/check-exports.mjs', 'server/dev.mjs', 'server/render.mjs'],
  // media photographs the share images off the BUILT site
  media: [...RENDERS_MODELS, ...BUILD, 'scripts/check-media.mjs', 'scripts/og-shot.mjs'],

  /* ---- the two that judge the built site rather than any model ---- */
  app: [...BUILD, ...BROWSER, 'scripts/check-app.mjs'],
  seo: [...BUILD, 'scripts/check-seo.mjs', 'scripts/seo-limits.mjs', 'site.config.json'],

  /*
   * AND `remote` IS ABSENT ON PURPOSE.
   *
   * It asks GitHub what the remote holds, Cloudflare when the Worker was deployed, and the
   * workflow whether its variable is set. Not one of those answers is decided by a file in this
   * repository, so a fingerprint over local files would report CURRENT for as long as nobody
   * edited anything here -- while the remote moved underneath it. That is the false green this
   * record exists to prevent, so the step keeps no fingerprint and the board says "not known"
   * about it, which is the truth: only asking again can answer it.
   */
};

/* Written by scripts/generate-pages.mjs on every run and never committed. The two loose files
   matter as much as the folders: robots.txt came back as "newly added" against a commit made
   twenty minutes earlier, because it is regenerated and in no commit at all. */
const GENERATED = new Set(['public/demos', 'models', 'groups', 'embed', 'src/generated',
  'public/robots.txt', 'public/sitemap.xml']);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    // node_modules and build output are never sources; dist/ is what the build MAKES, not what
    // decides it, and hashing it would stale every step on every build
    if (/^(node_modules|dist|\.media-tmp|\.vite)$/.test(name)) continue;
    /*
     * AND NEITHER IS GENERATED SOURCE.
     *
     * scripts/generate-pages.mjs deletes and recreates public/demos, models, groups, embed and
     * src/generated on every run. They are outputs sitting inside folders that are otherwise
     * sources -- so hashing them meant the build's own fingerprint moved every time the build
     * ran, and "the build is clean" would have gone stale the instant it was earned.
     *
     * Found by reading an old record back out of git: every one of those files came back as
     * newly ADDED, because they are untracked and therefore in no commit at all.
     */
    if (GENERATED.has(toPosix(relative(ROOT, full)))) continue;
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
  /*
   * A PATH THAT STARTS WITH "!" IS TAKEN BACK OUT.
   *
   * Declaring a whole folder is the safe way to be roughly right, but it is only safe while the
   * folder holds nothing irrelevant. `src` holds src/ledger -- the board's own page, which is built
   * by vite.ledger.config.ts, excluded by tsconfig.json, and part of neither the site the models
   * render in nor anything tsc or vite build look at.
   *
   * Without this, editing the board staled eleven per-model checks plus TypeScript, the build and
   * QA: about four hours of re-running, to answer for a change that cannot reach a single thing any
   * of them measure. That happened repeatedly on 2026-09-29 and I re-ran checks because of it.
   *
   * This is a narrowing with evidence behind it, which is the only kind that is safe: the excluded
   * folder is not an input to these steps, and it is named rather than pattern-matched so that
   * adding a second one is a decision somebody has to write down.
   */
  const drop = paths.filter((p) => p.startsWith('!')).map((p) => toPosix(p.slice(1)));
  const keep = paths.filter((p) => !p.startsWith('!'));
  const excluded = (rel) => drop.some((d) => rel === d || rel.startsWith(d + '/'));
  const out = new Set();
  for (const p of keep) {
    const full = join(ROOT, p);
    if (!existsSync(full)) continue;
    if (statSync(full).isDirectory()) {
      for (const f of walk(full)) {
        const rel = toPosix(relative(ROOT, f));
        if (!excluded(rel)) out.add(rel);
      }
    } else if (!excluded(toPosix(p))) out.add(toPosix(p));
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
  /*
   * Each file's own hash as well as the total.
   *
   * Without it a stale line says "100 file(s) it depends on have changed" and not one of their
   * names, which tells a reader that something happened and nothing about what. With it the line
   * can say "scripts/browser.mjs changed", which is a thing a person can act on.
   */
  const each = {};
  for (const f of files) {
    let fh;
    try { fh = h(judged(f, norm(readFileSync(join(ROOT, f), 'utf8')))); }
    catch { fh = 'unreadable'; }
    each[f] = fh;
    parts.push(`${f}` + String.fromCharCode(0) + fh);
  }
  /*
   * AND A HASH OF THE FILE LIST ITSELF.
   *
   * `hash` mixes names and contents together, so it moves when the code changes AND when the rule
   * for what this step depends on changes. Those are different facts. On 2026-09-29 src/ledger was
   * taken off eleven steps' paths -- a narrowing, correct, changing nothing about any model -- and
   * every recorded result would have been reported STALE, meaning "the files it judged changed",
   * which was not true of one of them.
   *
   * With the list hashed separately the board can tell the two apart and say which happened. A
   * record written before this exists has no pathsHash, and the reader falls back to comparing
   * contents, exactly as it did before.
   */
  return {
    files: files.length,
    hash: h(parts.join(String.fromCharCode(10))),
    pathsHash: h(files.join(String.fromCharCode(10))),
    each,
  };
}
/**
 * A step's fingerprint AS IT WAS AT A COMMIT, read out of git.
 *
 * Records written before per-file hashes existed carry only a total, so they could say that a
 * hundred files had changed and not name one. They do carry the commit, though, and the files are
 * in git at that commit -- so the names are recoverable rather than lost, and an old record is
 * not a permanently unhelpful one.
 *
 * One `git cat-file --batch` for the lot: a process per file would be a hundred processes to
 * answer one question. A file that did not exist at that commit is simply absent, which is what
 * makes it read as "added" against today.
 */
export function fingerprintAt(commit, key) {
  const files = filesFor(key);
  if (!files || !commit) return null;
  try {
    const input = files.map((f) => `${commit}:${f}`).join(String.fromCharCode(10)) + String.fromCharCode(10);
    const out = execFileSync('git', ['cat-file', '--batch'], { cwd: ROOT, input, maxBuffer: 1 << 30 });
    const each = {};
    let at = 0;
    for (const f of files) {
      const nl = out.indexOf(10, at);
      if (nl < 0) break;
      const header = out.subarray(at, nl).toString('utf8');
      if (/ missing$/.test(header)) { at = nl + 1; continue; }   // not in that commit: reads as added today
      const size = Number(header.split(" ").at(-1));
      const body = out.subarray(nl + 1, nl + 1 + size).toString('utf8');
      each[f] = h(norm(body));
      at = nl + 1 + size + 1;
    }
    return { files: Object.keys(each).length, each };
  } catch { return null; }
}

/**
 * What changed between a recorded fingerprint and now, by name.
 *
 * Added, removed and edited: a file that appeared or vanished is a bigger fact than one that was
 * edited. An older record with no per-file hashes returns null and says so, rather than
 * pretending it can tell.
 */
export function whatChanged(was, now) {
  if (!was?.each || !now?.each) return null;
  const added = [], gone = [], edited = [];
  for (const f of Object.keys(now.each)) if (!(f in was.each)) added.push(f);
  for (const f of Object.keys(was.each)) {
    if (!(f in now.each)) gone.push(f);
    else if (was.each[f] !== now.each[f]) edited.push(f);
  }
  return { added, gone, edited, total: added.length + gone.length + edited.length };
}


/** Every declared step, fingerprinted now. What scripts/verify.mjs writes into its record. */
export function allFingerprints() {
  const out = {};
  for (const key of Object.keys(STEP_PATHS)) out[key] = stepFingerprint(key);
  return out;
}
