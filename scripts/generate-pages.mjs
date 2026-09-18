// Generates one real HTML page per demo and per group, plus sitemap.xml, robots.txt and the
// "all demos" link list for the home page. Runs before `vite` / `vite build`.
//
// Why: search engines rank PAGES. A single-page gallery is one page about "3D CSS"; fifty pages
// can each answer one specific search ("css 3d pyramid"). Everything that matters for ranking —
// title, description, heading, explanation, code — is written into the HTML as plain text, so it
// is readable without running any JavaScript.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';

const site = JSON.parse(readFileSync('site.config.json', 'utf8'));
const root = resolve('.');

// Load the TypeScript sources through Vite, so this script and the app share one source of truth.
// configFile: false — the real config imports the pages this script is about to create.
const vite = await createServer({ configFile: false, root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'warn' });
const { demos } = await vite.ssrLoadModule('/src/demos/index.ts');
const { snippets } = await vite.ssrLoadModule('/src/demos/snippets.ts');
const { GROUPS, GROUP_ORDER } = await vite.ssrLoadModule('/src/demos/groups.ts');
const { interactionHtml, interactionOf } = await vite.ssrLoadModule('/src/demos/interaction.ts');
const { videoButton } = await vite.ssrLoadModule('/src/video.ts');
const { logoHtml } = await vite.ssrLoadModule('/src/logo.ts');
const LOGO = logoHtml();

// Every published demo must ship its copy-paste code: a demo without it would render an empty code
// window. Stop the build rather than publish that.
const incomplete = demos.filter((d) => !snippets[d.id]?.css || !snippets[d.id]?.how?.length);
if (incomplete.length) throw new Error(`No copy-paste snippet for: ${incomplete.map((d) => d.id).join(', ')}`);
const { CATEGORY_LABEL } = await vite.ssrLoadModule('/src/demos/types.ts');
const { highlight } = await vite.ssrLoadModule('/src/highlight.ts');
const { icon } = await vite.ssrLoadModule('/src/icons.ts');
await vite.close();

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const kind = (d) => (d.category === 'css' ? 'pure CSS' : 'CSS + JavaScript');

// Share images are 2400 × 1260 (1200 × 630 laid out at 2x): see scripts/generate-media.mjs.
// ?v= changes with every build, so a link shared after a deploy gets the current image instead of
// a copy the sharing site kept from before. (Posts shared earlier keep their old picture: nobody
// can change that.)
const IMAGE_VERSION = new Date().toISOString().slice(0, 10).replaceAll('-', '');
/** The footer on every page: brand, what the site is, Ko-fi, then licence, GitHub, copyright. */
function siteFooter(up) {
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
      <div class="site-footer__main">
        <div class="site-footer__brand">
          <a class="topbar__brand" href="${up}">${LOGO}${esc(site.name)}</a>
          <p>CSS 3D effects to learn from and reuse: each one live, how it works, and code you can copy. Free and ad-free.</p>
        </div>
        <div class="site-footer__cta">
          <p>Saved you some time?</p>
          <a class="btn btn--kofi" href="${site.kofi}" target="_blank" rel="noopener">${icon('coffee')} Buy me a coffee</a>
        </div>
      </div>
      <div class="site-footer__legal">
        <span>© ${year} ${esc(site.author)}</span>
        <a href="${site.repo}/blob/main/LICENSE" target="_blank" rel="noopener">MIT licence: every snippet is free to use</a>
        <a href="${site.repo}" target="_blank" rel="noopener">Source on GitHub ${icon('arrow-up-right')}</a>
      </div>
    </footer>`;
}

function shell({ path, depth, title, description, jsonLd, body, script, image, imageAlt }) {
  const up = '../'.repeat(depth);
  const url = `${site.url}/${path}`;
  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${esc(site.name)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${url}" />
    ${
      image
        ? `<meta property="og:image" content="${site.url}/${image}?v=${IMAGE_VERSION}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="2400" />
    <meta property="og:image:height" content="1260" />
    <meta property="og:image:alt" content="${esc(imageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${site.url}/${image}?v=${IMAGE_VERSION}" />
    <meta name="twitter:image:alt" content="${esc(imageAlt)}" />`
        : '<meta name="twitter:card" content="summary" />'
    }
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#07080f" />
    <meta name="apple-mobile-web-app-title" content="CSS 3D Lab" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body class="page">
    <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <nav class="topbar">
      <a class="topbar__brand" href="${up}">
        ${LOGO}
        ${esc(site.name)}
      </a>
      <div class="topbar__actions">
        <a class="btn" href="${up}" aria-label="All effects">${icon('chevron-left')} <span class="btn__label">All effects</span></a>
        <button id="pause" class="btn" type="button" aria-pressed="false"></button>
        <button id="theme" class="btn" type="button"></button>
        <a class="btn" href="${site.repo}" target="_blank" rel="noopener">GitHub ${icon('arrow-up-right')}</a>
        <a class="btn btn--kofi" href="${site.kofi}" target="_blank" rel="noopener" aria-label="Buy me a coffee">${icon('coffee')} <span class="btn__label">Buy me a coffee</span></a>
      </div>
    </nav>
${body}
    ${siteFooter(up)}
    <script type="module" src="/src/${script}"></script>
  </body>
</html>
`;
}

