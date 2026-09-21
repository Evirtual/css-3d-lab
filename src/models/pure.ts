import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => fn(i)).join('');

/** Demos that run with zero JavaScript — markup + SCSS only. */
export const pureDemos: Demo[] = [
  {
    id: 'cube',
    title: 'Rotating cube',
    description: 'Six faces placed with rotate + translateZ, spun by a single keyframe animation.',
    category: 'css',
    tags: ['loop', 'sass-loop'],
    technique: ['transform-style: preserve-3d', 'perspective', '@keyframes', 'Sass @mixin + @for'],
    html: `<div class="d-cube">${rep(6, (i) => `<i>${i + 1}</i>`)}</div>`,
  },
  {
    id: 'flip',
    title: 'Flip card',
    description: 'Hover, tap or focus to flip. The back face is hidden until it turns toward you.',
    category: 'css',
    tags: ['hover'],
    technique: ['backface-visibility: hidden', 'transition', ':hover / :focus-visible'],
    html: `<div class="d-flip" tabindex="0" role="group" aria-label="Flip card">
      <div class="d-flip__inner">
        <div class="d-flip__face"><b>Front</b><span>hover or focus me</span></div>
        <div class="d-flip__face d-flip__face--back"><b>Back</b><span>no JavaScript here</span></div>
      </div>
    </div>`,
  },
  {
    id: 'carousel',
    title: 'Ring carousel',
    description: 'Panels arranged on a circle. The radius is computed in Sass with math.tan().',
    category: 'css',
    tags: ['loop', 'sass-loop'],
    technique: ['preserve-3d', 'rotateY + translateZ', 'sass:math'],
    html: `<div class="d-carousel"><div class="d-carousel__ring">${rep(8, (i) => `<i>${i + 1}</i>`)}</div></div>`,
  },
  {
    id: 'text',
    title: 'Extruded text',
    description: 'A Sass function generates a stack of text-shadows that reads as solid depth.',
    category: 'css',
    tags: ['text', 'faux-3d', 'loop', 'sass-loop'],
    technique: ['text-shadow stack', 'Sass @function', 'rotateY rocking'],
    html: `<div class="d-text">DEPTH</div>`,
  },
  {
    id: 'layers',
    title: 'Exploded layers',
    description: 'Isometric plates that rest spread apart along the Z axis and close up together, each placed by one custom property.',
    category: 'css',
    tags: ['loop'],
    technique: ['rotateX + rotateZ isometric view', 'translateZ', 'var() in the resting pose, one keyframe to close'],
    html: `<div class="d-layers">${rep(4, (i) => `<i style="--i:${i}"></i>`)}</div>`,
  },
  {
    id: 'button',
    title: 'Push button',
    description: 'Press it. The edge is a generated box-shadow stack that collapses on :active.',
    category: 'css',
    tags: ['controls', 'faux-3d', 'sass-loop'],
    technique: ['box-shadow stack', ':active on a static hit target', 'rotateX tilt'],
    html: `<button class="d-button" type="button"><span>PUSH</span></button>`,
  },
  {
    id: 'fold',
    title: 'Folding map',
    description: 'Nested panels, each hinged on its parent’s edge, folding up like a paper map.',
    category: 'css',
    tags: ['loop'],
    technique: ['nested preserve-3d', 'transform-origin: left', 'alternating keyframes'],
    html: `<div class="d-fold"><div class="p"><div class="p"><div class="p"><div class="p"></div></div></div></div></div>`,
  },
  {
    id: 'orbit',
    title: 'Atom orbits',
    description: 'Three rings tilted into different planes, each spinning inside its own plane.',
    category: 'css',
    tags: ['loop', 'sass-loop'],
    technique: ['preserve-3d', 'static tilt wrapper + spinning child', 'Sass @each'],
    html: `<div class="d-orbit"><b></b>${rep(3, () => `<div class="d-orbit__plane"><div class="d-orbit__ring"><i></i></div></div>`)}</div>`,
  },
  {
    id: 'bars',
    title: '3D bar chart',
    description: 'Each bar is a real cuboid — front, side and top face — growing on a staggered delay.',
    category: 'css',
    tags: ['loop', 'sass-loop'],
    technique: ['preserve-3d inside flexbox', 'scaleY walls + translateY lid (no layout)', 'animation-delay stagger'],
    html: `<div class="d-bars">${[60, 95, 45, 120, 80]
      .map((h) => `<div class="d-bars__bar" style="--hn:${h}"><i></i><i></i><i></i></div>`)
      .join('')}</div>`,
  },
  {
    id: 'book',
    title: 'Opening book',
    description: 'Cover and pages hinge on the spine, each opening to a slightly different angle.',
    category: 'css',
    tags: ['loop'],
    technique: ['transform-origin: left', 'var() end angle per sheet', 'one @property --open, a staggered slice per sheet'],
    html: `<div class="d-book">${rep(5, (i) => `<i style="--n:${i}"></i>`)}<b>CSS<br />3D</b></div>`,
  },
  {
    id: 'radio',
    title: 'Radio-button cube',
    description: 'Interactive with no JavaScript: checked radios steer the cube through sibling selectors.',
    category: 'css',
    tags: ['form-hack', 'controls'],
    technique: [':checked ~ sibling selector', 'transition on transform', '<label for> as the button'],
    fill: true,
    html: `<div class="d-radio">
      ${['Front', 'Right', 'Back', 'Left', 'Top', 'Bottom']
        .map((l, i) => `<input type="radio" name="face-{{uid}}" aria-label="${l}" title="${l}"${i === 0 ? ' checked' : ''} />`)
        .join('')}
      <div class="d-radio__cube">${['Front', 'Right', 'Back', 'Left', 'Top', 'Bottom'].map((l) => `<i>${l}</i>`).join('')}</div>
    </div>`,
  },
  {
    id: 'grid',
    title: 'Synthwave floor',
    description: 'A gradient-drawn grid laid flat with rotateX, scrolling toward you forever.',
    category: 'css',
    tags: ['loop'],
    technique: ['perspective on parent', 'rotateX floor plane', 'line layer slid with transform (not background-position)'],
    fill: true,
    html: `<div class="d-grid"><div class="d-grid__sun"></div><div class="d-grid__floor"></div></div>`,
  },
  {
    id: 'helix',
    title: 'DNA helix',
    description: 'Rungs spin on negative delays; dots counter-rotate so they always face the camera.',
    category: 'css',
    tags: ['loop', 'sass-loop'],
    technique: ['negative animation-delay', 'billboard counter-rotation', 'Sass @for'],
    html: `<div class="d-helix">${rep(14, () => `<div class="d-helix__rung"><i></i><i></i></div>`)}</div>`,
  },
  {
    id: 'tiles',
    title: 'Tile wave',
    description: 'A 4×4 grid of two-sided tiles flipping in a diagonal wave.',
    category: 'css',
    tags: ['loop', 'sass-loop'],
    technique: ['backface-visibility', 'delay = (row + column) × step', 'Sass nested @for'],
    html: `<div class="d-tiles">${rep(16, () => `<i></i>`)}</div>`,
  },
];
