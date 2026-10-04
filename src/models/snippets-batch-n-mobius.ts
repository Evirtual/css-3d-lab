import type { Snippet } from './snippet-utils';

/** mobius: 48 segments round the ring; --i places each one and sets its share of the half-twist. */
const N = 48;
const SEGMENTS = Array.from({ length: N }, (_, i) => `      <i style="--i:${i}"></i>`).join('\n');

/** Copy-paste version of the Möbius strip (batch-n-mobius.ts): plain HTML + CSS, no JS. */
export const snippetsMobius: Record<string, Snippet> = {
  mobius: {
    how: [
      'The ring is the carousel trick: 48 thin segments in one spot, each turned to its place with <code>rotateY(i × 7.5deg)</code> and pushed out with <code>translateZ(100 units)</code>, so together they close a loop of radius 100.',
      'The twist is one more turn on each segment, about the band’s own direction (its local x axis): <code>rotateX(i × 3.75deg)</code>. That is half of the ring angle, so over the full 360° the band turns 180°: the last segment meets the first one upside down. That half-twist is all a Möbius strip is.',
      'Each segment has two faces, its <code>::before</code> and its <code>::after</code> turned <code>rotateY(180deg)</code>, both with <code>backface-visibility: hidden</code>, so whichever side faces you is the one drawn. Because of the half-twist, the front of the last segment runs straight on into the back of the first: there is only one surface.',
      'The colour proves it. One gradient, violet → pink → amber → teal → violet, is laid along twice the band’s length, and every face shows its own slice of it with <code>background-position</code>: the fronts get the first lap, the backs the second. Follow any colour round and you come back to it on the other side, with no seam anywhere.',
      'Only the ring is animated, a <code>linear</code> <code>rotateY</code> from 0 to 360°, so the loop has no join; the tilt is a static wrapper. Every length is a multiple of one base unit, <code>--u</code>, so the strip is the same share of a card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="mobius" role="img" aria-label="A Möbius strip: a band with one half-twist, turning slowly">
    <div class="tilt">
      <b class="shadow"></b>
      <div class="ring">
${SEGMENTS}
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the strip is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.32vmin;
  perspective: calc(800 * var(--u));
}

.mobius {
  --r: calc(100 * var(--u));      /* the ring's radius */
  --h: calc(64 * var(--u));       /* the band's width (its height before the twist) */
  --seg: calc(13.09 * var(--u));  /* one segment's share of the loop: 2π × 100 / 48 */
  /* the box is as long as the longest edge any segment needs: where the band lies flat its outer
     edge runs at radius 132, where a share is 17.3 units, plus 3 of overlap. Each face is then cut to its own
     trapezoid (below), so no segment pokes out past its neighbours */
  --w: calc(20.4 * var(--u));
  width: calc(240 * var(--u));
  height: calc(170 * var(--u));
  display: grid;
  place-items: center;
  transform-style: preserve-3d;
}

/* seen from a little above, so the far half of the loop shows over the near half. Lifted 14
   units, because the perspective draws the near half bigger and lower than the far one */
.tilt {
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform: translateY(calc(-14 * var(--u))) rotateX(-32deg);
}

/* a soft shadow on the floor under the loop; it stays put while the strip turns */
.shadow {
  position: absolute;
  left: calc(-120 * var(--u));
  top: calc(-120 * var(--u));
  width: calc(240 * var(--u));
  height: calc(240 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(20 16 48 / 0.32), transparent);
  transform: translateY(calc(78 * var(--u))) rotateX(90deg);
}

.ring {
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: turn 18s linear infinite;
}

/* one segment: rotateY to its place on the ring, out by the radius, then turned about the band's
   own direction by half the ring angle. --s is how far that turn has tilted it: its bottom edge
   then runs 32 × s units further out than the radius and its top edge as far in */
.ring > i {
  --s: sin(var(--i) * 3.75deg);
  position: absolute;
  left: calc(var(--w) / -2);
  top: calc(var(--h) / -2);
  width: var(--w);
  height: var(--h);
  transform-style: preserve-3d;
  transform: rotateY(calc(var(--i) * 7.5deg)) translateZ(var(--r)) rotateX(calc(var(--i) * 3.75deg));
}

/* the two faces: the same gradient, 96 segments long (twice round), each face showing its slice.
   Over it, the band's two edges are lit, so its one boundary reads as a single continuous curve,
   and a shade: the light is overhead, which a turn about the vertical axis never changes, so a
   face can carry its own shade from how far it faces up. The twist tilts the front face up by
   --s and the back face down by as much (a little lighter there, so the amber stays amber) */
.ring > i::before,
.ring > i::after {
  content: '';
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  /* a trapezoid: each edge is as long as its own radius × 7.5° (0.1309 rad), plus 3 units of
     overlap so no seam shows. Symmetric, so the turned-round back face needs the same cut */
  clip-path: polygon(calc((4.31 + 4.19 * var(--s)) / 2 * var(--u)) 0, calc(100% - (4.31 + 4.19 * var(--s)) / 2 * var(--u)) 0, calc(100% - (4.31 - 4.19 * var(--s)) / 2 * var(--u)) 100%, calc((4.31 - 4.19 * var(--s)) / 2 * var(--u)) 100%);
  background:
    linear-gradient(rgb(255 255 255 / 0.3) 0 calc(1.2 * var(--u)), rgb(255 255 255 / 0) calc(4 * var(--u)) calc(100% - 4 * var(--u)), rgb(255 255 255 / 0.3) calc(100% - 1.2 * var(--u))),
    linear-gradient(rgb(46 14 58 / var(--shade)), rgb(46 14 58 / var(--shade))), /* a plum shade: navy over amber reads olive */
    var(--lap) 0 0 / calc(96 * var(--seg)) 100% repeat-x;
}

/* the front: the first lap, t = 0 → 1, left to right along the band */
.ring > i::before {
  --lap: linear-gradient(90deg, #8b6cff, #ff4d9d 25%, #ffb547 50%, #2ee6d6 75%, #8b6cff);
  --shade: calc(0.2 - 0.2 * var(--s));
  background-position: 0 0, 0 0, calc(var(--w) / 2 - var(--i) * var(--seg)) 0;
}

/* the back: turned round, so its own left edge is the band's far end. It shows the second lap,
   t = 1 → 2, from a gradient drawn the other way round */
.ring > i::after {
  --lap: linear-gradient(270deg, #8b6cff, #ff4d9d 25%, #ffb547 50%, #2ee6d6 75%, #8b6cff);
  --shade: calc(0.2 + 0.16 * var(--s));
  background-position: 0 0, 0 0, calc((var(--i) - 48) * var(--seg) + var(--w) / 2) 0;
  transform: rotateY(180deg);
}

/* a whole turn, linear: 360deg is the pose 0deg started in */
@keyframes turn {
  from { transform: rotateY(0deg); }
  to   { transform: rotateY(-360deg); }
}`,
  },
};
