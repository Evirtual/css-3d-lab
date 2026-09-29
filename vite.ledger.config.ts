/**
 * Builds the ledger page the same way the app is built: TypeScript and Sass, through Vite.
 *
 * It used to be one 4,244-line file of markup, styles and behaviour under docs/, edited by hand.
 * That is why two separate mistakes on 2026-09-26 only showed themselves when somebody loaded the
 * page: a click handler left behind for an element that had been deleted, which blanked the whole
 * board, and buttons that ignored `hidden` because a class set its own `display`. Neither is subtle
 * in a stylesheet or a script of its own; both are invisible in four thousand lines of everything.
 *
 *   npm run build:ledger      writes docs/ledger.html and docs/assets/ledger-*.css|js
 *
 * OUTPUT GOES TO docs/, WHICH ALSO HOLDS DATA
 *
 * docs/ is not a build directory: it holds ledger.json, the per-check results, the checklist and
 * the written docs, all of which are read at runtime and none of which Vite knows about. So
 * emptyOutDir is off. Vite would otherwise clear the folder and take the results with it.
 */
import { defineConfig } from 'vite';
import { resolve, join } from 'node:path';
import { readdirSync, rmSync, copyFileSync } from 'node:fs';

/**
 * Clears the previous build's hashed files, and only those.
 *
 * emptyOutDir is off for the reason above, and the cost of that is every build leaving its old
 * ledger-[hash] files behind: after three builds docs/assets held five, of which the page
 * referenced two and nothing referenced the other three. They would have been committed and served
 * for ever. So this build's own output is cleared by name, and nothing else in docs/ is touched.
 */
function clearLedgerAssets() {
  return {
    name: 'clear-ledger-assets',
    /*
     * ONLY WHEN BUILDING.
     *
     * buildStart fires for the DEV SERVER too, so `npm run board:dev` deleted the committed
     * docs/assets/ledger-*.css|js -- the files docs/ledger.html actually references. The dev
     * server was fine, because it serves the page from source; the committed board was broken,
     * and stayed broken until somebody ran a build. It happened twice on 2026-09-29 and looked
     * both times like the page itself had failed: unstyled, stuck on "Loading ledger.json…",
     * with an inline icon rendered at its natural size because no stylesheet had loaded.
     *
     * A dev server must not delete build output. It is not building.
     */
    apply: 'build' as const,
    buildStart() {
      const dir = join(import.meta.dirname, 'docs', 'assets');
      try {
        for (const f of readdirSync(dir)) if (/^ledger-.*\.(js|css)$/.test(f)) rmSync(join(dir, f));
      } catch { /* no assets folder yet, which is the same as a clean one */ }
    },
  };
}

export default defineConfig({
  plugins: [
    clearLedgerAssets(),
    /*
     * README.md AND LICENSE LIVE AT THE REPOSITORY ROOT, AND docs/ IS WHAT IS SERVED.
     *
     * docs/index.html listed them as ../README.md and ../LICENSE, which is one level above the
     * published root -- so they answered 404 on the dev server, on the built board AND on the
     * deployed site. Two of the eight documents the guide offers had never been readable from it
     * anywhere, and the page said "Could not read ../README.md · 404" with a paragraph explaining
     * how to serve it, which was not the problem.
     *
     * Copying at build time rather than committing a second copy by hand: a duplicate README that
     * somebody has to remember to update is a README that is wrong. This one is rewritten from the
     * real file every time the board is built.
     */
    {
      name: 'carry-root-docs',
      apply: 'build' as const,
      closeBundle() {
        const here = resolve(import.meta.dirname, 'docs');
        for (const [from, to] of [['README.md', 'README.md'], ['LICENSE', 'LICENSE']]) {
          try { copyFileSync(resolve(import.meta.dirname, from), resolve(here, to)); }
          catch (e) { this.warn(`could not copy ${from} into docs/: ${(e as Error).message}`); }
        }
      },
    },
  ],
  /*
   * The dev server is the board's page, served from source.
   *
   * npm run board:dev runs this beside scripts/ledger-watch.mjs. Vite compiles the TypeScript and
   * the Sass and reloads them in place; everything that is actually the BOARD -- the state of what
   * is running, the run buttons, the ledger's own data -- is passed through to it, so the page on
   * this port is the real thing rather than a mock of it. Without the proxy the page would ask its
   * own dev server for /api/state, get the dev server's index page with a 200, and decide from
   * that that no board was there.
   */
  server: {
    /*
     * /index.html IS ON THIS LIST because the header's Docs button links to it.
     *
     * docs/index.html is the guide this board links out to, and docs/ is not this dev server's
     * root -- src/ledger is. So on 5173 the one link out of the page answered 404, while the same
     * link worked on the built board and on the deployed site. A dead link that is only dead in
     * development is the worst kind: it is dead exactly where somebody is working.
     */
    proxy: Object.fromEntries(['/api', '/ledger.json', '/ledger-watch.json', '/checks', '/reviews', '/index.html',
      /* The guide fetches these as it goes; without them it renders its own 404 for every page.
         Named one by one rather than proxying every .md, so this dev server keeps serving the
         board's own sources and only these are passed through. */
      '/START-HERE.md', '/LEDGER.md', '/ADDING-MODELS.md', '/VIEW-CONTRACT.md',
      '/RELEASE-CHECKLIST.md', '/COMMIT-AUDIT.md', '/ARTICLE-NOTES.md', '/README.md', '/LICENSE']
      .map((path) => [path, { target: `http://127.0.0.1:${process.env.PORT ?? 5178}`, changeOrigin: false }])),
  },
  root: resolve(import.meta.dirname, 'src/ledger'),
  // Relative, because the page is opened from a server AND straight from a file. An absolute base
  // would look for /assets/... on the filesystem root and find nothing.
  base: './',
  build: {
    outDir: resolve(import.meta.dirname, 'docs'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src/ledger/ledger.html'),
      output: {
        entryFileNames: 'assets/ledger-[hash].js',
        chunkFileNames: 'assets/ledger-[hash].js',
        assetFileNames: 'assets/ledger-[hash][extname]',
      },
    },
    // The page is read by people looking for why a number says what it says, so the built file
    // keeps its shape; the comments in it are the reasons.
    minify: false,
    target: 'es2022',
  },
});
