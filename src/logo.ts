/**
 * The brand mark: a single glass cube (teal top, violet and pink sides). The faces are tinted,
 * not solid, so its inner faces show through the front ones and the depth reads by itself. In
 * the header and footer it spins slowly; the still versions (favicon, app icons, share images)
 * are drawn by scripts/generate-icons.mjs in the same colours.
 */
export function logoHtml(): string {
  return `<span class="logo-cube" aria-hidden="true">${'<i></i>'.repeat(6)}</span>`;
}
