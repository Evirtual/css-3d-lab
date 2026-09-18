// Deploy step: copies the demo videos listed in src/reels.json from the GitHub release "reels"
// into dist/media/reels, then checks every one arrived with exactly the recorded size. A missing
// or different file fails the deploy: the site never shows a "Download video" button for a file
// that is not there (or is not the one we measured).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const manifest = JSON.parse(readFileSync('src/reels.json', 'utf8'));
const ids = Object.keys(manifest);
if (!ids.length) {
  console.log('reels: none listed in src/reels.json, nothing to fetch');
  process.exit(0);
}

const OUT = 'dist/media/reels';
mkdirSync(OUT, { recursive: true });
const r = spawnSync('gh', ['release', 'download', 'reels', '--pattern', '*-9x16.mp4', '--dir', OUT, '--clobber'], { stdio: 'inherit' });
if (r.status !== 0) throw new Error('could not download the "reels" release');

// only what the manifest lists goes live
for (const f of readdirSync(OUT)) if (!manifest[f.replace('-9x16.mp4', '')]) rmSync(join(OUT, f));

const wrong = ids.filter((id) => {
  const f = join(OUT, `${id}-9x16.mp4`);
  return !existsSync(f) || statSync(f).size !== manifest[id].bytes;
});
if (wrong.length) throw new Error(`reels: missing or not the recorded size: ${wrong.join(', ')}`);
const total = ids.reduce((n, id) => n + manifest[id].bytes, 0);
console.log(`reels: ${ids.length} videos in ${OUT} (${(total / 1e6).toFixed(0)} MB), all the recorded size`);
