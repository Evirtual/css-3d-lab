import site from '../site.config.json';
import { icon } from './icons';
import reels from './reels.json';

/**
 * "Download video": a vertical 1080 × 1920 clip of the demo (for Reels, Shorts, TikTok).
 *
 * The clips are made with `npm run reels` and published by scripts/publish-reels.mjs as files of
 * the repo's "reels" release (not in git), and the button links straight to them: release
 * downloads do not count toward GitHub Pages bandwidth. src/reels.json lists which demos have one
 * and its exact size; the deploy (scripts/verify-reels.mjs) fails if a listed file is missing, so
 * the button is only ever shown for a video that is really there.
 */
const REELS = reels as Record<string, { bytes: number; webp?: number }>;

export const hasVideo = (id: string): boolean => Boolean(REELS[id]);

const mb = (bytes: number): string => `${(bytes / 1e6).toFixed(1)} MB`;

/** The download buttons: the MP4 always, the transparent WebP when there is one. */
export function videoButton(id: string, className = 'btn'): string {
  const reel = REELS[id];
  if (!reel) return '';
  const mp4 = `<a class="${className}" href="${site.repo}/releases/download/reels/css-3d-lab-${id}.mp4" data-download="${id}" title="Vertical video, 1080 × 1920, 60 fps: for Reels, Shorts and TikTok">${icon('download')} Video <small>${mb(reel.bytes)}</small></a>`;
  // The transparent one is a WebP, not a video: social apps cannot show transparency, but a page,
  // a slide or a document can, so this is the one to drop onto your own background.
  const webp = reel.webp
    ? `<a class="${className}" href="${site.repo}/releases/download/reels/css-3d-lab-${id}.webp" data-download="${id}/webp" title="Animated WebP with a transparent background: put the model on your own background (a page, a slide, a document). Not for social apps.">${icon('download')} Transparent <small>${mb(reel.webp)}</small></a>`
    : '';
  return mp4 + webp;
}

/** Counts downloads (with whatever analytics function the page uses). */
export function trackDownloads(track: (event: string) => void): void {
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>('[data-download]');
    if (link) track(`download/${link.dataset.download}`);
  });
}
