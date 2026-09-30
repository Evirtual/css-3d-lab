/**
 * The site AS SERVED, after a deploy — not the dist/ it was built from.
 *
 *   npm run check-live                          the live site in the sitemap
 *   npm run check-live -- --base https://…      somewhere else
 *   npm run check-live -- --keep                leave the download for check-seo --dist
 *
 * WHY THIS IS NOT THE SAME AS THE CHECKS THAT RUN BEFORE A PUSH. Everything under "The build" on
 * the release checklist runs against dist/ on the machine that built it: QA, the SEO check over
 * 416 pages, the share images. That proves what was BUILT. It cannot prove what is SERVED, and
 * between the two sit a deploy workflow, a CDN, and a host that may add, cache or rewrite things.
 * Of 57 checklist items only 8 ever touch anything outside the building machine, and until this
 * ran, two of those were the whole of what was known about the live site.
 *
 * So this fetches the real thing over HTTPS and asks four questions of it:
 *
 *   1. IS EVERY PAGE THERE?     every URL in the live sitemap answers 200 as HTML.
 *   2. IS IT THE BUILD WE MADE? the page's own ?v= build stamp matches the one in dist/.
 *   3. ARE THE PICTURES THERE?  every og:image a page names answers 200 as an image, at the size
 *                               the tags claim. A share preview that 404s is invisible until
 *                               somebody pastes a link into a chat.
 *   4. DOES IT KNOW THE WORKER? the served JS carries the capture endpoint, so Video and Image
 *                               work for a visitor and not only on a developer's machine.
 *
 * It downloads into .media-tmp/live/ so `npm run check-seo -- --dist .media-tmp/live` can then run
 * the FULL SEO check over what is actually served, which is the point of keeping the files.
 *
 * It only reads. Nothing here deploys, writes to the site, or changes anything but that folder.
 */
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i === -1 ? fallback : args[i + 1]; };
const KEEP = args.includes('--keep');
const OUT = join(process.cwd(), '.media-tmp', 'live');

/** The site the built pages call home, so nothing has to be typed twice. */
function siteFromBuild() {
  try {
    const map = readFileSync(join(process.cwd(), 'dist', 'sitemap.xml'), 'utf8');
    return new URL(map.match(/<loc>([^<]+)<\/loc>/)[1]).origin;
  } catch { return null; }
}
const BASE = (opt('--base', siteFromBuild()) ?? '').replace(/\/$/, '');
if (!BASE) { console.error('No site to check. Pass --base https://… , or build first so dist/sitemap.xml names one.'); process.exit(2); }

const get = async (url, as = 'text') => {
  const r = await fetch(url, { redirect: 'follow' });
  const body = as === 'buffer' ? Buffer.from(await r.arrayBuffer()) : await r.text();
  return { ok: r.ok, status: r.status, type: r.headers.get('content-type') ?? '', body, url: r.url };
};

const problems = [];
/*
 * Every line is also a record. These four release-checklist items -- the deploy succeeded, the
 * served site is the built site, the share images and the Worker endpoint are served, what is
 * served passes the same SEO check -- read "not evaluated" however often this ran, because it
 * printed its findings and exited. On 2026-09-29 every one of them was verified by hand after a
 * deploy and the board still said nothing had answered them.
 *
 * `key` is what a proof looks for, so rewording a line here does not silently unhook it.
 */
const tests = [];
const note = (ok, what, detail, key = null) => {
  console.log(`  ${ok ? 'ok  ' : 'BAD '} ${what}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${what}: ${detail}`);
  tests.push({ key, ok, what, detail: detail ?? null });
};

console.log(`\nThe site as served: ${BASE}\n`);

/* ---------------- 1. every page in the sitemap ---------------- */
const map = await get(`${BASE}/sitemap.xml`);
if (!map.ok) { console.error(`  BAD  sitemap.xml — ${map.status}`); process.exit(1); }
const urls = [...map.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`sitemap: ${urls.length} urls`);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let served = 0;
const pages = [];
for (const url of urls) {
  const r = await get(url);
  if (!r.ok || !/text\/html/.test(r.type)) { note(false, url.replace(BASE, '') || '/', `${r.status} ${r.type.split(';')[0]}`); continue; }
  served++;
  pages.push({ url, html: r.body });
  // keep it where check-seo --dist expects: <path>/index.html
  const path = new URL(url).pathname.replace(/\/$/, '');
  const file = join(OUT, path === '' ? 'index.html' : `${path.slice(1)}/index.html`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, r.body);
}
note(served === urls.length, 'every page in the sitemap is served as HTML', `${served} of ${urls.length}`, 'deployed');

