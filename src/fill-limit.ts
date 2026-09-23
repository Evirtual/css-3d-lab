/**
 * How big a model may be shown on its stage: the top end of the export dialog's Model size slider
 * (video.ts) and of the page's View zoom (view-zoom.ts), one piece of math for both.
 *
 * Both sliders say how much of the frame the model fills: 70% is its own size (the view
 * contract's 70vmin band) and a value v shows it v / 70% times as big about the canvas's middle.
 * The top end is the value at which the model's drawn box, grown that way, still clears every edge
 * of the canvas by PAD (4vmin), and at full screen the View zoom bar along the bottom too. It is
 * floored to the sliders' 5% steps, never under 70% (the model as it is) nor over 100%. A
 * full-canvas scene (VIEW-CONTRACT.md: it fills the canvas edge to edge by design, so the margin is
 * not for it) stops at 70%: making it bigger would only crop it. Smaller works as for any model.
 *
 * The drawn box is measured inside the model's frame, as the union of every part that paints (a
 * fill, a border, a shadow, text, an image, a drawn ::before/::after), 3D turns included — the
 * print's rule (printDoc's drawn()) — each box grown by how far its outer box-shadows, its
 * text-shadows (a long shadow stack, like the pointer-lit text's, reaches far past its box) and its
 * filter's drop-shadows and blur reach past it (what a pseudo-element draws outside its element's
 * box is not seen):
 *  - over the model's CSS animation loop, swept in one go: every animation seeked to SWEEP_STEPS
 *    moments and put back, all in one task, before anything is painted, so nothing is seen to move;
 *  - for a model that follows the pointer (tagged 'pointer'), over the pointer's extremes: the
 *    pointer is walked through the canvas's four corners and its middle in the frame, as pointer
 *    and mouse events the model's own script reads, each pose swept to where its transitions end;
 *    then every style and class its script wrote is put back and the transitions it started are
 *    cancelled, all in one task, so nothing is seen to move;
 *  - over whatever transition or one-off animation happens to be running at that moment, swept to
 *    where it is going (ahead()), so a model caught mid-hover is measured where it lands, not
 *    where it is.
 *
 * WHEN IT IS MEASURED. Measuring is the expensive thing on this page: one measurement reads what
 * paints (the computed style of every element in the scene) and then forces a layout per pose. So
 * it is taken only when the answer is about to be used or can no longer be trusted:
 *  - when the model is mounted, and again when the model changes (another model, a reload);
 *  - when the canvas changes size — a resize, full screen, the export dialog's shape — once the
 *    frame inside has its new size too;
 *  - after an edit in the editor, once the typing has settled (EDIT_MS after the last write into
 *    the frame's <style>): one measurement per edit, not one per keystroke;
 *  - when the visitor takes hold of a size control (refreshFillLimit, on pointerdown or focus),
 *    and again before a value from it is applied if what was measured can no longer be trusted
 *    (freshFillLimit). That is what holds the contract: the value the slider gives is always a
 *    value something was measured for, so the model cannot pass the canvas edge;
 *  - now and then while the model is shown zoomed, for a model moved by its own script
 *    (sampleFillLimit, called by view-zoom.ts once a second).
 * It is NOT taken on transitionrun, animationstart, transitionend or animationend, nor on every
 * pointer move: those fire in bursts — one hover that transitions twenty elements over three
 * properties is sixty events — and each one used to be a whole measurement, which is what made
 * the editing stage and the export dialog lag. Everything asked for in one frame is drained by one
 * requestAnimationFrame, so several asks still cost at most one measurement.
 *
 * Nothing is measured while the stage is paused or the page is hidden: nothing can move, so
 * nothing can have grown. What was asked for is kept and taken the moment it plays or comes back
 * into view. A model that has never been measured has no top end (null), and both sliders then
 * stand at the model's own size, 70% — the safe end — until one is touched, which measures.
 * A box measured while the dialog's --zoom is on is divided back by it, so the top end does not
 * depend on the value it limits.
 */
import { demos } from './models';

