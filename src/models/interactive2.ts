import type { Demo } from './types';

/** Second batch of demos where JavaScript supplies values and CSS renders them. */
export const interactiveDemos2: Demo[] = [
  {
    id: 'dice',
    title: 'Dice roll',
    description: 'JS picks a random face and adds full turns; a CSS transition does the tumbling.',
    category: 'js',
    tags: ['controls', 'shape'],
    technique: ['Math.random() → target rotation', 'accumulating 360° turns', 'transition with overshoot easing'],
  },
  {
    id: 'cardstack',
    title: 'Card stack',
    description: 'Click the deck: the top card flies off and returns at the back. JS only reassigns positions.',
    category: 'js',
    tags: ['controls'],
    technique: ['position index in --p', 'calc() for offset, depth and z-index', 'class toggle for the exit'],
  },
  {
    id: 'parallax',
    title: 'Depth parallax',
    description: 'Layers sit at different translateZ depths; tilting the scene with the pointer makes them slide apart.',
    category: 'js',
    tags: ['pointer'],
    technique: ['translateZ per layer', 'scale() to compensate for distance', 'pointer → two rotation variables'],
  },
  {
    id: 'boxslider',
    title: 'Box slideshow',
    description: 'Four slides on the sides of a box. JS counts steps; CSS turns the box by 90° per step.',
    category: 'js',
    tags: ['controls', 'shape'],
    technique: ['rotateY(calc(var(--step) * -90deg))', 'unbounded counter = endless rotation', 'translateZ(-w/2) keeps the front at z = 0'],
  },
  {
    id: 'wavegrid',
    title: 'Wave grid',
    description: 'JS builds the grid and gives each cell its distance from the centre; CSS turns that into a ripple.',
    category: 'js',
    tags: ['generated', 'loop'],
    technique: ['generated DOM', 'animation-delay from distance', 'one shared @keyframes'],
  },
  {
    id: 'confetti',
    title: 'Confetti burst',
    description: 'Click anywhere on the canvas and the confetti bursts from that very point. JS gives each piece a random 3D vector in per cent of the canvas, and one CSS animation flies them all out to its edges.',
    category: 'js',
    tags: ['generated', 'pointer'],
    technique: ['random --x / --y per piece, in per cent of the canvas, plus --z and --spin', 'translate3d + rotate3d keyframes', 'a pool of pieces thrown again and again'],
  },
  {
    id: 'scrollspin',
    title: 'Scroll-linked spin',
    description: 'Scroll inside the box. JS turns scroll progress into one number; CSS maps it to rotation.',
    category: 'js',
    tags: ['controls', 'shape'],
    technique: ['scroll progress 0…1 in --p', 'position: sticky stage', 'CSS-only alternative: animation-timeline: scroll()'],
  },
  {
    id: 'ripple',
    title: 'Ripple flip',
    description: 'Click any tile: every tile flips, delayed by its distance from the one you clicked.',
    category: 'js',
    tags: ['pointer', 'generated'],
    technique: ['distance → --d → transition-delay', 'one data attribute flips everything', 'two-sided tiles'],
  },
];