const crumbs = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
});

// A gallery-style card. The text and the links are static HTML; the empty .stage is filled with
// the live demo by lazy-mount.ts when the card comes near the viewport.
function demoCard(d, up, i) {
  return `<li>
          <article class="card is-offscreen" data-cat="${d.category}" data-mount="${d.id}" style="--n:${Math.min(i, 8)}">
            <div class="stage" aria-hidden="true"></div>
            ${interactionHtml(d)}
            <button type="button" class="card__menu" data-card-menu="${d.id}" aria-label="Preview options" aria-expanded="false" title="Preview options">${icon('more')}</button>
            <div class="card__body">
              <span class="card__group">${esc(GROUPS[d.group])}</span>
              <header>
                <h3><a href="${up}demos/${d.id}/">${esc(d.title)}</a></h3>
                <span class="badge badge--${d.category}">${CATEGORY_LABEL[d.category]}</span>
              </header>
              <p>${esc(d.description)}</p>
              <footer>
                <span class="card__tags">${d.tags.map((t) => `#${esc(t)}`).join(' ')}</span>
                <a class="btn btn--accent" href="${up}demos/${d.id}/">Learn &amp; copy ${icon('arrow-right')}</a>
              </footer>
            </div>
          </article>
        </li>`;
}

/* ---------- demo pages ---------- */

function demoPage(d, index) {
  const snip = snippets[d.id];
  const lineCount = (code) => code.trimEnd().split('\n').length;
  const group = GROUPS[d.group];
  const siblings = demos.filter((x) => x.group === d.group && x.id !== d.id);
  const prev = demos[index - 1];
  const next = demos[index + 1];
  const path = `demos/${d.id}/`;
  const title = `${d.title} in ${kind(d)} — 3D effect with copy-paste code | ${site.name}`;
  const description = `${d.description} Live preview, step-by-step explanation and copy-paste HTML/CSS${snip.js ? '/JS' : ''}.`;

  // The site's own Sass for this demo: shown for reading, like in the gallery dialog.
  const scssFile = `src/styles/demos/_${d.id}.scss`;
  const scss = existsSync(scssFile) ? readFileSync(scssFile, 'utf8').replace(/\r\n/g, '\n') : '';

  const panes = [
    { key: 'html', label: 'HTML', lang: 'html', code: snip.html },
    { key: 'css', label: 'CSS', lang: 'css', code: snip.css },
    ...(snip.js ? [{ key: 'js', label: 'JS', lang: 'js', code: snip.js }] : []),
    ...(scss ? [{ key: 'scss', label: 'Sass source', lang: 'scss', code: scss }] : []),
  ];

  // Every pane is real HTML, so crawlers and no-JS visitors get all of the code, stacked with
  // labels. demo-page.ts turns it into the same tabbed window the gallery dialog uses.
  const codeWindow = `
          <section class="codebox page-codebox" data-codebox>
            <div class="codebox__bar">
              <div class="codebox__tabs" role="tablist">
                <div class="codebox__seg" title="The standalone snippet: edit it here, copy it into your project">
                  ${panes.filter((x) => x.key !== 'scss').map((x) => `<button type="button" role="tab" data-pane="${x.key}" aria-selected="${x.key === 'css'}">${x.label}</button>`).join('')}
                </div>
                ${scss ? `<button type="button" role="tab" class="codebox__tab--source" data-pane="scss" aria-selected="false" title="How this site builds the effect, using the project Sass mixins. For reading, not for pasting">Sass source</button>` : ''}
              </div>
              <div class="codebox__look"><div class="codebox__dots" role="group" aria-label="Editor background"><button type="button" data-tint-set="default" aria-pressed="false" aria-label="default background" title="Default background"></button><button type="button" data-tint-set="rose" aria-pressed="false" aria-label="rose background" title="Rose background"></button><button type="button" data-tint-set="amber" aria-pressed="false" aria-label="amber background" title="Amber background"></button><button type="button" data-tint-set="green" aria-pressed="false" aria-label="green background" title="Green background"></button></div><button type="button" class="codebox__mode" data-editor-mode aria-label="Switch editor to light mode"></button></div>
              <button type="button" class="codebox__copy" data-copy-code>${icon('copy')} Copy</button>
            </div>
            ${panes
              .map(
                (x) => `<div class="page-pane" data-pane-body="${x.key}" data-lines="${lineCount(x.code)}">
              <h3 class="page-pane__label">${x.label} <span>${lineCount(x.code)} lines</span></h3>
              <pre><code>${highlight(x.code, x.lang)}</code></pre>
            </div>`,
              )
              .join('\n            ')}
            <div class="codebox__foot"><span class="code__note">Standalone snippet · plain CSS, no build step, no dependencies.</span><span class="codebox__lines"></span></div>
          </section>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: `${d.title} in ${kind(d)}`,
        description,
        url: `${site.url}/${path}`,
        inLanguage: 'en',
        isAccessibleForFree: true,
        license: 'https://opensource.org/licenses/MIT',
        proficiencyLevel: 'Beginner',
        keywords: ['CSS 3D', d.title, group, ...d.tags, ...d.technique].join(', '),
        author: { '@type': 'Person', name: site.author },
        publisher: { '@type': 'Organization', name: site.name, url: site.url },
      },
      {
        '@type': 'HowTo',
        name: `How to build a ${d.title.toLowerCase()} in ${kind(d)}`,
        step: snip.how.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text: strip(text) })),
      },
      crumbs([[site.name, `${site.url}/`], [group, `${site.url}/groups/${d.group}/`], [d.title, `${site.url}/${path}`]]),
    ],
  };

  const body = `
    <main class="page-main">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="../../">${esc(site.name)}</a> <span>/</span> <a href="../../groups/${d.group}/">${esc(group)}</a> <span>/</span> <span aria-current="page">${esc(d.title)}</span>
      </nav>

      <header class="page-head">
        <div class="page-head__main">
          <p class="viewer__meta">
            <span class="badge badge--${d.category}">${CATEGORY_LABEL[d.category]}</span>
            <a class="card__group" href="../../groups/${d.group}/">${esc(group)}</a>
            <span class="viewer__tags">${d.tags.map((t) => `#${esc(t)}`).join(' ')}</span>
          </p>
          <h1>${esc(d.title)} <small>in ${kind(d)}</small></h1>
          <p class="page-head__lead">${esc(d.description)}</p>
          <ul class="page-facts">
            <li><b>${lineCount(snip.css)}</b> lines of CSS</li>
            <li><b>${lineCount(snip.html)}</b> lines of HTML</li>
            <li>${snip.js ? `<b>${lineCount(snip.js)}</b> lines of JS` : '<b>No</b> JavaScript'}</li>
            <li>No dependencies</li>
            <li>MIT licensed</li>
          </ul>
        </div>
        <div class="page-tools" data-tools>
          <div class="page-tools__row">
            <button type="button" class="btn btn--accent" data-run>${icon('arrow-up-right')} Open in new tab</button>
            <button type="button" class="btn" data-copy-file>${icon('copy')} Copy as one HTML file</button>
          </div>
          <div class="page-tools__row">
            ${videoButton(d.id)}
            <button type="button" class="btn" data-share-link>${icon('share')} Share</button>
            <button type="button" class="btn" data-share-embed>Embed</button>
            <a class="btn" href="${site.repo}/blob/main/src/styles/demos/_${d.id}.scss" target="_blank" rel="noopener">GitHub ${icon('arrow-up-right')}</a>
          </div>
        </div>
      </header>

      <div class="page-cols">
        <div class="page-left">
          <div class="stage-wrap">
            <div class="stage stage--lg" data-demo="${d.id}">
              <noscript><p class="page-noscript">The live 3D preview needs JavaScript to load. The explanation and full code are below.</p></noscript>
            </div>
            <button type="button" class="stage__mode" data-stage-theme aria-label="Switch this preview to light"></button>
            <div class="stage__zoom" role="group" aria-label="Background dot size"><button type="button" data-dots="0" data-dots-scope="stage" aria-pressed="false" title="No background dots">Off</button><button type="button" data-dots="1" data-dots-scope="stage" aria-pressed="false" title="Background dots 1×">1×</button><button type="button" data-dots="2" data-dots-scope="stage" aria-pressed="true" title="Background dots 2×">2×</button><button type="button" data-dots="3" data-dots-scope="stage" aria-pressed="false" title="Background dots 3×">3×</button></div>
            <button type="button" class="stage__fs" data-fullscreen aria-label="Full screen"></button>
            <p class="stage__edited" data-edited hidden>Your edited version <button type="button" class="link" data-reset>Reset to original</button></p>
          </div>

          <h2>How it works</h2>
          <ol class="steps">${snip.how.map((s) => `<li>${s}</li>`).join('')}</ol>

          <h2>Key techniques</h2>
          <ul class="ingredients">${d.technique.map((t) => `<li><code>${esc(t)}</code></li>`).join('')}</ul>
        </div>

        <div class="page-right">
          <h2 class="visually-hidden">Copy-paste code</h2>${codeWindow}
        </div>
      </div>

      <section class="page-related">
        <h2>More ${esc(group.toLowerCase())}</h2>
        <ul class="page-cards">${siblings.map((x, i) => demoCard(x, '../../', i)).join('')}</ul>
        <p class="page-prevnext">
          ${prev ? `<a class="btn" href="../${prev.id}/">${icon('chevron-left')} ${esc(prev.title)}</a>` : '<span></span>'}
          ${next ? `<a class="btn" href="../${next.id}/">${esc(next.title)} ${icon('chevron-right')}</a>` : ''}
        </p>
      </section>
    </main>`;

  return shell({ path, depth: 2, title, description, jsonLd, body, script: 'demo-page.ts', image: `media/${d.id}.jpg`, imageAlt: `${d.title}: a CSS 3D effect, ${kind(d)}` });
}

/* ---------- embed pages: just the demo, for iframes and for the build-time recorder ---------- */

function embedPage(d) {
  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <link rel="canonical" href="${site.url}/demos/${d.id}/" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <title>${esc(d.title)} — ${esc(site.name)}</title>
  </head>
  <body class="embed">
    <div class="stage" data-demo="${d.id}"></div>
    <div class="embed__og" aria-hidden="true">
      <div class="embed__og-tags"><span class="embed__og-kind">${kind(d)}</span></div>
      <b>${esc(d.title)}</b>
      <span class="embed__og-site"><img class="embed__og-logo" src="../../icon.svg" alt="" /><span class="embed__og-name">${esc(site.name)}</span><span class="embed__og-url">${site.url.replace('https://', '')}</span></span>
    </div>
    <a class="embed__credit" href="${site.url}/demos/${d.id}/" target="_blank" rel="noopener">${esc(d.title)} · ${esc(site.name)} ${icon('arrow-up-right')}</a>
    <script type="module" src="/src/embed.ts"></script>
  </body>
</html>
`;
}

