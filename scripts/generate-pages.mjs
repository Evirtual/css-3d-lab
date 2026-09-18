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
const { CATEGORY_LABEL } = await vite.ssrLoadModule('/src/demos/types.ts');
const { highlight } = await vite.ssrLoadModule('/src/highlight.ts');
const { icon } = await vite.ssrLoadModule('/src/icons.ts');
await vite.close();

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const kind = (d) => (d.category === 'css' ? 'pure CSS' : 'CSS + JavaScript');

function shell({ path, depth, title, description, jsonLd, body, script, image }) {
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
        ? `<meta property="og:image" content="${site.url}/${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${site.url}/${image}" />`
        : '<meta name="twitter:card" content="summary" />'
    }
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧊</text></svg>" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body class="page">
    <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
    <nav class="topbar">
      <a class="topbar__brand" href="${up}">
        <span class="logo-cube" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
        ${esc(site.name)}
      </a>
      <div class="topbar__actions">
        <a class="btn" href="${up}">${icon('chevron-left')} All demos</a>
        <button id="pause" class="btn" type="button" aria-pressed="false"></button>
        <button id="theme" class="btn" type="button"></button>
        <a class="btn" href="${site.repo}" target="_blank" rel="noopener">GitHub ${icon('arrow-up-right')}</a>
        <a class="btn btn--kofi" href="${site.kofi}" target="_blank" rel="noopener">${icon('coffee')} Buy me a coffee</a>
      </div>
    </nav>
${body}
    <footer class="footer">
      <p>© 2026 ${esc(site.author)} · <a href="${site.repo}/blob/main/LICENSE" target="_blank" rel="noopener">MIT licensed</a> — every snippet is free to use in your own projects.</p>
    </footer>
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
  const description = `${d.description} Live demo, step-by-step explanation and copy-paste HTML/CSS${snip.js ? '/JS' : ''}.`;

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
                ${scss ? `<button type="button" role="tab" class="codebox__tab--source" data-pane="scss" aria-selected="false" title="How this site builds the demo, using the project Sass mixins. For reading, not for pasting">Sass source</button>` : ''}
              </div>
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
            <button type="button" class="btn" data-share-link>${icon('share')} Share</button>
            <button type="button" class="btn" data-share-embed>Embed</button>
            <button type="button" class="btn" data-share-codepen>CodePen ${icon('arrow-up-right')}</button>
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

  return shell({ path, depth: 2, title, description, jsonLd, body, script: 'demo-page.ts', image: `media/${d.id}.jpg` });
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
    <title>${esc(d.title)} — ${esc(site.name)}</title>
  </head>
  <body class="embed">
    <div class="stage" data-demo="${d.id}"></div>
    <div class="embed__og" aria-hidden="true">
      <span class="embed__og-kind">${kind(d)}</span>
      <b>${esc(d.title)}</b>
      <span class="embed__og-site">${esc(site.name)} · ${site.url.replace('https://', '')}</span>
    </div>
    <a class="embed__credit" href="${site.url}/demos/${d.id}/" target="_blank" rel="noopener">${esc(d.title)} · ${esc(site.name)} ${icon('arrow-up-right')}</a>
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
    .join(', ')} and more. Live demos, explanations and copy-paste code.`;
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
          <p class="page-head__lead">Every one has a live demo, a step-by-step explanation and code you can edit and paste into your own project.</p>
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
  return shell({ path, depth: 2, title, description, jsonLd, body, script: 'demo-page.ts' });
}

/* ---------- write everything ---------- */

function write(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

for (const dir of ['demos', 'groups', 'embed', 'src/generated']) rmSync(dir, { recursive: true, force: true });

demos.forEach((d, i) => write(`demos/${d.id}/index.html`, demoPage(d, i)));
for (const d of demos) write(`embed/${d.id}/index.html`, embedPage(d));
write('src/generated/demo-ids.json', JSON.stringify(demos.map((d) => ({ id: d.id, pointer: d.category === 'js' || d.tags.includes('hover') }))));
for (const g of GROUP_ORDER) write(`groups/${g}/index.html`, groupPage(g));

// Plain, crawlable links to every page, injected into the home page by vite.config.ts.
write(
  'src/generated/all-demos.html',
  `<nav class="all-demos" aria-label="All demos">
      <h2>All ${demos.length} demos</h2>
      ${GROUP_ORDER.map(
        (g) => `<section><h3><a href="groups/${g}/">${esc(GROUPS[g])}</a></h3><ul>${demos
          .filter((d) => d.group === g)
          .map((d) => `<li><a href="demos/${d.id}/">${esc(d.title)}</a></li>`)
          .join('')}</ul></section>`,
      ).join('\n      ')}
    </nav>`,
);

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
