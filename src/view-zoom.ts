import { fillLimitOf, fillsCanvas, freshFillLimit, MIN_FILL, NATURAL_FILL, refreshFillLimit, sampleFillLimit, watchFillLimit } from './fill-limit';

/**
 * "View zoom": the model shown bigger or smaller on the large stage — the model page, the home
 * page's viewer, full screen, and the export dialog's full screen. One control, one module, one CSS
 * block (.stage__view in _layout.scss) for all of them: under the canvas in the page, a bar along
 * the canvas's bottom edge at full screen. The model page's HTML is written by generate-pages from
 * viewZoomHtml() below, the viewer's by main.ts from the same function.
 *
 * It is the export dialog's Model size slider, on the page: the same markup and classes (so it
 * looks exactly like it), the same meaning — how much of the frame the model fills — the same
 * steps and the same math: 70% is the model's own size and the model is shown fill / 70% times as
 * big, about the canvas's middle, as preview.ts does with the dialog's --zoom. Its top end is the
 * dialog's too (fill-limit.ts): the most this model can be shown on this canvas and still clear
 * every edge by 4vmin — and the bar, at full screen. The hint says what that is.
 *
 * It only changes how the model's frame is SHOWN. The frame is drawn scaled from out here (a
 * `scale` on the iframe); the model inside keeps its canvas, its layout and its code untouched.
 * Nothing inside the frame changes, so a capture (which reads the model's own styles, inside the
 * frame) never sees it: a recording, a snapshot, a print is the model at its own size. The browser
 * hands pointer and wheel events through the scaled frame, so drag and scroll models still work.
 *
 * The value stays while the model stays: into full screen and out again, into the export dialog
 * and back (brought down if the top end is lower there). It is not remembered: every page and
 * every model the viewer opens starts at 70%.
 *
 * In the export dialog the stage is the dialog's, and so is the size: there the page's own zoom is
 * off (CSS), and at the dialog's full screen this control shows and moves the dialog's Model size
 * slider, so the one control does the one thing wherever it is.
 */
const HINT = 'how much of the frame it fills · view only';

/**
 * The control, placed right after the .stage inside its .stage-wrap. One per page at a time. It
 * is the export dialog's Model size slider (video.ts, zoomSlider) in the dialog's own markup and
 * classes, so it cannot drift from it; .stage__view only places it. Arrow keys move it by 5%.
 */
export const viewZoomHtml = (): string =>
  `<div class="stage__view" data-view-zoom-bar>` +
  `<fieldset class="maker__set maker__set--slider">` +
  `<legend><label for="view-zoom">View zoom</label> <span class="maker__legendHint" data-view-zoom-hint>${HINT}</span></legend>` +
  `<div class="maker__slider">` +
  `<input class="maker__zoom" id="view-zoom" type="range" min="${MIN_FILL}" max="${NATURAL_FILL}" step="5" value="${NATURAL_FILL}" style="--done:100%" data-view-zoom aria-valuetext="${NATURAL_FILL}%, the model's own size">` +
  `<output for="view-zoom" data-view-zoom-out>${NATURAL_FILL}%</output>` +
  `</div></fieldset></div>`;

/** Where the range's thumb is, for its filled track: the dialog's own --done. */
const done = (fill: number, top: number): string => `${top > MIN_FILL ? ((fill - MIN_FILL) / (top - MIN_FILL)) * 100 : 100}%`;

const stageOf = (wrap: HTMLElement): HTMLElement | null => wrap.querySelector<HTMLElement>(':scope > .stage');

/** The top end for this stage now (70%, the model as it is, until it has been measured). */
const topOf = (wrap: HTMLElement): number => {
  const stage = stageOf(wrap);
  return (stage && fillLimitOf(stage)) ?? NATURAL_FILL;
};

const clamp = (fill: number, top: number): number => Math.min(top, Math.max(MIN_FILL, Math.round(fill / 5) * 5));

/** What the visitor asked for on this stage (70 when nothing): shown within the top end of the moment. */
const wanted = (wrap: HTMLElement): number => Number(wrap.dataset.viewWanted ?? NATURAL_FILL);

/** The export dialog's Model size slider, when this stage is lent to the dialog. */
const makerSlider = (wrap: HTMLElement): HTMLInputElement | null =>
  wrap.closest('.maker')?.querySelector<HTMLInputElement>('.maker__settings input[data-zoom]') ?? null;

/** The control shows `fill` of at most `top`. */
function show(wrap: HTMLElement, fill: number, top: number): void {
  const range = wrap.querySelector<HTMLInputElement>(':scope > .stage__view input[data-view-zoom]');
  if (range) {
    range.max = String(top);
    range.value = String(fill);
    range.style.setProperty('--done', done(fill, top));
    range.setAttribute('aria-valuetext', `${fill}%${fill === NATURAL_FILL ? ", the model's own size" : ''}, at most ${top}%`);
  }
  const out = wrap.querySelector<HTMLElement>(':scope > .stage__view [data-view-zoom-out]');
  if (out) out.textContent = `${fill}%`;
  const hint = wrap.querySelector<HTMLElement>(':scope > .stage__view [data-view-zoom-hint]');
  const stage = stageOf(wrap);
  // a full-canvas scene is not made bigger: that would only crop it
  if (hint) hint.textContent = `${HINT}, max ${top}%${stage && fillsCanvas(stage) ? ': it fills the canvas' : ''}`;
}

