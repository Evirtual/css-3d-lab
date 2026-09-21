/**
 * Paste-anywhere versions of batch D: card interactions and loaders.
 * Plain HTML + CSS (+ JS), no Sass, no build step — see docs/ADDING-MODELS.md.
 */
import type { Snippet } from './snippet-utils';

export const snippetsD: Record<string, Snippet> = {
  hovercards: {
    how: [
      'Three <b>slots</b> are the hit targets, tiled edge to edge; the cards inside them are <code>pointer-events: none</code> so the pointer always lands on a slot, never on a moving card.',
      'Every state a card can be in — resting, dimmed, leaning left, leaning right, active — only changes a handful of custom properties fed into <b>one</b> <code>transform</code>.',
      '<code>:has()</code> answers "is a later sibling hovered?" so the cards <i>before</i> the active one can lean away too, not just the ones after it.',
      'Each card rests at a different <code>translateZ</code> so the overlapping fan never z-fights, and the active card jumps to the front on top of that.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, text included, so the fan is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="fan">
    <div class="fan-slot" tabindex="0">
      <div class="fan-card" style="--c:#8b6cff"><i></i><b>Design</b><span></span><span></span></div>
    </div>
    <div class="fan-slot" tabindex="0">
      <div class="fan-card" style="--c:#ff4d9d"><i></i><b>Build</b><span></span><span></span></div>
    </div>
    <div class="fan-slot" tabindex="0">
      <div class="fan-card" style="--c:#2ee6d6"><i></i><b>Ship</b><span></span><span></span></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the fan is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.35vmin;
  perspective: calc(800 * var(--u));
}

.fan {
  display: flex;
  width: calc(156 * var(--u));
  height: calc(132 * var(--u));
  transform-style: preserve-3d;
  /* coplanar with its slots: only the slots may catch the pointer */
  pointer-events: none;
}

.fan-slot {
  position: relative;
  flex: 1;
  outline: none;
  cursor: pointer;
  pointer-events: auto;
  transform-style: preserve-3d;
}

/* rest pose: each card a little nearer than the one before so they never z-fight */
.fan-slot:nth-child(1) { --r: -8deg; --z: 0; }
.fan-slot:nth-child(2) { --r: 0deg;  --z: calc(12 * var(--u)); }
.fan-slot:nth-child(3) { --r: 8deg;  --z: calc(24 * var(--u)); }

.fan-card {
  position: absolute;
  top: calc(6 * var(--u));
  left: calc(50% - 42 * var(--u));
  display: grid;
  align-content: start;
  gap: calc(6 * var(--u));
  width: calc(84 * var(--u));
  height: calc(120 * var(--u));
  padding: calc(8 * var(--u));
  border: calc(1 * var(--u)) solid color-mix(in srgb, var(--c) 70%, transparent);
  border-radius: calc(11 * var(--u));
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--c) 46%, #141830),
    color-mix(in srgb, var(--c) 12%, #141830)
  );
  box-shadow: 0 calc(12 * var(--u)) calc(18 * var(--u)) calc(-12 * var(--u)) #000;
  color: #eceefb;
  opacity: var(--o, 1);
  pointer-events: none;
  transform-origin: 50% 100%;
  /* one transform, fed by variables: every state below only ever changes numbers */
  transform: translate3d(var(--x, 0), var(--y, 0), var(--z)) rotateY(var(--ry, 0deg)) rotateZ(var(--r));
  transition:
    transform 0.45s cubic-bezier(0.3, 1.3, 0.5, 1),
    opacity 0.3s;
}

.fan-card i {
  display: block;
  height: calc(42 * var(--u));
  border-radius: calc(6 * var(--u));
  background:
    radial-gradient(circle at 70% 30%, rgb(255 255 255 / 0.55), transparent 45%),
    linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 40%, #000));
}

.fan-card b {
  font-size: calc(11 * var(--u));
  line-height: 1;
}

.fan-card span {
  display: block;
  height: calc(4 * var(--u));
  border-radius: calc(2 * var(--u));
  background: color-mix(in srgb, #eceefb 28%, transparent);
}

.fan-card span:last-child {
  width: 60%;
}

/* something is active: every card dims... */
.fan:hover .fan-slot,
.fan:focus-within .fan-slot {
  --o: 0.5;
}

/* ...cards AFTER the active one lean away to the right... */
.fan-slot:hover ~ .fan-slot,
.fan-slot:focus-visible ~ .fan-slot {
  --x: calc(16 * var(--u));
  --ry: 26deg;
}

/* ...cards BEFORE it lean away to the left (:has() looks forward for a hovered sibling)... */
.fan-slot:has(~ .fan-slot:hover),
.fan-slot:has(~ .fan-slot:focus-visible) {
  --x: calc(-16 * var(--u));
  --ry: -26deg;
}

/* ...and the active one (this rule is last, so it wins) squares up and comes toward you */
.fan .fan-slot:is(:hover, :focus-visible) {
  --o: 1;
  --x: 0;
  --y: calc(-6 * var(--u));
  --z: calc(80 * var(--u));
  --r: 0deg;
  --ry: 0deg;
}`,
  },

  flipgrid: {
    how: [
      'The tile never moves — it is the hit target. Only the <code>.tile-inner</code> wrapper inside it flips, on <code>:hover</code> / <code>:focus-visible</code>.',
      'One custom property, <code>--flip</code>, holds the whole rotation function (<code>rotateY(180deg)</code> or <code>rotateX(180deg)</code>), set once per tile so a single rule can flip every tile differently.',
      'The back face is pre-rotated by that same <code>--flip</code> in its resting state, so once the tile turns, the back lands right-way up instead of mirrored.',
      '<code>backface-visibility: hidden</code> on both faces means only the one currently facing you is ever visible.',
      'Lifting with <code>translateZ</code> before the flip keeps the tile from clipping into its neighbours mid-turn.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the grid is the same share of a gallery card, the editor and a recording canvas. The lifted tile is the widest the model gets, because the perspective magnifies whatever comes toward you, so that is the pose the band is measured against.',
    ],
    html: `<div class="scene">
  <div class="grid">
    <div class="tile" tabindex="0" style="--c:#8b6cff">
      <div class="tile-inner"><b>01</b><span>tilt</span></div>
    </div>
    <div class="tile" tabindex="0" style="--c:#ff4d9d">
      <div class="tile-inner"><b>02</b><span>flip</span></div>
    </div>
    <div class="tile" tabindex="0" style="--c:#2ee6d6;--on:#10131f">
      <div class="tile-inner"><b>03</b><span>spin</span></div>
    </div>
    <div class="tile" tabindex="0" style="--c:#ffb547;--on:#10131f">
      <div class="tile-inner"><b>04</b><span>lift</span></div>
    </div>
    <div class="tile" tabindex="0" style="--c:#8b6cff">
      <div class="tile-inner"><b>05</b><span>fold</span></div>
    </div>
    <div class="tile" tabindex="0" style="--c:#ff4d9d">
      <div class="tile-inner"><b>06</b><span>zoom</span></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the grid is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.38vmin;
  perspective: calc(800 * var(--u));
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, calc(62 * var(--u)));
  gap: calc(9 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(16deg);
  /* the grid and its tiles are coplanar: take the grid out of hit-testing so the
     pointer always resolves to a tile, never something ambiguous between them */
  pointer-events: none;
}

.tile {
  --flip: rotateY(180deg); /* odd tiles flip sideways */
  position: relative;
  height: calc(62 * var(--u));
  outline: none;
  cursor: pointer;
  pointer-events: auto;
  transform-style: preserve-3d;
}

.tile:nth-child(even) {
  --flip: rotateX(180deg); /* even tiles flip head over heels */
}

.tile-inner {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.3, 1.25, 0.5, 1);
}

