import type { Demo } from './types';

/** Batch D: card interactions and loaders. */
export const demosD: Demo[] = [
  {
    id: 'hovercards',
    title: 'Hover card fan',
    description:
      'Three overlapping cards: the one you point at straightens and comes toward you while the others dim and lean away. Static strips catch the pointer, so nothing flickers.',
    category: 'css',
    tags: ['hover', 'cards', 'ui'],
    technique: ['static hit strips + pointer-events: none cards', 'one transform fed by custom properties', ':has() for "siblings before"', 'translateZ per card (never coplanar)'],
  },
  {
    id: 'flipgrid',
    title: 'Flip tile grid',
    description:
      'Six tiles that lift and flip to show their back. Odd tiles turn sideways, even ones head over heels, from a single custom property holding the rotation.',
    category: 'css',
    tags: ['hover', 'cards', 'grid', 'ui'],
    technique: ['a transform function stored in --flip', 'static tile, flipping inner', 'container pointer-events: none', 'backface-visibility: hidden'],
  },
  {
    id: 'accordion',
    title: 'Hinged accordion',
    description:
      'Radio buttons open one section at a time: its panel swings down on its top edge like a flap while the headers below slide out of the way. No height is animated.',
    category: 'css',
    tags: ['form-hack', 'controls', 'cards', 'ui'],
    technique: [':checked ~ sibling selectors', 'rotateX on transform-origin: top', 'translateY instead of height', 'fixed-size frame'],
  },
  {
    id: 'swipe',
    title: 'Swipe deck',
    description:
      'Drag the top card left or right: it slides and turns, easing to a stop instead of leaving the canvas. Past a threshold it sinks away into the depth and rejoins at the back, and the cards behind move up. JS only writes numbers; CSS does every motion.',
    category: 'js',
    tags: ['pointer', 'drag', 'cards', 'controls'],
    technique: ['Pointer Events + setPointerCapture', 'stack position --p → translateZ', 'transition: none while dragging', 'class swap for the fly-off'],
  },
  {
    id: 'polaroid',
    title: 'Polaroid scatter',
    description:
      'Four photos lying on a tilted table at different angles and heights. Point at one and it rises off the table, straightens and turns to face you, leaving its shadow behind.',
    category: 'css',
    tags: ['hover', 'cards', 'photo', 'gallery'],
    technique: ['tilted plane + counter-rotation on hover', 'translateZ = height above the table', 'static slots as hit targets', 'matching transform lists for clean interpolation'],
  },
  {
    id: 'cubenav',
    title: 'Cube gallery',
    description:
      'A gallery on the four sides of a cube. JS keeps one ever-growing angle, so Prev, Next and the dots always turn the short way round and never unwind.',
    category: 'js',
    tags: ['controls', 'shape', 'cards', 'gallery'],
    technique: ['accumulated --angle (never reset to 0)', 'shortest path: ((target − current + 4) % 4), 3 → −1', 'translateZ(−s/2) keeps the front at z = 0', 'transition on transform'],
  },
  {
    id: 'pricing',
    title: 'Pricing arc',
    description:
      'Three pricing cards standing in an arc: the outer two turn to face the centre, the featured one stands in front. The one you point at squares up and steps forward.',
    category: 'css',
    tags: ['hover', 'cards', 'ui', 'product'],
    technique: ['rotateY toward the centre', 'translateZ for emphasis instead of scale', 'static columns as hit targets', 'variables drive one transform'],
  },
  {
    id: 'cubeloader',
    title: 'Folding-square loader',
    description:
      'The classic fold loader laid on a floor in real perspective: each quadrant swings up over one edge, rests, then folds away over the next, a quarter-beat after its neighbour.',
    category: 'css',
    tags: ['loop', 'loader', 'spinner'],
    technique: ['one quadrant rotated 4× with --i', 'transform-origin on the shared corner', 'negative animation-delay chase', 'invisible at both ends = seamless'],
  },
  {
    id: 'rings',
    title: 'Chasing rings loader',
    description:
      'Three rings of paired arcs, each tumbling around a different axis while its arcs chase each other around the ring, circling a breathing core.',
    category: 'css',
    tags: ['loop', 'loader', 'spinner'],
    technique: ['transparent border + two coloured sides = arcs', 'rotateZ(tilt) rotateX(tumble) rotateZ(spin)', 'var() inside @keyframes', 'whole turns only = seamless'],
  },
  {
    id: 'equalizer',
    title: '3D equalizer',
    description:
      'Seven real cuboids bouncing like an audio meter. Walls are squashed with scaleY and each lid rides down by the same amount, so nothing but transforms ever changes.',
    category: 'css',
    tags: ['loop', 'loader', 'music', 'chart'],
    technique: ['scaleY walls + translateY lid (no layout)', 'shared keyframe stops keep lid and walls glued', 'hue, delay and duration per bar by :nth-child', 'per-bar delay and duration'],
  },
];
