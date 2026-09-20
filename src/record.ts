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

export type Ratio = '9:16' | '1:1' | '16:9';
export type Backdrop = 'stage' | 'dark' | 'light' | 'transparent';
/** The video's short side: 480p is small and quick, 4K is for a big screen. */
export type Quality = 480 | 720 | 1080 | 2160;
export type ImageFormat = 'png' | 'jpeg';
/** The shape of a saved picture: 'auto' hugs the model, the rest are fixed frames. */
export type ImageRatio = 'auto' | '1:1' | '4:3' | '3:2' | '16:9' | '9:16';

/** Each named shape as width ÷ height; 'auto' has none, so the frame is cut to the model. */
export const ASPECT_OF: Record<ImageRatio, number | null> = { auto: null, '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9, '9:16': 9 / 16 };

export interface RecordOptions {
  stage: HTMLElement;
  ratio: Ratio;
  backdrop: Backdrop;
  /** The backdrop to paint, ready-made ('none' for see-through). Left out, the stage is asked. */
  look?: Paint | 'none';
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
  /** False when the model's turn is longer than a video may be: the end does not meet the start. */
  loops: boolean;
  /** How long one whole turn takes, even when the video is shorter. */
  turn: number;
}

/** The frame, from the shape and the quality: the short side is the quality, and it stays even. */
const frameSize = (ratio: Ratio, quality: Quality): { width: number; height: number } => {
  const aspect = ASPECT_OF[ratio] ?? 1;
  const even = (n: number): number => Math.round(n / 2) * 2;
  return aspect >= 1 ? { width: even(quality * aspect), height: quality } : { width: quality, height: even(quality / aspect) };
};
const FPS = 30;
/**
 * How much of the frame the model fills: two thirds, the same as a card and the large stage, so a
 * saved picture, a video and a print all look like the model does on the site.
 */
const FILL = 2 / 3;
/** How long any video may be. A whole loop below this joins up; anything longer is cut here. */
export const MAX_SECONDS = 30;

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

/**
 * A copy of the model is not under the pointer and holds no focus, so every :hover and :focus rule
 * would quietly stop applying — which is how a door that is open on screen comes out shut, and why
 * a model that only does something while you touch it could not be filmed at all. Each of these
 * states is written as a mark instead, and the copy is given the marks the real model has.
 */
const STATES: { pseudo: string; mark: string }[] = [
  { pseudo: ':hover', mark: 'data-c3d-hover' },
  { pseudo: ':focus-within', mark: 'data-c3d-focus-within' },
  { pseudo: ':focus-visible', mark: 'data-c3d-focus-visible' },
  { pseudo: ':focus', mark: 'data-c3d-focus' },
  { pseudo: ':active', mark: 'data-c3d-active' },
];

/** The same selector, with those states written as marks the copy can actually carry. */
function asMarks(selector: string): string {
  let out = selector;
  for (const state of STATES) out = out.split(state.pseudo).join(`[${state.mark}]`);
  return out;
}

/** Gives the copy the states the live model is in right now. */
function markStates(live: HTMLElement, copy: HTMLElement): void {
  const liveNodes = [live, ...live.querySelectorAll<HTMLElement>('*')];
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>('*')];
  liveNodes.forEach((source, i) => {
    const target = copies[i];
    if (!target) return;
    for (const state of STATES) {
      try {
        if (source.matches(state.pseudo)) target.setAttribute(state.mark, '');
      } catch {
        /* a browser that cannot test this state */
      }
    }
  });
}

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
      // @starting-style is where a transition begins. Nothing transitions in a drawn picture, so
      // keeping these rules would freeze fresh elements at their fly-in state — usually invisible.
      if (rule.cssText.startsWith('@starting-style')) continue;
      if (rule instanceof CSSStyleRule) {
        if (!root || touches(rule.selectorText, root)) rules.push(`${asMarks(rule.selectorText)}{${rule.style.cssText}}`);
      } else if (rule instanceof CSSGroupingRule) {
        // @media / @supports / @layer: keep the wrapper, but only the rules inside that are used
        const inner: string[] = [];
        for (const child of rule.cssRules) {
          if (fetchesAFile(child.cssText)) continue;
          if (child instanceof CSSStyleRule && root && !touches(child.selectorText, root)) continue;
          inner.push(child instanceof CSSStyleRule ? `${asMarks(child.selectorText)}{${child.style.cssText}}` : child.cssText);
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
 * Is this face turned away from us, once its whole transform chain is applied?
 *
 * Read from the transforms themselves, not by measuring marks placed in the page: a mark inside an
 * element that is not positioned lands against some ancestor instead, which is how an earlier
 * version of this hid faces that were plainly facing the viewer.
 */
function facesAway(element: HTMLElement, root: HTMLElement): boolean {
  let matrix = new DOMMatrix();
  const chain: HTMLElement[] = [];
  for (let node: HTMLElement | null = element; node && node !== root.parentElement; node = node.parentElement) chain.unshift(node);
  for (const node of chain) {
    const style = getComputedStyle(node);
    if (style.transform === 'none') continue;
    const [ox, oy, oz = '0px'] = style.transformOrigin.split(' ');
    matrix = matrix
      .translate(parseFloat(ox), parseFloat(oy), parseFloat(oz))
      .multiply(new DOMMatrix(style.transform))
      .translate(-parseFloat(ox), -parseFloat(oy), -parseFloat(oz));
  }
  // where the face's own across and down axes end up: if they have swapped hands, we see its back
  const origin = matrix.transformPoint(new DOMPoint(0, 0, 0));
  const across = matrix.transformPoint(new DOMPoint(1, 0, 0));
  const down = matrix.transformPoint(new DOMPoint(0, 1, 0));
  const turn = (across.x - origin.x) * (down.y - origin.y) - (across.y - origin.y) * (down.x - origin.x);
  return turn < 0;
}

/**
 * Drawing a page into a picture ignores backface-visibility: hidden — a face turned away is painted
 * all the same, and being later in the markup it usually lands on top. (A red face turned away
 * really does beat a green one facing you.) That is a puzzle cube losing its middle layer and a
 * laptop losing its screen, so the faces that asked to be hidden are taken out of the copy.
 */
function hideBackFaces(live: HTMLElement, copy: HTMLElement): void {
  const liveNodes = [live, ...live.querySelectorAll<HTMLElement>('*')];
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>('*')];
  liveNodes.forEach((source, i) => {
    const target = copies[i];
    // Only a face with nothing inside it. Plenty of models put backface-visibility on a whole
    // side of an object — a card face that carries a logo and text — to keep its edges smooth,
    // and taking one of those out would take the object with it.
    if (!target || source.children.length) return;
    if (getComputedStyle(source).backfaceVisibility !== 'hidden') return;
    if (facesAway(source, live)) target.style.setProperty('visibility', 'hidden', 'important');
  });
}

/**
 * One frame: the part of the stage the model fills, as an image. It is drawn at `zoom` times its
 * size on the page, so a small model still fills a 1080-wide video crisply (the whole trip is
 * vector: the browser rasterises the SVG at whatever size it is given).
 */
async function frameImage(node: HTMLElement, css: string, zoom: number): Promise<HTMLImageElement> {
  const box = naturalBox(node);
  const holder = document.createElement('div');
  holder.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  // The whole stage, drawn `zoom` times bigger. It is cropped later, while painting: a 3D model
  // reaches outside its own box, and a picture cut to that box would lose those parts.
  holder.style.cssText = `width:${box.width}px;height:${box.height}px;transform-origin:0 0;transform:scale(${zoom})`;
  const copy = node.cloneNode(true) as HTMLElement;
  const posed = freezePose(node, copy);
  hideBackFaces(node, copy);
  markStates(node, copy);
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(box.width * zoom)}" height="${Math.round(box.height * zoom)}"><defs><style type="text/css"><![CDATA[\n${css}\n[data-bare]::before,[data-bare]::after{display:none !important}\n[data-bare],[data-bare] *,[data-bare] *::before,[data-bare] *::after{transition:none !important}\n${posed}\n]]></style></defs><foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`;
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
    if (timing?.iterations === Infinity && typeof timing.duration === 'number') {
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

/** The element's own size, whatever size it is currently drawn at. */
function naturalBox(node: HTMLElement): { width: number; height: number } {
  const scale = scaleOf(node);
  const seen = node.getBoundingClientRect();
  return { width: seen.width / scale, height: seen.height / scale };
}

/** How much bigger than its own layout the element is drawn right now (a dialog may scale it). */
function scaleOf(node: HTMLElement): number {
  const box = node.getBoundingClientRect();
  const own = node.offsetWidth;
  return own > 0 && box.width > 0 ? box.width / own : 1;
}

const isPaint = (value: string): boolean => Boolean(value) && value !== 'none' && !/rgba\(0, 0, 0, 0\)|transparent/.test(value);

/**
 * What the model actually draws, in stage pixels: its 3D shape, not its layout box. Measured over
 * a few moments of the loop and kept at its widest, so a turning model is never clipped.
 */
function drawnCrop(node: HTMLElement, seekTo: (t: number) => void, seconds: number): Crop {
  const box = node.getBoundingClientRect();
  const scale = scaleOf(node);
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
  // in the model's own pixels, whatever size it happens to be drawn at on screen
  const width = box.width / scale;
  const height = box.height / scale;
  if (l >= r || t >= b) return { x: 0, y: 0, width, height }; // nothing measurable: the whole stage
  const pad = 10;
  const x = Math.max(0, (l - box.left) / scale - pad);
  const y = Math.max(0, (t - box.top) / scale - pad);
  return { x, y, width: Math.min(width - x, (r - l) / scale + pad * 2), height: Math.min(height - y, (b - t) / scale + pad * 2) };
}

/**
 * Where the model actually leaves ink, in its own pixels.
 *
 * The measurement above counts anything that could paint — an empty glass pane, a box that exists
 * only to cast a shadow, a gradient that fades to nothing halfway — so a model can end up framed
 * around space it does not fill, which is why it looks small and off to one side. This draws it
 * small with nothing behind it and reads the pixels back: what is left is the model as a person
 * sees it. Several moments of a turn are drawn, so a model that swings around is never clipped.
 */
async function inkCrop(node: HTMLElement, css: string, seekTo: (t: number) => void, seconds: number, rough: Crop): Promise<Crop> {
  const natural = naturalBox(node);
  const zoom = Math.min(1, 320 / Math.max(rough.width, rough.height, 1));
  const width = Math.max(1, Math.round(natural.width * zoom));
  const height = Math.max(1, Math.round(natural.height * zoom));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true })!;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  const moments = seconds > 0 ? 6 : 1;
  for (let step = 0; step < moments; step++) {
    seekTo((step * seconds * 1000) / moments);
    const img = await frameImage(node, css, zoom);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 5 of 255 is below anything a person can see, so only real emptiness is trimmed away
        if (pixels[(y * width + x) * 4 + 3] <= 5) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (left > right || top > bottom) return rough; // nothing drawn at all: keep the rough guess
  const pad = 2;
  const x = Math.max(0, left / zoom - pad);
  const y = Math.max(0, top / zoom - pad);
  return {
    x,
    y,
    width: Math.min(natural.width - x, (right - left + 1) / zoom + pad * 2),
    height: Math.min(natural.height - y, (bottom - top + 1) / zoom + pad * 2),
  };
}

interface Stand {
  node: HTMLElement;
  doc: Document;
  close: () => void;
}

/**
 * A stand-in for the model: a copy kept out of sight, holding the pose the real one is in.
 *
 * Everything that has to walk the model through its turn — measuring it, drawing every frame of a
 * video — does it here. The model on screen is never touched, so it no longer jumps about under
 * the visitor's hands while a file is being made.
 */
function understudy(stage: HTMLElement): Stand {
  const source = sourceOf(stage);
  const box = naturalBox(source.node);
  const host = source.doc.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  // out of sight but fully laid out; a transform (not a left offset) so that anything inside with
  // position: fixed stays inside the copy rather than landing on the page
  host.style.cssText = `position:fixed;top:0;left:0;z-index:-1;width:${box.width}px;height:${box.height}px;transform:translateX(-20000px);pointer-events:none`;
  const copy = source.node.cloneNode(true) as HTMLElement;
  copy.style.width = `${box.width}px`;
  copy.style.height = `${box.height}px`;
  host.append(copy);
  source.doc.body.append(host);
  // the states the real model is in (a pointer over it, a focused control) come across as marks,
  // since a copy off in the corner is not hovered and holds no focus
  markStates(source.node, copy);
  // and it starts at the moment the real one is at, so a film begins from the pose on screen
  const live = source.node.getAnimations({ subtree: true });
  const mine = copy.getAnimations({ subtree: true });
  mine.forEach((animation, i) => {
    const from = live[i];
    if (from && from.currentTime !== null) animation.currentTime = from.currentTime;
    animation.pause();
  });
  return { node: copy, doc: source.doc, close: () => host.remove() };
}

/**
 * Where the model puts ink over one whole turn, measured from the pixels. It is one box for the
 * whole loop on purpose: a box that followed the model from moment to moment would have the frame
 * resizing around it the entire time. The model is put back exactly where it was found.
 */
export async function inkBoxOf(stage: HTMLElement): Promise<Crop> {
  const stand = understudy(stage);
  try {
    const css = styleSheetText(stand.doc, stand.node);
    const seconds = motionSeconds(stage);
    const starts = new WeakMap<Animation, number>();
    const step = (t: number): void => seek(stand.node, t, starts);
    const rough = drawnCrop(stand.node, step, seconds);
    return await inkCrop(stand.node, css, step, seconds, rough);
  } finally {
    stand.close();
  }
}

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

/** What the model draws right now, in stage pixels, measured from the stage's top-left corner. */
export const drawnBoxOf = (stage: HTMLElement): { x: number; y: number; width: number; height: number } => drawnCrop(sourceOf(stage).node, () => {}, 0);

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
  /** The frame's shape, width ÷ height. Left out, the frame is cut to the model instead. */
  aspect?: number | null;
  /** The backdrop to paint, ready-made ('none' for see-through). Left out, the stage is asked. */
  look?: Paint | 'none';
}

