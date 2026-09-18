import { demos } from './demos';
import type { Demo } from './demos/types';

/**
 * Live previews for statically generated cards (`<article class="card" data-mount="<id>">`).
 * Same two-ring rule as the gallery: a demo is MOUNTED within 600px of the viewport, and only
 * RUNS while actually on screen (the rest sit paused via .is-offscreen).
 */
let uid = 0;

function mount(demo: Demo, stage: HTMLElement): () => void {
  const scene = document.createElement('div');
  scene.className = `scene${demo.fill ? ' scene--fill' : ''}`;
  scene.innerHTML = demo.html.replaceAll('{{uid}}', `m${++uid}`);
  stage.replaceChildren(scene);
  const cleanup = demo.init?.(scene, stage);
  return () => {
    cleanup?.();
    stage.replaceChildren();
  };
}

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
          if (demo && stage) mounted.set(card, mount(demo, stage));
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
