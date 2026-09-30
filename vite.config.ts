import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer, defineConfig, type Plugin, type ViteDevServer } from 'vite';

/* import.meta.dirname, not __dirname: __dirname only exists in this ESM file because Vite's bundling
   config loader injects it, and the native loader Vite is moving to does not. Node 20.11+. */
const root = import.meta.dirname;

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

/**
 * A model's embed page, served the moment the model exists.
 *
 * embed/<id>/index.html is written by `npm run generate`, and every browser check opens it. Until
 * it was written, the dev server answered /embed/<id>/ for a NEW model with the gallery's own
 * index.html — a 200 for the wrong page — and the check measured the first card it found there and
 * reported "nothing drawn", which points at the model. Six of eight people adding a model on
 * 2026-09-30 lost their first quarter of an hour to that. Now the dev server renders the page from
 * the same template the generator writes (scripts/embed-page.mjs) whenever the file is not there,
 * so a check works on a model the instant it is in src/models. The build still writes the files.
 */
function embedOnDemand(): Plugin {
  return {
    name: 'embed-on-demand',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const m = /^\/embed\/([a-z0-9]+)\/?(?:index\.html)?(?:\?.*)?$/.exec(req.url ?? '');
        if (!m || existsSync(resolve(root, 'embed', m[1], 'index.html'))) return next();
        try {
          const { demos } = await server.ssrLoadModule('/src/models/index.ts');
          const demo = demos.find((d: { id: string }) => d.id === m[1]);
          if (!demo) return next();
          const { icon } = await server.ssrLoadModule('/src/icons.ts');
          const { embedPage } = await server.ssrLoadModule('/scripts/embed-page.mjs');
          const site = JSON.parse(readFileSync(resolve(root, 'site.config.json'), 'utf8'));
          const html = await server.transformIndexHtml(req.url ?? '', embedPage(demo, site, icon));
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
        } catch (e) { next(e); }
      });
    },
  };
}

/**
 * Every snippet in its own chunk, fetched when a model is mounted.
 *
 * The page's JavaScript used to carry every snippet (the HTML, CSS, JS and explanation of every
 * model) whether the page showed one model or all of them: 248 KB gzipped of a model page's 304,
 * growing about 2 KB with every model added. Now `virtual:snippets` is an index of loaders, one
 * per model, and `virtual:snippet/snippet-<id>` is that model's snippet alone, so a model page
 * fetches its own snippet and the gallery fetches a card's as the card scrolls into view. The
 * snippets are read the way every script reads them, by loading src/models/snippets.ts: through
 * the dev server while it runs, through a throwaway one for a build. Scripts keep importing the
 * whole map; only what a browser loads changed.
 */
function snippetChunks(): Plugin {
  const INDEX = 'virtual:snippets';
  const ONE = 'virtual:snippet/snippet-';
  let server: ViteDevServer | undefined;
  let forBuild: Promise<Record<string, unknown>> | undefined;
  const all = async (): Promise<Record<string, unknown>> => {
    if (server) return (await server.ssrLoadModule('/src/models/snippets.ts')).snippets;
    forBuild ??= (async () => {
      const v = await createServer({ configFile: false, root, logLevel: 'error', server: { middlewareMode: true, hmr: false, watch: null } });
      try { return (await v.ssrLoadModule('/src/models/snippets.ts')).snippets; } finally { await v.close(); }
    })();
    return forBuild;
  };
  return {
    name: 'snippet-chunks',
    configureServer(s) { server = s; },
    resolveId(id) {
      if (id === INDEX || id.startsWith(ONE)) return '\0' + id;
      return null;
    },
    async load(id) {
      if (id === '\0' + INDEX) {
        const ids = Object.keys(await all());
        return `export const loaders = {\n${ids.map((k) => `  ${JSON.stringify(k)}: () => import(${JSON.stringify(ONE + k)}),`).join('\n')}\n};\n`;
      }
      if (id.startsWith('\0' + ONE)) {
        const key = id.slice(ONE.length + 1);
        const snip = (await all())[key];
        if (!snip) throw new Error(`no snippet for "${key}" in src/models/snippets.ts`);
        return `export const snippet = ${JSON.stringify(snip)};\n`;
      }
      return null;
    },
    // a model edited while the dev server runs: its chunk and the index are read again
    handleHotUpdate({ file, server: s }) {
      if (!/[\\/]src[\\/]models[\\/]/.test(file)) return;
      for (const [id, m] of s.moduleGraph.idToModuleMap) if (id.startsWith('\0virtual:snippet')) s.moduleGraph.invalidateModule(m);
    },
  };
}

// Relative base so the build works under any sub-path (GitHub Pages) and on a root domain.
export default defineConfig({
  base: './',
  plugins: [allModelsLinks(), embedOnDemand(), snippetChunks()],
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
