/**
 * The push, refused while the release checklist is open. Run by git, from scripts/hooks/pre-push.
 *
 *   node scripts/pre-push.mjs --dry      what a push of HEAD to the deployed branch would be told
 *
 * WHY THIS EXISTS. The board said the push was shut and nothing shut it. The checklist, the proofs
 * and `npm run signoff` all describe a gate, and every one of them is a page or a printout: on
 * 2026-09-29 two pushes went to main with twenty-four items open and the sign-off unticked, and
 * each one deployed. A rule that is only written down is a rule for people who read it first.
 *
 * WHAT IT GUARDS. Only a push to a branch the deploy workflow deploys (read from
 * .github/workflows/deploy.yml, so the two cannot name different branches). A push to any other
 * branch publishes nothing and is let through without a word.
 *
 * WHAT IT ASKS, in this order, and it stops at the first answer that is no:
 *
 *   1. Is the commit being pushed the one that was judged? Every proof is about HEAD and the
 *      working tree. Pushing some other commit to main is pushing code nobody here looked at.
 *   2. Can the ledger be built for it? It is rebuilt here rather than read as found, because a
 *      ledger from before the last commit is a verdict on different code.
 *   3. Is everything before the push green? The ledger's own verdict, which is the one the
 *      board's page draws its stages and its padlock from (scripts/push-gate.mjs).
 *   4. Has the person publishing said to push, about THIS commit? The tick expires by itself when
 *      anything lands after it (scripts/checklist-proofs.mjs), and that is part of the verdict.
 *
 * WHAT IT CANNOT DO. A hook runs on the machine that pushes and git lets that machine skip it, so
 * this stops a mistake and not a decision. It also only exists once core.hooksPath points at
 * scripts/hooks, which scripts/install-hooks.mjs sets on `npm install`; `npm run doctor` says
 * whether it has. It changes nothing: it reads, rebuilds docs/ledger.json, and answers.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPushGate } from './push-gate.mjs';

const ROOT = process.cwd();
const dry = process.argv.includes('--dry');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();

/** The branches a push deploys from, as the workflow itself lists them. */
const DEPLOYED = (() => {
  try {
    const y = readFileSync(join(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf8');
    const m = y.match(/^\s*branches:\s*\[([^\]]+)\]/m);
    const names = m ? m[1].split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : [];
    if (names.length) return names;
  } catch { /* no workflow to read: fall through to the branch this project has always deployed */ }
  return ['main'];
})();

/* git hands the hook one line per ref on stdin: <local ref> <local sha> <remote ref> <remote sha> */
const ZERO = /^0+$/;
const pushes = dry
  ? [{ remoteRef: `refs/heads/${DEPLOYED[0]}`, sha: git('rev-parse', 'HEAD') }]
  : readFileSync(0, 'utf8').split('\n').map((l) => l.trim().split(/\s+/)).filter((p) => p.length === 4)
    .map(([, sha, remoteRef]) => ({ remoteRef, sha }));
const guarded = pushes.filter((p) => DEPLOYED.some((b) => p.remoteRef === `refs/heads/${b}`) && !ZERO.test(p.sha));
if (!guarded.length) process.exit(0);

const branch = guarded[0].remoteRef.replace('refs/heads/', '');
const sha = guarded[0].sha;
const short = sha.slice(0, 7);
const node = 'node scripts/signoff.mjs';
const out = [];
const say = (s = '') => out.push(s);
const refuse = (headline, lines, next) => {
  const bar = '='.repeat(72);
  console.error(`\n${bar}\nPUSH REFUSED: ${branch} deploys to the live site, and ${headline}\n${bar}\n`);
  for (const l of lines) console.error(l);
  console.error('\nWhat to do:');
  for (const l of next) console.error(`  ${l}`);
  console.error(`\nNothing was pushed. The list is docs/RELEASE-CHECKLIST.md, and the board shows it`);
  console.error(`with each item's proof: npm run board, then Checklist in the header.\n`);
  process.exit(1);
};

/* 1. the commit being pushed is the commit that was judged */
const head = git('rev-parse', 'HEAD');
if (sha !== head) {
  refuse(`the commit being pushed is not the one that was checked.`, [
    `  being pushed   ${short}`,
    `  checked (HEAD) ${head.slice(0, 7)}`,
    '',
    'Every proof on the checklist is about HEAD and the files beside it. Nothing here has',
    `looked at ${short}, so nothing here can say it is ready.`,
  ], [`check out ${short} and run the checks on it, or push HEAD instead`]);
}

/* 2. the ledger, built now, for this commit */
try {
  execFileSync(process.execPath, ['scripts/ledger.mjs'], { cwd: ROOT, stdio: 'ignore', timeout: 15 * 60 * 1000 });
} catch (e) {
  refuse(`the ledger could not be built, so nothing could be judged.`, [
    `  node scripts/ledger.mjs failed: ${String(e?.message ?? e).split('\n')[0]}`,
    '',
    'A push that could not be checked is not a push that passed.',
  ], ['npm run doctor      says what this machine is missing, and why']);
}
const gate = readPushGate(ROOT);
if (gate.ledgerRead) {
  refuse(`the ledger could not be read, so nothing could be judged.`, [`  ${gate.ledgerRead}`], ['npm run doctor      says what this machine is missing, and why']);
}

/*
 * The three stages as the board's checklist shows them, padlock included. They are not recounted
 * here: they are the ledger's verdict, which is what the page draws. A push is let through in
 * exactly one state: Before the push is complete, which takes the padlock off Yours, and Yours is
 * complete.
 */
const { before, yours } = gate.stages;
const stageLines = () => {
  say('On the board (Checklist in the header):');
  say(`  1  Before the push   ${before.done}/${before.total}${before.open.length ? '' : '   complete'}`);
  say(`  2  Yours             ${yours.done}/${yours.total}${yours.locked ? '   LOCKED until stage 1 is complete' : yours.open.length ? '   unlocked, and waiting for you' : '   complete'}`);
  say('  A push works when both are complete, and not before.\n');
};
const lines = (open, ticked, unticked, width) => {
  for (const i of open) {
    say(`  ${i.ticked ? ticked : unticked}   ${i.item}`);
    if (i.found) say(`        ${String(i.found).slice(0, width)}`);
  }
};

/* 3. everything that can be done before the push */
if (gate.openBefore.length) {
  const n = gate.openBefore.length;
  stageLines();
  say(`${n} item${n === 1 ? '' : 's'} in stage 1 ${n === 1 ? 'is' : 'are'} not green at ${short}:\n`);
  lines(gate.openBefore, '[x] ticked, but its proof disagrees', '[ ] not done', 160);
  say('');
  say('The push is the claim that all of it checked out, so it waits for all of it.');
  refuse(`${gate.push.why}.`, out, [
    'npm run board            the board: Run, in its header, runs the checks, and says what each costs',
    'npm run verify           or the whole gate from a terminal, about four hours',
    `${node} push      once the list is green: the sign-off, which is yours`,
    'then commit docs/RELEASE-CHECKLIST.md, and push',
  ]);
}

/* 4. the person publishing has said to push, about this commit */
if (gate.openYours.length) {
  stageLines();
  lines(gate.openYours, '[x] ticked, but it no longer holds', '[ ] not said', 200);
  say('');
  say('Everything else is green. What is missing is a person saying so, about this commit:');
  say('a sign-off given before the last change is a sign-off on different code.');
  refuse(`nobody has said to push ${short}.`, out, [
    `${node} push      says it, stamped with your name, the date and the commit`,
    'then commit docs/RELEASE-CHECKLIST.md and nothing else, and push',
  ]);
}

/* Refuse on anything but a plain yes: a verdict this does not recognise is not a permission. */
if (gate.push.allowed !== true) refuse(`${gate.push.why ?? 'the ledger did not say the push is allowed'}.`, [], ['npm run board            the board says what is open']);

if (dry) console.log(`A push of ${short} to ${branch} would be let through: the checklist is green and signed off at this commit.`);
process.exit(0);
