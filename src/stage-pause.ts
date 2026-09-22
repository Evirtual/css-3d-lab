/**
 * "Pause": a switch on the large stage that stops an animated model on the pose it is in now, so
 * it can be looked at (and printed) that way. Shown only for models whose CSS animates (the page
 * sets data-animated on the .stage-wrap).
 *
 * How: the switch marks the .stage-wrap .is-frozen and pauses the frame's animations; the frame
 * (preview.ts, sync) keeps them paused while the mark is on.
 */

/** The stage's Pause switch (animated models only). */
export const pauseHtml = (): string =>
  `<div class="stage__holds"><button type="button" class="stage__hold stage__hold--freeze" data-freeze aria-pressed="false" title="Stop this model on the pose it is in now (it prints like this too)"><span class="stage__tick" aria-hidden="true"></span>Pause</button></div>`;

/** Whether a model gets the switch, from its CSS: written on the .stage-wrap for the CSS to show it. */
export function markPause(stage: Element | null, css: string): void {
  const wrap = stage?.closest<HTMLElement>('.stage-wrap');
  if (!wrap) return;
  wrap.toggleAttribute('data-animated', /animation(-name)?\s*:/.test(css));
  // a new model (or a new version of it) starts moving
  wrap.classList.remove('is-frozen');
  for (const b of wrap.querySelectorAll('[data-freeze]')) b.setAttribute('aria-pressed', 'false');
}

/** The animations running on a stage: in the model's frame, or on the stage itself if it has none. */
function stageAnimations(wrap: HTMLElement): Animation[] {
  const stage = wrap.querySelector<HTMLElement>('.stage');
  if (!stage) return [];
  const doc = stage.querySelector('iframe')?.contentDocument;
  return doc ? doc.getAnimations() : stage.getAnimations({ subtree: true });
}

document.addEventListener('click', (e) => {
  const freeze = (e.target as HTMLElement).closest<HTMLElement>('[data-freeze]');
  const wrap = freeze?.closest<HTMLElement>('.stage-wrap');
  if (!freeze || !wrap) return;
  const on = wrap.classList.toggle('is-frozen');
  freeze.setAttribute('aria-pressed', String(on));
  for (const a of stageAnimations(wrap)) {
    if (on) a.pause();
    else a.play();
  }
});
