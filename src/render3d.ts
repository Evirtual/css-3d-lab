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

/** Is there any 3D inside this element — a turned descendant, or one that passes 3D on? */
function holds3D(element: HTMLElement): boolean {
  for (const node of element.querySelectorAll<HTMLElement>('*')) {
    const style = getComputedStyle(node);
    if (style.transformStyle === 'preserve-3d' || style.perspective !== 'none') return true;
    const own = ownTransform(style, 1, 1);
    if (own && !own.is2D) return true;
    for (const pseudo of ['::before', '::after'] as const) {
      const ps = getComputedStyle(node, pseudo);
      if (!isPseudo(ps)) continue;
      const turn = ownTransform(ps, 1, 1);
      if ((turn && !turn.is2D) || ps.transformStyle === 'preserve-3d') return true;
    }
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

/** Might this face have pixels one can see through? Then it has to be drawn after the solid ones. */
function seeThrough(style: CSSStyleDeclaration, hasText: boolean): boolean {
  if (num(style.opacity) < 1) return true;
  if (isPaint(style.boxShadow)) return true; // soft edges
  if (isPaint(style.backgroundImage)) return /rgba\(|transparent|hsla\(|\/ 0?\.\d/.test(style.backgroundImage);
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

/**
 * Copies the states an element is in (hovered, focused) onto its copy, as marks the stylesheet
 * has been rewritten to read, and returns them as a string — a face hovered looks different from
 * one that is not, so its picture is kept per state.
 */
export type Mark = (live: HTMLElement, copy: HTMLElement) => string;

// (place-items and friends too: newer browsers honour them in plain block layout, and a stage's
// place-items: center would then shift the face inside its own picture)
const NEUTRAL =
  ';position:static !important;inset:auto !important;display:block !important;width:auto !important;height:auto !important;margin:0 !important;padding:0 !important;border:0 !important;transform:none !important;translate:none !important;rotate:none !important;scale:none !important;perspective:none !important;zoom:1 !important;visibility:hidden;background:none !important;box-shadow:none !important;overflow:visible !important;clip-path:none !important;filter:none !important;opacity:1 !important;place-items:normal !important;place-content:normal !important;place-self:auto !important;text-align:start !important';

// a face drawn on its own: no transform, no motion, laid out at its true size where it stands
const FLAT = ';position:relative;inset:auto;margin:0;transform:none !important;translate:none !important;rotate:none !important;scale:none !important;transition:none !important;animation:none !important;zoom:1;box-sizing:border-box;visibility:visible;opacity:1;place-self:auto !important';

// a pseudo-element drawn on its own: it fills the box made for it, and its element shows nothing
const ONLY_PSEUDO =
  '[data-c3d-only]::before,[data-c3d-only]::after{position:absolute !important;inset:0 !important;width:auto !important;height:auto !important;margin:0 !important;box-sizing:border-box !important;transform:none !important;translate:none !important;rotate:none !important;scale:none !important;opacity:1 !important}[data-c3d-only="before"]::after,[data-c3d-only="after"]::before{display:none !important}' +
  // a pseudo-element moved off in 3D is a face of its own: it is left out of its element's picture,
  // where the flat renderer would paint it straight over the element's words
  '[data-c3d-no-before]::before,[data-c3d-no-after]::after{display:none !important}';

/**
 * One face drawn flat, at `scale` pixels per one of its own. The element is copied on its own with
 * its transform taken off; its element children are left out unless it flattens them (then they
 * are part of its picture), its text and its untransformed pseudo-elements stay. With `pseudo`,
 * it is that pseudo-element alone that is drawn, in the box the page gives it.
 */
async function rasterise(element: HTMLElement, root: HTMLElement, css: string, scale: number, keepChildren: boolean, mark?: Mark, pseudo?: Pseudo): Promise<Raster | null> {
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
  holder.className = root.parentElement?.className ?? ''; // the panel's state (a held hover) comes along
  const copy = element.cloneNode(true) as HTMLElement;
  if (!keepChildren) for (const child of [...copy.children]) child.remove();
  copy.style.cssText += `${FLAT};left:${pad.l}px;top:${pad.t}px;width:${box.width}px;height:${box.height}px;display:${style.display}`;
  // what it inherits from the page has to come along, or text lands in the browser's own serif
  for (const property of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'color', 'text-align']) {
    copy.style.setProperty(property, style.getPropertyValue(property));
  }
  if (!pseudo) {
    for (const which of ['before', 'after'] as const) {
      const other = getComputedStyle(element, `::${which}`);
      if (isPseudo(other) && ownTransform(other, 1, 1)) copy.setAttribute(`data-c3d-no-${which}`, '');
    }
  } else {
    // the element itself is a bare stage for its pseudo: nothing of its own shows
    copy.replaceChildren();
    copy.style.cssText += ';background:none !important;border:0 !important;box-shadow:none !important;outline:none !important;overflow:visible !important;clip-path:none !important;filter:none !important';
    copy.setAttribute('data-c3d-only', pseudo === '::before' ? 'before' : 'after');
  }
  // Each ancestor becomes a shell, and so do its siblings and the face's own — as empty, unshown
  // placeholders in their true order. A layer's colour may come from :nth-child(2), a face's from
  // :last-child or a sibling combinator, and those only hold if the family is all present.
  const line: HTMLElement[] = [];
  for (let node: HTMLElement | null = element; node && node !== root.parentElement; node = node.parentElement) line.unshift(node);
  let cursor: HTMLElement = holder;
  for (const node of line) {
    const parent = node.parentElement;
    const siblings = parent && node !== root ? [...parent.children] : [node];
    let next: HTMLElement | null = null;
    for (const sibling of siblings) {
      if (sibling === node) {
        const shell = node === element ? copy : (node.cloneNode(false) as HTMLElement);
        if (node !== element) shell.style.cssText += NEUTRAL;
        mark?.(node, shell);
        cursor.append(shell);
        next = shell;
      } else {
        const ghost = sibling.cloneNode(false) as HTMLElement;
        ghost.style.cssText += ';display:none !important';
        cursor.append(ghost);
      }
    }
    if (!next) break;
    cursor = next;
  }
  const xml = new XMLSerializer().serializeToString(holder);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${py}"><defs><style type="text/css"><![CDATA[\n${css}\n*{transition:none !important;animation-play-state:paused !important}\n${ONLY_PSEUDO}\n]]></style></defs><foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`;
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
async function collect(root: HTMLElement, css: string, scale: number, textures: Textures, mark?: Mark): Promise<Face[]> {
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
    if (element.checkVisibility && !element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const own = zoomOf(element, root);
    const hasText = [...element.childNodes].some((child) => child.nodeType === 3 && child.textContent?.trim());
    // the state the face and its ancestors are in (hovered, focused): a different state is a
    // different picture, and the picture is kept per state
    let state = '';
    if (mark) for (let node: HTMLElement | null = element; node && node !== root; node = node.parentElement) state += mark(node, document.createElement('i'));
    const kept = textures.get(element) ?? {};
    textures.set(element, kept);
    const picture = async (which: '' | Pseudo, flat: boolean): Promise<Raster | null> => {
      let have = kept[which];
      if (!have || have.state !== state) {
        have = { state, raster: await rasterise(element, root, css, scale * own, flat, mark, which || undefined) };
        kept[which] = have;
      }
      return have.raster;
    };
    // opacity fades an element and everything in it: each face carries its own and its ancestors'
    let alpha = 1;
    for (let node: HTMLElement | null = element; node && node !== root; node = node.parentElement) alpha *= num(getComputedStyle(node).opacity);
    const place = (m: DOMMatrix, raster: Raster | null, fallback: [number, number, number, number] | null, through: boolean, cull: boolean, backdrop = false, fade = 1): void => {
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
      place(m, await picture(pseudo, false), fallback, seeThrough(ps, false) || alpha * fade < 1, ps.backfaceVisibility === 'hidden', false, fade);
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
  out_colour = (usePicture > 0.5 ? texture(picture, uv) : colour) * fade;
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
  /** What the last draw was made of. */
  last: () => { faces: number; textured: number; glError: number };
}

/**
 * A renderer for one model. Faces are pictured once and kept, so a video's frames only re-place
 * them — a turn is nearly always transforms, and a texture drawn at one moment serves for all.
 */
export function scene3D(root: HTMLElement, css: string, textureScale: number, mark?: Mark): Scene3D {
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
    const faces = await collect(root, css, textureScale, textures, mark);
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

    // solid faces in page order: the depth buffer settles who is in front, and of two in the
    // same plane the later one wins, as on the page
    for (const face of faces) {
      if (face.seeThrough) continue;
      gl.depthMask(!face.backdrop);
      one(face);
    }
    // see-through faces farthest first, on top of what is already there, without hiding each other
    gl.depthMask(false);
    for (const face of faces.filter((f) => f.seeThrough).sort((a, b) => a.depth - b.depth)) one(face);
    gl.depthMask(true);
    gl.disable(gl.SCISSOR_TEST);
    lastError = gl.getError();
    return canvas;
  };

  const last = (): { faces: number; textured: number; glError: number } => ({
    faces: lastFaces.length,
    textured: lastFaces.filter((f) => f.texture).length,
    glError: lastError,
  });

  const close = (): void => {
    for (const tex of uploaded.values()) gl.deleteTexture(tex);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };

  return { draw, close, last };
}
