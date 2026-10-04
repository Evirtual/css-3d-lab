import type { Snippet } from './snippet-utils';

/** n lines of markup, one per index, indented. */
const lines = (n: number, fn: (i: number) => string, indent: string): string =>
  Array.from({ length: n }, (_, i) => indent + fn(i)).join('\n');

/**
 * The bullet's angled tip. The cut is one plane through the bullet's axis, rising 37° from its low
 * side, which faces FACE (45° round to the front left, toward the light), to its tip at the back
 * right, 20.19 units out (19.5 / cos 15°, a corner of the 12-gon). A point `out` units from the
 * axis at angle a sits (20.19 + out × cos(a − FACE)) × tan 37° below the tip. Every strip is cut to
 * it: a strip is 12.8 wide, so its two top edges stand 6.4 either side of its middle, 20.52 out, at
 * i × 30 ∓ 18.2°. Those two drops are written on each strip as --dl and --dr, and its clip-path
 * cuts its top from one to the other: a strip is flat, so that straight cut lies on the plane.
 */
const FACE = -45;
const TAN = Math.tan((37 * Math.PI) / 180);
const RAD = Math.PI / 180;
const drop = (deg: number, out: number) => Math.round((20.19 + out * Math.cos((deg - FACE) * RAD)) * TAN * 100) / 100;
const EDGE = Math.hypot(19.5, 6.4); // 20.52
const SPREAD = Math.atan(6.4 / 19.5) / RAD; // 18.2deg
const BULLET = lines(12, (i) => `<i style="--i:${i}; --dl:${drop(i * 30 - SPREAD, EDGE)}; --dr:${drop(i * 30 + SPREAD, EDGE)}"></i>`, '              ');
/** An inner core's strips: turned half a strip (--i: 0.5, 1.5 ...), so each one's middle stands
    right behind a seam of the wall round it. */
const CORE = (indent: string) => lines(12, (i) => `<i style="--i:${i}.5"></i>`, indent);

