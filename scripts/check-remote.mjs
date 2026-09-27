/**
 * npm run check-remote
 *
 * The three release-checklist lines that need a network, asked and written down.
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
console.log(bad ? `check-remote: ${bad} of ${Object.keys(checks).length} do not hold.` : 'check-remote: all three hold.');
process.exit(bad ? 1 : 0);
