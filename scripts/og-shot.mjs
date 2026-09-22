/**
 * How a social preview image is shot: shared by scripts/generate-media.mjs, which makes
 * dist/media/<id>.jpg, and scripts/check-media.mjs, which renders the same page again to prove the
 * file is what the site draws now. Not run on its own.
 *
 * The page is the BUILT site's /embed/<id>/?og=1&zoom=2 at 2400 × 1260 (1200 × 630 laid out at
 * 2x): the headline on the left, the live model on the right.
 *
 * THE MOMENT IS FIXED, not "whatever the clock says 1.4 s after load". Shot on real time, two runs
 * of the same model came out different (a spinning cube 1.7% of its area apart, the tunnel 17%),
 * so an image could not be compared with a fresh render, and a slow load could catch a model
 * before its frame had even loaded (the page said ready before its frame had). So the shot waits
 * for the model's frame and its fonts and stops every CSS animation in the frame at one moment;
 * then it parks the pointer (for pointer models), lets hover transitions and script loops run for
 * SETTLE ms, stops everything again (what the hover started included), and waits for a still
 * picture. Stopped means:
 *  - an endless animation at MOMENT ms of its timeline (the same t for all, so delays and offsets
 *    hold, as the page's own timeline would have them);
 *  - anything that runs a set number of times (an entrance, a hover transition) at its END, so the
 *    picture is never caught half way into a model that assembles itself.
 * Motion driven by script (requestAnimationFrame) cannot be stopped from outside, so a model that
 * moves in script is still caught wherever it is; check-media allows for that and says so.
 *
 * THE POSE IS THE RESTING POSE (MOMENT 0). It was 1.4 s into the loop, and there 13 of 135 models
 * were off centre or under the contract's 40vmin (the folding-square loader 14vmin high, its
 * square folded up to the top). docs/VIEW-CONTRACT.md makes the resting pose, the first moment of
 * the loop, the one that must be centred and full-sized on its own, since it is what a paused card
 * shows; check-models proves it for every model. So the share image shows that pose.
 *
 * EXCEPT A CONTROL THAT OPENS, WHICH IS SHOT OPEN. A model tagged 'expands' (src/models/
 * interaction.ts; docs/VIEW-CONTRACT.md, "A control that opens rests small") rests as a lone small
 * control, a poor preview, and the contract asks the floor of its OPEN state instead. So after the
 * first stop it is opened the way it is played (open() below): a click model has its first
 * checkbox or radio checked (or its first button, label or summary clicked) from script, so the
 * pointer goes nowhere; a hover model has the pointer put on its first focusable part (a tabindex,
 * a link, a button, a summary, a label), which is also what a visitor hovers. The pointer is not
 * parked for it. The transitions the opening starts run for SETTLE ms and are then stopped at their
 * end like any other, so the picture is the model fully open. scripts/check-media.mjs renders it
 * the same way and judges that pose.
 */
export const VIEWPORT = { width: 2400, height: 1260 };
export const MOMENT = 0; // the resting pose: see THE POSE above
export const SETTLE = 1400; // ms for hover transitions to settle and script loops to get going
const STEADY = { every: 250, max: 4000 }; // how often, and how long at most, to wait for a still picture
export const ogUrl = (base, id) => `${base}/embed/${id}/?og=1&zoom=2`;

/**
 * A new browser context for a shot. Math.random is made the same sequence on every load (in the
 * page and in the model's frame), so a model that places things at random (the scatter plot's
 * points, the snow) draws the same picture for generate-media as for check-media, and the file can
 * be compared with a fresh render. What the model draws is still one of its own random layouts.
 */
export async function shotContext(browser) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, colorScheme: 'dark' });
  await ctx.addInitScript(() => {
    let s = 0x9e3779b9;
    Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  return ctx;
}

/**
 * Runs in the page before each shot: the headline shrinks, a pixel at a time, until every line
 * fits its column. The build machine may not have the site's font, and a wider fallback would
 * otherwise run a line off the edge ("no WebGL requir…").
 */
export async function fitText() {
  await document.fonts.ready;
  for (const el of document.querySelectorAll('.embed__og b')) {
    let size = parseFloat(getComputedStyle(el).fontSize);
    const lines = [el, ...el.querySelectorAll('span')];
    const tooWide = () => lines.some((l) => l.scrollWidth > el.clientWidth + 1);
    while (tooWide() && size > 24) el.style.fontSize = `${(size -= 1)}px`;
  }
}

/**
 * Runs in the model's frame: every animation stopped at `moment` (endless) or at its end (finite).
 * Each is let start first: an animation stopped while its start is still pending can come out at
 * another time than the one it was set to (the solar system's planets, a few degrees apart
 * from one run to the next).
 */
async function freeze(body, moment) {
  const doc = body.ownerDocument;
  const settleAll = () => Promise.all(doc.getAnimations().map((a) => a.ready.catch(() => {})));
  await settleAll();
  for (const a of doc.getAnimations()) {
    const t = a.effect?.getComputedTiming();
    a.pause();
    if (!t || typeof t.duration !== 'number') { a.currentTime = 0; continue; }
    a.currentTime = t.iterations === Infinity || !isFinite(t.endTime) ? moment : t.endTime;
  }
  await settleAll();
  // Then each is written into its element's own style and taken away. A paused animation can still
  // be drawn by the compositor at the time it had when it was paused, not the time it was set to
  // (the cone's spin a few degrees off, differently each run), and nothing makes it draw again.
  // A pseudo-element has no style of its own to write into, so what its animation sets there is
  // read from its computed style and written as a rule for that one element (the synthwave grid's
  // moving floor is a ::before).
  const rules = [];
  const win = doc.defaultView;
  win.c3dOgN ??= 0; // marks stay unique across both stops
  for (const a of doc.getAnimations()) {
    const el = a.effect?.target;
    if (!el) continue;
    const pseudo = a.effect.pseudoElement;
    if (!pseudo) { try { a.commitStyles(); a.cancel(); } catch {} continue; }
    try {
      const props = new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)).filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p)));
      const cs = getComputedStyle(el, pseudo);
      const kebab = (p) => p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      const mark = el.getAttribute('data-og-still') ?? String(win.c3dOgN++);
      el.setAttribute('data-og-still', mark);
      rules.push(`[data-og-still="${mark}"]${pseudo} { ${[...props].map((p) => `${kebab(p)}: ${cs.getPropertyValue(kebab(p))} !important;`).join(' ')} }`);
      a.cancel();
    } catch {}
  }
  if (rules.length) {
    const style = doc.createElement('style');
    style.textContent = rules.join('\n');
    doc.head.append(style);
  }
  // what was stopped, so a checker can tell these from animations a script starts afterwards
  body.ownerDocument.defaultView.c3dOgFrozen = new Set(doc.getAnimations());
}

