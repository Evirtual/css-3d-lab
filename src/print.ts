import type { LiveEdit } from './live-edit';
import { slug } from './file-name';
import type { PrintLook, PrintSetup } from './models/snippet-utils';

/**
 * A computed colour as sRGB 0–255 channels and an alpha 0–1, or null if it is in a form this does
 * not read. Computed colours come as rgb()/rgba() (comma or space syntax, an optional "/ alpha")
 * or, for colour-mix results and the like, color(srgb r g b / a) with channels 0–1.
 */
export function parseColour(c: string): { rgb: [number, number, number]; a: number } | null {
  const s = c.trim().toLowerCase();
  if (s === 'transparent') return { rgb: [0, 0, 0], a: 0 };
  const m = /^(rgba?|color)\(\s*(.*?)\s*\)$/.exec(s);
  if (!m) return null;
  let body = m[2];
  const srgb = m[1] === 'color';
  if (srgb) {
    if (!body.startsWith('srgb ')) return null;
    body = body.slice(5);
  }
  const parts = body.split(/\s*[,/]\s*|\s+/).filter(Boolean);
  if (parts.length !== 3 && parts.length !== 4) return null;
  const num = (p: string, full: number): number => (p.endsWith('%') ? (parseFloat(p) / 100) * full : parseFloat(p));
  const rgb = parts.slice(0, 3).map((p) => (srgb ? num(p, 1) * 255 : num(p, 255))) as [number, number, number];
  const a = parts[3] === undefined ? 1 : num(parts[3], 1);
  if (![...rgb, a].every(Number.isFinite)) return null;
  return { rgb, a };
}

/** What the stage looks like right now (dark or light, dots or not), so the print matches it. */
export function lookOf(stage: HTMLElement | null): PrintLook | undefined {
  if (!stage) return undefined;
  // The colour the stage shows on screen: a card's stage is part see-through (alpha 0.7), so its
  // own colour is laid over its parents' until one is solid. A layer with alpha exactly 0 adds
  // nothing; one this cannot read, or none solid at all, leaves the dark default underneath.
  const layers: { rgb: [number, number, number]; a: number }[] = [];
  let unread = false;
  for (let el: Element | null = stage; el; el = el.parentElement) {
    const c = parseColour(getComputedStyle(el).backgroundColor);
    if (!c) {
      unread = true;
      break;
    }
    if (c.a > 0) layers.push(c);
    if (c.a >= 1) break;
  }
  const solid = !unread && layers.length > 0 && layers[layers.length - 1].a >= 1;
  const rgb = layers.reduceRight<[number, number, number]>(
    (under, c) => [0, 1, 2].map((i) => c.rgb[i] * c.a + under[i] * (1 - c.a)) as [number, number, number],
    [11, 13, 24],
  );
  const bg = solid ? `rgb(${rgb.map(Math.round).join(', ')})` : '#0b0d18';
  const [r, g, b] = solid ? rgb : [11, 13, 24];
  const light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
  const dotLayer = getComputedStyle(stage, '::before');
  const dots = dotLayer.display !== 'none' && dotLayer.backgroundImage.includes('gradient')
    ? { image: dotLayer.backgroundImage, size: dotLayer.backgroundSize }
    : undefined;
  return { bg, light, dots };
}

/**
 * "Print / PDF": the print dialog opens right over the page you are on ("Save as PDF" is one of
 * the printers), no new tab. The sheet (printDoc: the current code, edited or not, fitted to an A4
 * landscape page) is laid out in a hidden same-origin frame of that size, printed from there, and
 * the frame is removed afterwards.
 */
/**
 * How far into its animations the model on the stage is (ms), paused or not: the print jumps its
 * own copy to the same moment, so what prints is the pose on screen. The snippet runs the same
 * keyframes and timings as the stage, and they all start together, so one clock fits all.
 */
function clockOf(stage: HTMLElement | null): number | null {
  if (!stage) return null;
  const doc = stage.querySelector('iframe')?.contentDocument; // the model runs in a frame
  const anims = doc ? doc.getAnimations() : stage.getAnimations({ subtree: true });
  const a = anims.find((x) => x instanceof CSSAnimation);
  const t = a ? Number(a.currentTime) : NaN;
  return Number.isFinite(t) ? t : null;
}

/**
 * A sheet that is nothing but the picture. The picture was made at the sheet's own shape, with its
 * backdrop and its margin already in it, so it goes on edge to edge and what prints is what the
 * dialog showed.
 */
const pictureSheet = (src: string, paper: 'landscape' | 'portrait'): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CSS 3D Lab</title>
<style>
@page { size: A4 ${paper}; margin: 0; }
html, body { margin: 0; height: 100%; background: #fff; }
img { display: block; width: 100%; height: 100%; object-fit: fill; }
</style>
</head>
<body><img src="${src}" alt=""></body>
</html>`;

export function printModel(live: LiveEdit, stage?: HTMLElement | null, setup?: PrintSetup): void {
  const paper = setup?.paper ?? 'landscape';
  const sheet = paper === 'landscape' ? { width: 1123, height: 794 } : { width: 794, height: 1123 };
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  // an A4 landscape sheet in CSS px, out of sight (not display: none: it has to be laid out)
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${sheet.width}px;height:${sheet.height}px;border:0;`;
  frame.addEventListener('load', () => {
    const win = frame.contentWindow;
    if (!win) return frame.remove();
    // "Save as PDF" names the file after the document it is printing, so the sheet is titled like
    // every other file the site hands out rather than "CSS 3D Lab" for every model alike.
    win.document.title = `css-3d-lab-${slug(live.id)}`;
    win.addEventListener('afterprint', () => frame.remove());
    // a moment for fonts and the model's own script, then the dialog
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  });
  frame.srcdoc = setup?.picture
    ? pictureSheet(setup.picture, paper)
    : live.printDoc(lookOf(stage ?? null), clockOf(stage ?? null), { paper, fill: setup?.fill ?? 2 / 3 });
  document.body.append(frame);
}
