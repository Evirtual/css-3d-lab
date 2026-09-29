/**
 * What stands between this code and a push, read once and answered the same way to everyone.
 *
 * Shared by scripts/signoff.mjs, which refuses to TICK the push while anything is open, and
 * scripts/pre-push.mjs, which refuses the PUSH. They have to agree: on 2026-09-29 the board said
 * the push was shut, signoff said twenty-four items were open, and `git push origin main` went
 * through twice, because nothing that could say no was standing where the push happens. One
 * reading of the list, so the thing that blocks and the thing that explains cannot drift apart.
 *
 * It only reads: docs/RELEASE-CHECKLIST.md for what a person ticked, and docs/ledger.json for what
 * a run proved. Not run on its own.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const AFTER = 'After the push';
export const MINE = /^The person publishing has /;
/** An item's name: its line up to the first dash, which is where the proof and the stamps begin. */
export const nameOf = (text) => text.split(' — ')[0];

export function readPushGate(ROOT) {
  const FILE = join(ROOT, 'docs', 'RELEASE-CHECKLIST.md');
  const text = readFileSync(FILE, 'utf8');

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

  /**
   * NOT GREEN is more than NOT TICKED, and the first version of this guard missed the difference.
   *
   * An item can be ticked in the file while the ledger's own proof contradicts it — that is the
   * whole reason the proofs exist, and it caught a release snapshot describing code that no longer
   * existed. A guard that counts unticked boxes says "nothing else is open" over exactly that, which
   * is what it did on 2026-09-25: it signed off the article while two proofs were failing.
   *
   * So it reads docs/ledger.json too, and treats an item as green only when it is ticked AND no
   * proof run there disagrees. If the ledger cannot be read, it says so rather than assuming green.
   */
  const failing = new Map();
  const proven = new Set();
  let ledgerRead = null;
  let ledger = null;
  try {
    ledger = JSON.parse(readFileSync(join(ROOT, 'docs', 'ledger.json'), 'utf8'));
    const items = ledger?.readiness?.checklist?.items ?? [];
    if (!items.length) ledgerRead = 'docs/ledger.json holds no checklist items';
    for (const i of items) if (i.state === 'conflict' || i.state === 'stale' || i.result === 'false') failing.set(i.item, i.found ?? 'its proof disagrees');
    for (const i of items) if (i.result === 'true' && !failing.has(i.item)) proven.add(i.item);
  } catch (e) { ledgerRead = `docs/ledger.json could not be read (${e.message.split('\n')[0]})`; }

  /*
   * PROVEN COUNTS AS GREEN, EVEN WITH NO x IN THE FILE.
   *
   * The proofs run on every board build and write nothing back to the markdown -- deliberately, or
   * the file would churn several times a minute. So an item can be proven true here and still sit as
   * "[ ]" in docs/RELEASE-CHECKLIST.md for ever. This guard required the x, so on 2026-09-28 it held
   * the push open on fourteen items, ten of which the ledger had just proven: TypeScript, the build,
   * QA, the snippets, the preview, the comparison, the snapshot, 4K, the file names and the docs.
   *
   * Two accounts of one list again, which is the same fault the board had that morning. The file is
   * where a PERSON writes what they did; the ledger is where a RUN writes what it found. An item is
   * green when either says so and neither proof disagrees.
   */
  const isProven = (i) => proven.has(nameOf(i.text)) || [...proven].some((k) => i.text.startsWith(k));
  const whyFailing = (i) => failing.get(nameOf(i.text)) ?? [...failing.entries()].find(([k]) => i.text.startsWith(k))?.[1] ?? null;
  const isFailing = (i) => failing.has(nameOf(i.text)) || [...failing.keys()].some((k) => i.text.startsWith(k));
  const notGreen = (i) => (!i.done && !isProven(i)) || isFailing(i);

  /*
   * THE BOARD'S OWN COUNT, by the board's own rule, so a refusal can be said in the board's words.
   *
   * The checklist dialog shows three stages -- Before the push, Yours, After the push -- and keeps
   * Yours behind a padlock until the first is green. That padlock is what a person sees, so it is
   * what a refusal has to agree with. The rule is clDone in src/ledger/main.ts, over the same
   * items; it is repeated here because that file is a page and cannot be imported, and the two are
   * compared on every push (scripts/pre-push.mjs) so that a drift is reported rather than lived with.
   */
  const boardDone = (x) => x.done && x.state !== 'conflict' && x.state !== 'stale' && x.result !== 'false';
  const phaseOf = (x) => (x.group === 'Yours' ? 'yours' : x.group === AFTER ? 'after' : 'before');
  const stages = { before: { done: 0, total: 0 }, yours: { done: 0, total: 0 }, after: { done: 0, total: 0 } };
  for (const x of ledger?.readiness?.checklist?.items ?? []) {
    const s = stages[phaseOf(x)];
    s.total++;
    if (boardDone(x)) s.done++;
  }

  return {
    FILE, text, all, failing, ledgerRead, stages,
    /** which commit and when the ledger that was read describes, so a reader can tell how old it is */
    ledgerHead: ledger?.head ?? null,
    ledgerAt: ledger?.generatedAt ?? null,
    whyFailing, notGreen,
    openOthers: all.filter((i) => notGreen(i) && !MINE.test(i.text) && i.section !== AFTER),
    openAfter: all.filter((i) => !i.done && i.section === AFTER),
    mine: all.filter((i) => MINE.test(i.text)),
  };
}
