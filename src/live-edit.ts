import { standaloneDoc } from './models/snippet-utils';
import sizes from './models/sizes.json';

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

  /** A sandboxed frame running the current code, for showing an edited version live on a stage. */
  frame(stage: 'dark' | 'light'): HTMLIFrameElement {
    const frame = document.createElement('iframe');
    frame.className = 'live-frame';
    frame.title = `${this.title} — your edited version`;
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.srcdoc = standaloneDoc(this.title, { how: [], ...this.current }, stage, (sizes as Record<string, { size: number }>)[this.id]?.size ?? 1);
    return frame;
  }
}
