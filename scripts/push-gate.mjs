/**
 * What stands between this code and a push, decided once and read the same way by everyone.
 *
 * ONE DECISION. scripts/ledger.mjs calls judgeItems() when it builds docs/ledger.json and writes
 * the answer into it. The board's page draws its stages and its padlock from that answer,
 * scripts/signoff.mjs refuses the tick by it, and scripts/pre-push.mjs refuses the push by it.
 *
 * It was three decisions. The page had its own rule in src/ledger/main.ts, this file had another
 * read from the markdown, and the hook compared the two on every push to catch them drifting --
 * which is a guard against a fault that should not be possible. On 2026-09-29 the board said the
 * push was shut, signoff said twenty-four items were open, and `git push origin main` went through
 * twice, because nothing that could say no was standing where the push happens.
 *
 * Not run on its own. It reads docs/ledger.json, and docs/RELEASE-CHECKLIST.md for what a person
 * typed; it writes nothing.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const AFTER = 'After the push';
export const YOURS = 'Yours';
export const MINE = /^The person publishing has /;
/** An item's name: its line up to the first dash, which is where the proof and the stamps begin. */
export const nameOf = (text) => text.split(' — ')[0];
const stageOf = (x) => (x.group === YOURS ? 'yours' : x.group === AFTER ? 'after' : 'before');

/**
 * GREEN is more than ticked.
 *
 * An item can be ticked while its own proof contradicts it -- that is the whole reason the proofs
 * exist, and it caught a release snapshot describing code that no longer existed. And an item can
 * be proven with no tick at all: the proofs run on every build and write nothing back to the
 * markdown, or the file would churn several times a minute. So `done` has already been settled by
 * the ledger (a proof that passes ticks it, one that fails unticks it, one that could not run
 * leaves the person's tick standing), and green is that, with nothing contradicting or outdating
 * it.
 */
export const isGreen = (x) => Boolean(x.done) && x.state !== 'conflict' && x.state !== 'stale' && x.result !== 'false';

/**
 * The verdict on a list of items as scripts/ledger.mjs holds them.
 *
 * Three stages, in order, and a stage is shut until every stage before it is green: the push is
 * the claim that everything before it checked out, so a sign-off that could be given over an
 * unfinished list would be a sign-off that means nothing. "After the push" cannot be true before
 * the push, so it never blocks one.
 */
export function judgeItems(items) {
  const stages = { before: { done: 0, total: 0, open: [] }, yours: { done: 0, total: 0, open: [] }, after: { done: 0, total: 0, open: [] } };
  for (const x of items) {
    const s = stages[stageOf(x)];
    s.total++;
    if (isGreen(x)) s.done++;
    else s.open.push({ item: x.item, ticked: Boolean(x.claimed ?? x.done), found: x.found ?? null, line: x.line ?? null });
  }
  const beforeOpen = stages.before.open.length;
  const yoursOpen = stages.yours.open.length;
  stages.before.locked = false;
  stages.yours.locked = beforeOpen > 0;
  stages.after.locked = beforeOpen > 0 || yoursOpen > 0;
  const push = beforeOpen
    ? { allowed: false, why: `${beforeOpen} thing${beforeOpen === 1 ? '' : 's'} that must be true before a push ${beforeOpen === 1 ? 'is' : 'are'} not` }
    : yoursOpen
      ? { allowed: false, why: 'nobody has said to push this commit' }
      : { allowed: true, why: 'everything before the push is green, and the person publishing has said to push this commit' };
  return { stages, push };
}

/**
 * The verdict as the last build of the ledger wrote it, with the ticks a person typed beside it.
 *
 * `ledgerRead` says why when there is nothing to read: a caller must refuse rather than assume.
 * The ledger is not rebuilt here; scripts/pre-push.mjs and scripts/signoff.mjs rebuild it first,
 * because a verdict from before the last commit is a verdict on different code.
 */
export function readPushGate(ROOT) {
  const FILE = join(ROOT, 'docs', 'RELEASE-CHECKLIST.md');
  const text = readFileSync(FILE, 'utf8');
  // what a person typed, for "N of M ticked": the file is where a person writes what they did
  const ticked = { done: 0, total: 0 };
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^- \[( |x)\] /);
    if (m) { ticked.total++; if (m[1] === 'x') ticked.done++; }
  }

  let ledger = null;
  let ledgerRead = null;
  try { ledger = JSON.parse(readFileSync(join(ROOT, 'docs', 'ledger.json'), 'utf8')); }
  catch (e) { ledgerRead = `docs/ledger.json could not be read (${e.message.split('\n')[0]})`; }
  const items = ledger?.readiness?.checklist?.items ?? [];
  if (!ledgerRead && !items.length) ledgerRead = 'docs/ledger.json holds no checklist items';
  // the ledger's own verdict; judged here only when the ledger on disk predates the verdict
  const verdict = ledger?.readiness?.checklist?.verdict ?? judgeItems(items);

  return {
    FILE, text, ticked, ledgerRead,
    ledgerHead: ledger?.head ?? null,
    ledgerAt: ledger?.generatedAt ?? null,
    stages: verdict.stages,
    push: verdict.push,
    openBefore: verdict.stages.before.open,
    openYours: verdict.stages.yours.open,
    openAfter: verdict.stages.after.open,
  };
}
