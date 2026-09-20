/**
 * Draws a 3D model the way the screen does — on the GPU, with a depth buffer — instead of asking
 * the browser to draw a copy of it into an SVG.
 *
 * The SVG route (record.ts) is the only way a page can photograph itself unaided, and for a flat
 * face it is perfect. But its renderer is not the one painting the screen: it does not sort a 3D
 * scene by depth, it ignores backface-visibility, and it paints things that sit behind a face on
 * top of it. A die comes out a blob; a puzzle cube loses its middle layer.
 *
 * So the two are combined. Every face of the model is drawn FLAT through the SVG route, which it
 * handles well, and becomes a texture. Where each face sits in space is read off the page — its
 * layout, its zoom, its transforms, the perspective above it — into one 4 × 4 matrix, exactly as
 * the browser composes it (checked against the browser's own boxes to within a pixel). WebGL then
 * draws the faces as textured quads with a depth buffer, which is what the screen's compositor
 * does: every pixel shows whichever face is nearest, whether faces touch, cross or twist through
 * one another. Opaque faces first; see-through ones after, farthest first, blended.
 *
 * No popup, no extra permission, nothing on the page changes, and it works wherever WebGL does —
 * which is everywhere.
 */

interface Face {
  matrix: DOMMatrix;
  width: number;
  height: number;
  /** A flat picture of the face, or a plain colour when one could not be drawn. */
  texture: HTMLCanvasElement | null;
  colour: [number, number, number, number] | null;
  /** Drawn in the blended pass, farthest first. */
  seeThrough: boolean;
  /** Skipped when it points away, like the screen does. */
  cullBack: boolean;
  /** How far from the viewer its middle is, for ordering the see-through pass. */
  depth: number;
  /** The box an `overflow: hidden` ancestor cuts it to, in the root's pixels. */
  clip: Clip | null;
  /**
   * A flat box with 3D inside it: on the page it is painted first and everything inside goes over
   * it, however far back that sits. So it leaves no depth behind for its own children to fail.
   */
  backdrop: boolean;
  /** How solid it is drawn: its own opacity and every ancestor's, multiplied. */
  alpha: number;
  /** Which element it came from, for the tooling that checks the renderer (tag.class[::pseudo]). */
  label: string;
}