.tile-inner > * {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: calc(10 * var(--u));
  backface-visibility: hidden;
}

/* front */
/* the front is see-through, so its number is really on the stage: it takes the stage's ink */
.tile-inner b {
  font-size: calc(20 * var(--u));
  font-weight: 900;
  background: color-mix(in srgb, var(--c) 26%, transparent);
  border: calc(1 * var(--u)) solid color-mix(in srgb, var(--c) 75%, transparent);
  box-shadow: inset 0 0 calc(24 * var(--u)) color-mix(in srgb, var(--c) 30%, transparent);
}

/* back: pre-turned with the same rotation the tile will make, so it lands the right way up */
.tile-inner span {
  background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 45%, #000));
  /* the back is solid, so its word is set for its own colour: white on violet and pink, dark
     on teal and amber, where white would not read */
  color: var(--on, #fff);
  font-size: calc(12 * var(--u));
  font-weight: 800;
  letter-spacing: 0.04em;
  transform: var(--flip);
}

.tile:hover .tile-inner,
.tile:focus-visible .tile-inner {
  /* lift first (toward the viewer), then flip in place */
  transform: translateZ(calc(30 * var(--u))) var(--flip);
}`,
  },

  accordion: {
    how: [
      'Real <code>&lt;input type="radio"&gt;</code>s (visually hidden, not <code>display: none</code>) drive the state — that keeps arrow-key navigation and screen readers working for free.',
      'A panel is a flap <b>hinged on its top edge</b>: <code>transform-origin: top center</code> plus <code>rotateX(-90deg)</code> to fold it flat, edge-on to the viewer, until its radio is checked.',
      'Nothing animates <code>height</code>. The frame has a fixed size; sections below the open one are pushed down with <code>translateY</code> by exactly one panel\'s height instead.',
      '<code>~</code> (general sibling) plus <code>:checked</code> lets one radio style both its own section <i>and</i> every section after it, all from CSS alone.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the accordion is the same share of a gallery card, the editor and a recording canvas. The widget is its own control, so it fills the model box and has no control row under it.',
    ],
    html: `<div class="scene">
  <div class="accordion">
    <input type="radio" name="acc" id="acc-0" checked />
    <input type="radio" name="acc" id="acc-1" />
    <input type="radio" name="acc" id="acc-2" />
    <div class="sec" style="--i:0">
      <label for="acc-0">Perspective</label>
      <div class="panel">The camera distance. Put it on the parent; smaller values look more dramatic.</div>
    </div>
    <div class="sec" style="--i:1">
      <label for="acc-1">Preserve-3d</label>
      <div class="panel">Without it, children are flattened into the plane of their parent.</div>
    </div>
    <div class="sec" style="--i:2">
      <label for="acc-2">Backface</label>
      <div class="panel">Hide the reverse side of a face so text never shows mirrored.</div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the accordion is the same share
     of a card, the editor, a full screen and a recording canvas */
  --u: 0.30vmin;
  perspective: calc(800 * var(--u));
}

.accordion {
  position: relative;
  width: calc(196 * var(--u));
  height: calc(187 * var(--u)); /* 3 × (header 32 + gap 5) + panel 71 */
  transform-style: preserve-3d;
  transform: rotateY(-18deg) rotateX(4deg);
  /* the frame and the headers are coplanar, and coplanar boxes have no stable hit-test order in
     3D, so the frame itself could win a click in the middle of a header. Nothing but a header
     (and an open panel) takes the pointer. */
  pointer-events: none;
}

/* real radios keep it keyboard-friendly (arrow keys move between sections); only hidden */
.accordion > input {
  position: absolute;
  width: calc(1 * var(--u));
  height: calc(1 * var(--u));
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.sec {
  position: absolute;
  top: calc(var(--i) * 37 * var(--u));
  right: 0;
  left: 0;
  height: calc(32 * var(--u));
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.accordion label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 calc(12 * var(--u));
  border: calc(1 * var(--u)) solid rgb(140 150 220 / 0.34);
  border-radius: calc(9 * var(--u));
  background: color-mix(in srgb, #8b6cff 14%, #141830);
  color: #eceefb;
  font-size: calc(12 * var(--u));
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  pointer-events: auto;
}

/* chevron */
.accordion label::after {
  content: '';
  width: calc(6 * var(--u));
  height: calc(6 * var(--u));
  border-right: calc(2 * var(--u)) solid #949bc0;
  border-bottom: calc(2 * var(--u)) solid #949bc0;
  transform: translateY(calc(-2 * var(--u))) rotate(45deg);
  transition: transform 0.4s;
}

/* the flap: hinged on its top edge, folded back flat (edge-on to the viewer) until opened */
.panel {
  position: absolute;
  top: calc(100% + 5 * var(--u));
  right: 0;
  left: 0;
  height: calc(71 * var(--u));
  padding: calc(9 * var(--u)) calc(12 * var(--u));
  border: calc(1 * var(--u)) solid color-mix(in srgb, #2ee6d6 60%, transparent);
  border-radius: calc(9 * var(--u));
  background: linear-gradient(180deg, color-mix(in srgb, #2ee6d6 26%, #141830), color-mix(in srgb, #8b6cff 16%, #141830));
  color: #eceefb;
  font-size: calc(11 * var(--u));
  line-height: 1.45;
  opacity: 0;
  pointer-events: none;
  transform-origin: top center;
  transform: rotateX(-90deg);
  transition:
    transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s;
}

/* the open section: flap down, header lit (each radio only ever targets its own section) */
#acc-0:checked ~ .sec:nth-of-type(1) .panel,
#acc-1:checked ~ .sec:nth-of-type(2) .panel,
#acc-2:checked ~ .sec:nth-of-type(3) .panel {
  opacity: 1;
  pointer-events: auto;
  transform: rotateX(0deg);
}

#acc-0:checked ~ .sec:nth-of-type(1) label,
#acc-1:checked ~ .sec:nth-of-type(2) label,
#acc-2:checked ~ .sec:nth-of-type(3) label {
  border-color: #8b6cff;
  background: color-mix(in srgb, #8b6cff 38%, #141830);
}

#acc-0:checked ~ .sec:nth-of-type(1) label::after,
#acc-1:checked ~ .sec:nth-of-type(2) label::after,
#acc-2:checked ~ .sec:nth-of-type(3) label::after {
  transform: translateY(calc(1 * var(--u))) rotate(-135deg);
}

#acc-0:focus-visible ~ .sec:nth-of-type(1) label,
#acc-1:focus-visible ~ .sec:nth-of-type(2) label,
#acc-2:focus-visible ~ .sec:nth-of-type(3) label {
  outline: calc(2 * var(--u)) solid #2ee6d6;
  outline-offset: calc(2 * var(--u));
}

/* every section after the open one slides down by exactly one panel's height */
#acc-0:checked ~ .sec:nth-of-type(n + 2) {
  transform: translateY(calc(76 * var(--u)));
}

#acc-1:checked ~ .sec:nth-of-type(n + 3) {
  transform: translateY(calc(76 * var(--u)));
}`,
  },

  swipe: {
    how: [
      'Every card stores its position in the stack in <code>--p</code> (0 = top). CSS turns that into <b>real</b> depth with <code>translateZ(calc(var(--p) * -45 * var(--u)))</code> — perspective does the shrinking, no <code>scale()</code> needed.',
      'While a <code>pointerdown</code>/<code>pointermove</code> drag is in progress, JS turns the pointer\'s travel from pixels into the deck\'s own units (the deck is 130 of them across) and writes the offsets as plain <b>numbers</b> (<code>--dx</code>, <code>--dy</code>, <code>--dz</code>). CSS multiplies each one by the model\'s base unit <code>--u</code> and does every bit of motion, so a drag means the same thing on a gallery card and on a full screen.',
      'The canvas is the model, so there is no off-screen edge to fling a card over. The slide <b>gives</b> instead: <code>REACH × tanh(dx / REACH)</code> is 1:1 under the finger at first and eases to a limit however far you go. The card turns as it slides, and <code>rotateY</code> narrows what it draws, which is most of what pays for the slide.',
      'A sent card leaves by going <b>back</b> — <code>translateZ</code> far into the depth while it fades — which is where it rejoins the deck anyway.',
      'While dragging, the card gets <code>transition: none</code> so it answers the finger at once; release it and the transition comes back, so it either springs home or carries on away.',
      'A fling does not remove the card. JS flags it <code>.is-back</code> (opacity 0, no transition) to jump it behind the deck invisibly, then removes that class a frame later so it fades back in at the bottom — the illusion of an endless deck.',
      'Use <code>setPointerCapture</code> so the drag keeps receiving events even if the pointer leaves the card, and arrow keys call the exact same <code>fling()</code> function as a completed drag.',
    ],
    html: `<div class="scene">
  <div class="swipe" tabindex="0">
    <i style="--hue:262"><b>LIKE</b><b>NOPE</b><strong>Cube</strong><small>six faces</small></i>
    <i style="--hue:320"><b>LIKE</b><b>NOPE</b><strong>Ring</strong><small>rotate, then translate</small></i>
    <i style="--hue:175"><b>LIKE</b><b>NOPE</b><strong>Flap</strong><small>hinged on an edge</small></i>
    <i style="--hue:28"><b>LIKE</b><b>NOPE</b><strong>Lens</strong><small>perspective: 800px</small></i>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the deck is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.36vmin;
  perspective: calc(800 * var(--u));
}

