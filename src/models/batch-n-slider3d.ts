import type { Demo } from './types';

/** Batch N, buttons and forms: a native range input on a 3D deck, with a block thumb and a row of bars that rise behind it. */
export const demosSlider3d: Demo[] = [
  {
    id: 'slider3d',
    added: '2026-10-04',
    title: '3D range slider',
    description:
      'A real range input laid on a dark deck seen from above: a block-shaped thumb rides in a recessed groove, and behind it ten bars rise one after another to the value, teal to pink. JS writes one plain number, the value; CSS places the thumb and raises every bar from it.',
    category: 'js',
    tags: ['controls', 'slider', 'form'],
    technique: ['native <input type="range"> in a 3D plane', 'one number --v drives translateX and scaleZ', 'clamp() per bar: (v − 10i) / 10', 'a groove cut with mask-composite'],
  },
];
