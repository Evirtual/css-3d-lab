import { demos } from './models';
import { mountModel } from './preview';

/**
 * Live previews for cards, on the home gallery (src/main.ts builds its cards) and on the
 * statically generated pages (`<article class="card" data-mount="<id>">`).
 *
 * THREE RINGS, NOT TWO. A model
 *  - is MOUNTED once the card comes within NEAR of the viewport, so it is already there when it
 *    scrolls in;
 *  - RUNS only while the card is actually on screen (the rest sit paused via .is-offscreen);
 *  - is UNMOUNTED once the card is further than FAR — about two screens — from the viewport, and
 *    its stage keeps a placeholder in the frame's place.
 *
 * NEAR and FAR are two different boundaries on purpose. With one boundary for both (600px, as
 * this file and main.ts had it) a card resting on it is mounted and unmounted again on every
 * small scroll: wobbling 300px thirty times over the home gallery built 111 iframes, each one a
 * whole document parsed, laid out and painted. Between the two rings nothing happens, so the same
 * wobble now builds none.
 *
 * FAR is two screens because that is the distance the reveal-a-page-at-a-time grid can cover in
 * one flick without the model ever being seen: nearer and a fast scroll unmounts what it is about
 * to show again, further and the far end of a long gallery keeps documents nobody can see.
 *
 * THE PLACEHOLDER keeps the card exactly the size it was. `.stage` is a fixed 280px tall, so an
 * empty stage is already the right height; the placeholder fills it (inset: 0), so nothing inside
 * the card can reflow when the frame goes, and it gives the unmounted state something to see and
 * something for a check to count (`.stage__placeholder`).
 *
 * WHAT IS NEVER UNMOUNTED, however far away it scrolls (see `held`):
 *  - a model being played with: its stage has been let go for the pointer (src/card-stage.ts), it
 *    holds the focus, or a pointer is down on the card;
 *  - one in full screen;
 *  - one whose editor has edits that are not in its saved code (`[data-edited]` shown, or
 *    `data-unsaved` on the stage);
 *  - one the export dialog has borrowed: it moves the whole stage node into itself and marks it
 *    `data-in-maker` (src/video.ts), leaving a holder behind in the card.
 * A card the far ring asked to unmount while it was held is remembered and unmounted as soon as
 * the hold ends (a pointer lifted, full screen left, the dialog closed, the focus moved on).
 */

const NEAR = 600; // px beyond the viewport: inside this a model is mounted
const MIN_FAR = 1200; // px: the smallest far ring, so a short window still gets hysteresis
/** About two screens beyond the viewport: outside this a model is unmounted. */
const far = (): number => Math.max(MIN_FAR, Math.round(window.innerHeight * 2));

/** Whether this card must keep its model whatever the rings say. */
function held(card: HTMLElement): boolean {
  const stage = card.querySelector<HTMLElement>(':scope > .stage');
  // the export dialog moves the whole stage node into itself and leaves a holder behind: the
  // card has no stage of its own for as long as the dialog is using the model
  if (!stage) return true;
  if (stage.dataset.inMaker !== undefined) return true;
  if (!stage.isConnected) return true;
  if (document.fullscreenElement && (document.fullscreenElement === card || card.contains(document.fullscreenElement) || document.fullscreenElement.contains(stage))) return true;
  // someone is using it: the pointer is over the card (card-stage.ts hands the stage to it), a
  // pointer is pressed inside it, or the focus is in the frame. (Not `stage.inert`: where the
  // main pointer cannot hover, every card stage starts let go, which would hold the whole page.)
  if (card.matches(':hover')) return true;
  if (pointerOn && card.contains(pointerOn)) return true;
  if (stage.contains(document.activeElement)) return true;
  // an editor with edits that are not in the saved code
  if (stage.dataset.unsaved !== undefined) return true;
  if (card.querySelector('[data-edited]:not([hidden])')) return true;
  return false;
}

