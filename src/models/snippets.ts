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

const CUBE_FACE_LOOK = `.cube > * {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font: 700 1.5rem system-ui;
  background: rgb(139 108 255 / 0.28);
  border: 1px solid rgb(139 108 255 / 0.8);
}`;

const snippets1: Record<string, Snippet> = {
  cube: {
    how: [
      'Put <code>perspective</code> on the <b>parent</b>. It is the camera distance — smaller means more dramatic.',
      'Give the cube <code>transform-style: preserve-3d</code>, otherwise its children are flattened into its plane.',
      'Stack all six faces in the same spot, rotate each to face outward, then <code>translateZ</code> by half the side length.',
      'Animate only the cube. The faces ride along for free.',
    ],
    html: `<div class="scene">
  <div class="cube">
    <div>1</div><div>2</div><div>3</div>
    <div>4</div><div>5</div><div>6</div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.cube {
  --s: 120px;
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
    ],
    html: `<div class="flip" tabindex="0">
  <div class="flip-inner">
    <div class="flip-face">Front</div>
    <div class="flip-face flip-back">Back</div>
  </div>
</div>`,
    css: `.flip {
  width: 240px;
  height: 160px;
  perspective: 800px;
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
  border-radius: 16px;
  font: 700 1.5rem system-ui;
  color: #fff;
  background: linear-gradient(135deg, #8b6cff, #ff4d9d);
  backface-visibility: hidden;
}

.flip-back {
  background: linear-gradient(135deg, #2ee6d6, #8b6cff);
  transform: rotateY(180deg);
}`,
  },

  carousel: {
    how: [
      'Every panel sits in the same spot, then gets <code>rotateY(n × 360° / count)</code> followed by <code>translateZ(radius)</code>.',
      'Order matters: rotate first, <i>then</i> translate — so each panel moves outward along its own rotated axis.',
      'Radius for a closed ring: <code>(width / 2) / tan(180° / count)</code>. For 8 panels of 80px that is ≈ 97px; add a little for gaps.',
      'Spin the ring, and tilt a wrapper so you look slightly down on it.',
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
  perspective: 900px;
}

.ring {
  --count: 8;
  --radius: 115px;
  position: relative;
  width: 80px;
  height: 110px;
  transform-style: preserve-3d;
  animation: ring-spin 14s linear infinite;
}

.ring > div {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font: 800 1.4rem system-ui;
  color: #fff;
  background: hsl(calc(250 + var(--i) * 18) 80% 60% / 0.85);
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
      'There is no real depth here — it is many hard-edged <code>text-shadow</code>s, each offset 1px further.',
      'Darken each layer slightly and the stack reads as a solid side wall.',
      'Finish with one blurred shadow for the drop shadow on the "ground".',
      'In Sass a <code>@function</code> with a <code>@for</code> loop writes the list for you (see the Sass source tab).',
    ],
    html: `<div class="scene">
  <h1 class="extruded">DEPTH</h1>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.extruded {
  margin: 0;
  font: 900 5rem system-ui;
  letter-spacing: 0.04em;
  color: #fff;
  text-shadow:
    1px 1px 0 #7f63e8, 2px 2px 0 #785ddb,
    3px 3px 0 #7057cd, 4px 4px 0 #6951c0,
    5px 5px 0 #614bb2, 6px 6px 0 #5a45a5,
    7px 7px 0 #523f97, 8px 8px 0 #4b398a,
    14px 18px 18px rgb(0 0 0 / 0.5);
  animation: rock 5s ease-in-out infinite alternate;
}

@keyframes rock {
  from { transform: rotateY(-32deg) rotateX(12deg); }
  to   { transform: rotateY(32deg)  rotateX(-6deg); }
}`,
  },

  layers: {
    how: [
      '<code>rotateX(58deg) rotateZ(-45deg)</code> on the parent gives the classic isometric viewing angle.',
      'All plates are stacked at the same position; only <code>translateZ</code> separates them.',
      'Each plate carries its index in <code>--i</code>, and the keyframe uses <code>calc(var(--i) * 40px)</code> — one animation, four different results.',
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
  perspective: 900px;
}

.layers {
  position: relative;
  width: 140px;
  height: 140px;
  transform-style: preserve-3d;
  transform: rotateX(58deg) rotateZ(-45deg);
}

.layers i {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  border: 1px solid rgb(255 255 255 / 0.35);
  background: hsl(calc(255 + var(--i) * 32) 85% 62% / 0.78);
  animation: lift 2.6s ease-in-out infinite alternate;
}

@keyframes lift {
  to { transform: translateZ(calc(var(--i) * 40px)); }
}`,
  },

  button: {
    how: [
      'The "side" of the button is a stack of 1px <code>box-shadow</code>s going straight down.',
      'The <code>&lt;button&gt;</code> is a static, invisible hit target; the visible cap is a <code>&lt;span&gt;</code> inside it. A pressed element that moves itself can slide out from under the pointer.',
      'On <code>:active</code>, move the cap down with <code>translateY</code> and shrink the stack by the same amount — the base appears to stay put.',
      'Keep the transition very short (≈80ms) so it feels mechanical.',
      'A slight <code>rotateX</code> tilt sells the perspective.',
    ],
    html: `<div class="scene">
  <button class="push" type="button"><span>PUSH</span></button>
</div>`,
    css: `.scene {
  perspective: 600px;
}

/* static hit target (its bottom padding covers where the cap travels to) */
.push {
  padding: 0 0 8px;
  border: 0;
  background: none;
  cursor: pointer;
  transform: rotateX(30deg);
}

/* the visible cap */
.push span {
  display: block;
  padding: 18px 46px;
  border-radius: 16px;
  font: 900 1.4rem system-ui;
  letter-spacing: 0.14em;
  color: #fff;
  background: linear-gradient(#ff4d9d, #d63a80);
  pointer-events: none;
  box-shadow:
    0 1px 0 #8f2a58, 0 2px 0 #8f2a58, 0 3px 0 #8f2a58,
    0 4px 0 #8f2a58, 0 5px 0 #8f2a58, 0 6px 0 #8f2a58,
    0 7px 0 #8f2a58, 0 8px 0 #8f2a58, 0 9px 0 #8f2a58,
    0 10px 0 #8f2a58,
    0 18px 22px rgb(0 0 0 / 0.55);
  transition: transform 0.08s, box-shadow 0.08s;
}

.push:active span {
  transform: translateY(8px);
  box-shadow:
    0 1px 0 #8f2a58, 0 2px 0 #8f2a58,
    0 6px 10px rgb(0 0 0 / 0.55);
}`,
  },

  fold: {
    how: [
      'Panels are <b>nested</b>, not siblings: each one lives inside the previous one, so it inherits every fold before it.',
      'Each nested panel is positioned at <code>left: 100%</code> with <code>transform-origin: left</code> — a hinge on the parent’s right edge.',
      'Every level needs <code>transform-style: preserve-3d</code>, or the chain flattens at that level.',
      'Alternate the fold direction (+150° / −150°) for a zig-zag.',
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
  perspective: 900px;
}

.map {
  width: 240px;          /* 4 panels × 60px */
  height: 140px;
  transform-style: preserve-3d;
  transform: rotateX(28deg) rotateY(-8deg);
}

.panel {
  width: 60px;
  height: 100%;
  transform-style: preserve-3d;
  background: linear-gradient(90deg, #2ee6d6, #157a72);
  border: 1px solid rgb(255 255 255 / 0.25);
}

.panel .panel {
  position: absolute;
  top: -1px;
  left: 100%;
  transform-origin: left center;
  animation: fold-back 3.4s ease-in-out infinite alternate;
}

.panel .panel .panel        { animation-name: fold-front; }
.panel .panel .panel .panel { animation-name: fold-back; }

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
      'Fix: two elements. The outer <b>plane</b> holds the static tilt, the inner <b>ring</b> only animates <code>rotateZ</code>.',
      'The electron is just a dot pinned to the top of the ring — the ring’s spin carries it around.',
      'Different tilts + different durations = an atom.',
    ],
    html: `<div class="scene">
  <div class="atom">
    <b></b>
    <div class="plane"><div class="orbit"><i></i></div></div>
    <div class="plane"><div class="orbit"><i></i></div></div>
    <div class="plane"><div class="orbit"><i></i></div></div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.atom {
  position: relative;
  width: 200px;
  height: 200px;
  transform-style: preserve-3d;
}

.atom b {
  position: absolute;
  inset: 40%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff, #8b6cff 60%);
  box-shadow: 0 0 24px #8b6cff;
}

.plane {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.plane:nth-of-type(1) { transform: rotateX(72deg);                 color: #2ee6d6; }
.plane:nth-of-type(2) { transform: rotateZ(60deg)  rotateX(72deg); color: #ff4d9d; }
.plane:nth-of-type(3) { transform: rotateZ(-60deg) rotateX(72deg); color: #ffb547; }

.orbit {
  position: absolute;
  inset: 0;
  border: 2px solid currentColor;
  border-radius: 50%;
  animation: orbit-spin 3s linear infinite;
}

.plane:nth-of-type(2) .orbit { animation-duration: 3.7s; }
.plane:nth-of-type(3) .orbit { animation-duration: 4.4s; }

.orbit i {
  position: absolute;
  top: -7px;
  left: calc(50% - 6px);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 12px currentColor;
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
    ],
    html: `<div class="scene">
  <div class="chart">
    <!-- --hn = full height in px, as a plain number -->
    <div class="bar" style="--hn:70;  --hue:262; --delay:0s"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:110; --hue:285; --delay:-0.35s"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:50;  --hue:320; --delay:-0.7s"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:140; --hue:175; --delay:-1.05s"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:90;  --hue:40;  --delay:-1.4s"><i></i><i></i><i></i></div>
  </div>
</div>`,
    css: `.scene {
  perspective: 900px;
}

.chart {
  --w: 30px;
  display: flex;
  align-items: flex-end;
  gap: 18px;
  height: 150px;
  transform-style: preserve-3d;
  transform: rotateX(-22deg) rotateY(-32deg);
}

.bar {
  --h: calc(var(--hn) * 1px);     /* full height */
  --k: calc(14 / var(--hn));      /* scale of the shortest state: 14px */
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
  from { transform: translateY(calc(var(--h) - 14px)) rotateX(90deg) translateZ(calc(var(--w) / 2)); }
}`,
  },

  book: {
    how: [
      'Cover and pages are stacked sheets, all with <code>transform-origin: left</code> — the spine is the hinge.',
      'Each sheet gets its index in <code>--n</code>. A 1px <code>translateZ</code> per sheet stops them z-fighting.',
      'The keyframe’s end angle is <code>var(--end)</code>, computed per sheet, so one animation fans the pages out.',
      'A small per-sheet <code>animation-delay</code> makes the cover lead and the pages follow.',
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
  perspective: 1000px;
}

.book {
  position: relative;
  width: 130px;
  height: 175px;
  border-radius: 2px 8px 8px 2px;
  background: #4a3a99;               /* back cover */
  transform-style: preserve-3d;
  transform: translateX(60px) rotateX(24deg) rotateY(-12deg);
}

.book i {
  --end: calc(-118deg - var(--n) * 12deg);
  position: absolute;
  inset: 3px 3px 3px 0;
  border-radius: 0 5px 5px 0;
  background: linear-gradient(90deg, #cfd3e6, #fff 14%);
  transform-origin: left center;
  transform: translateZ(calc(var(--n) * 1px));
  animation: open 3.6s ease-in-out infinite alternate;
  animation-delay: calc((4 - var(--n)) * 0.14s);
}

.book .cover {
  inset: 0;
  border-radius: 2px 8px 8px 2px;
  background: linear-gradient(90deg, #4a3a99, #8b6cff 12%);
}

@keyframes open {
  0%, 10%   { transform: translateZ(calc(var(--n) * 1px)) rotateY(0deg); }
  90%, 100% { transform: translateZ(calc(var(--n) * 1px)) rotateY(var(--end)); }
}`,
  },

  radio: {
    how: [
      'Real <code>&lt;input type="radio"&gt;</code> elements hold the state — the browser handles clicks and arrow keys.',
      'The cube comes <b>after</b> the inputs in the markup, so <code>input:checked ~ .cube</code> can reach it.',
      'Each radio maps to the rotation that brings its face to the front; a <code>transition</code> animates between them.',
      '<code>appearance: none</code> lets you restyle the radios as buttons. Keep the <code>aria-label</code>s.',
    ],
    html: `<div class="picker">
  <div class="controls-and-cube">
    <input type="radio" name="face" aria-label="Front" checked>
    <input type="radio" name="face" aria-label="Right">
    <input type="radio" name="face" aria-label="Back">
    <input type="radio" name="face" aria-label="Left">
    <input type="radio" name="face" aria-label="Top">
    <input type="radio" name="face" aria-label="Bottom">

    <div class="cube">
      <div>Front</div><div>Right</div><div>Back</div>
      <div>Left</div><div>Top</div><div>Bottom</div>
    </div>
  </div>
</div>`,
    css: `.picker {
  perspective: 800px;
}

.controls-and-cube {
  display: grid;
  grid-template-columns: repeat(6, auto);
  justify-content: center;
  gap: 40px 8px;
  transform-style: preserve-3d;
}

input {
  appearance: none;
  width: 26px;
  height: 26px;
  margin: 0;
  border: 2px solid #5a6188;
  border-radius: 8px;
  cursor: pointer;
}

input:checked {
  background: #2ee6d6;
  border-color: #2ee6d6;
  box-shadow: 0 0 12px #2ee6d6;
}

.cube {
  --s: 120px;
  --view: rotateX(-18deg) rotateY(-22deg);
  grid-row: 1;
  grid-column: 1 / -1;
  justify-self: center;
  position: relative;
  width: var(--s);
  height: var(--s);
  margin-top: 30px;
  transform-style: preserve-3d;
  transform: var(--view);
  transition: transform 0.9s cubic-bezier(0.3, 1.3, 0.5, 1);
}

/* the whole trick: a checked radio restyles a LATER sibling */
input:nth-of-type(1):checked ~ .cube { transform: var(--view) rotateY(0deg); }
input:nth-of-type(2):checked ~ .cube { transform: var(--view) rotateY(-90deg); }
input:nth-of-type(3):checked ~ .cube { transform: var(--view) rotateY(-180deg); }
input:nth-of-type(4):checked ~ .cube { transform: var(--view) rotateY(90deg); }
input:nth-of-type(5):checked ~ .cube { transform: var(--view) rotateX(-90deg); }
input:nth-of-type(6):checked ~ .cube { transform: var(--view) rotateX(90deg); }

.cube > * {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font: 700 1rem system-ui;
  background: rgb(46 230 214 / 0.25);
  border: 1px solid rgb(46 230 214 / 0.8);
}

${CUBE_FACES}`,
  },

  grid: {
    how: [
      'The floor is one big element with two <code>linear-gradient</code>s drawing the grid lines.',
      'Hinge it on the horizon (<code>transform-origin: top</code>) and lay it down with <code>rotateX(80deg)</code>. A short <code>perspective</code> on the parent exaggerates the depth.',
      'Motion is a child layer sliding by <b>exactly one cell</b> with <code>transform</code>, so the loop is seamless. (Animating <code>background-position</code> looks the same but repaints every frame; transform does not.)',
      'A <code>mask</code> gradient fades the lines out toward the horizon.',
    ],
    html: `<div class="retro">
  <div class="sun"></div>
  <div class="floor"></div>
</div>`,
    css: `.retro {
  position: fixed;
  inset: 0;
  overflow: hidden;
  perspective: 260px;
  perspective-origin: 50% 40%;
  background: linear-gradient(#12062e 0%, #3b0f5c 38%, #ff4d9d 50%, #0a0618 50.5%);
}

.sun {
  position: absolute;
  top: 14%;
  left: 50%;
  width: 160px;
  height: 160px;
  translate: -50% 0;
  border-radius: 50%;
  background: linear-gradient(#ffd34d, #ff4d9d 70%);
  mask: linear-gradient(#000 55%, transparent 55% 60%, #000 60% 70%,
        transparent 70% 77%, #000 77% 85%, transparent 85%);
  box-shadow: 0 0 60px #ff4d9d;
}

.floor {
  --cell: 40px;
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
    linear-gradient(#2ee6d6 2px, transparent 2px) 0 0 / var(--cell) var(--cell),
    linear-gradient(90deg, #2ee6d6 2px, transparent 2px) 50% 0 / var(--cell) var(--cell);
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
  perspective: 800px;
}

.helix {
  display: grid;
  gap: 12px;
  transform-style: preserve-3d;
  transform: rotateZ(-14deg);
}

.helix > div {
  --delay: calc(var(--i) * -0.22s);
  position: relative;
  width: 120px;
  height: 3px;
  background: linear-gradient(90deg, #2ee6d6, transparent 35% 65%, #ff4d9d);
  transform-style: preserve-3d;
  animation: helix-spin 4s linear infinite;
  animation-delay: var(--delay);
}

.helix i {
  position: absolute;
  top: -6px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  /* same animation, reversed → the dot always faces the camera */
  animation: helix-spin 4s linear infinite reverse;
  animation-delay: var(--delay);
}

.helix i:first-child { left: -7px;  background: #2ee6d6; box-shadow: 0 0 10px #2ee6d6; }
.helix i:last-child  { right: -7px; background: #ff4d9d; box-shadow: 0 0 10px #ff4d9d; }

@keyframes helix-spin {
  to { transform: rotateY(360deg); }
}`,
  },

  tiles: {
    how: [
      'Each tile has two faces from <code>::before</code> and <code>::after</code>, back to back, both with <code>backface-visibility: hidden</code>.',
      'Every tile runs the same flip animation.',
      'The wave comes purely from <code>animation-delay = (row + column) × step</code>. In plain CSS you set <code>--d</code> per tile; in Sass a nested <code>@for</code> loop writes it.',
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
  perspective: 800px;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(4, 48px);
  gap: 8px;
  transform-style: preserve-3d;
  transform: rotateX(38deg) rotateZ(-8deg);
}

.tiles i {
  position: relative;
  height: 48px;
  transform-style: preserve-3d;
  animation: tile-flip 3.2s ease-in-out infinite;
  animation-delay: calc(var(--d) * 0.13s);   /* --d = row + column */
}

.tiles i::before,
.tiles i::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  backface-visibility: hidden;
}

.tiles i::before { background: #8b6cff; }
.tiles i::after  { background: #2ee6d6; transform: rotateY(180deg); }

@keyframes tile-flip {
  0%, 15%   { transform: rotateY(0deg); }
  45%, 65%  { transform: rotateY(180deg) translateZ(-14px); }
  95%, 100% { transform: rotateY(360deg); }
}`,
  },

  tilt: {
    how: [
      'CSS cannot read the pointer position — that is the <b>only</b> reason this needs JavaScript.',
      'JS normalises the pointer to −0.5…0.5 and writes four custom properties: <code>--rx</code>, <code>--ry</code>, <code>--mx</code>, <code>--my</code>.',
      'CSS uses them for the tilt (<code>rotateX/rotateY</code>) and for the centre of a <code>radial-gradient</code> glare.',
      'Children with <code>translateZ</code> float above the card, producing parallax for free.',
      'A long transition eases the card back to rest; while the pointer is driving it is shortened so it tracks tightly.',
    ],
    html: `<div class="scene">
  <div class="tilt">
    <span class="chip"></span>
    <b>Move your pointer</b>
    <small>tilt · depth · glare</small>
  </div>
</div>`,
    css: `.scene {
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
  perspective: 800px;
}

.tilt {
  --rx: 0deg;  --ry: 0deg;   /* tilt  — set from JS */
  --mx: 50%;   --my: 50%;    /* glare — set from JS */
  position: relative;
  display: grid;
  align-content: end;
  gap: 2px;
  width: 280px;
  height: 176px;
  padding: 20px;
  border-radius: 18px;
  color: #fff;
  font-family: system-ui;
  background: linear-gradient(135deg, #8b6cff, #ff4d9d);
  box-shadow: 0 24px 40px -18px #8b6cff;
  transform-style: preserve-3d;
  transform: rotateX(var(--rx)) rotateY(var(--ry));
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
.tilt b     { transform: translateZ(40px); }
.tilt small { transform: translateZ(22px); opacity: 0.85; }

.chip {
  position: absolute;
  top: 22px;
  left: 22px;
  width: 46px;
  height: 34px;
  border-radius: 7px;
  background: linear-gradient(135deg, #ffe08a, #d89b1d);
  transform: translateZ(54px);
}`,
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
    ],
    html: `<div class="scene">
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
  perspective: 800px;
  cursor: grab;
  touch-action: none;   /* let JS have the drag on touch screens */
  user-select: none;
}

.scene:active { cursor: grabbing; }

.cube {
  --s: 140px;
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
  border: 1px solid rgb(255 181 71 / 0.85);
}

${CUBE_FACES}`,
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
scene.addEventListener('pointerup', release);
scene.addEventListener('pointercancel', release);`,
  },

  coverflow: {
    how: [
      'JS knows which cover is active and gives every cover three numbers: <code>--o</code> (offset from active), <code>--abs</code> and <code>--sign</code>.',
      'CSS turns those into position, depth and angle with <code>calc()</code> — JS never writes a transform.',
      'Because only custom properties change, a plain CSS <code>transition</code> animates every move.',
      '<code>z-index</code> by distance keeps nearer covers on top.',
    ],
    html: `<div class="coverflow" tabindex="0">
  <div class="track">
    <i style="--hue:250">1</i><i style="--hue:272">2</i>
    <i style="--hue:294">3</i><i style="--hue:316">4</i>
    <i style="--hue:338">5</i><i style="--hue:360">6</i>
    <i style="--hue:22">7</i>
  </div>
  <nav>
    <button type="button" data-dir="-1" aria-label="Previous">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <button type="button" data-dir="1" aria-label="Next">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  </nav>
</div>`,
    css: `.coverflow {
  display: grid;
  justify-items: center;
  gap: 40px;
  perspective: 700px;
  outline: none;
}

.track {
  position: relative;
  width: 130px;
  height: 165px;
  transform-style: preserve-3d;
  pointer-events: none;   /* same plane as the active cover: let the covers take the pointer */
}

.track i {
  /* --o, --abs and --sign are set per cover from JS */
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font: 900 2.2rem system-ui;
  color: #fff;
  cursor: pointer;
  pointer-events: auto;
  background: linear-gradient(160deg, hsl(var(--hue) 85% 64%), hsl(var(--hue) 70% 36%));
  box-shadow: 0 16px 24px -14px #000;
  transform:
    translateX(calc(var(--o) * 62px + var(--sign) * 46px))
    translateZ(calc(var(--abs) * -60px))
    rotateY(calc(var(--sign) * -58deg));
  transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
}

nav { display: flex; gap: 8px; }

nav button {
  width: 44px;
  height: 36px;
  border: 1px solid #5a6188;
  border-radius: 8px;
  display: grid;
  place-items: center;
  padding: 0;
  background: #161a2e;
  color: #fff;
  cursor: pointer;
}

/* SVG arrows, not text like ‹ ›: a glyph sits on the font's baseline, so it never centres */
nav svg {
  width: 18px;
  height: 18px;
}`,
    js: `const root = document.querySelector('.coverflow');
const items = [...root.querySelectorAll('.track i')];
let active = Math.floor(items.length / 2);

function layout() {
  items.forEach((el, i) => {
    const o = i - active;
    el.style.setProperty('--o', o);
    el.style.setProperty('--abs', Math.abs(o));
    el.style.setProperty('--sign', Math.sign(o));
    el.style.zIndex = items.length - Math.abs(o);
  });
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
      '<code>perspective</code> is the distance from your eye to the z=0 plane. Low values (≈150px) distort wildly; high values (≈1200px) look almost flat.',
      'It belongs on the <b>parent</b> of the thing you rotate.',
      'The sliders just write three custom properties; the box’s transform reads them.',
      'Try it: set rotateY to 60° and sweep perspective from one end to the other.',
    ],
    html: `<div class="play">
  <div class="view"><div class="box">3D</div></div>

  <label>perspective <input type="range" data-var="p"  data-unit="px"  min="120" max="1200" value="400"></label>
  <label>rotateX     <input type="range" data-var="rx" data-unit="deg" min="-80" max="80"   value="20"></label>
  <label>rotateY     <input type="range" data-var="ry" data-unit="deg" min="-80" max="80"   value="-35"></label>

  <code class="out"></code>
</div>`,
    css: `.play {
  display: grid;
  gap: 10px;
  width: min(360px, 90vw);
  font: 14px ui-monospace, monospace;
}

.view {
  display: grid;
  place-items: center;
  height: 260px;
  perspective: var(--p, 400px);
}

.box {
  display: grid;
  place-items: center;
  width: 150px;
  height: 150px;
  border-radius: 16px;
  font: 900 2.4rem system-ui;
  color: #fff;
  background: linear-gradient(135deg, #ffb547, #ff4d9d);
  transform: rotateX(var(--rx, 20deg)) rotateY(var(--ry, -35deg));
}

label { display: grid; color: #949bc0; }
input { accent-color: #ffb547; }
.out  { color: #2ee6d6; }`,
    js: `const root = document.querySelector('.play');
const out = root.querySelector('.out');
const inputs = [...root.querySelectorAll('input[type=range]')];

function update() {
  const v = {};
  for (const input of inputs) {
    v[input.dataset.var] = input.value + input.dataset.unit;
    root.style.setProperty('--' + input.dataset.var, v[input.dataset.var]);
  }
  out.textContent =
    'perspective: ' + v.p + '; transform: rotateX(' + v.rx + ') rotateY(' + v.ry + ');';
}

root.addEventListener('input', update);
update();`,
  },

  lit: {
    how: [
      'Same shadow-stack as the extruded text — but every offset is <code>calc(var(--dx) * Npx)</code>.',
      'So the entire extrusion direction is controlled by just two numbers.',
      'JS treats the pointer as a light: it writes the <b>opposite</b> direction into <code>--dx</code> / <code>--dy</code>, and the shadow swings away from it.',
      'Without JS the defaults still give a perfectly good static extrusion — a nice progressive enhancement.',
    ],
    html: `<div class="scene">
  <h1 class="lit">SHADOW</h1>
</div>`,
    css: `.scene {
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
}

.lit {
  --dx: 0.7;   /* direction — overwritten from JS */
  --dy: 0.7;
  margin: 0;
  font: 900 4.5rem system-ui;
  color: #fff;
  text-shadow:
    calc(var(--dx) * 1px)  calc(var(--dy) * 1px)  0 #e6a340,
    calc(var(--dx) * 2px)  calc(var(--dy) * 2px)  0 #d99a3c,
    calc(var(--dx) * 3px)  calc(var(--dy) * 3px)  0 #cc9139,
    calc(var(--dx) * 4px)  calc(var(--dy) * 4px)  0 #bf8835,
    calc(var(--dx) * 5px)  calc(var(--dy) * 5px)  0 #b37f32,
    calc(var(--dx) * 6px)  calc(var(--dy) * 6px)  0 #a6762e,
    calc(var(--dx) * 7px)  calc(var(--dy) * 7px)  0 #996d2b,
    calc(var(--dx) * 8px)  calc(var(--dy) * 8px)  0 #8c6327,
    calc(var(--dx) * 9px)  calc(var(--dy) * 9px)  0 #805a24,
    calc(var(--dx) * 10px) calc(var(--dy) * 10px) 0 #735120,
    calc(var(--dx) * 22px) calc(var(--dy) * 22px) 20px rgb(0 0 0 / 0.5);
}`,
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
      'Writing hundreds of dots by hand is not realistic — JS generates them once from the Fibonacci-sphere formula.',
      'Each dot gets <code>rotateY(longitude) rotateX(latitude) translateZ(radius)</code>: aim, then push outward. Same idea as the carousel, in two axes.',
      'After that JS is done. The rotation is an ordinary CSS keyframe animation on the container.',
      'The container is 0×0 so every dot rotates around the exact centre.',
    ],
    html: `<div class="scene">
  <div class="ball"></div>
</div>`,
    css: `.scene {
  perspective: 600px;
}

.ball {
  --r: 130px;
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: ball-spin 16s linear infinite;
}

.ball i {
  position: absolute;
  top: -4px;
  left: -4px;
  width: 8px;
  height: 8px;
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
      'The flip itself is a CSS keyframe: <code>rotateX(-90deg)</code> → <code>0</code>.',
      'To replay a CSS animation on the same element: remove the class, force a reflow (<code>void el.offsetWidth</code>), add the class back.',
      'Only the pairs whose value actually changed are flipped.',
    ],
    html: `<div class="scene">
  <div class="clock"><span></span><em>:</em><span></span><em>:</em><span></span></div>
</div>`,
    css: `.scene {
  perspective: 700px;
}

.clock {
  display: flex;
  align-items: center;
  gap: 8px;
  font: 800 3.5rem ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  transform: rotateY(-14deg) rotateX(6deg);
  transform-style: preserve-3d;
}

.clock span {
  min-width: 2.2ch;
  padding: 10px 14px;
  border-radius: 12px;
  text-align: center;
  color: #fff;
  background: linear-gradient(#2a2f52 49%, #0c0e1d 49% 52%, #1d2140 52%);
  box-shadow: 0 14px 22px -12px #000;
}

.clock em { color: #ffb547; font-style: normal; }

.clock .is-flipping {
  animation: flip 0.55s cubic-bezier(0.3, 1.5, 0.5, 1);
}

@keyframes flip {
  from { transform: rotateX(-90deg); }
}`,
    js: `const parts = [...document.querySelectorAll('.clock span')];

function tick() {
  const d = new Date();
  [d.getHours(), d.getMinutes(), d.getSeconds()].forEach((n, i) => {
    const text = String(n).padStart(2, '0');
    const el = parts[i];
    if (el.textContent === text) return;

    el.textContent = text;
    el.classList.remove('is-flipping');
    void el.offsetWidth;              // force reflow so the animation restarts
    el.classList.add('is-flipping');
  });
}

tick();
setInterval(tick, 250);`,
  },
};

export const snippets: Record<string, Snippet> = { ...snippets1, ...snippets2, ...snippetsA, ...snippetsB, ...snippetsC, ...snippetsD, ...snippetsE, ...snippetsF, ...snippetsG, ...snippetsH, ...snippetsI, ...snippetsJ, ...snippetsK, ...snippetsL };