interface Clip {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How far a face's ink reaches past its box on each side: shadows, blur, an outline. */
interface Pad {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** A face drawn flat: its picture, the box it was drawn for, and how far it spills past it. */
interface Raster {
  bitmap: HTMLCanvasElement;
  width: number;
  height: number;
  pad: Pad;
}

type Pseudo = '::before' | '::after';

const num = (value: string): number => parseFloat(value) || 0;

/**
 * An element's own transform, about its origin: the individual `translate`, `rotate` and `scale`
 * properties (which the computed `transform` leaves out) and then `transform`, in the order CSS
 * applies them. `null` when it has none.
 */
function ownTransform(style: CSSStyleDeclaration, width = 0, height = 0): DOMMatrix | null {
  const parts: string[] = [];
  if (style.translate && style.translate !== 'none') {
    // a percentage is of the box itself, which the computed value does not resolve
    const px = (value: string, of: number): string => (value.endsWith('%') ? `${(num(value) / 100) * of}px` : value);
    const [x = '0px', y = '0px', z = '0px'] = style.translate.split(' ');
    parts.push(`translate3d(${px(x, width)}, ${px(y, height)}, ${z})`);
  }
  if (style.rotate && style.rotate !== 'none') {
    const words = style.rotate.split(' ');
    if (words.length === 1) parts.push(`rotate(${words[0]})`);
    else if (words.length === 2) parts.push(`rotate${words[0].toUpperCase()}(${words[1]})`);
    else parts.push(`rotate3d(${words[0]}, ${words[1]}, ${words[2]}, ${words[3]})`);
  }
  if (style.scale && style.scale !== 'none') {
    const [x = '1', y = x, z = '1'] = style.scale.split(' ');
    parts.push(`scale3d(${x}, ${y}, ${z})`);
  }
  if (style.transform !== 'none') parts.push(style.transform);
  if (!parts.length) return null;
  const [tx, ty, tz = '0'] = style.transformOrigin.split(' ');
  return new DOMMatrix().translate(num(tx), num(ty), num(tz)).multiply(new DOMMatrix(parts.join(' '))).translate(-num(tx), -num(ty), -num(tz));
}

/**
 * Where an element sits, in the model root's pixels: its layout offset inside its parent (in the
 * parent's coordinate space), its own zoom, the perspective it puts on its children, and its own
 * transform about its origin — the way CSS composes them.
 */
function placement(element: HTMLElement, root: HTMLElement): DOMMatrix {
  const chain: HTMLElement[] = [];
  for (let node: HTMLElement | null = element; node && node !== root; node = node.parentElement) chain.unshift(node);
  let matrix = new DOMMatrix();
  for (const node of chain) {
    const style = getComputedStyle(node);
    const parent = node.parentElement!;
    // offsetLeft/Top are relative to the offsetParent; when that is not the parent itself, the
    // parent's own offsets are taken back off (both share the offsetParent then)
    const ox = node.offsetLeft - (node.offsetParent === parent ? 0 : parent.offsetLeft || 0);
    const oy = node.offsetTop - (node.offsetParent === parent ? 0 : parent.offsetTop || 0);
    const zoom = num(style.zoom) || 1;
    if (zoom !== 1) matrix = matrix.scale(zoom, zoom, 1); // its offsets are in its own zoomed units
    matrix = matrix.translate(ox, oy);
    const own = ownTransform(style, node.offsetWidth, node.offsetHeight);
    if (own) matrix = matrix.multiply(own);
    // A flat element (not preserve-3d) is where 3D stops: what is inside it is projected onto its
    // plane — by its own perspective, below — and only that flat picture goes on up the chain. So
    // whatever depth the chain has gathered so far (an ancestor's perspective, a tilt) is no longer
    // allowed to move points inside it sideways: z stops feeding x, y and w here. It still feeds z,
    // so faces inside keep their depth against one another.
    if (style.transformStyle !== 'preserve-3d') {
      matrix = DOMMatrix.fromMatrix(matrix);
      matrix.m31 = 0;
      matrix.m32 = 0;
      matrix.m34 = 0;
    }
    // its perspective is for what is inside it, so it comes after its own transform
    if (style.perspective !== 'none') {
      const [px, py] = style.perspectiveOrigin.split(' ').map(num);
      matrix = matrix.translate(px, py).multiply(new DOMMatrix(`perspective(${style.perspective})`)).translate(-px, -py);
    }
  }
  return matrix;
}

/** The product of every zoom above (and on) the element: how many screen pixels one of its own is. */
function zoomOf(element: HTMLElement, root: HTMLElement): number {
  let zoom = 1;
  for (let node: HTMLElement | null = element; node && node !== root.parentElement; node = node.parentElement) zoom *= num(getComputedStyle(node).zoom) || 1;
  return zoom;
}

// only a value that is nothing at all is nothing: a gradient with a transparent stop still paints
const isPaint = (value: string): boolean => Boolean(value) && value !== 'none' && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)';

const isPseudo = (ps: CSSStyleDeclaration): boolean => ps.content !== 'none' && ps.content !== 'normal' && ps.display !== 'none';

/** Does this element (or, without one, this pseudo-element) draw anything of its own, not counting its children? */
function paints(style: CSSStyleDeclaration, element?: HTMLElement): boolean {
  if (element && /^(IMG|CANVAS|svg|VIDEO)$/.test(element.tagName)) return true;
  if (isPaint(style.backgroundImage) || isPaint(style.backgroundColor) || isPaint(style.boxShadow)) return true;
  if (num(style.borderTopWidth) + num(style.borderRightWidth) + num(style.borderBottomWidth) + num(style.borderLeftWidth) > 0) return true;
  if (element && [...element.childNodes].some((child) => child.nodeType === 3 && child.textContent?.trim())) return true;
  if (!element) return style.content !== '""' && style.content !== "''"; // a pseudo-element with words
  for (const pseudo of ['::before', '::after'] as const) {
    const ps = getComputedStyle(element, pseudo);
    // an untransformed pseudo is part of its element's picture; a transformed one is a face of its own
    if (isPseudo(ps) && !ownTransform(ps, 1, 1)) return true;
  }
  return false;
}

/**
 * Is there real 3D inside this element? Only `transform-style: preserve-3d` and `perspective`
 * make one: they are what let a child's turn be seen in depth. A 3D transform on a child of a plain
 * flat box is drawn flat — projected straight on, no perspective — which is a flat picture like
 * any other, and one the SVG route draws the same way the page does.
 */
function holds3D(element: HTMLElement): boolean {
  for (const node of element.querySelectorAll<HTMLElement>('*')) {
    const style = getComputedStyle(node);
    if (style.transformStyle === 'preserve-3d' || style.perspective !== 'none') return true;
  }
  return false;
}

/** The alpha of a CSS colour, 1 when it has none. */
function alphaOf(colour: string): number {
  const match = colour.match(/rgba?\(([^)]+)\)/);
  if (!match) return colour === 'transparent' ? 0 : 1;
  const parts = match[1].split(/[\s,/]+/).filter(Boolean);
  return parts.length > 3 ? num(parts[3]) : 1;
}

