import type { Demo } from './types';

export const demosHanoi: Demo[] = [
  {
    id: 'hanoi',
    added: '2026-10-10',
    title: 'Tower of Hanoi',
    description:
      'A loader that solves the Tower of Hanoi: three disks lift, cross and drop in the 7-move legal order from one peg to another. Then the round board turns a third of a turn, so the finished peg stands where the first one did and the loop starts again with no jump.',
    category: 'css',
    tags: ['loop', 'loader', 'puzzle', 'hanoi'],
    technique: ['keyframes worked out from the move list', 'a third of a turn makes the loop seamless', 'front-half prisms for disks', 'billboard pegs that turn back'],
  },
];
