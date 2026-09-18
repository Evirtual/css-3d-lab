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

export function initChrome(): void {
  const root = document.documentElement;
  const pauseBtn = document.querySelector<HTMLButtonElement>('#pause');
  const themeBtn = document.querySelector<HTMLButtonElement>('#theme');

  const setPaused = (paused: boolean) => {
    root.toggleAttribute('data-paused', paused);
    if (!pauseBtn) return;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.innerHTML = paused ? `${icon('play')} Play animations` : `${icon('pause')} Pause animations`;
  };
  const setTheme = (theme: string) => {
    root.dataset.theme = theme;
    if (themeBtn) themeBtn.innerHTML = theme === 'dark' ? `${icon('sun')} Light` : `${icon('moon')} Dark`;
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