/** The top-level pieces of a comma-separated CSS list (commas inside parentheses do not split). */
const layers = (value: string): string[] => value.split(/,(?![^(]*\))/).map((one) => one.trim());

/** Does this colour or gradient have any see-through part? */
const translucent = (value: string): boolean => /rgba\(|hsla\(|transparent|\/\s*0?\.\d|\/\s*0\)/.test(value);

/**
 * Might this face have pixels one can see through? Then it has to be drawn after the solid ones,
 * sorted by depth, and cannot take part in the depth test itself. A face is solid when something
 * opaque lies under everything else it paints — a solid colour, or a bottom gradient with no
 * see-through stop — whatever is painted on top of that. Only an outer shadow makes a solid face
 * see-through again: the glow around it has to blend.
 */
function seeThrough(style: CSSStyleDeclaration, hasText: boolean): boolean {
  if (num(style.opacity) < 1) return true;
  if (isPaint(style.boxShadow) && layers(style.boxShadow).some((one) => !/inset/.test(one))) return true;
  if (alphaOf(style.backgroundColor) >= 1) return false;
  if (isPaint(style.backgroundImage)) return translucent(layers(style.backgroundImage).at(-1) ?? '');
  if (alphaOf(style.backgroundColor) < 1) return true;
  return hasText && !isPaint(style.backgroundColor); // a label on nothing
}

/** Which way a face points on screen, from its projected corners: negative is its back. */
function winding(matrix: DOMMatrix, width: number, height: number): number {
  const at = (x: number, y: number): [number, number] => {
    const p = matrix.transformPoint(new DOMPoint(x, y, 0));
    return [p.x / p.w, p.y / p.w];
  };
  const [ax, ay] = at(0, 0);
  const [bx, by] = at(width, 0);
  const [cx, cy] = at(0, height);
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/**
 * How far ink reaches past the box: box-shadows (a one-pixel dot with a hundred shadows is a
 * starfield), text-shadows, an outline, a blur or drop-shadow filter. A face is drawn that much
 * bigger, or those pixels would be cut off at its edge.
 */
function inkPad(style: CSSStyleDeclaration): Pad {
  const pad: Pad = { l: 0, t: 0, r: 0, b: 0 };
  const grow = (ox: number, oy: number, reach: number): void => {
    pad.l = Math.max(pad.l, reach - ox);
    pad.r = Math.max(pad.r, reach + ox);
    pad.t = Math.max(pad.t, reach - oy);
    pad.b = Math.max(pad.b, reach + oy);
  };
  const shadows = (value: string, spreads: boolean): void => {
    if (!isPaint(value)) return;
    for (const one of value.split(/,(?![^(]*\))/)) {
      if (/inset/.test(one)) continue;
      const [ox = 0, oy = 0, blur = 0, spread = 0] = one.replace(/[a-z-]+\([^)]*\)/g, '').match(/-?[\d.]+(?=px)/g)?.map(Number) ?? [];
      grow(ox, oy, blur + (spreads ? spread : 0));
    }
  };
  shadows(style.boxShadow, true);
  if (style.overflow === 'visible') shadows(style.textShadow, false);
  const outline = num(style.outlineWidth) + num(style.outlineOffset);
  if (style.outlineStyle !== 'none' && outline > 0) grow(0, 0, outline);
  for (const [, radius] of style.filter.matchAll(/blur\(([\d.]+)px\)/g)) grow(0, 0, num(radius) * 2);
  for (const [, ox, oy, blur] of style.filter.matchAll(/drop-shadow\([^)]*?(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+([\d.]+)px)?/g)) grow(num(ox), num(oy), num(blur ?? '0') * 2);
  for (const side of ['l', 't', 'r', 'b'] as const) pad[side] = Math.ceil(pad[side]);
  return pad;
}

/** The box a pseudo-element takes up, in its element's pixels, from its resolved style. */
function pseudoBox(element: HTMLElement, ps: CSSStyleDeclaration): { left: number; top: number; width: number; height: number } {
  const extra = ps.boxSizing === 'content-box';
  const edge = (value: string): number | null => (value === 'auto' ? null : num(value));
  // a size left 'auto' is stretched between its two edges (inset: 0 is the whole element)
  const across = (size: string, from: string, to: string, whole: number, padding: number): number =>
    size !== 'auto' ? num(size) + (extra ? padding : 0) : whole - (edge(from) ?? 0) - (edge(to) ?? 0);
  const width = across(ps.width, ps.left, ps.right, element.offsetWidth, num(ps.paddingLeft) + num(ps.paddingRight) + num(ps.borderLeftWidth) + num(ps.borderRightWidth));
  const height = across(ps.height, ps.top, ps.bottom, element.offsetHeight, num(ps.paddingTop) + num(ps.paddingBottom) + num(ps.borderTopWidth) + num(ps.borderBottomWidth));
  const left = edge(ps.left) ?? (edge(ps.right) !== null ? element.offsetWidth - width - num(ps.right) : 0);
  const top = edge(ps.top) ?? (edge(ps.bottom) !== null ? element.offsetHeight - height - num(ps.bottom) : 0);
  return { left, top, width, height };
}

/* ---------- a face's picture: the element as the screen resolved it ---------- */

// A picture is drawn from the element's COMPUTED style, written inline on a copy — every property
// that is not the default for that kind of element. The screen has already resolved var(), hover,
// a held transition and an animation mid-flight into those values, so the picture needs no
// stylesheet, no ancestors to satisfy selectors, and no marks for states. (Reading the rules back
// from the stylesheet is not even reliable: a shorthand holding a var() comes back empty once a
// later longhand in the same rule touches it.)
const defaults = new Map<string, Map<string, string>>();
function defaultsFor(tag: string): Map<string, string> {
  let known = defaults.get(tag);
  if (known) return known;
  const shelf = document.createElement('div');
  // all: initial, so the probe inherits nothing from the page: what the page's body passes down
  // (its font, its colour) has to count as a difference, or the picture falls back to the
  // browser's own serif
  shelf.style.cssText = 'all:initial;position:absolute;left:-9999px;top:0;width:0;height:0;overflow:hidden';
  const probe = document.createElement(tag);
  shelf.append(probe);
  document.body.append(shelf);
  const style = getComputedStyle(probe);
  known = new Map();
  for (let i = 0; i < style.length; i++) known.set(style[i], style.getPropertyValue(style[i]));
  shelf.remove();
  defaults.set(tag, known);
  return known;
}

// custom properties are resolved already; motion is taken off separately
const SKIP = /^(--|animation|transition|-webkit-locale$)/;

/** Every computed property of `live` that is not the default for its tag, as inline style on `copy`. */
function inlineStyle(live: Element, copy: HTMLElement | SVGElement): void {
  const own = getComputedStyle(live);
  const known = defaultsFor(live.tagName);
  let text = '';
  for (let i = 0; i < own.length; i++) {
    const name = own[i];
    if (SKIP.test(name)) continue;
    const value = own.getPropertyValue(name);
    if (known.get(name) !== value) text += `${name}:${value};`;
  }
  copy.setAttribute('style', text);
}

/** A pseudo-element's computed style as a rule the picture's stylesheet can carry. */
function pseudoRule(live: Element, id: number, pseudo: Pseudo, extra: string): string {
  const own = getComputedStyle(live, pseudo);
  const known = defaultsFor(live.tagName);
  let text = '';
  for (let i = 0; i < own.length; i++) {
    const name = own[i];
    if (SKIP.test(name)) continue;
    const value = own.getPropertyValue(name);
    if (known.get(name) !== value) text += `${name}:${value};`;
  }
  return `[data-c3d-n="${id}"]${pseudo}{${text}${extra}}`;
}

// a face drawn on its own: no transform, no motion, laid out at its true size where it stands
// (its clip-path and filter stay: a triangular face is cut from its box by clip-path, and the
// picture is padded for a blur)
const FLAT = ';position:relative !important;inset:auto !important;margin:0 !important;transform:none !important;translate:none !important;rotate:none !important;scale:none !important;transition:none !important;animation:none !important;zoom:1 !important;box-sizing:border-box !important;visibility:visible !important;opacity:1 !important;place-self:auto !important';

// a pseudo-element drawn on its own fills the box made for it
const ONLY =
  'position:absolute !important;inset:0 !important;width:auto !important;height:auto !important;margin:0 !important;box-sizing:border-box !important;transform:none !important;translate:none !important;rotate:none !important;scale:none !important;opacity:1 !important;animation:none !important;transition:none !important';

// what a face's picture is made of, in the state it is in: when any of this changes the picture
// is drawn again (its own transform is left out — a turn does not change the picture, only where
// it goes; inside a flattened subtree it does, and there it is counted)
const PAINT = ['background', 'color', 'border', 'border-radius', 'box-shadow', 'outline', 'filter', 'text-shadow', 'font', 'content', 'visibility', 'display', 'opacity', 'clip-path', 'mask', 'width', 'height', 'padding', 'letter-spacing', 'text-decoration', 'inset'];

/** A cheap summary of how the face looks right now, for knowing when its picture has gone stale. */
function fingerprint(element: Element, deep: boolean): string {
  const one = (node: Element, withTransform: boolean): string => {
    const style = getComputedStyle(node);
    let out = '';
    for (const name of PAINT) out += style.getPropertyValue(name) + ';';
    if (withTransform) out += style.transform + ';' + style.translate + ';' + style.rotate + ';' + style.scale + ';';
    for (const pseudo of ['::before', '::after'] as const) {
      const ps = getComputedStyle(node, pseudo);
      if (!isPseudo(ps)) continue;
      for (const name of PAINT) out += ps.getPropertyValue(name) + ';';
      out += ps.transform + ';';
    }
    return out;
  };
  let out = one(element, false);
  if (deep) for (const node of element.querySelectorAll('*')) out += one(node, true);
  return out;
}

/**
 * One face drawn flat, at `scale` pixels per one of its own. The element is copied on its own with
 * its transform taken off; its element children are left out unless it flattens them (then they
 * are part of its picture), its text and its untransformed pseudo-elements stay. With `pseudo`,
 * it is that pseudo-element alone that is drawn, in the box the page gives it.
 */
export async function rasterise(element: HTMLElement, scale: number, keepChildren: boolean, pseudo?: Pseudo, inspect?: (holder: HTMLElement, rules: string) => void): Promise<Raster | null> {
  const style = getComputedStyle(element);
  const ps = pseudo ? getComputedStyle(element, pseudo) : null;
  const box = ps ? pseudoBox(element, ps) : { left: 0, top: 0, width: element.offsetWidth, height: element.offsetHeight };
  if (box.width <= 0 || box.height <= 0) return null;
  const pad = inkPad(ps ?? style);
  const full = { width: box.width + pad.l + pad.r, height: box.height + pad.t + pad.b };
  const px = Math.min(2048, Math.ceil(full.width * scale));
  const py = Math.min(2048, Math.ceil(full.height * scale));
  const real = px / full.width;
  const holder = document.createElement('div');
  holder.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  holder.style.cssText = `width:${full.width}px;height:${full.height}px;transform-origin:0 0;transform:scale(${real})`;
  const copy = element.cloneNode(true) as HTMLElement;
  if (!keepChildren || pseudo) for (const child of [...copy.children]) child.remove();
  if (pseudo) for (const node of [...copy.childNodes]) node.remove();
  // the copy and everything in it takes the look the screen resolved for its original
  const rules: string[] = [];
  let count = 0;
  const walk = (live: Element, twin: Element): void => {
    if (twin instanceof HTMLElement || twin instanceof SVGElement) inlineStyle(live, twin);
    const id = count++;
    twin.setAttribute('data-c3d-n', String(id));
    for (const which of ['::before', '::after'] as const) {
      const look = getComputedStyle(live, which);
      if (!isPseudo(look)) continue;
      if (live === element) {
        // the face's own pseudo: the one being drawn fills the picture; another that is turned
        // in 3D is a face of its own and is left out; a flat one stays where it is
        if (pseudo && which !== pseudo) continue;
        if (!pseudo && ownTransform(look, 1, 1)) continue;
      }
      rules.push(pseudoRule(live, id, which, live === element && which === pseudo ? ONLY : ''));
    }
    const liveKids = [...live.children];
    [...twin.children].forEach((kid, i) => liveKids[i] && walk(liveKids[i], kid));
  };
  walk(element, copy);
  copy.style.cssText += `${FLAT};left:${pad.l}px !important;top:${pad.t}px !important;width:${box.width}px !important;height:${box.height}px !important`;
  if (pseudo) {
    // the element itself is a bare stage for its pseudo: nothing of its own shows
    copy.style.cssText += ';background:none !important;border:0 !important;box-shadow:none !important;outline:none !important;overflow:visible !important;color:transparent !important';
  }
  holder.append(copy);
  const sheet = rules.join('\n');
  inspect?.(holder, sheet);
  const xml = new XMLSerializer().serializeToString(holder);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${py}"><defs><style type="text/css"><![CDATA[\n${sheet}\n]]></style></defs><foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`;
  const img = new Image();
  const drawn = new Promise<void>((ok, fail) => {
    img.onload = () => ok();
    img.onerror = () => fail(new Error('a face could not be drawn'));
  });
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await drawn;
  // WebGL will not take an SVG image as a texture, whatever its origin; a canvas it will. So the
  // face goes through a 2D canvas first, which a data: SVG may be drawn into without tainting it.
  // The canvas itself is what is uploaded: WebGL premultiplies it on the way in, the same on every
  // GPU (an ImageBitmap asked to premultiply is not, on some, and its see-through pixels then
  // bleed their colour over everything behind them).
  const flat = document.createElement('canvas');
  flat.width = px;
  flat.height = py;
  flat.getContext('2d')!.drawImage(img, 0, 0);
  return { bitmap: flat, width: box.width, height: box.height, pad };
}

interface Kept {
  state: string;
  raster: Raster | null;
}

/** The pictures drawn so far: per element, its own face and each pseudo-element face. */
type Textures = Map<HTMLElement, Partial<Record<'' | Pseudo, Kept>>>;

/**
 * Every face of the model, placed: elements that draw something, and pseudo-elements moved off
 * their element in 3D (the slab that gives a die's face its thickness, the walls of a city block).
 */
async function collect(root: HTMLElement, scale: number, textures: Textures): Promise<Face[]> {
  const faces: Face[] = [];
  const nodes = [root, ...root.querySelectorAll<HTMLElement>('*')];
  // the descendants of a face that flattens them are in its picture already
  const flattened = new Set<Element>();
  // what each element is cut to by the overflow: hidden boxes above it
  const clips = new Map<Element, Clip | null>([[root, null]]);
  for (const element of nodes) {
    if (element === root || flattened.has(element)) continue;
    const style = getComputedStyle(element);
    const matrix = placement(element, root);
    // an untransformed box that hides its overflow cuts everything inside it to its own edges
    // (a turned one would cut along a slant, which is left alone)
    let clip = clips.get(element.parentElement!) ?? null;
    if (style.overflow !== 'visible' && matrix.is2D && matrix.a === 1 && matrix.d === 1 && !matrix.b && !matrix.c) {
      const own = { x: matrix.e, y: matrix.f, w: element.offsetWidth, h: element.offsetHeight };
      clip = clip ? intersect(clip, own) : own;
    }
    clips.set(element, clip);
    if (style.display === 'none' || style.visibility === 'hidden' || num(style.opacity) === 0) continue;
    if (!element.offsetWidth || !element.offsetHeight) continue;
    // hidden by something between it and the root (not above the root: the dialog around a
    // stage may be fading in, and that is no business of the picture)
    let hidden = false;
    for (let node = element.parentElement; node && node !== root; node = node.parentElement) {
      const up = getComputedStyle(node);
      if (up.display === 'none' || up.visibility === 'hidden' || num(up.opacity) === 0) hidden = true;
    }
    if (hidden) continue;
    const own = zoomOf(element, root);
    const hasText = [...element.childNodes].some((child) => child.nodeType === 3 && child.textContent?.trim());
    const kept = textures.get(element) ?? {};
    textures.set(element, kept);
    // the picture is kept until the face looks different (a hover, a colour mid-transition)
    let state: string | null = null;
    const picture = async (which: '' | Pseudo, flat: boolean): Promise<Raster | null> => {
      state ??= fingerprint(element, flat && element.children.length > 0);
      let have = kept[which];
      if (!have || have.state !== state) {
        have = { state, raster: await rasterise(element, scale * own, flat, which || undefined) };
        kept[which] = have;
      }
      return have.raster;
    };
    // opacity fades an element and everything in it: each face carries its own and its ancestors'
    let alpha = 1;
    for (let node: HTMLElement | null = element; node && node !== root; node = node.parentElement) alpha *= num(getComputedStyle(node).opacity);
    const label = `${element.tagName.toLowerCase()}${element.classList[0] ? `.${element.classList[0]}` : ''}`;
    const place = (m: DOMMatrix, raster: Raster | null, fallback: [number, number, number, number] | null, through: boolean, cull: boolean, backdrop = false, fade = 1, pseudo = ''): void => {
      if (!raster && !fallback) return;
      const width = raster ? raster.width + raster.pad.l + raster.pad.r : 0;
      const height = raster ? raster.height + raster.pad.t + raster.pad.b : 0;
      const at = raster ? m.translate(-raster.pad.l, -raster.pad.t) : m;
      faces.push({
        matrix: at,
        width,
        height,
        texture: raster?.bitmap ?? null,
        colour: raster ? null : fallback,
        seeThrough: through,
        cullBack: cull,
        depth: at.transformPoint(new DOMPoint(width / 2, height / 2, 0)).z,
        clip: clips.get(element.parentElement!) ?? null,
        backdrop,
        alpha: alpha * fade,
        label: label + pseudo,
      });
    };
    // An element that does not preserve 3D flattens everything inside it onto its own plane:
    // whatever transforms those children have, they end up projected onto that one surface and
    // painted in page order. That is a flat picture, which is what the SVG route draws well, so
    // the whole subtree becomes a single face here. Only a preserve-3d element hands its children
    // on to the 3D above it, and each of those becomes a face of its own.
    // …but only when there is no 3D inside it. The SVG route draws a flat thing perfectly and 3D
    // badly, so a subtree that holds a turned face keeps its faces separate, and this element is
    // only the backdrop they are drawn over.
    const noDepth = style.transformStyle !== 'preserve-3d';
    const flat = noDepth && !holds3D(element);
    const holds = flat && element.children.length > 0;
    if (paints(style, element) || holds) {
      // a flattened picture shows through wherever its own background does not cover it
      const through = seeThrough(style, hasText) || alpha < 1 || (holds && alphaOf(style.backgroundColor) < 1);
      place(matrix, await picture('', flat), null, through, style.backfaceVisibility === 'hidden', noDepth && !flat);
      if (flat) for (const inside of element.querySelectorAll('*')) flattened.add(inside);
    }
    // a pseudo-element with a transform of its own is a face of its own
    for (const pseudo of ['::before', '::after'] as const) {
      const ps = getComputedStyle(element, pseudo);
      if (!isPseudo(ps) || !paints(ps)) continue;
      const box = pseudoBox(element, ps);
      const turn = ownTransform(ps, box.width, box.height);
      if (!turn) continue;
      const m = matrix.multiply(new DOMMatrix().translate(box.left, box.top).multiply(turn));
      const rgb = ps.backgroundColor.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
      const fallback: [number, number, number, number] = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, alphaOf(ps.backgroundColor)];
      const fade = num(ps.opacity);
      place(m, await picture(pseudo, false), fallback, seeThrough(ps, false) || alpha * fade < 1, ps.backfaceVisibility === 'hidden', false, fade, pseudo);
    }
  }
  return faces;
}

