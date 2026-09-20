import type { Snippet } from './snippet-utils';

/** Lays generated children out a few per line, so the copied HTML stays readable. */
const rows = (items: string[], perRow: number, indent: string): string =>
  items
    .reduce<string[]>((lines, item, i) => {
      if (i % perRow === 0) lines.push(indent);
      lines[lines.length - 1] += item;
      return lines;
    }, [])
    .join('\n');

const DRUM_TEXT = 'ROLLING·CSS·3D·LAB';

/** Copy-paste versions of batch O. */
export const snippetsO: Record<string, Snippet> = {
  marquee: {
    how: [
      'One face per letter. <code>rotateY(i · 360° / n)</code> turns a face to its own place on the ring, then <code>translateZ(r)</code> walks it out to the surface.',
      'A face has to be exactly <code>2r · tan(180° / n)</code> wide, or the ring ends up with gaps between the faces (too narrow) or a ruffle (too wide). Round it <b>up</b> a hair so neighbours overlap instead of showing a hairline.',
      '<code>backface-visibility: hidden</code> is doing the important work: without it the letters on the far side show through the drum, mirrored.',
      'The two ends are discs laid flat with <code>rotateX(90deg)</code> and pushed apart by <code>translateZ(±h / 2)</code>.',
      'The light is a <b>flat plate in front of the drum</b>, not part of it. It stays put while the drum turns, and that fixed shading is what makes a ring of flat faces read as a cylinder.',
    ],
    html: `<div class="sign">
  <div class="scene">
    <div class="drum" style="--n:${DRUM_TEXT.length}">
${rows(
  [...DRUM_TEXT].map((ch, i) => `<i style="--i:${i}">${ch}</i>`),
  6,
  '      ',
)}
      <b></b><b></b>
    </div>
  </div>
  <span class="light"></span>
</div>`,
    css: `.sign {
  position: relative;
  width: 208px;
  height: 104px;
}

.scene {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  perspective: 620px;
}

.drum {
  --r: 96px;   /* drum radius */
  --w: 35px;   /* face width: 2r·tan(180°/18) = 34.1, rounded up so faces overlap */
  --h: 62px;   /* drum height */
  position: relative;
  width: calc(var(--r) * 2);
  height: var(--h);
  transform-style: preserve-3d;
  animation: roll 16s linear infinite;
}

.drum i {
  position: absolute;
  top: 0;
  left: calc(50% - var(--w) / 2);
  display: grid;
  place-items: center;
  width: var(--w);
  height: 100%;
  /* an inner line, not a border: a face nearly edge-on is a couple of pixels wide and a real
     border there is sampled unevenly and breaks up */
  box-shadow:
    inset 0 0 0 1px rgb(139 108 255 / 0.45),
    inset 0 22px 26px -22px rgb(0 0 0 / 0.55),
    inset 0 -22px 26px -22px rgb(0 0 0 / 0.55);
  background: linear-gradient(180deg, #3b3270, #241f45);
  color: #eceefb;
  font: 800 27px/1 system-ui, sans-serif;
  font-style: normal;
  backface-visibility: hidden;   /* the far side would read mirrored */
  transform: rotateY(calc(var(--i) * 360deg / var(--n))) translateZ(var(--r));
}

/* every other face a shade darker, so the drum still reads as turning under a blank space */
.drum i:nth-child(even) {
  background: linear-gradient(180deg, #2d2858, #1c1838);
}

/* the ends: a disc laid flat, pushed up and down by half the height */
.drum b {
  position: absolute;
  top: calc(50% - var(--r));
  left: 0;
  width: calc(var(--r) * 2);
  height: calc(var(--r) * 2);
  border-radius: 50%;
  box-shadow: inset 0 0 0 2px rgb(139 108 255 / 0.5);
  background: radial-gradient(circle at 42% 34%, #4c4090, #1a1636 82%);
  transform: rotateX(90deg) translateZ(calc(var(--h) / 2));
}

.drum b + b {
  transform: rotateX(90deg) translateZ(calc(var(--h) / -2));
}

/* The light does not turn with the drum: a flat plate in front of it, bright in the middle and
   sunk into the page colour at the sides. That is what makes the cylinder look round. */
.light {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, #0b0d18, transparent 24%, transparent 76%, #0b0d18),
    linear-gradient(180deg, rgb(255 255 255 / 0.1), transparent 42%);
}

@keyframes roll {
  from { transform: rotateX(-8deg) rotateY(0deg); }
  to   { transform: rotateX(-8deg) rotateY(-360deg); }
}`,
  },

  outlinetext: {
    how: [
      'The same word eight times in the same spot. Each copy is pushed back by <code>--i × --spread</code>, so they form a solid block of text going into the screen.',
      '<code>-webkit-text-stroke</code> with <code>color: transparent</code> turns a copy into an outline. Only the first copy keeps its fill, which is what makes it read as the front of the extrusion.',
      'The fade is the distance: <code>opacity: calc(1 - var(--i) * 0.1)</code>. No blur, no shadow — just the copies getting quieter.',
      'Hover changes <b>one custom property</b>. The transform is written once, so every copy eases to its new depth; a small <code>transition-delay</code> per copy makes the stack stretch rather than jump.',
      'The pad is the hover target and never moves (the stack inside it has <code>pointer-events: none</code>), so the pointer cannot fall off the edge of a turning letter and make it flicker.',
    ],
    html: `<div class="pad" tabindex="0">
  <div class="stack">
${rows(
  Array.from({ length: 8 }, (_, i) => `<span style="--i:${i}">DEPTH</span>`),
  2,
  '    ',
)}
  </div>
</div>`,
    css: `.pad {
  --spread: 26px;
  position: relative;
  width: 236px;
  height: 112px;
  perspective: 800px;
  transform-style: preserve-3d;
}

.pad:hover,
.pad:focus-visible {
  --spread: 38px;
}

.stack {
  position: absolute;
  inset: 0;
  pointer-events: none;   /* the pad keeps the hover even when a letter swings over its edge */
  transform-style: preserve-3d;
  animation: sway 9s ease-in-out infinite alternate;
}

.stack span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: transparent;
  font: 900 42px/1 system-ui, sans-serif;
  letter-spacing: 0.06em;
  -webkit-text-stroke: 1.2px #2ee6d6;   /* fill transparent + a stroke = an outline */
  opacity: calc(1 - var(--i) * 0.1);
  transform: translateZ(calc(var(--i) * var(--spread) * -1));
  /* the transform is written once and only --spread changes, so the depth eases in and out */
  transition: transform 0.55s cubic-bezier(0.2, 0.85, 0.3, 1);
  transition-delay: calc(var(--i) * 14ms);
}

/* the front copy is the solid one: filled, outlined, standing on the stack */
.stack span:first-child {
  color: #eceefb;
  -webkit-text-stroke: 1.6px #8b6cff;
  opacity: 1;
}

/* two mirrored angles with alternate: the loop is seamless in both directions */
@keyframes sway {
  from { transform: rotateX(-6deg) rotateY(-26deg); }
  to   { transform: rotateX(-6deg) rotateY(26deg); }
}`,
  },

  knob: {
    how: [
      'The rim is 24 flat panels. <code>rotateZ(a)</code> turns a panel to its angle, <code>translateY(-R)</code> steps it out to the rim, and <code>rotateX(90deg)</code> stands it up so its <b>height becomes the knob’s depth</b>.',
      'After that fold, a panel’s top is the back of the knob and its bottom is the front. So a plain vertical gradient on it is a fixed light on the rim, however far the knob is turned — and every second panel a shade darker is the ridged grip.',
      'JS never animates anything. It turns the pointer’s travel <b>around the centre</b> (<code>atan2</code>, measured against the previous frame so it stays in step after the knob hits an end) into two numbers: <code>--a</code>, the angle, and <code>--v</code>, the same value as 0…1.',
      'The ring of ticks reads <code>--v</code> with <code>clamp(0.18, (--v - --t) * 40 + 0.18, 1)</code>: as soon as the value passes a tick, the middle term shoots past 1 and clips, so the tick lights up. That is a comparison, in CSS.',
      'The gloss is a flat disc in front of the knob that does <b>not</b> turn with it, so the highlight stays top-left while the grip spins under it.',
    ],
    html: `<div class="panel">
  <div class="scene">
    <div class="dial" role="slider" tabindex="0" aria-label="Volume"
         aria-valuemin="0" aria-valuemax="100" aria-valuenow="62">
      <div class="ticks">
${rows(
  Array.from({ length: 11 }, (_, i) => `<i style="--i:${i};--t:${(i / 10).toFixed(2)}"></i>`),
  3,
  '        ',
)}
      </div>
      <div class="body">
${rows(
  Array.from({ length: 24 }, (_, i) => `<i style="--i:${i}"></i>`),
  6,
  '        ',
)}
        <b class="back"></b>
        <b class="face"><u></u></b>
      </div>
      <span class="gloss"></span>
    </div>
  </div>
  <output>62</output>
</div>`,
    css: `.panel {
  display: grid;
  justify-items: center;
  gap: 18px;
  font-family: system-ui, sans-serif;
}

.scene {
  perspective: 640px;
}

/* The drag target. It carries the camera tilt but never moves itself. */
.dial {
  --R: 54px;    /* knob radius */
  --d: 32px;    /* knob depth */
  --pw: 15px;   /* rim panel width: 2R·tan(180°/24), rounded up so panels overlap */
  --a: 33.6deg; /* from JS: the turn */
  --v: 0.62;    /* from JS: the same value as 0…1 */
  position: relative;
  width: 180px;
  height: 180px;
  touch-action: none;   /* the drag is ours, the page must not scroll under it */
  cursor: grab;
  transform: rotateX(-26deg) rotateY(-16deg);
  transform-style: preserve-3d;
}

.dial.dragging { cursor: grabbing; }

/* the scale behind the knob: it does not turn, each tick only brightens once the value passes it */
.ticks {
  position: absolute;
  inset: 0;
  transform: translateZ(calc(var(--d) / -2));
  transform-style: preserve-3d;
}

.ticks i {
  position: absolute;
  top: calc(50% - 5px);
  left: calc(50% - 1.5px);
  width: 3px;
  height: 10px;
  border-radius: 2px;
  background: #2ee6d6;
  /* clamp() is the comparison: once --v passes --t the middle term shoots past 1 and clips */
  opacity: clamp(0.18, calc((var(--v) - var(--t)) * 40 + 0.18), 1);
  transition: opacity 0.18s;
  transform: rotate(calc(-140deg + var(--i) * 28deg)) translateY(-76px);
}

.body {
  position: absolute;
  inset: 0;
  transform: rotateZ(var(--a));
  transform-style: preserve-3d;
  transition: transform 0.16s ease-out;   /* only so key presses glide */
}

/* a drag has to answer the pointer instantly; the easing above would lag behind it */
.dial.dragging .body { transition: none; }

/* a rim panel: turn to its angle, step out by the radius, then stand it up */
.body i {
  position: absolute;
  top: calc(50% - var(--d) / 2);
  left: calc(50% - var(--pw) / 2);
  width: var(--pw);
  height: var(--d);
  /* after the fold the top of this gradient is the back of the knob and the bottom is the front */
  background: linear-gradient(180deg, #231c42, #997eff);
  transform: rotateZ(calc(var(--i) * 15deg)) translateY(calc(var(--R) * -1)) rotateX(90deg);
}

/* every second panel darker: that alternation is the ridged grip */
.body i:nth-child(even) {
  background: linear-gradient(180deg, #0d0c1b, #3d2f73);
}

.body b {
  position: absolute;
  top: calc(50% - var(--R));
  left: calc(50% - var(--R));
  width: calc(var(--R) * 2);
  height: calc(var(--R) * 2);
  border-radius: 50%;
}

.back {
  background: #151229;
  transform: translateZ(calc(var(--d) / -2));
}

.face {
  box-shadow:
    inset 0 0 0 1.5px #a289ff,
    inset 0 0 18px rgb(0 0 0 / 0.4);
  /* flat, like the top of a real knob: one sheen across it and a turned groove near the edge */
  background:
    radial-gradient(circle, transparent 0 62%, rgb(0 0 0 / 0.28) 63% 67%, transparent 68%),
    linear-gradient(155deg, #9b81ff, #3d2f73 62%, #221c42);
  transform: translateZ(calc(var(--d) / 2));
}

/* the indicator: a lit bar from the middle of the face out to its edge */
.face u {
  position: absolute;
  top: 12px;
  left: calc(50% - 2.5px);
  width: 5px;
  height: 26px;
  border-radius: 3px;
  background: #2ee6d6;
  box-shadow: 0 0 12px rgb(46 230 214 / 0.7);
}

/* the light does not turn with the knob: a flat disc in front of it, lit top-left */
.gloss {
  position: absolute;
  top: calc(50% - var(--R));
  left: calc(50% - var(--R));
  width: calc(var(--R) * 2);
  height: calc(var(--R) * 2);
  border-radius: 50%;
  pointer-events: none;
  background: linear-gradient(148deg, rgb(255 255 255 / 0.3), transparent 44%, transparent 60%, rgb(0 0 0 / 0.34));
  transform: translateZ(calc(var(--d) / 2 + 1px));
}

output {
  color: #eceefb;
  font: 800 22px/1 system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}`,
    js: `const dial = document.querySelector('.dial');
const out = document.querySelector('output');

const SWEEP = 280;   // the knob turns 280°: -140° empty, +140° full, dead zone at the bottom
let value = 62;
let last = 0;
let dragging = false;

function show() {
  dial.style.setProperty('--a', (value * (SWEEP / 100) - SWEEP / 2).toFixed(1) + 'deg');
  dial.style.setProperty('--v', (value / 100).toFixed(3));
  dial.setAttribute('aria-valuenow', Math.round(value));
  out.textContent = Math.round(value);
}

function set(v) {
  value = Math.min(100, Math.max(0, v));
  show();
}

// the pointer's angle around the middle of the knob
function angleAt(e) {
  const r = dial.getBoundingClientRect();
  return Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI;
}

dial.addEventListener('pointerdown', (e) => {
  dragging = true;
  last = angleAt(e);
  dial.setPointerCapture(e.pointerId);   // the drag survives leaving the knob
  dial.classList.add('dragging');
});

dial.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  // Measure against the previous angle, not the one at pointerdown: after the knob has been held
  // at an end the two would have drifted apart, and it would jump when you turn back.
  const a = angleAt(e);
  let d = a - last;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  last = a;
  set(value + d * (100 / SWEEP));
});

function stop() {
  dragging = false;
  dial.classList.remove('dragging');
}
dial.addEventListener('pointerup', stop);
dial.addEventListener('pointercancel', stop);

dial.addEventListener('keydown', (e) => {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 2
    : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -2
    : e.key === 'PageUp' ? 10 : e.key === 'PageDown' ? -10 : 0;
  if (step) set(value + step);
  else if (e.key === 'Home') set(0);
  else if (e.key === 'End') set(100);
  else return;
  e.preventDefault();
});

show();`,
  },

  slider: {
    how: [
      'The desk is <b>four plates with a hole between them</b>, not one plate: you cannot cut a slot out of an element without <code>clip-path</code>, and that would flatten every 3D child inside it.',
      'The floor of the groove sits at <code>translateZ(-16px)</code>. The two walls are hinged on the edges of the slot with <code>transform-origin: 50% 0</code> and folded straight down by <code>rotateX(-90deg)</code>, so each spans exactly the 16px between the surface and the floor.',
      'The handle is a cap at <code>translateZ(20px)</code> with four walls hanging off its edges the same way — a real box, so you see its sides as the desk leans.',
      'The desk turns about its own middle, which is the rail, so the rail keeps its true width on screen. That lets a plain <code>&lt;input type="range"&gt;</code> at <code>opacity: 0</code> lie over it and line up exactly: 200px of track minus a 40px thumb = the 160px the handle travels.',
      'The input is the only state. Pointer, touch, click-on-the-rail, arrow keys, Home/End and screen readers all come free; JS only republishes its value as <code>--v</code>.',
    ],
    html: `<div class="panel">
  <div class="scene">
    <input type="range" min="0" max="100" value="64" aria-label="Level">
    <div class="desk">
      <i class="plate top"></i>
      <i class="plate bottom"></i>
      <i class="plate left"></i>
      <i class="plate right"></i>
      <i class="floor"><u></u></i>
      <i class="wall far"></i>
      <i class="wall near"></i>
      <i class="grip">
        <b class="cap"><u></u><u></u><u></u><u></u></b>
      </i>
    </div>
  </div>
  <output>64</output>
</div>`,
    css: `.panel {
  --v: 0.64;   /* from JS: the value as 0…1 */
  display: grid;
  justify-items: center;
  gap: 24px;
  font-family: system-ui, sans-serif;
}

.scene {
  position: relative;
  display: grid;
  place-items: center;
  perspective: 700px;
}

/* The real control: invisible, lying under the desk, which lets the pointer through to it.
   Track 200px with a 40px thumb = 160px of travel, the same distance the handle covers. */
input[type='range'] {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 52px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  opacity: 0;
  cursor: grab;
  appearance: none;
  -webkit-appearance: none;
  transform: translate(-50%, -50%);
}

input[type='range']::-webkit-slider-thumb {
  width: 40px;
  height: 40px;
  appearance: none;
  -webkit-appearance: none;
}

input[type='range']::-moz-range-thumb {
  width: 40px;
  height: 40px;
  border: 0;
}

/* 240 × 116 with a 196 × 26 slot through the middle. It turns about that middle, so the rail
   keeps its true width on screen and the hidden input lines up with the handle.
   40°, not more: at the angle where the groove's depth·sin equals its width·cos, the near wall
   exactly covers the floor and the lit rail disappears. 26 wide over 12 deep leaves it open. */
.desk {
  position: relative;
  width: 240px;
  height: 116px;
  pointer-events: none;   /* clicks belong to the input underneath */
  transform: rotateX(40deg);
  transform-style: preserve-3d;
}

/* The four plates are pieces of one surface, so the shading has to run across the whole desk and
   not restart on each piece: every plate paints the same 240 × 116 gradient, shifted back into
   place by its own offset. */
.plate {
  position: absolute;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.16),
    inset 0 0 0 1px rgb(140 150 220 / 0.24);
  background-image: linear-gradient(180deg, #332e66, #0e1123);
  background-repeat: no-repeat;
  background-size: 240px 116px;
}

.top    { top: 0;    left: 0;     width: 240px; height: 45px; }
.bottom { top: 71px; left: 0;     width: 240px; height: 45px; background-position: 0 -71px; }
.left   { top: 45px; left: 0;     width: 22px;  height: 26px; background-position: 0 -45px; }
.right  { top: 45px; left: 218px; width: 22px;  height: 26px; background-position: -218px -45px; }

/* the printed scale, painted not built */
.top {
  background-image:
    repeating-linear-gradient(90deg, rgb(236 238 251 / 0.3) 0 1px, transparent 1px 8px),
    linear-gradient(180deg, #332e66, #0e1123);
  background-position: 22px 33px, 0 0;
  background-size: 197px 7px, 240px 116px;
}

/* the bottom of the groove, 12px below the surface */
.floor {
  position: absolute;
  top: 45px;
  left: 22px;
  width: 196px;
  height: 26px;
  box-shadow: inset 0 3px 8px rgb(0 0 0 / 0.55);
  background: #05060d;
  transform: translateZ(-12px);
}

/* the lit part of the rail, grown from the left end */
.floor u {
  position: absolute;
  inset: 3px;
  border-radius: 3px;
  background: linear-gradient(90deg, #8b6cff, #2ee6d6);
  box-shadow: 0 0 16px rgb(46 230 214 / 0.65);
  transform-origin: 0 50%;
  transform: scaleX(var(--v));
}

/* each wall is hinged on its edge of the slot and folded straight down into the desk */
.wall {
  position: absolute;
  left: 22px;
  width: 196px;
  height: 12px;
  background: linear-gradient(180deg, #0c0e1c, #05060d);
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
}

.far  { top: 45px; }
.near { top: 71px; }

/* the handle, moved along the rail by the value alone */
.grip {
  position: absolute;
  top: calc(50% - 26px);
  left: calc(50% - 18px);
  width: 36px;
  height: 52px;
  transform-style: preserve-3d;
  transform: translateX(calc((var(--v) - 0.5) * 160px));
  transition: transform 90ms linear;
}

/* its shadow, lying on the floor of the groove */
.grip::before {
  content: '';
  position: absolute;
  inset: -4px -10px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.65), transparent);
  transform: translateZ(-10px);
}

/* the cap is the top of the handle; its four walls hang down from it to the desk */
.cap {
  --hz: 20px;
  position: absolute;
  inset: 0;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.22);
  background:
    repeating-linear-gradient(180deg, rgb(0 0 0 / 0.3) 0 2px, transparent 2px 7px),
    linear-gradient(160deg, #b7a3ff, #4e3d94);
  transform: translateZ(var(--hz));
  transform-style: preserve-3d;
}

.cap u {
  position: absolute;
  background: linear-gradient(180deg, #6e56ca, #382d69);
}

/* front and back walls: hinged on the cap's long edges, folded down */
.cap u:nth-child(1),
.cap u:nth-child(2) {
  left: 0;
  width: 100%;
  height: var(--hz);
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
}

.cap u:nth-child(1) { top: 0; }
.cap u:nth-child(2) { top: 100%; }

/* side walls: the same fold, around the other axis */
.cap u:nth-child(3),
.cap u:nth-child(4) {
  top: 0;
  width: var(--hz);
  height: 100%;
  transform-origin: 0 50%;
  transform: rotateY(90deg);
}

.cap u:nth-child(3) { left: 0; }
.cap u:nth-child(4) { left: 100%; }

/* the hidden input keeps the focus ring: show it on the handle instead */
input:focus-visible + .desk .cap {
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.22),
    0 0 0 3px #2ee6d6;
}

output {
  color: #eceefb;
  font: 800 22px/1 system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}`,
    js: `const panel = document.querySelector('.panel');
const input = document.querySelector('input');
const out = document.querySelector('output');

// The input is the only state. JS just republishes it as a 0…1 number for the CSS to draw.
function show() {
  panel.style.setProperty('--v', (input.value / 100).toFixed(3));
  out.textContent = input.value;
}

input.addEventListener('input', show);
show();`,
  },

  fab: {
    how: [
      'The pad is the hover target and never moves — the buttons inside it do. That is the rule that keeps a hover effect from flickering: if the hovered element moves out from under the pointer, it un-hovers itself and starts fighting you.',
      'The pad opens on <code>:hover</code> <b>and</b> <code>:focus-within</code>, so tabbing to a button or tapping one on a phone opens it too.',
      '<code>rotate(a) translateX(r) rotate(-a)</code> is the fan: the first rotation aims the chip along its arc, the step out places it, and the third undoes the turn so the icon stays upright. <code>rotateY</code> after that turns the chip from edge-on to facing you.',
      'Opening and closing share one set of custom properties, so there is one transform in the CSS. The closed state gives the chips a negative <code>translateZ</code> so they wait <b>behind</b> the surface and never fight the button for pixels.',
      'The <code>transition-delay</code> is reversed in the closed state — <code>(2 - i)</code> instead of <code>i</code> — so the fan folds back in the order it opened.',
    ],
    html: `<div class="fab">
  <div class="world">
    <span class="shadow"></span>
    <button class="main" type="button" aria-label="Actions"><span></span></button>
    <button class="act" type="button" style="--a:-150deg;--i:0" aria-label="Share">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/></svg>
    </button>
    <button class="act" type="button" style="--a:-90deg;--i:1" aria-label="Mail">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
    </button>
    <button class="act" type="button" style="--a:-30deg;--i:2" aria-label="Copy">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
    </button>
  </div>
</div>`,
    css: `.fab {
  --lift: 0px;     /* how far the main button is out of the surface */
  --r: 0px;        /* how far along its arc each chip has travelled */
  --az: -20px;     /* closed, the chips wait behind the surface */
  --turn: -100deg; /* a chip starts nearly edge-on and turns to face you */
  --sc: 0.35;
  --open: 0;
  position: relative;
  width: 204px;
  height: 178px;
  perspective: 600px;
}

/* the pad is the hover target and never moves; :focus-within covers keyboard and touch */
.fab:hover,
.fab:focus-within {
  --lift: 62px;
  --r: 82px;
  --az: 34px;
  --turn: 0deg;
  --sc: 1;
  --open: 1;
}

/* the buttons share one 3D space, so the container must not take the hit test off them */
.world {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform-style: preserve-3d;
}

.fab button {
  position: absolute;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  pointer-events: auto;
  cursor: pointer;
}

.main {
  bottom: 8px;
  left: calc(50% - 31px);
  width: 62px;
  height: 62px;
  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 0.4),
    inset 0 -6px 12px rgb(0 0 0 / 0.3);
  background: linear-gradient(150deg, #8b6cff, #ff4d9d);
  color: #fff;
  transform: translateZ(var(--lift));
  transition: transform 0.45s cubic-bezier(0.25, 0.9, 0.3, 1.1);
}

/* the plus, turning into a cross as it opens */
.main span {
  position: relative;
  width: 22px;
  height: 22px;
  pointer-events: none;
  transform: rotate(calc(var(--open) * 135deg));
  transition: transform 0.45s cubic-bezier(0.25, 0.9, 0.3, 1.1);
}

.main span::before,
.main span::after {
  content: '';
  position: absolute;
  top: calc(50% - 1.5px);
  left: 0;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: currentcolor;
}

.main span::after { transform: rotate(90deg); }

/* rotate → step out → rotate back keeps the chip upright while it travels along its arc */
.act {
  bottom: 18px;
  left: calc(50% - 21px);
  width: 42px;
  height: 42px;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.28);
  background: linear-gradient(150deg, #57ebdd, #1b7d75);
  color: #06201e;
  opacity: var(--open);
  transform-style: preserve-3d;
  transform:
    translateZ(var(--az)) rotate(var(--a)) translateX(var(--r)) rotate(calc(var(--a) * -1))
    rotateY(var(--turn)) scale(var(--sc));
  transition:
    transform 0.5s cubic-bezier(0.2, 0.9, 0.25, 1.15),
    opacity 0.3s;
  transition-delay: calc((2 - var(--i)) * 55ms);   /* closed: the last chip leaves first */
}

.fab:hover .act,
.fab:focus-within .act {
  transition-delay: calc(var(--i) * 65ms);
}

/* the disc's thickness: a plate behind the face, a touch wider so its edge shows as a rim */
.act::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: #114742;
  transform: translateZ(-7px);
}

.act svg {
  position: relative;
  width: 19px;
  height: 19px;
}

/* the shadow on the surface: it spreads and fades as the button climbs away from it */
.shadow {
  position: absolute;
  bottom: -8px;
  left: calc(50% - 44px);
  width: 88px;
  height: 32px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.55), transparent);
  opacity: calc(0.9 - var(--open) * 0.45);
  transform: scale(calc(1 + var(--open) * 0.5));
  transition:
    transform 0.45s cubic-bezier(0.25, 0.9, 0.3, 1.1),
    opacity 0.45s;
}`,
  },
};
