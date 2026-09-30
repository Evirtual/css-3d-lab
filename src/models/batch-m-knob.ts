import type { Demo } from './types';

export const demosKnob: Demo[] = [
  {
    id: 'knob',
    title: 'Rotary knob',
    description:
      'A volume dial: a thick knurled cylinder seen from a little above, a ring of ticks round it and a readout under it. Drag on it (or press the arrow keys) and JS writes one number, the angle; CSS turns the cap and fills the arc from that same number.',
    category: 'js',
    tags: ['drag', 'controls', 'knob', 'dial', 'slider', 'volume', 'product'],
    technique: ['barrel strips: rotateZ(a) translateY(−r) rotateX(90deg)', 'shading from cos() of the strip angle', 'conic-gradient arc driven by --a', 'role="slider" with Pointer Events'],
  },
];
