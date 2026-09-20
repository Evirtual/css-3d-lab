// Publishes the transparent stickers for the site's "Transparent" download button:
//   1. uploads stickers/<id>.webp to the GitHub release "reels" as css-3d-lab-<id>.webp
//      (the same release as the MP4s; an older file is replaced),
//   2. records each file's exact size in src/reels.json as `webp` — commit that file afterwards.
// The files never go into git or into the Pages site: release downloads do not count toward Pages
// bandwidth, and the deploy checks them (scripts/verify-reels.mjs).
//
//   npm run build
//   npm run stickers -- --all
//   node scripts/publish-stickers.mjs <id ...>        (or --all: every sticker in stickers/)
//
// Needs the GitHub CLI (gh), signed in to an account that can write to the repo.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const TAG = 'reels';
const MANIFEST = 'src/reels.json';
const args = process.argv.slice(2);
const ids = args.includes('--all')
  ? readdirSync('stickers')
      .filter((f) => f.endsWith('.webp') && !f.endsWith('-lossless.webp'))
      .map((f) => f.replace('.webp', ''))
  : args.filter((a) => !a.startsWith('--'));
if (!ids.length) {
  console.log('Usage: node scripts/publish-stickers.mjs <id ...>   or   --all');
  process.exit(1);
}

const file = (id) => join('stickers', `${id}.webp`);
const missing = ids.filter((id) => !existsSync(file(id)));
if (missing.length) throw new Error(`Not filmed yet (run npm run stickers -- <ids> first): ${missing.join(', ')}`);

const known = new Set(JSON.parse(readFileSync('src/generated/model-ids.json', 'utf8')).map((d) => d.id));
const unknown = ids.filter((id) => !known.has(id));
if (unknown.length) throw new Error(`No such demo: ${unknown.join(', ')}`);

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const noVideo = ids.filter((id) => !manifest[id]);
if (noVideo.length) throw new Error(`These have no video yet, so the button would not show: ${noVideo.join(', ')}`);

const gh = (...a) => {
  const r = spawnSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) throw new Error(`gh ${a.slice(0, 2).join(' ')} failed: ${r.stderr.trim()}`);
  return r.stdout;
};

// in batches: one gh call per file would take ages, one call for everything is fragile
const STAGE = join('stickers', 'upload');
mkdirSync(STAGE, { recursive: true });
const asset = (id) => join(STAGE, `css-3d-lab-${id}.webp`);
for (let i = 0; i < ids.length; i += 10) {
  const batch = ids.slice(i, i + 10);
  for (const id of batch) copyFileSync(file(id), asset(id));
  gh('release', 'upload', TAG, '--clobber', ...batch.map(asset));
  for (const id of batch) manifest[id] = { ...manifest[id], webp: statSync(file(id)).size };
  process.stdout.write(`uploaded ${Math.min(i + 10, ids.length)} of ${ids.length}\r`);
}
rmSync(STAGE, { recursive: true, force: true });

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
const withWebp = Object.values(manifest).filter((r) => r.webp);
const mb = withWebp.reduce((sum, r) => sum + r.webp, 0) / 1e6;
console.log(`\n${ids.length} uploaded; ${MANIFEST} now lists ${withWebp.length} stickers (${mb.toFixed(0)} MB). Commit it to show the buttons.`);
