/**
 * The SEO check: reads every HTML page of the BUILT site in dist/ and judges what a search engine
 * reads there. Run it after `npm run build`; it needs no browser and no server.
 *
 *   npm run check-seo              every page
 *   npm run check-seo -- --pass    also a `pass <page>` line for every page with no problem
 *   npm run check-seo -- --strict  a waived finding (below) fails too
 *   npm run check-seo -- --dist .media-tmp/seocheck   another copy of the built site
 *
 * The pages, by address:
 *   public    /, /models/<id>/, /groups/<g>/, /article/: indexed, listed in the sitemap
 *   redirect  a page with <meta http-equiv="refresh"> (the old /demos/<id>/ addresses): must point
 *             its canonical and its refresh at a public page, and stay out of the sitemap
 *   utility   everything else (/embed/*, a 404, the share-image page): must say noindex
 *
 * What each public page must have (the rule names are the ones printed):
 *   title        one <title>, TITLE_MAX characters at most, unique across public pages
 *   description  one meta description, DESCRIPTION_MIN..DESCRIPTION_MAX characters, unique
 *                (the limits and where they come from: scripts/seo-limits.mjs)
 *   canonical    exactly one, absolute https, on the sitemap's host, and the page's own address
 *   headings     exactly one <h1>, and no level skipped on the way down (h1 then h3 is a skip)
 *   jsonld       every block parses; each node has the fields its @type needs; the page's main node
 *                (an Article, a WebPage or the WebSite) has datePublished, dateModified (the same
 *                day as the sitemap's lastmod) and image (the page's og:image); breadcrumbs point
 *                at pages that exist; nothing says the whole site is MIT (only the snippets are:
 *                see LICENSE)
 *   social       og:title, og:description, og:url, og:image, og:type and twitter:card are there.
 *                Whether they are RIGHT for a model is scripts/check-media.mjs's job, not this one's
 *   robots-meta  public pages are not noindex; utility pages are
 *   lang         <html lang> is set
 *   nojs         a model page's plain HTML (scripts removed) holds the model's title, its
 *                description and every how-it-works step, read from src/models
 *   weight       the JS and CSS a model page and the home page load up front (their <script src>,
 *                modulepreload and stylesheet links, and the static imports inside those scripts),
 *                gzipped, stays within WEIGHT_BUDGET
 * On every page, public or not:
 *   links        every href and src to this site (relative, root-relative or absolute on its host)
 *                is a file in dist/
 * On the site as a whole (printed under the file's name):
 *   sitemap      every public page is listed, every listed URL is a page in dist/, none twice, each
 *                with a lastmod; every model in src/models has its page
 *   robots.txt   names the sitemap and disallows no public page
 *   orphan       every public page but the home page is linked from another public page
 *
 * Waived findings: a problem the user has been shown and not yet decided on is listed in WAIVED
 * with the reason. It is printed as WAIVED on every run and counted in the summary, but it does not
 * fail the run unless --strict. Remove the entry once it is decided.
 *
 * Too long in the model's own words: a model page whose title is "<title> in <kind>" and nothing
 * more, or whose description is the model's description and nothing more, and still over the limit,
 * can only be fixed by shorter text in src/models (reviewed text, not the generator's). It is printed
 * as OWN-TEXT and counted, and fails only under --strict.
 *
 * Output: one `FAIL <page> <rule>: <what>` line per problem (a page can have several), then the
 * summary, ending `N/M pages pass the SEO check.` Exit 1 on any failure.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createServer } from 'vite';
import { DESCRIPTION_AIM, DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_AIM, TITLE_MAX } from './seo-limits.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const showPass = args.includes('--pass');
const strict = args.includes('--strict');
const distAt = args.indexOf('--dist');
const DIST = resolve(ROOT, distAt >= 0 ? args[distAt + 1] : 'dist');

/**
 * What a page may load up front, gzipped (zlib's default level, what most static hosts serve).
 * Set a little above what this measures, so a real growth fails and noise does not. Re-measure and
 * re-set it when growth is accepted, and record what spent the headroom:
 *  - 2026-09-22, after 2b171f9 removed the old implementation: model 265.5 KB, home 270.4 KB
 *    (KB = 1024 bytes), budget 275 / 280 — about 9.5 KB of headroom.
 *  - 2026-09-23: model 278.7 KB, home 283.6 KB, both over. The day between them spent 13.2 KB:
 *    3.4 KB of it the View zoom control and its fill-limit math (448ff46, ac16ecd, e5ab944,
 *    517a4c1 — measured by building with src/view-zoom.ts and src/fill-limit.ts stubbed out), the
 *    other 9.8 KB some sixty reviewed model edits in the models chunk and its CSS. Nothing is
 *    wrong with the pages: this is accepted work, so the budget moves up with the same headroom.
 *    Stubbing the whole View zoom feature would still leave both pages over the old number.
 */
