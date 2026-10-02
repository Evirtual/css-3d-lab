/**
 * The filter bar sticks to the top of the screen on every screen size (CSS). On phones it also
 * tucks away while you scroll down the demos and comes back as soon as you scroll up (like most
 * apps), but never while you are typing in the search or the tags panel is open. The top bar is
 * not sticky: it scrolls away with the hero.
 *
 * On phones, once it is pinned, it also folds: only the search and a chevron, and under them one
 * line saying what is on (only when something is: main.ts writes it). The whole bar took about a
 * quarter of a phone's screen while you scrolled the models. The chevron or that line opens it;
 * scrolling down folds it again as it tucks away. At the top of the page, where it is not pinned,
 * it is always whole.
 *
 * Folding never moves the page: the bar's place in the page keeps its whole height (the part it
 * no longer shows becomes margin under it), so the models below do not jump when it folds or opens.
 */
const PHONE = '(max-width: 860px)';
const TUCK_AFTER = 8; // px of scrolling in one direction before the filter bar hides or shows

export function initStickyBars(): void {
  const filters = document.querySelector<HTMLElement>('.filters');
  if (!filters) return;
  const toggle = filters.querySelector<HTMLButtonElement>('#filters-toggle');
  const summary = filters.querySelector<HTMLButtonElement>('#filters-summary');
  const search = filters.querySelector<HTMLInputElement>('#search');

  // where the filter bar would be if it were not sticky (it moves when stuck or tucked)
  const mark = document.createElement('div');
  mark.setAttribute('aria-hidden', 'true');
  filters.before(mark);

  const phone = matchMedia(PHONE);
  let lastY = window.scrollY;
  let tucked = false;
  let queued = false;
  /** Opened with the chevron while pinned. Folded again as it tucks away, or back at the top. */
  let open = false;
  /** The bar's whole height, measured whenever it is whole. */
  let whole = 0;

  function update(): void {
    queued = false;
    const y = window.scrollY;
    const stuck = mark.getBoundingClientRect().top <= 0;
    const tagsOpen = !!filters!.querySelector('#tags-toggle[aria-expanded="true"]');
    // typing, not just a tapped button: a tapped button keeps the focus on a phone, and would
    // keep the bar out for good
    const busy = document.activeElement === search || tagsOpen;
    const dy = y - lastY;
    if (!phone.matches || !stuck || busy) {
      tucked = false;
      lastY = y;
    } else if (Math.abs(dy) >= TUCK_AFTER) {
      tucked = dy > 0;
      lastY = y;
    }
    if (tucked || !stuck) open = false;
    filters!.classList.toggle('is-tucked', tucked);

    const pinned = phone.matches && stuck;
    const fold = pinned && !open && !tagsOpen;
    if (!filters!.classList.contains('is-folded')) whole = filters!.offsetHeight;
    filters!.classList.toggle('is-pinned', pinned);
    filters!.classList.toggle('is-folded', fold);
    filters!.style.marginBottom = fold ? `${Math.max(0, whole - filters!.offsetHeight)}px` : '';
    toggle?.setAttribute('aria-expanded', String(!fold));
    toggle?.setAttribute('aria-label', fold ? 'Show all the filters' : 'Hide the filters');
  }

  const queue = (): void => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  const flip = (to: boolean): void => {
    open = to;
    update();
  };
  toggle?.addEventListener('click', () => flip(filters.classList.contains('is-folded')));
  summary?.addEventListener('click', () => flip(true));
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  filters.addEventListener('focusin', queue);
  filters.addEventListener('focusout', queue);
  filters.addEventListener('click', queue);
  filters.addEventListener('input', queue);
  update();
}