export const MIN_FILL = 25;
export const NATURAL_FILL = 70;
export const MAX_FILL = 100;
const STEP = 5;
const PAD = 0.04; // of the canvas's short side, on every side
const FULL = 0.95; // a drawing that covers this much of the canvas both ways fills it
const EDIT_MS = 400; // after the last write into the frame's <style>: one measurement per edit
const SIZE_MS = 120; // after a resize, so the frame inside has its new size too
/**
 * Moments a CSS animation loop is coarsely seeked to. It used to be 24 evenly spaced ones, and
 * nothing else. Evenly spaced moments are the wrong tool: the far side of a loop almost never
 * lands on one, so the count was the only thing between the measurement and a box a few percent
 * short — and 24 of them, each forcing a layout, is most of what made an edit cost ~140 ms. Nor
 * are more of them reliably better, since a model whose parts run on several durations is sampled
 * aliased: cube's widest pose is caught by 24 moments and by 8, and missed by 12.
 *
 * So the loop is walked coarsely, and then the far side is found rather than stumbled on: for each
 * edge of the box, the coarse moment that reached furthest is halved in on (SWEEP_HALVINGS), which
 * pins that edge to a thirty-second of the loop — finer than 24 even moments ever were. The four
 * edges nearly always agree on the moment and no moment is ever seeked twice, so a loop costs
 * 8 coarse moments and a handful more, in place of 24.
 */
const SWEEP_STEPS = 8;
/** Times an edge's coarse moment is halved in on: step/2, then step/4 (a thirty-second of the loop). */
const SWEEP_HALVINGS = 2;
const SIDES = ['l', 't', 'r', 'b'] as const;

/** What has been asked for and not yet done. A full measurement subsumes the other two. */
const WANT_TAKE = 1; // measure the pose as it is now
const WANT_PAINTERS = 2; // read what paints first
const WANT_ALL = 4; // forget what was seen and measure from scratch

type Box = { l: number; t: number; r: number; b: number }; // reach from the middle, at 70%

class Limit {
  private frame: HTMLIFrameElement | null = null;
  private doc: Document | null = null;
  private seen: Box | null = null;
  private painters: Element[] = [];
  private timer = 0;
  /** What has been asked for, and the one frame it is drained in. */
  private want = 0;
  private raf = 0;
  /** What was measured can no longer be trusted: the model, the canvas or the code has changed. */
  private stale = true;
  private detach: (() => void)[] = [];
  private frameWatch?: MutationObserver;
  private pauseWatch?: MutationObserver;
  /** The model follows the pointer: its limit holds wherever the pointer is. */
  private follows = false;
  /** Where the visitor's own pointer is in the frame, or null when it is not over it. */
  private real: { x: number; y: number } | null = null;
  /** Set while the pointer is being walked through the canvas: those events are ours. */
  private walking = false;
  private resize: ResizeObserver;
  private watch: MutationObserver;
  private onShow = (): void => this.wake();
  readonly listeners = new Set<(max: number | null, full: boolean) => void>();
  /** The model is a full-canvas scene: at rest its drawing covers the canvas, by design. */
  full = false;
  /** The top end in percent, or null while the model has not been measured. */
  max: number | null = null;

