/**
 * Zoom control on a stage: 1× / 1.5× / 2×. It only sets `--zoom` on the `.stage-wrap`; CSS
 * multiplies the scene's scale by it (and resizes an edited preview frame to match). The labels
 * are the real factors. Remembered per visitor.
 */
const KEY = 'c3d-zoom';
export const ZOOMS = ['1', '1.5', '2'] as const;

export const zoomHtml = (): string =>
  `<div class="stage__zoom" role="group" aria-label="Zoom">${ZOOMS.map((z) => `<button type="button" data-zoom="${z}" aria-pressed="false">${z}×</button>`).join('')}</div>`;

function stored(): string {
  try {
    const v = localStorage.getItem(KEY);
    return (ZOOMS as readonly string[]).includes(v ?? '') ? v! : '1';
  } catch {
    return '1';
  }
}

function apply(zoom: string): void {
  for (const wrap of document.querySelectorAll<HTMLElement>('.stage-wrap')) {
    wrap.style.setProperty('--zoom', zoom);
    for (const btn of wrap.querySelectorAll<HTMLElement>('[data-zoom]')) btn.setAttribute('aria-pressed', String(btn.dataset.zoom === zoom));
  }
}

/** Call after a stage with zoom buttons is added to the page. */
export function initZoom(): void {
  apply(stored());
}

document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-zoom]');
  if (!btn) return;
  const zoom = btn.dataset.zoom!;
  try {
    if (zoom === '1') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, zoom);
  } catch {
    /* applies for this visit only */
  }
  apply(zoom);
});
