/**
 * How big a model may be shown on its stage: the top end of the export dialog's Model size slider
 * (video.ts) and of the page's View zoom (view-zoom.ts), one piece of math for both.
 *
 * Both sliders say how much of the frame the model fills: 70% is its own size (the view
 * contract's 70vmin band) and a value v shows it v / 70% times as big about the canvas's middle.
 * The top end is the value at which the model's drawn box, grown that way, still clears every edge
 * of the canvas by PAD (4vmin), and at full screen the View zoom bar along the bottom too. It is
 * floored to the sliders' 5% steps, never under 70% (the model as it is) nor over 100%.
 *
 * The drawn box is measured inside the model's frame, as the union of every part that paints (a
 * fill, a border, a shadow, text, an image, a drawn ::before/::after), 3D turns included — the
 * print's rule (printDoc's drawn()):
 *  - over the model's CSS animation loop, swept in one go: every animation seeked to 24 moments
 *    and put back, all in one task, before anything is painted, so nothing is seen to move;
 *  - over the states the visitor puts it in: a transition or a one-off animation (a hover, a lid
 *    opening) is swept to its end the same way the moment it starts, so the top end comes down
 *    before the model has grown; a pose moved by the pointer is measured the frame it changes;
 *  - again from scratch when the canvas changes size (full screen, a resize, the dialog's shape)
 *    and when the model changes (another model, a reload, an edit in the editor).
 * A box measured while the dialog's --zoom is on is divided back by it, so the top end does not
 * depend on the value it limits.
 */
export const MIN_FILL = 25;
export const NATURAL_FILL = 70;
export const MAX_FILL = 100;
const STEP = 5;
const PAD = 0.04; // of the canvas's short side, on every side

type Box = { l: number; t: number; r: number; b: number }; // reach from the middle, at 70%

class Limit {
  private frame: HTMLIFrameElement | null = null;
  private doc: Document | null = null;
  private seen: Box | null = null;
  private painters: Element[] = [];
  private pending = false;
  private fresh = false;
  private timer = 0;
  private detach: (() => void)[] = [];
  private frameWatch?: MutationObserver;
  private resize: ResizeObserver;
  private watch: MutationObserver;
  readonly listeners = new Set<(max: number | null) => void>();
  /** The top end in percent, or null while the model has not been measured. */
  max: number | null = null;

