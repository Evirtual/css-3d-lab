/**
 * The app's one icon set: 24×24 outline icons, 2px round stroke, coloured by `currentColor`.
 * Size comes from CSS (`.icon`), so every icon in the app is the same size by construction.
 *
 * Why SVG instead of text glyphs (‹ › ✕ ▶ ☀): a glyph sits on the font's baseline and every font
 * draws it at a different height and weight, so it never centres reliably in a button, and some
 * systems swap it for a colour emoji. An SVG is a box: centring it is exact.
 *
 * Path data follows the Lucide icon set (ISC licence, https://lucide.dev).
 */
const PATHS = {
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** Inline SVG markup. Decorative by default: the control it sits in carries the label. */
export function icon(name: IconName): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}

/** Fills static markup: `data-icon="x"` puts the icon first, `data-icon-end="x"` puts it last. */
export function hydrateIcons(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-icon]')) {
    el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon as IconName));
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-icon-end]')) {
    el.insertAdjacentHTML('beforeend', icon(el.dataset.iconEnd as IconName));
  }
}
