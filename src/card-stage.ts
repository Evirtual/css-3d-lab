/**
 * A card's stage is `inert`: the model running in it is a preview, and the card's link goes to
 * the model's page, where its controls work for everyone. So Tab goes from card link to card link
 * without entering the frames, and a screen reader never meets controls it cannot name.
 *
 * Inert also stops the pointer, and a card's preview is played with (its corner badge says Hover,
 * Drag, Click…). So while a mouse or pen is over a card its stage is let go: not inert, but
 * aria-hidden, so it stays out of the accessibility tree. It is held again (inert) when the
 * pointer is over anything else on the page, and whenever Tab is pressed on the page, so a
 * keyboard user whose mouse happens to rest on a card still goes past it.
 *
 * Where the main pointer cannot hover (a phone), there is no "over" before a tap, and the first
 * tap would only let the stage go; there the stages start let go, and a Tab press holds them
 * again (a keyboard is attached). The markup always starts inert: with no script, nothing in a
 * stage can be reached anyway.
 */

const held = (stage: HTMLElement): void => {
  stage.inert = true;
  stage.removeAttribute('aria-hidden');
};

const letGo = (stage: HTMLElement): void => {
  stage.inert = false;
  stage.setAttribute('aria-hidden', 'true');
};

const stageOf = (el: EventTarget | null): HTMLElement | null =>
  el instanceof Element ? (el.closest('.card')?.querySelector<HTMLElement>(':scope > .stage') ?? null) : null;

/** Stages let go now. Holding one whose frame has focus would throw the focus out: those wait. */
function holdAll(): void {
  for (const stage of document.querySelectorAll<HTMLElement>('.card > .stage:not([inert])')) {
    if (!stage.contains(document.activeElement)) held(stage);
  }
}

let started = false;

/** Marks every card stage on the page inert (call after cards are added) and starts the hand-off. */
export function initCardStages(): void {
  const hovers = matchMedia('(hover: hover)').matches;
  for (const stage of document.querySelectorAll<HTMLElement>('.card > .stage')) {
    if (hovers) held(stage);
    else letGo(stage);
  }
  if (started) return;
  started = true;

  // A mouse or pen over a card lets its stage go, and every other stage is held again (the page
  // only hears the pointer outside the frames, so "over something else" is the sure sign it left).
  // pointermove lets it go again after a Tab press held it while the pointer stayed put.
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const stage = stageOf(e.target);
    for (const other of document.querySelectorAll<HTMLElement>('.card > .stage:not([inert])')) {
      if (other !== stage && !other.contains(document.activeElement)) held(other);
    }
    if (stage?.inert) letGo(stage);
  });
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const stage = stageOf(e.target);
    if (stage?.inert) letGo(stage);
  }, { passive: true });
  // A press that lands on the card itself, over its held stage (a Tab press held it and the
  // pointer has not moved since), reaches the card, not the model: it lets the stage go for the
  // next press, and does not start a text selection across the card.
  document.addEventListener('mousedown', (e) => {
    const card = e.target instanceof Element && e.target.matches('.card') ? e.target : null;
    const stage = stageOf(card);
    if (!card || !stage) return;
    const r = stage.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    e.preventDefault();
    letGo(stage);
  });

  // Keys pressed on the page, not in a frame: a keyboard is in use, so every stage is held
  // before the focus moves. Focus coming back to the page from a frame holds that one too.
  document.addEventListener('keydown', (e) => { if (e.key === 'Tab') holdAll(); }, true);
  document.addEventListener('focusin', () => { if (matchMedia('(hover: hover)').matches) holdAll(); });
}
