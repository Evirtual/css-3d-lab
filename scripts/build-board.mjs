/**
 * Builds the board's page from its source, so nobody has to remember to.
 *
 *   node scripts/build-board.mjs        (npm run build:ledger does the same through Vite)
 *
 * WHY THE BOARD BUILDS ITS OWN PAGE. docs/ledger.html used to be built by hand and committed. On
 * 2026-09-29 a fresh clone opened a board ten commits older than its own source: the header work
 * of that afternoon was in src/ledger and the page being served was from before it. A built file
 * that is committed is a copy somebody has to keep in step, and a copy somebody has to keep in
 * step is eventually wrong.
 *
 * So the built page is no longer in the repository (.gitignore names it). scripts/ledger-watch.mjs
 * calls this when the board starts and again whenever src/ledger, the build's config, README.md or
 * LICENSE changes, and the page in docs/ is always the page the source describes.
 *
 * It returns what happened rather than throwing: a page that failed to build must not stop the
 * board from serving the last one that did, and the board says which of the two it is showing.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './model-sources.mjs';

/** Everything the built page is made from. A change to any of it means the page on disk is old. */
export const BOARD_SOURCES = ['src/ledger', 'vite.ledger.config.ts', 'README.md', 'LICENSE'];

const stamp = (file) => { try { const s = statSync(file); return `${s.mtimeMs}:${s.size}`; } catch { return 'missing'; } };
function tree(path, out) {
  let names;
  try { names = readdirSync(path, { withFileTypes: true }); } catch { out.push(`${path}=${stamp(path)}`); return out; }
  for (const d of names) {
    const full = join(path, d.name);
    if (d.isDirectory()) tree(full, out);
    else out.push(`${full}=${stamp(full)}`);
  }
  return out;
}
/** One string that changes when any source of the page does. Reads no file's contents. */
export const boardStamp = () => BOARD_SOURCES.flatMap((p) => tree(join(ROOT, p), [])).join('|');

export function buildBoard() {
  const at = Date.now();
  const r = spawnSync(process.execPath, [join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--config', 'vite.ledger.config.ts', '--logLevel', 'error'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true });
  const ms = Date.now() - at;
  if (r.status === 0) return { ok: true, ms };
  const said = `${r.stderr ?? ''}\n${r.stdout ?? ''}`.split('\n').map((l) => l.trim()).filter(Boolean);
  return { ok: false, ms, error: r.error ? String(r.error.message).split('\n')[0] : (said.find((l) => /error/i.test(l)) ?? said[0] ?? `vite exited ${r.status}`) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const r = buildBoard();
  console.log(r.ok ? `the board's page was built in ${(r.ms / 1000).toFixed(1)} s: docs/ledger.html` : `the board's page did NOT build: ${r.error}`);
  process.exit(r.ok ? 0 : 1);
}
