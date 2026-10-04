import type { Snippet } from './snippet-utils';

/** spring: ten turns, each one a front half-ring and a back half-ring; --k is the turn. */
const TURNS = 10;
const COIL = Array.from({ length: TURNS }, (_, k) => `        <i class="f" style="--k:${k}"></i><i class="b" style="--k:${k}"></i>`).join('\n');

/** Copy-paste version of the bouncing coil spring (batch-n-spring.ts): plain HTML + CSS, no JS. */
export const snippetsSpring: Record<string, Snippet> = {
  spring: {
    how: [
      'A coil is a helix, and half a turn of a helix is very nearly a flat half-circle that climbs half the pitch from one end to the other. So each half-turn is one element: a half-ring (a box with <code>border-radius</code> on its bottom corners and no top border), laid flat with <code>rotateX(±90deg)</code>, front halves toward you and back halves away, then tilted by the pitch with <code>rotateZ(∓5.2deg)</code>. Front halves climb left to right and back halves right to left, exactly as the wire of a real spring does.',
      'Flat wire seen from a little above would be a hairline, so each half-ring has two copies, its <code>::before</code> and <code>::after</code>, pushed 2.5 and 5 units straight down with <code>translateZ</code>. Lit on top and darker underneath, the three read as one round wire.',
      'The whole coil is one element scaled with <code>scaleY</code> from its base (<code>transform-origin</code> at the stand). Scaling the vertical axis shortens the pitch and flattens the tilt of every half-ring together, so it compresses like a real spring, coil-bound at the bottom, for one animated property.',
      'The ball and the top plate run their own keyframes on the same 1.8 s clock. The ball falls on a quadratic ease-in and is caught on a sine ease-out, and the numbers are chosen so its speed is the same on both sides of the hand-off (46 units of fall against 58.5 of squeeze, a quarter of the loop each), so nothing jerks at the catch. After the throw the plate rings on with a small overshoot and settles before the ball comes back.',
      'The loop starts and ends with the ball at the top of its flight and the spring at rest, which is a whole pose for a paused card. Every length is a multiple of one base unit, <code>--u</code>, so the toy is the same share of a card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="toy" role="img" aria-label="A coil spring on a stand, bouncing a ball">
    <div class="rig">
      <b class="floor"></b>
      <b class="base top"></b><b class="base front"></b><b class="base side"></b>
      <div class="coil">
${COIL}
      </div>
      <div class="plate-move"><b class="plate"></b></div>
      <div class="ball-move"><b class="ball"></b></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the toy is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.23vmin;
  perspective: calc(800 * var(--u));
}

.toy {
  --t: 1.8s; /* one bounce: every moving part runs on this clock */
  width: calc(150 * var(--u));
  height: calc(260 * var(--u));
  display: grid;
  place-items: center;
  transform-style: preserve-3d;
}

/* 0 × 0, at the middle of the stand's top face; everything is placed around this point. Seen a
   little from above and from the right, and set down so the whole toy is centred */
.rig {
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform: translateY(calc(96 * var(--u))) rotateX(-18deg) rotateY(-20deg);
}

/* --- the stand: a square slab, its top, its front and its right side --- */
.base {
  position: absolute;
  box-sizing: border-box;
}
.base.top {
  left: calc(-60 * var(--u));
  top: calc(-60 * var(--u));
  width: calc(120 * var(--u));
  height: calc(120 * var(--u));
  border-radius: calc(4 * var(--u));
  /* the seat the coil stands in: a teal ring, under a soft contact shadow */
  background:
    radial-gradient(circle, rgb(0 0 0 / 0.35) 0 calc(30 * var(--u)), transparent calc(48 * var(--u))),
    radial-gradient(circle, transparent 0 calc(41 * var(--u)), #2ee6d6 calc(41.5 * var(--u)) calc(44 * var(--u)), transparent calc(44.5 * var(--u))),
    linear-gradient(135deg, #4a4470, #2c2848);
  transform: rotateX(90deg);
}
/* 0.6 wider than the slab, so it tucks under the side face and no hairline opens at the corner */
.base.front {
  left: calc(-60 * var(--u));
  top: 0;
  width: calc(120.6 * var(--u));
  height: calc(14 * var(--u));
  background: linear-gradient(#8b6cff 0 calc(2 * var(--u)), #2a2545 calc(2 * var(--u)), #1c1930);
  transform: translateZ(calc(60 * var(--u)));
}
.base.side {
  left: calc(-60 * var(--u));
  top: 0;
  width: calc(120 * var(--u));
  height: calc(14 * var(--u));
  background: linear-gradient(#6a52d6 0 calc(2 * var(--u)), #1f1b36 calc(2 * var(--u)), #141225);
  transform: rotateY(90deg) translateZ(calc(60 * var(--u)));
}

/* a shadow on the floor, under the stand */
.floor {
  position: absolute;
  left: calc(-100 * var(--u));
  top: calc(-100 * var(--u));
  width: calc(200 * var(--u));
  height: calc(200 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(16 12 40 / 0.4), transparent);
  transform: translateY(calc(14.5 * var(--u))) rotateX(90deg);
}

/* --- the coil: 0 × 0 at the middle of the seat, squeezed from there --- */
.coil {
  position: absolute;
  transform-style: preserve-3d;
  transform-origin: 0 0;
  animation: squeeze var(--t) infinite;
}

/* one half-turn: a half-ring of radius 36 whose straight side is the coil's axis line. Pitch 13:
   a front half climbs from 13k to 13k + 6.5 (its middle at + 3.25), a back half from there to
   13(k + 1). Tilted by atan(6.5 / 72) = 5.16deg, which is exactly that climb across its width */
.coil > i {
  --y: calc(var(--k) * 13 + 3.25);
  position: absolute;
  left: calc(-36 * var(--u));
  top: 0;
  width: calc(72 * var(--u));
  height: calc(36 * var(--u));
  box-sizing: border-box;
  border: calc(5 * var(--u)) solid var(--hi);
  border-top: 0;
  border-radius: 0 0 calc(36 * var(--u)) calc(36 * var(--u));
  transform-style: preserve-3d;
  transform-origin: 50% 0;
}
/* front: laid down toward you, climbing to the right */
.coil > .f {
  --hi: #c4b5ff;
  --mid: #8b6cff;
  --lo: #4f3bb0;
  --dn: -1; /* after rotateX(90deg) the half-ring's own z points up, so "down" is -z */
  transform: translateY(calc(var(--y) * -1 * var(--u))) rotateZ(-5.16deg) rotateX(90deg);
}
/* back: laid down away from you, 6.5 higher, climbing to the left. Darker: it is in shadow */
.coil > .b {
  --y: calc(var(--k) * 13 + 9.75);
  --hi: #9480e6;
  --mid: #6249cf;
  --lo: #33267a;
  --dn: 1;
  transform: translateY(calc(var(--y) * -1 * var(--u))) rotateZ(5.16deg) rotateX(-90deg);
}

/* the wire's thickness: two copies of the half-ring, 2.5 and 5 units lower */
.coil > i::before,
.coil > i::after {
  content: '';
  position: absolute;
  inset: 0 calc(-5 * var(--u)) calc(-5 * var(--u));
  box-sizing: border-box;
  border: calc(5 * var(--u)) solid var(--mid);
  border-top: 0;
  border-radius: inherit;
}
.coil > i::before { transform: translateZ(calc(var(--dn) * 2.5 * var(--u))); }
.coil > i::after { border-color: var(--lo); transform: translateZ(calc(var(--dn) * 5 * var(--u))); }

/* --- the top plate: rides on the coil's top end (130 units up at rest) --- */
.plate-move {
  position: absolute;
  transform-style: preserve-3d;
  animation: ride var(--t) infinite;
}
.plate,
.plate::before,
.plate::after {
  position: absolute;
  left: calc(-41 * var(--u));
  top: calc(-41 * var(--u));
  width: calc(82 * var(--u));
  height: calc(82 * var(--u));
  border-radius: 50%;
}
.plate {
  background: radial-gradient(circle at 40% 35%, #ffe2a8, #ffb547 45%, #d98a1c);
  transform-style: preserve-3d;
  transform: translateY(calc(-5 * var(--u))) rotateX(90deg);
}
.plate::before,
.plate::after {
  content: '';
  left: 0;
  top: 0;
}
.plate::before { background: #c27a14; transform: translateZ(calc(-2.5 * var(--u))); }
.plate::after { background: #8f560a; transform: translateZ(calc(-5 * var(--u))); }

/* --- the ball: 0 × 0 at its lowest point, so its keyframes say where that point is --- */
.ball-move {
  position: absolute;
  transform-style: preserve-3d;
  animation: bounce var(--t) infinite;
}
/* a sphere is the same from every side, so it is drawn as a disc turned back to face the camera
   (the rig's own turn, undone in reverse order) and shaded with one radial gradient */
.ball {
  position: absolute;
  left: calc(-30 * var(--u));
  top: calc(-60 * var(--u));
  width: calc(60 * var(--u));
  height: calc(60 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, #fff 0 4%, #ff9cc6 14%, #ff4d9d 42%, #b8155f 78%, #6d0a37);
  transform: rotateY(20deg) rotateX(18deg);
}

/* The eases: sine out cubic-bezier(0.61, 1, 0.88, 1), sine in (0.12, 0, 0.39, 0), sine in-out
   (0.37, 0, 0.63, 1), quad in (0.11, 0, 0.5, 0), quad out (0.5, 1, 0.89, 1).
   The spring is at rest until the catch (25%), squeezed to 0.55 (50%), back to its length at the
   throw (75%), then rings: over to 1.06, under to 0.97, settling by 100% */
@keyframes squeeze {
  0%, 25% { transform: scaleY(1); animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1); }
  50% { transform: scaleY(0.55); animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0); }
  75% { transform: scaleY(1); animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1); }
  80% { transform: scaleY(1.06); animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1); }
  87% { transform: scaleY(0.97); animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1); }
  94% { transform: scaleY(1.015); animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1); }
  100% { transform: scaleY(1); }
}

/* the plate is the coil's top end: 130 × the scale, on the same eases */
@keyframes ride {
  0%, 25% { transform: translateY(calc(-130 * var(--u))); animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1); }
  50% { transform: translateY(calc(-71.5 * var(--u))); animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0); }
  75% { transform: translateY(calc(-130 * var(--u))); animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1); }
  80% { transform: translateY(calc(-137.8 * var(--u))); animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1); }
  87% { transform: translateY(calc(-126.1 * var(--u))); animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1); }
  94% { transform: translateY(calc(-132 * var(--u))); animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1); }
  100% { transform: translateY(calc(-130 * var(--u))); }
}

/* the ball's lowest point: the top of its flight 46 above the plate, falling (quad in) onto it at
   135, riding it down to 76.5 squashed a little, thrown at 135 and rising (quad out) to the top.
   The fall ends at 2 × 46 / 0.25 = 368 units per loop and the squeeze starts at
   π / 2 × 58.5 / 0.25 = 368: the same speed, so the catch is seamless */
@keyframes bounce {
  0% { transform: translateY(calc(-181 * var(--u))) scale(1, 1); animation-timing-function: cubic-bezier(0.11, 0, 0.5, 0); }
  25% { transform: translateY(calc(-135 * var(--u))) scale(1, 1); animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1); }
  50% { transform: translateY(calc(-76.5 * var(--u))) scale(1.08, 0.92); animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0); }
  75% { transform: translateY(calc(-135 * var(--u))) scale(1, 1); animation-timing-function: cubic-bezier(0.5, 1, 0.89, 1); }
  100% { transform: translateY(calc(-181 * var(--u))) scale(1, 1); }
}`,
  },
};
