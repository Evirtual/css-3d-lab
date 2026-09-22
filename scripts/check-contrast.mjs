/**
 * Text readable on both stages: every piece of text a model shows reaches WCAG AA contrast against
 * the pixels actually behind it, on the dark stage and on the light one, at rest and in its main
 * interaction states.
 *
 *   node scripts/check-contrast.mjs              every model
 *   node scripts/check-contrast.mjs clock pie    just these
 *   node scripts/check-contrast.mjs --pass       print a line for the passes too (capture-check adds it)
 *   node scripts/check-contrast.mjs --try f.mjs  a model that is not in the gallery (a default export
 *                                                { title, html, css, js, tags? }): how the check is
 *                                                proved on broken copies in .media-tmp/contrast/
 *
 * HOW. The model runs the way the site's frame runs it (standaloneDoc with a stage: see-through,
 * the stage's text colour inherited, #c3d-scene centring it), on the stage's own colour (dark
 * #07080f, text #eceefb; light #f3f4fc, text #14172b), at a gallery card's canvas, CARD_W × CARD_H
 * CSS px, photographed at DPR 2 so a glyph's strokes are whole pixels. Time is Playwright's fake
 * clock, paused (script timers and requestAnimationFrame run only when told), CSS animations are put
 * at the start of their timeline and paused, and transitions are finished: each state is a still.
 * The states: at rest; with :hover forced (the model's CSS again with every :hover made to match, as
 * check-models does); with the pointer resting on the middle of the canvas (a script's own hover,
 * a tooltip); and after each of up to CLICKS of its enabled controls is clicked, one after another
 * (buttons, labels, radios, checkboxes), when its tags say it is played by clicking.
 *
 * WHAT IS TEXT. Every text node with letters or digits in it, in an element that shows (display,
 * visibility, opacity, checkVisibility), and every ::before / ::after whose content has letters or
 * digits (placed at its element's box), and SVG <text>. Its place on screen is its client rects,
 * clipped to the canvas.
 *
 * WHAT IS BEHIND IT. Each state is photographed twice: as it is (S1), and with every glyph's fill
 * made transparent and nothing else changed (S0: -webkit-text-fill-color, SVG fill and stroke, and
 * the background of gradient text, background-clip: text; transitions off, so hiding starts none).
 * A text under AA is photographed once more with only its own fill hidden, and judged on that:
 * with every fill hidden, a text behind another (a face turned away, a word under a card) would take
 * the glyphs of the one in front as its own. The pixels that change, inside a text's rects, are its glyphs; the strongest of
 * them (the tenth that change most) are the glyph cores, where a stroke covers its pixels whole. The text's colour is the mean of S1 over
 * the cores, and its background the mean of S0 over the same pixels: the actual pixels behind the
 * letters, the model's own panel, gradient, glow or 3D face included. A text whose glyphs change no
 * pixel (behind something, clipped, off the canvas) is not shown, and is counted apart as not drawn.
 *
 * THE RULE. WCAG 2 AA: 4.5:1 for normal text, 3:1 for large text, which is at least 24 CSS px, or
 * bold (700 and over) and at least 18.66 CSS px, at the card's canvas size. Text in a disabled
 * control (:disabled, aria-disabled="true", or inside one) is exempt, as WCAG exempts an inactive
 * component: it is listed as exempt on the model's line, never silently left out. A text's
 * verdict is its worst state on each stage.
 *
 * Lines: `pass <id> …` (texts measured, the worst ratio, and what was exempt or not drawn) and
 * `FAILS <id> …`, each failing text indented under it with its ratio, what it needs, its colours,
 * the stage and the state; a closing `N/M models have readable text on both stages.`
 * scripts/capture-check.mjs records them.
 */
import { createServer as createVite } from 'vite';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BrowserGuard, crashGuard } from './browser-guard.mjs';
import { decode } from './pixels.mjs';

