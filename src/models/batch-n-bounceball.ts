import type { Demo } from './types';

export const demosBounceball: Demo[] = [
  {
    id: 'bounceball',
    added: '2026-10-04',
    title: 'Bouncing ball',
    description:
      'A glossy ball drops onto a small floor tile, squashes flat, stretches as it leaves and climbs back to the top, while its shadow on the tile grows and darkens as it comes down. The fall and the climb are true parabolas, from two cubic-bezier curves that are exactly t² and its mirror.',
    category: 'css',
    tags: ['loop', 'loader', 'ball', 'bounce', 'physics'],
    technique: ['cubic-bezier(1/3, 0, 2/3, 1/3) = t²', 'scale3d about the contact point', 'shadow: scale + opacity on the floor plane', 'billboarded sphere'],
  },
];
