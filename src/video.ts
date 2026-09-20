import { icon } from './icons';
import { canRecord, captureImage, recordModel, type Backdrop, type ImageFormat, type Quality, type Ratio, type Recording } from './record';

/**
 * Video, Image and Print all work the same way: press one, and a dialog shows the file itself —
 * a real capture of the model on the stage, not a mock-up of it. What is on that screen is what
 * gets saved, so nothing can turn out different afterwards.
 *
 * While the dialog is open the model is held still and cannot be played with, so the thing being
 * captured cannot change underneath it. Closing the dialog lets the model run again.
 */

type Kind = 'video' | 'image' | 'print';

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

const TITLES: Record<Kind, string> = { video: 'Make a video', image: 'Save an image', print: 'Print or save as PDF' };
const ICONS: Record<Kind, 'film' | 'image' | 'printer'> = { video: 'film', image: 'image', print: 'printer' };

/** The buttons. Everything else comes from the stage when one of them is pressed. */
export const videoButton = (id: string, className = 'btn', title = ''): string =>
  `<button type="button" class="${className}" data-make="video" data-model="${id}" data-title="${title}">${icon('film')} Video</button>` +
  `<button type="button" class="${className}" data-make="image" data-model="${id}" data-title="${title}">${icon('image')} Image</button>`;

