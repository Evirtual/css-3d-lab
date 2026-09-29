/**
 * EVERY PROCESS THIS PROJECT HAS, IN ONE LIST, SO THE BOARD CAN OFFER THEM.
 *
 * The board could always run a CHECK -- a column, a row, one model -- because scripts/ledger-server.mjs
 * builds those from the registry. It could not run anything else. The gate, the live-site check, the
 * renderer comparison, the full export matrix: all of them existed only as something to type, so
 * every one of them needed somebody who knew the command. That is a tool that needs a person who has
 * read it, which is a different thing from a tool that works.
 *
 * So: one list. The board reads it, shows what each job answers and roughly what it costs, and
 * refuses the ones this machine cannot do rather than offering a button that would throw.
 *
 * WHAT EACH FIELD IS FOR
 *
 *   minutes  Roughly, on an idle machine, from the runs recorded on 2026-09-28/29. It is shown on
 *            the button because a person who presses "the gate" without being told it is four hours
 *            has been misled by the interface, not by the documentation.
 *   answers  Which release-checklist lines this can close. Not decoration: it is why you would press
 *            it, and it lets the board offer the right job beside a line that is open.
 *   needs    What has to be true. `browser` is the one that bites -- a policy that will not start
 *            Chromium takes most of this list with it -- and `network`/`quota` say when a job
 *            depends on somebody else's rate limit.
 *   safe     True when the job only reads. The board can offer these without ceremony; the others
 *            spend real time or somebody's budget and say so.
 */

export const JOBS = [
  {
    key: 'doctor', name: 'Check this machine', argv: ['scripts/doctor.mjs'],
    minutes: 1, needs: [], safe: true,
    answers: [],
    blurb: 'Can this machine run the checks, and if not, why not. Changes nothing.',
  },
  {
    key: 'gate', name: 'The gate — everything', argv: ['scripts/verify.mjs'],
    minutes: 270, needs: ['browser'], safe: false,
    answers: ['TypeScript is clean', 'The build is clean', 'QA on the built site', 'every per-model column'],
    blurb: 'All eighteen steps over all 135 models. Three steps are 80% of it: exports, stages, motion.',
  },
  {
    key: 'gate-checklist', name: 'Gate — just the checklist steps',
    argv: ['scripts/verify.mjs', '--step', 'qa,snippets,preview,compare,looks'],
    minutes: 17, needs: ['browser'], safe: false,
    answers: ['QA on the built site', 'Every standalone snippet', 'Editing a model never remounts', 'Snapshots match the screen', 'Every file the dialog hands out'],
    blurb: 'The five steps that feed the checklist, plus the build. Merged into the record; the other thirteen are left as they were.',
  },
  {
    key: 'gate-fast', name: 'Gate — the cheap ones', argv: ['scripts/verify.mjs', '--fast'],
    minutes: 45, needs: ['browser'], safe: false,
    answers: [],
    blurb: 'For after a change, not for a release.',
  },
  {
    key: 'live', name: 'The site as served', argv: ['scripts/check-live.mjs'],
    minutes: 3, needs: ['network'], safe: true,
    answers: ['The deploy succeeded', 'The site that is served is the site that was built', 'The share images are served', 'What is served passes the same SEO check'],
    blurb: 'Fetches the real site and asks six things of it. Only true after a deploy, and retires the moment you commit past it.',
  },
  {
    key: 'parity', name: 'Both renderers', argv: ['scripts/check-worker-parity.mjs', '--render', 'treemap', 'perfume', 'cube'],
    minutes: 3, needs: ['browser', 'network', 'quota'], safe: false,
    answers: ['Both renderers draw the same picture'],
    blurb: 'Draws the same scene here and on the Worker visitors export from. Spends the daily export budget, one per model.',
  },
  {
    key: 'matrix', name: 'Exports at every setting', argv: ['scripts/check-exports.mjs'],
    minutes: 40, needs: ['browser'], safe: false,
    answers: ['Recordings and snapshots match the dialog'],
    blurb: 'The eight-model sample at every shape, size, quality, format and slider stop. The gate only does the defaults.',
  },
  {
    key: 'looks', name: 'Open the export dialog and look', argv: ['scripts/three-looks.mjs'],
    minutes: 2, needs: ['browser'], safe: false,
    answers: ['Every file the dialog hands out is named after its model'],
    blurb: 'What only a person opening the dialog could answer, on one model.',
  },
  {
    key: 'compare', name: 'Snapshots against the screen', argv: ['scripts/compare-capture.mjs'],
    minutes: 6, needs: ['browser'], safe: false,
    answers: ['Snapshots match the screen'],
    blurb: 'Every model photographed on the page and captured through the dialog, compared pixel by pixel.',
  },
  {
    key: 'snippets', name: 'Every snippet runs', argv: ['scripts/snippet-check.mjs'],
    minutes: 4, needs: ['browser'], safe: false,
    answers: ['Every standalone snippet runs without a script error'],
    blurb: 'Each model opened as the standalone file the Copy button hands over.',
  },
  {
    key: 'remote', name: 'The remote and the Worker', argv: ['scripts/check-remote.mjs'],
    minutes: 1, needs: ['network'], safe: true,
    answers: ['The remote has nothing main lacks', 'The Worker accepts the site', 'The build variable is set'],
    blurb: 'Three networked questions in four seconds. A preflight, so it spends no export budget.',
  },
  {
    key: 'snapshot', name: 'Retake the release snapshot', argv: ['scripts/release-snapshot.mjs'],
    minutes: 1, needs: [], safe: false,
    answers: ['The release snapshot is the state of the commit being pushed'],
    blurb: 'Writes docs/release-snapshot.json from what the board currently holds. Changes a committed file.',
  },
];

export const JOB = new Map(JOBS.map((j) => [j.key, j]));

/**
 * Which jobs this machine cannot do, and in whose words.
 *
 * Reads what `npm run doctor` last wrote. No doctor run means no opinion -- and "nobody has asked
 * whether this machine can run anything" is a different answer from "everything is fine", so it
 * says the first rather than assuming the second.
 */
export function blockedBy(machine) {
  if (!machine) return { known: false, blocked: new Map() };
  const blocked = new Map();
  const row = (what) => (machine.rows ?? []).find((r) => r.what === what);
  const browser = row('browser');
  if (browser && browser.level === 'bad') {
    for (const j of JOBS) if (j.needs.includes('browser')) blocked.set(j.key, browser.why ?? 'no browser can start on this machine');
  }
  return { known: true, blocked };
}
