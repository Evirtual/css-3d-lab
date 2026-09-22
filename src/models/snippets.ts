/**
 * Paste-anywhere versions of every demo: plain HTML + CSS (+ JS), no Sass, no build step.
 * The detail view runs each one in an isolated iframe, so what is shown is what gets copied.
 */
import { snippets2 } from './snippets2';
import { snippetsA } from './snippets-batch-a';
import { snippetsB } from './snippets-batch-b';
import { snippetsC } from './snippets-batch-c';
import { snippetsD } from './snippets-batch-d';
import { snippetsE } from './snippets-batch-e';
import { snippetsF } from './snippets-batch-f';
import { snippetsG } from './snippets-batch-g';
import { snippetsH } from './snippets-batch-h';
import { snippetsI } from './snippets-batch-i';
import { snippetsJ } from './snippets-batch-j';
import { snippetsK } from './snippets-batch-k';
import { snippetsL } from './batch-l';
import { CUBE_FACES, type Snippet } from './snippet-utils';

export { standaloneDoc, type Snippet } from './snippet-utils';

/** clock: one split-flap card: two still halves behind, a two-sided flap in front. */
const FLAP_CARD = '<span class="card"><b class="half top"><i></i></b><b class="half bottom"><i></i></b><b class="flap"><b class="half top front"><i></i></b><b class="half bottom back"><i></i></b></b></span>';

const CUBE_FACE_LOOK = `.cube > * {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font: 700 calc(24 * var(--u)) system-ui;
  background: rgb(139 108 255 / 0.28);
  border: calc(1 * var(--u)) solid rgb(139 108 255 / 0.8);
}`;

