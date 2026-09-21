import type { Demo } from './types';

/** Batch A: solids built from flat faces. */
export const demosA: Demo[] = [
  {
    id: 'prism',
    title: 'Hexagonal prism',
    description:
      'Six side panels in a closed ring plus two hexagon caps cut with clip-path. The apothem, (side / 2) / tan(30°), is how far each panel steps out.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['rotateY(i × 60°) + translateZ(apothem)', 'clip-path: polygon() caps', 'rotateX(90deg) to lay a cap flat', 'two-axis tumble'],
  },
  {
    id: 'octa',
    title: 'Octahedron',
    description:
      'Eight triangles hinged on a square equator, leaning in by 35.26° so they meet at two apexes. One rule builds all of them: scaleY(-1) flips the bottom four.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['clip-path triangles', 'lean = 90° − atan(√2)', '--s: 1 / −1 flips half the faces', 'edges drawn with "to corner" gradients'],
  },
  {
    id: 'diamond',
    title: 'Cut gem',
    description:
      'A crown of trapezoid facets leaning 45° above the girdle and a deep pavilion of triangles below, with a glint that walks from facet to facet.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['trapezoid + triangle clip-paths', 'hinge on the girdle: transform-origin top / bottom', 'lean = atan(radius / depth)', 'staggered opacity glint'],
  },
  {
    id: 'torus',
    title: 'Ring torus',
    description:
      'A donut made of 24 circles. Each one turns to its angle and walks out with translateX, so it stands edge-on around the hole like a slice of the tube.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['rotateY + translateX (not translateZ)', 'border-radius: 50% cross-sections', 'colour from cos(i × 15deg): no seam', 'two-axis spin'],
  },
  {
    id: 'cone',
    title: 'Cone',
    description:
      'Sixteen thin triangles on a circle, each leaning in by atan(radius / height) so all the tips meet on the axis, over a flat disc base.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['triangle width = 2r × tan(180° / n)', 'lean = atan(r / h)', 'rocking wrapper + spinning child', 'rotateY(i × 22.5deg) per face'],
  },
  {
    id: 'stairs',
    title: 'Spiral staircase',
    description:
      'Every tread is the same flat slab pivoting on the pole. One index turns it 30° further and lifts it one step higher: that is the whole spiral.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['transform-origin on the pole axis', 'translateY + rotateY from one --i', 'sides as strips round the edge, corners as facets', 'crossed planes as a round pole'],
  },
  {
    id: 'rubik',
    title: 'Twisting puzzle cube',
    description:
      'A 3×3×3 cube built as three layers that take turns twisting a quarter turn. Each layer is one flat box with the stickers painted on by gradients.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['one box per layer, not 27 cubelets', 'gradient sticker grid', 'shared keyframes + negative delays take turns', 'backface-visibility on inner faces'],
  },
  {
    id: 'cubegrid',
    title: 'Cube field wave',
    description:
      'Sixteen cubes seen isometrically, rising and falling in a wave that travels along the diagonals. Each cube is one element: its top plus two folded pseudo-element sides.',
    category: 'css',
    tags: ['loop', 'shape', 'grid'],
    technique: ['rotateX + rotateZ isometric floor', 'only the two visible sides, as ::before / ::after', 'translateZ along the floor normal', 'delay = (row + column) × step'],
  },
  {
    id: 'net',
    title: 'Unfolding cube',
    description:
      'A cube’s cross-shaped net lies open on a floor, folds up into a cube that turns a full circle, and opens flat again. The lid hangs off a wall, so its hinge rides along with the wall’s: nested transforms compound. The camera moves in as it folds, so the cube is as big as the net.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['nested hinged faces', 'transform-origin on the shared edge', 'var() fold angle inside @keyframes', 'camera zoom on the fold’s own timeline'],
  },
  {
    id: 'shapeshift',
    title: 'Shapeshifting prism',
    description:
      'Pick 3 to 12 sides. JS rebuilds the panels and computes the apothem and side length with cos() and sin(); CSS places every panel from those numbers.',
    category: 'js',
    tags: ['controls', 'generated', 'shape', 'loop'],
    technique: ['JS: r = R·cos(180°/n), side = 2R·sin(180°/n)', 'rotateY(calc(i × 1turn / n))', 'generated clip-path polygon caps', '@starting-style grow-in from the axis'],
  },
];
