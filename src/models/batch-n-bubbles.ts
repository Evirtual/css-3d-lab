import type { Demo } from './types';

/*
 * bubbles: a 3D bubble chart from JSON. Spheres float over a floor grid on drop lines, sized by a
 * third value, in a chart tilted a little; each sphere turns back so it always faces you. Its
 * snippet is in snippets-batch-n-bubbles.ts.
 */
export const demosBubbles: Demo[] = [
  {
    id: 'bubbles',
    added: '2026-10-04',
    title: '3D bubble chart from JSON',
    description:
      'Eight cafés from a JSON array as shaded spheres over a floor grid: price across, rating up, cups a day as size (illustrative figures). Each sphere hangs on a drop line to its shadow on the floor and turns back against the chart’s tilt, so it always faces you; point at or focus one and a card shows its numbers.',
    category: 'js',
    tags: ['data', 'chart', 'json', 'hover'],
    technique: [
      'JSON → --x / --y (shares of the axes) and --r (units)',
      'spheres: radial-gradient discs, the tilt undone in reverse',
      'drop line and floor shadow: one element and its ::after',
      'one tooltip, gliding on --tx / --ty',
    ],
  },
];
