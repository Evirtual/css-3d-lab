/**
 * COULD THE EXPORT BE DRAWN IN THE VISITOR'S OWN BROWSER, WITH NO SERVER AT ALL?
 *
 *   node scripts/check-client-render.mjs              every model
 *   node scripts/check-client-render.mjs coin rubik   just those
 *
 * Every export this site makes goes through a render service: the page posts a scene, a headless
 * Chromium draws it, and the frames come back. That service costs money and, on Cloudflare's free
 * plan, ten minutes of browser time a DAY for the whole site -- shared with every visitor. The
 * question is whether the browser already holding the model could draw it itself.
 *
 * It cannot screenshot itself. But it can rasterise an SVG whose <foreignObject> holds the same
 * markup, and that turns out to handle CSS 3D transforms and preserve-3d correctly. It gets ONE
 * thing wrong, and gets it silently: `backface-visibility: hidden` is ignored, so faces turned away
 * from the viewer paint anyway. Measured on 2026-09-29: a face rotated a full 180 degrees rendered
 * 6400 pixels with the property and 6400 without it -- no effect whatsoever -- while the live DOM
 * honours it. Eleven models here depend on it, and without it the spinning coin renders as a
 * crescent and the puzzle cube turns yellow.
 *
 * So this polyfills it. The property means "do not paint this face when its normal points away
 * from the viewer", which is arithmetic: accumulate the element's 3D matrix through its preserve-3d
 * ancestors, transform its two axis vectors, and the sign of their cross product's z says which way
 * it faces. Away-facing elements are hidden before rasterising.
 *
 * WHAT THIS SCRIPT ANSWERS, PER MODEL: does that picture match the one the browser actually paints?
 *
 * Ground truth is a real screenshot of the stage. Nothing is taken on trust: not that foreignObject
 * is faithful, not that the polyfill is right, not that fonts or clip-path or blend modes survive.
 * The comparison is the same one compare-capture uses between the screen and the render service, at
 * the same small size so anti-aliasing is not what is being measured.
 *
 * A model that matches could export with no server. A model that does not must keep using one. The
 * board decides which by evidence rather than by anybody's confidence, which is the same rule every
 * other check here follows.
 */
import { createServer as createVite } from 'vite';
import { launchChromium } from './browser.mjs';
import { BrowserGuard, crashGuard } from './browser-guard.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './model-sources.mjs';

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
/* The same thresholds compare-capture uses against the render service, so "matches" means the same
   thing here as it does there rather than a friendlier bar invented for a new renderer. */
const MEAN = Number(process.env.CLIENT_MEAN || 6);      // 0-255 over the whole picture
const PART = Number(process.env.CLIENT_PART || 0.03);   // share of pixels differing by more than 40
const T = Number(process.env.CLIENT_T || 1137);         // ms into the animations, so both see one pose
/* --save keeps both pictures side by side in .media-tmp/client-render, because when two renderers
   disagree by a number, the number does not tell you WHY and the pictures do in a second. */
const SAVE = process.argv.includes('--save');

