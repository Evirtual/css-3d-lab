import type { Snippet } from './snippet-utils';

/** pendulumwave: fifteen pendulums, k = 0 at the far end. Pendulum k swings 20 + k times a loop,
    so its period is 30s / (20 + k) and its length, as on the real device, is L0 · (20 / (20 + k))². The
    threads are a V spread 7 units either side along the bar, so each one's tilt and length come
    from its own L. The bob colours run teal, violet, pink down the row. */
const RAMP = ['#2ee6d6', '#8b6cff', '#ff4d9d'];
const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const mix = (a: string, b: string, t: number) =>
  '#' + [1, 3, 5].map((i) => hex(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t)).join('');
const colour = (k: number) => {
  const s = (k / 14) * (RAMP.length - 1);
  const i = Math.min(Math.floor(s), RAMP.length - 2);
  return mix(RAMP[i], RAMP[i + 1], s - i);
};
const PENDULUMS = Array.from({ length: 15 }, (_, k) => {
  const L = 150 * (20 / (20 + k)) ** 2;
  const tilt = (Math.atan(7 / L) * 180) / Math.PI;
  const thread = Math.hypot(7, L);
  return `    <div class="pend" style="--k:${k}; --L:${L.toFixed(1)}; --t:${tilt.toFixed(2)}deg; --tl:${thread.toFixed(1)}; --c:${colour(k)}"><b class="bob"></b></div>`;
}).join('\n');

