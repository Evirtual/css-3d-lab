import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => fn(i)).join('');

// ---- shapeshift: the geometry JS hands to CSS --------------------------------------------------

/** Corner radius of the shapeshifting prism. It stays fixed, so every n has the same footprint. */
const SHAPE_R = 62;
const SHAPE_START = 6;
const POLYGON_NAMES: Record<number, string> = {
  3: 'triangle',
  4: 'square',
  5: 'pentagon',
  6: 'hexagon',
  7: 'heptagon',
  8: 'octagon',
  9: 'nonagon',
  10: 'decagon',
  11: 'hendecagon',
  12: 'dodecagon',
};

const shapeLabel = (n: number): string => `${n} · ${POLYGON_NAMES[n] ?? 'polygon'}`;

/** Custom properties for an n-sided prism: apothem, side length and the cap outline. */
function prismVars(n: number): Record<string, string> {
  const half = Math.PI / n; // half the angle one side spans
  const corners = Array.from({ length: n }, (_, k) => {
    const a = (2 * k + 1) * half; // corners sit half a side either side of each panel's centre
    return `${(50 + 50 * Math.sin(a)).toFixed(2)}% ${(50 + 50 * Math.cos(a)).toFixed(2)}%`;
  });
  return {
    '--n': String(n),
    '--R': `${SHAPE_R}px`,
    '--r': `${(SHAPE_R * Math.cos(half)).toFixed(2)}px`,
    '--w': `${(2 * SHAPE_R * Math.sin(half)).toFixed(2)}px`,
    '--cap': `polygon(${corners.join(', ')})`,
  };
}

/** n side panels (colour runs teal → violet → teal, so there is no seam) plus the two caps. */
const prismPanels = (n: number): string =>
  rep(n, (i) => `<i style="--i:${i};--mix:${Math.round((Math.abs(i - n / 2) / (n / 2)) * 100)}%"></i>`) + '<b></b><b></b>';

