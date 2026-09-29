/**
 * Points git at the hooks this repository carries. Run by `npm install` (the prepare script).
 *
 *   node scripts/install-hooks.mjs
 *
 * WHY IT IS NEEDED. Hooks live in .git/hooks, which is not part of a clone, so a hook committed
 * anywhere else does nothing until git is told where it is. That is one setting,
 * core.hooksPath, in this clone's own config. Nothing outside the repository is touched.
 *
 * WHAT IT WILL NOT DO. Overwrite a hooks path somebody set on purpose: it says what it found and
 * leaves it. And it never fails an install -- on a deploy runner, or in a copy with no .git, there
 * is nothing to guard and no reason to stop `npm ci`.
 */
import { execFileSync } from 'node:child_process';

const WANT = 'scripts/hooks';
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

try {
  git('rev-parse', '--git-dir');
} catch {
  console.log('install-hooks: not a git repository, so there is no push to guard. Nothing set.');
  process.exit(0);
}
let have = '';
try { have = git('config', '--local', 'core.hooksPath'); } catch { /* unset: git exits 1 */ }
if (have === WANT) {
  console.log(`install-hooks: core.hooksPath is already ${WANT}.`);
} else if (have) {
  console.log(`install-hooks: core.hooksPath is "${have}", set by someone, and was left alone.`);
  console.log(`               The push guard is NOT active. To use it: git config core.hooksPath ${WANT}`);
} else {
  try {
    git('config', '--local', 'core.hooksPath', WANT);
    console.log(`install-hooks: core.hooksPath set to ${WANT}. A push to the deployed branch is now checked`);
    console.log('               against the release checklist (scripts/pre-push.mjs).');
  } catch (e) {
    console.log(`install-hooks: could not set core.hooksPath (${String(e?.message ?? e).split('\n')[0]}). The push guard is NOT active.`);
  }
}
