/**
 * CAN THIS MACHINE RUN THE CHECKS, AND IF NOT, WHY NOT?
 *
 *   npm run doctor
 *
 * Written on 2026-09-29, after Windows Smart App Control quietly began refusing to start
 * Playwright's unsigned Chromium in the middle of a gate run. Every browser-driven check failed at
 * once, and what they said was "browser.newPage: Target crashed", "no download seen", "spawn
 * UNKNOWN" -- three different sentences, none of which mentions the policy that caused all three.
 * Finding that out took an hour of reading logs, and nothing in the repository would have told
 * somebody cloning it.
 *
 * So this asks the machine the questions the checks assume, and when one fails it answers in three
 * parts: WHAT failed, WHERE (the file, the port, the binary), and WHY, in the words of whatever
 * refused. A tool that only says "failed" hands the reader a search engine and an afternoon.
 *
 * It changes nothing and installs nothing. Every line is a question.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const rows = [];
const ok = (what, detail) => rows.push({ level: 'ok', what, detail });
const warn = (what, detail, why, fix) => rows.push({ level: 'warn', what, detail, why, fix });
const bad = (what, detail, why, fix) => rows.push({ level: 'bad', what, detail, why, fix });

/* ---------------- the toolchain ---------------- */
const NEEDED_NODE = 22;
const major = Number(process.versions.node.split('.')[0]);
if (major >= NEEDED_NODE) ok('node', `v${process.versions.node}`);
else bad('node', `v${process.versions.node}`, `the scripts use Node ${NEEDED_NODE} features (import assertions, fresh fs APIs). Install Node ${NEEDED_NODE} or newer.`);

if (existsSync(join(ROOT, 'node_modules'))) ok('dependencies', 'node_modules is there');
else bad('dependencies', 'no node_modules', 'nothing below can work without it.', 'npm ci');

