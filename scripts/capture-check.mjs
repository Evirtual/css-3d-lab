/**
 * Runs one of the model checks exactly as it is, shows its output as it comes, and keeps what it
 * said per model in docs/checks/<check>.json for scripts/ledger.mjs to read.
 *
 *   node scripts/capture-check.mjs models [args…]   scripts/check-models.mjs
 *   node scripts/capture-check.mjs stages [args…]   scripts/check-stages.mjs
 *   node scripts/capture-check.mjs motion [args…]   scripts/check-motion.mjs
 *   node scripts/capture-check.mjs exports [args…]  scripts/check-exports.mjs
 *   node scripts/capture-check.mjs media [args…]    scripts/check-media.mjs (on the built site)
 *   node scripts/capture-check.mjs access [args…]   scripts/check-access.mjs
 *   node scripts/capture-check.mjs boxsizing [args…] scripts/check-boxsizing.mjs
 *   node scripts/capture-check.mjs contrast [args…]  scripts/check-contrast.mjs
 *   (npm run capture -- models cube dice)
 *
 * Which checks there are is scripts/checks-registry.mjs, the one list the ledger and its page read
 * too. A new check is an entry there and a parser for its lines below.
 *
 * It does not change what a check does. It reads the lines the check already prints:
 *  - models: `FAILS <id> …` and `holds <id> …`. A pass only prints its line under --pass, so the
 *    wrapper adds --pass when it is missing. That flag changes what is printed, not what is judged.
 *  - stages: the table's rows (what was measured) and the "Disagreements" section (what failed).
 *    Under --json the check prints raw numbers and no verdict, so a --json run is passed through
 *    and not recorded: the wrapper will not re-derive a verdict the check did not give.
 *  - motion: `smooth <id>`, `LOOK AT <id>` and `BROKE <id>`, with the lines under them. The check
 *    itself says it only flags; "smooth" means no automatic flag, not that a human looked.
 *  - exports: a model's name on its own line starts its section, `    MISMATCH <check> <what>: …`
 *    lines belong to it, and the next name (or the closing tally) ends it. The check prints no
 *    per-model verdict, so the wrapper records two things from those lines. The model's STATUS is
 *    the verdict at the export dialog's DEFAULT settings (src/video.ts: image 1:1 at 1600 px PNG,
 *    video 9:16 at 1080p, a loop, fill 70%): "pass" when the run included those settings and none
 *    of its mismatches is about them, "fail" when one is, "error" when a tab could not be run, and
 *    "untested" when the run's arguments left the defaults out (--quick, SIZES, --only). Everything
 *    else it printed (other shapes, sizes, qualities, the slider) is kept apart as `matrix`: the
 *    settings matrix, which is run on a sample and is not part of the per-model verdict. The
 *    defaults are listed once, in scripts/export-defaults.mjs, for this and for check-exports
 *    --defaults, which makes exactly them: `npm run capture -- exports --defaults <ids>` is the
 *    per-model run, and its entries say `matrix.defaultsOnly`. The check's `      look: …` lines
 *    are readings it leaves for a person, not mismatches, so nothing here reads them and they
 *    never change a verdict; they are in the check's own report and its --json.
 *  - media: `pass <id> …` and `FAILS <id> …`, with the reasons indented under a failure.
 *  - access: the same as media.
 *  - boxsizing: the same lines again, and its closing `N/M models do not depend on outside CSS.`
 *    A pass only prints its line under --pass, so the wrapper adds it, as for models.
 *  - contrast: the same, with the failing texts indented under a failure, and its closing
 *    `N/M models have readable text on both stages.` The wrapper adds --pass here too.
 *  - seo (a site check: its entries are pages, not models): `FAIL <page> <rule>: <what>` (a page
 *    can have several; they are grouped by page), `pass <page>`, and `listed <page> <rules>`, a pass
 *    whose findings are listed rather than failed (WAIVED or OWN-TEXT), recorded with `listed: true`.
 *    Site-wide problems are keyed /sitemap.xml and /robots.txt. The wrapper adds --pass, so every
 *    page gets a line.
 *
 * Each model's entry is replaced only when this run reported it, so a run over two models keeps
 * the last known result of the other 133. Every entry carries the moment its line was printed, the
 * run it came from, HEAD at the time, the check's ruleVersion (scripts/checks-registry.mjs: a
 * result judged under an older rule is stale), and a fingerprint of the model's own source (see
 * model-sources.mjs) taken when the run started, so the ledger can tell a result that still
 * describes the code from one that is stale.
 *
 * While the run goes, the file is rewritten as each model's result arrives (at most every half
 * second), with `running: true` and `progress: { done, total, … }`, so the ledger and its page can
 * show a run in progress. `total` is what the check will go through, worked out from the same
 * arguments the check reads; `totalIsEstimate` says when it is inferred rather than named on the
 * command line. check-stages only gives its verdicts in the report at the end, so during its run
 * `done` counts the models it has started measuring and no result is written until the end.
 * The final write clears `running`. If the wrapper dies without it, `progress.pid` lets a reader
 * see the run is gone.
 *
 * SUB-STEPS. Each check declares what it covers, part by part, in scripts/checks-registry.mjs
 * (`steps`). STEP_READERS below reads each recorded result's own lines and says which of those
 * parts that result speaks to and how each came out: pass, fail, flag (motion's "look at this"),
 * listed (a finding check-seo lists rather than fails), or skipped with the reason it was skipped
 * ("the model has no hover target", "this run was --defaults"). A part no line speaks to is left
 * out, and counted "not recorded" — never as a pass. The counts are summed over every result in the
 * file, this run's and the ones it kept, and written under `steps`:
 *
 *   steps: { entries, updatedAt, totals: { <step>: { pass, fail, flag, listed, skip, skipped: {…} } },
 *            unattributed: { <step-less line>: n } }
 *
 * One block per check, not a row per model: the counts, and each skip reason once with its count.
 * `npm run capture -- <check> --steps` re-reads docs/checks/<check>.json and writes that block from
 * the lines already recorded there, without running the check: the same reading, no browser.
 *
 * While a run goes, `progress.steps` says what THIS run covers and what it leaves out, worked out
 * from the arguments the check was given, and `progress.step` is the latest sub-step its output has
 * named, with `progress.stepFrom` saying how that was known. A check that names none leaves both
 * null rather than guess, and the ledger says so.
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fingerprints, ROOT, workingSources } from './model-sources.mjs';
import { fingerprintsNow, recordFor } from './fingerprint.mjs';
import { DEFAULTS, DEFAULTS_TEXT, isDefault } from './export-defaults.mjs';
import { REGISTRY, pagesFor, ruleVersionOf, stepsOf } from './checks-registry.mjs';

const CHECKS = Object.fromEntries(REGISTRY.map((c) => [c.key, c.script]));
const [check, ...rest] = process.argv.slice(2);
// a registered check whose lines no parser below reads yet is refused further down, once the parsers exist
if (!CHECKS[check]) {
  console.error(`usage: node scripts/capture-check.mjs <${Object.keys(CHECKS).join('|')}> [args for the check]`);
  process.exit(2);
}
const args = [...rest];
if (['models', 'seo', 'boxsizing', 'contrast'].includes(check) && !args.includes('--pass')) args.push('--pass');
const record = !(check === 'stages' && args.includes('--json'));
if (!record) console.error('capture-check: --json prints numbers without a verdict, so this run is shown but not recorded.');

const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const startedAt = new Date().toISOString();
const runId = `${check}-${startedAt.replace(/[:.]/g, '-')}`;
const commit = git('rev-parse', '--short', 'HEAD');
const dirty = (git('status', '--porcelain', '--', 'src/models', 'src/styles/models') ?? '').split('\n').filter(Boolean).length;
const printsBefore = fingerprints();
// what each result judged, taken when the run starts (scripts/fingerprint.mjs): the ledger compares it with now
const judgedBefore = await fingerprintsNow().catch((e) => { console.error(`capture-check: no fingerprints recorded with this run, so the ledger will judge it by its commit: ${e.message.split('\n')[0]}`); return null; });

/* ---------- what each check's lines mean ---------- */
const results = {}; // id → { status, summary, detail[], at }
const warnings = [];
let summaryLine = null;
let pending = []; // indented lines printed before the result line they belong to (check-models)
let current = null; // the last model a result or header line named
const now = () => new Date().toISOString();

