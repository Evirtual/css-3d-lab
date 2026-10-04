import type { Demo } from './types';

/** Batch N, text effects: OPEN in neon tubes on stand-offs in front of a dark board that sways on its chains. */
export const demosNeonsign: Demo[] = [
  {
    id: 'neonsign',
    added: '2026-10-04',
    title: 'Neon tube sign',
    description:
      'OPEN in pink neon inside a teal tube frame, standing off a dark backboard on little brackets, the board hanging on two chains and turning slowly. The tubes light the board behind them with a soft cast glow, and every so often the E stutters.',
    category: 'css',
    tags: ['loop', 'text', 'neon', 'sign'],
    technique: ['tubes on translateZ stand-offs', 'text-shadow halo + a cast glow on the board', 'board box: four faces turned from its edges', 'flicker on opacity only'],
  },
];
