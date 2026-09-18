/**
 * The filter bar sticks to the top of the screen on every screen size (CSS). On phones it also
 * tucks away while you scroll down the demos and comes back as soon as you scroll up (like most
 * apps), but never while you are typing in it or the tags panel is open. The top bar is not
 * sticky: it scrolls away with the hero.
 */
const PHONE = '(max-width: 860px)';
const TUCK_AFTER = 8; // px of scrolling in one direction before the filter bar hides or shows

export function initStickyBars(): void {
  const filters = document.querySelector<HTMLElement>('.filters');
  if (!filters) return;

  // where the filter bar would be if it were not sticky (it moves when stuck or tucked)
  const mark = document.createElement('div');
  mark.setAttribute('aria-hidden', 'true');
  filters.before(mark);

  const phone = matchMedia(PHONE);
  let lastY = window.scrollY;
  let tucked = false;
  let queued = false;

  function update(): void {
    queued = false;
    const y = window.scrollY;
    const stuck = mark.getBoundingClientRect().top <= 0;
    const busy = filters!.contains(document.activeElement) || !!filters!.querySelector('[aria-expanded="true"]');
    const dy = y - lastY;
    if (!phone.matches || !stuck || busy) {
      tucked = false;
      lastY = y;
    } else if (Math.abs(dy) >= TUCK_AFTER) {
      tucked = dy > 0;
      lastY = y;
    }
    filters!.classList.toggle('is-tucked', tucked);
  }

  const queue = (): void => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  filters.addEventListener('focusin', queue);
  filters.addEventListener('click', queue);
  update();
}