const vite = await createVite({ appType: 'mpa', logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await vite.listen();
const base = vite.resolvedUrls.local[0].replace(/\/$/, '');
const { demos } = await vite.ssrLoadModule('/src/models/index.ts');
const list = only.length ? demos.filter((d) => only.includes(d.id)) : demos;

const guard = new BrowserGuard({ launch: () => launchChromium({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }) });
const results = [];
crashGuard('check-client-render', async () => console.error(`check-client-render: ${results.length} of ${list.length} compared before the crash`));

/*
 * Run inside the page. Rasterises `.stage` through an SVG foreignObject, with the backface
 * polyfill applied to a CLONE so the live page is never touched -- a check that changes what it is
 * measuring has measured something else.
 */
const RASTERISE = async ([width, height, shotB64, heldAt, wantPng]) => {
  const stage = document.querySelector('.stage');
  if (!stage) return { error: 'no stage' };
  const win = stage.ownerDocument.defaultView;

  /** The element's matrix, accumulated through every preserve-3d ancestor above it. */
  const accumulated = (el) => {
    const chain = [];
    let n = el;
    while (n && n !== document.documentElement) {
      chain.unshift(n);
      const p = n.parentElement;
      if (!p || win.getComputedStyle(p).transformStyle !== 'preserve-3d') break;
      n = p;
    }
    let M = new DOMMatrix();
    for (const node of chain) {
      const t = win.getComputedStyle(node).transform;
      if (t && t !== 'none') M = M.multiply(new DOMMatrix(t));
    }
    return M;
  };
  /* Its normal points away when the cross product of its transformed x and y axes has negative z. */
  const facesAway = (el) => {
    const M = accumulated(el);
    const o = M.transformPoint(new DOMPoint(0, 0, 0));
    const x = M.transformPoint(new DOMPoint(1, 0, 0));
    const y = M.transformPoint(new DOMPoint(0, 1, 0));
    return ((x.x - o.x) * (y.y - o.y) - (x.y - o.y) * (y.x - o.x)) < 0;
  };

  /*
   * THE WHOLE BODY IS CLONED, AT THE PAGE'S OWN SIZE, AND THE STAGE IS CROPPED OUT AFTERWARDS.
   *
   * Cloning just .stage produced a picture of the backdrop and nothing else. Two reasons, both
   * about what a subtree loses when it is lifted out of its page:
   *
   *   - CUSTOM PROPERTIES ARE INHERITED. These models are built on one, `--u`, declared on an
   *     ancestor: `--u: 0.39vmin`, then every length is a multiple of it. Lift the stage out and
   *     --u is undefined, every calc() collapses, and the model draws at nothing.
   *   - VIEWPORT UNITS RESOLVE AGAINST THE SVG. Inside a foreignObject, vmin is the SVG's own
   *     smaller side, not the page's. So even with --u present, a stage-sized SVG gives a
   *     stage-sized vmin and the model comes out at the wrong scale.
   *
   * Rendering the body at the real viewport size makes both go away: the ancestors are there to
   * inherit from, and vmin means what it meant on the page. The stage region is cut out of the
   * result so the comparison is still stage against stage.
   */
  const root = document.body;
  const clone = root.cloneNode(true);
  /*
   * The polyfill used to run here, over document.body, and never hid anything: every element that
   * needs it lives inside the model's iframe, which this document's querySelectorAll cannot see.
   * It now runs against the frame's own document, below, where those elements actually are.
   */
  /*
   * EACH MODEL RUNS IN ITS OWN IFRAME, AND AN IFRAME CANNOT TRAVEL.
   *
   * .stage holds exactly one child: <iframe class="live-frame">. cloneNode copies the iframe
   * ELEMENT and nothing inside it, and even if it did, a document loaded from a data: URL is not
   * allowed to fetch anything -- so the rasterised picture came back with the backdrop and the
   * credit line drawn perfectly and no model at all.
   *
   * Every frame here is same-origin (srcdoc), so its document can be read and folded in: the
   * iframe is replaced by a plain div of the same size carrying the frame's own stylesheets and
   * body. This is the step a real client-side exporter would have to do too, and it is the reason
   * capture-scene.ts exists at all -- the scene the dialog posts today is built the same way.
   */
  let polyfilled = 0;
  for (const [i, frame] of [...clone.querySelectorAll('iframe')].entries()) {
    const liveFrame = root.querySelectorAll('iframe')[i];
    let doc = null;
    try { doc = liveFrame?.contentDocument; } catch { doc = null; }
    if (!doc) continue;
    const box = liveFrame.getBoundingClientRect();
    const holder = document.createElement('div');
    holder.setAttribute('style', `width:${Math.round(box.width)}px;height:${Math.round(box.height)}px;overflow:hidden;position:relative`);
    /*
     * THE FRAME'S BODY IS CLONED AS A NODE, NOT AS A STRING OF HTML.
     *
     * innerHTML loses element identity, and identity is what the backface polyfill needs: it has
     * to ask the LIVE element which way it is facing -- only the live one has a computed transform
     * -- and then hide its counterpart in the copy. Built from a string there is no counterpart,
     * which is why `polyfilled` came back 0 for all 135 models on the first full run while the
     * eleven that need it were quietly rendering their back faces.
     */
    const styles = [...doc.querySelectorAll('style')].map((s) => `<style>/*<![CDATA[*/${s.textContent}/*]]>*/</style>`).join('');
    holder.innerHTML = styles;
    const frameBody = doc.body.cloneNode(true);
    const liveInner = [...doc.body.querySelectorAll('*')];
    const copyInner = [...frameBody.querySelectorAll('*')];
    if (liveInner.length === copyInner.length) {
      const fw = doc.defaultView;
      liveInner.forEach((el, k) => {
        if (fw.getComputedStyle(el).backfaceVisibility !== 'hidden') return;
        /* facesAway walks preserve-3d ancestors using the frame's own window and document. */
        const chain = [];
        let n = el;
        while (n && n !== doc.documentElement) {
          chain.unshift(n);
          const p = n.parentElement;
          if (!p || fw.getComputedStyle(p).transformStyle !== 'preserve-3d') break;
          n = p;
        }
        let M = new DOMMatrix();
        for (const node of chain) {
          const t = fw.getComputedStyle(node).transform;
          if (t && t !== 'none') M = M.multiply(new DOMMatrix(t));
        }
        const o = M.transformPoint(new DOMPoint(0, 0, 0));
        const ax = M.transformPoint(new DOMPoint(1, 0, 0));
        const ay = M.transformPoint(new DOMPoint(0, 1, 0));
        if (((ax.x - o.x) * (ay.y - o.y) - (ax.y - o.y) * (ay.x - o.x)) < 0) {
          copyInner[k].style.visibility = 'hidden';
          polyfilled++;
        }
      });
    }
    while (frameBody.firstChild) holder.appendChild(frameBody.firstChild);
    /* The frame's own <body> carries the model's backdrop and layout; without them the model
       lands in the corner at the wrong size. */
    const bodyStyle = doc.defaultView.getComputedStyle(doc.body);
    holder.style.background = bodyStyle.background;
    holder.style.display = bodyStyle.display;
    holder.style.placeItems = bodyStyle.placeItems;
    frame.replaceWith(holder);
  }

  /*
   * THE LAYOUT WIDTH, NOT THE WINDOW WIDTH, AND THE SCROLLBAR IS THE WHOLE DIFFERENCE.
   *
   * innerWidth includes the scrollbar; the page lays out inside clientWidth, which here is 885
   * against a window of 900. Give the foreignObject 900 and the clone lays out fifteen pixels
   * wider than the page did: every centred thing moves, and every vmin-derived length -- which is
   * every length in these models, they are all multiples of `--u: 0.39vmin` -- comes out at a
   * different size.
   *
   * It looked like a rendering fault and was an arithmetic one. The activity rings came back
   * shifted right and visibly larger, which read as "foreignObject draws 3D differently" until the
   * two pictures were put side by side.
   */
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const rect = stage.getBoundingClientRect();

  const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n')
    + [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join('\n'); } catch { return ''; } }).join('\n');

  /*
   * XML, NOT HTML, and that distinction is the whole difference between a picture and nothing.
   *
   * The contents of a <foreignObject> are parsed as XML. outerHTML gives HTML5 serialisation --
   * void elements like <br> and <img> come out unclosed, which is valid HTML and a fatal XML parse
   * error. The <img> then fires onerror with no message and the only symptom is "the browser would
   * not rasterise the scene". XMLSerializer closes everything properly.
   *
   * The stylesheet goes in a CDATA section for the same reason: CSS is full of > and & (child
   * combinators, media queries), each of which ends the parse.
   */
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  let markup;
  try { markup = new XMLSerializer().serializeToString(clone); }
  catch (e) { return { error: `could not serialise the scene as XML: ${String(e).slice(0, 70)}` }; }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}">`
    + `<foreignObject width="${vw}" height="${vh}">`
    + `<div xmlns="http://www.w3.org/1999/xhtml">`
    /*
     * THE CLONE'S ANIMATIONS START AT ZERO, AND THE SCREENSHOT DID NOT.
     *
     * page.evaluate holds every live animation at T ms before the screenshot, but that is done
     * through the Web Animations API on the LIVE elements. A clone carries the markup, not the
     * playback: inside the SVG every animation begins again from its first keyframe, so the
     * comparison was of two different moments and every model differed.
     *
     * A negative delay is the fix, and it is a CSS rule rather than a per-element edit, which
     * matters because these models animate ::before and ::after constantly and no amount of
     * cloning reaches a pseudo-element. Paused at -T puts each animation exactly T into its own
     * cycle -- the same place a.currentTime = T % duration puts the live one.
     */
    + `<style>/*<![CDATA[*/${css}`
    + `\n*, *::before, *::after { animation-delay: -${heldAt}ms !important; animation-play-state: paused !important; }`
    + `/*]]>*/</style>`
    + markup
    + `</div></foreignObject></svg>`;

  const img = new Image();
  const loaded = await new Promise((done) => {
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  if (!loaded) return { error: 'the browser would not rasterise the scene' };

  /*
   * The comparison happens here, in the page, in greyscale at a small fixed size -- the same
   * method and the same size compare-capture uses against the render service. Two pictures of the
   * same thing are never identical pixel for pixel (anti-aliasing, text hinting), so what is
   * measured is mean luminance difference plus the share of cells that are badly off.
   */
  const S = 96;
  const load = (src) => new Promise((ok, fail) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = fail;
    i.src = src;
  });
  /* `crop` cuts the stage out of the viewport-sized render; the screenshot is already just the
     stage, so it is drawn whole. Both end up as the same S x S greyscale. */
  const grey = (image, crop) => {
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    if (crop) x.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, S, S);
    else x.drawImage(image, 0, 0, S, S);
    const d = x.getImageData(0, 0, S, S).data;
    const g = new Float32Array(S * S);
    for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    return g;
  };
  let mine, theirs;
  try {
    mine = grey(img, { x: rect.left, y: rect.top, w: rect.width, h: rect.height });
    theirs = grey(await load(`data:image/png;base64,${shotB64}`));
  } catch (e) {
    return { error: `could not compare: ${String(e).slice(0, 70)}` };
  }
  let sum = 0, far = 0;
  for (let i = 0; i < mine.length; i++) {
    const delta = Math.abs(mine[i] - theirs[i]);
    sum += delta;
    if (delta > 40) far++;
  }
  /* The picture itself comes back only when asked for: it is a megabyte of base64 per model and
     the only reason to want it is to look at the two side by side when they disagree. */
  let png = null;
  if (wantPng) {
    const c = document.createElement('canvas');
    c.width = Math.round(rect.width); c.height = Math.round(rect.height);
    c.getContext('2d').drawImage(img, rect.left, rect.top, rect.width, rect.height, 0, 0, c.width, c.height);
    try { png = c.toDataURL('image/png').split(',')[1]; } catch { png = null; }
  }
  return { mean: sum / mine.length, part: far / mine.length, polyfilled, png };
};

