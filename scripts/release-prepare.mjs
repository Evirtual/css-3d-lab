/**
 * Prepare the release: everything the push is waiting for that a machine can do, then stop at the
 * sign-off, which is a person's.
 *
 *   node scripts/release-prepare.mjs        the same as Run → "Prepare the release" on the board
 *
 * It asks the board what the push needs -- the one answer the Run dialog shows under "What the
 * push needs" (scripts/jobs.mjs, whatIsNeeded, over the ledger's own verdict), kept in one place
 * rather than copied here -- and then does it: the gate steps that are not current, through
 * scripts/verify.mjs --step (a check with a result per model, over only the models whose own
 * result is not a fresh one; see ONLY THE MODELS THAT NEED IT below); the jobs that close a line (both renderers, the export matrix, the
 * snapshot); the two records a run regenerates, committed (docs/release-snapshot.json,
 * src/sitemap-dates.json); the ledger rebuilt; and asks again, up to three rounds. It stops at the
 * first thing that does not hold and says what, in the words of the run that found it.
 *
 * It never ticks the sign-off and never pushes. What it leaves open it names: the sign-off
 * (npm run signoff -- push, then commit docs/RELEASE-CHECKLIST.md last and git push), a document
 * to read against the change, a file of yours to commit. Those are a person's, and the point of
 * the list is that a person says them.
 *
 * Needs the board (npm run board). Without it there is nobody to ask, and it says so rather than
 * guessing. On 2026-09-30 this sequence was run twice by hand to take two releases to 51/51, and
 * the second stopped at 43/45 over a regenerated src/sitemap-dates.json nobody had committed.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JOB } from './jobs.mjs';
import { REGISTRY } from './checks-registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = `http://127.0.0.1:${process.env.C3D_BOARD_PORT || 5178}/api`;
const ROUNDS = 3;
/** The records a run regenerates: committed here, with a message that says so. Anything else is yours. */
const RECORDS = ['docs/release-snapshot.json', 'src/sitemap-dates.json'];

const say = (s) => console.log(`${new Date().toISOString().slice(11, 19)}  ${s}`);
const git = (...a) => execFileSync('git', ['-c', 'core.quotepath=off', ...a], { cwd: ROOT, encoding: 'utf8' }).trim();
const run = (argv) => spawnSync(process.execPath, argv, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, FORCE_COLOR: '0' } }).status ?? 1;
const stop = (why) => { say(`STOPPED: ${why}`); process.exit(1); };

/*
 * ONLY THE MODELS THAT NEED IT.
 *
 * A check with a result per model was run here over all 167 the moment one of them went stale:
 * the board names the STEP, and `verify --step` runs a step over every model. So fixing one model
 * cost the whole gate, six and a half hours, to re-earn 166 verdicts nothing had touched
 * (2026-10-13, a hover fix to the sticky notes). Each of those verdicts carries its own
 * fingerprint (scripts/fingerprint.mjs: the model's own sources and the files that draw it), the
 * ledger already says which ones still stand, and the checklist reads them model by model
 * (checklist-proofs.mjs, recorded()). So such a step runs over the models whose result is stale,
 * failed or missing, and no others. A change to a file every model is drawn by, or to a check,
 * stales every model's result, and then every model runs, as it should.
 *
 * The steps with no per-model record (qa, snippets, preview, compare) still run over everything:
 * their line is proved by the step's own fingerprint, which says nothing about which models a
 * run covered, so a partial run would be a pass for models it never looked at.
 */
const PER_MODEL = new Set(REGISTRY.filter((c) => c.scope === 'model').map((c) => c.key));
/** The models with no fresh result for `key` in the ledger (a flag on current code is a result), or null if it cannot be read. */
function notCurrent(key) {
  let models;
  try { models = JSON.parse(readFileSync(join(ROOT, 'docs', 'ledger.json'), 'utf8')).models; } catch { return null; }
  if (!Array.isArray(models) || !models.length) return null;
  return models.filter((m) => { const c = m.checks?.[key]; return !c || c.stale || !['pass', 'flagged'].includes(c.status); }).map((m) => m.id);
}

async function needed() {
  let body;
  try { body = await (await fetch(`${API}/jobs`)).json(); } catch { return null; }
  return body.needed ?? null;
}
function verdict() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'docs', 'ledger.json'), 'utf8')).readiness.checklist.verdict.stages.before;
  } catch { return null; }
}

