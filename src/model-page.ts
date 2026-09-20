import './styles/main.scss';
import { initAnalytics, track } from './analytics';
import { initCardLook } from './card-look';
import { initChrome } from './chrome';
import { fitStages } from './fit';
import { demos } from './models';
import { createEditor, type Editor } from './editor';
import { initFullscreen } from './fullscreen';
import type { Lang } from './highlight';
import { lazyMountCards } from './lazy-mount';
import { LiveEdit, type Part } from './live-edit';
import { copyText, embedCode } from './share';
import { openShareMenu } from './share-menu';
import { shortHint } from './short-hint';
import { initTint } from './tint';
import { trackDownloads } from './video';
import { initZoom, STAGE_THEME_EVENT, stageTheme } from './zoom';
import { printModel } from './print';
import { initThanks, showThanks } from './thanks';
import { markHolds } from './hold-hover';
import { sizeScene } from './models/size';

/**
 * Enhances the static demo and group pages. Everything a search engine needs is already in the
 * HTML; this mounts the live preview and turns the code listings into a small live editor.
 */

initChrome();
initAnalytics();
lazyMountCards();
fitStages(); // every demo on the page scales with its stage
initCardLook();
trackDownloads(track);
initThanks();
initFullscreen();

const stage = document.querySelector<HTMLElement>('[data-demo]');
const demo = stage && demos.find((d) => d.id === stage.dataset.demo);
const box = document.querySelector<HTMLElement>('[data-codebox]');

if (stage && demo && box) {
  const PARTS: Part[] = ['html', 'css', 'js'];
  const tabs = [...box.querySelectorAll<HTMLElement>('[data-pane]')];
  const bodies = [...box.querySelectorAll<HTMLElement>('[data-pane-body]')];
  const body = (key: string) => bodies.find((x) => x.dataset.paneBody === key);
  const copyBtn = box.querySelector<HTMLButtonElement>('[data-copy-code]')!;
  const note = box.querySelector<HTMLElement>('.code__note')!;
  const lines = box.querySelector<HTMLElement>('.codebox__lines')!;
  const editedBar = document.querySelector<HTMLElement>('[data-edited]');
  const lineCount = (code: string) => code.trimEnd().split('\n').length;

  // The original code is already in the page as text; no need to download it again.
  const textOf = (key: string) => body(key)?.querySelector('pre code')?.textContent ?? '';
  const live = new LiveEdit(demo.id, demo.title, { html: textOf('html'), css: textOf('css'), ...(body('js') ? { js: textOf('js') } : {}) });

  /* ----- the stage shows the site's own demo, or the visitor's edited snippet ----- */
  let unmount: (() => void) | undefined;
  // Not "is the stage empty?": it starts with a <noscript> fallback inside it.
  let showing: 'nothing' | 'original' | 'edit' = 'nothing';
  const mountOriginal = () => {
    const scene = document.createElement('div');
    scene.className = `scene${demo.fill ? ' scene--fill' : ''}`;
    sizeScene(scene, demo.id);
    scene.innerHTML = demo.html.replaceAll('{{uid}}', 'page');
    stage.replaceChildren(scene);
    const cleanup = demo.init?.(scene, stage);
    unmount = () => cleanup?.();
    showing = 'original';
  };
  const refreshStage = () => {
    if (live.edited) {
      unmount?.();
      unmount = undefined;
      stage.replaceChildren(live.frame(stageTheme()));
      showing = 'edit';
    } else if (showing !== 'original') {
      mountOriginal();
    }
    if (editedBar) editedBar.hidden = !live.edited;
  };
  // an edited frame has the stage theme baked in
  document.addEventListener(STAGE_THEME_EVENT, () => showing === 'edit' && refreshStage());
  let timer = 0;
  const refreshSoon = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(refreshStage, 350); // not on every keystroke
  };

  /* ----- editors replace the static listings ----- */
  const editors = new Map<Part, Editor>();
  let current = 'css';
  for (const part of PARTS) {
    const pane = body(part);
    const pre = pane?.querySelector('pre');
    if (!pane || !pre) continue;
    const editor = createEditor(part as Lang, part.toUpperCase(), live.current[part] ?? '', (code) => {
      live.set(part, code);
      if (current === part) lines.textContent = `${lineCount(code)} lines`;
      refreshSoon();
    });
    pre.replaceWith(editor.el);
    editors.set(part, editor);
  }

  const show = (key: string) => {
    current = key;
    for (const t of tabs) t.setAttribute('aria-selected', String(t.dataset.pane === key));
    for (const b of bodies) b.hidden = b.dataset.paneBody !== key;
    const pane = body(key)!;

    const editor = editors.get(key as Part);
    lines.textContent = `${editor ? lineCount(editor.value()) : pane.dataset.lines} lines`;
    if (editor && !pane.querySelector('.code-hint')) {
      const others = Object.fromEntries([...editors].map(([p, e]) => [p, lineCount(e.value())]));
      pane.insertAdjacentHTML('beforeend', shortHint(key, lineCount(editor.value()), others));
    }
    note.textContent =
      key === 'scss'
        ? 'This site’s own stylesheet for this effect (read-only). It needs the project’s Sass mixins, so copy from HTML / CSS instead.'
        : 'Editable · type here and the effect updates. Saved in this browser only.';
  };

  box.addEventListener('click', (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>('[data-pane]');
    if (tab) show(tab.dataset.pane!);
  });

  copyBtn.addEventListener('click', async () => {
    const code = editors.get(current as Part)?.value() ?? textOf(current);
    if (await copyText(copyBtn, code)) {
      track(`copy/${demo.id}/${current}${live.edited ? '/edited' : ''}`);
      showThanks(copyBtn);
    }
  });

  document.querySelector<HTMLButtonElement>('[data-reset]')?.addEventListener('click', () => {
    live.reset();
    for (const [part, editor] of editors) editor.set(live.current[part] ?? '');
    refreshStage();
    show(current);
    track(`reset/${demo.id}`);
  });

  /* ----- toolbar: everything acts on the CURRENT code, edited or not ----- */
  document.querySelector<HTMLElement>('[data-tools]')?.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!btn) return;
    if ('run' in btn.dataset) {
      track(`run/${demo.id}`);
      // A blob URL opens the snippet as its own page, exactly as it would run when pasted into a file.
      window.open(URL.createObjectURL(new Blob([live.doc()], { type: 'text/html' })), '_blank', 'noopener');
    } else if ('print' in btn.dataset) {
      track(`print/${demo.id}`);
      printModel(live, stage); // the print dialog, right here ("Save as PDF" is in there)
    } else if ('copyFile' in btn.dataset) {
      if (await copyText(btn, live.doc())) {
        track(`copy/${demo.id}/file`);
        showThanks(btn);
      }
    } else if ('shareLink' in btn.dataset) openShareMenu(demo.id, demo.title);
    else if ('shareEmbed' in btn.dataset) {
      if (await copyText(btn, embedCode(demo.id, demo.title), 'Embed code copied')) track(`embed/${demo.id}`);
    }
  });

  // "Hold hover" only where the model reacts to hover
  markHolds(stage, live.current.css);
  box.dataset.enhanced = ''; // CSS switches from "stacked with labels" to "tabbed"
  initTint();
  initZoom();
  refreshStage();
  show(current);
}