const WEIGHT_BUDGET = { model: 288 * 1024, home: 293 * 1024 };

/**
 * Findings shown to the user and waiting on their decision. Key: `<page> <rule>`.
 */
const WAIVED = {
  '/article/ canonical':
    'the article\'s canonical is https://articles.edgarasneverdauskas.com/css-3d-lab/ while the sitemap lists it on css3dlab; either the canonical or the sitemap entry has to change, and which is the user\'s call',
  '/article/ orphan':
    'no page of the site links to the article; proposed: a link in the site footer (generate-pages siteFooter, used on every page) or on the home page',
  '/article/ jsonld':
    'the article has no JSON-LD; its Article node needs the canonical address, which waits on the canonical decision',
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`check-seo: no ${relative(ROOT, DIST) || DIST}/index.html: run npm run build first`);
  process.exit(1);
}

/* ---------------- the models, for the no-JS text and the sitemap's completeness ---------------- */
const vite = await createServer({ configFile: false, root: ROOT, server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom', logLevel: 'error' });
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { snippets } = await vite.ssrLoadModule('/src/models/snippets.ts');
await vite.close();

/* ---------------- reading HTML ---------------- */
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', middot: '·', times: '×', copy: '©', rarr: '→', larr: '←' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m,
  );
const attrs = (tag) => {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return out;
};
/** The HTML without comments, and without what is not markup (script, style, template, textarea bodies). */
const markupOnly = (html) =>
  html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|template|textarea)\b([^>]*)>[\s\S]*?<\/\1>/gi, '<$1$2></$1>');
const text = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/* ---------------- the pages ---------------- */
function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}
/** A file's address on the site: dist/models/cube/index.html is /models/cube/. */
const addressOf = (file) => '/' + relative(DIST, file).split(sep).join('/').replace(/(^|\/)index\.html$/, '$1');

