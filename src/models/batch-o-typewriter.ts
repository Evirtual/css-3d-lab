import type { Demo } from './types';

export const demosTypewriter: Demo[] = [
  {
    id: 'typewriter',
    added: '2026-10-10',
    title: 'Typewriter',
    description:
      'A rounded mint typewriter types "Hello," and then "3D world." on its sheet, one letter at a time: a typebar swings up out of the fan, the letter appears on the paper and the carriage steps one character left. At each line end the carriage returns and the text rolls up a line, all on one CSS clock with steps() and per-letter delays; the body is a stack of rounded slices.',
    category: 'css',
    tags: ['loop', 'text', 'typewriter', 'typing', 'steps'],
    technique: ['steps(n, jump-start) carriage and reveal', 'overflow window stepping against its text', 'body built from stacked rounded slices', 'typebars fanned with rotateY, struck with rotateX'],
  },
];
