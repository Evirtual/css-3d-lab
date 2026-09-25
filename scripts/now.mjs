/**
 * What is running, right now, MEASURED.
 *
 *   npm run now            print it once
 *   npm run now -- --watch refresh every 5s until Ctrl-C
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT THE LEDGER PAGE.
 *
 * The lead's record on docs/ledger.html says "REPORTED, NOT MEASURED", and means it: it knows only
 * what a script told it through `npm run queue -- start|done`. A run that dies between the two says
 * "running" for ever -- on 2026-09-25 the gate sat there "running since 20 h ago" with a note
 * admitting its process had ended fourteen hours earlier. That is the record being honest about its
 * own limits, but it is not progress.
 *
 * This asks the machine instead, and it is a TERMINAL tool on purpose. A watcher that needed a
 * browser would be driving a browser while the checks drive theirs, and that is not hypothetical:
 * stackbars and candles failed their stage checks under exactly that load and passed clean on an
 * idle machine. The thing that watches the run must not be able to change its answer.
 *
 * It measures four things, and nothing here is reported by anyone:
 *   PROCESSES  which check, which model, how long, how much memory it holds
 *   PORTS      whether the dev server and the render service actually answer
 *   WORK       how far a known run has got, read from the file the run itself writes
 *   MACHINE    free memory, against the floor the guards use
 *
 * It only reads. It starts nothing, kills nothing and writes nothing.
 *
 * ON OTHER PLATFORMS: the process list is the one part that needs an outside command -- `tasklist`
 * on Windows, `ps` elsewhere -- and if that command is missing or refused, that section says so and
 * the other three still work. Nothing else here leaves Node.
 */
import { appendFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { connect } from 'node:net';
import { freemem, totalmem } from 'node:os';
import { join } from 'node:path';

const ROOT = process.cwd();
const RUNS = join(ROOT, '.media-tmp', 'runs');
const WATCH = process.argv.includes('--watch');
// Colour only into a real terminal: piped or redirected, the escapes are noise in the file
const ESC = String.fromCharCode(27);
const TTY = process.stdout.isTTY && !process.env.NO_COLOR;
const C = (code) => (s) => (TTY ? `${ESC}[${code}m${s}${ESC}[0m` : String(s));
const bold = C(1), dim = C(2), green = C(32), red = C(31);
const CLEAR = `${ESC}[2J${ESC}[H`;
const GB = (b) => `${(b / 1073741824).toFixed(1)} GB`;
const MB = (kb) => `${(kb / 1024).toFixed(0)} MB`;
const clock = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m` : s >= 60 ? `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, '0')}s` : `${Math.floor(s)}s`);
const pad = (s, n) => String(s).padEnd(n);

/* ---------------- processes ---------------- */
/**
 * INSTRUMENT FAILURES ARE RECORDED, NEVER SWALLOWED.
 *
 * Every time an instrument here cannot answer, the attempt goes in this file with what was tried
 * and what it said. Nothing is allowed to quietly give up: a tool that times out and prints one
 * grey line teaches you nothing, and the same timeout at 15:34 on 2026-09-25 appeared on screen as
 * "could not read the process list" directly above a WORK block that had ALSO decided the run was
 * over -- two instruments failing at once, reading like one confident report that everything had
 * stopped. Twelve node processes and twenty Chromium renderers were running at that moment.
 */
const INSTRUMENTS = join(RUNS, 'instruments.log');
function record(what, detail) {
  try { appendFileSync(INSTRUMENTS, `${new Date().toISOString()} ${what}: ${detail}\n`); } catch { /* the log is a courtesy, never a dependency */ }
}
/** What this session has already seen fail, so a failure is visible even after it stops happening. */
function recorded() {
  try {
    return readFileSync(INSTRUMENTS, 'utf8').split('\n').filter(Boolean).slice(-4);
  } catch { return []; }
}

/**
 * Every node process, with its command line, its age and what it holds.
 *
 * Two budgets, because the eight-second one was itself the bug: under a full gate the machine is
 * loaded enough that PowerShell needs longer to start than it does to answer, and a timeout there
 * says nothing whatever about what is running. It escalates to thirty seconds rather than giving
 * up, and if BOTH fail it returns the failure with everything it tried, so the caller can say "I
 * could not look" instead of the far more dangerous "nothing is there".
 *
 * `tasklist` is deliberately not a fallback. Asked at 15:34 it returned two lines for the entire
 * machine and no error, which is worse than timing out: a confident empty answer.
 */
function processes() {
  const parseWin = (out) => out.split('\n').filter(Boolean).map((l) => {
    const [pid, rss, started, ...rest] = l.trim().split('|');
    return { pid: Number(pid), rss: Number(rss), started: Date.parse(started), cmd: rest.join('|') };
  });
  const PS = "Get-CimInstance Win32_Process -Filter \"Name='node.exe' or Name='chrome.exe'\" | ForEach-Object { '{0}|{1}|{2}|{3}' -f $_.ProcessId, $_.WorkingSetSize, $_.CreationDate.ToString('o'), ($_.CommandLine -replace '\\|',' ') }";
  const tried = [];
  for (const ms of [10000, 30000]) {
    try {
      if (process.platform === 'win32') {
        // -NoProfile so a slow profile cannot stall this
        return parseWin(execFileSync('powershell', ['-NoProfile', '-Command', PS], { encoding: 'utf8', timeout: ms, windowsHide: true }));
      }
      const out = execFileSync('ps', ['-eo', 'pid=,rss=,etimes=,args='], { encoding: 'utf8', timeout: ms });
      return out.split('\n').filter(Boolean).map((l) => {
        const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
        return m ? { pid: Number(m[1]), rss: Number(m[2]) * 1024, started: Date.now() - Number(m[3]) * 1000, cmd: m[4] } : null;
      }).filter(Boolean).filter((p) => /node|chrome|chromium/i.test(p.cmd));
    } catch (e) {
      const why = e.message.split('\n')[0];
      tried.push(`${ms / 1000}s -> ${why}`);
      record('process list', `${ms / 1000}s budget failed: ${why}`);
    }
  }
  return { error: tried.join('; then ') };
}

/** A check process said in English: which check, and which model it was given. */
function describe(cmd) {
  const check = cmd.match(/scripts[\\/]check-([a-z]+)\.mjs/)?.[1];
  if (check) {
    const args = cmd.split(/check-[a-z]+\.mjs/)[1]?.trim().split(/\s+/).filter((a) => a && !a.startsWith('-')) ?? [];
    return `check-${check}${args.length ? ` · ${args.slice(0, 3).join(' ')}${args.length > 3 ? ` +${args.length - 3}` : ''}` : ' · every model'}`;
  }
  if (/server[\\/]dev\.mjs/.test(cmd)) return 'render service (server/dev.mjs)';
  if (/scripts[\\/]verify\.mjs/.test(cmd)) return 'the gate (npm run verify)';
  if (/scripts[\\/]capture-check\.mjs/.test(cmd)) return `capture · ${cmd.split('capture-check.mjs')[1]?.trim().split(/\s+/)[0] ?? ''}`;
  if (/scripts[\\/]ledger(-watch)?\.mjs/.test(cmd)) return 'the ledger';
  if (/vite/.test(cmd) && /dev/.test(cmd)) return 'vite dev server';
  return null;
}

/* ---------------- ports ---------------- */
const PORTS = [
  { port: 5183, what: 'vite dev server', by: 'npm run dev' },
  { port: 8787, what: 'render service', by: 'npm run export', path: '/capture' },
];
const knock = (port, host) => new Promise((done) => {
  const s = connect({ port, host });
  const end = (v) => { s.destroy(); done(v); };
  s.setTimeout(700);
  s.on('connect', () => end(true));
  s.on('timeout', () => end(false));
  s.on('error', () => end(false));
});
// BOTH stacks. Vite is started with `--port 5183` and binds "localhost", which on Windows resolves
// to ::1 before 127.0.0.1 -- so knocking only on 127.0.0.1 reported "not up" for a dev server that
// was listening and had been for 25 hours. A status tool that reports a false negative is worse
// than no status tool, because it sends you looking for a fault that is not there.
const answers = async (port) => (await knock(port, '127.0.0.1')) || (await knock(port, '::1'));

/* ---------------- work ---------------- */
const STALE = 30 * 60; // seconds: past this, a status file is history, not progress

/**
 * How far a run has got, read from the file the run itself writes -- not from what anyone reported.
 *
 * LIVE OR HISTORY, AND WHY THE DIFFERENCE IS THE WHOLE POINT. On 2026-09-25 at 13:38 this block said
 * the export matrix was "7 of 135 models ... ends about 3:35:54 AM" -- in the afternoon, off a file
 * last written three hours earlier -- while the run actually on the machine, check-stages, 41 models
 * in and listed in PROCESSES four lines above, was not mentioned at all. The age was there, in grey,
 * underneath an extrapolation written in the present tense. That is the wrong way round.
 *
 * So: anything older than STALE is labelled over and never gets an estimate, because an estimate off
 * a dead file is a guess wearing a clock. And the release chain reads FIRST, from the log of whatever
 * step it is on, so the thing that is running is the thing at the top.
 */
const readIf = (f) => { const p = join(RUNS, f); return existsSync(p) ? readFileSync(p, 'utf8') : ''; };
const ageOf = (f) => { const p = join(RUNS, f); return existsSync(p) ? (Date.now() - statSync(p).mtimeMs) / 1000 : Infinity; };

const CHAIN = ['stages', 'compare', 'looks', 'gate', 'snapshot'];
const CHAIN_WHAT = {
  stages: 'check-stages, every model on fifteen surfaces',
  compare: 'compare, snapshots against the screen',
  looks: 'the three browser looks',
  gate: 'the gate, every check over every model',
  snapshot: 'retaking docs/release-snapshot.json',
};
const CHAIN_LOG = { stages: 'fin-stages.log', compare: 'fin-compare.log', looks: 'fin-looks.log', gate: 'gate.log', snapshot: 'fin-snap.log' };
// Seconds of silence that mean nothing, per step, from what each log actually writes: a line per
// model for stages and compare, a line per shard for the gate -- and its slowest shard is
// check-stages over 68 models, about twenty-five minutes of saying nothing while working.
// Raised for the gate on 2026-09-25 after a SECOND false alarm on the same step: thirty minutes was
// still short. check-exports renders real files per model and had run 33 minutes without landing a
// shard, with twenty Chromium renderers on the machine doing it. Forty-five, with the reason here
// rather than in someone's head.
const QUIET_AFTER = { stages: 300, compare: 300, looks: 300, gate: 2700, snapshot: 300 };
/** Which step the chain is on, from its own status file. */
const chainStep = (t) => {
  const done = t.split('\n').filter((l) => /^\S+ (stages|compare|looks|gate|snapshot):/.test(l)).length;
  return { done, step: CHAIN[done] };
};
// Counted only where the log's shape is known. Elsewhere its last line stands alone, which is still
// measured -- a guessed denominator would not be.
const CHAIN_COUNT = {
  stages: (t, since) => {
    const n = (t.match(/^[a-z0-9]+$/gm) ?? []).length;
    if (!n) return null;
    const each = since / n;
    return `${n} of 135 models · ${(each / 60).toFixed(1)} min each · ends about ${new Date(Date.now() + (135 - n) * each * 1000).toLocaleTimeString()}`;
  },
  gate: (t) => {
    const n = (t.match(/^\[\s*\d+\/\d+\]/gm) ?? []).length;
    return n ? `${n} of 10 shards done (about 1h34m in all)` : null;
  },
};

// The last process list draw() read, so the chain can prefer direct evidence over cadence without
// paying for a second PowerShell call. Null until the first draw, or when it could not be read.
let PS_CACHE = null;
// Windows command lines use backslashes, so the separator class must carry both -- [\/] alone
// matches nothing here and would have quietly made "is anything working" always answer no.
const busyNow = () => Array.isArray(PS_CACHE) && PS_CACHE.some((p) => /scripts[\\/](check-|capture-check|verify)/.test(p.cmd));

const WORK = [
  {
    // Whichever chain ran most recently: finish.sh on release day, tonight.sh for the re-check
    // the export fix forced. Reading a fixed name reported 'finished' over a run that had just begun.
    name: 'the release chain', file: ['tonight.status','finish.status'].filter((f)=>existsSync(join(RUNS,f))).sort((a,b)=>statSync(join(RUNS,b)).mtimeMs-statSync(join(RUNS,a)).mtimeMs)[0] ?? 'finish.status',
    // finish.status is written BETWEEN steps, so during a 1h34m gate it is necessarily an hour old
    // and the file's own age says nothing about whether the chain is alive. Judging the chain by it
    // printed "over; this is the last run, not now" across a run with twenty Chromium renderers
    // working -- directly above a process list that had timed out, so the screen carried two
    // independent failures that together read as one confident obituary. The chain's age is the age
    // of the newest thing any of its steps has written, and it goes stale on that step's own floor.
    freshest: (t, fileAge) => Math.min(fileAge, ...Object.values(CHAIN_LOG).map((f) => ageOf(f))),
    staleAfter: (t) => (busyNow() ? Infinity : QUIET_AFTER[chainStep(t).step] ?? STALE),
    lines: (t) => {
      const rows = t.split('\n').filter(Boolean);
      const start = rows.find((l) => / start at /.test(l));
      const t0 = start ? Date.parse(start.split(' ')[0]) : null;
      const done = rows.filter((l) => /^\S+ (stages|compare|looks|gate|snapshot):/.test(l));
      const finished = rows.find((l) => / finished --/.test(l));
      const out = [];

      if (finished) {
        out.push(`    ${green(`all five steps done · ${finished.replace(/^\S+\s+finished --\s*/, '')}`)}`);
      } else {
        const step = CHAIN[done.length];
        const log = CHAIN_LOG[step];
        const lag = log ? ageOf(log) : Infinity;
        // HOW LONG SILENCE IS NORMAL DEPENDS ON WHAT THE STEP WRITES, and getting this wrong cried
        // wolf a fourth time. check-stages writes a line per model, so five minutes quiet means
        // something is wrong. The gate writes a line per SHARD, and a check-stages shard is 68
        // models at 22 seconds each -- twenty-five minutes between lines, every time, working
        // perfectly. At 14:40 that was called dead while ten Chromiums held 1.5 GB doing it.
        const busy = busyNow();
        const moving = busy || lag < (QUIET_AFTER[step] ?? 300);
        const head = `step ${done.length + 1} of 5: ${CHAIN_WHAT[step] ?? step}`;
        out.push(`    ${moving ? green(head) : red(`${head} — its log has not changed for ${clock(lag)}`)}`);
        const txt = log ? readIf(log) : '';
        const count = t0 && CHAIN_COUNT[step] ? CHAIN_COUNT[step](txt, (Date.now() - t0) / 1000) : null;
        if (count) out.push(`      ${count}`);
        const last = txt.split('\n').filter((l) => l.trim()).pop();
        if (last) out.push(`      ${dim(`${log}, ${clock(lag)} ago: ${last.trim().slice(0, 74)}`)}`);
      }

      for (const d of done) out.push(`    ${dim('done:')} ${d.replace(/^\S+\s+/, '').slice(0, 92)}`);
      if (t0) out.push(`    ${dim(`started ${clock((Date.now() - t0) / 1000)} ago at ${start.match(/start at (\S+?),/)?.[1] ?? '?'}`)}`);
      return out;
    },
  },
  {
    name: 'the export matrix over all 135', file: 'matrix-all.status',
    lines: (t, age) => {
      const rows = t.split('\n').filter(Boolean);
      const done = rows.filter((l) => /: (held|FAILED|STOPPED)/.test(l));
      if (!done.length) return [];
      const held = done.filter((l) => /: held/.test(l)).length;
      const mins = done.map((l) => Number(l.match(/in ([0-9.]+) min/)?.[1])).filter(Number.isFinite);
      const each = mins.length ? mins.reduce((a, b) => a + b, 0) / mins.length : null;
      const live = age <= STALE;
      const eta = live && each ? ` · ends about ${new Date(Date.now() + (135 - done.length) * each * 60000).toLocaleTimeString()}` : '';
      const out = [`    ${done.length} of 135 models · held ${held}, failed ${done.length - held}${each ? ` · ${each.toFixed(1)} min each` : ''}${eta}`];
      out.push(`    last: ${done[done.length - 1].replace(/^\S+\s/, '').slice(0, 88)}`);
      const waiting = rows[rows.length - 1]?.match(/ ([a-z0-9]+): waiting/)?.[1];
      if (live && waiting) out.push(`    waiting for memory before ${waiting}`);
      return out;
    },
  },
  {
    name: 'the gate (npm run verify)', file: 'gate.log',
    // The gate's own floor, not the global one: it writes a line per shard, and check-exports can
    // take forty minutes between them. The global thirty called a working gate over at 15:43.
    staleAfter: () => QUIET_AFTER.gate,
    lines: (t) => {
      const steps = [...t.matchAll(/^\[\s*(\d+)\/(\d+)\]\s+(\S+)\s+shard\s+(\d+)\/(\d+)\s+(\d+) models in (\S+): (.+?)\s*\(/gm)];
      const last = steps[steps.length - 1];
      const verdict = t.match(/GATE (HOLDS|FAILS)[^\n]*/)?.[0];
      if (verdict) return [`    ${(verdict.startsWith('GATE HOLDS') ? green : red)(verdict.slice(0, 92))}`];
      if (!last) return [];
      return [`    step ${last[1]} of ${last[2]} · ${last[3]} shard ${last[4]}/${last[5]} — ${last[8]}`];
    },
  },
];

/* ---------------- printing ---------------- */
async function draw() {
  const lines = [];
  const at = new Date().toLocaleTimeString();
  lines.push(`${bold('CSS 3D LAB — what is running, measured')}   ${at}`);
  lines.push('');

  // PROCESSES
  const ps = processes();
  PS_CACHE = ps.error ? null : ps;
  lines.push(bold('PROCESSES'));
  if (ps.error) {
    // "I could not look" and "nothing is there" are opposite facts and must never share a sentence.
    lines.push(`  ${red('I COULD NOT LOOK at the process list — this is not "nothing is running"')}`);
    lines.push(`  tried: ${ps.error}`);
    lines.push(`  ${dim('what can still be measured: the ports below, and whether the logs are growing')}`);
  } else {
    const mine = ps.filter((p) => describe(p.cmd));
    const chrome = ps.filter((p) => /chrome|chromium/i.test(p.cmd) && /--headless|--remote-debugging/.test(p.cmd));
    if (!mine.length && !chrome.length) lines.push('  nothing of this project is running');
    for (const p of mine.sort((a, b) => a.started - b.started)) {
      lines.push(`  ${pad(describe(p.cmd), 44)} pid ${pad(p.pid, 7)} ${pad(clock((Date.now() - p.started) / 1000), 8)} ${GB(p.rss)}`);
    }
    if (chrome.length) {
      const held = chrome.reduce((n, c) => n + c.rss, 0);
      lines.push(`  ${pad(`${chrome.length} headless Chromium`, 44)} ${pad('', 12)} ${pad('', 8)} ${GB(held)}`);
    }
  }
  lines.push('');

  // PORTS
  lines.push(bold('PORTS'));
  for (const p of PORTS) {
    const up = await answers(p.port);
    lines.push(`  ${pad(p.port, 7)} ${pad(p.what, 22)} ${up ? green('answering') : dim('not up')}${up && p.path ? `  ${p.path}` : `  (${p.by})`}`);
  }
  lines.push('');

  // WORK
  lines.push(bold('WORK'));
  let any = false;
  for (const w of WORK) {
    const file = join(RUNS, w.file);
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    const fileAge = (Date.now() - statSync(file).mtimeMs) / 1000;
    const age = w.freshest ? w.freshest(text, fileAge) : fileAge;
    const limit = w.staleAfter ? w.staleAfter(text) : STALE;
    const body = w.lines(text, age);
    if (!body.length) continue;
    any = true;
    lines.push(`  ${w.name}${age > limit ? dim(`   — over; nothing has written for ${clock(age)}, past this step's ${clock(limit)}`) : ''}`);
    lines.push(...body);
    lines.push(`    ${dim(`from .media-tmp/runs/${w.file}, written ${clock(age)} ago`)}`);
  }
  if (!any) lines.push('  no run has written a status file this session');
  lines.push('');

  // MACHINE
  const free = freemem(), total = totalmem();
  const low = free < 1.4 * 1073741824;
  // INSTRUMENTS — what this tool itself has failed to do, kept on screen after it stops happening.
  // A timeout that scrolls past and is never mentioned again is how you end up trusting a reading
  // taken by something that was not working. Four watchers have now been wrong on this project; the
  // rule that came out of it is that an instrument's failures are findings, not noise.
  const failures = recorded();
  if (failures.length) {
    lines.push(bold('INSTRUMENTS'));
    lines.push(`  ${red(`${failures.length} recent failure(s) of this tool itself`)} ${dim(`(.media-tmp/runs/instruments.log)`)}`);
    for (const f of failures) lines.push(`    ${dim(f.slice(0, 100))}`);
    lines.push('');
  }

  lines.push(bold('MACHINE'));
  lines.push(`  free ${(low ? red : green)(GB(free))} of ${GB(total)}   ${low ? 'under the 1.4 GB the guards watch for' : 'above the guards\' floor'}`);

  const out = lines.join('\n');
  if (WATCH) process.stdout.write(`${TTY ? CLEAR : ''}${out}\n\n${dim('refreshing every 5s — Ctrl-C to stop')}\n`);
  else process.stdout.write(`${out}\n`);
}

/* ---------------- is it alive ---------------- */
/**
 * ONE ANSWER TO "IS WORK HAPPENING", used by this tool and by whatever is watching it.
 *
 * Three false alarms on the same step in one afternoon, each answered by raising a number: seven
 * minutes, thirty, forty-five. check-exports was 46m37s in and holding thirteen Chromium when the
 * forty-five-minute floor called it dead. The number was never the problem. The problem was
 * inferring from cadence while DIRECT evidence sat one call away.
 *
 * So the order is: direct evidence first, inference only when direct evidence cannot be had.
 *   1  a check process is running          -> alive, and say which one and for how long
 *   2  the process list could not be read  -> fall back to the log, and SAY it is a fallback
 *   3  the log grew within this step's floor -> alive
 *   4  none of the above                   -> not alive, with what was looked at
 *
 * Step 2 is the part that matters. "I could not look" is not evidence of absence, and the honest
 * output says which of the two it is rather than collapsing them into one verdict.
 */
function alive() {
  // the newest chain's file, for the same reason the WORK block picks it
  const chainFile = ['tonight.status', 'finish.status'].filter((f) => existsSync(join(RUNS, f)))
    .sort((a, b) => statSync(join(RUNS, b)).mtimeMs - statSync(join(RUNS, a)).mtimeMs)[0] ?? 'finish.status';
  const status = readIf(chainFile);
  // A finished chain has no current step, and asking for one printed
  //   STOPPED: no check process is running and undefined has not grown for InfinityhNaNm
  // which is true, useless, and looks like a fault. Done is its own answer.
  const done = /\sfinished --/.test(status);
  if (done) return { ok: false, how: 'measured', why: `the chain finished: ${status.trim().split('\n').pop().replace(/^\S+\s+/, '')}` };
  const { step } = chainStep(status);
  const floor = QUIET_AFTER[step] ?? 300;
  const ps = processes();

  if (!ps.error) {
    const working = ps.filter((p) => /scripts[\\/](check-|capture-check|verify)/.test(p.cmd));
    if (working.length) {
      const oldest = Math.min(...working.map((p) => p.started));
      return { ok: true, how: 'measured', why: `${working.length} check process(es) running, the oldest for ${clock((Date.now() - oldest) / 1000)}: ${describe(working[0].cmd)}` };
    }
  }

  const log = CHAIN_LOG[step];
  const lag = log ? ageOf(log) : Infinity;
  const fallback = ps.error ? ' (the process list could not be read, so this is the log, not the processes)' : '';
  if (lag < floor) return { ok: true, how: ps.error ? 'inferred' : 'measured', why: `${log} grew ${clock(lag)} ago, inside this step's ${clock(floor)} floor${fallback}` };
  if (ps.error) return { ok: null, how: 'unknown', why: `could not read the process list (${ps.error}), and ${log} has not grown for ${clock(lag)}. This is "I could not look", not "nothing is running"` };
  return { ok: false, how: 'measured', why: `no check process is running and ${log} has not grown for ${clock(lag)}, past this step's ${clock(floor)}` };
}

if (process.argv.includes('--alive')) {
  const a = alive();
  process.stdout.write(`${a.ok === true ? 'ALIVE' : a.ok === false ? 'STOPPED' : 'UNKNOWN'} (${a.how}): ${a.why}\n`);
  process.exit(a.ok === true ? 0 : a.ok === false ? 1 : 2);
}

await draw();
if (WATCH) setInterval(draw, 5000);
