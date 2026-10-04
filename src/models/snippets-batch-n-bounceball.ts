import type { Snippet } from './snippet-utils';

export const snippetsBounceball: Record<string, Snippet> = {
  bounceball: {
    how: [
      'Gravity is two <code>cubic-bezier</code> curves. <code>cubic-bezier(1/3, 0, 2/3, 1/3)</code> is exactly <code>t²</code>: the ball leaves the top at rest and falls faster and faster. <code>cubic-bezier(1/3, 2/3, 2/3, 1)</code> is its mirror, <code>1 − (1 − t)²</code>: it leaves the floor fast and slows to a stop. Between them the height traces a true parabola, and since the climb ends at the speed the fall began, zero, the top of the loop has no seam.',
      'The ball is three nested boxes, each doing one job: <code>.hop</code> moves it up and down, <code>.squash</code> changes its shape, and <code>.ball</code> is the painted sphere. The squash wrapper\'s <code>transform-origin</code> is the bottom of the ball, the point that touches the tile, so <code>scale3d(1.25, 0.66, 1.25)</code> flattens it onto the floor instead of shrinking it into the air. It stretches tall as it arrives and leaves, flattens at the middle of the contact, and keeps roughly its volume throughout (1.25² × 0.66 ≈ 1).',
      'The shadow is a soft radial gradient laid on the tile\'s top face, so it lies in the floor plane and the perspective makes it an ellipse for free. It runs on the same two curves as the fall: small and faint while the ball is high, full size and dark as it lands, a little wider again while the ball is squashed. Only its <code>transform</code> and <code>opacity</code> change.',
      'The tile is a top face laid flat with <code>rotateX(90deg)</code> and two edges, each a step darker, under one light from above. The ball is a disc, so after the whole rig is turned it is turned back by the inverse rotation and always faces the camera as a circle.',
      'At 0% the ball is at the top of its arc, still, with its shadow at its smallest: a whole pose for a paused card. Every length is a multiple of one base unit, <code>--u</code>, so the scene is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="rig" role="img" aria-label="Loading: a ball bouncing on a floor tile">
    <div class="tile"><i class="shadow"></i></div>
    <div class="edge front"></div>
    <div class="edge side"></div>
    <div class="hop"><div class="squash"><b class="ball"></b></div></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the scene is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.215vmin;
  perspective: calc(800 * var(--u));
}

/* the floor and the ball, seen a little from above and from the right. The floor's top is 260
   units down the rig; the ball rests on it at the middle of the tile. The tile's near corner
   hangs below the rig, so the rig is lifted to centre the drawing */
.rig {
  position: relative;
  width: calc(190 * var(--u));
  height: calc(274 * var(--u));
  transform-style: preserve-3d;
  transform: translateY(calc(-32 * var(--u))) rotateX(-20deg) rotateY(-30deg);
}

/* the tile's top: laid flat from its top edge, then pulled back by half its depth so it is
   centred under the ball. Faint rings mark where the ball lands */
.tile {
  position: absolute;
  left: 0;
  top: calc(260 * var(--u));
  width: calc(190 * var(--u));
  height: calc(190 * var(--u));
  border-radius: calc(6 * var(--u));
  background:
    radial-gradient(circle, transparent 27%, rgb(255 255 255 / 0.22) 28% 30%, transparent 31% 43%, rgb(255 255 255 / 0.12) 44% 45.5%, transparent 46.5%),
    linear-gradient(135deg, #a993ff, #7a5cf0);
  transform-origin: 50% 0;
  transform: translateZ(calc(-95 * var(--u))) rotateX(90deg);
}

/* the two edges that face the camera from here, each a step darker than the top */
.edge {
  position: absolute;
  top: calc(260 * var(--u));
  width: calc(190 * var(--u));
  height: calc(14 * var(--u));
}
.edge.front {
  left: 0;
  background: #5b40d0;
  transform: translateZ(calc(95 * var(--u)));
}
.edge.side {
  left: calc(190 * var(--u));
  background: #432fa3;
  transform-origin: 0 50%;
  transform: translateZ(calc(95 * var(--u))) rotateY(90deg);
}

/* the shadow lies in the tile's own plane, so the perspective draws it as an ellipse. It grows
   and darkens as the ball comes down, on the same curves as the fall */
.shadow {
  position: absolute;
  left: calc(57 * var(--u));
  top: calc(57 * var(--u));
  width: calc(76 * var(--u));
  height: calc(76 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(18 8 56 / 0.75), rgb(18 8 56 / 0.4) 55%, rgb(18 8 56 / 0));
  animation: shadow 1.2s infinite;
}

/* the ball, resting on the middle of the tile; .hop lifts it, .squash shapes it */
.hop {
  position: absolute;
  left: calc(65 * var(--u));
  top: calc(200 * var(--u));
  width: calc(60 * var(--u));
  height: calc(60 * var(--u));
  transform-style: preserve-3d;
  animation: hop 1.2s infinite;
}
/* the origin is the point that touches the floor, so the ball flattens onto the tile */
.squash {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform-origin: 50% 100%;
  animation: squash 1.2s infinite;
}
/* a disc painted as a sphere, turned back by the rig's rotateX(-20deg) rotateY(-30deg) so it
   always faces the camera as a circle */
.ball {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #ffe3f0 0 7%, #ff4d9d 36%, #b3165e 74%, #5c0730 100%);
  transform: rotateY(30deg) rotateX(20deg);
}

/* the fall on t² (1/3, 0, 2/3, 1/3), a moment on the floor, the climb on its mirror: the
   height is a parabola and both ends of the loop are the top of the arc, at rest */
@keyframes hop {
  0% { transform: translateY(calc(-180 * var(--u))); animation-timing-function: cubic-bezier(0.333, 0, 0.667, 0.333); }
  44% { transform: translateY(0); animation-timing-function: linear; }
  56% { transform: translateY(0); animation-timing-function: cubic-bezier(0.333, 0.667, 0.667, 1); }
  100% { transform: translateY(calc(-180 * var(--u))); }
}

/* round at the top, stretched along its path when it is fastest, flat at the middle of the
   contact. x and z together, so it spreads both ways on the floor */
@keyframes squash {
  0%, 26%, 74%, 100% { transform: scale3d(1, 1, 1); }
  44%, 56% { transform: scale3d(0.9, 1.2, 0.9); }
  50% { transform: scale3d(1.25, 0.66, 1.25); }
}

/* small and faint high up, full and dark at the landing, a little wider while squashed */
@keyframes shadow {
  0% { transform: scale(0.42); opacity: 0.4; animation-timing-function: cubic-bezier(0.333, 0, 0.667, 0.333); }
  44% { transform: scale(1); opacity: 0.85; animation-timing-function: ease-in-out; }
  50% { transform: scale(1.12); opacity: 0.95; animation-timing-function: ease-in-out; }
  56% { transform: scale(1); opacity: 0.85; animation-timing-function: cubic-bezier(0.333, 0.667, 0.667, 1); }
  100% { transform: scale(0.42); opacity: 0.4; }
}`,
  },
};
