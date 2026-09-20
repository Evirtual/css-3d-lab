import { icon } from './icons';
import {
  ASPECT_OF,
  canRecord,
  canRecordClear,
  captureImage,
  frameFor,
  MAX_SECONDS,
  motionSeconds,
  recordLive,
  recordModel,
  stageLook,
  type Backdrop,
  type ImageFormat,
  type ImageRatio,
  type Paint,
  type Quality,
  type Ratio,
  type Recording,
} from './record';
import type { PrintSetup } from './models/snippet-utils';
import { showThanks } from './thanks';

/**
 * One dialog with three tabs — Video, Image, Print.
 *
 * The frame on the left is not a picture of the model: it IS the model. The stage is lifted off
 * the page and put inside the frame while the dialog is open, so the dialog opens at once, the
 * browser draws the model exactly as it does on the page, and it can still be played with — which
 * is the whole point, since half of these models only do something when you hover, drag or click
 * them. The frame around it is the file's shape, its backdrop and its margin, so what you see
 * framed is what comes out.
 *
 * From there: Image takes the picture at the moment you press it (the pose you made), Video either
 * draws the model's own loop frame by frame or films the frame live while you play with it, and
 * Print lays the same thing out on a sheet.
 */

type Kind = 'video' | 'image' | 'print';
type Paper = PrintSetup['paper'];
/** Where a video comes from: the model's own loop, or the screen as it happens. */
type Motion = 'loop' | 'live';
/** A film's file: an MP4 as it stands, or a WebM with the backdrop left out. */
type Movie = 'mp4' | 'webm-clear';
const MOVIES: Choice<Movie>[] = [
  { value: 'mp4', label: 'MP4', hint: 'plays anywhere' },
  { value: 'webm-clear', label: 'WebM clear', hint: 'no backdrop' },
];



interface Choice<T> {
  value: T;
  label: string;
  hint: string;
}

const A4 = 297 / 210;
/** A printed snapshot is 2400 px on its long side — about 200 dots per inch on A4. */
const PRINT_SIZE = 2400;

const MOTIONS: Choice<Motion>[] = [
  { value: 'loop', label: 'Its own loop', hint: 'one whole turn' },
  { value: 'live', label: 'Film it live', hint: 'you play, it records' },
];
const VIDEO_SHAPES: Choice<Ratio>[] = [
  { value: '9:16', label: 'Tall', hint: 'Reels, Shorts' },
  { value: '1:1', label: 'Square', hint: 'feed posts' },
  { value: '16:9', label: 'Wide', hint: 'YouTube, slides' },
];
const QUALITIES: Choice<Quality>[] = [
  { value: 480, label: '480p', hint: 'small' },
  { value: 720, label: '720p', hint: 'for chat' },
  { value: 1080, label: '1080p', hint: 'social' },
  { value: 2160, label: '4K', hint: 'big screens' },
];
const IMAGE_SHAPES: Choice<ImageRatio>[] = [
  { value: '1:1', label: '1:1', hint: 'square' },
  { value: '4:3', label: '4:3', hint: 'classic' },
  { value: '3:2', label: '3:2', hint: 'photo' },
  { value: '16:9', label: '16:9', hint: 'wide' },
  { value: '9:16', label: '9:16', hint: 'tall' },
  { value: 'auto', label: 'As shown', hint: "the model view's shape" },
];
const SIZES: Choice<number>[] = [
  { value: 800, label: 'Small', hint: '800 px' },
  { value: 1600, label: 'Medium', hint: '1600 px' },
  { value: 3200, label: 'Large', hint: '3200 px' },
];
/** A picture's file: PNG as it stands, PNG with the backdrop left out, or a smaller JPEG. */
type Picture = 'png' | 'png-clear' | 'jpeg';
const PICTURES: Choice<Picture>[] = [
  { value: 'png', label: 'PNG', hint: 'sharp, as shown' },
  { value: 'png-clear', label: 'PNG clear', hint: 'no backdrop' },
  { value: 'jpeg', label: 'JPEG', hint: 'smaller, no alpha' },
];
const PAPERS: Choice<Paper>[] = [
  { value: 'landscape', label: 'Landscape', hint: 'A4 on its side' },
  { value: 'portrait', label: 'Portrait', hint: 'A4 upright' },
];

