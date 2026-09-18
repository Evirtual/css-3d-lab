import './styles/main.scss';
import { initAnalytics, track } from './analytics';
import { initChrome } from './chrome';
import { demos } from './demos';
import { icon } from './icons';

/**
 * Enhances the static demo and group pages. Everything a search engine needs is already in the
 * HTML; this only mounts the live preview and wires the copy buttons.
 */

initChrome();
initAnalytics();

const stage = document.querySelector<HTMLElement>('[data-demo]');
const demo = stage && demos.find((d) => d.id === stage.dataset.demo);
if (stage && demo) {
  const scene = document.createElement('div');
  scene.className = `scene${demo.fill ? ' scene--fill' : ''}`;
  scene.innerHTML = demo.html.replaceAll('{{uid}}', 'page');
  stage.replaceChildren(scene);
  demo.init?.(scene, stage);
}

/* ---------- the code window: same tabs as the gallery dialog ---------- */

const box = document.querySelector<HTMLElement>('[data-codebox]');
if (box && demo) {
  const tabs = [...box.querySelectorAll<HTMLElement>('[data-pane]')];
  const bodies = [...box.querySelectorAll<HTMLElement>('[data-pane-body]')];
  const copyBtn = box.querySelector<HTMLButtonElement>('[data-copy-code]')!;
  const note = box.querySelector<HTMLElement>('.code__note')!;
  const lines = box.querySelector<HTMLElement>('.codebox__lines')!;
  let current = 'css';

  const show = async (key: string) => {
    current = key;
    for (const t of tabs) t.setAttribute('aria-selected', String(t.dataset.pane === key));
    for (const body of bodies) body.hidden = body.dataset.paneBody !== key;
    copyBtn.hidden = key === 'run';
    box.classList.toggle('is-run', key === 'run'); // a preview has no natural height: fill the column

    const body = bodies.find((x) => x.dataset.paneBody === key)!;
    if (key === 'run') {
      lines.textContent = 'live';
      note.textContent = 'The snippet running on its own: exactly what you get when you paste it.';
      if (!body.firstElementChild) {
        const doc = await standalone();
        if (!doc) return;
        track(`run/${demo.id}`);
        const frame = document.createElement('iframe');
        frame.title = `${demo.title} — standalone snippet`;
        frame.setAttribute('sandbox', 'allow-scripts');
        frame.srcdoc = doc;
        body.append(frame);
      }
      return;
    }
    lines.textContent = `${body.dataset.lines} lines`;
    note.textContent =
      key === 'scss'
        ? 'This site\u2019s own stylesheet for the demo. It needs the project\u2019s Sass mixins, so copy from HTML / CSS instead.'
        : `Standalone snippet \u00b7 plain ${key.toUpperCase()}, no build step, no dependencies.`;
  };

  box.addEventListener('click', (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>('[data-pane]');
    if (tab) void show(tab.dataset.pane!);
  });

  copyBtn.addEventListener('click', async () => {
    const label = copyBtn.innerHTML;
    const code = bodies.find((x) => x.dataset.paneBody === current)?.querySelector('pre code')?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.innerHTML = `${icon('check')} Copied`;
      track(`copy/${demo.id}/${current}`);
    } catch {
      copyBtn.textContent = 'Copy blocked — select the text manually';
    }
    window.setTimeout(() => (copyBtn.innerHTML = label), 1800);
  });

  box.dataset.enhanced = ''; // CSS switches from "stacked with labels" to "tabbed"
  void show(current);
}

/* ---------- page actions: the snippets are only fetched when someone asks for them ---------- */

async function standalone(): Promise<string | null> {
  if (!demo) return null;
  const { snippets, standaloneDoc } = await import('./demos/snippets');
  return standaloneDoc(demo.title, snippets[demo.id]);
}

document.querySelector<HTMLButtonElement>('[data-run]')?.addEventListener('click', async () => {
  const doc = await standalone();
  if (!doc || !demo) return;
  track(`run/${demo.id}`);
  // A blob URL opens the snippet as its own page, exactly as it would run when pasted into a file.
  window.open(URL.createObjectURL(new Blob([doc], { type: 'text/html' })), '_blank', 'noopener');
});

document.querySelector<HTMLButtonElement>('[data-copy-file]')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget as HTMLButtonElement;
  const label = btn.innerHTML;
  const doc = await standalone();
  if (!doc || !demo) return;
  try {
    await navigator.clipboard.writeText(doc);
    btn.innerHTML = `${icon('check')} Copied`;
    track(`copy/${demo.id}/file`);
  } catch {
    btn.textContent = 'Copy blocked — select the text manually';
  }
  window.setTimeout(() => (btn.innerHTML = label), 1800);
});