  constructor(readonly stage: HTMLElement) {
    this.resize = new ResizeObserver(() => this.laterAll(SIZE_MS)); // once the frame inside has its new size too
    this.resize.observe(stage);
    this.watch = new MutationObserver(() => this.attach());
    this.watch.observe(stage, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ready'] });
    document.addEventListener('visibilitychange', this.onShow);
    this.attach();
  }

  stop(): void {
    this.resize.disconnect();
    this.watch.disconnect();
    this.frameWatch?.disconnect();
    this.pauseWatch?.disconnect();
    document.removeEventListener('visibilitychange', this.onShow);
    for (const off of this.detach.splice(0)) off();
    window.clearTimeout(this.timer);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.want = 0;
  }

  private attach(): void {
    const frame = this.stage.querySelector<HTMLIFrameElement>(':scope > iframe');
    const doc = frame?.dataset.ready === 'true' ? frame.contentDocument : null;
    if (frame === this.frame && doc === this.doc) return;
    for (const off of this.detach.splice(0)) off();
    this.frameWatch?.disconnect();
    this.pauseWatch?.disconnect();
    this.frame = frame;
    this.doc = doc;
    this.real = null;
    // the model, found by the frame's title (preview.ts: "<title> — live preview")
    const title = frame?.title.replace(/ — live preview$/, '');
    this.follows = Boolean(title && demos.some((d) => d.title === title && d.tags.includes('pointer')));
    if (!doc) {
      this.seen = null;
      this.stale = true;
      return this.publish(null);
    }
    // an edit to the model's CSS is written into the frame's <style id="c3d-code">
    this.frameWatch = new MutationObserver(() => this.laterAll(EDIT_MS));
    const code = doc.getElementById('c3d-code');
    if (code) this.frameWatch.observe(code, { childList: true, characterData: true, subtree: true });
    // measuring stops while the stage is paused (preview.ts writes <html data-paused> in the
    // frame for all three reasons: the site's Pause, the stage's, and a card off screen)
    this.pauseWatch = new MutationObserver(() => this.wake());
    this.pauseWatch.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-paused'] });
    const on = (type: string, fn: EventListener): void => {
      const own: EventListener = (e) => {
        if (!this.walking) fn(e);
      };
      doc.addEventListener(type, own, { passive: true, capture: true });
      this.detach.push(() => doc.removeEventListener(type, own, { capture: true }));
    };
    // the visitor's pointer, to put it back after a walk. Nothing is measured here: see WHEN IT IS
    // MEASURED above.
    on('pointermove', (e) => {
      const p = e as PointerEvent;
      if (p.isTrusted) this.real = { x: p.clientX, y: p.clientY };
    });
    on('pointerout', (e) => {
      const p = e as PointerEvent;
      if (p.isTrusted && !p.relatedTarget) this.real = null;
    });
    this.laterAll(0);
  }

  /** Nothing to see: a paused stage cannot move, and a hidden page is not being looked at. */
  private asleep(): boolean {
    return document.hidden || Boolean(this.doc?.documentElement.hasAttribute('data-paused'));
  }

  /** Forget what was seen and measure again, once things have settled. */
  private laterAll(ms: number): void {
    this.stale = true;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.need(WANT_ALL), ms);
  }

  private need(what: number): void {
    this.want |= what;
    this.wake();
  }

