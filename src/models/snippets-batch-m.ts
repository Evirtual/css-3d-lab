import type { Snippet } from './snippet-utils';

/** n lines of markup, one per index. */
const lines = (n: number, fn: (i: number) => string): string => Array.from({ length: n }, (_, i) => fn(i)).join('\n');
const rad = (deg: number): number => (deg * Math.PI) / 180;
const r2 = (x: number): string => String(Math.round(x * 100) / 100);

/** The Möbius segments' baked shading, the same numbers the Sass loop works out. */
const bandSegment = (k: number): string => {
  const turn = rad(k * 12);
  const twist = rad(k * 6);
  const lam = Math.abs(-0.34 * Math.cos(twist) * Math.sin(turn) + 0.74 * Math.sin(twist) + 0.58 * Math.cos(twist) * Math.cos(turn));
  return `    <i style="--i:${k};--m:${Math.round((Math.abs(k - 15) / 15) * 100)};--l:${r2(lam)};--s:${r2(lam ** 6 * 0.55)}"></i>`;
};

/**
 * The gear outline: four points per tooth (root, tip, tip, root). Radii are in modules and the
 * box is 2 × the tip radius, so radius r lands at 50% ± (r / tip) × 50%.
 */
const gearClip = (n: number): string => {
  const step = 360 / n;
  const tip = n / 2 + 1;
  const root = n / 2 - 1.1;
  const pts: string[] = [];
  for (let k = 0; k < n; k++) {
    for (const [at, r] of [
      [-0.3, root],
      [-0.21, tip],
      [0.21, tip],
      [0.3, root],
    ] as const) {
      const a = rad((k + at) * step);
      pts.push(`${r2(50 + (r / tip) * 50 * Math.sin(a))}% ${r2(50 - (r / tip) * 50 * Math.cos(a))}%`);
    }
  }
  return `polygon(${pts.join(', ')})`;
};

