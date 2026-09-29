/**
 * The deploy, refused unless the person publishing said to push THIS commit.
 *
 *   node scripts/check-signoff.mjs
 *
 * Run by .github/workflows/deploy.yml before anything is built. It is the half of the push guard
 * that cannot be skipped from the machine that pushes.
 *
 * WHY THERE ARE TWO. scripts/pre-push.mjs refuses the push, with every open item and its reason,
 * but it is a git hook: `git push --no-verify` goes round it, and so does a clone whose hooks were
 * never installed. Whatever reaches main used to deploy. Now a commit that reaches main without a
 * sign-off stays on main and goes no further, and the run that refused it says why.
 *
 * WHAT IT CAN SEE, which is less than the hook. The check results are not in the repository
 * (docs/checks/ is gitignored: megabytes of one machine's workings), so a runner cannot ask whether
 * the list is green. It asks the one thing that IS committed: the sign-off line in
 * docs/RELEASE-CHECKLIST.md. `npm run signoff -- push` refuses to write that tick while anything
 * before the push is open, so the tick is the record that the list was green where it was judged.
 *
 * THE RULE, the same one the board holds the tick to (scripts/checklist-proofs.mjs): the line is
 * ticked, and the commit that last changed it is the commit being deployed. A tick from before the
 * last commit is a statement about other code. Nobody writes a hash down; the claim expires by
 * itself.
 *
 * It needs the history of that line, so the workflow checks out with fetch-depth: 0. It reads and
 * answers; it changes nothing.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MINE, nameOf } from './push-gate.mjs';

const ROOT = process.cwd();
const REL = 'docs/RELEASE-CHECKLIST.md';
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
const short = head.slice(0, 7);

const refuse = (headline, lines) => {
  const bar = '='.repeat(72);
  console.error(`\n${bar}\nDEPLOY REFUSED: ${headline}\n${bar}\n`);
  for (const l of lines) console.error(l);
  console.error('\nWhat to do, on a machine that has run the checks:');
  console.error('  npm run signoff            what is still open before the push');
  console.error('  npm run signoff -- push    once nothing is: the sign-off, stamped with who and when');
  console.error(`  commit ${REL} and nothing else, and push`);
  console.error(`\nNothing was built and nothing was deployed. ${short} is on the branch; the live site is`);
  console.error('still the last commit that was signed off.\n');
  // GitHub shows this line on the run's summary page, so the reason is readable without the log
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Deploy refused::${headline}`);
  process.exit(1);
};

/* A shallow checkout would PASS, which is worse than failing: with one commit of history, every
   line in the repository was "last changed" at HEAD, so any tick at all would look fresh. */
if (git('rev-parse', '--is-shallow-repository') === 'true') {
  refuse('this checkout has no history, so the sign-off cannot be dated.', [
    'With only the latest commit present, every line looks as if it changed in it, and a',
    'sign-off from a month ago would pass as one given now. The workflow needs fetch-depth: 0',
    'on actions/checkout.',
  ]);
}

const lines = readFileSync(join(ROOT, 'docs', 'RELEASE-CHECKLIST.md'), 'utf8').split(/\r?\n/);
const mine = lines.map((l, i) => ({ m: l.match(/^- \[( |x)\] (.+)$/), line: i + 1 }))
  .filter((x) => x.m && MINE.test(x.m[2]))
  .map((x) => ({ done: x.m[1] === 'x', text: x.m[2], line: x.line }));

if (!mine.length) {
  refuse(`the sign-off line is missing from ${REL}.`, [
    'The list has no item beginning "The person publishing has", so there is nothing that',
    'could have been signed. It was reworded or removed; put it back rather than deploy without it.',
  ]);
}

for (const it of mine) {
  const name = nameOf(it.text);
  if (!it.done) {
    refuse(`nobody has said to push ${short}.`, [
      `  [ ] ${name}`,
      '',
      `That line in ${REL} is not ticked. The push deploys to the live site and is the claim`,
      'that everything above it on the list checked out, so it waits for a person to say so.',
    ]);
  }
  let at = null;
  try { at = git('log', '-1', '--format=%H', `-L${it.line},${it.line}:${REL}`).split('\n')[0].trim() || null; }
  catch (e) {
    refuse('when the sign-off was given could not be read.', [
      `  git could not read the history of line ${it.line} of ${REL}:`,
      `  ${String(e?.message ?? e).split('\n')[0]}`,
      '',
      'A sign-off that cannot be dated is not known to be about this commit. If this is a shallow',
      'checkout, the workflow needs fetch-depth: 0.',
    ]);
  }
  if (at !== head) {
    let behind = '?';
    try { behind = git('rev-list', '--count', `${at}..HEAD`); } catch { /* leave it */ }
    refuse(`the sign-off is about ${String(at).slice(0, 7)}, and this is ${short}.`, [
      `  [x] ${name}`,
      `        said at ${String(at).slice(0, 7)}; ${behind} commit${behind === '1' ? ' has' : 's have'} landed since`,
      '',
      'It is a claim about code that is not the code being deployed, so it does not carry.',
      'Read the list again on what is going out, and say it again.',
    ]);
  }
  console.log(`signed off: "${name}" at ${short}, which is the commit being deployed.`);
}
