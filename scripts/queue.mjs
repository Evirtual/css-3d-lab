/**
 * Reports running and finished work in docs/ledger-queue.json, the record docs/ledger.html shows
 * beside the measured ledger.
 *
 *   npm run queue -- start "<name>" "<brief>" <model...>   mark work as running (adds it, or
 *                                                          moves a queued item of that name to running)
 *   npm run queue -- progress "<name>" "<where it is>"     say where a running item has got to
 *                                                          (its own word, with the time it said it)
 *   npm run queue -- done "<name>"                         mark it done
 *   npm run queue -- list                                  print the record
 *
 * The lead session and its agents call it when work starts and ends. What it writes is their
 * word, not a measurement; the page labels it so. For what IS measured -- which check is running
 * on which model, which ports answer, how far a run has got -- see `npm run now`.
 *
 * THE RECORD IN THIS REPOSITORY IS SOMEBODY ELSE'S WEEK. docs/ledger-queue.json holds 94 jobs run
 * between 2026-09-21 and 2026-09-25, the rewrite this project's article is about. It is kept
 * deliberately, not left behind: the article makes checkable claims about that week, and this is
 * what they are checked against. Anyone starting their own work can empty it --
 *
 *   echo '{"items":[]}' > docs/ledger-queue.json
 *
 * -- and the page draws an empty board without complaint. Checked before saying so: the only
 * thing that reads this file besides the page and this script is one release-checklist proof,
 * and it reads `.filter(i => i.status === 'running')` to confirm nothing is mid-flight. An empty
 * file passes it. Not one of the 94 finished jobs is read by any check, gate or count.
 *
 * Safe to run from two agents at once: it takes docs/ledger-queue.json.lock (created exclusively,
 * so only one process can hold it), reads, edits, writes a temporary file and renames it over the
 * record, then lets go. A lock older than 15 s is taken to belong to a process that died.
 */
import { closeSync, openSync, readFileSync, statSync, unlinkSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { writeAtomic } from './ledger.mjs';
import { ROOT } from './model-sources.mjs';

const FILE = join(ROOT, 'docs', 'ledger-queue.json');
const LOCK = `${FILE}.lock`;
const STALE_LOCK_MS = 15000;
const WAIT_MS = 10000;

const usage = () => {
  console.error('usage:\n  npm run queue -- start "<name>" "<brief>" <model...>\n  npm run queue -- done "<name>"\n  npm run queue -- list');
  process.exit(2);
};
const [cmd, name, ...rest] = process.argv.slice(2);
if (!['start', 'progress', 'done', 'list'].includes(cmd)) usage();
if (cmd !== 'list' && !name?.trim()) usage();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withLock(fn) {
  const until = Date.now() + WAIT_MS;
  for (;;) {
    try {
      const fd = openSync(LOCK, 'wx');
      writeSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
      closeSync(fd);
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - statSync(LOCK).mtimeMs > STALE_LOCK_MS) { unlinkSync(LOCK); continue; } } catch {}
      if (Date.now() > until) throw new Error(`docs/ledger-queue.json.lock has been held for over ${WAIT_MS / 1000} s; another queue call may be stuck. Delete the lock if no queue call is running.`);
      await sleep(40 + Math.random() * 80);
    }
  }
  try { return fn(); } finally { try { unlinkSync(LOCK); } catch {} }
}

function read() {
  let text;
  try { text = readFileSync(FILE, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT') return { comment: '', updatedAt: null, items: [] };
    throw e;
  }
  const q = JSON.parse(text); // a broken record is not overwritten: the error stops the call
  if (!Array.isArray(q.items)) throw new Error('docs/ledger-queue.json has no items array; not touching it');
  return q;
}

/** The file as the lead writes it by hand: one item per line, so a diff shows which item changed. */
function format(q) {
  const { items, ...top } = q;
  const head = Object.entries(top).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  const val = (v) => (Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(', ')}]` : JSON.stringify(v));
  const list = items.map((i) => `    { ${Object.entries(i).map(([k, v]) => `${JSON.stringify(k)}: ${val(v)}`).join(', ')} }`).join(',\n');
  return `{\n${head}\n  "items": [\n${list}\n  ]\n}\n`;
}

const now = () => new Date().toISOString();
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

const result = await withLock(() => {
  const q = read();
  if (cmd === 'list') return { q, msg: null };
  const at = now();
  let item = q.items.find((i) => same(i.name ?? '', name) && i.status !== 'done');
  let msg;
  if (cmd === 'start') {
    const [brief, ...models] = rest;
    if (item) {
      const was = item.status;
      item.status = 'running';
      item.started = at;
      if (brief != null) item.brief = brief;
      if (models.length) item.models = models;
      msg = `"${item.name}" was ${was}, now running.`;
    } else {
      item = { name: name.trim(), brief: brief ?? '', models, status: 'running', started: at };
      q.items.push(item);
      msg = `"${item.name}" added as running${models.length ? ` (${models.length} model(s))` : ' (no models listed)'}.`;
    }
  } else if (cmd === 'progress') {
    // Where a run has got to. It does not touch status or started: a progress line is not a restart,
    // and "running since" must keep meaning since it started. The time it was said is kept with it,
    // so the page can show a line that has stopped moving for what it is.
    if (!item) throw new Error(`no running or queued item is named "${name}".`);
    if (item.status !== 'running') throw new Error(`"${item.name}" is ${item.status}, not running.`);
    const [where] = rest;
    if (!where?.trim()) throw new Error('say where it has got to: npm run queue -- progress "<name>" "<where it is>"');
    item.progress = where.trim();
    item.progressAt = at;
    msg = `"${item.name}" is at: ${item.progress}`;
  } else {
    if (!item) {
      const names = q.items.filter((i) => i.status !== 'done').map((i) => `"${i.name}"`).join(', ') || 'none';
      throw new Error(`no running or queued item is named "${name}". Open items: ${names}.`);
    }
    const was = item.status;
    item.status = 'done';
    item.finished = at;
    msg = `"${item.name}" was ${was}, now done${item.started ? ` after ${Math.round((Date.parse(at) - Date.parse(item.started)) / 60000)} min` : ''}.`;
  }
  q.updatedAt = at;
  writeAtomic(FILE, format(q));
  return { q, msg };
}).catch((e) => { console.error(`queue: ${e.message}`); process.exit(1); });

if (result.msg) console.log(`queue: ${result.msg}`);
else for (const i of result.q.items) console.log(`${(i.status ?? '?').padEnd(8)} ${i.name}${i.started ? `  (started ${i.started})` : ''}${i.finished ? `  (done ${i.finished})` : ''}`);