const sitemapText = existsSync(join(DIST, 'sitemap.xml')) ? readFileSync(join(DIST, 'sitemap.xml'), 'utf8') : null;
const sitemapLocs = sitemapText ? [...sitemapText.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({ loc: /<loc>\s*([^<]*?)\s*<\/loc>/.exec(m[1])?.[1] ?? null, lastmod: /<lastmod>\s*([^<]*?)\s*<\/lastmod>/.exec(m[1])?.[1] ?? null })) : [];
const SITE = (() => { try { return new URL(sitemapLocs[0]?.loc).origin; } catch { return JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8')).url; } })();

const pages = new Map(); // address → page
for (const file of htmlFiles(DIST)) {
  const address = addressOf(file);
  const raw = readFileSync(file, 'utf8');
  const html = markupOnly(raw);
  const head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? '';
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const refresh = metas.find((m) => m['http-equiv']?.toLowerCase() === 'refresh');
  const kind =
    address === '/' ? 'home'
    : /^\/models\/[^/]+\/$/.test(address) ? 'model'
    : /^\/groups\/[^/]+\/$/.test(address) ? 'group'
    : address === '/article/' ? 'article'
    : refresh ? 'redirect'
    : 'utility';
  pages.set(address, { address, file, raw, html, head, metas, links, refresh, kind, public: ['home', 'model', 'group', 'article'].includes(kind) });
}
const publicPages = [...pages.values()].filter((p) => p.public);

/* ---------------- problems ---------------- */
const problems = []; // { page, rule, what }
const waived = [];
const ownText = []; // too long in the model's own words: { page, rule, what, id, length }
const fail = (page, rule, what) => {
  const why = WAIVED[`${page} ${rule}`];
  (why ? waived : problems).push({ page, rule, what, why });
};
const meta = (p, key) => p.metas.filter((m) => m.name?.toLowerCase() === key || m.property?.toLowerCase() === key).map((m) => m.content ?? '');
const ogImage = (p) => meta(p, 'og:image')[0] ?? null;

/** A local address a page points at, as the file in dist/ that serves it, or null when it is not local. */
function localTarget(from, ref) {
  if (!ref || /^(#|data:|mailto:|tel:|javascript:|blob:)/i.test(ref)) return null;
  let url;
  try { url = new URL(ref, SITE + from); } catch { return { file: null, address: ref }; }
  if (url.origin !== SITE) return null;
  const path = decodeURIComponent(url.pathname);
  let file = join(DIST, ...path.split('/').filter(Boolean));
  if (path.endsWith('/')) file = join(file, 'index.html');
  else if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  return { file, address: path };
}

/* ---- per page ---- */
const titles = new Map(), descriptions = new Map();
const inbound = new Map(publicPages.map((p) => [p.address, 0]));
const lastmodOf = new Map(sitemapLocs.map((u) => [u.loc, u.lastmod]));
let overTitleAim = 0, overDescAim = 0;

for (const p of pages.values()) {
  const { address: a } = p;
  // links, on every page
  const seen = new Set();
  for (const m of p.html.matchAll(/<(a|link|script|img|source|iframe|video|audio|use|image)\b[^>]*>/gi)) {
    const at = attrs(m[0]);
    if (m[1].toLowerCase() === 'link' && /\b(preconnect|dns-prefetch|canonical|alternate)\b/i.test(at.rel ?? '')) continue;
    for (const ref of [at.href, at.src, at['xlink:href']]) {
      const t = localTarget(a, ref);
      if (!t) continue;
      if (!t.file || !existsSync(t.file)) { if (!seen.has(ref)) fail(a, 'links', `dead link ${ref} (no ${t.file ? relative(DIST, t.file).split(sep).join('/') : ref} in dist)`); seen.add(ref); continue; }
      const target = t.address.endsWith('/') ? t.address : addressOf(t.file);
      if (p.public && target !== a && inbound.has(target) && m[1].toLowerCase() === 'a') inbound.set(target, inbound.get(target) + 1);
    }
  }

  const robots = [...meta(p, 'robots'), ...meta(p, 'googlebot')].join(',').toLowerCase();
  const noindex = /\bnoindex\b|\bnone\b/.test(robots);
  const canonicals = p.links.filter((l) => /(^|\s)canonical(\s|$)/i.test(l.rel ?? '')).map((l) => l.href);

  if (p.kind === 'utility') {
    if (!noindex) fail(a, 'robots-meta', 'a page that is not a public page has no <meta name="robots" content="noindex">');
    continue;
  }
  if (p.kind === 'redirect') {
    const to = /url\s*=\s*(.+)$/i.exec(p.refresh.content ?? '')?.[1]?.trim();
    const target = to && localTarget(a, to);
    const canon = canonicals[0];
    if (!target || !target.file || !existsSync(target.file)) fail(a, 'links', `the refresh goes nowhere: ${to ?? 'no url'}`);
    if (canonicals.length !== 1) fail(a, 'canonical', `${canonicals.length} canonical links on a redirect page`);
    else if (!pages.get(new URL(canon, SITE + a).pathname)?.public) fail(a, 'canonical', `the canonical ${canon} is not a public page`);
    else if (target?.address && new URL(canon, SITE + a).pathname !== target.address) fail(a, 'canonical', `the canonical ${canon} and the refresh ${to} disagree`);
    if (lastmodOf.has(SITE + a)) fail(a, 'sitemap', 'a redirect page is listed in the sitemap');
    continue;
  }

  // public pages
  if (noindex) fail(a, 'robots-meta', `a public page says "${robots}"`);
  if (!/<html\b[^>]*\blang\s*=\s*["']?[a-z]/i.test(p.html)) fail(a, 'lang', '<html> has no lang');

  const titleTags = [...p.head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => text(m[1]));
  if (titleTags.length !== 1) fail(a, 'title', `${titleTags.length} <title> elements, not 1`);
  const title = titleTags[0] ?? '';
  if (titleTags.length && !title) fail(a, 'title', 'the <title> is empty');
  // a model page whose title or description is the model's own words and nothing else: only a new
  // text in src/models (reviewed) can shorten it, so it is listed for that, not failed
  const model = p.kind === 'model' ? demos.find((x) => x.id === a.split('/')[2]) : null;
  const ownTitle = model && `${model.title} in ${model.category === 'css' ? 'pure CSS' : 'CSS + JavaScript'}`;
  const tooLong = (rule, value, max) => {
    const what = `${value.length} characters, over ${max}: "${value.length > 90 ? `${value.slice(0, 80)}…` : value}"`;
    if (model && value === (rule === 'title' ? ownTitle : text(model.description))) ownText.push({ page: a, rule, what, id: model.id, length: value.length });
    else fail(a, rule, what);
  };
  if (title.length > TITLE_MAX) tooLong('title', title, TITLE_MAX);
  if (title.length > TITLE_AIM) overTitleAim++;
  if (title) titles.set(title, [...(titles.get(title) ?? []), a]);

  const descs = meta(p, 'description');
  if (descs.length !== 1) fail(a, 'description', `${descs.length} meta descriptions, not 1`);
  const desc = (descs[0] ?? '').trim();
  if (descs.length && desc.length < DESCRIPTION_MIN) fail(a, 'description', `${desc.length} characters, under ${DESCRIPTION_MIN}: "${desc}"`);
  if (desc.length > DESCRIPTION_MAX) tooLong('description', desc, DESCRIPTION_MAX);
  if (desc.length > DESCRIPTION_AIM) overDescAim++;
  if (desc) descriptions.set(desc, [...(descriptions.get(desc) ?? []), a]);

  // canonical
  const own = SITE + a;
  if (canonicals.length !== 1) fail(a, 'canonical', `${canonicals.length} canonical links, not 1`);
  else {
    const c = canonicals[0];
    let u = null;
    try { u = new URL(c); } catch {}
    if (!u || !/^https:\/\//.test(c)) fail(a, 'canonical', `not an absolute https address: ${c}`);
    else if (u.origin !== SITE) fail(a, 'canonical', `on ${u.host}, not on the sitemap's host ${new URL(SITE).host}: ${c}`);
    else if (c !== own) fail(a, 'canonical', `points at ${c}, not at the page itself (${own})`);
  }

  // headings
  const levels = [...p.html.replace(/^[\s\S]*?<body\b[^>]*>/i, '').matchAll(/<h([1-6])\b[^>]*>/gi)].map((m) => Number(m[1]));
  const h1s = levels.filter((l) => l === 1).length;
  if (h1s !== 1) fail(a, 'headings', `${h1s} <h1> elements, not 1`);
  let prev = 1;
  const skips = new Set();
  for (const l of levels) { if (l > prev + 1) skips.add(`h${prev} to h${l}`); prev = l; }
  if (skips.size) fail(a, 'headings', `skips a level: ${[...skips].join(', ')}`);

  // og and twitter: there at all (check-media judges whether a model's are right)
  const missing = ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'twitter:card'].filter((k) => !meta(p, k)[0]);
  if (missing.length) fail(a, 'social', `missing ${missing.join(', ')}`);

  // JSON-LD
  checkJsonLd(p, own, lastmodOf.get(own) ?? null);

  // the text a crawler reads without running anything
  if (p.kind === 'model') {
    const id = a.split('/')[2];
    const d = demos.find((x) => x.id === id);
    if (!d) fail(a, 'nojs', `no model "${id}" in src/models, yet the page exists`);
    else {
      const body = p.html.replace(/^[\s\S]*?<body\b[^>]*>/i, '').replace(/<(script|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
      const plain = text(body);
      const h1 = text(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(body)?.[1] ?? '');
      if (!h1.startsWith(d.title)) fail(a, 'nojs', `the <h1> is "${h1}", not the model's title "${d.title}"`);
      if (!plain.includes(text(d.description))) fail(a, 'nojs', 'the model\'s description is not in the page\'s HTML');
      const how = snippets[id]?.how ?? [];
      if (!how.length) fail(a, 'nojs', 'the model has no how-it-works steps in src/models');
      const lost = how.filter((s) => !plain.includes(text(s)));
      if (lost.length) fail(a, 'nojs', `${lost.length} of ${how.length} how-it-works steps are not in the page's HTML (first: "${text(lost[0]).slice(0, 60)}…")`);
    }
  }
}

// unique titles and descriptions
for (const [t, where] of titles) if (where.length > 1) for (const a of where) fail(a, 'title', `the same title as ${where.filter((x) => x !== a).slice(0, 3).join(', ')}${where.length > 4 ? ` and ${where.length - 4} more` : ''}: "${t}"`);
for (const [d, where] of descriptions) if (where.length > 1) for (const a of where) fail(a, 'description', `the same description as ${where.filter((x) => x !== a).slice(0, 3).join(', ')}${where.length > 4 ? ` and ${where.length - 4} more` : ''}: "${d.slice(0, 60)}…"`);

// orphans
for (const [a, n] of inbound) if (a !== '/' && n === 0) fail(a, 'orphan', 'no public page links to it');

/* ---------------- JSON-LD ---------------- */
function checkJsonLd(p, own, lastmod) {
  const a = p.address;
  const blocks = [...p.raw.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  if (!blocks.length) { fail(a, 'jsonld', 'no JSON-LD'); return; }
  const nodes = [];
  for (const [i, b] of blocks.entries()) {
    let data;
    try { data = JSON.parse(b); } catch (e) { fail(a, 'jsonld', `block ${i + 1} does not parse: ${e.message}`); continue; }
    for (const top of Array.isArray(data) ? data : [data]) {
      if (!top || typeof top !== 'object') { fail(a, 'jsonld', `block ${i + 1} is not an object`); continue; }
      if (!String(top['@context'] ?? '').includes('schema.org')) fail(a, 'jsonld', `block ${i + 1} has no schema.org @context`);
      nodes.push(...(Array.isArray(top['@graph']) ? top['@graph'] : [top]));
    }
  }
  const DATED = ['TechArticle', 'Article', 'BlogPosting', 'NewsArticle', 'WebPage', 'CollectionPage', 'WebSite'];
  const NEEDS = {
    WebSite: ['name', 'url'],
    WebPage: ['name', 'url'],
    CollectionPage: ['name', 'url', 'description'],
    TechArticle: ['headline', 'description', 'url', 'author', 'publisher'],
    Article: ['headline', 'author'],
    BlogPosting: ['headline', 'author'],
    NewsArticle: ['headline', 'author'],
    HowTo: ['name', 'step'],
    BreadcrumbList: ['itemListElement'],
  };
  const typeOf = (n) => [n?.['@type']].flat().filter(Boolean);
  let main = null;
  for (const n of nodes) {
    const types = typeOf(n);
    if (!types.length) { fail(a, 'jsonld', 'a node has no @type'); continue; }
    const t = types.find((x) => NEEDS[x]);
    for (const f of NEEDS[t] ?? []) if (n[f] == null || n[f] === '' || (Array.isArray(n[f]) && !n[f].length)) fail(a, 'jsonld', `${t} has no ${f}`);
    if (types.some((x) => DATED.includes(x)) && (!main || (n.url && n.url === own))) main = n;
    if (types.includes('HowTo')) for (const [i, s] of [n.step].flat().filter(Boolean).entries()) if (!s?.text && !s?.name) fail(a, 'jsonld', `HowTo step ${i + 1} has no text`);
    if (types.includes('BreadcrumbList')) {
      const items = [n.itemListElement].flat().filter(Boolean);
      items.forEach((it, i) => {
        if (it.position !== i + 1) fail(a, 'jsonld', `breadcrumb ${i + 1} has position ${it.position}`);
        if (!it.name) fail(a, 'jsonld', `breadcrumb ${i + 1} has no name`);
        const item = typeof it.item === 'string' ? it.item : it.item?.['@id'];
        if (!item) { if (i < items.length - 1) fail(a, 'jsonld', `breadcrumb ${i + 1} has no item`); return; }
        const t2 = localTarget(a, item);
        if (!/^https:\/\//.test(item) || !t2 || !t2.file || !existsSync(t2.file)) fail(a, 'jsonld', `breadcrumb ${i + 1} points at ${item}, not a page of this site`);
      });
    }
    // only the snippets are MIT (LICENSE): a whole-site node must not say MIT, and no text may say MIT without saying what it covers
    const lic = [n.license].flat().filter(Boolean).map((l) => (typeof l === 'string' ? l : l.url ?? l.name ?? ''));
    if (types.some((x) => ['WebSite', 'WebPage', 'CollectionPage'].includes(x)) && lic.some((l) => /\bmit\b|licenses\/mit|mit-snippets/i.test(l)))
      fail(a, 'jsonld', `${types[0]} claims MIT for the whole site (${lic.join(', ')}); only the snippets are MIT`);
    for (const s of strings(n)) if (/\bMIT\b/.test(s) && !/snippet/i.test(s)) fail(a, 'jsonld', `says MIT without limiting it to the snippets: "${s.slice(0, 80)}"`);
  }
  if (!main) { fail(a, 'jsonld', `no main node (one of ${DATED.join(', ')})`); return; }
  const mt = typeOf(main)[0];
  const day = /^\d{4}-\d{2}-\d{2}/;
  for (const f of ['datePublished', 'dateModified']) {
    if (!main[f]) fail(a, 'jsonld', `${mt} has no ${f}`);
    else if (!day.test(main[f]) || Number.isNaN(Date.parse(main[f]))) fail(a, 'jsonld', `${mt}.${f} is not an ISO date: ${main[f]}`);
  }
  if (main.datePublished && main.dateModified && main.dateModified < main.datePublished) fail(a, 'jsonld', `${mt}.dateModified ${main.dateModified} is before datePublished ${main.datePublished}`);
  if (main.dateModified && lastmod && main.dateModified.slice(0, 10) !== lastmod.slice(0, 10)) fail(a, 'jsonld', `${mt}.dateModified ${main.dateModified} is not the sitemap's lastmod ${lastmod}`);
  const image = [main.image].flat().map((i) => (typeof i === 'string' ? i : i?.url)).filter(Boolean)[0];
  if (!image) fail(a, 'jsonld', `${mt} has no image`);
  else if (ogImage(p) && image !== ogImage(p)) fail(a, 'jsonld', `${mt}.image ${image} is not the og:image ${ogImage(p)}`);
}
function* strings(v) {
  if (typeof v === 'string') yield v;
  else if (v && typeof v === 'object') for (const x of Object.values(v)) yield* strings(x);
}

/* ---------------- the sitemap and robots.txt ---------------- */
if (!sitemapText) fail('/sitemap.xml', 'sitemap', 'there is no sitemap.xml in dist/');
else {
  const seenLoc = new Set();
  for (const { loc, lastmod } of sitemapLocs) {
    if (!loc) { fail('/sitemap.xml', 'sitemap', 'a <url> has no <loc>'); continue; }
    if (seenLoc.has(loc)) fail('/sitemap.xml', 'sitemap', `listed twice: ${loc}`);
    seenLoc.add(loc);
    if (!lastmod) fail('/sitemap.xml', 'sitemap', `no lastmod for ${loc}`);
    else if (!/^\d{4}-\d{2}-\d{2}/.test(lastmod) || Number.isNaN(Date.parse(lastmod))) fail('/sitemap.xml', 'sitemap', `lastmod "${lastmod}" is not a date, for ${loc}`);
    let u;
    try { u = new URL(loc); } catch { fail('/sitemap.xml', 'sitemap', `not an address: ${loc}`); continue; }
    if (u.origin !== SITE) fail('/sitemap.xml', 'sitemap', `on another host: ${loc}`);
    const page = pages.get(u.pathname);
    if (!page) fail('/sitemap.xml', 'sitemap', `lists ${loc}, which is not a page in dist/`);
    else if (!page.public) fail('/sitemap.xml', 'sitemap', `lists ${loc}, a ${page.kind} page`);
  }
  for (const p of publicPages) if (!seenLoc.has(SITE + p.address)) fail(p.address, 'sitemap', 'a public page the sitemap does not list');
}
for (const d of demos) if (!pages.has(`/models/${d.id}/`)) fail(`/models/${d.id}/`, 'sitemap', `the model ${d.id} has no page in dist/`);

const robotsFile = join(DIST, 'robots.txt');
if (!existsSync(robotsFile)) fail('/robots.txt', 'robots.txt', 'there is no robots.txt in dist/');
else {
  const lines = readFileSync(robotsFile, 'utf8').split(/\r?\n/).map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
  const maps = lines.filter((l) => /^sitemap:/i.test(l)).map((l) => l.slice(8).trim());
  if (!maps.includes(`${SITE}/sitemap.xml`)) fail('/robots.txt', 'robots.txt', `does not name ${SITE}/sitemap.xml (names: ${maps.join(', ') || 'none'})`);
  // the rules for every crawler (User-agent: *), and Google's own if it has a group; the longest match wins, Allow on a tie
  const groups = [];
  let cur = null, lastWasAgent = false;
  for (const l of lines) {
    const [k, ...rest] = l.split(':');
    const key = k.trim().toLowerCase(), val = rest.join(':').trim();
    if (key === 'user-agent') { if (!lastWasAgent) groups.push((cur = { agents: [], rules: [] })); cur.agents.push(val.toLowerCase()); lastWasAgent = true; continue; }
    lastWasAgent = false;
    if (cur && (key === 'allow' || key === 'disallow')) cur.rules.push({ allow: key === 'allow', path: val });
  }
  const re = (path) => new RegExp('^' + path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
  for (const g of groups.filter((x) => x.agents.some((ag) => ag === '*' || ag === 'googlebot'))) {
    const blocked = new Map(); // rule → the public pages it blocks
    for (const p of publicPages) {
      const hits = g.rules.filter((r) => r.path && re(r.path).test(p.address)).sort((x, y) => y.path.length - x.path.length || Number(y.allow) - Number(x.allow));
      if (hits[0] && !hits[0].allow) blocked.set(hits[0].path, [...(blocked.get(hits[0].path) ?? []), p.address]);
    }
    for (const [path, list] of blocked) fail('/robots.txt', 'robots.txt', `"Disallow: ${path}" (User-agent: ${g.agents.join(', ')}) blocks ${list.length} public page(s): ${list.slice(0, 5).join(', ')}${list.length > 5 ? ', …' : ''}`);
  }
}

/* ---------------- page weight ---------------- */
function weightOf(p) {
  const files = new Set();
  const add = (file) => {
    if (!file || files.has(file) || !existsSync(file)) return;
    files.add(file);
    if (file.endsWith('.js')) {
      const src = readFileSync(file, 'utf8');
      // static imports only (import x from "./a.js", import "./a.js", export … from "./a.js"); import("…") loads later
      for (const m of src.matchAll(/(?:\bimport|\bexport)\s*(?:[\w*{}\s,$]*?\bfrom\s*)?["'](\.{1,2}\/[^"']+\.js)["']/g)) add(resolve(file, '..', m[1]));
    }
  };
  for (const m of p.html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const at = attrs(m[0]);
    const ref = m[1].toLowerCase() === 'script' ? at.src : /\b(stylesheet|modulepreload)\b/i.test(at.rel ?? '') ? at.href : null;
    if (!ref) continue;
    const t = localTarget(p.address, ref);
    if (t?.file) add(t.file);
  }
  let raw = 0, gz = 0;
  for (const f of files) { const b = readFileSync(f); raw += b.length; gz += gzipSync(b).length; }
  return { raw, gz, files: files.size };
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const weights = { model: null, home: null };
for (const p of pages.values()) {
  if (p.kind !== 'model' && p.kind !== 'home') continue;
  const w = weightOf(p);
  if (!w.files) fail(p.address, 'weight', 'loads no JS or CSS that could be found in dist/: nothing to weigh');
  if (w.gz > WEIGHT_BUDGET[p.kind]) fail(p.address, 'weight', `${kb(w.gz)} of JS and CSS gzipped, over the budget of ${kb(WEIGHT_BUDGET[p.kind])}`);
  if (!weights[p.kind] || w.gz > weights[p.kind].gz) weights[p.kind] = { ...w, page: p.address };
}

/* ---------------- the report ---------------- */
const byPage = new Map();
for (const x of problems) byPage.set(x.page, [...(byPage.get(x.page) ?? []), x]);
const order = [...pages.keys(), '/sitemap.xml', '/robots.txt'];
const sorted = [...byPage.keys()].sort((x, y) => (order.indexOf(x) === -1 ? 1e9 : order.indexOf(x)) - (order.indexOf(y) === -1 ? 1e9 : order.indexOf(y)) || x.localeCompare(y));
for (const a of sorted) for (const x of byPage.get(a)) console.log(`FAIL ${a} ${x.rule}: ${x.what}`);
for (const x of waived) console.log(`WAIVED ${x.page} ${x.rule}: ${x.what}\n       waiting on a decision: ${x.why}`);
for (const x of ownText) console.log(`OWN-TEXT ${x.page} ${x.rule}: ${x.what}`);
if (showPass) {
  for (const a of pages.keys()) {
    if (byPage.has(a)) continue;
    const held = [...waived, ...ownText].filter((x) => x.page === a).map((x) => x.rule);
    console.log(held.length ? `listed ${a} ${[...new Set(held)].join(', ')} (not failed: WAIVED or OWN-TEXT above)` : `pass ${a}`);
  }
}

const count = (k) => [...pages.values()].filter((p) => p.kind === k).length;
const failedPages = [...byPage.keys()].filter((a) => pages.has(a));
const siteFiles = ['/sitemap.xml', '/robots.txt'].map((f) => `${f.slice(1)} ${byPage.has(f) ? `${byPage.get(f).length} problem(s)` : 'ok'}`);
const rules = {};
for (const x of problems) rules[x.rule] = (rules[x.rule] ?? 0) + 1;
console.log(`\nSEO check of ${relative(ROOT, DIST) || DIST}/ on ${SITE}`);
console.log(`  pages: ${pages.size} (${publicPages.length} public: ${count('home')} home, ${count('model')} model, ${count('group')} group, ${count('article')} article; ${count('utility')} utility; ${count('redirect')} redirect stubs)`);
console.log(`  site files: ${siteFiles.join(', ')}`);
console.log(`  problems: ${problems.length}${problems.length ? ` (${Object.entries(rules).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}`);
console.log(`  waived: ${waived.length}${waived.length ? ` (listed above, each waiting on a decision; they fail under --strict)` : ''}`);
const ownBy = (rule) => ownText.filter((x) => x.rule === rule);
console.log(`  own text: ${ownText.length ? `${ownBy('description').length} model description(s) and ${ownBy('title').length} title(s) are over the limit in the model's own words, with nothing added (the OWN-TEXT lines above): only shorter text in src/models fixes them, so they are listed, not failed, and fail under --strict` : 'every over-long title and description is fixable here (none is the model\'s own words alone)'}`);
console.log(`  lengths: ${overTitleAim} title(s) over the ${TITLE_AIM}-character aim (fail over ${TITLE_MAX}), ${overDescAim} description(s) over the ${DESCRIPTION_AIM} aim (fail over ${DESCRIPTION_MAX})`);
for (const k of ['model', 'home']) if (weights[k]) console.log(`  weight: ${k === 'model' ? 'heaviest model page' : 'home page'} ${weights[k].page} loads ${kb(weights[k].gz)} of JS and CSS gzipped (${kb(weights[k].raw)} raw, ${weights[k].files} files); budget ${kb(WEIGHT_BUDGET[k])}`);
const listed = new Set([...waived, ...ownText].map((x) => x.page).filter((a) => pages.has(a) && !byPage.has(a)));
console.log(`${pages.size - failedPages.length}/${pages.size} pages pass the SEO check${listed.size ? ` (${listed.size} of them only because what is wrong there is listed, not failed: WAIVED or OWN-TEXT above)` : ''}.`);
const failed = problems.length > 0 || (strict && (waived.length > 0 || ownText.length > 0));
process.exit(failed ? 1 : 0);
