import type { Snippet } from './snippet-utils';

/** Copy-paste versions of the batch-G product demos (batch-g.ts): plain HTML + CSS, no Sass. */

/** n lines of markup, one per index, indented. */
const lines = (n: number, fn: (i: number) => string, indent = '    '): string =>
  Array.from({ length: n }, (_, i) => indent + fn(i)).join('\n');

const cup = (side: 'l' | 'r'): string => `    <i class="slider slider-${side}"></i><i class="slider slider-${side}f"></i>
    <i class="yoke yoke-${side}"></i>
    <div class="cup cup-${side}">
${lines(12, (i) => `<i style="--i:${i}"></i>`, '      ')}
      <b class="outer"><em></em></b>
      <b class="cushion"></b>
    </div>`;

export const snippetsG: Record<string, Snippet> = {
  headphones: {
    how: [
      'The band is twelve flat strips. Each one starts at the arc centre, turns to its angle with <code>rotateZ</code>, moves out by the radius with <code>translateY(-58 units)</code> and folds flat with <code>rotateX(90deg)</code>: together they are the top surface of an arch. Two masked rings close its sides.',
      'A cup is a short cylinder built the easy way, standing up like a can (strips at <code>rotateY(i × 30deg) translateZ(r)</code>, a disc on each end), then laid on its side with <code>rotateZ(±90deg)</code> so the top disc faces outward.',
      'Light is computed, not painted by hand: each strip darkens itself with <code>cos()</code> / <code>sin()</code> of its own angle, so the strips facing up are the brightest.',
      'The turn cannot simply be switched off on hover: removing an animation snaps back. Instead two <code>@property</code> values animate: the lap angle <code>--spin</code> and a weight <code>--k</code>. The transform uses <code>--spin × --k</code>, and hover eases <code>--k</code> to 0, which glides from wherever the lap is to the front pose.',
      'The hovered element is a static wrapper and everything that moves has <code>pointer-events: none</code>, so the hover never flickers.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the headset is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="headphones" tabindex="0" role="img" aria-label="Headphones that turn and light up on hover or focus">
   <div class="rig">
    <i class="shadow"></i>
    <div class="band">
      <b class="side"></b><b class="side"></b>
${lines(12, (i) => `<i style="--i:${i}"></i>`, '      ')}
    </div>
${cup('l')}
${cup('r')}
   </div>
  </div>
</div>`,
    css: `/* registered, so they can be animated and transitioned */
@property --spin {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@property --k {
  syntax: '<number>';
  inherits: false;
  initial-value: 1;
}

.scene {
  /* one base unit: every length below is a multiple of it, so the headset is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.34vmin;
  perspective: calc(800 * var(--u));
}

/* the static hit area */
.headphones {
  --shell: color-mix(in srgb, #8b6cff 34%, #17182a);
  --shell-hi: color-mix(in srgb, #8b6cff 55%, #3a3d5c);
  --leather: color-mix(in srgb, #8b6cff 14%, #1b1c29);
  --leather-hi: color-mix(in srgb, #8b6cff 22%, #3a3c52);
  --stitch: color-mix(in srgb, #8b6cff 80%, #fff);
  --pad: #16171f;
  --metal: #b8bdd2;
  --metal-dark: #5c6280;
  --glow: #2ee6d6;
  display: grid;
  place-items: center;
  width: calc(216 * var(--u));
  height: calc(184 * var(--u));
  border-radius: calc(16 * var(--u));
  cursor: pointer;
  transform-style: preserve-3d;
}

/* 0 × 0: every part is placed around this point */
.rig {
  position: relative;
  width: 0;
  height: 0;
  pointer-events: none;
  transform-style: preserve-3d;
  /* the front pose (-28deg) plus the lap, weighted by --k */
  transform: rotateX(-14deg) rotateY(calc(-28deg + var(--spin) * var(--k)));
  animation: turn 16s linear infinite;
  transition: --k 1.1s cubic-bezier(0.45, 0, 0.2, 1);
}

.headphones:hover .rig,
.headphones:focus-visible .rig {
  --k: 0; /* the lap keeps running, it just stops counting */
}

.shadow {
  position: absolute;
  left: calc(-80 * var(--u));
  top: calc(34 * var(--u));
  width: calc(160 * var(--u));
  height: calc(80 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.45), transparent);
  transform: rotateX(90deg);
}

/* --- the band: 12 strips over 200deg, radius 58 units --- */
.band {
  position: absolute;
  top: calc(-22 * var(--u));
  transform-style: preserve-3d;
}

.band i {
  --a: calc(-100deg + (var(--i) + 0.5) * 16.667deg);
  position: absolute;
  left: calc(-8.8 * var(--u));
  top: calc(-11 * var(--u));
  width: calc(17.6 * var(--u)); /* one side of the polygon, a hair wider: no seams */
  height: calc(22 * var(--u));  /* the band's width, front to back */
  background:
    linear-gradient(rgb(0 0 0 / calc(0.5 - 0.46 * cos(var(--a)))) 0 0), /* shade: none on top */
    repeating-linear-gradient(90deg, var(--stitch) 0 calc(2 * var(--u)), transparent calc(2 * var(--u)) calc(4 * var(--u))) 0 calc(3 * var(--u)) / 100% calc(1 * var(--u)) no-repeat,
    repeating-linear-gradient(90deg, var(--stitch) 0 calc(2 * var(--u)), transparent calc(2 * var(--u)) calc(4 * var(--u))) 0 calc(18 * var(--u)) / 100% calc(1 * var(--u)) no-repeat,
    linear-gradient(var(--leather), var(--leather-hi) 45%, var(--leather));
  transform: rotateZ(var(--a)) translateY(calc(-58 * var(--u))) rotateX(90deg);
}

/* the band's side walls: a ring, masked to the same 200deg */
.side {
  position: absolute;
  left: calc(-58 * var(--u));
  top: calc(-58 * var(--u));
  width: calc(116 * var(--u));
  height: calc(116 * var(--u));
  background: radial-gradient(closest-side, transparent calc(100% - 6 * var(--u)), var(--leather) calc(100% - 5.5 * var(--u)), color-mix(in srgb, var(--leather) 70%, #000) 100%, transparent 100%);
  mask: conic-gradient(from -100deg, #000 0 200deg, transparent 0);
  transform: translateZ(calc(11 * var(--u)));
}

.side + .side {
  transform: translateZ(calc(-11 * var(--u)));
}

/* --- metal: sliders (two crossed planes) and yokes (half rings) --- */
.slider {
  position: absolute;
  top: calc(-18 * var(--u));
  left: calc(-5 * var(--u));
  width: calc(10 * var(--u));
  height: calc(20 * var(--u));
  background: linear-gradient(90deg, var(--metal-dark), var(--metal) 45%, #eef0fa 55%, var(--metal-dark));
}

.slider-l { transform: translateX(calc(-55 * var(--u))) rotateY(90deg); }
.slider-r { transform: translateX(calc(55 * var(--u))) rotateY(90deg); }
.slider-lf { left: calc(-1.5 * var(--u)); width: calc(3 * var(--u)); transform: translateX(calc(-55 * var(--u))); }
.slider-rf { left: calc(-1.5 * var(--u)); width: calc(3 * var(--u)); transform: translateX(calc(55 * var(--u))); }

.yoke {
  position: absolute;
  left: calc(-35 * var(--u));
  top: 0;
  width: calc(70 * var(--u));
  height: calc(70 * var(--u));
  background: radial-gradient(closest-side, transparent calc(100% - 4 * var(--u)), var(--metal) calc(100% - 3.5 * var(--u)), var(--metal-dark) 100%, transparent 100%);
  mask: conic-gradient(from -90deg, #000 0 180deg, transparent 0);
}

.yoke-l { transform: translateX(calc(-55 * var(--u))) rotateY(90deg); }
.yoke-r { transform: translateX(calc(55 * var(--u))) rotateY(90deg); }

/* --- cups: built standing (axis Y), then laid down; top disc = outside --- */
.cup {
  --dir: 1; /* which way "up" went: flips the light */
  position: absolute;
  top: calc(35 * var(--u));
  transform-style: preserve-3d;
  transform: translateX(calc(55 * var(--u))) rotateZ(90deg);
}

.cup-l {
  --dir: -1;
  transform: translateX(calc(-55 * var(--u))) rotateZ(-90deg);
}

/* 12 strips, radius 31 units, 26 units thick: 17 units shell, a seam, 9 units cushion */
.cup i {
  position: absolute;
  left: calc(-8.6 * var(--u));
  top: calc(-13 * var(--u));
  width: calc(17.2 * var(--u));
  height: calc(26 * var(--u));
  backface-visibility: hidden;
  background:
    linear-gradient(rgb(0 0 0 / calc(0.3 + 0.28 * var(--dir) * sin(var(--i) * 30deg))) 0 0),
    linear-gradient(var(--shell-hi) 0 calc(2 * var(--u)), var(--shell) calc(4 * var(--u)) calc(15 * var(--u)), var(--shell-hi) calc(16.5 * var(--u)), transparent calc(16.5 * var(--u))),
    linear-gradient(transparent calc(17 * var(--u)), #2a2c3c calc(18 * var(--u)), var(--pad) calc(21 * var(--u)), #0b0c12);
  transform: rotateY(calc(var(--i) * 30deg)) translateZ(calc(31 * var(--u)));
}

/* the seam light: its own layer, so hover only changes opacity */
.cup i::after {
  content: '';
  position: absolute;
  inset: calc(16 * var(--u)) 0 auto;
  height: calc(1.5 * var(--u));
  background: var(--glow);
  opacity: 0.25;
  transition: opacity 0.5s;
}

.outer,
.cushion {
  position: absolute;
  left: calc(-31.5 * var(--u));
  top: calc(-31.5 * var(--u));
  width: calc(63 * var(--u));
  height: calc(63 * var(--u));
  border-radius: 50%;
  backface-visibility: hidden;
}

.outer {
  background:
    radial-gradient(circle, var(--metal) 0 calc(2.5 * var(--u)), transparent calc(3 * var(--u))),
    radial-gradient(circle, transparent 0 calc(7 * var(--u)), var(--metal) calc(7.5 * var(--u)) calc(8.5 * var(--u)), transparent calc(9 * var(--u))),
    radial-gradient(circle, transparent 0 83%, var(--metal-dark) 85%, #eef0fa 90%, var(--metal) 94%, var(--metal-dark)),
    radial-gradient(circle at 35% 30%, var(--shell-hi), var(--shell) 60%, color-mix(in srgb, var(--shell) 60%, #000));
  transform: rotateX(90deg) translateZ(calc(13 * var(--u)));
}

.outer em {
  position: absolute;
  inset: calc(9 * var(--u));
  border: calc(2 * var(--u)) solid var(--glow);
  border-radius: 50%;
  box-shadow: 0 0 calc(8 * var(--u)) var(--glow), inset 0 0 calc(8 * var(--u)) var(--glow);
  opacity: 0.2;
  transition: opacity 0.5s;
}

.cushion {
  background: radial-gradient(circle, #06070b 0 52%, #2a2c3c 60%, var(--pad) 72%, #2a2c3c 86%, #0b0c12);
  transform: rotateX(-90deg) translateZ(calc(13 * var(--u)));
}

.headphones:hover .outer em,
.headphones:focus-visible .outer em,
.headphones:hover .cup i::after,
.headphones:focus-visible .cup i::after {
  opacity: 1;
}

/* -180 → 180: blending back to the pose never takes more than half a turn */
@keyframes turn {
  from { --spin: -180deg; }
  to   { --spin: 180deg; }
}`,
  },

  perfume: {
    how: [
      'The body is an <b>octagonal prism</b>: a box with its four vertical edges cut off. Eight faces are turned in 45° steps with <code>rotateY(n × 45deg)</code> and pushed out to their distance from the axis.',
      'The corner cuts are the subtle part. When the box is wider than it is deep, the middle of a cut is <b>not</b> on the 45° ray from the axis, so it also slides sideways by <code>(w − d) / 2 / √2</code>, alternately left and right.',
      'Every size comes from four custom properties (<code>--w --d --c --h</code>), so the liquid is simply the same prism again, a glass thickness smaller, standing on the thick glass bottom.',
      'Glass is see-through: its faces are tinted, have light edges and are drawn from both sides, so the far walls and the liquid show through the near ones. Top, floor and liquid surface are octagons cut with <code>clip-path</code>.',
      'The glint is a bright gradient inside the front face (a flat face can clip with <code>overflow: hidden</code>), moved with <code>translateX</code> while the bottle passes the front.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the bottle is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="bottle">
    <i class="shadow"></i>
    <div class="prism liquid">
${lines(8, (i) => `<i style="--n:${i}"></i>`, '      ')}
      <b class="octagon surface"></b>
    </div>
    <b class="octagon floor"></b>
    <div class="prism glass">
      <i style="--n:0"><em class="glint"></em></i>
${lines(7, (i) => `<i style="--n:${i + 1}"></i>`, '      ')}
    </div>
    <b class="octagon top"></b>
    <span class="label"><b>LUMEN</b><small>EAU DE PARFUM</small></span>
    <div class="box neck"><i></i><i></i><i></i><i></i></div>
    <div class="box cap"><i><em class="glint"></em></i><i></i><i></i><i></i><i></i></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the bottle is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.4vmin;
  perspective: calc(800 * var(--u));
}

.bottle {
  --gold: #ffcf87;
  --gold-deep: #aa6c16;
  position: relative;
  width: calc(84 * var(--u));
  height: calc(96 * var(--u));
  transform-style: preserve-3d;
  /* the neck and the cap stand on top of this box, so the drawing's middle is above the box's:
     move the box down by that much, and the whole bottle is centred */
  translate: 0 calc(17 * var(--u));
  animation: sway 8s ease-in-out infinite alternate;
}

.shadow {
  position: absolute;
  left: calc(-18 * var(--u));
  top: calc(56 * var(--u));
  width: calc(120 * var(--u));
  height: calc(80 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(80 20 50 / 0.55), transparent);
  transform: rotateX(90deg);
}

/* --- the octagonal prism: width, depth, corner cut, height --- */
.prism {
  position: absolute;
  left: calc((84 * var(--u) - var(--w)) / 2);
  width: var(--w);
  height: var(--h);
  transform-style: preserve-3d;
}

.glass  { --w: calc(84 * var(--u)); --d: calc(44 * var(--u)); --c: calc(9 * var(--u)); --h: calc(96 * var(--u)); top: 0; }
.liquid { --w: calc(74 * var(--u)); --d: calc(34 * var(--u)); --c: calc(6.93 * var(--u)); --h: calc(50 * var(--u)); top: calc(33 * var(--u)); } /* 5 units glass walls, 13 units glass floor */

.prism > i {
  position: absolute;
  top: 0;
  box-sizing: border-box;
  left: calc((var(--w) - var(--fw)) / 2);
  width: var(--fw);
  height: var(--h);
  transform: rotateY(calc(var(--n) * 45deg)) translateX(var(--fx, 0)) translateZ(var(--fz));
}

/* front and back */
.prism > i:nth-child(4n + 1) { --fw: calc(var(--w) - 2 * var(--c)); --fz: calc(var(--d) / 2); }
/* the two sides */
.prism > i:nth-child(4n + 3) { --fw: calc(var(--d) - 2 * var(--c)); --fz: calc(var(--w) / 2); }
/* the four corner cuts: 45deg, but also slid sideways when w != d */
.prism > i:nth-child(even) {
  --fw: calc(var(--c) * 1.4142);
  --fz: calc((var(--w) / 2 + var(--d) / 2 - var(--c)) / 1.4142);
}
.prism > i:nth-child(4n + 2) { --fx: calc((var(--w) - var(--d)) / 2 / 1.4142); }
.prism > i:nth-child(4n)     { --fx: calc((var(--d) - var(--w)) / 2 / 1.4142); }

/* an octagon of the prism's footprint, laid flat */
.octagon {
  position: absolute;
  left: 0;
  width: var(--w, calc(84 * var(--u)));
  height: var(--d, calc(44 * var(--u)));
  --c: calc(9 * var(--u));
  clip-path: polygon(var(--c) 0, calc(100% - var(--c)) 0, 100% var(--c), 100% calc(100% - var(--c)),
    calc(100% - var(--c)) 100%, var(--c) 100%, 0 calc(100% - var(--c)), 0 var(--c));
}

.top {
  top: calc(-22 * var(--u));
  background: radial-gradient(ellipse calc(16 * var(--u)) calc(11 * var(--u)), rgb(255 255 255 / 0.3), transparent), rgb(200 190 255 / 0.18);
  transform: rotateX(90deg);
}

.floor {
  top: calc(74 * var(--u));
  background: rgb(190 175 255 / 0.2);
  transform: rotateX(-90deg);
}

/* glass: tinted, light edges, drawn from both sides; the lower 13 units is the thick bottom */
.glass > i {
  --lit: 0.1;
  /* an inner line plus a soft shade instead of a hard border: swaying, the corner cuts turn
     nearly side-on, where a 1 units line breaks up; the shade survives */
  box-shadow: inset 0 0 0 calc(1 * var(--u)) rgb(236 238 251 / 0.38), inset 0 0 calc(6 * var(--u)) rgb(236 238 251 / 0.15);
  border-radius: calc(2 * var(--u));
  background:
    linear-gradient(transparent calc(100% - 15 * var(--u)), rgb(255 255 255 / 0.35) calc(100% - 14 * var(--u)), rgb(255 255 255 / 0.12) calc(100% - 11 * var(--u)), rgb(255 255 255 / 0.2)),
    linear-gradient(90deg, rgb(255 255 255 / calc(var(--lit) * 1.8)), rgb(255 255 255 / var(--lit)) 30%, rgb(255 255 255 / calc(var(--lit) * 0.5)) 70%, rgb(255 255 255 / var(--lit))),
    rgb(139 108 255 / 0.08);
}

.glass > i:nth-child(even) { --lit: 0.24; } /* the corner cuts catch the light */
.glass > i:nth-child(3),
.glass > i:nth-child(7) { --lit: 0.05; }
.glass > i:first-child { overflow: hidden; } /* flat face: clipping is safe */

.liquid > i {
  background:
    linear-gradient(90deg, rgb(255 255 255 / 0.18), transparent 35% 70%, rgb(0 0 0 / 0.18)),
    linear-gradient(#ff7a78, #f0569f);
  opacity: 0.82;
}

.surface {
  --w: calc(74 * var(--u));
  --d: calc(34 * var(--u));
  --c: calc(6.93 * var(--u));
  top: calc(-17 * var(--u));
  background: radial-gradient(ellipse 60% 70% at 40% 40%, rgb(255 255 255 / 0.45), transparent), #ff8a70;
  opacity: 0.9;
  transform: rotateX(90deg);
}

.glint {
  position: absolute;
  top: -20%;
  left: 0;
  width: calc(22 * var(--u));
  height: 140%;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.7) 45% 55%, transparent);
  transform: translateX(calc(-40 * var(--u))) rotate(18deg);
  animation: glint 8s linear infinite;
}

.label {
  position: absolute;
  left: calc(13 * var(--u));
  top: calc(26 * var(--u));
  display: grid;
  place-items: center;
  align-content: center;
  gap: calc(3 * var(--u));
  box-sizing: border-box;
  width: calc(58 * var(--u));
  height: calc(36 * var(--u));
  border: calc(1 * var(--u)) solid var(--gold);
  background: #0d0e17;
  box-shadow: inset 0 0 0 calc(2 * var(--u)) #0d0e17, inset 0 0 0 calc(2.6 * var(--u)) var(--gold-deep);
  color: var(--gold);
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1;
  backface-visibility: hidden;
  transform: translateZ(calc(22.6 * var(--u))); /* just in front of the glass */
}

.label b { font-size: calc(11 * var(--u)); font-weight: 400; letter-spacing: calc(2.5 * var(--u)); text-indent: calc(2.5 * var(--u)); }
.label small { font: calc(4.5 * var(--u)) Inter, system-ui, sans-serif; letter-spacing: calc(0.8 * var(--u)); white-space: nowrap; opacity: 0.85; }

/* --- neck and cap: four walls and a lid --- */
.box {
  position: absolute;
  transform-style: preserve-3d;
}

.box > * { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.box > :nth-child(1) { transform: translateZ(calc(var(--bd) / 2)); }
.box > :nth-child(2) { transform: rotateY(180deg) translateZ(calc(var(--bd) / 2)); }
.box > :nth-child(3),
.box > :nth-child(4) { left: calc(50% - var(--bd) / 2); width: var(--bd); }
.box > :nth-child(3) { transform: rotateY(90deg) translateZ(calc(var(--bw) / 2)); }
.box > :nth-child(4) { transform: rotateY(-90deg) translateZ(calc(var(--bw) / 2)); }
.box > :nth-child(5) { top: calc(var(--bd) / -2); height: var(--bd); transform: rotateX(90deg); }

.neck {
  --bw: calc(24 * var(--u));
  --bd: calc(18 * var(--u));
  left: calc(30 * var(--u));
  top: calc(-7 * var(--u));
  width: calc(24 * var(--u));
  height: calc(7 * var(--u));
}

.neck > * { background: linear-gradient(var(--gold-deep), var(--gold) 50%, var(--gold-deep)); }

.cap {
  --bw: calc(42 * var(--u));
  --bd: calc(30 * var(--u));
  left: calc(21 * var(--u));
  top: calc(-39 * var(--u));
  width: calc(42 * var(--u));
  height: calc(32 * var(--u));
}

/* vertical fluting over polished gold */
.cap > * {
  background:
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.22) 0 calc(1.5 * var(--u)), transparent calc(1.5 * var(--u)) calc(3 * var(--u)), rgb(0 0 0 / 0.12) calc(3 * var(--u)) calc(4.5 * var(--u)), transparent calc(4.5 * var(--u)) calc(6 * var(--u))),
    linear-gradient(90deg, var(--gold-deep), var(--gold) 40%, #fff6dc 50%, var(--gold) 60%, var(--gold-deep));
}

.cap > :nth-child(1) { overflow: hidden; }
.cap > :nth-child(3),
.cap > :nth-child(4) {
  background:
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.18) 0 calc(1.5 * var(--u)), transparent calc(1.5 * var(--u)) calc(3 * var(--u)), rgb(0 0 0 / 0.14) calc(3 * var(--u)) calc(4.5 * var(--u)), transparent calc(4.5 * var(--u)) calc(6 * var(--u))),
    linear-gradient(90deg, var(--gold-deep), #e2a54f);
}
.cap > :nth-child(5) {
  background:
    radial-gradient(circle, transparent 0 calc(7 * var(--u)), var(--gold-deep) calc(7.5 * var(--u)) calc(8.5 * var(--u)), transparent calc(9 * var(--u))),
    linear-gradient(135deg, #fff6dc, var(--gold) 45%, var(--gold-deep));
}
.cap .glint { animation-delay: -0.5s; }

@keyframes sway {
  from { transform: rotateX(-12deg) rotateY(-38deg); }
  to   { transform: rotateX(-12deg) rotateY(38deg); }
}

/* one sweep per half swing, while the bottle passes the front */
@keyframes glint {
  0%, 36%   { transform: translateX(calc(-40 * var(--u))) rotate(18deg); }
  64%, 100% { transform: translateX(calc(90 * var(--u))) rotate(18deg); }
}`,
  },

  businesscard: {
    how: [
      'The card has real thickness: the printed front and back are two planes at <code>translateZ(±2 units)</code>, the back turned with <code>rotateY(180deg)</code>. Both hide their backface, so each shows only while it faces you.',
      'The painted edge is four rounded slabs 1 unit apart (they fill the rounded corners) plus four flat walls on the straight parts, which give the edge a clean, lit surface when the card is edge-on.',
      'Embossing is real depth: each printed side is itself <code>preserve-3d</code>, and the logo and the lines of text are lifted off it with <code>translateZ(1.5–6 units)</code>. As the card turns, they slide against the paper.',
      'The idle sway and the flip are on two different elements, so they never fight over <code>transform</code>. The flip is a plain <code>transition</code> with a small overshoot.',
      'The hovered element is a static wrapper; the moving card inside has <code>pointer-events: none</code>, so the flip cannot pull the card out from under the pointer.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the card is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="bizcard" tabindex="0">
    <div class="float">
      <i class="shadow"></i>
      <div class="card">
        <i class="slab" style="--i:0"></i><i class="slab" style="--i:1"></i><i class="slab" style="--i:2"></i><i class="slab" style="--i:3"></i>
        <i class="wall wall-t"></i><i class="wall wall-b"></i><i class="wall wall-l"></i><i class="wall wall-r"></i>
        <div class="front">
          <b class="logo"><i></i><i></i><i></i></b>
          <strong>PRISM</strong><small>DESIGN STUDIO</small>
        </div>
        <div class="back">
          <b></b>
          <strong>Alex Morgan</strong><small>Creative director</small>
          <span>alex@prism.studio</span><span>+1 555 0142</span><span>prism.studio</span>
        </div>
      </div>
    </div>
  </div>
</div>`,
    css: `/* how far the card is flipped: 0 = front, 1 = back (registered, so it can transition) */
@property --flip {
  syntax: '<number>';
  inherits: true;
  initial-value: 0;
}

.scene {
  /* one base unit: every length below is a multiple of it, so the card is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.4vmin;
  perspective: calc(800 * var(--u));
}

/* the static hit area */
.bizcard {
  --ink: #0f1020;
  --edge: #ff4d9d;
  --foil: #ffd291;
  --foil-deep: #aa6c16;
  display: grid;
  place-items: center;
  width: calc(220 * var(--u));
  height: calc(170 * var(--u));
  border-radius: calc(16 * var(--u));
  cursor: pointer;
  font-family: Inter, system-ui, sans-serif;
  transform-style: preserve-3d;
}

/* the tilt and a slow idle sway */
.float {
  position: relative;
  width: calc(176 * var(--u));
  height: calc(100 * var(--u));
  pointer-events: none;
  transform-style: preserve-3d;
  animation: float 6s ease-in-out infinite alternate;
}

.shadow {
  position: absolute;
  inset: calc(10 * var(--u)) calc(-6 * var(--u)) calc(-16 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.38), transparent);
  transform: translateZ(calc(-36 * var(--u)));
}

/* the flip, on its own element */
.card {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateY(calc(var(--flip) * 180deg));
  /* quick through the side-on middle (where thin layers flicker), then overshoot and settle */
  transition: --flip 0.9s linear(0, 0.03 18%, 0.5 42%, 0.97 60%, 1.05 74%, 1);
}

.bizcard:hover .card,
.bizcard:focus-visible .card {
  --flip: 1;
}

/* 4 units thick: four rounded slabs fill the corners of the edge... */
.slab {
  position: absolute;
  inset: calc(0.5 * var(--u)); /* at rest the slabs draw the edge: they face you, so it stays one clean line */
  border-radius: calc(6 * var(--u));
  background: var(--edge);
  transform: translateZ(calc((var(--i) - 1.5) * 1 * var(--u)));
}

/* ...four walls give the straight parts a lit surface (inset by the 6 units radius) */
/* the walls only show near side-on (mid-flip); at rest a thin wall seen side-on breaks into dashes */
.wall {
  position: absolute;
  opacity: clamp(0, 1 - pow(var(--flip) - 0.5, 2) * 40, 1);
  background: linear-gradient(90deg, #b3366e, var(--edge) 50%, #ff82ba);
}

.wall-t, .wall-b { left: calc(6 * var(--u)); top: calc(50% - 2 * var(--u)); width: calc(164 * var(--u)); height: calc(4 * var(--u)); }
.wall-l, .wall-r { top: calc(6 * var(--u)); left: calc(50% - 2 * var(--u)); width: calc(4 * var(--u)); height: calc(88 * var(--u)); }
.wall-t { transform: rotateX(90deg) translateZ(calc(50 * var(--u))); }
.wall-b { transform: rotateX(-90deg) translateZ(calc(50 * var(--u))); }
.wall-l { transform: rotateY(-90deg) translateZ(calc(88 * var(--u))); }
.wall-r { transform: rotateY(90deg) translateZ(calc(88 * var(--u))); }

/* each printed side is 3D itself, so its print can be lifted off it */
.front,
.back {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  border-radius: calc(6 * var(--u));
  box-shadow: inset 0 0 0 calc(1 * var(--u)) rgb(255 255 255 / 0.24); /* a faint light rim: the outline reads smooth */
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

.front > *,
.back > * {
  backface-visibility: hidden;
  /* the lifted print fades out while the card is side-on (--flip near 0.5) */
  opacity: clamp(0, pow(var(--flip) - 0.5, 2) * 60, 1);
}

.front {
  align-items: center;
  justify-content: center;
  gap: calc(3 * var(--u));
  background:
    radial-gradient(circle at 50% 38%, rgb(139 108 255 / 0.38), transparent 55%),
    repeating-linear-gradient(135deg, rgb(255 255 255 / 0.035) 0 calc(1 * var(--u)), transparent calc(1 * var(--u)) calc(6 * var(--u))),
    var(--ink);
  transform: translateZ(calc(2 * var(--u)));
}

.front strong {
  margin-top: calc(6 * var(--u));
  color: var(--foil);
  font-size: calc(13 * var(--u));
  font-weight: 800;
  letter-spacing: calc(5 * var(--u));
  text-indent: calc(5 * var(--u)); /* balances the space after the last letter */
  text-shadow: 0 calc(1 * var(--u)) 0 var(--foil-deep);
  transform: translateZ(calc(3 * var(--u)));
}

.front small {
  color: rgb(255 255 255 / 0.6);
  font-size: calc(5.5 * var(--u));
  font-weight: 600;
  letter-spacing: calc(2.5 * var(--u));
  text-indent: calc(2.5 * var(--u));
  transform: translateZ(calc(1.5 * var(--u)));
}

/* foil prism logo, lifted the most */
.logo {
  position: relative;
  width: calc(34 * var(--u));
  height: calc(30 * var(--u));
  transform-style: preserve-3d;
  transform: translateZ(calc(6 * var(--u)));
}

.logo i {
  position: absolute;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.logo i:nth-child(1) { inset: 0; background: linear-gradient(135deg, #fff6dc, var(--foil) 40%, var(--foil-deep)); }
.logo i:nth-child(2) { inset: calc(9 * var(--u)) calc(7.5 * var(--u)) calc(3 * var(--u)); background: var(--ink); }
.logo i:nth-child(3) {
  top: calc(15 * var(--u));
  left: calc(30 * var(--u));
  width: calc(26 * var(--u));
  height: calc(9 * var(--u));
  clip-path: polygon(0 40%, 100% 0, 100% 100%, 0 60%); /* the spectrum fanning out */
  background: linear-gradient(#ff4d9d 0 33%, #ffb547 0 66%, #2ee6d6 0);
}

.back {
  justify-content: center;
  padding: calc(12 * var(--u)) calc(14 * var(--u));
  color: #fff;
  background:
    /* deep enough for the white details (4.5:1 and more): the bright #8b6cff to #c55dcb was 3.7:1 */
    radial-gradient(circle at 100% 0%, rgb(255 181 71 / 0.35), transparent 50%),
    linear-gradient(135deg, #6a45f5, #a3339f);
  transform: rotateY(180deg) translateZ(calc(2 * var(--u)));
}

.back strong { font-size: calc(13 * var(--u)); font-weight: 800; line-height: 1; text-shadow: 0 calc(1 * var(--u)) 0 rgb(0 0 0 / 0.25); transform: translateZ(calc(3 * var(--u))); }
.back small { margin: calc(3 * var(--u)) 0 calc(9 * var(--u)); font-size: calc(6.5 * var(--u)); font-weight: 600; letter-spacing: calc(1.5 * var(--u)); text-transform: uppercase; opacity: 0.85; transform: translateZ(calc(2 * var(--u))); }

.back span {
  display: flex;
  align-items: center;
  gap: calc(5 * var(--u));
  margin-top: calc(3 * var(--u));
  font-size: calc(6.5 * var(--u));
  font-weight: 500;
  transform: translateZ(calc(1.5 * var(--u)));
}

.back span::before {
  content: '';
  width: calc(4 * var(--u));
  height: calc(4 * var(--u));
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 calc(1.5 * var(--u)) rgb(255 77 157 / 0.6);
}

/* the small mark in the corner */
.back b {
  position: absolute;
  top: calc(12 * var(--u));
  right: calc(14 * var(--u));
  width: calc(18 * var(--u));
  height: calc(16 * var(--u));
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  background: linear-gradient(135deg, #fff, rgb(255 255 255 / 0.55));
  transform: translateZ(calc(4 * var(--u)));
}

@keyframes float {
  from { transform: translateY(calc(-3 * var(--u))) rotateX(16deg) rotateY(-20deg) rotateZ(-5deg); }
  to   { transform: translateY(calc(3 * var(--u))) rotateX(10deg) rotateY(-8deg) rotateZ(-3deg); }
}`,
  },

  camera: {
    how: [
      'The body is a plain box of six faces. The front carries the look: one gradient paints the silver top plate, the leatherette band and the bottom plate; a tiny dot pattern gives the leather its grain.',
      'The lens barrel is a cylinder around the <b>Z</b> axis: sixteen strips, each turned with <code>rotateZ(i × 22.5deg)</code>, moved out by the radius, folded flat with <code>rotateX(90deg)</code> and slid forward by half its length so the barrel starts at the body.',
      'Each strip shades itself with <code>cos()</code> of its angle, so the barrel is lit from the top left without any hand-painted gradient per strip.',
      'The glass is a flat disc, so it can clip its reflection with <code>overflow: hidden</code>. The reflection runs the rocking animation in reverse (same duration, same easing), so it seems to stay with the room while the camera turns.',
      'The shutter button and the dial are flat discs laid on the top with <code>rotateX(90deg)</code> and stacked (the button\'s four 1.5 units apart, the dial\'s two 3 units apart): from above they read as short cylinders.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the camera is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="camera">
    <i class="shadow"></i>
    <div class="face front"><i class="window"></i><i class="window"></i><span class="name">OBSCURA</span></div>
    <i class="face back"></i>
    <i class="face left"></i>
    <i class="face right"></i>
    <i class="face top"></i>
    <i class="face bottom"></i>
    <div class="lens">
      <i class="mount"></i>
${lines(16, (i) => `<i class="strip" style="--i:${i}"></i>`, '      ')}
      <i class="glass"><em></em></i>
      <i class="ring"></i>
    </div>
    <div class="flash"><i></i><i></i><i></i><i></i><i></i></div>
    <i class="dial" style="--h:1"></i><i class="dial dial-top" style="--h:4"></i>
    <i class="knob" style="--h:1"></i><i class="knob" style="--h:2.5"></i><i class="knob" style="--h:4"></i><i class="knob knob-top" style="--h:5.5"></i>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the camera is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.46vmin;
  perspective: calc(800 * var(--u));
}

/* 144 × 88, 40 units deep */
.camera {
  --silver: #d9dce8;
  --silver-dark: #8a90a8;
  --leather: #2d2847;
  position: relative;
  width: calc(144 * var(--u));
  height: calc(88 * var(--u));
  transform-style: preserve-3d;
  animation: rock 7s ease-in-out infinite alternate;
}

.shadow {
  position: absolute;
  left: calc(-16 * var(--u));
  top: calc(48 * var(--u));
  width: calc(176 * var(--u));
  height: calc(80 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.42), transparent);
  transform: rotateX(90deg);
}

/* --- the body --- */
.face {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(144 * var(--u));
  height: calc(88 * var(--u));
  /* silver plate, a seam, leatherette with grain, a seam, silver plate */
  background:
    linear-gradient(transparent calc(24 * var(--u)), rgb(0 0 0 / 0.35) calc(24 * var(--u)) calc(25 * var(--u)), transparent calc(25 * var(--u)) calc(79 * var(--u)), rgb(255 255 255 / 0.5) calc(79 * var(--u)) calc(80 * var(--u)), transparent calc(80 * var(--u))),
    radial-gradient(circle, rgb(255 255 255 / 0.07) calc(0.8 * var(--u)), transparent calc(1.2 * var(--u))) 0 0 / calc(3 * var(--u)) calc(3 * var(--u)),
    linear-gradient(var(--silver) 0 calc(3 * var(--u)), #f4f5fa calc(8 * var(--u)), var(--silver) calc(18 * var(--u)), var(--silver-dark) calc(24 * var(--u)), var(--leather) calc(24 * var(--u)) calc(80 * var(--u)), var(--silver) calc(80 * var(--u)), var(--silver-dark));
}

.front { transform: translateZ(calc(20 * var(--u))); }
.back  { transform: rotateY(180deg) translateZ(calc(20 * var(--u))); }
.left, .right { left: calc(52 * var(--u)); width: calc(40 * var(--u)); }
.left  { transform: rotateY(-90deg) translateZ(calc(72 * var(--u))); }
.right { transform: rotateY(90deg) translateZ(calc(72 * var(--u))); }
.left::after, .right::after { content: ''; position: absolute; inset: 0; background: rgb(0 0 0 / 0.3); }
.left::after { background: rgb(0 0 0 / 0.12); }

.top, .bottom { top: calc(24 * var(--u)); height: calc(40 * var(--u)); }
.top {
  background:
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.18) 0 calc(1 * var(--u)), transparent calc(1 * var(--u)) calc(3 * var(--u))),
    linear-gradient(var(--silver-dark), var(--silver) 20%, #f4f5fa 60%, var(--silver));
  transform: rotateX(90deg) translateZ(calc(44 * var(--u)));
}
.bottom {
  background: linear-gradient(var(--silver-dark), #5b6078);
  transform: rotateX(-90deg) translateZ(calc(44 * var(--u)));
}

.window {
  position: absolute;
  top: calc(6 * var(--u));
  left: calc(11 * var(--u));
  box-sizing: border-box;
  width: calc(26 * var(--u));
  height: calc(13 * var(--u));
  border: calc(1.5 * var(--u)) solid var(--silver-dark);
  border-radius: calc(2 * var(--u));
  background:
    linear-gradient(120deg, transparent 30%, rgb(255 255 255 / 0.45) 40%, transparent 50%),
    linear-gradient(160deg, #1a4a5a, #05060c);
}

.window + .window { left: auto; right: calc(11 * var(--u)); width: calc(14 * var(--u)); }

.name {
  position: absolute;
  top: calc(8 * var(--u));
  width: 100%;
  color: #4a4f66;
  font: 800 calc(7 * var(--u)) Inter, system-ui, sans-serif;
  letter-spacing: calc(2.5 * var(--u));
  text-align: center;
  text-indent: calc(2.5 * var(--u));
  text-shadow: 0 calc(1 * var(--u)) 0 rgb(255 255 255 / 0.7); /* engraved */
}

/* --- the lens: a 0 × 0 anchor at its centre, on the front face --- */
.lens {
  position: absolute;
  left: calc(72 * var(--u));
  top: calc(52 * var(--u));
  transform-style: preserve-3d;
  transform: translateZ(calc(20 * var(--u)));
}

.mount {
  position: absolute;
  left: calc(-31 * var(--u));
  top: calc(-31 * var(--u));
  width: calc(62 * var(--u));
  height: calc(62 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle, #0b0c12 0 76%, var(--silver-dark) 80%, #f4f5fa 88%, var(--silver) 94%, var(--silver-dark));
  transform: translateZ(calc(0.5 * var(--u)));
}

/* 16 strips, radius 25 units, 26 units long. Strip top = at the body, bottom = the front. */
.strip {
  --a: calc(var(--i) * 22.5deg);
  position: absolute;
  left: calc(-5.3 * var(--u));
  top: calc(-13 * var(--u));
  width: calc(10.6 * var(--u));
  height: calc(26 * var(--u));
  backface-visibility: hidden;
  background:
    linear-gradient(rgb(0 0 0 / calc(0.36 - 0.34 * cos(var(--a) + 35deg))) 0 0), /* light from top left */
    linear-gradient(transparent 0 calc(5 * var(--u)), rgb(0 0 0 / 0.5) calc(5 * var(--u)) calc(6 * var(--u)), transparent calc(6 * var(--u)) calc(17 * var(--u)), #ff4d9d calc(17 * var(--u)) calc(18 * var(--u)), transparent calc(18 * var(--u))),
    repeating-linear-gradient(90deg, #2a2c3a 0 calc(1.5 * var(--u)), #0d0e14 calc(1.5 * var(--u)) calc(3 * var(--u))) 0 calc(6 * var(--u)) / 100% calc(11 * var(--u)) no-repeat, /* knurled grip */
    linear-gradient(#1a1b24 0 calc(17 * var(--u)), var(--silver) calc(17 * var(--u)), #f4f5fa calc(22 * var(--u)), var(--silver-dark));
  transform: rotateZ(var(--a)) translateY(calc(-25 * var(--u))) rotateX(90deg) translateY(calc(13 * var(--u)));
}

.ring,
.glass {
  position: absolute;
  border-radius: 50%;
}

.ring {
  left: calc(-25.5 * var(--u));
  top: calc(-25.5 * var(--u));
  width: calc(51 * var(--u));
  height: calc(51 * var(--u));
  background: radial-gradient(circle, transparent 0 calc(17 * var(--u)), #05060a calc(17.5 * var(--u)) calc(18.5 * var(--u)), var(--silver-dark) calc(19 * var(--u)), #f4f5fa calc(21.5 * var(--u)), var(--silver) calc(23 * var(--u)), var(--silver-dark));
  transform: translateZ(calc(26 * var(--u)));
}

.glass {
  left: calc(-18 * var(--u));
  top: calc(-18 * var(--u));
  width: calc(36 * var(--u));
  height: calc(36 * var(--u));
  overflow: hidden; /* flat disc: clipping is safe */
  background:
    radial-gradient(circle, #05060a 0 calc(4 * var(--u)), transparent calc(5 * var(--u))),
    radial-gradient(circle, transparent 0 calc(9 * var(--u)), rgb(139 108 255 / 0.5) calc(10 * var(--u)), transparent calc(12 * var(--u))),
    conic-gradient(from 200deg, #183a4e, #0a0c18 25%, #463a8a 50%, #0a0c18 75%, #183a4e);
  transform: translateZ(calc(22 * var(--u))); /* recessed 4 units behind the ring */
}

/* the reflection of a window: runs the rocking in reverse */
.glass em {
  position: absolute;
  top: calc(5 * var(--u));
  left: calc(9 * var(--u));
  width: calc(12 * var(--u));
  height: calc(16 * var(--u));
  border-radius: 50% 50% 40% 40%;
  background:
    linear-gradient(90deg, transparent 45%, rgb(0 0 0 / 0.5) 45% 55%, transparent 55%),
    linear-gradient(transparent 45%, rgb(0 0 0 / 0.5) 45% 55%, transparent 55%),
    rgb(255 255 255 / 0.55);
  animation: glare 7s ease-in-out infinite alternate;
}

/* --- on top --- */
.flash {
  position: absolute;
  top: calc(-20 * var(--u));
  left: calc(12 * var(--u));
  width: calc(40 * var(--u));
  height: calc(20 * var(--u));
  transform-style: preserve-3d;
}

.flash i {
  position: absolute;
  inset: 0;
  background: linear-gradient(var(--silver), var(--silver-dark));
}

.flash i:nth-child(1) {
  box-sizing: border-box;
  border: calc(2 * var(--u)) solid var(--silver-dark);
  background:
    repeating-linear-gradient(transparent 0 calc(1.5 * var(--u)), rgb(0 0 0 / 0.08) calc(1.5 * var(--u)) calc(2.5 * var(--u))), /* Fresnel lines */
    radial-gradient(ellipse at 50% 40%, #fff, #e7e9f3 55%, #b9bed0);
  transform: translateZ(calc(12 * var(--u)));
}
.flash i:nth-child(2) { transform: rotateY(180deg) translateZ(calc(12 * var(--u))); }
.flash i:nth-child(3),
.flash i:nth-child(4) { left: calc(8 * var(--u)); width: calc(24 * var(--u)); background: linear-gradient(var(--silver-dark), #5b6078); }
.flash i:nth-child(3) { transform: rotateY(90deg) translateZ(calc(20 * var(--u))); }
.flash i:nth-child(4) { transform: rotateY(-90deg) translateZ(calc(20 * var(--u))); }
.flash i:nth-child(5) {
  top: calc(-2 * var(--u));
  height: calc(24 * var(--u));
  background: linear-gradient(90deg, var(--silver), #f4f5fa 50%, var(--silver));
  transform: rotateX(90deg);
}

/* flat discs centred on the top edge, lifted by --h, laid down */
.knob,
.dial {
  position: absolute;
  border-radius: 50%;
  transform: translateY(calc(var(--h) * -1 * var(--u))) rotateX(90deg);
}

.knob {
  left: calc(110 * var(--u));
  top: calc(-8 * var(--u));
  width: calc(16 * var(--u));
  height: calc(16 * var(--u));
  background: radial-gradient(circle, var(--silver) 0 45%, var(--silver-dark));
}

.knob-top {
  background: radial-gradient(circle at 40% 35%, #fff 0 8%, #ff4d9d 35%, #8c2a57);
}

.dial {
  left: calc(74 * var(--u));
  top: calc(-12 * var(--u));
  width: calc(24 * var(--u));
  height: calc(24 * var(--u));
  background: repeating-conic-gradient(#5b6078 0 5deg, var(--silver) 5deg 10deg); /* knurled edge */
}

.dial-top {
  background:
    linear-gradient(transparent 46%, #ff4d9d 46% 54%, transparent 54%) 50% 0 / calc(2 * var(--u)) 50% no-repeat,
    radial-gradient(circle, #f4f5fa, var(--silver) 60%, var(--silver-dark) 64%, transparent 66%),
    repeating-conic-gradient(#5b6078 0 5deg, var(--silver) 5deg 10deg);
}

@keyframes rock {
  from { transform: rotateX(-14deg) rotateY(-30deg); }
  to   { transform: rotateX(-8deg) rotateY(26deg); }
}

@keyframes glare {
  from { transform: translateX(calc(10 * var(--u))) rotate(-12deg); }
  to   { transform: translateX(calc(-4 * var(--u))) rotate(-12deg); }
}`,
  },

  coffeecup: {
    how: [
      'A paper cup is a <b>frustum</b>: a cone with its tip cut off. Twenty strips stand on the base circle (<code>rotateY(i × 18deg) translateZ(27 units)</code>), hinged on their bottom edge, and lean <b>out</b> by <code>atan((36 − 27) / 100) ≈ 5.14°</code> so the rim is wider than the base.',
      'Each strip is a trapezoid cut with <code>clip-path</code>: 11.4 units wide at the rim, 8.6 units at the base (both are 2 · r · tan(9°)), each drawn 1.2 units wider so neighbours overlap and no seam shows. Its height is the slant length, √(100² + 9²).',
      'The sleeve and its logo are painted on <b>one</b> canvas, exactly one lap long, and every strip slides it by its index (<code>background-position</code>). The lap is measured at the sleeve\'s middle height, where the strips are 9.86 units wide, so the logo wraps round without a seam.',
      'The light stays put while the cup turns: every strip has a dark overlay whose opacity runs one lap, started i/20 of the way round with a negative <code>animation-delay</code>.',
      'The lid is five discs stacked 1.5 units apart plus a raised spout. The steam rises from the sip slot: it sits there inside the spinning part, so it goes round with the cup, and a counter-turn keeps each wisp facing you. Each S-shaped wisp rises, grows and fades, and starts and ends invisible so the loop never shows.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the cup is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="coffee">
    <div class="spin">
      <i class="shadow"></i>
${lines(20, (i) => `<i class="strip" style="--i:${i}"></i>`, '      ')}
      <i class="lid" style="--y:-1.5"></i><i class="lid" style="--y:0"></i><i class="lid" style="--y:1.5"></i><i class="lid" style="--y:3"></i>
      <i class="lid lid-top" style="--y:4.5"></i>
      <i class="lid spout" style="--y:6.5"></i>
      <i class="vent"><i class="face"><i class="steam" style="--x:-2;--d:0"></i><i class="steam" style="--x:3;--d:1"></i></i></i>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the cup is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.36vmin;
  perspective: calc(800 * var(--u));
}

/* a 0-wide column, 100 units tall: the cup's axis */
.coffee {
  --paper: #f4f1ea;
  --paper-dark: #d9d3c6;
  --kraft: #c1834a;
  --violet: #8b6cff;
  --lid: #22232e;
  position: relative;
  width: 0;
  height: calc(100 * var(--u));
  transform-style: preserve-3d;
  /* the lid rises a little above this column: move it down by that much, and the solid cup is
     centred. The steam is faint and rises well above it, so it is left out of that sum: the eye
     places the cup by its body */
  translate: 0 calc(3 * var(--u));
  transform: rotateX(-20deg);
}

.spin {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: spin 12s linear infinite;
}

.shadow {
  position: absolute;
  left: calc(-60 * var(--u));
  top: calc(70 * var(--u));
  width: calc(120 * var(--u));
  height: calc(60 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.45), transparent);
  transform: rotateX(90deg);
}

/* 20 trapezoids hinged on the base circle (r 27 units), leaning out towards the rim (r 36 units) */
.strip {
  position: absolute;
  left: calc(-6.3 * var(--u));
  bottom: 0;
  width: calc(12.6 * var(--u));      /* 11.4 units at the rim, plus a little overlap */
  height: calc(100.4 * var(--u));    /* the slant length */
  transform-origin: 50% 100%;
  transform: rotateY(calc(var(--i) * 18deg)) translateZ(calc(27 * var(--u))) rotateX(-5.14deg);
  clip-path: polygon(0 0, 100% 0, calc(50% + 4.9 * var(--u)) 100%, calc(50% - 4.9 * var(--u)) 100%);
  backface-visibility: hidden;
  /* a soft shade under the lid: the lid's discs are nearly side-on, and their edge against
     bare white paper steps and reads as a dashed line; against the shade it reads as one edge */
  box-shadow: inset 0 calc(5 * var(--u)) calc(3 * var(--u)) calc(-2 * var(--u)) rgb(20 20 30 / 0.8);
  /* one 197 units canvas = one lap round the sleeve's middle; each strip shows its own slice */
  background-image:
    radial-gradient(ellipse calc(1.2 * var(--u)) calc(5 * var(--u)) at calc(49.3 * var(--u)) calc(53 * var(--u)), #f0d9b8 0 60%, transparent 90%),
    radial-gradient(ellipse calc(4.5 * var(--u)) calc(6.5 * var(--u)) at calc(49.3 * var(--u)) calc(53 * var(--u)), #fff 0 20%, #6b3e22 30% 92%, transparent),
    radial-gradient(circle calc(11 * var(--u)) at calc(49.3 * var(--u)) calc(53 * var(--u)), var(--violet) 0 86%, #fff 87% 93%, var(--violet) 94% 100%, transparent 100%),
    radial-gradient(ellipse calc(1.2 * var(--u)) calc(5 * var(--u)) at calc(148 * var(--u)) calc(53 * var(--u)), #f0d9b8 0 60%, transparent 90%),
    radial-gradient(ellipse calc(4.5 * var(--u)) calc(6.5 * var(--u)) at calc(148 * var(--u)) calc(53 * var(--u)), #fff 0 20%, #6b3e22 30% 92%, transparent),
    radial-gradient(circle calc(11 * var(--u)) at calc(148 * var(--u)) calc(53 * var(--u)), var(--violet) 0 86%, #fff 87% 93%, var(--violet) 94% 100%, transparent 100%),
    linear-gradient(transparent calc(34 * var(--u)), var(--kraft) calc(34 * var(--u)) calc(36 * var(--u)), #d8b08c calc(36 * var(--u)) calc(37 * var(--u)), var(--kraft) calc(37 * var(--u)) calc(70 * var(--u)), #d8b08c calc(70 * var(--u)) calc(71 * var(--u)), var(--kraft) calc(71 * var(--u)) calc(73 * var(--u)), transparent calc(73 * var(--u))),
    linear-gradient(var(--paper-dark) 0 calc(1 * var(--u)), var(--paper) calc(3 * var(--u)) calc(12 * var(--u)), var(--violet) calc(12 * var(--u)) calc(14 * var(--u)), var(--paper) calc(14 * var(--u)) calc(100% - 3 * var(--u)), var(--paper-dark));
  background-size: calc(197.3 * var(--u)) 100%;
  background-position: calc(1.07 * var(--u) - var(--i) * 9.864 * var(--u)) 0;
}

/* lighting that stays put: one lap of shade, each strip started i/20 of the way round */
.strip::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #06070f;
  animation: shade 12s linear infinite;
  animation-delay: calc(var(--i) * -0.6s);
}

/* discs centred on the rim, lifted by --y, laid flat */
.lid {
  --r: calc(38.4 * var(--u));
  position: absolute;
  left: calc(var(--r) * -1);
  top: calc(var(--r) * -1);
  width: calc(var(--r) * 2);
  height: calc(var(--r) * 2);
  border-radius: 50%;
  background: radial-gradient(circle, var(--lid) 0 80%, #646570 94%, var(--lid));
  transform: translateY(calc(var(--y) * -1 * var(--u))) rotateX(90deg);
}

.lid-top {
  --r: calc(35.4 * var(--u));
  background:
    radial-gradient(circle, transparent 0 70%, rgb(255 255 255 / 0.12) 72% 74%, transparent 76%),
    radial-gradient(circle at 35% 30%, #4e4f58, var(--lid) 60%);
}

.spout {
  --r: calc(13 * var(--u));
  background:
    radial-gradient(ellipse calc(7 * var(--u)) calc(2.5 * var(--u)) at 50% 70%, #05060a 0 90%, transparent), /* the sip slot */
    radial-gradient(circle at 40% 30%, #6a6b74, var(--lid) 70%);
  transform: translateY(calc(var(--y) * -1 * var(--u))) translateZ(calc(19 * var(--u))) rotateX(90deg);
}

/* steam rises from the sip slot: placed there inside .spin, so it goes round with the cup... */
.vent {
  position: absolute;
  top: calc(-7 * var(--u));
  left: 0;
  transform-style: preserve-3d;
  transform: translateZ(calc(24 * var(--u)));
}

/* ...and turned back the other way, so the wisps always face you */
.face {
  position: absolute;
  transform-style: preserve-3d;
  animation: spin 12s linear infinite reverse;
}

/* two arcs make an S */
.steam {
  position: absolute;
  top: calc(-30 * var(--u));
  left: calc(-5 * var(--u));
  width: calc(10 * var(--u));
  height: calc(30 * var(--u));
  opacity: 0;
  animation: steam 3.6s linear infinite;
  animation-delay: calc(var(--d) * -1.8s);
}

.steam::before,
.steam::after {
  content: '';
  position: absolute;
  left: 0;
  box-sizing: border-box;
  width: 100%;
  height: 52%;
  border: calc(2.5 * var(--u)) solid transparent;
  border-radius: 50%;
}

.steam::before { top: 0; border-left-color: rgb(236 238 251 / 0.5); }
.steam::after { bottom: 0; left: -70%; border-right-color: rgb(236 238 251 / 0.5); }

@keyframes spin {
  to { transform: rotateY(360deg); }
}

/* 0% = facing you; between 25% and 75% the strip faces away */
@keyframes shade {
  0%       { opacity: 0.06; }
  12.5%    { opacity: 0.3; }
  25%, 50% { opacity: 0.5; }
  75%      { opacity: 0.3; }
  88%      { opacity: 0; }
  100%     { opacity: 0.06; }
}

@keyframes steam {
  0%   { opacity: 0; transform: translate(calc(var(--x) * 1 * var(--u)), calc(10 * var(--u))) scale(0.6); }
  30%  { opacity: 0.9; }
  60%  { transform: translate(calc(var(--x) * 1 * var(--u) + 4 * var(--u)), calc(-12 * var(--u))) scale(0.9, 1.1); }
  100% { opacity: 0; transform: translate(calc(var(--x) * 1 * var(--u) - 2 * var(--u)), calc(-34 * var(--u))) scale(1.1, 1.3); }
}`,
  },
};