const parsers = {
  models(line) {
    const m = /^(FAILS|holds)\s+(\S+)\s*(.*)$/.exec(line);
    if (m) {
      const detail = [...pending];
      pending = [];
      results[m[2]] = { status: m[1] === 'holds' ? 'pass' : 'fail', summary: m[3], detail, at: now() };
      return;
    }
    if (/^\s+(page error|could not measure):/.test(line)) { pending.push(line.trim()); return; }
    if (/models hold the contract\.$/.test(line)) summaryLine = line.trim();
  },
  // stages: headers are timed as they arrive; the verdict is read from the report at the end
  stages(line) {
    if (/^[A-Za-z0-9_-]+$/.test(line) && known.has(line)) { current = line; results[line] = { status: 'unreported', summary: '', detail: [], at: now() }; }
    if (/^WARNING: src changed while this ran/.test(line)) warnings.push(line.trim());
    if (/models are the same everywhere/.test(line)) summaryLine = line.trim();
  },
  exports(line) {
    if (/^[A-Za-z0-9_-]+$/.test(line) && known.has(line)) {
      if (current && results[current]) { results[current].complete = true; finalizeExport(current); }
      current = line;
      results[line] = { status: 'unreported', summary: '', detail: [], at: now(), mismatches: [] };
      return;
    }
    const m = /^\s+MISMATCH (\S+) (.+?): (.*?)(?:\s+\[(.*)\])?$/.exec(line);
    if (m && current && results[current]) { results[current].mismatches.push({ check: m[1], what: m[2], detail: m[3], fault: m[4] ?? null }); results[current].at = now(); return; }
    if (/^\d+ mismatch(es)? in [\d.]+ min:$/.test(line)) { if (current && results[current]) { results[current].complete = true; finalizeExport(current); } summaryLine = line.trim(); }
  },
  media(line) {
    const m = /^(FAILS|pass)\s+(\S+)\s*(.*)$/.exec(line);
    if (m) {
      current = m[2];
      results[current] = { status: m[1] === 'pass' ? 'pass' : 'fail', summary: m[3], detail: [], at: now() };
      return;
    }
    if (/^ {10}\S/.test(line) && current && results[current]) { results[current].detail.push(line.trim()); return; }
    if (/share previews are right/.test(line)) summaryLine = line.trim();
  },
  // access: the same lines as media, `pass <id> …` and `FAILS <id> …` with the problems indented under a failure
  access(line) {
    const m = /^(FAILS|pass)\s+(\S+)\s*(.*)$/.exec(line);
    if (m) {
      current = m[2];
      results[current] = { status: m[1] === 'pass' ? 'pass' : 'fail', summary: m[3], detail: [], at: now() };
      return;
    }
    if (/^ {10}\S/.test(line) && current && results[current]) { results[current].detail.push(line.trim()); return; }
    if (/pass the access check/.test(line)) summaryLine = line.trim();
  },
  // boxsizing: `pass <id> …` and `FAILS <id> …` with the problems indented under a failure, as access
  boxsizing(line) {
    const m = /^(FAILS|pass)\s+(\S+)\s*(.*)$/.exec(line);
    if (m) {
      current = m[2];
      results[current] = { status: m[1] === 'pass' ? 'pass' : 'fail', summary: m[3], detail: [], at: now() };
      return;
    }
    if (/^ {10}\S/.test(line) && current && results[current]) { results[current].detail.push(line.trim()); return; }
    if (/models do not depend on outside CSS/.test(line)) summaryLine = line.trim();
  },
  // contrast: the same shape of lines, each failing text indented under its model
  contrast(line) {
    const m = /^(FAILS|pass)\s+(\S+)\s*(.*)$/.exec(line);
    if (m) {
      current = m[2];
      results[current] = { status: m[1] === 'pass' ? 'pass' : 'fail', summary: m[3], detail: [], at: now() };
      return;
    }
    if (/^ {10}\S/.test(line) && current && results[current]) { results[current].detail.push(line.trim()); return; }
    if (/models have readable text on both stages/.test(line)) summaryLine = line.trim();
  },
  seo(line) {
    const f = /^FAIL (\S+) (.*)$/.exec(line);
    if (f) {
      const r = results[f[1]]?.status === 'fail' ? results[f[1]] : (results[f[1]] = { status: 'fail', summary: '', detail: [], at: now() });
      r.detail.push(f[2]);
      r.summary = `${r.detail.length} problem(s)`;
      return;
    }
    const m = /^(pass|listed) (\S+)\s*(.*)$/.exec(line);
    if (m) {
      if (results[m[2]]?.status === 'fail') return;
      results[m[2]] = { status: 'pass', summary: m[1] === 'listed' ? `listed, not failed: ${m[3]}` : '', detail: [], at: now(), extra: { listed: m[1] === 'listed' } };
      return;
    }
    if (/pages pass the SEO check/.test(line)) summaryLine = line.trim();
  },
  motion(line) {
    const m = /^(smooth|LOOK AT|BROKE)\s+(\S+)\s*(.*)$/.exec(line);
    if (m) {
      current = m[2];
      results[current] = { status: { smooth: 'pass', 'LOOK AT': 'flagged', BROKE: 'broke' }[m[1]], summary: m[3], detail: [], at: now() };
      return;
    }
    if (/^ {10}\S/.test(line) && current && results[current]) { results[current].detail.push(line.trim()); return; }
    if (/pass the automatic check/.test(line)) summaryLine = line.trim();
  },
};
const known = new Set(Object.keys(printsBefore));
if (!parsers[check]) {
  console.error(`capture-check: ${check} is in scripts/checks-registry.mjs, but nothing here reads its output yet: add a parser for it.`);
  process.exit(2);
}

