import type { Demo } from './types';

/** Batch N's topology piece: a Möbius strip of 48 segments with one half-twist, turning slowly. */
export const demosMobius: Demo[] = [
  {
    id: 'mobius',
    added: '2026-10-04',
    title: 'Möbius strip',
    description:
      'A band of 48 thin segments placed around a ring, each turned a little further about the band’s own direction, so the strip makes exactly one half-twist and has a single side. One gradient runs twice round its length, which is why the colour never repeats on the same face: follow it and you come back on the other side.',
    category: 'css',
    tags: ['loop', 'shape', 'mobius', 'topology'],
    technique: ['rotateY(i × 7.5deg) translateZ(R) rotateX(i × 3.75deg)', 'one twist = half a turn over the loop', 'front and back faces with backface-visibility', 'one gradient sliced by background-position'],
  },
];
