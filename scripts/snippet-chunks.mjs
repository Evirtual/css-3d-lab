/**
 * The Vite plugin that gives every snippet its own chunk, fetched when its model is mounted.
 *
 * The page's JavaScript used to carry every snippet (the HTML, CSS, JS and explanation of every
 * model) whether the page showed one model or all of them: 248 KB gzipped of a model page's 304,
 * growing about 2 KB with every model added. `virtual:snippets` is an index of loaders, one per
 * model, and `virtual:snippet/snippet-<id>` is that model's snippet alone (src/snippet-loader.ts
 * reads them), so a model page fetches its own snippet and the gallery fetches a card's as the
 * card scrolls into view. The snippets are read the way every script reads them, by loading
 * src/models/snippets.ts: through the dev server while it runs, through a throwaway one for a
 * build. Scripts keep importing the whole map; only what a browser loads changed.
 *
 * It lives here, not in vite.config.ts, because scripts/generate-pages.mjs starts Vite without
 * the config (the config lists the pages the generator is about to write) and loads src/video.ts,
 * which reaches src/snippet-loader.ts: without this plugin that load could not resolve
 * `virtual:snippets`, and `npm run build` stopped in its first step (2026-09-30).
 */
import { createServer } from 'vite';

const INDEX = 'virtual:snippets';
const ONE = 'virtual:snippet/snippet-';

/** @param {string} root the project root */
export function snippetChunks(root) {
  let server;
  let forBuild;
  const all = async () => {
    if (server) return (await server.ssrLoadModule('/src/models/snippets.ts')).snippets;
    forBuild ??= (async () => {
      // no dependency scan: it would crawl the app and stop at the virtual ids this very plugin serves
      const v = await createServer({ configFile: false, root, logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null } });
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
