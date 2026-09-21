import type { Demo } from './types';

const WORD_A = 'CUBE';
const WORD_B = 'ROLL';

/** Batch H: 3D form controls (keycaps, stepper, rating, toggle) and rolling letter cubes. */
export const demosH: Demo[] = [
  {
    id: 'keycaps',
    title: '3D keycaps',
    description:
      'Mechanical keycaps with sloped sides on a tilted plate. Hover or focus a key and its cap sinks into the plate with a glow; the button itself never moves, only the cap inside it.',
    category: 'css',
    tags: ['controls', 'hover', 'button', 'keyboard'],
    technique: ['trapezoid sides: clip-path + rotateX(atan(h / inset))', 'rotate each side around the key centre', 'static <button>, cap sinks with translateZ', 'glow faded with opacity'],
  },
  {
    id: 'stepper',
    title: 'Rolling number stepper',
    description:
      'A quantity stepper whose number sits on a cube. − and + roll it a quarter turn down or up; just before each turn JS writes the new number onto the face that is about to come into view.',
    category: 'js',
    tags: ['controls', 'shape', 'number', 'form'],
    technique: ['--a: step × 90deg, never wrapped', 'face index = step mod 4', 'write the next face before the turn', 'restart a nudge animation at the limits'],
  },
  {
    id: 'rating',
    title: 'Flipping star rating',
    description:
      'Five thin star plates, each a front and a gold back with an edge between them. Radio inputs and labels choose a rating, and every star up to it flips over, one after another.',
    category: 'css',
    tags: ['controls', 'form-hack', 'stars'],
    technique: ['radio:nth-of-type(n):checked ~ label:nth-child(-n + n)', 'clip-path star faces, stacked edge layers', 'rotateY(180deg) + backface-visibility', 'transition-delay from --i'],
  },
  {
    id: 'toggle',
    title: 'Rolling cube toggle',
    description:
      'A chunky switch whose knob is a real cube. Checked, it tips over its right-hand edge onto the other half of the track, bringing the moon face up, and the track changes colour.',
    category: 'css',
    tags: ['controls', 'form-hack', 'switch', 'shape'],
    technique: ['transform-origin on the cube’s bottom edge', 'one rotateY(90deg) = a real roll', 'stacked layers for the track’s depth', 'colour swap by cross-fading opacity'],
  },
  {
    id: 'cubeletters',
    title: 'Rolling letter cubes',
    description: `Every letter sits on its own cube. The cubes roll forward a quarter turn one after another, so ${WORD_A} becomes ${WORD_B} and back; after four turns each cube is where it started, so the loop has no seam.`,
    category: 'css',
    tags: ['text', 'loop', 'shape'],
    technique: ['face n: rotateX(n × -90deg) translateZ(s / 2)', 'hold + turn keyframes to 360deg', 'animation-delay from --i', 'backface-visibility: hidden'],
  },
];