const CARD_W = 360, CARD_H = 300; // a gallery card's canvas, where the model's text is smallest
const DPR = 2;
const CLICKS = 6; // as check-models: up to six of its controls
const NORMAL = 4.5, LARGE = 3; // WCAG 2 AA
const STAGES = {
  dark: { bg: '#07080f', ink: '#eceefb' },
  light: { bg: '#f3f4fc', ink: '#14172b' },
};
const CHANGE = 40; // a pixel is part of a glyph when a channel changes by more than this (of 255) with the fill hidden

const argv = process.argv.slice(2);
const showPasses = argv.includes('--pass');
const at = argv.indexOf('--try');
const TRY = at >= 0 ? argv[at + 1] : null;
const wanted = argv.filter((a, i) => !a.startsWith('-') && !(at >= 0 && i === at + 1));

const vite = await createVite({ logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, watch: null } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const { snippets } = await vite.ssrLoadModule('/src/models/snippets.ts');
const { standaloneDoc } = await vite.ssrLoadModule('/src/models/snippet-utils.ts');
const { interactionsOf } = await vite.ssrLoadModule('/src/models/interaction.ts');

let tried = null;
if (TRY) {
  const mod = await import(pathToFileURL(resolve(TRY)).href);
  tried = { title: 'try', js: '', how: [], tags: ['controls'], ...(mod.default ?? mod) };
}
const ids = TRY ? [`try:${TRY.replace(/\\/g, '/').split('/').pop().replace(/\.m?js$/, '')}`] : wanted.length ? wanted : demos.map((d) => d.id);
const unknown = TRY ? [] : ids.filter((id) => !demos.some((d) => d.id === id));
if (unknown.length) {
  console.error(`check-contrast: no such model: ${unknown.join(', ')}`);
  await vite.close();
  process.exit(2);
}

/* ---------- colour ---------- */
const lin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (p, q) => { const a = lum(p), b = lum(q); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/* ---------- in the page ---------- */
/** Every animation at the start of the page's timeline and paused; every transition, and anything started later, at its end. */
const FREEZE = () => {
  window.c3dFirst ??= new Set(document.getAnimations());
  for (const a of document.getAnimations()) {
    if (a instanceof CSSTransition) { a.finish(); continue; }
    a.pause();
    const t = a.effect?.getComputedTiming();
    a.currentTime = window.c3dFirst.has(a) || !isFinite(t?.endTime) ? 0 : t.endTime;
  }
};

/** The text on screen now: each piece with its rects (CSS px), size, weight, and whether it is in a disabled control. */
const TEXTS = () => {
  const out = [];
  const W = innerWidth, H = innerHeight;
  const letters = /[\p{L}\p{N}]/u;
  const shows = (el) => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse' || +cs.opacity === 0) return false;
    }
    return !el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  };
  const disabled = (el) => Boolean(el.closest(':disabled, [aria-disabled="true"]'));
  const clip = (r) => {
    const l = Math.max(0, r.left), t = Math.max(0, r.top), rr = Math.min(W, r.right), b = Math.min(H, r.bottom);
    return rr - l >= 1 && b - t >= 1 ? [l, t, rr, b] : null;
  };
  const name = (el) => el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : '');
  const scene = document.querySelector('#c3d-scene') ?? document.body;
  document.querySelectorAll('[data-c3d-t]').forEach((e) => e.removeAttribute('data-c3d-t'));
  const tag = (el) => { if (!el.hasAttribute('data-c3d-t')) el.setAttribute('data-c3d-t', String(out.length)); return el.getAttribute('data-c3d-t'); };
  const walker = document.createTreeWalker(scene, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.replace(/\s+/g, ' ').trim();
    const el = n.parentElement;
    if (!el || !letters.test(text) || ['SCRIPT', 'STYLE', 'TITLE'].includes(el.tagName) || !shows(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].map(clip).filter(Boolean);
    if (!rects.length) continue;
    const cs = getComputedStyle(el);
    out.push({ tag: tag(el), pseudo: '', text: text.slice(0, 40), where: name(el), rects, size: parseFloat(cs.fontSize), weight: +cs.fontWeight || 400, disabled: disabled(el), svg: el instanceof SVGElement });
  }
  for (const el of scene.querySelectorAll('*')) {
    for (const pseudo of ['::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      const m = /^"(.*)"$/s.exec(cs.content);
      if (!m || !letters.test(m[1]) || !shows(el) || cs.display === 'none' || +cs.opacity === 0 || cs.visibility === 'hidden') continue;
      const rects = [el.getBoundingClientRect()].map(clip).filter(Boolean);
      if (!rects.length) continue;
      out.push({ tag: tag(el), pseudo, text: m[1].slice(0, 40), where: `${name(el)}${pseudo}`, rects, size: parseFloat(cs.fontSize), weight: +cs.fontWeight || 400, disabled: disabled(el), svg: false });
    }
  }
  return out;
};

/**
 * Hides every glyph's fill and nothing else (no transition starts: they are off while it is hidden),
 * or, given one text's tag (and its pseudo-element, if it is one), that text's alone.
 */
const HIDE = (on) => {
  let s = document.querySelector('#c3d-nofill');
  if (!on) { s?.remove(); document.querySelectorAll('[data-c3d-bgtext]').forEach((e) => e.removeAttribute('data-c3d-bgtext')); return; }
  if (typeof on === 'object') {
    const sel = `[data-c3d-t="${on.tag}"]${on.pseudo}`;
    s = document.createElement('style');
    s.id = 'c3d-nofill';
    s.textContent = `*, *::before, *::after { transition: none !important; }
${sel} { -webkit-text-fill-color: transparent !important; fill-opacity: 0 !important; stroke-opacity: 0 !important; }
${on.pseudo ? '' : `${sel} text, ${sel} tspan { fill-opacity: 0 !important; stroke-opacity: 0 !important; }`}`;
    const el = document.querySelector(`[data-c3d-t="${on.tag}"]`);
    if (el && /text/.test(getComputedStyle(el, on.pseudo || null).backgroundClip)) s.textContent += `
${sel} { background: none !important; }`;
    document.head.append(s);
    return;
  }
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (/text/.test(cs.backgroundClip) || /text/.test(cs.webkitBackgroundClip ?? '')) el.setAttribute('data-c3d-bgtext', '');
  }
  s = document.createElement('style');
  s.id = 'c3d-nofill';
  s.textContent = `*, *::before, *::after { -webkit-text-fill-color: transparent !important; transition: none !important; }
text, tspan, textPath { fill-opacity: 0 !important; stroke-opacity: 0 !important; }
[data-c3d-bgtext], [data-c3d-bgtext]::before, [data-c3d-bgtext]::after { background: none !important; }`;
  document.head.append(s);
};

