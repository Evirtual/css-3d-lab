import { icon } from './icons';

/**
 * "Glad it helped": the quiet coffee line under a model's tools. It stays hidden until the visitor
 * has actually taken something away — copied the code, downloaded the video, or opened the print
 * dialog — so it reads as a thank-you rather than an ask.
 *
 * Download and print are caught here for every page at once (the buttons carry data-download /
 * data-print / data-act="print"); copying is announced by its own handler, which knows whether the
 * clipboard really took the text.
 */
const KOFI = 'https://ko-fi.com/edgarasneverdauskas';

export const thanksHtml = (): string =>
  `<p class="code__thanks" hidden>Glad it helped. This site is free — if you like, <a href="${KOFI}" target="_blank" rel="noopener">buy me a coffee</a> ${icon('coffee')}</p>`;

/** Shows the line nearest the button that was used (a page has one; the dialog has its own). */
export function showThanks(from?: Element | null): void {
  const scope = from?.closest('.viewer__panel, .page-main, body') ?? document;
  scope.querySelector<HTMLElement>('.code__thanks')?.removeAttribute('hidden');
}

/** Call once per page: the build also loads this module, where there is no document yet. */
export function initThanks(): void {
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-download], [data-print], [data-act="print"]');
    if (btn) showThanks(btn);
  });
}
