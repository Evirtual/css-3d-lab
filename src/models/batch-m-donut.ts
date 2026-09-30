import type { Demo } from './types';

/*
 * donut: a thick donut chart from JSON, lying back in 3D. JS turns the segments into one
 * conic-gradient, a stack of layers gives it thickness, the total stands up in the hole and a
 * legend sits beside it. Its snippet is in snippets-batch-m-donut.ts.
 */
export const demosDonut: Demo[] = [
  {
    id: 'donut',
    added: '2026-09-30',
    title: 'Donut chart from JSON',
    description:
      'Seats by plan as a thick donut lying back in 3D, drawn from a JSON object: JS turns the values into one conic-gradient, a stack of layers gives it thickness, the total stands up in the hole and a legend sits beside it. Switch a plan off below and the ring re-divides; hover or focus the chart and it lifts toward you.',
    category: 'js',
    tags: ['controls', 'hover', 'data', 'chart', 'json'],
    technique: [
      'JSON → conic-gradient stops in one custom property',
      'thickness: a stack of layers at translateZ(--i × 2 units)',
      'the hole: a radial-gradient mask on every layer',
      'the total stands up: the disc’s rotateX undone',
    ],
  },
];