/* ---------- the home page's share image: the embed template with the site's own cube ---------- */

// Nothing in a share image may go stale (a count, a group name): every site that shows a shared
// link keeps its own copy of the image, and an old post never picks up a new one.
function coverPage() {
  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <title>${esc(site.name)}: share image</title>
  </head>
  <body class="embed og-cover">
    <div class="stage"><div class="scene"><div class="hero__cube"><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div>
    <div class="embed__og" aria-hidden="true">
      <div class="embed__og-tags"><span class="embed__og-kind">CSS 3D effects</span></div>
      <b>3D on the web, <span>no WebGL required.</span></b>
      <span class="embed__og-sub">Live effects, how each one works, and code you can copy. Free.</span>
      <span class="embed__og-site"><img class="embed__og-logo" src="../../icon.svg" alt="" /><span class="embed__og-name">${esc(site.name)}</span><span class="embed__og-url">${site.url.replace('https://', '')}</span></span>
    </div>
    <script type="module" src="/src/embed.ts"></script>
  </body>
</html>
`;
}

/* ---------- group pages ---------- */

function groupPage(g) {
  const members = demos.filter((d) => d.group === g);
  const label = GROUPS[g];
  const path = `groups/${g}/`;
  const title = `${label}: ${members.length} CSS 3D effects with copy-paste code | ${site.name}`;
  const description = `${members.length} free ${label.toLowerCase()} built with CSS 3D transforms — ${members
    .slice(0, 4)
    .map((d) => d.title.toLowerCase())
    .join(', ')} and more. Live effects, explanations and copy-paste code.`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${label} — CSS 3D effects`,
        description,
        url: `${site.url}/${path}`,
        hasPart: members.map((d) => ({ '@type': 'TechArticle', headline: d.title, url: `${site.url}/demos/${d.id}/` })),
      },
      crumbs([[site.name, `${site.url}/`], [label, `${site.url}/${path}`]]),
    ],
  };
  const body = `
    <main class="page-main">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="../../">${esc(site.name)}</a> <span>/</span> <span aria-current="page">${esc(label)}</span></nav>
      <header class="page-head">
        <div class="page-head__main">
          <h1>${esc(label)} <small>${members.length} CSS 3D effects</small></h1>
          <p class="page-head__lead">Every one runs live, with a step-by-step explanation and code you can edit and paste into your own project.</p>
          <ul class="page-facts">
            <li><b>${members.filter((d) => d.category === 'css').length}</b> pure CSS</li>
            <li><b>${members.filter((d) => d.category === 'js').length}</b> CSS + JS</li>
            <li>No dependencies</li>
            <li>MIT licensed</li>
          </ul>
        </div>
      </header>
      <ul class="page-cards">${members.map((d, i) => demoCard(d, '../../', i)).join('')}</ul>
      <section class="page-related">
        <h2>Other groups</h2>
        <p class="page-groups">${GROUP_ORDER.filter((x) => x !== g)
          .map((x) => `<a class="btn" href="../${x}/">${esc(GROUPS[x])}</a>`)
          .join(' ')}</p>
      </section>
    </main>`;
  return shell({ path, depth: 2, title, description, jsonLd, body, script: 'demo-page.ts', image: 'media/home.jpg', imageAlt: `${site.name}: ${demos.length} live CSS 3D effects with copy-paste code` });
}

