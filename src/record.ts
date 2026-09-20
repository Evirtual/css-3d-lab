import { ArrayBufferTarget as Mp4Target, Muxer as Mp4Muxer } from 'mp4-muxer';
import { ArrayBufferTarget as WebmTarget, Muxer as WebmMuxer } from 'webm-muxer';

/**
 * Makes the video here, in the visitor's browser, from the model on the stage — including their
 * edits, the pose they paused on and the backdrop they chose. Nothing is pre-rendered.
 *
 * How a frame is taken: a web page cannot screenshot itself, but it can draw an SVG image, and an
 * SVG may carry HTML inside a <foreignObject>. So each frame is a copy of the stage, with the
 * site's stylesheet inlined, drawn into a canvas. CSS 3D survives that trip; rules that point at
 * other files (url(...)) do not, and they would also make the canvas unreadable, so they are left
 * out (the models use gradients and colour, not images).
 *
 * The frames are timed by hand — every animation on the stage is paused and put at the exact
 * moment of the frame — so the video is frame-accurate however slowly the drawing goes, and the
 * loop joins up exactly.
 */

export type Ratio = '9:16' | '16:9';
export type Backdrop = 'stage' | 'dark' | 'light' | 'transparent';

export interface RecordOptions {
  stage: HTMLElement;
  ratio: Ratio;
  backdrop: Backdrop;
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
}

const SIZES: Record<Ratio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
};
const FPS = 30;
const MAX_SECONDS = 12; // long enough for the slow turns; a whole loop, so the video joins up

/** Is there any way to encode a video in this browser? */
export const canRecord = (): boolean => typeof VideoEncoder !== 'undefined' && typeof createImageBitmap !== 'undefined';

/**
 * What to film. An edited version runs inside its own frame, so the model (and the styles that
 * draw it) live in that frame's document, not in the page.
 */
function sourceOf(stage: HTMLElement): { node: HTMLElement; doc: Document } {
  const frame = stage.querySelector('iframe');
  const inner = frame?.contentDocument?.body;
  return inner ? { node: inner, doc: frame!.contentDocument! } : { node: stage, doc: document };
}

/** The page's own CSS, minus anything that points at another file (see the note above). */
function styleSheetText(doc: Document = document): string {
  const rules: string[] = [];
  for (const sheet of doc.styleSheets) {
    try {
      for (const rule of sheet.cssRules) if (!rule.cssText.includes('url(')) rules.push(rule.cssText);
    } catch {
      /* a stylesheet from another origin: nothing of ours in it */
    }
  }
  return rules.join('\n');
}

interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * One frame: the part of the stage the model fills, as an image. It is drawn at `zoom` times its
 * size on the page, so a small model still fills a 1080-wide video crisply (the whole trip is
 * vector: the browser rasterises the SVG at whatever size it is given).
 */
async function frameImage(node: HTMLElement, css: string, crop: Crop, zoom: number): Promise<HTMLImageElement> {
  const box = node.getBoundingClientRect();
  const holder = document.createElement('div');
  holder.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  holder.style.cssText = `width:${box.width}px;height:${box.height}px;transform-origin:0 0;transform:scale(${zoom}) translate(${-crop.x}px, ${-crop.y}px)`;
  holder.append(node.cloneNode(true));
  const xml = new XMLSerializer().serializeToString(holder);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(crop.width * zoom)}" height="${Math.round(crop.height * zoom)}"><defs><style type="text/css"><![CDATA[\n${css}\n]]></style></defs><foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`;
  const img = new Image();
  const drawn = new Promise<void>((ok, fail) => {
    img.onload = () => ok();
    img.onerror = () => fail(new Error('this model could not be drawn into a picture'));
  });
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await drawn;
  return img;
}

/** How long one turn of the model takes (ms), so the video ends where it began. */
function loopLength(node: HTMLElement): number {
  let longest = 0;
  for (const animation of node.getAnimations({ subtree: true })) {
    const timing = animation.effect?.getComputedTiming();
    if (timing?.iterations === Infinity && typeof timing.duration === 'number' && timing.duration <= MAX_SECONDS * 1000) {
      longest = Math.max(longest, timing.duration * (timing.direction?.startsWith('alternate') ? 2 : 1));
    }
  }
  return longest;
}

