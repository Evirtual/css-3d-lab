import { icon } from './icons';
import { canRecord, recordModel, type Backdrop, type Ratio, type Recording } from './record';

/**
 * "Video": the clip is made here, in the visitor's browser, from the model on the stage — their
 * edits, their pose, their backdrop (see record.ts). Nothing is stored on the server, so the video
 * can never be the old version of a model.
 *
 * Press Video → a small dialog (shape, backdrop) → the bar fills → Save. Closing the dialog does
 * not stop the work: the button itself then carries the progress, and turns into the download when
 * the file is ready. One video at a time; pressing Video again just reopens the same job.
 */

const RATIOS: { value: Ratio; label: string; hint: string }[] = [
  { value: '9:16', label: '9:16 tall', hint: 'Reels, Shorts, TikTok' },
  { value: '16:9', label: '16:9 wide', hint: 'Slides, YouTube, a page' },
];
const BACKDROPS: { value: Backdrop; label: string; hint: string }[] = [
  { value: 'stage', label: 'As shown', hint: 'The stage, dots and all' },
  { value: 'dark', label: 'Dark', hint: 'Plain dark' },
  { value: 'light', label: 'Light', hint: 'Plain light' },
  { value: 'transparent', label: 'Transparent', hint: 'WebM, for your own background' },
];

/** The button. It needs no data about the model: everything comes from the stage when pressed. */
export const videoButton = (id: string, className = 'btn'): string =>
  `<button type="button" class="${className}" data-make-video="${id}" title="Make a video of this model as it looks now">${icon('download')} Video</button>`;

