import site from '../site.config.json';

/**
 * Privacy-friendly analytics via GoatCounter: no cookies, no personal data, no consent banner.
 * Completely off until `analytics.goatcounterCode` is filled in site.config.json — with an empty
 * code no script is loaded and nothing is sent anywhere.
 *
 * Page views are counted automatically (every demo has its own page, so that is per-demo
 * popularity for free). `track()` adds the engagement events a page view cannot show:
 * which snippets people actually copy, which demos they open, and Ko-fi clicks.
 */
const code: string = site.analytics.goatcounterCode.trim();

declare global {
  interface Window {
    goatcounter?: { count?: (vars: { path: string; title?: string; event?: boolean }) => void };
  }
}

export function initAnalytics(): void {
  if (!code) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  document.head.append(script);

  // Say so, where people can see it. Only shown when counting is really on.
  const note = document.createElement('span');
  note.innerHTML = 'Visits counted with <a href="https://www.goatcounter.com" target="_blank" rel="noopener">GoatCounter</a>: no cookies, no personal data';
  document.querySelector('.site-footer__legal')?.append(note);

  document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a[href*="ko-fi.com"]')) track('kofi-click');
  });
}

/** Records a named event, e.g. `copy/pyramid/css`. A no-op while analytics is off or still loading. */
export function track(event: string): void {
  if (!code) return;
  window.goatcounter?.count?.({ path: event, title: event, event: true });
}
