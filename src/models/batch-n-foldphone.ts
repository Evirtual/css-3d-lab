import type { Demo } from './types';

/** Batch N's device: a book-style foldable phone that opens on hover or focus. */
export const demosFoldphone: Demo[] = [
  {
    id: 'foldphone',
    added: '2026-10-04',
    title: 'Foldable phone',
    description:
      'A book-style foldable phone, shut, showing its cover screen. Hover or focus and the right half swings open on its hinge like a page while the phone slides over to stay centred, and the big inner screen lights up across both halves. Each half is a thin slab of real faces, and the hinge spine turns at half the fold angle so it is always round the outside.',
    category: 'css',
    tags: ['hover', 'product', 'device', 'phone'],
    technique: ['rotateY(-180deg) about the hinge edge', 'spine at half the fold angle', 'one wallpaper split with background-size: 200%', 'translateX keeps the shut and open phone centred'],
  },
];
