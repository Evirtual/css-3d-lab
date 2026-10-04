import type { Demo } from './types';

/*
 * campfire: a loose pile of charred, smouldering logs on a bed of ash and coals inside a ring of
 * odd stones, flame tongues flickering out of step and embers rising, the whole ground turning
 * slowly. Its snippet is in snippets-batch-n-campfire.ts.
 */
export const demosCampfire: Demo[] = [
  {
    id: 'campfire',
    added: '2026-10-04',
    title: 'Campfire',
    description:
      'A loose pile of logs leaning into a teepee, charred and glowing at the burned ends, on a bed of ash and coals in a ring of odd stones, with flame tongues flickering out of step and embers drifting up as the ground turns slowly. Every log is a real box placed by its own custom properties, and every flame tongue is crossed planes, so the fire has volume from every side.',
    category: 'css',
    tags: ['loop', 'scene', 'fire', 'camping'],
    technique: [
      'log: a box placed by custom properties (lean, yaw, roll)',
      'char and smoulder: gradients, a crack layer pulsing on opacity',
      'flame tongues: crossed planes on uneven keyframes',
      'stones and embers: billboards that undo the turn',
    ],
  },
];
