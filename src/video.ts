import { icon } from './icons';
import { canRecord, recordModel, type Backdrop, type Ratio } from './record';

/**
 * "Video": the clip is made here, in the visitor's browser, from the model on the stage — their
 * edits, their pose, their backdrop (see record.ts). Nothing is stored on the server, so the video
 * can never be the old version of a model.
 *
 * The button opens a small panel (shape, backdrop), then becomes the progress bar while the frames
 * are drawn, then the download itself.
 */

const RATIOS: { value: Ratio; label: string; hint: string }[] = [
  { value: '9:16', label: '9:16', hint: 'Tall: Reels, Shorts, TikTok' },
  { value: '16:9', label: '16:9', hint: 'Wide: slides, YouTube, a web page' },
];
const BACKDROPS: { value: Backdrop; label: string; hint: string }[] = [
  { value: 'stage', label: 'As shown', hint: 'The backdrop on the stage right now, dots included' },
  { value: 'dark', label: 'Dark', hint: 'A plain dark background' },
  { value: 'light', label: 'Light', hint: 'A plain light background' },
  { value: 'transparent', label: 'Transparent', hint: 'See-through (a WebM file: for editors and web pages, not for social apps)' },
];

/** The button. It needs no data about the model: everything comes from the stage when pressed. */
export const videoButton = (id: string, className = 'btn'): string =>
  `<button type="button" class="${className}" data-make-video="${id}" title="Make a video of this model as it looks now">${icon('download')} Video</button>`;

const chips = <T extends string>(name: string, items: { value: T; label: string; hint: string }[], chosen: T): string =>
  items
    .map(
      (item) =>
        `<button type="button" role="radio" data-${name}="${item.value}" aria-checked="${item.value === chosen}" title="${item.hint}">${item.label}</button>`,
    )
    .join('');

const panelHtml = (ratio: Ratio, backdrop: Backdrop): string => `
  <div class="vidmaker__row" role="radiogroup" aria-label="Shape">${chips('ratio', RATIOS, ratio)}</div>
  <div class="vidmaker__row" role="radiogroup" aria-label="Backdrop">${chips('backdrop', BACKDROPS, backdrop)}</div>
  <button type="button" class="btn btn--accent vidmaker__go" data-go>${icon('download')} Make the video</button>
  <p class="vidmaker__note" data-note>It is made here in your browser, from what you see now: your edits included.</p>`;

/** Counts downloads (with whatever analytics function the page uses). */
export function trackDownloads(track: (event: string) => void): void {
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>('[data-download]');
    if (link) track(`download/${link.dataset.download}`);
  });
}

/** Wires every "Video" button on the page. Call once. */
export function initVideoMaker(track: (event: string) => void = () => {}): void {
  let ratio: Ratio = '9:16';
  let backdrop: Backdrop = 'stage';

  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    const open = target.closest<HTMLElement>('[data-make-video]');
    if (open) {
      const existing = open.parentElement?.querySelector<HTMLElement>('.vidmaker');
      if (existing) return existing.remove(); // a second press closes it
      const panel = document.createElement('div');
      panel.className = 'vidmaker';
      panel.innerHTML = panelHtml(ratio, backdrop);
      open.after(panel);
      return;
    }

    const panel = target.closest<HTMLElement>('.vidmaker');
    if (!panel) {
      // a click anywhere else closes an open panel that is not working
      for (const open of document.querySelectorAll<HTMLElement>('.vidmaker:not([data-busy])')) open.remove();
      return;
    }

    const chip = target.closest<HTMLElement>('[data-ratio], [data-backdrop]');
    if (chip) {
      const group = chip.dataset.ratio ? 'ratio' : 'backdrop';
      if (chip.dataset.ratio) ratio = chip.dataset.ratio as Ratio;
      else backdrop = chip.dataset.backdrop as Backdrop;
      for (const other of panel.querySelectorAll<HTMLElement>(`[data-${group}]`)) {
        other.setAttribute('aria-checked', String(other === chip));
      }
      return;
    }

    if (!target.closest('[data-go]')) return;

    const button = panel.previousElementSibling as HTMLElement | null;
    const stage = button?.closest('.viewer__panel, .page-main, body')?.querySelector<HTMLElement>('.stage');
    const id = button?.dataset.makeVideo ?? 'model';
    const note = panel.querySelector<HTMLElement>('[data-note]')!;
    const go = panel.querySelector<HTMLButtonElement>('[data-go]')!;
    if (!stage) return;
    if (!canRecord()) {
      note.textContent = 'This browser cannot make videos yet. Chrome, Edge and Safari 17+ can; Print / PDF works everywhere.';
      return;
    }

    panel.dataset.busy = '';
    go.disabled = true;
    const label = button!.innerHTML;
    button!.classList.add('is-working');
    const showProgress = (done: number) => {
      button!.style.setProperty('--done', String(done));
      button!.innerHTML = `${icon('download')} Making… ${Math.round(done * 100)}%`;
    };
    showProgress(0);
    note.textContent = 'Drawing every frame of one loop, then encoding it.';

    try {
      const made = await recordModel({ stage, ratio, backdrop, onProgress: showProgress });
      const url = URL.createObjectURL(made.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `css-3d-lab-${id}-${ratio.replace(':', 'x')}.${made.extension}`;
      link.dataset.download = `${id}/made`;
      link.className = 'btn btn--accent vidmaker__got';
      link.innerHTML = `${icon('download')} Save ${made.extension.toUpperCase()} <small>${(made.blob.size / 1e6).toFixed(1)} MB</small>`;
      go.replaceWith(link);
      note.textContent = `${made.width} × ${made.height}, ${made.seconds.toFixed(1)}s, loops seamlessly.`;
      track(`video/${id}/${ratio}/${backdrop}`);
      setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000); // the link stays good while they decide
    } catch (err) {
      note.textContent = err instanceof Error ? `It did not work: ${err.message}` : 'It did not work.';
      go.disabled = false;
    } finally {
      delete panel.dataset.busy;
      button!.classList.remove('is-working');
      button!.style.removeProperty('--done');
      button!.innerHTML = label;
    }
  });
}
