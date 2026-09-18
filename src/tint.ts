import { icon } from './icons';

/**
 * Editor appearance, independent of the site theme:
 *  - mode: dark (default) or light, toggled by the sun / moon button in the window bar;
 *  - tint: the window dots — default, rose, amber, green — each with a dark and a light version.
 * Per-visitor conveniences, so they live in localStorage and apply to every code window.
 */
const MODE_KEY = 'c3d-editor-mode';
const TINT_KEY = 'c3d-editor-tint';
export const TINTS = ['default', 'rose', 'amber', 'green'] as const;
type Tint = (typeof TINTS)[number];
type Mode = 'dark' | 'light';

/** Markup for the dots; put it first inside `.codebox__bar`. */
export const dotsHtml = (): string =>
  `<div class="codebox__dots" role="group" aria-label="Editor background">${TINTS.map(
    (t) => `<button type="button" data-tint-set="${t}" aria-pressed="false" aria-label="${t} background" title="${t[0].toUpperCase()}${t.slice(1)} background"></button>`,
  ).join('')}</div>`;

/** Markup for the light / dark toggle; put it just before the Copy button. */
export const modeHtml = (): string => `<button type="button" class="codebox__mode" data-editor-mode aria-label="Switch editor to light mode"></button>`;

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null): void => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* it still applies for this visit; it just will not be remembered */
  }
};

const mode = (): Mode => (read(MODE_KEY) === 'light' ? 'light' : 'dark');
const tint = (): Tint => {
  const v = read(TINT_KEY);
  return (TINTS as readonly string[]).includes(v ?? '') ? (v as Tint) : 'default';
};

function apply(): void {
  const m = mode();
  const t = tint();
  for (const box of document.querySelectorAll<HTMLElement>('.codebox')) {
    box.dataset.mode = m;
    if (t === 'default') delete box.dataset.tint;
    else box.dataset.tint = t;
    for (const dot of box.querySelectorAll<HTMLElement>('[data-tint-set]')) dot.setAttribute('aria-pressed', String(dot.dataset.tintSet === t));
    const btn = box.querySelector<HTMLElement>('[data-editor-mode]');
    if (btn) {
      btn.innerHTML = icon(m === 'dark' ? 'sun' : 'moon');
      btn.setAttribute('aria-label', `Switch editor to ${m === 'dark' ? 'light' : 'dark'} mode`);
      btn.title = m === 'dark' ? 'Light editor' : 'Dark editor';
    }
  }
}

/** Call after a code window is added to the page (it picks up the stored choices). */
export function initTint(): void {
  apply();
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const dot = target.closest<HTMLElement>('[data-tint-set]');
  if (dot) {
    write(TINT_KEY, dot.dataset.tintSet === 'default' ? null : dot.dataset.tintSet!);
    return apply();
  }
  if (target.closest('[data-editor-mode]')) {
    write(MODE_KEY, mode() === 'dark' ? 'light' : null);
    apply();
  }
});