/**
 * Opens a model tagged 'expands' the way it is played (`how`, from interaction.ts): see EXCEPT A
 * CONTROL THAT OPENS above. Returns what it did, or null when it found nothing to open it with.
 */
async function open(page, frame, how) {
  if (how === 'click') {
    return frame.evaluate(() => {
      const scene = document.querySelector('#c3d-scene') ?? document.body;
      const box = [...scene.querySelectorAll('input[type="checkbox"], input[type="radio"]')].find((i) => !i.checked && !i.disabled);
      const el = box ?? scene.querySelector('button:not([disabled]), label, summary');
      if (!el) return null;
      el.click();
      return box ? `checked ${box.type}` : `clicked ${el.localName}`;
    });
  }
  if (how === 'hover') {
    // where the part is, in the frame's own pixels, mapped onto the page by hand: the og page is
    // laid out with CSS zoom, and Playwright's own hover() lands the pointer off the frame there
    const at = await frame.evaluate(() => {
      const el = document.querySelector('#c3d-scene [tabindex], #c3d-scene a[href], #c3d-scene button, #c3d-scene summary, #c3d-scene label');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: innerWidth };
    });
    const box = at && (await page.locator('.stage iframe').first().boundingBox());
    if (!box) return null;
    const k = box.width / at.w;
    await page.mouse.move(box.x + at.x * k, box.y + at.y * k);
    const on = await frame.evaluate(() => document.querySelector('#c3d-scene [tabindex], #c3d-scene a[href], #c3d-scene button, #c3d-scene summary, #c3d-scene label').matches(':hover'));
    return on ? 'hovered' : null;
  }
  return null;
}

/**
 * Loads the og page for `demo` ({ id, pointer, how?, expands? }) and puts it at the moment described above.
 * Returns what a checker needs to know about how it got there. `frameTimeout` is how long the
 * model's frame may take to load before the shot is given up as broken.
 */
export async function settle(page, base, demo, { frameTimeout = 20_000 } = {}) {
  await page.goto(ogUrl(base, demo.id));
  await page.waitForSelector('html[data-ready]');
  const cover = demo.id === 'cover';
  if (!cover) await page.waitForSelector('iframe[data-ready="true"]', { timeout: frameTimeout });
  await page.evaluate(() => document.fonts.ready);
  const frame = cover ? null : page.frames().find((f) => f !== page.mainFrame());
  if (frame) await frame.evaluate(() => document.fonts.ready);
  // Stopped at the moment straight away, before anything has moved: Chrome picks the resolution it
  // draws a moving 3D layer at while it moves and may keep it after it stops, so a model that ran
  // for a while and was then put back came out a little different each time (the crystal 12% of
  // its area). The home image's cube lives in the page itself, not in a frame.
  const target = frame ?? page;
  await target.evaluate(`(${freeze})(document.body, ${MOMENT})`);
  // a control that opens is shot open (EXCEPT A CONTROL THAT OPENS above); other hover / pointer
  // demos look alive with the pointer parked off-centre over them
  let opened = null;
  if (demo.expands && frame) {
    opened = await open(page, frame, demo.how);
    if (!opened) throw new Error(`${demo.id} is tagged expands but og-shot found nothing to open it with (${demo.how ?? 'no interaction'})`);
  } else if (demo.pointer) await page.mouse.move(1740, 560); // over the demo (the right side), a little off centre
  await page.waitForTimeout(SETTLE); // hover transitions settle, script loops get going
  // again: a hover can start transitions and animations of its own, which end at their end
  await target.evaluate(`(${freeze})(document.body, ${MOMENT})`);
  await page.evaluate(fitText);
  // two frames, so what was set above is what is painted
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  // Stopped is not yet painted still: Chrome draws a 3D layer that was animating at a lower
  // resolution and redraws it sharp some time after it stops (the unfolding cube took over a
  // second). So wait until two pictures of the page in a row are the same. A model that moves in
  // script never is; it is shot when the wait runs out, and `steady` says so.
  let last = await page.screenshot({ type: 'png' });
  let steady = false;
  for (let waited = 0; waited < STEADY.max && !steady; waited += STEADY.every) {
    await page.waitForTimeout(STEADY.every);
    const now = await page.screenshot({ type: 'png' });
    steady = now.equals(last);
    last = now;
  }
  return { frame, steady, opened };
}
