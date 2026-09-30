/**
 * The item on the release checklist that waits for a person, said from the command line, and said
 * again for each new commit that goes out.
 *
 *   npm run signoff                 what is waiting, and whether anything else is still open
 *   npm run signoff -- push         "Push it"
 *   npm run signoff -- undo push    take it back
 *
 * On Windows in PowerShell, call node directly -- `node scripts/signoff.mjs push`. PowerShell
 * picks npm.ps1 out of npm's three launchers and a Restricted execution policy will not load it.
 * What this prints at the end already accounts for that.
 *
 * WHY A COMMAND AND NOT A CHECKBOX IN A PAGE. The tick has to end up in
 * docs/RELEASE-CHECKLIST.md, because that file is the record: every tick is a line in a commit,
 * with a date, a commit hash and a name beside it. A checkbox on a page would either write nothing
 * (and then the record is a screenshot) or need a server (and then the record is a database nobody
 * can review in a diff). This writes the line, stamps it, and leaves the committing to a person.
 *
 * WHAT IT REFUSES TO DO. `push` will not tick while ANY other item on the list is open. The point
 * of the list is that the push is the claim that everything above it checked out; a sign-off that
 * could be given over an unfinished list would be a sign-off that means nothing. It names what is
 * still open and exits 1.
 *
 * It only edits this one file. It does not commit, does not push, and does not run any check.
 *
 * The line it ticks is matched up to the end of the LINE, not up to the newline: on Windows the
 * file ends its lines with CR LF, and a match that stopped at LF carried the CR into the middle of
 * the rewritten line. The ledger then could not parse that line at all, the Yours stage read 0/0,
 * and the sign-off that had just been given did not exist (2026-09-30).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPushGate } from './push-gate.mjs';

const ROOT = process.cwd();
const FILE = join(ROOT, 'docs', 'RELEASE-CHECKLIST.md');
const args = process.argv.slice(2);
const undo = args[0] === 'undo';
const which = (undo ? args[1] : args[0]) ?? '';

// Whoever is releasing, from git, not a name written into the source: anyone who clones this is
// not the person who wrote it, and the two items this ticks belong to whoever is publishing today.
const WHO = (() => {
  try { return execFileSync('git', ['config', 'user.name'], { cwd: ROOT, encoding: 'utf8' }).trim() || 'the person publishing'; }
  catch { return 'the person publishing'; }
})();
const ITEMS = {
  // BOTH are guarded, not just the push. A stage you can enter while the stage before it still has
  // something open is a stage that means nothing: "all have to be green before 2 stage is opened".
  push: { match: /^- \[( |x)\] (The person publishing has said to push[^\r\n]*)$/m, says: 'said to push', guarded: true },
};

const text = readFileSync(FILE, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const today = new Date().toISOString().slice(0, 10);

/*
 * What is still open is the ledger's verdict (scripts/push-gate.mjs), the same one the board's
 * page and the pre-push hook read, so the thing that refuses the tick and the thing that refuses
 * the push cannot come to disagree.
 *
 * The ledger is built first. This used to read whatever docs/ledger.json was lying there, which is
 * a verdict on the code as it was when somebody last had the board open.
 */
try { execFileSync(process.execPath, ['scripts/ledger.mjs'], { cwd: ROOT, stdio: 'ignore', timeout: 15 * 60 * 1000 }); }
catch (e) { console.error(`signoff: the ledger could not be built (${String(e?.message ?? e).split('\n')[0]}), so what is open cannot be judged. npm run doctor says what this machine is missing.`); process.exit(2); }
const gate = readPushGate(ROOT);
if (gate.ledgerRead) { console.error(`signoff: ${gate.ledgerRead}, so what is open cannot be judged.`); process.exit(2); }
const { ticked, openBefore, openYours, openAfter } = gate;

