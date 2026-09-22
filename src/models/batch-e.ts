import type { Demo } from './types';

export const demosE: Demo[] = [
  {
    id: 'solar',
    title: 'Solar system',
    description:
      'Orbits are rings on a tilted plane, each spinning at its own speed. Every planet undoes both rotations, so it always faces the camera.',
    category: 'css',
    tags: ['loop', 'space', 'billboard', 'orbit'],
    technique: ['rotateX tilted plane', 'rotateZ orbit per ring', 'counter-rotation = billboarding', 'negative animation-delay', 'ring split around the ball (clip-path)'],
  },
  {
    id: 'city',
    title: 'Isometric city',
    description:
      'Sixteen buildings on a ground plane. Each one is a single element: the roof is lifted by translateZ and two pseudo-element walls hang down from it. The pointer turns the block.',
    category: 'js',
    tags: ['pointer', 'isometric', 'scene', 'building'],
    technique: ['rotateX + rotateZ isometric view', 'roof translateZ, walls on ::before / ::after', 'windows from layered gradients', 'pointer → --rx / --rz'],
  },
  {
    id: 'room',
    title: 'Look around a room',
    description:
      'A box seen from the inside: floor, ceiling and three walls. The pointer rotates it around the camera position, so it feels like turning your head.',
    category: 'js',
    tags: ['pointer', 'scene', 'interior'],
    technique: ['box faces turned inward', 'transform-origin z = perspective', 'walls extended toward the camera', 'pointer → --rx / --ry'],
  },
  {
    id: 'ferris',
    title: 'Ferris wheel',
    description:
      'The wheel turns on Z while every cabin turns the other way by the same amount, so the cabins stay upright. Two rims at different depths give it thickness.',
    category: 'css',
    tags: ['loop', 'scene', 'wheel'],
    technique: ['rotate → translate → rotate back', 'counter-rotating keyframes', 'transform-origin at the pivot', 'spoke angles and car slots in --a / --i'],
  },
  {
    id: 'island',
    title: 'Floating island',
    description:
      'A small terrain of block columns in an isometric view. Each block is one element: its top is lifted with translateZ and two pseudo-element walls hang from its edges.',
    category: 'css',
    tags: ['loop', 'isometric', 'scene', 'voxel'],
    technique: ['one element per block', 'walls: rotateX(-90deg) / rotateY(90deg) from the top edges', 'a height map in --x / --y / --z per block', 'bobbing + breathing shadow'],
  },
  {
    id: 'road',
    title: 'Endless drive',
    description:
      'A road plane laid flat with rotateX(90deg). The centre line slides by exactly one dash period, and posts travel the whole road with staggered delays, so the loop never shows a seam.',
    category: 'css',
    tags: ['loop', 'scene', 'road', 'synthwave'],
    technique: ['rotateX(90deg) floor + perspective-origin = horizon', 'translate by one pattern period', 'upright posts: rotateX(-90deg), origin bottom', 'flat haze overlay instead of a mask'],
  },
  {
    id: 'snow',
    title: 'Depth snowfall',
    description:
      'JS creates forty flakes once, each with a random depth, speed and drift in custom properties. One CSS animation does the falling; perspective makes near flakes big and fast.',
    category: 'js',
    tags: ['generated', 'loop', 'particles', 'scene', 'weather'],
    technique: ['random --x / --z / --t / --d per flake', 'translate3d keyframes with var()', 'negative delays = already snowing', 'trees at real depths hide far flakes'],
  },
  {
    id: 'pie',
    title: '3D donut chart',
    description:
      'A conic-gradient disc repeated in twelve translateZ layers. Lower layers are darkened, which reads as a solid wall, and a radial mask on each layer cuts the hole.',
    category: 'css',
    tags: ['loop', 'chart', 'data', 'donut'],
    technique: ['conic-gradient segments', 'stacked translateZ layers', 'darkening by --i', 'mask on the leaf layers only'],
  },
  {
    id: 'scatter',
    title: '3D scatter plot',
    description:
      'Points placed with the translate property inside a wireframe box that spins by CSS. Dragging anywhere on the canvas pauses the spin and adds a manual rotation; every point counter-rotates so it stays a round sphere.',
    category: 'js',
    tags: ['pointer', 'drag', 'chart', 'data', 'generated', 'loop', 'billboard'],
    technique: ['translate: x y z per point', 'nested rotations: tilt › spin › drag', 'animation-play-state while dragging', 'billboard: static inverse + animated rotate property'],
  },
  {
    id: 'map',
    title: 'Map pins',
    description:
      'A map drawn with gradients lies on a tilted plane. The pins undo the plane’s rotation around their tip, so they stand up and face you, then bounce in turn above a pulsing ring.',
    category: 'css',
    tags: ['loop', 'map', 'pin', 'billboard', 'scene'],
    technique: ['map from layered gradients', 'pin: inverse rotation, transform-origin bottom', 'ring stays in the ground plane', 'staggered animation-delay'],
  },
];
