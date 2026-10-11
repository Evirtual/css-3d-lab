import type { Demo } from './types';

export const demosController: Demo[] = [
  {
    id: 'controller',
    added: '2026-10-10',
    title: 'Retro game controller',
    description:
      'A 90s-style “dog-bone” gamepad in off-white and grey, seen nearly head-on, its body a stack of rounded slices so it has real thickness. It leans toward the pointer, and every control, the black cross d-pad, the four coloured face buttons, Select and Start, is a real button that presses into the pad and lights up. No JavaScript.',
    category: 'css',
    tags: ['hover', 'controls', 'product', 'gamepad', 'controller', 'retro'],
    technique: ['stacked slices with translateZ for thickness', 'button pressed with translateZ, its side hidden by the face', ':has(.cell:hover) leans it toward the pointer', 'pose from custom properties'],
  },
];
