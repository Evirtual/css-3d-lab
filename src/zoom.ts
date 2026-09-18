import { icon } from './icons';

/**
 * The look of the stages, separate from the site theme and remembered per visitor.
 *
 * Backdrop dots — two independent settings, each Off / 1× fine / 2× (default) / 3× large:
 *   stage  the large stage of a single demo (demo page, dialog); buttons sit on that stage
 *   cards  the small stages of cards (gallery, group pages, "more in this group"); buttons sit in
 *          the gallery's filter bar
 * written to <html> as data-dotsize / data-carddots; CSS holds the actual sizes.
 *
 * Stage theme — the large stage can be switched to light or dark on its own, whatever the site
 * theme is. Written to every `.stage-wrap` as data-theme (absent = follow the site).
 *
 * The demo itself is never resized (full screen is for a closer look).
 */
type Scope = 'stage' | 'cards';
type Theme = 'dark' | 'light';
const SCOPES: Record<Scope, { key: string; attr: 'dotsize' | 'carddots' }> = {
  stage: { key: 'c3d-dots', attr: 'dotsize' },
  cards: { key: 'c3d-card-dots', attr: 'carddots' },
};
const THEME_KEY = 'c3d-stage-theme';
/** Fired on `document` when the large stage's effective theme changes. */
export const STAGE_THEME_EVENT = 'c3d:stage-theme';
export const DOT_SIZES = ['0', '1', '2', '3'] as const;

const label = (z: string): string => (z === '0' ? 'Off' : `${z}×`);
const tip = (z: string): string => (z === '0' ? 'No background dots' : `Background dots ${z}×`);

export const dotButtons = (scope: Scope): string =>
  DOT_SIZES.map((z) => `<button type="button" data-dots="${z}" data-dots-scope="${scope}" aria-pressed="false" title="${tip(z)}">${label(z)}</button>`).join('');

/** The controls shown on a large stage: its own light / dark switch and the dot size. */
export const zoomHtml = (): string =>
  `<button type="button" class="stage__mode" data-stage-theme aria-label="Switch this preview to light"></button>` +
  `<div class="stage__zoom" role="group" aria-label="Background dot size">${dotButtons('stage')}</div>`;

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
    /* applies for this visit only */
  }
};

/* ---------- dots ---------- */
function storedDots(scope: Scope): string {
  const v = read(SCOPES[scope].key);
  return (DOT_SIZES as readonly string[]).includes(v ?? '') ? v! : '2';
}

function applyDots(scope: Scope, size: string): void {
  document.documentElement.dataset[SCOPES[scope].attr] = size;
  for (const btn of document.querySelectorAll<HTMLElement>(`[data-dots][data-dots-scope="${scope}"]`)) {
    btn.setAttribute('aria-pressed', String(btn.dataset.dots === size));
  }
}

/* ---------- stage theme ---------- */
const siteTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
const override = (): Theme | null => {
  const v = read(THEME_KEY);
  return v === 'light' || v === 'dark' ? v : null;
};
/** What the large stage shows right now. */
export const stageTheme = (): Theme => override() ?? siteTheme();

let lastTheme: Theme | undefined;
function applyTheme(): void {
  const own = override();
  const now = own ?? siteTheme();
  for (const wrap of document.querySelectorAll<HTMLElement>('.stage-wrap')) {
    if (own) wrap.dataset.theme = own;
    else delete wrap.dataset.theme;
    const btn = wrap.querySelector<HTMLElement>('[data-stage-theme]');
    if (!btn) continue;
    const next = now === 'dark' ? 'light' : 'dark';
    btn.innerHTML = icon(now === 'dark' ? 'sun' : 'moon');
    btn.setAttribute('aria-label', `Switch this preview to ${next}`);
    btn.title = `${next[0].toUpperCase()}${next.slice(1)} preview`;
  }
  if (lastTheme && lastTheme !== now) document.dispatchEvent(new Event(STAGE_THEME_EVENT));
  lastTheme = now;
}

/** Call after a stage or buttons are added to the page, so they show the current choices. */
export function initZoom(): void {
  applyDots('stage', storedDots('stage'));
  applyDots('cards', storedDots('cards'));
  applyTheme();
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('[data-stage-theme]')) {
    const next: Theme = stageTheme() === 'dark' ? 'light' : 'dark';
    write(THEME_KEY, next === siteTheme() ? null : next); // same as the site: back to following it
    return applyTheme();
  }
  const btn = target.closest<HTMLElement>('[data-dots]');
  if (!btn) return;
  const scope: Scope = btn.dataset.dotsScope === 'cards' ? 'cards' : 'stage';
  const size = btn.dataset.dots!;
  write(SCOPES[scope].key, size === '2' ? null : size);
  applyDots(scope, size);
});

// a stage that follows the site must follow it when the site theme is switched, too
new MutationObserver(applyTheme).observe(document.documentElement, { attributeFilter: ['data-theme'] });

// Applies on every page that loads this module, including ones without buttons.
initZoom();
