import type { Snippet } from './snippet-utils';

/** n lines of markup, one per index, indented. */
const lines = (n: number, fn: (i: number) => string, indent = '    '): string =>
  Array.from({ length: n }, (_, i) => indent + fn(i)).join('\n');

const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';

// hourglass: glass colour runs teal → violet → teal round the ring (same as the demo)
const glassMix = (i: number): string => `${Math.round((Math.abs(i - 6) / 6) * 100)}%`;

// crystal: the same five prisms as the demo
const CRYSTALS = [
  { az: 0, off: 0, tilt: 0, w: 22, h: 86, c: VIOLET, c2: PINK, d: 0 },
  { az: 30, off: 16, tilt: 30, w: 15, h: 60, c: TEAL, c2: VIOLET, d: -1.2 },
  { az: 115, off: 14, tilt: 26, w: 14, h: 50, c: PINK, c2: VIOLET, d: -2.4 },
  { az: 205, off: 16, tilt: 34, w: 16, h: 66, c: VIOLET, c2: TEAL, d: -0.6 },
  { az: 290, off: 14, tilt: 30, w: 12, h: 40, c: TEAL, c2: PINK, d: -3 },
];

// lattice: the 9 (x, z) spots of one layer, row by row
const SPOTS = Array.from({ length: 9 }, (_, i) => ({ x: (i % 3) - 1, z: Math.floor(i / 3) - 1 }));
const latticeLayer = (y: number): string => `    <div class="layer${y === 0 ? ' mid' : ''}" style="--y:${y}">
${lines(3, (k) => `<i style="--z:${k - 1}"></i>`, '      ')}
${lines(3, (k) => `<i class="z" style="--x:${k - 1}"></i>`, '      ')}
${SPOTS.map((s) => `      <b style="--x:${s.x}; --z:${s.z}"></b>`).join('\n')}
    </div>`;

// the face of a triangle: its two slanted edges and the bottom edge are painted, because
// clip-path cuts borders away
const TRIANGLE_BG = `background:
    linear-gradient(to top left, transparent calc(50% - 1.5 * var(--u)), var(--edge) calc(50% - 1.5 * var(--u)) 50%, transparent 50%) left / 50% 100% no-repeat,
    linear-gradient(to top right, transparent calc(50% - 1.5 * var(--u)), var(--edge) calc(50% - 1.5 * var(--u)) 50%, transparent 50%) right / 50% 100% no-repeat,
    linear-gradient(var(--edge), var(--edge)) bottom / 100% calc(1.5 * var(--u)) no-repeat,
    linear-gradient(90deg, transparent 42%, rgb(255 255 255 / 0.16) 50%, transparent 58%),
    linear-gradient(to top, rgb(var(--c) / var(--alpha)), rgb(var(--c) / 0.08));`;

