import './styles/main.scss';
import { demos } from './demos';

/**
 * /embed/<id>/ — just the demo, filling the frame. Used two ways:
 *  - in an <iframe> on someone else's site ("Copy embed code"),
 *  - as the camera target for scripts/generate-media.mjs, which films every demo at build time
 *    (`?og=1` adds the title strip used for the social preview image).
 */
const stage = document.querySelector<HTMLElement>('[data-demo]');
const demo = stage && demos.find((d) => d.id === stage.dataset.demo);

if (stage && demo) {
  const scene = document.createElement('div');
  scene.className = `scene${demo.fill ? ' scene--fill' : ''}`;
  scene.innerHTML = demo.html.replaceAll('{{uid}}', 'embed');
  stage.replaceChildren(scene);
  demo.init?.(scene, stage);
}

if (new URLSearchParams(location.search).has('og')) document.documentElement.dataset.og = '';

// Signals the recorder that the demo is mounted and styled.
document.documentElement.dataset.ready = '';