  constructor(readonly stage: HTMLElement) {
    this.resize = new ResizeObserver(() => this.restartSoon()); // once the frame inside has its new size too
    this.resize.observe(stage);
    this.watch = new MutationObserver(() => this.attach());
    this.watch.observe(stage, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ready'] });
    this.attach();
  }

  stop(): void {
    this.resize.disconnect();
    this.watch.disconnect();
    this.frameWatch?.disconnect();
    for (const off of this.detach.splice(0)) off();
    window.clearTimeout(this.timer);
  }

  private attach(): void {
    const frame = this.stage.querySelector<HTMLIFrameElement>(':scope > iframe');
    const doc = frame?.dataset.ready === 'true' ? frame.contentDocument : null;
    if (frame === this.frame && doc === this.doc) return;
    for (const off of this.detach.splice(0)) off();
    this.frameWatch?.disconnect();
    this.frame = frame;
    this.doc = doc;
    if (!doc) return this.restart();
    // an edit to the model's CSS is written into the frame's <style id="c3d-code">
    this.frameWatch = new MutationObserver(() => this.restartSoon());
    const code = doc.getElementById('c3d-code');
    if (code) this.frameWatch.observe(code, { childList: true, characterData: true, subtree: true });
    const on = (type: string, fn: EventListener): void => {
      doc.addEventListener(type, fn, { passive: true, capture: true });
      this.detach.push(() => doc.removeEventListener(type, fn, { capture: true }));
    };
    // a move only moves what paints; a hover, a click or a key can make new parts paint
    for (const type of ['pointermove', 'wheel', 'scroll']) on(type, () => this.sampleNextFrame(false));
    for (const type of ['pointerover', 'pointerout', 'pointerdown', 'pointerup', 'click', 'keydown', 'focusin', 'input', 'change']) on(type, () => this.sampleNextFrame(true));
    // a hover, a lid opening: where it is going is measured now, before it gets there
    for (const type of ['transitionrun', 'animationstart', 'transitionend', 'animationend']) on(type, () => this.ahead());
    this.restart();
  }

  private restartSoon(): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.restart(), 120);
  }

  /** Forget what was seen and measure again: a new model, or a new canvas size. */
  private restart(): void {
    this.seen = null;
    if (!this.doc || !this.frame?.isConnected) return this.publish(null);
    this.painters = paintersOf(this.doc);
    this.sweep();
    this.update();
  }

  /** The dialog's --zoom on the stage now (1 on the page). */
  private factor(): number {
    const f = Number.parseFloat(this.stage.style.getPropertyValue('--zoom'));
    return Number.isFinite(f) && f > 0 ? f : 1;
  }

  /** The model's CSS animation loop, seeked through and put back before anything is painted. */
  private sweep(): void {
    const doc = this.doc!;
    const win = doc.defaultView as (Window & typeof globalThis) | null;
    this.take();
    const anims = doc.getAnimations().filter((a) => win && a instanceof win.CSSAnimation && a.playState !== 'idle');
    if (!anims.length) return;
    const span = Math.min(20000, Math.max(...anims.map((a) => Number(a.effect?.getComputedTiming().duration) || 0)));
    if (!(span > 0)) return;
    const was = anims.map((a) => a.currentTime);
    try {
      for (let i = 1; i < 24; i++) {
        anims.forEach((a, k) => {
          a.currentTime = Number(was[k] ?? 0) + (span * i) / 24;
        });
        this.take();
      }
    } finally {
      anims.forEach((a, k) => {
        a.currentTime = was[k] ?? null;
      });
    }
  }

  /** Every transition and one-off animation now running, swept to its end and put back. */
  private ahead(): void {
    if (!this.doc || !this.seen) return;
    const win = this.doc.defaultView as (Window & typeof globalThis) | null;
    if (!win) return;
    this.painters = paintersOf(this.doc);
    const runs = this.doc.getAnimations().filter((a) => {
      if (a.playState === 'idle') return false;
      return a instanceof win.CSSTransition || (a instanceof win.CSSAnimation && Number.isFinite(a.effect?.getComputedTiming().activeDuration));
    });
    const was = runs.map((a) => a.currentTime);
    const ends = runs.map((a) => Number(a.effect?.getComputedTiming().endTime) || 0);
    try {
      for (let i = 1; i <= 12; i++) {
        runs.forEach((a, k) => {
          const from = Number(was[k] ?? 0);
          // up to a hair before the end: a transition seeked to its very end is over and removed
          a.currentTime = from + ((Math.max(from, ends[k]! - 1) - from) * i) / 12;
        });
        this.take();
      }
    } finally {
      runs.forEach((a, k) => {
        a.currentTime = was[k] ?? null;
      });
    }
    this.take();
    this.update();
  }

  private sampleNextFrame(fresh: boolean): void {
    if (!this.seen) return;
    this.fresh ||= fresh;
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.sample();
    });
  }

  /** Measure the pose now (a script's own motion is looked at by the caller now and then). */
  sample(fresh = false): void {
    if (!this.doc || !this.seen) return;
    if (this.fresh || fresh) this.painters = paintersOf(this.doc);
    this.fresh = false;
    this.take();
    this.update();
  }

  /** Adds the model's drawn box, as it is right now and at 70%, to what has been seen. */
  private take(): void {
    const doc = this.doc!;
    const w = doc.documentElement.clientWidth, h = doc.documentElement.clientHeight;
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const el of this.painters) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      l = Math.min(l, box.left);
      t = Math.min(t, box.top);
      r = Math.max(r, box.right);
      b = Math.max(b, box.bottom);
    }
    if (l === Infinity) return;
    const f = this.factor();
    const now = { l: (w / 2 - l) / f, r: (r - w / 2) / f, t: (h / 2 - t) / f, b: (b - h / 2) / f };
    const s = this.seen;
    this.seen = s ? { l: Math.max(s.l, now.l), r: Math.max(s.r, now.r), t: Math.max(s.t, now.t), b: Math.max(s.b, now.b) } : now;
  }

  /** The top end from what has been seen. */
  private update(): void {
    const doc = this.doc!;
    const w = doc.documentElement.clientWidth, h = doc.documentElement.clientHeight;
    const s = this.seen;
    if (!w || !h || !s) return this.publish(null);
    const pad = PAD * Math.min(w, h);
    // at full screen the View zoom bar lies over the canvas's bottom edge: the model stops above it
    const bar = this.stage.parentElement?.querySelector<HTMLElement>(':scope > .stage__view');
    const barCs = bar ? getComputedStyle(bar) : null;
    const over = bar && barCs!.position === 'absolute' && barCs!.display !== 'none' ? this.stage.getBoundingClientRect().bottom - bar.getBoundingClientRect().top + 8 : 0;
    const room = (reach: number, space: number): number => (reach <= 0.5 ? Infinity : space / reach);
    const z = Math.min(room(s.l, w / 2 - pad), room(s.r, w / 2 - pad), room(s.t, h / 2 - pad), room(s.b, h / 2 - Math.max(pad, over)));
    const top = Math.floor((NATURAL_FILL * z) / STEP) * STEP;
    this.publish(Math.max(NATURAL_FILL, Math.min(MAX_FILL, top)));
  }

  private publish(max: number | null): void {
    if (max === this.max) return;
    this.max = max;
    for (const fn of this.listeners) fn(max);
  }
}

