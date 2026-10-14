import type { Demo } from './types';

export const demosBlackhole: Demo[] = [
  {
    id: 'blackhole',
    added: '2026-10-14',
    title: 'Black hole',
    description:
      'A black hole with its accretion disk swirling round it, nearly edge on: the near half of the disk crosses in front of the dark centre, the far half goes behind it, and gravity bends the far side up over the top and down under the bottom as a glowing halo. The side turning toward you burns brighter.',
    category: 'css',
    tags: ['loop', 'space', 'scene', 'gradient'],
    technique: ['a tilted ring that crosses a flat disc in real 3D', 'radial-gradient mask cuts the ring', 'conic-gradient mask for the lensed halo', 'a still Doppler shade over a spinning disk'],
  },
];