try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, stdio: 'ignore' });
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ok('git', `a repository, at ${head}`);
  /* The push guard is a hook, and a hook is not part of a clone: it works only once this clone's
     git has been pointed at scripts/hooks. Asked here because the alternative is finding out it
     was never on by pushing through it. */
  let hooks = '';
  try { hooks = execFileSync('git', ['config', 'core.hooksPath'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* unset */ }
  if (hooks === 'scripts/hooks') ok('push guard', 'on: a push to the deployed branch is checked against the release checklist');
  else warn('push guard', hooks ? `off: core.hooksPath is "${hooks}"` : 'off: core.hooksPath is not set',
    'nothing on this machine stops a push while the release checklist is open. The board will say the push is shut and git will push anyway.',
    hooks ? 'git config core.hooksPath scripts/hooks' : 'node scripts/install-hooks.mjs');
} catch {
  bad('git', 'not a git repository', 'the board dates results by commit and the checklist asks what has changed since a result was recorded. Clone it rather than downloading a zip.');
}

/* ---------------- the browser, which is the one that bites ---------------- */
let browserLine = null;
try {
  const { resolveBrowser, browserId } = await import('./browser.mjs');
  await resolveBrowser();
  const id = browserId();
  browserLine = id;
  if (id?.kind === 'playwright') ok('browser', "Playwright's own Chromium");
  else warn('browser', `${id?.name} ${id?.version ?? ''}`.trim(),
    "Playwright's own Chromium could not start, so a signed system browser is being used. Checks that compare pixels against a number measured elsewhere (check-worker-parity, check-perf) will call their old results stale rather than compare across browsers. Structural checks are unaffected.");
} catch (e) {
  bad('browser', 'none could be started', String(e?.message ?? e).split('\n').slice(0, 6).join('\n         '));
}

/* ---------------- what the checks read ---------------- */
for (const [what, path, why] of [
  ['model sources', 'src/models', 'the 135 models the checks judge.'],
  ['generated ids', 'src/generated/model-ids.json', 'run `npm run generate` (or any build) to write it.'],
  ['recorded results', 'docs/checks', 'the board reads each check\'s verdicts from here. An empty folder is not an error: it means nothing has been run yet, and every model will read "not run yet".'],
  ['the checklist', 'docs/RELEASE-CHECKLIST.md', 'the release list the board proves line by line.'],
]) {
  if (existsSync(join(ROOT, path))) ok(what, path);
  else warn(what, `${path} is missing`, why, path === 'src/generated/model-ids.json' ? 'npm run generate' : null);
}

/* ---------------- the ports it wants ---------------- */
const free = (port) => new Promise((resolve) => {
  const s = createServer();
  s.once('error', () => resolve(false));
  s.once('listening', () => s.close(() => resolve(true)));
  s.listen(port, '127.0.0.1');
});
for (const [port, what, by] of [[8787, 'the render service', '`npm run export`'], [5178, 'the board', '`npm run board:dev`']]) {
  if (await free(port)) ok(`port ${port}`, `free (${what})`);
  else warn(`port ${port}`, `in use (${what})`, `something is already listening. If it is ${by}, that is fine and it will be used as it stands. If it is something else, the checks will talk to the wrong thing.`);
}

/* ---------------- the optional, networked parts ---------------- */
const env = process.env.VITE_CAPTURE_URL;
if (env) ok('VITE_CAPTURE_URL', env);
else warn('VITE_CAPTURE_URL', 'not set', 'only needed to BUILD a site that exports through the deployed Worker. Local runs start their own render service on 8787, so every check works without it.');

try {
  execFileSync('npx', ['wrangler', 'whoami'], { cwd: join(ROOT, 'worker'), stdio: 'ignore', timeout: 60000, shell: process.platform === 'win32' });
  ok('wrangler', 'signed in');
} catch {
  warn('wrangler', 'not signed in (or not installed)', 'only needed to ask Cloudflare when the Worker was last deployed. Every other check is unaffected.');
}

/* ---------------- say it ---------------- */
const mark = { ok: '  ok  ', warn: ' note ', bad: ' STOP ' };
console.log('\ncss-3d-lab: what this machine can do\n');
for (const r of rows) {
  console.log(`${mark[r.level]} ${r.what.padEnd(17)} ${r.detail}`);
  if (r.why) for (const line of String(r.why).split('\n')) console.log(`        ${line}`);
}
const stops = rows.filter((r) => r.level === 'bad');
const notes = rows.filter((r) => r.level === 'warn');
console.log('');
if (stops.length) {
  console.log(`${stops.length} thing(s) stop the checks from running: ${stops.map((r) => r.what).join(', ')}.`);
  console.log('The board still opens and shows whatever was last recorded — it reads docs/checks, it does not need to run anything.');
} else if (notes.length) {
  console.log(`Everything needed is here. ${notes.length} thing(s) worth knowing about, above.`);
} else {
  console.log('Everything needed is here.');
}
if (browserLine && browserLine.kind !== 'playwright') {
  console.log(`\nResults measured here will record ${browserLine.name} ${browserLine.version ?? ''}, so a number measured on another browser is not silently compared with one measured here.`);
}
console.log('\n  npm run board       the board, reading what has been recorded');
console.log('  npm run verify      every check, about four hours on an idle machine');
console.log('  npm run verify -- --step qa,snippets    just those, merged into the record\n');
/*
 * WRITTEN DOWN, SO THE BOARD CAN SAY IT TOO.
 *
 * A guide in a terminal is a guide somebody has to know to run. The board can read this and put
 * the same three parts -- what, where, why -- in front of a person who has just opened it, with
 * the command beside each one. It is the machine, not the project, so it is never committed.
 */
try {
  writeFileSync(join(ROOT, 'docs', 'checks', 'machine.json'), `${JSON.stringify({
    note: 'Written by npm run doctor. What THIS machine can do. Not a check result, and not committed: it describes the computer, not the project.',
    at: new Date().toISOString(),
    ready: stops.length === 0,
    stops: stops.length,
    notes: notes.length,
    browser: browserLine,
    rows,
  }, null, 2)}
`);
} catch (e) {
  // Saying nothing here hid a missing import through two runs. A doctor that cannot write its
  // own note should say so: it is the one script whose whole job is explaining what went wrong.
  console.log(`(could not write docs/checks/machine.json: ${String(e?.message ?? e).split(String.fromCharCode(10))[0]})`);
}
process.exit(stops.length ? 1 : 0);
