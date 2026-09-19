import type { LiveEdit } from './live-edit';
import type { PrintLook } from './models/snippet-utils';
import { isHeld } from './hold-hover';

/** What the stage looks like right now (dark or light, dots or not), so the print matches it. */
function lookOf(stage: HTMLElement | null): PrintLook | undefined {
  if (!stage) return undefined;
  const cs = getComputedStyle(stage);
  const bg = /rgba(.*, 0)|transparent/.test(cs.backgroundColor) ? '#0b0d18' : cs.backgroundColor;
  const rgb = bg.match(/[d.]+/g)?.map(Number) ?? [11, 13, 24];
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
export function printModel(live: LiveEdit, stage?: HTMLElement | null): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  // an A4 landscape sheet in CSS px, out of sight (not display: none: it has to be laid out)
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1123px;height:794px;border:0;';
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
  frame.srcdoc = live.printDoc(lookOf(stage ?? null), isHeld(stage ?? null));
  document.body.append(frame);
}