/**
 * The export dialog's defaults and which of the check's mismatch labels are about them, from
 * scripts/export-defaults.mjs: the list check-exports --defaults makes, so the two cannot drift apart.
 */
const EXPORT_DEFAULTS = DEFAULTS_TEXT;
const defaultsOnly = args.includes('--defaults');
/**
 * Whether this run's arguments made the default settings at all (check-exports' own rules for
 * --defaults, --quick, SIZES and --only). --defaults makes them and nothing else; --quick does not
 * make them (and check-exports refuses it with --defaults); an --only that leaves a check out
 * leaves that check's defaults out, with or without --defaults.
 */
function exportsCovered() {
  const why = [];
  if (args.includes('--quick')) why.push('--quick makes 800 px and 480p/2160p only');
  const sizes = (process.env.SIZES || '800,1600,3200').split(',').map(Number);
  if (!defaultsOnly && !sizes.includes(DEFAULTS.image.size)) why.push(`SIZES=${process.env.SIZES} leaves out ${DEFAULTS.image.size} px`);
  const at = args.indexOf('--only');
  if (at >= 0) { const only = new Set(String(args[at + 1]).split(',')); for (const k of ['dims', 'picture', 'drift', 'formats']) if (!only.has(k)) why.push(`--only leaves out ${k}`); }
  return { covered: why.length === 0, why };
}
function finishExports() {
  for (const [id, r] of Object.entries(results)) {
    if (!r.complete) { delete results[id]; continue; } // its section never finished: nothing to say about it
    finalizeExport(id);
  }
  return true;
}
/** One model's export verdict, made as soon as its section ends, so progress writes carry it. */
function finalizeExport(id) {
  const r = results[id];
  if (!r || r.status !== 'unreported') return;
  const cov = exportsCovered();
  {
    const def = r.mismatches.filter(isDefault);
    const harness = def.filter((x) => x.check === 'run');
    r.status = !cov.covered ? 'untested' : harness.length ? 'error' : def.length ? 'fail' : 'pass';
    r.summary = r.status === 'untested' ? `default settings not in this run: ${cov.why.join('; ')}`
      : r.status === 'error' ? `a tab could not be run: ${harness.map((x) => x.detail).join('; ')}`
      : r.status === 'fail' ? `${def.length} mismatch(es) at the default settings`
      : `the default picture and video match the canvas (${EXPORT_DEFAULTS.image}; ${EXPORT_DEFAULTS.video})`;
    r.detail = def.map((x) => `${x.check} ${x.what}: ${x.detail}${x.fault ? ` [${x.fault}]` : ''}`);
    r.extra = { defaults: EXPORT_DEFAULTS, matrix: defaultsOnly
      ? { defaultsOnly: true, note: 'this run was --defaults: it made the default settings and nothing else, so it says nothing about the rest of the settings matrix', args, sizes: null, mismatches: r.mismatches.filter((x) => !isDefault(x)) }
      : { note: 'every setting this run made, not only the defaults; the full matrix is run on a sample of models', args, sizes: process.env.SIZES || null, mismatches: r.mismatches.filter((x) => !isDefault(x)) } };
  }
}

