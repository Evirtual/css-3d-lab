/**
 * Checks every model's social preview: the picture and the words a chat app or social site shows
 * when a model page is shared. Run it on the BUILT site, after the images are made:
 *
 *   npm run build && npm run media
 *   node scripts/check-media.mjs              every model      (npm run check-media)
 *   node scripts/check-media.mjs cube dice    just these
 *   node scripts/check-media.mjs --dist <dir> another built copy (the broken copies that prove it)
 *   node scripts/check-media.mjs --keep <dir> also write each fresh render there, to look at
 *
 * It prints `pass <id> …` or `FAILS <id> …` per model, the reasons indented under a failure, and
 * ends with `N/M share previews are right.` (exit 1 when any is not). scripts/capture-check.mjs
 * records those lines for the ledger (`npm run capture -- media <ids>`).
 *
 * For each model:
 *
 * 1. THE FILE IS THE SIZE THE TAGS SAY. dist/media/<id>.jpg is a JPEG (its own header, not its
 *    name) of 2400 × 1260. dist/models/<id>/index.html's og:image and twitter:image both point at
 *    exactly that file on the site's address with a ?v= version, and og:image:type, :width and
 *    :height say image/jpeg, 2400 and 1260; twitter:card is summary_large_image.
 *
 * 2. THE WORDS ARE THE MODEL'S OWN. The title and description are read from the model's gallery
 *    entry in src/models (loaded through Vite, as generate-pages loads them), never from the built
 *    page. og:title must be the page's <title> and start with "<title> in <pure CSS | CSS +
 *    JavaScript>"; og:description must be the page's meta description and be the model's
 *    description, whole or cut cleanly (at a sentence end, or at a clause boundary with "…": see
 *    descriptionCut); og:image:alt and twitter:image:alt must start with "<title>:"; og:url is the
 *    model's own address. The headline drawn IN the image is read from the DOM of the page the
 *    image is shot from (/embed/<id>/?og=1, after generate-media's fitText): its text must be the
 *    title, every line must fit its column (fitText shrinks it to 24px and no further, so a line
 *    can still run over), it must stay inside the text panel, clear of the line under it and of
 *    the model's side.
 *
 * 3. THE PICTURE IS THE MODEL AS THE SITE RENDERS IT NOW. The og page is rendered again, fresh,
 *    exactly as generate-media shoots it (scripts/og-shot.mjs: same page, size, pointer and
 *    moment; a control that opens, tagged 'expands', opened the same way, since the image shows it
 *    open: see og-shot's EXCEPT A CONTROL THAT OPENS), and:
 *    - the model's frame is the current code: its document is compared with what
 *      src/models/snippet-utils.ts standaloneDoc() makes from the snippet in src/models now, so a
 *      dist/ built before a model changed fails here, not silently;
 *    - it loaded: the frame was ready, no page error, no failed request, every image in it
 *      decoded, the fonts of the page and the frame loaded;
 *    - its first frame is finished at the moment of the shot: of the animations og-shot.mjs stopped,
 *      none is running again and no run-once animation or transition is short of its end (they are
 *      stopped at their end). Animations a script starts after the stop (the split-flap board's
 *      flaps) cannot be stopped from outside; they are named on the pass line;
 *    - the file is that render: the share of pixels that differ by more than DIFF (of 255, in any
 *      channel) between the JPEG and the fresh render, in the model's area and in the text panel,
 *      is at most MATCH. A model that moves in script (seen by rendering it twice, WOBBLE_GAP ms
 *      apart) cannot be stopped at a moment, so its area is instead compared at 1/16 scale;
 *    - it is not blank: in the JPEG itself, at least VISIBLE of the model's area differs from the
 *      same page rendered with the model hidden;
 *    - centred and full-sized per docs/VIEW-CONTRACT.md, judged on painted pixels as
 *      check-models does (the page and stage backdrop taken off, the frame photographed on
 *      nothing): solid ink (alpha 128+) at least 40vmin and at most 70vmin tall, at most 92vmin
 *      wide, within 4vmin of the middle (vertically 11 with a control zone), not reaching the
 *      canvas edge (a model tagged 'wide' is sized by width instead: at least 80vmin wide and no
 *      height floor, as check-models judges it); a model whose faint ink (alpha 24+) covers 95%
 *      of the canvas each way is a full-canvas scene and must cover 98%. Here the canvas is the
 *      og layout's model area and the pose is the one the image shows, not every pose
 *      check-models goes through: the resting
 *      pose, or for a control that opens ('expands') its open pose, so that is the pose judged
 *      here, and its pass line says "shot open (<how it was opened>)".
 *
 * The thresholds were set on known-good models (see the numbers each pass line prints): over all
 * 135, the file and a fresh render differed in at most 0.41% of the model's area (the opening
 * crawl's fine text under JPEG; nearly all under 0.1%), and the least visible model (the
 * starfield) differs from the empty page in 1.2% of its area. They were proven on broken copies
 * built in .media-tmp/mediacheck/ (never committed): a wrong title in the tags, another model's
 * image, a blank model, a cropped headline, a stale image (colours changed; turned only 3 degrees:
 * 1.9%; and one of a model that moves in script), an image of the wrong size, and tags with no
 * ?v= version each fail here, while untouched models beside them pass.
 *
 * A BROKEN BROWSER BREAKS ONE MODEL AT MOST (scripts/browser-guard.mjs). A model whose run hits a
 * browser-level error (a protocol error, "Unable to capture screenshot", a goto timeout, a crashed
 * or closed target) is checked again, once, in a fresh browser (the models beside it finish first,
 * or are retried with it), and its line ends "retried after a browser failure"; only a second
 * failure makes it FAILS ("the check could not run"). Such an error is never read as "the og page
 * did not render". The browser is also replaced every 20 models; a model waits (up to 3 minutes)
 * while free memory is under 1.5 GB, and its line ends "ran under memory pressure" when it had to
 * go on anyway; and a crash inside Playwright is said on stderr with exit 3, the lines printed
 * before it kept.
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import { BrowserGuard, crashGuard, isBrowserError } from './browser-guard.mjs';
import { createServer as createVite } from 'vite';
import { MOMENT, settle, shotContext, VIEWPORT } from './og-shot.mjs';

const DIFF = 40; // a pixel differs when a channel is this far apart (of 255): above JPEG's own noise at quality 88
const MATCH = 0.006; // at most this share of an area may differ between the file and the fresh render: known-good models reach 0.41% (the opening crawl's fine yellow text under JPEG), deliberately stale ones 1% and more
const COARSE = 0.02; // for a model moving in script: at most this mean difference (0..1) at 1/16 scale
const VISIBLE = 0.005; // at least this share of the model's area must differ from the page without the model
const WOBBLE_GAP = 350; // ms between the two renders that tell a model moving in script
const INK = 24, SOLID = 128; // check-models' two alpha thresholds (all ink, solid body)
const BAND = 70, FLOOR = 40, WIDEST = 92, CENTRED = 4; // docs/VIEW-CONTRACT.md, as check-models reads it
const WIDE_FLOOR = 80; // a model tagged 'wide' is sized by width: at least this wide, no height floor (check-models)
const CONCURRENCY = 3;

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const DIST = resolve(opt('--dist') ?? 'dist');
const KEEP = opt('--keep');
const wanted = argv.filter((a) => !a.startsWith('-'));
if (KEEP) mkdirSync(KEEP, { recursive: true });
if (!existsSync(join(DIST, 'embed'))) { console.error(`${DIST}/embed not found: run "npm run build && npm run media" first`); process.exit(2); }

/* ---------- the models, as src/models has them now ---------- */
const site = JSON.parse(readFileSync('site.config.json', 'utf8'));
const vite = await createVite({ configFile: false, root: resolve('.'), server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { snippets } = await vite.ssrLoadModule('/src/models/snippets.ts');
const { standaloneDoc } = await vite.ssrLoadModule('/src/models/snippet-utils.ts');
const { interactionOf, expands, wide } = await vite.ssrLoadModule('/src/models/interaction.ts');
await vite.close();
const pointer = new Map(JSON.parse(readFileSync('src/generated/model-ids.json', 'utf8')).map((d) => [d.id, d.pointer]));
// how og-shot is to shoot a model: a control that opens ('expands') is shot open, the way it is played
const shotOf = (d) => ({ id: d.id, pointer: pointer.get(d.id), how: interactionOf(d), expands: expands(d) });
const unknown = wanted.filter((id) => !demos.some((d) => d.id === id));
if (unknown.length) { console.error(`No such model: ${unknown.join(', ')}`); process.exit(2); }
const list = demos.filter((d) => !wanted.length || wanted.includes(d.id));
const kind = (d) => (d.category === 'css' ? 'pure CSS' : 'CSS + JavaScript');

/* ---------- the built site, and the fresh renders, served to the browser ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const shots = new Map(); // /__mc/<key>.png → PNG buffer
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (shots.has(url.pathname)) { res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' }).end(shots.get(url.pathname)); return; }
  if (url.pathname === '/__mc/') { res.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html><title>compare</title>'); return; }
  let path = join(DIST, decodeURIComponent(url.pathname));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!existsSync(path)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(path).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
// one comparison page per worker, so the pixel work of parallel models runs in parallel; made again
// whenever scripts/browser-guard.mjs launches a fresh browser (after one breaks, and every 20 models)
let cmpCtx, cmps;
const guard = new BrowserGuard({
  launch: () => chromium.launch(),
  setup: async (b) => {
    cmpCtx = await b.newContext();
    cmps = await Promise.all(Array.from({ length: CONCURRENCY }, async () => { const p = await cmpCtx.newPage(); await p.goto(`${base}/__mc/`); return p; }));
  },
});
await guard.start();

/* ---------- 1. the file and the tags ---------- */
/** Width, height and kind from the file's own bytes: a JPEG's SOF marker. */
function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let at = 2;
  while (at + 9 < buf.length) {
    if (buf[at] !== 0xff) { at++; continue; }
    const marker = buf[at + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { at += 2; continue; }
    const len = buf.readUInt16BE(at + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: buf.readUInt16BE(at + 5), width: buf.readUInt16BE(at + 7) };
    at += 2 + len;
  }
  return null;
}
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
function metaOf(html) {
  const out = {};
  for (const m of html.matchAll(/<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"\s*\/?>/g)) out[m[1]] = unesc(m[2]);
  const title = /<title>([^<]*)<\/title>/.exec(html);
  out['<title>'] = title ? unesc(title[1]) : null;
  return out;
}
/**
 * Whether a share description is the model's own: null when it is, or why not. Search results
 * show about 160 characters, so the generator may cut a long description (the page body keeps all
 * of it; check-seo proves that). Allowed:
 *  - the full description, with or without the generator's own words after it;
 *  - a cut at a sentence end: a prefix of it ending in . ! or ?, where its next sentence begins;
 *  - a cut at a clause boundary, marked "…": a prefix that ends at (or just before) a comma,
 *    semicolon, colon or a spaced dash, then "…".
 * Anything else is not: other words, a cut in the middle of a word or a clause, an empty one.
 */
function descriptionCut(og, full) {
  if (!og || !og.trim()) return 'it is empty';
  if (og.startsWith(full)) return null;
  if (/[.!?]$/.test(og)) {
    if (!full.startsWith(og)) return 'its words are not the model\'s';
    return /^\s/.test(full.slice(og.length)) ? null : 'it stops inside a sentence';
  }
  if (og.endsWith('…')) {
    const kept = og.slice(0, -1).trimEnd();
    if (!kept || !full.startsWith(kept)) return 'its words are not the model\'s';
    if (/[,;:]$/.test(kept) || /\s[-–—]$/.test(kept) || /[–—]$/.test(kept)) return null;
    const rest = full.slice(kept.length);
    return /^\s*[,;:–—]/.test(rest) || /^\s+-\s/.test(rest) ? null : 'it is cut in the middle of a word or a clause';
  }
  return 'its words are not the model\'s, or it is cut without a sentence end or "…"';
}

function fileAndTags(d, why, facts) {
  const file = join(DIST, 'media', `${d.id}.jpg`);
  if (!existsSync(file)) why.push(`no image: ${file} does not exist`);
  else {
    const size = jpegSize(readFileSync(file));
    if (!size) why.push('the image is not a JPEG (no JPEG header and frame marker)');
    else if (size.width !== 2400 || size.height !== 1260) why.push(`the image is ${size.width} × ${size.height}, not the 2400 × 1260 the tags say`);
    facts.bytes = statSync(file).size;
  }
  const pageFile = join(DIST, 'models', d.id, 'index.html');
  if (!existsSync(pageFile)) { why.push(`no model page at ${pageFile}`); return; }
  const m = metaOf(readFileSync(pageFile, 'utf8'));
  const img = `${site.url}/media/${d.id}.jpg`;
  const version = /\?v=(\d+)$/;
  for (const tag of ['og:image', 'twitter:image']) {
    const v = m[tag];
    if (!v) why.push(`${tag} is missing`);
    else if (v === img) why.push(`${tag} has no ?v= version: ${v}`);
    else if (!v.startsWith(`${img}?`)) why.push(`${tag} is ${v}, not ${img}`);
    else if (!version.test(v)) why.push(`${tag} has no ?v= version: ${v}`);
  }
  if (m['og:image'] && m['twitter:image'] && m['og:image'] !== m['twitter:image']) why.push('og:image and twitter:image differ');
  facts.version = version.exec(m['og:image'] ?? '')?.[1] ?? null;
  if (m['og:image:type'] !== 'image/jpeg') why.push(`og:image:type is ${m['og:image:type'] ?? 'missing'}, not image/jpeg`);
  if (m['og:image:width'] !== '2400') why.push(`og:image:width is ${m['og:image:width'] ?? 'missing'}, not 2400`);
  if (m['og:image:height'] !== '1260') why.push(`og:image:height is ${m['og:image:height'] ?? 'missing'}, not 1260`);
  if (m['twitter:card'] !== 'summary_large_image') why.push(`twitter:card is ${m['twitter:card'] ?? 'missing'}, not summary_large_image`);
  // 2. the words: against the gallery entry in src/models
  const head = `${d.title} in ${kind(d)}`;
  if (!m['og:title']?.startsWith(head)) why.push(`og:title does not start with the model's title "${head}": "${m['og:title'] ?? 'missing'}"`);
  if (m['og:title'] !== m['<title>']) why.push(`og:title is not the page's <title>: "${m['og:title']}" / "${m['<title>']}"`);
  const cut = descriptionCut(m['og:description'], d.description);
  if (cut) why.push(`og:description is not the model's description or a clean cut of it (${cut}): "${(m['og:description'] ?? 'missing').slice(0, 90)}"`);
  if (m['og:description'] !== m.description) why.push('og:description is not the page\'s meta description');
  for (const tag of ['og:image:alt', 'twitter:image:alt']) if (!m[tag]?.startsWith(`${d.title}:`)) why.push(`${tag} does not start with "${d.title}:": "${m[tag] ?? 'missing'}"`);
  if (m['og:url'] !== `${site.url}/models/${d.id}/`) why.push(`og:url is ${m['og:url'] ?? 'missing'}, not ${site.url}/models/${d.id}/`);
}

/* ---------- 3. painted pixels (check-models' ruler) ---------- */
/** check-models' inkBoxes: the box round all ink (alpha > faint) and round solid ink (alpha >= solid) in a PNG. */
function inkBoxes(png, faint, solid) {
  let at = 8, width = 0, height = 0, depth = 0, kind = 0;
  const parts = [];
  while (at + 8 <= png.length) {
    const size = png.readUInt32BE(at);
    const tag = png.toString('latin1', at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + size);
    if (tag === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; kind = data[9]; }
    else if (tag === 'IDAT') parts.push(data);
    else if (tag === 'IEND') break;
    at += size + 12;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[kind];
  if (depth !== 8 || !channels) throw new Error(`cannot read this PNG (depth ${depth}, colour type ${kind})`);
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const row = Buffer.alloc(stride), above = Buffer.alloc(stride);
  const opaque = channels === 1 || channels === 3;
  const all = { l: Infinity, t: Infinity, r: -1, b: -1 }, body = { l: Infinity, t: Infinity, r: -1, b: -1 };
  const grow = (box, x, y) => { if (x < box.l) box.l = x; if (x > box.r) box.r = x; if (y < box.t) box.t = y; if (y > box.b) box.b = y; };
  for (let y = 0, read = 0; y < height; y++) {
    const filter = raw[read++];
    raw.copy(row, 0, read, read + stride);
    read += stride;
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? row[i - channels] : 0;
      const corner = i >= channels ? above[i - channels] : 0;
      if (filter === 1) row[i] = (row[i] + left) & 255;
      else if (filter === 2) row[i] = (row[i] + above[i]) & 255;
      else if (filter === 3) row[i] = (row[i] + ((left + above[i]) >> 1)) & 255;
      else if (filter === 4) {
        const guess = left + above[i] - corner;
        const dl = Math.abs(guess - left), du = Math.abs(guess - above[i]), dc = Math.abs(guess - corner);
        row[i] = (row[i] + (dl <= du && dl <= dc ? left : du <= dc ? above[i] : corner)) & 255;
      }
    }
    row.copy(above);
    if (opaque) { for (const box of [all, body]) { grow(box, 0, y); grow(box, width - 1, y); } continue; }
    for (let x = 0; x < width; x++) {
      const alpha = row[x * channels + channels - 1];
      if (alpha <= faint) continue;
      grow(all, x, y);
      if (alpha >= solid) grow(body, x, y);
    }
  }
  const out = (box) => (box.r < 0 ? null : { l: box.l, t: box.t, r: box.r + 1, b: box.b + 1, width, height });
  return { all: out(all), solid: out(body) };
}
const BARE = `html, body, .embed, .stage { background: none !important; border: 0 !important; }
.stage::before, .stage::after { display: none !important; }
.embed__credit, .embed__og { display: none !important; }`;

/** Runs in the page: the headline as drawn, and whether it fits. */
function readHeadline() {
  const og = document.querySelector('.embed__og');
  const b = og?.querySelector('b');
  if (!b) return null;
  const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const lines = [b, ...b.querySelectorAll('span')].map((l) => ({ text: l.textContent, scroll: l.scrollWidth, client: b.clientWidth }));
  const range = document.createRange();
  range.selectNodeContents(b);
  const rects = [...range.getClientRects()];
  const tops = new Set(rects.map((r) => Math.round(r.top)));
  const frame = document.querySelector('.stage iframe, .stage');
  return {
    text: b.textContent.replace(/\s+/g, ' ').trim(),
    fontSize: parseFloat(getComputedStyle(b).fontSize),
    lines: tops.size,
    overflow: lines.filter((l) => l.scroll > l.client + 1).map((l) => `"${l.text.trim().slice(0, 40)}" is ${l.scroll}px in a ${l.client}px column`),
    b: box(b),
    ink: rects.length ? { l: Math.min(...rects.map((r) => r.left)), t: Math.min(...rects.map((r) => r.top)), r: Math.max(...rects.map((r) => r.right)), b: Math.max(...rects.map((r) => r.bottom)) } : null,
    panel: box(og),
    panelOverflow: og.scrollHeight > og.clientHeight + 1,
    sub: og.querySelector('.embed__og-sub') ? box(og.querySelector('.embed__og-sub')) : null,
    tags: og.querySelector('.embed__og-tags') ? box(og.querySelector('.embed__og-tags')) : null,
    model: frame ? box(frame) : null,
    view: { w: innerWidth, h: innerHeight },
  };
}

/** Runs in the model's frame: is the moment of the shot a finished one, and did the frame load? */
function readFrame() {
  const doc = document;
  const frozen = window.c3dOgFrozen ?? new Set();
  const anims = doc.getAnimations().map((a) => {
    const t = a.effect?.getComputedTiming();
    const finite = Boolean(t && t.iterations !== Infinity && isFinite(t.endTime));
    // started after og-shot stopped everything: a script (or the parked pointer) started it
    return { later: !frozen.has(a), running: a.playState === 'running', short: finite && (a.currentTime ?? 0) < t.endTime - 1, name: a.animationName ?? a.transitionProperty ?? a.constructor.name };
  });
  const CONTROL = 'button, label, input, select, textarea, a[href], [role="button"], [role="slider"]';
  const shows = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width >= 1 && r.height >= 1; };
  const scene = doc.querySelector('#c3d-scene');
  return {
    srcdoc: window.frameElement?.getAttribute('srcdoc') ?? null,
    scene: Boolean(scene),
    fonts: doc.fonts.status,
    images: [...doc.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src.slice(0, 60)),
    running: anims.filter((a) => a.running && !a.later).map((a) => a.name),
    unfinished: anims.filter((a) => a.short && !a.later).map((a) => a.name),
    scripted: [...new Set(anims.filter((a) => a.later && (a.running || a.short)).map((a) => a.name))],
    animations: anims.length,
    controls: scene ? [...scene.querySelectorAll(CONTROL)].some(shows) : false,
  };
}

/** Runs in the comparison page: differences between the file and the renders, per area. */
async function compare({ jpg, fresh, again, plate, model, panel, DIFF }) {
  const load = (u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error(`could not load ${u}`)); i.src = u; });
  const pixels = (img) => { const c = new OffscreenCanvas(img.naturalWidth, img.naturalHeight); const g = c.getContext('2d'); g.drawImage(img, 0, 0); return { w: img.naturalWidth, h: img.naturalHeight, d: g.getImageData(0, 0, img.naturalWidth, img.naturalHeight).data }; };
  const [J, F, A, P] = (await Promise.all([jpg, fresh, again, plate].map(load))).map(pixels);
  if (J.w !== F.w || J.h !== F.h) return { size: `${J.w}x${J.h}` };
  const share = (X, Y, r) => {
    let n = 0, big = 0;
    for (let y = Math.max(0, r.t | 0); y < Math.min(X.h, Math.ceil(r.b)); y++) for (let x = Math.max(0, r.l | 0); x < Math.min(X.w, Math.ceil(r.r)); x++) {
      const i = (y * X.w + x) * 4;
      n++;
      if (Math.abs(X.d[i] - Y.d[i]) > DIFF || Math.abs(X.d[i + 1] - Y.d[i + 1]) > DIFF || Math.abs(X.d[i + 2] - Y.d[i + 2]) > DIFF) big++;
    }
    return n ? big / n : 0;
  };
  // mean difference (0..1) at 1/16 scale: blocks of 16 × 16 averaged, for a model moving in script
  const coarse = (X, Y, r) => {
    const S = 16; let sum = 0, n = 0;
    for (let by = Math.max(0, r.t | 0); by + S <= Math.min(X.h, r.b); by += S) for (let bx = Math.max(0, r.l | 0); bx + S <= Math.min(X.w, r.r); bx += S) {
      const m = [0, 0, 0, 0, 0, 0];
      for (let y = by; y < by + S; y++) for (let x = bx; x < bx + S; x++) { const i = (y * X.w + x) * 4; for (let c = 0; c < 3; c++) { m[c] += X.d[i + c]; m[c + 3] += Y.d[i + c]; } }
      for (let c = 0; c < 3; c++) sum += Math.abs(m[c] - m[c + 3]) / (S * S * 255);
      n += 3;
    }
    return n ? sum / n : 0;
  };
  return {
    size: `${J.w}x${J.h}`,
    model: share(J, F, model), panel: share(J, F, panel),
    wobble: share(F, A, model), coarse: coarse(J, F, model), coarseWobble: coarse(F, A, model),
    visible: share(J, P, model), freshVisible: share(F, P, model),
  };
}

/* ---------- one model ---------- */
async function checkOne(d, cmp, browser) {
  const why = [], facts = {};
  fileAndTags(d, why, facts);
  const ctx = await shotContext(browser);
  const errors = [];
  try {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`page error: ${e.message.split('\n')[0]}`));
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} for ${r.url().replace(base, '')}`); });
    page.on('requestfailed', (r) => errors.push(`request failed: ${r.url().replace(base, '')}`));
    let frame, opened;
    try { ({ frame, opened } = await settle(page, base, shotOf(d))); }
    catch (e) { if (isBrowserError(e)) throw e; why.push(`the og page did not render: ${e.message.split('\n')[0]}`); return { why, facts }; }
    if (opened) facts.opened = `shot open (${opened})`;
    const fresh = await page.screenshot({ type: 'png' });
    await page.waitForTimeout(WOBBLE_GAP);
    const again = await page.screenshot({ type: 'png' });
    const head = await page.evaluate(readHeadline);
    const fr = frame ? await frame.evaluate(readFrame) : null;
    await page.addStyleTag({ content: '.stage iframe { visibility: hidden !important; }' });
    const plate = await page.screenshot({ type: 'png' });
    await page.addStyleTag({ content: `${BARE}\n.stage iframe { visibility: visible !important; }` });
    const box = await page.locator('.stage iframe').boundingBox();
    const bare = box ? await page.screenshot({ omitBackground: true, clip: box }) : null;
    if (KEEP) writeFileSync(join(KEEP, `${d.id}.fresh.png`), fresh);

    // loaded, and current
    if (errors.length) why.push(`the og page had errors: ${[...new Set(errors)].slice(0, 3).join('; ')}`);
    if (!fr?.scene) why.push('the model\'s frame has no scene: it did not load');
    else {
      const expected = standaloneDoc(d.title, { how: [], ...snippets[d.id] }, 'dark');
      if (fr.srcdoc !== expected) why.push('the built page runs different model code from src/models now: dist/ is older than the model (rebuild, then npm run media)');
      if (fr.fonts !== 'loaded') why.push(`the frame's fonts were ${fr.fonts} at the shot`);
      if (fr.images.length) why.push(`image(s) in the model not loaded: ${fr.images.join(', ')}`);
      if (fr.running.length) why.push(`animation(s) still running at the shot: ${fr.running.slice(0, 4).join(', ')}`);
      if (fr.scripted.length) facts.scripted = `animations started by script after the stop: ${fr.scripted.slice(0, 3).join(', ')}`;
      if (fr.unfinished.length) why.push(`unfinished at the shot (a run-once animation or transition short of its end): ${fr.unfinished.slice(0, 4).join(', ')}`);
    }

    // the headline
    if (!head) why.push('the og page has no headline');
    else {
      facts.headline = `${head.fontSize}px, ${head.lines} line${head.lines === 1 ? '' : 's'}`;
      if (head.text !== d.title) why.push(`the headline drawn in the image is "${head.text}", not the model's title "${d.title}"`);
      if (head.overflow.length) why.push(`the headline does not fit at ${head.fontSize}px: ${head.overflow.join('; ')}`);
      const inside = (a, b) => a.l >= b.l - 1 && a.t >= b.t - 1 && a.r <= b.r + 1 && a.b <= b.b + 1;
      const hits = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
      const ink = head.ink ?? head.b;
      if (!inside(ink, { l: 0, t: 0, r: head.view.w, b: head.view.h })) why.push('the headline runs off the image');
      if (!inside(ink, head.panel)) why.push('the headline runs out of its text panel');
      if (head.panelOverflow) why.push('the text panel overflows its height: something in it is cut off');
      if (hits(ink, head.sub) || hits(ink, head.tags)) why.push('the headline overlaps the line above or under it');
      if (head.model && ink.r > head.model.l) why.push(`the headline reaches ${Math.round(ink.r - head.model.l)}px into the model's side`);
    }

    // the picture
    if (box && existsSync(join(DIST, 'media', `${d.id}.jpg`))) {
      shots.set(`/__mc/${d.id}.fresh.png`, fresh); shots.set(`/__mc/${d.id}.again.png`, again); shots.set(`/__mc/${d.id}.plate.png`, plate);
      const model = { l: box.x, t: box.y, r: box.x + box.width, b: box.y + box.height };
      const panel = head?.panel ?? { l: 0, t: 0, r: box.x, b: VIEWPORT.height };
      const args = { jpg: `${base}/media/${d.id}.jpg?${Date.now()}`, fresh: `${base}/__mc/${d.id}.fresh.png`, again: `${base}/__mc/${d.id}.again.png`, plate: `${base}/__mc/${d.id}.plate.png`, model, panel, DIFF };
      let c = await cmp.evaluate(compare, args);
      // Still for 350ms but not the file: before calling it old, render it once more from a new
      // page. A model that places things at random on load (snow) differs between two loads as
      // much as from the file, and is then judged as one that moves in script.
      if (c.model != null && c.model > MATCH && c.wobble <= MATCH / 4) {
        const ctx2 = await shotContext(browser);
        try {
          const p2 = await ctx2.newPage();
          await settle(p2, base, shotOf(d));
          shots.set(`/__mc/${d.id}.again.png`, await p2.screenshot({ type: 'png' }));
          c = await cmp.evaluate(compare, args);
          facts.reloaded = true;
        } finally { await ctx2.close(); }
      }
      for (const k of ['fresh', 'again', 'plate']) shots.delete(`/__mc/${d.id}.${k}.png`);
      if (c.model == null) why.push(`the image decodes as ${c.size}`);
      else {
        const pct = (x) => `${(100 * x).toFixed(2)}%`;
        const script = c.wobble > MATCH / 4;
        facts.moves = script;
        facts.diff = script ? `${pct(c.model)} differ (not still: ${pct(c.wobble)} between two renders${facts.reloaded ? " from two loads" : ` ${WOBBLE_GAP}ms apart`}; coarse ${c.coarse.toFixed(4)}, between renders ${c.coarseWobble.toFixed(4)})` : `${pct(c.model)} of the model's area differs from a fresh render`;
        facts.visible = pct(c.visible);
        if (c.panel > MATCH) why.push(`the text side of the image is not the page as it renders now: ${pct(c.panel)} of it differs (over ${pct(MATCH)})`);
        if (!script && c.model > MATCH) why.push(`the model in the image is not the model as it renders now: ${pct(c.model)} of its area differs from a fresh render (over ${pct(MATCH)}): an old image, another model's, or a different moment`);
        if (script && c.coarse > Math.max(COARSE, 2 * c.coarseWobble)) why.push(`the model in the image is not the model as it renders now: at 1/16 scale it differs by ${c.coarse.toFixed(4)} (over ${Math.max(COARSE, 2 * c.coarseWobble).toFixed(4)}; it moves in script, so a fine compare cannot be used)`);
        if (c.visible < VISIBLE) why.push(`the model's side of the image is blank: only ${pct(c.visible)} of it differs from the page with the model hidden (under ${pct(VISIBLE)})`);
      }
    }

    // centred and full-sized, on painted pixels
    if (bare) {
      const ink = inkBoxes(bare, INK, SOLID);
      const W = ink.all?.width ?? box.width, H = ink.all?.height ?? box.height;
      const unit = Math.min(W, H) / 100;
      if (!ink.all) why.push('nothing drawn: the model has no ink at the moment of the shot');
      else {
        const coversW = (ink.all.r - ink.all.l) / W, coversH = (ink.all.b - ink.all.t) / H;
        if (coversW >= 0.95 && coversH >= 0.95) {
          facts.size = `full canvas, ${Math.round(100 * coversW)}% × ${Math.round(100 * coversH)}%`;
          if (coversW < 0.98 || coversH < 0.98) why.push(`a full-canvas scene that leaves a gap: it covers ${Math.round(100 * coversW)}% × ${Math.round(100 * coversH)}% of its area`);
        } else if (!ink.solid) why.push('no solid ink, only faint: the model reads as a ghost');
        else {
          const s = ink.solid;
          const w = (s.r - s.l) / unit, h = (s.b - s.t) / unit;
          const offX = ((s.l + s.r) / 2 - W / 2) / unit, offY = ((s.t + s.b) / 2 - H / 2) / unit;
          const ctrl = Boolean(fr?.controls);
          facts.size = `${w.toFixed(0)} × ${h.toFixed(0)} vmin, off ${offX.toFixed(1)}, ${offY.toFixed(1)}${ctrl ? ', with controls' : ''}`;
          if (h < FLOOR && !wide(d)) why.push(`${h.toFixed(2)}vmin tall in the image, under ${FLOOR}`);
          if (wide(d)) facts.size += ', sized by width (wide)';
          if (wide(d) && w < WIDE_FLOOR) why.push(`${w.toFixed(2)}vmin wide in the image, under ${WIDE_FLOOR} (wide)`);
          if (h > BAND) why.push(`${h.toFixed(2)}vmin tall in the image, over ${BAND}`);
          if (w > WIDEST) why.push(`${w.toFixed(2)}vmin wide in the image, over ${WIDEST}`);
          if (Math.abs(offX) > CENTRED) why.push(`${offX.toFixed(2)}vmin off centre sideways in its area`);
          if (Math.abs(offY) > CENTRED + (ctrl ? 7 : 0)) why.push(`${offY.toFixed(2)}vmin off centre vertically in its area`);
          if (ink.all.l <= 0 || ink.all.t <= 0 || ink.all.r >= W || ink.all.b >= H) why.push('reaches the edge of its area: cut off in the image');
        }
      }
    }
  } finally {
    await ctx.close().catch(() => {}); // a dead browser's context: the error that matters is the one above
  }
  return { why, facts };
}