/** The frame in pixels: the chosen shape at this size, or one cut to the model with room around it. */
function frameOf(crop: Crop, size: number, fill: number, aspect: number | null): { width: number; height: number } {
  if (!(crop.width > 0) || !(crop.height > 0)) throw new Error('this model is not on screen, so there is nothing to draw');
  if (!aspect) {
    const k = (size * fill) / Math.max(crop.width, crop.height);
    return { width: Math.max(2, Math.round((crop.width * k) / fill)), height: Math.max(2, Math.round((crop.height * k) / fill)) };
  }
  return {
    width: Math.max(2, aspect >= 1 ? size : Math.round(size * aspect)),
    height: Math.max(2, aspect >= 1 ? Math.round(size / aspect) : size),
  };
}

/** How much bigger than the page the model is drawn, so it stays sharp at the frame's size. */
const zoomFor = (crop: Crop, frame: { width: number; height: number }, fill: number): number =>
  Math.min(4, Math.max(1, Math.min((frame.width * fill) / crop.width, (frame.height * fill) / crop.height)));

/** One frame painted: the backdrop, then the model as large as `fill` allows, in the middle. */
function paintFrame(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  crop: Crop,
  zoom: number,
  frame: { width: number; height: number },
  fill: number,
  paint: Paint | null,
): void {
  ctx.clearRect(0, 0, frame.width, frame.height);
  if (paint) {
    ctx.fillStyle = paint.color;
    ctx.fillRect(0, 0, frame.width, frame.height);
    paintDots(ctx, paint, frame.width, frame.height, zoom); // the same grid the stage shows
  }
  const shown = { width: crop.width * zoom, height: crop.height * zoom };
  const scale = Math.min((frame.width * fill) / shown.width, (frame.height * fill) / shown.height);
  const w = shown.width * scale;
  const h = shown.height * scale;
  ctx.drawImage(img, crop.x * zoom, crop.y * zoom, shown.width, shown.height, (frame.width - w) / 2, (frame.height - h) / 2, w, h);
}

