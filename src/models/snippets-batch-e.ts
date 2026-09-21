/** Copy-paste versions of the batch-E demos: plain HTML + CSS (+ JS), no Sass. */
import { CUBE_FACES, type Snippet } from './snippet-utils';

/** n lines of markup, one per index, indented. */
const lines = (n: number, fn: (i: number) => string, indent = '    '): string =>
  Array.from({ length: n }, (_, i) => indent + fn(i)).join('\n');

const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const AMBER = '#ffb547';

const CITY_H = [3.4, 2.6, 3.0, 1.8, 2.4, 1.2, 2.2, 1.4, 2.8, 1.8, 0.9, 1.6, 1.5, 1.1, 1.3, 0.6];
const CITY_C = [VIOLET, TEAL, PINK, VIOLET, AMBER, VIOLET, TEAL, PINK];

const SOLAR = [
  { r: 34, t: 5, s: 9, c: TEAL, d: -1 },
  { r: 54, t: 9, s: 13, c: PINK, d: -6 },
  { r: 76, t: 14, s: 11, c: VIOLET, d: -3 },
  { r: 98, t: 22, s: 16, c: AMBER, d: -15 },
];

// island: terrain heights, row by row from the far corner (0.5 = the pond)
const ISLAND_H = [2, 3, 2.5, 2, 2, 2.5, 2, 1.5, 1, 2, 1.5, 1, 1.5, 1, 1, 0.5];

const PINS = [
  { x: 24, y: 34, c: PINK },
  { x: 58, y: 66, c: AMBER },
  { x: 80, y: 28, c: VIOLET },
];

/** The pointer → two custom properties script shared by the "look around" scenes. */
const pointerJs = (view: string, target: string, props: string): string => `const view = document.querySelector('${view}');
const target = view.querySelector('${target}');

view.addEventListener('pointermove', (e) => {
  const r = view.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;   // -0.5 … 0.5
  const y = (e.clientY - r.top) / r.height - 0.5;
${props}
  target.classList.add('is-live');
  view.classList.add('is-touched');
});

view.addEventListener('pointerleave', () => {
  target.classList.remove('is-live');
  target.style.removeProperty('--rx');
  target.style.removeProperty('--ry');
  target.style.removeProperty('--rz');
});`;

const HINT_CSS = `/* the hint is a flat overlay, outside the 3D world */
.hint {
  position: absolute;
  inset: auto 0 12px;
  color: #949bc0;
  font: 600 13px system-ui;
  text-align: center;
  pointer-events: none;
  transition: opacity 0.4s;
}

.is-touched .hint {
  opacity: 0;
}`;

