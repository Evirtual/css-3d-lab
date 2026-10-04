import type { Demo } from './types';

export const demosTicket: Demo[] = [
  {
    id: 'ticket',
    added: '2026-10-04',
    title: 'Tear-off ticket',
    description:
      'An event ticket with a perforated stub. Hover or focus and the stub tears along the line of holes and swings down and away, still hanging from the last hole at the bottom, its torn edge scalloped where the holes were.',
    category: 'css',
    tags: ['hover', 'card', 'ticket'],
    technique: ['mask-composite: intersect for notches and holes', 'transform-origin on the last hole', 'rotateZ then rotateY = droop and swing away', 'overshooting cubic-bezier'],
  },
];