  /** One frame drains everything asked for since the last one, so several asks cost one look. */
  private wake(): void {
    if (!this.want || this.raf || this.asleep()) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (this.asleep()) return; // kept: wake() takes it up again when it plays or comes back
      const want = this.want;
      this.want = 0;
      if (want & WANT_ALL) this.measure();
      else if (want & WANT_TAKE) this.look(Boolean(want & WANT_PAINTERS));
    });
  }

  /** Forget what was seen and measure the model from scratch. */
  private measure(): void {
    window.clearTimeout(this.timer);
    this.want = 0;
    this.seen = null;
    this.stale = false;
    if (!this.doc || !this.frame?.isConnected) return this.publish(null);
    // Read once per measurement, not once per pose. Reading what paints is the expensive half —
    // the computed style of every element in the scene — and the parts that paint do not come and
    // go between the poses of one measurement.
    this.painters = paintersOf(this.doc);
    this.take();
    const rest = this.seen as Box | null; // (take() has just set it)
    const cw = this.doc.documentElement.clientWidth, ch = this.doc.documentElement.clientHeight;
    // at rest, before anything moves: a drawing that covers the canvas both ways is a full-canvas
    // scene (VIEW-CONTRACT.md, "Full-canvas models"; check-models and check-stages call it so at
    // 95%, by the same measure: what it paints)
    this.full = Boolean(rest && cw && ch && (rest.l + rest.r) * this.factor() >= FULL * cw && (rest.t + rest.b) * this.factor() >= FULL * ch);
    this.sweep();
    if (this.follows) this.walk();
    this.ahead();
    this.update();
  }

  /** Add the pose as it is now to what has been seen. */
  private look(fresh: boolean): void {
    if (!this.doc || !this.seen) return;
    if (fresh) this.painters = paintersOf(this.doc);
    this.take();
    this.update();
  }

  /** Looks at a model moved by its own script; `fresh` reads what paints again first. */
  sample(fresh = false): void {
    this.need(WANT_TAKE | (fresh ? WANT_PAINTERS : 0));
  }

  /** Measure now, whatever else was scheduled: a size control has been taken hold of. */
  measureNow(): void {
    this.measure();
  }

  /** Measure now if what was measured can no longer be trusted: a value is about to be applied. */
  ensure(): void {
    if (this.stale || this.max === null) this.measure();
  }

  /** The pointer walked through the canvas's corners and middle, each pose measured, then put back. */
  private walk(): void {
    const doc = this.doc!;
    const win = doc.defaultView as (Window & typeof globalThis) | null;
    if (!win) return;
    const w = doc.documentElement.clientWidth, h = doc.documentElement.clientHeight;
    const before = new Set(doc.getAnimations());
    // what the model's script may write while it is walked: every element's style and class
    const kept = [...doc.querySelectorAll('*')].map((el) => [el, el.getAttribute('style'), el.getAttribute('class')] as const);
    const fire = (el: Element, type: string, x: number, y: number, bubbles = true): void => {
      const init = { clientX: x, clientY: y, bubbles, cancelable: true, composed: true, view: win };
      el.dispatchEvent(type.startsWith('pointer') ? new win.PointerEvent(type, { ...init, pointerId: 1, pointerType: 'mouse', isPrimary: true }) : new win.MouseEvent(type, init));
    };
    const at = (x: number, y: number): Element => doc.elementFromPoint(x, y) ?? doc.body;
    let last: Element | null = null;
    const leave = (el: Element, x: number, y: number): void => {
      fire(el, 'pointerout', x, y);
      fire(el, 'mouseout', x, y);
      for (let n: Element | null = el; n; n = n.parentElement) {
        fire(n, 'pointerleave', x, y, false);
        fire(n, 'mouseleave', x, y, false);
      }
    };
    const moveTo = (x: number, y: number): void => {
      const el = at(x, y);
      if (last && last !== el) leave(last, x, y);
      if (last !== el) {
        fire(el, 'pointerover', x, y);
        fire(el, 'mouseover', x, y);
        for (let n: Element | null = el; n; n = n.parentElement) fire(n, 'pointerenter', x, y, false);
      }
      fire(el, 'pointermove', x, y);
      fire(el, 'mousemove', x, y);
      last = el;
    };
    this.walking = true;
    try {
      for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2], [w / 2, h / 2]] as const) {
        moveTo(x, y);
        this.take();
        // where the transitions it started are going. A model that answers the pointer with a
        // transform written straight on — confetti, most of them — starts none, and the six seeks
        // below would then be six measurements of the pose just taken: thirty wasted layouts a
        // measurement, which was the whole of confetti's editing cost.
        const runs = doc.getAnimations().filter((a) => !before.has(a) && a.playState !== 'idle' && (a instanceof win.CSSTransition || (a instanceof win.CSSAnimation && Number.isFinite(a.effect?.getComputedTiming().activeDuration))));
        if (!runs.length) continue;
        for (let i = 1; i <= 6; i++) {
          for (const a of runs) {
            const end = Number(a.effect?.getComputedTiming().endTime) || 0;
            a.currentTime = Math.max(0, end - 1) * (i / 6);
          }
          this.take();
        }
      }
    } finally {
      // as it was: the pointer taken away again (unless the visitor's is there), every style and
      // class the script wrote put back, and the transitions that started cut short
      if (last && !this.real) leave(last, -1, -1);
      for (const [el, style, cls] of kept) {
        if (el.getAttribute('style') !== style) {
          if (style === null) el.removeAttribute('style');
          else el.setAttribute('style', style);
        }
        if (el.getAttribute('class') !== cls) {
          if (cls === null) el.removeAttribute('class');
          else el.setAttribute('class', cls);
        }
      }
      for (const a of doc.getAnimations()) if (!before.has(a) && a instanceof win.CSSTransition) a.cancel();
      this.walking = false;
    }
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
    // nothing is animating at all: the pose the caller has already taken is the whole of it
    const all = doc.getAnimations();
    if (!all.length) return;
    const anims = all.filter((a) => win && a instanceof win.CSSAnimation && a.playState !== 'idle');
    if (!anims.length) return;
    const span = Math.min(20000, Math.max(...anims.map((a) => Number(a.effect?.getComputedTiming().duration) || 0)));
    if (!(span > 0)) return;
    const was = anims.map((a) => a.currentTime);
    const done = new Map<number, Box | null>();
    /** The loop at `t` (wrapped into it), measured once however often it is asked for. */
    const at = (t: number): Box | null => {
      const key = Math.round((((t % span) + span) % span) * 1000) / 1000;
      const had = done.get(key);
      if (had !== undefined) return had;
      anims.forEach((a, k) => {
        a.currentTime = Number(was[k] ?? 0) + key;
      });
      const box = this.take();
      done.set(key, box);
      return box;
    };
    const reach = (box: Box | null, side: (typeof SIDES)[number]): number => (box ? box[side] : -Infinity);
    try {
      const step = span / SWEEP_STEPS;
      const coarse: (Box | null)[] = [];
      for (let i = 0; i < SWEEP_STEPS; i++) coarse[i] = at(i * step);
      // each edge's furthest coarse moment, halved in on: the far side of the loop lies between
      // two coarse moments far more often than on one
      for (const side of SIDES) {
        let best = 0;
        for (let i = 1; i < SWEEP_STEPS; i++) if (reach(coarse[i] ?? null, side) > reach(coarse[best] ?? null, side)) best = i;
        let far = reach(coarse[best] ?? null, side);
        let t = best * step;
        for (let h = 0, gap = step / 2; h < SWEEP_HALVINGS; h++, gap /= 2) {
          for (const near of [t - gap, t + gap]) {
            const got = reach(at(near), side);
            if (got > far) {
              far = got;
              t = near;
            }
          }
        }
      }
    } finally {
      anims.forEach((a, k) => {
        a.currentTime = was[k] ?? null;
      });
    }
  }

  /** Every transition and one-off animation running right now, swept to its end and put back. */
  private ahead(): void {
    if (!this.doc || !this.seen) return;
    const win = this.doc.defaultView as (Window & typeof globalThis) | null;
    if (!win) return;
    const runs = this.doc.getAnimations().filter((a) => {
      if (a.playState === 'idle') return false;
      return a instanceof win.CSSTransition || (a instanceof win.CSSAnimation && Number.isFinite(a.effect?.getComputedTiming().activeDuration));
    });
    if (!runs.length) return; // at rest, which is the usual case: nothing to look ahead at
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
  }

  /** Adds the model's drawn box, as it is right now and at 70%, to what has been seen, and is it. */
  private take(): Box | null {
    const doc = this.doc!;
    const w = doc.documentElement.clientWidth, h = doc.documentElement.clientHeight;
    const win = doc.defaultView!;
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const el of this.painters) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      // a shadow or a blur is ink no box contains: its reach, in the element's own pixels, grown
      // by how much bigger the element is drawn than it is laid out (its zoom, its 3D turn)
      const glow = glowOf(win.getComputedStyle(el));
      const own = el instanceof win.HTMLElement ? el.offsetWidth : 0;
      const k = own > 0 ? box.width / own : 1;
      l = Math.min(l, box.left - glow.l * k);
      t = Math.min(t, box.top - glow.t * k);
      r = Math.max(r, box.right + glow.r * k);
      b = Math.max(b, box.bottom + glow.b * k);
    }
    if (l === Infinity) return null;
    const f = this.factor();
    const now = { l: (w / 2 - l) / f, r: (r - w / 2) / f, t: (h / 2 - t) / f, b: (b - h / 2) / f };
    const s = this.seen;
    this.seen = s ? { l: Math.max(s.l, now.l), r: Math.max(s.r, now.r), t: Math.max(s.t, now.t), b: Math.max(s.b, now.b) } : now;
    return now;
  }

  /** The top end from what has been seen. */
  private update(): void {
    const doc = this.doc!;
    const w = doc.documentElement.clientWidth, h = doc.documentElement.clientHeight;
    const s = this.seen;
    if (!w || !h || !s) return this.publish(null);
    // a scene that already fills the canvas is not made bigger: that would only crop it
    if (this.full) return this.publish(NATURAL_FILL);
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

  private shown = false;
  private publish(max: number | null): void {
    if (max === this.max && this.full === this.shown) return;
    this.max = max;
    this.shown = this.full;
    for (const fn of this.listeners) fn(max, this.full);
  }
}