/** Puts every animation on the stage at `t` ms, paused, so the frame is exactly that moment. */
function seek(node: HTMLElement, t: number, starts: WeakMap<Animation, number>): void {
  for (const animation of node.getAnimations({ subtree: true })) {
    if (!starts.has(animation)) starts.set(animation, Number(animation.currentTime) || 0);
    animation.pause();
    animation.currentTime = starts.get(animation)! + t;
  }
}

const isPaint = (value: string): boolean => Boolean(value) && value !== 'none' && !/rgba\(0, 0, 0, 0\)|transparent/.test(value);

/**
 * What the model actually draws, in stage pixels: its 3D shape, not its layout box. Measured over
 * a few moments of the loop and kept at its widest, so a turning model is never clipped.
 */
function drawnCrop(node: HTMLElement, seekTo: (t: number) => void, seconds: number): Crop {
  const box = node.getBoundingClientRect();
  let l = Infinity;
  let t = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (let step = 0; step < 12; step++) {
    seekTo((step * seconds * 1000) / 12);
    for (const el of node.querySelectorAll<HTMLElement>('*')) {
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const cs = getComputedStyle(el);
      const paints =
        isPaint(cs.backgroundImage) ||
        isPaint(cs.boxShadow) ||
        isPaint(cs.backgroundColor) ||
        parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) + parseFloat(cs.borderBottomWidth) > 0 ||
        [].some.call(el.childNodes, (n: Node) => n.nodeType === 3 && n.textContent?.trim());
      if (!paints) continue;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      l = Math.min(l, rect.left);
      t = Math.min(t, rect.top);
      r = Math.max(r, rect.right);
      b = Math.max(b, rect.bottom);
    }
  }
  if (l >= r || t >= b) return { x: 0, y: 0, width: box.width, height: box.height }; // nothing measurable: the whole stage
  const pad = 10;
  const x = Math.max(0, l - box.left - pad);
  const y = Math.max(0, t - box.top - pad);
  return { x, y, width: Math.min(box.width - x, r - l + pad * 2), height: Math.min(box.height - y, b - t + pad * 2) };
}

interface Paint {
  color: string;
  /** The stage's dot grid, when it shows one: colour, dot radius and spacing in stage pixels. */
  dots?: { color: string; radius: number; gap: number };
}

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
    const dotColor = style.backgroundImage.match(/radial-gradient\(([^)]*\)[^,]*|[^,]+),/)?.[1]?.trim();
    const radius = parseFloat(style.backgroundImage.match(/([\d.]+)px/)?.[1] ?? '0');
    const gap = parseFloat(style.backgroundSize);
    if (dotColor && radius > 0 && gap > 1) return { color, dots: { color: dotColor, radius, gap } };
  }
  return { color };
}

/**
 * One picture of the model as it stands: the same drawing as a video frame, cropped to the model
 * and big enough to use anywhere (its longest side is `size`). Fast, so it needs no dialog.
 */
export async function captureImage(stage: HTMLElement, backdrop: Backdrop = 'stage', size = 1600): Promise<Blob> {
  const source = sourceOf(stage);
  const css = styleSheetText(source.doc);
  // the pose on screen, not a moment of the loop: measure without moving anything
  const crop = drawnCrop(source.node, () => {}, 0);
  const zoom = Math.min(4, Math.max(1, size / Math.max(crop.width, crop.height)));
  const img = await frameImage(source.node, css, crop, zoom);

  const paint = backdropOf(stage, backdrop);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { alpha: !paint })!;
  if (paint) {
    ctx.fillStyle = paint.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    paintDots(ctx, paint, canvas.width, canvas.height, zoom);
  }
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
  if (!blob) throw new Error('the picture could not be saved');
  return blob;
}