/** check-stages' verdict, read from its report: every row of the table was measured; a row named under "Disagreements" failed. */
function finishStages(text) {
  const lines = text.split(/\r?\n/);
  const head = lines.findIndex((l) => /^model\s+card\s/.test(l));
  if (head < 0) return false;
  const measured = [];
  for (let i = head + 1; i < lines.length && lines[i].trim(); i++) measured.push(lines[i].split(/\s+/)[0]);
  const dis = lines.findIndex((l) => l.startsWith('Disagreements'));
  const failed = {};
  if (dis >= 0) {
    let who = null;
    for (let i = dis + 1; i < lines.length && lines[i].trim(); i++) {
      const top = /^ {2}(\S+)$/.exec(lines[i]);
      if (top) { who = top[1]; failed[who] = []; continue; }
      if (who && /^ {4}/.test(lines[i])) failed[who].push(lines[i].trim());
    }
  }
  const moves = lines.findIndex((l) => l.startsWith('The biggest movement'));
  const biggest = {};
  if (moves >= 0) for (let i = moves + 1; i < lines.length && lines[i].trim(); i++) {
    const m = /^ {2}(\S+)\s+(.*)$/.exec(lines[i]);
    if (m) biggest[m[1]] = m[2];
  }
  for (const id of measured) {
    const r = results[id] ?? { at: now() };
    results[id] = {
      status: failed[id] ? 'fail' : 'pass',
      summary: failed[id] ? `${failed[id].length} disagreement(s)` : 'same on every surface',
      detail: [...(failed[id] ?? []), ...(biggest[id] ? [`biggest movement: ${biggest[id]}`] : [])],
      at: r.at,
    };
  }
  for (const [id, r] of Object.entries(results)) if (r.status === 'unreported') delete results[id]; // started, never reached the report
  return true;
}

/* ---------- the sub-steps: what each recorded result says about the parts the check covers ---------- */
/**
 * A reader gets one recorded entry (status, summary, detail, and whatever the check's own parser
 * put beside them) and returns a map of the check's declared step keys to a state:
 *   'pass' | 'fail' | 'flag' | 'listed' | { skip: '<why it was not covered>' }
 * A step the entry says nothing about is left out of the map, and counted "not recorded".
 * `_unattributed` holds lines the reader could not place, so a failure is never quietly dropped.
 */
const SKIP = (why) => ({ skip: why });
/** Puts each line under the first step whose test matches; the rest come back as unattributed. */
function place(lines, rules) {
  const hit = new Set(), loose = [];
  for (const line of lines) {
    const r = rules.find(([, re]) => re.test(line));
    if (r) hit.add(r[0]); else loose.push(line);
  }
  return { hit, loose };
}
/** Every step of `keys` that no line hit passes; the ones that were hit take `bad`. */
const spread = (keys, hit, bad = 'fail') => Object.fromEntries(keys.map((k) => [k, hit.has(k) ? bad : 'pass']));

