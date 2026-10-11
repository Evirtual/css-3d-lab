import type { Demo } from './types';

export const demosController: Demo[] = [
  {
    id: 'controller',
    added: '2026-10-10',
    title: 'Game controller',
    description:
      'A violet gamepad seen nearly head-on, its body a stack of rounded slices so it has real thickness. It leans toward the pointer and its sticks tip toward it, and every control, the d-pad, A B X Y, Select, Start, Home and both sticks, is a real button that presses into its hole and lights up. No JavaScript.',
    category: 'css',
    tags: ['hover', 'controls', 'product', 'gamepad', 'controller'],
    technique: ['stacked slices with translateZ for thickness', 'button pressed with translateZ, its side hidden by the face', ':has(.cell:hover) leans it toward the pointer', 'pose from custom properties'],
  },
];