export async function captureImage(stage: HTMLElement, { backdrop = 'stage', format = 'png', size = 1600, fill = FILL, aspect = null, look }: ImageOptions = {}): Promise<Blob> {
  const stand = understudy(stage);
  let img: HTMLImageElement;
  let crop: Crop;
  let frame: { width: number; height: number };
  let zoom: number;
  try {
    const css = styleSheetText(stand.doc, stand.node);
    const seconds = motionSeconds(stage);
    const starts = new WeakMap<Animation, number>();
    const step = (t: number): void => seek(stand.node, t, starts);
    // The frame is the one the whole turn fits in, so a picture, a video and a print of the same
    // model are framed alike; the pose drawn in it is the one on screen, which is where the
    // stand-in is put back to before anything is drawn.
    const rough = drawnCrop(stand.node, step, seconds);
    crop = await inkCrop(stand.node, css, step, seconds, rough);
    restore(stand.node, starts, new Set());
    frame = frameOf(crop, size, fill, aspect);
    zoom = zoomFor(crop, frame, fill);
    img = await frameImage(stand.node, css, zoom);
  } finally {
    stand.close();
  }

  // JPEG has no see-through pixels, so it always gets a backdrop
  const paint = paintOf(stage, format === 'jpeg' && backdrop === 'transparent' ? 'dark' : backdrop, look);
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d', { alpha: !paint })!;
  paintFrame(ctx, img, crop, zoom, frame, fill, paint);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, `image/${format}`, format === 'jpeg' ? 0.92 : undefined));
  if (!blob) throw new Error('the picture could not be saved');
  return blob;
}

