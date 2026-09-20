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
/** The video's short side: 480p is small and quick, 4K is for a big screen. */
export type Quality = 480 | 720 | 1080 | 2160;
export type ImageFormat = 'png' | 'jpeg';

export interface RecordOptions {
  stage: HTMLElement;
  ratio: Ratio;
  backdrop: Backdrop;
  quality?: Quality;
  /** How much of the frame the model fills (1 = edge to edge). */
  fill?: number;
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

/** The frame, from the shape and the quality: the short side is the quality, and it stays even. */
const frameSize = (ratio: Ratio, quality: Quality): { width: number; height: number } => {
  const long = Math.round((quality * 16) / 9 / 2) * 2;
  return ratio === '9:16' ? { width: quality, height: long } : { width: long, height: quality };
};
const FPS = 30;
/**
 * How much of the frame the model fills: two thirds, the same as a card and the large stage, so a
 * saved picture, a video and a print all look like the model does on the site.
 */
const FILL = 2 / 3;
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

/**
 * The page's own CSS, minus rules that fetch another file. A picture drawn from such a rule would
 * make the canvas unreadable, so those rules go — but a data: URI is the file itself, written into
 * the rule, so those stay (icons and little masks are drawn that way).
 */
const fetchesAFile = (cssText: string): boolean => /url\(\s*['"]?(?!data:)/i.test(cssText);

/** Does this selector pick out anything inside the model? (a selector we cannot test is kept) */
function touches(selector: string, root: HTMLElement): boolean {
  const plain = selector.replace(/::[\w-]+(\([^)]*\))?/g, '').replace(/:(hover|focus|focus-visible|focus-within|active|checked|target)\b/g, '');
  if (/(^|,)\s*(:root|html|body)\b/.test(plain)) return true; // the theme's variables live there
  for (const part of plain.split(',')) {
    const one = part.trim();
    if (!one) continue;
    try {
      if (root.matches(one) || root.querySelector(one)) return true;
    } catch {
      return true; // a selector this browser cannot test: keep it rather than lose a style
    }
  }
  return false;
}

/**
 * The style rules this model actually uses. The whole site stylesheet is over half a megabyte, and
 * carrying all of it into the picture is both slow and, past a certain size, silently cut short —
 * which is how a model ends up drawn with none of its own styles.
 */
function styleSheetText(doc: Document = document, root?: HTMLElement): string {
  const rules: string[] = [];
  const walk = (list: CSSRuleList): void => {
    for (const rule of list) {
      if (fetchesAFile(rule.cssText)) continue;
      if (rule instanceof CSSStyleRule) {
        if (!root || touches(rule.selectorText, root)) rules.push(rule.cssText);
      } else if (rule instanceof CSSGroupingRule) {
        // @media / @supports / @layer: keep the wrapper, but only the rules inside that are used
        const inner: string[] = [];
        for (const child of rule.cssRules) {
          if (fetchesAFile(child.cssText)) continue;
          if (child instanceof CSSStyleRule && root && !touches(child.selectorText, root)) continue;
          inner.push(child.cssText);
        }
        if (inner.length) rules.push(`${rule.cssText.slice(0, rule.cssText.indexOf('{') + 1)}\n${inner.join('\n')}\n}`);
      } else {
        rules.push(rule.cssText); // @keyframes, @font-face, @property and friends
      }
    }
  };
  for (const sheet of doc.styleSheets) {
    try {
      walk(sheet.cssRules);
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

const kebab = (property: string): string => property.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/**
 * A copy of a running model would start its animations again from the beginning, and a picture
 * shows no motion at all — so every frame would be the model's first pose (a half-twisted cube).
 * This writes the pose the model is in right now into the copy: for each element, the properties
 * its animations touch, taken from the live one and pinned as plain styles, with the animation
 * switched off so it cannot overrule them. Animated ::before / ::after layers get the same
 * treatment through a rule of their own, since they have no element to carry a style attribute.
 */
function freezePose(live: HTMLElement, copy: HTMLElement): string {
  const liveNodes = [live, ...live.querySelectorAll<HTMLElement>('*')];
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>('*')];
  const pseudoRules: string[] = [];
  let marked = 0;

  liveNodes.forEach((source, i) => {
    const target = copies[i];
    if (!target) return;
    for (const animation of source.getAnimations()) {
      const effect = animation.effect as KeyframeEffect | null;
      if (!effect) continue;
      const properties = new Set<string>();
      for (const frame of effect.getKeyframes()) {
        for (const key of Object.keys(frame)) {
          if (key !== 'offset' && key !== 'composite' && key !== 'easing' && key !== 'computedOffset') properties.add(kebab(key));
        }
      }
      const pseudo = effect.pseudoElement;
      const computed = getComputedStyle(source, pseudo);
      if (!pseudo) {
        target.style.animation = 'none';
        target.style.transition = 'none';
        for (const property of properties) target.style.setProperty(property, computed.getPropertyValue(property));
        continue;
      }
      const mark = target.dataset.pose ?? String(++marked);
      target.dataset.pose = mark;
      const declarations = [...properties].map((property) => `${property}:${computed.getPropertyValue(property)} !important`);
      pseudoRules.push(`[data-pose="${mark}"]${pseudo}{animation:none !important;transition:none !important;${declarations.join(';')}}`);
    }
  });
  return pseudoRules.join('\n');
}

/**
 * How deep an element sits, in the flattened picture's terms: its own 3D transform chain applied
 * to its centre, read as a single number. Used to put a model's faces in back-to-front order.
 */
function depthOf(element: HTMLElement, root: HTMLElement): number {
  let matrix = new DOMMatrix();
  const chain: HTMLElement[] = [];
  for (let node: HTMLElement | null = element; node && node !== root.parentElement; node = node.parentElement) chain.unshift(node);
  for (const node of chain) {
    const style = getComputedStyle(node);
    matrix = matrix.translate(node.offsetLeft, node.offsetTop);
    if (style.transform !== 'none') {
      const [ox, oy, oz = '0px'] = style.transformOrigin.split(' ');
      matrix = matrix.translate(parseFloat(ox), parseFloat(oy), parseFloat(oz));
      matrix = matrix.multiply(new DOMMatrix(style.transform));
      matrix = matrix.translate(-parseFloat(ox), -parseFloat(oy), -parseFloat(oz));
    }
  }
  return matrix.transformPoint(new DOMPoint(element.offsetWidth / 2, element.offsetHeight / 2, 0)).z;
}

/**
 * On screen the browser sorts the pieces of a 3D scene by depth. A drawn picture does not: it
 * paints them in the order they appear in the markup, so the front of a cube can land on top of
 * the face you should be seeing. Inside every 3D group, the copy's children are therefore put in
 * back-to-front order, which is the order the screen paints them in.
 */
function sortByDepth(live: HTMLElement, copy: HTMLElement, root: HTMLElement): void {
  const liveNodes = [live, ...live.querySelectorAll<HTMLElement>('*')];
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>('*')];
  liveNodes.forEach((source, i) => {
    const target = copies[i];
    if (!target || getComputedStyle(source).transformStyle !== 'preserve-3d') return;
    const children = [...source.children].filter((child): child is HTMLElement => child instanceof HTMLElement);
    if (children.length < 2) return;
    const order = children
      .map((child) => ({ child, depth: depthOf(child, root) }))
      .sort((a, b) => a.depth - b.depth)
      .map(({ child }) => children.indexOf(child));
    const targetChildren = [...target.children];
    for (const index of order) if (targetChildren[index]) target.append(targetChildren[index]);
  });
}

/**
 * Faces that point away are removed from the copy, which is what the screen does with
 * backface-visibility. Which way a face points is read the way the screen reads it: mark three of
 * its corners, see where they land, and if they run the other way round, it is showing its back.
 */
function hideBackFaces(live: HTMLElement, copy: HTMLElement): void {
  const liveNodes = [live, ...live.querySelectorAll<HTMLElement>('*')];
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>('*')];
  liveNodes.forEach((source, i) => {
    const target = copies[i];
    if (!target || !source.getClientRects().length) return;
    const corners = [0, 1, 2].map((k) => {
      const mark = document.createElement('i');
      mark.style.cssText = `position:absolute!important;width:0!important;height:0!important;margin:0!important;transform:none!important;left:${k === 1 ? '100%' : '0'}!important;top:${k === 2 ? '100%' : '0'}!important`;
      source.append(mark);
      const box = mark.getBoundingClientRect();
      mark.remove();
      return box;
    });
    const turn = (corners[1].left - corners[0].left) * (corners[2].top - corners[0].top) - (corners[1].top - corners[0].top) * (corners[2].left - corners[0].left);
    if (turn < 0) target.style.setProperty('visibility', 'hidden', 'important');
  });
}

/**
 * One frame: the part of the stage the model fills, as an image. It is drawn at `zoom` times its
 * size on the page, so a small model still fills a 1080-wide video crisply (the whole trip is
 * vector: the browser rasterises the SVG at whatever size it is given).
 */
async function frameImage(node: HTMLElement, css: string, zoom: number): Promise<HTMLImageElement> {
  const box = node.getBoundingClientRect();
  const holder = document.createElement('div');
  holder.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  // The whole stage, drawn `zoom` times bigger. It is cropped later, while painting: a 3D model
  // reaches outside its own box, and a picture cut to that box would lose those parts.
  holder.style.cssText = `width:${box.width}px;height:${box.height}px;transform-origin:0 0;transform:scale(${zoom})`;
  const copy = node.cloneNode(true) as HTMLElement;
  const posed = freezePose(node, copy);
  hideBackFaces(node, copy);
  sortByDepth(node, copy, node);
  // The copy is on its own now: it needs the size it had on the page, and the scale the site keeps
  // on the page root (--fit), or the model lays out small and in the corner.
  copy.style.width = `${box.width}px`;
  copy.style.height = `${box.height}px`;
  copy.style.boxSizing = 'border-box';
  // text inherits from the page, which is not coming with us: carry those few values over, or the
  // labels come out in the browser's default serif
  const inherited = getComputedStyle(node);
  for (const property of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'color', 'text-align']) {
    copy.style.setProperty(property, inherited.getPropertyValue(property));
  }
  holder.style.cssText += `;${document.documentElement.getAttribute('style') ?? ''}`;
  // the stage's own backdrop goes: the picture paints the one the visitor asked for
  copy.style.background = 'none';
  copy.dataset.bare = '';
  holder.append(copy);
  const xml = new XMLSerializer().serializeToString(holder);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(box.width * zoom)}" height="${Math.round(box.height * zoom)}"><defs><style type="text/css"><![CDATA[\n${css}\n[data-bare]::before,[data-bare]::after{display:none !important}\n${posed}\n]]></style></defs><foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`;
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
export interface ImageOptions {
  backdrop?: Backdrop;
  format?: ImageFormat;
  /** How much of the frame the model fills (1 = edge to edge). */
  fill?: number;
  /** The picture's longest side in pixels. */
  size?: number;
}

export async function captureImage(stage: HTMLElement, { backdrop = 'stage', format = 'png', size = 1600, fill = FILL }: ImageOptions = {}): Promise<Blob> {
  const source = sourceOf(stage);
  const css = styleSheetText(source.doc, source.node);
  // the pose on screen, not a moment of the loop: measure without moving anything
  const crop = drawnCrop(source.node, () => {}, 0);
  // the model fills most of the picture, with room around it
  const zoom = Math.min(4, Math.max(1, (size * fill) / Math.max(crop.width, crop.height)));
  const img = await frameImage(source.node, css, zoom);

  // JPEG has no see-through pixels, so it always gets a backdrop
  const paint = backdropOf(stage, format === 'jpeg' && backdrop === 'transparent' ? 'dark' : backdrop);
  const shown = { width: crop.width * zoom, height: crop.height * zoom };
  const width = Math.round(shown.width / fill);
  const height = Math.round(shown.height / fill);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: !paint })!;
  if (paint) {
    ctx.fillStyle = paint.color;
    ctx.fillRect(0, 0, width, height);
    paintDots(ctx, paint, width, height, zoom);
  }
  ctx.drawImage(img, crop.x * zoom, crop.y * zoom, shown.width, shown.height, (width - shown.width) / 2, (height - shown.height) / 2, shown.width, shown.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, `image/${format}`, format === 'jpeg' ? 0.92 : undefined));
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
export async function recordModel({ stage, ratio, backdrop, quality = 1080, fill = FILL, onProgress, signal }: RecordOptions): Promise<Recording> {
  if (!canRecord()) throw new Error('this browser cannot make videos yet');
  const { width, height } = frameSize(ratio, quality);
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
  const css = styleSheetText(source.doc, source.node);
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
  const zoom = Math.min(4, Math.max(1, Math.min((width * fill) / crop.width, (height * fill) / crop.height)));

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
      const img = await frameImage(source.node, css, zoom);

      ctx.clearRect(0, 0, width, height);
      if (paint) {
        ctx.fillStyle = paint.color;
        ctx.fillRect(0, 0, width, height);
        paintDots(ctx, paint, width, height, zoom); // the same grid the stage shows
      }
      // the model, cropped to what it draws, as large as fits with a margin, centred
      const shown = { width: crop.width * zoom, height: crop.height * zoom };
      const scale = Math.min((width * fill) / shown.width, (height * fill) / shown.height);
      const w = shown.width * scale;
      const h = shown.height * scale;
      ctx.drawImage(img, crop.x * zoom, crop.y * zoom, shown.width, shown.height, (width - w) / 2, (height - h) / 2, w, h);

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
