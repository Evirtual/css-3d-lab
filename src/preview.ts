import { standaloneDoc } from './models/snippet-utils';
import { snippets } from './models/snippets';
import type { Code } from './live-edit';

type Theme = 'dark' | 'light';

const previews = new WeakMap<HTMLIFrameElement, Preview>();

/**
 * One watcher for every preview on the page, instead of one each: a card grid can hold dozens,
 * and each own observer would walk the whole document on every attribute change.
 */
const live = new Set<Preview>();
let watching: MutationObserver | undefined;
function watch(preview: Preview): void {
  live.add(preview);
  watching ??= new MutationObserver(() => { for (const p of live) p.sync(); });
  // Controls can move with the stage into the maker. Observe their state, not model DOM.
  if (live.size === 1) watching.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class', 'data-theme', 'data-paused', 'data-dots', 'style', 'open'] });
}

/** A persistent document. Only HTML/JS changes rebuild it; CSS never remounts the model. */
export class Preview {
  readonly frame = document.createElement('iframe');
  private applied?: Code;
  private ready = false;
  private theme: Theme;
  private code: Code;
  private resize?: ResizeObserver;

  constructor(private id: string, private title: string, private original: Code, code: Code, theme: Theme) {
    this.code = { ...code };
    this.theme = theme;
    this.frame.className = 'live-frame';
    this.frame.title = `${title} — live preview`;
    this.frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    previews.set(this.frame, this);
    this.frame.addEventListener('load', () => this.loaded());
    this.frame.srcdoc = standaloneDoc(title, { how: [], ...original }, theme);
  }

  update(code: Code, theme: Theme): void {
    this.code = { ...code };
    this.theme = theme;
    if (!this.ready) return;
    if (this.applied?.html !== code.html || this.applied?.js !== code.js) {
      this.ready = false;
      delete this.frame.dataset.ready;
      this.frame.srcdoc = standaloneDoc(this.title, { how: [], ...code }, theme);
      return;
    }
    const doc = this.frame.contentDocument!;
    if (this.applied.css !== code.css) {
      const times = doc.getAnimations().map(a => ({ a, time: a.currentTime, paused: a.playState === 'paused' }));
      doc.querySelector('#c3d-code')!.textContent = code.css;
      // Force style reconciliation, then restore clocks on retained CSS animations.
      doc.body.getBoundingClientRect();
      for (const { a, time, paused } of times) {
        if (a.playState === 'idle') continue;
        a.currentTime = time;
        if (paused) a.pause();
      }
      this.applied = { ...code };
    }
    this.sync();
  }

  private loaded(): void {
    const doc = this.frame.contentDocument;
    const scene = doc?.querySelector<HTMLElement>('#c3d-scene');
    if (!doc || !scene) return;
    this.applied = this.applied ? { ...this.code } : { ...this.original };
    this.ready = true;
    this.resize?.disconnect();
    watch(this);
    this.resize = new ResizeObserver(() => this.sync());
    if (this.frame.parentElement) this.resize.observe(this.frame.parentElement);
    this.update(this.code, this.theme);
    if (this.ready) this.frame.dataset.ready = 'true';
  }

  sync(): void {
    if (!this.ready || !this.frame.isConnected) return;
    const doc = this.frame.contentDocument!;
    const stage = this.frame.closest<HTMLElement>('.stage');
    const wrap = stage?.closest('.stage-wrap');
    // The frame fills the stage, so inside a model 1vmin is one hundredth of the canvas's short
    // side, and the model sizes and places itself from that. Nothing out here adjusts a model —
    // except when the visitor asks for it: the export dialog's Model size slider writes --zoom on
    // the stage, and the scene is made that much bigger or smaller about the canvas's middle.
    //   Bigger is a zoom, so the model is laid out and drawn at its new size and 3D layers stay
    // sharp. Smaller is a scale: the model keeps the layout it has untouched and is drawn smaller,
    // so it is exactly that share of its untouched size. A zoom below 1 lays the model out again
    // at the small size, and layout rounds every border up to a whole device pixel — switch's
    // 1-unit rocker border, 0.27 px at 25% on a 16:9 canvas, becomes 1 px, and the rocker comes
    // out at ×0.377 of its size instead of ×0.357.
    //   Both are ordinary computed styles, so a capture picks them up with everything else and
    // the file matches the frame.
    const factor = Number.parseFloat(stage?.style.getPropertyValue('--zoom') ?? '');
    const zoom = Number.isFinite(factor) && factor > 1 ? String(factor) : '';
    const scale = Number.isFinite(factor) && factor > 0 && factor < 1 ? String(factor) : '';
    const scene = doc.getElementById('c3d-scene');
    if (scene && scene.style.zoom !== zoom) scene.style.zoom = zoom;
    if (scene && scene.style.scale !== scale) scene.style.scale = scale;
    const theme = stage?.closest<HTMLElement>('[data-theme]')?.dataset.theme ?? this.theme;
    doc.body.style.color = theme === 'light' ? '#14172b' : '#eceefb';
    const paused = document.documentElement.hasAttribute('data-paused') || Boolean(wrap?.classList.contains('is-frozen')) || Boolean(stage?.closest('.is-offscreen'));
    doc.documentElement.toggleAttribute('data-paused', paused);
    const held = Boolean(wrap?.classList.contains('is-held'));
    const holdStyle = doc.querySelector('#c3d-held')!;
    const css = held ? this.code.css.replace(/:hover/g, ':not(.c3d-never)') : '';
    if (holdStyle.textContent !== css) holdStyle.textContent = css;
  }

  close(): void {
    live.delete(this);
    this.resize?.disconnect();
    this.frame.remove();
  }

  fork(): Preview {
    const next = new Preview(this.id, this.title, this.code, this.code, this.theme);
    const source = this.frame.contentDocument;
    const nodes = source ? [...source.querySelectorAll('#c3d-scene, #c3d-scene *')] : [];
    const attributes = nodes.map(el => [...el.attributes].map(a => [a.name, a.value]));
    const times = source?.getAnimations().map(a => ({ time: a.currentTime, paused: a.playState === 'paused' })) ?? [];
    next.frame.addEventListener('load', () => {
      const doc = next.frame.contentDocument!;
      [...doc.querySelectorAll('#c3d-scene, #c3d-scene *')].forEach((el, i) => {
        for (const [name, value] of attributes[i] ?? []) el.setAttribute(name!, value!);
      });
      doc.getAnimations().forEach((a, i) => { if (times[i]) { a.currentTime = times[i].time; if (times[i].paused) a.pause(); } });
      next.sync();
    }, { once: true });
    return next;
  }
}

/**
 * Shows a model on a stage: a card, an embed, anywhere. It is the same document, the same frame
 * and the same measured place the viewer and the model's own page use, so a model looks the same
 * on the gallery as it does anywhere else.
 */
export function mountModel(stage: HTMLElement, id: string, title: string): () => void {
  const snip = snippets[id];
  if (!snip) return () => {};
  const code: Code = { html: snip.html, css: snip.css, ...(snip.js ? { js: snip.js } : {}) };
  const theme: Theme = stage.closest<HTMLElement>('[data-theme]')?.dataset.theme === 'light' ? 'light' : 'dark';
  const preview = new Preview(id, title, code, code, theme);
  stage.replaceChildren(preview.frame);
  return () => preview.close();
}

export function syncPreview(stage: HTMLElement): void {
  const frame = stage.querySelector('iframe');
  if (frame) previews.get(frame)?.sync();
}

export function forkPreview(frame: HTMLIFrameElement): Preview | undefined {
  return previews.get(frame)?.fork();
}
