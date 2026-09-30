import type { Demo } from './types';

export const demosTrain: Demo[] = [
  {
    id: 'train',
    added: '2026-09-30',
    title: 'Model train',
    description:
      'A toy locomotive and two wagons circle a tree on a round track. The ground is one tilted plane; the train rides a carrier that turns about the track centre, so the boxes face along the rails and stay upright with nothing to undo.',
    category: 'css',
    tags: ['loop', 'scene', 'train', 'toy', 'track'],
    technique: ['rotateX ground + rotateZ carrier', 'rotate → translate onto the rim', 'roof + four folded walls per box', 'conic-gradient sleepers, masked ring'],
  },
];
