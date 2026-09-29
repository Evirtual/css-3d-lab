/**
 * npm run check-remote
 *
 * The release-checklist lines that need a network, asked and written down: whether the remote has
 * anything main lacks, whether the Worker answers the site and refuses a stranger, whether the
 * build variable is set, and whether the Worker was deployed after its code last changed.
 *
 * They sat as "not evaluated here: needs git fetch / needs curl against the deployed Worker /
 * needs gh against GitHub", so each was true of the day somebody last typed the command. That is
 * the same shape as the build and qa lines: the work is a second's worth, nobody was doing it on a
 * schedule, and nothing recorded the answer.
 *
 * Networked on purpose, which is why it is a gate step and not a checklist proof: a proof runs on
 * every ledger build, several times a minute, and must stay local and free. This runs once a gate.
 * It writes docs/checks/remote.json and the proofs read that.
 *
 * Nothing here changes anything: a fetch, a preflight, and a list.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './model-sources.mjs';

const WORKER = process.env.VITE_CAPTURE_URL ?? 'https://css-3d-lab-capture.social-posts-pinata.workers.dev/capture';
const SITE_ORIGIN = 'https://css3dlab.edgarasneverdauskas.com';

const run = (cmd, args, ms = 30_000) =>
  execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: ms, stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** Each answers { ok, found } and never throws: a check that cannot reach something says so. */
const checks = {
  /* Has the remote anything this branch has not? Fetch first, or the answer is about whenever
     somebody last fetched -- which is the failure this whole file is about. */
  remoteAhead() {
    try {
      run('git', ['fetch', 'origin'], 60_000);
      const behind = run('git', ['rev-list', '--count', 'main..origin/main']);
      const at = run('git', ['rev-parse', '--short', 'origin/main']);
      return behind === '0'
        ? { ok: true, found: `origin/main is ${at} and main has all of it` }
        : { ok: false, found: `main is ${behind} commit(s) behind origin/main (${at}): fetch and merge before pushing` };
    } catch (e) { return { ok: null, found: `could not reach the remote: ${String(e?.message ?? e).split('\n')[0]}` }; }
  },

  /* The Worker has to answer the site and refuse everyone else. Both halves, because "it answers"
     alone is satisfied by a Worker that answers anybody. A preflight costs no export budget. */
  workerOrigins() {
    const code = (origin) => {
      try {
        return run('curl', ['-s', '-o', process.platform === 'win32' ? 'NUL' : '/dev/null', '-w', '%{http_code}',
          '--max-time', '20', '-X', 'OPTIONS', '-H', `Origin: ${origin}`, '-H', 'Access-Control-Request-Method: POST', WORKER]);
      } catch { return 'unreachable'; }
    };
    const mine = code(SITE_ORIGIN);
    const other = code('https://example.com');
    if (mine === 'unreachable' || other === 'unreachable') return { ok: null, found: `could not reach ${WORKER}` };
    return mine === '204' && other !== '204'
      ? { ok: true, found: `answers the site with ${mine} and refuses example.com with ${other}` }
      : { ok: false, found: `the site got ${mine} (wanted 204) and example.com got ${other} (wanted anything else)` };
  },

  /* The deploy workflow reads VITE_CAPTURE_URL from the repository. If it is not set, the built
     site ships with no endpoint and every export says "not configured yet". */
  workflowVariable() {
    for (const kind of ['variable', 'secret']) {
      try {
        const out = run('gh', [kind, 'list'], 30_000);
        if (/VITE_CAPTURE_URL/.test(out)) return { ok: true, found: `gh ${kind} list shows VITE_CAPTURE_URL` };
      } catch { /* try the other, then report */ }
    }
    return { ok: false, found: 'neither gh variable list nor gh secret list shows VITE_CAPTURE_URL (or gh could not ask)' };
  },

  /*
   * Is the Worker that is deployed the Worker that is in this tree?
   *
   * This was the one line a person re-checked by hand and re-dated in the checklist: on 2026-09-28
   * the note beside it said 2026-09-24 and had been wrong for four days. Cloudflare is asked when
   * the latest deployment was made, git is asked when the Worker's code last changed, and nothing
   * uncommitted may be sitting in those files.
   *
   * What it proves is the ORDER of two events: the deployment came after the last change. It does
   * not prove the deployed bytes are these bytes; that needs the Worker to report a hash of its
   * own source, which it does not do yet. The answer says so rather than claim more.
   */
  workerDeployed() {
    const PATHS = ['server/render.mjs', 'worker'];
    let list;
    try {
      const out = execFileSync('npx', ['wrangler', 'deployments', 'list', '--json'],
        { cwd: join(ROOT, 'worker'), encoding: 'utf8', timeout: 90_000, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
      list = JSON.parse(out.slice(out.indexOf('[')));
    } catch (e) { return { ok: null, found: `could not ask Cloudflare for the deployments (wrangler): ${String(e?.message ?? e).split('\n')[0]}` }; }
    const latest = list.map((d) => d.created_on).filter(Boolean).sort().pop();
    if (!latest) return { ok: false, found: 'Cloudflare lists no deployment of this Worker' };
    try {
      const changed = run('git', ['log', '-1', '--format=%cI%x1f%h', '--', ...PATHS]);
      const [when, hash] = changed.split('\x1f');
      const dirty = run('git', ['status', '--porcelain', '--', ...PATHS]).split('\n').filter(Boolean);
      const at = (iso) => new Date(iso).toISOString().slice(0, 16).replace('T', ' ');
      const base = { deployedAt: new Date(latest).toISOString(), changedAt: new Date(when).toISOString(), changedIn: hash };
      if (dirty.length) return { ...base, ok: false, found: `${dirty.length} file(s) of the Worker are changed and not committed (${dirty[0].slice(3)}), so what is deployed cannot be this code` };
      return Date.parse(latest) >= Date.parse(when)
        ? { ...base, ok: true, found: `deployed ${at(latest)}Z, after the last change to its code (${hash}, ${at(when)}Z). This is the order of the two, not a comparison of what is deployed` }
        : { ...base, ok: false, found: `its code changed at ${at(when)}Z (${hash}), after the latest deployment at ${at(latest)}Z: deploy it from worker/` };
    } catch (e) { return { ok: null, found: `could not read when the Worker's code last changed: ${String(e?.message ?? e).split('\n')[0]}` }; }
  },
};

const out = { note: 'Written by scripts/check-remote.mjs. The checklist lines that need a network.', at: new Date().toISOString(), worker: WORKER, checks: {} };
let bad = 0;
for (const [key, fn] of Object.entries(checks)) {
  const r = fn();
  out.checks[key] = r;
  const mark = r.ok === true ? 'holds' : r.ok === false ? 'FAILS' : 'could not ask';
  console.log(`${mark.padEnd(14)} ${key.padEnd(16)} ${r.found}`);
  if (r.ok === false) bad++;
}
try { writeFileSync(join(ROOT, 'docs', 'checks', 'remote.json'), `${JSON.stringify(out, null, 2)}\n`); }
catch (e) { console.log(`(could not write docs/checks/remote.json: ${String(e?.message ?? e).split('\n')[0]})`); }

console.log('');
console.log(bad ? `check-remote: ${bad} of ${Object.keys(checks).length} do not hold.` : `check-remote: all ${Object.keys(checks).length} hold.`);
process.exit(bad ? 1 : 0);
