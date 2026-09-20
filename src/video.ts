import { icon } from './icons';
import { canRecord, captureImage, recordModel, type Backdrop, type ImageFormat, type Quality, type Ratio, type Recording } from './record';

/**
 * "Video" and "Image": both are made here, in the visitor's browser, from the model on the stage —
 * their edits, their pose, their backdrop (see record.ts). Nothing is stored on the server, so a
 * file can never be the old version of a model.
 *
 * Each button opens the same small dialog with the choices that fit it, fills a bar while the work
 * runs, then offers the file. Closing the dialog does not stop the work: the button carries the
 * progress and becomes the download when the file is ready.
 */

type Kind = 'video' | 'image';

interface Choice<T> {
  value: T;
  label: string;
  hint: string;
}

const RATIOS: Choice<Ratio>[] = [
  { value: '9:16', label: 'Tall', hint: '9:16 — Reels, Shorts' },
  { value: '16:9', label: 'Wide', hint: '16:9 — slides, YouTube' },
];
const QUALITIES: Choice<Quality>[] = [
  { value: 480, label: '480p', hint: 'Small and quick' },
  { value: 720, label: '720p', hint: 'Good for chat' },
  { value: 1080, label: '1080p', hint: 'Social media' },
  { value: 2160, label: '4K', hint: 'Big screens' },
];
const SIZES: Choice<number>[] = [
  { value: 800, label: 'Small', hint: '800 px' },
  { value: 1600, label: 'Medium', hint: '1600 px' },
  { value: 3200, label: 'Large', hint: '3200 px' },
];
const FORMATS: Choice<ImageFormat>[] = [
  { value: 'png', label: 'PNG', hint: 'Sharp, can be see-through' },
  { value: 'jpeg', label: 'JPEG', hint: 'Smaller, no transparency' },
];
const BACKDROPS: Choice<Backdrop>[] = [
  { value: 'stage', label: 'As shown', hint: 'The stage, dots and all' },
  { value: 'dark', label: 'Dark', hint: 'Plain dark' },
  { value: 'light', label: 'Light', hint: 'Plain light' },
  { value: 'transparent', label: 'Transparent', hint: 'Your own background' },
];

/** The two "take it with you" buttons: everything else comes from the stage when they are pressed. */
export const videoButton = (id: string, className = 'btn', title = ''): string =>
  `<button type="button" class="${className}" data-make="video" data-model="${id}" data-title="${title}" title="Make a video of this model as it looks now">${icon('film')} Video</button>` +
  `<button type="button" class="${className}" data-make="image" data-model="${id}" data-title="${title}" title="Save a picture of this model as it looks now">${icon('image')} Image</button>`;

/** What is being made (or was just made) — only ever one at a time. */
interface Job {
  kind: Kind;
  id: string;
  button: HTMLElement;
  stage: HTMLElement;
  progress: number;
  blob?: Blob;
  url?: string;
  name?: string;
  detail?: string;
  error?: string;
}

/** Counts downloads (with whatever analytics function the page uses). */
export function trackDownloads(track: (event: string) => void): void {
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>('[data-download]');
    if (link) track(`download/${link.dataset.download}`);
  });
}