.swipe {
  position: relative;
  width: calc(130 * var(--u));
  height: calc(150 * var(--u));
  outline: none;
  touch-action: pan-y; /* horizontal drags are ours, vertical ones still scroll the page */
  transform-style: preserve-3d;
  transform: translateY(calc(-14 * var(--u))); /* the stack trails off downward: nudge it up */
}

.swipe:focus-visible i.is-top {
  outline: calc(2 * var(--u)) solid #2ee6d6;
  outline-offset: calc(3 * var(--u));
}

/* --p is the position in the stack (0 = top), written by JS. Depth is REAL: cards further
   back sit further away on Z, and the perspective makes them smaller — no scale() needed.
   --dx / --dy / --dz / --rot / --tilt are plain numbers the pointer writes, and every one of
   them is multiplied by the model's own unit here, so a drag means the same thing on a card
   and on a full screen. */
.swipe i {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: end;
  gap: calc(2 * var(--u));
  padding: calc(12 * var(--u));
  border: calc(1 * var(--u)) solid hsl(var(--hue) 90% 78% / 0.7);
  border-radius: calc(14 * var(--u));
  background:
    radial-gradient(circle at 75% 22%, rgb(255 255 255 / 0.5), transparent 32%),
    linear-gradient(160deg, hsl(var(--hue) 85% 64%), hsl(calc(var(--hue) + 40) 75% 34%));
  box-shadow: 0 calc(14 * var(--u)) calc(20 * var(--u)) calc(-14 * var(--u)) #000;
  color: #fff;
  font-style: normal;
  opacity: calc(1 - var(--p) * 0.2);
  user-select: none;
  touch-action: pan-y;
  transform: translate3d(
      calc(var(--dx, 0) * var(--u)),
      calc((var(--p) * 14 + var(--dy, 0)) * var(--u)),
      calc((var(--p) * -45 + var(--dz, 0)) * var(--u))
    )
    rotateY(var(--tilt, 0deg)) rotateZ(var(--rot, 0deg));
  transition:
    transform 0.4s cubic-bezier(0.3, 1.3, 0.5, 1),
    opacity 0.3s;
}

.swipe i.is-top {
  cursor: grab;
}

/* while the finger is down the card must follow 1:1, so no transition */
.swipe i.is-dragging {
  cursor: grabbing;
  transition: none;
}

/* on its way out: JS has set the far pose, CSS does the flight */
.swipe i.is-leaving {
  opacity: 0;
  transition:
    transform 0.35s ease-in,
    opacity 0.35s ease-in;
}

/* re-entering at the back: jump there invisibly, then fade in */
.swipe i.is-back {
  opacity: 0;
  transition: none;
}

.swipe i strong {
  font-size: calc(17 * var(--u));
  line-height: 1;
}

.swipe i small {
  font-size: calc(11 * var(--u));
  opacity: 0.85;
}

/* LIKE / NOPE stamps, faded in by how far the card has been dragged */
.swipe i b {
  position: absolute;
  top: calc(12 * var(--u));
  padding: calc(2 * var(--u)) calc(6 * var(--u));
  border: calc(2 * var(--u)) solid currentcolor;
  border-radius: calc(6 * var(--u));
  font-size: calc(11 * var(--u));
  letter-spacing: 0.08em;
}

.swipe i b:nth-of-type(1) {
  left: calc(10 * var(--u));
  color: #7dffb0;
  opacity: var(--like, 0);
  transform: rotate(-14deg);
}

.swipe i b:nth-of-type(2) {
  right: calc(10 * var(--u));
  color: #ffd0d8;
  opacity: var(--nope, 0);
  transform: rotate(14deg);
}`,
    js: `const root = document.querySelector('.swipe');
let order = [...root.querySelectorAll('i')];
let drag = null;
let busy = false;
let timer = 0;
const WIDE = 130;      // the deck's width in the model's own units, for pixels → units
const THRESHOLD = 26;  // pointer travel, in units, that counts as sending the card away
// The canvas IS the model, so there is no off-screen edge to fling a card over, and a card that
// slid far enough to look flung would drag the whole picture off centre. So the slide gives:
// however far the finger goes, the card eases to REACH and no further, and it turns as it goes —
// rotateY narrows what it draws, which is most of what pays for the slide. A sent card leaves by
// going BACK instead, to where it rejoins the deck anyway.
const REACH = 18;      // the furthest across a card is ever drawn
const RISE = 8;        // and the furthest up or down
const GONE = 900;      // how far back a sent card goes while it fades

/** Eases to a limit: 1:1 under the finger at first, never past the limit however far it goes. */
function ease(v, limit) {
  return limit * Math.tanh(v / limit);
}

function layout(cards) {
  cards.forEach((el, p) => {
    el.style.setProperty('--p', String(p));
    el.classList.toggle('is-top', p === 0);
  });
}

function pose(card, dx, dy, back) {
  const across = ease(dx, REACH);
  card.style.setProperty('--dx', across.toFixed(1));
  card.style.setProperty('--dy', ease(dy, RISE).toFixed(1));
  card.style.setProperty('--dz', String(-(back || 0)));
  card.style.setProperty('--rot', (across * 0.15).toFixed(2) + 'deg');
  card.style.setProperty('--tilt', (across * 1.3).toFixed(2) + 'deg');
  card.style.setProperty('--like', Math.min(1, Math.max(0, dx / THRESHOLD)).toFixed(2));
  card.style.setProperty('--nope', Math.min(1, Math.max(0, -dx / THRESHOLD)).toFixed(2));
}

function unpose(card) {
  ['--dx', '--dy', '--dz', '--rot', '--tilt', '--like', '--nope'].forEach((p) => card.style.removeProperty(p));
}