const styleAttr = (vars: Record<string, string>): string =>
  Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');

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
    html: `<div class="d-prism">${rep(6, (i) => `<i style="--i:${i}"></i>`)}<b></b><b></b></div>`,
  },
  {
    id: 'octa',
    title: 'Octahedron',
    description:
      'Eight triangles hinged on a square equator, leaning in by 35.26° so they meet at two apexes. One rule builds all of them: scaleY(-1) flips the bottom four.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['clip-path triangles', 'lean = 90° − atan(√2)', '--s: 1 / −1 flips half the faces', 'edges drawn with "to corner" gradients'],
    html: `<div class="d-octa">${rep(8, (i) => `<i style="--i:${i % 4};--s:${i < 4 ? 1 : -1}"></i>`)}</div>`,
  },
  {
    id: 'diamond',
    title: 'Cut gem',
    description:
      'A crown of trapezoid facets leaning 45° above the girdle and a deep pavilion of triangles below, with a glint that walks from facet to facet.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['trapezoid + triangle clip-paths', 'hinge on the girdle: transform-origin top / bottom', 'lean = atan(radius / depth)', 'staggered opacity glint'],
    html: `<div class="d-diamond">${rep(8, (i) => `<i class="d-diamond__c" style="--i:${i}"></i>`)}${rep(
      8,
      (i) => `<i class="d-diamond__p" style="--i:${i}"></i>`,
    )}<b></b></div>`,
  },
  {
    id: 'torus',
    title: 'Ring torus',
    description:
      'A donut made of 24 circles. Each one turns to its angle and walks out with translateX, so it stands edge-on around the hole like a slice of the tube.',
    category: 'css',
    tags: ['loop', 'shape', 'sass-loop'],
    technique: ['rotateY + translateX (not translateZ)', 'border-radius: 50% cross-sections', 'Sass @for colour ramp', 'two-axis spin'],
    html: `<div class="d-torus">${rep(24, () => '<i></i>')}</div>`,
  },
  {
    id: 'cone',
    title: 'Cone',
    description:
      'Sixteen thin triangles on a circle, each leaning in by atan(radius / height) so all the tips meet on the axis, over a flat disc base.',
    category: 'css',
    tags: ['loop', 'shape', 'sass-loop'],
    technique: ['triangle width = 2r × tan(180° / n)', 'lean = atan(r / h)', 'rocking wrapper + spinning child', 'Sass @for'],
    html: `<div class="d-cone"><div class="d-cone__body">${rep(16, () => '<i></i>')}<b></b></div></div>`,
  },
  {
    id: 'stairs',
    title: 'Spiral staircase',
    description:
      'Every tread is the same flat slab pivoting on the pole. One index turns it 30° further and lifts it one step higher: that is the whole spiral.',
    category: 'css',
    tags: ['loop', 'shape', 'sass-loop'],
    technique: ['transform-origin on the pole axis', 'translateY + rotateY from one --i', 'sides as strips round the edge, corners as facets', 'crossed planes as a round pole'],
    html: `<div class="d-stairs"><b></b><b></b>${rep(14, () => `<i>${'<s></s>'.repeat(10)}</i>`)}</div>`,
  },
  {
    id: 'rubik',
    title: 'Twisting puzzle cube',
    description:
      'A 3×3×3 cube built as three layers that take turns twisting a quarter turn. Each layer is one flat box with the stickers painted on by gradients.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['one box per layer, not 27 cubelets', 'gradient sticker grid', 'shared keyframes + negative delays take turns', 'backface-visibility on inner faces'],
    html: `<div class="d-rubik">${[0, 1, 2]
      .map(
        (layer) =>
          `<div class="d-rubik__layer"><i></i><i></i><i></i><i></i><b${layer === 0 ? ' class="d-rubik__cap"' : ''}></b><b${
            layer === 2 ? ' class="d-rubik__cap"' : ''
          }></b></div>`,
      )
      .join('')}</div>`,
  },
  {
    id: 'cubegrid',
    title: 'Cube field wave',
    description:
      'Sixteen cubes seen isometrically, rising and falling in a wave that travels along the diagonals. Each cube is one element: its top plus two folded pseudo-element sides.',
    category: 'css',
    tags: ['loop', 'shape', 'sass-loop', 'grid'],
    technique: ['rotateX + rotateZ isometric floor', 'only the two visible sides, as ::before / ::after', 'translateZ along the floor normal', 'delay = (row + column) × step'],
    html: `<div class="d-cubegrid">${rep(16, () => '<i></i>')}</div>`,
  },
  {
    id: 'net',
    title: 'Unfolding cube',
    description:
      'A cube opens into its flat cross-shaped net and folds back up. The lid hangs off a wall, so its hinge rides along with the wall’s: nested transforms compound.',
    category: 'css',
    tags: ['loop', 'shape'],
    technique: ['nested hinged faces', 'transform-origin on the shared edge', 'var() fold angle inside @keyframes', 'staggered keyframe timing'],
    html: `<div class="d-net"><div class="d-net__base"><i class="d-net__n"><i class="d-net__lid"></i></i><i class="d-net__s"></i><i class="d-net__e"></i><i class="d-net__w"></i></div></div>`,
  },
  {
    id: 'shapeshift',
    title: 'Shapeshifting prism',
    description:
      'Pick 3 to 12 sides. JS rebuilds the panels and computes the apothem and side length with cos() and sin(); CSS places every panel from those numbers.',
    category: 'js',
    tags: ['controls', 'generated', 'shape', 'loop'],
    technique: ['JS: r = R·cos(180°/n), side = 2R·sin(180°/n)', 'rotateY(calc(i × 1turn / n))', 'generated clip-path polygon caps', '@starting-style grow-in from the axis'],
    fill: true,
    html: `<div class="d-shapeshift">
      <div class="d-shapeshift__view"><div class="d-shapeshift__prism" style="${styleAttr(prismVars(SHAPE_START))}">${prismPanels(SHAPE_START)}</div></div>
      <div class="d-shapeshift__bar">
        <label for="shapeshift-{{uid}}">Sides</label>
        <input id="shapeshift-{{uid}}" type="range" min="3" max="12" step="1" value="${SHAPE_START}" />
        <output for="shapeshift-{{uid}}">${shapeLabel(SHAPE_START)}</output>
      </div>
    </div>`,
    init(scene) {
      const prism = scene.querySelector<HTMLElement>('.d-shapeshift__prism')!;
      const input = scene.querySelector<HTMLInputElement>('input')!;
      const out = scene.querySelector<HTMLOutputElement>('output')!;
      let shown = SHAPE_START;
      const build = () => {
        const n = Math.min(12, Math.max(3, Math.round(Number(input.value)) || SHAPE_START));
        if (n === shown) return;
        shown = n;
        for (const [name, value] of Object.entries(prismVars(n))) prism.style.setProperty(name, value);
        // brand-new elements: @starting-style in the CSS flies them in
        prism.innerHTML = prismPanels(n);
        out.textContent = shapeLabel(n);
      };
      // a restored form value (back/forward cache) may differ from the markup
      build();
      input.addEventListener('input', build);
      return () => input.removeEventListener('input', build);
    },
  },
];
