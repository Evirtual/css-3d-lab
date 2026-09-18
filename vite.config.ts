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

/** Puts the generated plain-link list of every demo into the home page. */
function allDemosLinks(): Plugin {
  return {
    name: 'all-demos-links',
    transformIndexHtml(html, ctx) {
      if (!html.includes('<!--all-demos-->')) return html;
      const file = resolve(root, 'src/generated/all-demos.html');
      if (!existsSync(file)) throw new Error(`${ctx.filename}: run "npm run generate" first (missing ${file})`);
      return html.replace('<!--all-demos-->', readFileSync(file, 'utf8'));
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