const STEP_READERS = {
  // check-models prints every violation on the model's own line, joined with "; ", so a part no
  // part of that line names was measured and held
  models(e) {
    if (e.status !== 'pass' && e.status !== 'fail') return {};
    const parts = String(e.summary ?? '').split('; ').map((s) => s.trim()).filter(Boolean);
    if (parts.some((p) => /^(never appeared|could not be judged|could not measure|page error)/.test(p))) return { _unattributed: parts };
    const own = parts.filter((p) => !/^(at rest|open):/.test(p));
    const { hit, loose } = place(own.filter((p) => e.status === 'fail'), [
      ['unit', /base unit --u/], ['ink', /no solid ink|nothing drawn|claims the canvas but leaves a gap/],
      ['size', /vmin tall, (over|under)/], ['width', /vmin wide, (over|under)/],
      ['centred', /off centre/], ['edges', /reaches the canvas edge|of a top corner/],
    ]);
    const out = spread(['unit', 'ink', 'size', 'width', 'centred', 'edges'], hit);
    const restBad = parts.some((p) => /^at rest:/.test(p));
    if (restBad) out.rest = 'fail';
    else if (/at rest /.test(e.summary ?? '')) out.rest = 'pass';
    const expands = /expands/.test(e.summary ?? '');
    if (parts.some((p) => /^open:/.test(p) || /marked expands, but nothing opens it/.test(p))) out.open = 'fail';
    else if (expands) out.open = 'pass';
    else out.open = SKIP('the model is not marked "expands": it has nothing to open');
    return { ...out, _unattributed: loose.filter((p) => !/vmin|with controls|sized by width|rests small by design/.test(p)) };
  },
  // check-stages compares every surface against the model page; a disagreement line starts with the
  // surface's own name, so a surface no line names agreed
  stages(e) {
    if (e.status !== 'pass' && e.status !== 'fail') return {};
    const lines = (e.detail ?? []).filter((l) => !/^biggest movement:/.test(l));
    if (lines.some((l) => /^the model page could not be measured/.test(l))) return { _unattributed: lines };
    const { hit, loose } = place(lines, [
      ['card', /^card:/], ['viewer', /^viewer:/], ['edit', /^edit-(live|reset|saved):/],
      ['large', /^large:/], ['fullscreen', /^fullscreen:/], ['shapes', /^(1:1|4:3|3:2|16:9|9:16):/], ['files', /^file(-400)?:/],
    ]);
    return { page: 'pass', ...spread(['card', 'viewer', 'edit', 'large', 'fullscreen', 'shapes', 'files'], hit), _unattributed: loose };
  },
  // check-motion says how many hover targets, controls and focus targets it found, and each flag
  // line starts with the action that raised it. A flag is not a failure: the ledger keeps it apart.
  motion(e) {
    if (e.status === 'broke') return {};
    const m = /^(\d+) hover, (\d+) controls, (\d+) focus/.exec(e.summary ?? '');
    if (!m) return {};
    const { hit, loose } = place(e.detail ?? [], [
      ['loop', /^loop\b/], ['hover', /^(hover|leave)\b/], ['controls', /^click\b/], ['focus', /^(focus|blur)\b/],
    ]);
    const had = { hover: +m[1], controls: +m[2], focus: +m[3] };
    const out = { loop: hit.has('loop') ? 'flag' : 'pass' };
    for (const k of ['hover', 'controls', 'focus']) {
      out[k] = had[k] ? (hit.has(k) ? 'flag' : 'pass')
        : SKIP(`the model has no ${k === 'controls' ? 'control' : `${k} target`}: there was nothing to film`);
    }
    return { ...out, _unattributed: loose };
  },
  // check-exports' mismatch lines read "<check> <what>: <detail>"; capture-check has already kept
  // only the ones about the default settings in `detail`, and the rest under `matrix`
  exports(e) {
    const def = ['image', 'video', 'drift', 'formats'];
    if (e.status === 'untested') return Object.fromEntries([...def, 'matrix'].map((k) => [k, SKIP(e.summary || 'this run did not make the default settings')]));
    if (e.status !== 'pass' && e.status !== 'fail') return {}; // 'error': a tab could not be run, so nothing was measured
    const { hit, loose } = place(e.detail ?? [], [
      ['drift', /^drift |(live|loop) frame 0:/], ['formats', /^formats /],
      ['image', /^\w+ image 1:1/], ['video', /^\w+ video 9:16 1080p/],
    ]);
    const out = spread(def, hit);
    const mx = e.matrix;
    out.matrix = !mx ? SKIP('this result recorded nothing about the settings matrix')
      : mx.defaultsOnly ? SKIP('this run was --defaults: it made the default settings and nothing else')
      : (mx.mismatches ?? []).length ? 'fail' : 'pass';
    return { ...out, _unattributed: loose };
  },
  // check-media prints each reason a share preview fails, indented under the model
  media(e) {
    if (e.status !== 'pass' && e.status !== 'fail') return {};
    const { hit, loose } = place(e.detail ?? [], [
      ['file', /^no image|is not a JPEG|^the image is \d+ × \d+|decodes as/],
      ['headline', /headline|text panel/],
      ['tags', /^(og:|twitter:|no model page at)|og:title|og:description|og:url|og:image|twitter:card|the page's <title>|meta description/],
      ['render', /did not render|had errors|has no scene|runs different model code|fonts were|not loaded|still running|unfinished at the shot|is not the page as it renders now|is not the model as it renders now/],
      ['frame', /blank|nothing drawn|no solid ink|leaves a gap|vmin tall in the image|vmin wide in the image|reaches \d+px into/],
    ]);
    return { ...spread(['file', 'tags', 'render', 'frame', 'headline'], hit), _unattributed: loose };
  },
  // check-access' pass line says what it found: whether the model moves, how many controls it named,
  // how many tab stops it reached. A failure names the part it broke.
  access(e) {
    if (e.status !== 'pass' && e.status !== 'fail') return {};
    const { hit, loose } = place(e.detail ?? [], [
      ['pause', /keeps moving while paused/], ['resume', /not after it was un-paused/],
      ['names', /has no accessible name|hidden from screen readers|could not be found in the DOM/],
      ['focus', /focus does not show/],
      ['keyboard', /Tab never reaches|answers the mouse|cannot be focused|give it tabindex|no :focus/],
    ]);
    const out = spread(['pause', 'resume', 'names', 'keyboard', 'focus'], hit);
    const m = /(stops when paused, starts again|still on its own, still when paused); (\d+)\/(\d+) named; (\d+) tab stop/.exec(e.summary ?? '');
    if (m) {
      if (!hit.has('resume') && m[1].startsWith('still on its own')) out.resume = SKIP('the model does not move on its own: there was nothing to start again');
      if (!hit.has('names') && m[3] === '0') out.names = SKIP('the model draws nothing a visitor can focus or operate');
      if (!+m[4]) {
        if (!hit.has('focus')) out.focus = SKIP('the model has no tab stop: there was no focus to show');
        if (!hit.has('keyboard')) out.keyboard = SKIP('the model has no tab stop and nothing a mouse can use');
      }
    }
    return { ...out, _unattributed: loose };
  },
  boxsizing(e) {
    if (e.status !== 'pass' && e.status !== 'fail') return {};
    if (/could not be checked/.test(e.summary ?? '')) return { _unattributed: [e.summary] };
    const { hit, loose } = place(e.detail ?? [], [
      ['mark', /boxSizing mark must read|marked content-box by design, but draws the same/],
      ['rest', /draws differently when the page makes every box border-box/],
    ]);
    const said = /\(([^)]*)\)/.exec(e.summary ?? '')?.[1] ?? '';
    const out = { mark: hit.has('mark') ? 'fail' : 'pass' };
    // the pass line prints both readings; a difference is reported as one number over both states
    out.rest = hit.has('rest') ? 'fail' : /rest /.test(said) || e.status === 'pass' ? 'pass' : 'fail';
    out.hover = hit.has('rest') ? 'fail' : /hover /.test(said) ? 'pass' : e.status === 'pass' ? 'pass' : 'fail';
    return { ...out, _unattributed: loose.filter((l) => !/^page error:/.test(l)) };
  },
  // check-contrast's failing lines end "…, <stage> stage, <state>"; its pass line says how many
  // texts it read and that they reached AA on both stages
  contrast(e) {
    if (e.status !== 'pass' && e.status !== 'fail') return {};
    if (/could not be checked/.test(e.summary ?? '')) return { _unattributed: [e.summary] };
    const bad = (e.detail ?? []).filter((l) => !/^page error:/.test(l));
    const out = {};
    if (/^no text/.test(e.summary ?? '')) {
      const why = 'the model draws no text';
      return { texts: SKIP(why), dark: SKIP(why), light: SKIP(why), surfaces: SKIP(why), disabled: SKIP(why) };
    }
    out.texts = bad.length ? 'fail' : 'pass';
    out.dark = bad.some((l) => /\bdark stage\b/.test(l)) ? 'fail' : 'pass';
    out.light = bad.some((l) => /\blight stage\b/.test(l)) ? 'fail' : 'pass';
    out.surfaces = bad.length ? 'fail' : 'pass';
    out.disabled = /disabled text\(s\) exempt/.test(e.summary ?? '') ? 'listed' : SKIP('the model has no text in a disabled control');
    return { ...out, _unattributed: (e.detail ?? []).filter((l) => /^page error:/.test(l)) };
  },
  // a site check: each entry is a page. Its line names only the rules that found something on it,
  // so every other rule is "no finding" — not proof that the rule applies to that page.
  seo(e) {
    const keys = stepsOf('seo').map((s) => s.key);
    const { hit, loose } = place(e.detail ?? [], keys.map((k) => [k, new RegExp(`^${k === 'robots' ? 'robots\\.txt' : k.replace(/[-.]/g, '\\$&')}:`)]));
    const listed = new Set(/^listed, not failed: ([^(]*)/.exec(e.summary ?? '')?.[1].split(',').map((s) => s.trim()).filter(Boolean) ?? []);
    const out = {};
    for (const k of keys) out[k] = hit.has(k) ? 'fail' : listed.has(k === 'robots' ? 'robots.txt' : k) ? 'listed' : 'pass';
    return { ...out, _unattributed: loose };
  },
};

/** Sums every recorded result's sub-steps into one small block: counts, and each skip reason once. */
function summarizeSteps(models) {
  const declared = stepsOf(check);
  const read = STEP_READERS[check];
  if (!declared.length || !read) return null;
  const totals = Object.fromEntries(declared.map((s) => [s.key, { pass: 0, fail: 0, flag: 0, listed: 0, skip: 0, skipped: {} }]));
  const unattributed = {};
  let entries = 0;
  for (const e of Object.values(models ?? {})) {
    entries++;
    let got;
    try { got = read(e) ?? {}; } catch { got = {}; }
    for (const line of got._unattributed ?? []) unattributed[String(line).slice(0, 120)] = (unattributed[String(line).slice(0, 120)] ?? 0) + 1;
    for (const s of declared) {
      const v = got[s.key];
      if (v == null) continue;
      const t = totals[s.key];
      if (typeof v === 'string') t[v] = (t[v] ?? 0) + 1;
      else if (v?.skip) { t.skip++; t.skipped[v.skip] = (t.skipped[v.skip] ?? 0) + 1; }
    }
  }
  for (const t of Object.values(totals)) t.notRecorded = entries - t.pass - t.fail - t.flag - t.listed - t.skip;
  return { entries, updatedAt: now(), from: 'the lines each result recorded, read by scripts/capture-check.mjs (STEP_READERS)', totals, unattributed };
}

/**
 * What THIS run covers, part by part, from the arguments the check was given: the parts it leaves
 * out are named with the reason, so a run that made only the defaults does not read as one that
 * tried the whole matrix and passed.
 */
function stepsThisRun() {
  const declared = stepsOf(check);
  if (!declared.length) return null;
  const out = {};
  for (const s of declared) out[s.key] = { in: true };
  if (check === 'exports') {
    const cov = exportsCovered();
    if (!cov.covered) for (const k of ['image', 'video', 'drift', 'formats']) out[k] = { in: false, why: cov.why.join('; ') };
    if (defaultsOnly) out.matrix = { in: false, why: '--defaults: this run makes the default settings and nothing else' };
    else if (args.includes('--quick')) out.matrix = { in: false, why: '--quick: 800 px, 480p and 2160p only, drift at 1:1' };
    const at = args.indexOf('--only');
    if (at >= 0) {
      const only = new Set(String(args[at + 1]).split(','));
      for (const [k, need] of [['image', 'dims'], ['video', 'dims'], ['drift', 'drift'], ['formats', 'formats']]) {
        if (!only.has(need)) out[k] = { in: false, why: `--only ${args[at + 1]}: this run does not run the ${need} check` };
      }
    }
  }
  return out;
}
/** The latest sub-step the check's own output has named, or null when it names none. */
let liveStep = null, liveStepFrom = null;
function noteStep(line) {
  if (check !== 'exports') return;
  const m = /^\s+MISMATCH (\S+) (\S+)/.exec(line);
  if (!m) return;
  const k = m[1] === 'drift' ? 'drift' : m[1] === 'formats' ? 'formats' : /^image/.test(m[2]) ? 'image' : /^video/.test(m[2]) ? 'video' : null;
  if (k) { liveStep = k; liveStepFrom = 'the latest MISMATCH line it printed'; }
}

/* ---------- what the run will go through (for progress only; the check decides for itself) ---------- */
function expectedTotal() {
  const named = args.filter((a, i) => !a.startsWith('-') && !(i > 0 && ['--tol', '--size', '--frames', '--only', '--json', '--dist', '--keep'].includes(args[i - 1])));
  if (named.length) return { total: named.length, totalIsEstimate: false, totalFrom: 'the model ids named on the command line' };
  try {
    const src = workingSources();
    const demoIds = [...src].filter(([, m]) => m.parts.some((p) => p.kind === 'demo' || (p.whole && p.file.includes('/charts/')))).map(([id]) => id);
    const converted = demoIds.filter((id) => src.get(id)?.snippet?.css.includes('--u:'));
    if (['models', 'stages', 'media', 'access', 'boxsizing', 'contrast'].includes(check)) return { total: demoIds.length, totalIsEstimate: true, totalFrom: `every model with a gallery entry in src/models, as check-${check} runs with no ids` };
    const site = REGISTRY.find((c) => c.key === check && c.scope === 'site');
    if (site) return { total: pagesFor(site), totalIsEstimate: true, totalFrom: 'the page count scripts/checks-registry.mjs gives' };
    if (check === 'motion') return args.includes('--all')
      ? { total: demoIds.length, totalIsEstimate: true, totalFrom: 'every model (--all)' }
      : { total: converted.length, totalIsEstimate: true, totalFrom: 'the converted models (snippet CSS with --u:), as check-motion runs with no ids' };
    if (check === 'exports') {
      const list = /const SAMPLE = \[([^\]]*)\]/.exec(readFileSync(join(ROOT, 'scripts', CHECKS.exports), 'utf8'));
      if (list) return { total: (list[1].match(/'[^']+'/g) ?? []).length, totalIsEstimate: true, totalFrom: 'check-exports\' own SAMPLE list, as it runs with no ids' };
    }
  } catch {}
  return { total: null, totalIsEstimate: true, totalFrom: 'unknown' };
}
const expected = record ? expectedTotal() : null;

/* ---------- the result file ---------- */
const dir = join(ROOT, 'docs', 'checks');
const file = join(dir, `${check}.json`);
let old = null;
function readOld() {
  if (old) return old;
  old = { models: {}, runs: [] };
  if (existsSync(file)) { try { old = JSON.parse(readFileSync(file, 'utf8')); } catch { warnings.push(`the previous ${check}.json could not be read and was replaced`); } }
  // a run that died mid-way left its flag behind; it is not this run's
  delete old.running; delete old.progress;
  return old;
}
function entry(r, printsNow) {
  const extra = r.extra ?? {};
  const id = r.id;
  return {
    status: r.status,
    summary: r.summary,
    detail: r.detail,
    ranAt: r.at,
    runId,
    commit,
    // the version of the check's rule this result was judged under (scripts/checks-registry.mjs):
    // the ledger marks it stale when the rule has changed since
    ruleVersion: ruleVersionOf(check),
    args,
    fingerprint: printsBefore[id] ?? null,
    fingerprints: judgedBefore ? recordFor(check, judgedBefore, id) : null,
    sourceChangedDuringRun: (printsBefore[id] ?? null) !== (printsNow[id] ?? null),
    ...extra,
  };
}
/**
 * Temp file and rename, so a reader never sees half a file; but on Windows a process holding the
 * file open without delete sharing (the Vite dev server serving it) makes the rename fail however
 * long one waits, so after a few short retries it is written in place. The way is logged when it changes.
 */
let lastWay = null;
function writeOut(out) {
  mkdirSync(dir, { recursive: true });
  const text = JSON.stringify(out, null, 1);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  let way = null, why = null;
  for (let i = 0; i < 4 && !way; i++) {
    try { renameSync(tmp, file); way = 'renamed'; } catch (e) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) { try { unlinkSync(tmp); } catch {} throw e; }
      why = e.code;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40 * (i + 1)); // a real sleep, not a spin
    }
  }
  if (!way) { writeFileSync(file, text); try { unlinkSync(tmp); } catch {} way = 'in place'; }
  if (way !== lastWay) {
    if (way === 'in place') console.error(`capture-check: docs/checks/${check}.json could not be replaced by rename (${why}: another process holds it open), so it was written in place`);
    else if (lastWay) console.error(`capture-check: docs/checks/${check}.json is replaced by rename again`);
    lastWay = way;
  }
}
const reportedNow = () => Object.entries(results).filter(([, r]) => r.status !== 'unreported');
/** Mid-run: everything reported so far, merged over the last known results, flagged as running. */
function writeProgress() {
  const o = readOld();
  const printsNow = fingerprints();
  const models = { ...(o.models ?? {}) };
  const done = reportedNow();
  if (check !== 'stages') for (const [id, r] of done) models[id] = entry({ ...r, id }, printsNow);
  const started = Object.keys(results).length;
  writeOut({
    check,
    note: 'Written by scripts/capture-check.mjs from the check\'s own printed output. Do not edit by hand.',
    updatedAt: now(),
    running: true,
    progress: {
      runId, startedAt, pid: process.pid, script: `scripts/${CHECKS[check]}`, args, commit,
      done: check === 'stages' ? started : done.length,
      counts: check === 'stages' ? 'models started (check-stages gives its verdicts only at the end)' : 'models reported',
      ...expected,
      last: current ?? done.at(-1)?.[0] ?? null,
      // what this run covers of the check's declared sub-steps, and the latest one its output named
      steps: stepsThisRun(),
      step: liveStep,
      stepFrom: liveStep ? liveStepFrom : null,
      updatedAt: now(),
    },
    models,
    steps: summarizeSteps(models),
    runs: o.runs ?? [],
  });
}
let progressTimer = null;
let lastProgress = 0;
function progressSoon() {
  if (!record || progressTimer) return;
  const wait = Math.max(0, 500 - (Date.now() - lastProgress));
  progressTimer = setTimeout(() => {
    progressTimer = null;
    lastProgress = Date.now();
    try { writeProgress(); } catch (e) { console.error(`capture-check: could not write progress: ${e.message}`); }
  }, wait);
}

