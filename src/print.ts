import type { LiveEdit } from './live-edit';
import type { PrintLook, PrintSetup } from './models/snippet-utils';
import { isHeld } from './hold-hover';

/** What the stage looks like right now (dark or light, dots or not), so the print matches it. */
function lookOf(stage: HTMLElement | null): PrintLook | undefined {
  if (!stage) return undefined;
  const cs = getComputedStyle(stage);
  const bg = /rgba(.*, 0)|transparent/.test(cs.backgroundColor) ? '#0b0d18' : cs.backgroundColor;
  const rgb = bg.match(/[\d.]+/g)?.map(Number) ?? [11, 13, 24];
  const light = bg.startsWith('#') ? false : 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 140;
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
    win.addEventListener('afterprint', () => frame.remove());
    // a moment for fonts and the model's own script, then the dialog
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  });
  frame.srcdoc = setup?.picture
    ? pictureSheet(setup.picture, paper)
    : live.printDoc(lookOf(stage ?? null), isHeld(stage ?? null), clockOf(stage ?? null), { paper, fill: setup?.fill ?? 2 / 3 });
  document.body.append(frame);
}
