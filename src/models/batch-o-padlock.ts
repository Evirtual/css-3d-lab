import type { Demo } from './types';

export const demosPadlock: Demo[] = [
  {
    id: 'padlock',
    added: '2026-10-10',
    title: 'Combination padlock',
    description:
      'A violet combination padlock with three number wheels, each a drum of ten faces that rolls in 3D under its arrow keys. Set the code shown under it and the steel shackle springs up and swings open; turn any wheel off it and the shackle swings back and drops shut.',
    category: 'js',
    tags: ['controls', 'lock', 'padlock', 'combination', 'dial'],
    technique: ['ten-face drum: rotateX(i × 36deg) translateZ(r)', 'unwrapped turn count, so 9 → 0 rolls forward', 'one .open class, per-state transition-delay', 'shackle as three stacked U layers'],
  },
];