/* ---------- one model ---------- */
function measure(texts, withText, without) {
  const W = withText.width, H = withText.height;
  const px = (i) => [i * 4, i * 4 + 1, i * 4 + 2];
  return texts.map((t) => {
    const cells = [];
    for (const [l, tp, r, b] of t.rects) {
      for (let y = Math.floor(tp * DPR); y < Math.min(H, Math.ceil(b * DPR)); y++) {
        for (let x = Math.floor(l * DPR); x < Math.min(W, Math.ceil(r * DPR)); x++) {
          const i = y * W + x;
          const [ri, gi, bi] = px(i);
          const d = Math.max(Math.abs(withText.rgba[ri] - without.rgba[ri]), Math.abs(withText.rgba[gi] - without.rgba[gi]), Math.abs(withText.rgba[bi] - without.rgba[bi]));
          if (d > CHANGE) cells.push([d, i]);
        }
      }
    }
    if (cells.length < 3) return { ...t, drawn: false };
    cells.sort((a, b) => b[0] - a[0]);
    const core = cells.slice(0, Math.max(3, Math.ceil(cells.length / 10)));
    const fg = [0, 0, 0], bg = [0, 0, 0];
    for (const [, i] of core) for (let c = 0; c < 3; c++) { fg[c] += withText.rgba[i * 4 + c]; bg[c] += without.rgba[i * 4 + c]; }
    for (let c = 0; c < 3; c++) { fg[c] /= core.length; bg[c] /= core.length; }
    const large = t.size >= 24 || (t.weight >= 700 && t.size >= 18.66);
    return { ...t, drawn: true, fg, bg, ratio: ratio(fg, bg), need: large ? LARGE : NORMAL, large };
  });
}