const limits = new WeakMap<HTMLElement, Limit>();

/**
 * Follows the top end for the model on `stage`: `onChange` is called now and whenever it changes
 * (null while the model is not measured). One measurement per stage, shared by every caller.
 * Returns the function that stops following.
 */
export function watchFillLimit(stage: HTMLElement, onChange: (max: number | null, full: boolean) => void): () => void {
  let limit = limits.get(stage);
  if (!limit) {
    limit = new Limit(stage);
    limits.set(stage, limit);
  }
  const l = limit;
  l.listeners.add(onChange);
  onChange(l.max, l.full);
  return () => {
    l.listeners.delete(onChange);
    if (l.listeners.size) return;
    l.stop();
    limits.delete(stage);
  };
}

/** The top end now for `stage` (null when it is not followed or not measured yet). */
export const fillLimitOf = (stage: HTMLElement): number | null => limits.get(stage)?.max ?? null;

/** Whether the model on `stage` is a full-canvas scene (its top end is then 70%: it fills the canvas). */
export const fillsCanvas = (stage: HTMLElement): boolean => Boolean(limits.get(stage)?.full && limits.get(stage)?.max !== null);

/** Looks at a model moved by its own script (not a CSS animation or a transition). */
export function sampleFillLimit(stage: HTMLElement): void {
  limits.get(stage)?.sample(true);
}