/* ---------- --steps: read the file again, without running the check ---------- */
if (args.includes('--steps')) {
  // a run in progress owns the file: writing over it would drop its `running` flag and its progress
  try {
    if (existsSync(file) && JSON.parse(readFileSync(file, 'utf8')).running) {
      console.error(`capture-check: docs/checks/${check}.json says a run is in progress; it writes its own sub-step counts as it goes. Try again when it has finished.`);
      process.exit(2);
    }
  } catch {}
  const o = readOld();
  const steps = summarizeSteps(o.models ?? {});
  if (!steps) { console.error(`capture-check: ${check} declares no sub-steps in scripts/checks-registry.mjs, so there is nothing to sum.`); process.exit(2); }
  writeOut({ ...o, running: false, steps });
  const lines = Object.entries(steps.totals).map(([k, t]) => `  ${k.padEnd(14)} ${t.pass} pass, ${t.fail} fail${t.flag ? `, ${t.flag} flagged` : ''}${t.listed ? `, ${t.listed} listed` : ''}${t.skip ? `, ${t.skip} skipped` : ''}${t.notRecorded ? `, ${t.notRecorded} not recorded` : ''}`);
  console.error(`capture-check: read the sub-steps of ${steps.entries} recorded result(s) in docs/checks/${check}.json; the check was not run.\n${lines.join('\n')}`);
  const loose = Object.entries(steps.unattributed);
  if (loose.length) console.error(`  ${loose.length} line(s) could not be placed under a sub-step, and are counted apart: ${loose.slice(0, 3).map(([l, n]) => `"${l}" ×${n}`).join('; ')}`);
  process.exit(0);
}

