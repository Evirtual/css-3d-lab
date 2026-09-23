import { forkPreview, syncPreview, type Preview } from './preview';
import { icon } from './icons';
import {
  ASPECT_OF,
  canRecord,
  canRecordClear,
  captureImage,
  frameFor,
  MAX_SECONDS,
  motionSeconds,
  mp4Qualities,
  recordLive,
  recordModel,
  stageLook,
  tooBig,
  type Backdrop,
  type ImageFormat,
  type ImageRatio,
  type Paint,
  type Quality,
  type Ratio,
  type Recording,
} from './record';
import type { PrintSetup } from './models/snippet-utils';
import { fileName, shapeTag } from './file-name';
import { showThanks } from './thanks';
import { fillsCanvas, MIN_FILL, watchFillLimit } from './fill-limit';

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
  /** Shown but not to be picked: what it names cannot be had here. */
  off?: boolean;
}

const A4 = 297 / 210;
/** A printed snapshot is 2400 px on its long side — about 200 dots per inch on A4. */
const PRINT_SIZE = 2400;
/**
 * How much of the frame a model fills when nothing has been touched: the band the view contract
 * gives every model is 70vmin, seven tenths of the canvas's short side (docs/VIEW-CONTRACT.md).
 * So the slider sits at 70% to start with and the file is exactly what the frame shows; moving it
 * is the visitor deciding to depart from that.
 */