/**
 * A size control has been taken hold of (pointerdown, focus): measure now, so the first value it
 * gives is already held to a measurement of the model as it is.
 */
export function refreshFillLimit(stage: HTMLElement): void {
  limits.get(stage)?.measureNow();
}

/**
 * The top end to hold a value to, measured again first if what was measured can no longer be
 * trusted. Called on the way from a slider to what it changes, so a value is never applied that
 * nothing was measured for.
 */
export function freshFillLimit(stage: HTMLElement): number | null {
  const l = limits.get(stage);
  l?.ensure();
  return l?.max ?? null;
}

/** How far past its box an element's outer shadows (box and text) and blur reach, side by side, in its own pixels. */
function glowOf(cs: CSSStyleDeclaration): { l: number; t: number; r: number; b: number } {
  const g = { l: 0, t: 0, r: 0, b: 0 };
  const reach = (x: number, y: number, far: number): void => {
    g.l = Math.max(g.l, far - x);
    g.r = Math.max(g.r, far + x);
    g.t = Math.max(g.t, far - y);
    g.b = Math.max(g.b, far + y);
  };
  if (cs.boxShadow !== 'none') {
    // one shadow per comma outside the colour's parentheses
    for (const one of cs.boxShadow.split(/,(?![^(]*\))/)) {
      if (/\binset\b/.test(one)) continue;
      const [x = 0, y = 0, blur = 0, spread = 0] = (one.match(/-?[\d.]+px/g) ?? []).map(parseFloat);
      reach(x, y, blur + spread);
    }
  }
  if (cs.textShadow !== 'none') {
    // a text-shadow falls from the text, which lies inside the box (a long shadow stack reaches far)
    for (const one of cs.textShadow.split(/,(?![^(]*\))/)) {
      const [x = 0, y = 0, blur = 0] = (one.match(/-?[\d.]+px/g) ?? []).map(parseFloat);
      reach(x, y, blur);
    }
  }
  if (cs.filter !== 'none') {
    // drop-shadow(rgba(…) 0px 4px 12px): its colour has parentheses of its own
    for (const [, args] of cs.filter.matchAll(/drop-shadow\(((?:[^()]|\([^()]*\))*)\)/g)) {
      const [x = 0, y = 0, blur = 0] = (args!.match(/-?[\d.]+px/g) ?? []).map(parseFloat);
      reach(x, y, blur);
    }
    for (const [, r] of cs.filter.matchAll(/blur\(([\d.]+)px\)/g)) reach(0, 0, 2 * parseFloat(r!));
  }
  return g;
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
