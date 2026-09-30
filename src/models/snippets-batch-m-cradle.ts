import type { Snippet } from './snippet-utils';

/** cradle: the five pendulums, --i placing each along the bar; the outer two carry the swing. */
const PENDULUMS = [0, 1, 2, 3, 4]
  .map((i) => `    <div class="pend${i === 0 ? ' swing' : i === 4 ? ' swing late' : ''}" style="--i:${i}"><i class="thread front"></i><i class="thread back"></i><b class="ball"></b></div>`)
  .join('\n');

export const snippetsCradle: Record<string, Snippet> = {
  cradle: {
    how: [
      'The frame is three boxes, each one element: the div is the front face, its <code>::before</code> is the top laid back with <code>rotateX(-90deg)</code> from its top edge, and its <code>::after</code> is the end wall turned back with <code>rotateY(90deg)</code> from its left edge. Each face is a flat colour a step lighter or darker, which is what reads as one light from the upper left.',
      'A pendulum is one wrapper whose <code>transform-origin</code> is at its top, on the underside of the bar where the threads are tied. Only that wrapper is animated, with <code>rotate()</code>, so the threads and the ball turn as one rigid thing about the pivot and the ball follows a real arc, rising as it swings out. Two threads sit 16 units in front of and behind the ball and lean in with <code>rotateX</code> to meet it: the V of a real cradle, and the reason the cradle needs depth at all.',
      'One <code>@keyframes</code> block does both swings. Out on a sine ease-out (a pendulum slows to a stop at the top), back on a sine ease-in (it gathers speed on the way down), each half a quarter of the period: the return mirrors the departure exactly, so the ball meets the row at the speed it left and nothing pops at the impact. The right ball runs the same animation half a period later (a negative <code>animation-delay</code>) with <code>--a</code> flipped, so the two swings can never drift apart.',
      'At 0% both outer balls hang straight, which is the pose a paused card shows, and at 100% they hang straight again, so the loop has no seam. The middle three never move: in a cradle the impulse passes straight through them.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the bar is 250 units long, a thread 100, a ball 26 across, so the cradle is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="cradle" role="img" aria-label="Loading: a Newton's cradle">
    <div class="box bar"></div>
    <div class="box post left"></div>
    <div class="box post right"></div>
${PENDULUMS}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the cradle is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.34vmin;
  perspective: calc(800 * var(--u));
}

/* the whole cradle, seen a little from above and from the left so the top and the ends of the
   frame show. 250 units wide: the outer balls need room to swing clear of the posts */
.cradle {
  position: relative;
  width: calc(250 * var(--u));
  height: calc(155 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(-12deg) rotateY(20deg);
}

/* a box of the frame: the div is its front face, 20 units before the balls' plane, and the box
   is 40 units deep behind it. The top and one end are the pseudo-elements below */
.box {
  position: absolute;
  background: #8b6cff;
  transform-style: preserve-3d;
  transform: translateZ(calc(20 * var(--u)));
}
.box::before,
.box::after {
  content: '';
  position: absolute;
}
/* the top: laid back from its top edge, so it runs from the front face to the back */
.box::before {
  left: 0;
  right: 0;
  top: 0;
  height: calc(40 * var(--u));
  background: #bda9ff;
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
}
/* the end wall: turned back from its left edge. Only the left ends face the camera from here,
   so each box gets just that one */
.box::after {
  top: 0;
  bottom: 0;
  left: 0;
  width: calc(40 * var(--u));
  background: #5b45b8;
  transform-origin: 0 50%;
  transform: rotateY(90deg);
}
.bar {
  left: 0;
  top: 0;
  width: calc(250 * var(--u));
  height: calc(10 * var(--u));
}
/* the posts start one unit up inside the bar, so the two same-coloured faces overlap instead of
   meeting at an antialiased hairline */
.post {
  top: calc(9 * var(--u));
  width: calc(10 * var(--u));
  height: calc(146 * var(--u));
}
.post.left { left: 0; }
.post.right { left: calc(240 * var(--u)); }
/* the posts' tops are under the bar */
.post::before { display: none; }

/* a pendulum: hung from the underside of the bar, its origin at the top where the threads are
   tied, so rotate() swings threads and ball as one rigid thing about that pivot */
.pend {
  --a: 0;
  position: absolute;
  top: calc(10 * var(--u));
  left: calc((60 + var(--i) * 26) * var(--u));
  width: calc(26 * var(--u));
  height: calc(113 * var(--u));
  transform-style: preserve-3d;
  transform-origin: 50% 0;
  animation: swing 2s infinite;
}
/* CSS's y axis points down, so a positive rotate() is clockwise on screen and carries a hanging
   ball to the LEFT: out, for the left ball */
.pend.swing { --a: 26; }
/* the right ball: the same swing, mirrored, half a period later */
.pend.late { --a: -26; animation-delay: -1s; }

/* the threads: 16 units in front of and behind the ball, leaning in to meet it.
   sqrt(100² + 16²) = 101.3 long, atan(16 / 100) = 9.1° off vertical */
.thread {
  position: absolute;
  top: 0;
  left: calc(50% - 0.75 * var(--u));
  width: calc(1.5 * var(--u));
  height: calc(101.3 * var(--u));
  background: currentColor;
  opacity: 0.55;
  transform-origin: 50% 0;
}
.thread.front { transform: translateZ(calc(16 * var(--u))) rotateX(-9.1deg); }
.thread.back { transform: translateZ(calc(-16 * var(--u))) rotateX(9.1deg); }

/* the ball: a brass sphere from one radial gradient, no filter */
.ball {
  position: absolute;
  top: calc(87 * var(--u));
  left: 0;
  width: calc(26 * var(--u));
  height: calc(26 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 36% 32%, #fff4dc 0 6%, #ffb547 30%, #c9791a 64%, #6a3c0a 100%);
}

/* out on a sine ease-out (slowing to a stop), back on a sine ease-in (gathering speed): the
   return is the departure mirrored, so the ball meets the row at the speed it left. The second
   half is still: that is when the other ball swings. 0% and 100% are the same pose */
@keyframes swing {
  0% { transform: rotate(0deg); animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1); }
  25% { transform: rotate(calc(var(--a) * 1deg)); animation-timing-function: cubic-bezier(0.12, 0, 0.39, 0); }
  50%, 100% { transform: rotate(0deg); }
}`,
  },
};
