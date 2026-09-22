/**
 * "View zoom": the model shown bigger or smaller on the large stage — the model page, the home
 * page's viewer, full screen, and the export dialog's full screen. One control, one module, one CSS
 * block (.stage__view in _layout.scss) for all of them: under the canvas in the page, a bar along
 * the canvas's bottom edge at full screen. The model page's HTML is written by generate-pages from
 * viewZoomHtml() below, the viewer's by main.ts from the same function.
 *
 * It is the export dialog's Model size slider, on the page: the same markup and classes (so it
 * looks exactly like it), the same meaning — how much of the frame the model fills — the same
 * range, 25% to 100% in 5s, and the same math: 70% is the model's own size (the view contract's
 * 70vmin band, CONTRACT_FILL in video.ts) and the model is shown fill / 70% times as big, about
 * the canvas's middle, as preview.ts does with the dialog's --zoom.
 *
 * It only changes how the model's frame is SHOWN. The frame is drawn scaled from out here (a
 * `scale` on the iframe); the model inside keeps its canvas, its layout and its code untouched.
 * Nothing inside the frame changes, so a capture (which reads the model's own styles, inside the
 * frame) never sees it: a recording, a snapshot, a print is the model at its own size. The browser
 * hands pointer and wheel events through the scaled frame, so drag and scroll models still work.
 *
 * The value stays while the model stays: into full screen and out again, into the export dialog
 * and back. It is not remembered: every page and every model the viewer opens starts at 70%.
 *
 * In the export dialog the stage is the dialog's, and so is the size: there the page's own zoom is
 * off (CSS), and at the dialog's full screen this control shows and moves the dialog's Model size
 * slider, so the one control does the one thing wherever it is.
 */
const MIN = 25;
const MAX = 100;
/** The share of the canvas a model fills at its own size: the export dialog's CONTRACT_FILL. */
const NATURAL = 70;

/**
 * The control, placed right after the .stage inside its .stage-wrap. One per page at a time. It
 * is the export dialog's Model size slider (video.ts, zoomSlider) in the dialog's own markup and
 * classes, so it cannot drift from it; .stage__view only places it. Arrow keys move it by 5%.
 */
export const viewZoomHtml = (): string =>
  `<div class="stage__view" data-view-zoom-bar>` +
  `<fieldset class="maker__set maker__set--slider">` +
  `<legend><label for="view-zoom">View zoom</label> <span class="maker__legendHint">how much of the frame it fills · view only</span></legend>` +
  `<div class="maker__slider">` +
  `<input class="maker__zoom" id="view-zoom" type="range" min="${MIN}" max="${MAX}" step="5" value="${NATURAL}" style="--done:${done(NATURAL)}" data-view-zoom aria-valuetext="${NATURAL}%, the model's own size">` +
  `<output for="view-zoom" data-view-zoom-out>${NATURAL}%</output>` +
  `</div></fieldset></div>`;

function done(fill: number): string {
  return `${((fill - MIN) / (MAX - MIN)) * 100}%`;
}

const clamp = (fill: number): number => Math.min(MAX, Math.max(MIN, Math.round(fill / 5) * 5));

/** The page's own zoom on this stage (70 when none is set). */
const pageFill = (wrap: HTMLElement): number => Number(wrap.dataset.viewZoomed ?? NATURAL);

/** The export dialog's Model size slider, when this stage is lent to the dialog. */
const makerSlider = (wrap: HTMLElement): HTMLInputElement | null =>
  wrap.closest('.maker')?.querySelector<HTMLInputElement>('.maker__settings input[data-zoom]') ?? null;

/** The control shows `fill`. */
function show(wrap: HTMLElement, fill: number): void {
  const range = wrap.querySelector<HTMLInputElement>(':scope > .stage__view input[data-view-zoom]');
  if (range) {
    range.value = String(fill);
    range.style.setProperty('--done', done(fill));
    range.setAttribute('aria-valuetext', fill === NATURAL ? `${fill}%, the model's own size` : `${fill}%`);
  }
  const out = wrap.querySelector<HTMLElement>(':scope > .stage__view [data-view-zoom-out]');
  if (out) out.textContent = `${fill}%`;
}

/** The page's zoom on this stage set to `fill` (percent of the frame), and shown. */
export function setViewZoom(wrap: HTMLElement, fill: number): void {
  const f = clamp(fill);
  if (f === NATURAL) {
    wrap.style.removeProperty('--view-zoom');
    delete wrap.dataset.viewZoomed;
  } else {
    wrap.style.setProperty('--view-zoom', (f / NATURAL).toFixed(4));
    wrap.dataset.viewZoomed = String(f);
  }
  show(wrap, f);
}

/** What the control should say now: the dialog's size while the stage is the dialog's. */
function refresh(wrap: HTMLElement): void {
  const maker = makerSlider(wrap);
  show(wrap, maker ? Number(maker.value) : pageFill(wrap));
}

/** Makes every View zoom under `root` show its stage's value (calling it again is fine). */
export function initViewZoom(root: ParentNode = document): void {
  for (const bar of root.querySelectorAll<HTMLElement>('[data-view-zoom-bar]')) {
    const wrap = bar.closest<HTMLElement>('.stage-wrap');
    if (wrap) refresh(wrap);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('input', (e) => {
    const target = e.target as HTMLElement;
    const range = target.closest<HTMLInputElement>('input[data-view-zoom]');
    const wrap = range?.closest<HTMLElement>('.stage-wrap');
    if (range && wrap) {
      const maker = makerSlider(wrap);
      if (!maker) return setViewZoom(wrap, Number(range.value));
      // the dialog's stage: move the dialog's own slider, which does the rest (video.ts)
      maker.value = String(clamp(Number(range.value)));
      maker.dispatchEvent(new Event('input', { bubbles: true }));
      return show(wrap, Number(maker.value));
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
    for (const wrap of document.querySelectorAll<HTMLElement>('.stage-wrap')) setViewZoom(wrap, NATURAL);
  });

  initViewZoom();
}
