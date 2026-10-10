import type { Demo } from './types';

export const demosStickynotes: Demo[] = [
  {
    id: 'stickynotes',
    added: '2026-10-10',
    title: 'Peeling sticky notes',
    description:
      'Six pastel sticky notes on a cork board, each a little askew. Hover or focus one and it peels off the board from its glued top edge: two hinges, one inside the other, curl the paper towards you while a shadow opens underneath, then it settles back flat.',
    category: 'css',
    tags: ['hover', 'card', 'paper', 'notes', 'board'],
    technique: ['nested rotateX hinges for a curl', 'transform-origin on the top edge', 'shadow faded in with opacity and scaleY', 'different transitions in and out'],
  },
];