/** Copy-paste versions of batch M. */
export const snippetsM: Record<string, Snippet> = {
  mobius: {
    how: [
      'One index, two angles. <code>--i</code> says where a segment sits on the ring (<code>i × 12°</code>) <b>and</b> how far it has twisted (<code>i × 6°</code>) — half as fast, so a whole lap is a half turn of the band.',
      'Read the transform left to right: <code>rotateY</code> aims the segment, <code>translateZ</code> steps it out to the ring, and only then <code>rotateX</code> twists it — by that point the local X axis <i>is</i> the tangent of the ring, which is the axis a ribbon twists about.',
      '30 × 6° = 180°. The last segment is the first one upside down, and a flat quad upside down is the same quad, so the band closes into a single surface with one side.',
      'The arc each segment has to cover is <code>2πR / 30 = 13.4px</code>; the quads are 15.4px so they overlap. Without that, the 6° of twist between neighbours would open a wedge at every join.',
      'Light and shade are worked out once, per segment, and written in as <code>--l</code> (how square-on to the light it is) and <code>--s</code> (the specular). No <code>filter</code>, no blur — just two numbers feeding a <code>color-mix()</code> and a white gradient.',
    ],
    html: `<div class="scene">
  <div class="band">
${lines(30, bandSegment)}
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

/* a zero-size anchor: every segment is placed from the middle of the ring */
.band {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: turn 20s linear infinite;
}

.band i {
  --c: color-mix(in srgb, #2ee6d6, #8b6cff calc(var(--m) * 1%));
  --e: color-mix(in srgb, var(--c) 72%, transparent);
  position: absolute;
  left: -7.7px; /* half of 15.4px: the 13.4px arc plus 2px of overlap */
  top: -17px;
  width: 15.4px;
  height: 34px;
  /* place on the ring, step out, then twist about the tangent */
  transform: rotateY(calc(var(--i) * 12deg)) translateZ(64px) rotateX(calc(var(--i) * 6deg));
  background:
    /* the two long edges of the ribbon */
    linear-gradient(var(--e), var(--e)) top / 100% 1.2px no-repeat,
    linear-gradient(var(--e), var(--e)) bottom / 100% 1.2px no-repeat,
    /* the specular, only on segments turned towards the light */
    linear-gradient(to bottom, rgb(255 255 255 / var(--s)), transparent 62%),
    color-mix(in srgb, var(--c) calc(24% + 46% * var(--l)), transparent);
  box-shadow: inset 0 0 18px color-mix(in srgb, var(--c) calc(14% + 28% * var(--l)), transparent);
}

/* -30deg + 360deg is -30deg again, so the turn has no seam */
@keyframes turn {
  from { transform: rotateZ(8deg) rotateX(-30deg) rotateY(0deg); }
  to   { transform: rotateZ(8deg) rotateX(-30deg) rotateY(360deg); }
}`,
  },

  dodeca: {
    how: [
      'Every face is the same regular pentagon, cut with <code>clip-path</code> and set corner-up so its <b>bottom edge is flat</b>. That flat edge is the hinge.',
      'Fold a neighbour onto it: walk out to the edge (<code>translateY(38.54px)</code>, the apothem), tip over it by <code>-63.435°</code> — that is <code>180° − 116.565°</code>, the angle two faces of a dodecahedron meet at — walk the same distance on into the new face, and <code>rotateZ(180deg)</code>, because a pentagon that shares its flat edge has to point the other way.',
      'Put <code>rotateZ(k × 72deg)</code> in front of that chain and you get all five neighbours. One face plus its five is a <b>cap</b>: exactly half the solid.',
      'The solid is two caps. <code>rotateX(90deg) translateZ(62.36px)</code> stands one on its face at the top, <code>rotateX(-90deg)</code> puts the other at the bottom, and <code>rotateZ(36deg)</code> between them is what makes the two halves interlock instead of line up.',
      '<code>clip-path</code> throws a border away with the corners, so every edge is drawn instead. A <code>::before</code> traces the pentagon, comes back to the first corner along a bridge with no width, then traces a smaller one; <code>evenodd</code> drops the middle, which is now enclosed twice, and what is left is an outline.',
    ],
    html: `<div class="scene">
  <div class="solid">
    <div class="cap">
      <i class="mid"></i>
${lines(5, (k) => `      <i style="--k:${k};--a:${Math.round(13 + 30 * (0.5 + 0.5 * Math.cos(rad(k * 72 - 50))))}"></i>`)}
    </div>
    <div class="cap cap--b">
      <i class="mid"></i>
${lines(5, (k) => `      <i class="alt" style="--k:${k};--a:${Math.round(13 + 30 * (0.5 + 0.5 * Math.cos(rad(k * 72 - 50))))}"></i>`)}
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.solid {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: tumble 22s linear infinite;
}

/* a cap stands on its middle face: turn the whole group flat, then lift it along its own normal
   by 62.36px, the distance from the centre of the solid to the centre of a face */
.cap {
  position: absolute;
  transform-style: preserve-3d;
  transform: rotateX(90deg) translateZ(62.36px);
}

.cap--b {
  transform: rotateX(-90deg) rotateZ(36deg) translateZ(62.36px);
}

.solid i {
  --c: 139 108 255;   /* violet */
  --a: 20;            /* how lit this face is, 0-100 */
  position: absolute;
  left: -47.64px;     /* half the box: the pentagon's corner radius */
  top: -47.64px;
  width: 95.28px;
  height: 95.28px;
  clip-path: polygon(50% 0%, 97.55% 34.55%, 79.39% 90.45%, 20.61% 90.45%, 2.45% 34.55%);
  background: linear-gradient(160deg, rgb(var(--c) / calc(var(--a) / 100)), rgb(var(--c) / 0.07));
}

/* the edge: round the pentagon, back to the first corner along a bridge with no width, then round
   a pentagon 2.5px smaller. evenodd drops the twice-enclosed middle and leaves an outline. */
.solid i::before {
  content: '';
  position: absolute;
  inset: 0;
  clip-path: polygon(evenodd,
    50% 0%, 97.55% 34.55%, 79.39% 90.45%, 20.61% 90.45%, 2.45% 34.55%, 50% 0%,
    50% 3.24%, 94.47% 35.55%, 77.48% 87.83%, 22.52% 87.83%, 5.53% 35.55%, 50% 3.24%);
  background: color-mix(in srgb, color-mix(in srgb, rgb(var(--c)), #fff 34%) 80%, transparent);
}

/* out to the flat edge, fold over it, on into the new face, then turn it to point the other way */
.solid i:not(.mid) {
  transform:
    rotateZ(calc(var(--k) * 72deg))
    translateY(38.54px) rotateX(-63.435deg) translateY(38.54px)
    rotateZ(180deg);
}

.solid i.mid { --c: 255 77 157; --a: 40; }  /* the two pole faces, pink */
.solid i.alt { --c: 46 230 214; }           /* the lower cap, teal */

@keyframes tumble {
  from { transform: rotateX(-18deg) rotateY(0deg); }
  to   { transform: rotateX(342deg) rotateY(360deg); }
}`,
  },

  gears: {
    how: [
      'A gear is one <code>clip-path</code>. Per tooth it walks four points — root, tip, across the crest, tip, root — and the gap to the next tooth is the stretch between them. A point at radius <code>r</code> lands at <code>50% ± (r / tip) × 50%</code> of the box, at an angle measured clockwise from straight up, the same way <code>rotateZ</code> does.',
      'Two gears can only mesh if they share a <b>module</b> (the tooth size). Pitch radius is <code>module × teeth / 2</code>, and two gears have to stand <code>pitch₁ + pitch₂</code> apart so their pitch circles just touch: 40 + 25 = 65px here.',
      'Then the speeds. Turn time is proportional to tooth count — 12.8s, 8s, 9.6s for 16, 10 and 12 teeth — so the pitch circles run at the same surface speed. Get this wrong and the teeth slide through each other.',
      'And the phase. Each gear points a <b>tooth</b> at its neighbour while the neighbour shows a <b>gap</b>: half a tooth step off, which is the <code>13.5deg</code> on the middle gear. Rotation keeps that relationship, so they stay meshed for good.',
      'The thickness is a panel per tooth, laid flat by <code>rotateX(90deg)</code> out at the tip circle, plus a second plate <code>14px</code> behind the first. Without those the gears would look cut out of paper.',
    ],
    html: `<div class="scene">
  <div class="train">
    <div class="gear g16">
      <b></b><b></b>
${lines(16, (i) => `      <i style="--i:${i}"></i>`)}
      <s></s>
    </div>
    <div class="gear g10">
      <b></b><b></b>
${lines(10, (i) => `      <i style="--i:${i}"></i>`)}
      <s></s>
    </div>
    <div class="gear g12">
      <b></b><b></b>
${lines(12, (i) => `      <i style="--i:${i}"></i>`)}
      <s></s>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.train {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: sway 17s ease-in-out infinite;
}

.gear {
  position: absolute;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: turn var(--t) linear infinite;
}

/* the front plate, cut to the toothed outline */
.gear b {
  position: absolute;
  left: calc(var(--rt) * -1);
  top: calc(var(--rt) * -1);
  width: calc(var(--rt) * 2);
  height: calc(var(--rt) * 2);
  clip-path: var(--clip);
  background:
    radial-gradient(circle at 34% 26%, color-mix(in srgb, var(--c) 30%, #fff) 0 6%, transparent 60%),
    radial-gradient(circle, color-mix(in srgb, var(--c) 82%, #0b0d18) 0 38%, var(--c) 62%, color-mix(in srgb, var(--c) 60%, #0b0d18));
  transform: translateZ(7px);
}

/* the back plate, 14px behind and in shadow, so the tooth gaps read as holes through the rim */
.gear b + b {
  background: color-mix(in srgb, var(--c) 42%, #0b0d18);
  transform: translateZ(-7px);
}

/* the crest of one tooth: a panel at the tip circle, laid flat so it spans the thickness */
.gear i {
  position: absolute;
  left: calc(var(--cw) / -2);
  top: -7px;
  width: var(--cw);
  height: 14px;
  background: linear-gradient(to bottom, color-mix(in srgb, var(--c) 45%, #0b0d18), color-mix(in srgb, var(--c) 75%, #fff));
  transform: rotateZ(calc(var(--i) * var(--step))) translateY(calc(var(--rt) * -1)) rotateX(90deg);
}

/* hub and axle hole, just proud of the front plate */
.gear s {
  position: absolute;
  left: calc(var(--rt) * -0.42);
  top: calc(var(--rt) * -0.42);
  width: calc(var(--rt) * 0.84);
  height: calc(var(--rt) * 0.84);
  border-radius: 50%;
  background: radial-gradient(circle, #0b0d18 0 26%, color-mix(in srgb, var(--c) 55%, #0b0d18) 30% 62%, color-mix(in srgb, var(--c) 92%, #fff) 66%, transparent 72%);
  transform: translateZ(7.6px);
}

/* module 5px: tip radius = 5 × (teeth / 2 + 1), pitch radius = 5 × teeth / 2 */
.g16 {
  --c: #8b6cff;
  --rt: 45px;
  --step: 22.5deg;
  --cw: 8.91px;  /* crest width: 2 × tip × sin(0.21 × step), plus 1.5px so it meets the plate */
  --x: -22px;  /* the train is not symmetrical: everything is shifted to centre it */
  --y: -15px;
  --p: 0deg;
  --dir: 1;
  --t: 12.8s;
  --clip: ${gearClip(16)};
}

.g10 {
  --c: #2ee6d6;
  --rt: 30px;
  --step: 36deg;
  --cw: 9.39px;
  --x: 38.05px; /* 65px from the big gear, along one of its tooth directions (67.5deg) */
  --y: -39.87px;
  --p: 13.5deg; /* half a tooth off, so its gap meets the big gear's tooth */
  --dir: -1;
  --t: 8s;
  --clip: ${gearClip(10)};
}

.g12 {
  --c: #ffb547;
  --rt: 35px;
  --step: 30deg;
  --cw: 9.18px;
  --x: 27.5px;  /* 70px away at 135deg, another tooth direction of the big gear */
  --y: 34.5px;
  --p: 0deg;
  --dir: -1;
  --t: 9.6s;
  --clip: ${gearClip(12)};
}

/* --dir flips the direction: a meshed pair always turns opposite ways */
@keyframes turn {
  from { transform: translate3d(var(--x), var(--y), 0) rotate(var(--p)); }
  to   { transform: translate3d(var(--x), var(--y), 0) rotate(calc(var(--p) + var(--dir) * 360deg)); }
}

@keyframes sway {
  0%, 100% { transform: rotateX(16deg) rotateY(-32deg); }
  50%      { transform: rotateX(11deg) rotateY(-8deg); }
}`,
  },

  spring: {
    how: [
      'Each coil is a single circle — a <code>border-radius: 50%</code> ring — laid flat by <code>rotateX(90deg)</code> and stacked up the axis with <code>translateY(i × -21px)</code>.',
      'One turn of a real helix rises by the pitch, so its ends sit 21px apart. Tilt the flat circle by <code>asin(pitch / 4R) = 6.55°</code> and it climbs exactly that much over half a lap, which lines it up with the coil above: <code>rotateX(90deg - 6.55deg)</code>. The high side is the far one, so the join hides behind the spring.',
      'The whole squash is <b>one</b> <code>scaleY</code> on the box holding the coils, anchored at the bottom. It pulls the offsets together and flattens the tilt a little — and the wire never gets thinner, because a coil lying flat has no height of its own to scale.',
      'Round wire out of a flat ring: give the border four colours. The far edge is in shadow, the near edge catches the light, the sides sit between, and a 2px white <code>::before</code> arc along the near side is the specular.',
      'The release goes past its rest length (<code>scaleY(1.14)</code>) and settles in two smaller bounces. First and last keyframe are both <code>scaleY(1)</code>, so it loops with no jump.',
    ],
    html: `<div class="scene">
  <div class="spring">
    <div class="coils">
${lines(6, (i) => `      <i style="--i:${i};--m:${Math.round((i / 5) * 100)}"></i>`)}
      <b class="plate top"></b>
    </div>
    <b class="plate"></b>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.spring {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: look 15s ease-in-out infinite;
}

/* everything that moves; the base plate is outside it and stays put */
.coils {
  position: absolute;
  top: 52px; /* the spring grows upwards from here, so it straddles the middle of the scene */
  transform-style: preserve-3d;
  animation: press 3.6s infinite;
}

.coils i {
  --c: color-mix(in srgb, #8b6cff, #2ee6d6 calc(var(--m) * 1%));
  position: absolute;
  left: -46px;
  top: -46px;
  width: 92px;
  height: 92px;
  border: 8px solid;
  /* far edge in shadow, near edge lit, sides between: that is what makes the wire look round */
  border-color:
    color-mix(in srgb, var(--c) 34%, #0b0d18)
    color-mix(in srgb, var(--c) 82%, #0b0d18)
    color-mix(in srgb, var(--c) 58%, #fff)
    color-mix(in srgb, var(--c) 82%, #0b0d18);
  border-radius: 50%;
  transform: translateY(calc(var(--i) * -21px)) rotateX(83.45deg);
}

/* the specular: a thin white arc along the near half of the wire */
.coils i::before {
  content: '';
  position: absolute;
  inset: 1.5px;
  border: 2px solid transparent;
  border-bottom-color: rgb(255 255 255 / 0.5);
  border-radius: 50%;
}

/* the shaded inside edge */
.coils i::after {
  content: '';
  position: absolute;
  inset: 5.5px;
  border: 2px solid transparent;
  border-top-color: rgb(0 0 0 / 0.28);
  border-radius: 50%;
}

/* the plates the spring works between; closest-side puts 100% on the edge of the disc, so the
   rim can sit exactly there and the plate reads as a machined part, not a shadow */
.plate {
  position: absolute;
  left: -56px;
  top: -56px;
  width: 112px;
  height: 112px;
  border-radius: 50%;
  background:
    radial-gradient(circle closest-side, transparent 0 89%, color-mix(in srgb, #2ee6d6 60%, transparent) 92% 99%, transparent 100%),
    radial-gradient(circle closest-side at 36% 32%, color-mix(in srgb, #eceefb 20%, #0b0d18), color-mix(in srgb, #eceefb 5%, #0b0d18) 78%);
  transform: translateY(58px) rotateX(90deg); /* 52px down with the coils, 6px clear of them */
}

.top {
  transform: translateY(-111px) rotateX(90deg); /* 5 × 21px of pitch, plus the same 6px */
}

/* press, hold, let go with an overshoot, settle */
@keyframes press {
  0%, 10%   { transform: scaleY(1);    animation-timing-function: cubic-bezier(0.55, 0, 0.5, 1); }
  34%, 46%  { transform: scaleY(0.46); animation-timing-function: cubic-bezier(0.2, 0.9, 0.35, 1); }
  62%       { transform: scaleY(1.14); animation-timing-function: ease-in-out; }
  76%       { transform: scaleY(0.93); animation-timing-function: ease-in-out; }
  88%       { transform: scaleY(1.04); animation-timing-function: ease-in-out; }
  100%      { transform: scaleY(1); }
}

@keyframes look {
  0%, 100% { transform: rotateX(-16deg) rotateY(-15deg); }
  50%      { transform: rotateX(-16deg) rotateY(15deg); }
}`,
  },

  cradle: {
    how: [
      'A pendulum is a <b>zero-size point</b> at the rail with <code>transform-origin: 0 0</code>. Rotating it with <code>rotateZ</code> turns everything hanging off it around the real pivot — the line joining the two rails — and nothing needs a length.',
      'Two strings per ball, one to each rail. Each leans in by <code>atan(depth / drop) = 24.3°</code> and has to be <code>hypot(62, 28) = 68px</code> long to reach the ball on the centre line. That V is what makes the cradle read as a 3D object.',
      'The knock is two keyframe tracks that hand over. The left ball reaches <code>0deg</code> at 22% of the cycle; the right one does not leave until 28%. The 6% in between is the <b>moment of stillness</b> — and the same gap again at 72–78%.',
      'An <code>animation-timing-function</code> written <i>inside</i> a keyframe step sets the easing for the segment starting there: ease-in on the way down, ease-out on the way up, which is how a real pendulum moves — fastest at the bottom, stopped at the top.',
      'The ball sits in a wrapper running the swing <b>backwards</b>, so the highlight stays where the light is. Balls in a cradle swing; they do not spin.',
    ],
    html: `<div class="scene">
  <div class="cradle">
    <b class="bar rail" style="--z:28px"></b>
    <b class="bar rail" style="--z:-28px"></b>
    <b class="bar post" style="--x:89px;--z:28px"></b>
    <b class="bar post" style="--x:-89px;--z:28px"></b>
    <b class="bar post" style="--x:89px;--z:-28px"></b>
    <b class="bar post" style="--x:-89px;--z:-28px"></b>
    <b class="bar base"></b>
${lines(5, (k) => {
  const side = k === 0 ? ' left' : k === 4 ? ' right' : '';
  return `    <div class="arm${side}" style="--k:${k - 2}">
      <i></i><i></i>
      <div class="bob"><div class="ball"></div></div>
    </div>`;
})}
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

/* looking down a little is what shows the depth; no rotateY, so the balls stay circles */
.cradle {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform: rotateX(12deg);
}

.bar {
  --hi: color-mix(in srgb, #eceefb 46%, #0b0d18);
  --lo: color-mix(in srgb, #eceefb 18%, #0b0d18);
  position: absolute;
  background: linear-gradient(var(--lo), var(--hi) 45%, var(--lo));
  border-radius: 3px;
}

.rail {
  left: -92px;
  top: -51px; /* 48px up: everything hangs below the rail, so this centres the cradle */
  width: 184px;
  height: 6px;
  transform: translateZ(var(--z));
}

.post {
  left: -3px;
  top: -51px;
  width: 6px;
  height: 96px;
  transform: translate3d(var(--x), 0, var(--z));
}

.base {
  left: -92px;
  top: -40px;
  width: 184px;
  height: 80px;
  border-radius: 8px;
  background: linear-gradient(160deg, color-mix(in srgb, #eceefb 16%, #0b0d18), color-mix(in srgb, #eceefb 30%, #0b0d18));
  box-shadow: inset 0 0 0 1px rgb(46 230 214 / 0.3);
  transform: translateY(45px) rotateX(90deg);
}

/* the pivot: a point on the rail line, spaced one ball apart */
.arm {
  position: absolute;
  left: calc(var(--k) * 22px);
  top: -48px;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform-origin: 0 0;
}

/* a string runs from one rail down to the centre line, so it leans in and is longer than the drop */
.arm i {
  position: absolute;
  left: -0.75px;
  top: 0;
  width: 1.5px;
  height: 68px;
  background: linear-gradient(rgb(236 238 251 / 0.46), rgb(236 238 251 / 0.24));
  transform-origin: 50% 0;
  transform: translateZ(28px) rotateX(-24.3deg);
}

.arm i + i {
  transform: translateZ(-28px) rotateX(24.3deg);
}

/* carries the ball and undoes the swing, so the highlight does not roll round it */
.bob {
  position: absolute;
  left: 0;
  top: 62px;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
}

.ball {
  position: absolute;
  left: -11px;
  top: -11px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background:
    /* a teal bounce light off the ball next door */
    radial-gradient(circle at 74% 80%, rgb(46 230 214 / 0.6) 0 14%, transparent 44%),
    radial-gradient(circle at 34% 26%, #fff 0 7%, color-mix(in srgb, #8b6cff 40%, #fff) 22%, #8b6cff 56%, color-mix(in srgb, #8b6cff 40%, #0b0d18) 86%);
  box-shadow: inset -2px -3px 7px rgb(0 0 0 / 0.3);
  transform: rotateX(-12deg); /* face the camera again: a circle, not an ellipse */
}

.left  { animation: swing-l 2.8s infinite; }
.right { animation: swing-r 2.8s infinite; }
.left  > .bob { animation: hold-l 2.8s infinite; }
.right > .bob { animation: hold-r 2.8s infinite; }

/* ease-in falling, ease-out rising; the flat stretch is the pause while the far ball is out.
   rotateZ turns clockwise on screen, so a POSITIVE angle throws the bob out to the left. */
@keyframes swing-l {
  0%        { transform: rotateZ(28deg); animation-timing-function: cubic-bezier(0.45, 0, 0.75, 0.45); }
  22%, 78%  { transform: rotateZ(0deg);   animation-timing-function: cubic-bezier(0.25, 0.55, 0.55, 1); }
  100%      { transform: rotateZ(28deg); }
}

@keyframes hold-l {
  0%        { transform: rotateZ(-28deg);  animation-timing-function: cubic-bezier(0.45, 0, 0.75, 0.45); }
  22%, 78%  { transform: rotateZ(0deg);   animation-timing-function: cubic-bezier(0.25, 0.55, 0.55, 1); }
  100%      { transform: rotateZ(-28deg); }
}

@keyframes swing-r {
  0%, 28%   { transform: rotateZ(0deg);   animation-timing-function: cubic-bezier(0.25, 0.55, 0.55, 1); }
  50%       { transform: rotateZ(-28deg);  animation-timing-function: cubic-bezier(0.45, 0, 0.75, 0.45); }
  72%, 100% { transform: rotateZ(0deg); }
}

@keyframes hold-r {
  0%, 28%   { transform: rotateZ(0deg);   animation-timing-function: cubic-bezier(0.25, 0.55, 0.55, 1); }
  50%       { transform: rotateZ(28deg); animation-timing-function: cubic-bezier(0.45, 0, 0.75, 0.45); }
  72%, 100% { transform: rotateZ(0deg); }
}`,
  },
};