/** Hold every animation at the same moment in both pictures, exactly as compare-capture does. */
const HOLD = (t) => {
  for (const a of document.getAnimations()) {
    a.pause();
    const d = a.effect?.getComputedTiming().duration;
    if (typeof d === 'number' && d > 0) a.currentTime = t % d;
  }
  return document.getAnimations().length;
};

for (const demo of list) {
  await guard.run(demo.id, async (browser) => {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
    try {
      await page.goto(`${base}/embed/${demo.id}/`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      for (const frame of page.frames()) await frame.evaluate(HOLD, T).catch(() => 0);
      await page.waitForTimeout(150);

      const stage = page.locator('.stage').first();
      const box = await stage.boundingBox();
      if (!box) { results.push({ id: demo.id, error: 'no stage' }); return; }
      const shot = (await stage.screenshot({ type: 'png' })).toString('base64');
      const made = await page.evaluate(RASTERISE, [Math.round(box.width), Math.round(box.height), shot, T, SAVE]);
      if (made.error) { results.push({ id: demo.id, error: made.error }); return; }

      if (SAVE && made.png) {
        const dir = join(ROOT, '.media-tmp', 'client-render');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${demo.id}-screen.png`), Buffer.from(shot, 'base64'));
        writeFileSync(join(dir, `${demo.id}-client.png`), Buffer.from(made.png, 'base64'));
      }
      const ok = made.mean <= MEAN && made.part <= PART;
      results.push({ id: demo.id, ok, mean: +made.mean.toFixed(2), part: +made.part.toFixed(4), polyfilled: made.polyfilled });
      console.log(`  ${ok ? 'match ' : 'DIFFER'} ${demo.id.padEnd(20)} mean ${made.mean.toFixed(2).padStart(6)}  differing ${(made.part * 100).toFixed(2).padStart(6)}%${made.polyfilled ? `  (${made.polyfilled} face(s) polyfilled)` : ''}`);
    } finally {
      await page.close().catch(() => {});
    }
  }).catch((e) => {
    results.push({ id: demo.id, error: String(e?.message ?? e).split('\n')[0] });
    console.log(`  ERROR  ${demo.id}: ${String(e?.message ?? e).split('\n')[0].slice(0, 90)}`);
  });
}

await guard.close().catch(() => {});
await vite.close();

const matched = results.filter((r) => r.ok).length;
const differed = results.filter((r) => r.ok === false).length;
const errored = results.filter((r) => r.error).length;
console.log('');
console.log(`check-client-render: ${matched} of ${results.length} model(s) match the screen without a server.`);
if (differed) console.log(`  ${differed} differ and would have to keep using the render service.`);
if (errored) console.log(`  ${errored} could not be drawn in the browser at all.`);

try {
  mkdirSync(join(ROOT, 'docs', 'checks'), { recursive: true });
  writeFileSync(join(ROOT, 'docs', 'checks', 'client-render.json'), `${JSON.stringify({
    note: 'Written by scripts/check-client-render.mjs: whether each model can be drawn in the visitor\'s own browser, with the backface-visibility polyfill, closely enough to match what the browser paints. Not a release gate: evidence for whether the render service can be dropped.',
    at: new Date().toISOString(),
    commit: (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; } })(),
    thresholds: { mean: MEAN, part: PART, heldAtMs: T },
    matched, differed, errored,
    results,
  }, null, 2)}\n`);
  console.log('  written to docs/checks/client-render.json');
} catch (e) {
  console.log(`  (could not write docs/checks/client-render.json: ${String(e?.message ?? e).split('\n')[0]})`);
}
process.exit(0);
