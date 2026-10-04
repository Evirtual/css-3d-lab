import type { Demo } from './types';

/** Batch N, text effects: a rubber stamp presses APPROVED onto a paper card, lifts, and the ink fades for the next press. */
export const demosStamptext: Demo[] = [
  {
    id: 'stamptext',
    added: '2026-10-04',
    title: 'Rubber stamp',
    description:
      'A wooden rubber stamp with a violet knob drops onto a paper card, presses and lifts away, and APPROVED is there in ink. The ink appears at the moment of contact, hidden under the stamp, and fades before the next press, so the loop has no seam.',
    category: 'css',
    tags: ['loop', 'text', 'stamp'],
    technique: ['box faces turned up from a footprint', 'billboard handle: the inverse of the desk’s turn', 'ink switched on under the stamp', 'shadow that tightens as it lands'],
  },
];