async function onStage(browser, id, title, snippet, clicks, stageName) {
  const stage = STAGES[stageName];
  const html = standaloneDoc(title, snippet, stageName).replace('</head>', `<style>html{background:${stage.bg}}</style>\n</head>`);
  const context = await browser.newContext({ viewport: { width: CARD_W, height: CARD_H }, deviceScaleFactor: DPR, colorScheme: stageName });
  const errors = [];
  const seen = [];
  try {
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
    await page.clock.install({ time: new Date('2026-01-01T10:08:30Z') });
    // a moment after the install, never at it: the page's own start may already have moved the clock
    // past the install time ("Cannot fast-forward to the past", vinyl and swipe)
    await page.clock.pauseAt(new Date('2026-01-01T10:08:31Z'));
    const url = `${base}/__c3d-file/contrast.html`;
    await page.route(url, (r) => r.fulfill({ contentType: 'text/html', body: html }));
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.clock.runFor(800);
    const still = async (label) => {
      await page.evaluate(FREEZE);
      await page.clock.runFor(40);
      await page.waitForTimeout(120); // real time: the compositor draws the paused pose
      const texts = await page.evaluate(TEXTS);
      if (!texts.length) return;
      const withText = decode(await page.screenshot());
      await page.evaluate(HIDE, true);
      await page.waitForTimeout(60);
      const without = decode(await page.screenshot());
      await page.evaluate(HIDE, false);
      const first = measure(texts, withText, without);
      // A text under AA on the first pass is shot again with only its own fill hidden: with every
      // fill hidden, a text behind another (a face turned away, a label under a card) takes the
      // glyphs of the one in front as its own. Its own pixels then decide.
      for (let k = 0; k < first.length; k++) {
        let m = first[k];
        if (m.drawn && m.ratio < m.need) {
          await page.evaluate(HIDE, { tag: texts[k].tag, pseudo: texts[k].pseudo });
          await page.waitForTimeout(60);
          const alone = decode(await page.screenshot());
          await page.evaluate(HIDE, false);
          m = measure([texts[k]], withText, alone)[0];
        }
        seen.push({ ...m, stage: stageName, state: label });
      }
    };
    await still('at rest');
    await page.evaluate(() => {
      const held = document.querySelector('#c3d-held');
      if (held) held.textContent = (document.querySelector('#c3d-code')?.textContent ?? '').replace(/:hover/g, ':not(.c3d-never)');
    });
    await page.clock.runFor(40);
    await still(':hover forced');
    await page.evaluate(() => { const held = document.querySelector('#c3d-held'); if (held) held.textContent = ''; });
    await page.mouse.move(CARD_W / 2, CARD_H / 2, { steps: 3 });
    await page.clock.runFor(600);
    await still('pointer on the middle');
    await page.mouse.move(1, CARD_H - 1);
    await page.clock.runFor(600);
    if (clicks) {
      const controls = page.locator('#c3d-scene button:not([disabled]), #c3d-scene label, #c3d-scene input[type="radio"], #c3d-scene input[type="checkbox"]');
      const n = Math.min(await controls.count(), CLICKS);
      for (let i = 0; i < n; i++) {
        const what = await controls.nth(i).evaluate((el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 20)).catch(() => `control ${i + 1}`);
        await controls.nth(i).click({ force: true, timeout: 4000 }).catch(() => {});
        await page.mouse.move(1, CARD_H - 1);
        await page.clock.runFor(1500);
        await still(`after clicking "${what}"`);
      }
    }
  } finally {
    await context.close().catch(() => {});
  }
  return { seen, errors };
}

