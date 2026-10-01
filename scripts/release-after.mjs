/**
 * After the push: the deploy, then the site as served.
 *
 *   node scripts/release-after.mjs          the same as Run → "After the push" on the board
 *
 * Refuses unless HEAD is on origin/main: nothing has been pushed, so there is nothing to wait
 * for. Then waits for the GitHub Pages workflow of that commit (gh), builds the site here the way
 * the deploy builds it (VITE_CAPTURE_URL from the environment, or the Worker this project
 * deploys, as scripts/verify.mjs does), so scripts/check-live.mjs compares the served pages with
 * the same build, runs that check, rebuilds the ledger and prints the lines after the push. The
 * live check retries a fetch three times on its own; this waits half a minute after the workflow
 * ends, because Pages serves the new build a little after the workflow says it has.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const say = (s) => console.log(`${new Date().toISOString().slice(11, 19)}  ${s}`);
const git = (...a) => execFileSync('git', ['-c', 'core.quotepath=off', ...a], { cwd: ROOT, encoding: 'utf8' }).trim();
const stop = (why) => { say(`STOPPED: ${why}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gh = (args) => {
  const r = spawnSync('gh', args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || `gh exited ${r.status}`).trim().split('\n')[0]);
  return r.stdout;
};

const head = git('rev-parse', 'HEAD');
try { git('fetch', '-q', 'origin'); } catch (e) { stop(`could not fetch origin: ${String(e.message).split('\n')[0]}`); }
if (git('rev-parse', 'origin/main') !== head) stop(`HEAD (${head.slice(0, 7)}) is not origin/main (${git('rev-parse', '--short', 'origin/main')}): push first`);

say(`waiting for the deploy of ${head.slice(0, 7)}`);
let runId = null;
let conclusion = null;
for (let i = 0; i < 60 && !conclusion; i++) {
  let runs;
  try { runs = JSON.parse(gh(['run', 'list', '--limit', '10', '--json', 'databaseId,headSha,status,conclusion'])); } catch (e) { stop(`gh could not list the workflow runs: ${e.message}`); }
  const mine = runs.find((r) => r.headSha === head);
  if (mine) { runId = mine.databaseId; if (mine.status === 'completed') conclusion = mine.conclusion; }
  else if (i >= 6) stop(`no workflow run for ${head.slice(0, 7)} after two minutes: did the push land?`);
  if (!conclusion) await sleep(20_000);
}
if (!conclusion) stop(`the deploy (run ${runId}) is still going after twenty minutes`);
say(`deploy ${runId}: ${conclusion}`);
if (conclusion !== 'success') stop(`the deploy did not succeed: gh run view ${runId} --log-failed`);

const CAPTURE_URL = process.env.VITE_CAPTURE_URL || 'https://css-3d-lab-capture.social-posts-pinata.workers.dev/capture';
say(`building here the way the deploy did (endpoint ${CAPTURE_URL})`);
// NODE_ENV pinned: started from the board, this inherits "development" (the board runs a Vite dev
// server to build the ledger), and a build that inherits it is not the deploy's build
const built = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, FORCE_COLOR: '0', NODE_ENV: 'production', VITE_CAPTURE_URL: CAPTURE_URL } });
if (built.status !== 0) stop('the build failed here: the live check would compare the site with nothing');

await sleep(30_000);
say('the site as served');
const live = spawnSync(process.execPath, ['scripts/check-live.mjs'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, FORCE_COLOR: '0' } });
spawnSync(process.execPath, ['scripts/ledger.mjs'], { cwd: ROOT, stdio: 'ignore' });
let after = null;
try { after = JSON.parse(readFileSync(join(ROOT, 'docs', 'ledger.json'), 'utf8')).readiness.checklist.verdict.stages.after; } catch { /* said below */ }
say(`after the push: ${after ? `${after.done}/${after.total}` : 'the ledger could not be read'}`);
for (const o of after?.open ?? []) say(`  open: ${String(o.item).slice(0, 70)} -- ${String(o.found).slice(0, 160)}`);
if (live.status !== 0 || !after || after.done !== after.total) stop('the site as served does not hold: the lines above say what');
say('the site as served is the site that was built');