function fling(dir, dy) {
  if (busy) return;
  busy = true;
  const card = order[0];
  const rest = order.slice(1);
  card.classList.remove('is-top');
  card.classList.add('is-leaving');
  pose(card, dir * THRESHOLD * 4, dy || 0, GONE); // out to its limit, and away into the depth
  layout(rest); // the others move up right away
  timer = window.setTimeout(() => {
    // jump to the back invisibly (no transition), then let it fade in there
    card.classList.add('is-back');
    card.classList.remove('is-leaving');
    unpose(card);
    order = [...rest, card];
    layout(order);
    void card.offsetWidth;
    card.classList.remove('is-back');
    busy = false;
  }, 360);
}

function down(e) {
  if (busy || drag || e.button > 0) return;
  const card = e.target.closest('i');
  if (card !== order[0]) return;
  e.preventDefault();
  root.focus({ preventScroll: true });
  root.setPointerCapture(e.pointerId);
  // screen pixels → the model's own units: the deck is WIDE units across, so one unit is that
  // fraction of what it measures on screen, whatever size the canvas is
  const unit = root.getBoundingClientRect().width / WIDE || 1;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, unit, dx: 0 };
  order[0].classList.add('is-dragging');
}

function move(e) {
  if (!drag || e.pointerId !== drag.id) return;
  drag.dx = (e.clientX - drag.x) / drag.unit;
  pose(order[0], drag.dx, ((e.clientY - drag.y) / drag.unit) * 0.4);
}

function up(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const { dx, unit, y } = drag;
  drag = null;
  const card = order[0];
  card.classList.remove('is-dragging');
  if (e.type === 'pointerup' && Math.abs(dx) > THRESHOLD) {
    fling(Math.sign(dx), ((e.clientY - y) / unit) * 0.4);
  } else {
    unpose(card); // the transition is back on, so it springs home
  }
}

function key(e) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  fling(e.key === 'ArrowLeft' ? -1 : 1);
}

layout(order);
root.addEventListener('pointerdown', down);
root.addEventListener('pointermove', move);
root.addEventListener('pointerup', up);
root.addEventListener('pointercancel', up);
root.addEventListener('keydown', key);`,
  },

  polaroid: {
    how: [
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the table, the photos and their captions are the same share of a gallery card, the editor and a recording canvas. The numbers below are those units.',
      'The table and its four photo slots are all one tilted plane (<code>rotateX(24deg)</code> on the container). Only the slots catch the pointer — the photos inside are <code>pointer-events: none</code>.',
      'Each resting photo carries its own <code>--x</code> / <code>--y</code> / <code>--z</code> / <code>--r</code> so the scatter is uneven and the four never sit exactly on top of each other.',
      'The hover state reuses the <b>same list</b> of transform functions (<code>translate3d rotateX rotateZ scale</code>), just with different numbers — same-shape lists let the browser interpolate each value smoothly instead of jumping.',
      'Lifting a photo means moving it along the table\'s normal, then <code>rotateX(-24deg)</code> to cancel the table\'s own tilt so the photo squares up to the viewer instead of lifting at an angle.',
      'A separate <code>::before</code> pseudo-element is the contact shadow: it stays glued to the table and only fades and grows, never lifts, which sells the photo as airborne.',
    ],
    html: `<div class="scene">
  <div class="table">
    <div class="slot" tabindex="0"><div class="photo"><i></i><small>sunset</small></div></div>
    <div class="slot" tabindex="0"><div class="photo"><i></i><small>seaside</small></div></div>
    <div class="slot" tabindex="0"><div class="photo"><i></i><small>peaks</small></div></div>
    <div class="slot" tabindex="0"><div class="photo"><i></i><small>midnight</small></div></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the table is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.32vmin;
  perspective: calc(800 * var(--u));
}

.table {
  display: grid;
  grid-template-columns: repeat(2, calc(100 * var(--u)));
  grid-auto-rows: calc(80 * var(--u));
  transform-style: preserve-3d;
  /* how far the "table" leans back */
  transform: translateY(calc(12 * var(--u))) rotateX(24deg);
  /* the table and its four slots are coplanar: only the slots may catch the pointer */
  pointer-events: none;
}

/* a slot is a static quarter of the table: the hit target. The photo inside it is free to fly */
.slot {
  position: relative;
  outline: none;
  cursor: pointer;
  pointer-events: auto;
  transform-style: preserve-3d;
}

/* each photo is pushed toward the middle so they overlap, and sits a little higher than the
   previous one so overlapping photos never z-fight */
.slot:nth-child(1) { --x: calc(15 * var(--u));  --y: calc(9 * var(--u));   --z: calc(2 * var(--u));  --r: -10deg; }
.slot:nth-child(2) { --x: calc(-12 * var(--u)); --y: calc(5 * var(--u));   --z: calc(6 * var(--u));  --r: 7deg; }
.slot:nth-child(3) { --x: calc(11 * var(--u));  --y: calc(-8 * var(--u));  --z: calc(10 * var(--u)); --r: 5deg; }
.slot:nth-child(4) { --x: calc(-15 * var(--u)); --y: calc(-10 * var(--u)); --z: calc(14 * var(--u)); --r: -8deg; }

/* contact shadow: stays on the table and fades as the photo lifts */
.slot::before {
  content: '';
  position: absolute;
  top: calc(50% - 44 * var(--u));
  left: calc(50% - 36 * var(--u));
  width: calc(72 * var(--u));
  height: calc(88 * var(--u));
  background: radial-gradient(ellipse, rgb(0 0 0 / 0.6) 30%, transparent 72%);
  pointer-events: none;
  transform: translate(var(--x), var(--y)) rotateZ(var(--r)) scale(1);
  transition:
    transform 0.5s,
    opacity 0.5s;
}

.slot:hover::before,
.slot:focus-visible::before {
  opacity: 0.35;
  transform: translate(0, calc(10 * var(--u))) rotateZ(0deg) scale(1.15);
}

