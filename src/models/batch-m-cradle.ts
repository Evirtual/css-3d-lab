import type { Demo } from './types';

export const demosCradle: Demo[] = [
  {
    id: 'cradle',
    added: '2026-09-30',
    title: "Newton's cradle",
    description:
      'Five brass balls hang on V-shaped threads from a violet frame with real depth; the outer two swing out and back in turn while the middle three stay still. Each pendulum is one wrapper rotated about the point where its threads are tied, so the ball follows a true arc.',
    category: 'css',
    tags: ['loop', 'loader', 'pendulum', 'physics'],
    technique: ['transform-origin at the pivot', 'sine ease-out then ease-in = a pendulum', 'one @keyframes, var(--a) flips the side', 'negative animation-delay = half a period later'],
  },
];
