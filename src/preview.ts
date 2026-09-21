import { standaloneDoc } from './models/snippet-utils';
import { snippets } from './models/snippets';
import placements from './models/placements.json';
import overrides from './models/placement-overrides.json';
import type { Code } from './live-edit';

type Theme = 'dark' | 'light';
/** Where a model sits in its frame: how much to zoom it, and how far to shift it to the middle. */
export interface Placement {
  zoom: number;
  x: number;
  y: number;
  /** It is drawn to the edges of its frame, so it covers a stage rather than sitting inside one. */
  bleed?: boolean;
}

/**
 * The frame every model is laid out in, wherever it is shown. A card, the viewer, a model's own
 * page and a full screen all run the same document at this size and scale it to their stage, so
 * the model cannot be framed differently in one place than another.
 */
export const FRAME_W = 340;
export const FRAME_H = 280;
/** How much of that frame a model is drawn to: two thirds, with air around it. */
const FILL = 0.667;

/** Measured once per model by scripts/measure-placement.mjs, which reads it back from here. */
const MEASURED = placements as Record<string, Placement>;
/**
 * Hand-written corrections, for the few models the measuring gets wrong. Whatever is named here
 * wins over the measurement, and because every surface reads the same place, a correction holds
 * on a card, in the viewer, on the model's page, in an edit, and in a picture or a video.
 */
const OVERRIDE = overrides as Record<string, Partial<Placement>>;
const placeFor = (id: string): Placement | undefined => {
  const measured = MEASURED[id];
  const fixed = OVERRIDE[id];
  if (!measured && !fixed) return undefined;
  return { ...(measured ?? { zoom: 1, x: 0, y: 0 }), ...fixed };
};
/** Set by the measuring script: measure every model afresh instead of trusting the file. */
const remeasure = (): boolean => Boolean((window as unknown as { __c3dRemeasure?: boolean }).__c3dRemeasure);


/** The box that everything drawn falls inside, in the frame's own pixels. */
export interface Reach {
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** The same, leaving out buttons, labels and fields: the model without the controls under it. */
  body?: Reach;
}

/**
 * How far a model reaches in the frame right now: over its whole animation, and with its hover
 * state applied as well, so a model does not jump out of its frame when someone points at it.
 * `css` is the model's own stylesheet, needed to hold the hover state open.
 */
export function reachOf(scene: HTMLElement, css = ''): Reach | null {
  const doc = scene.ownerDocument;
  const win = doc.defaultView!;
  const held = doc.querySelector('#c3d-held');
  const hadHeld = held?.textContent ?? '';
  // measured with the scene as it is authored, not as it is currently placed
  const hadZoom = scene.style.zoom, hadShift = scene.style.translate;
  scene.style.zoom = ''; scene.style.translate = '';
  const animations = doc.getAnimations();
  const saved = animations.map(a => ({ a, t: a.currentTime, state: a.playState }));
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  // The model is measured a second time without its controls, so a card with a button under the
  // model puts the MODEL in the middle of the frame and the button below it, rather than centring
  // the pair and leaving the model sitting high. Controls that are the model itself (a switch, a
  // menu that is one big button) have nothing left over, and then the whole thing is the model.
  let bl = Infinity, bt = Infinity, br = -Infinity, bb = -Infinity;
  const CONTROL = 'button, label, input, select, textarea, a[href], [role="button"], [role="slider"]';
  try {
    for (let step = 0; step < 24; step++) {
      if (step === 12 && held) held.textContent = css.replace(/:hover/g, ':not(.c3d-never)');
      for (const a of doc.getAnimations()) {
        const timing = a.effect?.getComputedTiming();
        a.pause();
        a.currentTime = typeof timing?.duration === 'number' ? (timing.delay ?? 0) + timing.duration * (step % 12) / 11 : 0;
      }
      for (const el of scene.querySelectorAll('*')) {
        const cs = win.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        const ink = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || cs.boxShadow !== 'none' ||
          (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopColor !== 'rgba(0, 0, 0, 0)') || [...el.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim()) ||
          ['::before', '::after'].some(p => !['none', 'normal'].includes(win.getComputedStyle(el, p).content));
        const r = el.getBoundingClientRect();
        if (!ink || !r.width || !r.height) continue;
        left = Math.min(left, r.left); top = Math.min(top, r.top);
        right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
        if (el.closest(CONTROL)) continue;
        bl = Math.min(bl, r.left); bt = Math.min(bt, r.top);
        br = Math.max(br, r.right); bb = Math.max(bb, r.bottom);
      }
    }
  } finally {
    if (held) held.textContent = hadHeld;
    for (const { a, t, state } of saved) { a.currentTime = t; if (state === 'running') a.play(); }
    scene.style.zoom = hadZoom; scene.style.translate = hadShift;
  }
  if (!Number.isFinite(left)) return null;
  const whole = { left, top, right, bottom };
  // a sliver left over is not the model: a demo whose controls ARE the model keeps the whole box
  const body = { left: bl, top: bt, right: br, bottom: bb };
  const enough = Number.isFinite(bl) && (br - bl) * (bb - bt) > (right - left) * (bottom - top) * 0.25;
  return enough ? { ...whole, body } : whole;
}