/** Copy-paste version of the twist-up lipstick (batch-n-lipstick.ts): plain HTML + CSS, no JS. */
export const snippetsLipstick: Record<string, Snippet> = {
  lipstick: {
    how: [
      'The case, the cap and the bullet are all the same cylinder: twelve strips at <code>rotateY(i × 30deg) translateZ(radius)</code>, each wider than a side of the 12-gon so neighbours overlap. Overlap alone still lets a hairline through where two anti-aliased edges share a pixel, so the case and the cap each hide a second, thinner tube of the same paint behind their walls, turned half a strip so a solid middle backs every seam. Each strip carries its own light as a horizontal gradient from the shade at its left edge to the shade at its right (<code>cos()</code> of those two angles), so the twelve facets blend into one smooth, lacquered curve with a highlight down the side that faces the lamp.',
      'The angled tip is twelve cuts of one plane. A plane rising 37° from the front left to the back right meets strip <i>i</i> at a height set by the cosine of its angle from that side, so each strip gets a <code>clip-path</code> polygon whose top runs from its left corner’s height to its right corner’s. Over them lies one ellipse, turned to that side with <code>rotateY(-45deg)</code> and tipped back <code>rotateX(53deg)</code> (90° − 37°): the cut face itself.',
      'The twist is real: the bullet’s wrapper goes from <code>translateY(0) rotateY(0)</code> to <code>translateY(-66 units) rotateY(360deg)</code>, so it turns a full circle as it rises, and the slanted tip sweeps round once and comes back facing you. A full turn also returns every strip’s painted light to where it started.',
      'The cap is three nested wrappers, one per move: up off the collar, across, and down to the floor. Each move has its own <code>transition-delay</code>: the cap comes off, the two slide apart, the bullet twists up while the cap is held beside it, and only then is the cap set down. The resting state carries the same delays in reverse, so on the way back the cap is picked up, the bullet sinks, and only then does the cap come home. The lipstick slides left as the cap goes right, so the pair stays centred at every moment.',
      'The hovered element is a static wrapper with <code>tabindex="0"</code>, so focus opens it too, and everything that moves has <code>pointer-events: none</code>. Every length is a multiple of one base unit, <code>--u</code>, so the lipstick is the same share of a card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="lipstick" tabindex="0" role="img" aria-label="A lipstick: hover or focus to take the cap off and twist the bullet up">
    <div class="pose">
      <div class="body">
        <b class="shadow"></b>
        <div class="case cyl">
${lines(12, (i) => `<i style="--i:${i}"></i>`, '          ')}
        </div>
        <div class="case-core cyl">
${CORE('          ')}
        </div>
        <b class="rim"></b>
        <div class="lift">
          <div class="bullet cyl">
${BULLET}
          </div>
          <b class="cut"></b>
        </div>
      </div>
      <div class="cap-x">
        <b class="shadow cap-shadow"></b>
        <div class="cap-up">
          <div class="cap-down">
            <div class="cap cyl">
${lines(12, (i) => `<i style="--i:${i}"></i>`, '              ')}
            </div>
            <div class="cap-core cyl">
${CORE('              ')}
            </div>
            <b class="cap-top"></b>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the lipstick is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.33vmin;
  perspective: calc(800 * var(--u));
}

/* the static hit area: the closed lipstick's own box. It never moves, so the hover cannot flicker
   at its edges, and the pieces that slide apart past it keep it hovered while the pointer stays */
.lipstick {
  --lacquer: #2f2366;
  display: grid;
  place-items: center;
  position: relative;
  width: calc(64 * var(--u));
  height: calc(184 * var(--u));
  cursor: pointer;
  outline: none;
  transform-style: preserve-3d;
}

/* the focus ring goes round the open pair, not the closed box, since focus opens it: drawn by a
   pseudo-element that takes no pointer, so the hit area stays the closed lipstick's box */
.lipstick:focus-visible::before {
  content: '';
  position: absolute;
  inset: calc(-8 * var(--u)) calc(-36 * var(--u));
  border: calc(2 * var(--u)) solid #8b6cff;
  border-radius: calc(14 * var(--u));
  pointer-events: none;
}

/* 0 × 0 at the middle of the floor; seen a little from above. Set down 85 units so the closed
   lipstick and the open pair (the cap held up off the collar is the tallest moment) sit centred */
.pose {
  width: 0;
  height: 0;
  pointer-events: none;
  transform-style: preserve-3d;
  transform: translateY(calc(85 * var(--u))) rotateX(-14deg);
}

.pose div {
  position: absolute;
  transform-style: preserve-3d;
}

/* --- every cylinder: twelve strips round the axis, each lit by the angle it faces --- */
.cyl > i {
  --a: calc(var(--i) * 30deg);
  /* how squarely its left and right edges face the lamp, which is 35deg round to the left */
  --l: cos(var(--a) + 20deg);
  --r: cos(var(--a) + 50deg);
  position: absolute;
  left: calc(var(--w) / -2);
  top: var(--top);
  width: var(--w);
  height: var(--h);
  background: var(--paint);
  transform: rotateY(var(--a)) translateZ(var(--rad));
}
.cyl > i::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgb(255 255 255 / calc(max(0, var(--l) - 0.78) * 2.4)), rgb(255 255 255 / calc(max(0, var(--r) - 0.78) * 2.4))),
    linear-gradient(90deg, rgb(8 4 26 / calc(0.4 - 0.4 * var(--l))), rgb(8 4 26 / calc(0.4 - 0.4 * var(--r))));
}

/* the case: radius 24, 100 tall. A gold collar on top, violet lacquer, a gold foot. The wall
   shows its outside only; the core inside it (below) shows both sides, so from above you look
   into the tube and see the core's far side, in the same paint. A wall strip seen from inside,
   edge-on at the side, was sorted over the cap and left a gold pixel at the cap's edge */
