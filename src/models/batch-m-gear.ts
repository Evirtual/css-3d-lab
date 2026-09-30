import type { Demo } from './types';

export const demosGear: Demo[] = [
  {
    id: 'gear',
    added: '2026-09-30',
    title: 'Spinning gear',
    description: 'A thick eight-tooth gear driving a smaller five-tooth one the other way. Each face is one clip-path polygon, and every straight edge of it gets a standing rectangle, so the gear has a real rim and real teeth.',
    category: 'css',
    tags: ['loop', 'gear', 'machine', 'cog'],
    technique: ['clip-path: polygon() face', 'standing rectangles on every edge', 'radii in the ratio of tooth counts', 'counter-spin at -8/5 of a turn'],
  },
];
