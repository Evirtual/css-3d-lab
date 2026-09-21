/** Copy-paste versions of the batch-J demos: plain HTML + CSS (+ JS), no Sass. */
import type { Snippet } from './snippet-utils';

/** n lines of markup, one per index, indented. */
const lines = (n: number, fn: (i: number) => string, indent = '      '): string =>
  Array.from({ length: n }, (_, i) => indent + fn(i)).join('\n');

const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const AMBER = '#ffb547';
const TEXT = '#eceefb';
const MUTED = '#949bc0';
const SURFACE = '#141830';

const r2 = (v: number): number => +v.toFixed(2);
const deg = (rad: number): number => r2((rad * 180) / Math.PI);

/** Side n of a round object: its angle and its baked-in shade (the same numbers as the demo). */
const side = (n: number, sides: number): string => {
  const a = (360 / sides) * n;
  const d = 0.26 - 0.24 * Math.cos(((a + 35) * Math.PI) / 180);
  return `--a:${r2(a)}deg;--d:${d.toFixed(2)}`;
};

/**
 * The declarations for one side of an n-sided frustum (a cone when top = 0), worked out here so
 * the CSS carries plain numbers: size, where it stands, how far it leans in, and its clip shape.
 * Lengths come out in the model's base unit, as calc(N * var(--u)).
 */
const frustum = (n: number, bottom: number, top: number, h: number, y: number, closed = true): string => {
  const tan = Math.tan(Math.PI / n);
  const w = 2 * bottom * tan + 0.6; // a hair wider than exact: no cracks between sides
  const wTop = 2 * top * tan;
  const len = Math.hypot(h, bottom - top); // the slanted length
  const inset = r2(((w - wTop) / (2 * w)) * 100);
  const clip = top === 0 ? 'polygon(50% 0, 100% 100%, 0 100%)' : `polygon(${inset}% 0, ${r2(100 - inset)}% 0, 100% 100%, 0 100%)`;
  return `  position: absolute;
  left: calc(${r2(-w / 2)} * var(--u));
  top: calc(${r2(y - len)} * var(--u));
  width: calc(${r2(w)} * var(--u));
  height: calc(${r2(len)} * var(--u));
  clip-path: ${clip};
  transform-origin: 50% 100%;
  /* turn to its side, step out to the bottom radius, lean in by atan((bottom - top) / height) */
  transform: rotateY(var(--a)) translateZ(calc(${bottom} * var(--u))) rotateX(${deg(Math.atan((bottom - top) / h))}deg);${closed ? '\n  backface-visibility: hidden;' : ''}`;
};

// windmill numbers: tower half-widths 24 → 15 over 92px, cap 21 wide and 30 high
const TOWER_LEAN = deg(Math.atan(9 / 92));
const TOWER_SIDE = r2(Math.hypot(92, 9));
const CAP_LEAN = deg(Math.atan(21 / 30));
const CAP_SIDE = r2(Math.hypot(21, 30));
const WM_SHADE = [0, 0.2, 0.36, 0.12];

// rocket nose: radius 13, height 30
const NOSE_LEAN = deg(Math.atan(13 / 30));
const NOSE_SIDE = r2(Math.hypot(13, 30));

const LEVELS: [string, number][] = [
  ['Low', 22],
  ['Mid', 58],
  ['High', 94],
];
const EVENTS: [string, string][] = [
  ['2016', 'First sketch'],
  ['2019', 'Launch'],
  ['2021', 'Version 2'],
  ['2023', 'Going global'],
  ['2026', 'Today'],
];