const limits = new WeakMap<HTMLElement, Limit>();

/**
 * Follows the top end for the model on `stage`: `onChange` is called now and whenever it changes
 * (null while the model is not measured). One measurement per stage, shared by every caller.
 * Returns the function that stops following.
 */
export function watchFillLimit(stage: HTMLElement, onChange: (max: number | null) => void): () => void {
  let limit = limits.get(stage);
  if (!limit) {
    limit = new Limit(stage);
    limits.set(stage, limit);
  }
  const l = limit;
  l.listeners.add(onChange);
  onChange(l.max);
  return () => {
    l.listeners.delete(onChange);
    if (l.listeners.size) return;
    l.stop();
    limits.delete(stage);
  };
}

/** The top end now for `stage` (null when it is not followed or not measured yet). */
export const fillLimitOf = (stage: HTMLElement): number | null => limits.get(stage)?.max ?? null;

/** Looks at a model moved by its own script (not a CSS animation or transition). */
export function sampleFillLimit(stage: HTMLElement): void {
  limits.get(stage)?.sample(true);
}

/** The parts of the model that paint something. */
function paintersOf(doc: Document): Element[] {
  const scene = doc.getElementById('c3d-scene');
  if (!scene) return [];
  const win = doc.defaultView!;
  return [...scene.querySelectorAll('*')].filter((el) => {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    if (/^(IMG|CANVAS|SVG|VIDEO|INPUT|BUTTON|SELECT|TEXTAREA)$/i.test(el.tagName)) return true;
    const cs = win.getComputedStyle(el);
    return (
      cs.backgroundImage !== 'none' ||
      cs.boxShadow !== 'none' ||
      !/rgba\(.*, 0\)|transparent/.test(cs.backgroundColor) ||
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) + parseFloat(cs.borderBottomWidth) > 0 ||
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim()) ||
      ['::before', '::after'].some((p) => {
        const c = win.getComputedStyle(el, p).content;
        return c !== 'none' && c !== 'normal';
      })
    );
  });
}