/** The stage's dot grid, drawn as circles at the picture's scale. */
function paintDots(ctx: CanvasRenderingContext2D, paint: Paint, width: number, height: number, zoom: number): void {
  if (!paint.dots) return;
  const gap = paint.dots.gap * zoom;
  const radius = paint.dots.radius * zoom;
  ctx.fillStyle = paint.dots.color;
  for (let y = gap / 2; y < height; y += gap) {
    for (let x = gap / 2; x < width; x += gap) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Draws every frame of one loop and encodes them. The picture is fitted inside the chosen shape
 * with room around it, the same way the site frames a model.
 */
export async function recordModel({ stage, ratio, backdrop, onProgress, signal }: RecordOptions): Promise<Recording> {
  if (!canRecord()) throw new Error('this browser cannot make videos yet');
  const { width, height } = SIZES[ratio];
  const transparent = backdrop === 'transparent';
  // H.264 in an MP4 plays everywhere, but it cannot be see-through: a transparent video is VP9
  // in a WebM instead (Chrome, Edge and Firefox play it; most editors take it).
  const codec = transparent ? 'vp09.00.10.08' : 'avc1.4d0028';
  const support = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate: 8e6, framerate: FPS });
  if (!support.supported) throw new Error('this browser cannot encode that format');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: transparent })!;

  const source = sourceOf(stage);
  const css = styleSheetText(source.doc);
  const loop = loopLength(source.node);
  const seconds = loop ? Math.min(MAX_SECONDS, loop / 1000) : 4;
  const frames = Math.round(seconds * FPS);
  const starts = new WeakMap<Animation, number>();
  const paint = backdropOf(stage, backdrop);
  const crop = drawnCrop(source.node, (t) => seek(source.node, t, starts), seconds);
  // what was already paused (the stage's Pause switch) must stay paused afterwards
  const wasPaused = new Set(source.node.getAnimations({ subtree: true }).filter((a) => a.playState === 'paused'));
  // enough resolution that the model fills the frame sharply, without asking the browser to
  // rasterise more than it needs
  const zoom = Math.min(4, Math.max(1, Math.min((width * 0.82) / crop.width, (height * 0.82) / crop.height)));

  const target = transparent ? new WebmTarget() : new Mp4Target();
  const muxer = transparent
    ? new WebmMuxer({ target: target as WebmTarget, video: { codec: 'V_VP9', width, height, frameRate: FPS } })
    : new Mp4Muxer({ target: target as Mp4Target, video: { codec: 'avc', width, height }, fastStart: 'in-memory' });
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      throw err;
    },
  });
  encoder.configure({ codec, width, height, bitrate: 8e6, framerate: FPS, alpha: transparent ? 'keep' : 'discard' });

  try {
    for (let f = 0; f < frames; f++) {
      if (signal?.aborted) throw new DOMException('cancelled', 'AbortError');
      if (!source.node.isConnected) throw new Error('the model was closed while the video was being made');
      seek(source.node, (f * 1000) / FPS, starts);
      const img = await frameImage(source.node, css, crop, zoom);

      ctx.clearRect(0, 0, width, height);
      if (paint) {
        ctx.fillStyle = paint.color;
        ctx.fillRect(0, 0, width, height);
        paintDots(ctx, paint, width, height, zoom); // the same grid the stage shows
      }
      // the model, as large as fits with a margin, centred
      const scale = Math.min((width * 0.82) / img.width, (height * 0.82) / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);

      const frame = new VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      encoder.encode(frame, { keyFrame: f % (FPS * 2) === 0 });
      frame.close();
      if (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0));
      onProgress?.((f + 1) / frames);
    }
    await encoder.flush();
    muxer.finalize();
    const buffer = (target as Mp4Target | WebmTarget).buffer!;
    return {
      blob: new Blob([buffer], { type: transparent ? 'video/webm' : 'video/mp4' }),
      extension: transparent ? 'webm' : 'mp4',
      width,
      height,
      seconds,
    };
  } finally {
    encoder.close();
    // let the model run again, unless it was paused before (the stage's Pause switch)
    if (source.node.isConnected) {
      for (const animation of source.node.getAnimations({ subtree: true })) if (!wasPaused.has(animation)) animation.play();
    }
  }
}
