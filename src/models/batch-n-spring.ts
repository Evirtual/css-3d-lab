import type { Demo } from './types';

/** Batch N's physics toy: a coil spring on a stand, bouncing a ball. */
export const demosSpring: Demo[] = [
  {
    id: 'spring',
    added: '2026-10-04',
    title: 'Bouncing coil spring',
    description:
      'A ten-turn coil spring on a stand throws a ball into the air, catches it and squeezes down under it. Each half-turn of wire is one flat half-ring laid in 3D and tilted by the pitch, so the coil is a real helix, and one scaleY from its base compresses all of it at once.',
    category: 'css',
    tags: ['loop', 'shape', 'spring', 'physics'],
    technique: ['half-rings tilted by the pitch = a helix', 'scaleY from the base squeezes the coil', 'eases matched at the hand-offs', 'billboarded sphere from one radial-gradient'],
  },
];
