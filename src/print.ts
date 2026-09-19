import type { LiveEdit } from './live-edit';

/**
 * "Print / PDF": the print dialog opens right over the page you are on ("Save as PDF" is one of
 * the printers), no new tab. The sheet (printDoc: the current code, edited or not, fitted to an A4
 * landscape page) is laid out in a hidden same-origin frame of that size, printed from there, and
 * the frame is removed afterwards.
 */
export function printModel(live: LiveEdit): void {
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
  frame.srcdoc = live.printDoc();
  document.body.append(frame);
}
