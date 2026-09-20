import { ArrayBufferTarget as Mp4Target, Muxer as Mp4Muxer } from 'mp4-muxer';
import { ArrayBufferTarget as WebmTarget, Muxer as WebmMuxer } from 'webm-muxer';
import { canRender3D, scene3D, type Scene3D } from './render3d';

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
/** An element's whole transform chain up to the model's root, multiplied out. */
function chainOf(element: HTMLElement, root: HTMLElement): DOMMatrix {
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
  return matrix;
}

function facesAway(element: HTMLElement, root: HTMLElement): boolean {
  const matrix = chainOf(element, root);
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
/**
 * Solid enough that nothing behind it would show through on screen. A see-through face (a glass
 * cube, a pyramid of coloured panes) is left alone: its far side is meant to be seen through it.
 */
function isOpaque(style: CSSStyleDeclaration): boolean {
  if (parseFloat(style.opacity) < 0.99) return false;
  const colour = style.backgroundColor.match(/rgba?\(([^)]+)\)/);
  const alpha = colour ? parseFloat(colour[1].split(/[\s,/]+/)[3] ?? '1') : 1;
  return alpha >= 0.99 || style.backgroundImage !== 'none';
}

function hideBackFaces(live: HTMLElement, copy: HTMLElement): void {
  const liveNodes = [live, ...live.querySelectorAll<HTMLElement>('*')];
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>('*')];
  liveNodes.forEach((source, i) => {
    const target = copies[i];
    // Only a face with nothing inside it. Plenty of models put backface-visibility on a whole
    // side of an object — a card face that carries a logo and text — to keep its edges smooth,
    // and taking one of those out would take the object with it.
    if (!target || source.children.length) return;
    const style = getComputedStyle(source);
    // A face that asked to vanish when it turns away always does. An opaque one that did not ask
    // is hidden all the same: on screen the front of the solid covers it, but the drawn picture
    // does not sort by depth and would paint it on top — which is a die coming out as a blob.
    if (style.backfaceVisibility !== 'hidden' && !isOpaque(style)) return;
    if (facesAway(source, live)) target.style.setProperty('visibility', 'hidden', 'important');
  });
}

/**
 * A pseudo-element pushed behind its own element — the core slab that gives a die's faces their
 * thickness — sits out of sight on screen and would be painted straight over the element's text
 * in a drawn picture. Those are sent behind the element's content, where they belong.
 */
function sinkPseudos(live: HTMLElement, copy: HTMLElement): string {
  const liveNodes = [live, ...live.querySelectorAll<HTMLElement>('*')];
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>('*')];
  const rules: string[] = [];
  let marked = 0;
  liveNodes.forEach((source, i) => {
    const target = copies[i];
    if (!target) return;
    for (const pseudo of ['::before', '::after'] as const) {
      const style = getComputedStyle(source, pseudo);
      if (style.content === 'none' || style.transform === 'none') continue;
      const matrix = new DOMMatrix(style.transform);
      if (matrix.m43 >= -0.5) continue; // not behind
      const mark = target.dataset.sunk ?? String(++marked);
      target.dataset.sunk = mark;
      rules.push(`[data-sunk="${mark}"]${pseudo}{z-index:-1 !important}`);
    }
  });
  return rules.join('\n');
}

/** The GPU scenes in use, one per model being drawn, closed with the model's stand-in. */
const scenes = new WeakMap<HTMLElement, Scene3D>();

/** The states a single element is in, written onto its copy as marks; the string names them. */
function markOne(live: HTMLElement, copy: HTMLElement): string {
  let state = '';
  for (const one of STATES) {
    try {
      if (live.matches(one.pseudo)) {
        copy.setAttribute(one.mark, '');
        state += one.mark;
      }
    } catch {
      /* a state this browser cannot test */
    }
  }
  return state;
}

/**
 * One frame of the model, `zoom` times its size on the page. On the GPU when there is one: every
 * face drawn flat and placed in 3D with a depth buffer, which is how the screen does it (see
 * render3d.ts). Otherwise the whole model is drawn into one SVG, which is right for flat things
 * and for most 3D, and fixed up as far as it can be for the rest.
 */
async function frameImage(node: HTMLElement, css: string, zoom: number): Promise<CanvasImageSource> {
  if (canRender3D()) {
    let scene = scenes.get(node);
    if (!scene) {
      scene = scene3D(node, css, Math.max(1, zoom), markOne);
      scenes.set(node, scene);
    }
    return scene.draw(zoom);
  }
  return frameImageSvg(node, css, zoom);
}

/**
 * One frame: the part of the stage the model fills, as an image. It is drawn at `zoom` times its
 * size on the page, so a small model still fills a 1080-wide video crisply (the whole trip is
 * vector: the browser rasterises the SVG at whatever size it is given).
 */
async function frameImageSvg(node: HTMLElement, css: string, zoom: number): Promise<HTMLImageElement> {
  const box = naturalBox(node);
  const holder = document.createElement('div');
  holder.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  // The whole stage, drawn `zoom` times bigger. It is cropped later, while painting: a 3D model
  // reaches outside its own box, and a picture cut to that box would lose those parts.
  holder.style.cssText = `width:${box.width}px;height:${box.height}px;transform-origin:0 0;transform:scale(${zoom})`;
  const copy = node.cloneNode(true) as HTMLElement;
  const posed = freezePose(node, copy) + '\n' + sinkPseudos(node, copy);
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
  holder.className = node.parentElement?.className ?? ''; // the panel's state (a held hover) comes along
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

const isPaint = (value: string): boolean => Boolean(value) && value !== 'none' && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)'; // a gradient with a transparent stop still paints

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
  // "Hold hover" keeps a model in its hover look by a class on the panel around the stage
  // (hold-hover.ts); the copy's panel carries it too, or an open box comes out shut
  if (stage.closest('.stage-wrap')?.classList.contains('is-held')) host.classList.add('is-held');
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
  return {
    node: copy,
    doc: source.doc,
    close: () => {
      scenes.get(copy)?.close();
      scenes.delete(copy);
      host.remove();
    },
  };
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
  /** The shape to save at, width ÷ height. Left out, the stage's own shape is kept. */
  saveAspect?: number;
}