const first = await needed();
if (!first) stop(`the board is not answering at ${API}: start it (npm run board) and run this again, or press "Prepare the release" there`);
// The ledger first, then the question. A board started a moment ago answered from the ledger it
// had, written before the latest commits, and on 2026-10-06 this said "nothing is open" and 45/45
// in three seconds while the sign-off, reading the same commits fresh, still had three lines open
// -- one of them a comparison on record as disagreeing.
say('rebuilding the ledger');
run(['scripts/ledger.mjs']);
await new Promise((r) => setTimeout(r, 3000));

for (let round = 1; round <= ROUNDS; round++) {
  const n = await needed();
  if (!n) stop('the board stopped answering');
  const jobs = n.jobs.filter((j) => j !== 'live'); // the live check is after the push, not before it
  if (!n.open) { say('nothing is open before the push'); break; }
  if (!n.steps.length && !jobs.length) {
    say(`round ${round}: ${n.open} line(s) open, and no run closes them`);
    break;
  }
  say(`round ${round}: ${n.open} line(s) open; to run: ${[...n.steps.map((s) => `step ${s}`), ...jobs.map((j) => `job ${j}`)].join(', ')} (about ${n.minutes} min)`);
  const perModel = n.steps.filter((k) => PER_MODEL.has(k));
  const whole = n.steps.filter((k) => !PER_MODEL.has(k));
  if (perModel.length) {
    const lists = perModel.map((k) => notCurrent(k));
    const ids = lists.includes(null) ? null : [...new Set(lists.flat())];
    if (ids && !ids.length) say(`${perModel.join(', ')}: every model has a fresh result in the ledger, so there is nothing of them to run`);
    else {
      say(ids ? `verify --step ${perModel.join(',')} over the ${ids.length} model(s) without a fresh result: ${ids.length > 12 ? `${ids.slice(0, 12).join(' ')} and ${ids.length - 12} more` : ids.join(' ')}`
        : `verify --step ${perModel.join(',')} over every model (the ledger could not be read to say which need it)`);
      if (run(['scripts/verify.mjs', '--step', perModel.join(','), ...(ids ?? [])]) !== 0) stop('a gate step did not hold: the lines marked FAILS above say which, and the board holds the detail per model');
    }
  }
  if (whole.length) {
    say(`verify --step ${whole.join(',')}`);
    if (run(['scripts/verify.mjs', '--step', whole.join(',')]) !== 0) stop('a gate step did not hold: the lines marked FAILS above say which, and the board holds the detail per model');
  }
  for (const key of jobs) {
    const job = JOB.get(key);
    if (!job) stop(`the board asked for a job this list does not have: ${key}`);
    say(`job ${key}: ${job.name}`);
    if (run(job.argv) !== 0) stop(`${job.name} did not hold: its output above says why`);
  }
  // the records a run regenerates, committed; anything else uncommitted is a person's and stops this
  for (const file of RECORDS) {
    if (!git('status', '--porcelain', '--', file)) continue;
    git('add', '--', file);
    git('commit', '-q', '-m', file === RECORDS[0] ? 'The release snapshot, at the commit going out' : `${file}, regenerated by the build`);
    say(`committed ${file} (${git('rev-parse', '--short', 'HEAD')})`);
  }
  const dirty = git('status', '--porcelain').split('\n').filter(Boolean);
  if (dirty.length) stop(`uncommitted changes that are not a record a run regenerates: ${dirty.slice(0, 5).join('; ')}. Commit them, or leave them out and name them in the push notes`);
  say('rebuilding the ledger');
  run(['scripts/ledger.mjs']);
  await new Promise((r) => setTimeout(r, 3000));
}

const last = await needed();
const before = verdict();
say(`stage 1: ${before ? `${before.done}/${before.total}` : 'the ledger could not be read'}`);
for (const o of last?.other ?? []) say(`  ${o.kind === 'person' ? 'yours' : (o.kind ?? 'open')}: ${o.what}  (${String(o.item).slice(0, 70)})`);
const left = (last?.steps?.length ?? 0) + (last?.jobs?.filter((j) => j !== 'live').length ?? 0);
if (left) stop(`${left} run(s) are still needed after ${ROUNDS} rounds: ${[...(last.steps ?? []), ...(last.jobs ?? [])].join(', ')}`);
say(before && before.done === before.total
  ? 'everything before the push holds. What is left is yours: npm run signoff -- push, commit docs/RELEASE-CHECKLIST.md last, git push; then "After the push".'
  : 'nothing more a run can do; the lines above are a person\'s');
