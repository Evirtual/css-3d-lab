/**
 * The embed page of one model: the page the checks photograph and the share image is shot from.
 *
 * One template, used twice: scripts/generate-pages.mjs writes it to embed/<id>/index.html for the
 * build, and the dev server (vite.config.ts, embedOnDemand) serves it for any model whose page has
 * not been written yet. Before that, a model added a minute ago failed every browser check with
 * "nothing drawn": the check opened /embed/<id>/, the dev server answered with the gallery's
 * index.html (a 200, for the wrong page), and the check measured the first card it found there.
 * Six of the eight people who added a model on 2026-09-30 lost their first quarter of an hour to
 * it. Not run on its own.
 */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kind = (d) => (d.category === 'css' ? 'pure CSS' : 'CSS + JavaScript');
/** A title with its hyphenated words kept whole, so a line never breaks inside "3D-printed". */
const ogTitle = (title) => esc(title).replace(/\S*-\S*/g, (w) => `<span class="nowrap">${w}</span>`);

/**
 * @param d     the gallery entry (id, title, category)
 * @param site  site.config.json (name, url)
 * @param icon  src/icons.ts's icon(name): the arrow on the credit link
 */
export function embedPage(d, site, icon) {
  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <link rel="canonical" href="${site.url}/models/${d.id}/" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <title>${esc(d.title)} — ${esc(site.name)}</title>
  </head>
  <body class="embed">
    <div class="stage" data-demo="${d.id}"></div>
    <div class="embed__og" aria-hidden="true">
      <div class="embed__og-tags"><span class="embed__og-kind">${kind(d)}</span></div>
      <b>${ogTitle(d.title)}</b>
      <span class="embed__og-sub">Live in your browser, explained step by step, with code you can copy.</span>
      <span class="embed__og-site"><img class="embed__og-logo" src="../../icon.svg" alt="" /><span class="embed__og-name">${esc(site.name)}</span><span class="embed__og-url">${site.url.replace('https://', '')}</span></span>
    </div>
    <a class="embed__credit" href="${site.url}/models/${d.id}/" target="_blank" rel="noopener">${esc(d.title)} · ${esc(site.name)} ${icon('arrow-up-right')}</a>
    <script type="module" src="/src/embed.ts"></script>
  </body>
</html>
`;
}