.photo {
  position: absolute;
  top: calc(50% - 44 * var(--u));
  left: calc(50% - 36 * var(--u));
  width: calc(72 * var(--u));
  height: calc(88 * var(--u));
  padding: calc(5 * var(--u)) calc(5 * var(--u)) 0;
  border-radius: calc(3 * var(--u));
  background: linear-gradient(170deg, #fbf9f4, #e6e1d6);
  box-shadow: 0 calc(1 * var(--u)) calc(2 * var(--u)) rgb(0 0 0 / 0.5);
  pointer-events: none;
  /* same function list in both states, so the browser interpolates number by number */
  transform: translate3d(var(--x), var(--y), var(--z)) rotateX(0deg) rotateZ(var(--r)) scale(1);
  transition: transform 0.5s cubic-bezier(0.3, 1.3, 0.5, 1);
}

.photo i {
  display: block;
  height: calc(62 * var(--u));
  border-radius: calc(1 * var(--u));
}

.photo small {
  display: block;
  color: #4a4658;
  font-size: calc(9 * var(--u));
  font-weight: 600;
  line-height: calc(21 * var(--u));
  text-align: center;
}

/* the "photos" are just layered gradients */
.slot:nth-child(1) i {
  background:
    radial-gradient(circle at 50% 78%, #fff6c8 0 9%, transparent 10%),
    linear-gradient(180deg, #8b6cff 0%, #ff4d9d 55%, #ffb547 78%, #2a1840 79%);
}

.slot:nth-child(2) i {
  background:
    radial-gradient(circle at 72% 26%, #fff 0 8%, transparent 9%),
    linear-gradient(180deg, #7fd8ff 0 52%, #2ee6d6 53%, #0d6f8a 100%);
}

.slot:nth-child(3) i {
  background:
    conic-gradient(from 150deg at 35% 30%, #3b2a78 0 60deg, transparent 0),
    conic-gradient(from 145deg at 68% 45%, #5a3fb0 0 70deg, transparent 0),
    linear-gradient(180deg, #ffd9a0, #ff4d9d);
}

.slot:nth-child(4) i {
  background:
    radial-gradient(circle at 28% 30%, #fff 0 2%, transparent 3%),
    radial-gradient(circle at 62% 18%, #fff 0 1.5%, transparent 2.5%),
    radial-gradient(circle at 80% 48%, #fff 0 2%, transparent 3%),
    radial-gradient(circle at 44% 58%, #fff 0 1.5%, transparent 2.5%),
    radial-gradient(circle at 74% 74%, #f4f1d0 0 10%, transparent 11%),
    linear-gradient(180deg, #0b0d2a, #3a2a7a);
}

/* lift along the table's normal, then undo the table's tilt so the photo faces the viewer */
.slot:hover .photo,
.slot:focus-visible .photo {
  transform: translate3d(0, calc(6 * var(--u)), calc(52 * var(--u))) rotateX(-24deg) rotateZ(0deg) scale(1.1);
}`,
  },

  cubenav: {
    how: [
      'JS keeps one <b>unbounded</b> counter (…, -1, 0, 1, 2, … 7, 8, …), never a value clamped to 0-3. It writes it as one angle, <code>index × -90deg</code>, into <code>--angle</code>, and CSS turns the cube by it: <code>rotateY(var(--angle))</code>.',
      'Because the angle only ever grows or shrinks, Next always turns the same way — it never has to unwind back through 360° when it wraps from slide 4 to slide 1.',
      'For the dot buttons, JS picks the <b>shortest</b> path: <code>((target − current + 4) % 4)</code> gives 0-3 steps forward; if that is more than half way around, subtracting 4 makes it a few steps backward instead.',
      'The cube is pulled back with <code>translateZ(calc(-s / 2))</code> so whichever face is turned to the front sits exactly at <code>z = 0</code> and renders at its true size, not shrunk by the perspective.',
      'Only <code>transform</code> is transitioned, so the turn runs on the compositor and stays smooth however fast you click.',
      'Every length in the cube is a multiple of one base unit, <code>--u</code>, tied to the canvas, so it is the same share of a gallery card, the editor and a recording canvas. The arrows, dots and caption are in plain <code>vmin</code>: the control zone is the same object, at the same size, in every model.',
    ],
    html: `<div class="cubenav">
  <div class="view">
    <div class="scene">
      <div class="cube">
        <i style="--hue:28">Dawn<small>01 / 04</small></i>
        <i style="--hue:178">Reef<small>02 / 04</small></i>
        <i style="--hue:300">Dusk<small>03 / 04</small></i>
        <i style="--hue:240">Night<small>04 / 04</small></i>
        <i></i>
        <i></i>
      </div>
    </div>
  </div>
  <div class="controls">
    <output class="caption" aria-live="polite">01 · Dawn</output>
    <div class="row">
      <button type="button" data-dir="-1" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
      <span class="dots">
        <button type="button" data-go="0" aria-label="Go to Dawn"></button>
        <button type="button" data-go="1" aria-label="Go to Reef"></button>
        <button type="button" data-go="2" aria-label="Go to Dusk"></button>
        <button type="button" data-go="3" aria-label="Go to Night"></button>
      </span>
      <button type="button" data-dir="1" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
  </div>
</div>`,
    css: `.cubenav {
  /* one base unit: every length in the cube below is a multiple of it, so the carousel is the
     same share of a card, the editor, a full screen and a recording canvas. The control zone
     under it is in plain vmin, because it is the same object in every model. */
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
  height: 44vmin;
}

.scene {
  position: relative;
  display: grid;
  place-items: center;
  /* the floor shadow hangs below the cube: the room for it keeps the cube centred */
  padding-bottom: calc(22 * var(--u));
  perspective: calc(700 * var(--u));
}

/* a soft shadow on the floor, drawn before the cube so it is always underneath */
.scene::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: calc(50% - 64 * var(--u));
  width: calc(128 * var(--u));
  height: calc(20 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.45), transparent);
}

.cube {
  --s: calc(116 * var(--u));
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  /* Read right to left: spin on the vertical axis by --angle (JS only ever adds or subtracts
     90deg steps, it never wraps back to 0), tip the top toward you a little, then pull the cube
     back by half a side so the front face sits at z = 0 and stays its true size. */
  transform: translateZ(calc(var(--s) / -2)) rotateX(-9deg) rotateY(var(--angle, 0deg));
  transition: transform 0.8s cubic-bezier(0.3, 1.2, 0.5, 1);
}

/* turn each face outward, then push it half a side from the centre */
.cube > :nth-child(1) { transform: rotateY(0deg)   translateZ(calc(var(--s) / 2)); }
.cube > :nth-child(2) { transform: rotateY(90deg)  translateZ(calc(var(--s) / 2)); }
.cube > :nth-child(3) { transform: rotateY(180deg) translateZ(calc(var(--s) / 2)); }
.cube > :nth-child(4) { transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
.cube > :nth-child(5) { transform: rotateX(90deg)  translateZ(calc(var(--s) / 2)); }
.cube > :nth-child(6) { transform: rotateX(-90deg) translateZ(calc(var(--s) / 2)); }

/* each side is a little landscape photo: sky, sun, two hills, a gloss and a shade for the text */
.cube i {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: end;
  padding: calc(10 * var(--u)) calc(11 * var(--u));
  /* an inner line plus a soft shade instead of a hard border: squeezed side-on, a one-unit line
     breaks up, the shade survives */
  --edge: hsl(var(--hue) 90% 85% / 0.55);
  --edge-soft: hsl(var(--hue) 90% 85% / 0.16);
  box-shadow: inset 0 0 0 calc(1 * var(--u)) var(--edge), inset 0 0 calc(8 * var(--u)) var(--edge-soft);
  border-radius: calc(10 * var(--u));
  background:
    linear-gradient(155deg, rgb(255 255 255 / 0.22), transparent 38%),
    linear-gradient(transparent 52%, rgb(0 0 0 / 0.42)),
    radial-gradient(95% 55% at 82% 108%, hsl(var(--hue) 45% 19%) 70%, transparent 71%),
    radial-gradient(85% 50% at 16% 102%, hsl(var(--hue) 40% 33%) 70%, transparent 71%),
    radial-gradient(circle at 70% 34%, hsl(calc(var(--hue) + 20) 100% 93%) 0 10%, hsl(calc(var(--hue) + 20) 100% 85% / 0.35) 11% 17%, transparent 18%),
    linear-gradient(hsl(var(--hue) 80% 72%), hsl(calc(var(--hue) + 35) 70% 46%));
  color: #fff;
  font-size: calc(15 * var(--u));
  font-style: normal;
  font-weight: 800;
  line-height: 1.1;
  text-shadow: 0 calc(1 * var(--u)) calc(3 * var(--u)) rgb(0 0 0 / 0.4);
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

/* rounded faces leave a hole where their corners meet: a plate just behind each face plugs it */
.cube i::before {
  content: '';
  position: absolute;
  /* one unit short of the edge: full size, it would touch the next face and show there as a
     dotted seam; much smaller leaves a channel along each edge you can see into */
  inset: calc(1 * var(--u));
  background: hsl(var(--hue) 45% 18%);
  transform: translateZ(calc(-6 * var(--u)));
}

.cube i small {
  font-size: calc(10 * var(--u));
  font-weight: 600;
  opacity: 0.85;
}

/* top and bottom: dark glass, so the photos are what you look at */
.cube i:nth-child(n + 5) {
  --hue: 250;
  --edge: rgb(140 150 220 / 0.34);
  --edge-soft: rgb(140 150 220 / 0.16);
  background:
    linear-gradient(135deg, rgb(255 255 255 / 0.12), transparent 60%),
    #221f45;
}

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the cube's own unit. The caption is on its own line above the
   row, and its line box never changes height, so a new slide cannot move the cube. */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}

.controls .caption {
  font: 500 4.5vmin/1.2 system-ui, sans-serif;
  letter-spacing: 0.06em;
  opacity: 0.7;
}

.controls .row {
  display: flex;
  align-items: center;
  gap: 2vmin;
}

.controls button,
.controls label {
  height: 8vmin;
  min-width: 8vmin;
  padding: 0 3vmin;
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
  padding: 0;
}

.controls svg {
  width: 4.5vmin;
  height: 4.5vmin;
}

.dots {
  display: flex;
  align-items: center;
  gap: 2vmin;
}

/* a dot is a small mark on a finger-sized button, not a small button */
.dots button {
  background: none;
}

/* the marks are the stage's ink, faded by opacity (a colour mixed from currentColor can keep the
   old theme's value on a live switch), so they read on both stages */
.dots button::before {
  content: '';
  width: 2vmin;
  height: 2vmin;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.55;
  transition: width 0.3s, background 0.3s, opacity 0.3s;
}

/* the current one is a longer pill, in the zone's violet: 3:1 and over on both stages */
.dots button[aria-current='true']::before {
  width: 4.5vmin;
  background: #6a45f5;
  opacity: 1;
}`,
    js: `const cube = document.querySelector('.cube');
const row = document.querySelector('.controls .row');
const out = document.querySelector('output');
const dots = [...document.querySelectorAll('[data-go]')];
const slides = ['Dawn', 'Reef', 'Dusk', 'Night'];
const n = slides.length;
let index = 0; // unbounded: …, -1, 0, 1, 2, … 7, 8, …

function render() {
  const current = ((index % n) + n) % n;
  // face k sits at +90° × k around the cube, so showing it means turning by -90° × k
  cube.style.setProperty('--angle', index * -90 + 'deg');
  out.textContent = '0' + (current + 1) + ' · ' + slides[current];
  dots.forEach((d, i) => d.setAttribute('aria-current', String(i === current)));
}

row.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.dir) {
    index += Number(btn.dataset.dir);
  } else if (btn.dataset.go) {
    const current = ((index % n) + n) % n;
    let delta = (Number(btn.dataset.go) - current + n) % n; // 0…3 steps forward
    if (delta > n / 2) delta -= n; // "3 forward" is really "1 back"
    index += delta;
  }
  render();
});

render();`,
  },

  pricing: {
    how: [
      'Three static <b>columns</b> tile the container and catch the pointer; the cards inside are <code>pointer-events: none</code> so hovering never lands on a card mid-turn.',
      'The outer two cards start <code>rotateY</code>-ed toward the middle one (an arc, not a flat row) and sit a touch further back on Z so the featured card can stand in front of them at rest.',
      'Emphasis comes from <code>translateZ</code>, not <code>scale()</code> — pushing a card toward the camera through real perspective grows it more convincingly at the edges than scaling flatly would.',
      'The active card\'s rule sets <code>--ry: 0deg</code> along with the position, so turning to face you and stepping forward happen as one interpolated transform, not two separate motions.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, text included, so the row of plans is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="pricing">
    <div class="slot" tabindex="0">
      <div class="card"><small>Solo</small><b><sup>$</sup>9</b><span></span><span></span><span></span><em>Start</em></div>
    </div>
    <div class="slot" tabindex="0">
      <div class="card"><small>Team</small><b><sup>$</sup>29</b><span></span><span></span><span></span><em>Popular</em></div>
    </div>
    <div class="slot" tabindex="0">
      <div class="card"><small>Org</small><b><sup>$</sup>99</b><span></span><span></span><span></span><em>Talk</em></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the plans are the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.32vmin;
  perspective: calc(800 * var(--u));
}

/* same hit-target trick as any hover demo in 3D: static columns catch the pointer,
   the cards inside are pointer-events: none and free to turn and come forward */
.pricing {
  display: flex;
  width: calc(210 * var(--u));
  height: calc(168 * var(--u));
  /* the shadows under the cards and a card stepping forward both reach down, not up: lift the row
     by that much, so what it draws is centred */
  translate: 0 calc(-13 * var(--u));
  transform-style: preserve-3d;
  pointer-events: none;
}

.slot {
  --c: #8b6cff;
  position: relative;
  flex: 1;
  outline: none;
  cursor: pointer;
  pointer-events: auto;
  transform-style: preserve-3d;
}

/* the arc: outer cards turn to face the centre and stand a little further back... */
.slot:nth-child(1) { --ry: 32deg;  --x: calc(5 * var(--u));  --z: calc(-14 * var(--u)); }
.slot:nth-child(3) { --c: #2ee6d6; --ry: -32deg; --x: calc(-5 * var(--u)); --z: calc(-14 * var(--u)); }
/* ...the middle one stands in front */
.slot:nth-child(2) { --c: #ff4d9d; --y: calc(-6 * var(--u)); --z: calc(34 * var(--u)); }

.card {
  position: absolute;
  top: calc(14 * var(--u));
  left: calc(50% - 33 * var(--u));
  display: grid;
  align-content: start;
  justify-items: center;
  gap: calc(6 * var(--u));
  width: calc(66 * var(--u));
  height: calc(140 * var(--u));
  padding: calc(10 * var(--u)) calc(7 * var(--u));
  border: calc(1 * var(--u)) solid color-mix(in srgb, var(--c) 70%, transparent);
  border-radius: calc(12 * var(--u));
  background: linear-gradient(
    170deg,
    color-mix(in srgb, var(--c) 30%, #141830),
    color-mix(in srgb, var(--c) 8%, #141830)
  );
  box-shadow:
    inset 0 0 calc(18 * var(--u)) color-mix(in srgb, var(--c) 22%, transparent),
    0 calc(14 * var(--u)) calc(18 * var(--u)) calc(-14 * var(--u)) #000;
  color: #eceefb;
  text-align: center;
  pointer-events: none;
  transform: translate3d(var(--x, 0), var(--y, 0), var(--z, 0)) rotateY(var(--ry, 0deg));
  transition: transform 0.45s cubic-bezier(0.3, 1.3, 0.5, 1);
}

/* plan name */
.card small {
  color: var(--c);
  font-size: calc(8 * var(--u));
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* price */
.card b {
  font-size: calc(21 * var(--u));
  line-height: 1;
}

.card b sup {
  font-size: calc(10 * var(--u));
  vertical-align: calc(7 * var(--u));
}

/* feature lines */
.card span {
  width: 100%;
  height: calc(4 * var(--u));
  border-radius: calc(2 * var(--u));
  background: color-mix(in srgb, #eceefb 22%, transparent);
}

.card span:nth-of-type(2) { width: 78%; }
.card span:nth-of-type(3) { width: 58%; }

/* call to action */
.card em {
  align-self: end;
  width: 100%;
  margin-top: calc(8 * var(--u));
  padding: calc(4 * var(--u)) 0;
  border-radius: calc(99 * var(--u));
  background: var(--c);
  color: #fff;
  font-size: calc(8 * var(--u));
  font-style: normal;
  font-weight: 800;
}

/* the featured plan is filled instead of glassy */
.slot:nth-child(2) .card {
  border-color: var(--c);
  background: linear-gradient(170deg, color-mix(in srgb, var(--c) 70%, #141830), color-mix(in srgb, #8b6cff 45%, #141830));
  color: #fff;
}

.slot:nth-child(2) .card small { color: #fff; }
.slot:nth-child(2) .card span { background: rgb(255 255 255 / 0.4); }
.slot:nth-child(2) .card em { background: #fff; color: #2a1030; }

/* white on teal is hard to read */
.slot:nth-child(3) .card em {
  color: #06222a;
}

/* active card: square to the viewer and well in front of the other two */
.pricing .slot:is(:hover, :focus-visible) {
  --x: 0;
  --y: calc(-4 * var(--u));
  --z: calc(84 * var(--u));
  --ry: 0deg;
}`,
  },

  cubeloader: {
    how: [
      'All four flaps are the <b>same</b> top-left quadrant, just turned around the loader\'s centre in 90° steps with <code>rotateZ(calc(var(--i) * 90deg))</code> — one keyframe animation drives all four.',
      'The flap is hinged on the corner that touches the centre: <code>transform-origin: calc(100% + 2 * var(--u)) calc(100% + 2 * var(--u))</code>, just outside its own corner — <code>--u</code> is the one base unit every length here is a multiple of.',
      'A <b>negative</b> <code>animation-delay</code> (<code>calc(var(--i) * 0.3s - 1.65s)</code>) starts each flap already part-way through the cycle instead of waiting its turn, which is what makes the four look like they are chasing each other. The 1.65s is picked so that at the very first frame all four are lying in their rest window (25–75%), so a paused card shows the whole square, not two flaps mid-chase.',
      'Both ends of the keyframe are <code>opacity: 0</code>, so the fold-in and fold-out happen off-screen — the loop has no visible seam.',
      'Laying the whole thing flat with <code>rotateX(44deg) rotateZ(45deg)</code> turns a normally flat spinner into flaps that visibly stand up off a floor. The <code>rotateZ</code> already makes the plate √2 as wide as it is deep, so the tilt stays well off a true isometric 58° — otherwise the spinner would read as a wide, flat smear.',
    ],
    html: `<div class="scene">
  <div class="cubeloader" role="img" aria-label="Loading">
    <i style="--i:0;--c:#8b6cff"></i>
    <i style="--i:1;--c:#ff4d9d"></i>
    <i style="--i:2;--c:#2ee6d6"></i>
    <i style="--i:3;--c:#ffb547"></i>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the spinner is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.62vmin;
  perspective: calc(800 * var(--u));
}

/* the classic "folding cube" spinner, but laid on a floor in real perspective so the flaps
   genuinely stand up out of the plane while they fold. The tilt is 44°, not the 58° of a true
   isometric floor: turned 45° in its own plane the plate is already √2 as wide as it is deep, and
   a flatter camera would leave the whole thing too short to read. */
.cubeloader {
  --s: calc(92 * var(--u));
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  transform: rotateX(44deg) rotateZ(45deg);
}

/* the floor plate */
.cubeloader::before {
  content: '';
  position: absolute;
  inset: calc(-9 * var(--u));
  border: calc(1 * var(--u)) dashed rgb(140 150 220 / 0.34);
  border-radius: calc(12 * var(--u));
  background: color-mix(in srgb, #8b6cff 9%, transparent);
  transform: translateZ(calc(-1 * var(--u)));
}

/* all four quadrants are the SAME top-left square, turned around the loader's centre in
   90° steps (--i = 0…3), so one keyframe animation serves all four */
.cubeloader i {
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 50%;
  transform-origin: 100% 100%;
  transform: rotateZ(calc(var(--i) * 90deg));
  transform-style: preserve-3d;
}

/* the flap, hinged on the corner that touches the loader's centre */
.cubeloader i::before {
  content: '';
  position: absolute;
  inset: calc(2 * var(--u));
  border-radius: calc(5 * var(--u));
  transform-origin: calc(100% + 2 * var(--u)) calc(100% + 2 * var(--u));
  /* a negative delay starts each flap part-way through: no waiting, and the four run in a chase.
     At the first frame flap 0 is 69% through and flap 3 31%: all four resting, the square whole */
  animation: cubeloader-fold 2.4s ease-in-out calc(var(--i) * 0.3s - 1.65s) infinite;
  background: color-mix(in srgb, var(--c) 45%, transparent);
  border: calc(1 * var(--u)) solid color-mix(in srgb, var(--c) 75%, transparent);
  box-shadow: inset 0 0 calc(24 * var(--u)) color-mix(in srgb, var(--c) 30%, transparent);
}

/* fold in over the bottom edge, rest, fold out over the right edge. Both ends are invisible,
   so the loop has no seam. Both functions appear in every keyframe so the browser interpolates
   the two angles separately instead of blending matrices */
@keyframes cubeloader-fold {
  0%,
  10% {
    opacity: 0;
    transform: rotateX(-180deg) rotateY(0deg);
  }

  25%,
  75% {
    opacity: 1;
    transform: rotateX(0deg) rotateY(0deg);
  }

  90%,
  100% {
    opacity: 0;
    transform: rotateX(0deg) rotateY(180deg);
  }
}`,
  },

  rings: {
    how: [
      'A ring is a circle whose border is transparent except <code>border-top-color</code> and <code>border-bottom-color</code> — two arcs on opposite sides, no SVG needed.',
      'Each ring composes three rotations in one keyframe: <code>rotateZ(tilt)</code> picks the axis it tumbles around, <code>rotateX</code> does the tumble, and a trailing <code>rotateZ(spin)</code> chases the arcs around the ring as it tumbles — order matters, read it right to left.',
      'One <code>@keyframes</code> block serves all three rings: <code>var(--tilt)</code> and <code>var(--spin)</code> inside the keyframe let each ring plug in its own numbers.',
      '<code>--spin</code> is always a whole number of turns (720deg, -720deg, 1080deg) so the ring\'s rotation ends exactly where it started — that is what makes the loop seamless.',
      'The core is a plain breathing <code>radial-gradient</code>, no blur or filter, which keeps the whole loader cheap to animate.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the rings are 132, 100 and 68 units across, so the loader is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="rings" role="img" aria-label="Loading">
    <b></b>
    <i></i>
    <i></i>
    <i></i>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the loader is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.42vmin;
  perspective: calc(800 * var(--u));
}

.rings {
  display: grid;
  place-items: center;
  width: calc(140 * var(--u));
  height: calc(140 * var(--u));
  transform-style: preserve-3d;
}

/* glowing core: a plain radial gradient (no blur, no filter), gently breathing */
.rings b {
  grid-area: 1 / 1;
  width: calc(70 * var(--u));
  height: calc(70 * var(--u));
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #fff 0 9%,
    #2ee6d6 20%,
    color-mix(in srgb, #2ee6d6 35%, transparent) 38%,
    transparent 68%
  );
  animation: rings-core 1.4s ease-in-out infinite alternate;
}

/* a ring is a circle whose border is transparent except top and bottom: two arcs on opposite
   sides, tapering at the ends, that chase each other as the ring spins in its own plane */
.rings i {
  position: relative;
  grid-area: 1 / 1;
  width: var(--d);
  height: var(--d);
  border: calc(4 * var(--u)) solid transparent;
  border-top-color: var(--c);
  border-bottom-color: var(--c);
  border-radius: 50%;
  animation: rings-spin var(--t) linear var(--delay) infinite;
}

/* faint full track so the ring still reads when the arcs are edge-on */
.rings i::before {
  content: '';
  position: absolute;
  inset: calc(-3 * var(--u));
  border: calc(1 * var(--u)) solid color-mix(in srgb, var(--c) 28%, transparent);
  border-radius: 50%;
}

/* --tilt picks the axis the ring tumbles around (0 = X, 90 = Y, 45 = the diagonal),
   --spin is how far the arcs travel around the ring per tumble (whole turns only → seamless) */
.rings i:nth-of-type(1) { --d: calc(132 * var(--u)); --c: #8b6cff; --tilt: 0deg;  --spin: 720deg;  --t: 3.6s; --delay: -0.5s; }
.rings i:nth-of-type(2) { --d: calc(100 * var(--u)); --c: #ff4d9d; --tilt: 90deg; --spin: -720deg; --t: 2.8s; --delay: -1.3s; }
.rings i:nth-of-type(3) { --d: calc(68 * var(--u));  --c: #ffb547; --tilt: 45deg; --spin: 1080deg; --t: 2.2s; --delay: -0.2s; }

/* read right to left: spin the arcs in the ring's plane, tumble the plane around X,
   then turn that X axis to wherever --tilt says */
@keyframes rings-spin {
  from {
    transform: rotateZ(var(--tilt)) rotateX(0deg) rotateZ(0deg);
  }

  to {
    transform: rotateZ(var(--tilt)) rotateX(360deg) rotateZ(var(--spin));
  }
}

@keyframes rings-core {
  from {
    opacity: 0.7;
    transform: scale(0.85);
  }

  to {
    opacity: 1;
    transform: scale(1.1);
  }
}`,
  },

  equalizer: {
    how: [
      'Each bar is a real cuboid: a front wall, a right wall and a lid, all sized once and never resized again — only <code>transform</code> ever changes.',
      'The walls are squashed with <code>scaleY()</code> from a <code>transform-origin: bottom center</code>, so growing or shrinking a bar never touches layout — it is one compositor-only transform.',
      'The lid rides <code>translateY</code> down by exactly the height the walls lost (<code>var(--h) * (1 - level)</code>), so it always stays glued to the top of the shrinking walls instead of floating.',
      'All three faces\' keyframes share the exact same percentage stops and easing — that shared timing is what keeps the lid and both walls moving as one solid box instead of drifting apart.',
      'Each bar gets its own hue, delay and duration so neighbours never bounce in sync, which is what sells it as a real audio meter instead of one shape copy-pasted seven times.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the meter is the same share of a gallery card, the editor and a recording canvas. A bar’s full height is a plain number in the markup (<code>--hn</code>), which CSS multiplies by <code>--u</code>: one number per bar, and the unit still decides the size.',
    ],
    html: `<div class="scene">
  <div class="equalizer" role="img" aria-label="Equalizer animation">
    <div class="bar" style="--hn:70"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:96"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:118"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:88"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:108"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:80"><i></i><i></i><i></i></div>
    <div class="bar" style="--hn:60"><i></i><i></i><i></i></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the meter is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.41vmin;
  perspective: calc(800 * var(--u));
}

.equalizer {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: calc(8 * var(--u));
  height: calc(120 * var(--u));
  transform-style: preserve-3d;
  transform: translateY(calc(-11 * var(--u))) rotateX(-20deg) rotateY(-30deg);
}

/* glass floor: a strip centred on the bottom edge, laid flat */
.equalizer::before {
  content: '';
  position: absolute;
  right: calc(-12 * var(--u));
  bottom: calc(-22 * var(--u));
  left: calc(-12 * var(--u));
  height: calc(44 * var(--u));
  border-radius: calc(8 * var(--u));
  transform: rotateX(90deg);
  background: color-mix(in srgb, #8b6cff 12%, transparent);
  border: calc(1 * var(--u)) solid color-mix(in srgb, #8b6cff 75%, transparent);
  box-shadow: inset 0 0 calc(24 * var(--u)) color-mix(in srgb, #8b6cff 30%, transparent);
}

/* --hn is the bar's full height as a plain number (set in the markup). The box never changes
   size: the walls are squashed with scaleY from the bottom, and the lid rides down with
   translateY by exactly the amount the walls lost. Transforms only, zero layout. */
.bar {
  --h: calc(var(--hn) * var(--u));
  position: relative;
  width: calc(18 * var(--u));
  height: var(--h);
  transform-style: preserve-3d;
}

/* violet → teal across the row, with its own phase and tempo so neighbours never move together */
.bar:nth-child(1) { --hue: 265; --delay: -0.4s; --dur: 2.7s; }
.bar:nth-child(2) { --hue: 250; --delay: -1.6s; --dur: 2.2s; }
.bar:nth-child(3) { --hue: 235; --delay: -0.9s; --dur: 3.1s; }
.bar:nth-child(4) { --hue: 220; --delay: -2.3s; --dur: 2.35s; }
.bar:nth-child(5) { --hue: 205; --delay: -0.2s; --dur: 2.9s; }
.bar:nth-child(6) { --hue: 190; --delay: -1.3s; --dur: 2.25s; }
.bar:nth-child(7) { --hue: 175; --delay: -2s; --dur: 2.6s; }

.bar i {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(18 * var(--u));
  height: 100%;
  transform-origin: bottom center;
  animation: var(--dur) ease-in-out var(--delay) infinite;
}

/* front wall */
.bar i:nth-child(1) {
  background: linear-gradient(to top, hsl(var(--hue) 85% 45% / 0.92), hsl(var(--hue) 90% 68% / 0.92));
  transform: translateZ(calc(9 * var(--u)));
  animation-name: equalizer-front;
}

/* right wall, darker */
.bar i:nth-child(2) {
  background: linear-gradient(to top, hsl(var(--hue) 75% 28% / 0.92), hsl(var(--hue) 80% 46% / 0.92));
  transform: rotateY(90deg) translateZ(calc(9 * var(--u)));
  animation-name: equalizer-side;
}

/* lid: an 18 × 18 square laid flat on top, lightest */
.bar i:nth-child(3) {
  height: calc(18 * var(--u));
  background: hsl(var(--hue) 95% 80%);
  transform-origin: center;
  transform: rotateX(90deg) translateZ(calc(9 * var(--u)));
  animation-name: equalizer-lid;
}

/* the three animations share the same stops and easing, so walls and lid stay glued together */
@keyframes equalizer-front {
  0%   { transform: translateZ(calc(9 * var(--u))) scaleY(0.18); }
  22%  { transform: translateZ(calc(9 * var(--u))) scaleY(1); }
  42%  { transform: translateZ(calc(9 * var(--u))) scaleY(0.5); }
  64%  { transform: translateZ(calc(9 * var(--u))) scaleY(0.86); }
  82%  { transform: translateZ(calc(9 * var(--u))) scaleY(0.34); }
  100% { transform: translateZ(calc(9 * var(--u))) scaleY(0.18); }
}

@keyframes equalizer-side {
  0%   { transform: rotateY(90deg) translateZ(calc(9 * var(--u))) scaleY(0.18); }
  22%  { transform: rotateY(90deg) translateZ(calc(9 * var(--u))) scaleY(1); }
  42%  { transform: rotateY(90deg) translateZ(calc(9 * var(--u))) scaleY(0.5); }
  64%  { transform: rotateY(90deg) translateZ(calc(9 * var(--u))) scaleY(0.86); }
  82%  { transform: rotateY(90deg) translateZ(calc(9 * var(--u))) scaleY(0.34); }
  100% { transform: rotateY(90deg) translateZ(calc(9 * var(--u))) scaleY(0.18); }
}

/* walls lost (1 - level) of the height at each stop: the lid drops by the same distance */
@keyframes equalizer-lid {
  0%   { transform: translateY(calc(var(--h) * 0.82)) rotateX(90deg) translateZ(calc(9 * var(--u))); }
  22%  { transform: translateY(calc(var(--h) * 0))    rotateX(90deg) translateZ(calc(9 * var(--u))); }
  42%  { transform: translateY(calc(var(--h) * 0.5))  rotateX(90deg) translateZ(calc(9 * var(--u))); }
  64%  { transform: translateY(calc(var(--h) * 0.14)) rotateX(90deg) translateZ(calc(9 * var(--u))); }
  82%  { transform: translateY(calc(var(--h) * 0.66)) rotateX(90deg) translateZ(calc(9 * var(--u))); }
  100% { transform: translateY(calc(var(--h) * 0.82)) rotateX(90deg) translateZ(calc(9 * var(--u))); }
}`,
  },
};