const intersect = (a: Clip, b: Clip): Clip => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) };
};

const VERTEX = `#version 300 es
in vec2 corner;
uniform mat4 place;
uniform vec2 size;
uniform vec2 stage;
uniform float depthRange;
out vec2 uv;
void main() {
  vec4 p = place * vec4(corner * size, 0.0, 1.0);
  // to clip space without dividing by w here, so the texture stays perspective-correct
  gl_Position = vec4((p.x * 2.0 - stage.x * p.w) / stage.x, -(p.y * 2.0 - stage.y * p.w) / stage.y, -p.z / depthRange, p.w);
  uv = corner;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D picture;
uniform vec4 colour;
uniform float usePicture;
uniform float fade;
out vec4 out_colour;
void main() {
  // premultiplied throughout, so fading is one multiply
  vec4 c = (usePicture > 0.5 ? texture(picture, uv) : colour) * fade;
  // a see-through pixel of a solid face (the corner cut off by a border-radius, the sky around a
  // clip-path mountain) must not leave depth behind, or it would hide what is behind it
  if (c.a < 0.01) discard;
  out_colour = c;
}`;

function program(gl: WebGL2RenderingContext): WebGLProgram {
  const compile = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
    return shader;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'program');
  return p;
}

/** Is there a GPU to draw on? */
export const canRender3D = (): boolean => {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
};