/** How long one turn of the model on this stage takes, in seconds (0: nothing is moving). */
export function motionSeconds(stage: HTMLElement): number {
  const loop = loopLength(sourceOf(stage).node);
  return loop ? Math.min(MAX_SECONDS, loop / 1000) : 0;
}

export interface LoopOptions extends ImageOptions {
  /** How many pictures to take across one turn of the model. */
  frames?: number;
  onFrame?: (blob: Blob, done: number, total: number) => void;
  signal?: AbortSignal;
}

/**
 * A handful of pictures spread over one turn, drawn exactly the way the video is drawn: that is
 * the moving preview, so what it shows really is the film. The stage is put back the way it was
 * found — same moment, same paused or playing state — when it is done.
 */
export async function captureLoop(stage: HTMLElement, { backdrop = 'stage', format = 'png', size = 480, fill = FILL, aspect = null, look, frames: count = 12, onFrame, signal }: LoopOptions = {}): Promise<{ frames: Blob[]; seconds: number }> {
  const stand = understudy(stage);
  const source = stand;
  const css = styleSheetText(stand.doc, stand.node);
  const seconds = motionSeconds(stage);
  const starts = new WeakMap<Animation, number>();
  const rough = drawnCrop(source.node, (t) => seek(source.node, t, starts), seconds);
  const crop = await inkCrop(source.node, css, (t) => seek(source.node, t, starts), seconds, rough);
  const frame = frameOf(crop, size, fill, aspect);
  const zoom = zoomFor(crop, frame, fill);
  const paint = paintOf(stage, format === 'jpeg' && backdrop === 'transparent' ? 'dark' : backdrop, look);
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d', { alpha: !paint })!;
  const shots: Blob[] = [];
  try {
    for (let f = 0; f < count; f++) {
      if (signal?.aborted) throw new DOMException('cancelled', 'AbortError');
      if (!source.node.isConnected) throw new Error('the model was closed');
      seek(source.node, (f * seconds * 1000) / count, starts);
      const img = await frameImage(source.node, css, zoom);
      paintFrame(ctx, img, crop, zoom, frame, fill, paint);
      const shot = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, `image/${format}`, format === 'jpeg' ? 0.9 : undefined));
      if (!shot) throw new Error('the preview could not be drawn');
      shots.push(shot);
      onFrame?.(shot, f + 1, count);
    }
  } finally {
    stand.close();
  }
  return { frames: shots, seconds };
}

