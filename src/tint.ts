/**
 * The three window dots are real controls: each switches the code window to a tinted background
 * (rose, amber, green). Clicking the active one returns to the default. The choice is a
 * per-visitor convenience, so it lives in localStorage and applies to every code window.
 */
const KEY = 'c3d-editor-tint';
export const TINTS = ['rose', 'amber', 'green'] as const;
type Tint = (typeof TINTS)[number];

/** Markup for the dots; put it first inside `.codebox__bar`. */
export const dotsHtml = (): string =>
  `<div class="codebox__dots" role="group" aria-label="Editor background">${TINTS.map(
    (t) => `<button type="button" data-tint-set="${t}" aria-pressed="false" aria-label="${t} background" title="${t[0].toUpperCase()}${t.slice(1)} background"></button>`,
  ).join('')}</div>`;

function stored(): Tint | null {
  try {
    const v = localStorage.getItem(KEY);
    return (TINTS as readonly string[]).includes(v ?? '') ? (v as Tint) : null;
  } catch {
    return null;
  }
}

function apply(tint: Tint | null): void {
  for (const box of document.querySelectorAll<HTMLElement>('.codebox')) {
    if (tint) box.dataset.tint = tint;
    else delete box.dataset.tint;
    for (const dot of box.querySelectorAll<HTMLElement>('[data-tint-set]')) dot.setAttribute('aria-pressed', String(dot.dataset.tintSet === tint));
  }
}

/** Call after a code window is added to the page (it picks up the stored choice). */
export function initTint(): void {
  apply(stored());
}

document.addEventListener('click', (e) => {
  const dot = (e.target as HTMLElement).closest<HTMLElement>('[data-tint-set]');
  if (!dot) return;
  const next = stored() === dot.dataset.tintSet ? null : (dot.dataset.tintSet as Tint);
  try {
    if (next) localStorage.setItem(KEY, next);
    else localStorage.removeItem(KEY);
  } catch {
    /* it still applies for this visit; it just will not be remembered */
  }
  apply(next);
});
