import type { Demo } from './types';

/** Batch F: more solids built from flat faces. */
export const demosF: Demo[] = [
  {
    id: 'tetra',
    title: 'Glass tetrahedron',
    description:
      'Four equilateral triangles: three hinged on the edges of the fourth and leaned in by 19.47°, the angle at which their tips meet. A glowing core turns back against the tumble to stay round.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['clip-path triangles', 'lean = 90° − atan(2√2)', 'transform-origin on the centroid', 'inverse keyframes billboard'],
  },
  {
    id: 'hourglass',
    title: 'Hourglass',
    description:
      'Two glass cones tip to tip; the sand is one cone shrinking toward the neck while an identical one grows on the floor. Turned half over, it looks exactly as it started, so the loop has no seam.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['trapezoid strips hinged on the neck', 'scale3d() about the cone tip', '180° flip = start pose', 'crossed planes for thin posts'],
  },
  {
    id: 'crystal',
    title: 'Crystal cluster',
    description:
      'Five hexagonal prisms of different sizes growing from one rock at different tilts. Each side panel carries its own tip facet as a ::before, folded in so the six meet in a point.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['hexagon ring: apothem = side × √3 / 2', 'tip facet as a folded ::before', 'rotateY · translateZ · rotateX to lean out', 'crossed glow planes'],
  },
  {
    id: 'lattice',
    title: 'Breathing lattice',
    description:
      'A 3×3×3 wireframe: three layers of bars and glowing nodes, and nine posts through them. The outer layers move apart while the posts stretch by the same amount, so no joint ever opens.',
    category: 'css',
    tags: ['loop', 'shape', 'grid'],
    technique: ['bars as two crossed planes', 'layers: translateY(y × distance)', 'posts: scaleY in step with the layers', 'billboard nodes'],
  },
  {
    id: 'planet',
    title: 'Ringed planet',
    description:
      'Eleven latitude discs stack into a banded sphere around a shaded disc that always faces you. That disc cuts the rings in half, so their far side slips behind the planet while a moon circles through.',
    category: 'css',
    tags: ['loop', 'shape', 'space'],
    technique: ['latitude discs: R·cos / R·sin', 'billboard disc hides what is behind', 'intersecting planes are split and sorted', 'nested counter-rotations'],
  },
];
