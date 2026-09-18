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
      'The band is twelve flat strips. Each one starts at the arc centre, turns to its angle with <code>rotateZ</code>, moves out by the radius with <code>translateY(-58px)</code> and folds flat with <code>rotateX(90deg)</code>: together they are the top surface of an arch. Two masked rings close its sides.',
      'A cup is a short cylinder built the easy way, standing up like a can (strips at <code>rotateY(i × 30deg) translateZ(r)</code>, a disc on each end), then laid on its side with <code>rotateZ(±90deg)</code> so the top disc faces outward.',
      'Light is computed, not painted by hand: each strip darkens itself with <code>cos()</code> / <code>sin()</code> of its own angle, so the strips facing up are the brightest.',
      'The turn cannot simply be switched off on hover: removing an animation snaps back. Instead two <code>@property</code> values animate: the lap angle <code>--spin</code> and a weight <code>--k</code>. The transform uses <code>--spin × --k</code>, and hover eases <code>--k</code> to 0, which glides from wherever the lap is to the front pose.',
      'The hovered element is a static wrapper and everything that moves has <code>pointer-events: none</code>, so the hover never flickers.',
    ],
    html: `<div class="scene">
  <div class="headphones" tabindex="0">
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
  perspective: 800px;
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
  width: 216px;
  height: 184px;
  border-radius: 16px;
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
  left: -80px;
  top: 34px;
  width: 160px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.45), transparent);
  transform: rotateX(90deg);
}

/* --- the band: 12 strips over 200deg, radius 58px --- */
.band {
  position: absolute;
  top: -22px;
  transform-style: preserve-3d;
}

.band i {
  --a: calc(-100deg + (var(--i) + 0.5) * 16.667deg);
  position: absolute;
  left: -8.8px;
  top: -11px;
  width: 17.6px; /* one side of the polygon, a hair wider: no seams */
  height: 22px;  /* the band's width, front to back */
  background:
    linear-gradient(rgb(0 0 0 / calc(0.5 - 0.46 * cos(var(--a)))) 0 0), /* shade: none on top */
    repeating-linear-gradient(90deg, var(--stitch) 0 2px, transparent 2px 4px) 0 3px / 100% 1px no-repeat,
    repeating-linear-gradient(90deg, var(--stitch) 0 2px, transparent 2px 4px) 0 18px / 100% 1px no-repeat,
    linear-gradient(var(--leather), var(--leather-hi) 45%, var(--leather));
  transform: rotateZ(var(--a)) translateY(-58px) rotateX(90deg);
}

/* the band's side walls: a ring, masked to the same 200deg */
.side {
  position: absolute;
  left: -58px;
  top: -58px;
  width: 116px;
  height: 116px;
  background: radial-gradient(closest-side, transparent calc(100% - 6px), var(--leather) calc(100% - 5.5px), color-mix(in srgb, var(--leather) 70%, #000) 100%, transparent 100%);
  mask: conic-gradient(from -100deg, #000 0 200deg, transparent 0);
  transform: translateZ(11px);
}

.side + .side {
  transform: translateZ(-11px);
}

/* --- metal: sliders (two crossed planes) and yokes (half rings) --- */
.slider {
  position: absolute;
  top: -18px;
  left: -5px;
  width: 10px;
  height: 20px;
  background: linear-gradient(90deg, var(--metal-dark), var(--metal) 45%, #eef0fa 55%, var(--metal-dark));
}

.slider-l { transform: translateX(-55px) rotateY(90deg); }
.slider-r { transform: translateX(55px) rotateY(90deg); }
.slider-lf { left: -1.5px; width: 3px; transform: translateX(-55px); }
.slider-rf { left: -1.5px; width: 3px; transform: translateX(55px); }

.yoke {
  position: absolute;
  left: -35px;
  top: 0;
  width: 70px;
  height: 70px;
  background: radial-gradient(closest-side, transparent calc(100% - 4px), var(--metal) calc(100% - 3.5px), var(--metal-dark) 100%, transparent 100%);
  mask: conic-gradient(from -90deg, #000 0 180deg, transparent 0);
}

.yoke-l { transform: translateX(-55px) rotateY(90deg); }
.yoke-r { transform: translateX(55px) rotateY(90deg); }

/* --- cups: built standing (axis Y), then laid down; top disc = outside --- */
.cup {
  --dir: 1; /* which way "up" went: flips the light */
  position: absolute;
  top: 35px;
  transform-style: preserve-3d;
  transform: translateX(55px) rotateZ(90deg);
}

.cup-l {
  --dir: -1;
  transform: translateX(-55px) rotateZ(-90deg);
}

/* 12 strips, radius 31px, 26px thick: 17px shell, a seam, 9px cushion */
.cup i {
  position: absolute;
  left: -8.6px;
  top: -13px;
  width: 17.2px;
  height: 26px;
  backface-visibility: hidden;
  background:
    linear-gradient(rgb(0 0 0 / calc(0.3 + 0.28 * var(--dir) * sin(var(--i) * 30deg))) 0 0),
    linear-gradient(var(--shell-hi) 0 2px, var(--shell) 4px 15px, var(--shell-hi) 16.5px, transparent 16.5px),
    linear-gradient(transparent 17px, #2a2c3c 18px, var(--pad) 21px, #0b0c12);
  transform: rotateY(calc(var(--i) * 30deg)) translateZ(31px);
}

/* the seam light: its own layer, so hover only changes opacity */
.cup i::after {
  content: '';
  position: absolute;
  inset: 16px 0 auto;
  height: 1.5px;
  background: var(--glow);
  opacity: 0.25;
  transition: opacity 0.5s;
}

.outer,
.cushion {
  position: absolute;
  left: -31.5px;
  top: -31.5px;
  width: 63px;
  height: 63px;
  border-radius: 50%;
  backface-visibility: hidden;
}

.outer {
  background:
    radial-gradient(circle, var(--metal) 0 2.5px, transparent 3px),
    radial-gradient(circle, transparent 0 7px, var(--metal) 7.5px 8.5px, transparent 9px),
    radial-gradient(circle, transparent 0 83%, var(--metal-dark) 85%, #eef0fa 90%, var(--metal) 94%, var(--metal-dark)),
    radial-gradient(circle at 35% 30%, var(--shell-hi), var(--shell) 60%, color-mix(in srgb, var(--shell) 60%, #000));
  transform: rotateX(90deg) translateZ(13px);
}

.outer em {
  position: absolute;
  inset: 9px;
  border: 2px solid var(--glow);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--glow), inset 0 0 8px var(--glow);
  opacity: 0.2;
  transition: opacity 0.5s;
}

.cushion {
  background: radial-gradient(circle, #06070b 0 52%, #2a2c3c 60%, var(--pad) 72%, #2a2c3c 86%, #0b0c12);
  transform: rotateX(-90deg) translateZ(13px);
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
  perspective: 800px;
}

.bottle {
  --gold: #ffcf87;
  --gold-deep: #aa6c16;
  position: relative;
  width: 84px;
  height: 96px;
  transform-style: preserve-3d;
  animation: sway 8s ease-in-out infinite alternate;
}

.shadow {
  position: absolute;
  left: -18px;
  top: 56px;
  width: 120px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(80 20 50 / 0.55), transparent);
  transform: rotateX(90deg);
}

/* --- the octagonal prism: width, depth, corner cut, height --- */
.prism {
  position: absolute;
  left: calc((84px - var(--w)) / 2);
  width: var(--w);
  height: var(--h);
  transform-style: preserve-3d;
}

.glass  { --w: 84px; --d: 44px; --c: 9px; --h: 96px; top: 0; }
.liquid { --w: 74px; --d: 34px; --c: 6.93px; --h: 50px; top: 33px; } /* 5px glass walls, 13px glass floor */

.prism > i {
  position: absolute;
  top: 0;
  box-sizing: border-box;
  left: calc((var(--w) - var(--fw)) / 2);
  width: var(--fw);
  height: var(--h);
  transform: rotateY(calc(var(--n) * 45deg)) translateX(var(--fx, 0px)) translateZ(var(--fz));
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
  width: var(--w, 84px);
  height: var(--d, 44px);
  --c: 9px;
  clip-path: polygon(var(--c) 0, calc(100% - var(--c)) 0, 100% var(--c), 100% calc(100% - var(--c)),
    calc(100% - var(--c)) 100%, var(--c) 100%, 0 calc(100% - var(--c)), 0 var(--c));
}

.top {
  top: -22px;
  background: radial-gradient(ellipse 16px 11px, rgb(255 255 255 / 0.3), transparent), rgb(200 190 255 / 0.18);
  transform: rotateX(90deg);
}

.floor {
  top: 74px;
  background: rgb(190 175 255 / 0.2);
  transform: rotateX(-90deg);
}

/* glass: tinted, light edges, drawn from both sides; the lower 13px is the thick bottom */
.glass > i {
  --lit: 0.1;
  border: 1px solid rgb(236 238 251 / 0.38);
  border-radius: 2px;
  background:
    linear-gradient(transparent calc(100% - 14px), rgb(255 255 255 / 0.35) calc(100% - 13px), rgb(255 255 255 / 0.12) calc(100% - 10px), rgb(255 255 255 / 0.2)),
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
  --w: 74px;
  --d: 34px;
  --c: 6.93px;
  top: -17px;
  background: radial-gradient(ellipse 60% 70% at 40% 40%, rgb(255 255 255 / 0.45), transparent), #ff8a70;
  opacity: 0.9;
  transform: rotateX(90deg);
}

.glint {
  position: absolute;
  top: -20%;
  left: 0;
  width: 22px;
  height: 140%;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.7) 45% 55%, transparent);
  transform: translateX(-40px) rotate(18deg);
  animation: glint 8s linear infinite;
}

.label {
  position: absolute;
  left: 13px;
  top: 26px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 3px;
  box-sizing: border-box;
  width: 58px;
  height: 36px;
  border: 1px solid var(--gold);
  background: #0d0e17;
  box-shadow: inset 0 0 0 2px #0d0e17, inset 0 0 0 2.6px var(--gold-deep);
  color: var(--gold);
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1;
  backface-visibility: hidden;
  transform: translateZ(22.6px); /* just in front of the glass */
}

.label b { font-size: 11px; font-weight: 400; letter-spacing: 2.5px; text-indent: 2.5px; }
.label small { font: 4.5px system-ui, sans-serif; letter-spacing: 0.8px; white-space: nowrap; opacity: 0.85; }

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
  --bw: 24px;
  --bd: 18px;
  left: 30px;
  top: -7px;
  width: 24px;
  height: 7px;
}

.neck > * { background: linear-gradient(var(--gold-deep), var(--gold) 50%, var(--gold-deep)); }

.cap {
  --bw: 42px;
  --bd: 30px;
  left: 21px;
  top: -39px;
  width: 42px;
  height: 32px;
}

/* vertical fluting over polished gold */
.cap > * {
  background:
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.22) 0 1.5px, transparent 1.5px 3px, rgb(0 0 0 / 0.12) 3px 4.5px, transparent 4.5px 6px),
    linear-gradient(90deg, var(--gold-deep), var(--gold) 40%, #fff6dc 50%, var(--gold) 60%, var(--gold-deep));
}

.cap > :nth-child(1) { overflow: hidden; }
.cap > :nth-child(3),
.cap > :nth-child(4) {
  background:
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.18) 0 1.5px, transparent 1.5px 3px, rgb(0 0 0 / 0.14) 3px 4.5px, transparent 4.5px 6px),
    linear-gradient(90deg, var(--gold-deep), #e2a54f);
}
.cap > :nth-child(5) {
  background:
    radial-gradient(circle, transparent 0 7px, var(--gold-deep) 7.5px 8.5px, transparent 9px),
    linear-gradient(135deg, #fff6dc, var(--gold) 45%, var(--gold-deep));
}
.cap .glint { animation-delay: -0.5s; }

@keyframes sway {
  from { transform: rotateX(-12deg) rotateY(-38deg); }
  to   { transform: rotateX(-12deg) rotateY(38deg); }
}

/* one sweep per half swing, while the bottle passes the front */
@keyframes glint {
  0%, 36%   { transform: translateX(-40px) rotate(18deg); }
  64%, 100% { transform: translateX(90px) rotate(18deg); }
}`,
  },

  businesscard: {
    how: [
      'The card has real thickness: the printed front and back are two planes at <code>translateZ(±2px)</code>, the back turned with <code>rotateY(180deg)</code>. Both hide their backface, so each shows only while it faces you.',
      'The painted edge is four rounded slabs 1px apart (they fill the rounded corners) plus four flat walls on the straight parts, which give the edge a clean, lit surface when the card is edge-on.',
      'Embossing is real depth: each printed side is itself <code>preserve-3d</code>, and the logo and the lines of text are lifted off it with <code>translateZ(2–6px)</code>. As the card turns, they slide against the paper.',
      'The idle sway and the flip are on two different elements, so they never fight over <code>transform</code>. The flip is a plain <code>transition</code> with a small overshoot.',
      'The hovered element is a static wrapper; the moving card inside has <code>pointer-events: none</code>, so the flip cannot pull the card out from under the pointer.',
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
    css: `.scene {
  perspective: 800px;
}

/* the static hit area */
.bizcard {
  --ink: #0f1020;
  --edge: #ff4d9d;
  --foil: #ffd291;
  --foil-deep: #aa6c16;
  display: grid;
  place-items: center;
  width: 220px;
  height: 170px;
  border-radius: 16px;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  transform-style: preserve-3d;
}

/* the tilt and a slow idle sway */
.float {
  position: relative;
  width: 176px;
  height: 100px;
  pointer-events: none;
  transform-style: preserve-3d;
  animation: float 6s ease-in-out infinite alternate;
}

.shadow {
  position: absolute;
  inset: 10px -6px -16px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.38), transparent);
  transform: translateZ(-36px);
}

/* the flip, on its own element */
.card {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.9s cubic-bezier(0.35, 1.25, 0.45, 1);
}

.bizcard:hover .card,
.bizcard:focus-visible .card {
  transform: rotateY(180deg);
}

/* 4px thick: four rounded slabs fill the corners of the edge... */
.slab {
  position: absolute;
  inset: 0.5px;
  border-radius: 6px;
  background: var(--edge);
  transform: translateZ(calc((var(--i) - 1.5) * 1px));
}

/* ...four walls give the straight parts a lit surface (inset by the 6px radius) */
.wall {
  position: absolute;
  background: linear-gradient(90deg, #b3366e, var(--edge) 50%, #ff82ba);
}

.wall-t, .wall-b { left: 6px; top: calc(50% - 2px); width: 164px; height: 4px; }
.wall-l, .wall-r { top: 6px; left: calc(50% - 2px); width: 4px; height: 88px; }
.wall-t { transform: rotateX(90deg) translateZ(50px); }
.wall-b { transform: rotateX(-90deg) translateZ(50px); }
.wall-l { transform: rotateY(-90deg) translateZ(88px); }
.wall-r { transform: rotateY(90deg) translateZ(88px); }

/* each printed side is 3D itself, so its print can be lifted off it */
.front,
.back {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

.front > *,
.back > * {
  backface-visibility: hidden;
}

.front {
  align-items: center;
  justify-content: center;
  gap: 3px;
  background:
    radial-gradient(circle at 50% 38%, rgb(139 108 255 / 0.38), transparent 55%),
    repeating-linear-gradient(135deg, rgb(255 255 255 / 0.035) 0 1px, transparent 1px 6px),
    var(--ink);
  transform: translateZ(2px);
}

.front strong {
  margin-top: 6px;
  color: var(--foil);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 5px;
  text-indent: 5px; /* balances the space after the last letter */
  text-shadow: 0 1px 0 var(--foil-deep);
  transform: translateZ(3px);
}

.front small {
  color: rgb(255 255 255 / 0.6);
  font-size: 5.5px;
  font-weight: 600;
  letter-spacing: 2.5px;
  text-indent: 2.5px;
  transform: translateZ(1.5px);
}

/* foil prism logo, lifted the most */
.logo {
  position: relative;
  width: 34px;
  height: 30px;
  transform-style: preserve-3d;
  transform: translateZ(6px);
}

.logo i {
  position: absolute;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}

.logo i:nth-child(1) { inset: 0; background: linear-gradient(135deg, #fff6dc, var(--foil) 40%, var(--foil-deep)); }
.logo i:nth-child(2) { inset: 9px 7.5px 3px; background: var(--ink); }
.logo i:nth-child(3) {
  top: 15px;
  left: 30px;
  width: 26px;
  height: 9px;
  clip-path: polygon(0 40%, 100% 0, 100% 100%, 0 60%); /* the spectrum fanning out */
  background: linear-gradient(#ff4d9d 0 33%, #ffb547 0 66%, #2ee6d6 0);
}

.back {
  justify-content: center;
  padding: 12px 14px;
  color: #fff;
  background:
    radial-gradient(circle at 100% 0%, rgb(255 181 71 / 0.55), transparent 50%),
    linear-gradient(135deg, #8b6cff, #c55dcb);
  transform: rotateY(180deg) translateZ(2px);
}

.back strong { font-size: 13px; font-weight: 800; line-height: 1; text-shadow: 0 1px 0 rgb(0 0 0 / 0.25); transform: translateZ(3px); }
.back small { margin: 3px 0 9px; font-size: 6.5px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.85; transform: translateZ(2px); }

.back span {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  font-size: 6.5px;
  font-weight: 500;
  transform: translateZ(1.5px);
}

.back span::before {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 1.5px rgb(255 77 157 / 0.6);
}

/* the small mark in the corner */
.back b {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 18px;
  height: 16px;
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  background: linear-gradient(135deg, #fff, rgb(255 255 255 / 0.55));
  transform: translateZ(4px);
}

@keyframes float {
  from { transform: translateY(-3px) rotateX(16deg) rotateY(-20deg) rotateZ(-5deg); }
  to   { transform: translateY(3px) rotateX(10deg) rotateY(-8deg) rotateZ(-3deg); }
}`,
  },

  camera: {
    how: [
      'The body is a plain box of six faces. The front carries the look: one gradient paints the silver top plate, the leatherette band and the bottom plate; a tiny dot pattern gives the leather its grain.',
      'The lens barrel is a cylinder around the <b>Z</b> axis: sixteen strips, each turned with <code>rotateZ(i × 22.5deg)</code>, moved out by the radius, folded flat with <code>rotateX(90deg)</code> and slid forward by half its length so the barrel starts at the body.',
      'Each strip shades itself with <code>cos()</code> of its angle, so the barrel is lit from the top left without any hand-painted gradient per strip.',
      'The glass is a flat disc, so it can clip its reflection with <code>overflow: hidden</code>. The reflection runs the rocking animation in reverse (same duration, same easing), so it seems to stay with the room while the camera turns.',
      'The shutter button and the dial are flat discs laid on the top with <code>rotateX(90deg)</code>, stacked 1.5px apart: from above they read as short cylinders.',
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
  perspective: 800px;
}

/* 144 × 88, 40px deep */
.camera {
  --silver: #d9dce8;
  --silver-dark: #8a90a8;
  --leather: #2d2847;
  position: relative;
  width: 144px;
  height: 88px;
  transform-style: preserve-3d;
  animation: rock 7s ease-in-out infinite alternate;
}

.shadow {
  position: absolute;
  left: -16px;
  top: 48px;
  width: 176px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.42), transparent);
  transform: rotateX(90deg);
}

