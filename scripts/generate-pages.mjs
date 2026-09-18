// Generates one real HTML page per demo and per group, plus sitemap.xml, robots.txt and the
// "all demos" link list for the home page. Runs before `vite` / `vite build`.
//
// Why: search engines rank PAGES. A single-page gallery is one page about "3D CSS"; fifty pages
// can each answer one specific search ("css 3d pyramid"). Everything that matters for ranking —
// title, description, heading, explanation, code — is written into the HTML as plain text, so it
// is readable without running any JavaScript.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function shell({ path, depth, title, description, jsonLd, body, script }) {
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
    <meta name="twitter:card" content="summary" />
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

function demoCardLink(d, up) {
  return `<li><a href="${up}demos/${d.id}/"><b>${esc(d.title)}</b><span>${esc(d.description)}</span></a></li>`;
}

/* ---------- demo pages ---------- */

function demoPage(d, index) {
  const snip = snippets[d.id];
  const group = GROUPS[d.group];
  const siblings = demos.filter((x) => x.group === d.group && x.id !== d.id);
  const prev = demos[index - 1];
  const next = demos[index + 1];
  const path = `demos/${d.id}/`;
  const title = `${d.title} in ${kind(d)} — 3D effect with copy-paste code | ${site.name}`;
  const description = `${d.description} Live demo, step-by-step explanation and copy-paste HTML/CSS${snip.js ? '/JS' : ''}.`;

  const codeBlock = (label, lang, code) => `
        <section class="codebox page-code" data-code>
          <div class="codebox__bar">
            <h3 class="codebox__label">${label} <span>${code.trimEnd().split('\n').length} lines</span></h3>
            <button type="button" class="codebox__copy" data-copy-code>${icon('copy')} Copy</button>
          </div>
          <pre><code>${highlight(code, lang)}</code></pre>
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
        <p class="viewer__meta">
          <span class="badge badge--${d.category}">${CATEGORY_LABEL[d.category]}</span>
          <a class="card__group" href="../../groups/${d.group}/">${esc(group)}</a>
          <span class="viewer__tags">${d.tags.map((t) => `#${esc(t)}`).join(' ')}</span>
        </p>
        <h1>${esc(d.title)} <small>in ${kind(d)}</small></h1>
        <p>${esc(d.description)}</p>
        <p class="page-actions">
          <button type="button" class="btn btn--accent" data-run>${icon('play')} Run standalone</button>
          <button type="button" class="btn" data-copy-file>${icon('copy')} Copy as one HTML file</button>
          <a class="btn" href="${site.repo}/blob/main/src/styles/demos/_${d.id}.scss" target="_blank" rel="noopener">SCSS source ${icon('arrow-up-right')}</a>
        </p>
      </header>

      <div class="page-cols">
        <div class="page-left">
          <div class="stage stage--lg" data-demo="${d.id}">
            <noscript><p class="page-noscript">The live 3D preview needs JavaScript to load. The explanation and full code are below.</p></noscript>
          </div>

          <h2>How it works</h2>
          <ol class="steps">${snip.how.map((s) => `<li>${s}</li>`).join('')}</ol>

          <h2>Key techniques</h2>
          <ul class="ingredients">${d.technique.map((t) => `<li><code>${esc(t)}</code></li>`).join('')}</ul>
        </div>

        <div>
          <h2 class="page-codehead">Copy-paste code</h2>
          <p class="page-note">Minimal standalone version: plain CSS, no build step, no dependencies. MIT licensed.</p>
          ${codeBlock('HTML', 'html', snip.html)}
          ${codeBlock('CSS', 'css', snip.css)}
          ${snip.js ? codeBlock('JavaScript', 'js', snip.js) : ''}
        </div>
      </div>

      <section class="page-related">
        <h2>More ${esc(group.toLowerCase())}</h2>
        <ul class="page-links">${siblings.map((x) => demoCardLink(x, '../../')).join('')}</ul>
        <p class="page-prevnext">
          ${prev ? `<a class="btn" href="../${prev.id}/">${icon('chevron-left')} ${esc(prev.title)}</a>` : '<span></span>'}
          ${next ? `<a class="btn" href="../${next.id}/">${esc(next.title)} ${icon('chevron-right')}</a>` : ''}
        </p>
      </section>
    </main>`;

  return shell({ path, depth: 2, title, description, jsonLd, body, script: 'demo-page.ts' });
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
        <h1>${esc(label)} <small>${members.length} CSS 3D effects</small></h1>
        <p>Every one has a live demo, a step-by-step explanation and code you can paste into your own project.</p>
      </header>
      <ul class="page-links page-links--wide">${members.map((d) => demoCardLink(d, '../../')).join('')}</ul>
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

for (const dir of ['demos', 'groups', 'src/generated']) rmSync(dir, { recursive: true, force: true });

demos.forEach((d, i) => write(`demos/${d.id}/index.html`, demoPage(d, i)));
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