/* ---------- run ---------- */
const started = Date.now();
const queue = [...list];
const results = [];
crashGuard('check-media', async () => console.error(`check-media: ${results.length} of ${list.length} model(s) checked before the crash, each on its own line above`));
await Promise.all(Array.from({ length: CONCURRENCY }, async (_, slot) => {
  for (let d = queue.shift(); d; d = queue.shift()) {
    let r, notes = [];
    try {
      // this worker's comparison page in whichever browser is current
      ({ value: r, notes } = await guard.run(d.id, (browser) => checkOne(d, cmps[slot], browser)));
    } catch (e) {
      r = { why: [`the check could not run: ${e.message.split('\n')[0]}`], facts: {} };
      notes = e.notes ?? [];
    }
    if (notes.length) r.guard = notes;
    const also = notes.length ? `; ${notes.join('; ')}` : ''; // what scripts/browser-guard.mjs had to do, on the model's own line
    results.push({ id: d.id, ...r });
    const f = r.facts;
    const summary = [f.opened, f.size, f.diff, f.scripted, f.visible && `${f.visible} visible`, f.headline && `headline ${f.headline}`, f.version && `?v=${f.version}`].filter(Boolean).join('; ');
    // one line per model, then its reasons, printed together so parallel models never interleave
    console.log(`${r.why.length ? 'FAILS' : 'pass '}   ${d.id.padEnd(14)} ${r.why.length ? `${r.why.length} problem(s)` : summary}${also}${r.why.map((w) => `\n          ${w}`).join('')}`);
  }
}));
await cmpCtx.close().catch(() => {});
await guard.close();
server.close();
const bad = results.filter((r) => r.why.length);
console.log(`\n${results.length - bad.length}/${results.length} share previews are right. (moment ${MOMENT}ms, ${((Date.now() - started) / 60000).toFixed(1)} min)`);
if (bad.length) console.log(`Wrong: ${bad.map((r) => r.id).join(', ')}`);
process.exit(bad.length ? 1 : 0);
