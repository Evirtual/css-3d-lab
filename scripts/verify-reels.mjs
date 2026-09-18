// Deploy check for the "Download video" buttons. The videos are served straight from the repo's
// "reels" release (release downloads do not count toward GitHub Pages bandwidth), so nothing is
// copied into the site. This asks GitHub for the release's files and fails the deploy if any video
// listed in src/reels.json is missing or not the recorded size: a button never points at a file
// that is not there, or is not the one we measured.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('src/reels.json', 'utf8'));
const ids = Object.keys(manifest);
if (!ids.length) {
  console.log('reels: none listed in src/reels.json');
  process.exit(0);
}
const r = spawnSync('gh', ['release', 'view', 'reels', '--json', 'assets'], { encoding: 'utf8' });
if (r.status !== 0) throw new Error(`could not read the "reels" release: ${r.stderr}`);
const sizes = new Map(JSON.parse(r.stdout).assets.map((a) => [a.name, a.size]));
const wrong = ids.filter((id) => sizes.get(`css-3d-lab-${id}.mp4`) !== manifest[id].bytes);
if (wrong.length) throw new Error(`reels: missing from the release or not the recorded size: ${wrong.join(', ')}`);
console.log(`reels: all ${ids.length} listed videos are on the release at the recorded size`);
