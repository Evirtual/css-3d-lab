import type { Demo } from './types';

/** Batch I: cards that open, lift and slide out, and two 3D loaders. */
export const demosI: Demo[] = [
  {
    id: 'greeting',
    title: 'Pop-up greeting card',
    description:
      'A greeting card standing half open. Point at it and the cover swings round on its spine, the card turns toward you and a heart pops up out of the fold: a floating layer whose two halves each ride on their own page.',
    category: 'css',
    tags: ['hover', 'cards', 'paper', 'fold'],
    technique: ['transform-origin on the spine', 'pop-up halves = children of each page, translateZ in front', 'meeting line --x0 = lift × cot(angle ÷ 2)', 'static hit target, card inside moves'],
  },
  {
    id: 'tiltgallery',
    title: 'Tilting photo wall',
    description:
      'Six photos on a board that leans toward your pointer, while the photo nearest to it lifts off the board and its neighbours rise a little less. JS only measures distances and writes numbers; CSS does all the motion.',
    category: 'js',
    tags: ['pointer', 'cards', 'gallery', 'photo'],
    technique: ['pointer → --rx / --ry on a static wrapper', 'per-tile --lift from distance → translateZ', 'measured on the untransformed wrapper (no feedback)', 'short transition while live, long ease back'],
  },
  {
    id: 'bookshelf',
    title: 'Bookshelf',
    description:
      'Five real books on a shelf, each a box with a spine, two covers and a block of pages. Point at one and it slides out toward you and turns to show its front cover, while its slot on the shelf stays put as the hit target.',
    category: 'css',
    tags: ['hover', 'cards', 'gallery', 'shape'],
    technique: ['cuboid from 4 faces sized by --t / --h', 'transform-origin at the book’s 3D centre', 'static slots, pointer-events: none books', 'translateZ + rotateY to pull out'],
  },
  {
    id: 'dotorbit',
    title: 'Orbiting dots loader',
    description:
      'Eight glowing dots with comet trails circle a core on three tilted orbits, while the whole atom slowly turns. Every dot counter-rotates so it always faces you, yet still passes behind the core.',
    category: 'css',
    tags: ['loop', 'loader', 'spinner', 'particles'],
    technique: ['rotateZ(θ) translateX(r) rotateZ(−θ): orbit without turning', 'undo the plane’s tilt = billboard', 'trail copies = same animation, a little later', 'var() inside @keyframes'],
  },
  {
    id: 'blockstack',
    title: 'Stacking blocks loader',
    description:
      'Eight blocks pop into the air and drop one by one onto an isometric floor until they form a 2×2×2 cube, then the cube comes apart column by column and floats away, and it all starts again.',
    category: 'css',
    tags: ['loop', 'loader', 'shape', 'isometric'],
    technique: ['rotateX(58deg) rotateZ(45deg) = isometric floor', 'block = 3 visible faces only', 'two nested animations: block drops, column leaves', 'shared keyframes + delays from --i'],
  },
];
