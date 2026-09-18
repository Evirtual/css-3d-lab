import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => fn(i)).join('');

// hourglass: glass colour runs teal → violet → teal round the ring, so the flip shows no seam
const glassMix = (i: number): string => `${Math.round((Math.abs(i - 6) / 6) * 100)}%`;

// crystal: where each prism grows and how it leans (w = side of the hexagon, h = height of the sides)
const CRYSTALS = [
  { az: 0, off: 0, tilt: 0, w: 22, h: 86, c: '--accent', c2: '--hot', d: 0 },
  { az: 30, off: 16, tilt: 30, w: 15, h: 60, c: '--accent-2', c2: '--accent', d: -1.2 },
  { az: 115, off: 14, tilt: 26, w: 14, h: 50, c: '--hot', c2: '--accent', d: -2.4 },
  { az: 205, off: 16, tilt: 34, w: 16, h: 66, c: '--accent', c2: '--accent-2', d: -0.6 },
  { az: 290, off: 14, tilt: 30, w: 12, h: 40, c: '--accent-2', c2: '--hot', d: -3 },
];

// lattice: the 9 (x, z) spots of one layer, row by row
const SPOTS = Array.from({ length: 9 }, (_, i) => ({ x: (i % 3) - 1, z: Math.floor(i / 3) - 1 }));
const latticeLayer = (y: number): string =>
  `<div class="d-lattice__layer${y === 0 ? ' is-mid' : ''}" style="--y:${y}">${rep(3, (k) => `<i style="--z:${k - 1}"></i>`)}${rep(
    3,
    (k) => `<i class="is-z" style="--x:${k - 1}"></i>`,
  )}${SPOTS.map((s) => `<b style="--x:${s.x};--z:${s.z}"></b>`).join('')}</div>`;

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
    html: `<div class="d-tetra">${rep(3, (i) => `<i style="--i:${i}"></i>`)}<b></b><u></u></div>`,
  },
  {
    id: 'hourglass',
    title: 'Hourglass',
    description:
      'Two glass cones tip to tip; the sand is one cone shrinking toward the neck while an identical one grows on the floor. Turned half over, it looks exactly as it started, so the loop has no seam.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['trapezoid strips hinged on the neck', 'scale3d() about the cone tip', '180° flip = start pose', 'crossed planes for thin posts'],
    html: `<div class="d-hourglass"><div class="d-hourglass__flip">${rep(
      24,
      (i) => `<i style="--i:${i % 12};--s:${i < 12 ? 1 : -1};--mix:${glassMix(i % 12)}"></i>`,
    )}<b></b><b></b><b></b><b></b>${rep(3, (i) => `<span class="d-hourglass__post" style="--i:${i}"></span>`)}${['top', 'bottom']
      .map((end) => `<div class="d-hourglass__sand d-hourglass__sand--${end}">${rep(8, (i) => `<i style="--i:${i}"></i>`)}<b></b></div>`)
      .join('')}<s class="d-hourglass__stream"></s></div></div>`,
  },
  {
    id: 'crystal',
    title: 'Crystal cluster',
    description:
      'Five hexagonal prisms of different sizes growing from one rock at different tilts. Each side panel carries its own tip facet as a ::before, folded in so the six meet in a point.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['hexagon ring: apothem = side × √3 / 2', 'tip facet as a folded ::before', 'rotateY · translateZ · rotateX to lean out', 'crossed glow planes'],
    html: `<div class="d-crystal"><b class="d-crystal__rock"></b>${CRYSTALS.map(
      (c) =>
        `<div class="d-crystal__c" style="--az:${c.az}deg;--off:${c.off}px;--tilt:${c.tilt}deg;--w:${c.w}px;--h:${c.h}px;--c:var(${c.c});--c2:var(${c.c2});--d:${c.d}s">${rep(
          6,
          (i) => `<i style="--i:${i}"></i>`,
        )}<b></b></div>`,
    ).join('')}</div>`,
  },
  {
    id: 'lattice',
    title: 'Breathing lattice',
    description:
      'A 3×3×3 wireframe: three layers of bars and glowing nodes, and nine posts through them. The outer layers move apart while the posts stretch by the same amount, so no joint ever opens.',
    category: 'css',
    tags: ['loop', 'shape', 'grid'],
    technique: ['bars as two crossed planes', 'layers: translateY(y × distance)', 'posts: scaleY in step with the layers', 'billboard nodes'],
    html: `<div class="d-lattice">${[-1, 0, 1].map(latticeLayer).join('')}<div class="d-lattice__posts">${SPOTS.map(
      (s) => `<i style="--x:${s.x};--z:${s.z}"></i>`,
    ).join('')}</div></div>`,
  },
  {
    id: 'planet',
    title: 'Ringed planet',
    description:
      'Eleven latitude discs stack into a banded sphere around a shaded disc that always faces you. That disc cuts the rings in half, so their far side slips behind the planet while a moon circles through.',
    category: 'css',
    tags: ['loop', 'shape', 'space'],
    technique: ['latitude discs: R·cos / R·sin', 'billboard disc hides what is behind', 'intersecting planes are split and sorted', 'nested counter-rotations'],
    html: `<div class="d-planet"><div class="d-planet__body">${rep(
      11,
      (i) => `<i style="--k:${i - 5}"></i>`,
    )}<u></u><b></b><b></b><b></b><div class="d-planet__orbit"><div class="d-planet__arm"><div class="d-planet__moon"></div></div></div></div></div>`,
  },
];
