/**
 * The two items on the release checklist that wait for a person, ticked from the command line.
 *
 *   npm run signoff                 what is waiting, and whether anything else is still open
 *   npm run signoff -- article      "I have read the ledger article and it is ready"
 *   npm run signoff -- push         "Push it"
 *   npm run signoff -- undo <which> take it back
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
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
  article: { match: /^- \[( |x)\] (The person publishing has read the release article[^\n]*)$/m, says: 'read the article and called it ready' },
  push: { match: /^- \[( |x)\] (The person publishing has said to push[^\n]*)$/m, says: 'said to push', guarded: true },
};
const MINE = /^The person publishing has /;

const text = readFileSync(FILE, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const today = new Date().toISOString().slice(0, 10);

/**
 * Every item, whether it is ticked, and which `## ` section it sits under.
 *
 * The section matters for one reason: "After the push" holds items that CANNOT be true before the
 * push -- the deploy having succeeded, recording working on the live site. A guard that counted
 * those as blockers would refuse the push sign-off for ever, which the first run of this did.
 */
const all = [];
let section = null;
for (const line of text.split(/\r?\n/)) {
  const h = line.match(/^## (.+)$/);
  if (h) { section = h[1].trim(); continue; }
  const m = line.match(/^- \[( |x)\] (.+)$/);
  if (m) all.push({ done: m[1] === 'x', text: m[2], section });
}
const AFTER = 'After the push';
const openOthers = all.filter((i) => !i.done && !MINE.test(i.text) && i.section !== AFTER);
const openAfter = all.filter((i) => !i.done && i.section === AFTER);

if (!which || !ITEMS[which]) {
  const waiting = all.filter((i) => !i.done && MINE.test(i.text));
  console.log(`\nThe release checklist: ${all.filter((i) => i.done).length} of ${all.length} ticked.\n`);
  console.log(waiting.length ? 'Waiting for you:' : 'Nothing is waiting for you.');
  for (const i of waiting) console.log(`  [ ] ${i.text.split(' — ')[0]}`);
  if (openOthers.length) {
    console.log(`\nStill open, and not yours (${openOthers.length}):`);
    for (const i of openOthers) console.log(`  [ ] ${i.text.split(' — ')[0]}`);
  } else {
    console.log('\nEverything else that can be done before the push is ticked.');
  }
  if (openAfter.length) {
    console.log(`\nOnly answerable after the push (${openAfter.length}), so they do not block it:`);
    for (const i of openAfter) console.log(`  [ ] ${i.text.split(' — ')[0]}`);
  }
  console.log(`\n  npm run signoff -- article      after reading it`);
  console.log(`  npm run signoff -- push         only once nothing else is open`);
  console.log(`  npm run signoff -- undo <which> take one back\n`);
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

if (found[1] === 'x') {
  console.log(`Already signed off: ${found[2].split(' — ')[0]}`);
  process.exit(0);
}

if (item.guarded && openOthers.length) {
  console.error(`\nNot signing off the push: ${openOthers.length} item(s) are still open.\n`);
  for (const i of openOthers) console.error(`  [ ] ${i.text.split(' — ')[0]}`);
  console.error(`\nThe push is the claim that everything above it checked out. Finish those first,`);
  console.error(`or edit the file by hand if you mean to push with them open — but then the list says so.\n`);
  process.exit(1);
}

const stamp = ` — signed off by ${WHO}, ${today}, at ${head}`;
writeFileSync(FILE, text.replace(item.match, `- [x] ${found[2]}${stamp}`));
console.log(`\n${WHO} ${item.says}. Ticked at ${head}, ${today}.`);
if (which === 'push') {
  console.log('\nThe list is complete. Nothing here pushes anything: that is still');
  console.log('  git push origin main\n');
} else {
  const left = openOthers.length;
  console.log(left ? `\n${left} item(s) still open before the push can be signed off.\n` : '\nNothing else is open. `npm run signoff -- push` is available.\n');
}
console.log('Commit docs/RELEASE-CHECKLIST.md to record it.\n');
