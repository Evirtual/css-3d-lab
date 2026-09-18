import './styles/main.scss';
import { demos } from './demos';
import { icon } from './icons';

/**
 * Enhances the static demo and group pages. Everything a search engine needs is already in the
 * HTML; this only mounts the live preview and wires the copy buttons.
 */

try {
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch {
  /* private mode: stay on the default theme */
}

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
    } catch {
      btn.textContent = 'Copy blocked — select the text manually';
    }
    window.setTimeout(() => (btn.innerHTML = label), 1800);
  });
}
