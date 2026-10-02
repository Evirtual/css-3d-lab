import type { PrintSetup } from './models/snippet-utils';

/**
 * The export dialog (src/video.ts: Video, Image and Print, with the MP4 and WebM writers, the
 * recorder and the print layout) loads the first time one of its buttons is pressed, not with the
 * page. It was about 31 KB of the 42 KB every page loaded up front (measured 2026-10-02), for a
 * dialog most visitors never open.
 *
 * The press that loads it is held, and replayed once the dialog is wired, so it opens as if it had
 * been there all along. Pointing at or focusing one of its buttons starts the load early, so that
 * first press barely waits. src/video.ts itself is unchanged: it is part of the stage and export
 * checks' fingerprint (scripts/fingerprint.mjs), and this only changes when it is loaded.
 */
const OPENERS = '[data-make], [data-print], [data-act="print"]';

export function initVideoMakerOnDemand(track: (event: string) => void, print: (stage: HTMLElement, setup: PrintSetup) => void): void {
  let loading: Promise<void> | null = null;
  const load = (): Promise<void> =>
    (loading ??= import('./video').then((m) => {
      m.trackDownloads(track);
      m.initVideoMaker(track, print);
    }));
  const opener = (e: Event): HTMLElement | null => (e.target instanceof Element ? e.target.closest<HTMLElement>(OPENERS) : null);

  const hold = (e: Event): void => {
    const button = opener(e);
    if (!button) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    document.removeEventListener('click', hold, true);
    void load().then(() => button.click());
  };
  document.addEventListener('click', hold, true);

  const warm = (e: Event): void => {
    if (!opener(e)) return;
    void load();
    document.removeEventListener('pointerover', warm, true);
    document.removeEventListener('focusin', warm, true);
  };
  document.addEventListener('pointerover', warm, true);
  document.addEventListener('focusin', warm, true);
}
