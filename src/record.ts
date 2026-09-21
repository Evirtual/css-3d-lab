import { ArrayBufferTarget as Mp4Target, Muxer as Mp4Muxer } from 'mp4-muxer';
import { ArrayBufferTarget as WebmTarget, Muxer as WebmMuxer } from 'webm-muxer';
import { captureScene, captureSource, poseChange, poseOf, type PoseChange } from './capture-scene';
import { renderedFrames } from './capture-client';

export type Ratio = '9:16' | '1:1' | '16:9';
export type Backdrop = 'stage' | 'dark' | 'light' | 'transparent';
/** The video's short side: 480p is small and quick, 4K is for a big screen. */
export type Quality = 480 | 720 | 1080 | 2160;
export type ImageFormat = 'png' | 'jpeg';
/** The shape of a saved picture: 'auto' keeps the model view's own shape, the rest are fixed. */
export type ImageRatio = 'auto' | '1:1' | '4:3' | '3:2' | '16:9' | '9:16';

/** Each named shape as width ÷ height; 'auto' has none, so the model view's shape is kept. */
export const ASPECT_OF: Record<ImageRatio, number | null> = { auto: null, '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9, '9:16': 9 / 16 };

export interface RecordOptions {
  stage: HTMLElement;
  ratio: Ratio;
  backdrop: Backdrop;
  /** The backdrop to paint, ready-made ('none' for see-through). Left out, the stage is asked. */
  look?: Paint | 'none';
  quality?: Quality;
  /** 0 → 1 while the frames are drawn and encoded. */
  onProgress?: (done: number) => void;
  signal?: AbortSignal;
}

export interface Recording {
  blob: Blob;
  extension: 'mp4' | 'webm';
  width: number;
  height: number;
  seconds: number;
  /** False when the model's turn is longer than a video may be: the end does not meet the start. */
  loops: boolean;
  /** How long one whole turn takes, even when the video is shorter. */
  turn: number;
}

/**
 * The frame, from the shape and the quality: the short side is the quality, and it stays even.
 * The model's canvas is already this shape — the dialog gives the stage the shape that was picked,
 * and the model lays itself out in whatever canvas it is given — so the frame IS that canvas,
 * drawn at the size asked for.
 */
const frameSize = (ratio: Ratio, quality: Quality): { width: number; height: number } => {
  const aspect = ASPECT_OF[ratio] ?? 1;
  const even = (n: number): number => Math.round(n / 2) * 2;
  return aspect >= 1 ? { width: even(quality * aspect), height: quality } : { width: quality, height: even(quality / aspect) };
};
const FPS = 30;
/** How much of a live take may be kept before it is drawn: the service takes 8 MB in one piece. */
const TAKE_LIMIT = 6 * 1024 * 1024;
/** How long any video may be. A whole loop below this joins up; anything longer is cut here. */
export const MAX_SECONDS = 30;

/** Is there any way to encode a video in this browser? */
export const canRecord = (): boolean => typeof VideoEncoder !== 'undefined' && typeof createImageBitmap !== 'undefined';

/** Can it encode one that is see-through? (No browser can, at the time of writing — but ask.) */
export async function canRecordClear(): Promise<boolean> {
  if (!canRecord()) return false;
  try {
    const support = await VideoEncoder.isConfigSupported({ codec: 'vp09.00.10.08', width: 480, height: 854, bitrate: 1e6, framerate: 30, alpha: 'keep' });
    return Boolean(support.supported);
  } catch {
    return false;
  }
}


const isPaint = (v: string): boolean => Boolean(v) && !['none', 'transparent', 'rgba(0, 0, 0, 0)'].includes(v);
export interface Paint {
  color: string;
  /** The stage's dot grid, when it shows one: colour, dot radius and spacing in stage pixels. */
  dots?: { color: string; radius: number; gap: number };
}

/** The first colour stop of a radial-gradient, brackets and all (`color(srgb …)` has both). */
function firstStop(image: string): string | null {
  const at = image.indexOf('radial-gradient(');
  if (at < 0) return null;
  let depth = 0;
  let out = '';
  for (let i = at + 'radial-gradient('.length; i < image.length; i++) {
    const ch = image[i];
    if (ch === '(') depth++;
    else if (ch === ')' && depth-- === 0) break;
    else if (ch === ',' && depth === 0) break;
    out += ch;
  }
  return out.trim() || null;
}

/** Can the canvas actually paint with this colour? An unusable one would silently keep the last. */
function paintable(color: string): boolean {
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.fillStyle = '#000';
  probe.fillStyle = color;
  return probe.fillStyle !== '#000' || /^(#0{3,8}|black|rgba?\(0, ?0, ?0(, ?1)?\))$/i.test(color.trim());
}

/** What the stage itself shows behind the model: its colour and, when it has them, its dots. */
export const stageLook = (stage: HTMLElement): Paint | null => backdropOf(stage, 'stage');

/** The backdrop to paint behind the model: what the stage itself shows, unless asked otherwise. */
function backdropOf(stage: HTMLElement, backdrop: Backdrop): Paint | null {
  if (backdrop === 'transparent') return null;
  if (backdrop === 'dark') return { color: '#0b0d18' };
  if (backdrop === 'light') return { color: '#f3f4fc' };
  const own = getComputedStyle(stage);
  const color = isPaint(own.backgroundColor) ? own.backgroundColor : '#0b0d18';
  // The dots are a repeating radial gradient, on the stage itself or on its ::before layer. The
  // canvas cannot use a CSS gradient, so they are drawn as circles from the same numbers.
  for (const style of [getComputedStyle(stage, '::before'), own]) {
    if (style.display === 'none' || !style.backgroundImage.includes('radial-gradient')) continue;
    const stop = firstStop(style.backgroundImage);
    if (!stop) continue;
    // the first colour stop is "<colour> <radius>"; the colour may itself be a colour() with
    // brackets and spaces in it, so the radius is taken off the end rather than the colour guessed
    const split = stop.match(/^(.*?)\s+([\d.]+)px$/);
    const dotColor = (split?.[1] ?? stop).trim();
    const radius = parseFloat(split?.[2] ?? '0');
    const gap = parseFloat(style.backgroundSize);
    if (paintable(dotColor) && radius > 0 && gap > 1) return { color, dots: { color: dotColor, radius, gap } };
  }
  return { color };
}

/**
 * One picture of the model as it stands: the same drawing as a video frame, at the shape asked
 * for and big enough to use anywhere (its longest side is `size`). Fast, so it needs no dialog.
 */
export interface ImageOptions {
  backdrop?: Backdrop;
  format?: ImageFormat;
  /** The picture's longest side in pixels. */
  size?: number;
  /** The backdrop to paint, ready-made ('none' for see-through). Left out, the stage is asked. */
  look?: Paint | 'none';
  /** The shape to save at, width ÷ height. Left out, the canvas's own shape is kept. */
  saveAspect?: number;
}

/** The file's size in pixels: `size` on the long side, at the shape asked for or the canvas's own. */
export function frameFor(canvas: { width: number; height: number }, size: number, aspect?: number): { width: number; height: number } {
  if (!(canvas.width > 0) || !(canvas.height > 0)) throw new Error('this model is not on screen, so there is nothing to draw');
  const shape = aspect && aspect > 0 ? aspect : canvas.width / canvas.height;
  const even = (n: number): number => Math.max(2, Math.round(n / 2) * 2);
  return shape >= 1 ? { width: even(size), height: even(size / shape) } : { width: even(size * shape), height: even(size) };
}

/**
 * One frame painted: the backdrop, then the model's canvas over the whole of it.
 *
 * Nothing is fitted into the frame here and nothing is placed inside it. The canvas already IS
 * the shape of the file — the dialog gives the stage the shape that was picked and the model
 * lays itself out in it, which is what the view contract is for — so all that is left is to draw
 * that canvas at the file's size. Rounding a canvas to whole pixels leaves it a fraction off the
 * exact shape; the canvas covers the frame rather than leaving a border, so the model's own
 * proportions are never stretched to make up the difference.
 */
function paintFrame(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  canvas: { width: number; height: number },
  frame: { width: number; height: number },
  paint: Paint | null,
): void {
  ctx.clearRect(0, 0, frame.width, frame.height);
  if (paint) {
    ctx.fillStyle = paint.color;
    ctx.fillRect(0, 0, frame.width, frame.height);
    // the same grid the stage shows, at the size the picture is: the stage's own dots, no denser
    paintDots(ctx, paint, frame.width, frame.height, frame.width / (canvas.width || frame.width));
  }
  const scale = Math.max(frame.width / img.width, frame.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (frame.width - w) / 2, (frame.height - h) / 2, w, h);
}

/** The backdrop for this capture: the one handed in, or the one the stage is showing. */
const paintOf = (stage: HTMLElement, backdrop: Backdrop, look?: Paint | 'none'): Paint | null => {
  if (look === 'none') return null;
  return look ?? backdropOf(stage, backdrop);
};

/** The stage's dot grid, drawn as circles at the picture's scale. */
function paintDots(ctx: CanvasRenderingContext2D, paint: Paint, width: number, height: number, scale: number): void {
  if (!paint.dots) return;
  const gap = paint.dots.gap * scale;
  const radius = paint.dots.radius * scale;
  ctx.fillStyle = paint.dots.color;
  for (let y = gap / 2; y < height; y += gap) {
    for (let x = gap / 2; x < width; x += gap) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

interface OpenVideo {
  encoder: VideoEncoder;
  /** What the encoder complained about, if anything: it says so on its own callback. */
  readonly trouble: Error | null;
  finish: () => Promise<Blob>;
}

/** An encoder and a container ready for frames of this size, and the way to close them off. */
async function openVideo(width: number, height: number, transparent: boolean): Promise<OpenVideo> {
  // H.264 in an MP4 plays everywhere, but it cannot be see-through: a transparent video is VP9
  // in a WebM instead (Chrome, Edge and Firefox play it; most editors take it).
  const codec = transparent ? 'vp09.00.10.08' : 'avc1.4d0028';
  const wanted: VideoEncoderConfig = { codec, width, height, bitrate: 8e6, framerate: FPS, alpha: transparent ? 'keep' : 'discard' };
  const support = await VideoEncoder.isConfigSupported(wanted);
  if (!support.supported) {
    throw new Error(
      transparent
        ? 'this browser cannot encode a see-through video (no browser can yet) — MP4 keeps the backdrop'
        : 'this browser cannot encode that format',
    );
  }
  const target = transparent ? new WebmTarget() : new Mp4Target();
  // 'offset' because a live recording's first frame is taken a few milliseconds in, not at zero,
  // and a container insists its first frame starts the clock
  const muxer = transparent
    ? new WebmMuxer({ target: target as WebmTarget, video: { codec: 'V_VP9', width, height, frameRate: FPS }, firstTimestampBehavior: 'offset' })
    : new Mp4Muxer({ target: target as Mp4Target, video: { codec: 'avc', width, height }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  // The encoder reports its trouble on a callback of its own. Throwing from there only closes the
  // codec and the next encode complains about that instead, so it is kept and thrown where the
  // frames are, in the visitor's own words.
  let failed: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      failed = err instanceof Error ? err : new Error(String(err));
    },
  });
  encoder.configure(wanted);
  return {
    encoder,
    get trouble(): Error | null {
      return failed;
    },
    finish: async (): Promise<Blob> => {
      if (failed) throw failed;
      await encoder.flush();
      muxer.finalize();
      return new Blob([(target as Mp4Target | WebmTarget).buffer!], { type: transparent ? 'video/webm' : 'video/mp4' });
    },
  };
}

/** Snapshot of one synchronously sampled pose, rendered by Chromium. */
export async function captureImage(stage: HTMLElement, { backdrop = 'stage', format = 'png', size = 1600, look, saveAspect }: ImageOptions = {}): Promise<Blob> {
  const scene = captureScene(stage);
  const frame = frameFor(scene, size, saveAspect);
  const scale = Math.min(6, Math.max(1, frame.width / scene.width, frame.height / scene.height));
  const canvas = document.createElement('canvas');
  canvas.width = frame.width; canvas.height = frame.height;
  const paint = paintOf(stage, format === 'jpeg' && backdrop === 'transparent' ? 'dark' : backdrop, look);
  for await (const bitmap of renderedFrames(scene, scale, 1)) {
    try { paintFrame(canvas.getContext('2d')!, bitmap, scene, frame, paint); }
    finally { bitmap.close(); }
  }
  const blob = await new Promise<Blob | null>(ok => canvas.toBlob(ok, 'image/' + format, .92));
  if (!blob) throw new Error('The picture could not be saved.');
  return blob;
}

// Least common multiple of repeating timelines, not merely the longest animation.
function loopLength(stage: HTMLElement): number {
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  let loop = 0;
  for (const a of captureSource(stage).getAnimations({ subtree: true })) {
    const t = a.effect?.getComputedTiming();
    if (t?.iterations !== Infinity || typeof t.duration !== 'number' || !a.playbackRate) continue;
    const period = Math.round(t.duration * (t.direction?.startsWith('alternate') ? 2 : 1) / Math.abs(a.playbackRate));
    if (period > 0) loop = loop ? loop / gcd(loop, period) * period : period;
    if (loop > MAX_SECONDS * 1000) return loop;
  }
  return loop;
}
export function motionSeconds(stage: HTMLElement): number { return Math.min(MAX_SECONDS, loopLength(stage) / 1000); }

export async function recordModel({ stage, ratio, backdrop, look, quality = 1080, onProgress, signal }: RecordOptions): Promise<Recording> {
  const size = frameSize(ratio, quality);
  const loop = loopLength(stage);
  const seconds = loop ? Math.min(MAX_SECONDS, loop / 1000) : 4;
  const count = Math.round(seconds * FPS);
  const scene = captureScene(stage, true);
  const scale = Math.min(6, Math.max(1, size.width / scene.width, size.height / scene.height));
  const video = await openVideo(size.width, size.height, backdrop === 'transparent');
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const ctx = canvas.getContext('2d')!;
  const paint = paintOf(stage, backdrop, look);
  let index = 0;
  try {
    for await (const bitmap of renderedFrames(scene, scale, count, signal)) {
      try { paintFrame(ctx, bitmap, scene, size, paint); }
      finally { bitmap.close(); }
      const frame = new VideoFrame(canvas, { timestamp: Math.round(index * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      try { video.encoder.encode(frame, { keyFrame: index % (FPS * 2) === 0 }); } finally { frame.close(); }
      if (video.trouble) throw video.trouble;
      if (video.encoder.encodeQueueSize > 8) await new Promise<void>((go) => video.encoder.addEventListener('dequeue', () => go(), { once: true }));
      index += 1;
      onProgress?.(index / count);
    }
    return { blob: await video.finish(), extension: backdrop === 'transparent' ? 'webm' : 'mp4', ...size, seconds, loops: !loop || loop <= MAX_SECONDS * 1000, turn: loop / 1000 };
  } finally { if (video.encoder.state !== 'closed') video.encoder.close(); }
}

export interface LiveOptions extends Omit<RecordOptions, 'onProgress' | 'signal'> {
  seconds?: number;
  onTick?: (seconds: number, frames: number) => void;
  /** 0 → 1 while the take is drawn, after the recording itself has stopped. */
  onProgress?: (done: number) => void;
  stop?: AbortSignal;
  lookNow?: () => Paint | 'none';
}

/**
 * Films the model while someone plays with it.
 *
 * The take is sampled here, in the browser, as fast as this machine manages, and only drawn
 * afterwards — all of it in one go. Drawing a frame takes far longer than sampling one, so a
 * recording that waited for each frame to come back would catch one or two moments a second and
 * play back in lurches. Every pose is kept with the moment it was taken, and the video is written
 * at a steady 30 frames a second from those, each pose held until the next one was sampled.
 */
export async function recordLive({ stage, ratio, backdrop, look, quality = 1080, seconds = MAX_SECONDS, onTick, onProgress, stop, lookNow }: LiveOptions): Promise<Recording> {
  const size = frameSize(ratio, quality);
  const source = captureSource(stage);
  const scene = captureScene(stage);
  const paint = paintOf(stage, backdrop, lookNow?.() ?? look);
  const scale = Math.min(6, Math.max(1, size.width / scene.width, size.height / scene.height));

  /* ----- the take: poses, with the moment each was caught ----- */
  const start = performance.now();
  const at: number[] = [0];
  const poses: PoseChange[][] = [[]];
  let kept = scene.html.length;
  let previous = poseOf(source);
  const wait = (ms: number): Promise<void> => new Promise((go) => window.setTimeout(go, ms));
  while (!stop?.aborted && performance.now() - start < seconds * 1000 && stage.isConnected) {
    const when = performance.now() - start;
    const sampling = performance.now();
    const now = poseOf(source);
    const cost = performance.now() - sampling;
    const change = poseChange(now, previous);
    previous = now;
    // a pose that is the same as the one before it is simply held: nothing to keep
    if (change.length) {
      at.push(when);
      poses.push(change);
      for (const [, style] of change) kept += style.length + 8;
    }
    onTick?.(Math.min(seconds, (performance.now() - start) / 1000), poses.length);
    // the whole take goes to the render service in one piece, and that has a size limit
    if (poses.length >= MAX_SECONDS * FPS || kept > TAKE_LIMIT) break;
    // Sampling never takes more than half the time, so the model stays smooth to play with.
    await wait(Math.max(1000 / FPS - cost, cost));
  }
  const took = Math.max(performance.now() - start, 1000 / FPS);
  // Nothing moved? That is a still model, or nobody touched it: the one pose is held for the
  // whole take, which is what was on screen.

  /* ----- and the drawing, which is the slow part, now that nobody is waiting on it ----- */
  const video = await openVideo(size.width, size.height, backdrop === 'transparent');
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const ctx = canvas.getContext('2d')!;
  const count = Math.min(MAX_SECONDS * FPS, Math.max(1, Math.round((took / 1000) * FPS)));
  let index = 0, written = 0;
  try {
    for await (const bitmap of renderedFrames({ ...scene, poses }, scale, poses.length)) {
      try {
        paintFrame(ctx, bitmap, scene, size, paint);
        // this pose is held until the next one was sampled — that is what was on screen
        const until = index + 1 < at.length ? Math.round((at[index + 1]! / 1000) * FPS) : count;
        for (let frame = written; frame < Math.min(until, count); frame++) {
          const picture = new VideoFrame(canvas, { timestamp: Math.round((frame * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
          try { video.encoder.encode(picture, { keyFrame: frame % (FPS * 2) === 0 }); } finally { picture.close(); }
          if (video.trouble) throw video.trouble;
          if (video.encoder.encodeQueueSize > 8) await new Promise<void>((go) => video.encoder.addEventListener('dequeue', () => go(), { once: true }));
          written = frame + 1;
        }
      } finally { bitmap.close(); }
      index += 1;
      onProgress?.(index / poses.length);
    }
    if (!written) throw new Error('Nothing was recorded.');
    return { blob: await video.finish(), extension: backdrop === 'transparent' ? 'webm' : 'mp4', ...size, seconds: written / FPS, loops: false, turn: 0 };
  } finally { if (video.encoder.state !== 'closed') video.encoder.close(); }
}