.case,
.case-core {
  --top: calc(-100 * var(--u));
  --h: calc(100 * var(--u));
  --paint:
    linear-gradient(#ffe7b0, #ffb547 9%, #b8720f 21%, #1c1440 21% 23%, transparent 23% 95%, #b8720f 95%, #ffb547) ,
    var(--lacquer);
}
.case {
  --rad: calc(24 * var(--u));
  --w: calc(14 * var(--u)); /* a side of the 12-gon is 12.86: the rest is overlap */
}
.case > i { backface-visibility: hidden; }
/* overlap alone does not close a seam: where two strips' anti-aliased edges meet, each only
   partly covers the same pixel, and a hairline of whatever is behind (the pink bullet) shows.
   So a second, inner tube of the same paint stands behind the wall, turned half a strip so a
   strip's middle backs every seam: a gap now shows the case's own colour. Radius 22.5 keeps
   even its corners (22.5 cos 15 + 6.5 sin 15 = 23.4) inside the wall and clear of the bullet */
.case-core {
  --rad: calc(22.5 * var(--u));
  --w: calc(13 * var(--u));
}

/* the rim of the tube: a gold ring laid flat on the collar, open in the middle for the bullet,
   whose widest edges (20.52 out) pass through it as it rises: the opening is 20.7 */
.rim {
  position: absolute;
  left: calc(-25 * var(--u));
  top: calc(-25 * var(--u));
  width: calc(50 * var(--u));
  height: calc(50 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, transparent calc(20.7 * var(--u)), #8a5409 calc(20.9 * var(--u)), #ffd27a calc(22.3 * var(--u)), #d1902a);
  /* a third of a unit above the tube's top edges, not on them: a ring that touches the edges of
     the wall and the core is cut up by the renderer's depth sort and comes out speckled */
  transform: translateY(calc(-100.3 * var(--u))) rotateX(90deg);
}

/* --- the bullet: radius 19.5, its strips cut to the slanted plane, the cut face over them --- */
.bullet {
  --rad: calc(19.5 * var(--u));
  /* a side of the 12-gon is 10.45: each strip runs 1.2 past both corners, so where two meet,
     one's edge lies on the other's solid paint, never on its anti-aliased edge (with only a
     sliver of overlap, both edges half-cover the same pixel and a hairline shows through). The
     bullet gets no inner core: a core's strips would cross the cut face and crack it */
  --w: calc(12.8 * var(--u));
  --top: calc(-99.2 * var(--u));
  --h: calc(79.2 * var(--u));
  --paint: linear-gradient(#ff6aac, #e8327f 45%, #b51a5d);
}
.bullet > i {
  backface-visibility: hidden;
  clip-path: polygon(0 calc(var(--dl) * var(--u)), 100% calc(var(--dr) * var(--u)), 100% 100%, 0 100%);
}

/* the cut face: an ellipse 20.5 wide each side (just past the strips' top edges, 20.52 out) and
   20.5 / cos 37deg along the slope, centred on the axis halfway up the cut, turned to face the
   front left and tipped back by 90 - 37 = 53deg */
.cut {
  position: absolute;
  left: calc(-20.5 * var(--u));
  top: calc(-25.67 * var(--u));
  width: calc(41 * var(--u));
  height: calc(51.34 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 42% 36%, #ffb3d4, #ff4d9d 45%, #d02a72);
  transform: translateY(calc(-84 * var(--u))) rotateY(-45deg) rotateX(53deg);
}

/* --- the cap: radius 26.5, 84 tall, its bottom 78 up, over the collar --- */
.cap,
.cap-core {
  /* --dt: how far below the cap's top this tube starts (its gold line stays at the cap's 5) */
  --top: calc(var(--dt) - 84 * var(--u));
  --h: calc(84 * var(--u) - var(--dt));
  --paint:
    linear-gradient(transparent calc(5 * var(--u) - var(--dt)), #ffb547 calc(5 * var(--u) - var(--dt)) calc(6.5 * var(--u) - var(--dt)), transparent calc(6.5 * var(--u) - var(--dt)) calc(100% - 10 * var(--u)), #b8720f calc(100% - 10 * var(--u)), #ffd78a calc(100% - 6 * var(--u)), #b8720f),
    var(--lacquer);
}
.cap {
  --dt: 0px;
  --rad: calc(26.5 * var(--u));
  --w: calc(15.2 * var(--u));
}
/* the cap's own core, for the same reason: without it a seam showed the stage, the case's gold
   collar and the pink tip inside. Radius 25.4 sits between the case's widest corners (25.0) and
   the cap wall, and its strips are narrow, 11, so even their corners stay half a unit inside
   the wall (25.4 cos 15 + 5.5 sin 15 = 25.95): any closer and the renderer can sort a core corner
   in front of the wall and draw a faint line of its own. Its gaps sit behind the wall's solid
   middles. It starts a unit below the cap's top (--dt) and shows its outside only: its edges
   touching the lid, or its inside showing, both upset the depth sort round the lid's rim */
.cap-core {
  --dt: calc(1 * var(--u));
  --rad: calc(25.4 * var(--u));
  --w: calc(11 * var(--u));
}
.cap > i, .cap-core > i { backface-visibility: hidden; }
.cap-top {
  position: absolute;
  left: calc(-27.5 * var(--u));
  top: calc(-27.5 * var(--u));
  width: calc(55 * var(--u));
  height: calc(55 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 40% 38%, #5a4aa6, var(--lacquer) 60%, #1f1747 92%, #ffb547 93% 97%, #b8720f 98%);
  transform: translateY(calc(-84 * var(--u))) rotateX(90deg);
}

/* soft shadows on the floor; the cap's follows it across and shows once it is down */
.shadow {
  position: absolute;
  left: calc(-40 * var(--u));
  top: calc(-40 * var(--u));
  width: calc(80 * var(--u));
  height: calc(80 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(16 10 40 / 0.45), transparent);
  transform: rotateX(90deg);
}
.cap-shadow {
  opacity: 0;
  transition: opacity 0.2s;
}

/* --- the moves. At rest the cap sits on the collar (bottom 78 up). Closing, the delays run in
   reverse: the cap is picked up off the floor (0s), the bullet sinks (0.5s), the cap comes
   across (1.4s) and settles back on the collar (2.2s). The moves overlap, so no one step is a
   jump, and the cap is never down while the bullet is: the pair never sits low and short --- */
.lift { transition: transform 1s cubic-bezier(0.45, 0, 0.25, 1) 0.5s; }
.cap-down {
  transform: translateY(calc(-78 * var(--u)));
  transition: transform 0.5s cubic-bezier(0.45, 0, 0.25, 1);
}
.body,
.cap-x { transition: transform 0.9s cubic-bezier(0.45, 0, 0.25, 1) 1.4s; }
.cap-up { transition: transform 0.45s cubic-bezier(0.3, 0, 0.2, 1) 2.2s; }

/* opening: up off the collar (0s), apart (0.25s: the lipstick left, the cap right, so the pair
   stays centred), the bullet twisting up a full turn as soon as the cap is clear of it (0.9s: by
   then they are 46 units apart, the two radii), and the cap set down beside it (1.7s) */
.lipstick:hover .cap-up,
.lipstick:focus-visible .cap-up,
.lipstick:focus-within .cap-up {
  transform: translateY(calc(-22 * var(--u)));
  transition-delay: 0s;
  transition-timing-function: cubic-bezier(0.25, 0.6, 0.3, 1);
}
.lipstick:hover .body,
.lipstick:focus-visible .body,
.lipstick:focus-within .body {
  transform: translateX(calc(-34 * var(--u)));
  transition-delay: 0.25s;
}
.lipstick:hover .cap-x,
.lipstick:focus-visible .cap-x,
.lipstick:focus-within .cap-x {
  transform: translateX(calc(34 * var(--u)));
  transition-delay: 0.25s;
}
.lipstick:hover .cap-down,
.lipstick:focus-visible .cap-down,
.lipstick:focus-within .cap-down {
  transform: translateY(calc(22 * var(--u)));
  transition-duration: 0.75s;
  transition-delay: 1.7s;
}
.lipstick:hover .cap-shadow,
.lipstick:focus-visible .cap-shadow,
.lipstick:focus-within .cap-shadow {
  opacity: 1;
  transition: opacity 0.4s 2.05s;
}
.lipstick:hover .lift,
.lipstick:focus-visible .lift,
.lipstick:focus-within .lift {
  transform: translateY(calc(-66 * var(--u))) rotateY(360deg);
  transition-duration: 1.4s;
  transition-delay: 0.9s;
}`,
  },
};
