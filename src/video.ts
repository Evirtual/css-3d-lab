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
const REELS = reels as Record<string, { bytes: number }>;

export const hasVideo = (id: string): boolean => Boolean(REELS[id]);

const mb = (bytes: number): string => `${(bytes / 1e6).toFixed(1)} MB`;

/** The button, or '' when the demo has no video yet. */
export function videoButton(id: string, className = 'btn'): string {
  const reel = REELS[id];
  if (!reel) return '';
  return `<a class="${className}" href="${site.repo}/releases/download/reels/css-3d-lab-${id}.mp4" data-download="${id}" title="Vertical video, 1080 × 1920, 60 fps: for Reels, Shorts and TikTok">${icon('download')} Video <small>${mb(reel.bytes)}</small></a>`;
}

/** Counts downloads (with whatever analytics function the page uses). */
export function trackDownloads(track: (event: string) => void): void {
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>('[data-download]');
    if (link) track(`download/${link.dataset.download}`);
  });
}
