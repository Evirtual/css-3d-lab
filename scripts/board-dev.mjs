/**
 * The board, with the page served from source instead of from the build.
 *
 *   npm run board:dev      then open the address it prints
 *
 * WHY
 *
 * `npm run board` serves docs/, which holds the BUILT page. That is the right thing for using the
 * ledger: it is the same file anybody else gets, and it needs no toolchain. It is the wrong thing
 * for changing the ledger, because every edit to src/ledger has to be built before it can be seen,
 * and an edit you cannot see is an edit you cannot judge.
 *
 * So this runs both: the board on its usual port, which owns the data and the run buttons, and
 * Vite on another, which serves src/ledger/ledger.html with its TypeScript and Sass compiled on
 * demand and reloaded in place. Vite passes /api, /ledger.json and /ledger-watch.json straight
 * through to the board, so the page on the Vite port is the real board -- the same state, the same
 * buttons, the same runs -- drawn from source.
 *
 * Nothing here is needed to USE the ledger. `npm run board` remains the one command for that.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const clock = () => new Date().toTimeString().slice(0, 8);

/** Both children are ours: whichever way this process ends, neither is left running. */
const kids = [];
function run(label, argv) {
  const child = spawn(process.execPath, argv, { cwd: ROOT, stdio: 'inherit', windowsHide: true });
  child.on('exit', (code) => {
    console.log(`${clock()} ${label} exited (${code}); stopping the other one too`);
    bye(code ?? 0);
  });
  kids.push(child);
  return child;
}
let leaving = false;
function bye(code) {
  if (leaving) return;
  leaving = true;
  for (const k of kids) { try { k.kill(); } catch { /* already gone */ } }
  process.exit(code);
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => bye(0));

console.log(`${clock()} board:dev — the board owns the data and the runs; Vite serves the page from src/ledger`);
run('board', [join(ROOT, 'scripts', 'ledger-watch.mjs')]);
/*
 * THE ADDRESS THAT MATTERS IS VITE'S, NOT THE BOARD'S.
 *
 * The board prints "the ledger is at 127.0.0.1:5178", which serves docs/ -- the BUILT page. That
 * is the right address for `npm run board` and the wrong one here: on it, every edit to src/ledger
 * needs a build before it can be seen, which is the exact thing this script exists to avoid.
 * Both of us spent an afternoon on it, rebuilding after every change and wondering why the page
 * would not update.
 *
 * Vite prints its own address, and it binds localhost rather than 127.0.0.1 -- so checking
 * 127.0.0.1 on its port answers nothing and reads like Vite is not running. This says which is
 * which, after Vite has printed, so the last line on the screen is the one to open.
 */
run('vite', [join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), '--config', join(ROOT, 'vite.ledger.config.ts')]);
setTimeout(() => {
  console.log('');
  console.log(`${clock()} two addresses, and they are not the same page:`);
  console.log(`  http://localhost:5173/ledger.html   the board, compiled from src/ledger as you edit it — OPEN THIS ONE`);
  console.log(`  http://127.0.0.1:5178/ledger.html   the built page, as anybody else gets it — the board rebuilds it when src/ledger changes`);
  console.log(`  Vite binds localhost, not 127.0.0.1, so its port answers nothing on the other name.`);
  console.log('');
}, 2500);
