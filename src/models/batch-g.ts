import type { Demo } from './types';

/** More product showcases: premium objects with real thickness, the kind a landing page uses. */
export const demosG: Demo[] = [
  {
    id: 'headphones',
    title: 'Headphones',
    description:
      'Over-ear headphones turning on a stand: the band is a ring of tangent strips, each cup a short cylinder laid on its side. Hover or focus and they turn to face you and light up.',
    category: 'css',
    tags: ['hover', 'loop', 'product', 'device', 'music', 'cylinder'],
    technique: ['arc = strips at rotateZ(a) translateY(−r) rotateX(90deg)', 'cylinder built upright, laid down with rotateZ(90deg)', 'shading from sin() / cos() of the strip angle', '@property blend: hover eases --k from 1 to 0'],
  },
  {
    id: 'perfume',
    title: 'Perfume bottle',
    description:
      'A faceted glass bottle you can see into: an octagonal prism of glass around a smaller prism of liquid, a fluted gold cap and a label. A glint sweeps across each time it faces you.',
    category: 'css',
    tags: ['loop', 'product', 'glass', 'luxury'],
    technique: ['octagonal prism: 8 faces at 45° steps', 'see-through faces drawn from both sides', 'a prism inside a prism for the liquid', 'glint = translated gradient in a clipped face'],
  },
  {
    id: 'businesscard',
    title: 'Business card',
    description:
      'A thick business card with painted edges. Hover or focus and it flips to show the back; the logo and the text are lifted off the paper with translateZ, so they shift against it as it turns.',
    category: 'css',
    tags: ['hover', 'product', 'card', 'flip', 'branding'],
    technique: ['two faces at ±depth/2, back turned 180deg', 'rounded slabs + walls for the edge', 'embossing = children lifted with translateZ', 'flip and idle sway on separate elements'],
  },
  {
    id: 'camera',
    title: 'Retro camera',
    description:
      'A rangefinder camera rocking on the table: a box body, a lens barrel of sixteen strips around the Z axis and a glass disc whose reflection slides the other way as it turns.',
    category: 'css',
    tags: ['loop', 'product', 'device', 'cylinder', 'photo'],
    technique: ['barrel strips: rotateZ(a) translateY(−r) rotateX(90deg)', 'shading from cos() of the strip angle', 'reflection counter-moves in a clipped disc', 'stacked flat discs for knobs'],
  },
  {
    id: 'coffeecup',
    title: 'Takeaway coffee',
    description:
      'A paper cup that is wider at the top: twenty trapezoid strips lean out from the base circle. The sleeve and its logo wrap around without a seam, the lid is a stack of discs and the steam keeps rising.',
    category: 'css',
    tags: ['loop', 'product', 'cone', 'packaging', 'label'],
    technique: ['frustum: strips hinged at the base, rotateX(−lean)', 'trapezoids with clip-path', 'one lap-long label, background-position by index', 'steam from the sip slot, counter-turned to face you'],
  },
];
