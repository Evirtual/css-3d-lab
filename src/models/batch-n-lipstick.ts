import type { Demo } from './types';

/** Batch N's beauty product: a lipstick whose cap comes off and whose bullet twists up. */
export const demosLipstick: Demo[] = [
  {
    id: 'lipstick',
    added: '2026-10-04',
    title: 'Twist-up lipstick',
    description:
      'A violet lacquer lipstick with a gold collar. Hover or focus and the cap lifts off and sets down beside it, then the pink bullet turns a full circle as it rises out of the tube. The case, the cap and the bullet are twelve-strip cylinders, and the bullet’s angled tip is each strip cut by clip-path to the same slanted plane.',
    category: 'css',
    tags: ['hover', 'product', 'beauty', 'cylinder'],
    technique: ['twelve-strip cylinders', 'clip-path cuts every strip to one slanted plane', 'rotateY(360deg) while it rises', 'transition-delay choreography, reversed on the way back'],
  },
];