const snippets1: Record<string, Snippet> = {
  cube: {
    how: [
      'Put <code>perspective</code> on the <b>parent</b>. It is the camera distance — smaller means more dramatic.',
      'Give the cube <code>transform-style: preserve-3d</code>, otherwise its children are flattened into its plane.',
      'Stack all six faces in the same spot, rotate each to face outward, then <code>translateZ</code> by half the side length.',
      'Animate only the cube. The faces ride along for free.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the cube is the same share of a gallery card, the editor and a recording canvas. The side is 120 of those units.',
    ],
    html: `<div class="scene">
  <div class="cube">
    <div>1</div><div>2</div><div>3</div>
    <div>4</div><div>5</div><div>6</div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the cube is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.34vmin;
  perspective: calc(800 * var(--u));
}

.cube {
  --s: calc(120 * var(--u));
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  animation: spin 9s linear infinite;
}

${CUBE_FACE_LOOK}

${CUBE_FACES}

@keyframes spin {
  from { transform: rotateX(-24deg) rotateY(0deg); }
  to   { transform: rotateX(-24deg) rotateY(360deg); }
}`,
  },

  flip: {
    how: [
      'Two faces share one box. The back one starts pre-rotated by <code>rotateY(180deg)</code>.',
      '<code>backface-visibility: hidden</code> hides whichever face is pointing away from you.',
      'On <code>:hover</code> / <code>:focus</code> rotate the <b>inner</b> wrapper, not the hovered element — otherwise the hit area rotates away and flickers.',
      '<code>tabindex="0"</code> makes it work on touch and keyboard too.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the card is the same share of a gallery card, the editor, a full screen and a recording canvas. Mid-turn the near half is magnified by the perspective, so the card is sized for the turn, not for the rest pose.',
    ],
    html: `<div class="flip" tabindex="0">
  <div class="flip-inner">
    <div class="flip-face">Front</div>
    <div class="flip-face flip-back">Back</div>
  </div>
</div>`,
    css: `.flip {
  /* one base unit: every length below is a multiple of it, so the card is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.34vmin;
  width: calc(240 * var(--u));
  height: calc(160 * var(--u));
  perspective: calc(800 * var(--u));
  cursor: pointer;
}

.flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.3, 1.4, 0.5, 1);
}

.flip:hover .flip-inner,
.flip:focus .flip-inner {
  transform: rotateY(180deg);
}

.flip-face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: calc(16 * var(--u));
  font: 700 calc(24 * var(--u)) system-ui;
  color: #fff;
  /* deep enough for white words (5.1:1 at the worst end): the bright #8b6cff to #ff4d9d was 3.3:1 */
  background: linear-gradient(135deg, #6a45f5, #d1206f);
  backface-visibility: hidden;
}

.flip-back {
  background: linear-gradient(135deg, #087a70, #6a45f5); /* deep for white words: #2ee6d6 was 1.6:1 */
  transform: rotateY(180deg);
}`,
  },

  carousel: {
    how: [
      'Every panel sits in the same spot, then gets <code>rotateY(n × 360° / count)</code> followed by <code>translateZ(radius)</code>.',
      'Order matters: rotate first, <i>then</i> translate — so each panel moves outward along its own rotated axis.',
      'Radius for a closed ring: <code>(width / 2) / tan(180° / count)</code>. For 8 panels 80 units wide that is ≈ 97 units; add a little for gaps.',
      'Spin the ring, and tilt a wrapper so you look slightly down on it.',
      'Those units are one base unit, <code>--u</code>, tied to the canvas: the panel, the radius and the perspective are all multiples of it, so the ring is the same share of a gallery card, the editor and a recording canvas. Only the radius decides the width, so it is what the band is sized against.',
    ],
    html: `<div class="scene">
  <div class="ring">
    <div style="--i:0">1</div><div style="--i:1">2</div>
    <div style="--i:2">3</div><div style="--i:3">4</div>
    <div style="--i:4">5</div><div style="--i:5">6</div>
    <div style="--i:6">7</div><div style="--i:7">8</div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the ring is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.34vmin;
  perspective: calc(900 * var(--u));
}

.ring {
  --count: 8;
  --radius: calc(115 * var(--u));
  position: relative;
  width: calc(80 * var(--u));
  height: calc(110 * var(--u));
  transform-style: preserve-3d;
  animation: ring-spin 14s linear infinite;
}

.ring > div {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: calc(10 * var(--u));
  font: 800 calc(22 * var(--u)) system-ui;
  color: #fff;
  background: hsl(calc(250 + var(--i) * 18) 80% 52% / 0.92); /* deep enough for white numbers on either stage */
  transform:
    rotateY(calc(var(--i) * 360deg / var(--count)))
    translateZ(var(--radius));
}

@keyframes ring-spin {
  from { transform: rotateX(-14deg) rotateY(0deg); }
  to   { transform: rotateX(-14deg) rotateY(-360deg); }
}`,
  },

  text: {
    how: [
      'There is no real depth here — it is many hard-edged <code>text-shadow</code>s, each offset one unit further.',
      'Darken each layer slightly and the stack reads as a solid side wall.',
      'Finish with one blurred shadow for the drop shadow on the "ground".',
      'The list is written out in full: one line per layer, so every step can be read and changed.',
      'Every length is a multiple of one base unit, <code>--u</code>, the offsets included, so the whole extrusion keeps its proportions on a gallery card, in the editor and in a recording canvas.',
    ],
    html: `<div class="scene">
  <h1 class="extruded">3D<br>DEPTH</h1>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the headline is the same share of
     a card, the editor, a full screen and a recording canvas */
  --u: 0.30vmin;
  perspective: calc(800 * var(--u));
}

/* Two lines, because one is a shape the band cannot hold: DEPTH on its own is two and a half
   times wider than it is tall, so sized to the 92vmin width limit it stands under the 40vmin
   floor. A kicker line over the word is what a headline does anyway. */
.extruded {
  margin: 0;
  font: 900 calc(80 * var(--u))/1.04 system-ui;
  letter-spacing: 0.04em;
  text-align: center;
  color: #fff;
  text-shadow:
    calc(1 * var(--u)) calc(1 * var(--u)) 0 #7f63e8,
    calc(2 * var(--u)) calc(2 * var(--u)) 0 #785ddb,
    calc(3 * var(--u)) calc(3 * var(--u)) 0 #7057cd,
    calc(4 * var(--u)) calc(4 * var(--u)) 0 #6951c0,
    calc(5 * var(--u)) calc(5 * var(--u)) 0 #614bb2,
    calc(6 * var(--u)) calc(6 * var(--u)) 0 #5a45a5,
    calc(7 * var(--u)) calc(7 * var(--u)) 0 #523f97,
    calc(8 * var(--u)) calc(8 * var(--u)) 0 #4b398a,
    calc(14 * var(--u)) calc(18 * var(--u)) calc(18 * var(--u)) rgb(0 0 0 / 0.5);
  animation: rock 5s ease-in-out infinite alternate;
}

@keyframes rock {
  from { transform: translateY(calc(-20 * var(--u))) rotateY(-32deg) rotateX(12deg); }
  to   { transform: translateY(calc(-20 * var(--u))) rotateY(32deg)  rotateX(-6deg); }
}`,
  },

  layers: {
    how: [
      '<code>rotateX(58deg) rotateZ(-45deg)</code> on the parent gives the classic isometric viewing angle.',
      'All plates are stacked at the same position; only <code>translateZ</code> separates them.',
      'Each plate carries its index in <code>--i</code>, and its resting offset is <code>calc((var(--i) - 1.5) * 40 * var(--u))</code> — one line, four different results.',
      'The 1.5 is what keeps the deck honest. Spread from <b>0</b> and the stack climbs off the top of its own box; spread from the <b>middle</b> and it opens both ways, so the picture stays where the box is however far it is open.',
      'The single keyframe closes the deck: <code>to { translateZ(0) }</code>. An <code>alternate</code> animation starts from the element’s own transform, so the pose a paused card shows is the open one.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the deck is the same share of a gallery card, the editor and a recording canvas. A plate is 140 of those units square.',
    ],
    html: `<div class="scene">
  <div class="layers">
    <i style="--i:0"></i>
    <i style="--i:1"></i>
    <i style="--i:2"></i>
    <i style="--i:3"></i>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the deck is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.32vmin;
  perspective: calc(900 * var(--u));
}

.layers {
  position: relative;
  width: calc(140 * var(--u));
  height: calc(140 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(58deg) rotateZ(-45deg);
}

/* the deck rests open, 40 units between plates, measured from the MIDDLE of the four: it grows
   both ways at once, so what is drawn stays centred on the model box at every moment */
.layers i {
  position: absolute;
  inset: 0;
  border-radius: calc(16 * var(--u));
  border: calc(1 * var(--u)) solid rgb(255 255 255 / 0.35);
  background: hsl(calc(255 + var(--i) * 32) 85% 62% / 0.78);
  transform: translateZ(calc((var(--i) - 1.5) * 40 * var(--u)));
  animation: close 2.6s ease-in-out infinite alternate;
}

@keyframes close {
  to { transform: translateZ(0); }
}`,
  },

  button: {
    how: [
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the cap, its type and the depth of its side are the same share of a gallery card, the editor and a recording canvas. The numbers below are those units.',
      'The "side" of the button is a stack of <code>box-shadow</code>s going straight down, one every 4 units. Each copy is the whole cap, so they overlap into one solid slab.',
      'The <code>&lt;button&gt;</code> is a static, invisible hit target; the visible cap is a <code>&lt;span&gt;</code> inside it. A pressed element that moves itself can slide out from under the pointer.',
      'On <code>:active</code>, move the cap down with <code>translateY</code> and shrink the stack by the same amount — the base appears to stay put.',
      'Keep the transition very short (≈80ms) so it feels mechanical.',
      'A slight <code>rotateX</code> tilt sells the perspective.',
    ],
    html: `<div class="scene">
  <button class="push" type="button"><span>PUSH</span></button>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the button is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.28vmin;
  perspective: calc(600 * var(--u));
}

/* static hit target (its bottom padding covers where the cap travels to). It is lifted a little
   because the edge hangs below the cap: lifted, the solid button is centred. The drop shadow is
   kept tight so it adds little to what is drawn beyond what the eye sees */
.push {
  padding: 0 0 calc(32 * var(--u));
  border: 0;
  background: none;
  cursor: pointer;
  transform: translateY(calc(-10 * var(--u))) rotateX(30deg);
}

/* the visible cap */
.push span {
  display: block;
  padding: calc(56 * var(--u)) calc(22 * var(--u));
  border-radius: calc(20 * var(--u));
  font: 900 calc(26 * var(--u)) / 1.2 system-ui;
  letter-spacing: 0.14em;
  color: #fff;
  background: linear-gradient(#ff4d9d, #d63a80);
  pointer-events: none;
  box-shadow:
    0 calc(4 * var(--u)) 0 #8f2a58, 0 calc(8 * var(--u)) 0 #8f2a58,
    0 calc(12 * var(--u)) 0 #8f2a58, 0 calc(16 * var(--u)) 0 #8f2a58,
    0 calc(20 * var(--u)) 0 #8f2a58, 0 calc(24 * var(--u)) 0 #8f2a58,
    0 calc(28 * var(--u)) 0 #8f2a58, 0 calc(32 * var(--u)) 0 #8f2a58,
    0 calc(36 * var(--u)) 0 #8f2a58, 0 calc(40 * var(--u)) 0 #8f2a58,
    0 calc(48 * var(--u)) calc(24 * var(--u)) rgb(0 0 0 / 0.5);
  transition: transform 0.08s, box-shadow 0.08s;
}

.push:active span {
  transform: translateY(calc(32 * var(--u)));
  box-shadow:
    0 calc(4 * var(--u)) 0 #8f2a58, 0 calc(8 * var(--u)) 0 #8f2a58,
    0 calc(16 * var(--u)) calc(14 * var(--u)) rgb(0 0 0 / 0.5);
}`,
  },

  fold: {
    how: [
      'Panels are <b>nested</b>, not siblings: each one lives inside the previous one, so it inherits every fold before it.',
      'Each nested panel is positioned at <code>left: 100%</code> with <code>transform-origin: left</code> — a hinge on the parent’s right edge.',
      'Every level needs <code>transform-style: preserve-3d</code>, or the chain flattens at that level.',
      'Alternate the fold direction (+150° / −150°) for a zig-zag.',
      'The first panel never moves, so the folded map is a stack at the left end. The map slides right as it folds, on the same timing, so the flat map and the folded stack are both centred, and lifts a little halfway, while the panels stand out toward you.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the map is four panels of 60 × 170 units, so it is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="map">
    <div class="panel">
      <div class="panel">
        <div class="panel">
          <div class="panel"></div>
        </div>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the map is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.32vmin;
  display: grid;
  place-items: center;
  perspective: calc(900 * var(--u));
}

.map {
  width: calc(240 * var(--u));          /* 4 panels × 60 units */
  height: calc(170 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(28deg) rotateY(-8deg);
  /* the first panel stays put and the others fold onto it, so the folded map is a stack at the
     left end: the map slides right as it folds, on the same timing, to keep the stack centred */
  animation: slide 3.4s ease-in-out infinite alternate, dip 3.4s ease-in-out infinite alternate;
}

.panel {
  box-sizing: content-box; /* a panel's numbers are its face, its edge drawn round it: by design, on any page */
  width: calc(60 * var(--u));
  height: 100%;
  transform-style: preserve-3d;
  background: linear-gradient(90deg, #2ee6d6, #157a72);
  border: calc(1 * var(--u)) solid rgb(255 255 255 / 0.25);
}

.panel .panel {
  position: absolute;
  top: calc(-1 * var(--u));
  left: 100%;
  transform-origin: left center;
  animation: fold-back 3.4s ease-in-out infinite alternate;
}

.panel .panel .panel        { animation-name: fold-front; }
.panel .panel .panel .panel { animation-name: fold-back; }

@keyframes slide {
  0%, 12%   { translate: calc(-5 * var(--u)) calc(-2 * var(--u)); }
  88%, 100% { translate: calc(78 * var(--u)) calc(-24 * var(--u)); }
}

/* half folded, the panels stand out toward you and reach down: lift the map while they do */
@keyframes dip {
  0%, 12%, 88%, 100% { transform: rotateX(28deg) rotateY(-8deg); }
  50%                { transform: translateY(calc(-12 * var(--u))) rotateX(28deg) rotateY(-8deg); }
}

@keyframes fold-back {
  0%, 12%   { transform: rotateY(0deg); }
  88%, 100% { transform: rotateY(150deg); }
}

@keyframes fold-front {
  0%, 12%   { transform: rotateY(0deg); }
  88%, 100% { transform: rotateY(-150deg); }
}`,
  },

  orbit: {
    how: [
      'An animation overwrites the whole <code>transform</code>, so a ring cannot both hold a tilt and animate a spin.',
      'Fix: two elements. The outer <b>plane</b> holds the static tilt, and an inner <b>arm</b> only animates <code>rotateZ</code>.',
      'The electron is a dot pinned to the top of the arm — the arm’s spin carries it around, and the arm draws nothing at all.',
      'Different tilts + different durations = an atom.',
      'A round thing still lives in a <b>square box</b>, and that box is what has to fit the canvas. Spin the ring itself and its corners sweep a circle √2 the ring’s width; spin an empty arm instead and the ring’s box never moves. Same picture, 40% more of it on the screen.',
      'For the same reason a plane is tilted with <code>rotateY</code> then <code>rotateX</code>, never with <code>rotateZ</code>. A circle only cares which way its plane faces, and those two reach every direction, while <code>rotateZ</code> turns the square in the screen plane: 60° of it costs 37% more room for the same picture.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the atom is the same share of a gallery card, the editor and a recording canvas. The rings are 200 of those units across.',
    ],
    html: `<div class="scene">
  <div class="atom">
    <b></b>
    <div class="plane"><u></u><div class="arm"><i></i></div></div>
    <div class="plane"><u></u><div class="arm"><i></i></div></div>
    <div class="plane"><u></u><div class="arm"><i></i></div></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the atom is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.32vmin;
  perspective: calc(800 * var(--u));
}

.atom {
  position: relative;
  width: calc(200 * var(--u));
  height: calc(200 * var(--u));
  transform-style: preserve-3d;
}

.atom b {
  position: absolute;
  inset: 40%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff, #8b6cff 60%);
  box-shadow: 0 0 calc(24 * var(--u)) #8b6cff;
}

.plane {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

/* the same three planes as rotateZ(0 / ±60deg) rotateX(72deg), said with rotateY instead: each
   ring faces exactly the same way, but no square is turned in the screen plane */
.plane:nth-of-type(1) { transform: rotateX(72deg);                       color: #2ee6d6; }
.plane:nth-of-type(2) { transform: rotateY(69.44deg)  rotateX(28.39deg); color: #ff4d9d; }
.plane:nth-of-type(3) { transform: rotateY(-69.44deg) rotateX(28.39deg); color: #ffb547; }

/* the ring: drawn, and never turned — so its square box is only ever as wide as the circle in it */
.plane u {
  position: absolute;
  inset: 0;
  border: calc(2 * var(--u)) solid currentColor;
  border-radius: 50%;
}

/* the arm: turned, and draws nothing — it exists only to carry the electron round */
.arm {
  position: absolute;
  inset: 0;
  animation: orbit-spin 3s linear infinite;
}

.plane:nth-of-type(2) .arm { animation-duration: 3.7s; }
.plane:nth-of-type(3) .arm { animation-duration: 4.4s; }

.arm i {
  position: absolute;
  top: calc(-7 * var(--u));
  left: calc(50% - 6 * var(--u));
  width: calc(12 * var(--u));
  height: calc(12 * var(--u));
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 calc(12 * var(--u)) currentColor;
}

@keyframes orbit-spin {
  to { transform: rotateZ(360deg); }
}`,
  },

  bars: {
    how: [
      'Each bar is a cuboid made of only the three faces you can actually see: front, right side, top.',
      'Do <b>not</b> animate <code>height</code> — that runs layout on every frame. The bar’s box stays full size; the walls are squashed with <code>scaleY</code> from <code>transform-origin: bottom</code>.',
      'The lid is a fixed square laid flat with <code>rotateX(90deg)</code>; it slides down with <code>translateY</code> by exactly the height the walls lost, so it stays sitting on top.',
      'Shade the three faces differently (light top, mid front, dark side) — that fake lighting does most of the work.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the chart is the same share of a gallery card, the editor and a recording canvas. A bar’s full height is a plain number in the markup (<code>--hn</code>) that CSS multiplies by <code>--u</code>, and every bar shrinks to the same 14 units: its scale is <code>14 / --hn</code>.',
    ],
    html: `<div class="scene">
  <div class="chart">
    <!-- --hn = full height in units of --u, as a plain number -->
    <!-- --delay staggers the bars 0.35s apart, all 0.75s in: the first frame, which a paused
         card shows, is the chart grown, not five stubs -->
    <div class="bar" style="--hn:70;  --hue:262; --delay:-0.75s"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:110; --hue:285; --delay:-1.1s"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:50;  --hue:320; --delay:-1.45s"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:140; --hue:175; --delay:-1.8s"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:90;  --hue:40;  --delay:-2.15s"><i></i><i></i><i></i></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the chart is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.38vmin;
  perspective: calc(900 * var(--u));
}

.chart {
  --w: calc(30 * var(--u));
  display: flex;
  align-items: flex-end;
  gap: calc(18 * var(--u));
  height: calc(150 * var(--u));
  transform-style: preserve-3d;
  /* the chart is seen from above, so what it draws hangs below its layout box: the lift puts
     the drawing, not the box, in the middle */
  transform: translate(calc(-5 * var(--u)), calc(-20 * var(--u))) rotateX(-22deg) rotateY(-32deg);
}

.bar {
  --h: calc(var(--hn) * var(--u)); /* full height */
  --k: calc(14 / var(--hn));      /* scale of the shortest state: 14 units */
  position: relative;
  width: var(--w);
  height: var(--h);               /* the box itself never changes size */
  transform-style: preserve-3d;
}

.bar i {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--w);
  height: 100%;
  transform-origin: bottom center;
  animation: 1.8s ease-in-out var(--delay) infinite alternate;
}

/* front */
.bar i:nth-child(1) {
  background: hsl(var(--hue) 80% 60%);
  transform: translateZ(calc(var(--w) / 2));
  animation-name: grow-front;
}

/* right side */
.bar i:nth-child(2) {
  background: hsl(var(--hue) 70% 42%);
  transform: rotateY(90deg) translateZ(calc(var(--w) / 2));
  animation-name: grow-side;
}

/* lid */
.bar i:nth-child(3) {
  height: var(--w);
  background: hsl(var(--hue) 90% 74%);
  transform-origin: center;
  transform: rotateX(90deg) translateZ(calc(var(--w) / 2));
  animation-name: grow-lid;
}

/* each keyframe gives only the SHORT state; the tall state is the element's own transform */
@keyframes grow-front {
  from { transform: translateZ(calc(var(--w) / 2)) scaleY(var(--k)); }
}

@keyframes grow-side {
  from { transform: rotateY(90deg) translateZ(calc(var(--w) / 2)) scaleY(var(--k)); }
}

@keyframes grow-lid {
  from { transform: translateY(calc(var(--h) - calc(14 * var(--u)))) rotateX(90deg) translateZ(calc(var(--w) / 2)); }
}`,
  },

  book: {
    how: [
      'Cover and pages are stacked sheets, all with <code>transform-origin: left</code> — the spine is the hinge.',
      'Each sheet gets its index in <code>--n</code>. One unit of <code>translateZ</code> per sheet stops them z-fighting, and never less than 1px (<code>max(1px, var(--u))</code>): on a small card one unit is under a pixel.',
      'Each sheet’s end angle is <code>var(--end)</code>, computed per sheet, so the pages fan out.',
      'One number opens the book: <code>--open</code>, registered with <code>@property</code> so it can be animated, runs 0 → 1 and back. Each sheet turns over its own slice of it, the cover’s first and the bottom page’s last. Played backwards the slices come in the opposite order by themselves, so the book shuts bottom page first and the cover comes down last, on top. (A per-sheet <code>animation-delay</code> cannot do this: it keeps the cover first both ways, so the cover shuts under pages that are still open and they pass through it.)',
      'Every length is a multiple of one base unit, <code>--u</code>, so the book is the same share of a gallery card, the editor and a recording canvas.',
      'The open book is the size the band has to hold, not the shut one: the pages swing past the spine and lift toward you, where the perspective makes them bigger still. Shut, the book is centred; open, it spreads both ways from the spine. So the <code>translate</code> on the book follows <code>--open</code>: it slides the spine from the middle of the shut book to the middle of the canvas as the book opens, and a paused card, which shows the shut book, shows it centred. The padding above it does the same for the lift.',
    ],
    html: `<div class="scene">
  <div class="book">
    <i style="--n:0"></i>
    <i style="--n:1"></i>
    <i style="--n:2"></i>
    <i style="--n:3"></i>
    <i style="--n:4" class="cover"></i>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the book is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.28vmin;
  display: grid;
  place-items: center;
  /* the pages lift toward you as they turn, and the perspective magnifies them upward: room
     above the book splits that between the shut book and the open one */
  padding-top: calc(30 * var(--u));
  perspective: calc(1000 * var(--u));
}

.book {
  position: relative;
  width: calc(130 * var(--u));
  height: calc(175 * var(--u));
  border-radius: calc(2 * var(--u)) calc(8 * var(--u)) calc(8 * var(--u)) calc(2 * var(--u));
  background: #4a3a99;               /* back cover */
  transform-style: preserve-3d;
  /* the pages swing left past the spine, so the book slides right as it opens: shut, the book
     is centred, and open, the spine is in the middle and the spread is centred */
  transform: translate(calc(60 * var(--u) * var(--open) + var(--u)), calc(-6 * var(--u))) rotateX(24deg) rotateY(-12deg);
  animation: open 3.6s ease-in-out infinite alternate;
}

.book i {
  --end: calc(-118deg - var(--n) * 12deg);
  position: absolute;
  inset: calc(3 * var(--u)) calc(3 * var(--u)) calc(3 * var(--u)) 0;
  border-radius: 0 calc(5 * var(--u)) calc(5 * var(--u)) 0;
  background: linear-gradient(90deg, #cfd3e6, #fff 14%);
  transform-origin: left center;
  /* a sheet turns while --open runs through its slice: the cover's (n = 4) starts at 0, and each
     sheet under it starts 0.04 later; every slice is 0.84 long */
  --from: calc((4 - var(--n)) * 0.04);
  transform: translateZ(calc(var(--n) * max(1px, var(--u)))) rotateY(calc(var(--end) * clamp(0, (var(--open) - var(--from)) / 0.84, 1)));
}

.book .cover {
  inset: 0;
  border-radius: calc(2 * var(--u)) calc(8 * var(--u)) calc(8 * var(--u)) calc(2 * var(--u));
  background: linear-gradient(90deg, #4a3a99, #8b6cff 12%);
}

/* how far open the book is, from 0 (shut) to 1; registered, so it animates as a number */
@property --open {
  syntax: '<number>';
  inherits: true;
  initial-value: 0;
}

@keyframes open {
  0%, 10%   { --open: 0; }
  90%, 100% { --open: 1; }
}`,
  },

  radio: {
    how: [
      'Real <code>&lt;input type="radio"&gt;</code> elements hold the state — the browser handles clicks and arrow keys. They are hidden visually, not with <code>display: none</code>, so they still take focus and a screen reader still finds them. Keep the <code>aria-label</code>s: they give each radio its face’s full name.',
      'What you click is a <code>&lt;label for&gt;</code> in the control zone: clicking a label checks its radio. The labels are styled by the shared control block, copied unchanged, so each one looks and measures like every other model’s buttons. The letters are the cube-puzzle names for the faces: <b>F</b>ront, <b>R</b>ight, <b>B</b>ack, <b>L</b>eft, <b>U</b>p, <b>D</b>own.',
      'The cube and the zone both come <b>after</b> the radios in the markup, so one checked radio can reach all three things it changes: <code>input:checked ~ .view .cube</code> turns the cube, <code>input:checked ~ .controls label</code> lights its label with the selected pill, and the same rule names the face in the caption.',
      'Each radio maps to the rotation that brings its face to the front; a <code>transition</code> animates between them.',
      'The keyboard ring cannot be drawn on a radio nobody can see, so it is passed along the same way: <code>input:focus-visible ~ .controls label</code> rings the label of the radio that has focus.',
      'The cube is written in one base unit, <code>--u</code>, so it is the same share of a gallery card, the editor and a recording canvas. The control zone under it is in plain <code>vmin</code>, because it is the same object at the same size in every model that has one.',
    ],
    html: `<div class="band">
  <input type="radio" name="face" id="face-f" aria-label="Front" checked>
  <input type="radio" name="face" id="face-r" aria-label="Right">
  <input type="radio" name="face" id="face-b" aria-label="Back">
  <input type="radio" name="face" id="face-l" aria-label="Left">
  <input type="radio" name="face" id="face-u" aria-label="Up">
  <input type="radio" name="face" id="face-d" aria-label="Down">

  <div class="view">
    <div class="cube">
      <div>Front</div><div>Right</div><div>Back</div>
      <div>Left</div><div>Up</div><div>Down</div>
    </div>
  </div>

  <div class="controls">
    <output class="caption"><span>Front</span><span>Right</span><span>Back</span><span>Left</span><span>Up</span><span>Down</span></output>
    <div class="row">
      <label for="face-f" title="Front">F</label>
      <label for="face-r" title="Right">R</label>
      <label for="face-b" title="Back">B</label>
      <label for="face-l" title="Left">L</label>
      <label for="face-u" title="Up">U</label>
      <label for="face-d" title="Down">D</label>
    </div>
  </div>
</div>`,
    css: `/* The model box and the zone stand in one stack, so the zone is the same distance below the
   model in every model and the pair is centred as the band says. */
.band {
  /* one base unit: every length in the cube is a multiple of it, so the cube is the same share
     of a card, the editor, a full screen and a recording canvas. The zone under it is in plain
     vmin, because it is the same object in every model. Sized so the cube fills the model box:
     at 0.22 it left 8vmin of the box empty over the cube, and the centred stack sat 4vmin low. */
  --u: 0.29vmin;
  position: relative;
  display: grid;
  justify-items: center;
  gap: 4vmin;
  font-family: system-ui, sans-serif;
}

/* the model box: the same height in every model that has controls */
.view {
  display: grid;
  place-items: center;
  height: 50vmin;
  perspective: calc(800 * var(--u));
}

/* the radios: out of sight and out of the grid, but still focusable and still read out */
.band > input {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
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

/* a label is not a button: it is inline, so it would ignore the block's height. A grid gives it
   the height and puts its letter in the middle, as a button does. */
.controls label {
  display: grid;
  place-items: center;
}

/* the caption: one line, always the same height, so naming a new face cannot move the cube */
.caption span { display: none; }

.cube {
  --s: calc(120 * var(--u));
  --view: rotateX(-18deg) rotateY(-22deg);
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  transform: var(--view);
  transition: transform 0.9s cubic-bezier(0.3, 1.3, 0.5, 1);
}

/* the whole trick: a checked radio restyles a LATER sibling, and anything inside one */
input:nth-of-type(1):checked ~ .view .cube { transform: var(--view) rotateY(0deg); }
input:nth-of-type(2):checked ~ .view .cube { transform: var(--view) rotateY(-90deg); }
input:nth-of-type(3):checked ~ .view .cube { transform: var(--view) rotateY(-180deg); }
input:nth-of-type(4):checked ~ .view .cube { transform: var(--view) rotateY(90deg); }
input:nth-of-type(5):checked ~ .view .cube { transform: var(--view) rotateX(-90deg); }
input:nth-of-type(6):checked ~ .view .cube { transform: var(--view) rotateX(90deg); }

/* and the same rule again, to show the face's name */
input:nth-of-type(1):checked ~ .controls .caption span:nth-child(1),
input:nth-of-type(2):checked ~ .controls .caption span:nth-child(2),
input:nth-of-type(3):checked ~ .controls .caption span:nth-child(3),
input:nth-of-type(4):checked ~ .controls .caption span:nth-child(4),
input:nth-of-type(5):checked ~ .controls .caption span:nth-child(5),
input:nth-of-type(6):checked ~ .controls .caption span:nth-child(6) { display: inline; }

/* and again, to light the checked radio's label: the block's selected pill */
input:nth-of-type(1):checked ~ .controls label:nth-of-type(1),
input:nth-of-type(2):checked ~ .controls label:nth-of-type(2),
input:nth-of-type(3):checked ~ .controls label:nth-of-type(3),
input:nth-of-type(4):checked ~ .controls label:nth-of-type(4),
input:nth-of-type(5):checked ~ .controls label:nth-of-type(5),
input:nth-of-type(6):checked ~ .controls label:nth-of-type(6) {
  background: linear-gradient(135deg, #6a45f5, #d1206f);
  color: #fff;
}

/* and once more for the keyboard: the block's focus ring, on the label of the focused radio */
input:nth-of-type(1):focus-visible ~ .controls label:nth-of-type(1),
input:nth-of-type(2):focus-visible ~ .controls label:nth-of-type(2),
input:nth-of-type(3):focus-visible ~ .controls label:nth-of-type(3),
input:nth-of-type(4):focus-visible ~ .controls label:nth-of-type(4),
input:nth-of-type(5):focus-visible ~ .controls label:nth-of-type(5),
input:nth-of-type(6):focus-visible ~ .controls label:nth-of-type(6) {
  outline: 0.6vmin solid #6a45f5;
  outline-offset: 0.6vmin;
}

.cube > * {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font: 700 calc(16 * var(--u)) system-ui;
  background: rgb(46 230 214 / 0.25);
  /* an inner line plus a soft glow instead of a hard border: squeezed side-on, a one-unit line
     breaks up, the glow survives */
  box-shadow: inset 0 0 0 calc(1 * var(--u)) rgb(46 230 214 / 0.8), inset 0 0 calc(12 * var(--u)) rgb(46 230 214 / 0.35);
}

${CUBE_FACES}`,
  },

  grid: {
    how: [
      'The floor is one big element with two <code>linear-gradient</code>s drawing the grid lines.',
      'Hinge it on the horizon (<code>transform-origin: top</code>) and lay it down with <code>rotateX(80deg)</code>. A short <code>perspective</code> on the parent exaggerates the depth.',
      'Motion is a child layer sliding by <b>exactly one cell</b> with <code>transform</code>, so the loop is seamless. (Animating <code>background-position</code> looks the same but repaints every frame; transform does not.)',
      'A <code>mask</code> gradient fades the lines out toward the horizon.',
      'The sun stands on the horizon (<code>bottom: 50%</code>, the horizon\'s own 50%) and is only the part above it. Its circle is a <code>clip-path</code> and its slices a <code>mask</code>, both on the sun itself, so the slices stay inside the outline on every canvas.',
      'The scene is <code>inset: 0</code>, so it fills the canvas edge to edge whatever its shape. The sun, the cell and the perspective are multiples of one base unit, <code>--u</code>, tied to the canvas, so the horizon looks the same on a gallery card and on a full screen.',
    ],
    html: `<div class="retro">
  <div class="sun"></div>
  <div class="floor"></div>
</div>`,
    css: `.retro {
  /* one base unit, tied to the canvas; the scene itself fills the canvas edge to edge */
  --u: 0.33vmin;
  position: fixed;
  inset: 0;
  overflow: hidden;
  perspective: calc(260 * var(--u));
  perspective-origin: 50% 40%;
  background: linear-gradient(#12062e 0%, #3b0f5c 38%, #ff4d9d 50%, #0a0618 50.5%);
}

/* the sun stands ON the horizon (bottom: 50%, the same 50% as the horizon line) and is only the
   part above it: a 160-unit circle sunk 40 units, so nothing of it can reach the floor */
.sun {
  position: absolute;
  bottom: 50%;
  left: 50%;
  width: calc(160 * var(--u));
  height: calc(120 * var(--u));
  translate: -50% 0;
  background: linear-gradient(#ffd34d, #ff4d9d 93%);
  /* the circle is a clip and the slices a mask, both on the sun itself, so the slices scale
     with it and stay inside the outline on every canvas; their gaps grow toward the horizon */
  clip-path: circle(calc(80 * var(--u)) at 50% calc(80 * var(--u)));
  mask: linear-gradient(#000 50%, transparent 50% 52%, #000 52% 63%, transparent 63% 67%,
        #000 67% 76%, transparent 76% 82%, #000 82% 89%, transparent 89% 97%, #000 97%);
}

.floor {
  --cell: calc(40 * var(--u));
  position: absolute;
  top: 50%;
  left: -100%;
  width: 300%;
  height: 300%;
  transform-origin: top center;
  transform: rotateX(80deg);
  overflow: hidden;
  mask: linear-gradient(transparent, #000 12%);
}

/* the lines slide on a child: transform animates on the compositor,
   background-position would repaint the whole layer every frame */
.floor::before {
  content: '';
  position: absolute;
  inset: calc(var(--cell) * -1) 0 0;
  background:
    linear-gradient(#2ee6d6 calc(2 * var(--u)), transparent calc(2 * var(--u))) 0 0 / var(--cell) var(--cell),
    linear-gradient(90deg, #2ee6d6 calc(2 * var(--u)), transparent calc(2 * var(--u))) 50% 0 / var(--cell) var(--cell);
  animation: run 0.9s linear infinite;
}

@keyframes run {
  to { transform: translateY(var(--cell)); }
}`,
  },

  helix: {
    how: [
      'Every rung runs the <b>same</b> <code>rotateY</code> animation.',
      'A <b>negative</b> <code>animation-delay</code> per rung starts each one part-way through its turn — that offset <i>is</i> the twist.',
      'Flat dots would vanish when seen edge-on, so each dot runs the same animation in <code>reverse</code>. The two rotations cancel and the dot always faces the camera (a "billboard").',
      'The rung needs <code>preserve-3d</code> for that cancellation to happen in 3D space.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: a rung is 120 units wide and the twelve of them stand 12 apart, so the helix is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="helix">
    <div style="--i:1"><i></i><i></i></div>
    <div style="--i:2"><i></i><i></i></div>
    <div style="--i:3"><i></i><i></i></div>
    <div style="--i:4"><i></i><i></i></div>
    <div style="--i:5"><i></i><i></i></div>
    <div style="--i:6"><i></i><i></i></div>
    <div style="--i:7"><i></i><i></i></div>
    <div style="--i:8"><i></i><i></i></div>
    <div style="--i:9"><i></i><i></i></div>
    <div style="--i:10"><i></i><i></i></div>
    <div style="--i:11"><i></i><i></i></div>
    <div style="--i:12"><i></i><i></i></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the helix is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.29vmin;
  perspective: calc(800 * var(--u));
}

.helix {
  display: grid;
  gap: calc(12 * var(--u));
  transform-style: preserve-3d;
  transform: rotateZ(-14deg);
}

.helix > div {
  --delay: calc(var(--i) * -0.22s);
  position: relative;
  width: calc(120 * var(--u));
  height: calc(3 * var(--u));
  background: linear-gradient(90deg, #2ee6d6, transparent 35% 65%, #ff4d9d);
  transform-style: preserve-3d;
  animation: helix-spin 4s linear infinite;
  animation-delay: var(--delay);
}

.helix i {
  position: absolute;
  top: calc(-6 * var(--u));
  width: calc(15 * var(--u));
  height: calc(15 * var(--u));
  border-radius: 50%;
  /* same animation, reversed → the dot always faces the camera */
  animation: helix-spin 4s linear infinite reverse;
  animation-delay: var(--delay);
}

.helix i:first-child { left: calc(-7 * var(--u));  background: #2ee6d6; box-shadow: 0 0 calc(10 * var(--u)) #2ee6d6; }
.helix i:last-child  { right: calc(-7 * var(--u)); background: #ff4d9d; box-shadow: 0 0 calc(10 * var(--u)) #ff4d9d; }

@keyframes helix-spin {
  to { transform: rotateY(360deg); }
}`,
  },

  tiles: {
    how: [
      'Each tile has two faces from <code>::before</code> and <code>::after</code>, back to back, both with <code>backface-visibility: hidden</code>.',
      'Every tile runs the same flip animation.',
      'The wave comes purely from <code>animation-delay = (row + column) × step</code>. Each tile sets its <code>--d</code>, row + column, in its <code>style</code>.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: a tile is 48 units square, 8 apart, and sinks 14 as it turns, so the wave is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="tiles">
    <i style="--d:0"></i><i style="--d:1"></i><i style="--d:2"></i><i style="--d:3"></i>
    <i style="--d:1"></i><i style="--d:2"></i><i style="--d:3"></i><i style="--d:4"></i>
    <i style="--d:2"></i><i style="--d:3"></i><i style="--d:4"></i><i style="--d:5"></i>
    <i style="--d:3"></i><i style="--d:4"></i><i style="--d:5"></i><i style="--d:6"></i>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the wave is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.3vmin;
  perspective: calc(800 * var(--u));
}

.tiles {
  display: grid;
  grid-template-columns: repeat(4, calc(48 * var(--u)));
  gap: calc(8 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(38deg) rotateZ(-8deg);
}

.tiles i {
  position: relative;
  height: calc(48 * var(--u));
  transform-style: preserve-3d;
  animation: tile-flip 3.2s ease-in-out infinite;
  animation-delay: calc(var(--d) * 0.13s);   /* --d = row + column */
}

.tiles i::before,
.tiles i::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: calc(8 * var(--u));
  backface-visibility: hidden;
}

.tiles i::before { background: #8b6cff; }
.tiles i::after  { background: #2ee6d6; transform: rotateY(180deg); }

@keyframes tile-flip {
  0%, 15%   { transform: rotateY(0deg); }
  45%, 65%  { transform: rotateY(180deg) translateZ(calc(-14 * var(--u))); }
  95%, 100% { transform: rotateY(360deg); }
}`,
  },

  tilt: {
    how: [
      'CSS cannot read the pointer position — that is the <b>only</b> reason this needs JavaScript.',
      'The canvas is the pointer’s field, so the card reacts wherever the pointer is. JS normalises its position across the canvas to −0.5…0.5 and writes four custom properties: <code>--rx</code>, <code>--ry</code>, <code>--mx</code>, <code>--my</code>.',
      'CSS uses them for the tilt (<code>rotateX/rotateY</code>) and for the centre of a <code>radial-gradient</code> glare.',
      'Children with <code>translateZ</code> float above the card, producing parallax for free.',
      'A long transition eases the card back to rest; while the pointer is driving it is shortened so it tracks tightly.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, and JS only ever writes angles and percentages, never lengths. So the card, its type and how far its layers float are the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene" tabindex="0" role="img" aria-label="Card that tilts toward the pointer, with a moving glare">
  <div class="tilt">
    <span class="chip"></span>
    <b>Move your pointer</b>
    <small>tilt · depth · glare</small>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the card is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.28vmin;
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
  perspective: calc(800 * var(--u));
}

.tilt {
  --rx: 0deg;  --ry: 0deg;   /* tilt  — set from JS */
  --mx: 50%;   --my: 50%;    /* glare — set from JS */
  position: relative;
  display: grid;
  align-content: end;
  gap: calc(2 * var(--u));
  /* the card is 280 × 176 outside, a bank card's shape: its padding is inside that */
  box-sizing: border-box;
  width: calc(280 * var(--u));
  height: calc(176 * var(--u));
  padding: calc(20 * var(--u));
  border-radius: calc(18 * var(--u));
  color: #fff;
  /* the card's own words, so they scale with the card and not with the page */
  font: 500 calc(17 * var(--u))/1.35 system-ui, sans-serif;
  /* deep enough for its white words (5.1:1 at the worst end): the bright #8b6cff to #ff4d9d was 3:1 */
  background: linear-gradient(135deg, #6a45f5, #d1206f);
  box-shadow: 0 calc(24 * var(--u)) calc(40 * var(--u)) calc(-18 * var(--u)) #8b6cff;
  transform-style: preserve-3d;
  /* the glow shadow hangs below the card and a tilt towards the pointer throws the near edge
     further out, so what the card paints sits below its box: the lift centres the drawing */
  transform: translateY(calc(-4 * var(--u))) rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.tilt.is-live { transition-duration: 0.08s; }

.tilt::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at var(--mx) var(--my),
              rgb(255 255 255 / 0.55), transparent 55%);
  opacity: 0;
  transition: opacity 0.3s;
}

.tilt.is-live::after { opacity: 1; }

/* children float above the surface */
.tilt b     { transform: translateZ(calc(40 * var(--u))); }
.tilt small { transform: translateZ(calc(22 * var(--u))); opacity: 0.85; }

.chip {
  position: absolute;
  top: calc(22 * var(--u));
  left: calc(22 * var(--u));
  width: calc(46 * var(--u));
  height: calc(34 * var(--u));
  border-radius: calc(7 * var(--u));
  background: linear-gradient(135deg, #ffe08a, #d89b1d);
  transform: translateZ(calc(54 * var(--u)));
}

/* the keyboard: Tab to it and it leans as it would for a pointer near the top right, even with
   the pointer resting on the canvas (!important beats the pose the script writes inline) */
.scene:focus-visible .tilt { --rx: 8deg !important; --ry: 12deg !important; --mx: 80% !important; --my: 20% !important; }
.scene:focus-visible .tilt::after { opacity: 1; }`,
    js: `const scene = document.querySelector('.scene');
const card = document.querySelector('.tilt');
const MAX = 20; // degrees

scene.addEventListener('pointermove', (e) => {
  const r = scene.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;   // -0.5 … 0.5
  const y = (e.clientY - r.top) / r.height - 0.5;

  card.style.setProperty('--ry', x * MAX * 2 + 'deg');
  card.style.setProperty('--rx', -y * MAX * 2 + 'deg');
  card.style.setProperty('--mx', (x + 0.5) * 100 + '%');
  card.style.setProperty('--my', (y + 0.5) * 100 + '%');
  card.classList.add('is-live');
});

scene.addEventListener('pointerleave', () => {
  card.classList.remove('is-live');
  card.style.removeProperty('--rx');
  card.style.removeProperty('--ry');
});`,
  },

  drag: {
    how: [
      'The cube is the same pure-CSS cube; its rotation is simply <code>rotateX(var(--rx)) rotateY(var(--ry))</code>.',
      'JS tracks a drag with Pointer Events (mouse, touch and pen in one API) and updates those two angles.',
      '<code>setPointerCapture</code> keeps the drag alive when the pointer leaves the element; <code>touch-action: none</code> stops the page scrolling instead.',
      'On release, the last velocity keeps being applied and multiplied by 0.95 each frame — cheap inertia.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the cube is the same share of a gallery card, the editor and a recording canvas. It is sized for the worst angle a drag can reach — corner-on, where it spans its body diagonal, √3 × its side — not for the rest pose.',
    ],
    html: `<div class="scene" tabindex="0" role="img" aria-label="Wireframe cube. Drag it, or use the arrow keys, to turn it">
  <div class="cube">
    <div></div><div></div><div></div>
    <div></div><div></div><div></div>
  </div>
</div>`,
    css: `.scene {
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
  /* one base unit: every length below is a multiple of it, so the cube is the same share of a
     card, the editor, a full screen and a recording canvas. Sized for the worst drag: turned
     corner-on, the cube spans its body diagonal, √3 × 140 units */
  --u: 0.26vmin;
  perspective: calc(800 * var(--u));
  cursor: grab;
  touch-action: none;   /* let JS have the drag on touch screens */
  user-select: none;
}

.scene:active { cursor: grabbing; }

.cube {
  --s: calc(140 * var(--u));
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  transform: rotateX(var(--rx, -24deg)) rotateY(var(--ry, 32deg));
}

.cube > * {
  position: absolute;
  inset: 0;
  background: rgb(255 181 71 / 0.3);
  border: calc(1 * var(--u)) solid rgb(255 181 71 / 0.85);
}

${CUBE_FACES}

/* the scene covers the canvas, so a ring round it would be off the canvas: focus lights the cube */
.scene:focus-visible { outline: none; }
.scene:focus-visible .cube > * { border-color: #fff; }`,
    js: `const scene = document.querySelector('.scene');
const cube = document.querySelector('.cube');

let rx = -24, ry = 32;   // current angles
let vx = 0, vy = 0;      // velocity, for inertia
let dragging = false;
let raf = 0;

function apply() {
  rx = Math.max(-89, Math.min(89, rx));
  cube.style.setProperty('--rx', rx + 'deg');
  cube.style.setProperty('--ry', ry + 'deg');
}

function coast() {
  if (dragging) return;
  vx *= 0.95;
  vy *= 0.95;
  rx += vx;
  ry += vy;
  apply();
  if (Math.abs(vx) + Math.abs(vy) > 0.05) raf = requestAnimationFrame(coast);
}

scene.addEventListener('pointerdown', (e) => {
  dragging = true;
  cancelAnimationFrame(raf);
  scene.setPointerCapture(e.pointerId);
});

scene.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  vy = e.movementX * 0.6;
  vx = -e.movementY * 0.6;
  rx += vx;
  ry += vy;
  apply();
});

function release() {
  if (!dragging) return;
  dragging = false;
  raf = requestAnimationFrame(coast);
}
// the keyboard: each arrow key turns it 10 degrees
scene.addEventListener('keydown', (e) => {
  const step = { ArrowLeft: [0, -10], ArrowRight: [0, 10], ArrowUp: [10, 0], ArrowDown: [-10, 0] }[e.key];
  if (!step) return;
  e.preventDefault();
  cancelAnimationFrame(raf);
  rx += step[0];
  ry += step[1];
  apply();
});
scene.addEventListener('pointerup', release);
scene.addEventListener('pointercancel', release);`,
  },

  coverflow: {
    how: [
      'JS knows which cover is active and gives every cover three numbers: <code>--o</code> (offset from active), <code>--abs</code> and <code>--sign</code>.',
      'CSS turns those into position, depth and angle with <code>calc()</code> — JS never writes a transform.',
      'Because only custom properties change, a plain CSS <code>transition</code> animates every move.',
      '<code>z-index</code> by distance keeps nearer covers on top.',
      'Only the two covers either side of the active one are drawn. Seven fanned out in full are nearly twice the width of the canvas, so the far ones are faded right out — which is what a real cover flow does anyway, and it is what holds the width still however long the list gets.',
      'The covers are written in one base unit, <code>--u</code>, so they are the same share of a gallery card, the editor and a recording canvas. The arrows below sit in the standard control zone, in plain <code>vmin</code>, because that is the same object in every model that has one.',
    ],
    html: `<div class="coverflow">
  <div class="view" tabindex="0" aria-label="Cover flow. Use the left and right arrow keys">
    <div class="track">
      <i style="--hue:250">1</i><i style="--hue:272">2</i>
      <i style="--hue:294">3</i><i style="--hue:316">4</i>
      <i style="--hue:338">5</i><i style="--hue:360">6</i>
      <i style="--hue:22">7</i>
    </div>
  </div>

  <div class="controls">
    <output class="caption" aria-live="polite">4 / 7</output>
    <div class="row">
      <button type="button" data-dir="-1" aria-label="Previous">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button type="button" data-dir="1" aria-label="Next">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  </div>
</div>`,
    css: `.coverflow {
  /* one base unit: every length in the covers is a multiple of it, so the flow is the same share
     of a card, the editor, a full screen and a recording canvas. The control zone under it is in
     plain vmin, because it is the same object in every model. */
  --u: 0.25vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin; /* the band's gap between the model and the control zone */
  font-family: system-ui, sans-serif;
}

/* the model box: the same height in every model that has controls, so the zone below it lands
   in the same place whatever the model is */
.view {
  display: grid;
  place-items: center;
  height: 50vmin;
  perspective: calc(700 * var(--u));
  outline-offset: calc(6 * var(--u));
}

.track {
  position: relative;
  width: calc(130 * var(--u));
  height: calc(165 * var(--u));
  transform-style: preserve-3d;
  pointer-events: none;   /* same plane as the active cover: let the covers take the pointer */
}

.track i {
  /* --o, --abs and --sign are set per cover from JS */
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: calc(12 * var(--u));
  font: 900 calc(35 * var(--u)) system-ui;
  color: #fff;
  cursor: pointer;
  pointer-events: auto;
  background: linear-gradient(160deg, hsl(var(--hue) 85% 64%), hsl(var(--hue) 70% 36%));
  box-shadow: 0 calc(16 * var(--u)) calc(24 * var(--u)) calc(-14 * var(--u)) #000;
  opacity: calc(1 - var(--abs) * 0.3);
  transform:
    translateX(calc(var(--o) * 44 * var(--u) + var(--sign) * 34 * var(--u)))
    translateZ(calc(var(--abs) * -60 * var(--u)))
    rotateY(calc(var(--sign) * -58deg));
  transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.55s;
}

/* Anything more than two out is off the end of the flow: gone, and out of hit-testing with it,
   so a click never lands on a cover you cannot see. This is what holds the width still. */
.track i.is-far {
  opacity: 0;
  pointer-events: none;
}

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the covers' own unit. The caption's line box never changes
   height, so counting up cannot move the flow above it. */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}

.controls .caption {
  font: 500 4.5vmin/1.2 system-ui, sans-serif;
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

.controls button {
  display: grid;
  place-items: center;
}

/* SVG arrows, not text like ‹ ›: a glyph sits on the font's baseline, so it never centres */
.controls svg {
  width: 4vmin;
  height: 4vmin;
}`,
    js: `const root = document.querySelector('.coverflow');
const items = [...root.querySelectorAll('.track i')];
const caption = root.querySelector('.caption');
let active = Math.floor(items.length / 2);

function layout() {
  items.forEach((el, i) => {
    const o = i - active;
    el.style.setProperty('--o', o);
    el.style.setProperty('--abs', Math.abs(o));
    el.style.setProperty('--sign', Math.sign(o));
    el.style.zIndex = items.length - Math.abs(o);
    // past the third cover out there is nothing left to see: drop it, and its hit area with it
    el.classList.toggle('is-far', Math.abs(o) > 2);
  });
  caption.textContent = (active + 1) + ' / ' + items.length;
}

function go(dir) {
  active = Math.max(0, Math.min(items.length - 1, active + dir));
  layout();
}

root.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-dir]');
  if (btn) return go(Number(btn.dataset.dir));
  const i = items.indexOf(e.target);
  if (i >= 0) go(i - active);
});

root.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') go(-1);
  if (e.key === 'ArrowRight') go(1);
});

layout();`,
  },

  playground: {
    how: [
      '<code>perspective</code> is the distance from your eye to the z=0 plane. Against this 120-unit box, the slider’s low end (150 units) distorts wildly and its high end (1200) looks almost flat.',
      'It belongs on the <b>parent</b> of the thing you rotate.',
      'The sliders just write three custom properties; the box’s transform reads them. Each also writes <code>--pos</code> on itself, how far along it is from 0 to 1, which is where its filled track ends.',
      'The perspective slider writes a plain number, not a length: the model multiplies it by its own base unit, so 400 here is 400 next to a 120-unit box — the same picture at any canvas size.',
      'Try it: set rotateY to 60° and sweep perspective from one end to the other.',
    ],
    html: `<div class="play">
  <div class="view"><div class="box">3D</div></div>

  <div class="controls">
    <output class="caption"></output>
    <div class="row">
      <label>persp <input type="range" data-var="p"  min="150" max="1200" value="400" aria-label="perspective"></label>
      <label>rX <input type="range" data-var="rx" data-unit="deg" min="-70" max="70" value="20" aria-label="rotateX"></label>
      <label>rY <input type="range" data-var="ry" data-unit="deg" min="-70" max="70" value="-35" aria-label="rotateY"></label>
    </div>
  </div>
</div>`,
    css: `.play {
  /* one base unit: every length in the box below is a multiple of it, so the playground is the
     same share of a gallery card, the editor, a full screen and a recording canvas. The control
     zone under it is in plain vmin, because it is the same object in every model. */
  --u: 0.35vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin;
}

/* room for the box at its biggest — perspective down at 150, turned as far as the sliders go —
   so nothing it draws ever reaches the controls */
.view {
  display: grid;
  place-items: center;
  width: calc(132 * var(--u));
  height: calc(132 * var(--u));
  /* the slider writes a plain number; the unit is the model's, like every other length here */
  perspective: calc(var(--p, 400) * var(--u));
}

.box {
  display: grid;
  place-items: center;
  width: calc(120 * var(--u));
  height: calc(120 * var(--u));
  border-radius: calc(16 * var(--u));
  font: 900 calc(38 * var(--u)) system-ui, sans-serif;
  color: #fff;
  /* deep enough for its white 3D, 3:1 or more (large text): the bright #ffb547 was 2.3:1 */
  background: linear-gradient(135deg, #c96f00, #d1206f);
  transform: rotateX(var(--rx, 20deg)) rotateY(var(--ry, -35deg));
}

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the box's own unit */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}

.controls .caption {
  font: 500 4.5vmin/1.2 ui-monospace, monospace;
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

/* a slider, inside its pill: track and thumb in vmin, never the browser's own px, so it is the
   same share of every canvas. The empty track is the unselected tint and the filled part the
   selected gradient; the thumb is the stage's ink in a gradient ring, because the gradient alone
   is under 3:1 on the pill's tint on the dark stage. Chrome has no filled part of its own: the
   model's JS writes --pos (0 to 1) on the input as it moves, and the fill ends under the thumb */
.controls input[type='range'] {
  --thumb: 4.5vmin;
  appearance: none;
  width: 28vmin;
  height: var(--thumb);
  margin: 0; /* the browser's is 2px */
  background: none;
  color: inherit; /* the thumb is the stage's ink: a form control does not inherit it by itself */
  cursor: pointer;
}
.controls input[type='range']::-webkit-slider-runnable-track {
  height: 1.2vmin;
  border-radius: 999px;
  background:
    linear-gradient(90deg, #6a45f5, #d1206f) 0 0 / calc(var(--thumb) / 2 + var(--pos, 0) * (100% - var(--thumb))) 100% no-repeat,
    rgb(140 150 220 / 0.2);
}
.controls input[type='range']::-webkit-slider-thumb {
  appearance: none;
  box-sizing: border-box;
  width: var(--thumb);
  height: var(--thumb);
  margin-top: calc((1.2vmin - var(--thumb)) / 2);
  border: 0.8vmin solid transparent;
  border-radius: 50%;
  background:
    linear-gradient(currentColor, currentColor) padding-box,
    linear-gradient(135deg, #6a45f5, #d1206f) border-box;
}
.controls input[type='range']::-moz-range-track {
  height: 1.2vmin;
  border-radius: 999px;
  background: rgb(140 150 220 / 0.2);
}
.controls input[type='range']::-moz-range-progress {
  height: 1.2vmin;
  border-radius: 999px;
  background: linear-gradient(90deg, #6a45f5, #d1206f);
}
.controls input[type='range']::-moz-range-thumb {
  box-sizing: border-box;
  width: var(--thumb);
  height: var(--thumb);
  border: 0.8vmin solid transparent;
  border-radius: 50%;
  background:
    linear-gradient(currentColor, currentColor) padding-box,
    linear-gradient(135deg, #6a45f5, #d1206f) border-box;
}
/* focused from the keyboard, the ring goes round the whole pill, out on the stage like every
   other control's: round the thumb it would sit on the tint, where #6a45f5 is under 3:1 */
.controls input[type='range']:focus-visible {
  outline: 0;
}
.controls label:has(input[type='range']:focus-visible) {
  outline: 0.6vmin solid #6a45f5;
  outline-offset: 0.6vmin;
}

/* three sliders share one row: each is shorter than the block's, its track and thumb the same */
.controls input[type='range'] {
  width: 14vmin;
}`,
    js: `const root = document.querySelector('.play');
const out = root.querySelector('.caption');
const inputs = [...root.querySelectorAll('input[type=range]')];

function update() {
  const v = {};
  for (const input of inputs) {
    v[input.dataset.var] = input.value;
    root.style.setProperty('--' + input.dataset.var, input.value + (input.dataset.unit || ''));
    // how far along the slider is, 0 to 1: the filled part of its track
    input.style.setProperty('--pos', (input.value - input.min) / (input.max - input.min));
  }
  out.textContent = 'persp ' + v.p + ' · rX ' + v.rx + '° · rY ' + v.ry + '°';
}

root.addEventListener('input', update);
update();`,
  },

  lit: {
    how: [
      'Same shadow-stack as the extruded text — but every offset is <code>calc(var(--dx) * N * var(--u))</code>.',
      'So the entire extrusion direction is controlled by just two numbers, and its size by a third: <code>--u</code>, the one base unit every length here is a multiple of.',
      'JS treats the pointer as a light: it writes the <b>opposite</b> direction into <code>--dx</code> / <code>--dy</code>, and the shadow swings away from it. It writes plain numbers, never lengths, so the CSS stays in charge of the scale.',
      'Without JS the defaults still give a perfectly good static extrusion — a nice progressive enhancement.',
      'The headline stands on one line. It is many times wider than it is tall, so it is sized by its width, like the other wide models in the gallery, not by its height: it is marked <code>wide</code> in its gallery entry.',
    ],
    html: `<div class="scene" tabindex="0" role="img" aria-label="LIGHT SHADOW, a headline whose long shadow falls away from the pointer">
  <h1 class="lit">LIGHT SHADOW</h1>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the headline is the same share of
     a card, the editor, a full screen and a recording canvas */
  --u: 0.145vmin;
  display: grid;
  place-items: center;
  width: 100vw;   /* the whole canvas is the light's field, so the pointer is read across it */
  height: 100vh;
}

/* One line, as a headline is: LIGHT SHADOW draws many times wider than it is tall, so it is sized
   by its width (it is marked 'wide'): the unit puts it near the width the gallery's other wide
   models have */
.lit {
  --dx: 0.7;   /* direction — overwritten from JS */
  --dy: 0.7;
  margin: 0;
  font: 900 calc(72 * var(--u))/1.2 system-ui;
  text-align: center;
  white-space: nowrap;
  transform: translateY(calc(-4 * var(--u)));
  color: #fff;
  /* the long shadow in a deep amber, so the white face stands 3:1 or more off it (large text) where
     the shadow shows at its edges; from a bright #e6a340 it was 2.2:1 */
  text-shadow:
    calc(var(--dx) * 1 * var(--u))  calc(var(--dy) * 1 * var(--u))  0 #b07424,
    calc(var(--dx) * 2 * var(--u))  calc(var(--dy) * 2 * var(--u))  0 #a56d22,
    calc(var(--dx) * 3 * var(--u))  calc(var(--dy) * 3 * var(--u))  0 #9a6620,
    calc(var(--dx) * 4 * var(--u))  calc(var(--dy) * 4 * var(--u))  0 #905f1d,
    calc(var(--dx) * 5 * var(--u))  calc(var(--dy) * 5 * var(--u))  0 #85581b,
    calc(var(--dx) * 6 * var(--u))  calc(var(--dy) * 6 * var(--u))  0 #7a5019,
    calc(var(--dx) * 7 * var(--u))  calc(var(--dy) * 7 * var(--u))  0 #6f4917,
    calc(var(--dx) * 8 * var(--u))  calc(var(--dy) * 8 * var(--u))  0 #654214,
    calc(var(--dx) * 9 * var(--u))  calc(var(--dy) * 9 * var(--u))  0 #5a3b12,
    calc(var(--dx) * 10 * var(--u)) calc(var(--dy) * 10 * var(--u)) 0 #4f3410,
    calc(var(--dx) * 22 * var(--u)) calc(var(--dy) * 22 * var(--u)) calc(20 * var(--u)) rgb(0 0 0 / 0.5);
}

/* the keyboard: Tab to it and the shadow falls as it would for a pointer near the top right, even
   with the pointer resting on the canvas (!important beats the direction the script writes inline) */
.scene:focus-visible .lit { --dx: -0.8 !important; --dy: 0.4 !important; }`,
    js: `const scene = document.querySelector('.scene');
const text = document.querySelector('.lit');

scene.addEventListener('pointermove', (e) => {
  const r = scene.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  // the pointer is the light, so the shadow falls the other way
  text.style.setProperty('--dx', -x * 2);
  text.style.setProperty('--dy', -y * 2);
});`,
  },

  sphere: {
    how: [
      'Writing 120 dots by hand is not realistic — JS generates them once from the Fibonacci-sphere formula.',
      'Each dot gets <code>rotateY(longitude) rotateX(latitude) translateZ(radius)</code>: aim, then push outward. Same idea as the carousel, in two axes.',
      'After that JS is done. The rotation is an ordinary CSS keyframe animation on the container.',
      'The container is 0×0 so every dot rotates around the exact centre.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas. JS writes <code>translateZ(var(--r))</code> rather than a pixel radius, so the radius (130 units) stays in CSS and the ball is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="ball"></div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the ball is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.245vmin;
  perspective: calc(600 * var(--u));
}

.ball {
  --r: calc(130 * var(--u));
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: ball-spin 16s linear infinite;
}

.ball i {
  position: absolute;
  top: calc(-4 * var(--u));
  left: calc(-4 * var(--u));
  width: calc(8 * var(--u));
  height: calc(8 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle, #fff 15%, #ffb547 60%);
}

@keyframes ball-spin {
  from { transform: rotateX(-18deg) rotateY(0deg); }
  to   { transform: rotateX(-18deg) rotateY(360deg); }
}`,
    js: `const ball = document.querySelector('.ball');
const COUNT = 120;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

for (let i = 0; i < COUNT; i++) {
  const lat = Math.asin(1 - (i / (COUNT - 1)) * 2);  // -90° … 90°
  const lon = i * GOLDEN_ANGLE;

  const dot = document.createElement('i');
  dot.style.transform =
    'rotateY(' + lon + 'rad) rotateX(' + lat + 'rad) translateZ(var(--r))';
  ball.append(dot);
}`,
  },

  clock: {
    how: [
      'CSS has no idea what time it is — JS reads the clock and writes the digits.',
      'Each card is a real split flap: four halves. Behind, the <b>top half of the new value</b> and the <b>bottom half of the old one</b> stand still. In front, a flap hinged on the middle line (<code>transform-origin: bottom</code>) carries the old top half on its face and the new bottom half on its back (<code>rotateX(180deg)</code>, both sides <code>backface-visibility: hidden</code>).',
      'A half is a box with <code>overflow: hidden</code> and half the height of the card; the digits inside it are the full height of the card, pinned to its top or to its bottom, so each half shows exactly its half of them.',
      'The flip is one CSS keyframe, <code>rotateX(0)</code> → <code>rotateX(-180deg)</code>: the old top falls towards you and lands as the new bottom. Midway it is edge-on, and the still halves behind it are what you see, as on a real board.',
      'When it lands (<code>animationend</code>), JS writes the new value on the parts that still showed the old one and takes the class off, so the flap is back up, showing the same digits it covers. To replay the animation: remove the class, force a reflow (<code>void el.offsetWidth</code>), add it back.',
      'Only the pairs whose value actually changed are flipped.',
      'Hours, minutes and seconds stand on one line, <code>HH : MM : SS</code>, as on a real flip clock. That line is about four times wider than it is tall, so the clock is sized by its width, like the other wide models in the gallery, not by its height: it is marked <code>wide</code> in its gallery entry.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the digits and their cards are the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="clock">${FLAP_CARD}<em>:</em>${FLAP_CARD}<em>:</em>${FLAP_CARD}</div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the clock is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.23vmin;
  perspective: calc(700 * var(--u));
}

/* Hours, minutes and seconds on one line, as a flip clock has them. The line is about four times
   wider than it is tall, so the clock is sized by its width (it is marked 'wide'): the unit puts it
   near the width the gallery's other wide models have */
.clock {
  display: flex;
  align-items: center;
  gap: calc(8 * var(--u));
  font: 800 calc(56 * var(--u)) ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  transform: rotateY(-14deg) rotateX(6deg);
  transform-style: preserve-3d;
}

.clock em { color: #ffb547; font-style: normal; }

/* a card: two still halves behind, one flap in front */
.card {
  position: relative;
  width: calc(96 * var(--u));
  height: calc(86 * var(--u));
  border-radius: calc(12 * var(--u));
  box-shadow: 0 calc(14 * var(--u)) calc(22 * var(--u)) calc(-12 * var(--u)) #000;
  color: #fff;
  transform-style: preserve-3d;
}

.half {
  position: absolute;
  left: 0;
  right: 0;
  height: 50%;
  overflow: hidden;
}

.half.top {
  top: 0;
  border-radius: calc(12 * var(--u)) calc(12 * var(--u)) 0 0;
  background: #2a2f52;
  box-shadow: inset 0 calc(-1.5 * var(--u)) #0c0e1d; /* the split line */
}

.half.bottom {
  bottom: 0;
  border-radius: 0 0 calc(12 * var(--u)) calc(12 * var(--u));
  background: #1d2140;
}

/* the digits are the card's full height, pinned to the top or the bottom of their half */
.half i {
  position: absolute;
  left: 0;
  right: 0;
  height: calc(86 * var(--u));
  font-style: normal;
  line-height: calc(86 * var(--u));
  text-align: center;
}

.half.top i { top: 0; }
.half.bottom i { bottom: 0; }

/* the flap: the top half's box, hinged on the middle line, a hair in front of the still halves
   so it never shares their plane */
.flap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  transform-origin: bottom;
  transform-style: preserve-3d;
  transform: translateZ(calc(0.5 * var(--u))) rotateX(0deg);
}

.flap .half {
  inset: 0;
  height: auto;
  backface-visibility: hidden;
}

/* its back: turned over, so it lands as the bottom half the right way up */
.flap .back {
  transform: rotateX(180deg);
}

.card.is-flipping .flap {
  animation: flap 0.5s ease-in forwards;
}

@keyframes flap {
  from { transform: translateZ(calc(0.5 * var(--u))) rotateX(0deg); }
  to   { transform: translateZ(calc(0.5 * var(--u))) rotateX(-180deg); }
}`,
    js: `const cards = [...document.querySelectorAll('.clock .card')].map((card) => ({
  card,
  top: card.querySelector(':scope > .top i'),     // new value, top half (still)
  bottom: card.querySelector(':scope > .bottom i'), // old value, bottom half (still)
  front: card.querySelector('.flap .front i'),     // old value, top half (falls)
  back: card.querySelector('.flap .back i'),       // new value, bottom half (lands)
  value: '',
}));

// the flap has landed: every part shows the new value, and the flap goes back up over it
function settle(c) {
  c.bottom.textContent = c.front.textContent = c.value;
  c.card.classList.remove('is-flipping');
}
cards.forEach((c) => c.card.addEventListener('animationend', () => settle(c)));

// The site pauses a model by marking the frame's <html data-paused>: then the clock stands still,
// and catches up when it is un-paused. With reduced motion the digits change without the flip.
const calm = matchMedia('(prefers-reduced-motion: reduce)');

function tick() {
  if (document.documentElement.hasAttribute('data-paused')) return;
  const d = new Date();
  [d.getHours(), d.getMinutes(), d.getSeconds()].forEach((n, i) => {
    const text = String(n).padStart(2, '0');
    const c = cards[i];
    if (c.value === text) return;

    const first = !c.value;
    if (!first) settle(c); // a flip that never landed (paused) finishes first
    c.value = text;
    c.top.textContent = c.back.textContent = text;
    if (first || calm.matches) return settle(c);

    void c.card.offsetWidth;          // force reflow so the animation restarts
    c.card.classList.add('is-flipping');
  });
}

tick();
setInterval(tick, 250);`,
  },
};

export const snippets: Record<string, Snippet> = { ...snippets1, ...snippets2, ...snippetsA, ...snippetsB, ...snippetsC, ...snippetsD, ...snippetsE, ...snippetsF, ...snippetsG, ...snippetsH, ...snippetsI, ...snippetsJ, ...snippetsK, ...snippetsL };
