/**
 * Paste-anywhere versions of the batch-h demos: plain HTML + CSS (+ JS), no Sass, no build step.
 * See snippets.ts for the format this file follows.
 */
import { CUBE_FACES, type Snippet } from './snippet-utils';

const MINUS_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>`;
const PLUS_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;
const SUN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/></svg>`;
const MOON_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;

const key = (legend: string, hot = false) =>
  `    <button type="button" class="key${hot ? ' hot' : ''}"><i class="glow"></i><span class="cap"><i></i><i></i><i></i><i></i><b>${legend}</b></span></button>`;

const WORDS = ['Poor', 'Okay', 'Good', 'Great', 'Amazing!'];

export const snippetsH: Record<string, Snippet> = {
  keycaps: {
    how: [
      'The keys stand on a <b>plate lying on the floor</b>: <code>rotateX(54deg) rotateZ(-30deg)</code> turns it and lays it back, and <code>preserve-3d</code> lets everything on it rise up along its Z axis.',
      'A keycap is a truncated pyramid. Each sloped side is a <code>clip-path</code> trapezoid standing on an edge of the key, hinged there (<code>transform-origin: 50% 100%</code>) and tipped up by <code>atan(height / inset)</code> ≈ 65°, so its top edge lands exactly on the top face. Its length is <code>√(height² + inset²)</code>.',
      'The other three sides are the same trapezoid turned around the key’s centre: <code>translateY(-22px) rotate(90deg) translateY(22px)</code> moves the pivot to the middle, rotates, and moves it back.',
      'The <code>&lt;button&gt;</code> is the hit target and never moves; only the <code>.cap</code> inside it (with <code>pointer-events: none</code>) sinks with <code>translateZ(-7px)</code>. An empty <code>::after</code> lid where the top sits at rest makes the top clickable too.',
      'The glow is two layers that only fade with <code>opacity</code>: a teal pool on the plate and a wash over the legend. <code>:focus-visible</code> presses the key as well, so it works from the keyboard.',
    ],
    html: `<div class="scene">
  <div class="deck">
${key('C')}
${key('S')}
${key('S')}
${key('3D', true)}
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
  transform-style: preserve-3d;
  /* the plate is tilted, so parts of it lie behind z = 0: only the keys may take the pointer */
  pointer-events: none;
}

/* a small keyboard plate lying on the floor, turned a little */
.deck {
  position: relative;
  display: flex;
  gap: 7px;
  padding: 9px;
  border-radius: 9px;
  background:
    linear-gradient(160deg, rgb(255 255 255 / 0.07), transparent 60%),
    color-mix(in srgb, #8b6cff 12%, #141830);
  box-shadow: inset 0 0 0 1px rgb(140 150 220 / 0.34);
  transform-style: preserve-3d;
  transform: rotateX(54deg) rotateZ(-30deg); /* read right to left: turn it, then lay it back */
}

/* the plate's thickness: its front and left edges hang down from the top (-z) */
.deck::before,
.deck::after {
  content: '';
  position: absolute;
  background: color-mix(in srgb, #8b6cff 22%, #0e1122);
}

.deck::before {
  top: 100%;
  right: 8px;
  left: 8px;
  height: 12px;
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
}

.deck::after {
  top: 8px;
  right: 100%;
  bottom: 8px;
  width: 12px;
  background: color-mix(in srgb, #8b6cff 18%, #0b0d1a);
  transform-origin: 100% 50%;
  transform: rotateY(90deg);
}

/* the button is the hit target and never moves */
.key {
  --c: color-mix(in srgb, #8b6cff 38%, #141830);
  --ink: #eceefb;
  position: relative;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--ink);
  font: 800 16px/1 system-ui, sans-serif;
  cursor: pointer;
  pointer-events: auto;
  transform-style: preserve-3d;
}

.key.hot {
  --c: #ff4d9d;
  --ink: #fff;
}

/* an invisible lid where the cap's top is at rest, so pointing at the top hits the button too */
.key::after {
  content: '';
  position: absolute;
  inset: 6px;
  transform: translateZ(13px);
}

.key:focus-visible {
  outline: 2px solid #2ee6d6;
  outline-offset: 3px;
}

/* the cap: four sloped sides and a top, moved as one */
.cap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform-style: preserve-3d;
  transition: transform 0.16s cubic-bezier(0.3, 0.7, 0.4, 1);
}

/* a square plate just under the top: plugs the corners the rounded top leaves open */
.cap::before {
  content: '';
  position: absolute;
  inset: 7px;
  background: color-mix(in srgb, var(--c), #000 30%);
  transform: translateZ(12px);
}

/* one sloped side: 13px high, 6px inset, so it is √(13² + 6²) = 14.32px long,
   stands on the key's front edge and tips up by atan(13 / 6) = 65.2deg */
.cap i {
  position: absolute;
  top: 29.68px; /* 44px - 14.32px: its bottom edge is the key's front edge */
  left: 0;
  width: 44px;
  height: 14.32px;
  clip-path: polygon(0 100%, 100% 100%, calc(100% - 6px) 0, 6px 0);
  transform-origin: 50% 100%;
}

/* the same side turned around the key's centre (22px above the hinge); shaded per side */
.cap i:nth-child(1) {
  background: linear-gradient(color-mix(in srgb, var(--c), #000 20%), color-mix(in srgb, var(--c), #000 26%));
  transform: translateY(-22px) rotate(0deg) translateY(22px) rotateX(-65.2deg);
}

.cap i:nth-child(2) {
  background: linear-gradient(color-mix(in srgb, var(--c), #000 36%), color-mix(in srgb, var(--c), #000 42%));
  transform: translateY(-22px) rotate(90deg) translateY(22px) rotateX(-65.2deg);
}

.cap i:nth-child(3) {
  background: linear-gradient(color-mix(in srgb, var(--c), #000 2%), color-mix(in srgb, var(--c), #000 8%));
  transform: translateY(-22px) rotate(180deg) translateY(22px) rotateX(-65.2deg);
}

.cap i:nth-child(4) {
  background: linear-gradient(color-mix(in srgb, var(--c), #000 8%), color-mix(in srgb, var(--c), #000 14%));
  transform: translateY(-22px) rotate(270deg) translateY(22px) rotateX(-65.2deg);
}

/* the top: slightly dished, with the legend */
.cap b {
  position: absolute;
  inset: 6px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  background: radial-gradient(ellipse 80% 70% at 50% 45%, color-mix(in srgb, var(--c), #fff 10%), var(--c) 75%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c), #fff 18%);
  text-shadow: 0 1px 0 color-mix(in srgb, var(--c), #000 40%);
  transform: translateZ(13px);
}

/* the lit legend: a teal wash, faded in */
.cap b::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle, rgb(46 230 214 / 0.45), rgb(46 230 214 / 0.12));
  opacity: 0;
  transition: opacity 0.2s;
}

/* light spilling onto the plate around a pressed key */
.glow {
  position: absolute;
  inset: -9px;
  border-radius: 14px;
  background: radial-gradient(closest-side, rgb(46 230 214 / 0.75), rgb(46 230 214 / 0.25) 70%, transparent);
  opacity: 0;
  pointer-events: none;
  transform: translateZ(0.5px);
  transition: opacity 0.2s;
}

/* pressed: the cap sinks into the plate, the lights come on */
.key:is(:hover, :focus-visible) .cap {
  transform: translateZ(-7px);
}

.key:is(:hover, :focus-visible) .cap b::after,
.key:is(:hover, :focus-visible) .glow {
  opacity: 1;
}

.key:active .cap {
  transform: translateZ(-10px);
}`,
  },

  stepper: {
    how: [
      'The number faces are the four sides of a cube around its X axis: face <i>n</i> is placed with <code>rotateX(n × -90deg) translateZ(s / 2)</code>, so turning the cube <i>n</i> quarter turns forward brings face <i>n</i> to the front, upright.',
      'JS keeps one number, <code>step</code>, and sets <code>--a: step × 90deg</code>. It never wraps it back to 0: from 270° to 360° the cube keeps rolling the same way instead of spinning back three quarters.',
      'The face that is about to come into view is <code>faces[step mod 4]</code>. JS writes the new number there just before changing <code>--a</code>, and keeps the faces above and below holding the true neighbours, so every turn reveals the right number.',
      'The CSS <code>transition</code> with a little overshoot does the rolling; JS only supplies the angle and the text.',
      'At a limit the button stays focusable (<code>aria-disabled</code>, not <code>disabled</code>, so focus never vanishes) and a short nudge animation on a wrapper says “no further”. The <code>&lt;output&gt;</code> above the buttons announces the quantity.',
    ],
    html: `<div class="stepper">
  <div class="view">
    <div class="nudge">
      <div class="cube" aria-hidden="true"><i>3</i><i>4</i><i></i><i>2</i><b></b><b></b></div>
    </div>
  </div>
  <div class="bar">
    <output aria-live="polite">Quantity 3</output>
    <div class="buttons">
      <button type="button" aria-label="Decrease quantity">${MINUS_SVG}</button>
      <button type="button" aria-label="Increase quantity">${PLUS_SVG}</button>
    </div>
  </div>
</div>`,
    css: `.stepper {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  width: 340px;
  height: 260px;
  padding: 10px 14px 14px;
  box-sizing: border-box;
}

.view {
  position: relative;
  display: grid;
  place-items: center;
  perspective: 600px;
}

/* a soft shadow on the floor */
.view::before {
  content: '';
  position: absolute;
  bottom: calc(50% - 74px);
  left: calc(50% - 62px);
  width: 124px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.45), transparent);
}

/* only for the "no further" nudge, so it never fights the cube's own transition */
.nudge {
  transform-style: preserve-3d;
}

.nudge.is-nudge {
  animation: nudge 0.45s ease-out;
}

@keyframes nudge {
  0%, 100% { transform: rotateX(0deg); }
  35% { transform: rotateX(calc(var(--dir, 1) * 14deg)); }
  70% { transform: rotateX(calc(var(--dir, 1) * -4deg)); }
}

.cube {
  --s: 94px;
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  /* read right to left: turn by --a (set by JS), a fixed view from above-left,
     then pull back half a side so the front face stays its true size */
  transform: translateZ(calc(var(--s) / -2)) rotateX(-14deg) rotateY(-20deg) rotateX(var(--a, 0deg));
  transition: transform 0.6s cubic-bezier(0.3, 1.3, 0.5, 1);
}

.cube i,
.cube b {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  transform-style: preserve-3d;
}

/* the four number faces: front, bottom, back, top */
.cube i {
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, #8b6cff, #fff 35%);
  background:
    linear-gradient(150deg, rgb(255 255 255 / 0.28), transparent 45%),
    linear-gradient(color-mix(in srgb, #8b6cff, #ff4d9d 25%), color-mix(in srgb, #8b6cff, #000 25%));
  color: #fff;
  font: 900 50px/1 system-ui, sans-serif;
  font-style: normal;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 3px 0 color-mix(in srgb, #8b6cff, #000 45%);
  backface-visibility: hidden; /* never show a number mirrored through the cube */
}

.cube i:nth-child(1) { transform: rotateX(0deg)    translateZ(calc(var(--s) / 2)); }
.cube i:nth-child(2) { transform: rotateX(-90deg)  translateZ(calc(var(--s) / 2)); }
.cube i:nth-child(3) { transform: rotateX(-180deg) translateZ(calc(var(--s) / 2)); }
.cube i:nth-child(4) { transform: rotateX(-270deg) translateZ(calc(var(--s) / 2)); }

/* the two ends */
.cube b {
  border: 1px solid color-mix(in srgb, #8b6cff, #fff 15%);
  background:
    radial-gradient(circle, transparent 0 30%, rgb(0 0 0 / 0.18) 31% 34%, transparent 35%),
    color-mix(in srgb, #8b6cff, #000 38%);
}

.cube b:nth-of-type(1) { transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
.cube b:nth-of-type(2) { transform: rotateY(90deg)  translateZ(calc(var(--s) / 2)); }

/* rounded faces leave holes at the corners: a square plate behind each one plugs them */
.cube i::before,
.cube b::before {
  content: '';
  position: absolute;
  inset: 0; /* full size: a smaller plate leaves a channel along each edge you can see into */
  background: color-mix(in srgb, #8b6cff, #000 45%);
  transform: translateZ(-6px);
}

/* the dock: the status centred on top, the buttons under it */
.bar {
  display: grid;
  justify-items: center;
  gap: 6px;
  font-size: 12px;
}

.bar output {
  color: #949bc0;
  font-variant-numeric: tabular-nums;
}

.buttons {
  display: flex;
  gap: 10px;
  padding: 4px;
  border: 1px solid rgb(140 150 220 / 0.34);
  border-radius: 999px;
}

.buttons button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b6cff, #ff4d9d);
  color: #fff;
  cursor: pointer;
  transition: opacity 0.2s;
}

.buttons svg {
  width: 16px;
  height: 16px;
}

.buttons button:focus-visible {
  outline: 2px solid #2ee6d6;
  outline-offset: 2px;
}

/* at a limit the button stays focusable, it only looks spent */
.buttons button[aria-disabled='true'] {
  opacity: 0.4;
  cursor: not-allowed;
}`,
    js: `var MIN = 0;
var MAX = 10;

var cube = document.querySelector('.cube');
var nudge = document.querySelector('.nudge');
var faces = cube.querySelectorAll('i');
var out = document.querySelector('.bar output');
var buttons = document.querySelectorAll('.buttons button');
var minus = buttons[0];
var plus = buttons[1];

var value = 3;
var step = 0; // quarter turns so far; never wrapped, so the cube always turns the short way

function face(s) {
  return faces[((s % 4) + 4) % 4]; // a real modulo: -1 is face 3, not face -1
}

function label(n) {
  return n >= MIN && n <= MAX ? String(n) : ''; // blank past a limit
}

function render() {
  // the front face, and the true neighbours on the faces that can turn into view next
  face(step).textContent = label(value);
  face(step + 1).textContent = label(value + 1);
  face(step - 1).textContent = label(value - 1);
  face(step + 2).textContent = '';
  cube.style.setProperty('--a', step * 90 + 'deg'); // CSS does the turning
  var limit = value === MIN ? ' (minimum)' : value === MAX ? ' (maximum)' : '';
  out.textContent = 'Quantity ' + value + limit;
  minus.setAttribute('aria-disabled', String(value === MIN));
  plus.setAttribute('aria-disabled', String(value === MAX));
}

function change(dir) {
  var next = value + dir;
  if (next < MIN || next > MAX) {
    // at a limit: restart a short nudge in that direction instead of turning
    nudge.style.setProperty('--dir', dir);
    nudge.classList.remove('is-nudge');
    void nudge.offsetWidth;
    nudge.classList.add('is-nudge');
    return;
  }
  value = next;
  step += dir;
  render();
}

minus.addEventListener('click', function () { change(-1); });
plus.addEventListener('click', function () { change(1); });
render();`,
  },

  rating: {
    how: [
      'Each star is five copies of one <code>clip-path</code> star stacked 1px apart: the front (plain) and back (gold) faces with three edge layers between them, so a turning star shows a real thickness.',
      'The back is placed with <code>rotateY(180deg) translateZ(2px)</code>: it faces the other way, and once the star turns half round it reads correctly. <code>backface-visibility: hidden</code> on both faces means only the one facing you is drawn.',
      'The five radios come first, so <code>~</code> can reach everything after them. Rating <i>r</i> is one rule: <code>#star-r:checked ~ .stars label:nth-child(-n + r)</code> selects the first <i>r</i> stars, which turn over.',
      '<code>transition-delay: calc(var(--i) * 90ms)</code> lights them left to right; the resting style has the reverse delay, so a lower rating empties the row from the right. The delay in the state you go <i>to</i> is the one that counts.',
      'The labels are the static hit targets (only the star inside moves), and the real radios keep arrow keys, forms and screen readers working. A ring bursts once as each star lands: an animation that only starts when its rule starts to match.',
    ],
    html: `<div class="rating" role="radiogroup" aria-label="Rate this effect">
  <b class="title" aria-hidden="true">Rate this effect</b>
${WORDS.map((w, i) => `  <input type="radio" name="rating" id="star-${i + 1}" aria-label="${i + 1} star${i ? 's' : ''}, ${w}"${i === 3 ? ' checked' : ''} />`).join('\n')}
  <div class="stars">
${WORDS.map((_, i) => `    <label for="star-${i + 1}" style="--i:${i}"><span class="lift"><span class="star"><i></i><i></i><i></i><i></i><i></i></span></span></label>`).join('\n')}
  </div>
  <p class="words" aria-hidden="true"><span>Tap a star</span>${WORDS.map((w) => `<span>${w}</span>`).join('')}</p>
</div>`,
    css: `.rating {
  display: grid;
  justify-items: center;
  gap: 12px;
  perspective: 800px;
  transform-style: preserve-3d;
}

/* the real radios stay (arrow keys, forms, screen readers), only invisible */
.rating input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.title {
  color: #949bc0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.stars {
  display: flex;
  gap: 9px;
  transform-style: preserve-3d;
}

/* the label is the static hit target; only the star inside it moves */
.stars label {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  transform-style: preserve-3d;
}

/* a ring that bursts once as the star lands gold */
.stars label::before {
  content: '';
  position: absolute;
  inset: -5px;
  border: 2px solid #ffb547;
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
}

/* a warm glow behind a gold star */
.stars label::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(255 181 71 / 0.45), transparent);
  opacity: 0;
  pointer-events: none;
  transform: translateZ(-6px);
  transition: opacity 0.3s;
}

.lift {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform-style: preserve-3d;
  transition: transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1);
}

label:hover .lift {
  transform: translateZ(12px) scale(1.14);
}

.star {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.7s cubic-bezier(0.35, 1.45, 0.5, 1);
  transition-delay: calc((4 - var(--i)) * 60ms); /* turning back: the last star first */
}

/* five copies of one star shape, 1px apart */
.star i {
  position: absolute;
  inset: 0;
  clip-path: polygon(50% 2%, 61.5% 36%, 97% 36.5%, 68.5% 57.5%, 79% 92%, 50% 71%, 21% 92%, 31.5% 57.5%, 3% 36.5%, 38.5% 36%);
  background: color-mix(in srgb, #ffb547 40%, #1b1408); /* the edge */
}

.star i:nth-child(2) { transform: translateZ(1px); }
.star i:nth-child(4) { transform: translateZ(-1px); }

/* front: a darker star inside a lighter one, so it looks outlined */
.star i:nth-child(1) {
  background: color-mix(in srgb, #eceefb 38%, #141830);
  backface-visibility: hidden;
  transform: translateZ(2px);
}

.star i:nth-child(1)::before {
  content: '';
  position: absolute;
  inset: 3px;
  clip-path: inherit;
  background: color-mix(in srgb, #eceefb 12%, #141830);
}

/* back: gold, facing the other way */
.star i:nth-child(5) {
  background: linear-gradient(160deg, #ffe2b8 10%, #ffb547 45%, #e58a2e 90%);
  backface-visibility: hidden;
  transform: rotateY(180deg) translateZ(2px);
}

/* rating r turns stars 1 to r, one after another */
#star-1:checked ~ .stars label:nth-child(-n + 1) .star,
#star-2:checked ~ .stars label:nth-child(-n + 2) .star,
#star-3:checked ~ .stars label:nth-child(-n + 3) .star,
#star-4:checked ~ .stars label:nth-child(-n + 4) .star,
#star-5:checked ~ .stars label:nth-child(-n + 5) .star {
  transform: rotateY(180deg);
  transition-delay: calc(var(--i) * 90ms);
}

#star-1:checked ~ .stars label:nth-child(-n + 1)::after,
#star-2:checked ~ .stars label:nth-child(-n + 2)::after,
#star-3:checked ~ .stars label:nth-child(-n + 3)::after,
#star-4:checked ~ .stars label:nth-child(-n + 4)::after,
#star-5:checked ~ .stars label:nth-child(-n + 5)::after {
  opacity: 1;
  transition-delay: calc(var(--i) * 90ms + 200ms);
}

/* a newly matching rule starts its animation: the ring bursts once per star lit */
#star-1:checked ~ .stars label:nth-child(-n + 1)::before,
#star-2:checked ~ .stars label:nth-child(-n + 2)::before,
#star-3:checked ~ .stars label:nth-child(-n + 3)::before,
#star-4:checked ~ .stars label:nth-child(-n + 4)::before,
#star-5:checked ~ .stars label:nth-child(-n + 5)::before {
  animation: burst 0.65s calc(var(--i) * 90ms + 250ms) ease-out both;
}

@keyframes burst {
  from { opacity: 0.9; transform: translateZ(-4px) scale(0.5); }
  to { opacity: 0; transform: translateZ(-4px) scale(1.5); }
}

/* keyboard focus: ring the star whose radio has focus */
#star-1:focus-visible ~ .stars label:nth-child(1),
#star-2:focus-visible ~ .stars label:nth-child(2),
#star-3:focus-visible ~ .stars label:nth-child(3),
#star-4:focus-visible ~ .stars label:nth-child(4),
#star-5:focus-visible ~ .stars label:nth-child(5) {
  outline: 2px solid #2ee6d6;
  outline-offset: 5px;
}

/* the caption: all words in one grid cell, only the chosen one shows */
.words {
  display: grid;
  margin: 0;
  color: #ffb547;
  font-size: 14px;
  font-weight: 800;
}

.words span {
  grid-area: 1 / 1;
  justify-self: center;
  opacity: 0;
  transform: translateY(5px);
  transition: opacity 0.25s, transform 0.25s;
}

.words span:first-child {
  color: #949bc0;
  opacity: 1;
  transform: none;
}

.rating input:checked ~ .words span:first-child {
  opacity: 0;
  transform: translateY(-5px);
}

#star-1:checked ~ .words span:nth-child(2),
#star-2:checked ~ .words span:nth-child(3),
#star-3:checked ~ .words span:nth-child(4),
#star-4:checked ~ .words span:nth-child(5),
#star-5:checked ~ .words span:nth-child(6) {
  opacity: 1;
  transform: none;
}`,
  },

  toggle: {
    how: [
      'The track lies on the floor (<code>rotateX(58deg)</code>). Its thickness is five copies of the pill stacked 2.4px apart downward, lighter at the top: stacked layers are the cheap way to extrude a rounded shape.',
      'The knob is a real cube on the track, lifted by half a side so it stands on it. Its <code>transform-origin</code> is its bottom right edge: <code>100% 50% -17px</code> (the third value is Z, from the cube’s centre).',
      'Checked, the cube gets <code>rotateY(90deg)</code> about that edge: exactly how a cube tips over. The centre swings up on an arc and lands one side further on, with no translate and no keyframes. The track is two cube widths long, so one tip is the whole travel.',
      'The moon is on the cube’s left face: a quarter turn to the right brings it up on top. The sun, on the old top, ends up facing right.',
      'Only <code>transform</code> and <code>opacity</code> animate: the track’s “on” colour is a layer that fades in, and Off/On are two words in one grid cell. The whole thing is one <code>&lt;label&gt;</code> around a real <code>role="switch"</code> checkbox.',
    ],
    html: `<label class="toggle">
  <input type="checkbox" role="switch" />
  <span class="track" aria-hidden="true">
    <i></i><i></i><i></i><i></i><i></i>
    <span class="top"></span>
    <i class="shadow"></i>
    <span class="knob">
      <span class="cube"><i>${SUN_SVG}</i><i></i><i></i><i>${MOON_SVG}</i><i></i><i></i></span>
    </span>
  </span>
  <span class="text">Dark mode<small aria-hidden="true"><span>Off</span><span>On</span></small></span>
</label>`,
    css: `/* one label: the static hit target around a real checkbox */
.toggle {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 10px;
  color: #eceefb;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  perspective: 800px;
  transform-style: preserve-3d;
  user-select: none;
}

.toggle * {
  pointer-events: none;
}

.toggle input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
}

/* 34px cube + 8px padding: two cube widths long, so one roll is the whole travel */
.track {
  position: relative;
  flex: none;
  width: 84px;
  height: 50px;
  transform-style: preserve-3d;
  transform: rotateX(58deg); /* lying on the floor, seen from above */
}

/* the thickness: copies of the pill stacked downward, darker as they go */
.track > i:not(.shadow) {
  position: absolute;
  inset: 0;
  border-radius: 25px;
}

.track > i:nth-child(1) { background: color-mix(in srgb, #eceefb 15%, #101326); transform: translateZ(-12px); }
.track > i:nth-child(2) { background: color-mix(in srgb, #eceefb 18%, #101326); transform: translateZ(-9.6px); }
.track > i:nth-child(3) { background: color-mix(in srgb, #eceefb 21%, #101326); transform: translateZ(-7.2px); }
.track > i:nth-child(4) { background: color-mix(in srgb, #eceefb 24%, #101326); transform: translateZ(-4.8px); }
.track > i:nth-child(5) { background: color-mix(in srgb, #eceefb 27%, #101326); transform: translateZ(-2.4px); }

/* the top: a groove. "On" is a second layer that only fades in */
.top {
  position: absolute;
  inset: 0;
  border-radius: 25px;
  background: color-mix(in srgb, #949bc0 30%, #141830);
  box-shadow: inset 0 0 0 1.5px color-mix(in srgb, #eceefb 30%, #141830), inset 0 3px 8px rgb(0 0 0 / 0.35);
}

.top::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #8b6cff, #ff4d9d);
  box-shadow: inset 0 0 0 1.5px color-mix(in srgb, #8b6cff, #fff 35%), inset 0 3px 8px rgb(0 0 0 / 0.35);
  opacity: 0;
  transition: opacity 0.4s 0.1s;
}

.toggle input:checked ~ .track .top::before {
  opacity: 1;
}

.toggle input:focus-visible ~ .track .top {
  outline: 2px solid #2ee6d6;
  outline-offset: 4px;
}

/* the cube's shadow, sliding along with it */
.shadow {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.5), transparent);
  transform: translateZ(0.5px) scale(1.25);
  transition: transform 0.5s cubic-bezier(0.55, 0, 0.35, 1);
}

.toggle input:checked ~ .track .shadow {
  transform: translateZ(0.5px) translateX(34px) scale(1.25);
}

/* lifted by half a side, so the cube stands on the track */
.knob {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 34px;
  height: 34px;
  transform-style: preserve-3d;
  transform: translateZ(17px);
}

/* the pivot is the cube's bottom right edge: x = 100%, z = -17px from its centre */
.cube {
  --s: 34px;
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform-origin: 100% 50% -17px;
  transition: transform 0.5s cubic-bezier(0.55, 0, 0.35, 1);
}

/* checked: a quarter turn about that edge, a real roll */
.toggle input:checked ~ .track .cube {
  transform: rotateY(90deg);
}

/* in the track's own space +z is up: face 1 is the top (sun), 4 the left (moon) */
${CUBE_FACES}

.cube > i {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 5px;
  background: linear-gradient(145deg, #fff, #dcd9ef);
  transform-style: preserve-3d;
}

/* rounded faces leave holes at the corners: a square plate behind each one plugs them */
.cube > i::before {
  content: '';
  position: absolute;
  inset: 0; /* full size: a smaller plate leaves a channel along each edge you can see into */
  background: #c9c5e2;
  transform: translateZ(-3px);
}

.cube > i:nth-child(2) { background: linear-gradient(145deg, #eceaf8, #cbc7e3); }
.cube > i:nth-child(6) { background: linear-gradient(#d9d5ee, #b9b4d6); }

/* the sun and the moon inside a rim of the cube's own colour (like a keycap): at a rounded
   corner a sliver of the side face shows, and a dark moon there looked like a hole */
.cube > i:nth-child(1) {
  background: radial-gradient(circle, #fff6df, #ffe3a6);
  box-shadow: inset 0 0 0 2.5px #dcd9ef;
  color: #e08a00;
}

.cube > i:nth-child(4) {
  background: radial-gradient(circle at 40% 35%, #34396e, #181b3c);
  box-shadow: inset 0 0 0 2.5px #d4d0ea;
  color: #e9e4ff;
}

.cube svg {
  width: 22px;
  height: 22px;
}

.cube > i:nth-child(4) svg {
  width: 19px;
  height: 19px;
}

/* the label and its state: two words in one grid cell, cross-faded */
.text {
  display: grid;
  gap: 2px;
  line-height: 1.1;
}

.text small {
  display: grid;
  color: #949bc0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.text small span {
  grid-area: 1 / 1;
  transition: opacity 0.3s;
}

.text small span + span {
  color: #8b6cff;
  opacity: 0;
}

.toggle input:checked ~ .text span:first-child { opacity: 0; }
.toggle input:checked ~ .text span + span { opacity: 1; }`,
  },

  cubeletters: {
    how: [
      'Each letter gets its own cube. Around its X axis, face <i>n</i> is placed with <code>rotateX(n × -90deg) translateZ(s / 2)</code>: front, bottom, back and top carry the letters of CUBE, ROLL, CUBE, ROLL.',
      'Turning a cube <i>n</i> quarter turns forward brings face <i>n</i> to the front, upright, so every quarter turn swaps the word.',
      'One keyframe list: hold, turn, hold, turn… four turns make 360°, which looks exactly like 0°, so the loop has no seam. The easing is set per keyframe and only matters on the turns.',
      '<code>animation-delay: calc(var(--i) * 0.13s)</code> starts each cube a moment after the one before it, and the turn runs along the word like a wave.',
      '<code>backface-visibility: hidden</code> keeps letters from showing mirrored through the cube, and a square plate behind each rounded face hides the gaps at the corners.',
    ],
    html: `<div class="scene">
  <div class="word" role="img" aria-label="CUBE, rolling over to ROLL">
    <span class="cube" style="--i:0" aria-hidden="true"><i>C</i><i>R</i><i>C</i><i>R</i><b></b><b></b></span>
    <span class="cube" style="--i:1" aria-hidden="true"><i>U</i><i>O</i><i>U</i><i>O</i><b></b><b></b></span>
    <span class="cube" style="--i:2" aria-hidden="true"><i>B</i><i>L</i><i>B</i><i>L</i><b></b><b></b></span>
    <span class="cube" style="--i:3" aria-hidden="true"><i>E</i><i>L</i><i>E</i><i>L</i><b></b><b></b></span>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.word {
  display: flex;
  gap: 9px;
  transform-style: preserve-3d;
  transform: rotateX(-16deg) rotateY(-18deg); /* a fixed view from above and to the right */
}

.cube {
  --s: 44px;
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  /* --i staggers the cubes so the turn runs along the word */
  animation: roll 8s calc(var(--i) * 0.13s) infinite both;
}

.cube i,
.cube b {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  transform-style: preserve-3d;
}

/* letter faces: first word violet, second word pink */
.cube i {
  --c: #8b6cff;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--c), #fff 35%);
  background:
    linear-gradient(150deg, rgb(255 255 255 / 0.3), transparent 45%),
    linear-gradient(color-mix(in srgb, var(--c), #fff 8%), color-mix(in srgb, var(--c), #000 22%));
  color: #fff;
  font: 900 26px/1 system-ui, sans-serif;
  font-style: normal;
  text-shadow: 0 2px 0 color-mix(in srgb, var(--c), #000 45%);
  backface-visibility: hidden; /* never a mirrored letter */
}

.cube i:nth-child(even) {
  --c: #ff4d9d;
}

/* face n: n quarter turns back, then out by half a side */
.cube i:nth-child(1) { transform: rotateX(0deg)    translateZ(calc(var(--s) / 2)); }
.cube i:nth-child(2) { transform: rotateX(-90deg)  translateZ(calc(var(--s) / 2)); }
.cube i:nth-child(3) { transform: rotateX(-180deg) translateZ(calc(var(--s) / 2)); }
.cube i:nth-child(4) { transform: rotateX(-270deg) translateZ(calc(var(--s) / 2)); }

/* the two ends */
.cube b {
  border: 1px solid color-mix(in srgb, #8b6cff, #fff 10%);
  background: linear-gradient(color-mix(in srgb, #8b6cff, #000 30%), color-mix(in srgb, #8b6cff, #000 50%));
}

.cube b:nth-of-type(1) { transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
.cube b:nth-of-type(2) { transform: rotateY(90deg)  translateZ(calc(var(--s) / 2)); }

/* rounded faces leave holes at the corners: a square plate behind each one plugs them */
.cube i::before,
.cube b::before {
  content: '';
  position: absolute;
  inset: 0; /* full size: a smaller plate leaves a channel along each edge you can see into */
  background: color-mix(in srgb, #8b6cff, #000 50%);
  transform: translateZ(-5px);
}

.cube i:nth-child(even)::before {
  background: color-mix(in srgb, #ff4d9d, #000 50%);
}

/* hold, quarter turn, hold... 360deg = 0deg, so the loop is seamless */
@keyframes roll {
  0%, 17% {
    transform: rotateX(0deg);
    animation-timing-function: cubic-bezier(0.6, -0.3, 0.3, 1.3);
  }
  25%, 42% {
    transform: rotateX(90deg);
    animation-timing-function: cubic-bezier(0.6, -0.3, 0.3, 1.3);
  }
  50%, 67% {
    transform: rotateX(180deg);
    animation-timing-function: cubic-bezier(0.6, -0.3, 0.3, 1.3);
  }
  75%, 92% {
    transform: rotateX(270deg);
    animation-timing-function: cubic-bezier(0.6, -0.3, 0.3, 1.3);
  }
  100% {
    transform: rotateX(360deg);
  }
}`,
  },
};
