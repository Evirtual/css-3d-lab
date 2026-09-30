import type { Demo } from './types';

/** Batch M, text effects: a two-line banner whose letters sit on slats that twist in sequence. */
export const demosRibbontext: Demo[] = [
  {
    id: 'ribbontext',
    title: 'Text on a ribbon',
    description:
      'WAVING RIBBON on two lines of violet slats, one letter each. Every slat runs the same twist, offset by a step of the loop, so the row reads as a ribbon turning in a wind, and the twist stops short of edge-on so every letter stays readable.',
    category: 'css',
    tags: ['loop', 'text'],
    technique: ['one keyframe, animation-delay: calc(var(--i) * -0.375s)', 'rotateX about the ribbon’s axis', 'two-sided slat: ::after rotateX(180deg)', 'backface-visibility: hidden'],
  },
];
