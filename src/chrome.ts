import { icon } from './icons';

/** Top-bar controls shared by the gallery and the static demo pages: pause-all and theme. */

const store = {
  get: (k: string): string | null => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string): void => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode: the choice just won't persist */
    }
  },
};

/** The brand link always points at the site root, whatever the page depth: that is the SW scope. */
function registerServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  const root = document.querySelector<HTMLAnchorElement>('.topbar__brand')?.href;
  if (!root) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', root), { scope: new URL('./', root).pathname }).catch(() => {
      /* no offline support then; the site itself is unaffected */
    });
  });
}

export function initChrome(): void {
  registerServiceWorker();
  const root = document.documentElement;
  const pauseBtn = document.querySelector<HTMLButtonElement>('#pause');
  const themeBtn = document.querySelector<HTMLButtonElement>('#theme');

  const setPaused = (paused: boolean) => {
    root.toggleAttribute('data-paused', paused);
    if (!pauseBtn) return;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    const label = paused ? 'Play animations' : 'Pause animations';
    pauseBtn.innerHTML = `${icon(paused ? 'play' : 'pause')} <span class="btn__label">${label}</span>`;
    pauseBtn.setAttribute('aria-label', label);
  };
  const setTheme = (theme: string) => {
    root.dataset.theme = theme;
    // the phone's status bar / the installed app's title bar follow the chosen theme (the page's --bg)
    const bar = theme === 'dark' ? '#07080f' : '#f3f4fc';
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = bar));
    if (!themeBtn) return;
    const label = theme === 'dark' ? 'Light' : 'Dark';
    themeBtn.innerHTML = `${icon(theme === 'dark' ? 'sun' : 'moon')} <span class="btn__label">${label}</span>`;
    themeBtn.setAttribute('aria-label', `${label} theme`);
  };

  // Respect the OS "reduce motion" setting: start paused, but leave the choice to the visitor.
  setPaused(matchMedia('(prefers-reduced-motion: reduce)').matches);
  setTheme(store.get('theme') ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

  pauseBtn?.addEventListener('click', () => setPaused(!root.hasAttribute('data-paused')));
  themeBtn?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    store.set('theme', next);
  });
}
