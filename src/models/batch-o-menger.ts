import type { Demo } from './types';

export const demosMenger: Demo[] = [
  {
    id: 'menger',
    added: '2026-10-10',
    title: 'Menger sponge',
    description:
      'A level-1 Menger sponge turning slowly, nodding so each square tunnel lines up with your eye and you see straight through. Twenty small cubes are drawn as just 18 surfaces: six masked outer faces with a real hole each, and twelve tunnel walls, with the next level painted on as pits.',
    category: 'css',
    tags: ['loop', 'fractal', 'cube', 'geometry'],
    technique: ['mask cuts a real hole in one face', 'only the visible surfaces are drawn', 'phase-shifted opacity shading', 'nested spin and nod'],
  },
];
