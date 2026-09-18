// Publishes demo videos for the site's "Download video" button:
//   1. uploads the CLEAN video reels/<id>-9x16-clean.mp4 (no title, a small corner mark; the
//      branded ones are for your own posts and stay local) to the GitHub release "reels" as
//      css-3d-lab-<id>.mp4 (the name
//      people's download gets; the release is created if missing; an older file is replaced),
//   2. records each file's exact size in src/reels.json — commit that file afterwards.
// The videos never go into git or into the Pages site: the buttons link to the release, whose
// downloads do not count toward Pages bandwidth. The deploy checks them (scripts/verify-reels.mjs).
//
//   npm run build
//   npm run reels -- <id ...> --clean --scale 2 --crf 18   (or --all; 1080 × 1920 is what the site offers)
//   node scripts/publish-reels.mjs <id ...>          (or --all: every video in reels/)
//
// Needs the GitHub CLI (gh), signed in to an account that can write to the repo.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TAG = 'reels';
const MANIFEST = 'src/reels.json';
const args = process.argv.slice(2);
const files = args.includes('--all')
  ? readdirSync('reels').filter((f) => f.endsWith('-9x16-clean.mp4'))
  : args.filter((a) => !a.startsWith('--')).map((id) => `${id}-9x16-clean.mp4`);
if (!files.length) {
  console.log('Usage: node scripts/publish-reels.mjs <id ...>   or   --all');
  process.exit(1);
}
const missing = files.filter((f) => !existsSync(join('reels', f)));
if (missing.length) throw new Error(`Not rendered yet (run npm run reels -- <ids> --clean first): ${missing.join(', ')}`);

const known = new Set(JSON.parse(readFileSync('src/generated/demo-ids.json', 'utf8')).map((d) => d.id));
const idOf = (f) => f.replace('-9x16-clean.mp4', '');
const unknown = files.map(idOf).filter((id) => !known.has(id));
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
const STAGE = join('reels', 'upload');
mkdirSync(STAGE, { recursive: true });
const asset = (f) => join(STAGE, `css-3d-lab-${idOf(f)}.mp4`);
for (let i = 0; i < files.length; i += 10) {
  const batch = files.slice(i, i + 10);
  for (const f of batch) copyFileSync(join('reels', f), asset(f));
  gh('release', 'upload', TAG, '--clobber', ...batch.map(asset));
  for (const f of batch) manifest[idOf(f)] = { bytes: statSync(join('reels', f)).size };
  process.stdout.write(`uploaded ${Math.min(i + 10, files.length)} of ${files.length}\r`);
}

rmSync(STAGE, { recursive: true, force: true });

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');
const total = Object.values(sorted).reduce((n, r) => n + r.bytes, 0);
console.log(`\n${files.length} uploaded; ${MANIFEST} now lists ${Object.keys(sorted).length} videos (${(total / 1e6).toFixed(0)} MB). Commit it to show the buttons.`);