/** The two together, where the model reaches and where the frame is. */
export function widen(a: Reach | null, b: Reach | null): Reach | null {
  if (!a || !b) return a ?? b;
  const both = (x: Reach, y: Reach): Reach => ({ left: Math.min(x.left, y.left), top: Math.min(x.top, y.top), right: Math.max(x.right, y.right), bottom: Math.max(x.bottom, y.bottom) });
  const body = a.body && b.body ? both(a.body, b.body) : (a.body ?? b.body);
  return { ...both(a, b), ...(body ? { body } : {}) };
}

/**
 * Where to put a model.
 *
 * `shows` is what the model shows by itself: its whole animation and its hover state. That is
 * what the eye sees, so it decides the middle and the size — two thirds of the frame, middle on
 * middle. A model whose `shows` already covers the frame is a backdrop: it is left alone and
 * marked, so a stage of another shape has it covering the stage rather than sitting inside it.
 *
 * `played` is how far it goes once someone opens, drags or scrolls it. That only ever makes the
 * model smaller, so what opens stays in the frame — and never below half, because a menu that
 * unfolds to six times its own size would otherwise leave a speck sitting in the middle.
 */
const FLOOR = 0.5;
export function placeIn(shows: Reach | null, width = FRAME_W, height = FRAME_H, played?: Reach | null): Placement {
  if (!shows) return { zoom: 1, x: 0, y: 0, bleed: true };
  const w = shows.right - shows.left, h = shows.bottom - shows.top;
  if (w >= width * .95 && h >= height * .95) return { zoom: 1, x: 0, y: 0, bleed: true };
  const round = (n: number): number => Math.round(n * 1000) / 1000;
  // the middle of the model itself; its size still counts everything drawn around it
  const middle = shows.body ?? shows;
  const x = (middle.left + middle.right) / 2, y = (middle.top + middle.bottom) / 2;
  const own = Math.min(6, (width * FILL) / Math.max(w, 2 * Math.max(x - shows.left, shows.right - x)), (height * FILL) / Math.max(h, 2 * Math.max(y - shows.top, shows.bottom - y)));
  let zoom = own;
  if (played) {
    // around the same middle, so opening something does not shift the model that sits there
    const across = 2 * Math.max(x - played.left, played.right - x);
    const down = 2 * Math.max(y - played.top, played.bottom - y);
    zoom = Math.max(own * FLOOR, Math.min(own, (width * FILL) / across, (height * FILL) / down));
  }
  return { zoom: round(zoom), x: round(width / 2 - x), y: round(height / 2 - y) };
}

const previews = new WeakMap<HTMLIFrameElement, Preview>();

/**
 * One watcher for every preview on the page, instead of one each: a card grid can hold dozens,
 * and each own observer would walk the whole document on every attribute change.
 */
