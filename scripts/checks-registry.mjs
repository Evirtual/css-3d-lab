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
 *  - ruleVersion  the version of what the check holds a model to. BUMP IT WHENEVER A RULE'S MEANING
 *              CHANGES: a limit made stricter or looser, a new thing judged, a state or surface added
 *              or dropped. capture-check records it with every result, and the ledger marks a result
 *              recorded under another version stale, "rule changed (vN → vM)", so a pass under the
 *              old rule never counts as a pass under the new one. A change that only reports
 *              differently (a message, a column) is not a new version.
 *  - rules     the history behind ruleVersion, oldest first: { v, from, what }, `from` the commit
 *              that brought version v in (null for the first, and for any version made after results
 *              began recording theirs). A result recorded before versions were recorded is given the
 *              version its commit had.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const REGISTRY = [
  {
    key: 'models', script: 'check-models.mjs', scope: 'model', name: 'contract', short: 'Contract',
    ruleVersion: 3,
    rules: [
      { v: 1, from: null, what: 'the band, the floor, the widest, the edges and the corners, as VIEW-CONTRACT.md had them; centred within 4vmin sideways and 11vmin vertically with a control zone' },
      { v: 2, from: '69cae52', what: 'every model centred within 4vmin both ways, a control zone included: the zone is sized by its content and the whole drawn stack is centred' },
      // from null: every result since records its ruleVersion, so none has to be dated by its commit
      { v: 3, from: null, what: 'as v2, and the snippet must set its base unit --u in vmin (ground rule 1), which the ledger used to count apart as Not converted' },
    ],
    title: 'Contract check (check-models)', label: 'contract check (check-models)',
    rule: 'cleared when its latest result is a pass on the model\'s current code',
  },
  {
    key: 'stages', script: 'check-stages.mjs', scope: 'model', name: 'stages', short: 'Stages',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
    title: 'Same on every surface (check-stages)', label: 'stage check (check-stages)',
    rule: 'cleared when its latest result is a pass on the model\'s current code',
  },
  {
    key: 'motion', script: 'check-motion.mjs', scope: 'model', name: 'motion', short: 'Motion',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
    title: 'Motion flags (check-motion)', label: 'motion check (check-motion)',
    rule: 'cleared when its latest run is smooth on the current code, or every flag that run raised is named as a false alarm, with a reason, in a fresh visual review (motionFlagsResolved); "broke" cannot be cleared by a review',
  },
  {
    key: 'exports', script: 'check-exports.mjs', scope: 'model', name: 'exports', short: 'Export',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
    title: 'Export at default settings (check-exports)', label: 'export check at default settings (check-exports)',
    rule: 'cleared when its verdict at the export dialog\'s default settings (image 1:1 at 1600 px PNG, video 9:16 at 1080p, a loop) is a pass on the current code; a run that left the defaults out counts as never run, and the full settings matrix is a sample that does not gate',
  },
  {
    key: 'media', script: 'check-media.mjs', scope: 'model', name: 'share', short: 'Share',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
    title: 'Share preview (check-media)', label: 'share preview check (check-media)',
    rule: 'cleared when its latest result is a pass on the model\'s current code: the model page\'s og:image is dist/media/<id>.jpg at the 2400 × 1260 its tags say, its og:title, og:description and image alt are the model\'s own title and description, the headline drawn in the image is the title and fits, and the picture is the model as the built site renders it now, loaded, finished, centred and full-sized. It runs on the built site, after npm run build && npm run media',
  },
  {
    key: 'access', script: 'check-access.mjs', scope: 'model', name: 'access', short: 'Access',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
    title: 'Pause and access (check-access)', label: 'pause and access check (check-access)',
    rule: 'cleared when its latest result is a pass on the model\'s current code: paused by the site, with reduced motion emulated, its picture does not change over 4 seconds (a script\'s timer included), and a model that moved moves again when un-paused; every rendered control has an accessible name; Tab reaches everything a mouse can use, and focus shows',
  },
  {
    key: 'boxsizing', script: 'check-boxsizing.mjs', scope: 'model', name: 'box sizing', short: 'Box',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
    title: 'No reliance on outside CSS (check-boxsizing)', label: 'box-sizing check (check-boxsizing)',
    rule: 'cleared when its latest result is a pass on the model\'s current code: its standalone file draws the same, at rest and with :hover forced, with and without a page rule making every box border-box (within 0.25% of the canvas over its own noise), or its gallery entry says boxSizing: \'content-box by design: <why>\' and it does differ; a mark on a model that draws the same fails',
  },
  {
    key: 'contrast', script: 'check-contrast.mjs', scope: 'model', name: 'contrast', short: 'Text',
    ruleVersion: 2,
    rules: [
      { v: 1, from: null, what: 'every text, each copy judged on its own' },
      { v: 2, from: null, what: 'a stacked copy of a word (a layer of an extruded headline), lying at least half on a readable copy of the same text, is judged by that front copy' },
    ],
    title: 'Text readable on both stages (check-contrast)', label: 'text contrast check (check-contrast)',
    rule: "cleared when its latest result is a pass on the model's current code: every text it shows, at rest, with :hover forced, with the pointer on it and after each of its controls is clicked, reaches WCAG AA against the pixels behind it (4.5:1, or 3:1 for text at least 24px, or bold and 18.66px, on a card's canvas) on the dark stage and on the light one; text in a disabled control is exempt and listed",
  },
  {
    key: 'seo', script: 'check-seo.mjs', scope: 'site', name: 'seo', short: 'SEO',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
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
/** The version of a check's rule now (1 for a key the registry does not know). */
export const ruleVersionOf = (key) => byKey(key)?.ruleVersion ?? 1;
/**
 * The rule version a result was judged under: the one it recorded, or, for a result from before
 * versions were recorded, the newest version whose `from` commit the result's commit contains
 * (`contains(from, commit)` answers that; without an answer it is the first version).
 */
export function ruleVersionOfResult(key, r, contains) {
  if (typeof r?.ruleVersion === 'number') return r.ruleVersion;
  const rules = byKey(key)?.rules ?? [];
  let v = rules[0]?.v ?? 1;
  for (const rule of rules) if (rule.from && r?.commit && contains?.(rule.from, r.commit)) v = rule.v;
  return v;
}
/** Why a result is stale on its rule alone, or null: "rule changed (v1 → v2): <what the new rule is>". */
export function ruleStale(key, r, contains) {
  const then = ruleVersionOfResult(key, r, contains), now = ruleVersionOf(key);
  if (then === now) return null;
  const what = byKey(key)?.rules?.find((x) => x.v === now)?.what;
  return `rule changed (v${then} → v${now})${what ? `: ${what}` : ''}`;
}

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
export const forPage = (root) => REGISTRY.map((c) => ({ key: c.key, script: `scripts/${c.script}`, scope: c.scope, name: c.name, short: c.short, title: c.title, label: c.label, rule: c.rule, ruleVersion: c.ruleVersion, rules: c.rules, ...(c.scope === 'site' ? { pages: pagesFor(c, root) } : {}) }));
