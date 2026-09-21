import { Preview } from './preview';
import site from '../site.config.json';
import { printDoc, standaloneDoc, type PrintLook, type PrintSetup } from './models/snippet-utils';

/**
 * One demo's editable snippet. Edits are kept in localStorage per demo, so they survive a reload
 * and are shared between the gallery dialog and the demo's full page. Nothing leaves the browser.
 */
export type Part = 'html' | 'css' | 'js';
export type Code = { html: string; css: string; js?: string };

const key = (id: string): string => `c3d-edit:${id}`;

export class LiveEdit {
  readonly original: Code;
  current: Code;

  constructor(
    readonly id: string,
    readonly title: string,
    original: Code,
  ) {
    this.original = { ...original };
    this.current = { ...original };
    try {
      const saved = JSON.parse(localStorage.getItem(key(id)) ?? 'null') as Partial<Code> | null;
      if (saved) for (const part of ['html', 'css', 'js'] as Part[]) if (typeof saved[part] === 'string') this.current[part] = saved[part];
    } catch {
      /* private mode or damaged entry: start from the original */
    }
  }

  get edited(): boolean {
    return (['html', 'css', 'js'] as Part[]).some((p) => (this.current[p] ?? '') !== (this.original[p] ?? ''));
  }

  set(part: Part, code: string): void {
    this.current[part] = code;
    try {
      if (this.edited) localStorage.setItem(key(this.id), JSON.stringify(this.current));
      else localStorage.removeItem(key(this.id));
    } catch {
      /* storage unavailable: the edit still works for this visit, it just will not persist */
    }
  }

  reset(): void {
    this.current = { ...this.original };
    try {
      localStorage.removeItem(key(this.id));
    } catch {
      /* nothing stored, nothing to remove */
    }
  }

  /** The complete standalone page for the CURRENT code. */
  doc(): string {
    return standaloneDoc(this.title, { how: [], ...this.current });
  }

  /** A print-ready A4 page of the CURRENT code (edited or not), which opens the print dialog. */
  printDoc(look?: PrintLook, held = false, clock: number | null = null, setup?: PrintSetup): string {
    return printDoc(this.title, { how: [], ...this.current }, 1, `${site.url.replace('https://', '')}/models/${this.id}/`, look, held, clock, setup);
  }

  private preview?: Preview;

  mount(stage: HTMLElement, theme: 'dark' | 'light'): void {
    this.preview ??= new Preview(this.id, this.title, this.original, this.current, theme);
    if (this.preview.frame.parentElement !== stage) stage.replaceChildren(this.preview.frame);
    this.preview.update(this.current, theme);
  }

  close(): void { this.preview?.close(); this.preview = undefined; }
}
