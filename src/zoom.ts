/**
 * Backdrop control on a stage: how big the dot grid is. Three steps — 1× fine, 2× (default),
 * 3× large — set as `data-dotsize` on the `.stage-wrap`; CSS holds the actual sizes. The demo itself
 * is not resized (full screen is for a closer look). Remembered per visitor.
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
  for (const wrap of document.querySelectorAll<HTMLElement>('.stage-wrap')) {
    wrap.dataset.dotsize = size; // not data-dots: that attribute marks the buttons
    for (const btn of wrap.querySelectorAll<HTMLElement>('[data-dots]')) btn.setAttribute('aria-pressed', String(btn.dataset.dots === size));
  }
}

/** Call after a stage with the control is added to the page. */
export function initZoom(): void {
  apply(stored());
}

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
