import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const root = __dirname;

/** Every generated page (scripts/generate-pages.mjs) becomes a build entry. */
function generatedPages(): Record<string, string> {
  const pages: Record<string, string> = {};
  for (const dir of ['demos', 'groups', 'embed']) {
    const base = resolve(root, dir);
    if (!existsSync(base)) continue;
    for (const id of readdirSync(base)) pages[`${dir}-${id}`] = resolve(base, id, 'index.html');
  }
  return pages;
}

/**
 * Home page: puts in the generated plain-link list of every demo, and the real number of demos
 * wherever the markup says %DEMO_COUNT% (title, description), so the count can never go stale.
 */
function allDemosLinks(): Plugin {
  return {
    name: 'all-demos-links',
    transformIndexHtml(html, ctx) {
      if (!html.includes('<!--all-demos-->')) return html;
      const file = resolve(root, 'src/generated/all-demos.html');
      const ids = resolve(root, 'src/generated/demo-ids.json');
      if (!existsSync(file) || !existsSync(ids)) throw new Error(`${ctx.filename}: run "npm run generate" first (missing ${file})`);
      const count = String(JSON.parse(readFileSync(ids, 'utf8')).length);
      // %IMAGE_VERSION%: a new share-image address per build (see IMAGE_VERSION in generate-pages)
      const version = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      return html
        .replace('<!--all-demos-->', readFileSync(file, 'utf8'))
        .replace('<!--site-footer-->', readFileSync(resolve(root, 'src/generated/footer.html'), 'utf8'))
        .replace('<!--logo-->', readFileSync(resolve(root, 'src/generated/logo.html'), 'utf8'))
        .replaceAll('%DEMO_COUNT%', count)
        .replaceAll('%IMAGE_VERSION%', version);
    },
  };
}

// Relative base so the build works under any sub-path (GitHub Pages) and on a root domain.
export default defineConfig({
  base: './',
  plugins: [allDemosLinks()],
  build: {
    rollupOptions: {
      input: { main: resolve(root, 'index.html'), ...generatedPages() },
    },
  },
});
