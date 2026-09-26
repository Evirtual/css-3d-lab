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
import { readdirSync, rmSync } from 'node:fs';

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
    buildStart() {
      const dir = join(import.meta.dirname, 'docs', 'assets');
      try {
        for (const f of readdirSync(dir)) if (/^ledger-.*\.(js|css)$/.test(f)) rmSync(join(dir, f));
      } catch { /* no assets folder yet, which is the same as a clean one */ }
    },
  };
}

export default defineConfig({
  plugins: [clearLedgerAssets()],
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