async function judge(id, browser) {
  const demo = tried ? { title: tried.title, tags: tried.tags ?? [], id } : demos.find((d) => d.id === id);
  const snippet = tried ?? { how: [], ...snippets[id] };
  const clicks = interactionsOf(demo).includes('click');
  const all = [];
  const errors = [];
  for (const s of Object.keys(STAGES)) {
    const r = await onStage(browser, id, demo.title, snippet, clicks, s);
    all.push(...r.seen);
    errors.push(...r.errors);
  }
  // one verdict per text per stage: its worst state
  const worst = new Map();
  let exempt = 0, undrawn = 0;
  const exemptNames = new Set();
  for (const m of all) {
    const key = `${m.stage}\0${m.where}\0${m.text}`;
    if (m.disabled) { exempt++; exemptNames.add(`"${m.text}"`); continue; }
    if (!m.drawn) { undrawn++; continue; }
    const w = worst.get(key);
    if (!w || m.ratio / m.need < w.ratio / w.need) worst.set(key, m);
  }
  const verdicts = [...worst.values()];
  const failing = verdicts.filter((m) => m.ratio < m.need).sort((a, b) => a.ratio / a.need - b.ratio / b.need);
  const lowest = verdicts.reduce((w, m) => (!w || m.ratio / m.need < w.ratio / w.need ? m : w), null);
  const texts = new Set(verdicts.map((m) => `${m.where}\0${m.text}`)).size;
  const problems = failing.map((m) => `"${m.text}" (${m.where}, ${m.size.toFixed(1)}px${m.large ? ', large' : ''}): ${m.ratio.toFixed(2)}:1, needs ${m.need}:1, ${hex(m.fg)} on ${hex(m.bg)}, ${m.stage} stage, ${m.state}`);
  for (const e of [...new Set(errors)]) problems.push(`page error: ${e}`);
  const notes = [
    exempt ? `${exemptNames.size} disabled text(s) exempt (${[...exemptNames].slice(0, 3).join(', ')})` : '',
    undrawn ? `${undrawn} reading(s) of text not drawn (hidden behind something or clipped)` : '',
  ].filter(Boolean);
  return { id, problems, texts, lowest, notes };
}

const results = [];
crashGuard('check-contrast', async () => console.error(`check-contrast: ${results.length} of ${ids.length} model(s) judged before the crash, each on its own line above`));
const guard = new BrowserGuard({ launch: () => chromium.launch() });
await guard.start();
try {
  for (const id of ids) {
    let r, notes = [];
    try {
      ({ value: r, notes } = await guard.run(id, (browser) => judge(id, browser)));
    } catch (e) {
      r = { id, broke: e.message.split('\n')[0] };
      notes = e.notes ?? [];
    }
    const also = [...(r.notes ?? []), ...notes].map((n) => `; ${n}`).join('');
    results.push(r);
    if (r.broke) console.log(`FAILS ${id} could not be checked: ${r.broke}${also}`);
    else if (r.problems.length) {
      console.log(`FAILS ${id} ${r.problems.length} text(s) under AA of ${r.texts}${also}`);
      for (const p of r.problems) console.log(`          ${p}`);
    } else if (showPasses || also) {
      const w = r.lowest;
      console.log(`pass  ${id} ${r.texts ? `${r.texts} text(s) at AA on both stages, lowest ${w.ratio.toFixed(2)}:1 ("${w.text}", ${w.stage}, ${w.state})` : 'no text'}${also}`);
    }
  }
} finally {
  await guard.close();
  await vite.close();
}
const failed = results.filter((r) => r.broke || r.problems.length);
console.log(`\n${results.length - failed.length}/${results.length} models have readable text on both stages.`);
if (failed.length) console.log(`failing: ${failed.map((r) => r.id).join(' ')}`);
process.exit(failed.length ? 1 : 0);