/* --- the body --- */
.face {
  position: absolute;
  top: 0;
  left: 0;
  width: 144px;
  height: 88px;
  /* silver plate, a seam, leatherette with grain, a seam, silver plate */
  background:
    linear-gradient(transparent 24px, rgb(0 0 0 / 0.35) 24px 25px, transparent 25px 79px, rgb(255 255 255 / 0.5) 79px 80px, transparent 80px),
    radial-gradient(circle, rgb(255 255 255 / 0.07) 0.8px, transparent 1.2px) 0 0 / 3px 3px,
    linear-gradient(var(--silver) 0 3px, #f4f5fa 8px, var(--silver) 18px, var(--silver-dark) 24px, var(--leather) 24px 80px, var(--silver) 80px, var(--silver-dark));
}

.front { transform: translateZ(20px); }
.back  { transform: rotateY(180deg) translateZ(20px); }
.left, .right { left: 52px; width: 40px; }
.left  { transform: rotateY(-90deg) translateZ(72px); }
.right { transform: rotateY(90deg) translateZ(72px); }
.left::after, .right::after { content: ''; position: absolute; inset: 0; background: rgb(0 0 0 / 0.3); }
.left::after { background: rgb(0 0 0 / 0.12); }

.top, .bottom { top: 24px; height: 40px; }
.top {
  background:
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.18) 0 1px, transparent 1px 3px),
    linear-gradient(var(--silver-dark), var(--silver) 20%, #f4f5fa 60%, var(--silver));
  transform: rotateX(90deg) translateZ(44px);
}
.bottom {
  background: linear-gradient(var(--silver-dark), #5b6078);
  transform: rotateX(-90deg) translateZ(44px);
}

.window {
  position: absolute;
  top: 6px;
  left: 11px;
  box-sizing: border-box;
  width: 26px;
  height: 13px;
  border: 1.5px solid var(--silver-dark);
  border-radius: 2px;
  background:
    linear-gradient(120deg, transparent 30%, rgb(255 255 255 / 0.45) 40%, transparent 50%),
    linear-gradient(160deg, #1a4a5a, #05060c);
}

.window + .window { left: auto; right: 11px; width: 14px; }

.name {
  position: absolute;
  top: 8px;
  width: 100%;
  color: #4a4f66;
  font: 800 7px system-ui, sans-serif;
  letter-spacing: 2.5px;
  text-align: center;
  text-indent: 2.5px;
  text-shadow: 0 1px 0 rgb(255 255 255 / 0.7); /* engraved */
}

/* --- the lens: a 0 × 0 anchor at its centre, on the front face --- */
.lens {
  position: absolute;
  left: 72px;
  top: 52px;
  transform-style: preserve-3d;
  transform: translateZ(20px);
}

.mount {
  position: absolute;
  left: -31px;
  top: -31px;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: radial-gradient(circle, #0b0c12 0 76%, var(--silver-dark) 80%, #f4f5fa 88%, var(--silver) 94%, var(--silver-dark));
  transform: translateZ(0.5px);
}

/* 16 strips, radius 25px, 26px long. Strip top = at the body, bottom = the front. */
.strip {
  --a: calc(var(--i) * 22.5deg);
  position: absolute;
  left: -5.3px;
  top: -13px;
  width: 10.6px;
  height: 26px;
  backface-visibility: hidden;
  background:
    linear-gradient(rgb(0 0 0 / calc(0.36 - 0.34 * cos(var(--a) + 35deg))) 0 0), /* light from top left */
    linear-gradient(transparent 0 5px, rgb(0 0 0 / 0.5) 5px 6px, transparent 6px 17px, #ff4d9d 17px 18px, transparent 18px),
    repeating-linear-gradient(90deg, #2a2c3a 0 1.5px, #0d0e14 1.5px 3px) 0 6px / 100% 11px no-repeat, /* knurled grip */
    linear-gradient(#1a1b24 0 17px, var(--silver) 17px, #f4f5fa 22px, var(--silver-dark));
  transform: rotateZ(var(--a)) translateY(-25px) rotateX(90deg) translateY(13px);
}

.ring,
.glass {
  position: absolute;
  border-radius: 50%;
}

.ring {
  left: -25.5px;
  top: -25.5px;
  width: 51px;
  height: 51px;
  background: radial-gradient(circle, transparent 0 17px, #05060a 17.5px 18.5px, var(--silver-dark) 19px, #f4f5fa 21.5px, var(--silver) 23px, var(--silver-dark));
  transform: translateZ(26px);
}

.glass {
  left: -18px;
  top: -18px;
  width: 36px;
  height: 36px;
  overflow: hidden; /* flat disc: clipping is safe */
  background:
    radial-gradient(circle, #05060a 0 4px, transparent 5px),
    radial-gradient(circle, transparent 0 9px, rgb(139 108 255 / 0.5) 10px, transparent 12px),
    conic-gradient(from 200deg, #183a4e, #0a0c18 25%, #463a8a 50%, #0a0c18 75%, #183a4e);
  transform: translateZ(22px); /* recessed 4px behind the ring */
}

/* the reflection of a window: runs the rocking in reverse */
.glass em {
  position: absolute;
  top: 5px;
  left: 9px;
  width: 12px;
  height: 16px;
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
  top: -20px;
  left: 12px;
  width: 40px;
  height: 20px;
  transform-style: preserve-3d;
}

.flash i {
  position: absolute;
  inset: 0;
  background: linear-gradient(var(--silver), var(--silver-dark));
}

.flash i:nth-child(1) {
  box-sizing: border-box;
  border: 2px solid var(--silver-dark);
  background:
    repeating-linear-gradient(transparent 0 1.5px, rgb(0 0 0 / 0.08) 1.5px 2.5px), /* Fresnel lines */
    radial-gradient(ellipse at 50% 40%, #fff, #e7e9f3 55%, #b9bed0);
  transform: translateZ(12px);
}
.flash i:nth-child(2) { transform: rotateY(180deg) translateZ(12px); }
.flash i:nth-child(3),
.flash i:nth-child(4) { left: 8px; width: 24px; background: linear-gradient(var(--silver-dark), #5b6078); }
.flash i:nth-child(3) { transform: rotateY(90deg) translateZ(20px); }
.flash i:nth-child(4) { transform: rotateY(-90deg) translateZ(20px); }
.flash i:nth-child(5) {
  top: -2px;
  height: 24px;
  background: linear-gradient(90deg, var(--silver), #f4f5fa 50%, var(--silver));
  transform: rotateX(90deg);
}

/* flat discs centred on the top edge, lifted by --h, laid down */
.knob,
.dial {
  position: absolute;
  border-radius: 50%;
  transform: translateY(calc(var(--h) * -1px)) rotateX(90deg);
}

.knob {
  left: 110px;
  top: -8px;
  width: 16px;
  height: 16px;
  background: radial-gradient(circle, var(--silver) 0 45%, var(--silver-dark));
}

.knob-top {
  background: radial-gradient(circle at 40% 35%, #fff 0 8%, #ff4d9d 35%, #8c2a57);
}

.dial {
  left: 74px;
  top: -12px;
  width: 24px;
  height: 24px;
  background: repeating-conic-gradient(#5b6078 0 5deg, var(--silver) 5deg 10deg); /* knurled edge */
}

.dial-top {
  background:
    linear-gradient(transparent 46%, #ff4d9d 46% 54%, transparent 54%) 50% 0 / 2px 50% no-repeat,
    radial-gradient(circle, #f4f5fa, var(--silver) 60%, var(--silver-dark) 64%, transparent 66%),
    repeating-conic-gradient(#5b6078 0 5deg, var(--silver) 5deg 10deg);
}

@keyframes rock {
  from { transform: rotateX(-14deg) rotateY(-30deg); }
  to   { transform: rotateX(-8deg) rotateY(26deg); }
}

@keyframes glare {
  from { transform: translateX(10px) rotate(-12deg); }
  to   { transform: translateX(-4px) rotate(-12deg); }
}`,
  },

  coffeecup: {
    how: [
      'A paper cup is a <b>frustum</b>: a cone with its tip cut off. Twenty strips stand on the base circle (<code>rotateY(i × 18deg) translateZ(27px)</code>), hinged on their bottom edge, and lean <b>out</b> by <code>atan((36 − 27) / 100) ≈ 5.14°</code> so the rim is wider than the base.',
      'Each strip is a trapezoid cut with <code>clip-path</code>: 11.4px wide at the rim, 8.6px at the base (both are 2 · r · tan(9°)). Its height is the slant length, √(100² + 9²).',
      'The sleeve and its logo are painted on <b>one</b> canvas, exactly one lap long, and every strip slides it by its index (<code>background-position</code>). The lap is measured at the sleeve\'s middle height, where the strips are 9.86px wide, so the logo wraps round without a seam.',
      'The light stays put while the cup turns: every strip has a dark overlay whose opacity runs one lap, started i/20 of the way round with a negative <code>animation-delay</code>.',
      'The lid is five discs stacked 1.5px apart plus a raised spout. The steam rises from the sip slot: it sits there inside the spinning part, so it goes round with the cup, and a counter-turn keeps each wisp facing you. Each S-shaped wisp rises, grows and fades, and starts and ends invisible so the loop never shows.',
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
  perspective: 800px;
}

/* a 0-wide column, 100px tall: the cup's axis */
.coffee {
  --paper: #f4f1ea;
  --paper-dark: #d9d3c6;
  --kraft: #c1834a;
  --violet: #8b6cff;
  --lid: #22232e;
  position: relative;
  width: 0;
  height: 100px;
  transform-style: preserve-3d;
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
  left: -60px;
  top: 70px;
  width: 120px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.45), transparent);
  transform: rotateX(90deg);
}

/* 20 trapezoids hinged on the base circle (r 27px), leaning out towards the rim (r 36px) */
.strip {
  position: absolute;
  left: -6.3px;
  bottom: 0;
  width: 12.6px;      /* 11.4px at the rim, plus a little overlap */
  height: 100.4px;    /* the slant length */
  transform-origin: 50% 100%;
  transform: rotateY(calc(var(--i) * 18deg)) translateZ(27px) rotateX(-5.14deg);
  clip-path: polygon(0 0, 100% 0, calc(50% + 4.9px) 100%, calc(50% - 4.9px) 100%);
  backface-visibility: hidden;
  /* one 197px canvas = one lap round the sleeve's middle; each strip shows its own slice */
  background-image:
    radial-gradient(ellipse 1.2px 5px at 49.3px 53px, #f0d9b8 0 60%, transparent 90%),
    radial-gradient(ellipse 4.5px 6.5px at 49.3px 53px, #fff 0 20%, #6b3e22 30% 92%, transparent),
    radial-gradient(circle 11px at 49.3px 53px, var(--violet) 0 86%, #fff 87% 93%, var(--violet) 94% 100%, transparent 100%),
    radial-gradient(ellipse 1.2px 5px at 148px 53px, #f0d9b8 0 60%, transparent 90%),
    radial-gradient(ellipse 4.5px 6.5px at 148px 53px, #fff 0 20%, #6b3e22 30% 92%, transparent),
    radial-gradient(circle 11px at 148px 53px, var(--violet) 0 86%, #fff 87% 93%, var(--violet) 94% 100%, transparent 100%),
    linear-gradient(transparent 34px, var(--kraft) 34px 36px, #d8b08c 36px 37px, var(--kraft) 37px 70px, #d8b08c 70px 71px, var(--kraft) 71px 73px, transparent 73px),
    linear-gradient(var(--paper-dark) 0 1px, var(--paper) 3px 12px, var(--violet) 12px 14px, var(--paper) 14px calc(100% - 3px), var(--paper-dark));
  background-size: 197.3px 100%;
  background-position: calc(1.07px - var(--i) * 9.864px) 0;
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
  --r: 38.4px;
  position: absolute;
  left: calc(var(--r) * -1);
  top: calc(var(--r) * -1);
  width: calc(var(--r) * 2);
  height: calc(var(--r) * 2);
  border-radius: 50%;
  background: radial-gradient(circle, var(--lid) 0 80%, #646570 94%, var(--lid));
  transform: translateY(calc(var(--y) * -1px)) rotateX(90deg);
}

.lid-top {
  --r: 35.4px;
  background:
    radial-gradient(circle, transparent 0 70%, rgb(255 255 255 / 0.12) 72% 74%, transparent 76%),
    radial-gradient(circle at 35% 30%, #4e4f58, var(--lid) 60%);
}

.spout {
  --r: 13px;
  background:
    radial-gradient(ellipse 7px 2.5px at 50% 70%, #05060a 0 90%, transparent), /* the sip slot */
    radial-gradient(circle at 40% 30%, #6a6b74, var(--lid) 70%);
  transform: translateY(calc(var(--y) * -1px)) translateZ(19px) rotateX(90deg);
}

/* steam rises from the sip slot: placed there inside .spin, so it goes round with the cup... */
.vent {
  position: absolute;
  top: -7px;
  left: 0;
  transform-style: preserve-3d;
  transform: translateZ(24px);
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
  top: -30px;
  left: -5px;
  width: 10px;
  height: 30px;
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
  border: 2.5px solid transparent;
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
  0%   { opacity: 0; transform: translate(calc(var(--x) * 1px), 10px) scale(0.6); }
  30%  { opacity: 0.9; }
  60%  { transform: translate(calc(var(--x) * 1px + 4px), -12px) scale(0.9, 1.1); }
  100% { opacity: 0; transform: translate(calc(var(--x) * 1px - 2px), -34px) scale(1.1, 1.3); }
}`,
  },
};