/** What is being made (or was just made) — only ever one at a time. */
interface Job {
  kind: Kind;
  id: string;
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

/** Wires every Video / Image / Print button on the page. Call once. */
export function initVideoMaker(track: (event: string) => void = () => {}, print?: (stage: HTMLElement) => void): void {
  // fill: how much of the frame the model takes. Two thirds matches the site; the slider goes
  // from far away to filling the frame, so a wide, airy picture or a tight crop are both possible.
  const chosen = { ratio: '9:16' as Ratio, quality: 1080 as Quality, backdrop: 'stage' as Backdrop, format: 'png' as ImageFormat, size: 1600, fill: 2 / 3 };
  let dialog: HTMLDialogElement | null = null;
  let stage: HTMLElement | null = null;
  let held: Animation[] = [];
  let job: Job | null = null;
  let busy = false;
  let previewToken = 0;

  /* ---------- the model is held still while the dialog is open ---------- */
  const hold = (): void => {
    if (!stage) return;
    held = stage.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running');
    for (const animation of held) animation.pause();
    stage.closest('.stage-wrap')?.setAttribute('data-locked', '');
  };
  const release = (): void => {
    for (const animation of held) animation.play();
    held = [];
    stage?.closest('.stage-wrap')?.removeAttribute('data-locked');
  };

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

  const zoomSlider = (): string => `
    <fieldset class="vidmaker__set">
      <legend>Model size <output data-zoom-out>${Math.round(chosen.fill * 100)}%</output></legend>
      <input class="vidmaker__zoom" type="range" min="25" max="100" step="5" value="${Math.round(chosen.fill * 100)}" data-zoom aria-label="How much of the frame the model fills">
    </fieldset>`;

  const options = (kind: Kind): string => {
    if (kind === 'video') {
      return group('ratio', 'Shape', RATIOS, chosen.ratio) + group('quality', 'Quality', QUALITIES, chosen.quality) + group('backdrop', 'Backdrop', BACKDROPS, chosen.backdrop) + zoomSlider();
    }
    if (kind === 'image') {
      return group('format', 'Format', FORMATS, chosen.format) + group('size', 'Size', SIZES, chosen.size) + group('backdrop', 'Backdrop', BACKDROPS, chosen.backdrop) + zoomSlider();
    }
    return group('backdrop', 'Backdrop', BACKDROPS, chosen.backdrop) + zoomSlider();
  };

  const save = (): void => {
    if (!job?.url || !job.name) return;
    const link = document.createElement('a');
    link.href = job.url;
    link.download = job.name;
    link.click();
    track(`download/${job.id}/${job.kind}`);
  };

  /** The preview is a real capture, so what is on screen is the file. */
  const showPreview = async (): Promise<void> => {
    if (!dialog || !stage || !job) return;
    const frame = dialog.querySelector<HTMLElement>('[data-preview]')!;
    const token = ++previewToken;
    frame.dataset.state = 'working';
    try {
      const blob = await captureImage(stage, { backdrop: chosen.backdrop, format: 'png', size: 900, fill: chosen.fill });
      if (token !== previewToken || !dialog?.open) return;
      const url = URL.createObjectURL(blob);
      frame.innerHTML = `<img src="${url}" alt="What you will get: the model exactly as it stands now">`;
      frame.dataset.state = 'ready';
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    } catch (err) {
      if (token !== previewToken) return;
      frame.dataset.state = 'failed';
      frame.textContent = err instanceof Error ? err.message : 'This model could not be drawn.';
    }
  };

  const paint = (): void => {
    if (!dialog?.open || !job) return;
    const bar = dialog.querySelector<HTMLElement>('[data-bar]')!;
    const note = dialog.querySelector<HTMLElement>('[data-note]')!;
    const actions = dialog.querySelector<HTMLElement>('[data-actions]')!;
    bar.hidden = !busy;
    (bar.firstElementChild as HTMLElement).style.transform = `scaleX(${job.blob ? 1 : job.progress})`;
    for (const chip of dialog.querySelectorAll<HTMLButtonElement>('[data-pick]')) chip.disabled = busy;

    const go = { video: 'Make the video', image: 'Save the image', print: 'Open the print dialog' }[job.kind];
    if (busy) {
      actions.innerHTML = `<button type="button" class="btn btn--accent" disabled>${icon('download')} Making… ${Math.round(job.progress * 100)}%</button>`;
      note.hidden = false;
      note.textContent = 'Drawing every frame of one loop.';
    } else if (job.blob) {
      actions.innerHTML = `<button type="button" class="btn btn--accent" data-save>${icon('download')} Save <small>${(job.blob.size / 1e6).toFixed(1)} MB</small></button>
        <button type="button" class="btn" data-again>Start again</button>`;
      note.hidden = false;
      note.textContent = job.detail ?? '';
    } else {
      actions.innerHTML = `<button type="button" class="btn btn--accent" data-go>${icon(ICONS[job.kind])} ${go}</button>`;
      note.hidden = !job.error;
      note.textContent = job.error ? `It did not work: ${job.error}` : '';
    }
  };

  const open = (button: HTMLElement, kind: Kind): void => {
    const found = button.closest('.viewer__panel, .page-main, body')?.querySelector<HTMLElement>('.stage');
    if (!found) return;
    stage = found;
    hold();
    job = { kind, id: button.dataset.model ?? 'model', progress: 0 };
    const title = button.dataset.title || 'this model';
    dialog?.remove();
    dialog = document.createElement('dialog');
    dialog.className = 'vidmaker';
    dialog.dataset.kind = kind;
    dialog.innerHTML = `
      <form method="dialog" class="vidmaker__head">
        <h2>${icon(ICONS[kind])} ${TITLES[kind]}</h2>
        <button class="vidmaker__close" value="close" aria-label="Close">${icon('x')}</button>
      </form>
      <div class="vidmaker__body">
        <div class="vidmaker__preview" data-preview data-state="working" aria-live="polite"></div>
        <div class="vidmaker__settings">
          <p class="vidmaker__lead"><b>${title}</b>, held exactly as it stands. This is what you will get.</p>
          ${options(kind)}
          <div class="vidmaker__bar" data-bar hidden><i></i></div>
          <div class="vidmaker__actions" data-actions></div>
          <p class="vidmaker__note" data-note hidden></p>
        </div>
      </div>`;
    document.body.append(dialog);
    dialog.addEventListener('close', () => {
      release();
      previewToken++;
    });
    dialog.showModal();
    paint();
    void showPreview();
  };

  const run = async (): Promise<void> => {
    if (!stage || !job) return;
    if (job.kind === 'print') {
      print?.(stage);
      track(`print/${job.id}`);
      return;
    }
    if (job.kind === 'video' && !canRecord()) {
      job.error = 'this browser cannot make videos yet — Chrome, Edge and Safari 17+ can';
      paint();
      return;
    }
    if (job.url) URL.revokeObjectURL(job.url);
    const mine: Job = { kind: job.kind, id: job.id, progress: 0 };
    job = mine;
    busy = true;
    paint();

    try {
      if (mine.kind === 'video') {
        const made: Recording = await recordModel({
          stage,
          ratio: chosen.ratio,
          quality: chosen.quality,
          backdrop: chosen.backdrop,
          fill: chosen.fill,
          onProgress: (done) => {
            mine.progress = done;
            if (job === mine) paint();
          },
        });
        mine.blob = made.blob;
        mine.name = `css-3d-lab-${mine.id}-${chosen.ratio.replace(':', 'x')}.${made.extension}`;
        mine.detail = `${made.width} × ${made.height}, ${made.seconds.toFixed(1)}s, loops seamlessly.`;
        // the preview becomes the finished clip: what plays here is the file
        const frame = dialog?.querySelector<HTMLElement>('[data-preview]');
        if (frame) {
          const url = URL.createObjectURL(made.blob);
          frame.innerHTML = `<video src="${url}" autoplay loop muted playsinline></video>`;
          frame.dataset.state = 'ready';
        }
      } else {
        mine.blob = await captureImage(stage, { backdrop: chosen.backdrop, format: chosen.format, size: chosen.size, fill: chosen.fill });
        mine.name = `css-3d-lab-${mine.id}.${chosen.format === 'jpeg' ? 'jpg' : 'png'}`;
        const bitmap = await createImageBitmap(mine.blob);
        mine.detail = `${bitmap.width} × ${bitmap.height}, ${chosen.format.toUpperCase()}.`;
        bitmap.close();
      }
      mine.progress = 1;
      mine.url = URL.createObjectURL(mine.blob);
      track(`${mine.kind}/${mine.id}`);
    } catch (err) {
      mine.error = err instanceof Error ? err.message : 'something went wrong';
    }
    busy = false;
    paint();
  };

  let zoomTimer = 0;
  document.addEventListener('input', (e) => {
    const slider = (e.target as HTMLElement).closest<HTMLInputElement>('[data-zoom]');
    if (!slider || busy || !dialog?.open) return;
    chosen.fill = Number(slider.value) / 100;
    const out = dialog.querySelector<HTMLElement>('[data-zoom-out]');
    if (out) out.textContent = `${slider.value}%`;
    if (job) job.blob = undefined;
    paint();
    window.clearTimeout(zoomTimer); // one preview when the slider settles, not one per step
    zoomTimer = window.setTimeout(() => void showPreview(), 180);
  });

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const button = target.closest<HTMLElement>('[data-make], [data-print], [data-act="print"]');
    if (button) {
      const kind = (button.dataset.make ?? 'print') as Kind;
      return open(button, kind);
    }

    if (!dialog?.open) return;
    const chip = target.closest<HTMLElement>('[data-pick]');
    if (chip && !busy) {
      const name = chip.dataset.pick as keyof typeof chosen;
      const raw = chip.dataset.value!;
      (chosen[name] as unknown) = /^\d+$/.test(raw) ? Number(raw) : raw;
      for (const other of dialog.querySelectorAll<HTMLElement>(`[data-pick="${name}"]`)) other.setAttribute('aria-checked', String(other === chip));
      if (job) {
        job.blob = undefined;
        job.detail = undefined;
      }
      paint();
      void showPreview(); // the preview always shows the current choices
      return;
    }
    if (target.closest('[data-save]')) return save();
    if (target.closest('[data-again]')) {
      if (job) job.blob = undefined;
      paint();
      void showPreview();
      return;
    }
    if (target.closest('[data-go]')) return void run();
    if (target === dialog && !busy) dialog.close(); // the dark area around it
  });
}
