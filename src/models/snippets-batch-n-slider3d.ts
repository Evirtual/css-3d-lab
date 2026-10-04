/**
 * Paste-anywhere version of the slider3d model: plain HTML + CSS + a few lines of JS, no build step.
 * See snippets.ts for the format this file follows.
 */
import type { Snippet } from './snippet-utils';

/** The bars behind the track: one for each tenth of the travel. */
const BARS = 10;

export const snippetsSlider3d: Record<string, Snippet> = {
  slider3d: {
    how: [
      'The control is a real <code>&lt;input type="range"&gt;</code>, made see-through and laid in the deck’s own tilted plane over the groove. The browser maps a click or a drag through the 3D transform onto it, so mouse, touch and the arrow keys all work with no code of ours, and the <code>&lt;label&gt;</code> gives it its name.',
      'JS does one thing: on <code>input</code> it writes the value, a plain number from 0 to 100, as <code>--v</code> on the scene (and in the <code>&lt;output&gt;</code>). It never writes a length; CSS multiplies. The thumb is <code>translateX(calc(var(--v) * 2 * var(--u)))</code> along the 200-unit travel, and the teal fill in the groove is a <code>scaleX</code> of the same number.',
      'Each of the ten bars works out its own share of the value: <code>clamp(0.04, (v − 10i) / 10, 1)</code> is 0 until the thumb reaches its tenth, rises across it and stays full past it. That number is the bar’s <code>scaleZ</code>, so a bar of faces (a top pushed up with <code>translateZ</code>, a front and a side folded up from its footprint) grows out of the deck with no height ever animated.',
      'The groove is a hole, not a dark stripe: the deck’s top is cut with <code>mask-composite: exclude</code>, and under the cut are a floor 8 units down, a far wall and two end walls folded down from the cut’s edges, so you look into it. The block thumb floats over it on a soft shadow, with grip ridges on its top.',
      'Nothing but the input and its label takes the pointer (<code>pointer-events: none</code> on every drawn part), so the moving thumb never steals its own drag. Focus from the keyboard rings the thumb’s top in white, which reads on the dark deck whatever the stage. Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas.',
    ],
    html: `<div class="scene">
  <div class="deck">
    <div class="top">
      <div class="readout"><label for="level">Level</label><output for="level">64</output></div>
    </div>
    <i class="edge front"></i><i class="edge left"></i><i class="edge right"></i>
    <div class="bars" aria-hidden="true">
${Array.from({ length: BARS }, (_, i) => `      <i class="bar" style="--i:${i}"><b></b></i>`).join('\n')}
    </div>
    <div class="groove" aria-hidden="true"><i class="floor"></i><i class="fill"></i><i class="wall"></i><i class="end"></i><i class="end"></i></div>
    <input id="level" type="range" min="0" max="100" value="64" />
    <div class="thumb" aria-hidden="true"><i class="shadow"></i><i class="fr"></i><i class="lf"></i><i class="rt"></i><i class="t"></i></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the slider is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.3vmin;
  /* the value, 0 to 100: JS writes this one number and everything that moves is drawn from it */
  --v: 64;
  /* the bars stand up off the back of the deck, so the scene keeps room above it: this is what
     centres the drawn stack, bars and deck together */
  padding-top: calc(6 * var(--u));
  perspective: calc(900 * var(--u));
}

/* the deck's space: 270 x 160 units, tipped back so you look down at it from the front */
.deck {
  position: relative;
  width: calc(270 * var(--u));
  height: calc(160 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(44deg);
}
.deck i {
  position: absolute;
}
/* only the input takes the pointer: a drawn part over it, even a see-through layer, would take
   the press, and the thumb that moves must never be what is pressed */
.deck > :not(input) {
  pointer-events: none;
}

/* the deck's top, with the groove cut out of it: the second mask layer is the slot, and
   exclude leaves everything but it */
.top {
  position: absolute;
  inset: 0;
  border-radius: calc(3 * var(--u));
  background:
    radial-gradient(ellipse at 50% 0, rgb(139 108 255 / 0.16), transparent 70%),
    linear-gradient(#20233d, #161930);
  box-shadow: inset 0 0 0 calc(1.5 * var(--u)) rgb(255 255 255 / 0.06);
  mask:
    linear-gradient(#000 0 0),
    linear-gradient(#000 0 0) calc(21 * var(--u)) calc(66 * var(--u)) / calc(228 * var(--u)) calc(16 * var(--u)) no-repeat;
  mask-composite: exclude;
}

/* the deck's thickness: three edges, each laid just outside the top's edge and folded down
   about it, so it faces outward (the one facing away is not drawn) */
.edge {
  background: linear-gradient(#2b2f50, #0f1122);
  backface-visibility: hidden;
}
.edge.front {
  left: 0;
  top: 100%;
  width: 100%;
  height: calc(12 * var(--u));
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
}
.edge.left,
.edge.right {
  top: 0;
  width: calc(12 * var(--u));
  height: 100%;
  background: #12142a;
}
.edge.left  { right: 100%; transform-origin: 100% 50%; transform: rotateY(-90deg); }
.edge.right { left: 100%;  transform-origin: 0 50%;    transform: rotateY(90deg); }

/* the readout, printed on the deck: the deck is the model's own dark surface, so it reads on
   either stage. Tabular figures, so 9 to 10 does not shift the number */
.readout {
  position: absolute;
  left: calc(21 * var(--u));
  right: calc(21 * var(--u));
  top: calc(104 * var(--u));
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  color: #eceefb;
  white-space: nowrap;
}
.readout label {
  font: 600 calc(14 * var(--u)) / 1 Inter, system-ui, sans-serif;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.78;
  /* the label is the one drawn part that takes the pointer: a press on it focuses the input */
  pointer-events: auto;
  cursor: pointer;
}
.readout output {
  font: 700 calc(38 * var(--u)) / 1 'JetBrains Mono', ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
}

/* the bars: one per tenth of the travel, each centred over its tenth of the track */
.bars {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}
.bar {
  /* the bar's full height, and how much of it is up: nothing until the thumb reaches its tenth,
     rising across it, full past it */
  --h: calc(10 + var(--i) * 7.8);
  --f: clamp(0.04, (var(--v) - var(--i) * 10) / 10, 1);
  /* lit once the thumb is a fifth of the way into its tenth; a bar still down is a dim stub */
  --lit: clamp(0, (var(--v) - var(--i) * 10) / 2, 1);
  --c: hsl(calc(174 + var(--i) * 17) 85% 62%);
  left: calc((38 + var(--i) * 20) * var(--u));
  top: calc(20 * var(--u));
  width: calc(14 * var(--u));
  height: calc(14 * var(--u));
  transform-style: preserve-3d;
  transform: scaleZ(var(--f));
  transition: transform 0.4s cubic-bezier(0.3, 1.35, 0.5, 1);
}
/* every face of a bar, dim while the bar is down */
.bar::before,
.bar::after,
.bar b {
  content: '';
  position: absolute;
  backface-visibility: hidden;
  opacity: calc(0.28 + 0.72 * var(--lit));
  transition: opacity 0.3s;
}
/* the bar's top, pushed up its height (scaleZ above shrinks it with the bar) */
.bar::before {
  inset: 0;
  background: color-mix(in srgb, var(--c), #fff 35%);
  transform: translateZ(calc(var(--h) * var(--u)));
}
/* its front, folded up from the footprint's near edge */
.bar::after {
  left: 0;
  bottom: 0;
  width: 100%;
  height: calc(var(--h) * var(--u));
  background: linear-gradient(var(--c), color-mix(in srgb, var(--c), #000 35%));
  transform-origin: 50% 100%;
  transform: rotateX(-90deg);
}
/* one side: the one that faces the middle of the deck, which is the one you can see */
.bar b {
  top: 0;
  width: calc(var(--h) * var(--u));
  height: 100%;
  background: color-mix(in srgb, var(--c), #000 45%);
}
.bar:nth-child(-n + 5) b { right: 0; transform-origin: 100% 50%; transform: rotateY(90deg); }
.bar:nth-child(n + 6) b  { left: 0;  transform-origin: 0 50%;    transform: rotateY(-90deg); }

/* the groove under the cut: a floor 8 units down, and walls folded down from the cut's edges */
.groove {
  position: absolute;
  left: calc(21 * var(--u));
  top: calc(66 * var(--u));
  width: calc(228 * var(--u));
  height: calc(16 * var(--u));
  transform-style: preserve-3d;
}
.floor {
  inset: 0;
  background: #07080f;
  transform: translateZ(calc(-8 * var(--u)));
}
/* the teal fill, from the groove's end to the thumb's centre: 14 units, then 2 per point */
.fill {
  left: 0;
  top: calc(5 * var(--u));
  width: calc(214 * var(--u));
  height: calc(6 * var(--u));
  border-radius: calc(3 * var(--u));
  background: linear-gradient(90deg, #2ee6d6, #8b6cff);
  box-shadow: 0 0 calc(6 * var(--u)) rgb(46 230 214 / 0.6);
  transform-origin: 0 50%;
  transform: translateZ(calc(-7.5 * var(--u))) scaleX(calc((14 + var(--v) * 2) / 214));
  transition: transform 0.12s ease-out;
}
.wall {
  left: 0;
  top: 0;
  width: 100%;
  height: calc(8 * var(--u));
  background: linear-gradient(#0d0f1e, #2a2e4c);
  transform-origin: 50% 0;
  transform: rotateX(-90deg); /* down from the far edge, facing you */
}
.end {
  top: 0;
  width: calc(8 * var(--u));
  height: 100%;
  background: #1b1e36;
}
.end:nth-child(4) { left: 0;  transform-origin: 0 50%;    transform: rotateY(90deg); }
.end:nth-child(5) { right: 0; transform-origin: 100% 50%; transform: rotateY(-90deg); }

/* the real input, see-through, over the groove in the deck's plane. Its own thumb is as wide as
   the drawn one, so value 0 and 100 put the thumb's centre at the same places as ours */
.deck input {
  position: absolute;
  left: calc(25 * var(--u));
  top: calc(54 * var(--u));
  width: calc(220 * var(--u));
  height: calc(40 * var(--u));
  margin: 0;
  appearance: none;
  background: none;
  opacity: 0;
  cursor: pointer;
  touch-action: none;             /* a drag on it is the slider's, not the page's scroll */
  transform: translateZ(calc(0.5 * var(--u)));
}
.deck input::-webkit-slider-thumb {
  appearance: none;
  width: calc(20 * var(--u));
  height: calc(40 * var(--u));
}
.deck input::-moz-range-thumb {
  width: calc(20 * var(--u));
  height: calc(40 * var(--u));
  border: 0;
}

/* the block thumb: a 22 x 40 footprint over the value's place, floating 3 units over the deck */
.thumb {
  position: absolute;
  left: calc(24 * var(--u));
  top: calc(54 * var(--u));
  width: calc(22 * var(--u));
  height: calc(40 * var(--u));
  transform-style: preserve-3d;
  transform: translateX(calc(var(--v) * 2 * var(--u)));
  transition: transform 0.12s ease-out;
  pointer-events: none;
}
.thumb i {
  backface-visibility: hidden;
}
.thumb .shadow {
  inset: calc(-4 * var(--u));
  border-radius: calc(6 * var(--u));
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.6), transparent);
  transform: translateZ(calc(0.3 * var(--u)));
}
.thumb .t {
  inset: 0;
  border-radius: calc(2 * var(--u));
  background:
    linear-gradient(90deg, transparent calc(9.5 * var(--u)), #fff 0 calc(12.5 * var(--u)), transparent 0),
    repeating-linear-gradient(transparent 0 calc(3 * var(--u)), rgb(0 0 0 / 0.22) 0 calc(5 * var(--u))),
    linear-gradient(#b7a4ff, #8b6cff);
  transform: translateZ(calc(21 * var(--u)));
}
.thumb .fr {
  left: 0;
  bottom: 0;
  width: 100%;
  height: calc(18 * var(--u));
  background: linear-gradient(#7458e8, #4a32b0);
  transform-origin: 50% 100%;
  transform: translateZ(calc(3 * var(--u))) rotateX(-90deg);
}
.thumb .lf,
.thumb .rt {
  top: 0;
  width: calc(18 * var(--u));
  height: 100%;
  background: #3b2894;
}
.thumb .lf { left: 0;  transform-origin: 0 50%;    transform: translateZ(calc(3 * var(--u))) rotateY(-90deg); }
.thumb .rt { right: 0; transform-origin: 100% 50%; transform: translateZ(calc(3 * var(--u))) rotateY(90deg); }

/* focus from the keyboard: a white ring round the thumb's top, on the dark deck */
.deck input:focus-visible ~ .thumb .t {
  outline: calc(2.5 * var(--u)) solid #fff;
  outline-offset: calc(3 * var(--u));
}`,
    js: `const scene = document.querySelector('.scene');
const input = scene.querySelector('input');
const out = scene.querySelector('output');

// the only thing JS writes: the value, a plain number. CSS turns it into the thumb's place, the
// fill's length and every bar's height
function show() {
  scene.style.setProperty('--v', input.value);
  out.textContent = input.value;
}

input.addEventListener('input', show);
show();`,
  },
};
