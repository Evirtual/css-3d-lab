import type { Demo } from './types';

/** Batch N, buttons and forms: a wall-plate lever that swings down about its pivot, and a lamp that lights when it is on. */
export const demosLever: Demo[] = [
  {
    id: 'lever',
    added: '2026-10-04',
    title: 'Pull lever switch',
    description:
      'A steel lever with a pink knob on a dark wall plate, seen from the side. Click it (or press Space) and the arm swings down through the air about its axle, and the amber lamp on the plate lights. A real checkbox and its label, no JavaScript.',
    category: 'css',
    tags: ['controls', 'form-hack', 'switch', 'lever'],
    technique: ['input:checked + .rig: rotateX about the axle', 'billboard knob: the inverse of every turn above it', 'backface-visibility picks the arm’s visible sides', 'lamp lit with opacity'],
  },
];