/** The page's zoom on this stage shown at `fill` (percent of the frame, within the top end). */
function apply(wrap: HTMLElement, fill: number): void {
  const top = topOf(wrap);
  const f = clamp(fill, top);
  if (f === NATURAL_FILL) {
    wrap.style.removeProperty('--view-zoom');
    delete wrap.dataset.viewZoomed;
  } else {
    wrap.style.setProperty('--view-zoom', (f / NATURAL_FILL).toFixed(4));
    wrap.dataset.viewZoomed = String(f);
  }
  show(wrap, f, top);
}

/** The visitor's choice: kept while the model stays, and shown within the top end. */
export function setViewZoom(wrap: HTMLElement, fill: number): void {
  wrap.dataset.viewWanted = String(fill);
  apply(wrap, fill);
}

/** What the control should say now: the dialog's size while the stage is the dialog's. */
function refresh(wrap: HTMLElement): void {
  const maker = makerSlider(wrap);
  if (maker) return show(wrap, Number(maker.value), Number(maker.max));
  if (wrap.closest('.maker')) return; // lent, and the dialog's slider is not drawn yet
  apply(wrap, wanted(wrap)); // within the top end of the moment (lower at full screen, say)
}

const wired = new WeakSet<HTMLElement>();

/** Wires every View zoom under `root` to its stage's top end (calling it again is fine). */
export function initViewZoom(root: ParentNode = document): void {
  for (const bar of root.querySelectorAll<HTMLElement>('[data-view-zoom-bar]')) {
    const wrap = bar.closest<HTMLElement>('.stage-wrap');
    const stage = wrap && stageOf(wrap);
    if (!wrap || !stage) continue;
    if (!wired.has(wrap)) {
      wired.add(wrap);
      // the watch lasts as long as the stage: the page's, or the viewer's until it is replaced
      // (after the export dialog, which follows the same stage, has moved its own slider)
      watchFillLimit(stage, (max) => {
        if (max !== null) queueMicrotask(() => refresh(wrap));
      });
    }
    refresh(wrap);
  }
}

if (typeof document !== 'undefined') {
  // Taking hold of the control is when the model is measured (fill-limit.ts, WHEN IT IS MEASURED):
  // one measurement as the hand lands, so the first step it takes is already held to the model as
  // it is now, and nothing is measured while it is only being looked at.
  const grab = (e: Event): void => {
    const range = (e.target as HTMLElement | null)?.closest?.<HTMLInputElement>('input[data-view-zoom]');
    const wrap = range?.closest<HTMLElement>('.stage-wrap');
    const stage = wrap && stageOf(wrap);
    if (!wrap || !stage) return;
    refreshFillLimit(stage);
    refresh(wrap);
  };
  document.addEventListener('pointerdown', grab, { passive: true, capture: true });
  document.addEventListener('focusin', grab, { capture: true });

  document.addEventListener('input', (e) => {
    const target = e.target as HTMLElement;
    const range = target.closest<HTMLInputElement>('input[data-view-zoom]');
    const wrap = range?.closest<HTMLElement>('.stage-wrap');
    if (range && wrap) {
      const maker = makerSlider(wrap);
      if (!maker) {
        // the value is never applied without a measurement it is held to
        const stage = stageOf(wrap);
        if (stage) freshFillLimit(stage);
        return setViewZoom(wrap, Number(range.value));
      }
      // the dialog's stage: move the dialog's own slider, which does the rest (video.ts)
      maker.value = range.value;
      maker.dispatchEvent(new Event('input', { bubbles: true }));
      return show(wrap, Number(maker.value), Number(maker.max));
    }
    // the dialog's slider moved: its stage's View zoom says so
    if (target.matches('.maker__settings input[data-zoom]')) {
      for (const w of target.closest('.maker')?.querySelectorAll<HTMLElement>('.maker__live .stage-wrap') ?? []) refresh(w);
    }
  });

  // into the export dialog and back, into full screen and back: the control shows what applies
  new MutationObserver((records) => {
    for (const r of records) {
      const wrap = (r.target as HTMLElement).closest<HTMLElement>('.stage-wrap');
      if (wrap) refresh(wrap);
    }
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-in-maker'] });
  document.addEventListener('fullscreenchange', () => {
    const wrap = document.fullscreenElement?.closest<HTMLElement>('.stage-wrap');
    if (wrap) refresh(wrap);
  });

  // back / forward from the page cache: a fresh 70%, as on any new visit
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    for (const wrap of document.querySelectorAll<HTMLElement>('.stage-wrap')) setViewZoom(wrap, NATURAL_FILL);
  });

  // a model moved by its own script (not a CSS animation or a transition) is looked at now and then
  window.setInterval(() => {
    if (document.hidden) return;
    for (const wrap of document.querySelectorAll<HTMLElement>('.stage-wrap[data-view-zoomed]')) {
      const stage = stageOf(wrap);
      if (stage) sampleFillLimit(stage);
    }
  }, 1000);

  initViewZoom();
}
