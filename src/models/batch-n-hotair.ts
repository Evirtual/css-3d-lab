import type { Demo } from './types';

/*
 * hotair: a striped hot-air balloon turning slowly as it bobs, with clouds drifting past in front
 * of it and behind it. Its snippet is in snippets-batch-n-hotair.ts.
 */
export const demosHotair: Demo[] = [
  {
    id: 'hotair',
    added: '2026-10-04',
    title: 'Hot-air balloon',
    description:
      'A striped balloon bobbing and turning slowly on its ropes, with a woven basket and clouds drifting past in front of it and behind it. Each of its twelve gores is six flat panels, each tilted to follow the balloon’s outline, so the silhouette is round from every side as the stripes go by.',
    category: 'css',
    tags: ['loop', 'scene', 'balloon', 'sky'],
    technique: [
      '12 gores × 6 panels, each turned rotateY(k × 30°)',
      'panel: translate3d to its band, rotateX to the outline',
      'trapezoid panels: clip-path on the leaves only',
      'mask: a smooth SVG outline over the gores and a light that does not turn',
    ],
  },
];
