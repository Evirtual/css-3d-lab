import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const root = __dirname;

/** Every generated page (scripts/generate-pages.mjs) becomes a build entry. */
function generatedPages(): Record<string, string> {
  const pages: Record<string, string> = {};
  for (const dir of ['models', 'groups', 'embed']) {
    const base = resolve(root, dir);
    if (!existsSync(base)) continue;
    for (const id of readdirSync(base)) pages[`${dir}-${id}`] = resolve(base, id, 'index.html');
  }
  return pages;
}

/**
 * Home page: puts in the generated plain-link list of every demo, the snippet locations the viewer
 * links to, and the real number of demos
 * wherever the markup says %MODEL_COUNT% (title, description), so the count can never go stale.
 */
function allModelsLinks(): Plugin {
  return {
    name: 'all-models-links',
    transformIndexHtml(html, ctx) {
      if (!html.includes('<!--all-models-->')) return html;
      const file = resolve(root, 'src/generated/all-models.html');
      const ids = resolve(root, 'src/generated/model-ids.json');
      if (!existsSync(file) || !existsSync(ids)) throw new Error(`${ctx.filename}: run "npm run generate" first (missing ${file})`);
      const count = String(JSON.parse(readFileSync(ids, 'utf8')).length);
      // %IMAGE_VERSION%: a new share-image address per build (see IMAGE_VERSION in generate-pages)
      const version = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ''); // to the minute: a same-day fix gets a new address too
      // the JSON-LD dates: the day the home page first appeared and its sitemap lastmod (generate-pages)
      const dates = JSON.parse(readFileSync(resolve(root, 'src/generated/home-dates.json'), 'utf8'));
      return html
        .replace('<!--all-models-->', readFileSync(file, 'utf8'))
        .replace('<!--site-footer-->', readFileSync(resolve(root, 'src/generated/footer.html'), 'utf8'))
        .replace('<!--logo-->', readFileSync(resolve(root, 'src/generated/logo.html'), 'utf8'))
        // where each snippet sits in the repository, for the viewer's Source on GitHub button
        .replace('<!--snippet-sources-->', () => `<script type="application/json" id="snippet-sources">${readFileSync(resolve(root, 'src/generated/snippet-sources.json'), 'utf8')}</script>`)
        .replaceAll('%MODEL_COUNT%', count)
        .replaceAll('%IMAGE_VERSION%', version)
        .replaceAll('%DATE_PUBLISHED%', dates.published)
        .replaceAll('%DATE_MODIFIED%', dates.modified);
    },
  };
}

// Relative base so the build works under any sub-path (GitHub Pages) and on a root domain.
export default defineConfig({
  base: './',
  plugins: [allModelsLinks()],
  server: {
    watch: {
      /**
       * What the checks write while you work, which is not source. A check run writes its results
       * into the repository as it goes — docs/checks/*.json per check, docs/ledger*.json for the
       * ledger and its watch, .media-tmp for the frames it is decoding — and the dev server, which
       * watches everything under the project, answered each write with a full page reload. So a
       * check running in another window kept reloading the page being worked on, losing the pose,
       * the editor's caret and any unsaved edit. These are results, never imported by anything the
       * browser loads, so nothing on the page can go stale by not watching them. The trailing `*`
       * on the ledger's name takes in the `ledger.json.1234.tmp` siblings it writes through.
       * Vite keeps its own ignores (.git, node_modules) and adds these.
       */
      ignored: ['**/docs/checks/**', '**/docs/ledger*.json*', '**/.media-tmp/**'],
    },
  },
  build: {
    rollupOptions: {
      input: { main: resolve(root, 'index.html'), ...generatedPages() },
    },
  },
});