/** Copy-paste versions of batch F (more solids built from flat faces): plain HTML + CSS, no Sass. */
export const snippetsF: Record<string, Snippet> = {
  tetra: {
    how: [
      'A regular tetrahedron is four equilateral triangles. Each face is a box <code>a</code> wide and <code>a × √3 / 2</code> tall, cut with <code>clip-path: polygon(50% 0, 0 100%, 100% 100%)</code>.',
      'Stand three of them on the edges of the floor triangle, like carousel panels: <code>rotateY(i × 120deg) translateZ(r)</code>, where <code>r = a / (2√3)</code> is the distance from the floor\'s centre to the middle of an edge.',
      'Hinge each on its bottom edge and lean it in. The faces of a tetrahedron meet the floor at <code>atan(2√2) ≈ 70.53°</code>, so an upright face leans the other <b>19.47°</b>, and the three tips meet exactly above the centre. The floor is the same triangle leaned all the way, 90°, so its tip lands on the back corner.',
      'Tumble it round its <b>centroid</b>, a quarter of the height up from the floor (<code>transform-origin</code>), not round the box centre, or it wobbles as it turns.',
      'The core undoes the tumble: the same three turns backwards and in reverse order, on the same timing. So it always faces you and stays a round glow.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the tetrahedron is the same share of a gallery card, the editor and a recording canvas. The numbers above are those units.',
    ],
    html: `<div class="scene">
  <div class="tetra">
${lines(3, (i) => `<i style="--i:${i}"></i>`)}
    <b></b>
    <u></u>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the tetrahedron is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.4vmin;
  perspective: calc(800 * var(--u));
}

.tetra {
  --a: calc(140 * var(--u));    /* edge length */
  --r: calc(40.41 * var(--u));  /* floor inradius = a / (2√3) */
  position: relative;
  width: var(--a);
  height: calc(121.24 * var(--u));              /* face height = a × √3 / 2 */
  transform-style: preserve-3d;
  transform-origin: 50% calc(92.66 * var(--u)); /* the centroid: it stands a·√(2/3) = 114.31 units tall, a quarter of that up */
  /* it turns round the centroid, 32 units below the middle of its box, so the box is lifted by
     that much to put the centroid, and so the whole tumble, in the middle of the canvas */
  translate: 0 calc(-32.05 * var(--u));
  animation: tumble 16s linear infinite;
}

.tetra i,
.tetra b {
  --c: 46 230 214;
  --alpha: 0.34;
  --edge: rgb(var(--c) / 0.95);
  position: absolute;
  inset: 0;
  transform-origin: 50% 100%; /* the hinge: the bottom edge, on the floor */
  clip-path: polygon(50% 0, 0 100%, 100% 100%);
  /* borders are clipped away, so the edges are painted: a "to corner" gradient's 50% line is its box diagonal */
  ${TRIANGLE_BG}
}

/* the sides: 120deg apart, out to an edge, leaned in by 90deg - atan(2√2) = 19.47deg */
.tetra i {
  transform: rotateY(calc(var(--i) * 120deg)) translateZ(var(--r)) rotateX(19.47deg);
}

.tetra i:nth-child(2) { --c: 139 108 255; --alpha: 0.44; }
.tetra i:nth-child(3) { --c: 255 77 157;  --alpha: 0.3; }

/* the floor: the same triangle on the front edge, folded flat */
.tetra b {
  --c: 139 108 255;
  --alpha: 0.26;
  transform: translateZ(var(--r)) rotateX(90deg);
}

/* the core sits on the centroid */
.tetra u {
  position: absolute;
  top: calc(92.66 * var(--u));
  left: 50%;
  width: calc(40 * var(--u));
  height: calc(40 * var(--u));
  margin: calc(-20 * var(--u)) 0 0 calc(-20 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 8%, #ffcb7e 22%, rgb(255 181 71 / 0.55) 42%, transparent 70%);
  animation: face-you 16s linear infinite, pulse 2.4s ease-in-out infinite alternate;
}

/* -24deg + 360deg = 336deg: the end pose equals the start pose */
@keyframes tumble {
  from { transform: rotateX(-24deg) rotateY(0deg) rotateZ(0deg); }
  to   { transform: rotateX(336deg) rotateY(360deg) rotateZ(360deg); }
}

/* the exact inverse of the tumble: the same turns backwards, in reverse order */
@keyframes face-you {
  from { transform: rotateZ(0deg) rotateY(0deg) rotateX(24deg); }
  to   { transform: rotateZ(-360deg) rotateY(-360deg) rotateX(-336deg); }
}

@keyframes pulse {
  from { opacity: 0.7; scale: 0.85; }
  to   { opacity: 1; scale: 1.1; }
}`,
  },

  hourglass: {
    how: [
      'Each bulb is 12 trapezoid strips hinged on the tiny neck and leaning out by <code>atan((R − r) / H)</code>, like a cone with its tip cut off. <code>--s: -1</code> flips a strip upward with <code>scaleY(-1)</code> and reverses its lean, so one rule builds both bulbs.',
      'The sand is one 8-sided cone, the <b>same shape</b> in both bulbs. On top it hangs tip-down on the neck and shrinks toward that tip (<code>scale3d</code> with <code>transform-origin</code> on the tip), so its surface sinks and it keeps touching the glass. Below, the same cone grows from its footprint on the plate.',
      'Volume goes with the cube of the size, so for a steady flow the scale follows a cube root: 1 → 0.79 at half time → 0. A few keyframes approximate the curve.',
      'The seamless trick: after the flip by 180°, the full pile is on top and looks exactly like the starting sand, just hanging 7.56 units higher. So the loop restarts at 0°, and the first thing the sand does is slide down onto the neck.',
      'The falling stream is a dashed line that scrolls down; it turns back against the spin so it never goes edge-on. The posts are two crossed planes each, so they have width from every side.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the hourglass is the same share of a gallery card, the editor and a recording canvas. The numbers above are those units.',
    ],
    html: `<div class="scene">
  <div class="hourglass">
    <div class="flip">
${lines(24, (i) => `<i style="--i:${i % 12}; --s:${i < 12 ? 1 : -1}; --mix:${glassMix(i % 12)}"></i>`, '      ')}
      <b style="--y:calc(-76 * var(--u))"></b>
      <b style="--y:calc(-69 * var(--u))"></b>
      <b style="--y:calc(69 * var(--u))"></b>
      <b style="--y:calc(76 * var(--u))"></b>
${lines(3, (i) => `<span class="post" style="--i:${i}"></span>`, '      ')}
      <div class="sand top">
${lines(8, (i) => `<i style="--i:${i}"></i>`, '        ')}
        <b></b>
      </div>
      <div class="sand bottom">
${lines(8, (i) => `<i style="--i:${i}"></i>`, '        ')}
        <b></b>
      </div>
      <s class="stream"></s>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the hourglass is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.34vmin;
  perspective: calc(800 * var(--u));
}

.hourglass {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: spin 20s linear infinite;
}

/* everything turns over together; the neck is at (0, 0) */
.flip {
  position: absolute;
  transform-style: preserve-3d;
  animation: flip 9s infinite;
}

/* glass: 12 strips per bulb. Bulb height 66 units, apothem 44 units at the plate, 3 units at the neck:
   strip width 2 × 44 × tan(15deg) = 23.58 units, slant √(66² + 41²) = 77.7 units, lean atan(41 / 66) = 31.85deg */
.flip > i {
  --c: color-mix(in srgb, ${VIOLET} var(--mix), ${TEAL});
  --edge: color-mix(in srgb, var(--c) 55%, transparent);
  position: absolute;
  top: 0;
  left: calc(-11.79 * var(--u));
  width: calc(23.58 * var(--u));
  height: calc(77.7 * var(--u));
  transform-origin: 50% 0; /* hinged on the neck */
  transform: rotateY(calc(var(--i) * 30deg)) translateZ(calc(3 * var(--u))) rotateX(calc(var(--s) * 31.85deg)) scaleY(var(--s));
  clip-path: polygon(46.59% 0, 53.41% 0, 100% 100%, 0 100%); /* 1.61 units wide at the neck */
  background:
    linear-gradient(to top left, transparent calc(50% - 1 * var(--u)), var(--edge) calc(50% - 1 * var(--u)) 50%, transparent 50%) left / 46.59% 100% no-repeat,
    linear-gradient(to top right, transparent calc(50% - 1 * var(--u)), var(--edge) calc(50% - 1 * var(--u)) 50%, transparent 50%) right / 46.59% 100% no-repeat,
    linear-gradient(color-mix(in srgb, var(--c) 44%, transparent), color-mix(in srgb, var(--c) 14%, transparent) 50%, color-mix(in srgb, var(--c) 30%, transparent));
}

/* plates: two discs at each end give them thickness */
.flip > b {
  position: absolute;
  top: calc(-55 * var(--u));
  left: calc(-55 * var(--u));
  width: calc(110 * var(--u));
  height: calc(110 * var(--u));
  /* the rim is an inner line plus a soft shade, not a border: in the flip the discs pass
     edge-on, where a 1.5 units line breaks up; the shade survives */
  box-shadow: inset 0 0 0 calc(1.5 * var(--u)) #a289ff, inset 0 0 calc(8 * var(--u)) rgb(162 137 255 / 0.35);
  border-radius: 50%;
  background: radial-gradient(circle, #41387f, #6753c1);
  transform: translateY(var(--y)) rotateX(90deg);
}

/* posts: two crossed planes each */
.post {
  position: absolute;
  top: calc(-76 * var(--u));
  left: calc(-2.5 * var(--u));
  width: calc(5 * var(--u));
  height: calc(152 * var(--u));
  transform-style: preserve-3d;
  transform: rotateY(calc(var(--i) * 120deg + 60deg)) translateZ(calc(49 * var(--u)));
}

.post::before,
.post::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: calc(3 * var(--u));
  background: linear-gradient(90deg, #6f56cc, #b9a7ff, #6f56cc);
}

.post::after {
  transform: rotateY(90deg);
}

/* sand: an 8-sided cone 55.44 units tall, base apothem 30.73 units, tip at the top of its box.
   Strip width 2 × 30.73 × tan(22.5deg) = 25.46 units, slant 63.39 units, lean atan(30.73 / 55.44) = 29deg */
.sand {
  position: absolute;
  left: calc(-30.73 * var(--u));
  width: calc(61.46 * var(--u));
  height: calc(55.44 * var(--u));
  transform-style: preserve-3d;
}

.sand i {
  position: absolute;
  bottom: 0;
  left: calc(50% - 12.73 * var(--u));
  width: calc(25.46 * var(--u));
  height: calc(63.39 * var(--u));
  transform-origin: 50% 100%;
  transform: rotateY(calc(var(--i) * 45deg)) translateZ(calc(30.73 * var(--u))) rotateX(29deg);
  clip-path: polygon(50% 0, 0 100%, 100% 100%);
  background: linear-gradient(to top, #ffa851, #ffcb7e);
}

.sand i:nth-child(odd) {
  background: linear-gradient(to top, #d18a41, #ffb547);
}

/* the flat face, 1.5 units inside the cone so it never touches the strips */
.sand b {
  position: absolute;
  top: calc(100% - 32.23 * var(--u));
  left: 0;
  width: calc(61.46 * var(--u));
  height: calc(61.46 * var(--u));
  clip-path: polygon(29.29% 0, 70.71% 0, 100% 29.29%, 100% 70.71%, 70.71% 100%, 29.29% 100%, 0 70.71%, 0 29.29%);
  background: radial-gradient(circle, #ffd391, #ffa851);
  transform: rotateX(90deg) scale(0.95);
}

/* top bulb: tip-down on the neck, shrinking toward that tip */
.sand.top {
  top: 0;
  transform-origin: 50% 0;
  animation: drain 9s infinite;
}

/* bottom bulb: a pile 3 units above the plate, growing from its footprint */
.sand.bottom {
  top: calc(7.56 * var(--u));
  transform-origin: 50% 100%;
  animation: fill 9s infinite;
}

.stream {
  position: absolute;
  top: 0;
  left: calc(-1.5 * var(--u));
  width: calc(3 * var(--u));
  height: calc(66 * var(--u));
  overflow: hidden;
  opacity: 0;
  animation: stream 9s linear infinite, face-you 20s linear infinite;
}

.stream::before {
  content: '';
  position: absolute;
  inset: calc(-14 * var(--u)) 0 0;
  background: repeating-linear-gradient(#ffcb7e 0 calc(4 * var(--u)), transparent calc(4 * var(--u)) calc(7 * var(--u)));
  animation: fall 0.35s linear infinite;
}

@keyframes spin {
  from { transform: rotateX(-16deg) rotateY(0deg); }
  to   { transform: rotateX(-16deg) rotateY(360deg); }
}

@keyframes face-you {
  to { transform: rotateY(-360deg); }
}

/* half a turn over, it looks exactly like the start: the jump back to 0deg is invisible */
@keyframes flip {
  0%, 84% { transform: rotateZ(0deg); animation-timing-function: ease-in-out; }
  100%    { transform: rotateZ(180deg); }
}

/* scale = cube root of what is left, so the flow looks steady */
@keyframes drain {
  0%    { transform: translateY(calc(-7.56 * var(--u))) rotateZ(180deg) scale3d(1, 1, 1); animation-timing-function: ease-in; }
  8%    { transform: translateY(0) rotateZ(180deg) scale3d(1, 1, 1); animation-timing-function: linear; }
  15%   { transform: translateY(0) rotateZ(180deg) scale3d(0.965, 0.965, 0.965); animation-timing-function: linear; }
  25.5% { transform: translateY(0) rotateZ(180deg) scale3d(0.909, 0.909, 0.909); animation-timing-function: linear; }
  43%   { transform: translateY(0) rotateZ(180deg) scale3d(0.794, 0.794, 0.794); animation-timing-function: linear; }
  60.5% { transform: translateY(0) rotateZ(180deg) scale3d(0.63, 0.63, 0.63); animation-timing-function: linear; }
  71%   { transform: translateY(0) rotateZ(180deg) scale3d(0.464, 0.464, 0.464); animation-timing-function: linear; }
  78%, 100% { transform: translateY(0) rotateZ(180deg) scale3d(0.01, 0.01, 0.01); }
}

@keyframes fill {
  0%, 8% { transform: scale3d(0.01, 0.01, 0.01); animation-timing-function: linear; }
  15%    { transform: scale3d(0.464, 0.464, 0.464); animation-timing-function: linear; }
  25.5%  { transform: scale3d(0.63, 0.63, 0.63); animation-timing-function: linear; }
  43%    { transform: scale3d(0.794, 0.794, 0.794); animation-timing-function: linear; }
  60.5%  { transform: scale3d(0.909, 0.909, 0.909); animation-timing-function: linear; }
  71%    { transform: scale3d(0.965, 0.965, 0.965); animation-timing-function: linear; }
  78%, 100% { transform: scale3d(1, 1, 1); }
}

@keyframes stream {
  0%, 8%, 80%, 100% { opacity: 0; }
  10%, 77% { opacity: 1; }
}

@keyframes fall {
  to { transform: translateY(calc(14 * var(--u))); }
}`,
  },

  crystal: {
    how: [
      'Every crystal is a hexagonal prism: six panels <code>--w</code> wide in a closed ring, <code>rotateY(i × 60deg) translateZ(w × 0.866)</code>. 0.866 is √3 / 2, the apothem of a hexagon with side <code>w</code>.',
      'The pointed tip needs no extra elements: each panel carries its own facet as a <code>::before</code>. The panel gets <code>transform-style: preserve-3d</code>, so the triangle can fold in along the panel\'s top edge by 40°. Its height, apothem / sin(40°) = <code>1.347 × w</code>, makes the six points meet on the axis.',
      'A crystal leans by walking its transforms: stand on the floor, <code>rotateY</code> to face its direction, <code>translateZ</code> out from the centre, then <code>rotateX</code> to lean outward. The same four numbers in a style attribute place all five.',
      'The inner glow is two crossed planes of radial gradient, so it has body from every side. Its opacity breathes on a pseudo-element: on the element itself, <code>opacity</code> would flatten its 3D children.',
    ],
    html: `<div class="scene">
  <div class="cluster">
    <b class="rock"></b>
${CRYSTALS.map(
  (c) => `    <div class="crystal" style="--az:${c.az}deg; --off:${c.off}px; --tilt:${c.tilt}deg; --w:${c.w}px; --h:${c.h}px; --c:${c.c}; --c2:${c.c2}; --d:${c.d}s">
${lines(6, (i) => `<i style="--i:${i}"></i>`, '      ')}
      <b></b>
    </div>`,
).join('\n')}
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.cluster {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: spin 30s linear infinite;
}

/* stand on the floor (44px down), face a direction, step out, lean outward */
.crystal {
  position: absolute;
  transform-style: preserve-3d;
  transform: translateY(44px) rotateY(var(--az)) translateZ(var(--off)) rotateX(calc(var(--tilt) * -1));
}

/* six side panels in a closed ring */
.crystal i {
  position: absolute;
  top: calc(var(--h) * -1);
  left: calc(var(--w) / -2);
  width: var(--w);
  height: var(--h);
  transform-style: preserve-3d; /* lets the tip fold in 3D */
  transform: rotateY(calc(var(--i) * 60deg)) translateZ(calc(var(--w) * 0.866));
  background:
    linear-gradient(90deg, transparent 30%, rgb(255 255 255 / 0.2) 42%, transparent 54%),
    linear-gradient(to top, color-mix(in srgb, var(--c) 62%, transparent), color-mix(in srgb, var(--c) 14%, transparent) 70%, color-mix(in srgb, var(--c) 28%, transparent));
  box-shadow:
    inset 1px 0 color-mix(in srgb, var(--c) 80%, transparent),
    inset -1px 0 color-mix(in srgb, var(--c) 80%, transparent),
    inset 0 1px color-mix(in srgb, var(--c) 85%, #fff);
}

.crystal i:nth-child(even) {
  --c: var(--c2);
}

/* the tip facet: hinged on the panel's top edge, folded in by 40deg */
.crystal i::before {
  --edge: color-mix(in srgb, var(--c) 85%, #fff);
  content: '';
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 100%;
  height: calc(var(--w) * 1.347); /* apothem / sin(40deg) */
  transform-origin: 50% 100%;
  transform: rotateX(40deg);
  clip-path: polygon(50% 0, 0 100%, 100% 100%);
  background:
    linear-gradient(to top left, transparent calc(50% - 1px), var(--edge) calc(50% - 1px) 50%, transparent 50%) left / 50% 100% no-repeat,
    linear-gradient(to top right, transparent calc(50% - 1px), var(--edge) calc(50% - 1px) 50%, transparent 50%) right / 50% 100% no-repeat,
    linear-gradient(color-mix(in srgb, var(--c) 20%, #fff 30%), color-mix(in srgb, var(--c) 40%, transparent));
}

/* the inner glow: two crossed planes */
.crystal b {
  position: absolute;
  top: calc(var(--h) * -1);
  left: calc(var(--w) * -0.8);
  width: calc(var(--w) * 1.6);
  height: var(--h);
  transform-style: preserve-3d;
}

.crystal b::before,
.crystal b::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(50% 60% at 50% 72%, color-mix(in srgb, #fff 60%, var(--c)), color-mix(in srgb, var(--c) 45%, transparent) 40%, transparent);
  animation: glow 3.6s ease-in-out var(--d) infinite alternate;
}

.crystal b::after {
  transform: rotateY(90deg);
}

/* the rock: an uneven slab laid flat */
.rock {
  position: absolute;
  top: -24px;
  left: -68px;
  width: 136px;
  height: 136px;
  clip-path: polygon(22% 4%, 62% 0, 92% 18%, 100% 55%, 84% 90%, 46% 100%, 12% 86%, 0 48%);
  background: radial-gradient(circle, #ae98ff 0 6%, #4a3e8d 24%, #2e2a5d 60%, #3c3576);
  transform: translateY(1px) rotateX(90deg);
}

@keyframes spin {
  from { transform: rotateX(-22deg) rotateY(0deg); }
  to   { transform: rotateX(-22deg) rotateY(360deg); }
}

@keyframes glow {
  from { opacity: 0.35; }
  to   { opacity: 1; }
}`,
  },

  lattice: {
    how: [
      'A single flat bar vanishes whenever you see it edge-on, so every bar is <b>two crossed planes</b>: the element and its <code>::after</code> turned <code>rotateX(90deg)</code> around the bar\'s own length.',
      'One bar rule, three directions: along X as it is, along Z with <code>rotateY(90deg)</code>, standing up with <code>rotateZ(90deg)</code>. <code>--x</code>, <code>--y</code>, <code>--z</code> (−1, 0 or 1) times the spacing place it.',
      'The lattice is three horizontal layers (6 bars and 9 nodes each) plus 9 posts running through all of them. A layer moves to <code>translateY(y × 1.3 × u)</code>: the middle one has <code>y = 0</code>, so the same keyframes leave it in place.',
      'The posts wrapper does <code>scaleY(1.3)</code> on the same beat, so the posts stretch by exactly what the layers move and no joint ever opens.',
      'Nodes are round glows that turn back against the spin (<code>rotateY(-360deg)</code>, same timing), so they always face you.',
    ],
    html: `<div class="scene">
  <div class="lattice">
${[-1, 0, 1].map(latticeLayer).join('\n')}
    <div class="posts">
${SPOTS.map((s) => `      <i style="--x:${s.x}; --z:${s.z}"></i>`).join('\n')}
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.lattice {
  --u: 50px; /* spacing */
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: spin 18s linear infinite;
}

.layer,
.posts {
  position: absolute;
  transform-style: preserve-3d;
}

.layer {
  transform: translateY(calc(var(--y) * var(--u)));
  animation: breathe 2.4s ease-in-out infinite alternate;
}

.posts {
  animation: stretch 2.4s ease-in-out infinite alternate;
}

/* a bar along X, two crossed planes */
.lattice i {
  position: absolute;
  top: -1px;
  left: calc(var(--u) * -1);
  width: calc(var(--u) * 2);
  height: 2px;
  transform-style: preserve-3d;
  background: linear-gradient(90deg, ${TEAL}, rgb(139 108 255 / 0.85) 30% 70%, ${TEAL});
  transform: translateZ(calc(var(--z) * var(--u)));
}

.lattice i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: inherit;
  transform: rotateX(90deg);
}

/* the same bar along Z */
.lattice i.z {
  transform: translateX(calc(var(--x) * var(--u))) rotateY(90deg);
}

/* and standing up */
.posts i {
  transform: translateX(calc(var(--x) * var(--u))) translateZ(calc(var(--z) * var(--u))) rotateZ(90deg);
}

.lattice b {
  --glow: 46 230 214;
  position: absolute;
  top: -6px;
  left: -6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, rgb(var(--glow)) 25%, #fff) 0 22%, rgb(var(--glow)) 42%, rgb(var(--glow) / 0) 72%);
  animation: face-you 18s linear infinite;
}

.mid b { --glow: 255 77 157; }
.mid b:nth-of-type(5) { --glow: 255 181 71; } /* the very centre */

@keyframes spin {
  from { transform: rotateZ(-8deg) rotateX(-22deg) rotateY(0deg); }
  to   { transform: rotateZ(-8deg) rotateX(-22deg) rotateY(360deg); }
}

/* y = 0 for the middle layer, so it stays put */
@keyframes breathe {
  to { transform: translateY(calc(var(--y) * var(--u) * 1.3)); }
}

/* (u + 0.3u) / u: exactly what the outer layers moved */
@keyframes stretch {
  to { transform: scaleY(1.3); }
}

@keyframes face-you {
  from { transform: translate3d(calc(var(--x) * var(--u)), 0, calc(var(--z) * var(--u))) rotateY(0deg); }
  to   { transform: translate3d(calc(var(--x) * var(--u)), 0, calc(var(--z) * var(--u))) rotateY(-360deg); }
}`,
  },

  planet: {
    how: [
      'The sphere is 11 flat discs, one every 15° of latitude: a disc at latitude <code>a</code> sits <code>R·sin(a)</code> above the equator and has radius <code>R·cos(a)</code>. CSS does the trig itself: <code>cos(var(--k) * 15deg)</code>.',
      'Seen from above, each disc\'s rim peeks out below the one above it, and those rims are the planet\'s bands.',
      'A shaded disc through the centre always <b>faces you</b>: it undoes every turn above it, innermost first. It hides exactly what is behind the planet and nothing in front of it, just like a real ball would.',
      'The rings lie flat in the equator plane and cut through that disc. The browser splits intersecting planes and sorts the pieces, so the far half of each ring slips behind the planet and the near half passes in front.',
      'The moon rides a slightly inclined orbit circle; two nested counter-turns (one on the orbit\'s beat, one on the spin\'s) keep it facing you.',
    ],
    html: `<div class="scene">
  <div class="planet">
    <div class="body">
${lines(11, (i) => `<i style="--k:${i - 5}"></i>`, '      ')}
      <u></u>
      <b></b>
      <b></b>
      <b></b>
      <div class="orbit">
        <div class="arm"><div class="moon"></div></div>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.planet {
  --R: 40px;
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: spin 40s linear infinite;
}

/* the planet's frame, tilted 12deg on its axis */
.body {
  position: absolute;
  transform-style: preserve-3d;
  transform: rotateZ(-12deg);
}

/* latitude discs: k = -5 ... 5, every 15deg */
.body i {
  --r: calc(cos(var(--k) * 15deg) * var(--R));
  --c: color-mix(in srgb, #ffb547 80%, #ff4d9d);
  position: absolute;
  top: calc(var(--r) * -1);
  left: calc(var(--r) * -1);
  width: calc(var(--r) * 2);
  height: calc(var(--r) * 2);
  border-radius: 50%;
  background: radial-gradient(circle, var(--c) 55%, color-mix(in srgb, var(--c) 70%, #000));
  transform: translateY(calc(sin(var(--k) * 15deg) * var(--R) * -1)) rotateX(90deg);
}

.body i:nth-child(odd)    { --c: color-mix(in srgb, #ffb547 55%, #fff); }
.body i:nth-child(4n + 1) { --c: color-mix(in srgb, #ff4d9d 70%, #ffb547); }
.body i:nth-child(-n + 2),
.body i:nth-child(n + 10) { --c: color-mix(in srgb, #8b6cff 55%, #ffb547); } /* polar caps */

/* the body: a shaded disc that always faces you (undoes the tilt, the spin, the camera height) */
.body u {
  position: absolute;
  inset: calc(var(--R) * -1);
  border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, #ffdaa3, #ffb547 32%, #ff6c83 62%, #614cb3);
  animation: face-you 40s linear infinite;
}

/* rings: flat circles in the equator plane */
.body b {
  position: absolute;
  border-radius: 50%;
  transform: rotateX(90deg);
}

.body b:nth-of-type(1) { inset: -52px;   border: 7px solid rgb(139 108 255 / 0.38); }
.body b:nth-of-type(2) { inset: -62px;   border: 8px solid rgb(197 186 253 / 0.85); }
.body b:nth-of-type(3) { inset: -72.8px; border: 2px solid rgb(139 108 255 / 0.85); }

/* the moon's orbit: a faint dashed circle, inclined 8deg, turning on its own axis */
.orbit {
  position: absolute;
  inset: -92px;
  border: 1px dashed rgb(46 230 214 / 0.4);
  border-radius: 50%;
  transform-style: preserve-3d;
  animation: orbit 7s linear infinite;
}

/* undo the orbit's turn ... */
.arm {
  position: absolute;
  top: -7px;
  left: calc(50% - 7px);
  width: 14px;
  height: 14px;
  transform-style: preserve-3d;
  animation: unorbit 7s linear infinite;
}

/* ... then the incline, the tilt, the spin and the camera height */
.moon {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #fff 0 8%, ${TEAL} 45%, #125c56);
  animation: moon 40s linear infinite;
}

@keyframes spin {
  from { transform: rotateX(-22deg) rotateY(0deg); }
  to   { transform: rotateX(-22deg) rotateY(360deg); }
}

@keyframes face-you {
  from { transform: rotateZ(12deg) rotateY(0deg) rotateX(22deg); }
  to   { transform: rotateZ(12deg) rotateY(-360deg) rotateX(22deg); }
}

@keyframes orbit {
  from { transform: rotateX(82deg) rotateZ(0deg); }
  to   { transform: rotateX(82deg) rotateZ(360deg); }
}

@keyframes unorbit {
  to { transform: rotateZ(-360deg); }
}

@keyframes moon {
  from { transform: rotateX(-82deg) rotateZ(12deg) rotateY(0deg) rotateX(22deg); }
  to   { transform: rotateX(-82deg) rotateZ(12deg) rotateY(-360deg) rotateX(22deg); }
}`,
  },
};
