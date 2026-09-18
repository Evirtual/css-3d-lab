/**
 * Paste-anywhere versions of batch D: card interactions and loaders.
 * Plain HTML + CSS (+ JS), no Sass, no build step — see docs/ADDING-DEMOS.md.
 */
import { CUBE_FACES, type Snippet } from './snippet-utils';

export const snippetsD: Record<string, Snippet> = {
  hovercards: {
    how: [
      'Three <b>slots</b> are the hit targets, tiled edge to edge; the cards inside them are <code>pointer-events: none</code> so the pointer always lands on a slot, never on a moving card.',
      'Every state a card can be in — resting, dimmed, leaning left, leaning right, active — only changes a handful of custom properties fed into <b>one</b> <code>transform</code>.',
      '<code>:has()</code> answers "is a later sibling hovered?" so the cards <i>before</i> the active one can lean away too, not just the ones after it.',
      'Each card rests at a different <code>translateZ</code> so the overlapping fan never z-fights, and the active card jumps to the front on top of that.',
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
  perspective: 800px;
}

.fan {
  display: flex;
  width: 156px;
  height: 132px;
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
.fan-slot:nth-child(1) { --r: -8deg; --z: 0px; }
.fan-slot:nth-child(2) { --r: 0deg;  --z: 12px; }
.fan-slot:nth-child(3) { --r: 8deg;  --z: 24px; }

.fan-card {
  position: absolute;
  top: 6px;
  left: calc(50% - 42px);
  display: grid;
  align-content: start;
  gap: 6px;
  width: 84px;
  height: 120px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--c) 70%, transparent);
  border-radius: 11px;
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--c) 46%, #141830),
    color-mix(in srgb, var(--c) 12%, #141830)
  );
  box-shadow: 0 12px 18px -12px #000;
  color: #eceefb;
  opacity: var(--o, 1);
  pointer-events: none;
  transform-origin: 50% 100%;
  /* one transform, fed by variables: every state below only ever changes numbers */
  transform: translate3d(var(--x, 0px), var(--y, 0px), var(--z)) rotateY(var(--ry, 0deg)) rotateZ(var(--r));
  transition:
    transform 0.45s cubic-bezier(0.3, 1.3, 0.5, 1),
    opacity 0.3s;
}

.fan-card i {
  display: block;
  height: 42px;
  border-radius: 6px;
  background:
    radial-gradient(circle at 70% 30%, rgb(255 255 255 / 0.55), transparent 45%),
    linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 40%, #000));
}

.fan-card b {
  font-size: 11px;
  line-height: 1;
}

.fan-card span {
  display: block;
  height: 4px;
  border-radius: 2px;
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
  --x: 16px;
  --ry: 26deg;
}

/* ...cards BEFORE it lean away to the left (:has() looks forward for a hovered sibling)... */
.fan-slot:has(~ .fan-slot:hover),
.fan-slot:has(~ .fan-slot:focus-visible) {
  --x: -16px;
  --ry: -26deg;
}