const live = new Set<Preview>();
let watching: MutationObserver | undefined;
function watch(preview: Preview): void {
  live.add(preview);
  watching ??= new MutationObserver(() => { for (const p of live) p.sync(); });
  // Controls can move with the stage into the maker. Observe their state, not model DOM.
  if (live.size === 1) watching.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class', 'data-theme', 'data-paused', 'data-dots', 'style', 'open'] });
}

/** A persistent document. Only HTML/JS changes rebuild it; CSS never remounts the model. */
export class Preview {
  readonly frame = document.createElement('iframe');
  private applied?: Code;
  private placement?: Placement;
  private ready = false;
  private theme: Theme;
  private code: Code;
  private resize?: ResizeObserver;

  constructor(private id: string, private title: string, private original: Code, code: Code, theme: Theme) {
    this.code = { ...code };
    this.theme = theme;
    this.frame.className = 'live-frame';
    this.frame.style.cssText = `width:${FRAME_W}px;height:${FRAME_H}px;inset:auto;left:50%;top:50%;transform-origin:center;transform:translate(-50%,-50%);`;
    this.frame.title = `${title} — live preview`;
    this.frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    previews.set(this.frame, this);
    this.frame.addEventListener('load', () => this.loaded());
    // Measure the unedited model, including when loading a saved edit. Edits never refit it.
    this.frame.srcdoc = standaloneDoc(title, { how: [], ...original }, theme);
  }

  update(code: Code, theme: Theme): void {
    this.code = { ...code };
    this.theme = theme;
    if (!this.ready) return;
    if (this.applied?.html !== code.html || this.applied?.js !== code.js) {
      this.ready = false;
      delete this.frame.dataset.ready;
      this.frame.srcdoc = standaloneDoc(this.title, { how: [], ...code }, theme);
      return;
    }
    const doc = this.frame.contentDocument!;
    if (this.applied.css !== code.css) {
      const times = doc.getAnimations().map(a => ({ a, time: a.currentTime, paused: a.playState === 'paused' }));
      doc.querySelector('#c3d-code')!.textContent = code.css;
      // Force style reconciliation, then restore clocks on retained CSS animations.
      doc.body.getBoundingClientRect();
      for (const { a, time, paused } of times) {
        if (a.playState === 'idle') continue;
        a.currentTime = time;
        if (paused) a.pause();
      }
      this.applied = { ...code };
    }
    this.sync();
  }

  private loaded(): void {
    const doc = this.frame.contentDocument;
    const scene = doc?.querySelector<HTMLElement>('#c3d-scene');
    if (!doc || !scene) return;
    // The model's place is measured once, from its unedited code, and kept in placements.json;
    // an unlisted model (or the measuring run itself) works it out here. Either way every surface
    // uses the same numbers, so nothing moves between a card, the viewer, a page or an edit.
    this.placement ??= (!remeasure() && placeFor(this.id)) || { ...this.measure(scene), ...OVERRIDE[this.id] };
    this.frame.dataset.placement = JSON.stringify(this.placement);
    this.applied = this.applied ? { ...this.code } : { ...this.original };
    this.ready = true;
    this.resize?.disconnect();
    watch(this);
    this.resize = new ResizeObserver(() => this.sync());
    if (this.frame.parentElement) this.resize.observe(this.frame.parentElement);
    this.update(this.code, this.theme);
    if (this.ready) this.frame.dataset.ready = 'true';
  }

  private measure(scene: HTMLElement): Placement {
    // Always measured in the reference frame, whatever stage this preview happens to sit on, so
    // the numbers mean the same thing on a card, in the viewer and in a measuring run.
    return placeIn(reachOf(scene, this.original.css), FRAME_W, FRAME_H);
  }