/** Puts every animation back where it was before the frames were taken. */
function restore(node: HTMLElement, starts: WeakMap<Animation, number>, playing: Set<Animation>): void {
  if (!node.isConnected) return;
  for (const animation of node.getAnimations({ subtree: true })) {
    const start = starts.get(animation);
    if (start !== undefined) animation.currentTime = start;
    if (playing.has(animation)) animation.play();
  }
}

/** The backdrop for this capture: the one handed in, or the one the stage is showing. */
const paintOf = (stage: HTMLElement, backdrop: Backdrop, look?: Paint | 'none'): Paint | null => {
  if (look === 'none') return null;
  return look ?? backdropOf(stage, backdrop);
};

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

interface OpenVideo {
  encoder: VideoEncoder;
  finish: () => Promise<Blob>;
}

/** An encoder and a container ready for frames of this size, and the way to close them off. */
async function openVideo(width: number, height: number, transparent: boolean): Promise<OpenVideo> {
  // H.264 in an MP4 plays everywhere, but it cannot be see-through: a transparent video is VP9
  // in a WebM instead (Chrome, Edge and Firefox play it; most editors take it).
  const codec = transparent ? 'vp09.00.10.08' : 'avc1.4d0028';
  const support = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate: 8e6, framerate: FPS });
  if (!support.supported) throw new Error('this browser cannot encode that format');
  const target = transparent ? new WebmTarget() : new Mp4Target();
  // 'offset' because a live recording's first frame is taken a few milliseconds in, not at zero,
  // and a container insists its first frame starts the clock
  const muxer = transparent
    ? new WebmMuxer({ target: target as WebmTarget, video: { codec: 'V_VP9', width, height, frameRate: FPS }, firstTimestampBehavior: 'offset' })
    : new Mp4Muxer({ target: target as Mp4Target, video: { codec: 'avc', width, height }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      throw err;
    },
  });
  encoder.configure({ codec, width, height, bitrate: 8e6, framerate: FPS, alpha: transparent ? 'keep' : 'discard' });
  return {
    encoder,
    finish: async (): Promise<Blob> => {
      await encoder.flush();
      muxer.finalize();
      return new Blob([(target as Mp4Target | WebmTarget).buffer!], { type: transparent ? 'video/webm' : 'video/mp4' });
    },
  };
}

