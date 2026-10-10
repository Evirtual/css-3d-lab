import type { Demo } from './types';

export const demosController: Demo[] = [
  {
    id: 'controller',
    added: '2026-10-10',
    title: 'Game controller',
    description:
      'A violet game controller at a three-quarter angle, its body a stack of rounded slices so it has real thickness. It leans toward the pointer, and every button, A B X Y, the d-pad, the bumpers, is a real button that presses down into its hole. No JavaScript.',
    category: 'css',
    tags: ['hover', 'controls', 'product', 'gamepad', 'controller'],
    technique: ['stacked slices with translateZ for thickness', 'button pressed with translateZ, its side hidden by the face', ':has(.zone:hover) leans it toward the pointer', 'pose from custom properties'],
  },
];