/* ---------- write everything ---------- */

function write(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

for (const dir of ['demos', 'groups', 'embed', 'src/generated']) rmSync(dir, { recursive: true, force: true });

demos.forEach((d, i) => write(`demos/${d.id}/index.html`, demoPage(d, i)));
for (const d of demos) write(`embed/${d.id}/index.html`, embedPage(d));
write('embed/cover/index.html', coverPage());
write('src/generated/demo-ids.json', JSON.stringify(demos.map((d) => ({ id: d.id, how: interactionOf(d), pointer: interactionOf(d) !== 'none', hover: interactionOf(d) === 'hover' }))));
for (const g of GROUP_ORDER) write(`groups/${g}/index.html`, groupPage(g));

// Plain, crawlable links to every page, injected into the home page by vite.config.ts.
write(
  'src/generated/all-demos.html',
  `<nav class="all-demos" aria-label="All effects">
      <h2>Every effect <span>${demos.length} in ${GROUP_ORDER.length} groups</span></h2>
      <div class="all-demos__groups">
      ${GROUP_ORDER.map((g) => {
        const members = demos.filter((d) => d.group === g);
        // every link stays in the page (for search engines); CSS shows the first few, the button the rest
        return `<section><h3><a href="groups/${g}/">${esc(GROUPS[g])} <b>${members.length}</b></a></h3><ul>${members
          .map((d) => `<li><a href="demos/${d.id}/">${esc(d.title)}</a></li>`)
          .join('')}</ul>${members.length > 5 ? `<button type="button" class="link all-demos__more" data-group-list="${g}">Show all ${members.length}</button>` : ''}</section>`;
      }).join('\n      ')}
      </div>
    </nav>`,
);
write('src/generated/footer.html', siteFooter(''));
write('src/generated/logo.html', LOGO);

const today = new Date().toISOString().slice(0, 10);
const urls = ['', ...GROUP_ORDER.map((g) => `groups/${g}/`), ...demos.map((d) => `demos/${d.id}/`)];
write(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site.url}/${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`,
);
write('public/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);

console.log(`generated ${demos.length} demo pages, ${GROUP_ORDER.length} group pages, sitemap (${urls.length} urls)`);