/** The one video being made (or just made). */
interface Job {
  id: string;
  button: HTMLElement;
  stage: HTMLElement;
  ratio: Ratio;
  backdrop: Backdrop;
  progress: number;
  done?: Recording;
  url?: string;
  error?: string;
}

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
  let job: Job | null = null;
  let dialog: HTMLDialogElement | null = null;

  const chips = <T extends string>(name: string, items: { value: T; label: string; hint: string }[], chosen: T): string =>
    items
      .map(
        (item) => `<button type="button" role="radio" data-${name}="${item.value}" aria-checked="${item.value === chosen}">
          <b>${item.label}</b><span>${item.hint}</span></button>`,
      )
      .join('');

  const fileName = (of: Job): string => `css-3d-lab-${of.id}-${of.ratio.replace(':', 'x')}.${of.done!.extension}`;

  /** Saves the finished file (from the dialog or straight from the button). */
  const save = (of: Job): void => {
    if (!of.done || !of.url) return;
    const link = document.createElement('a');
    link.href = of.url;
    link.download = fileName(of);
    link.click();
    track(`download/${of.id}/made`);
  };

  /** The button shows where the job is: a fill behind its label, then "Save". */
  const paintButton = (): void => {
    for (const button of document.querySelectorAll<HTMLElement>('[data-make-video]')) {
      const mine = job?.button === button;
      button.classList.toggle('is-working', Boolean(mine && job && !job.done && !job.error));
      button.classList.toggle('is-ready', Boolean(mine && job?.done));
      button.style.setProperty('--done', mine && job ? String(job.progress) : '0');
      if (!mine) continue;
      if (job?.done) button.innerHTML = `${icon('download')} Save video <small>${(job.done.blob.size / 1e6).toFixed(1)} MB</small>`;
      else if (job && !job.error) button.innerHTML = `${icon('download')} Making… ${Math.round(job.progress * 100)}%`;
      else button.innerHTML = `${icon('download')} Video`;
    }
  };

  /** The dialog, drawn from the same state, whether it was just opened or is being watched. */
  const paintDialog = (): void => {
    if (!dialog?.open || !job) return;
    const bar = dialog.querySelector<HTMLElement>('[data-bar]')!;
    const fill = bar.firstElementChild as HTMLElement;
    const note = dialog.querySelector<HTMLElement>('[data-note]')!;
    const actions = dialog.querySelector<HTMLElement>('[data-actions]')!;
    const busy = !job.done && !job.error;
    bar.hidden = !busy && !job.done;
    fill.style.transform = `scaleX(${job.done ? 1 : job.progress})`;
    for (const chip of dialog.querySelectorAll<HTMLButtonElement>('[data-ratio], [data-backdrop]')) chip.disabled = busy;

    if (job.done) {
      actions.innerHTML = `<button type="button" class="btn btn--accent" data-save>${icon('download')} Save ${job.done.extension.toUpperCase()} <small>${(job.done.blob.size / 1e6).toFixed(1)} MB</small></button>
        <button type="button" class="btn" data-again>Make another</button>`;
      note.textContent = `Ready: ${job.done.width} × ${job.done.height}, ${job.done.seconds.toFixed(1)}s, and it loops seamlessly.`;
    } else if (job.error) {
      actions.innerHTML = `<button type="button" class="btn btn--accent" data-go>${icon('download')} Try again</button>`;
      note.textContent = `It did not work: ${job.error}`;
    } else {
      actions.innerHTML = `<button type="button" class="btn btn--accent" disabled>${icon('download')} Making… ${Math.round(job.progress * 100)}%</button>`;
      note.textContent = 'Drawing every frame of one loop, then encoding it. You can close this: it keeps going.';
    }
  };

  const openDialog = (button: HTMLElement): void => {
    const stage = button.closest('.viewer__panel, .page-main, body')?.querySelector<HTMLElement>('.stage');
    if (!stage) return;
    const id = button.dataset.makeVideo ?? 'model';
    const title = document.querySelector('.viewer__panel h2, .page-head h1, h1')?.textContent?.trim() ?? 'this model';
    // a job from another model (or a stage that is gone) is forgotten when a new one is opened
    if (job && (job.id !== id || !job.stage.isConnected)) job = null;
    dialog?.remove();
    dialog = document.createElement('dialog');
    dialog.className = 'vidmaker';
    dialog.innerHTML = `
      <form method="dialog" class="vidmaker__head">
        <h2>Make a video</h2>
        <button class="vidmaker__close" value="close" aria-label="Close">${icon('x')}</button>
      </form>
      <p class="vidmaker__lead">Of <b>${title}</b>, as it looks on the stage now: your edits, the pose you paused on, the backdrop you chose.</p>
      <fieldset class="vidmaker__set"><legend>Shape</legend>
        <div class="vidmaker__row" role="radiogroup" aria-label="Shape">${chips('ratio', RATIOS, job?.ratio ?? ratio)}</div>
      </fieldset>
      <fieldset class="vidmaker__set"><legend>Backdrop</legend>
        <div class="vidmaker__row" role="radiogroup" aria-label="Backdrop">${chips('backdrop', BACKDROPS, job?.backdrop ?? backdrop)}</div>
      </fieldset>
      <div class="vidmaker__bar" data-bar hidden><i></i></div>
      <div class="vidmaker__actions" data-actions>
        <button type="button" class="btn btn--accent" data-go>${icon('download')} Make the video</button>
      </div>
      <p class="vidmaker__note" data-note>It is made in your browser: nothing is uploaded, and nothing was filmed in advance.</p>`;
    document.body.append(dialog);
    dialog.showModal();
    if (job) paintDialog();
  };

  const start = async (button: HTMLElement): Promise<void> => {
    const stage = button.closest('.viewer__panel, .page-main, body')?.querySelector<HTMLElement>('.stage');
    if (!stage) return;
    if (!canRecord()) {
      if (dialog?.open) dialog.querySelector('[data-note]')!.textContent = 'This browser cannot make videos yet — Chrome, Edge and Safari 17+ can. Print / PDF works everywhere.';
      return;
    }
    if (job?.url) URL.revokeObjectURL(job.url); // the last file is replaced by this one
    const mine: Job = { id: button.dataset.makeVideo ?? 'model', button, stage, ratio, backdrop, progress: 0 };
    job = mine;
    paintButton();
    paintDialog();

    try {
      mine.done = await recordModel({
        stage,
        ratio,
        backdrop,
        onProgress: (done) => {
          mine.progress = done;
          if (job === mine) {
            paintButton();
            paintDialog();
          }
        },
      });
      mine.url = URL.createObjectURL(mine.done.blob);
      track(`video/${mine.id}/${mine.ratio}/${mine.backdrop}`);
    } catch (err) {
      mine.error = err instanceof Error ? err.message : 'something went wrong';
    }
    if (job === mine) {
      paintButton();
      paintDialog();
    }
  };

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const button = target.closest<HTMLElement>('[data-make-video]');
    if (button) {
      // when the file is ready, the button is the download; otherwise it opens the dialog
      if (job?.button === button && job.done) return save(job);
      return openDialog(button);
    }

    if (!dialog?.open) return;
    const busy = Boolean(job && !job.done && !job.error);

    const chip = target.closest<HTMLElement>('[data-ratio], [data-backdrop]');
    if (chip && !busy) {
      const group = chip.dataset.ratio ? 'ratio' : 'backdrop';
      if (chip.dataset.ratio) ratio = chip.dataset.ratio as Ratio;
      else backdrop = chip.dataset.backdrop as Backdrop;
      for (const other of dialog.querySelectorAll<HTMLElement>(`[data-${group}]`)) other.setAttribute('aria-checked', String(other === chip));
      return;
    }
    if (target.closest('[data-save]') && job) return save(job);
    if (target.closest('[data-again]')) {
      const again = job?.button;
      job = null;
      paintButton();
      if (again) void start(again);
      return;
    }
    if (target.closest('[data-go]')) {
      const owner = document.querySelector<HTMLElement>('[data-make-video]');
      void start(job?.button ?? owner!);
      return;
    }
    if (target === dialog && !busy) dialog.close(); // the dark area around it
  });
}
