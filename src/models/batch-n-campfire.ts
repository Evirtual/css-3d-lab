import type { Demo } from './types';

/*
 * campfire: four logs laid in an X inside a ring of stones, a flame of crossed planes flickering
 * on top and embers rising out of it, the whole ground turning slowly. Its snippet is in
 * snippets-batch-n-campfire.ts.
 */
export const demosCampfire: Demo[] = [
  {
    id: 'campfire',
    added: '2026-10-04',
    title: 'Campfire',
    description:
      'Four logs crossed in a ring of stones, a flame flickering on them and embers drifting up, on a ground that turns slowly. The flame is three crossed planes, so it has volume from every side; the embers ride a carrier that undoes the turn, so they always face you.',
    category: 'css',
    tags: ['loop', 'scene', 'fire', 'camping'],
    technique: [
      'flame: three crossed teardrops, rotateY 0 / 60 / 120°',
      'log: a top face with its sides and end folded down',
      'stones: billboards that undo their angle and the turn',
      'embers on a carrier that undoes the turn',
    ],
  },
];