/** Wires every Video / Image button on the page. Call once. */
export function initVideoMaker(track: (event: string) => void = () => {}): void {
  const chosen = { ratio: '9:16' as Ratio, quality: 1080 as Quality, backdrop: 'stage' as Backdrop, format: 'png' as ImageFormat, size: 1600 };
  let job: Job | null = null;
  let dialog: HTMLDialogElement | null = null;
  const busy = (): boolean => Boolean(job && !job.blob && !job.error);

  const group = <T extends string | number>(name: string, label: string, items: Choice<T>[], pick: T): string => `
    <fieldset class="vidmaker__set">
      <legend>${label}</legend>
      <div class="vidmaker__row" role="radiogroup" aria-label="${label}">
        ${items
          .map(
            (item) => `<button type="button" role="radio" data-pick="${name}" data-value="${item.value}" aria-checked="${item.value === pick}">
              ${name === 'ratio' || name === 'backdrop' ? `<i class="vidmaker__swatch" data-swatch="${item.value}" aria-hidden="true"></i>` : ''}
              <b>${item.label}</b><span>${item.hint}</span></button>`,
          )
          .join('')}
      </div>
    </fieldset>`;

  const options = (kind: Kind): string =>
    kind === 'video'
      ? group('ratio', 'Shape', RATIOS, chosen.ratio) + group('quality', 'Quality', QUALITIES, chosen.quality) + group('backdrop', 'Backdrop', BACKDROPS, chosen.backdrop)
      : group('format', 'Format', FORMATS, chosen.format) + group('size', 'Size', SIZES, chosen.size) + group('backdrop', 'Backdrop', BACKDROPS, chosen.backdrop);

  const save = (of: Job): void => {
    if (!of.url || !of.name) return;
    const link = document.createElement('a');
    link.href = of.url;
    link.download = of.name;
    link.click();
    track(`download/${of.id}/${of.kind}`);
  };

  /** The button shows where the job is: a fill behind its label, then "Save". */
  const paintButton = (): void => {
    for (const button of document.querySelectorAll<HTMLElement>('[data-make]')) {
      const mine = job?.button === button;
      const kind = button.dataset.make as Kind;
      button.classList.toggle('is-working', Boolean(mine && busy()));
      button.classList.toggle('is-ready', Boolean(mine && job?.blob));
      button.style.setProperty('--done', mine && job ? String(job.progress) : '0');
      if (!mine) continue;
      if (job?.blob) button.innerHTML = `${icon('download')} Save <small>${(job.blob.size / 1e6).toFixed(1)} MB</small>`;
      else if (busy()) button.innerHTML = `${icon(kind === 'video' ? 'film' : 'image')} Making… ${Math.round(job!.progress * 100)}%`;
      else button.innerHTML = `${icon(kind === 'video' ? 'film' : 'image')} ${kind === 'video' ? 'Video' : 'Image'}`;
    }
  };

  const paintDialog = (): void => {
    if (!dialog?.open || !job) return;
    const bar = dialog.querySelector<HTMLElement>('[data-bar]')!;
    const note = dialog.querySelector<HTMLElement>('[data-note]')!;
    const actions = dialog.querySelector<HTMLElement>('[data-actions]')!;
    const working = busy();
    bar.hidden = !working && !job.blob;
    (bar.firstElementChild as HTMLElement).style.transform = `scaleX(${job.blob ? 1 : job.progress})`;
    for (const chip of dialog.querySelectorAll<HTMLButtonElement>('[data-pick]')) chip.disabled = working;

    if (job.blob) {
      actions.innerHTML = `<button type="button" class="btn btn--accent" data-save>${icon('download')} Save <small>${(job.blob.size / 1e6).toFixed(1)} MB</small></button>
        <button type="button" class="btn" data-again>Make another</button>`;
      note.hidden = false;
      note.textContent = job.detail ?? '';
    } else if (job.error) {
      actions.innerHTML = `<button type="button" class="btn btn--accent" data-go>${icon('download')} Try again</button>`;
      note.hidden = false;
      note.textContent = `It did not work: ${job.error}`;
    } else {
      actions.innerHTML = `<button type="button" class="btn btn--accent" disabled>${icon('download')} Making… ${Math.round(job.progress * 100)}%</button>`;
      note.hidden = false;
      note.textContent = job.kind === 'video' ? 'Drawing every frame of one loop. You can close this: it keeps going.' : 'Drawing the pose on the stage.';
    }
  };

  const openDialog = (button: HTMLElement): void => {
    const kind = (button.dataset.make ?? 'video') as Kind;
    const stage = button.closest('.viewer__panel, .page-main, body')?.querySelector<HTMLElement>('.stage');
    if (!stage) return;
    const id = button.dataset.model ?? 'model';
    const title = button.dataset.title || 'this model';
    // a job from another model, another kind, or a stage that is gone, is forgotten
    if (job && (job.id !== id || job.kind !== kind || !job.stage.isConnected)) job = null;
    dialog?.remove();
    dialog = document.createElement('dialog');
    dialog.className = 'vidmaker';
    dialog.dataset.kind = kind;
    dialog.innerHTML = `
      <form method="dialog" class="vidmaker__head">
        <h2>${icon(kind === 'video' ? 'film' : 'image')} ${kind === 'video' ? 'Make a video' : 'Save an image'}</h2>
        <button class="vidmaker__close" value="close" aria-label="Close">${icon('x')}</button>
      </form>
      <p class="vidmaker__lead">Of <b>${title}</b>, as it looks on the stage right now: your edits, the pose you paused on, the backdrop you chose.</p>
      ${options(kind)}
      <div class="vidmaker__bar" data-bar hidden><i></i></div>
      <div class="vidmaker__actions" data-actions>
        <button type="button" class="btn btn--accent" data-go>${icon('download')} ${kind === 'video' ? 'Make the video' : 'Make the image'}</button>
      </div>
      <p class="vidmaker__note" data-note hidden></p>`;
    document.body.append(dialog);
    dialog.showModal();
    paintDialog();
  };

  const imageSize = async (blob: Blob): Promise<string> => {
    try {
      const bitmap = await createImageBitmap(blob);
      const shape = `${bitmap.width} × ${bitmap.height}`;
      bitmap.close();
      return shape;
    } catch {
      return 'saved';
    }
  };

  const start = async (button: HTMLElement): Promise<void> => {
    const kind = (button.dataset.make ?? 'video') as Kind;
    const stage = button.closest('.viewer__panel, .page-main, body')?.querySelector<HTMLElement>('.stage');
    if (!stage) return;
    if (kind === 'video' && !canRecord()) {
      if (dialog?.open) {
        dialog.querySelector('[data-note]')!.textContent =
          'This browser cannot make videos yet — Chrome, Edge and Safari 17+ can. The Image button and Print / PDF work everywhere.';
      }
      return;
    }
    if (job?.url) URL.revokeObjectURL(job.url); // the last file is replaced by this one
    const mine: Job = { kind, id: button.dataset.model ?? 'model', button, stage, progress: 0 };
    job = mine;
    paintButton();
    paintDialog();

    try {
      if (kind === 'video') {
        const made: Recording = await recordModel({
          stage,
          ratio: chosen.ratio,
          quality: chosen.quality,
          backdrop: chosen.backdrop,
          onProgress: (done) => {
            mine.progress = done;
            if (job === mine) {
              paintButton();
              paintDialog();
            }
          },
        });
        mine.blob = made.blob;
        mine.name = `css-3d-lab-${mine.id}-${chosen.ratio.replace(':', 'x')}.${made.extension}`;
        mine.detail = `Ready: ${made.width} × ${made.height}, ${made.seconds.toFixed(1)}s, and it loops seamlessly.`;
      } else {
        mine.progress = 0.4;
        paintButton();
        paintDialog();
        mine.blob = await captureImage(stage, { backdrop: chosen.backdrop, format: chosen.format, size: chosen.size });
        mine.name = `css-3d-lab-${mine.id}.${chosen.format === 'jpeg' ? 'jpg' : 'png'}`;
        mine.detail = `Ready: ${await imageSize(mine.blob)}, ${chosen.format.toUpperCase()}.`;
      }
      mine.progress = 1;
      mine.url = URL.createObjectURL(mine.blob);
      track(`${kind}/${mine.id}`);
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

    const button = target.closest<HTMLElement>('[data-make]');
    if (button) {
      if (job?.button === button && job.blob) return save(job); // ready: the button is the download
      return openDialog(button);
    }

    if (!dialog?.open) return;
    const chip = target.closest<HTMLElement>('[data-pick]');
    if (chip && !busy()) {
      const name = chip.dataset.pick as keyof typeof chosen;
      const raw = chip.dataset.value!;
      (chosen[name] as unknown) = /^\d+$/.test(raw) ? Number(raw) : raw;
      for (const other of dialog.querySelectorAll<HTMLElement>(`[data-pick="${name}"]`)) other.setAttribute('aria-checked', String(other === chip));
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
      const owner = job?.button ?? document.querySelector<HTMLElement>(`[data-make="${dialog.dataset.kind}"]`);
      if (owner) void start(owner);
      return;
    }
    if (target === dialog && !busy()) dialog.close(); // the dark area around it
  });
}
