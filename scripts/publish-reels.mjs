// Publishes demo videos for the site's "Download video" button:
//   1. uploads reels/<id>-9x16.mp4 to the GitHub release "reels" (created if missing; replaces
//      an older file of the same name),
//   2. records each file's exact size in src/reels.json — commit that file afterwards.
// The videos themselves never go into git; the deploy downloads them (scripts/fetch-reels.mjs).
//
//   npm run build
//   npm run reels -- <id ...> --scale 2 --crf 18     (or --all; 1080 × 1920 is what the site offers)
//   node scripts/publish-reels.mjs <id ...>          (or --all: every video in reels/)
//
// Needs the GitHub CLI (gh), signed in to an account that can write to the repo.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TAG = 'reels';
const MANIFEST = 'src/reels.json';
const args = process.argv.slice(2);
const files = args.includes('--all')
  ? readdirSync('reels').filter((f) => f.endsWith('-9x16.mp4'))
  : args.filter((a) => !a.startsWith('--')).map((id) => `${id}-9x16.mp4`);
if (!files.length) {
  console.log('Usage: node scripts/publish-reels.mjs <id ...>   or   --all');
  process.exit(1);
}
const missing = files.filter((f) => !existsSync(join('reels', f)));
if (missing.length) throw new Error(`Not rendered yet (run npm run reels first): ${missing.join(', ')}`);

const known = new Set(JSON.parse(readFileSync('src/generated/demo-ids.json', 'utf8')).map((d) => d.id));
const unknown = files.map((f) => f.replace('-9x16.mp4', '')).filter((id) => !known.has(id));
if (unknown.length) throw new Error(`No such demo: ${unknown.join(', ')}`);

const gh = (...a) => {
  const r = spawnSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) throw new Error(`gh ${a.slice(0, 2).join(' ')} failed: ${r.stderr.trim()}`);
  return r.stdout;
};

if (spawnSync('gh', ['release', 'view', TAG], { stdio: 'ignore' }).status !== 0) {
  gh('release', 'create', TAG, '--title', 'Demo videos', '--notes', 'Vertical 1080 × 1920 videos of the demos, served by the site\'s "Download video" buttons. Managed by scripts/publish-reels.mjs.', '--latest=false');
  console.log(`created release "${TAG}"`);
}

// in batches: one gh call per file would take ages, one call for everything is fragile
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
for (let i = 0; i < files.length; i += 10) {
  const batch = files.slice(i, i + 10);
  gh('release', 'upload', TAG, '--clobber', ...batch.map((f) => join('reels', f)));
  for (const f of batch) manifest[f.replace('-9x16.mp4', '')] = { bytes: statSync(join('reels', f)).size };
  process.stdout.write(`uploaded ${Math.min(i + 10, files.length)} of ${files.length}\r`);
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');
const total = Object.values(sorted).reduce((n, r) => n + r.bytes, 0);
console.log(`\n${files.length} uploaded; ${MANIFEST} now lists ${Object.keys(sorted).length} videos (${(total / 1e6).toFixed(0)} MB). Commit it to show the buttons.`);
