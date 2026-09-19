import './styles/main.scss';
// AA-TEST (temporary): ?aa gives every 3D face a transparent outline, to compare edge smoothing
if (new URLSearchParams(location.search).has('aa')) document.documentElement.classList.add('aa-test');
import { demos } from './models';
import { fitStages } from './fit';
import { sizeScene } from './models/size';

/**
 * /embed/<id>/ — just the demo, filling the frame. Used two ways:
 *  - in an <iframe> on someone else's site ("Copy embed code"),
 *  - as the camera target for scripts/generate-media.mjs, which films every demo at build time
 *    (`?og=1` adds the title strip used for the social preview image),
 *  - as the camera target for scripts/generate-reels.mjs (`?reel=1`, a vertical video layout).
 */
const stage = document.querySelector<HTMLElement>('[data-demo]');
const demo = stage && demos.find((d) => d.id === stage.dataset.demo);

if (stage && demo) {
  const scene = document.createElement('div');
  scene.className = `scene${demo.fill ? ' scene--fill' : ''}`;
  sizeScene(scene, demo.id);
  scene.innerHTML = demo.html.replaceAll('{{uid}}', 'embed');
  stage.replaceChildren(scene);
  demo.init?.(scene, stage);
}

const params = new URLSearchParams(location.search);
if (params.has('og')) document.documentElement.dataset.og = '';
// ?reel=tall (9:16, Reels / Shorts / TikTok) or ?reel=wide (16:9, YouTube): filmed by generate-reels.mjs
if (params.has('reel')) document.documentElement.dataset.reel = params.get('reel') === 'wide' ? 'wide' : 'tall';
// &clean=1: the version visitors download: just the demo and a small corner mark, no title
if (params.has('reel') && params.has('clean')) document.documentElement.dataset.reelClean = '';
// ?zoom=4: lay the page out 4x larger instead of filming it at 4x device pixels. Chrome draws 3D
// layers at one pixel per CSS pixel whatever the device scale, so only real layout size is sharp.
const zoom = Number(params.get('zoom'));
if (zoom >= 0.25 && zoom <= 8 && zoom !== 1) document.documentElement.style.zoom = String(zoom);

// An embed scales its demo with the frame; the image and video layouts set their own size.
if (!params.has('og') && !params.has('reel')) fitStages();

// Signals the recorder that the demo is mounted and styled.
document.documentElement.dataset.ready = '';
