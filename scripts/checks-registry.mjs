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
 *  - steps     what the check covers, in the order it covers it: { key, label, proves }, and
 *              `implemented: false` on a part the check does not judge yet, which the ledger shows
 *              as "not implemented yet" rather than as a blank. This is the DECLARATION only; what a
 *              run actually covered per model, and how each part came out, is read from the check's
 *              own recorded lines by scripts/capture-check.mjs (STEP_READERS there) and summed into
 *              docs/checks/<key>.json under `steps`. A part no recorded line speaks to is counted
 *              "not recorded", never as a pass: the ledger may only say what a run said.
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
    steps: [
      { key: 'unit', label: 'base unit --u in vmin', proves: 'the snippet\'s own CSS sets --u to a value in vmin (VIEW-CONTRACT.md ground rule 1), so every length is tied to the canvas' },
      { key: 'ink', label: 'something solid drawn', proves: 'the model appears on the card and draws solid ink, not only faint; a full-canvas scene fills its canvas' },
      { key: 'size', label: 'inside the band', proves: 'at least the floor tall and no taller than the band (a wide model is held to a width instead)' },
      { key: 'width', label: 'no wider than the widest', proves: 'the drawn box stays inside the widest the contract allows' },
      { key: 'centred', label: 'centred within 4vmin', proves: 'the whole drawn stack, a control zone included, is centred both ways' },
      { key: 'edges', label: 'clear of the edge and the top corners', proves: 'it does not reach the canvas edge or crowd a top corner' },
      { key: 'rest', label: 'the resting pose', proves: 'what a paused or offscreen card shows is drawn, tall enough and centred on its own' },
      { key: 'open', label: 'open, for a control that expands', proves: 'a model marked "expands" is drawn, inside the band and centred once something opens it' },
    ],
  },
  {
    key: 'stages', script: 'check-stages.mjs', scope: 'model', name: 'stages', short: 'Stages',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
    title: 'Same on every surface (check-stages)', label: 'stage check (check-stages)',
    rule: 'cleared when its latest result is a pass on the model\'s current code',
    steps: [
      { key: 'page', label: 'the model page (the reference)', proves: 'the model page is measured: every other surface is compared against it' },
      { key: 'card', label: 'the gallery card', proves: 'the card draws the model where the page does' },
      { key: 'viewer', label: 'the viewer', proves: 'the viewer draws the model where the page does' },
      { key: 'edit', label: 'the editor (live, reset, saved)', proves: 'editing, resetting and saving leave the model where the page has it' },
      { key: 'large', label: 'the large stage', proves: 'a bigger canvas draws the model where the page does' },
      { key: 'fullscreen', label: 'fullscreen', proves: 'fullscreen draws the model where the page does' },
      { key: 'shapes', label: 'the export dialog at 1:1, 4:3, 3:2, 16:9, 9:16', proves: 'every export shape draws the model where the page does' },
      { key: 'files', label: 'the standalone file, at 1280 × 800 and 400 × 400', proves: 'the downloaded file draws the model where the page does, on a wide canvas and a small one' },
    ],
  },
  {
    key: 'motion', script: 'check-motion.mjs', scope: 'model', name: 'motion', short: 'Motion',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
    title: 'Motion flags (check-motion)', label: 'motion check (check-motion)',
    rule: 'cleared when its latest run is smooth on the current code, or every flag that run raised is named as a false alarm, with a reason, in a fresh visual review (motionFlagsResolved); "broke" cannot be cleared by a review',
    steps: [
      { key: 'loop', label: 'the loop', proves: 'one period of the model\'s longest endless animation is filmed frame by frame and no frame flickers or draws wrong' },
      { key: 'hover', label: 'hover', proves: 'every hover target the model\'s own CSS names gets a real pointer on it and away again, and what that starts is filmed' },
      { key: 'controls', label: 'controls', proves: 'every button, toggle, radio, slider and select the model draws is worked, and what it starts is filmed' },
      { key: 'focus', label: 'focus', proves: 'every focus target the model\'s CSS names is focused by keyboard and blurred, and what that starts is filmed' },
    ],
  },
  {
    key: 'exports', script: 'check-exports.mjs', scope: 'model', name: 'exports', short: 'Export',
    ruleVersion: 7,
    rules: [
      { v: 1, from: null, what: 'as first recorded' },
      { v: 2, from: null, what: 'a full-canvas scene\'s clear PNG is not held to the see-through test (it paints the canvas by design); the slider\'s scaling is judged to 4% or 2 px at each edge, whichever is more' },
      { v: 3, from: null, what: 'the drift test fails only on what a file can be held to on its own: the model missing from the first frame or from more than a twentieth of them, a file the app says joins up whose last frame is not its first, and a live take of a model that was standing still. How far the box steps between frames, and how much the picture changes, are printed as readings for a person ("look:") and fail nothing: a recording of the model\'s own loop is its own timeline drawn again, and the same frames are flagged at 1:1, 16:9 and 9:16, so the file alone cannot tell fast motion from a stutter' },
      { v: 4, from: null, what: 'the per-model run films drift as two seconds of the held model, live at 480p, which must come back as 60 frames of the same picture; the full-length drift (the model\'s whole turn as a loop, decoded frame by frame) stays on the sample run. A size the dialog shows disabled — one this browser cannot encode, or one the app holds back ("coming later") — is not asked for and is listed as not testable here' },
      { v: 5, from: null, what: 'a live take that changes is the app\'s fault only when the canvas itself stood still: the check shoots the screen before the take and again after it, and a model that does not stand still while its animations are held (flaptext starts a flap-land from its script, the clock ticks on a timer) has its changing file read as its own doing, not the recorder\'s' },
      { v: 6, from: null, what: 'a picture\'s corner may be what the canvas itself has there, not only the stage\'s backdrop: a model may paint its own corner (confetti\'s pieces lie all over the canvas), and the test fails only when the file\'s corner is neither the backdrop nor what the canvas shows there' },
      { v: 7, from: null, what: 'a box edge the canvas and the file disagree about ONLY where the ink is a hairline is a reading for a person, not a mismatch: the same edge is drawn twice at sizes that differ five- or tenfold, and a thin fading tail lands in whole ink pixels on a canvas of a few hundred while the file spreads it over five at partial coverage, too thin to count. The edges are judged again where the ink is at least 1% of the side thick — which both draw the same way — and the gap is excused only when those firm edges agree and the whole disagreement lies within 5% of them. layertext\'s 1080p frame 0, "2.4% short on the right", is that hairline: the pink tail off its stacked letters is in the file too, out past where the screen\'s box ends' },
    ],
    title: 'Export at default settings (check-exports)', label: 'export check at default settings (check-exports)',
    rule: 'cleared when its verdict at the export dialog\'s default settings (image 1:1 at 1600 px PNG, video 9:16 at 1080p, a loop) is a pass on the current code; a run that left the defaults out counts as never run, and the full settings matrix is a sample that does not gate. The drift readings it prints for a person ("look:") are not part of the verdict',
    steps: [
      { key: 'image', label: 'image 1:1 at 1600 px, PNG', proves: 'the dialog\'s default picture comes out at the size it promises and draws the canvas' },
      { key: 'video', label: 'video 9:16 at 1080p, MP4, a loop', proves: 'the dialog\'s default video comes out at the size it promises and its first frame draws the canvas' },
      { key: 'drift', label: 'the drift take at 9:16, 480p', proves: 'the model is in the take from its first frame on, and a file the app says joins up ends where it began' },
      { key: 'formats', label: 'the PNG format row at 800 px', proves: 'the picture format the defaults use writes a file that decodes as that format' },
      { key: 'matrix', label: 'the rest of the settings matrix', proves: 'every other shape, size, quality, format and the slider. Run on a sample of models, and never part of a model\'s verdict' },
    ],
  },
  {
    key: 'media', script: 'check-media.mjs', scope: 'model', name: 'share', short: 'Share',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
    title: 'Share preview (check-media)', label: 'share preview check (check-media)',
    rule: 'cleared when its latest result is a pass on the model\'s current code: the model page\'s og:image is dist/media/<id>.jpg at the 2400 × 1260 its tags say, its og:title, og:description and image alt are the model\'s own title and description, the headline drawn in the image is the title and fits, and the picture is the model as the built site renders it now, loaded, finished, centred and full-sized. It runs on the built site, after npm run build && npm run media',
    steps: [
      { key: 'file', label: 'the image file', proves: 'dist/media/<id>.jpg exists and is a JPEG at 2400 × 1260' },
      { key: 'tags', label: 'the page\'s tags', proves: 'og:image, og:title, og:description, og:url, the twitter tags and the image alt are there, versioned, and are the model\'s own title and description' },
      { key: 'render', label: 'the picture is the model as it renders now', proves: 'the shot is the built site\'s own render, loaded, fonts and images in, animations finished' },
      { key: 'frame', label: 'the model in the frame', proves: 'the model is visible, solid, big enough and inside its side of the image' },
      { key: 'headline', label: 'the headline drawn in the image', proves: 'the headline is the model\'s title, fits its panel and runs into nothing else' },
    ],
  },
  {
    key: 'access', script: 'check-access.mjs', scope: 'model', name: 'access', short: 'Access',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
    title: 'Pause and access (check-access)', label: 'pause and access check (check-access)',
    rule: 'cleared when its latest result is a pass on the model\'s current code: paused by the site, with reduced motion emulated, its picture does not change over 4 seconds (a script\'s timer included), and a model that moved moves again when un-paused; every rendered control has an accessible name; Tab reaches everything a mouse can use, and focus shows',
    steps: [
      { key: 'pause', label: 'pause', proves: 'with the site paused and reduced motion emulated, the picture does not change over 4 seconds, a script\'s slow timer included' },
      { key: 'resume', label: 'resume', proves: 'a model that moved on its own moves again once it is un-paused' },
      { key: 'names', label: 'names', proves: 'every rendered thing a visitor can focus or operate has an accessible name in Chromium\'s own accessibility tree' },
      { key: 'keyboard', label: 'keyboard', proves: 'Tab reaches every control, every element the script listens to for the mouse, and every hover target, and each has the same effect on focus' },
      { key: 'focus', label: 'focus shows', proves: 'every tab stop changes something on screen when Tab reaches it' },
    ],
  },
  {
    key: 'boxsizing', script: 'check-boxsizing.mjs', scope: 'model', name: 'box sizing', short: 'Box',
    ruleVersion: 1,
    rules: [{ v: 1, from: null, what: 'as first recorded' }],
    title: 'No reliance on outside CSS (check-boxsizing)', label: 'box-sizing check (check-boxsizing)',
    rule: 'cleared when its latest result is a pass on the model\'s current code: its standalone file draws the same, at rest and with :hover forced, with and without a page rule making every box border-box (within 0.25% of the canvas over its own noise), or its gallery entry says boxSizing: \'content-box by design: <why>\' and it does differ; a mark on a model that draws the same fails',
    steps: [
      { key: 'rest', label: 'at rest', proves: 'the standalone file draws the same at rest with and without a page rule making every box border-box' },
      { key: 'hover', label: 'with :hover forced', proves: 'the same holds with every :hover rule forced on' },
      { key: 'mark', label: 'the gallery\'s boxSizing mark', proves: 'a model that does differ says so in its entry, in the words the check asks for, and a model that draws the same carries no mark' },
    ],
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
    steps: [
      { key: 'texts', label: 'every text it draws', proves: 'each text the model shows is found and read against the pixels behind it' },
      { key: 'dark', label: 'the dark stage', proves: 'every reading reaches WCAG AA on the dark stage' },
      { key: 'light', label: 'the light stage', proves: 'every reading reaches WCAG AA on the light stage' },
      { key: 'surfaces', label: 'at rest, :hover forced, the pointer on it, each control clicked', proves: 'the text is read again in each of those states' },
      { key: 'disabled', label: 'text in a disabled control', proves: 'exempt from AA, and listed by name rather than failed' },
    ],
  },
  {
    key: 'seo', script: 'check-seo.mjs', scope: 'site', name: 'seo', short: 'SEO',
    ruleVersion: 2,
    rules: [
      { v: 1, from: null, what: 'as first recorded, with the page weight budget measured on 2026-09-22: model 275 KB, home 280 KB gzipped' },
      { v: 2, from: null, what: 'as v1, with the weight budget re-measured on 2026-09-23 and moved up with the same headroom (model 288 KB, home 293 KB): a day of reviewed model edits and the View zoom control spent the old one' },
    ],
    title: 'SEO over the built site (check-seo)', label: 'SEO check (check-seo)',
    rule: 'cleared when its latest run on the built site (after npm run build) reports no FAIL line for the page; WAIVED and OWN-TEXT findings are listed, not failed',
    // its rules, as check-seo prints them (`FAIL <page> <rule>: <what>`). A page's result names only
    // the rules that found something on it, so a rule's "no finding" count is exactly that: pages the
    // run reported nothing under it. It does not say the rule applies to every one of them (weight is
    // asked of a model page and the home page; nojs of a model page).
    steps: [
      { key: 'title', label: 'title', proves: 'one <title>, within the length limit, unique across public pages' },
      { key: 'description', label: 'description', proves: 'one meta description, within its length limits, unique' },
      { key: 'canonical', label: 'canonical', proves: 'exactly one, absolute https, on the sitemap\'s host, pointing at the page itself' },
      { key: 'headings', label: 'headings', proves: 'exactly one <h1>, and no heading level skipped on the way down' },
      { key: 'jsonld', label: 'jsonld', proves: 'every block parses, each node has the fields its @type needs, the dates match the sitemap, breadcrumbs point at real pages, and nothing calls the whole site MIT' },
      { key: 'social', label: 'social', proves: 'og:title, og:description, og:url, og:image, og:type and twitter:card are there (whether they are right for a model is check-media\'s job)' },
      { key: 'robots-meta', label: 'robots-meta', proves: 'public pages are not noindex, and utility pages are' },
      { key: 'lang', label: 'lang', proves: '<html lang> is set' },
      { key: 'nojs', label: 'nojs', proves: 'a model page\'s plain HTML, scripts removed, still holds the title, the description and every how-it-works step' },
      { key: 'weight', label: 'weight', proves: 'the JS and CSS a model page and the home page load up front, gzipped, stay within the budget' },
      { key: 'links', label: 'links', proves: 'every href and src to this site is a file in dist/' },
      { key: 'sitemap', label: 'sitemap', proves: 'every public page is listed once with a lastmod, every listed URL is a page in dist/, and every model has its page' },
      { key: 'robots', label: 'robots.txt', proves: 'it names the sitemap and disallows no public page' },
      { key: 'orphan', label: 'orphan', proves: 'every public page but the home page is linked from another public page' },
    ],
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

/** A check's declared sub-steps, in the order it covers them (an empty list for one that declares none). */
export const stepsOf = (key) => byKey(key)?.steps ?? [];

/** What the page needs to draw each check: everything above except code. */
export const forPage = (root) => REGISTRY.map((c) => ({ key: c.key, script: `scripts/${c.script}`, scope: c.scope, name: c.name, short: c.short, title: c.title, label: c.label, rule: c.rule, ruleVersion: c.ruleVersion, rules: c.rules, steps: c.steps ?? [], ...(c.scope === 'site' ? { pages: pagesFor(c, root) } : {}) }));