const CONTRACT_FILL = 0.7;

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
  // fill: how much of the frame's short side the model takes. It starts at the contract's own
  // 70%, so an untouched export is exactly what the frame shows; the slider goes from far away
  // (25%) to filling the frame edge to edge (100%).
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
    fill: CONTRACT_FILL,
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
  let copiedPreview: Preview | undefined;
  /**
   * The Model size slider's top end for the model in the frame, in percent (fill-limit.ts, the
   * View zoom's own math): the most it can fill and still clear every edge by 4vmin. Null until
   * the model is measured; followed while the dialog holds a stage.
   */
  let fillTop: number | null = null;
  let unfollow: (() => void) | null = null;
  let closing = false;
  /** Which opening this is: a close that was still fading out must not shut the next one. */
  let opened = 0;
  /** Whether this browser can encode a see-through film. It cannot, today; it is asked all the same. */
  let clearFilms = false;
  void canRecordClear().then((can) => {
    clearFilms = can;
  });
  /**
   * The qualities this browser can write an MP4 at. Until it has answered, every one is offered
   * (and one that then fails says why); once it has, one it cannot make is shown but not offered.
   */
  let films: Set<Quality> | null = null;
  void mp4Qualities(QUALITIES.map((q) => q.value)).then((can) => {
    films = can;
    if (films.has(setups.video.quality)) return;
    const fallback = [...films].filter((q) => q < setups.video.quality).pop();
    if (fallback) setups.video.quality = fallback;
    // the dialog may already be open on the video tab: its chips change in place
    if (dialog?.open && kind === 'video' && !busy) {
      el<HTMLElement>('[data-settings]')!.innerHTML = settingsFor('video');
      caption();
      paint();
    }
  });
  const qualities = (): Choice<Quality>[] =>
    QUALITIES.map((q) => (films && !films.has(q.value) ? { ...q, hint: 'not in this browser', off: true } : q));

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
    // The whole stage panel comes across, not just the model: its Pause switch,
    // its dots and its light or dark — the same controls, in the same place, doing the same thing.
    // They are wired to the document and find their stage by looking upwards, so they carry on
    // working wherever the panel is.
    const panel = stage.closest<HTMLElement>('.stage-wrap') ?? stage;

    // An edited model runs in a frame of its own, and a frame reloads the instant it is moved in
    // the page — so the visitor's copy stays where it is and the dialog gets one of its own,
    // running the same edited code. Everything else is simply borrowed and given back.
    if (stage.querySelector('iframe') && !(typeof frame.moveBefore === 'function')) {
      const copy = panel.cloneNode(true) as HTMLElement;
      const originalFrame = stage.querySelector('iframe')!;
      copiedPreview = forkPreview(originalFrame);
      if (copiedPreview) copy.querySelector('iframe')!.replaceWith(copiedPreview.frame);
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
    if (typeof frame.moveBefore === 'function') frame.moveBefore(panel, null);
    else frame.append(panel);
    dress(panel, stage);
  };

  /** The slider says the top end, and a value above it comes down to it. */
  const onFillTop = (top: number | null): void => {
    fillTop = top;
    // a film being made keeps the size it started with; the next fit brings it within
    if (!dialog?.open || busy || top === null) return;
    const over = chosen().fill * 100 > top;
    if (over) chosen().fill = top / 100;
    showZoom();
    if (over) fit();
  };
  /** The slider, its figure and its hint say the size and the top end now. */
  const showZoom = (): void => {
    const slider = el<HTMLInputElement>('.maker__settings [data-zoom]');
    if (slider) {
      slider.max = String(zoomTop());
      slider.value = String(Math.round(chosen().fill * 100));
      slider.style.setProperty('--done', zoomDone());
    }
    const out = el<HTMLElement>('[data-zoom-out]');
    if (out) out.textContent = `${Math.round(chosen().fill * 100)}%`;
    const hint = el<HTMLElement>('[data-zoom-hint]');
    if (hint) hint.textContent = zoomHint();
  };
  const follow = (): void => {
    unfollow?.();
    unfollow = stage ? watchFillLimit(stage, onFillTop) : null;
  };

  const unmount = (): void => {
    unfollow?.();
    unfollow = null;
    fillTop = null;
    // the dialog's own copy of an edited model is the dialog's to throw away
    if (copied) {
      copiedPreview?.close();
      copiedPreview = undefined;
      copied.remove();
      copied = null;
      return;
    }
    if (!home) return;
    home.node.setAttribute('style', home.style);
    home.inner.setAttribute('style', home.innerStyle);
    delete home.inner.dataset.inMaker;
    // its place may be gone (the view it came from has closed): then there is nowhere to go back to
    if (home.hold.isConnected) {
      if (home.parent instanceof Element && typeof home.parent.moveBefore === 'function') home.parent.moveBefore(home.node, home.hold);
      else home.parent.insertBefore(home.node, home.hold);
    }
    home.hold.remove();
    home = null;
  };

  /**
   * The frame takes the shape that was picked, the stage fills the frame, and the model lays
   * itself out in that canvas — which is the whole of the view contract. Nothing here fits,
   * insets or letterboxes a model: a 9:16 picture is the model's canvas at 9:16.
   *
   * The one thing the visitor may change is how big the model is in that canvas, and `--zoom`
   * says so: 1 is the 70vmin band the contract gives, and the preview (which runs the model in a
   * frame of its own) makes the scene that much bigger (a zoom) or smaller (a scale) about the
   * canvas's middle. The export reads either back out of the model's computed styles, so the file
   * is what the frame showed.
   */
  const fit = (): void => {
    const frame = el<HTMLElement>('[data-frame]');
    if (!stage || !frame) return;
    frame.style.setProperty('--aspect', String(aspectOf() ?? shape));
    // never past the top end (a film being made keeps the size it started with)
    if (fillTop !== null && !busy && chosen().fill * 100 > fillTop) {
      chosen().fill = fillTop / 100;
      showZoom();
    }
    stage.style.setProperty('--zoom', (chosen().fill / CONTRACT_FILL).toFixed(4));
    // the model runs in a frame of its own, which knows nothing of our variables: hand it over
    syncPreview(stage);
    stage.toggleAttribute('data-clear', clear());
  };

  /** Closing fades the dialog out rather than snapping it away. */
  const closeSmooth = (): void => {
    if (!dialog?.open || closing) return;
    closing = true;
    const mine = opened;
    const out = dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-in' });
    void out.finished
      .catch(() => {})
      .then(() => {
        closing = false;
        if (mine === opened) dialog?.close();
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
            (item) => `<button type="button" role="radio" class="maker__opt" data-pick="${name}" data-value="${item.value}" aria-checked="${item.value === pick}"${item.off ? ' data-off disabled' : ''}>
              ${swatch ? swatch(item) : ''}
              <span class="maker__optText"><b>${item.label}</b><small>${item.hint}</small></span>
            </button>`,
          )
          .join('')}
      </div>
    </fieldset>`;


  /** The slider's range: 25% up to the top end for this model and frame (100% until measured). */
  const zoomTop = (): number => fillTop ?? 100;
  const zoomDone = (): string => {
    const top = zoomTop();
    return `${top > MIN_FILL ? ((Math.round(chosen().fill * 100) - MIN_FILL) / (top - MIN_FILL)) * 100 : 100}%`;
  };
  // a full-canvas scene stops at its own size: bigger would only crop it
  const zoomHint = (): string => `how much of the frame it fills${fillTop === null ? '' : `, max ${fillTop}%${stage && fillsCanvas(stage) ? ': it fills the canvas' : ''}`}`;
  const zoomSlider = (): string => `
    <fieldset class="maker__set maker__set--slider">
      <legend>Model size <span class="maker__legendHint" data-zoom-hint>${zoomHint()}</span></legend>
      <div class="maker__slider">
        <input class="maker__zoom" type="range" min="25" max="${zoomTop()}" step="5" value="${Math.round(chosen().fill * 100)}" style="--done:${zoomDone()}" data-zoom aria-label="How much of the frame the model fills">
        <output data-zoom-out>${Math.round(chosen().fill * 100)}%</output>
      </div>
    </fieldset>`;

  const settingsFor = (which: Kind): string => {
    if (which === 'video') {
      // a model that does not move on its own has no loop to film: only live filming is left
      const still = stage ? motionSeconds(stage) === 0 : false;
      if (still) chosen().motion = 'live';
      return (
        group('motion', 'What to film', still ? [{ ...MOTIONS[0], hint: 'nothing moves on its own', off: true }, MOTIONS[1]] : MOTIONS, chosen().motion) +
        group('ratio', 'Shape', VIDEO_SHAPES, chosen().ratio, (item) => shapeSwatch(ASPECT_OF[item.value])) +
        group('quality', 'Quality', qualities(), chosen().quality) +
        group(
          'movie',
          'File',
          clearFilms ? MOVIES : [MOVIES[0], { ...MOVIES[1], hint: 'no browser can yet', off: true }],
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
  /**
   * The file is drawn from the model's canvas at no less than its own size, within the render
   * service's pixel budget. A canvas too big for that budget at this size is said so here, before
   * the button is pressed, rather than drawn smaller and stretched to the size the caption names.
   */
  const tooBigNote = (frame: { width: number; height: number }): string => {
    const body = stage?.querySelector('iframe')?.contentDocument?.body;
    const why = body ? tooBig({ width: body.clientWidth, height: body.clientHeight }, frame) : null;
    return why ? ' · too big to draw from this canvas: pick a smaller size' : '';
  };
  const sizeLine = (): string => {
    if (kind === 'video') {
      const aspect = ASPECT_OF[chosen().ratio] ?? 1;
      const even = (n: number): number => Math.round(n / 2) * 2;
      const width = aspect >= 1 ? even(chosen().quality * aspect) : chosen().quality;
      const height = aspect >= 1 ? chosen().quality : even(chosen().quality / aspect);
      const wrapper = backdrop() === 'transparent' ? 'WebM, see-through' : 'MP4';
      const turn = stage ? motionSeconds(stage) : 0;
      const length = chosen().motion === 'live' ? `up to ${MAX_SECONDS}s, you decide` : turn ? `${Math.min(turn, MAX_SECONDS).toFixed(1)}s of loop` : 'this model has no loop';
      return `${width} × ${height} · ${wrapper} · ${length}${tooBigNote({ width, height })}`;
    }
    if (kind === 'image') {
      const { width, height } = frameFor({ width: shape, height: 1 }, chosen().size, ASPECT_OF[chosen().imageRatio] ?? shape);
      return `${width} × ${height} · ${format().toUpperCase()}${tooBigNote({ width, height })}`;
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
  const working = (text: string | null): void => {
    const label = el<HTMLElement>('[data-busy-text]');
    if (label && text !== null) label.textContent = text;
  };

  /* ---------- the foot ---------- */
  const paint = (): void => {
    if (!dialog?.open) return;
    const mine = job();
    const actions = el<HTMLElement>('[data-actions]')!;
    // the settings are for the model in the frame: while a file is being made, or is showing in
    // the frame's place, changing them would change nothing that can be seen — so they wait
    const locked = busy || Boolean(mine.blob && mine.url);
    for (const chip of dialog.querySelectorAll<HTMLButtonElement>('[data-pick]')) chip.disabled = locked || chip.hasAttribute('data-off');
    const slider = el<HTMLInputElement>('[data-zoom]');
    if (slider) slider.disabled = locked;
    el<HTMLElement>('[data-settings]')?.toggleAttribute('data-locked', locked);

    if (busy) {
      // the progress is the pill itself: what is happening, and the one thing that can be done
      const live = kind === 'video' && chosen().motion === 'live';
      const stoppable = kind === 'video';
      actions.innerHTML = `<button type="button" class="btn${live ? ' btn--accent' : ''} maker__working"${stoppable ? ' data-stop' : ' disabled'}><span class="maker__ring"></span><b data-busy-text>${live ? 'Recording' : 'Drawing…'}</b>${stoppable ? `<small>${live ? 'stop and keep it' : 'cancel'}</small>` : ''}</button>`;
      note(live ? 'Recording — hover, drag and click the model; it all goes in.' : 'Drawing every frame…');
      return;
    }

    if (mine.blob && mine.url) {
      actions.innerHTML = `<button type="button" class="btn" data-again>Back to the model</button>
        <button type="button" class="btn btn--accent" data-save>${icon('download')} Save <small>${(mine.blob.size / 1e6).toFixed(1)} MB</small></button>`;
      note(`${mine.detail ?? ''} This is the file.`);
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
          ? `Play with the model; it is filmed as you go, up to ${MAX_SECONDS}s.`
          : 'One full turn, every frame drawn, starting from this pose.',
      );
    } else if (kind === 'image') {
      note('Hover, drag or pause the model, then take it. "Take in 3s" gives you time to hold a hover.');
    } else {
      note('Prints this frame edge to edge. "Take in 3s" gives you time to hold a hover.');
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
    opened++;
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
          <div class="maker__box"><div class="maker__frame" data-frame data-shape="screen" style="--aspect:1" aria-label="${title}, in the frame it will be saved in">
            <div class="maker__live" data-live></div>
          </div></div>
          <p class="maker__caption" data-caption></p>
        </div>
        <div class="maker__settings" data-settings></div>
      </div>
      <div class="maker__foot">
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
    follow();
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
    working('Drawing the picture…');
    try {
      mine.blob = await captureImage(stage, shot(chosen().size, format()));
      mine.url = URL.createObjectURL(mine.blob);
      // the name carries every choice that changed this picture: its shape, its size, and whether
      // the backdrop was left out — so the next one, taken at other settings, sits beside it
      mine.name = fileName(mine.id, format() === 'jpeg' ? 'jpg' : 'png', shapeTag(chosen().imageRatio), `${chosen().size}px`, clear() && 'clear');
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
    working(live ? 'Recording 0.0s' : 'Drawing 0%');
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
            seconds: MAX_SECONDS,
            stop: stopper.signal,
            onTick: (seconds) => {
              mine.progress = Math.min(1, seconds / MAX_SECONDS);
              working(`Recording ${seconds.toFixed(1)}s of ${MAX_SECONDS}`);
              pill?.style.setProperty('--done', String(mine.progress));
            },
            // the take is drawn once the recording has stopped, which is the part that takes time
            onProgress: (done) => {
              mine.progress = done;
              working(`Drawing ${Math.round(done * 100)}%`);
              pill?.style.setProperty('--done', String(done));
            },
          })
        : await recordModel({
            stage,
            ratio: chosen().ratio,
            quality: chosen().quality,
            backdrop: backdrop(),
            look: paintNow(),
            signal: stopper.signal,
            onProgress: (done) => {
              mine.progress = done;
              working(`Drawing ${Math.round(done * 100)}%`);
              pill?.style.setProperty('--done', String(done));
            },
          });
      mine.blob = made.blob;
      mine.url = URL.createObjectURL(made.blob);
      mine.progress = 1;
      mine.name = fileName(mine.id, made.extension, shapeTag(chosen().ratio), `${chosen().quality}p`, live && 'live', clear() && 'clear');
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
    working('Drawing the sheet…');
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
    // the count runs in the pill, like any other progress
    busy = true;
    paint();
    let left = seconds;
    working(`Taking it in ${left}…`);
    const tick = window.setInterval(() => {
      left -= 1;
      if (left > 0) {
        working(`Taking it in ${left}…`);
        return;
      }
      window.clearInterval(tick);
      busy = false;
      if (!dialog?.open) return;
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
    slider.style.setProperty('--done', zoomDone());
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

    // Pause, the dots, light or dark: the panel's own switches, doing their own work.
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
