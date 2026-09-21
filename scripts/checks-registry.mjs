/**
 * The one list of checks the ledger knows. scripts/capture-check.mjs runs and records them,
 * scripts/ledger.mjs gates "checked" on the per-model ones and writes this list into
 * docs/ledger.json, and docs/ledger.html draws every check from it: its progress bar, its column
 * in the model table, its part in "checked" and its row in the definitions dialog. Adding a check
 * here (and a parser for its output in capture-check.mjs) is all it takes for it to show up.
 * Not run on its own.
 *
 * Each entry:
 *  - key       the name on the command line (`npm run capture -- <key>`) and of its result file,
 *              docs/checks/<key>.json
 *  - script    the check itself, under scripts/
 *  - scope     'model': it says something about each model, and a model is not "checked" until
 *              it passes on the model's current code (the gates run in this list's order);
 *              'site': it says something about the site's pages (SEO, the sitemap), counted in
 *              pages, shown apart in the ledger's "Site" block, and not a gate on any model
 *  - name      a short lower-case name, used in the "not yet checked" breakdown
 *  - short     the model table's column header: one short word
 *  - title     the full name, with the script
 *  - label     how "checked" names it
 *  - rule      when it is cleared, in words, for the definitions dialog
 *  - pages     (site checks) how many pages there are to judge, when nothing has run yet
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const REGISTRY = [
  {
    key: 'models', script: 'check-models.mjs', scope: 'model', name: 'contract', short: 'Contract',
    title: 'Contract check (check-models)', label: 'contract check (check-models)',
    rule: 'cleared when its latest result is a pass on the model\'s current code',
  },
  {
    key: 'stages', script: 'check-stages.mjs', scope: 'model', name: 'stages', short: 'Stages',
    title: 'Same on every surface (check-stages)', label: 'stage check (check-stages)',
    rule: 'cleared when its latest result is a pass on the model\'s current code',
  },
  {
    key: 'motion', script: 'check-motion.mjs', scope: 'model', name: 'motion', short: 'Motion',
    title: 'Motion flags (check-motion)', label: 'motion check (check-motion)',
    rule: 'cleared when its latest run is smooth on the current code, or every flag that run raised is named as a false alarm, with a reason, in a fresh visual review (motionFlagsResolved); "broke" cannot be cleared by a review',
  },
  {
    key: 'exports', script: 'check-exports.mjs', scope: 'model', name: 'exports', short: 'Export',
    title: 'Export at default settings (check-exports)', label: 'export check at default settings (check-exports)',
    rule: 'cleared when its verdict at the export dialog\'s default settings (image 1:1 at 1600 px PNG, video 9:16 at 1080p, a loop) is a pass on the current code; a run that left the defaults out counts as never run, and the full settings matrix is a sample that does not gate',
  },
  {
    key: 'media', script: 'check-media.mjs', scope: 'model', name: 'share', short: 'Share',
    title: 'Share preview (check-media)', label: 'share preview check (check-media)',
    rule: 'cleared when its latest result is a pass on the model\'s current code: the model page\'s og:image is dist/media/<id>.jpg at the 2400 × 1260 its tags say, its og:title, og:description and image alt are the model\'s own title and description, the headline drawn in the image is the title and fits, and the picture is the model as the built site renders it now, loaded, finished, centred and full-sized. It runs on the built site, after npm run build && npm run media',
  },
  {
    key: 'seo', script: 'check-seo.mjs', scope: 'site', name: 'seo', short: 'SEO',
    title: 'SEO over the built site (check-seo)', label: 'SEO check (check-seo)',
    rule: 'cleared when its latest run on the built site (after npm run build) reports no FAIL line for the page; WAIVED and OWN-TEXT findings are listed, not failed',
    pages: 416,
  },
];

/** The per-model checks, in gate order. */
export const MODEL_CHECKS = REGISTRY.filter((c) => c.scope === 'model');
/** The site-wide checks. */
export const SITE_CHECKS = REGISTRY.filter((c) => c.scope === 'site');
export const byKey = (key) => REGISTRY.find((c) => c.key === key) ?? null;

/**
 * How many pages a site check judges, before any run says: the URLs in public/sitemap.xml (what
 * the site offers search engines), unless the entry names its own count.
 */
export function pagesFor(check, root = process.cwd()) {
  if (typeof check.pages === 'number') return check.pages;
  const file = join(root, 'public', 'sitemap.xml');
  if (!existsSync(file)) return null;
  return (readFileSync(file, 'utf8').match(/<loc>/g) ?? []).length;
}

/** What the page needs to draw each check: everything above except code. */
export const forPage = (root) => REGISTRY.map((c) => ({ key: c.key, script: `scripts/${c.script}`, scope: c.scope, name: c.name, short: c.short, title: c.title, label: c.label, rule: c.rule, ...(c.scope === 'site' ? { pages: pagesFor(c, root) } : {}) }));