export const snippetsE: Record<string, Snippet> = {
  solar: {
    how: [
      'The <b>system</b> is a plane laid back with <code>rotateX(68deg)</code> and turned a little on screen with <code>rotateZ(-16deg)</code>. Every orbit is a ring on that plane.',
      'Each ring spins with <code>rotateZ(0 → 360deg)</code>; its planet sits on the ring’s top edge and rides along. A negative <code>animation-delay</code> starts every planet at a different angle.',
      'To keep a planet round and facing you, undo everything above it <b>in reverse order</b>: <code>rotateZ(-angle) rotateX(-68deg) rotateZ(16deg)</code>. The planet runs that with the same duration and delay as its ring, so the rotations cancel at every frame. That is billboarding.',
      'The sun gets the same inverse without the spin. The fading trail is a <code>conic-gradient</code> cut to a thin ring with a <code>mask</code>, on a pseudo-element, so the mask never flattens the planet.',
    ],
    html: `<div class="scene">
  <div class="system">
    <div class="sun"></div>
${SOLAR.map((p, i) => `    <div class="orbit" style="--r:${p.r}px;--t:${p.t}s;--s:${p.s}px;--c:${p.c};--d:${p.d}s"><b${i === 3 ? ' class="ringed"' : ''}></b></div>`).join('\n')}
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.system,
.system * {
  box-sizing: border-box;
}

/* the orbital plane: rolled on screen, then laid back */
.system {
  position: relative;
  width: 200px;
  height: 200px;
  transform-style: preserve-3d;
  transform: rotateZ(-16deg) rotateX(68deg);
}

.sun {
  position: absolute;
  inset: calc(50% - 13px);
  border-radius: 50%;
  background: radial-gradient(circle at 38% 34%, #fff8e1, ${AMBER} 45%, ${PINK});
  box-shadow: 0 0 16px ${AMBER}, 0 0 40px rgb(255 77 157 / 0.45);
  transform: rotateX(-68deg) rotateZ(16deg); /* the plane, undone: faces the camera */
}

.orbit {
  position: absolute;
  inset: calc(50% - var(--r));
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
  border-radius: 50%;
  transform-style: preserve-3d;
  animation: orbit var(--t) linear var(--d) infinite;
}

/* a fading trail behind the planet: a conic gradient masked down to a thin ring */
.orbit::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: conic-gradient(transparent 62%, var(--c));
  mask: radial-gradient(closest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
}

.orbit b {
  position: absolute;
  top: calc(var(--s) / -2);
  left: calc(50% - var(--s) / 2);
  width: var(--s);
  height: var(--s);
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #fff 0 6%, var(--c) 42%, color-mix(in srgb, var(--c) 45%, #000));
  /* same duration + delay as the ring: the two rotations cancel */
  animation: face var(--t) linear var(--d) infinite;
}

/* a flat ring; hiding its top border makes the far half pass "behind" */
.orbit .ringed::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 180%;
  height: 50%;
  border: 2px solid #ffd79a;
  border-top-color: transparent;
  border-radius: 50%;
  transform: translate(-50%, -50%) rotate(-18deg);
}

@keyframes orbit {
  to { transform: rotateZ(360deg); }
}

/* undo the ring's spin, then the plane's tilt, then its roll */
@keyframes face {
  from { transform: rotateZ(0deg) rotateX(-68deg) rotateZ(16deg); }
  to   { transform: rotateZ(-360deg) rotateX(-68deg) rotateZ(16deg); }
}`,
  },

  city: {
    how: [
      'The ground is tilted into an isometric view: <code>rotateX(58deg) rotateZ(45deg)</code>. Every building is placed on it with <code>left/top</code> from <code>--x/--y</code>.',
      'A building is <b>one element</b>. The element itself is the roof, lifted with <code>translateZ(var(--h))</code>. Heights are in <code>em</code>, so one <code>font-size</code> scales the whole skyline.',
      '<code>::before</code> hangs from the roof’s bottom edge (<code>transform-origin: top; rotateX(-90deg)</code>) and <code>::after</code> from its right edge (<code>transform-origin: left; rotateY(90deg)</code>). With a 45° turn those are exactly the two walls you can see; the hidden two are never built.',
      'Windows are two layered repeating gradients: opaque wall bands across, over lit/unlit columns. The side wall’s own x axis points down the building, so its pattern is turned 90°.',
      'JS only turns the pointer into <code>--rx</code> / <code>--rz</code>; a transition eases the block there, fast while the pointer moves and slow on the way back.',
    ],
    html: `<div class="city">
  <div class="world">
${lines(16, (i) => `<i style="--x:${i % 4};--y:${Math.floor(i / 4)};--h:${CITY_H[i]};--c:${CITY_C[i % CITY_C.length]}"></i>`)}
  </div>
  <b class="hint">Move your pointer</b>
</div>`,
    css: `.city {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  perspective: 900px;
}

.world {
  --cell: 40px; /* grid pitch */
  --line: rgb(255 181 71 / 0.4);
  position: relative;
  width: 172px;
  height: 172px;
  font-size: 17px; /* 1em of building height */
  border: 1px solid rgb(139 108 255 / 0.45);
  border-radius: 10px;
  /* street centre lines, one per 40px, in the gaps between the lots */
  background:
    repeating-linear-gradient(90deg, transparent 0 5px, var(--line) 5px 7px, transparent 7px 40px),
    repeating-linear-gradient(transparent 0 5px, var(--line) 5px 7px, transparent 7px 40px),
    #1f1f40;
  transform-style: preserve-3d;
  transform: translateY(26px) rotateX(calc(58deg + var(--rx, 0deg))) rotateZ(calc(45deg + var(--rz, 0deg)));
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.world.is-live {
  transition-duration: 0.1s;
}

/* the roof */
.world i {
  --wall: color-mix(in srgb, var(--c) 42%, #141830);
  --lit: #ffd89a;
  position: absolute;
  left: calc(12px + var(--x) * var(--cell));
  top: calc(12px + var(--y) * var(--cell));
  width: 28px;
  height: 28px;
  background: color-mix(in srgb, var(--c) 62%, #141830);
  box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--c) 40%, #141830);
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--h) * 1em));
}

.world i::before,
.world i::after {
  content: '';
  position: absolute;
}

/* front wall: hangs down from the bottom edge */
.world i::before {
  top: 100%;
  left: 0;
  width: 100%;
  height: calc(var(--h) * 1em);
  background:
    repeating-linear-gradient(var(--wall) 0 4px, transparent 4px 8px),
    repeating-linear-gradient(90deg, var(--wall) 0 4px, var(--lit) 4px 8px);
  background-position: 0 2px, 2px 0;
  transform-origin: top;
  transform: rotateX(-90deg);
}

/* side wall: hangs down from the right edge, pattern turned, a shade darker */
.world i::after {
  top: 0;
  left: 100%;
  width: calc(var(--h) * 1em);
  height: 100%;
  background:
    linear-gradient(rgb(0 0 0 / 0.28), rgb(0 0 0 / 0.28)),
    repeating-linear-gradient(90deg, var(--wall) 0 4px, transparent 4px 8px),
    repeating-linear-gradient(var(--wall) 0 4px, var(--lit) 4px 8px);
  background-position: 0 0, 2px 0, 0 2px;
  transform-origin: left;
  transform: rotateY(90deg);
}

${HINT_CSS}`,
    js: pointerJs(
      '.city',
      '.world',
      `  target.style.setProperty('--rz', -x * 40 + 'deg');
  target.style.setProperty('--rx', -y * 16 + 'deg');`,
    ),
  },

  room: {
    how: [
      'Build a box around the camera: a back wall pushed away with <code>translateZ</code>, and side walls, floor and ceiling folded 90° from the edges of the view. Each is turned so its front faces <b>into</b> the room.',
      'The folds start at <code>translateZ(110px)</code>, in front of the screen, and run 460px deep. That extra length toward the camera is what you see when you turn your head; stop well short of the perspective distance (300px).',
      'The key line: <code>transform-origin: 50% 50% 300px</code>, the same as the <code>perspective</code>. The box then rotates around the viewer’s eye, which reads as looking around, not as the room swinging.',
      'JS maps the pointer to <code>--rx</code> / <code>--ry</code> of a few degrees. Everything on the walls (window, poster, door, rug, lamp) is a flat child of its wall, drawn with gradients.',
    ],
    html: `<div class="room">
  <div class="box">
    <div class="wall back"><i class="window"></i><i class="picture"></i></div>
    <div class="wall left"><i class="poster"></i></div>
    <div class="wall right"><i class="door"></i></div>
    <div class="wall floor"><i class="light"></i><i class="rug"></i></div>
    <div class="wall ceil"><i class="lamp"></i></div>
  </div>
  <b class="hint">Move your pointer</b>
</div>`,
    css: `.room {
  position: fixed;
  inset: 0;
  overflow: hidden;
  perspective: 300px;
  background: #06070d;
}

.room * {
  box-sizing: border-box;
}

.box {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform-origin: 50% 50% 300px; /* rotate around the camera = turn your head */
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.box.is-live {
  transition-duration: 0.12s;
}

.wall {
  position: absolute;
  background-color: #28244a;
}

.wall > i {
  position: absolute;
}

/* 110px (near end) - 460px (depth) = -350px */
.back {
  inset: 0;
  background-image: radial-gradient(ellipse 70% 60% at 50% 0%, rgb(255 181 71 / 0.2), transparent 70%);
  transform: translateZ(-350px);
}

.left,
.right {
  top: 0;
  width: 460px;
  height: 100%;
}

.left {
  left: 0;
  background-image: linear-gradient(90deg, rgb(0 0 0 / 0.35), rgb(0 0 0 / 0.08));
  transform-origin: left;
  transform: translateZ(110px) rotateY(90deg);
}

.right {
  right: 0;
  background-image: linear-gradient(270deg, rgb(0 0 0 / 0.4), rgb(0 0 0 / 0.12));
  transform-origin: right;
  transform: translateZ(110px) rotateY(-90deg);
}

.floor,
.ceil {
  left: 0;
  width: 100%;
  height: 460px;
}

.floor {
  bottom: 0;
  background:
    linear-gradient(transparent 30%, rgb(0 0 0 / 0.45)),
    repeating-linear-gradient(90deg, transparent 0 30px, rgb(0 0 0 / 0.3) 30px 32px),
    #6e4f2e;
  transform-origin: bottom;
  transform: translateZ(110px) rotateX(90deg);
}

.ceil {
  top: 0;
  background-image: linear-gradient(rgb(0 0 0 / 0.4), rgb(0 0 0 / 0.1));
  transform-origin: top;
  transform: translateZ(110px) rotateX(-90deg);
}

/* back wall */
.window {
  top: 20%;
  left: 16%;
  width: 30%;
  height: 40%;
  border: 5px solid #948fb0;
  border-radius: 3px;
  background:
    linear-gradient(90deg, transparent calc(50% - 2px), #948fb0 0 calc(50% + 2px), transparent 0),
    linear-gradient(transparent calc(50% - 2px), #948fb0 0 calc(50% + 2px), transparent 0),
    radial-gradient(circle at 72% 28%, #fff7da 0 9%, rgb(255 247 218 / 0.3) 10%, transparent 24%),
    radial-gradient(circle at 20% 30%, #fff 0 1px, transparent 2px),
    radial-gradient(circle at 36% 70%, #fff 0 1px, transparent 2px),
    linear-gradient(#070b24, #2b2466);
}

.picture {
  top: 24%;
  left: 60%;
  width: 22%;
  height: 28%;
  border: 4px solid ${AMBER};
  background: linear-gradient(160deg, ${TEAL}, ${VIOLET} 55%, ${PINK});
}

/* left wall: its left end is near the camera */
.poster {
  top: 22%;
  left: 50%;
  width: 22%;
  height: 38%;
  background:
    radial-gradient(circle at 50% 38%, ${AMBER} 0 18%, transparent 19%),
    linear-gradient(transparent 62%, ${PINK} 62% 70%, transparent 70%),
    linear-gradient(${VIOLET}, #463680);
}

/* right wall: its RIGHT end is near the camera */
.door {
  bottom: 0;
  left: 14%;
  width: 18%;
  height: 64%;
  border: 4px solid #4a3220;
  border-bottom: 0;
  background:
    radial-gradient(circle at 18% 54%, ${AMBER} 0 3px, transparent 4px),
    #7e5a33;
}

/* floor: its top edge touches the back wall */
.light {
  top: 4%;
  left: 22%;
  width: 30%;
  height: 34%;
  background: linear-gradient(rgb(223 230 255 / 0.22), transparent);
  clip-path: polygon(8% 0, 92% 0, 100% 100%, 0 100%);
}

.rug {
  top: 30%;
  left: 24%;
  width: 52%;
  height: 34%;
  border-radius: 50%;
  background: repeating-radial-gradient(ellipse, ${PINK} 0 8px, #463680 8px 16px, ${TEAL} 16px 19px, #463680 19px 26px);
  opacity: 0.85;
}

/* ceiling: its top edge is near the camera */
.lamp {
  top: 50%;
  left: calc(50% - 45px);
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle, #fffaf0 0 16%, rgb(255 181 71 / 0.55) 20%, transparent 68%);
}

${HINT_CSS.replace('#949bc0', '#fff')}`,
    js: pointerJs(
      '.room',
      '.box',
      `  target.style.setProperty('--ry', x * 16 + 'deg');
  target.style.setProperty('--rx', -y * 10 + 'deg');`,
    ),
  },

  ferris: {
    how: [
      'Every cabin is a zero-size point at the wheel’s centre with <code>rotate(a) translateY(-68px) rotate(-a)</code>: turn, walk out to the rim, turn back. It lands on the rim, upright.',
      'The wheel spins <code>0 → 360deg</code>. Each cabin appends <code>rotate(0 → -360deg)</code> with the same duration, so the two cancel at every moment and the cabins keep hanging straight down.',
      'Because the cabin element is a point, <code>transform-origin</code> is the pivot. The body is a pseudo-element hanging below it, free to swing a few degrees on its own.',
      'Depth comes cheap: two rims at <code>translateZ(±7px)</code>, every spoke drawn twice with <code>::before/::after</code>, and two A-frames in front of and behind the wheel. Turn the whole thing with <code>rotateY</code> to see it.',
    ],
    html: `<div class="scene">
  <div class="ferris">
    <div class="base"></div>
    <div class="stand"><s></s><s></s></div>
    <div class="wheel">
${lines(4, (i) => `<i style="--a:${i * 45}deg"></i>`, '      ')}
${lines(8, (i) => `<b style="--i:${i};--c:${[TEAL, PINK, AMBER, VIOLET][i % 4]}"></b>`, '      ')}
      <u></u>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.ferris {
  position: relative;
  width: 200px;
  height: 188px;
  transform-style: preserve-3d;
  transform: rotateX(-8deg) rotateY(-28deg);
}

/* a glowing pad, laid flat on the ground */
.base {
  position: absolute;
  left: 20px;
  top: 150px;
  width: 160px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(139 108 255 / 0.4), transparent);
  transform: rotateX(90deg);
}

.stand {
  position: absolute;
  left: 38px;
  top: 74px;
  width: 124px;
  height: 104px;
  transform-style: preserve-3d;
}

/* an A-frame: a thin inverted V in one polygon */
.stand s {
  position: absolute;
  inset: 0;
  background: linear-gradient(#a18cff, rgb(139 108 255 / 0.4));
  clip-path: polygon(0 100%, 48% 0, 52% 0, 100% 100%, 95.5% 100%, 50% 5%, 4.5% 100%);
  transform: translateZ(-14px);
}

.stand s + s {
  transform: translateZ(14px);
}

.wheel {
  position: absolute;
  left: 32px;
  top: 10px;
  width: 136px;
  height: 136px;
  transform-style: preserve-3d;
  animation: spin 24s linear infinite;
}

/* two rims at different depths */
.wheel::before,
.wheel::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 3px solid ${VIOLET};
  border-radius: 50%;
  box-shadow: 0 0 10px rgb(139 108 255 / 0.6);
  transform: translateZ(7px);
}

.wheel::after {
  border: 3px dotted ${AMBER};
  box-shadow: none;
  transform: translateZ(-7px);
}

/* each spoke is a diameter, drawn once per rim */
.wheel i {
  position: absolute;
  top: 0;
  left: calc(50% - 1px);
  width: 2px;
  height: 100%;
  transform-style: preserve-3d;
  transform: rotate(var(--a));
}

.wheel i::before,
.wheel i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgb(139 108 255 / 0.6);
  transform: translateZ(7px);
}

.wheel i::after {
  transform: translateZ(-7px);
}

/* a cabin: a point at the centre, pushed out to the rim */
.wheel b {
  --a: calc(var(--i) * 45deg);
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  animation: cabin 24s linear infinite;
}

/* the body hangs below the point and swings a little */
.wheel b::before {
  content: '';
  position: absolute;
  top: 3px;
  left: -9px;
  width: 18px;
  height: 15px;
  border-radius: 3px 3px 7px 7px;
  background: linear-gradient(var(--c) 0 30%, color-mix(in srgb, var(--c) 30%, #fff) 30% 62%, var(--c) 62%);
  box-shadow: 0 0 8px var(--c);
  transform-origin: 50% -3px;
  animation: swing 1.6s ease-in-out infinite alternate;
  animation-delay: calc(var(--i) * -0.4s);
}

.wheel b::after {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  width: 2px;
  height: 5px;
  background: #ccc;
}

.wheel u {
  position: absolute;
  inset: calc(50% - 8px);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff, ${AMBER} 55%, ${PINK});
  transform: translateZ(8px);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* the last rotate cancels the wheel's rotation */
@keyframes cabin {
  from { transform: rotate(var(--a)) translateY(-68px) rotate(calc(var(--a) * -1)) rotate(0deg); }
  to   { transform: rotate(var(--a)) translateY(-68px) rotate(calc(var(--a) * -1)) rotate(-360deg); }
}

@keyframes swing {
  from { transform: rotate(-5deg); }
  to   { transform: rotate(5deg); }
}`,
  },

  island: {
    how: [
      'The land is a 4 × 4 grid tilted to an isometric view with <code>rotateX(58deg) rotateZ(45deg)</code>. Each block gets <code>--x/--y</code> (cells), <code>--z</code> (top height) and <code>--h</code> (wall length).',
      'A block is <b>one element</b>: the element is the top face, lifted with <code>translateZ</code>. <code>::before</code> folds down from its bottom edge with <code>rotateX(-90deg)</code>, <code>::after</code> from its right edge with <code>rotateY(90deg)</code>. Only the two walls that face the camera exist.',
      'The same block makes everything: grass columns, the stepped rock underside (tops at z ≤ 0, walls hanging below), tree trunks and blossoms. Only the colours change.',
      'Floating is two animations with the same timing: the land bobs and sways, while a flat glow underneath shrinks and fades when the land is high.',
    ],
    html: `<div class="scene">
  <div class="island">
    <div class="shadow"></div>
    <div class="land">
${lines(16, (i) => `<i style="--x:${i % 4};--y:${Math.floor(i / 4)};--z:${ISLAND_H[i]}"${i === 15 ? ' class="pond"' : ''}></i>`, '      ')}
      <i class="rock" style="--x:0.2;--y:0.2;--w:3.6;--h:1.4;--z:0"></i>
      <i class="rock" style="--x:0.7;--y:0.7;--w:2.6;--h:1.3;--z:-1.4"></i>
      <i class="rock" style="--x:1.3;--y:1.3;--w:1.4;--h:1.1;--z:-2.7"></i>
      <i class="trunk" style="--x:1.35;--y:0.35;--w:0.3;--h:0.7;--z:3.7"></i>
      <i class="leaf" style="--x:1.1;--y:0.1;--w:0.8;--h:0.8;--z:4.5"></i>
      <i class="trunk" style="--x:0.35;--y:2.35;--w:0.3;--h:0.5;--z:1.5"></i>
      <i class="leaf" style="--x:0.15;--y:2.15;--w:0.7;--h:0.7;--z:2.2"></i>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.island {
  --cell: 28px;
  --unit: 14px; /* one step of height */
  position: relative;
  width: 200px;
  height: 190px;
  transform-style: preserve-3d;
}

.shadow {
  position: absolute;
  left: 40px;
  bottom: 4px;
  width: 120px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(139 108 255 / 0.5), transparent);
  animation: breathe 3.2s ease-in-out infinite alternate;
}

.land {
  position: absolute;
  left: 44px;
  top: 30px;
  width: 112px;
  height: 112px;
  transform-style: preserve-3d;
  animation: bob 3.2s ease-in-out infinite alternate;
}

/* one block = top face + two walls */
.land i {
  --w: 1;
  --h: var(--z); /* terrain columns reach down to the ground */
  --top: #2bb58f;
  --grass: #1f8a66;
  --side: #8a5f38;
  position: absolute;
  left: calc(var(--x) * var(--cell));
  top: calc(var(--y) * var(--cell));
  width: calc(var(--w) * var(--cell));
  height: calc(var(--w) * var(--cell));
  background: var(--top);
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--z) * var(--unit)));
}

.land i::before,
.land i::after {
  content: '';
  position: absolute;
}

/* +y wall, folded down from the bottom edge */
.land i::before {
  top: 100%;
  left: 0;
  width: 100%;
  height: calc(var(--h) * var(--unit));
  background: linear-gradient(var(--grass) 0 3px, var(--side) 3px);
  transform-origin: top;
  transform: rotateX(-90deg);
}

/* +x wall, folded down from the right edge, a shade darker */
.land i::after {
  top: 0;
  left: 100%;
  width: calc(var(--h) * var(--unit));
  height: 100%;
  background:
    linear-gradient(rgb(0 0 0 / 0.25), rgb(0 0 0 / 0.25)),
    linear-gradient(90deg, var(--grass) 0 3px, var(--side) 3px);
  transform-origin: left;
  transform: rotateY(90deg);
}

.land .pond  { --top: #6f8bff; --grass: #4a5fc4; --side: #3a4a96; }
.land .rock  { --top: #5b5f78; --grass: #6b5a50; --side: #6f7294; }
.land .trunk { --top: #8a5a36; --grass: #6b4228; --side: #6b4228; }
.land .leaf  { --top: #ff9cc6; --grass: ${PINK}; --side: ${PINK}; }

@keyframes bob {
  from { transform: translateY(5px) rotateX(58deg) rotateZ(38deg); }
  to   { transform: translateY(-5px) rotateX(58deg) rotateZ(52deg); }
}

@keyframes breathe {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0.55; transform: scale(0.82); }
}`,
  },

  road: {
    how: [
      'The road is one long plane (1400px) folded flat with <code>transform-origin: bottom; rotateX(90deg)</code>. Put <code>perspective-origin</code> on the horizon line, and the far end vanishes exactly there.',
      'Nothing really moves forward. The centre line is one period (100px) taller than the road and slides down by exactly that period, then jumps back: the jump is invisible because the pattern looks identical.',
      'Posts stand up with <code>rotateX(-90deg)</code> around their foot and all run the same trip along the road, spread out by negative delays. Speed matches the dashes: 1400px in 7s = 100px in 0.5s.',
      'A <code>mask</code> on the road would flatten its 3D posts. Instead a flat band of haze sits on top of the horizon and hides where things appear. The ground lines are a <code>repeating-conic-gradient</code> from the vanishing point.',
    ],
    html: `<div class="drive">
  <div class="sun"></div>
  <div class="ground"></div>
  <div class="road">
    <div class="dashes"></div>
${lines(12, (i) => `<i class="${i % 2 ? 'right' : 'left'}" style="--i:${Math.floor(i / 2)}"></i>`)}
  </div>
  <div class="haze"></div>
</div>`,
    css: `.drive {
  position: fixed;
  inset: 0;
  overflow: hidden;
  perspective: 300px;
  perspective-origin: 50% 44%; /* the horizon */
  background: linear-gradient(#07051a, #3a2580 24%, #8c2a6c 44%);
}

.sun {
  position: absolute;
  top: calc(44% - 78px);
  left: calc(50% - 60px);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(${AMBER} 20%, ${PINK} 75%);
  box-shadow: 0 0 40px rgb(255 77 157 / 0.6);
  mask: linear-gradient(#000 30%, transparent 0 33%, #000 0 41%, transparent 0 45%, #000 0 52%, transparent 0 57%, #000 0);
}

/* lines from the vanishing point: parallel to the road, so they stay still */
.ground {
  position: absolute;
  inset: 44% 0 0;
  background:
    repeating-conic-gradient(from 90deg at 50% 0%, rgb(255 77 157 / 0.5) 0 0.5deg, transparent 0.5deg 9deg),
    linear-gradient(#3b1a6e, #06030f 70%);
}

.road {
  position: absolute;
  left: 29%;
  right: 29%;
  bottom: 0;
  height: 1400px;
  background: linear-gradient(90deg, ${PINK} 0 3px, #1c1438 3px calc(100% - 3px), ${PINK} calc(100% - 3px));
  transform-style: preserve-3d;
  transform-origin: bottom;
  /* the near end starts 120px in front of the screen (well below the 300px perspective) */
  transform: translateZ(120px) rotateX(90deg);
}

.dashes {
  position: absolute;
  top: -100px; /* one period taller than the road */
  bottom: 0;
  left: calc(50% - 3px);
  width: 6px;
  background: repeating-linear-gradient(${AMBER} 0 50px, transparent 50px 100px);
  animation: dash 0.5s linear infinite;
}

.road i {
  position: absolute;
  bottom: 0;
  width: 5px;
  height: 46px;
  border-radius: 3px;
  background: linear-gradient(${TEAL}, rgb(46 230 214 / 0.15));
  box-shadow: 0 0 8px rgb(46 230 214 / 0.7);
  transform-origin: bottom;
  animation: post 7s linear infinite;
  animation-delay: calc(var(--i) * -7s / 6);
}

.road i::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -3px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 25%, ${TEAL} 60%);
}

.road .left {
  left: -22px;
}

.road .right {
  right: -22px;
  animation-delay: calc(var(--i) * -7s / 6 - 7s / 12); /* half a step later */
}

.haze {
  position: absolute;
  inset: calc(44% - 7%) 0 auto;
  height: 22%;
  background: linear-gradient(transparent, #8c2a6c 30% 50%, transparent);
}

/* translateZ(1px): paint just above the road surface */
@keyframes dash {
  from { transform: translateZ(1px) translateY(0); }
  to   { transform: translateZ(1px) translateY(100px); }
}

@keyframes post {
  from { opacity: 0; transform: translateY(-1400px) rotateX(-90deg); }
  12%  { opacity: 1; }
  to   { opacity: 1; transform: translateY(0) rotateX(-90deg); }
}`,
  },

  snow: {
    how: [
      'JS creates forty flakes <b>once</b> and gives each random custom properties: position <code>--x</code>, depth <code>--z</code>, size, opacity, sideways <code>--drift</code>, duration <code>--t</code> and delay <code>--d</code>. After that it does nothing.',
      'One keyframe animation does all the falling: <code>translate3d(0, -160px, var(--z))</code> → <code>translate3d(var(--drift), 560px, var(--z))</code>. Perspective makes near flakes big and fast, far ones small and slow.',
      'The fall path is longer than the screen because perspective pulls far flakes toward the centre: they need the extra distance to reach the top and bottom edges.',
      'A negative delay between 0 and the duration means every flake starts mid-fall: it is already snowing on the first frame. Trees sit at real depths in the same 3D space, so flakes behind them are hidden.',
    ],
    html: `<div class="night">
  <div class="moon"></div>
  <div class="hill"></div>
  <div class="world">
    <b style="--x:8%;--z:-240px"></b>
    <b style="--x:66%;--z:-140px"></b>
    <b style="--x:34%;--z:-20px"></b>
  </div>
</div>`,
    css: `.night {
  position: fixed;
  inset: 0;
  overflow: hidden;
  perspective: 400px;
  background: linear-gradient(#050817, #1f1d5a 75%, #1a2e4a);
}

.moon {
  position: absolute;
  top: 12%;
  right: 16%;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: radial-gradient(circle at 60% 40%, #fffbe8, #e6e2ff 70%);
  box-shadow: 0 0 24px rgb(255 250 230 / 0.55), 0 0 70px rgb(139 108 255 / 0.45);
}

.hill {
  position: absolute;
  left: -20%;
  right: -20%;
  bottom: -32%;
  height: 62%;
  border-radius: 50% 50% 0 0 / 34% 34% 0 0;
  background: linear-gradient(#eef1ff, #b9c0e8 40%, #8d95c8);
}

.world {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  pointer-events: none;
}

/* pine trees at real depths */
.world b {
  position: absolute;
  bottom: 3%;
  left: var(--x);
  width: 70px;
  height: 104px;
  background:
    linear-gradient(transparent 26%, #e9ecff 26% 30%, transparent 30% 55%, #e9ecff 55% 59%, transparent 59%),
    linear-gradient(#135a55, #07161c);
  clip-path: polygon(50% 0, 72% 28%, 62% 28%, 84% 57%, 70% 57%, 96% 88%, 56% 88%, 56% 100%, 44% 100%, 44% 88%, 4% 88%, 30% 57%, 16% 57%, 38% 28%, 28% 28%);
  transform: translateZ(var(--z));
}

.world i {
  position: absolute;
  top: 0;
  left: var(--x);
  width: var(--s);
  height: var(--s);
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 35%, rgb(255 255 255 / 0) 70%);
  opacity: var(--o);
  animation: fall var(--t) linear var(--d) infinite;
}

@keyframes fall {
  from { transform: translate3d(0, -160px, var(--z)); }
  to   { transform: translate3d(var(--drift), 560px, var(--z)); }
}`,
    js: `const world = document.querySelector('.world');
const rand = (min, max) => min + Math.random() * (max - min);

for (let n = 0; n < 40; n++) {
  const flake = document.createElement('i');
  const z = rand(-300, 150);
  const near = (z + 300) / 450;                  // 0 = far … 1 = near
  const t = (9 - near * 5) * rand(0.85, 1.15);   // near flakes fall faster
  flake.style.setProperty('--x', rand(-25, 125).toFixed(1) + '%');
  flake.style.setProperty('--z', z.toFixed(0) + 'px');
  flake.style.setProperty('--s', rand(4, 8).toFixed(1) + 'px');
  flake.style.setProperty('--o', (0.45 + near * 0.5).toFixed(2));
  flake.style.setProperty('--drift', rand(-40, 40).toFixed(0) + 'px');
  flake.style.setProperty('--t', t.toFixed(2) + 's');
  flake.style.setProperty('--d', -rand(0, t).toFixed(2) + 's'); // already falling
  world.append(flake);
}`,
  },

  pie: {
    how: [
      'One disc: a <code>conic-gradient</code> with hard stops at the running totals (40%, 65%, 85%). Repeat it in twelve layers, each <code>translateZ(var(--i) * 1.5 units)</code> higher.',
      'Tilt the stack. The rims of the lower layers peek out under the top one and together read as a solid side wall. A dark overlay whose alpha grows as <code>--i</code> shrinks shades that wall.',
      'The hole is a <code>radial-gradient</code> <code>mask</code> on each <b>layer</b>. A mask on the spinning parent would flatten all twelve layers into one picture.',
      'Spin a wrapper with <code>rotateZ</code> inside the tilt, so every slice passes the front in turn.',
      'The donut is written in one base unit, <code>--u</code>, so it is the same share of a gallery card, the editor and a recording canvas. The legend under it is in plain <code>vmin</code>: it sits in the same control zone, at the same size, as every other model\'s.',
    ],
    html: `<div class="band">
  <div class="view">
    <div class="tilt">
      <div class="spin">
${lines(12, (i) => `<i style="--i:${i}"></i>`, '        ')}
      </div>
    </div>
  </div>
  <div class="controls">
    <p class="caption">Sprint time by stage, %</p>
    <ul class="row legend">
      <li style="--c:${VIOLET}">Design 40</li>
      <li style="--c:${TEAL}">Build 25</li>
      <li style="--c:${PINK}">Test 20</li>
      <li style="--c:${AMBER}">Ship 15</li>
    </ul>
  </div>
</div>`,
    css: `/* the model box and the legend stand in one stack, so the legend is the same distance under
   the donut in every model that has a control zone */
.band {
  display: grid;
  justify-items: center;
  gap: 4vmin;
}

/* the model box: one base unit, and every length of the donut is a multiple of it */
.view {
  --u: 0.44vmin;
  display: grid;
  place-items: center;
  height: 50vmin;
  perspective: calc(800 * var(--u));
}

.tilt {
  position: relative;
  width: calc(136 * var(--u));
  height: calc(136 * var(--u));
  margin: calc(-60 * var(--u)) 0; /* the tilted disc is much flatter than its box */
  transform-style: preserve-3d;
  transform: rotateX(60deg);
}

.spin {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: spin 18s linear infinite;
}

.spin i {
  --shade: rgb(0 0 0 / calc((11 - var(--i)) * 0.05)); /* 0.55 at the bottom, 0 on top */
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    linear-gradient(var(--shade), var(--shade)),
    conic-gradient(${VIOLET} 0 40%, ${TEAL} 0 65%, ${PINK} 0 85%, ${AMBER} 0);
  /* the hole: on each layer, never on a parent */
  mask: radial-gradient(closest-side, transparent 49.5%, #000 50%);
  transform: translateZ(calc(var(--i) * 1.5 * var(--u)));
}

/* top layer: a sheen and thin white slice edges. The edges fade in and out over a hair
   instead of hard stops: a hard hairline wedge on the tilted disc steps and reads as a dashed line. */
.spin i:last-child {
  background:
    radial-gradient(circle at 30% 25%, rgb(255 255 255 / 0.35), transparent 55%),
    conic-gradient(#fff 0 0.1%, ${VIOLET} 0.6% 39.2%, #fff 39.7% 40.1%, ${TEAL} 40.6% 64.2%, #fff 64.7% 65.1%, ${PINK} 65.6% 84.2%, #fff 84.7% 85.1%, ${AMBER} 85.6% 99.2%, #fff 99.7%);
}

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the donut's own unit. Here it holds the legend. */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}

.controls .caption {
  margin: 0;
  font: 500 4.5vmin/1.2 system-ui, sans-serif;
  opacity: 0.7;
}

.controls .row {
  display: flex;
  gap: 2.5vmin;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* a legend entry reports, it is not pressed: the row's height and text, no pill */
.legend li {
  display: flex;
  align-items: center;
  gap: 1.2vmin;
  height: 8vmin;
  font: 600 4vmin system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.legend li::before {
  content: '';
  width: 2.8vmin;
  height: 2.8vmin;
  border-radius: 0.8vmin;
  background: var(--c);
}

@keyframes spin {
  to { transform: rotateZ(360deg); }
}`,
  },

  scatter: {
    how: [
      'Three nested rotations: <b>tilt</b> <code>rotateX(--rx)</code> › <b>spin</b> <code>rotateY(0 → 360deg)</code> as a CSS animation › <b>cube</b> <code>rotateY(--ry)</code>. Dragging sets the two variables and pauses the spin with <code>animation-play-state</code>.',
      'Points are placed with the <code>translate</code> property (<code>translate: x y z</code>) inside the wireframe cube, so each one keeps its position whatever else it does.',
      'To stay a round sphere a point undoes all three rotations. The two Y turns share an axis, so their order does not matter: the animated one goes on the separate <code>rotate</code> property (<code>0 → -360deg</code>, same timing as the spin), the variable ones stay in a static <code>transform</code>. No custom property ever has to be read inside keyframes.',
      'Pause the spin <b>and</b> the points together, and they stay in step. <code>touch-action: none</code> plus pointer capture makes the drag work with a finger.',
      'Every length is a multiple of one base unit, <code>--u</code>, and JS writes a point\'s place as <b>plain numbers</b> that CSS multiplies by it, so the plot is the same share of a card, the editor and a recording canvas. The unit is set for the worst pose a drag can reach, a corner pointing at you, not for the pose at rest.',
    ],
    html: `<div class="plot">
  <div class="view">
    <div class="tilt">
      <div class="spin">
        <div class="cube">
          <u></u><u></u><u></u><u></u><u></u><u></u>
          <s></s><s></s><s></s>
          <b class="label" style="--x:84;--y:70;--z:-70">x</b>
          <b class="label" style="--x:-70;--y:-84;--z:-70">y</b>
          <b class="label" style="--x:-70;--y:70;--z:84">z</b>
        </div>
      </div>
    </div>
  </div>
</div>`,
    css: `/* the whole canvas is the drag surface; the plot itself is centred in it. No caption: the
   site's badge already says "Drag". */
.plot {
  /* one base unit: every length in the plot is a multiple of it */
  --u: 0.25vmin;
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.plot.is-drag {
  cursor: grabbing;
}

/* the model box */
.view {
  display: grid;
  place-items: center;
  height: 70vmin;
  perspective: calc(700 * var(--u));
}

.tilt {
  position: relative;
  width: calc(140 * var(--u));
  height: calc(140 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(var(--rx, -18deg));
}

.spin {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: spin 28s linear infinite;
}

.cube {
  --s: calc(140 * var(--u));
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateY(var(--ry, 0deg));
}

/* wireframe walls with a faint grid */
.cube u {
  position: absolute;
  inset: 0;
  /* in the text colour, so the frame reads on a light stage and a dark one */
  --line: color-mix(in srgb, currentColor 7%, transparent);
  border: calc(1.5 * var(--u)) solid color-mix(in srgb, currentColor 24%, transparent);
  background:
    linear-gradient(90deg, var(--line) calc(1.5 * var(--u)), transparent calc(1.5 * var(--u))) 0 0 / calc(35 * var(--u)) calc(35 * var(--u)),
    linear-gradient(var(--line) calc(1.5 * var(--u)), transparent calc(1.5 * var(--u))) 0 0 / calc(35 * var(--u)) calc(35 * var(--u));
}

${CUBE_FACES}

/* axes from the back-bottom-left corner */
.cube s {
  position: absolute;
  left: 0;
  top: 100%;
  width: calc(148 * var(--u));
  height: calc(2.5 * var(--u));
  background: color-mix(in srgb, currentColor 55%, transparent);
  transform-origin: 0 50%;
  transform: translateZ(calc(-70 * var(--u)));                       /* x */
}
.cube s:nth-of-type(2) { transform: translateZ(calc(-70 * var(--u))) rotateZ(-90deg); } /* y */
.cube s:nth-of-type(3) { transform: translateZ(calc(-70 * var(--u))) rotateY(-90deg); } /* z */

.cube b {
  position: absolute;
  top: calc(50% - calc(7 * var(--u)));
  left: calc(50% - calc(7 * var(--u)));
  width: calc(14 * var(--u));
  height: calc(14 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff 0 8%, var(--c) 50%, color-mix(in srgb, var(--c) 45%, #000));
  box-shadow: 0 0 calc(8 * var(--u)) var(--c);
  /* --x, --y, --z are plain numbers in the plot's own units */
  translate: calc(var(--x) * var(--u)) calc(var(--y) * var(--u)) calc(var(--z) * var(--u));
  /* undo the cube's turn and the tilt (static)... */
  transform: rotateY(calc(var(--ry, 0deg) * -1)) rotateX(calc(var(--rx, -18deg) * -1));
  /* ...and the spin (animated, on its own property) */
  animation: face 28s linear infinite;
}

.cube .label {
  display: grid;
  place-items: center;
  background: none;
  box-shadow: none;
  color: inherit;
  opacity: 0.65;
  font: 700 calc(17 * var(--u))/1 monospace;
}

.is-drag .spin,
.is-drag .cube b {
  animation-play-state: paused;
}

@keyframes spin {
  to { transform: rotateY(360deg); }
}

@keyframes face {
  from { rotate: y 0deg; }
  to   { rotate: y -360deg; }
}`,
    js: `const plot = document.querySelector('.plot');
const cube = plot.querySelector('.cube');
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// three loose clusters: centre x, y, z, spread, colour
const clusters = [
  [-28, -26, -18, 46, '${VIOLET}'],
  [32, 8, 30, 40, '${TEAL}'],
  [-6, 36, -34, 34, '${PINK}'],
];
const blob = (c, spread) => clamp(c + (Math.random() + Math.random() + Math.random() - 1.5) * spread, -62, 62);

for (let n = 0; n < 42; n++) {
  const [cx, cy, cz, spread, colour] = clusters[n % 3];
  const p = document.createElement('b');
  // plain numbers: CSS multiplies them by the plot's unit, --u
  p.style.setProperty('--x', blob(cx, spread).toFixed(0));
  p.style.setProperty('--y', blob(cy, spread).toFixed(0));
  p.style.setProperty('--z', blob(cz, spread).toFixed(0));
  p.style.setProperty('--c', colour);
  cube.append(p);
}

let rx = -18, ry = 0;
let last = null;

plot.addEventListener('pointerdown', (e) => {
  last = { x: e.clientX, y: e.clientY };
  plot.setPointerCapture(e.pointerId);
  plot.classList.add('is-drag');
});

plot.addEventListener('pointermove', (e) => {
  if (!last) return;
  ry += (e.clientX - last.x) * 0.5;
  rx = clamp(rx - (e.clientY - last.y) * 0.4, -80, 80);
  last = { x: e.clientX, y: e.clientY };
  plot.style.setProperty('--rx', rx + 'deg');
  plot.style.setProperty('--ry', ry + 'deg');
});

const up = () => {
  last = null;
  plot.classList.remove('is-drag');
};
plot.addEventListener('pointerup', up);
plot.addEventListener('pointercancel', up);`,
  },

  map: {
    how: [
      'The map is one element painted with layered gradients (land ellipses, a river cut from a big ring, two roads, a grid), tilted with <code>rotateX(54deg) rotateZ(-14deg)</code>.',
      'Each pin anchor is a zero-size point on the map. Its pulse ring is a child of that point, so it stays flat in the ground plane and spreads as an ellipse.',
      'The pin undoes the plane in reverse order, <code>rotateZ(14deg) rotateX(-54deg)</code>, around <code>transform-origin: 50% 100%</code>: its tip. It stands up exactly on its spot and faces you.',
      'Bounce keyframes repeat that inverse and add <code>translateY</code> and a squash <code>scale</code> after it, so the hop happens in screen space. <code>animation-delay: calc(var(--i) * 0.8s)</code> makes the pins take turns.',
    ],
    html: `<div class="scene">
  <div class="map">
    <div class="plane">
${PINS.map((p, i) => `      <i style="--x:${p.x}%;--y:${p.y}%;--c:${p.c};--i:${i}"><b></b></i>`).join('\n')}
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.map {
  position: relative;
  width: 210px;
  height: 180px;
  transform-style: preserve-3d;
}

.plane {
  --land: #1c5a60;
  --water: #262a55;
  --road: rgb(255 181 71 / 0.6);
  position: absolute;
  left: 10px;
  top: 34px;
  width: 190px;
  height: 150px;
  border: 1px solid rgb(46 230 214 / 0.45);
  border-radius: 14px;
  background:
    linear-gradient(28deg, transparent calc(50% - 1.5px), var(--road) 0 calc(50% + 1.5px), transparent 0),
    linear-gradient(90deg, transparent 63%, var(--road) 0 calc(63% + 3px), transparent 0),
    radial-gradient(circle at 115% 125%, transparent 56%, var(--water) 0 59%, transparent 0),
    radial-gradient(ellipse 30% 25% at 26% 32%, var(--land) 98%, transparent),
    radial-gradient(ellipse 26% 22% at 66% 68%, var(--land) 98%, transparent),
    radial-gradient(ellipse 15% 13% at 82% 24%, var(--land) 98%, transparent),
    radial-gradient(ellipse 12% 10% at 26% 80%, var(--land) 98%, transparent),
    linear-gradient(90deg, rgb(236 238 251 / 0.07) 1px, transparent 1px) 0 0 / 19px 19px,
    linear-gradient(rgb(236 238 251 / 0.07) 1px, transparent 1px) 0 0 / 19px 19px,
    var(--water);
  transform-style: preserve-3d;
  transform: rotateX(54deg) rotateZ(-14deg);
}

/* the anchor: a point on the map, 1px above it */
.plane i {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform: translateZ(1px);
}

.plane i::before,
.plane i::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  animation: 2.4s infinite;
  animation-delay: calc(var(--i) * 0.8s);
}

/* pulse ring, flat on the ground */
.plane i::before {
  top: -16px;
  left: -16px;
  width: 32px;
  height: 32px;
  border: 2px solid var(--c);
  box-sizing: border-box;
  opacity: 0;
  animation-name: ring;
  animation-timing-function: ease-out;
}

/* contact shadow */
.plane i::after {
  top: -4px;
  left: -7px;
  width: 14px;
  height: 8px;
  background: rgb(0 0 0 / 0.45);
  animation-name: shadow;
  animation-timing-function: ease-in-out;
}

/* the pin: tip at bottom centre = transform-origin */
.plane b {
  position: absolute;
  bottom: 0;
  left: -13px;
  width: 26px;
  height: 32px;
  transform-origin: 50% 100%;
  transform: rotateZ(14deg) rotateX(-54deg); /* the plane, undone */
  animation: bounce 2.4s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.8s);
}

/* head: three round corners, turned so the sharp one points down */
.plane b::before {
  content: '';
  position: absolute;
  width: 26px;
  height: 26px;
  border-radius: 50% 50% 50% 0;
  background: radial-gradient(circle at 70% 30%, color-mix(in srgb, var(--c) 40%, #fff), var(--c) 55%, color-mix(in srgb, var(--c) 60%, #000));
  transform: rotate(-45deg);
}

.plane b::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 8px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
}

@keyframes bounce {
  0%, 36%, 100% { transform: rotateZ(14deg) rotateX(-54deg) translateY(0) scale(1, 1); }
  14%           { transform: rotateZ(14deg) rotateX(-54deg) translateY(-16px) scale(0.94, 1.06); }
  26%           { transform: rotateZ(14deg) rotateX(-54deg) translateY(0) scale(1.14, 0.86); }
}

@keyframes shadow {
  0%, 36%, 100% { opacity: 1; transform: scale(1); }
  14%           { opacity: 0.45; transform: scale(0.6); }
}

@keyframes ring {
  0%, 24%   { opacity: 0; transform: scale(0.2); }
  27%       { opacity: 1; transform: scale(0.3); }
  70%, 100% { opacity: 0; transform: scale(1.5); }
}`,
  },
};
