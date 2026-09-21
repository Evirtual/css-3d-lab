import type { Snippet } from './snippet-utils';

/** n lines of markup, one per index. */
const lines = (n: number, fn: (i: number) => string): string => Array.from({ length: n }, (_, i) => fn(i)).join('\n');

/** Copy-paste versions of batch A (solids built from flat faces). */
export const snippetsA: Record<string, Snippet> = {
  prism: {
    how: [
      'The six side panels are a carousel with no gaps: each gets <code>rotateY(i × 60deg)</code>, then <code>translateZ</code> by the <b>apothem</b>, the distance from the centre to the middle of a side.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the prism is the same share of a gallery card, the editor and a recording canvas. The numbers below are those units.',
      'Apothem = <code>(side / 2) / tan(180° / 6)</code>. For 60-wide panels that is 51.96. Any less and the panels cross; any more and the corners open.',
      'A cap is a <code>2 × side</code> by <code>2 × apothem</code> box cut to a hexagon with <code>clip-path</code>. <code>clip-path</code> would flatten a 3D container, but the caps have no 3D children, so it is safe here.',
      '<code>rotateX(90deg)</code> lays a cap flat; <code>translateZ(height / 2)</code> then lifts it along its new normal to the top (and <code>-90deg</code> for the bottom).',
    ],
    html: `<div class="scene">
  <div class="prism">
${lines(6, (i) => `    <i style="--i:${i}"></i>`)}
    <b></b>
    <b></b>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the prism is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.33vmin;
  perspective: calc(800 * var(--u));
}

.prism {
  --w: calc(60 * var(--u));    /* one side of the hexagon = one panel */
  --h: calc(110 * var(--u));
  --r: calc(51.96 * var(--u)); /* apothem = (w / 2) / tan(180deg / 6) */
  position: relative;
  width: var(--w);
  height: var(--h);
  transform-style: preserve-3d;
  animation: tumble 18s linear infinite;
}

.prism i {
  position: absolute;
  inset: 0;
  background: rgb(139 108 255 / 0.24);
  border: calc(1 * var(--u)) solid rgb(139 108 255 / 0.75);
  box-shadow: inset 0 0 calc(24 * var(--u)) rgb(139 108 255 / 0.3);
  /* turn to face outward, THEN step out along that direction */
  transform: rotateY(calc(var(--i) * 60deg)) translateZ(var(--r));
}

.prism i:nth-child(even) {
  background: rgb(46 230 214 / 0.2);
  border-color: rgb(46 230 214 / 0.75);
  box-shadow: inset 0 0 calc(24 * var(--u)) rgb(46 230 214 / 0.3);
}

/* caps: a regular hexagon's corner radius equals its side, so the box is 2w by 2r */
.prism b {
  position: absolute;
  left: calc(50% - var(--w));
  top: calc(50% - var(--r));
  width: calc(var(--w) * 2);
  height: calc(var(--r) * 2);
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
  background: radial-gradient(circle, rgb(255 77 157 / 0.12) 20%, rgb(255 77 157 / 0.55));
  transform: rotateX(90deg) translateZ(calc(var(--h) / 2));
}

.prism b + b {
  transform: rotateX(-90deg) translateZ(calc(var(--h) / 2));
}

/* -25deg + 360deg = 335deg: the end pose equals the start pose, so the loop is seamless */
@keyframes tumble {
  from { transform: rotateX(-25deg) rotateY(0deg); }
  to   { transform: rotateX(335deg) rotateY(360deg); }
}`,
  },

  octa: {
    how: [
      'An octahedron is two square pyramids glued at their base. Every face is the same equilateral triangle (<code>clip-path</code>), standing on one edge of the square "equator".',
      'Every length is a multiple of one base unit, <code>--u</code>, so the solid is the same share of a gallery card, the editor and a recording canvas.',
      'Hinge each triangle on its bottom edge (<code>transform-origin: 50% 100%</code>) and lean it in by <code>90° − atan(√2) ≈ 35.26°</code>: exactly enough for four tips to meet on the axis.',
      'The bottom pyramid reuses the same rule. <code>--s: -1</code> flips the triangle to point down with <code>scaleY(-1)</code> and reverses the lean, so one line of CSS builds all eight faces.',
      '<code>clip-path</code> also clips borders away, so the slanted edges are painted: a <code>to top left</code> gradient\'s 50% line runs exactly along its box diagonal.',
    ],
    html: `<div class="scene">
  <div class="octa">
${lines(8, (i) => `    <i style="--i:${i % 4}; --s:${i < 4 ? 1 : -1}"></i>`)}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the solid is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.41vmin;
  perspective: calc(800 * var(--u));
}

.octa {
  --a: calc(110 * var(--u)); /* edge length */
  position: relative;
  width: var(--a);
  height: var(--a);
  transform-style: preserve-3d;
  animation: spin 12s linear infinite;
}

.octa i {
  --c: 139 108 255;
  --alpha: 0.22;
  --edge: rgb(var(--c) / 0.85);
  position: absolute;
  left: 0;
  bottom: 50%;             /* bottom edge on the equator, through the centre */
  width: var(--a);
  height: calc(95.26 * var(--u)); /* triangle height = a × √3 / 2 */
  transform-origin: 50% 100%;
  transform:
    rotateY(calc(var(--i) * 90deg))
    translateZ(calc(var(--a) / 2))
    rotateX(calc(var(--s) * 35.26deg))  /* lean in: 90deg - atan(√2) */
    scaleY(var(--s));                   /* -1 flips the bottom four downward */
  clip-path: polygon(50% 0, 0 100%, 100% 100%);
  background:
    linear-gradient(to top left, transparent calc(50% - 1.5 * var(--u)), var(--edge) calc(50% - 1.5 * var(--u)) 50%, transparent 50%) left / 50% 100% no-repeat,
    linear-gradient(to top right, transparent calc(50% - 1.5 * var(--u)), var(--edge) calc(50% - 1.5 * var(--u)) 50%, transparent 50%) right / 50% 100% no-repeat,
    linear-gradient(var(--edge), var(--edge)) bottom / 100% calc(1.5 * var(--u)) no-repeat,
    linear-gradient(to top, rgb(var(--c) / var(--alpha)), rgb(var(--c) / 0.08));
}

.octa i:nth-child(n + 5) {
  --c: 46 230 214;
}

/* checkerboard the brightness so neighbouring faces always differ */
.octa i:nth-child(-n + 4):nth-child(odd),
.octa i:nth-child(n + 5):nth-child(even) {
  --alpha: 0.42;
}

@keyframes spin {
  from { transform: rotateZ(14deg) rotateX(-16deg) rotateY(0deg); }
  to   { transform: rotateZ(14deg) rotateX(-16deg) rotateY(360deg); }
}`,
  },

  diamond: {
    how: [
      'Every length is a multiple of one base unit, <code>--u</code>, so the stone is the same share of a gallery card, the editor and a recording canvas. The numbers below are those units.',
      'The widest ring (the <b>girdle</b>) is 8 edges, 60 units from the axis. Every facet is hinged on one of those edges: <code>rotateY(i × 45deg) translateZ(calc(60 * var(--u)))</code>.',
      '<b>Crown</b> facets stand on the girdle and lean in 45°: they rise 24 while stepping 24 inward, so their top edge is 36/60 as long. That ratio is the trapezoid\'s <code>clip-path</code>: 20% to 80%.',
      '<b>Pavilion</b> facets hang from the girdle (<code>transform-origin: top</code>) and lean in by <code>atan(60 / 72)</code> ≈ 39.8°, so a 72-deep point forms where the tips meet.',
      'The glint is a white streak on every facet that only fades in and out. Its <code>animation-delay</code> grows with <code>--i</code>, so the sparkle walks around the stone. Only <code>opacity</code> animates.',
    ],
    html: `<div class="scene">
  <div class="gem">
${lines(8, (i) => `    <i class="crown" style="--i:${i}"></i>`)}
${lines(8, (i) => `    <i class="pav" style="--i:${i}"></i>`)}
    <b></b>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the stone is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.55vmin;
  perspective: calc(800 * var(--u));
}

.gem {
  position: relative;
  width: calc(49.71 * var(--u)); /* one girdle edge = 2 × 60 × tan(180deg / 8) */
  height: calc(96 * var(--u));   /* crown 24 + pavilion 72 */
  transform-style: preserve-3d;
  animation: spin 14s linear infinite;
}

.gem i {
  --alpha: 0.2;
  position: absolute;
  left: 0;
  width: 100%;
}

.gem i:nth-child(odd) {
  --alpha: 0.4;
}

/* the glint: fades in and out, one facet after another */
.gem i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgb(255 255 255 / 0.8) 50%, transparent 70%);
  opacity: 0;
  animation: glint 3.2s ease-in-out infinite;
  animation-delay: calc(var(--i) * -0.4s + var(--late, 0s));
}

/* crown: trapezoids standing on the girdle, leaning 45deg inward */
.gem .crown {
  bottom: calc(72 * var(--u));
  height: calc(33.94 * var(--u)); /* slant = √2 × 24 */
  transform-origin: 50% 100%;
  transform: rotateY(calc(var(--i) * 45deg)) translateZ(calc(60 * var(--u))) rotateX(45deg);
  clip-path: polygon(20% 0, 80% 0, 100% 100%, 0 100%); /* top edge = 36 / 60 of the bottom */
  background:
    linear-gradient(rgb(46 230 214 / 0.8), rgb(46 230 214 / 0.8)) top / 100% calc(1.5 * var(--u)) no-repeat,
    linear-gradient(rgb(46 230 214 / 0.8), rgb(46 230 214 / 0.8)) bottom / 100% calc(1.5 * var(--u)) no-repeat,
    linear-gradient(to top, rgb(46 230 214 / var(--alpha)), rgb(46 230 214 / 0.12));
}

/* pavilion: triangles hanging from the girdle, leaning in by atan(60 / 72) */
.gem .pav {
  --late: -1.7s;
  top: calc(24 * var(--u));
  height: calc(93.72 * var(--u)); /* slant = √(72² + 60²) */
  transform-origin: 50% 0;
  transform: rotateY(calc(var(--i) * 45deg)) translateZ(calc(60 * var(--u))) rotateX(-39.81deg);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  background:
    linear-gradient(to top right, transparent 50%, rgb(139 108 255 / 0.8) 50% calc(50% + 1.2 * var(--u)), transparent calc(50% + 1.2 * var(--u))) left / 50% 100% no-repeat,
    linear-gradient(to top left, transparent 50%, rgb(139 108 255 / 0.8) 50% calc(50% + 1.2 * var(--u)), transparent calc(50% + 1.2 * var(--u))) right / 50% 100% no-repeat,
    linear-gradient(rgb(139 108 255 / var(--alpha)), rgb(255 77 157 / 0.14));
}

/* table: a flat octagon on top, 36 from the axis */
.gem b {
  position: absolute;
  left: calc(50% - 36 * var(--u));
  top: calc(-36 * var(--u));
  width: calc(72 * var(--u));
  height: calc(72 * var(--u));
  clip-path: polygon(29.29% 0, 70.71% 0, 100% 29.29%, 100% 70.71%, 70.71% 100%, 29.29% 100%, 0 70.71%, 0 29.29%);
  background: linear-gradient(135deg, rgb(46 230 214 / 0.55), rgb(255 255 255 / 0.35), rgb(46 230 214 / 0.3));
  transform: rotateX(90deg);
}

@keyframes spin {
  from { transform: rotateX(-18deg) rotateY(0deg); }
  to   { transform: rotateX(-18deg) rotateY(360deg); }
}

@keyframes glint {
  0%, 55%, 100% { opacity: 0; }
  78%           { opacity: 0.9; }
}`,
  },

  torus: {
    how: [
      'A torus is a circle swept around an axis, so build it from its cross-sections: 24 identical circles (<code>border-radius: 50%</code>).',
      'Each ring gets <code>rotateY(i × 15deg)</code> and then <code>translateX</code>, <b>not</b> <code>translateZ</code>. That keeps it in the plane through the axis, edge-on to the path, like a slice of the tube. (<code>translateZ</code> would lay it tangent, like a carousel panel.)',
      'The <code>translateX</code> distance is the radius from the hole\'s centre to the tube\'s centre; the ring size is the tube\'s thickness. Both are multiples of one base unit, <code>--u</code>, so the torus is the same share of a gallery card, the editor and a recording canvas.',
      'Colour follows <code>cos(i × 15deg)</code>: teal at ring 0, violet halfway round, teal again at the end, so there is no seam.',
    ],
    html: `<div class="scene">
  <div class="torus">
${lines(24, (i) => `    <i style="--i:${i}"></i>`)}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the ring is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.4vmin;
  perspective: calc(800 * var(--u));
}

.torus {
  position: relative;
  width: calc(40 * var(--u));  /* tube thickness */
  height: calc(40 * var(--u));
  transform-style: preserve-3d;
  animation: tumble 16s linear infinite;
}

.torus i {
  --hue: calc(214 - 39 * cos(var(--i) * 15deg)); /* 175 teal ... 253 violet ... 175 */
  position: absolute;
  inset: 0;
  border: calc(2 * var(--u)) solid hsl(var(--hue) 85% 64%);
  border-radius: 50%;
  background: hsl(var(--hue) 85% 64% / 0.14);
  box-shadow: inset 0 0 calc(10 * var(--u)) hsl(var(--hue) 85% 64% / 0.45);
  /* 24 × 15deg = 360deg; translateX keeps each ring edge-on to the circle */
  transform: rotateY(calc(var(--i) * 15deg)) translateX(calc(56 * var(--u)));
}

/* Every ring stands in a plane through the axis, so looked at straight down the axis they are
   all edge-on at once and the torus draws nothing. So it never tumbles through that view: it is
   held 50deg off it (rotateX), spins on its own axis (the inner rotateY) and swings round the
   vertical (the outer rotateY), which keeps the axis at least 40deg from the line of sight.
   Both spins end 360deg after they start, so the loop is seamless. */
@keyframes tumble {
  from { transform: rotateZ(16deg) rotateY(0deg) rotateX(-50deg) rotateY(0deg); }
  to   { transform: rotateZ(16deg) rotateY(360deg) rotateX(-50deg) rotateY(360deg); }
}`,
  },

  cone: {
    how: [
      'Place 16 thin triangles on a circle like carousel panels: <code>rotateY(i × 22.5deg) translateZ(r)</code>. Each is <code>2r × tan(180° / 16)</code> wide, so their bottom edges close the ring.',
      'Hinge them on the bottom edge and lean them back by <code>atan(r / h)</code>. That is exactly the angle at which every tip lands on the axis, <code>h</code> above the base.',
      'The triangle element must be as tall as the <b>slant</b>, <code>√(h² + r²)</code>, not <code>h</code>, because leaning shortens it.',
      'One element cannot run two transform animations, so the rocking lives on a wrapper and the spin on its child.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the cone is the same share of a gallery card, the editor and a recording canvas. The numbers above are those units.',
      'The cone is centred on what it <b>draws</b>, not on its layout box: the base is a circle lying flat at the bottom, so tipping it back swings half that circle below the base while the tip only comes down. The rock carries a <code>translateY</code> that answers it, the same in both poses.',
    ],
    html: `<div class="scene">
  <div class="cone">
    <div class="cone-body">
${lines(16, (i) => `      <i style="--i:${i}"></i>`)}
      <b></b>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the cone is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.46vmin;
  perspective: calc(800 * var(--u));
}

/* wrapper: rocks back and forth */
.cone {
  transform-style: preserve-3d;
  animation: rock 7s ease-in-out infinite alternate;
}

/* child: spins */
.cone-body {
  position: relative;
  width: calc(19.89 * var(--u)); /* triangle base = 2 × 50 × tan(180deg / 16) */
  height: calc(110 * var(--u));  /* cone height */
  transform-style: preserve-3d;
  animation: spin 10s linear infinite;
}

.cone-body i {
  --hue: calc(293 + 40 * cos(var(--i) * 22.5deg)); /* pink ... violet ... pink */
  --edge: hsl(var(--hue) 90% 68% / 0.8);
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: calc(120.83 * var(--u)); /* slant = √(110² + 50²) */
  transform-origin: 50% 100%;
  /* stand on the base circle, then lean in by atan(50 / 110) */
  transform: rotateY(calc(var(--i) * 22.5deg)) translateZ(calc(50 * var(--u))) rotateX(24.44deg);
  clip-path: polygon(50% 0, 0 100%, 100% 100%);
  /* the edge lines fade in over 1.5 units instead of starting hard: a hard line on a long,
     thin, slanted triangle is sampled unevenly and breaks into dashes */
  background:
    linear-gradient(to top left, transparent calc(50% - 2.5 * var(--u)), var(--edge) calc(50% - 1 * var(--u)) 50%, transparent 50%) left / 50% 100% no-repeat,
    linear-gradient(to top right, transparent calc(50% - 2.5 * var(--u)), var(--edge) calc(50% - 1 * var(--u)) 50%, transparent 50%) right / 50% 100% no-repeat,
    linear-gradient(to top, hsl(var(--hue) 90% 68% / 0.45), hsl(var(--hue) 90% 68% / 0.14));
}

/* base disc through the triangles' corners: 2 × 50 / cos(180deg / 16) */
.cone-body b {
  position: absolute;
  left: calc(50% - 50.98 * var(--u));
  top: calc(100% - 50.98 * var(--u));
  width: calc(101.96 * var(--u));
  height: calc(101.96 * var(--u));
  border-radius: 50%;
  background: rgb(46 230 214 / 0.26);
  border: calc(1 * var(--u)) solid rgb(46 230 214 / 0.75);
  box-shadow: inset 0 0 calc(24 * var(--u)) rgb(46 230 214 / 0.3);
  transform: rotateX(90deg);
}

/* The cone is centred on what it draws, not on its layout box: the base disc is a circle lying
   flat at the bottom, so tipping it back swings half the disc BELOW the base, while the tip only
   comes down. The lift answers that, and it is the same in both poses so the rock stays a rock. */
@keyframes rock {
  from { transform: translateY(calc(-12 * var(--u))) rotateX(-30deg) rotateZ(-6deg); }
  to   { transform: translateY(calc(-12 * var(--u))) rotateX(24deg) rotateZ(6deg); }
}

@keyframes spin {
  to { transform: rotateY(360deg); }
}`,
  },

  stairs: {
    how: [
      'Every tread is the same flat slab: a rectangle laid down with <code>rotateX(90deg)</code>.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the staircase is the same share of a gallery card, the editor and a recording canvas. The numbers below are those units — the strips even carry theirs as plain numbers in <code>--x</code>, <code>--y</code> and <code>--l</code>, and the CSS multiplies each by <code>--u</code>.',
      'The trick is <code>transform-origin: calc(-5 * var(--u)) 50%</code>, a point five units to the left of the slab, which is where the pole\'s axis is. Every rotation now pivots around the pole.',
      'One index does the rest: <code>rotateY(i × 30deg)</code> turns the tread around the pole, <code>translateY(calc(i × -8 × var(--u)))</code> lifts it one step. Turn + lift = spiral.',
      'The sides are ten thin strips round the tread\'s edge, each folded straight down by one step: the two long sides, both ends, and three short facets on each rounded corner, so the side follows the curve. The pole is two crossed planes, which read as a round post from any angle.',
    ],
    html: `<div class="scene">
  <div class="stairs">
    <b></b>
    <b></b>
${lines(14, (i) => `    <i style="--i:${i}">${'<s></s>'.repeat(10)}</i>`)}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the staircase is the same share of
     a card, the editor, a full screen and a recording canvas */
  --u: 0.41vmin;
  perspective: calc(800 * var(--u));
}

.stairs {
  position: relative;
  width: calc(130 * var(--u));
  height: calc(136 * var(--u));
  transform-style: preserve-3d;
  animation: spin 16s linear infinite;
}

.stairs i {
  --hue: calc(253 - var(--i) * 6); /* violet at the bottom, teal at the top */
  position: absolute;
  left: calc(50% + 5 * var(--u)); /* start just outside the pole */
  top: calc(98 * var(--u));
  width: calc(58 * var(--u));
  height: calc(28 * var(--u));
  /* an inner line plus a soft shade instead of a hard border: treads near eye level are seen
     almost edge-on, where a hairline breaks up; the shade survives */
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) hsl(var(--hue) 90% 82%),
    inset 0 0 calc(8 * var(--u)) hsl(var(--hue) 90% 82% / 0.25);
  border-radius: 0 calc(6 * var(--u)) calc(6 * var(--u)) 0;
  background: hsl(var(--hue) 85% 64% / 0.62);
  transform-origin: calc(-5 * var(--u)) 50%; /* on the pole's axis */
  transform-style: preserve-3d;
  transform:
    translateY(calc(var(--i) * -8 * var(--u)))  /* one step up ... */
    rotateY(calc(var(--i) * 30deg))             /* ... and 30deg further round */
    rotateX(90deg);                             /* lie flat */
}

/* The sides go all the way round the tread: both long edges, the outer end and the two rounded
   corners (three short facets each), so the side follows the rounding. Each strip starts at a
   point on the edge (--x, --y), turns to run along it (--a), then folds straight down one step. */
.stairs s {
  position: absolute;
  left: calc(var(--x) * var(--u));
  top: calc(var(--y) * var(--u));
  width: calc((var(--l) + 0.5) * var(--u)); /* a hair longer, so neighbours overlap: no seams */
  height: calc(8 * var(--u));
  background: hsl(var(--hue) 45% 30% / 0.82); /* less see-through than the top */
  box-shadow: 0 0 calc(6 * var(--u)) hsl(var(--hue) 85% 64% / 0.35); /* a soft glow */
  transform-origin: 0 0;
  transform: rotate(calc(var(--a) * 1deg)) rotateX(-90deg);
}

.stairs s:nth-child(1) { --x: 0; --y: 0; --l: 52; --a: 0; }
.stairs s:nth-child(2) { --x: 0; --y: 28; --l: 52; --a: 0; }
.stairs s:nth-child(3) { --x: 58; --y: 6; --l: 16; --a: 90; }
.stairs s:nth-child(4) { --x: 52; --y: 0; --l: 3.11; --a: 15; }
.stairs s:nth-child(5) { --x: 55; --y: 0.8; --l: 3.11; --a: 45; }
.stairs s:nth-child(6) { --x: 57.2; --y: 3; --l: 3.11; --a: 75; }
.stairs s:nth-child(7) { --x: 58; --y: 22; --l: 3.11; --a: 105; }
.stairs s:nth-child(8) { --x: 57.2; --y: 25; --l: 3.11; --a: 135; }
.stairs s:nth-child(9) { --x: 55; --y: 27.2; --l: 3.11; --a: 165; }
.stairs s:nth-child(10) { --x: 0; --y: 0; --l: 28; --a: 90; } /* the inner end, at the pole */

/* pole: two crossed planes */
.stairs b {
  position: absolute;
  left: calc(50% - 4 * var(--u));
  top: 0;
  width: calc(8 * var(--u));
  height: 100%;
  border-radius: calc(4 * var(--u));
  background: linear-gradient(90deg, #3a3f63, #eceefb, #3a3f63);
  opacity: 0.85;
}

.stairs b + b {
  transform: rotateY(90deg);
}

@keyframes spin {
  from { transform: rotateX(-20deg) rotateY(0deg); }
  to   { transform: rotateX(-20deg) rotateY(360deg); }
}`,
  },

  rubik: {
    how: [
      '27 cubelets would be 162 faces. But a horizontal layer only ever turns as one piece, so each layer is <b>one</b> flat box (6 faces), and the 3 × 3 stickers are painted on with two repeating gradients.',
      'All three layers run the same 12-second timeline: a quarter turn at 0%, 25%, 50% and 75%, holding in between. Negative delays of <code>-11s</code> and <code>-10s</code> shift layers 2 and 3 one and two seconds later, so they take turns.',
      'After four quarter turns every layer is back at 360°, the same as 0°, so the loop is seamless and the cube solves itself each cycle.',
      'The black faces between layers use <code>backface-visibility: hidden</code>: the two touching faces point in opposite directions, so only one is ever drawn and they never flicker.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the cube and the black lines between its stickers are the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="rubik">
    <div class="layer"><i></i><i></i><i></i><i></i><b class="top"></b><b></b></div>
    <div class="layer"><i></i><i></i><i></i><i></i><b></b><b></b></div>
    <div class="layer"><i></i><i></i><i></i><i></i><b></b><b class="bottom"></b></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the cube is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.33vmin;
  perspective: calc(800 * var(--u));
}

.rubik {
  position: relative;
  width: calc(120 * var(--u));
  height: calc(120 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(-28deg) rotateY(-38deg);
}

/* one layer = one flat box, 120 x 40 x 120 */
.layer {
  position: absolute;
  left: 0;
  width: calc(120 * var(--u));
  height: calc(40 * var(--u));
  transform-style: preserve-3d;
  animation: twist 12s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}

.layer:nth-child(1) { top: 0; }
.layer:nth-child(2) { top: calc(40 * var(--u)); animation-delay: -11s; } /* one second later */
.layer:nth-child(3) { top: calc(80 * var(--u)); animation-delay: -10s; } /* two seconds later */

/* stickers: black lines on the tile edges, 3 across and --row down */
.layer > * {
  position: absolute;
  left: 0;
  background-color: var(--c, #10121f);
  background-image:
    linear-gradient(90deg, #10121f calc(3 * var(--u)), transparent calc(3 * var(--u)) calc(100% - 3 * var(--u)), #10121f calc(100% - 3 * var(--u))),
    linear-gradient(#10121f calc(3 * var(--u)), transparent calc(3 * var(--u)) calc(100% - 3 * var(--u)), #10121f calc(100% - 3 * var(--u)));
  background-size: 33.334% 100%, 100% var(--row, 100%);
  backface-visibility: hidden;
}

/* four sides: strips of three stickers */
.layer i { top: 0; width: calc(120 * var(--u)); height: calc(40 * var(--u)); }
.layer i:nth-child(1) { --c: #8b6cff; transform: translateZ(calc(60 * var(--u))); }
.layer i:nth-child(2) { --c: #2ee6d6; transform: rotateY(90deg) translateZ(calc(60 * var(--u))); }
.layer i:nth-child(3) { --c: #ff4d9d; transform: rotateY(180deg) translateZ(calc(60 * var(--u))); }
.layer i:nth-child(4) { --c: #ffb547; transform: rotateY(-90deg) translateZ(calc(60 * var(--u))); }

/* top and bottom of a layer: black inside the cube, stickers only on the outside */
.layer b {
  --row: 33.334%;
  top: calc(-40 * var(--u));
  width: calc(120 * var(--u));
  height: calc(120 * var(--u));
  transform: rotateX(90deg) translateZ(calc(20 * var(--u)));
}

.layer b + b {
  transform: rotateX(-90deg) translateZ(calc(20 * var(--u)));
}

.layer .top    { --c: #f2f3ff; }
.layer .bottom { --c: #4d8dff; }

/* a quarter turn in the first 6% of each quarter, then hold */
@keyframes twist {
  0%       { transform: rotateY(0deg); }
  6%, 25%  { transform: rotateY(90deg); }
  31%, 50% { transform: rotateY(180deg); }
  56%, 75% { transform: rotateY(270deg); }
  81%, 100% { transform: rotateY(360deg); }
}`,
  },

  cubegrid: {
    how: [
      'Isometric view: turn a flat grid <code>rotateZ(-45deg)</code>, then tip it back with <code>rotateX</code>. "Up" is now the grid\'s own Z axis, so <code>translateZ</code> lifts a cube straight off the floor.',
      'From this angle only the top and two sides of a cube can ever be seen. So each cube is <b>one</b> element: the element is the top, and <code>::before</code> / <code>::after</code> are the sides, hinged on its edges and folded down.',
      'Every cube runs the same up-and-down animation. <code>--d</code> is row + column, so cubes on the same diagonal share a delay and the wave travels corner to corner.',
      'The cube never leaves its grid cell and only <code>transform</code> animates, so 16 cubes stay cheap.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: a cube is 36 units, and the wave lifts it 44. The field is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="field">
${lines(16, (i) => `    <i style="--d:${Math.floor(i / 4) + (i % 4)}"></i>`)}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the field is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.34vmin;
  perspective: calc(800 * var(--u));
}

.field {
  display: grid;
  grid-template-columns: repeat(4, calc(36 * var(--u)));
  gap: calc(10 * var(--u));
  transform-style: preserve-3d;
  /* isometric floor: turn 45deg, then tip back. The cube sides fold down below the floor and the
     near corner is magnified, so what the field paints hangs below its layout box even with the
     wave lifting the cubes: the floor is raised that much and the whole field stays centred. */
  transform: translateY(calc(-8 * var(--u))) rotateX(58deg) rotateZ(-45deg);
}

/* the element itself is the top of the cube */
.field i {
  --hue: calc(253 - var(--d) * 13); /* violet corner to teal corner */
  position: relative;
  width: calc(36 * var(--u));
  height: calc(36 * var(--u));
  background: hsl(var(--hue) 90% 80%);
  transform-style: preserve-3d;
  animation: wave 2.6s ease-in-out infinite;
  animation-delay: calc(var(--d) * -0.28s);
}

.field i::before,
.field i::after {
  content: '';
  position: absolute;
}

/* side hinged on the bottom edge, folded down */
.field i::before {
  left: 0;
  top: 100%;
  width: 100%;
  height: calc(36 * var(--u));
  background: hsl(var(--hue) 85% 64%);
  transform-origin: top;
  transform: rotateX(-90deg);
}

/* side hinged on the left edge, folded down */
.field i::after {
  right: 100%;
  top: 0;
  width: calc(36 * var(--u));
  height: 100%;
  background: hsl(var(--hue) 55% 36%);
  transform-origin: right;
  transform: rotateY(-90deg);
}

@keyframes wave {
  0%, 100% { transform: translateZ(0); }
  50%      { transform: translateZ(calc(44 * var(--u))); }
}`,
  },

  net: {
    how: [
      'Lay the six faces out flat as the cross-shaped net. Each face sits <b>next to</b> the edge it shares with its parent and uses that edge as <code>transform-origin</code>.',
      'Folding is then one <code>rotateX(±90deg)</code> or <code>rotateY(±90deg)</code> per face. The angle lives in <code>--fx</code> / <code>--fy</code>, and one shared keyframe rule reads it, so every wall folds its own way.',
      'The lid is a <b>child</b> of the north wall, not of the base. Its hinge rides along as the wall stands up, and its 90° adds to the wall\'s: nested transforms compound.',
      'The loop starts, and holds for a moment, lying open flat on a floor seen from above, turned 160° so its long arm reaches towards you: the first frame is what a paused card shows, and at an angle, with the near squares larger than the far ones, it reads as a net lying in 3D rather than a flat plus sign. The lid folds along with its wall, so the two never stand up as one tall plank. Every timeline is mirror-symmetric, so the loop is seamless.',
      'The cube turns a full circle only while it is up (<code>0%, 8%</code> and <code>92%, 100%</code> hold the same angle, 360° apart), so every side gets seen and the net always opens the same way round.',
      'The camera is one more keyframe rule on the same 8s: it keeps the tilt and moves in (<code>scale3d(1.45, …)</code>) and down as the walls stand up, so the shut cube fills the frame as the open net does, and the middle of the drawing stays in the middle.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the net is the same share of a gallery card, the editor and a recording canvas. The faces are coloured glass at 55% with a solid edge, so they read on a light stage as well as a dark one.',
    ],
    html: `<div class="scene">
  <div class="net">
    <div class="base">
      <i class="n"><i class="lid"></i></i>
      <i class="s"></i>
      <i class="e"></i>
      <i class="w"></i>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the net is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.33vmin;
  perspective: calc(560 * var(--u));
}

/* the camera looks down at a floor the net lies on. It moves in as the walls fold up, so the
   closed cube is as big in the frame as the open net: the zoom runs on the fold's own timeline */
.net {
  transform-style: preserve-3d;
  animation: zoom 8s ease-in-out infinite;
}

/* the bottom face turns a full circle while the cube is up, so every side gets seen, and is
   back where it started before the net lies flat again. So the open net always lies the same
   way: turned 160deg, the lid's arm reaching towards you, larger than the far squares, so even
   a paused card shows a net lying on a floor and never a flat plus sign. The north wall then
   stands up at the front, where its height does not tower over the rest */
.base {
  --c: 139 108 255;
  position: relative;
  width: calc(60 * var(--u));
  height: calc(60 * var(--u));
  transform-style: preserve-3d;
  animation: turn 8s ease-in-out infinite;
}

.base,
.base i {
  /* coloured glass, dense enough to read on a light stage as well as a dark one */
  background: rgb(var(--c) / 0.55);
  /* inset shadows instead of a border: no layout offset, so hinges sit exactly on the edges */
  box-shadow: inset 0 0 0 calc(1.5 * var(--u)) rgb(var(--c)), inset 0 0 calc(18 * var(--u)) rgb(var(--c) / 0.6);
}

.base i {
  position: absolute;
  width: calc(60 * var(--u));
  height: calc(60 * var(--u));
  transform-style: preserve-3d; /* the north wall carries the lid */
  animation: fold 8s ease-in-out infinite;
}

/* each face lies next to its shared edge and hinges on it */
.n   { --c: 255 77 157;  --fx: -90deg; left: 0; bottom: 100%; transform-origin: bottom; }
.s   { --c: 46 230 214;  --fx: 90deg;  left: 0; top: 100%;    transform-origin: top; }
.e   { --c: 255 181 71;  --fy: -90deg; top: 0;  left: 100%;   transform-origin: left; }
.w   { --c: 255 181 71;  --fy: 90deg;  top: 0;  right: 100%;  transform-origin: right; }
.lid { --c: 139 108 255; --fx: -90deg; left: 0; bottom: 100%; transform-origin: bottom; }

.base .lid {
  animation-name: lid;
}

@keyframes turn {
  0%, 8%    { transform: rotateZ(160deg); }
  92%, 100% { transform: rotateZ(520deg); }
}

/* the camera: tilted down at the floor all the time. It follows the middle of what is drawn
   (the near arm of the open net hangs low, the cube stands up above the floor) and moves in
   once the walls are up, so the shut cube fills the frame as the open net does */
@keyframes zoom {
  0%, 6%, 94%, 100% { transform: translateY(calc(-31 * var(--u))) rotateX(56deg) scale3d(1, 1, 1); }
  16%, 84%          { transform: translateY(calc(12 * var(--u))) rotateX(56deg) scale3d(1.12, 1.12, 1.12); }
  28%, 72%          { transform: translateY(calc(33 * var(--u))) rotateX(56deg) scale3d(1.45, 1.45, 1.45); }
}

/* The loop starts lying open flat, the net itself: that is the first frame, so it is what a
   paused card shows. walls: flat, fold up, stay closed while the cube turns, unfold */
@keyframes fold {
  0%, 6%, 94%, 100% { transform: rotateX(0deg) rotateY(0deg); }
  28%, 72%          { transform: rotateX(var(--fx, 0deg)) rotateY(var(--fy, 0deg)); }
}

/* lid: folds at the same time as the wall that carries it, so the wall and the lid never stand
   up together as one tall plank. It can never pass through a wall: it is exactly as wide as the
   base, and the side walls lean outside that width until they are upright */
@keyframes lid {
  0%, 6%, 94%, 100% { transform: rotateX(0deg) rotateY(0deg); }
  26%, 74%          { transform: rotateX(var(--fx, 0deg)) rotateY(var(--fy, 0deg)); }
}`,
  },

  shapeshift: {
    how: [
      'Keep the corner radius <code>R</code> fixed and derive the rest: side = <code>2R × sin(180° / n)</code>, apothem = <code>R × cos(180° / n)</code>. JS computes both and hands them to CSS as <code>--w</code> and <code>--r</code> — plain numbers, never lengths: CSS multiplies them by <code>--u</code>, the one base unit every length here is a multiple of, so the prism is the same share of a gallery card, the editor and a recording canvas.',
      'CSS places every panel from those numbers: <code>rotateY(calc(var(--i) * 1turn / var(--n))) translateZ(var(--apothem))</code>, where <code>--apothem</code> is <code>calc(var(--r) * var(--u))</code>. JS never touches a transform.',
      'The caps are a <code>2R</code> square cut to the polygon. JS writes the <code>clip-path</code>: one corner every <code>360° / n</code>, starting half a side from the centre of panel 0.',
      'Changing <code>n</code> rebuilds the panels. <code>@starting-style</code> gives brand-new elements a first frame to transition from, so they grow out from the axis without any animation JS. It is scoped to a <code>.grow</code> class that JS adds only once the slider moves, so the prism the page opens on is whole from its very first frame, and a paused card shows it full-sized.',
    ],
    html: `<div class="band">
  <div class="view">
    <div class="scene">
      <div class="prism"></div>
    </div>
  </div>
  <div class="controls">
    <output class="caption">6 sides</output>
    <div class="row">
      <label>Sides <input type="range" min="3" max="12" value="6" aria-label="Number of sides" /></label>
    </div>
  </div>
</div>`,
    css: `/* the prism and the control zone stand in one stack, so the zone is the same distance below
   the model in every model */
.band {
  /* one base unit: every length in the prism is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas. The control zone is in plain vmin,
     because it is the same object in every model. */
  --u: 0.26vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin;
}

/* the model box */
.view {
  display: grid;
  place-items: center;
  height: 50vmin;
}

.scene {
  perspective: calc(800 * var(--u));
}

.prism {
  --h: calc(120 * var(--u));
  position: relative;
  /* JS writes --R, --r and --w as plain numbers; they become lengths here, in the model's unit */
  --radius: calc(var(--R) * var(--u));
  --apothem: calc(var(--r) * var(--u));
  --side: calc(var(--w) * var(--u));
  width: calc(var(--radius) * 2);
  height: var(--h);
  transform-style: preserve-3d;
  animation: spin 14s linear infinite;
}

/* JS sets --n, --R (radius), --r (apothem), --w (side) and --cap; CSS only places things */
.prism i {
  --hue: calc(214 - 39 * cos(var(--i) * 1turn / var(--n))); /* teal ... violet ... teal */
  position: absolute;
  top: 0;
  left: calc(50% - var(--side) / 2);
  width: var(--side);
  height: 100%;
  background: hsl(var(--hue) 85% 64% / 0.26);
  border: calc(1 * var(--u)) solid hsl(var(--hue) 85% 64% / 0.75);
  box-shadow: inset 0 0 calc(24 * var(--u)) hsl(var(--hue) 85% 64% / 0.3);
  transform: rotateY(calc(var(--i) * 1turn / var(--n))) translateZ(var(--apothem));
  transition: transform 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.1), opacity 0.35s;
  transition-delay: calc(var(--i) * 30ms);
}

/* the first frame of a newly inserted panel: on the axis and invisible, so it grows out into place
   and never reaches past the prism's own footprint on the way. Only once the slider has moved
   (.grow): the prism the page opens on starts whole, so its first frame, the one a paused card
   holds, is the full-sized shape */
@starting-style {
  .prism.grow i {
    opacity: 0;
    transform: rotateY(calc(var(--i) * 1turn / var(--n))) translateZ(0);
  }
}

/* caps: both rotateX(90deg), pushed up or down, so an odd polygon lines up on both ends */
.prism b {
  position: absolute;
  left: calc(50% - var(--radius));
  top: calc(50% - var(--radius));
  width: calc(var(--radius) * 2);
  height: calc(var(--radius) * 2);
  clip-path: var(--cap);
  background: radial-gradient(circle, rgb(255 77 157 / 0.1) 15%, rgb(255 77 157 / 0.5));
  transform: rotateX(90deg) translateZ(calc(var(--h) / 2));
  transition: opacity 0.4s 0.25s;
}

.prism b + b {
  transform: rotateX(90deg) translateZ(calc(var(--h) / -2));
}

@starting-style {
  .prism.grow b { opacity: 0; }
}

/* the control zone: the same object, at the same size, in every model that has one */
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
  box-sizing: border-box; /* a label is content-box, so min-width would add to its padding */
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

.controls label {
  display: flex;
  align-items: center;
  gap: 2vmin;
}

.controls input {
  width: 28vmin;
  /* the browser gives a range input 2px of margin: px, not vmin, so the row was wider on a small
     canvas than on a large one */
  margin: 0;
  accent-color: #2ee6d6;
  cursor: pointer;
}

@keyframes spin {
  from { transform: rotateX(-22deg) rotateY(0deg); }
  to   { transform: rotateX(-22deg) rotateY(360deg); }
}`,
    js: `const prism = document.querySelector('.prism');
const input = document.querySelector('input');
const output = document.querySelector('output');
const R = 80; // corner radius, in the model's units: the prism keeps this footprint for every n

function build() {
  const n = Number(input.value);
  const half = Math.PI / n; // half the angle one side spans

  prism.style.setProperty('--n', n);
  // plain numbers: CSS multiplies them by --u, so the prism scales with the canvas
  prism.style.setProperty('--R', R);
  prism.style.setProperty('--r', R * Math.cos(half));     // apothem
  prism.style.setProperty('--w', 2 * R * Math.sin(half)); // side length

  // cap outline: a corner half a side either side of every panel's centre
  const corners = [];
  for (let k = 0; k < n; k++) {
    const a = (2 * k + 1) * half;
    corners.push((50 + 50 * Math.sin(a)) + '% ' + (50 + 50 * Math.cos(a)) + '%');
  }
  prism.style.setProperty('--cap', 'polygon(' + corners.join(', ') + ')');

  // brand-new elements, so @starting-style flies them in
  let html = '';
  for (let i = 0; i < n; i++) html += '<i style="--i:' + i + '"></i>';
  prism.innerHTML = html + '<b></b><b></b>';
  output.textContent = n + ' sides';
}

// the first build stands whole; every rebuild after it flies its new panels in
input.addEventListener('input', () => {
  prism.classList.add('grow');
  build();
});
build();`,
  },
};