/* ---------- run it ---------- */
const child = spawn(process.execPath, [join('scripts', CHECKS[check]), ...args], { cwd: ROOT, stdio: ['inherit', 'pipe', 'pipe'] });
let all = '';
let partial = '';
child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  const text = chunk.toString('utf8');
  all += text;
  partial += text;
  const lines = partial.split(/\r?\n/);
  partial = lines.pop();
  for (const line of lines) { const l = line.replace(/^\.+/, ''); parsers[check](l); noteStep(l); } // check-models prints a dot per quiet pass, with no newline
  const seen = `${Object.keys(results).length}:${Object.values(results).reduce((n, r) => n + r.detail.length, 0)}`;
  if (seen !== lastSeen) { lastSeen = seen; progressSoon(); }
});
let lastSeen = '0:0';
if (record) progressSoon(); // done 0 of total, straight away
child.stderr.on('data', (chunk) => process.stderr.write(chunk));
// Ctrl+C reaches the check too; stay alive long enough to record what it managed to report
process.on('SIGINT', () => {});

child.on('close', (code, signal) => {
  if (partial) parsers[check](partial.replace(/^\.+/, ''));
  if (!record) process.exit(code ?? 1);
  if (progressTimer) { clearTimeout(progressTimer); progressTimer = null; }
  const finishedAt = now();
  let complete = true;
  if (check === 'stages') complete = finishStages(all);
  if (check === 'exports') complete = finishExports();
  if (check === 'stages' && !complete) for (const id of Object.keys(results)) delete results[id];
  const printsAfter = fingerprints();

  const o = readOld();
  const models = { ...(o.models ?? {}) };
  for (const [id, r] of Object.entries(results)) models[id] = entry({ ...r, id }, printsAfter);
  const run = {
    runId, startedAt, finishedAt, script: `scripts/${CHECKS[check]}`, ruleVersion: ruleVersionOf(check), args, exitCode: code, signal,
    commit, uncommittedModelFiles: dirty, reported: Object.keys(results).length,
    expected: expected?.total ?? null, expectedIsEstimate: expected?.totalIsEstimate ?? true,
    summaryLine, warnings, complete: complete && code != null,
  };
  const out = {
    check,
    note: 'Written by scripts/capture-check.mjs from the check\'s own printed output. Do not edit by hand.',
    updatedAt: finishedAt,
    running: false,
    models,
    // the sub-steps every result in this file speaks to, summed (see the header)
    steps: summarizeSteps(models),
    runs: [run, ...(o.runs ?? [])].slice(0, 30),
  };
  writeOut(out);
  console.error(`\ncapture-check: recorded ${run.reported} ${REGISTRY.find((c) => c.key === check)?.scope === "site" ? "page" : "model"} result(s) in docs/checks/${check}.json${run.complete ? '' : ' (the run did not finish normally)'}.`);
  process.exit(code ?? 1);
});
