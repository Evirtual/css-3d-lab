/**
 * Every demo scales with its stage. Each `.stage` gets `--fit`: how much bigger it is than a
 * card's stage (340 × 280; the models are drawn for 340 × 260, and the extra 20px is room for a
 * control dock and air around the model), and CSS zooms the scene by it.
 * So a demo fills a phone card, the dialog, the demo page and a 4K full screen in the same
 * proportion.
 *
 * `zoom`, not `scale`: a zoomed scene is laid out and drawn at its new size, so it stays sharp; a
 * scaled one is its small bitmap stretched, and 3D layers go soft (worst at full screen).
 */
const BASE_W = 340;
const BASE_H = 280;

const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    if (!width || !height) continue;
    const fit = Math.min(6, Math.max(0.85, Math.min(width / BASE_W, height / BASE_H)));
    (entry.target as HTMLElement).style.setProperty('--fit', fit.toFixed(3));
  }
});

/** Starts fitting every stage in `root` (observing the same stage twice is harmless). */
export function fitStages(root: ParentNode = document): void {
  for (const stage of root.querySelectorAll<HTMLElement>('.stage')) observer.observe(stage);
}
