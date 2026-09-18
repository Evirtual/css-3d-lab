/**
 * Backdrop dot size: ONE site-wide setting. Three steps — 1× fine, 2× (default), 3× large — set
 * as `data-dotsize` on <html>; CSS holds the actual sizes and every stage reads them (gallery
 * cards, group pages, demo pages, the dialog). The buttons live on the large stages. The demo
 * itself is not resized (full screen is for a closer look). Remembered per visitor.
 */
const KEY = 'c3d-dots';
export const DOT_SIZES = ['1', '2', '3'] as const;

export const zoomHtml = (): string =>
  `<div class="stage__zoom" role="group" aria-label="Background dot size">${DOT_SIZES.map(
    (z) => `<button type="button" data-dots="${z}" aria-pressed="false" title="Background dots ${z}×">${z}×</button>`,
  ).join('')}</div>`;

function stored(): string {
  try {
    const v = localStorage.getItem(KEY);
    return (DOT_SIZES as readonly string[]).includes(v ?? '') ? v! : '2';
  } catch {
    return '2';
  }
}

function apply(size: string): void {
  document.documentElement.dataset.dotsize = size;
  for (const btn of document.querySelectorAll<HTMLElement>('[data-dots]')) btn.setAttribute('aria-pressed', String(btn.dataset.dots === size));
}

/** Call after a stage with the buttons is added to the page, so they show the current choice. */
export function initZoom(): void {
  apply(stored());
}

// Applies on every page that loads this module, including ones without buttons (the gallery).
apply(stored());

document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-dots]');
  if (!btn) return;
  const size = btn.dataset.dots!;
  try {
    if (size === '2') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, size);
  } catch {
    /* applies for this visit only */
  }
  apply(size);
});
