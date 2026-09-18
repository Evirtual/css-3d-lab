import sizes from './sizes.json';

/**
 * Each demo's size and position, measured by scripts/measure-demos.mjs so that every demo's full
 * reach (its whole animation, and after it is played with) fits the same safe area of a stage,
 * with the middle of its resting picture in the middle of the stage. CSS multiplies the size into
 * the scene's zoom (`calc(var(--fit) * var(--size))`); the offset is in the scene's own pixels,
 * so it scales along. Demos not listed: size 1, no offset.
 */
type Place = { size: number; x?: number; y?: number };
const PLACES = sizes as Record<string, Place>;

export function sizeScene(scene: HTMLElement, id: string): void {
  const place = PLACES[id];
  if (!place) return;
  if (place.size !== 1) scene.style.setProperty('--size', String(place.size));
  if (place.x || place.y) scene.style.translate = `${place.x ?? 0}px ${place.y ?? 0}px`;
}