// The files those pages reference, fetched once each, so the copy on disk is a COPY and not just
// its text. Without this every stylesheet, script and icon reads as a dead link to check-seo and
// every page weighs nothing, which is a fault in the download and not in the site.
const assets = new Set();
for (const p of pages) {
  for (const m of p.html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = m[1];
    if (/^(data:|mailto:|#)/.test(raw)) continue;
    let u;
    try { u = new URL(raw, p.url); } catch { continue; }
    if (u.origin !== new URL(BASE).origin) continue;
    if (!/.[a-z0-9]{2,5}$/i.test(u.pathname)) continue; // no extension = a page, not a file
    assets.add(u.href.split('#')[0]);
  }
}
let gotAssets = 0;
for (const href of assets) {
  const r = await get(href);
  if (!r.ok) continue;
  const path = new URL(href).pathname.replace(/^\//, '');
  if (!path) continue;
  const file = join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, r.body);
  gotAssets++;
}
note(gotAssets > 0, 'the files those pages reference are served', `${gotAssets} of ${assets.size} fetched into .media-tmp/live/`);

/* ---------------- 2. is it the build we made? ---------------- */
/*
 * COMPARE THE PAGES, NOT THE CLOCK.
 *
 * This compared the ?v= stamps, and that stamp is IMAGE_VERSION in scripts/generate-pages.mjs:
 * `new Date()` at build time, to the minute. GitHub Actions builds the deploy and a developer
 * builds locally, so the two clocks can never agree and the test failed on every correct deploy.
 * On 2026-09-29 it reported the live site was not the build while the pages were byte-identical.
 *
 * So compare the page text with the stamp stripped, which is what generate-pages.mjs itself does
 * before hashing. One caveat is said out loud rather than reported as a mismatch: the Worker
 * endpoint is baked in at build time, so a dist/ built without VITE_CAPTURE_URL differs by its
 * asset hashes for a reason that has nothing to do with the deploy.
 */
const stamp = (html) => html.match(/\?v=(\d{10,})/)?.[1] ?? null;
/*
 * AND WITHOUT CARRIAGE RETURNS. On a Windows checkout git writes scripts/generate-pages.mjs with
 * CR LF, its template literals then carry a CR, and the generated HTML has one where the Linux
 * build that was deployed has none. The two pages were byte-identical but for that one character
 * on 2026-09-30, and this line read BAD on a correct deploy. Line endings are not the build.
 */
const unstamped = (html) => String(html).replace(/\?v=\d{10,}/g, ``).replace(/\r/g, ``);
const localStamp = (() => { try { return stamp(readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf8')); } catch { return null; } })();
const liveStamp = stamp(pages[0]?.html ?? '');
const localHome = (() => { try { return readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf8'); } catch { return null; } })();
const liveHome = pages[0]?.html ?? null;
if (localHome && liveHome) {
  const same = unstamped(localHome) === unstamped(liveHome);
  /* the endpoint is baked into a JS asset, never into the page itself: the page was being asked
     and always said no, so every real difference was blamed on the variable */
  const noVar = !same && !(() => { try { return readdirSync(join(process.cwd(), 'dist', 'assets')).some((f) => f.endsWith('.js') && readFileSync(join(process.cwd(), 'dist', 'assets', f), 'utf8').includes('workers.dev')); } catch { return false; } })();
  note(same, 'the served pages are the build in dist/',
    same ? `identical once the build stamp is set aside (live ?v=${liveStamp}, dist ?v=${localStamp}: two builds, two clocks)`
      : noVar ? `they differ, and dist/ was built WITHOUT VITE_CAPTURE_URL, so its asset hashes differ for that reason alone: rebuild with the variable set and compare again`
      : `the served home page and dist/index.html differ beyond the build stamp`,
    'built');
} else note(true, 'the served pages are the build in dist/', 'no local dist/ to compare with (skipped)', 'built');

/* ---------------- 3. the share images the tags name ---------------- */
const imgs = [...new Set(pages.map((p) => p.html.match(/property="og:image"\s+content="([^"]+)"/)?.[1]).filter(Boolean))];
let goodImgs = 0;
for (const src of imgs.slice(0, 12)) {
  const r = await get(src, 'buffer');
  const isJpeg = r.body[0] === 0xff && r.body[1] === 0xd8;
  const isPng = r.body.slice(1, 4).toString() === 'PNG';
  if (r.ok && (isJpeg || isPng)) goodImgs++;
  else note(false, `og:image ${src.replace(BASE, '')}`, `${r.status}, ${r.body.length} bytes, not a picture`);
}
note(goodImgs === Math.min(imgs.length, 12), 'the share images the tags name are served as pictures', `${goodImgs} of ${Math.min(imgs.length, 12)} checked (of ${imgs.length} distinct)`, 'images');

/* ---------------- 4. does the served JS know the Worker? ---------------- */
const home = pages.find((p) => new URL(p.url).pathname === '/') ?? pages[0];
const scripts = [...(home?.html.matchAll(/<script[^>]+src="([^"]+\.js)"/g) ?? [])].map((m) => new URL(m[1], BASE).href);
// The entry scripts AND the chunks they import. The endpoint is not in an entry script and is not
// meant to be: the export dialog is lazily mounted, so it rides in that chunk and arrives when a
// visitor opens the dialog. Reading only the entry scripts reported a configuration fault on a
// site that was configured correctly.
let endpoint = null;
const looked = [];
// Start from the entry scripts AND the modulepreload links, which is where Vite declares the
// chunks a page will need. The endpoint rides in a lazily mounted chunk, named in main as
// "./lazy-mount-XXXX.js" -- relative, with no /assets/ in it, which an earlier version of the
// pattern below insisted on and so followed nothing at all.
const preloads = [...(home?.html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g) ?? [])].map((m) => new URL(m[1], BASE).href);
const queue = [...new Set([...scripts.slice(0, 8), ...preloads])];
const seen = new Set(queue);
for (let i = 0; i < queue.length && i < 40 && !endpoint; i++) {
  const r = await get(queue[i]);
  looked.push(queue[i].replace(BASE, ''));
  if (!r.ok) continue;
  const hit = r.body.match(/https:\/\/[a-z0-9.-]*workers\.dev\/[a-z]+/i);
  if (hit) { endpoint = hit[0]; break; }
  for (const m of r.body.matchAll(/["'`](\.{0,2}\/[A-Za-z0-9._\/-]+\.js)["'`]/g)) {
    const u = new URL(m[1], queue[i]).href;
    if (!seen.has(u)) { seen.add(u); queue.push(u); }
  }
}
note(Boolean(endpoint), 'the served JS carries the capture endpoint', endpoint ?? `no workers.dev URL in ${looked.length} served script(s) (${looked.slice(0, 4).join(', ')}${looked.length > 4 ? ', …' : ''}) — Video and Image would say "Export service is not configured yet"`, 'endpoint');

/* ---------------- what to do next ---------------- */
/*
 * THE SAME SEO CHECK, OVER WHAT IS ACTUALLY SERVED.
 *
 * The checklist line asks whether what is SERVED passes the same SEO check as what was built,
 * and nothing here answered it: the download was made and the check was left as a suggestion in
 * the closing message. A line answered by a suggestion is a line answered by nobody.
 */
try {
  const { execFileSync: run } = await import('node:child_process');
  // these two are served but are not pages, so nothing above fetched them; check-seo looks for
  // them in the folder it is given and reported them missing from the site itself
  for (const name of ['sitemap.xml', 'robots.txt']) {
    const r = await get(`${BASE}/${name}`);
    if (r.ok) writeFileSync(join(OUT, name), r.body);
  }
  run(process.execPath, ['scripts/check-seo.mjs', '--dist', OUT], { cwd: new URL('..', import.meta.url), stdio: 'ignore', timeout: 600000 });
  note(true, 'what is served passes the same SEO check as what was built', 'check-seo over the downloaded copy', 'seo');
} catch (e) {
console.log(`\n${problems.length ? `${problems.length} problem(s)` : 'Nothing wrong'} with ${BASE}.`);
if (KEEP || !problems.length) console.log(`\nThe served pages are in .media-tmp/live/. The full SEO check over what is ACTUALLY served:\n  npm run check-seo -- --dist .media-tmp/live\n`);
/*
 * A PROBLEM IS WHEN THE EVIDENCE IS MOST WANTED, NOT LEAST.
 *
 * This deleted the downloaded site whenever anything failed. On 2026-09-29 the only failure was
 * the build-stamp comparison, which could not pass by construction -- and it took .media-tmp/live
 * with it, so `check-seo -- --dist .media-tmp/live` could not run at all. One bad comparison
 * disabled an unrelated check.
 */
// (kept)
  note(false, 'what is served passes the same SEO check as what was built', `check-seo over the downloaded copy did not pass (run it yourself: npm run check-seo -- --dist .media-tmp/live)`, 'seo');
}
try {
  const { execFileSync } = await import('node:child_process');
  const HERE = new URL('..', import.meta.url);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: HERE, encoding: 'utf8' }).trim();
  writeFileSync(new URL('docs/checks/live.json', HERE), `${JSON.stringify({
    note: 'Written by scripts/check-live.mjs: the site AS SERVED, after a deploy. Four release-checklist lines read this. Not a check of dist/ -- of what is actually answering.',
    at: new Date().toISOString(),
    commit,
    base: BASE,
    ok: problems.length === 0,
    tests,
  }, null, 2)}\n`);
} catch (e) {
  console.log(`(could not write docs/checks/live.json: ${String(e?.message ?? e).split(String.fromCharCode(10))[0]})`);
}
process.exit(problems.length ? 1 : 0);
