import type { Demo } from './types';

export const demosWallet: Demo[] = [
  {
    id: 'wallet',
    added: '2026-09-30',
    title: 'Card wallet',
    description: 'A stitched leather wallet with four cards peeking out of its slot. Hover or focus and they fan upward and out, each rotated and lifted by its index with one calc().',
    category: 'css',
    tags: ['hover', 'card', 'product'],
    technique: ['two slabs apart in translateZ', 'index in --i, lift and rotateZ by calc()', 'transform-origin below the card', 'repeating-linear-gradient stitching'],
  },
];
