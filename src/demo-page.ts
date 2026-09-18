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

for (const block of document.querySelectorAll<HTMLElement>('[data-code]')) {
  const btn = block.querySelector<HTMLButtonElement>('[data-copy-code]')!;
  const code = block.querySelector<HTMLElement>('pre code')!;
  btn.addEventListener('click', async () => {
    const label = btn.innerHTML;
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
      btn.innerHTML = `${icon('check')} Copied`;
      track(`copy/${stage?.dataset.demo ?? 'page'}/${block.querySelector('h3')?.textContent?.toLowerCase() ?? 'code'}`);
    } catch {
      btn.textContent = 'Copy blocked — select the text manually';
    }
    window.setTimeout(() => (btn.innerHTML = label), 1800);
  });
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
