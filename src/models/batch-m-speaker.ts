import type { Demo } from './types';

/** Batch M's product: a portable Bluetooth speaker, lying on its side. */
export const demosSpeaker: Demo[] = [
  {
    id: 'speaker',
    title: 'Bluetooth speaker',
    description:
      'A portable speaker lying on its side: a sixteen-strip cylinder in dotted fabric with rubber bands, a passive radiator in each end cap, a button pad on top and a logo plate. Hover or focus and it tilts to show its buttons while the grille pulses teal.',
    category: 'css',
    tags: ['hover', 'loop', 'product', 'device', 'music', 'cylinder'],
    technique: ['cylinder built upright, laid down with rotateZ(90deg)', 'fabric = repeating radial-gradient dots', 'shading from sin() / cos() of the strip angle', 'pad and plate ride the rig at translateY(−r) / translateZ(r)'],
  },
];
