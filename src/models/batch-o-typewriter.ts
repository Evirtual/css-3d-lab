import type { Demo } from './types';

export const demosTypewriter: Demo[] = [
  {
    id: 'typewriter',
    added: '2026-10-10',
    title: 'Typewriter',
    description:
      'A mint portable typewriter types "Hello, 3D world." one letter at a time: a typebar swings up out of the fan to the paper, the letter appears and the carriage steps one character left. At the end of the line the carriage returns and the line rolls up and clears, all on one CSS clock with steps() and per-letter delays.',
    category: 'css',
    tags: ['loop', 'text', 'typewriter', 'typing', 'steps'],
    technique: ['steps(16, jump-start) carriage and reveal', 'overflow window stepping against its text', 'typebars fanned with rotateY, struck with rotateX', 'one clock, per-part animation-delay'],
  },
];
