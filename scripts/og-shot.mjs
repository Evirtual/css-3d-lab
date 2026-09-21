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
 */
export const VIEWPORT = { width: 2400, height: 1260 };
export const MOMENT = 0; // the resting pose: see THE POSE above
export const SETTLE = 1400; // ms for hover transitions to settle and script loops to get going
const STEADY = { every: 250, max: 4000 }; // how often, and how long at most, to wait for a still picture
export const ogUrl = (base, id) => `${base}/embed/${id}/?og=1&zoom=2`;

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
  // A pseudo-element's animation cannot be written into a style, so it stays, paused.
  for (const a of doc.getAnimations()) {
    if (a.effect?.pseudoElement || !a.effect?.target) continue;
    try { a.commitStyles(); a.cancel(); } catch {}
  }
  // what was stopped, so a checker can tell these from animations a script starts afterwards
  body.ownerDocument.defaultView.c3dOgFrozen = new Set(doc.getAnimations());
}

/**
 * Loads the og page for `demo` ({ id, pointer }) and puts it at the moment described above.
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
  // hover / pointer demos look alive with the pointer parked off-centre over them
  if (demo.pointer) await page.mouse.move(1740, 560); // over the demo (the right side), a little off centre
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
  return { frame, steady };
}
