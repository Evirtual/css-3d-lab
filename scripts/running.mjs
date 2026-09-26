/**
 * The one answer to "is a check running, and how far has it got".
 *
 * There were three. scripts/ledger.mjs worked it out for the page, scripts/ledger-server.mjs worked
 * it out again for the buttons, and scripts/now.mjs worked it out a third way from the process
 * list. On 2026-09-26 the run bar said "Nothing running" directly above the board's own "media
 * running 58/135", because two of those three had been written separately and did not agree. A page
 * whose whole job is to be believed cannot hold two answers to the same question.
 *
 * WHAT COUNTS AS EVIDENCE
 *
 * A check writes `running: true` into its own result file and clears it when it finishes. That flag
 * alone is a claim, not a fact: a check that is killed never gets to clear it, and the file then
 * says "running" for ever. It also records the pid that wrote it, so the claim can be checked
 * against the machine -- and that is what makes this a measurement rather than a report.
 *
 * Three answers, and they are not the same answer:
 *   { alive: true }   the file says running and that process is there
 *   { alive: false }  the file says running and the process has gone: a crashed run, not a live one
 *   null              the file does not say running
 *
 * scripts/now.mjs looks at the process list instead, which is different evidence: it sees a check
 * whose file has not been written yet. That is a second opinion on purpose, not a third answer.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Whether a process id is on this machine.
 *
 * Signal 0 asks without sending anything. ESRCH means it has gone; EPERM means it exists and
 * belongs to somebody else, which is still "it exists". No pid recorded is no evidence either way,
 * and no evidence is not a run.
 */
export function alive(pid) {
  if (!Number.isInteger(pid)) return null;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

/** One check's run, from an already-read result file. */
export function runOf(file) {
  if (!file?.running) return null;
  const p = file.progress ?? {};
  return { ...p, alive: alive(p.pid) };
}

/**
 * Every check's run, read fresh from docs/checks/.
 *
 * For callers that do not already hold the parsed files. `notes` collects the cases worth saying
 * out loud -- a file claiming a run whose process has gone -- so the page can show that rather than
 * quietly treating it as nothing.
 */
export function runsNow(root, notes = []) {
  const dir = join(root, 'docs', 'checks');
  const out = {};
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const key = f.replace(/\.json$/, '');
    let j;
    try { j = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { continue; }
    const run = runOf(j);
    out[key] = run;
    if (run && run.alive === false) {
      notes.push(`docs/checks/${key}.json says run ${run.runId ?? '(no id)'} is still going, but its process ${run.pid} has gone`);
    }
  }
  return out;
}

/** The one check actually running now, or null. A crashed claim is not one. */
export function runningCheck(root) {
  for (const [key, run] of Object.entries(runsNow(root))) {
    if (run && run.alive) return { check: key, done: run.done ?? null, total: run.total ?? null, pid: run.pid ?? null };
  }
  return null;
}