export const snippetsPendulumwave: Record<string, Snippet> = {
  pendulumwave: {
    how: [
      'The whole trick is in the durations. Pendulum <code>k</code> swings <b>20 + k</b> times in one 30-second loop, so its <code>animation-duration</code> is <code>calc(30s / (20 + var(--k)))</code>: every one finishes a whole number of swings in the same 30 s, which is the moment they all hang in one line again. In between, each one slips a little further behind its faster neighbour, and that steady slip is what draws the snakes and the waves. At 15 s every pendulum is halfway through its count, so all fifteen pass the middle together, every other one going the opposite way, and the row splits into two that cross.',
      'One <code>@keyframes</code> block is a full swing, out and back on both sides: out to each end on a sine ease-out (a pendulum slows to a stop at the top), back to the middle on a sine ease-in (it gathers speed on the way down). Joined that way the angle follows a true sine in time, and 0% and 100% are both the pose hanging straight, so the loop has no seam and a paused card shows a calm, aligned row.',
      'Each pendulum is a wrapper turned with <code>rotateX</code> about its <code>transform-origin</code> on the bar, so the threads and the bob swing as one rigid thing across the bar. Its two threads are the <code>::before</code> and <code>::after</code>, a V spread along the bar as on the real device, where it keeps each bob swinging in its own plane.',
      'A bob is a flat disc painted as a sphere, which would turn edge-on as it swings. So it runs a second animation with the same duration and easing that turns it back by exactly the swing, then undoes the camera turn of the whole rig: whatever the pendulum does, the disc stays square to you and the highlight stays upper left.',
      'The lengths are in true proportion: a period goes as the square root of the length, so pendulum <code>k</code> is <code>150 × (20 / (20 + k))²</code> units long, from 150 at the far end to 52 at the near one. Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the frame is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="rig" role="img" aria-label="Loading: a pendulum wave, fifteen pendulums drifting in and out of step">
    <div class="box bar"></div>
    <div class="box post left"></div>
    <div class="box post right"></div>
    <div class="box base"></div>
${PENDULUMS}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the frame is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.25vmin;
  perspective: calc(900 * var(--u));
}

/* the frame, seen from above and from the right, so the row of pendulums runs away from you to
   the left and their swings, across the bar, read as left and right on screen. The near corner
   of the base hangs low and right, so the rig is moved up and left to centre the drawing */
.rig {
  position: relative;
  width: calc(328 * var(--u));
  height: calc(194 * var(--u));
  transform-style: preserve-3d;
  transform: translate(calc(-15 * var(--u)), calc(-28 * var(--u))) rotateX(-13deg) rotateY(-50deg);
}

/* a box of the frame: the div is its front face, half its depth before the pendulums' plane;
   ::before is its top, laid back from its top edge, and ::after its right end, turned back from
   its right edge. Those three are the faces that look at the camera from here */
.box {
  --d: 10;
  position: absolute;
  background: #8b6cff;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--d) / 2 * var(--u)));
}
.box::before,
.box::after {
  content: '';
  position: absolute;
}
.box::before {
  left: 0;
  right: 0;
  top: 0;
  height: calc(var(--d) * var(--u));
  background: #bda9ff;
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
}
.box::after {
  top: 0;
  bottom: 0;
  left: 100%;
  width: calc(var(--d) * var(--u));
  background: #6a50d9;
  transform-origin: 0 50%;
  transform: rotateY(90deg);
}
.bar {
  left: 0;
  top: 0;
  width: calc(328 * var(--u));
  height: calc(10 * var(--u));
}
/* the posts start one unit up inside the bar, so two faces of one colour overlap rather than
   meet at an antialiased hairline; their tops are under the bar */
.post {
  top: calc(9 * var(--u));
  width: calc(10 * var(--u));
  height: calc(176 * var(--u));
}
.post::before { display: none; }
.post.left { left: 0; }
.post.right { left: calc(318 * var(--u)); }
/* the base: a slab as deep as the longest swing, its top the lightest face */
.base {
  --d: 104;
  left: calc(-10 * var(--u));
  top: calc(184 * var(--u));
  width: calc(348 * var(--u));
  height: calc(10 * var(--u));
  background: #5a44c4;
}
.base::before { background: #7660e6; }
.base::after { background: #4632a0; }

/* a pendulum: hung from the underside of the bar at its own place along it, origin at the top,
   so rotateX swings threads and bob together across the bar. Pendulum k makes 20 + k full swings
   in 30 s, so all fifteen are back in line every 30 s and never drift */
.pend {
  --a: 20;
  position: absolute;
  top: calc(10 * var(--u));
  left: calc((16 + var(--k) * 20) * var(--u));
  width: calc(16 * var(--u));
  height: calc((var(--L) + 9) * var(--u));
  transform-style: preserve-3d;
  transform-origin: 50% 0;
  animation: swing calc(30s / (20 + var(--k))) infinite;
}

/* the threads: a V tied 7 units either side along the bar, meeting at the bob; tilt and length
   are worked out from the pendulum's length (--t, --tl) */
.pend::before,
.pend::after {
  content: '';
  position: absolute;
  top: 0;
  width: calc(1.2 * var(--u));
  height: calc(var(--tl) * var(--u));
  background: currentColor;
  opacity: 0.5;
  transform-origin: 50% 0;
}
.pend::before { left: calc(1 * var(--u) - 0.6 * var(--u)); transform: rotate(calc(-1 * var(--t))); }
.pend::after { left: calc(15 * var(--u) - 0.6 * var(--u)); transform: rotate(var(--t)); }

/* the bob: a disc painted as a sphere. It turns back by the swing, in step with it, and then
   undoes the rig's own turn, so it always faces the camera */
.bob {
  position: absolute;
  top: calc((var(--L) - 9) * var(--u));
  left: calc(-1 * var(--u));
  width: calc(18 * var(--u));
  height: calc(18 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 36% 32%, #fff 0 8%, var(--c) 38%, color-mix(in srgb, var(--c), #000 55%) 100%);
  animation: face calc(30s / (20 + var(--k))) infinite;
}

/* a full swing: out on a sine ease-out (slowing to a stop), back on a sine ease-in (gathering
   speed), to one side and then the other. The angle follows a sine in time, and 0% and 100% are
   the same hanging pose */
@keyframes swing {
  0% { transform: rotateX(0deg); animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1); }
  25% { transform: rotateX(calc(var(--a) * 1deg)); animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0); }
  50% { transform: rotateX(0deg); animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1); }
  75% { transform: rotateX(calc(var(--a) * -1deg)); animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0); }
  100% { transform: rotateX(0deg); }
}
/* the same swing turned back, then the rig's rotateX(-13deg) rotateY(-50deg) undone */
@keyframes face {
  0% { transform: rotateX(0deg) rotateY(50deg) rotateX(13deg); animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1); }
  25% { transform: rotateX(calc(var(--a) * -1deg)) rotateY(50deg) rotateX(13deg); animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0); }
  50% { transform: rotateX(0deg) rotateY(50deg) rotateX(13deg); animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1); }
  75% { transform: rotateX(calc(var(--a) * 1deg)) rotateY(50deg) rotateX(13deg); animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0); }
  100% { transform: rotateX(0deg) rotateY(50deg) rotateX(13deg); }
}`,
  },
};