export const snippetsJ: Record<string, Snippet> = {
  windmill: {
    how: [
      'Everything hangs from <b>one point</b>, the middle of the grass block’s top. The outer box tilts the camera down with <code>rotateX(-20deg)</code>; a child spins the whole model with <code>rotateY</code>, so you see it from every side.',
      'The tower is a <b>frustum</b>: four trapezoids (<code>clip-path</code>), each standing on its bottom edge. <code>rotateY(side)</code> and a <code>translateZ</code> of 24 units put it on its side of the base; <code>rotateX(5.59deg)</code> then leans it in by <code>atan((24 − 15) / 92)</code>, exactly enough to bring its top edge in to the narrower top.',
      'A leaning side is longer than the tower is high: it is the hypotenuse, √(92² + 9²) = 92.44 units. The cap is the same trick with triangles, leaning so far in that the tips meet.',
      'The sails are four identical blades drawn pointing up from the hub (<code>transform-origin</code> = the hub) and turned by 90° steps. Their parent loops <code>rotate(0 → -360deg)</code>. It needs <code>preserve-3d</code> too: a flat, zero-size group gets sorted as one plane and hides behind the tower.',
      'Light is baked in: every side has a dark overlay of its own strength (<code>--d</code>), so the model looks lit from the front-left as it turns. <code>backface-visibility: hidden</code> skips the sides facing away.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the grass block is 150 units square and the tower 92 high, so the windmill is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="windmill">
    <div class="spin">
      <div class="hill">
${lines(4, (i) => `<i style="--n:${i};--d:${WM_SHADE[i]}"></i>`)}
        <i class="top"></i>
      </div>
      <div class="tree" style="--x:-50;--z:-44;--k:1"><i></i><i></i></div>
      <div class="tree" style="--x:52;--z:34;--k:0.8"><i></i><i></i></div>
      <div class="tower">
${lines(4, (i) => `<i${i === 0 ? ' class="front"' : ''} style="--n:${i};--d:${WM_SHADE[i]}"></i>`)}
      </div>
      <div class="cap">
${lines(4, (i) => `<i style="--n:${i};--d:${WM_SHADE[i]}"></i>`)}
      </div>
      <div class="rotor">
        <div class="sails"><b style="--n:0"></b><b style="--n:1"></b><b style="--n:2"></b><b style="--n:3"></b><u></u></div>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the windmill is the same share of
     a gallery card, the editor, a full screen and a recording canvas */
  --u: 0.25vmin;
  display: grid;
  place-items: center;
  perspective: calc(800 * var(--u));
}

.windmill {
  --grass: color-mix(in srgb, ${TEAL} 35%, #4f9a3a);
  --earth: color-mix(in srgb, ${AMBER} 30%, #4a3226);
  --plaster: color-mix(in srgb, ${AMBER} 8%, #f2ede5);
  --roof: color-mix(in srgb, ${PINK} 70%, #4a1024);
  --wood: #5b3b25;
  position: relative;
  width: calc(210 * var(--u));
  height: calc(200 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(-20deg); /* the camera looks down a little */
}

/* the model's origin: the middle of the grass top */
.spin {
  position: absolute;
  left: 50%;
  top: calc(164 * var(--u));
  transform-style: preserve-3d;
  animation: turn 28s linear infinite;
}

.hill,
.tower,
.cap,
.rotor,
.tree {
  position: absolute;
  transform-style: preserve-3d;
}

/* grass block: four earth sides hanging from the top edge, and the top laid flat */
.hill i {
  position: absolute;
  left: calc(-75 * var(--u));
  top: 0;
  width: calc(150 * var(--u));
  height: calc(24 * var(--u));
  background:
    linear-gradient(rgb(0 0 0 / var(--d)), rgb(0 0 0 / var(--d))),   /* baked-in shade */
    linear-gradient(var(--grass) 0 calc(5 * var(--u)), transparent calc(7 * var(--u))),
    linear-gradient(var(--earth), color-mix(in srgb, var(--earth) 65%, #000));
  backface-visibility: hidden;
  transform: rotateY(calc(var(--n) * 90deg)) translateZ(calc(75 * var(--u)));
}

.hill .top {
  top: calc(-75 * var(--u));
  height: calc(150 * var(--u));
  background:
    radial-gradient(circle at 60% 30%, #ffe0a8 0 calc(1.5 * var(--u)), transparent calc(2 * var(--u))) 0 0 / calc(34 * var(--u)) calc(30 * var(--u)),
    linear-gradient(#c9a066, #c9a066) 50% 100% / calc(12 * var(--u)) 50% no-repeat,   /* the path to the door */
    radial-gradient(closest-side, color-mix(in srgb, var(--grass) 70%, #fff), var(--grass) 70%, color-mix(in srgb, var(--grass) 80%, #000));
  transform: rotateX(90deg);
}

/* a tree: two crossed planes, each cut to a tree outline; --x and --z are plain numbers, in units */
.tree {
  transform: translate3d(calc(var(--x) * var(--u)), 0, calc(var(--z) * var(--u))) scale(var(--k));
}

.tree i {
  position: absolute;
  left: calc(-13 * var(--u));
  top: calc(-44 * var(--u));
  width: calc(26 * var(--u));
  height: calc(44 * var(--u));
  background: linear-gradient(color-mix(in srgb, var(--grass) 80%, #fff), color-mix(in srgb, var(--grass) 70%, #000) 80%, var(--wood) 80%);
  clip-path: polygon(50% 0, 70% 32%, 60% 32%, 88% 64%, 74% 64%, 100% 80%, 58% 80%, 58% 100%, 42% 100%, 42% 80%, 0 80%, 26% 64%, 12% 64%, 40% 32%, 30% 32%);
}

.tree i + i {
  transform: rotateY(90deg);
}

/* Tower sides: trapezoids 48 units wide at the base, 30 at the top. Each stands on its bottom
   edge (the origin), steps out 24 units and leans in by atan(9 / 92) = ${TOWER_LEAN}deg. */
.tower i {
  position: absolute;
  left: calc(-24 * var(--u));
  top: calc(-${TOWER_SIDE} * var(--u));
  width: calc(48 * var(--u));
  height: calc(${TOWER_SIDE} * var(--u)); /* the slanted length: √(92² + 9²) */
  clip-path: polygon(18.75% 0, 81.25% 0, 100% 100%, 0 100%);
  transform-origin: 50% 100%;
  transform: rotateY(calc(var(--n) * 90deg)) translateZ(calc(24 * var(--u))) rotateX(${TOWER_LEAN}deg);
  backface-visibility: hidden;
  background:
    linear-gradient(rgb(0 0 0 / var(--d)), rgb(0 0 0 / var(--d))),
    linear-gradient(var(--wood) 0 calc(6 * var(--u)), transparent calc(6 * var(--u))),
    radial-gradient(circle at 50% 38%, ${AMBER} 0 calc(3.5 * var(--u)), var(--wood) calc(4 * var(--u)) calc(5.5 * var(--u)), transparent calc(6 * var(--u))),
    var(--plaster);
}

.tower .front {
  background:
    linear-gradient(var(--wood) 0 calc(6 * var(--u)), transparent calc(6 * var(--u))),
    radial-gradient(circle at 50% 38%, ${AMBER} 0 calc(3.5 * var(--u)), var(--wood) calc(4 * var(--u)) calc(5.5 * var(--u)), transparent calc(6 * var(--u))),
    radial-gradient(circle at 50% calc(100% - calc(16 * var(--u))), var(--wood) 0 calc(7.5 * var(--u)), transparent calc(8 * var(--u))),
    linear-gradient(var(--wood), var(--wood)) 50% 100% / calc(15 * var(--u)) calc(16 * var(--u)) no-repeat,
    var(--plaster);
}

/* the cap: the same trick with triangles, standing on the tower's top (y = -92 units) */
.cap i {
  position: absolute;
  left: calc(-21 * var(--u));
  top: calc(-${r2(92 + CAP_SIDE)} * var(--u));
  width: calc(42 * var(--u));
  height: calc(${CAP_SIDE} * var(--u));
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  transform-origin: 50% 100%;
  transform: rotateY(calc(var(--n) * 90deg)) translateZ(calc(21 * var(--u))) rotateX(${CAP_LEAN}deg);
  backface-visibility: hidden;
  background:
    linear-gradient(rgb(0 0 0 / var(--d)), rgb(0 0 0 / var(--d))),
    repeating-linear-gradient(transparent 0 calc(5 * var(--u)), rgb(0 0 0 / 0.22) calc(5 * var(--u)) calc(6 * var(--u))),
    linear-gradient(color-mix(in srgb, var(--roof) 75%, #fff), var(--roof));
}

/* the hub: above the tower, in front of the cap */
.rotor {
  transform: translate3d(0, calc(-100 * var(--u)), calc(27 * var(--u)));
}

.sails {
  position: absolute;
  transform-style: preserve-3d; /* sort each sail on its own */
  animation: sails 6s linear infinite;
}

/* one blade pointing up from the hub: stock on the left edge, lattice and cloth beside it */
.sails b {
  position: absolute;
  left: calc(-2 * var(--u));
  bottom: calc(5 * var(--u));
  width: calc(24 * var(--u));
  height: calc(70 * var(--u));
  transform-origin: calc(2 * var(--u)) calc(100% + calc(5 * var(--u))); /* the hub */
  transform: rotate(calc(var(--n) * 90deg));
  background:
    linear-gradient(90deg, var(--wood) 0 calc(4 * var(--u)), transparent calc(4 * var(--u))),
    linear-gradient(90deg, transparent calc(100% - calc(2 * var(--u))), var(--wood) 0) 0 0 / 100% 80% no-repeat,
    repeating-linear-gradient(transparent 0 calc(7 * var(--u)), var(--wood) calc(7 * var(--u)) calc(8.5 * var(--u))) 0 0 / 100% 80% no-repeat,
    linear-gradient(#fff6e9, #efd5ab) calc(4 * var(--u)) 0 / calc(100% - calc(4 * var(--u))) 80% no-repeat;
}

.sails u {
  position: absolute;
  left: calc(-6 * var(--u));
  top: calc(-6 * var(--u));
  width: calc(12 * var(--u));
  height: calc(12 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #c8b5a8, var(--wood) 70%);
  transform: translateZ(calc(1 * var(--u)));
}

@keyframes turn {
  to { transform: rotateY(360deg); }
}

@keyframes sails {
  to { transform: rotate(-360deg); }
}`,
  },

  rocket: {
    how: [
      'The body is a <b>cylinder of 10 strips</b>: each one <code>rotateY(n × 36deg)</code>, then a <code>translateZ</code> of 13 units. The nose uses the same angles with triangles that stand on the body’s top edge and lean in by <code>atan(13 / 30)</code>, so their tips meet on the axis.',
      'One 10s timeline drives everything, with matching percentages in each <code>@keyframes</code>: ignition at 6%, lift-off at 13%, out of sight by 40%, on the way back at 46%, touchdown at 88%. Start and end are the same frame, so the loop has no seam.',
      'The climb goes <b>into depth, not up</b>, so the rocket needs no empty sky above it and can fill the frame on its pad. The flight layer moves 5000 units away with <code>translateZ</code>, where an 800-unit perspective draws it a seventh of its size. <code>perspective-origin</code> sits on the rocket\'s shoulder, just under the nose, and everything far away closes in on that point: the tail lifts off the pad and the rocket shrinks up into the sky while the nose never rises past where it stood. The small real lift in <code>translateY</code> is kept under a fortieth of the depth for the same reason. It is hidden with <code>visibility</code> for just 0.6s at the far end (not <code>opacity</code>: below 1 it would flatten the 3D rocket into one plane). Per-keyframe easing speeds the climb up and slows the landing down.',
      'The flame is two crossed planes of radial gradients. The container scales them on and off (short while the rocket is still on the pad, so the flame never pokes out under it); two pseudo-elements flicker with fast <code>alternate</code> loops. Only <code>transform</code> and <code>opacity</code> move.',
      'The camera sways ±28° on the ground and on the rocket with the same animation, so they stay in step, and the fins show their depth. The gantry is nearly as tall as the rocket, so while the rocket is far away the pad still fills the frame.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the frame is 200 × 132 units, the pad 118 units down it and the rocket 111 tall from fins to nose, so the launch is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="launch">
  <div class="base">
    <div class="pad"></div>
    <div class="glow"></div>
    <div class="tower"><i></i><i></i></div>
    <div class="arm"></div>
${lines(6, (i) => `<em style="--x:${[-1, -0.55, -0.2, 0.25, 0.6, 1][i]};--z:${[8, -10, 14, -6, 12, -12][i]};--s:${[1, 0.8, 1.1, 0.9, 1.2, 0.85][i]}"></em>`, '    ')}
  </div>
  <div class="flight">
    <div class="craft">
      <div class="ship">
${lines(10, (i) => `<i style="${side(i, 10)}"></i>`, '        ')}
${lines(10, (i) => `<b style="${side(i, 10)}"></b>`, '        ')}
        <s style="--a:90deg"></s><s style="--a:210deg"></s><s style="--a:330deg"></s>
        <u></u><u></u>
        <span class="window"></span>
        <div class="flame"><i></i><i></i></div>
      </div>
    </div>
  </div>
</div>`,
    css: `.launch {
  /* one base unit: every length below is a multiple of it, so the launch is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.52vmin;
  position: relative;
  width: calc(200 * var(--u));
  height: calc(132 * var(--u));
  perspective: calc(800 * var(--u));
  /* the eye looks at the rocket's shoulder, just under the nose, so whatever flies away into the
     distance closes in on that point: the rocket climbs by shrinking, and never needs sky above
     it. The frame is only as tall as the rocket on its pad, so the rocket is drawn large */
  perspective-origin: 50% calc(27 * var(--u));
  transform-style: preserve-3d;
}

/* the pad point, on the ground and in the flight layer; both carry the same swaying camera */
.base,
.craft {
  position: absolute;
  left: 50%;
  top: calc(118 * var(--u));
  transform-style: preserve-3d;
  animation: sway 16s ease-in-out infinite alternate;
}

.base::before {
  content: '';
  position: absolute;
  left: calc(-100 * var(--u));
  top: calc(-100 * var(--u));
  width: calc(200 * var(--u));
  height: calc(200 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(139 108 255 / 0.24), transparent);
  transform: translateY(calc(1 * var(--u))) rotateX(90deg);
}

.pad,
.glow {
  position: absolute;
  left: calc(-46 * var(--u));
  top: calc(-46 * var(--u));
  width: calc(92 * var(--u));
  height: calc(92 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, #555a7c 0 50%, ${AMBER} 51% 55%, #33374f 56% 92%, #5c6186 93% 97%, transparent 98%);
  transform: rotateX(90deg);
}

.glow {
  left: calc(-70 * var(--u));
  top: calc(-70 * var(--u));
  width: calc(140 * var(--u));
  height: calc(140 * var(--u));
  background: radial-gradient(closest-side, #ffe2b0, rgb(255 77 157 / 0.45) 45%, transparent);
  opacity: 0;
  transform: translateY(calc(-1 * var(--u))) rotateX(90deg);
  animation: glow 10s linear infinite;
}

.tower {
  position: absolute;
  transform-style: preserve-3d;
  transform: translate3d(calc(-40 * var(--u)), 0, calc(-8 * var(--u)));
}

.tower i {
  position: absolute;
  left: calc(-6 * var(--u));
  top: calc(-104 * var(--u));
  width: calc(12 * var(--u));
  height: calc(104 * var(--u));
  background:
    linear-gradient(90deg, #aab0d0 0 calc(2 * var(--u)), transparent calc(2 * var(--u)) calc(100% - calc(2 * var(--u))), #aab0d0 0),
    repeating-linear-gradient(40deg, #aab0d0 0 calc(1.2 * var(--u)), transparent calc(1.2 * var(--u)) calc(10 * var(--u))),
    repeating-linear-gradient(-40deg, #aab0d0 0 calc(1.2 * var(--u)), transparent calc(1.2 * var(--u)) calc(10 * var(--u)));
  opacity: 0.85;
}

.tower i + i {
  transform: rotateY(90deg);
}

.arm {
  position: absolute;
  left: calc(-34 * var(--u));
  top: calc(-74 * var(--u));
  width: calc(21 * var(--u));
  height: calc(4 * var(--u));
  background: #aab0d0;
  transform-origin: 0 50%;
  animation: arm 10s ease-in-out infinite;
}

/* smoke: flat discs pushed out sideways (--x) at lift-off and at touchdown; --x and --z are
   plain numbers, and --z counts units */
.base em {
  position: absolute;
  left: calc(-15 * var(--u));
  top: calc(-26 * var(--u));
  width: calc(30 * var(--u));
  height: calc(30 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #d8dbeb, rgb(148 155 192 / 0.75) 55%, transparent 71%);
  opacity: 0;
  animation: smoke 10s linear infinite;
}

/* the flight layer is the whole frame; it rises a little and then flies away from the camera */
.flight {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: fly 10s infinite;
}

.ship {
  position: absolute;
  transform-style: preserve-3d;
  transform: translateY(calc(-9 * var(--u))); /* the fins are the legs */
}

/* body: 10 strips round the axis; --d is each side's baked-in shade */
.ship i {
  position: absolute;
  left: calc(-4.5 * var(--u));
  top: calc(-72 * var(--u));
  width: calc(9 * var(--u)); /* a hair more than 2 · 13 · tan(18°) = 8.45 units: no cracks */
  height: calc(72 * var(--u));
  background:
    linear-gradient(rgb(12 14 34 / var(--d)), rgb(12 14 34 / var(--d))),
    linear-gradient(#eef0fa 0 12%, ${VIOLET} 12% 20%, #eef0fa 20% 84%, #3b3f5e 84%);
  backface-visibility: hidden;
  transform: rotateY(var(--a)) translateZ(calc(13 * var(--u)));
}

/* nose: triangles on the same sides, leaning in by atan(13 / 30) */
.ship b {
  position: absolute;
  left: calc(-4.23 * var(--u));
  top: calc(-${r2(72 + NOSE_SIDE)} * var(--u));
  width: calc(8.45 * var(--u));
  height: calc(${NOSE_SIDE} * var(--u)); /* √(13² + 30²) */
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  background:
    linear-gradient(rgb(12 14 34 / var(--d)), rgb(12 14 34 / var(--d))),
    linear-gradient(#ffb8d8, ${PINK});
  backface-visibility: hidden;
  transform-origin: 50% 100%;
  transform: rotateY(var(--a)) translateZ(calc(13 * var(--u))) rotateX(${NOSE_LEAN}deg);
}

/* fins: planes standing out from the axis, turned round it */
.ship s {
  position: absolute;
  left: calc(11 * var(--u));
  top: calc(-30 * var(--u));
  width: calc(20 * var(--u));
  height: calc(39 * var(--u));
  clip-path: polygon(0 0, 100% 60%, 100% 100%, 0 78%);
  background: linear-gradient(90deg, #b3366e, ${PINK} 70%);
  transform-origin: calc(-11 * var(--u)) 0; /* = the axis */
  transform: rotateY(var(--a));
}

.ship u {
  position: absolute;
  left: calc(-7 * var(--u));
  top: 0;
  width: calc(14 * var(--u));
  height: calc(8 * var(--u));
  clip-path: polygon(22% 0, 78% 0, 100% 100%, 0 100%);
  background: linear-gradient(#6a6f90, #2a2d42);
}

.ship u + u {
  transform: rotateY(90deg);
}

.window {
  position: absolute;
  left: calc(-5 * var(--u));
  top: calc(-54 * var(--u));
  width: calc(10 * var(--u));
  height: calc(10 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff 0 12%, ${TEAL} 42%, #125e58);
  box-shadow: 0 0 0 calc(1.5 * var(--u)) #b8bcd6;
  transform: translateZ(calc(13.6 * var(--u)));
}

.flame {
  position: absolute;
  top: calc(7 * var(--u));
  transform-style: preserve-3d;
  transform-origin: 0 0;
  animation: burn 10s linear infinite;
}

.flame i {
  position: absolute;
  left: calc(-10 * var(--u));
  top: 0;
  width: calc(20 * var(--u));
  height: calc(56 * var(--u));
}

.flame i + i {
  transform: rotateY(90deg);
}

.flame i::before,
.flame i::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 40% 40% 50% 50% / 16% 16% 84% 84%;
  transform-origin: 50% 0;
  background: radial-gradient(ellipse 50% 100% at 50% 0, #fff 0 10%, ${AMBER} 32%, rgb(255 77 157 / 0.7) 62%, transparent 98%);
  animation: flicker 0.11s ease-in-out infinite alternate;
}

.flame i::after {
  inset: 0 calc(5 * var(--u)) 38%;
  background: radial-gradient(ellipse 50% 100% at 50% 0, #fff 0 35%, #ffdaa3 60%, transparent 98%);
  animation-duration: 0.15s;
  animation-direction: alternate-reverse;
}

@keyframes sway {
  from { transform: rotateX(-12deg) rotateY(-28deg); }
  to   { transform: rotateX(-12deg) rotateY(28deg); }
}

/* rest · lift-off · away into the sky, speeding up · out of sight · back down onto the pad,
   slowing down · rest. The climb is depth, not height: shrinking towards the perspective-origin
   at the shoulder lifts the tail off the pad, and the few units of real lift never take the nose
   higher than it stands at rest (lift ≤ depth ÷ 40 at every keyframe), so the rocket needs no sky
   above it. 5000 units back behind an 800-unit perspective it is a seventh of its size, and it is
   hidden there for 0.6s. visibility, not opacity: opacity below 1 would flatten the 3D rocket. */
@keyframes fly {
  0%, 13% { transform: translate3d(0, 0, 0); animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6); }
  22%     { transform: translate3d(0, calc(-5 * var(--u)), calc(-300 * var(--u))); animation-timing-function: cubic-bezier(0.4, 0, 0.9, 0.7); }
  39.9%   { visibility: visible; }
  40%, 46% { visibility: hidden; transform: translate3d(0, calc(-100 * var(--u)), calc(-5000 * var(--u))); animation-timing-function: cubic-bezier(0.15, 0.55, 0.4, 1); }
  46.1%   { visibility: visible; }
  88%, 100% { transform: translate3d(0, 0, 0); }
}

/* the flame only grows as the rocket clears the pad */
@keyframes burn {
  0%, 6% { transform: scale(0.4, 0); }
  10% { transform: scale(1, 0.2); }
  20% { transform: scale(1, 0.35); }
  30%, 72% { transform: scale(1, 1.15); }
  80% { transform: scale(1, 0.5); }
  86% { transform: scale(0.9, 0.2); }
  90%, 100% { transform: scale(0.4, 0); }
}

@keyframes flicker {
  from { transform: scale(0.94, 0.86); }
  to   { transform: scale(1.04, 1.08); }
}

@keyframes glow {
  0%, 6%, 28%, 72%, 92%, 100% { opacity: 0; }
  12%, 17%, 82%, 87% { opacity: 1; }
}

@keyframes arm {
  0%, 3%, 96%, 100% { transform: translateZ(calc(-4 * var(--u))) rotateY(0deg); }
  9%, 91% { transform: translateZ(calc(-4 * var(--u))) rotateY(75deg); }
}

@keyframes smoke {
  0%, 8% { opacity: 0; transform: translate3d(0, 0, calc(var(--z) * var(--u))) scale(0.3); }
  13% { opacity: 0.85; transform: translate3d(calc(var(--x) * 18 * var(--u)), calc(-3 * var(--u)), calc(var(--z) * var(--u))) scale(0.9); }
  32% { opacity: 0; transform: translate3d(calc(var(--x) * 62 * var(--u)), calc(-18 * var(--u)), calc(var(--z) * var(--u))) scale(calc(var(--s) * 1.7)); }
  33%, 83% { opacity: 0; transform: translate3d(0, 0, calc(var(--z) * var(--u))) scale(0.3); }
  88% { opacity: 0.75; transform: translate3d(calc(var(--x) * 16 * var(--u)), calc(-3 * var(--u)), calc(var(--z) * var(--u))) scale(0.85); }
  100% { opacity: 0; transform: translate3d(calc(var(--x) * 54 * var(--u)), calc(-14 * var(--u)), calc(var(--z) * var(--u))) scale(calc(var(--s) * 1.5)); }
}`,
  },

  lighthouse: {
    how: [
      'Every round part is a <b>frustum of leaning sides</b>: <code>rotateY(side) translateZ(bottom radius) rotateX(lean)</code>, with the lean <code>atan((bottom − top) / height)</code> and a trapezoid <code>clip-path</code>. Rock, striped tower, glass room and roof are the same recipe with other numbers.',
      'A light beam is two long tapering planes crossed like a flat X (±14° from level) with a gradient that fades out. The pair spins with <code>rotateY</code>, and the far beam passes behind the tower.',
      'The sea is a flat disc that clips its own wave lines. Each wave layer slides by exactly <b>one pattern period</b> and jumps back, so the loop is seamless. A lit wedge on the water turns with the beams: on a floor laid flat, <code>rotate(-a)</code> turns the same way as <code>rotateY(a)</code> above it.',
      'The browser sorts 3D planes by cutting them along each other’s infinite planes, and those cuts can show as shards. So the scene is <b>three layers with the same camera</b> painted in order (sea, rock, tower), which is always right with the camera above, and closed solids hide their back faces.',
      'Twice a turn a beam points at you; the halo at the lamp flares then, on a loop half as long as the sweep.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, and the frustum numbers are worked out in it: the rock is 80 units across and the tower stands 84 high on it, so the lighthouse is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="lighthouse">
    <div class="layer"><div class="model">
      <div class="sea"><i></i><i></i><u></u></div>
    </div></div>
    <div class="layer"><div class="model">
      <div class="rock">
${lines(8, (i) => `<i style="${side(i, 8)}"></i>`, '        ')}
        <b></b>
      </div>
    </div></div>
    <div class="layer"><div class="model">
      <div class="tower">
${lines(10, (i) => `<i style="${side(i, 10)}"></i>`, '        ')}
      </div>
      <div class="gallery"></div>
      <div class="rail"></div>
      <div class="room">
${lines(6, (i) => `<i style="--a:${i * 60}deg"></i>`, '        ')}
        <b></b>
      </div>
      <div class="roof">
${lines(6, (i) => `<i style="${side(i, 6)}"></i>`, '        ')}
        <b></b>
      </div>
      <div class="beam"><i></i><i></i><i></i><i></i></div>
    </div></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the lighthouse is the same share
     of a gallery card, the editor, a full screen and a recording canvas */
  --u: 0.33vmin;
  display: grid;
  place-items: center;
}

/* the root is flat (three layers painted in order), so it holds the perspective itself */
.lighthouse {
  position: relative;
  width: calc(220 * var(--u));
  height: calc(200 * var(--u));
  perspective: calc(800 * var(--u));
}

.lighthouse * {
  box-sizing: border-box;
}

/* each layer carries the same camera */
.layer {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateX(-22deg) rotateY(-24deg);
}

/* the model's origin: the middle of the sea */
.model,
.rock,
.tower,
.room,
.roof {
  position: absolute;
  transform-style: preserve-3d;
}

.model {
  left: 50%;
  top: calc(150 * var(--u));
}

/* the sea: a flat disc; it may clip, nothing in it is 3D */
.sea {
  position: absolute;
  left: calc(-110 * var(--u));
  top: calc(-110 * var(--u));
  width: calc(220 * var(--u));
  height: calc(220 * var(--u));
  overflow: hidden;
  border: calc(1.5 * var(--u)) solid rgb(46 230 214 / 0.4);
  border-radius: 50%;
  background:
    radial-gradient(circle, transparent 0 calc(44 * var(--u)), rgb(255 255 255 / 0.5) calc(45 * var(--u)) calc(47 * var(--u)), transparent calc(50 * var(--u)) calc(54 * var(--u)), rgb(255 255 255 / 0.16) calc(55 * var(--u)) calc(56 * var(--u)), transparent calc(58 * var(--u))),
    radial-gradient(circle, #3f3b94, #1e1c4a 72%);
  transform: rotateX(90deg);
}

/* wave lines broken into dashes by a mask; they slide by exactly one period */
.sea i {
  position: absolute;
  inset: calc(-20 * var(--u)) 0 0;
  background: repeating-linear-gradient(transparent 0 calc(16 * var(--u)), rgb(46 230 214 / 0.55) calc(16 * var(--u)) calc(17.5 * var(--u)), transparent calc(17.5 * var(--u)) calc(20 * var(--u)));
  mask: repeating-linear-gradient(90deg, #000 0 calc(22 * var(--u)), transparent calc(22 * var(--u)) calc(36 * var(--u)));
  animation: waves 2.6s linear infinite;
}

.sea i + i {
  inset: calc(-28 * var(--u)) 0 0;
  background: repeating-linear-gradient(transparent 0 calc(9 * var(--u)), rgb(160 140 255 / 0.6) calc(9 * var(--u)) calc(10 * var(--u)), transparent calc(10 * var(--u)) calc(28 * var(--u)));
  mask: repeating-linear-gradient(90deg, transparent 0 calc(14 * var(--u)), #000 calc(14 * var(--u)) calc(30 * var(--u)), transparent calc(30 * var(--u)) calc(46 * var(--u)));
  animation: waves-2 4.2s linear infinite;
}

/* light on the water under the beams, turning with them */
.sea u {
  position: absolute;
  inset: 0;
  background: conic-gradient(from 70deg, transparent, rgb(255 181 71 / 0.55) 20deg, transparent 40deg 180deg, rgb(255 181 71 / 0.55) 200deg, transparent 220deg);
  mask: radial-gradient(closest-side, transparent 14%, #000 34%, transparent 98%);
  animation: pool 8s linear infinite;
}

/* rock: 8 sides, radius 40 → 31 over 18 units */
.rock i {
${frustum(8, 40, 31, 18, 0)}
  background:
    linear-gradient(rgb(6 8 26 / var(--d)), rgb(6 8 26 / var(--d))),
    radial-gradient(circle at 30% 30%, rgb(255 255 255 / 0.12) 0 calc(3 * var(--u)), transparent calc(3.5 * var(--u))) 0 0 / calc(13 * var(--u)) calc(11 * var(--u)),
    linear-gradient(#636885, #393c4f 80%, #114949);
}

/* the rock's flat top, an octagon */
.rock b {
  position: absolute;
  left: calc(-31 * var(--u));
  top: calc(-49 * var(--u));
  width: calc(62 * var(--u));
  height: calc(62 * var(--u));
  clip-path: polygon(29.3% 0, 70.7% 0, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0 70.7%, 0 29.3%);
  background: radial-gradient(circle at 40% 40%, #82869d, #636885 70%);
  transform: rotateX(90deg);
}

/* tower: 10 sides, radius 16 → 11 over 84 units, standing on the rock (y = -18) */
.tower i {
${frustum(10, 16, 11, 84, -18)}
  background:
    linear-gradient(rgb(6 8 26 / var(--d)), rgb(6 8 26 / var(--d))),
    repeating-linear-gradient(#e04285 0 calc(14 * var(--u)), #f3efe7 calc(14 * var(--u)) calc(28 * var(--u)));
}

/* the front side: a door and a lit window */
.tower i:first-child {
  background:
    linear-gradient(#2a1c28, #2a1c28) 50% 100% / calc(6 * var(--u)) calc(11 * var(--u)) no-repeat,
    linear-gradient(${AMBER}, ${AMBER}) 50% 45% / calc(4 * var(--u)) calc(6 * var(--u)) no-repeat,
    repeating-linear-gradient(#e04285 0 calc(14 * var(--u)), #f3efe7 calc(14 * var(--u)) calc(28 * var(--u)));
}

.gallery,
.rail {
  position: absolute;
  left: calc(-18 * var(--u));
  top: calc(-120 * var(--u));
  width: calc(36 * var(--u));
  height: calc(36 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, #3a3e58 70%, #23263a);
  transform: rotateX(90deg);
}

.rail {
  top: calc(-126 * var(--u));
  border: calc(1.5 * var(--u)) solid #a3a8c8;
  background: none;
}

/* lamp room: 6 glass panes (open: the far panes show through) */
.room i {
${frustum(6, 8, 8, 14, -102, false)}
  background:
    linear-gradient(90deg, #2b2e44 0 calc(1 * var(--u)), transparent calc(1 * var(--u)) calc(100% - calc(1 * var(--u))), #2b2e44 0),
    rgb(255 181 71 / 0.4);
}

/* a flat halo at the lamp, level with the beams */
.room b {
  position: absolute;
  left: calc(-16 * var(--u));
  top: calc(-16 * var(--u));
  width: calc(32 * var(--u));
  height: calc(32 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, #fff 0 18%, #ffd08a 30%, rgb(255 181 71 / 0.45) 55%, transparent);
  transform: translateY(calc(-109 * var(--u))) rotateX(90deg);
  animation: flash 4s ease-in-out infinite;
}

/* roof: a cone of 6 triangles */
.roof i {
${frustum(6, 11, 0, 12, -116)}
  background:
    linear-gradient(rgb(6 8 26 / var(--d)), rgb(6 8 26 / var(--d))),
    linear-gradient(#5f53a3, #1d2033);
}

.roof b {
  position: absolute;
  left: calc(-3 * var(--u));
  top: calc(-132 * var(--u));
  width: calc(6 * var(--u));
  height: calc(6 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff, #8a8fb0);
}

/* two beams, each two tapering planes crossed at ±14deg around the beam's axis */
.beam {
  position: absolute;
  top: calc(-109 * var(--u));
  transform-style: preserve-3d;
  animation: sweep 8s linear infinite;
}

.beam i {
  position: absolute;
  left: calc(4 * var(--u));
  top: calc(-17 * var(--u));
  width: calc(104 * var(--u));
  height: calc(34 * var(--u));
  clip-path: polygon(0 42%, 100% 0, 100% 100%, 0 58%);
  background: linear-gradient(90deg, #ffe2b0, rgb(255 181 71 / 0.45) 30%, transparent 97%);
  transform-origin: calc(-4 * var(--u)) 50%; /* the lamp */
  transform: rotateX(76deg);
}

.beam i:nth-child(2) { transform: rotateX(104deg); }
.beam i:nth-child(3) { transform: rotateY(180deg) rotateX(76deg); }
.beam i:nth-child(4) { transform: rotateY(180deg) rotateX(104deg); }

@keyframes sweep {
  to { transform: rotateY(360deg); }
}

/* on the floor, rotate(-a) turns the same way as rotateY(a) above it */
@keyframes pool {
  to { transform: rotate(-360deg); }
}

@keyframes waves {
  to { transform: translateY(calc(20 * var(--u))); }
}

@keyframes waves-2 {
  to { transform: translateY(calc(28 * var(--u))); }
}

/* half a sweep: a beam faces you at about 114deg and 294deg of the turn */
@keyframes flash {
  0%, 45%, 82%, 100% { transform: translateY(calc(-109 * var(--u))) rotateX(90deg) scale(1); opacity: 0.7; }
  63.3% { transform: translateY(calc(-109 * var(--u))) rotateX(90deg) scale(2.2); opacity: 1; }
}`,
  },

  gauge: {
    how: [
      'The scale runs 240°: value 0 sits at <code>-120deg</code>, 100 at <code>+120deg</code>. So the needle is <code>rotate(calc(-120deg + var(--value) * 2.4deg))</code>, and JS only ever writes <code>--value</code>.',
      'The swing is a CSS <code>transition</code>. Its <code>cubic-bezier(0.3, 1.6, 0.45, 1)</code> goes above 1, so the needle shoots past the mark and settles back, like a real one.',
      'Depth comes from stacking: six copies of the disc step back 2.5 units each, getting darker, and read as a solid rim when tilted. The needle is four clip-path layers 1.3 units apart; the ticks are real bars lifted off the face, and a glass sheen floats 12 units in front.',
      'Every length of the dial is a multiple of one base unit, <code>--u</code>, so it is the same share of a gallery card, the editor and a recording canvas. The caption and the buttons under it are in plain <code>vmin</code>: the control zone is the same object, at the same size, in every model.',
      'The minor ticks are one <code>repeating-conic-gradient</code>, cut down by two masks intersected (<code>mask-composite: intersect</code>): a ring, and the 240° of the scale.',
    ],
    html: `<div class="gauge">
  <div class="view">
    <div class="dial" style="--value:${LEVELS[0][1]}">
      <i></i><i></i><i></i><i></i><i></i><i></i>
      <div class="face">
${lines(11, (i) => `<b style="--a:${-120 + i * 24}deg"></b>`, '        ')}
${lines(6, (i) => `<em style="--a:${-120 + i * 48}deg">${i * 20}</em>`, '        ')}
        <small>km/h</small>
      </div>
      <div class="needle"><div class="quiver"><i></i><i></i><i></i><i></i></div></div>
      <div class="hub"></div>
      <div class="glass"></div>
    </div>
  </div>
  <div class="controls">
    <output class="caption">${LEVELS[0][0]} · ${LEVELS[0][1]} km/h</output>
    <div class="row">
${lines(3, (i) => `<button type="button" data-value="${LEVELS[i][1]}" aria-pressed="${i === 0}">${LEVELS[i][0]}</button>`, '      ')}
    </div>
  </div>
</div>`,
    css: `/* the model box and the control zone stand in one stack, so the zone is the same distance
   under the dial in every model */
.gauge {
  /* one base unit: every length of the dial is a multiple of it. The control zone is in plain
     vmin, because it is the same object in every model. */
  --u: 0.3vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin;
  font-family: system-ui, sans-serif;
}

.gauge * {
  box-sizing: border-box;
}

/* the model box */
.view {
  display: grid;
  place-items: center;
  height: 50vmin;
  perspective: calc(800 * var(--u));
}

.dial {
  position: relative;
  width: calc(150 * var(--u));
  height: calc(150 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(32deg) rotateY(-14deg);
  animation: sway 10s ease-in-out infinite alternate;
}

/* the case: six discs stepping back, each darker; tilted, their edges read as a solid rim */
.dial > i {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: color-mix(in srgb, #4e4290, #05060c calc(var(--n) * 9%));
  transform: translateZ(calc(var(--n) * -2.5 * var(--u)));
}

.dial > i:nth-child(1) { --n: 1; }
.dial > i:nth-child(2) { --n: 2; }
.dial > i:nth-child(3) { --n: 3; }
.dial > i:nth-child(4) { --n: 4; }
.dial > i:nth-child(5) { --n: 5; }
.dial > i:nth-child(6) { --n: 6; }

.face {
  position: absolute;
  inset: 0;
  border: calc(6 * var(--u)) solid #b0a6ee;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #2e2b5e, ${SURFACE} 75%);
  box-shadow: inset 0 0 calc(18 * var(--u)) rgb(0 0 0 / 0.4);
  transform-style: preserve-3d;
}

/* the coloured zones: a conic gradient masked down to a thin arc */
.face::before {
  content: '';
  position: absolute;
  inset: calc(3 * var(--u));
  border-radius: 50%;
  background: conic-gradient(from -120deg, ${TEAL}, ${AMBER} 150deg, ${PINK} 210deg 240deg, transparent 0);
  mask: radial-gradient(closest-side, transparent calc(100% - calc(5 * var(--u))), #000 calc(100% - calc(4.5 * var(--u))));
}

/* minor ticks every 4.8deg, masked to a ring AND to the 240deg of the scale */
.face::after {
  content: '';
  position: absolute;
  inset: calc(12 * var(--u));
  border-radius: 50%;
  background: repeating-conic-gradient(from -120.5deg, rgb(236 238 251 / 0.55) 0 1deg, transparent 1deg 4.8deg);
  mask:
    radial-gradient(closest-side, transparent calc(100% - calc(5 * var(--u))), #000 calc(100% - calc(4.5 * var(--u)))),
    conic-gradient(from -121deg, #000 0 242deg, transparent 0);
  mask-composite: intersect;
}

/* major ticks: real bars, lifted off the face */
.face b {
  position: absolute;
  left: calc(50% - calc(1.5 * var(--u)));
  top: calc(50% - calc(5 * var(--u)));
  width: calc(3 * var(--u));
  height: calc(10 * var(--u));
  border-radius: calc(1 * var(--u));
  background: ${TEXT};
  transform: translateZ(calc(2 * var(--u))) rotate(var(--a)) translateY(calc(-50 * var(--u)));
}

/* numbers: out along the angle, then turned back upright */
.face em {
  position: absolute;
  left: calc(50% - calc(14 * var(--u)));
  top: calc(50% - calc(7 * var(--u)));
  width: calc(28 * var(--u));
  color: ${MUTED};
  font: 700 calc(11 * var(--u))/calc(14 * var(--u)) system-ui, sans-serif;
  font-style: normal;
  text-align: center;
  transform: translateZ(calc(1 * var(--u))) rotate(var(--a)) translateY(calc(-33 * var(--u))) rotate(calc(var(--a) * -1));
}

.face small {
  position: absolute;
  inset: auto 0 calc(20 * var(--u));
  color: ${MUTED};
  font: 800 calc(9 * var(--u)) system-ui, sans-serif;
  letter-spacing: 0.12em;
  text-align: center;
  text-transform: uppercase;
  transform: translateZ(calc(1 * var(--u)));
}

/* JS writes --value; this turns it into an angle, the transition does the swing */
.needle {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-style: preserve-3d;
  transform: rotate(calc(-120deg + var(--value) * 2.4deg));
  transition: transform 1.3s cubic-bezier(0.3, 1.6, 0.45, 1); /* > 1: overshoot */
}

.quiver {
  position: absolute;
  transform-style: preserve-3d;
  animation: quiver 1.7s ease-in-out infinite alternate;
}

/* the needle: four layers of one shape, calc(1.3 * var(--u)) apart, lightest on top */
.quiver i {
  position: absolute;
  left: calc(-4 * var(--u));
  top: calc(-58 * var(--u));
  width: calc(8 * var(--u));
  height: calc(72 * var(--u));
  clip-path: polygon(50% 0, 76% 80%, 62% 100%, 38% 100%, 24% 80%);
  background: #852852;
  transform: translateZ(calc(3.3 * var(--u)));
}

.quiver i:nth-child(2) { background: #ad346b; transform: translateZ(calc(4.6 * var(--u))); }
.quiver i:nth-child(3) { background: #d64184; transform: translateZ(calc(5.9 * var(--u))); }
.quiver i:nth-child(4) { background: linear-gradient(90deg, #ff9dc9 50%, ${PINK} 50%); transform: translateZ(calc(7.2 * var(--u))); }

.hub {
  position: absolute;
  left: calc(50% - calc(11 * var(--u)));
  top: calc(50% - calc(11 * var(--u)));
  width: calc(22 * var(--u));
  height: calc(22 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff 0 8%, #b9bed8 32%, #474c6b 78%);
  box-shadow: 0 0 0 calc(2 * var(--u)) ${PINK};
  transform: translateZ(calc(9 * var(--u)));
}

.glass {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(150deg, rgb(255 255 255 / 0.2), rgb(255 255 255 / 0.04) 44%, transparent 45%);
  pointer-events: none;
  transform: translateZ(calc(12 * var(--u)));
}

/* the control zone: the same object, at the same size, in every model that has one. The
   caption's line box never changes height, so a new reading cannot move the dial. */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}

.controls .caption {
  font: 500 4.5vmin/1.2 system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}

.controls .row {
  display: flex;
  gap: 2vmin;
}

.controls button,
.controls label {
  height: 8vmin;
  min-width: 8vmin;
  padding: 0 3vmin;
  border: 0;
  border-radius: 999px;
  /* see-through, so the pill sits on the stage, and its word is the stage's own ink at full
     strength: no colour of the model's, which would vanish on one of the two stages */
  background: rgb(140 150 220 / 0.2);
  color: inherit;
  font: 600 4vmin system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.35s;
}

.controls button:hover,
.controls label:hover {
  background-color: rgb(140 150 220 / 0.34);
}

.controls :focus-visible {
  outline: 0.6vmin solid #6a45f5;
  outline-offset: 0.6vmin;
}

/* the selected pill: the brand gradient, deep enough that white text on it passes */
.controls [aria-pressed='true'] {
  background: linear-gradient(135deg, #6a45f5, #d1206f);
  color: #fff;
}

@keyframes sway {
  from { transform: rotateX(32deg) rotateY(-16deg); }
  to   { transform: rotateX(28deg) rotateY(10deg); }
}

@keyframes quiver {
  from { transform: rotate(-1deg); }
  to   { transform: rotate(1deg); }
}`,
    js: `const dial = document.querySelector('.dial');
const out = document.querySelector('.controls output');
const buttons = document.querySelectorAll('.controls button');

buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    // only a number goes to CSS; the angle and the swing are CSS
    dial.style.setProperty('--value', btn.dataset.value);
    out.textContent = btn.textContent + ' · ' + btn.dataset.value + ' km/h';
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });
});`,
  },

  timeline: {
    how: [
      'Every card stands one step further back: <code>translateZ(calc(var(--i) * -110 * var(--u)))</code>, alternating sides of the road with <code>--s</code> = -1 / 1 and turned a little toward it.',
      'JS sets one number, <code>--a</code> (the active card), on the view. The track of cards moves toward you by <code>--a</code> steps, which puts card <code>--a</code> at z = 0: moving the world is moving the camera. A transition does the drive.',
      'Each card works out its own <code>--d = --i − --a</code>. Opacity is <code>clamp(0, min(1 − d·0.2, 1 + d·4), 1)</code>: 1 at the front, fading with distance, 0 as soon as a card is passed. Passed cards also get <code>min(d + 1, 0)</code> extra steps back, so nothing ever gets closer than one step to the camera.',
      'The road does not travel (its near end would run into the camera). Only its lane of dashes and markers slides. The dash period (22 units) divides the step (110), so at every stop the road looks the same. The marker under the active card lights up with <code>opacity: 1 − min(|d|, 1)</code>, written with <code>max(d, -d)</code>.',
      'The camera sits high above (<code>perspective-origin: 50% -80 units</code>), so cards further away climb up the view instead of hiding behind the ones in front.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the road is the same share of a gallery card, the editor and a recording canvas. JS writes only <code>--a</code>, a plain number; the caption and the buttons under the road are in plain <code>vmin</code>, the same control zone as every other model’s.',
    ],
    html: `<div class="timeline">
  <div class="view">
  <div class="scene" style="--a:0">
    <div class="road">
      <div class="lane">
${lines(EVENTS.length, (i) => `<u style="--i:${i}"></u>`, '        ')}
      </div>
    </div>
    <div class="track">
${lines(EVENTS.length, (i) => `<div class="card" style="--i:${i};--s:${i % 2 ? 1 : -1}" aria-current="${i === 0}"><b>${EVENTS[i][0]}</b><span>${EVENTS[i][1]}</span></div>`)}
    </div>
  </div>
  </div>
  <div class="controls">
    <output class="caption">${EVENTS[0][0]} · ${EVENTS[0][1]}</output>
    <div class="row">
      <button type="button" data-step="-1" disabled>‹ Prev</button>
      <button type="button" data-step="1">Next ›</button>
    </div>
  </div>
</div>`,
    css: `/* the model box and the control zone stand in one stack, so the zone is the same distance
   under the road in every model */
.timeline {
  /* one base unit: every length of the road and the cards is a multiple of it. The control
     zone is in plain vmin, because it is the same object in every model. */
  --u: 0.24vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin;
  font-family: system-ui, sans-serif;
}

/* the model box */
.view {
  display: grid;
  place-items: center;
  height: 50vmin;
}

.timeline * {
  box-sizing: border-box;
}

/* the camera: close, and high above the road */
.scene {
  position: relative;
  width: calc(340 * var(--u));
  height: calc(200 * var(--u));
  perspective: calc(560 * var(--u));
  perspective-origin: 50% calc(-80 * var(--u));
}

.track {
  position: absolute;
  left: 50%;
  top: 62%;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--a) * 110 * var(--u))); /* the drive */
  transition: transform 0.9s cubic-bezier(0.45, 0.05, 0.25, 1);
}

/* the road: stood on its near edge, laid back flat; it stays put */
.road {
  position: absolute;
  left: calc(50% - calc(34 * var(--u)));
  top: calc(62% - calc(684 * var(--u))); /* its near edge 36 units below the cards' centre */
  width: calc(68 * var(--u));
  height: calc(720 * var(--u)); /* it has faded out by its far end, so it stops there */
  overflow: hidden;
  background:
    linear-gradient(90deg, transparent calc(3 * var(--u)), ${VIOLET} calc(3 * var(--u)) calc(5 * var(--u)), transparent calc(5 * var(--u)) calc(100% - calc(5 * var(--u))), ${VIOLET} calc(100% - calc(5 * var(--u))) calc(100% - calc(3 * var(--u))), transparent 0),
    #272551;
  mask: linear-gradient(to top, transparent, #000 8.75%, #000 50%, transparent);
  transform-origin: 50% 100%;
  transform: translateZ(calc(64 * var(--u))) rotateX(90deg);
}

/* dashes and markers: longer than the road by the whole trip; they slide, the road does not */
.lane {
  position: absolute;
  inset: calc(-440 * var(--u)) 0 0;
  background: linear-gradient(rgb(255 181 71 / 0.8) 50%, transparent 0) 50% 100% / calc(3 * var(--u)) calc(22 * var(--u)) repeat-y;
  transform: translateY(calc(var(--a) * 110 * var(--u)));
  transition: transform 0.9s cubic-bezier(0.45, 0.05, 0.25, 1);
}

.lane u {
  --d: calc(var(--i) - var(--a));
  position: absolute;
  left: calc(50% - calc(7 * var(--u)));
  bottom: calc(calc(57 * var(--u)) + var(--i) * 110 * var(--u));
  width: calc(14 * var(--u));
  height: calc(14 * var(--u));
  border: calc(2 * var(--u)) solid ${TEAL};
  border-radius: 50%;
  background: ${SURFACE};
}

/* lit only where d = 0: 1 - min(|d|, 1) */
.lane u::after {
  content: '';
  position: absolute;
  inset: calc(1 * var(--u));
  border-radius: 50%;
  background: ${TEAL};
  box-shadow: 0 0 calc(8 * var(--u)) ${TEAL};
  opacity: calc(1 - min(max(var(--d), var(--d) * -1), 1));
  transition: opacity 0.5s;
}

.card {
  --d: calc(var(--i) - var(--a)); /* steps from the active card */
  position: absolute;
  left: calc(-50 * var(--u));
  top: calc(-52 * var(--u));
  display: grid;
  align-content: center;
  gap: calc(2 * var(--u));
  width: calc(100 * var(--u));
  height: calc(56 * var(--u));
  padding: 0 calc(12 * var(--u));
  border: calc(1 * var(--u)) solid rgb(140 150 220 / 0.34);
  border-radius: calc(10 * var(--u));
  background: linear-gradient(160deg, #3d3576, #202045);
  color: ${TEXT};
  backface-visibility: hidden;
  /* 1 in front, fainter further back, 0 once passed */
  opacity: clamp(0, min(1 - var(--d) * 0.2, 1 + var(--d) * 4), 1);
  /* beside the road, one step back per index; passed cards held one step ahead of the camera */
  transform:
    translate3d(calc(var(--s) * 62 * var(--u)), 0, calc((var(--i) * -1 + min(var(--d) + 1, 0)) * 110 * var(--u)))
    rotateY(calc(var(--s) * -16deg));
  transition: opacity 0.6s, transform 0.9s cubic-bezier(0.45, 0.05, 0.25, 1), border-color 0.4s;
}

.card b {
  font-size: calc(20 * var(--u));
  font-weight: 900;
  line-height: 1;
}

.card span {
  color: ${MUTED};
  font-size: calc(12 * var(--u));
  font-weight: 700;
  white-space: nowrap;
}

/* the post down to the road */
.card::before {
  content: '';
  position: absolute;
  left: calc(50% - calc(1 * var(--u)));
  top: 100%;
  width: calc(2 * var(--u));
  height: calc(32 * var(--u));
  background: linear-gradient(rgb(140 150 220 / 0.34), rgb(139 108 255 / 0.6));
}

.card[aria-current='true'] {
  border-color: ${TEAL};
}

.card[aria-current='true'] b {
  color: ${TEAL};
}

/* the control zone: the same object, at the same size, in every model that has one. The
   caption's line box never changes height, so a new event cannot move the road. */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}

.controls .caption {
  font: 500 4.5vmin/1.2 system-ui, sans-serif;
  opacity: 0.7;
}

.controls .row {
  display: flex;
  gap: 2vmin;
}

.controls button,
.controls label {
  height: 8vmin;
  min-width: 8vmin;
  padding: 0 3vmin;
  border: 0;
  border-radius: 999px;
  /* see-through, so the pill sits on the stage, and its word is the stage's own ink at full
     strength: no colour of the model's, which would vanish on one of the two stages */
  background: rgb(140 150 220 / 0.2);
  color: inherit;
  font: 600 4vmin system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.35s;
}

.controls button:hover,
.controls label:hover {
  background-color: rgb(140 150 220 / 0.34);
}

.controls :focus-visible {
  outline: 0.6vmin solid #6a45f5;
  outline-offset: 0.6vmin;
}

/* the selected pill: the brand gradient, deep enough that white text on it passes */
.controls [aria-pressed='true'] {
  background: linear-gradient(135deg, #6a45f5, #d1206f);
  color: #fff;
}

/* Next is the way on, so it wears the selected pill's gradient */
.controls button:last-child:not(:disabled) {
  background: linear-gradient(135deg, #6a45f5, #d1206f);
  color: #fff;
}

.controls button:disabled {
  opacity: 0.4;
  cursor: default;
}`,
    js: `const scene = document.querySelector('.timeline .scene');
const cards = document.querySelectorAll('.card');
const out = document.querySelector('.controls output');
const [prev, next] = document.querySelectorAll('.controls button');
let active = 0;

function go(step) {
  active = Math.min(cards.length - 1, Math.max(0, active + step));
  // one number moves the camera; CSS works out every card's depth and fade from it
  scene.style.setProperty('--a', active);
  cards.forEach((c, i) => c.setAttribute('aria-current', String(i === active)));
  const card = cards[active];
  out.textContent = card.querySelector('b').textContent + ' · ' + card.querySelector('span').textContent;
  prev.disabled = active === 0;
  next.disabled = active === cards.length - 1;
}

prev.addEventListener('click', () => go(-1));
next.addEventListener('click', () => go(1));`,
  },
};