/** The stage itself, whole: the picture is of the stage, because the stage is the frame. */
const wholeOf = (node: HTMLElement): Crop => ({ x: 0, y: 0, ...naturalBox(node) });

/** The file's size in pixels: `size` on the long side, at the shape asked for or the stage's own. */
export function frameFor(crop: { width: number; height: number }, size: number, aspect?: number): { width: number; height: number } {
  if (!(crop.width > 0) || !(crop.height > 0)) throw new Error('this model is not on screen, so there is nothing to draw');
  const shape = aspect && aspect > 0 ? aspect : crop.width / crop.height;
  const even = (n: number): number => Math.max(2, Math.round(n / 2) * 2);
  return shape >= 1 ? { width: even(size), height: even(size / shape) } : { width: even(size * shape), height: even(size) };
}

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
    // the same grid the stage shows, at the size the picture is: the stage's own dots, no denser
    paintDots(ctx, paint, frame.width, frame.height, frame.width / (crop.width || frame.width));
  }
  const shown = { width: crop.width * zoom, height: crop.height * zoom };
  const scale = Math.min((frame.width * fill) / shown.width, (frame.height * fill) / shown.height);
  const w = shown.width * scale;
  const h = shown.height * scale;
  ctx.drawImage(img, crop.x * zoom, crop.y * zoom, shown.width, shown.height, (frame.width - w) / 2, (frame.height - h) / 2, w, h);
}

export async function captureImage(stage: HTMLElement, { backdrop = 'stage', format = 'png', size = 1600, look, saveAspect }: ImageOptions = {}): Promise<Blob> {
  const stand = understudy(stage);
  // JPEG has no see-through pixels, so it always gets a backdrop
  const paint = paintOf(stage, format === 'jpeg' && backdrop === 'transparent' ? 'dark' : backdrop, look);
  const canvas = document.createElement('canvas');
  try {
    const css = styleSheetText(stand.doc, stand.node);
    const crop = wholeOf(stand.node);
    const frame = frameFor(crop, size, saveAspect);
    const zoom = Math.min(4, Math.max(1, frame.width / crop.width));
    const img = await frameImage(stand.node, css, zoom);
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d', { alpha: !paint })!;
    // painted before the stand-in goes: the frame lives on its GPU canvas, which goes with it
    paintFrame(ctx, img, crop, zoom, frame, 1, paint);
  } finally {
    stand.close();
  }
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, `image/${format}`, format === 'jpeg' ? 0.92 : undefined));
  if (!blob) throw new Error('the picture could not be saved');
  return blob;
}

/** How long one turn of the model on this stage takes, in seconds (0: nothing is moving). */
export function motionSeconds(stage: HTMLElement): number {
  const loop = loopLength(sourceOf(stage).node);
  return loop ? Math.min(MAX_SECONDS, loop / 1000) : 0;
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
export async function recordLive({ stage, ratio, backdrop, look, lookNow, quality = 1080, seconds = MAX_SECONDS, onTick, stop }: LiveOptions): Promise<Recording> {
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
  const crop = wholeOf(source.node);
  const zoom = Math.min(4, Math.max(1, frame.width / crop.width));
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
      paintFrame(ctx, img, crop, zoom, frame, 1, lookNow ? paintOf(stage, backdrop, lookNow()) : paint);
      const key = when - lastKey >= 2000;
      if (key) lastKey = when;
      const picture = new VideoFrame(canvas, { timestamp: Math.round(when * 1000) });
      video.encoder.encode(picture, { keyFrame: key || frames === 0 });
      picture.close();
      frames++;
      if (video.trouble) throw video.trouble;
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
    scenes.get(source.node)?.close();
    scenes.delete(source.node);
  }
}

/**
 * Draws every frame of one loop and encodes them. The picture is fitted inside the chosen shape
 * with room around it, the same way the site frames a model.
 */
export async function recordModel({ stage, ratio, backdrop, look, quality = 1080, onProgress, signal }: RecordOptions): Promise<Recording> {
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
  const crop = wholeOf(source.node);
  // enough resolution that the stage fills the frame sharply, without asking the browser to
  // rasterise more than it needs
  const zoom = Math.min(4, Math.max(1, width / crop.width));

  const video = await openVideo(width, height, transparent);
  const encoder = video.encoder;

  try {
    for (let f = 0; f < frames; f++) {
      if (signal?.aborted) throw new DOMException('cancelled', 'AbortError');
      if (!source.node.isConnected) throw new Error('the model was closed while the video was being made');
      seek(source.node, (f * 1000) / FPS, starts);
      const img = await frameImage(source.node, css, zoom);

      paintFrame(ctx, img, crop, zoom, { width, height }, 1, paint);

      const frame = new VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      encoder.encode(frame, { keyFrame: f % (FPS * 2) === 0 });
      frame.close();
      if (video.trouble) throw video.trouble;
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