/** The element a pointer is currently pressed on, so a drag is never cut short. */
let pointerOn: Element | null = null;
let listening = false;
const mounters = new Set<LazyMounter>();
/** Every mounter looks again at what it could not unmount: a hold may just have ended. */
const releaseAll = (): void => {
  for (const m of mounters) m.release();
};
function listen(): void {
  if (listening) return;
  listening = true;
  document.addEventListener('pointerdown', (e) => { pointerOn = e.target instanceof Element ? e.target : null; }, true);
  for (const type of ['pointerup', 'pointercancel']) {
    document.addEventListener(type, () => { pointerOn = null; releaseAll(); }, true);
  }
  document.addEventListener('fullscreenchange', releaseAll);
  document.addEventListener('focusin', releaseAll);
  document.addEventListener('close', releaseAll, true); // the export dialog handing a stage back
  // the far ring is measured in screens, so it is built again when the window changes size
  let resizing = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizing);
    resizing = window.setTimeout(() => { for (const m of mounters) m.remeasure(); }, 250);
  });
}

/** What a card shows while its model is not mounted: the stage's own size, nothing in it. */
function placeholder(stage: HTMLElement): void {
  const el = document.createElement('div');
  el.className = 'stage__placeholder';
  el.setAttribute('aria-hidden', 'true');
  stage.replaceChildren(el);
}

interface Entry {
  id: string;
  title: string;
  close?: () => void;
}

/**
 * Mounts and unmounts the models of a set of cards as they come and go. One instance per list of
 * cards; `add` may be called as cards are built.
 */
export class LazyMounter {
  private cards = new Map<HTMLElement, Entry>();
  private pending = new Set<HTMLElement>(); // asked to unmount while held
  private near: IntersectionObserver;
  private far!: IntersectionObserver;
  private onScreen: IntersectionObserver;

  constructor() {
    this.near = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) this.mount(e.target as HTMLElement);
    }, { rootMargin: `${NEAR}px` });
    this.onScreen = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle('is-offscreen', !e.isIntersecting);
    });
    this.buildFar();
    mounters.add(this);
    listen();
  }

  private buildFar(): void {
    this.far?.disconnect();
    this.far = new IntersectionObserver((entries) => {
      for (const e of entries) if (!e.isIntersecting) this.unmount(e.target as HTMLElement);
    }, { rootMargin: `${far()}px` });
    for (const card of this.cards.keys()) this.far.observe(card);
  }

  /** The window changed size, so the far ring — two screens — is a different number of pixels. */
  remeasure(): void {
    this.buildFar();
  }

  add(card: HTMLElement, id: string, title: string): void {
    if (this.cards.has(card)) return;
    this.cards.set(card, { id, title });
    const stage = card.querySelector<HTMLElement>(':scope > .stage');
    if (stage && !stage.firstElementChild) placeholder(stage);
    this.near.observe(card);
    this.far.observe(card);
    this.onScreen.observe(card);
  }

  private mount(card: HTMLElement): void {
    this.pending.delete(card);
    const entry = this.cards.get(card);
    if (!entry || entry.close) return;
    const stage = card.querySelector<HTMLElement>(':scope > .stage');
    if (!stage) return;
    entry.close = mountModel(stage, entry.id, entry.title);
  }

  private unmount(card: HTMLElement): void {
    const entry = this.cards.get(card);
    if (!entry?.close) return;
    if (held(card)) { this.pending.add(card); return; }
    this.pending.delete(card);
    entry.close();
    entry.close = undefined;
    const stage = card.querySelector<HTMLElement>(':scope > .stage');
    if (stage) placeholder(stage);
  }

  /** A hold may have ended: unmount what the far ring asked for and could not have. */
  release(): void {
    if (!this.pending.size) return;
    for (const card of [...this.pending]) {
      this.pending.delete(card);
      this.unmount(card);
    }
  }

  /** How many of these cards have their model mounted right now (for checks and for tests). */
  get mountedCount(): number {
    let n = 0;
    for (const e of this.cards.values()) if (e.close) n++;
    return n;
  }
}

/**
 * Mounts the models of every statically generated card on the page
 * (`<article class="card" data-mount="<id>">`), and keeps them mounted only while they are near.
 */
export function lazyMountCards(): LazyMounter | undefined {
  const cards = [...document.querySelectorAll<HTMLElement>('.card[data-mount]')];
  if (!cards.length) return undefined;
  const mounter = new LazyMounter();
  for (const card of cards) {
    const demo = demos.find((d) => d.id === card.dataset.mount);
    if (demo) mounter.add(card, demo.id, demo.title);
  }
  return mounter;
}
