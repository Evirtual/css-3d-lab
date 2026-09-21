import { demos } from './models';
import { mountModel } from './preview';

/**
 * Live previews for statically generated cards (`<article class="card" data-mount="<id>">`).
 * Same two-ring rule as the gallery: a demo is MOUNTED within 600px of the viewport, and only
 * RUNS while actually on screen (the rest sit paused via .is-offscreen).
 */
export function lazyMountCards(): void {
  const cards = [...document.querySelectorAll<HTMLElement>('.card[data-mount]')];
  if (!cards.length) return;

  const mounted = new Map<Element, () => void>();
  const nearby = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const card = e.target as HTMLElement;
        if (e.isIntersecting && !mounted.has(card)) {
          const demo = demos.find((d) => d.id === card.dataset.mount);
          const stage = card.querySelector<HTMLElement>('.stage');
          if (demo && stage) mounted.set(card, mountModel(stage, demo.id, demo.title));
        } else if (!e.isIntersecting) {
          mounted.get(card)?.();
          mounted.delete(card);
        }
      }
    },
    { rootMargin: '600px' },
  );
  const onScreen = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('is-offscreen', !e.isIntersecting);
  });

  for (const card of cards) {
    nearby.observe(card);
    onScreen.observe(card);
  }
}
