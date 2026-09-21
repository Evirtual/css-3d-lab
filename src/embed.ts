import './styles/main.scss';
import { demos } from './models';
import { fitStages } from './fit';
import { mountModel } from './preview';

/**
 * /embed/<id>/ — just the demo, filling the frame. Used two ways:
 *  - in an <iframe> on someone else's site ("Copy embed code"),
 *  - as the camera target for scripts/generate-media.mjs, which films every demo at build time
 *    (`?og=1` adds the title strip used for the social preview image),
 *  - as a video-shaped layout (`?reel=tall` / `?reel=wide`) for anyone framing the demo as a clip.
 */
const stage = document.querySelector<HTMLElement>('[data-demo]');
const demo = stage && demos.find((d) => d.id === stage.dataset.demo);

if (stage && demo) mountModel(stage, demo.id, demo.title);

// An embed has no Pause switch, so it follows the OS "reduce motion" setting, now and whenever it
// changes: paused while it asks for less motion. The model's frame reads data-paused from this
// root (preview.ts, sync), the same signal the site's own Pause switch sets (chrome.ts).
const lessMotion = matchMedia('(prefers-reduced-motion: reduce)');
const followMotion = () => document.documentElement.toggleAttribute('data-paused', lessMotion.matches);
followMotion();
lessMotion.addEventListener('change', followMotion);

const params = new URLSearchParams(location.search);
if (params.has('og')) document.documentElement.dataset.og = '';
// ?reel=tall (9:16, Reels / Shorts / TikTok) or ?reel=wide (16:9, YouTube): the video-shaped layout
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
