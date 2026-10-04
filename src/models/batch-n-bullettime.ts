import type { Demo } from './types';

/** Batch N, scenes: a bullet frozen mid-flight in its own air ripples, the camera turning round it. */
export const demosBullettime: Demo[] = [
  {
    id: 'bullettime',
    added: '2026-10-04',
    title: 'Bullet time',
    description:
      'A brass bullet hangs frozen mid-flight, with rings of rippled air and a few motion streaks behind it, while the camera circles the frozen moment. The bullet is a real solid: a twelve-sided body, nose and tip folded round its axis, each facet painted by which way it faces a fixed light.',
    category: 'css',
    tags: ['loop', 'scene', 'matrix', 'bullet', 'camera'],
    technique: ['rotateX(a) translateZ(r): facets round an axis', 'rotateY(θ) tips a facet into a cone', 'clip-path trapezoid and triangle facets', 'rotateY orbit of the whole scene'],
  },
];
