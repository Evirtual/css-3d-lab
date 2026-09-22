import type { Demo } from './types';

export const demosJ: Demo[] = [
  {
    id: 'windmill',
    title: 'Windmill',
    description:
      'A tapered tower of four leaning trapezoids with a pyramid cap, on a grass block. The sails turn with one rotateZ loop while the whole model turns slowly, so the depth reads.',
    category: 'css',
    tags: ['loop', 'scene', 'building'],
    technique: ['frustum: rotateY → translateZ → rotateX(lean)', 'clip-path trapezoids and triangles', 'rotateZ sails on a hub in front of the cap', 'one model spun with rotateY'],
  },
  {
    id: 'rocket',
    title: 'Rocket launch',
    description:
      'A rocket built from strips and leaning triangles fills the frame on its pad, lifts off in a cloud of smoke and climbs out of the top of the frame, the camera following it up as the ground drops away. Then the camera pans back down to the pad, where the next rocket stands ready, so the loop has no seam. Flame and smoke are gradient layers that only scale and fade.',
    category: 'css',
    tags: ['loop', 'scene', 'space', 'cylinder'],
    technique: ['cylinder of 10 strips + cone of 10 triangles', 'the ground drops with translate = a camera following the climb', 'flame: crossed planes, scale-only flicker', 'a mask-faded window, on a flat wrapper round the 3D scene'],
  },
  {
    id: 'lighthouse',
    title: 'Lighthouse',
    description:
      'A striped tower of leaning strips on a rock in a night sea. Two long translucent planes, crossed, make each light beam; they sweep round with rotateY while a lit wedge on the water turns with them.',
    category: 'css',
    tags: ['loop', 'scene', 'building', 'night'],
    technique: ['frustums of leaning strips', 'beam: two crossed clip-path planes, rotateY', 'sea: flat disc, wave lines slid by one period', 'rotateZ(-a) on the floor = rotateY(a) above it'],
  },
  {
    id: 'gauge',
    title: '3D gauge',
    description:
      'A speedometer dial tilted in perspective, with raised ticks and a needle stacked from four layers. The buttons only set --value; CSS turns it into an angle and an overshooting transition swings the needle there.',
    category: 'js',
    tags: ['controls', 'data', 'chart', 'dial'],
    technique: ['--value → rotate(calc(-120deg + v × 2.4deg))', 'overshoot cubic-bezier transition', 'needle: 4 translateZ layers', 'minor ticks: repeating-conic-gradient + mask'],
  },
  {
    id: 'timeline',
    title: '3D timeline',
    description:
      'Five event cards stand beside a road, each a step further back in Z. Prev / Next only change one number, --a; the whole track slides toward you by that many steps, so the active card comes to the front.',
    category: 'js',
    tags: ['controls', 'data', 'timeline', 'scene'],
    technique: ['translateZ(--i × -step) per card', 'track translateZ(--a × step) = camera move', 'opacity from --i − --a with clamp()', 'passed cards held back and faded'],
  },
];