/* ...and the active one (this rule is last, so it wins) squares up and comes toward you */
.fan .fan-slot:is(:hover, :focus-visible) {
  --o: 1;
  --x: 0px;
  --y: -6px;
  --z: 80px;
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
      'Lifting with <code>translateZ(30px)</code> before the flip keeps the tile from clipping into its neighbours mid-turn.',
    ],
    html: `<div class="scene">
  <div class="grid">
    <div class="tile" tabindex="0" style="--c:#8b6cff">
      <div class="tile-inner"><b>01</b><span>tilt</span></div>
    </div>
    <div class="tile" tabindex="0" style="--c:#ff4d9d">
      <div class="tile-inner"><b>02</b><span>flip</span></div>
    </div>
    <div class="tile" tabindex="0" style="--c:#2ee6d6">
      <div class="tile-inner"><b>03</b><span>spin</span></div>
    </div>
    <div class="tile" tabindex="0" style="--c:#ffb547">
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
  perspective: 800px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 62px);
  gap: 9px;
  transform-style: preserve-3d;
  transform: rotateX(16deg);
  /* the grid and its tiles are coplanar: take the grid out of hit-testing so the
     pointer always resolves to a tile, never something ambiguous between them */
  pointer-events: none;
}

.tile {
  --flip: rotateY(180deg); /* odd tiles flip sideways */
  position: relative;
  height: 62px;
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
  border-radius: 10px;
  backface-visibility: hidden;
}

/* front */
.tile-inner b {
  color: #eceefb;
  font-size: 20px;
  font-weight: 900;
  background: color-mix(in srgb, var(--c) 26%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 75%, transparent);
  box-shadow: inset 0 0 24px color-mix(in srgb, var(--c) 30%, transparent);
}

/* back: pre-turned with the same rotation the tile will make, so it lands the right way up */
.tile-inner span {
  background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 45%, #000));
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  transform: var(--flip);
}

.tile:hover .tile-inner,
.tile:focus-visible .tile-inner {
  /* lift first (toward the viewer), then flip in place */
  transform: translateZ(30px) var(--flip);
}`,
  },

  accordion: {
    how: [
      'Real <code>&lt;input type="radio"&gt;</code>s (visually hidden, not <code>display: none</code>) drive the state — that keeps arrow-key navigation and screen readers working for free.',
      'A panel is a flap <b>hinged on its top edge</b>: <code>transform-origin: top center</code> plus <code>rotateX(-90deg)</code> to fold it flat, edge-on to the viewer, until its radio is checked.',
      'Nothing animates <code>height</code>. The frame has a fixed size; sections below the open one are pushed down with <code>translateY</code> by exactly one panel\'s height instead.',
      '<code>~</code> (general sibling) plus <code>:checked</code> lets one radio style both its own section <i>and</i> every section after it, all from CSS alone.',
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
  perspective: 800px;
}

.accordion {
  position: relative;
  width: 196px;
  height: 187px; /* 3 × (header 32px + gap 5px) + panel 71px */
  transform-style: preserve-3d;
  transform: rotateY(-18deg) rotateX(4deg);
}

/* real radios keep it keyboard-friendly (arrow keys move between sections); only hidden */
.accordion > input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.sec {
  position: absolute;
  top: calc(var(--i) * 37px);
  right: 0;
  left: 0;
  height: 32px;
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.accordion label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 12px;
  border: 1px solid rgb(140 150 220 / 0.34);
  border-radius: 9px;
  background: color-mix(in srgb, #8b6cff 14%, #141830);
  color: #eceefb;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
}

/* chevron */
.accordion label::after {
  content: '';
  width: 6px;
  height: 6px;
  border-right: 2px solid #949bc0;
  border-bottom: 2px solid #949bc0;
  transform: translateY(-2px) rotate(45deg);
  transition: transform 0.4s;
}

/* the flap: hinged on its top edge, folded back flat (edge-on to the viewer) until opened */
.panel {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  left: 0;
  height: 71px;
  padding: 9px 12px;
  border: 1px solid color-mix(in srgb, #2ee6d6 60%, transparent);
  border-radius: 9px;
  background: linear-gradient(180deg, color-mix(in srgb, #2ee6d6 26%, #141830), color-mix(in srgb, #8b6cff 16%, #141830));
  color: #eceefb;
  font-size: 11px;
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
  transform: translateY(1px) rotate(-135deg);
}

#acc-0:focus-visible ~ .sec:nth-of-type(1) label,
#acc-1:focus-visible ~ .sec:nth-of-type(2) label,
#acc-2:focus-visible ~ .sec:nth-of-type(3) label {
  outline: 2px solid #2ee6d6;
  outline-offset: 2px;
}

/* every section after the open one slides down by exactly one panel's height */
#acc-0:checked ~ .sec:nth-of-type(n + 2) {
  transform: translateY(76px);
}

#acc-1:checked ~ .sec:nth-of-type(n + 3) {
  transform: translateY(76px);
}`,
  },

  swipe: {
    how: [
      'Every card stores its position in the stack in <code>--p</code> (0 = top). CSS turns that into <b>real</b> depth with <code>translateZ(calc(var(--p) * -45px))</code> — perspective does the shrinking, no <code>scale()</code> needed.',
      'JS only ever writes numbers into custom properties (<code>--dx</code>, <code>--rot</code>...) while a <a><code>pointerdown</code>/<code>pointermove</code></a> drag is in progress; the CSS <code>transform</code> and <code>transition</code> do every bit of motion.',
      'While dragging, the card gets <code>transition: none</code> so it follows the finger 1:1; release it and the transition comes back, so it either springs home or flies off.',
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
  perspective: 800px;
}

.swipe {
  position: relative;
  width: 130px;
  height: 150px;
  outline: none;
  touch-action: pan-y; /* horizontal drags are ours, vertical ones still scroll the page */
  transform-style: preserve-3d;
  transform: translateY(-14px); /* the stack trails off downward: nudge it up to look centred */
}

.swipe:focus-visible i.is-top {
  outline: 2px solid #2ee6d6;
  outline-offset: 3px;
}

/* --p is the position in the stack (0 = top), written by JS. Depth is REAL: cards further
   back sit further away on Z, and the perspective makes them smaller — no scale() needed.
   --dx / --dy / --rot / --tilt follow the pointer while dragging. */
.swipe i {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: end;
  gap: 2px;
  padding: 12px;
  border: 1px solid hsl(var(--hue) 90% 78% / 0.7);
  border-radius: 14px;
  background:
    radial-gradient(circle at 75% 22%, rgb(255 255 255 / 0.5), transparent 32%),
    linear-gradient(160deg, hsl(var(--hue) 85% 64%), hsl(calc(var(--hue) + 40) 75% 34%));
  box-shadow: 0 14px 20px -14px #000;
  color: #fff;
  font-style: normal;
  opacity: calc(1 - var(--p) * 0.2);
  user-select: none;
  touch-action: pan-y;
  transform: translate3d(var(--dx, 0px), calc(var(--p) * 14px + var(--dy, 0px)), calc(var(--p) * -45px))
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

/* flying off: JS has set --dx far outside the deck, CSS does the flight */
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
  font-size: 17px;
  line-height: 1;
}

.swipe i small {
  font-size: 11px;
  opacity: 0.85;
}

/* LIKE / NOPE stamps, faded in by how far the card has been dragged */
.swipe i b {
  position: absolute;
  top: 12px;
  padding: 2px 6px;
  border: 2px solid currentcolor;
  border-radius: 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
}

.swipe i b:nth-of-type(1) {
  left: 10px;
  color: #7dffb0;
  opacity: var(--like, 0);
  transform: rotate(-14deg);
}

.swipe i b:nth-of-type(2) {
  right: 10px;
  color: #ffd0d8;
  opacity: var(--nope, 0);
  transform: rotate(14deg);
}`,
    js: `const root = document.querySelector('.swipe');
let order = [...root.querySelectorAll('i')];
let drag = null;
let busy = false;
let timer = 0;
const THRESHOLD = 60;

function layout(cards) {
  cards.forEach((el, p) => {
    el.style.setProperty('--p', String(p));
    el.classList.toggle('is-top', p === 0);
  });
}

function pose(card, dx, dy) {
  card.style.setProperty('--dx', dx.toFixed(1) + 'px');
  card.style.setProperty('--dy', dy.toFixed(1) + 'px');
  card.style.setProperty('--rot', (dx * 0.08).toFixed(2) + 'deg');
  card.style.setProperty('--tilt', (dx * 0.12).toFixed(2) + 'deg');
  card.style.setProperty('--like', Math.min(1, Math.max(0, dx / THRESHOLD)).toFixed(2));
  card.style.setProperty('--nope', Math.min(1, Math.max(0, -dx / THRESHOLD)).toFixed(2));
}

function unpose(card) {
  ['--dx', '--dy', '--rot', '--tilt', '--like', '--nope'].forEach((p) => card.style.removeProperty(p));
}

function fling(dir, dy) {
  if (busy) return;
  busy = true;
  const card = order[0];
  const rest = order.slice(1);
  card.classList.remove('is-top');
  card.classList.add('is-leaving');
  pose(card, dir * 260, dy || 0);
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
  // screen pixels → CSS pixels (in case the page scales the deck)
  const scale = root.getBoundingClientRect().width / root.offsetWidth || 1;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, scale, dx: 0 };
  order[0].classList.add('is-dragging');
}

function move(e) {
  if (!drag || e.pointerId !== drag.id) return;
  drag.dx = (e.clientX - drag.x) / drag.scale;
  pose(order[0], drag.dx, ((e.clientY - drag.y) / drag.scale) * 0.4);
}

function up(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const { dx, scale, y } = drag;
  drag = null;
  const card = order[0];
  card.classList.remove('is-dragging');
  if (e.type === 'pointerup' && Math.abs(dx) > THRESHOLD) {
    fling(Math.sign(dx), ((e.clientY - y) / scale) * 0.4);
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
  perspective: 800px;
}

.table {
  display: grid;
  grid-template-columns: repeat(2, 100px);
  grid-auto-rows: 80px;
  transform-style: preserve-3d;
  transform: translateY(12px) rotateX(24deg); /* how far the "table" leans back */
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
.slot:nth-child(1) { --x: 15px;  --y: 9px;   --z: 2px;  --r: -10deg; }
.slot:nth-child(2) { --x: -12px; --y: 5px;   --z: 6px;  --r: 7deg; }
.slot:nth-child(3) { --x: 11px;  --y: -8px;  --z: 10px; --r: 5deg; }
.slot:nth-child(4) { --x: -15px; --y: -10px; --z: 14px; --r: -8deg; }

/* contact shadow: stays on the table and fades as the photo lifts */
.slot::before {
  content: '';
  position: absolute;
  top: calc(50% - 44px);
  left: calc(50% - 36px);
  width: 72px;
  height: 88px;
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
  transform: translate(0, 10px) rotateZ(0deg) scale(1.15);
}

.photo {
  position: absolute;
  top: calc(50% - 44px);
  left: calc(50% - 36px);
  width: 72px;
  height: 88px;
  padding: 5px 5px 0;
  border-radius: 3px;
  background: linear-gradient(170deg, #fbf9f4, #e6e1d6);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.5);
  pointer-events: none;
  /* same function list in both states, so the browser interpolates number by number */
  transform: translate3d(var(--x), var(--y), var(--z)) rotateX(0deg) rotateZ(var(--r)) scale(1);
  transition: transform 0.5s cubic-bezier(0.3, 1.3, 0.5, 1);
}

.photo i {
  display: block;
  height: 62px;
  border-radius: 1px;
}

.photo small {
  display: block;
  color: #4a4658;
  font-size: 8px;
  font-weight: 600;
  line-height: 21px;
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
  transform: translate3d(0px, 6px, 52px) rotateX(-24deg) rotateZ(0deg) scale(1.1);
}`,
  },

  cubenav: {
    how: [
      'JS keeps one <b>unbounded</b> counter (…, -1, 0, 1, 2, … 7, 8, …), never a value clamped to 0-3. CSS just multiplies it: <code>rotateY(calc(index * -90deg))</code>.',
      'Because the angle only ever grows or shrinks, Next always turns the same way — it never has to unwind back through 360° when it wraps from slide 4 to slide 1.',
      'For the dot buttons, JS picks the <b>shortest</b> path: <code>((target − current + 4) % 4)</code> gives 0-3 steps forward; if that is more than half way around, subtracting 4 makes it a few steps backward instead.',
      'The cube is pulled back with <code>translateZ(calc(-s / 2))</code> so whichever face is turned to the front sits exactly at <code>z = 0</code> and renders at its true size, not shrunk by the perspective.',
      'Only <code>transform</code> is transitioned, so the turn runs on the compositor and stays smooth however fast you click.',
    ],
    html: `<div class="cubenav">
  <div class="view">
    <div class="cube">
      <i style="--hue:28">Dawn<small>01</small></i>
      <i style="--hue:178">Reef<small>02</small></i>
      <i style="--hue:300">Dusk<small>03</small></i>
      <i style="--hue:240">Night<small>04</small></i>
      <i></i>
      <i></i>
    </div>
  </div>
  <div class="bar">
    <button type="button" data-dir="-1">Prev</button>
    <span class="dots">
      <button type="button" data-go="0" aria-label="Go to Dawn"></button>
      <button type="button" data-go="1" aria-label="Go to Reef"></button>
      <button type="button" data-go="2" aria-label="Go to Dusk"></button>
      <button type="button" data-go="3" aria-label="Go to Night"></button>
    </span>
    <button type="button" data-dir="1">Next</button>
    <output>1 / 4 · Dawn</output>
  </div>
</div>`,
    css: `.cubenav {
  display: grid;
  grid-template-rows: 1fr auto;
  width: 320px;
  height: 260px;
  padding: 10px 14px;
}

.view {
  display: grid;
  place-items: center;
  perspective: 700px;
}

.cube {
  --s: 116px;
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  /* Read right to left: spin on the vertical axis by --angle (JS only ever adds or subtracts
     90° steps, it never wraps back to 0), tip the top toward the viewer a little, then pull the
     whole cube back by half a side so the front face sits at z = 0 and stays its true size. */
  transform: translateZ(calc(var(--s) / -2)) rotateX(-14deg) rotateY(var(--angle, 0deg));
  transition: transform 0.8s cubic-bezier(0.3, 1.2, 0.5, 1);
}

${CUBE_FACES}

.cube i {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: end;
  padding: 10px;
  border: 1px solid hsl(var(--hue) 90% 80% / 0.6);
  border-radius: 10px;
  background:
    radial-gradient(circle at 72% 26%, rgb(255 255 255 / 0.55) 0 9%, transparent 10%),
    linear-gradient(165deg, hsl(var(--hue) 85% 66%), hsl(calc(var(--hue) + 45) 70% 30%));
  color: #fff;
  font-size: 15px;
  font-style: normal;
  font-weight: 800;
  line-height: 1.1;
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

/* rounded faces leave a hole where their corners meet: a plate just behind each face plugs it */
.cube i::before {
  content: '';
  position: absolute;
  inset: 6px;
  background: hsl(var(--hue) 60% 24%);
  transform: translateZ(-6px);
}

.cube i small {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.8;
}

/* top and bottom caps */
.cube i:nth-child(n + 5) {
  --hue: 250;
  border-color: rgb(140 150 220 / 0.34);
  background: color-mix(in srgb, #8b6cff 30%, #141830);
}

.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.bar button {
  padding: 5px 12px;
  border: 0;
  border-radius: 8px;
  background: #8b6cff;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.bar output {
  margin-left: auto;
  color: #949bc0;
  white-space: nowrap;
}

.dots {
  display: flex;
  gap: 6px;
}

.dots button {
  width: 10px;
  height: 10px;
  padding: 0;
  border: 1px solid rgb(140 150 220 / 0.34);
  border-radius: 50%;
  background: transparent;
}

.dots button[aria-current='true'] {
  border-color: #2ee6d6;
  background: #2ee6d6;
}`,
    js: `const cube = document.querySelector('.cube');
const bar = document.querySelector('.bar');
const out = document.querySelector('output');
const dots = [...document.querySelectorAll('[data-go]')];
const slides = ['Dawn', 'Reef', 'Dusk', 'Night'];
const n = slides.length;
let index = 0; // unbounded: …, -1, 0, 1, 2, … 7, 8, …

function render() {
  const current = ((index % n) + n) % n;
  // face k sits at +90° × k around the cube, so showing it means turning by -90° × k
  cube.style.setProperty('--angle', index * -90 + 'deg');
  out.textContent = (current + 1) + ' / ' + n + ' · ' + slides[current];
  dots.forEach((d, i) => d.setAttribute('aria-current', String(i === current)));
}

bar.addEventListener('click', (e) => {
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
  perspective: 800px;
}

/* same hit-target trick as any hover demo in 3D: static columns catch the pointer,
   the cards inside are pointer-events: none and free to turn and come forward */
.pricing {
  display: flex;
  width: 210px;
  height: 168px;
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
.slot:nth-child(1) { --ry: 32deg;  --x: 5px;  --z: -14px; }
.slot:nth-child(3) { --c: #2ee6d6; --ry: -32deg; --x: -5px; --z: -14px; }
/* ...the middle one stands in front */
.slot:nth-child(2) { --c: #ff4d9d; --y: -6px; --z: 34px; }

.card {
  position: absolute;
  top: 14px;
  left: calc(50% - 33px);
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 6px;
  width: 66px;
  height: 140px;
  padding: 10px 7px;
  border: 1px solid color-mix(in srgb, var(--c) 70%, transparent);
  border-radius: 12px;
  background: linear-gradient(
    170deg,
    color-mix(in srgb, var(--c) 30%, #141830),
    color-mix(in srgb, var(--c) 8%, #141830)
  );
  box-shadow:
    inset 0 0 18px color-mix(in srgb, var(--c) 22%, transparent),
    0 14px 18px -14px #000;
  color: #eceefb;
  text-align: center;
  pointer-events: none;
  transform: translate3d(var(--x, 0px), var(--y, 0px), var(--z, 0px)) rotateY(var(--ry, 0deg));
  transition: transform 0.45s cubic-bezier(0.3, 1.3, 0.5, 1);
}

/* plan name */
.card small {
  color: var(--c);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* price */
.card b {
  font-size: 21px;
  line-height: 1;
}

.card b sup {
  font-size: 10px;
  vertical-align: 7px;
}

/* feature lines */
.card span {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, #eceefb 22%, transparent);
}

.card span:nth-of-type(2) { width: 78%; }
.card span:nth-of-type(3) { width: 58%; }

/* call to action */
.card em {
  align-self: end;
  width: 100%;
  margin-top: 8px;
  padding: 4px 0;
  border-radius: 99px;
  background: var(--c);
  color: #fff;
  font-size: 8px;
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
  --x: 0px;
  --y: -4px;
  --z: 84px;
  --ry: 0deg;
}`,
  },

  cubeloader: {
    how: [
      'All four flaps are the <b>same</b> top-left quadrant, just turned around the loader\'s centre in 90° steps with <code>rotateZ(calc(var(--i) * 90deg))</code> — one keyframe animation drives all four.',
      'The flap is hinged on the corner that touches the centre: <code>transform-origin: calc(100% + 2px) calc(100% + 2px)</code>, just outside its own corner.',
      'A <b>negative</b> <code>animation-delay</code> (<code>calc(var(--i) * 0.3s - 2.4s)</code>) starts each flap already part-way through the cycle instead of waiting its turn, which is what makes the four look like they are chasing each other.',
      'Both ends of the keyframe are <code>opacity: 0</code>, so the fold-in and fold-out happen off-screen — the loop has no visible seam.',
      'Laying the whole thing flat with <code>rotateX(58deg) rotateZ(45deg)</code> turns a normally flat spinner into flaps that visibly stand up off a floor.',
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
  perspective: 800px;
}

/* the classic "folding cube" spinner, but laid on a floor in real perspective so the flaps
   genuinely stand up out of the plane while they fold */
.cubeloader {
  --s: 92px;
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  transform: rotateX(58deg) rotateZ(45deg);
}

/* the floor plate */
.cubeloader::before {
  content: '';
  position: absolute;
  inset: -9px;
  border: 1px dashed rgb(140 150 220 / 0.34);
  border-radius: 12px;
  background: color-mix(in srgb, #8b6cff 9%, transparent);
  transform: translateZ(-1px);
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
  inset: 2px;
  border-radius: 5px;
  transform-origin: calc(100% + 2px) calc(100% + 2px);
  /* a negative delay starts each flap part-way through: no waiting, and the four run in a chase */
  animation: cubeloader-fold 2.4s ease-in-out calc(var(--i) * 0.3s - 2.4s) infinite;
  background: color-mix(in srgb, var(--c) 45%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 75%, transparent);
  box-shadow: inset 0 0 24px color-mix(in srgb, var(--c) 30%, transparent);
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
  perspective: 800px;
}

.rings {
  display: grid;
  place-items: center;
  width: 140px;
  height: 140px;
  transform-style: preserve-3d;
}

/* glowing core: a plain radial gradient (no blur, no filter), gently breathing */
.rings b {
  grid-area: 1 / 1;
  width: 70px;
  height: 70px;
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
  border: 4px solid transparent;
  border-top-color: var(--c);
  border-bottom-color: var(--c);
  border-radius: 50%;
  animation: rings-spin var(--t) linear var(--delay) infinite;
}

/* faint full track so the ring still reads when the arcs are edge-on */
.rings i::before {
  content: '';
  position: absolute;
  inset: -3px;
  border: 1px solid color-mix(in srgb, var(--c) 28%, transparent);
  border-radius: 50%;
}

/* --tilt picks the axis the ring tumbles around (0 = X, 90 = Y, 45 = the diagonal),
   --spin is how far the arcs travel around the ring per tumble (whole turns only → seamless) */
.rings i:nth-of-type(1) { --d: 132px; --c: #8b6cff; --tilt: 0deg;  --spin: 720deg;  --t: 3.6s; --delay: -0.5s; }
.rings i:nth-of-type(2) { --d: 100px; --c: #ff4d9d; --tilt: 90deg; --spin: -720deg; --t: 2.8s; --delay: -1.3s; }
.rings i:nth-of-type(3) { --d: 68px;  --c: #ffb547; --tilt: 45deg; --spin: 1080deg; --t: 2.2s; --delay: -0.2s; }

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
  perspective: 800px;
}

.equalizer {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 120px;
  transform-style: preserve-3d;
  transform: translateY(6px) rotateX(-20deg) rotateY(-30deg);
}

/* glass floor: a strip centred on the bottom edge, laid flat */
.equalizer::before {
  content: '';
  position: absolute;
  right: -12px;
  bottom: -22px;
  left: -12px;
  height: 44px;
  border-radius: 8px;
  transform: rotateX(90deg);
  background: color-mix(in srgb, #8b6cff 12%, transparent);
  border: 1px solid color-mix(in srgb, #8b6cff 75%, transparent);
  box-shadow: inset 0 0 24px color-mix(in srgb, #8b6cff 30%, transparent);
}

/* --hn is the bar's full height as a plain number (set in the markup). The box never changes
   size: the walls are squashed with scaleY from the bottom, and the lid rides down with
   translateY by exactly the amount the walls lost. Transforms only, zero layout. */
.bar {
  --h: calc(var(--hn) * 1px);
  position: relative;
  width: 18px;
  height: var(--h);
  transform-style: preserve-3d;
}

/* violet → teal across the row, with its own phase and tempo so neighbours never move together */
.bar:nth-child(1) { --hue: 265; --delay: -0.2s; --dur: 1.5s; }
.bar:nth-child(2) { --hue: 250; --delay: -0.9s; --dur: 1.2s; }
.bar:nth-child(3) { --hue: 235; --delay: -0.5s; --dur: 1.7s; }
.bar:nth-child(4) { --hue: 220; --delay: -1.3s; --dur: 1.3s; }
.bar:nth-child(5) { --hue: 205; --delay: -0.1s; --dur: 1.6s; }
.bar:nth-child(6) { --hue: 190; --delay: -0.7s; --dur: 1.25s; }
.bar:nth-child(7) { --hue: 175; --delay: -1.1s; --dur: 1.45s; }

.bar i {
  position: absolute;
  top: 0;
  left: 0;
  width: 18px;
  height: 100%;
  transform-origin: bottom center;
  animation: var(--dur) ease-in-out var(--delay) infinite;
}

/* front wall */
.bar i:nth-child(1) {
  background: linear-gradient(to top, hsl(var(--hue) 85% 45% / 0.92), hsl(var(--hue) 90% 68% / 0.92));
  transform: translateZ(9px);
  animation-name: equalizer-front;
}

/* right wall, darker */
.bar i:nth-child(2) {
  background: linear-gradient(to top, hsl(var(--hue) 75% 28% / 0.92), hsl(var(--hue) 80% 46% / 0.92));
  transform: rotateY(90deg) translateZ(9px);
  animation-name: equalizer-side;
}

/* lid: an 18 × 18 square laid flat on top, lightest */
.bar i:nth-child(3) {
  height: 18px;
  background: hsl(var(--hue) 95% 80%);
  transform-origin: center;
  transform: rotateX(90deg) translateZ(9px);
  animation-name: equalizer-lid;
}

/* the three animations share the same stops and easing, so walls and lid stay glued together */
@keyframes equalizer-front {
  0%   { transform: translateZ(9px) scaleY(0.18); }
  22%  { transform: translateZ(9px) scaleY(1); }
  42%  { transform: translateZ(9px) scaleY(0.5); }
  64%  { transform: translateZ(9px) scaleY(0.86); }
  82%  { transform: translateZ(9px) scaleY(0.34); }
  100% { transform: translateZ(9px) scaleY(0.18); }
}

@keyframes equalizer-side {
  0%   { transform: rotateY(90deg) translateZ(9px) scaleY(0.18); }
  22%  { transform: rotateY(90deg) translateZ(9px) scaleY(1); }
  42%  { transform: rotateY(90deg) translateZ(9px) scaleY(0.5); }
  64%  { transform: rotateY(90deg) translateZ(9px) scaleY(0.86); }
  82%  { transform: rotateY(90deg) translateZ(9px) scaleY(0.34); }
  100% { transform: rotateY(90deg) translateZ(9px) scaleY(0.18); }
}

/* walls lost (1 - level) of the height at each stop: the lid drops by the same distance */
@keyframes equalizer-lid {
  0%   { transform: translateY(calc(var(--h) * 0.82)) rotateX(90deg) translateZ(9px); }
  22%  { transform: translateY(calc(var(--h) * 0))    rotateX(90deg) translateZ(9px); }
  42%  { transform: translateY(calc(var(--h) * 0.5))  rotateX(90deg) translateZ(9px); }
  64%  { transform: translateY(calc(var(--h) * 0.14)) rotateX(90deg) translateZ(9px); }
  82%  { transform: translateY(calc(var(--h) * 0.66)) rotateX(90deg) translateZ(9px); }
  100% { transform: translateY(calc(var(--h) * 0.82)) rotateX(90deg) translateZ(9px); }
}`,
  },
};
