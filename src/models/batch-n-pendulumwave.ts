import type { Demo } from './types';

export const demosPendulumwave: Demo[] = [
  {
    id: 'pendulumwave',
    added: '2026-10-04',
    title: 'Pendulum wave',
    description:
      'Fifteen pendulums hang from one frame, each a little shorter and faster than the last, so the row drifts through snakes, waves and two crossing lines before it falls back into one. Pendulum k swings 20 + k times in the same 30 seconds, so the whole pattern repeats exactly.',
    category: 'css',
    tags: ['loop', 'loader', 'pendulum', 'physics', 'wave'],
    technique: ['duration = loop ÷ (20 + k)', 'sine ease-out then ease-in = a pendulum', 'counter-rotation keeps each bob facing you', 'lengths ∝ period²'],
  },
];