export interface LiveOptions {
  stage: HTMLElement;
  ratio: Ratio;
  backdrop: Backdrop;
  /** The backdrop to paint, ready-made ('none' for see-through). Left out, the stage is asked. */
  look?: Paint | 'none';
  quality?: Quality;
  fill?: number;
  /** Stops here whatever happens. */
  seconds?: number;
  onTick?: (seconds: number, frames: number) => void;
  /** Abort this to stop early — that is the Stop button. */
  stop?: AbortSignal;
  /** Asked for on every frame, so a backdrop changed while filming is filmed changing. */
  lookNow?: () => Paint | 'none';
}

/**
 * Films the model as it happens, while the visitor plays with it: nothing is paused, nothing is
 * seeked, every frame is the stage as it stood at that moment. That is how a model that only moves
 * when you touch it — a drag, a hover, a click — gets into a video at all. Frames carry the real
 * time they were taken, so the film plays back at life speed even where drawing them was slow.
 */
export async function recordLive({ stage, ratio, backdrop, look, lookNow, quality = 1080, fill = FILL, seconds = MAX_SECONDS, onTick, stop }: LiveOptions): Promise<Recording> {
  if (!canRecord()) throw new Error('this browser cannot make videos yet');
  const frame = frameSize(ratio, quality);
  const transparent = backdrop === 'transparent';
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d', { alpha: transparent })!;
  const source = sourceOf(stage);
  const css = styleSheetText(source.doc, source.node);
  const paint = paintOf(stage, backdrop, look);
  // measured once, with the model left alone: it is being played with, so nothing may be moved.
  // A little room is added, since what the visitor does may reach past where it started.
  const measured = await inkCrop(source.node, css, () => {}, 0, drawnCrop(source.node, () => {}, 0));
  const box = naturalBox(source.node);
  const room = 0.12;
  const crop = {
    x: Math.max(0, measured.x - measured.width * room),
    y: Math.max(0, measured.y - measured.height * room),
    width: Math.min(box.width, measured.width * (1 + room * 2)),
    height: Math.min(box.height, measured.height * (1 + room * 2)),
  };
  const zoom = zoomFor(crop, frame, fill);
  const video = await openVideo(frame.width, frame.height, transparent);
  const started = performance.now();
  let frames = 0;
  let lastKey = -Infinity;
  try {
    for (;;) {
      if (stop?.aborted || performance.now() - started >= seconds * 1000 || !source.node.isConnected) break;
      const img = await frameImage(source.node, css, zoom);
      const when = performance.now() - started;
      if (when >= seconds * 1000) break;
      paintFrame(ctx, img, crop, zoom, frame, fill, lookNow ? paintOf(stage, backdrop, lookNow()) : paint);
      const key = when - lastKey >= 2000;
      if (key) lastKey = when;
      const picture = new VideoFrame(canvas, { timestamp: Math.round(when * 1000) });
      video.encoder.encode(picture, { keyFrame: key || frames === 0 });
      picture.close();
      frames++;
      onTick?.(when / 1000, frames);
      if (video.encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0));
      // never faster than the film's own frame rate; slower is fine, the timestamps carry the truth
      const wait = (frames * 1000) / FPS - (performance.now() - started);
      await new Promise((r) => setTimeout(r, Math.max(0, wait)));
    }
    if (!frames) throw new Error('nothing was filmed');
    const blob = await video.finish();
    return {
      blob,
      extension: transparent ? 'webm' : 'mp4',
      width: frame.width,
      height: frame.height,
      seconds: (performance.now() - started) / 1000,
      loops: false,
      turn: 0,
    };
  } finally {
    if (video.encoder.state !== 'closed') video.encoder.close();
  }
}