if (!which || !ITEMS[which]) {
  console.log(`\nThe release checklist: ${ticked.done} of ${ticked.total} ticked in the file.\n`);
  console.log(openYours.length ? 'Waiting for you:' : 'Nothing is waiting for you.');
  for (const i of openYours) console.log(`  [ ] ${i.item}`);
  if (openBefore.length) {
    console.log(`\nStill open, and not yours (${openBefore.length}):`);
    for (const i of openBefore) console.log(`  [ ] ${i.item}`);
  } else {
    console.log('\nEverything else that can be done before the push is green.');
  }
  if (openAfter.length) {
    console.log(`\nOnly answerable after the push (${openAfter.length}), so they do not block it:`);
    for (const i of openAfter) console.log(`  [ ] ${i.item}`);
  }
  // How to say it, in a form that works on the shell this is running in. On Windows the npm
  // launcher PowerShell picks is npm.ps1, which a Restricted execution policy refuses to load, so
  // printing "npm run" there hands someone the command that just failed. Calling node skips npm.
  const how = process.platform === 'win32' ? 'node scripts/signoff.mjs' : 'npm run signoff --';
  console.log(`\n  ${how} push         only once nothing else is open`);
  console.log(`  ${how} undo push    take it back`);
  if (process.platform === 'win32') {
    console.log(`\n  (node, not npm: PowerShell loads npm.ps1, which a Restricted execution policy`);
    console.log(`   blocks. npm.cmd run signoff -- push works too. Nothing here needs that`);
    console.log(`   policy changed.)\n`);
  } else {
    console.log('');
  }
  process.exit(0);
}

const item = ITEMS[which];
const found = text.match(item.match);
if (!found) {
  console.error(`Could not find the "${which}" item in docs/RELEASE-CHECKLIST.md. It has been reworded or removed; nothing was changed.`);
  process.exit(2);
}

if (undo) {
  const line = found[2].replace(/ — signed off by [^—]*$/, '');
  writeFileSync(FILE, text.replace(item.match, `- [ ] ${line}`));
  console.log(`Taken back: "${line.split(' — ')[0]}". Commit docs/RELEASE-CHECKLIST.md to record it.`);
  process.exit(0);
}

/*
 * A tick at another commit is not "already signed off": it is a sign-off on different code, and
 * the proof says so. Saying it again used to need `undo` first, and `undo` dirties the tree, so
 * the `push` that followed was refused for the very edit that `undo` had made -- a loop a person
 * could only leave by committing an untick with a message that said the opposite (2026-09-30,
 * twice). Now `push` re-stamps a stale tick, and only a tick at HEAD is "already".
 */
const stampedAt = found[2].match(/ — signed off by [^—]* at ([0-9a-f]{7,40})\s*$/)?.[1] ?? null;
if (found[1] === 'x' && stampedAt && head.startsWith(stampedAt.slice(0, 7))) {
  console.log(`Already signed off at ${head}, which is HEAD: ${found[2].split(' — ')[0]}`);
  process.exit(0);
}
if (found[1] === 'x') console.log(`The tick is from ${stampedAt ?? 'an unknown commit'}; HEAD is ${head}. Saying it again for HEAD.`);

if (item.guarded && openBefore.length) {
  console.error(`\nStage 2 is shut: ${openBefore.length} item(s) before the push are not green.\n`);
  for (const i of openBefore) {
    console.error(`  ${i.ticked ? '[x] TICKED, BUT ITS PROOF FAILS' : '[ ] not ticked'}  ${i.item}`);
    if (i.found) console.error(`        ${String(i.found).slice(0, 110)}`);
  }
  console.error(`\nEverything before the push has to be green first — the push is the claim that it all`);
  console.error(`checked out, and a sign-off given over an unfinished list says nothing. Finish those,`);
  console.error(`or edit the file by hand if you mean to go anyway, and then the list says so.\n`);
  process.exit(1);
}

const stamp = ` — signed off by ${WHO}, ${today}, at ${head}`;
writeFileSync(FILE, text.replace(item.match, `- [x] ${found[2].replace(/ — signed off by [^—]*$/, '')}${stamp}`));
console.log(`\n${WHO} ${item.says}. Ticked at ${head}, ${today}.`);
if (which === 'push') {
  console.log('\nThe list is complete. Nothing here pushes anything: that is still');
  console.log('  git push origin main\n');
} else {
  const left = openBefore.length;
  const pushCmd = process.platform === 'win32' ? '`node scripts/signoff.mjs push`' : '`npm run signoff -- push`';
  console.log(left ? `
${left} item(s) still open before the push can be signed off.
` : `
Nothing else is open. ${pushCmd} is available.
`);
}
console.log('Commit docs/RELEASE-CHECKLIST.md to record it.\n');
