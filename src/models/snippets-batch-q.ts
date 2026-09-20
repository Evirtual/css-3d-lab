import { chartSnippetsQ, DROPS } from './batch-q';
import type { Snippet } from './snippet-utils';

/** Copy-paste versions of batch Q. The three charts keep theirs beside their demo, in ./charts. */

const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const AMBER = '#ffb547';
const TEXT = '#eceefb';
const SURFACE = '#141830';
const BG = '#0b0d18';
/** The night the rain scene is lit against: dark whatever colours are around it. */
const NIGHT = '#0a0d1c';

/** n lines of markup, numbered from 0, indented to sit in the snippet's HTML. */
const lines = (n: number, fn: (i: number) => string, pad = '    '): string =>
  Array.from({ length: n }, (_, i) => pad + fn(i)).join('\n');

/** One sheet of glass with its drops, the same numbers the demo uses. */
const sheet = (look: 'far' | 'mid' | 'near', z: number, s: number): string =>
  `    <div class="glass ${look}" style="--z:${z}px">
${DROPS[look].map(([x, drop, t], i) => `      <i style="--x:${x};--s:${(drop * s).toFixed(2)};--t:${t}s;--i:${i}"></i>`).join('\n')}
    </div>`;

export const snippetsQ: Record<string, Snippet> = {
  ...chartSnippetsQ,

  desk: {
    how: [
      'The whole scene is <b>one tilted plane</b>: the floor, turned by <code>rotateX(58deg) rotateZ(20deg)</code>. Inside it, +Z points straight up out of the floor, so every height in the scene is just a <code>translateZ</code>.',
      'A flat thing on the floor (the desk top, a leg, the keyboard) is its <b>top face</b>, lifted by <code>translateZ</code>, plus the two walls the camera can see: <code>::before</code> hangs from its bottom edge (<code>transform-origin: top; rotateX(-90deg)</code>) and <code>::after</code> from its right edge (<code>transform-origin: left; rotateY(90deg)</code>). Three boxes, no maths.',
      'A thing that <b>stands up</b> — the monitor — is the opposite: <code>transform-origin: bottom; rotateX(-90deg)</code> swings the panel up out of the floor and turns its face towards the camera. Its hinge is its bottom edge, so its <code>top</code> is the hinge\'s y <i>minus</i> its height.',
      'Round things are made of flat sides. Each one is <code>rotateZ(var(--a)) translateY(r) rotateX(-90deg)</code>: turn to its angle, push out to the radius, stand up. A side is <code>2r·tan(π/n)</code> wide so the six of them close into a tube; the lamp shade adds one more <code>rotateX(40deg)</code> to lean its sides in, and a trapezoid <code>clip-path</code> to narrow them.',
      'The lamp arm aims its lean with <code>rotateZ(var(--d))</code> and then tips past vertical with <code>rotateX(calc(-90deg - var(--l)))</code>; two planes crossed by <code>rotateY(90deg)</code> make it a rod rather than a card. The head at its tip <b>undoes both rotations in the opposite order</b>, so the shade hangs level whatever the arm does. The sway is one animation on the floor, so the scene keeps its shape while the camera moves.',
    ],
    html: `<div class="scene">
  <div class="room">
    <div class="top"></div>
    <i class="leg" style="--x:18px;--y:38px"></i>
    <i class="leg" style="--x:187px;--y:38px"></i>
    <i class="leg" style="--x:18px;--y:117px"></i>
    <i class="leg" style="--x:187px;--y:117px"></i>
    <div class="pool"></div>
    <div class="foot"></div>
    <div class="neck"></div>
    <div class="screen">
      <i style="--i:0;--v:0.55"></i>
      <i style="--i:1;--v:1"></i>
      <i style="--i:2;--v:0.72"></i>
      <i style="--i:3;--v:0.38"></i>
    </div>
    <div class="keys"></div>
    <div class="mug">
${lines(6, (i) => `<i style="--a:${i * 60}deg"></i>`, '      ')}
      <b></b>
      <u></u>
    </div>
    <div class="lamp">
      <div class="base"></div>
      <div class="arm" style="--d:-72deg;--l:26deg">
        <i></i><i></i>
        <div class="head">
${lines(6, (i) => `<i style="--a:${i * 60}deg"></i>`, '          ')}
          <b></b>
          <u></u><u></u>
        </div>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 900px;
}

/* the mug handle and the lamp shade are sized with their borders included */
.scene *,
.scene *::before,
.scene *::after {
  box-sizing: border-box;
}

/* the floor. Everything below lives in this plane: +Z is up out of it. */
.room {
  position: relative;
  width: 214px;
  height: 166px;
  border: 1px solid rgb(139 108 255 / 0.35);
  border-radius: 14px;
  background: radial-gradient(70% 70% at 50% 45%, color-mix(in srgb, ${VIOLET} 16%, ${SURFACE}), color-mix(in srgb, ${VIOLET} 6%, ${BG}));
  transform-style: preserve-3d;
  /* translateY first: everything stands up from the floor, so the plane sits low in the frame */
  transform: translateY(20px) rotateX(58deg) rotateZ(20deg);
  animation: sway 11s ease-in-out infinite alternate;
}

/* what the desk keeps off the floor */
.room::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 26px;
  width: 206px;
  height: 112px;
  border-radius: 12px;
  background: radial-gradient(closest-side, rgb(11 13 24 / 0.62), transparent);
  transform: translateZ(0.1px);
}

/* The camera: the floor turns a little either way. Both ends are a pose, so alternate makes
   the loop seamless without a jump. */
@keyframes sway {
  from { transform: translateY(20px) rotateX(59deg) rotateZ(13deg); }
  to { transform: translateY(20px) rotateX(56deg) rotateZ(27deg); }
}

/* ── the desk ─────────────────────────────────────────────────────────────── */
.top {
  position: absolute;
  left: 10px;
  top: 30px;
  width: 194px;
  height: 104px;
  border-radius: 3px;
  background: linear-gradient(115deg, color-mix(in srgb, ${AMBER} 34%, ${SURFACE}), color-mix(in srgb, ${AMBER} 18%, ${SURFACE}));
  box-shadow: inset 0 0 0 1px rgb(255 181 71 / 0.45);
  transform-style: preserve-3d;
  transform: translateZ(54px);
}

.top::before,
.top::after,
.leg::before,
.leg::after {
  content: '';
  position: absolute;
}

/* +y wall: hangs from the front edge */
.top::before {
  top: 100%;
  left: 0;
  width: 100%;
  height: 7px;
  background: color-mix(in srgb, ${AMBER} 22%, ${BG});
  transform-origin: top;
  transform: rotateX(-90deg);
}

/* +x wall: hangs from the right edge, a shade darker */
.top::after {
  top: 0;
  left: 100%;
  width: 7px;
  height: 100%;
  background: color-mix(in srgb, ${AMBER} 14%, ${BG});
  transform-origin: left;
  transform: rotateY(90deg);
}

/* the legs: the same recipe, hanging all the way to the floor */
.leg {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: 9px;
  height: 9px;
  background: color-mix(in srgb, ${AMBER} 26%, ${BG});
  transform-style: preserve-3d;
  transform: translateZ(47px);
}

.leg::before {
  top: 100%;
  left: 0;
  width: 100%;
  height: 47px;
  background: color-mix(in srgb, ${AMBER} 20%, ${BG});
  transform-origin: top;
  transform: rotateX(-90deg);
}

.leg::after {
  top: 0;
  left: 100%;
  width: 47px;
  height: 100%;
  background: color-mix(in srgb, ${AMBER} 12%, ${BG});
  transform-origin: left;
  transform: rotateY(90deg);
}

/* the light the lamp throws on the desk: a flat ellipse just above the surface */
.pool {
  position: absolute;
  left: 16px;
  top: 38px;
  width: 124px;
  height: 84px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(255 181 71 / 0.55), transparent 85%);
  transform: translateZ(54.1px);
  animation: flicker 6s ease-in-out infinite alternate;
}

@keyframes flicker {
  from { opacity: 0.72; }
  to { opacity: 1; }
}

/* ── the monitor ──────────────────────────────────────────────────────────── */
.foot,
.neck {
  position: absolute;
  background: color-mix(in srgb, ${TEXT} 26%, ${SURFACE});
  transform-style: preserve-3d;
}

.foot::before,
.foot::after,
.neck::before,
.neck::after {
  content: '';
  position: absolute;
  background: color-mix(in srgb, ${TEXT} 16%, ${BG});
}

.foot::before,
.neck::before {
  top: 100%;
  left: 0;
  width: 100%;
  transform-origin: top;
  transform: rotateX(-90deg);
}

.foot::after,
.neck::after {
  top: 0;
  left: 100%;
  height: 100%;
  background: color-mix(in srgb, ${TEXT} 10%, ${BG});
  transform-origin: left;
  transform: rotateY(90deg);
}

.foot {
  left: 90px;
  top: 46px;
  width: 34px;
  height: 20px;
  border-radius: 3px;
  transform: translateZ(57px);
}

.foot::before { height: 3px; }
.foot::after { width: 3px; }

.neck {
  left: 101px;
  top: 52px;
  width: 12px;
  height: 8px;
  transform: translateZ(66px);
}

.neck::before { height: 9px; }
.neck::after { width: 9px; }

/* The panel. Its bottom edge is the hinge, so its top is the hinge's y minus the height (56 - 58);
   from there it stands up and faces +y, which is the camera. */
.screen {
  position: absolute;
  left: 57px;
  top: -2px;
  width: 100px;
  height: 58px;
  border-radius: 4px;
  background: color-mix(in srgb, ${TEXT} 22%, ${SURFACE});
  box-shadow: inset 0 0 0 1px rgb(236 238 251 / 0.32);
  isolation: isolate; /* so the bloom below can sit over the bezel but under the panel */
  transform-origin: bottom;
  transform: translateZ(66px) rotateX(-90deg);
}

/* the lit panel itself, under the bars */
.screen::before {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 2px;
  background: linear-gradient(160deg, color-mix(in srgb, ${VIOLET} 55%, ${BG}), color-mix(in srgb, ${TEAL} 40%, ${BG}));
  backface-visibility: hidden;
}

/* the bloom: a halo that spills past the bezel, breathing */
.screen::after {
  content: '';
  position: absolute;
  z-index: -1;
  inset: -16px;
  background: radial-gradient(closest-side, rgb(46 230 214 / 0.5), transparent 75%);
  backface-visibility: hidden;
  animation: glow 4.5s ease-in-out infinite alternate;
}

@keyframes glow {
  from { opacity: 0.45; }
  to { opacity: 0.95; }
}

/* four bars on the screen, each pulsing on its own beat */
.screen i {
  position: absolute;
  bottom: 12px;
  left: calc(14px + var(--i) * 18px);
  width: 11px;
  height: 30px;
  background: color-mix(in srgb, ${AMBER} 80%, #fff);
  backface-visibility: hidden; /* they must not show mirrored from behind the monitor */
  transform-origin: bottom;
  transform: scaleY(var(--v));
  animation: bar 2.4s ease-in-out infinite alternate;
  animation-delay: calc(var(--i) * -0.6s);
}

@keyframes bar {
  from { transform: scaleY(calc(var(--v) * 0.35)); }
  to { transform: scaleY(var(--v)); }
}

/* ── the keyboard ─────────────────────────────────────────────────────────── */
.keys {
  position: absolute;
  left: 62px;
  top: 94px;
  width: 92px;
  height: 26px;
  border-radius: 3px;
  /* the key rows: two crossed stripe patterns, so each cell reads as a key */
  background:
    repeating-linear-gradient(90deg, transparent 0 2px, rgb(11 13 24 / 0.6) 2px 3px, transparent 3px 9px),
    repeating-linear-gradient(transparent 0 2px, rgb(11 13 24 / 0.6) 2px 3px, transparent 3px 8px),
    color-mix(in srgb, ${TEXT} 30%, ${SURFACE});
  transform-style: preserve-3d;
  transform: translateZ(57px) rotateZ(-3deg);
}

.keys::before {
  content: '';
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  height: 3px;
  background: color-mix(in srgb, ${TEXT} 16%, ${BG});
  transform-origin: top;
  transform: rotateX(-90deg);
}

/* ── the mug ──────────────────────────────────────────────────────────────── */
/* a six-sided prism: the wrapper is a point on the desk, each side swings out to the radius
   (11px) and stands up. A side is 2 x 11 x tan(30deg) + 1 = 13.7px wide, so the extra 1px hides
   the seam between two of them. */
.mug {
  position: absolute;
  left: 174px;
  top: 80px;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform: translateZ(54px);
}

.mug i {
  position: absolute;
  left: 0;
  top: 0;
  width: 13.7px;
  height: 20px;
  margin: -20px 0 0 -6.85px; /* its bottom middle sits on the wrapper's point */
  background: linear-gradient(color-mix(in srgb, ${PINK} 70%, ${SURFACE}), color-mix(in srgb, ${PINK} 45%, ${BG}));
  transform-origin: 50% 100%;
  transform: rotateZ(var(--a)) translateY(11px) rotateX(-90deg);
  backface-visibility: hidden;
}

/* the rim and the coffee in it */
.mug b {
  position: absolute;
  left: -11px;
  top: -11px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, ${AMBER} 35%, #2a1410) 62%, color-mix(in srgb, ${PINK} 80%, #fff) 64%);
  transform: translateZ(20px);
}

/* The handle: a ring on the +x side. rotateY(90deg) after standing up turns its plane a quarter
   about the mug's axis, so the ring sticks out sideways instead of lying on the wall. */
.mug u {
  position: absolute;
  left: 0;
  top: 0;
  width: 13px;
  height: 13px;
  margin: -13px 0 0 -6.5px;
  border: 3px solid color-mix(in srgb, ${PINK} 55%, ${SURFACE});
  border-radius: 50%;
  transform-origin: 50% 100%;
  transform: rotateZ(-90deg) translateY(14px) rotateX(-90deg) rotateY(90deg) translateY(-5px);
}

/* ── the lamp ─────────────────────────────────────────────────────────────── */
.lamp {
  position: absolute;
  left: 32px;
  top: 62px;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform: translateZ(54px);
}

.base {
  position: absolute;
  left: -13px;
  top: -9px;
  width: 26px;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, ${TEXT} 34%, ${SURFACE}), color-mix(in srgb, ${TEXT} 18%, ${BG}));
  transform: translateZ(2px);
}

/* The arm. --d aims the lean in the floor plane, then rotateX(-90 - --l) stands it up and tips
   it that far past vertical. */
.arm {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform: rotateZ(var(--d)) rotateX(calc(-90deg - var(--l)));
}

.arm > i {
  position: absolute;
  left: 0;
  top: 0;
  width: 5px;
  height: 46px;
  margin: -46px 0 0 -2.5px;
  background: linear-gradient(90deg, color-mix(in srgb, ${TEXT} 18%, ${BG}), color-mix(in srgb, ${TEXT} 38%, ${SURFACE}), color-mix(in srgb, ${TEXT} 18%, ${BG}));
}

/* rotateY turns about the plane's own vertical, which here is the arm's axis: the two cross */
.arm > i + i {
  transform: rotateY(90deg);
}

/* At the arm's tip, turned back level: the wrapper's rotations undone in the opposite order,
   so the shade hangs straight down whatever the arm does. */
.head {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform: translateY(-46px) rotateX(calc(90deg + var(--l))) rotateZ(calc(-1 * var(--d)));
}

/* the six sides of the shade: wide at the rim (15px), leaning in as they rise */
.head i {
  position: absolute;
  left: 0;
  top: 0;
  width: 18.32px; /* 2 x 15 x tan(30deg) + 1 */
  height: 17px; /* the slant, not the height */
  margin: -17px 0 0 -9.16px;
  background: linear-gradient(color-mix(in srgb, ${AMBER} 30%, ${SURFACE}), color-mix(in srgb, ${AMBER} 72%, ${SURFACE}));
  clip-path: polygon(36% 0, 64% 0, 100% 100%, 0 100%); /* a trapezoid: the six close into a cone */
  transform-origin: 50% 100%;
  transform: rotateZ(var(--a)) translateY(15px) rotateX(-90deg) rotateX(40deg);
}

/* the bulb, seen through the open rim */
.head b {
  position: absolute;
  left: -8px;
  top: -8px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, ${AMBER} 90%, #fff), rgb(255 181 71 / 0.4));
  transform: translateZ(2px);
  animation: flicker 6s ease-in-out infinite alternate;
}

/* the beam: two planes crossed in an X, hanging from the rim. It stops just above the wood: a
   plane that cut the desk top would show the seam. */
.head u {
  position: absolute;
  left: -15px;
  top: 0;
  width: 30px;
  height: 38px;
  background: linear-gradient(rgb(255 181 71 / 0.62), transparent);
  clip-path: polygon(34% 0, 66% 0, 100% 100%, 0 100%);
  transform-origin: top;
  transform: rotateX(-90deg);
  animation: flicker 6s ease-in-out infinite alternate;
}

.head u + u {
  transform: rotateX(-90deg) rotateY(90deg);
}`,
  },

  rain: {
    how: [
      'Everything is a flat plane at its own depth inside one turned world: the city at <code>translateZ(-20px)</code>, two sheets of falling rain, three sheets of glass at 0 / 8 / 16px, and the frame in front at 20px. The world turns slowly, and because each plane sits at a different depth it slides by a different amount — <b>that parallax is the whole effect</b>.',
      'The frame is the trick that makes it hold together. Only its <code>border</code> paints, so its middle is the opening, and it reaches <b>42px past the glass on every side</b>. That has to be at least twice as far as any plane behind it can slide when the camera turns, or that plane either uncovers the opening on one side or pokes out past the frame on the other.',
      'The city is out of focus, and it is drawn that way rather than blurred. No <code>filter</code>: it would flatten the world (a filter forces <code>transform-style: flat</code>) and cost a repaint every frame. Soft <code>radial-gradient</code>s have no edge to begin with, and the towers are bands with their tops masked away, so they fade out instead of ending.',
      'A drop is a bright bead with the thread it drags behind it, and it does not fall evenly: the keyframes hang, catch, then run. The timing stays <code>linear</code> — the unevenness is in the values — and the loop starts and ends off the sheet, so it never shows a jump. <code>--s</code> scales the whole drop, so the near sheet gets fat drops and the far one fine ones.',
      'Rain in the air would look still if it were straight lines sliding along themselves, so a <code>mask</code> cuts the columns of light into dashes: the gradient gives the columns, the mask the lengths. Sliding the sheet by <b>exactly one dash period</b> repeats it with no seam.',
    ],
    html: `<div class="scene">
  <div class="window">
    <div class="city"></div>
    <div class="fall" style="--z:-14px;--r:8deg;--t:1.1s;--o:0.5"><i></i></div>
    <div class="fall" style="--z:-7px;--r:11deg;--t:0.8s;--o:0.8"><i></i></div>
${sheet('far', 0, 0.7)}
${sheet('mid', 8, 1)}
    <div class="sheen"></div>
${sheet('near', 16, 1.3)}
    <div class="frame"></div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

/* the frame's border is part of its size: without this the opening would come out wrong */
.scene *,
.scene *::before,
.scene *::after {
  box-sizing: border-box;
}

.window {
  position: relative;
  width: 226px;
  height: 168px;
  transform-style: preserve-3d;
  animation: turn 15s ease-in-out infinite alternate;
}

/* the camera: a slow turn either way, so the planes slide past each other */
@keyframes turn {
  from { transform: rotateY(-22deg) rotateX(5deg); }
  to { transform: rotateY(-11deg) rotateX(1deg); }
}

/* The city, out of focus far behind the glass: soft lights, a wet street, a night sky. Nothing
   here has an edge, so nothing needs blurring. */
.city {
  position: absolute;
  inset: -24px;
  background:
    radial-gradient(circle 7px at 26% 66%, rgb(255 181 71 / 0.75), transparent),
    radial-gradient(circle 5px at 69% 57%, rgb(255 77 157 / 0.7), transparent),
    radial-gradient(circle 5px at 48% 74%, rgb(46 230 214 / 0.7), transparent),
    radial-gradient(circle 4px at 84% 69%, rgb(255 181 71 / 0.65), transparent),
    radial-gradient(circle 3px at 15% 55%, rgb(46 230 214 / 0.6), transparent),
    radial-gradient(circle 3px at 58% 47%, rgb(255 181 71 / 0.6), transparent),
    radial-gradient(circle 3px at 37% 52%, rgb(255 77 157 / 0.5), transparent),
    radial-gradient(circle 2px at 76% 44%, rgb(255 181 71 / 0.55), transparent),
    radial-gradient(110% 55% at 50% 104%, rgb(255 181 71 / 0.34), transparent 70%),
    linear-gradient(color-mix(in srgb, ${VIOLET} 34%, ${NIGHT}), color-mix(in srgb, ${VIOLET} 12%, ${NIGHT}) 52%, color-mix(in srgb, ${VIOLET} 26%, ${NIGHT}));
  transform: translateZ(-20px);
}

/* the towers: bands with the top masked away, so they have no outline at all */
.city::before {
  content: '';
  position: absolute;
  inset: 34% 0 0;
  background: linear-gradient(90deg,
    transparent 0 6%, color-mix(in srgb, ${VIOLET} 26%, ${NIGHT}) 6% 17%,
    transparent 17% 24%, color-mix(in srgb, ${VIOLET} 16%, ${NIGHT}) 24% 32%,
    transparent 32% 41%, color-mix(in srgb, ${VIOLET} 30%, ${NIGHT}) 41% 55%,
    transparent 55% 63%, color-mix(in srgb, ${VIOLET} 18%, ${NIGHT}) 63% 74%,
    transparent 74% 82%, color-mix(in srgb, ${VIOLET} 24%, ${NIGHT}) 82% 93%,
    transparent 93%);
  mask: linear-gradient(transparent, #000 50%);
}

/* the glow over the city, breathing a little so the night is not dead still */
.city::after {
  content: '';
  position: absolute;
  inset: 30% 0 0;
  background: radial-gradient(70% 70% at 50% 100%, rgb(255 181 71 / 0.26), transparent 70%);
  animation: breathe 7s ease-in-out infinite alternate;
}

@keyframes breathe {
  from { opacity: 0.55; }
  to { opacity: 1; }
}

/* rain in the air: a turned sheet of dashes */
.fall {
  position: absolute;
  inset: -16px;
  overflow: hidden;
  transform: translateZ(var(--z)) rotateZ(var(--r));
}

/* Straight lines would look still while they slide along themselves, so the columns of light are
   cut into dashes by a mask: the gradient gives the columns, the mask the lengths. */
.fall i {
  position: absolute;
  inset: -40px 0;
  background: repeating-linear-gradient(90deg, transparent 0 6px, rgb(255 255 255 / 0.26) 6px 7px, transparent 7px 11px);
  mask: repeating-linear-gradient(transparent 0 8px, #000 11px 21px, transparent 24px 30px);
  opacity: var(--o);
  animation: fall var(--t) linear infinite;
}

/* exactly one dash period, so the sheet repeats itself */
@keyframes fall {
  to { transform: translateY(30px); }
}

/* A sheet of glass: no background of its own (its edge would show through the frame when the
   camera turns), only the beads clinging to it and the drops running down. */
.glass {
  position: absolute;
  inset: 0;
  transform: translateZ(var(--z));
}

.glass.far {
  background:
    radial-gradient(circle 2px at 18% 22%, #fff6 0 60%, #0000 100%),
    radial-gradient(circle 3px at 63% 14%, #fff5 0 60%, #0000 100%),
    radial-gradient(circle 2px at 78% 44%, #fff5 0 60%, #0000 100%),
    radial-gradient(circle 2px at 31% 66%, #fff4 0 60%, #0000 100%),
    radial-gradient(circle 3px at 52% 82%, #fff5 0 60%, #0000 100%),
    radial-gradient(circle 2px at 86% 74%, #fff4 0 60%, #0000 100%);
}

.glass.mid {
  background:
    radial-gradient(circle 3px at 26% 38%, #fff7 0 60%, #0000 100%),
    radial-gradient(circle 4px at 71% 26%, #fff6 0 60%, #0000 100%),
    radial-gradient(circle 3px at 44% 58%, #fff6 0 60%, #0000 100%),
    radial-gradient(circle 4px at 82% 63%, #fff5 0 60%, #0000 100%),
    radial-gradient(circle 3px at 15% 79%, #fff6 0 60%, #0000 100%);
}

.glass.near {
  background:
    radial-gradient(circle 5px at 35% 30%, #fff8 0 55%, #0000 100%),
    radial-gradient(circle 4px at 66% 52%, #fff7 0 55%, #0000 100%),
    radial-gradient(circle 5px at 22% 61%, #fff7 0 55%, #0000 100%),
    radial-gradient(circle 4px at 75% 85%, #fff6 0 55%, #0000 100%);
}

/* one drop: a bright bead with the thread it drags behind it */
.glass i {
  position: absolute;
  top: 0;
  left: calc(var(--x) * 1%);
  width: calc(var(--s) * 3px);
  height: calc(var(--s) * 22px);
  border-radius: calc(var(--s) * 2px);
  background: linear-gradient(transparent, rgb(255 255 255 / 0.26) 55%, rgb(255 255 255 / 0.82));
  box-shadow: 0 0 calc(var(--s) * 3px) rgb(46 230 214 / 0.45);
  animation: run var(--t) linear infinite;
  animation-delay: calc(var(--i) * -0.7s);
}

/* A drop does not fall evenly: it hangs, catches, then runs. The values are uneven but the
   timing is linear, so the loop still closes — it starts and ends off the sheet. */
@keyframes run {
  0% { transform: translateY(-34px); }
  16% { transform: translateY(5px); }
  25% { transform: translateY(11px); }
  54% { transform: translateY(86px); }
  62% { transform: translateY(94px); }
  100% { transform: translateY(198px); }
}

/* the light from outside catching the glass: a soft diagonal sheen with no edge of its own */
.sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(118deg, transparent 20%, rgb(46 230 214 / 0.18) 44%, transparent 64%);
  mask: radial-gradient(72% 72% at 50% 50%, #000, transparent);
  transform: translateZ(14px);
}

/* The frame. Only its border paints, so the middle is the opening; it reaches 42px past the glass
   on every side, which is more than twice as far as any plane behind it can slide. */
.frame {
  position: absolute;
  inset: -42px;
  /* a gradient frame: the border is transparent and border-image paints it */
  border: 42px solid transparent;
  border-image: linear-gradient(145deg, color-mix(in srgb, ${VIOLET} 30%, ${SURFACE}), color-mix(in srgb, ${VIOLET} 26%, ${BG}) 55%, color-mix(in srgb, ${VIOLET} 14%, ${BG})) 1;
  box-shadow:
    inset 0 0 14px rgb(11 13 24 / 0.85),
    inset 0 0 0 1px rgb(236 238 251 / 0.16),
    0 0 0 1px rgb(139 108 255 / 0.45);
  transform: translateZ(20px);
}

/* the two bars across the opening */
.frame::before,
.frame::after {
  content: '';
  position: absolute;
  background: linear-gradient(145deg, color-mix(in srgb, ${VIOLET} 30%, ${SURFACE}), color-mix(in srgb, ${VIOLET} 18%, ${BG}));
  box-shadow: inset 0 0 0 1px rgb(236 238 251 / 0.14);
}

.frame::before {
  top: 0;
  bottom: 0;
  left: calc(50% - 3px);
  width: 5px;
}

.frame::after {
  left: 0;
  right: 0;
  top: 36%;
  height: 5px;
}`,
  },
};
