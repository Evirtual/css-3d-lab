import type { Demo } from './types';

/*
 * poppyramid: a population pyramid from JSON, with 3D bars running out both ways from a column of
 * age bands, and two years to switch between. Its snippet is in snippets-batch-n-poppyramid.ts.
 */
export const demosPoppyramid: Demo[] = [
  {
    id: 'poppyramid',
    added: '2026-10-04',
    title: 'Population pyramid from JSON',
    description:
      'Men and women by age band as 3D bars running out both ways from a column of ages, drawn from a JSON object (illustrative figures). Switch between 1994 and 2024 and every bar grows or shrinks on one fixed scale; point at or focus a band and its numbers show under the chart.',
    category: 'js',
    tags: ['data', 'chart', 'json', 'controls', 'hover'],
    technique: [
      'JSON → --v per bar (a share of one fixed scale)',
      'bars: scaleX(--v) from the axis, transitioned',
      'a slab from one element: the front and a lid folded back',
      'ages in the stage’s ink; numbers in the caption',
    ],
  },
];
