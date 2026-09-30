import type { Snippet } from './snippet-utils';

/** The knurled side of the knob: 24 strips standing in a ring, 15° apart. */
const STRIPS = 24;

export const snippetsKnob: Record<string, Snippet> = {
  knob: {
    how: [
      `The side of the cylinder is a barrel of ${STRIPS} flat strips: strip <i>i</i> is <code>rotateZ(i × 15deg) translateY(−r) rotateX(90deg)</code>, so it stands on the floor at the rim, facing outward. <code>backface-visibility: hidden</code> drops the far half, which the cap covers anyway.`,
      `Each strip shades itself from its own angle with <code>cos()</code>: the light stays on the front-left of the barrel however the knob is turned. The knurl is a <code>repeating-linear-gradient</code> of grooves on each strip, so ${STRIPS} elements draw a ridged collar that would take hundreds as bars.`,
      'JS writes ONE number, <code>--a</code>, the angle in degrees, on the root (and the value on the slider and its readout). CSS does everything with it: the cap turns by <code>rotate(calc(var(--a) * 1deg))</code>, and the arc round the ticks is a <code>conic-gradient</code> whose end is <code>calc((var(--a) + 135) * 1deg)</code>. Nothing else moves, so no timer and no rAF loop.',
      'The knob IS the control, so it has no control row and fills the model box. It is a real slider for the keyboard too: <code>role="slider"</code> with <code>aria-valuemin/max/now</code>, arrow keys step it by 1 (Page keys by 10), and a ring in the stage’s own ink shows on <code>:focus-visible</code>.',
      'Dragging is linear, not circular: right or up turns it up, and a drag across 60% of the canvas’s short side is the whole travel, whatever the canvas size. A circular gesture round a centre jumps when the pointer starts near that centre; a straight drag never does, and is what mixer knobs on a screen do. Pointer Events with <code>setPointerCapture</code> and <code>touch-action: none</code> make it work under a finger.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the knob is the same share of a gallery card, the editor and a recording canvas. The readout inherits the stage’s ink, so it reads on the dark stage and the light one.',
    ],
    html: `<div class="scene">
  <div class="dial">
    <div class="ticks"></div>
    <div class="arc"></div>
    <div class="wall" aria-hidden="true">
${Array.from({ length: STRIPS }, (_, i) => `      <i style="--i:${i}"></i>`).join('\n')}
    </div>
    <div class="knob" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="40"></div>
  </div>
  <p class="readout"><span>Volume</span><b>40</b></p>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the knob is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.36vmin;
  /* the angle of the pointer mark, in degrees, from -135 (silent) to 135 (full): JS writes this
     one number and every moving part below is drawn from it */
  --a: -27;
  --r: 60;                        /* the knob's radius, in units */
  --t: 26;                        /* its thickness */
  display: grid;
  justify-items: center;
  /* the tipped dial draws 7 units past the bottom of its box (the near edge of the ring comes
     toward the camera and is magnified), so the gap is what is left after that */
  gap: calc(14 * var(--u));
  perspective: calc(900 * var(--u));
  transform-style: preserve-3d;
  user-select: none;
}

/* the dial's box is as wide as the tick ring and as tall as the tipped ring draws (220 × cos 52°,
   plus the perspective), so the drawn stack, dial and readout, is what gets centred. The whole
   thing is tipped back so the knob is seen from a little above, with its side showing at the near
   edge; at 52° the far ticks still show over the cap, at 56° the cap's top edge hid them */
.dial {
  position: relative;
  width: calc(220 * var(--u));
  height: calc(137 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(52deg);
  cursor: grab;
  touch-action: none;             /* the drag is ours, not the page's scroll */
}
.dial.is-drag { cursor: grabbing; }

/* everything in the dial is centred on the same point, on the floor */
.dial > * {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
}

/* the ring of ticks: one repeating conic gradient, masked to a thin ring and to the 270° of
   travel. It is the stage's own ink, so it reads on both stages */
.ticks {
  width: calc(220 * var(--u));
  height: calc(220 * var(--u));
  margin: calc(-110 * var(--u)) 0 0 calc(-110 * var(--u));
  background: repeating-conic-gradient(from 224.2deg, currentColor 0 1.6deg, transparent 1.6deg 10deg);
  mask: radial-gradient(closest-side, transparent 88%, #000 89%), conic-gradient(from 225deg, #000 0 271.7deg, transparent 0);
  mask-composite: intersect;
  opacity: 0.8;
}

/* the value arc, just inside the ticks: teal up to the mark's angle, a faint violet track after */
.arc {
  width: calc(196 * var(--u));
  height: calc(196 * var(--u));
  margin: calc(-98 * var(--u)) 0 0 calc(-98 * var(--u));
  background: conic-gradient(from 225deg, #2ee6d6 0 calc((var(--a) + 135) * 1deg), rgb(139 108 255 / 0.3) 0 270deg, transparent 0);
  mask: radial-gradient(closest-side, transparent 92%, #000 93%);
}

/* the side of the cylinder: a barrel of strips, each standing on the floor at the rim */
.wall {
  width: 0;
  height: 0;
  transform-style: preserve-3d;
}
.wall i {
  --w: 16;                        /* a strip's width: 2 × r × tan(7.5°) is 15.8 */
  /* how much light the strip gets: 1 facing the front-left, 0 at the back. cos() of its own angle,
     so the shading is fixed in the room and never turns with the knob */
  --l: calc(0.5 + 0.5 * cos(var(--i) * 15deg - 215deg));
  position: absolute;
  left: calc(var(--w) * -0.5 * var(--u));
  top: 0;
  width: calc(var(--w) * var(--u));
  height: calc(var(--t) * var(--u));
  /* the strip's top edge is on the dial's centre, and everything turns about that point */
  transform-origin: 50% 0;
  /* read right to left: stand the strip up (its box's y becomes height above the floor, so it
     spans the floor to the cap), push it out to the rim, then swing it round to its angle */
  transform: rotateZ(calc(var(--i) * 15deg)) translateY(calc(var(--r) * -1 * var(--u))) rotateX(90deg);
  backface-visibility: hidden;    /* the far strips face away: gone */
  background:
    /* the knurl: dark grooves down the strip */
    repeating-linear-gradient(90deg, rgb(0 0 0 / 0.42) 0 calc(1.2 * var(--u)), transparent 0 calc(3.2 * var(--u))),
    /* the light on the strip, and darker toward the floor (the strip's top, after rotateX) */
    linear-gradient(rgb(0 0 0 / 0.38), rgb(255 255 255 / calc(var(--l) * 0.42)) 45%),
    #4a3a8c;
}

/* the cap: the part that turns. It sits one thickness above the floor, and JS's --a turns it */
.knob {
  width: calc(var(--r) * 2 * var(--u));
  height: calc(var(--r) * 2 * var(--u));
  margin: calc(var(--r) * -1 * var(--u)) 0 0 calc(var(--r) * -1 * var(--u));
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--t) * var(--u))) rotate(calc(var(--a) * 1deg));
  transition: transform 0.18s ease-out; /* a key press eases round; a drag (below) follows the hand */
  background:
    radial-gradient(circle at 38% 32%, rgb(255 255 255 / 0.35), transparent 42%),
    radial-gradient(circle, #8b6cff 62%, #5d47c2 78%, #3e2f8a 100%);
  box-shadow: inset 0 0 0 calc(2 * var(--u)) rgb(0 0 0 / 0.3); /* the rim */
  outline: none;
}
.dial.is-drag .knob { transition: none; }

/* the pointer mark, from the rim toward the centre */
.knob::before {
  content: '';
  position: absolute;
  top: calc(9 * var(--u));
  left: calc(50% - 3.5 * var(--u));
  width: calc(7 * var(--u));
  height: calc(30 * var(--u));
  border-radius: calc(3.5 * var(--u));
  background: #fff;
  box-shadow: 0 0 calc(4 * var(--u)) rgb(0 0 0 / 0.35);
}

/* focus, from the keyboard: a ring in the stage's own ink, out on the collar, turning with the cap */
.knob:focus-visible {
  outline: calc(2.5 * var(--u)) solid currentColor;
  outline-offset: calc(4 * var(--u));
}

/* the readout: the stage's ink, so it reads on both stages; tabular figures so 9 → 10 does not
   shift the word */
.readout {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: calc(8 * var(--u));
  font: 600 calc(13 * var(--u)) / 1 Inter, system-ui, sans-serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}
.readout span { opacity: 0.72; }
.readout b {
  font: 800 calc(26 * var(--u)) / 1 Inter, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  min-width: calc(40 * var(--u));
}`,
    js: `const scene = document.querySelector('.scene');
const dial = document.querySelector('.dial');
const knob = document.querySelector('.knob');
const readout = document.querySelector('.readout b');

const MIN = 0, MAX = 100, SWEEP = 270;   // the mark travels 270°, from -135° to +135°
let value = 40;                          // the value as shown, a whole number
let fine = value;                        // the value under the hand, unrounded, so a slow drag adds up

// the only things JS writes: one number, the angle, and the value the slider and the readout say
function show() {
  scene.style.setProperty('--a', -SWEEP / 2 + (value - MIN) / (MAX - MIN) * SWEEP);
  knob.setAttribute('aria-valuenow', value);
  readout.textContent = value;
}

function set(v) {
  fine = Math.max(MIN, Math.min(MAX, v));
  const next = Math.round(fine);
  if (next === value) return;
  value = next;
  show();
}

// the drag: right or up turns it up. A drag across 60% of the canvas's short side is the whole
// travel, so it is the same gesture on a card and on a full screen
let last = null;
dial.addEventListener('pointerdown', (e) => {
  last = { x: e.clientX, y: e.clientY };
  dial.classList.add('is-drag');
  dial.setPointerCapture(e.pointerId);
  e.preventDefault();
});
dial.addEventListener('pointermove', (e) => {
  if (!last) return;
  const span = 0.6 * Math.min(innerWidth, innerHeight);
  set(fine + ((e.clientX - last.x) - (e.clientY - last.y)) / span * (MAX - MIN));
  last = { x: e.clientX, y: e.clientY };
});
function release() {
  last = null;
  dial.classList.remove('is-drag');
}
dial.addEventListener('pointerup', release);
dial.addEventListener('pointercancel', release);

// the keyboard: the same keys a native slider answers
knob.addEventListener('keydown', (e) => {
  const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
  const to = e.key === 'Home' ? MIN : e.key === 'End' ? MAX : step === undefined ? null : value + step;
  if (to === null) return;
  e.preventDefault();
  set(to);
});

show();`,
  },
};
