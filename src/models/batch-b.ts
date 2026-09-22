import type { Demo } from './types';

/** Product & branding showcases: the kind of 3D a landing page uses. */
export const demosB: Demo[] = [
  {
    id: 'phone',
    title: 'Phone mockup',
    description:
      'A phone with real thickness: screen, back, four thin walls and a stack of rounded slabs that fills the corners. It turns to show both sides.',
    category: 'css',
    tags: ['loop', 'product', 'mockup', 'device'],
    technique: ['front / back at ±depth/2', 'walls inset by the corner radius', 'rounded slabs plug the corners', 'alternate keyframes'],
  },
  {
    id: 'paycard',
    title: 'Payment card tilt',
    description:
      'The card leans toward your pointer and a glare follows it. JS writes four custom properties; CSS does the tilt, the glare and the return to rest.',
    category: 'js',
    tags: ['pointer', 'product', 'card', 'glare'],
    technique: ['pointer → --rx / --ry / --gx / --gy', 'glare = gradient whose centre follows the pointer', 'chip and text lifted with translateZ', 'slow transition at rest, fast while live'],
  },
  {
    id: 'package',
    title: 'Unboxing',
    description:
      'A shut box, seen from above. Hover or focus: the lid swings open on its back edge and the product card rises out. One hinge (transform-origin) and two staggered transitions.',
    category: 'css',
    tags: ['hover', 'product', 'box', 'packaging'],
    technique: ['lid hinged with transform-origin: bottom', 'open-top box from 4 walls + base', 'transition-delay swaps between open and close', 'static hit area'],
  },
  {
    id: 'can',
    title: 'Drinks can',
    description:
      'Twenty flat strips form the cylinder. Every strip shows the same wide label, shifted by its own index, so the artwork wraps around without a seam.',
    category: 'css',
    tags: ['loop', 'product', 'cylinder', 'label'],
    technique: ['rotateY(i × 18°) translateZ(radius)', 'background-position: i × −strip width', 'per-strip shading via animation-delay', 'discs laid flat with rotateX(90deg)'],
  },
  {
    id: 'vinyl',
    title: 'Vinyl sleeve',
    description:
      'The record is sandwiched between the two sides of the sleeve. On hover or focus it slides out, its label starts to spin and the sleeve turns its open end to you.',
    category: 'css',
    tags: ['hover', 'product', 'music', 'album'],
    technique: ['three planes at different translateZ', 'animation-play-state toggled by :hover', 'conic + repeating-radial gradients', 'static hit area'],
  },
  {
    id: 'logo3d',
    title: 'Extruded logo',
    description:
      'One clip-path shape repeated in 14 layers, two units apart. The stack reads as a solid block; back layers are darker and the front one carries a sweeping shine.',
    category: 'css',
    tags: ['loop', 'product', 'logo', 'brand'],
    technique: ['clip-path polygon with a hole (evenodd)', 'translateZ per layer from --i', 'darkening by depth with calc() alpha', 'shine moved with transform only'],
  },
  {
    id: 'badge',
    title: 'Award medal',
    description:
      'A medal hanging from a neck ribbon: it sways from the neck and twists on its ring, with a real metal edge and a shine that sweeps each time it faces you.',
    category: 'css',
    tags: ['loop', 'product', 'medal', 'award', 'coin'],
    technique: ['bail looped behind a folded tab', 'pendulum from transform-origin: top', 'edge from stacked discs', 'shine synced to the twist'],
  },
  {
    id: 'watch',
    title: 'Smartwatch',
    description:
      'A watch with thickness, strap stubs and the real time. Once a second JS writes three angles and two integers; CSS turns the hands and prints the digits with counters.',
    category: 'js',
    tags: ['loop', 'product', 'device', 'clock', 'time'],
    technique: ['setInterval → --h / --m / --s angles', 'digits via counter-reset: var(--hh)', 'straps hinged on the case edge', 'rounded slabs for thickness'],
  },
  {
    id: 'turntable',
    title: 'Product turntable',
    description:
      'Drag sideways to spin the speaker; let go and it coasts to a stop. JS only tracks one angle and one colour, both handed to CSS as custom properties.',
    category: 'js',
    tags: ['controls', 'pointer', 'product', 'drag', 'viewer'],
    technique: ['pointer capture + drag delta → --ry', 'inertia rAF that stops when slow', 'colour swatches set --c', 'touch-action: pan-y'],
  },
  {
    id: 'browser',
    title: 'Layered browser',
    description:
      'A UI mockup cut into depth layers: window, sidebar, cards and a floating button each sit at their own translateZ. Hover or focus pulls them further apart.',
    category: 'css',
    tags: ['hover', 'loop', 'product', 'mockup', 'ui', 'isometric'],
    technique: ['rotateX + rotateZ isometric tilt', 'translateZ(calc(var(--z) * var(--k) * var(--u)))', 'one multiplier changes on :hover', 'static hit area, bobbing child'],
  },
];
