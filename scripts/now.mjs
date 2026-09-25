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
import { existsSync, readFileSync, statSync } from 'node:fs';
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
/** Every node process, with its command line, its age and what it holds. [] when it cannot be read. */
function processes() {
  try {
    if (process.platform === 'win32') {
      // -NoProfile so a slow profile cannot stall this, and CSV so the command line survives spaces
      const out = execFileSync('powershell', ['-NoProfile', '-Command',
        "Get-CimInstance Win32_Process -Filter \"Name='node.exe' or Name='chrome.exe'\" | ForEach-Object { '{0}|{1}|{2}|{3}' -f $_.ProcessId, $_.WorkingSetSize, $_.CreationDate.ToString('o'), ($_.CommandLine -replace '\\|',' ') }"],
        { encoding: 'utf8', timeout: 8000, windowsHide: true });
      return out.split('\n').filter(Boolean).map((l) => {
        const [pid, rss, started, ...rest] = l.trim().split('|');
        return { pid: Number(pid), rss: Number(rss), started: Date.parse(started), cmd: rest.join('|') };
      });
    }
    const out = execFileSync('ps', ['-eo', 'pid=,rss=,etimes=,args='], { encoding: 'utf8', timeout: 8000 });
    return out.split('\n').filter(Boolean).map((l) => {
      const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
      return m ? { pid: Number(m[1]), rss: Number(m[2]) * 1024, started: Date.now() - Number(m[3]) * 1000, cmd: m[4] } : null;
    }).filter(Boolean).filter((p) => /node|chrome|chromium/i.test(p.cmd));
  } catch (e) {
    return { error: e.message.split('\n')[0] };
  }
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
/**
 * How far a run has got, read from the file the run itself writes -- not from what anyone reported.
 * Each entry knows how to count its own lines, so a new runner is one entry here.
 */
const WORK = [
  {
    name: 'the export matrix over all 135', file: 'matrix-all.status', of: 135,
    read: (t) => {
      const lines = t.split('\n').filter(Boolean);
      const done = lines.filter((l) => /: (held|FAILED|STOPPED)/.test(l));
      const held = done.filter((l) => /: held/.test(l)).length;
      const mins = done.map((l) => Number(l.match(/in ([0-9.]+) min/)?.[1])).filter(Number.isFinite);
      const each = mins.length ? mins.reduce((a, b) => a + b, 0) / mins.length : null;
      const now = lines[lines.length - 1]?.match(/ ([a-z0-9]+): waiting/)?.[1] ?? null;
      return { done: done.length, held, failed: done.length - held, each, waiting: now, last: done[done.length - 1] ?? null };
    },
  },
  {
    name: 'the gate (npm run verify)', file: 'gate.log', of: null,
    read: (t) => {
      const steps = [...t.matchAll(/^\[\s*(\d+)\/(\d+)\]\s+(\S+)\s+shard\s+(\d+)\/(\d+)\s+(\d+) models in (\S+): (.+?)\s*\(/gm)];
      const last = steps[steps.length - 1];
      const verdict = t.match(/GATE (HOLDS|FAILS)[^\n]*/)?.[0] ?? null;
      return { done: last ? Number(last[1]) : 0, of: last ? Number(last[2]) : null, step: last ? `${last[3]} shard ${last[4]}/${last[5]} — ${last[8]}` : null, verdict };
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
  lines.push(bold('PROCESSES'));
  if (ps.error) {
    lines.push(`  could not read the process list (${ps.error}) — the rest below is still measured`);
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
    const age = (Date.now() - statSync(file).mtimeMs) / 1000;
    const r = w.read(readFileSync(file, 'utf8'));
    if (w.file === 'matrix-all.status') {
      if (!r.done && !r.waiting) continue;
      any = true;
      const left = w.of - r.done;
      const eta = r.each ? new Date(Date.now() + left * r.each * 60000).toLocaleTimeString() : '—';
      lines.push(`  ${w.name}`);
      lines.push(`    ${r.done} of ${w.of} models · held ${r.held}, failed ${r.failed}${r.each ? ` · ${r.each.toFixed(1)} min each · ends about ${eta}` : ''}`);
      if (r.last) lines.push(`    last: ${r.last.replace(/^\S+\s/, '').slice(0, 88)}`);
      if (r.waiting) lines.push(`    waiting for memory before ${r.waiting}`);
    } else {
      if (!r.done && !r.verdict) continue;
      any = true;
      lines.push(`  ${w.name}`);
      if (r.verdict) lines.push(`    ${(r.verdict.startsWith('GATE HOLDS') ? green : red)(r.verdict.slice(0, 92))}`);
      else lines.push(`    step ${r.done} of ${r.of} · ${r.step}`);
    }
    lines.push(`    ${dim(`from .media-tmp/runs/${w.file}, written ${clock(age)} ago`)}`);
  }
  if (!any) lines.push('  no run has written a status file this session');
  lines.push('');

  // MACHINE
  const free = freemem(), total = totalmem();
  const low = free < 1.4 * 1073741824;
  lines.push(bold('MACHINE'));
  lines.push(`  free ${(low ? red : green)(GB(free))} of ${GB(total)}   ${low ? 'under the 1.4 GB the guards watch for' : 'above the guards\' floor'}`);

  const out = lines.join('\n');
  if (WATCH) process.stdout.write(`${TTY ? CLEAR : ''}${out}\n\n${dim('refreshing every 5s — Ctrl-C to stop')}\n`);
  else process.stdout.write(`${out}\n`);
}

await draw();
if (WATCH) setInterval(draw, 5000);