const TABS: { kind: Kind; label: string; icon: 'film' | 'image' | 'printer' }[] = [
  { kind: 'video', label: 'Video', icon: 'film' },
  { kind: 'image', label: 'Image', icon: 'image' },
  { kind: 'print', label: 'Print', icon: 'printer' },
];

/** The buttons. Everything else comes from the stage when one of them is pressed. */
export const videoButton = (id: string, className = 'btn', title = ''): string =>
  `<button type="button" class="${className}" data-make="video" data-model="${id}" data-title="${title}">${icon('film')} Video</button>` +
  `<button type="button" class="${className}" data-make="image" data-model="${id}" data-title="${title}">${icon('image')} Image</button>`;

/** What was made on one tab, and is waiting to be saved. */
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
export function initVideoMaker(track: (event: string) => void = () => {}, print?: (stage: HTMLElement, setup: PrintSetup) => void): void {
  // fill: how much of the frame the model takes. Two thirds matches the site; the slider goes from
  // far away to filling the frame, so a wide, airy picture or a tight crop are both possible.
  interface Setup {
    motion: Motion;
    ratio: Ratio;
    quality: Quality;
    imageRatio: ImageRatio;
    picture: Picture;
    movie: Movie;
    size: number;
    paper: Paper;
    fill: number;
  }
  const fresh = (): Setup => ({
    motion: 'loop',
    ratio: '9:16',
    quality: 1080,
    imageRatio: '1:1',
    picture: 'png',
    movie: 'mp4',
    size: 1600,
    paper: 'landscape',
    fill: 0.65,
  });
  // one set of choices per tab: what you set up for a video stays on the video tab
  const setups: Record<Kind, Setup> = { video: fresh(), image: fresh(), print: fresh() };
  const chosen = (): Setup => setups[kind];

  let dialog: HTMLDialogElement | null = null;
  let stage: HTMLElement | null = null;
  let trigger: HTMLElement | null = null;
  let kind: Kind = 'video';
  let modelId = 'model';
  let busy = false;
  let stopper: AbortController | null = null;
  const jobs = new Map<Kind, Job>();
  /** The shape the stage had on the page, which is what 'Auto' means. */
  let shape = 1;

  /** Where the stage came from, so it goes back exactly there. */
  let home: { node: HTMLElement; style: string; inner: HTMLElement; innerStyle: string; parent: Node; hold: HTMLElement } | null = null;
  /** The dialog's own copy of an edited model, which is its to throw away. */
  let copied: HTMLElement | null = null;
  /** The stage's own backdrop, remembered before it moved (the frame paints it now). */
  let look: Paint | null = null;
  let closing = false;
  /** Whether this browser can encode a see-through film. It cannot, today; it is asked all the same. */
  let clearFilms = false;
  void canRecordClear().then((can) => {
    clearFilms = can;
  });

  const job = (): Job => {
    let mine = jobs.get(kind);
    if (!mine || mine.id !== modelId) {
      mine = { kind, id: modelId, progress: 0 };
      jobs.set(kind, mine);
    }
    return mine;
  };

  const el = <T extends HTMLElement>(selector: string): T | null => dialog?.querySelector<T>(selector) ?? null;

  /** The picture format, and whether this file keeps the backdrop. */
  const format = (): ImageFormat => (chosen().picture === 'jpeg' ? 'jpeg' : 'png');
  const clear = (): boolean => (kind === 'image' ? chosen().picture === 'png-clear' : kind === 'video' ? clearFilms && chosen().movie === 'webm-clear' : false);
  const backdrop = (): Backdrop => (clear() ? 'transparent' : 'stage');

  /* ---------- the shape of what is being made ---------- */
  const aspectOf = (which: Kind = kind): number | null => {
    if (which === 'video') return ASPECT_OF[chosen().ratio];
    if (which === 'image') return ASPECT_OF[chosen().imageRatio] ?? shape;
    return chosen().paper === 'landscape' ? A4 : 1 / A4;
  };

  /** The backdrop for the current choice, as numbers the frame and the capture both use. */
  const paintNow = (): Paint | 'none' => {
    if (clear()) return 'none';
    const fresh = stage ? stageLook(stage) : null;
    if (fresh) look = fresh;
    return look ?? { color: '#0b0d18' };
  };

  /* ---------- the model, lifted into the frame and put back afterwards ---------- */
  /**
   * The stage becomes the frame: it fills it, and the site's own sizing (--fit, which watches
   * every stage) lays the model out for that size — exactly as it does in a card, in the model
   * dialog and at full screen. Nothing here scales anything, which is what used to drift.
   */
  const dress = (panel: HTMLElement, inner: HTMLElement): void => {
    if (panel !== inner) panel.style.cssText += ';position:absolute;inset:0;margin:0';
    inner.style.cssText += ';position:absolute;inset:0;width:auto;height:auto;margin:0';
    inner.dataset.inMaker = '';
  };

  const mount = (): void => {
    const frame = el<HTMLElement>('[data-live]');
    if (!stage || !frame) return;
    // The whole stage panel comes across, not just the model: its Pause and Hold hover switches,
    // its dots and its light or dark — the same controls, in the same place, doing the same thing.
    // They are wired to the document and find their stage by looking upwards, so they carry on
    // working wherever the panel is.
    const panel = stage.closest<HTMLElement>('.stage-wrap') ?? stage;

    // An edited model runs in a frame of its own, and a frame reloads the instant it is moved in
    // the page — so the visitor's copy stays where it is and the dialog gets one of its own,
    // running the same edited code. Everything else is simply borrowed and given back.
    if (stage.querySelector('iframe')) {
      const copy = panel.cloneNode(true) as HTMLElement;
      frame.append(copy);
      copied = copy;
      const inner = copy.classList.contains('stage') ? copy : copy.querySelector<HTMLElement>('.stage');
      if (!inner) return;
      dress(copy, inner);
      home = null;
      stage = inner;
      // it has to load, lay itself out and paint before there is anything to measure
      const settle = (): void => {
        requestAnimationFrame(() => requestAnimationFrame(fit));
      };
      copy.querySelector('iframe')?.addEventListener('load', settle);
      window.setTimeout(settle, 700);
      return;
    }

    const panelBox = panel.getBoundingClientRect();
    const keep = document.createElement('div');
    keep.style.cssText = `width:${panelBox.width}px;height:${panelBox.height}px`;
    home = {
      node: panel,
      style: panel.getAttribute('style') ?? '',
      inner: stage,
      innerStyle: stage.getAttribute('style') ?? '',
      parent: panel.parentNode!,
      hold: keep,
    };
    home.parent.insertBefore(keep, panel);
    frame.append(panel);
    dress(panel, stage);
  };

  const unmount = (): void => {
    // the dialog's own copy of an edited model is the dialog's to throw away
    if (copied) {
      copied.remove();
      copied = null;
      return;
    }
    if (!home) return;
    home.node.setAttribute('style', home.style);
    home.inner.setAttribute('style', home.innerStyle);
    delete home.inner.dataset.inMaker;
    home.parent.insertBefore(home.node, home.hold);
    home.hold.remove();
    home = null;
  };

  /**
   * How big the model is inside its stage. The site already has a knob for this — the scene is
   * zoomed by `--fit × --size` — so the slider writes --size and the model grows or shrinks the
   * way it would anywhere else on the site. 65% is the site's own framing, so that is 1.
   */
  const fit = (): void => {
    const frame = el<HTMLElement>('[data-frame]');
    if (!stage || !frame) return;
    frame.style.setProperty('--aspect', String(aspectOf() ?? shape));
    // the site's own zoom takes a third factor, so this neither fights --fit nor a demo's --size
    const zoom = (chosen().fill / 0.65).toFixed(3);
    stage.style.setProperty('--zoom', zoom);
    // an edited model lays itself out inside its own frame, which knows nothing of our variables
    const framed = stage.querySelector<HTMLIFrameElement>('iframe');
    if (framed) framed.style.zoom = zoom;
    stage.toggleAttribute('data-clear', clear());
  };

  /** Closing fades the dialog out rather than snapping it away. */
  const closeSmooth = (): void => {
    if (!dialog?.open || closing) return;
    closing = true;
    const out = dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-in' });
    void out.finished
      .catch(() => {})
      .then(() => {
        closing = false;
        dialog?.close();
      });
  };

  /* ---------- the settings column ---------- */
  const shapeSwatch = (aspect: number | null): string => {
    if (!aspect) return `<i class="maker__swatch maker__swatch--auto" aria-hidden="true"></i>`;
    const width = aspect >= 1 ? 28 : Math.round(24 * aspect);
    const height = aspect >= 1 ? Math.round(28 / aspect) : 24;
    return `<i class="maker__swatch" style="width:${width}px;height:${height}px" aria-hidden="true"></i>`;
  };

  /** Every group fills its rows: four across for four, three by two for six, otherwise one row. */
  const columnsFor = (count: number): number => (count >= 6 ? 3 : Math.min(count, 4));

  const group = <T extends string | number>(name: string, label: string, items: Choice<T>[], pick: T, swatch?: (item: Choice<T>) => string): string => `
    <fieldset class="maker__set">
      <legend>${label}</legend>
      <div class="maker__opts${items.length === 2 ? ' maker__opts--seg' : ''}" role="radiogroup" aria-label="${label}" style="--cols:${columnsFor(items.length)}">
        ${items
          .map(
            (item) => `<button type="button" role="radio" class="maker__opt" data-pick="${name}" data-value="${item.value}" aria-checked="${item.value === pick}">
              ${swatch ? swatch(item) : ''}
              <span class="maker__optText"><b>${item.label}</b><small>${item.hint}</small></span>
            </button>`,
          )
          .join('')}
      </div>
    </fieldset>`;


  const zoomSlider = (): string => `
    <fieldset class="maker__set maker__set--slider">
      <legend>Model size <span class="maker__legendHint">how much of the frame it fills</span></legend>
      <div class="maker__slider">
        <input class="maker__zoom" type="range" min="25" max="100" step="5" value="${Math.round(chosen().fill * 100)}" style="--done:${(((chosen().fill * 100) - 25) / 75) * 100}%" data-zoom aria-label="How much of the frame the model fills">
        <output data-zoom-out>${Math.round(chosen().fill * 100)}%</output>
      </div>
    </fieldset>`;

  const settingsFor = (which: Kind): string => {
    if (which === 'video') {
      return (
        group('motion', 'What to film', MOTIONS, chosen().motion) +
        group('ratio', 'Shape', VIDEO_SHAPES, chosen().ratio, (item) => shapeSwatch(ASPECT_OF[item.value])) +
        group('quality', 'Quality', QUALITIES, chosen().quality) +
        group(
          'movie',
          'File',
          clearFilms ? MOVIES : [MOVIES[0], { ...MOVIES[1], hint: 'no browser can yet' }],
          clearFilms ? chosen().movie : 'mp4',
        ) +
        zoomSlider()
      );
    }
    if (which === 'image') {
      return (
        group('imageRatio', 'Shape', IMAGE_SHAPES, chosen().imageRatio, (item) => shapeSwatch(ASPECT_OF[item.value])) +
        group('picture', 'File', PICTURES, chosen().picture) +
        group('size', 'Size', SIZES, chosen().size) +
        zoomSlider()
      );
    }
    return (
      group('paper', 'Sheet', PAPERS, chosen().paper, (item) => shapeSwatch(item.value === 'landscape' ? A4 : 1 / A4)) + zoomSlider()
    );
  };

  /* ---------- what it will be, said plainly ---------- */
  const sizeLine = (): string => {
    if (kind === 'video') {
      const aspect = ASPECT_OF[chosen().ratio] ?? 1;
      const even = (n: number): number => Math.round(n / 2) * 2;
      const width = aspect >= 1 ? even(chosen().quality * aspect) : chosen().quality;
      const height = aspect >= 1 ? chosen().quality : even(chosen().quality / aspect);
      const wrapper = backdrop() === 'transparent' ? 'WebM, see-through' : 'MP4';
      const turn = stage ? motionSeconds(stage) : 0;
      const length = chosen().motion === 'live' ? `up to ${MAX_SECONDS}s, you decide` : turn ? `${Math.min(turn, MAX_SECONDS).toFixed(1)}s of loop` : 'this model has no loop';
      return `${width} × ${height} · ${wrapper} · ${length}`;
    }
    if (kind === 'image') {
      const { width, height } = frameFor({ width: shape, height: 1 }, chosen().size, ASPECT_OF[chosen().imageRatio] ?? shape);
      return `${width} × ${height} · ${format().toUpperCase()}`;
    }
    return `A4 ${chosen().paper} · ${chosen().paper === 'landscape' ? '297 × 210' : '210 × 297'} mm · ${PRINT_SIZE} px, edge to edge`;
  };

  const caption = (text?: string): void => {
    const line = el<HTMLElement>('[data-caption]');
    if (line) line.textContent = text ?? sizeLine();
  };

  const note = (text: string): void => {
    const line = el<HTMLElement>('[data-note]');
    if (!line) return;
    line.textContent = text;
    line.hidden = !text;
  };

  /**
   * What the frame is busy with. 'over' draws a veil across it, which is right while a file is
   * being drawn and there is nothing to do; 'chip' keeps out of the way, which is what a live
   * recording needs — the model has to stay visible and playable while it is being filmed.
   */
  const working = (text: string | null, done = 0, how: 'over' | 'chip' = 'over'): void => {
    const frame = el<HTMLElement>('[data-frame]');
    if (!frame) return;
    if (text === null) {
      delete frame.dataset.busy;
      return;
    }
    frame.dataset.busy = how;
    const label = el<HTMLElement>('[data-busy-text]');
    if (label) label.textContent = text;
    const bar = el<HTMLElement>('[data-bar] i');
    if (bar) bar.style.transform = `scaleX(${done})`;
  };

  /* ---------- the foot ---------- */
  const paint = (): void => {
    if (!dialog?.open) return;
    const mine = job();
    const bar = el<HTMLElement>('[data-bar]')!;
    const actions = el<HTMLElement>('[data-actions]')!;
    bar.hidden = !busy;
    for (const chip of dialog.querySelectorAll<HTMLButtonElement>('[data-pick]')) chip.disabled = busy;
    const slider = el<HTMLInputElement>('[data-zoom]');
    if (slider) slider.disabled = busy;

    if (busy) {
      const live = kind === 'video' && chosen().motion === 'live';
      actions.innerHTML = live
        ? `<button type="button" class="btn btn--accent" data-stop>${icon('pause')} Stop and keep it</button>`
        : `<button type="button" class="btn" data-stop>Cancel</button>`;
      note(live ? 'Recording. Hover, drag and click the model in the frame — all of it is going in.' : 'Drawing it, frame by frame. This takes a few seconds.');
      return;
    }

    if (mine.blob && mine.url) {
      actions.innerHTML = `<button type="button" class="btn" data-again>Back to the model</button>
        <button type="button" class="btn btn--accent" data-save>${icon('download')} Save <small>${(mine.blob.size / 1e6).toFixed(1)} MB</small></button>`;
      note(`${mine.detail ?? ''} ${mine.kind === 'video' ? 'This is the file itself, playing here.' : 'This is the file itself.'}`);
      return;
    }

    const label = { video: chosen().motion === 'live' ? 'Start recording' : 'Make the video', image: 'Take the picture', print: 'Open the print dialog' }[kind];
    const timer = kind === 'image' || kind === 'print';
    actions.innerHTML =
      (timer ? `<button type="button" class="btn" data-timer title="Press, then put the pointer back on the model">${icon('pointer')} Take in 3s</button>` : '') +
      `<button type="button" class="btn btn--accent" data-go>${icon(TABS.find((t) => t.kind === kind)!.icon)} ${label}</button>`;
    if (mine.error) return note(`It did not work: ${mine.error}`);
    if (kind === 'video') {
      note(
        chosen().motion === 'live'
          ? `Play with the model in the frame — hover it, drag it, click it — and it is filmed as you go, up to ${MAX_SECONDS} seconds.`
          : 'The model turns once and every frame of that turn is drawn. Set the pose you want first: the film starts from it.',
      );
    } else if (kind === 'image') {
      note('The model in the frame is the real one: hover it, drag it, pause it. For a pose that only happens while the pointer is on it, use "Take in 3s" and hold it there.');
    } else {
      note('The sheet is this frame, exactly as it stands, edge to edge. For a pose that needs the pointer on the model, use "Take in 3s".');
    }
  };

  /* ---------- opening, switching tabs, closing ---------- */
  const showModel = (): void => {
    const frame = el<HTMLElement>('[data-frame]');
    if (!frame) return;
    frame.querySelector('video, img')?.remove();
    delete frame.dataset.shows;
    working(null);
    fit();
  };

  const showResult = (mine: Job): void => {
    const frame = el<HTMLElement>('[data-frame]');
    if (!frame || !mine.url) return;
    frame.querySelector('video, img')?.remove();
    frame.dataset.shows = 'file';
    working(null);
    frame.insertAdjacentHTML(
      'afterbegin',
      mine.kind === 'video' ? `<video src="${mine.url}" autoplay loop muted playsinline></video>` : `<img src="${mine.url}" alt="The picture that was just made">`,
    );
  };

  const fillDialog = (): void => {
    if (!dialog) return;
    dialog.dataset.kind = kind;
    for (const tab of dialog.querySelectorAll<HTMLElement>('[data-tab]')) tab.setAttribute('aria-selected', String(tab.dataset.tab === kind));
    el<HTMLElement>('[data-settings]')!.innerHTML = settingsFor(kind);
    const frame = el<HTMLElement>('[data-frame]')!;
    frame.dataset.shape = kind === 'print' ? 'sheet' : 'screen';
    const aspect = aspectOf();
    if (aspect) frame.style.setProperty('--aspect', String(aspect));
    const mine = job();
    if (mine.url) showResult(mine);
    else showModel();
    caption();
    paint();
  };

  const open = (button: HTMLElement, which: Kind): void => {
    const found = button.closest('.viewer__panel, .page-main, body')?.querySelector<HTMLElement>('.stage');
    if (!found) return;
    trigger = button;
    stage = found;
    kind = which;
    modelId = button.dataset.model ?? 'model';
    if (jobs.size && [...jobs.values()][0].id !== modelId) jobs.clear();
    look = stageLook(found);
    const box = found.getBoundingClientRect();
    shape = box.height > 0 ? box.width / box.height : 1;
    const title = button.dataset.title || 'this model';

    // a dialog that still holds a stage must give it back before it goes, or the model is
    // carried off the page with it and the next one opens on whatever stage is left
    unmount();
    dialog?.remove();
    dialog = document.createElement('dialog');
    dialog.className = 'maker';
    dialog.innerHTML = `
      <div class="maker__head">
        <div class="maker__tabs" role="tablist" aria-label="What to make">
          ${TABS.map(
            (tab) => `<button type="button" role="tab" class="maker__tab" data-tab="${tab.kind}" aria-selected="${tab.kind === which}">${icon(tab.icon)}<span>${tab.label}</span></button>`,
          ).join('')}
        </div>
        <button type="button" class="maker__close" data-close aria-label="Close">${icon('x')}</button>
      </div>
      <div class="maker__body">
        <div class="maker__show">
          <div class="maker__frame" data-frame data-shape="screen" style="--aspect:1" aria-label="${title}, in the frame it will be saved in">
            <div class="maker__live" data-live></div>
            <div class="maker__busy"><span class="maker__ring"></span><b data-busy-text>Working…</b></div>

          </div>
          <p class="maker__caption" data-caption></p>
        </div>
        <div class="maker__settings" data-settings></div>
      </div>
      <div class="maker__foot">
        <div class="maker__bar" data-bar hidden><i></i></div>
        <p class="maker__note" data-note hidden></p>
        <div class="maker__actions" data-actions></div>
      </div>`;
    document.body.append(dialog);
    dialog.addEventListener('cancel', (e) => {
      // Escape: let it play out rather than vanish
      if (closing) return;
      e.preventDefault();
      closeSmooth();
    });
    dialog.addEventListener('close', () => {
      stopper?.abort();
      unmount();
    });
    dialog.showModal();
    mount();
    fillDialog();
    fit();
  };

  /* ---------- making things ---------- */
  const save = (): void => {
    const mine = job();
    if (!mine.url || !mine.name) return;
    const link = document.createElement('a');
    link.href = mine.url;
    link.download = mine.name;
    link.click();
    track(`download/${mine.id}/${mine.kind}`);
    showThanks(trigger);
  };

  /** Everything a capture needs from the dialog: how big, which file, and the backdrop. */
  const shot = (size: number, format: ImageFormat = 'png'): Parameters<typeof captureImage>[1] => ({
    backdrop: backdrop(),
    look: paintNow(),
    format,
    size,
    saveAspect: aspectOf() ?? undefined,
  });

  const takePicture = async (): Promise<void> => {
    if (!stage) return;
    const mine: Job = { kind: 'image', id: modelId, progress: 0 };
    jobs.set('image', mine);
    busy = true;
    paint();
    working('Drawing the picture…', 0.4);
    try {
      mine.blob = await captureImage(stage, shot(chosen().size, format()));
      mine.url = URL.createObjectURL(mine.blob);
      mine.name = `css-3d-lab-${mine.id}.${format() === 'jpeg' ? 'jpg' : 'png'}`;
      const bitmap = await createImageBitmap(mine.blob);
      mine.detail = `${bitmap.width} × ${bitmap.height}, ${format().toUpperCase()}.`;
      bitmap.close();
      track(`image/${mine.id}`);
    } catch (err) {
      mine.error = err instanceof Error ? err.message : 'something went wrong';
    }
    busy = false;
    working(null);
    if (mine.url) showResult(mine);
    paint();
  };

  const makeVideo = async (): Promise<void> => {
    if (!stage) return;
    if (!canRecord()) {
      job().error = 'this browser cannot make videos yet — Chrome, Edge and Safari 17+ can';
      return paint();
    }
    const mine: Job = { kind: 'video', id: modelId, progress: 0 };
    jobs.set('video', mine);
    const live = chosen().motion === 'live';
    stopper = new AbortController();
    busy = true;
    paint();
    working(live ? 'Recording — 0.0s' : 'Drawing the loop… 0%', 0, live ? 'chip' : 'over');
    const pill = trigger;
    pill?.classList.add('is-working');

    try {
      const made: Recording = live
        ? await recordLive({
            stage,
            ratio: chosen().ratio,
            quality: chosen().quality,
            backdrop: backdrop(),
            look: paintNow(),
            lookNow: () => paintNow(),
            fill: chosen().fill,
            seconds: MAX_SECONDS,
            stop: stopper.signal,
            onTick: (seconds) => {
              mine.progress = Math.min(1, seconds / MAX_SECONDS);
              working(`Recording — ${seconds.toFixed(1)}s of ${MAX_SECONDS}s`, mine.progress, 'chip');
              pill?.style.setProperty('--done', String(mine.progress));
            },
          })
        : await recordModel({
            stage,
            ratio: chosen().ratio,
            quality: chosen().quality,
            backdrop: backdrop(),
            look: paintNow(),
            fill: chosen().fill,
            signal: stopper.signal,
            onProgress: (done) => {
              mine.progress = done;
              working(`Drawing the loop… ${Math.round(done * 100)}%`, done);
              pill?.style.setProperty('--done', String(done));
            },
          });
      mine.blob = made.blob;
      mine.url = URL.createObjectURL(made.blob);
      mine.progress = 1;
      mine.name = `css-3d-lab-${mine.id}-${chosen().ratio.replace(':', 'x')}.${made.extension}`;
      mine.detail = live
        ? `${made.width} × ${made.height}, ${made.seconds.toFixed(1)}s filmed live.`
        : made.loops
          ? `${made.width} × ${made.height}, ${made.seconds.toFixed(1)}s, loops seamlessly.`
          : `${made.width} × ${made.height}, ${made.seconds.toFixed(1)}s — the model's turn takes ${made.turn.toFixed(1)}s, so this one does not join up.`;
      track(`${live ? 'video-live' : 'video'}/${mine.id}`);
      pill?.classList.add('is-ready');
    } catch (err) {
      mine.error = err instanceof Error && err.name !== 'AbortError' ? err.message : mine.error;
    }
    busy = false;
    stopper = null;
    pill?.classList.remove('is-working');
    working(null);
    if (mine.url) showResult(mine);
    else showModel();
    paint();
  };

  const doPrint = async (): Promise<void> => {
    if (!stage) return;
    busy = true;
    paint();
    working('Drawing the sheet…', 0.4);
    try {
      const blob = await captureImage(stage, shot(PRINT_SIZE));
      const url = URL.createObjectURL(blob);
      print?.(stage, { paper: chosen().paper, fill: chosen().fill, picture: url });
      track(`print-snapshot/${modelId}`);
      showThanks(trigger);
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    } catch (err) {
      job().error = err instanceof Error ? err.message : 'something went wrong';
    }
    busy = false;
    working(null);
    paint();
  };

  /**
   * A model that only does something while the pointer is on it cannot be caught by pressing a
   * button — the pointer has to leave it to do the pressing. So the shot can be set going a few
   * seconds ahead: press, put the pointer back on the model, hold the pose, and it is taken there.
   */
  const countdown = (seconds: number, then: () => void): void => {
    if (busy) return;
    let left = seconds;
    working(`Taking it in ${left}…`, 0);
    const tick = window.setInterval(() => {
      left -= 1;
      if (left > 0) {
        working(`Taking it in ${left}…`, 1 - left / seconds);
        return;
      }
      window.clearInterval(tick);
      if (!dialog?.open) return working(null);
      working('Drawing it…', 1);
      then();
    }, 1000);
  };

  const go = (): void => {
    if (kind === 'image') return void takePicture();
    if (kind === 'video') return void makeVideo();
    void doPrint();
  };

  /* ---------- events ---------- */
  document.addEventListener('input', (e) => {
    const slider = (e.target as HTMLElement).closest<HTMLInputElement>('[data-zoom]');
    if (!slider || busy || !dialog?.open) return;
    chosen().fill = Number(slider.value) / 100;
    const out = el<HTMLElement>('[data-zoom-out]');
    if (out) out.textContent = `${slider.value}%`;
    slider.style.setProperty('--done', `${((Number(slider.value) - 25) / 75) * 100}%`);
    fit();
  });

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const button = target.closest<HTMLElement>('[data-make], [data-print], [data-act="print"]');
    if (button) return open(button, (button.dataset.make ?? 'print') as Kind);

    if (!dialog?.open) return;
    if (target.closest('[data-stop]')) return stopper?.abort();
    if (busy) return;

    const tab = target.closest<HTMLElement>('[data-tab]');
    if (tab && tab.dataset.tab !== kind) {
      kind = tab.dataset.tab as Kind;
      fillDialog();
      fit();
      return;
    }

    const chip = target.closest<HTMLElement>('[data-pick]');
    if (chip) {
      const name = chip.dataset.pick as keyof Setup;
      const raw = chip.dataset.value!;
      (chosen()[name] as unknown) = /^\d+$/.test(raw) ? Number(raw) : raw;
      for (const other of dialog.querySelectorAll<HTMLElement>(`[data-pick="${name}"]`)) other.setAttribute('aria-checked', String(other === chip));
      const frame = el<HTMLElement>('[data-frame]')!;
      const aspect = aspectOf();
      if (aspect) frame.style.setProperty('--aspect', String(aspect));
      // a file made with the old settings is no longer what these settings say
      const mine = job();
      if (mine.url) URL.revokeObjectURL(mine.url);
      jobs.delete(kind);
      showModel();
      caption();
      paint();
      return;
    }

    // Pause, Hold hover, the dots, light or dark: the panel's own switches, doing their own work.
    // Whatever they changed about the backdrop is read back off the stage and painted in the frame.
    if (stage && target.closest('[data-live]')) return; // the stage's own switches, doing their own work

    if (target.closest('[data-close]')) return closeSmooth();
    if (target.closest('[data-save]')) return save();
    if (target.closest('[data-again]')) {
      const mine = job();
      if (mine.url) URL.revokeObjectURL(mine.url);
      jobs.delete(kind);
      showModel();
      paint();
      return;
    }
    if (target.closest('[data-timer]')) return countdown(3, go);
    if (target.closest('[data-go]')) return go();
    if (target === dialog) closeSmooth(); // the dark area around it
  });

  window.addEventListener('resize', () => {
    if (dialog?.open && !busy) fit();
  });
}
