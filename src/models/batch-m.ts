import type { Group } from './groups';
import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string => Array.from({ length: n }, (_, i) => fn(i)).join('');

/** One gear: two toothed plates, one crest panel per tooth, then the hub. */
const gear = (mod: string, teeth: number): string =>
  `<div class="d-gears__g d-gears__g--${mod}"><b></b><b></b>${rep(teeth, (i) => `<i style="--i:${i}"></i>`)}<s></s></div>`;

/** One pendulum of the cradle: two strings up to the two rails, then the ball. */
const bob = (k: number, mod = ''): string =>
  `<div class="d-cradle__arm${mod}" style="--k:${k}"><i></i><i></i>` +
  '<div class="d-cradle__bob"><div class="d-cradle__ball"></div></div></div>';

/** Batch M: solids and mechanisms built out of flat pieces. */
export const demosM: Demo[] = [
  {
    id: 'mobius',
    title: 'Möbius band',
    description:
      'Thirty flat segments around a ring, each one twisted half as far as it has travelled. After a full lap the band has turned 180° — it comes back to its start inside out, which is what makes it a Möbius strip.',
    category: 'css',
    tags: ['loop', 'shape', 'sass-loop'],
    technique: ['rotateY(i × 12°) + translateZ(radius)', 'rotateX(i × 6°) twists about the tangent', 'segments overlap so the twist opens no gap', 'Lambert shading baked in by Sass'],
    html: `<div class="d-mobius">${rep(30, () => '<i></i>')}</div>`,
  },
  {
    id: 'dodeca',
    title: 'Dodecahedron',
    description:
      'Twelve regular pentagons cut with clip-path. Five hinge onto the edges of a sixth and fold down 63.4° to make one cap; the solid is two of those caps, turned 36° against each other.',
    category: 'css',
    tags: ['loop', 'shape', 'sass-loop'],
    technique: ['clip-path: polygon() pentagons', 'hinge: translateY(apothem) + rotateX(fold)', 'fold = 180° − 116.565° dihedral', 'two caps, offset 36°'],
    html: `<div class="d-dodeca">${rep(2, () => `<div class="d-dodeca__cap">${rep(6, () => '<i></i>')}</div>`)}</div>`,
  },
  {
    id: 'gears',
    title: 'Gear train',
    description:
      'Three gears of 16, 10 and 12 teeth, each plate cut to shape by a clip-path Sass builds tooth by tooth. Turn time is proportional to tooth count, so the teeth really mesh instead of sliding through each other.',
    category: 'css',
    tags: ['loop', 'mechanism', 'sass-loop'],
    technique: ['clip-path gear outline from a Sass @for', 'crest panels laid flat by rotateX(90deg)', 'period ∝ tooth count', 'phase offset puts a tooth in the gap'],
    html: `<div class="d-gears">${gear('a', 16)}${gear('b', 10)}${gear('c', 12)}</div>`,
  },
  {
    id: 'spring',
    title: 'Coil spring',
    description:
      'Six flat rings stacked up the axis and tilted by the helix angle. One scaleY on the box that holds them pulls the coils together and lets them go, so the whole squash is a single animated transform.',
    category: 'css',
    tags: ['loop', 'shape', 'sass-loop'],
    technique: ['rotateX(90° − helix angle) per coil', 'scaleY on the stack compresses the pitch', 'four border colours make the wire round', 'overshoot keyframes for the release'],
    html: `<div class="d-spring"><div class="d-spring__body">${rep(6, () => '<i></i>')}<b></b></div><b></b></div>`,
  },
  {
    id: 'cradle',
    title: "Newton's cradle",
    description:
      'Five balls hung on strings from two rails. The end ball swings down, everything stands still for a beat, and the far ball answers — the knock is nothing but two keyframe tracks that hand over at the same instant.',
    category: 'css',
    tags: ['loop', 'loader', 'physics'],
    technique: ['rotateZ about transform-origin: 0 0', 'strings lean in by atan(depth / drop)', 'per-step animation-timing-function', 'the bob cancels the swing to hold the highlight'],
    html: `<div class="d-cradle">
      <b class="d-cradle__bar d-cradle__rail" style="--z:28px"></b>
      <b class="d-cradle__bar d-cradle__rail" style="--z:-28px"></b>
      <b class="d-cradle__bar d-cradle__post" style="--x:89px;--z:28px"></b>
      <b class="d-cradle__bar d-cradle__post" style="--x:-89px;--z:28px"></b>
      <b class="d-cradle__bar d-cradle__post" style="--x:89px;--z:-28px"></b>
      <b class="d-cradle__bar d-cradle__post" style="--x:-89px;--z:-28px"></b>
      <b class="d-cradle__bar d-cradle__base"></b>
      ${bob(-2, ' d-cradle__arm--l')}${bob(-1)}${bob(0)}${bob(1)}${bob(2, ' d-cradle__arm--r')}
    </div>`,
  },
];

/** Which group each demo in this batch belongs to (merged into MEMBERS in groups.ts). */
export const groupsM: Partial<Record<Group, string[]>> = {
  shapes: ['mobius', 'dodeca', 'gears', 'spring'],
  loaders: ['cradle'],
};
