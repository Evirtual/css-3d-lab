import type { Demo } from './types';

export const demosEnvelope: Demo[] = [
  {
    id: 'envelope',
    added: '2026-10-04',
    title: 'Opening envelope',
    description:
      'A sealed violet envelope seen at an angle. Hover or focus and the flap swings open on its top edge to show the striped lining, then an invitation slides up out of the pocket, in front of the open flap and behind the pocket.',
    category: 'css',
    tags: ['hover', 'card', 'envelope', 'letter'],
    technique: ['flap offset from its hinge in translateZ', 'two-sided flap with backface-visibility', 'clip-path V-shaped pocket', 'per-state transition-delay'],
  },
];