export interface Scene3D {
  /** Draws the model as it stands now into a canvas `zoom` times its size. */
  draw: (zoom: number) => Promise<HTMLCanvasElement>;
  close: () => void;
  /** What the last draw was made of: counts, and one line per face for the checking tools. */
  last: () => { faces: number; textured: number; glError: number; list: string[] };
}

/**
 * A renderer for one model. Faces are pictured once and kept, so a video's frames only re-place
 * them — a turn is nearly always transforms, and a texture drawn at one moment serves for all.
 */
export function scene3D(root: HTMLElement, textureScale: number): Scene3D {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true, alpha: true });
  if (!gl) throw new Error('no WebGL');
  const prog = program(gl);
  gl.useProgram(prog);
  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(prog, 'corner');
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const u = {
    place: gl.getUniformLocation(prog, 'place'),
    size: gl.getUniformLocation(prog, 'size'),
    stage: gl.getUniformLocation(prog, 'stage'),
    depthRange: gl.getUniformLocation(prog, 'depthRange'),
    colour: gl.getUniformLocation(prog, 'colour'),
    usePicture: gl.getUniformLocation(prog, 'usePicture'),
    fade: gl.getUniformLocation(prog, 'fade'),
  };
  const textures: Textures = new Map();
  const uploaded = new Map<HTMLCanvasElement, WebGLTexture>();
  const textureOf = (bitmap: HTMLCanvasElement): WebGLTexture => {
    let tex = uploaded.get(bitmap);
    if (tex) return tex;
    tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); // the blend below expects premultiplied colour
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    uploaded.set(bitmap, tex);
    return tex;
  };

  let lastFaces: Face[] = [];
  let lastError = 0;
  const draw = async (zoom: number): Promise<HTMLCanvasElement> => {
    const faces = await collect(root, textureScale, textures);
    // pictures no longer in use (a state that ended) go, with their textures
    const inUse = new Set(faces.map((face) => face.texture));
    for (const [bitmap, tex] of uploaded) {
      if (inUse.has(bitmap)) continue;
      gl.deleteTexture(tex);
      uploaded.delete(bitmap);
    }
    lastFaces = faces;
    const width = Math.round(root.offsetWidth * zoom);
    const height = Math.round(root.offsetHeight * zoom);
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.uniform2f(u.stage, root.offsetWidth, root.offsetHeight);
    gl.uniform1f(u.depthRange, 20000);

    const one = (face: Face): void => {
      if (face.cullBack && winding(face.matrix, face.width, face.height) < 0) return;
      if (face.clip) {
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(Math.floor(face.clip.x * zoom), Math.floor(height - (face.clip.y + face.clip.h) * zoom), Math.ceil(face.clip.w * zoom), Math.ceil(face.clip.h * zoom));
      } else gl.disable(gl.SCISSOR_TEST);
      gl.uniformMatrix4fv(u.place, false, face.matrix.toFloat32Array());
      gl.uniform2f(u.size, face.width, face.height);
      gl.uniform1f(u.fade, face.alpha);
      if (face.texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureOf(face.texture));
        gl.uniform1f(u.usePicture, 1);
      } else if (face.colour) {
        gl.uniform1f(u.usePicture, 0);
        const [r, g, b, a] = face.colour;
        gl.uniform4f(u.colour, r * a, g * a, b * a, a);
      } else return;
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // Solid faces in page order: the depth buffer settles who is in front, and of two in the
    // same plane the later one wins, as on the page. A backdrop goes in this pass too, whether or
    // not it is see-through: on the page a box is painted before what is inside it, and drawn any
    // later it would cover the solid faces inside it.
    for (const face of faces) {
      if (face.seeThrough && !face.backdrop) continue;
      gl.depthMask(!face.backdrop);
      one(face);
    }
    // the other see-through faces farthest first, on top of what is there, without hiding each other
    gl.depthMask(false);
    for (const face of faces.filter((f) => f.seeThrough && !f.backdrop).sort((a, b) => a.depth - b.depth)) one(face);
    gl.depthMask(true);
    gl.disable(gl.SCISSOR_TEST);
    lastError = gl.getError();
    return canvas;
  };

  const last = (): { faces: number; textured: number; glError: number; list: string[] } => ({
    faces: lastFaces.length,
    textured: lastFaces.filter((f) => f.texture).length,
    glError: lastError,
    list: lastFaces.map((f) => {
      const c = (x: number, y: number): string => {
        const p = f.matrix.transformPoint(new DOMPoint(x, y, 0));
        return `${Math.round(p.x / p.w)},${Math.round(p.y / p.w)}`;
      };
      return `${f.label} ${Math.round(f.width)}x${Math.round(f.height)} at ${c(0, 0)}→${c(f.width, f.height)} z${f.depth.toFixed(0)}${f.texture ? '' : ' colour'}${f.seeThrough ? ' see' : ''}${f.backdrop ? ' back' : ''}${f.cullBack ? ` cull${winding(f.matrix, f.width, f.height) < 0 ? '!' : ''}` : ''} a${f.alpha.toFixed(2)}${f.clip ? ` clip${Math.round(f.clip.x)},${Math.round(f.clip.y)} ${Math.round(f.clip.w)}x${Math.round(f.clip.h)}` : ''}`;
    }),
  });

  const close = (): void => {
    for (const tex of uploaded.values()) gl.deleteTexture(tex);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };

  return { draw, close, last };
}