  sync(): void {
    if (!this.ready || !this.placement || !this.frame.isConnected) return;
    const doc = this.frame.contentDocument!;
    const stage = this.frame.closest<HTMLElement>('.stage');
    const wrap = stage?.closest('.stage-wrap');
    const p = this.placement;
    const width = stage?.clientWidth ?? FRAME_W, height = stage?.clientHeight ?? FRAME_H;
    const zoom = parseFloat(stage ? getComputedStyle(stage).getPropertyValue('--zoom') : '') || 1;
    // Every model is laid out in the same frame and that frame is scaled to the stage, so the
    // picture cannot change with the size of the stage — a model written in percentages would
    // otherwise come out bigger on a card than on a page. A model drawn to the edges of its frame
    // covers the stage instead of sitting inside it; the stage clips what hangs over.
    const scale = p.bleed ? Math.max(width / FRAME_W, height / FRAME_H) : Math.min(width / FRAME_W, height / FRAME_H);
    const transform = `translate(-50%,-50%) scale(${scale})`;
    if (this.frame.style.transform !== transform) this.frame.style.transform = transform;
    const scene = doc.querySelector<HTMLElement>('#c3d-scene')!;
    scene.style.zoom = String(p.zoom * zoom);
    scene.style.translate = `${p.x}px ${p.y}px`;
    const theme = stage?.closest<HTMLElement>('[data-theme]')?.dataset.theme ?? this.theme;
    doc.body.style.color = theme === 'light' ? '#14172b' : '#eceefb';
    const paused = document.documentElement.hasAttribute('data-paused') || Boolean(wrap?.classList.contains('is-frozen')) || Boolean(stage?.closest('.is-offscreen'));
    doc.documentElement.toggleAttribute('data-paused', paused);
    const held = Boolean(wrap?.classList.contains('is-held'));
    const holdStyle = doc.querySelector('#c3d-held')!;
    const css = held ? this.code.css.replace(/:hover/g, ':not(.c3d-never)') : '';
    if (holdStyle.textContent !== css) holdStyle.textContent = css;
  }

  close(): void {
    live.delete(this);
    this.resize?.disconnect();
    this.frame.remove();
  }

  fork(): Preview {
    const next = new Preview(this.id, this.title, this.code, this.code, this.theme);
    next.placement = this.placement;
    const source = this.frame.contentDocument;
    const nodes = source ? [...source.querySelectorAll('#c3d-scene, #c3d-scene *')] : [];
    const attributes = nodes.map(el => [...el.attributes].map(a => [a.name, a.value]));
    const times = source?.getAnimations().map(a => ({ time: a.currentTime, paused: a.playState === 'paused' })) ?? [];
    next.frame.addEventListener('load', () => {
      const doc = next.frame.contentDocument!;
      [...doc.querySelectorAll('#c3d-scene, #c3d-scene *')].forEach((el, i) => {
        for (const [name, value] of attributes[i] ?? []) el.setAttribute(name!, value!);
      });
      doc.getAnimations().forEach((a, i) => { if (times[i]) { a.currentTime = times[i].time; if (times[i].paused) a.pause(); } });
      next.sync();
    }, { once: true });
    return next;
  }
}

/**
 * Shows a model on a stage: a card, an embed, anywhere. It is the same document, the same frame
 * and the same measured place the viewer and the model's own page use, so a model looks the same
 * on the gallery as it does anywhere else.
 */
export function mountModel(stage: HTMLElement, id: string, title: string): () => void {
  const snip = snippets[id];
  if (!snip) return () => {};
  const code: Code = { html: snip.html, css: snip.css, ...(snip.js ? { js: snip.js } : {}) };
  const theme: Theme = stage.closest<HTMLElement>('[data-theme]')?.dataset.theme === 'light' ? 'light' : 'dark';
  const preview = new Preview(id, title, code, code, theme);
  stage.replaceChildren(preview.frame);
  return () => preview.close();
}

export function syncPreview(stage: HTMLElement): void {
  const frame = stage.querySelector('iframe');
  if (frame) previews.get(frame)?.sync();
}

export function forkPreview(frame: HTMLIFrameElement): Preview | undefined {
  return previews.get(frame)?.fork();
}
