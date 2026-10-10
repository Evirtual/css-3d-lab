import type { Demo } from './types';

export const demosAquarium: Demo[] = [
  {
    id: 'aquarium',
    added: '2026-10-10',
    title: 'Aquarium',
    description:
      'A glass fish tank seen from a little above: tinted walls with water up to a bright surface line, a sand bed, swaying plants and rising bubbles. Four CSS-drawn fish swim racetrack loops round the tank, turning at the ends and passing in front of and behind each other, each loop one keyframe list of translateX, rotateY and translateZ.',
    category: 'css',
    tags: ['loop', 'scene', 'fish', 'water'],
    technique: ['translateX · rotateY · translateZ racetrack loop', 'one gradient per wall: frame, glass, water, sand', 'scaleZ(-1) mirrors a loop', 'see-through faces sorted in preserve-3d'],
  },
];
