import { icon } from './icons';

/**
 * The ⋯ button on each card expands in place into the same inline controls as the large stage:
 * that card's backdrop dots (Off / 1× / 2× / 3×) and its preview theme (light / dark), independent of every other card and of the site theme. Remembered per visitor.
 * Nothing is global: a card nobody touched always shows 2× dots and follows the site theme.
 *
 * Applied as `data-dots` on the card and `data-theme` on its `.stage` (CSS does the rest).
 */
type Theme = 'light' | 'dark';
type Look = { dots?: string; theme?: Theme };
const KEY = 'c3d-card-look';
const SIZES = ['0', '1', '2', '3'] as const;
const DEFAULT_DOTS = '2';

/** The button; put it right after the card's `.stage`. */
export const cardMenuHtml = (id: string): string =>
  `<button type="button" class="card__menu" data-card-menu="${id}" aria-label="Preview options" aria-expanded="false" title="Preview options">${icon('more')}</button>`;

function load(): Record<string, Look> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown;
    return v && typeof v === 'object' ? (v as Record<string, Look>) : {};
  } catch {
    return {};
  }
}

function save(all: Record<string, Look>): void {
  try {
    if (Object.keys(all).length) localStorage.setItem(KEY, JSON.stringify(all));
    else localStorage.removeItem(KEY);
  } catch {
    /* applies for this visit only */
  }
}

const siteTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

function applyTo(card: HTMLElement, look: Look | undefined): void {
  const dots = look?.dots && (SIZES as readonly string[]).includes(look.dots) ? look.dots : DEFAULT_DOTS;
  if (dots === DEFAULT_DOTS) delete card.dataset.dots;
  else card.dataset.dots = dots;
  const stage = card.querySelector<HTMLElement>('.stage');
  if (stage) {
    if (look?.theme) stage.dataset.theme = look.theme;
    else delete stage.dataset.theme;
  }
  card.toggleAttribute('data-customised', Boolean(look?.dots || look?.theme));
}

/** Applies the stored choices to every card on the page (call after cards are added). */
export function initCardLook(): void {
  const all = load();
  for (const btn of document.querySelectorAll<HTMLElement>('[data-card-menu]')) {
    const card = btn.closest<HTMLElement>('.card');
    if (card) applyTo(card, all[btn.dataset.cardMenu!]);
  }
}

/* ---------- the bar: ⋯ expands into the same inline controls as the large stage ---------- */
const bar = document.createElement('div');
bar.className = 'cardbar';
bar.setAttribute('role', 'group');
bar.setAttribute('aria-label', 'Preview options for this card');
let openFor: HTMLButtonElement | null = null;

function renderBar(id: string): void {
  const look = load()[id] ?? {};
  const dots = look.dots ?? DEFAULT_DOTS;
  const theme = look.theme ?? siteTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  bar.innerHTML =
    `<div class="cardbar__seg" role="group" aria-label="Background dots">${SIZES.map(
      (z) => `<button type="button" data-look-dots="${z}" aria-pressed="${dots === z}" title="${z === '0' ? 'No dots' : `Dots ${z}×`}">${z === '0' ? 'Off' : `${z}×`}</button>`,
    ).join('')}</div>` +
    `<button type="button" class="cardbar__mode" data-look-theme="${next}" aria-label="Switch this preview to ${next}" title="${next[0].toUpperCase()}${next.slice(1)} preview">${icon(theme === 'dark' ? 'sun' : 'moon')}</button>`;
}

function setButton(btn: HTMLButtonElement, expanded: boolean): void {
  btn.setAttribute('aria-expanded', String(expanded));
  btn.innerHTML = icon(expanded ? 'x' : 'more');
  btn.setAttribute('aria-label', expanded ? 'Close preview options' : 'Preview options');
  btn.title = expanded ? 'Close' : 'Preview options';
}

function close(): void {
  if (!openFor) return;
  setButton(openFor, false);
  openFor.closest('.card')?.classList.remove('has-bar');
  bar.remove();
  openFor = null;
}

function open(btn: HTMLButtonElement): void {
  close();
  const card = btn.closest<HTMLElement>('.card');
  if (!card) return;
  openFor = btn;
  renderBar(btn.dataset.cardMenu!);
  btn.before(bar);
  setButton(btn, true);
  card.classList.add('has-bar');
}

function change(update: (look: Look) => void): void {
  if (!openFor) return;
  const id = openFor.dataset.cardMenu!;
  const all = load();
  const look = { ...all[id] };
  update(look);
  if (look.dots === DEFAULT_DOTS) delete look.dots;
  if (look.theme === siteTheme()) delete look.theme; // same as the site: follow the site again
  if (look.dots || look.theme) all[id] = look;
  else delete all[id];
  save(all);
  applyTo(openFor.closest<HTMLElement>('.card')!, all[id]);
  renderBar(id);
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const btn = target.closest<HTMLButtonElement>('[data-card-menu]');
  if (btn) {
    e.preventDefault();
    return btn === openFor ? close() : open(btn);
  }
  if (!bar.contains(target)) return close();
  const dots = target.closest<HTMLElement>('[data-look-dots]');
  const theme = target.closest<HTMLElement>('[data-look-theme]');
  if (dots) change((l) => (l.dots = dots.dataset.lookDots));
  else if (theme) {
    change((l) => (l.theme = theme.dataset.lookTheme as Theme));
    bar.querySelector<HTMLElement>('[data-look-theme]')?.focus(); // the button was redrawn
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !openFor) return;
  const btn = openFor;
  close();
  btn.focus();
});

// cards that follow the site theme must keep following it (and an open menu must show it)
new MutationObserver(() => {
  initCardLook();
  if (openFor) renderBar(openFor.dataset.cardMenu!);
}).observe(document.documentElement, { attributeFilter: ['data-theme'] });

initCardLook();
