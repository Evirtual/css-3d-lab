import type { Demo } from './types';

/** Batch N, text effects: the falling green code, as columns at real depths in one perspective. */
export const demosCoderain: Demo[] = [
  {
    id: 'coderain',
    added: '2026-10-04',
    title: 'Digital rain',
    description:
      'Columns of green code fall through the dark at four layers of depth, each with a bright leading glyph and a tail that dims behind it. One perspective makes the far columns small and slow and the near ones large and fast, so the rain has real depth, in pure CSS. Near and far columns take turns across the canvas and never cross, so every glyph falls on black.',
    category: 'css',
    tags: ['loop', 'text', 'matrix', 'code', 'rain'],
    technique: ['translate3d fall at each column’s own --z', 'background-clip: text', 'word-break: break-all, 1ch wide', 'negative animation-delay', 'columns placed to clear each other through the sway'],
  },
];