/**
 * Draws every frame of one loop and encodes them. The picture is fitted inside the chosen shape
 * with room around it, the same way the site frames a model.
 */
export async function recordModel({ stage, ratio, backdrop, look, quality = 1080, fill = FILL, onProgress, signal }: RecordOptions): Promise<Recording> {
  if (!canRecord()) throw new Error('this browser cannot make videos yet');
  const { width, height } = frameSize(ratio, quality);
  const transparent = backdrop === 'transparent';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: transparent })!;

  // the whole film is drawn from a copy kept out of sight, so the model on screen carries on as
  // it was: no jumping through the loop under the visitor's eyes while the frames are taken
  const source = understudy(stage);
  const css = styleSheetText(source.doc, source.node);
  const loop = loopLength(source.node);
  const seconds = loop ? Math.min(MAX_SECONDS, loop / 1000) : 4;
  const frames = Math.round(seconds * FPS);
  const starts = new WeakMap<Animation, number>();
  const paint = paintOf(stage, backdrop, look);
  const rough = drawnCrop(source.node, (t) => seek(source.node, t, starts), seconds);
  const crop = await inkCrop(source.node, css, (t) => seek(source.node, t, starts), seconds, rough);
  // enough resolution that the model fills the frame sharply, without asking the browser to
  // rasterise more than it needs
  const zoom = Math.min(4, Math.max(1, Math.min((width * fill) / crop.width, (height * fill) / crop.height)));

  const video = await openVideo(width, height, transparent);
  const encoder = video.encoder;

  try {
    for (let f = 0; f < frames; f++) {
      if (signal?.aborted) throw new DOMException('cancelled', 'AbortError');
      if (!source.node.isConnected) throw new Error('the model was closed while the video was being made');
      seek(source.node, (f * 1000) / FPS, starts);
      const img = await frameImage(source.node, css, zoom);

      paintFrame(ctx, img, crop, zoom, { width, height }, fill, paint);

      const frame = new VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      encoder.encode(frame, { keyFrame: f % (FPS * 2) === 0 });
      frame.close();
      if (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0));
      onProgress?.((f + 1) / frames);
    }
    const blob = await video.finish();
    return {
      blob,
      extension: transparent ? 'webm' : 'mp4',
      width,
      height,
      seconds,
      loops: !loop || loop / 1000 <= MAX_SECONDS,
      turn: loop / 1000,
    };
  } finally {
    if (encoder.state !== 'closed') encoder.close();
    source.close();
  }
}
