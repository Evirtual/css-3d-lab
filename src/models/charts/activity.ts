import type { Snippet } from '../snippet-utils';
import type { Demo } from '../types';

/*
 * Activity rings drawn from JSON. JS turns each ring of a day into one number,
 * --d-activity-p = value ÷ goal (1 = closed, more = a second lap). CSS paints the arc with a
 * conic-gradient cut to a band by a mask, and a transition on that registered number animates the
 * arcs from one day to the next.
 */

type Key = 'move' | 'exercise' | 'stand';
type Day = { day: string } & Record<Key, [number, number]>;

/** The data, shaped like an API response: what each ring is, then per day [value, goal]. */
export const ACTIVITY: { rings: { key: Key; label: string; unit: string }[]; days: Day[] } = {
  rings: [
    { key: 'move', label: 'Move', unit: 'kcal' },
    { key: 'exercise', label: 'Exercise', unit: 'min' },
    { key: 'stand', label: 'Stand', unit: 'hrs' },
  ],
  days: [
    { day: 'Mon', move: [420, 600], exercise: [22, 30], stand: [9, 12] },
    { day: 'Tue', move: [552, 600], exercise: [21, 30], stand: [9, 12] },
    { day: 'Wed', move: [660, 600], exercise: [34, 30], stand: [12, 12] },
    { day: 'Thu', move: [240, 600], exercise: [27, 30], stand: [5, 12] },
  ],
};

export const demo: Demo = {
  id: 'activity',
  title: 'Activity rings from JSON',
  description:
    'Three neon progress rings, like a fitness watch, drawn from a JSON list of days: each arc is value ÷ goal, and past 100% it runs into a second lap. Switch the day and the arcs sweep to the new numbers; hover or tap a ring for its figures. JS only writes one number per ring.',
  category: 'js',
  tags: ['controls', 'hover', 'data', 'chart', 'json'],
  technique: [
    'JSON → --p per ring (value ÷ goal)',
    'conic-gradient arc + radial mask = a ring',
    '@property <number>: the gradient transitions',
    'three layers stepping back: a solid band',
  ],
};

// ---------------------------------------------------------------------------------------------
// The copy-paste version: plain HTML + CSS + JS, the same JSON printed at the top of the JS.

/** The JSON, indented, with each [value, goal] pair and each day on one line. */
const json = JSON.stringify(ACTIVITY, null, 2)
  .replace(/\[\s+(\d+),\s+(\d+)\s+\]/g, '[$1, $2]')
  .replace(/\{\n\s+([^{}]*?)\n\s*\}/g, (_, inner: string) => `{ ${inner.replace(/\n\s+/g, ' ')} }`);

export const snippet: Snippet = {
  how: [
    'The data is plain JSON, shaped like an API response: for each day a <code>[value, goal]</code> pair per ring. JS turns each pair into <b>one number</b>, <code>--p = value ÷ goal</code>, written on the ring. 1 is a closed ring, more is a second lap.',
    'The arc is a <code>conic-gradient</code> that stops at <code>calc(var(--p) * 360deg)</code> and turns <code>transparent</code>. A <code>radial-gradient</code> mask keeps only the outer 16 units of the disc, so the pie becomes a band.',
    "A gradient can't be transitioned, and <code>--p</code> as an ordinary custom property would jump. <code>@property --p { syntax: '&lt;number&gt;' }</code> tells the browser it is a number, so <code>transition: --p 1.1s</code> interpolates it and the arc sweeps. That repaints the gradient every frame, which is why it is kept to three rings; everything else moves with <code>transform</code> and <code>opacity</code>.",
    'Depth: each arc is drawn three times, 2 units apart in Z and darker each step. Seen tilted, their edges read as a solid band. The dim full track sits 6 units behind, and a wider, see-through copy with a soft mask is the glow.',
    'The rounded tip is a dot on a box as big as the ring, turned by <code>rotate(calc(var(--p) * 1turn))</code>: the same number, as a transform. Past 100% it keeps turning, over the start of the ring.',
    "Each ring is a static disc (the inner ones a unit nearer, so they win where they overlap) that never moves. The pointed-at one gets <code>.is-active</code>: its band lifts inside the disc and a full-colour copy of the arc fades in. A finger has no hover, so a tap picks a ring, and its numbers go in the <code>&lt;output&gt;</code>.",
    'Every length is a multiple of one base unit, <code>--u</code>, so the rings scale as one piece. JS writes only plain numbers (the ring index and <code>--p</code>). The caption and the day buttons are in plain <code>vmin</code>: the control zone is the same object, at the same size, in every model.',
  ],
  html: `<div class="activity">
  <div class="view">
    <div class="scene">
      <div class="rings"></div>
    </div>
  </div>
  <div class="controls">
    <output class="caption"></output>
    <div class="row"></div>
  </div>
</div>`,
  css: `/* A registered property can be transitioned: the browser knows it is a number and interpolates
   it, so every gradient that uses it is redrawn on the way. An unregistered one would jump. */
@property --p {
  syntax: '<number>';
  inherits: true; /* the ring's one transition drives all of its layers */
  initial-value: 0;
}

.activity {
  /* one base unit: every length in the rings is a multiple of it, so they are the same share of
     a card, the editor, a full screen and a recording canvas. The control zone under them is in
     plain vmin, because it is the same object in every model. */
  --u: 0.28vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin; /* the band's gap between the model and the control zone */
  font-family: system-ui, sans-serif;
}

/* the model box: the same height in every model that has controls */
.view {
  display: grid;
  place-items: center;
  height: 50vmin;
}

.scene {
  perspective: calc(800 * var(--u));
  padding: calc(20 * var(--u)) calc(40 * var(--u)) calc(26 * var(--u));
  pointer-events: none; /* the rings are tilted: only the rings and the hub take the pointer */
}

.rings {
  position: relative;
  width: calc(160 * var(--u));
  height: calc(160 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(34deg) rotateY(-16deg);
}

/* The hit target: a static disc per ring, each inner one a unit nearer so it wins where they
   overlap. Ring n is inset by n × 19 units (a 16-unit band and a 3-unit gap). */
.ring {
  --c: #ff4d9d;
  position: absolute;
  inset: calc(var(--r) * calc(19 * var(--u)));
  border-radius: 50%;
  outline: none;
  pointer-events: auto;
  cursor: pointer;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--r) * calc(1 * var(--u))));
  /* past 1: the arc overshoots a little and settles; each ring 90ms after the one around it */
  transition: --p 1.1s cubic-bezier(0.3, 1.15, 0.5, 1) calc(var(--r) * 90ms);
}

.ring:nth-child(2) { --c: #2ee6d6; }
.ring:nth-child(3) { --c: #ffb547; }

/* what you see: it lifts while its ring is pointed at (the disc around it stays put) */
.band {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform-style: preserve-3d;
  transition: transform 0.35s ease;
}

/* every layer is the disc cut to its outer 16 units by a radial mask */
.band i {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  mask: radial-gradient(closest-side, transparent calc(100% - calc(16 * var(--u))), #000 calc(100% - calc(15.5 * var(--u))));
  transition: opacity 0.25s;
}

/* the track: the whole ring, dim, recessed behind the arc */
.band i:nth-child(1) {
  background: color-mix(in srgb, var(--c) 16%, #141830);
  transform: translateZ(calc(-6 * var(--u)));
}

/* the glow: the same arc, wider and see-through, its edges faded by a soft mask */
.band i:nth-child(2) {
  inset: calc(-6 * var(--u));
  background: conic-gradient(color-mix(in srgb, var(--c) 42%, transparent) calc(var(--p) * 360deg), transparent calc(var(--p) * 360deg + 10deg));
  mask: radial-gradient(closest-side, transparent calc(100% - calc(30 * var(--u))), #000 calc(100% - calc(22 * var(--u))) calc(100% - calc(6 * var(--u))), transparent);
  opacity: 0.55;
  transform: translateZ(calc(-5.5 * var(--u)));
}

/* the arc three times, stepping back and darker: tilted, the edges read as a solid band.
   "transparent 0" ends the colour exactly at the arc's angle */
.band i:nth-child(3) {
  background: conic-gradient(color-mix(in srgb, var(--c) 32%, #05060c) calc(var(--p) * 360deg), transparent 0);
  transform: translateZ(calc(-4 * var(--u)));
}

.band i:nth-child(4) {
  background: conic-gradient(color-mix(in srgb, var(--c) 55%, #05060c) calc(var(--p) * 360deg), transparent 0);
  transform: translateZ(calc(-2 * var(--u)));
}

/* the front: from a softer start to the full colour at the tip */
.band i:nth-child(5) {
  background: conic-gradient(color-mix(in srgb, var(--c) 60%, #141830), var(--c) calc(var(--p) * 360deg), transparent 0);
}

/* the pointed-at ring fills in: the whole arc at full colour, faded in over the front */
.band i:nth-child(6) {
  background: conic-gradient(var(--c) calc(var(--p) * 360deg), transparent 0);
  opacity: 0;
  transform: translateZ(calc(0.25 * var(--u)));
}

/* the round start (on the band) and the round tip (on a box turned by the same number) */
.band em {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotate(calc(var(--p) * 1turn));
}

.band::before,
.band::after,
.band em::before,
.band em::after {
  content: '';
  position: absolute;
  top: 0;
  left: calc(50% - calc(8 * var(--u)));
  width: calc(16 * var(--u));
  height: calc(16 * var(--u));
  border-radius: 50%;
}

.band::before {
  background: color-mix(in srgb, var(--c) 60%, #141830);
  transform: translateZ(calc(0.5 * var(--u)));
}

.band::after,
.band em::after {
  background: color-mix(in srgb, var(--c) 32%, #05060c);
  transform: translateZ(calc(-3.5 * var(--u)));
}

.band em::before {
  background: var(--c);
  box-shadow: 0 0 calc(10 * var(--u)) color-mix(in srgb, var(--c) 60%, transparent);
  transform: translateZ(calc(1 * var(--u)));
}

/* a second lap: a dark rim sets the tip apart from the arc it runs over */
.ring.is-lap em::before {
  box-shadow:
    0 0 0 calc(1.5 * var(--u)) color-mix(in srgb, var(--c) 40%, #05060c),
    0 0 calc(10 * var(--u)) color-mix(in srgb, var(--c) 60%, transparent);
}

/* The pointed-at ring lifts, fills in and glows more: transform and opacity only, and on the
   flat layers (opacity on a 3D group would flatten it). The others stay as they are. */
.ring.is-active > .band {
  transform: translateZ(calc(8 * var(--u)));
}

.ring.is-active > .band::before {
  background: var(--c);
}

.ring.is-active i:nth-child(2),
.ring.is-active i:nth-child(6) {
  opacity: 1;
}

/* the day, in the hole: it also catches the pointer there, so the middle picks no ring */
.hub {
  position: absolute;
  top: calc(50% - calc(24 * var(--u)));
  left: calc(50% - calc(24 * var(--u)));
  display: grid;
  place-items: center;
  width: calc(48 * var(--u));
  height: calc(48 * var(--u));
  border-radius: 50%;
  /* no colour of its own: the hole shows the stage, so the day takes the stage's ink */
  font: 800 calc(15 * var(--u))/1 system-ui, sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  pointer-events: auto;
  transform: translateZ(calc(4 * var(--u)));
}

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the rings' own unit. The caption is on its own line above
   the row, and its line box never changes height, so a new read-out cannot move the rings. */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}

.controls .caption {
  font: 500 4.5vmin/1.2 system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
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
}`,
  js: `// The data, as an API would send it back: per day, [value, goal] for each ring
const ACTIVITY = ${json};

const box = document.querySelector('.rings');
const out = document.querySelector('.activity output');
const seg = document.querySelector('.activity .controls .row');
const { rings: RINGS, days: DAYS } = ACTIVITY;

// Build it once from the data: per ring a static disc holding a band of six layers and a tip,
// the day in the middle, and a button per day. Text goes in with textContent, never as HTML:
// data from an API is not trusted markup.
box.innerHTML =
  RINGS.map((_, i) => \`<div class="ring" style="--r:\${i}" tabindex="0"><div class="band">\${'<i></i>'.repeat(6)}<em></em></div></div>\`).join('') +
  '<div class="hub"></div>';
DAYS.forEach((d, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.day = i;
  b.textContent = d.day;
  seg.append(b);
});
const rings = [...box.querySelectorAll('.ring')];
const hub = box.querySelector('.hub');
const buttons = seg.querySelectorAll('button');

const pct = (pair) => Math.round((pair[0] / pair[1]) * 100);
// the day is in the hub and on its pressed button, so the caption leaves it out and stays one line
const summary = (d) => RINGS.map((r) => \`\${r.label} \${pct(d[r.key])}%\`).join(' · ');
const detail = (d, i) => {
  const r = RINGS[i];
  return \`\${d.day} · \${r.label} \${d[r.key][0]}/\${d[r.key][1]} \${r.unit} · \${pct(d[r.key])}%\`;
};

let day = 0;
let active = -1;
let hideTimer = 0;
const ringOf = (el) => (el instanceof Element ? rings.indexOf(el.closest('.ring')) : -1);

// the pointed-at ring lifts and fills in (CSS), and the dock shows its numbers
function pointAt(i) {
  clearTimeout(hideTimer);
  active = i;
  rings.forEach((r, k) => r.classList.toggle('is-active', k === i));
  out.textContent = i >= 0 ? detail(DAYS[day], i) : summary(DAYS[day]);
}
// a short grace period, so crossing from one ring to the next does not flicker the dock
function letGo() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => pointAt(-1), 150);
}

// Show one day: each ring gets --p = value ÷ goal. The sweep, the stagger and the lap are CSS.
function show(i) {
  day = i;
  const d = DAYS[i];
  RINGS.forEach((r, k) => {
    const p = d[r.key][0] / d[r.key][1];
    rings[k].style.setProperty('--p', p.toFixed(3));
    rings[k].classList.toggle('is-lap', p > 1);
    rings[k].setAttribute('aria-label', detail(d, k));
  });
  hub.textContent = d.day;
  buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.day == i));
  pointAt(active);
}

seg.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) show(Number(b.dataset.day));
});

// a mouse picks a ring by hovering it, the keyboard by focusing it (a tap focuses it too, but
// taps are handled on pointerup below)
const mine = (e) => (e.pointerType ? e.pointerType === 'mouse' : e.target.matches(':focus-visible'));
const over = (e) => {
  const i = ringOf(e.target);
  if (i >= 0 && mine(e)) pointAt(i);
};
const leave = (e) => {
  if (e.pointerType && e.pointerType !== 'mouse') return;
  if (ringOf(e.relatedTarget) < 0) letGo();
};
box.addEventListener('pointerover', over);
box.addEventListener('focusin', over);
box.addEventListener('pointerout', leave);
box.addEventListener('focusout', leave);
// a finger has no hover: a tap picks a ring, a second tap or a tap on the middle lets go
box.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  const i = ringOf(e.target);
  if (i >= 0 && i !== active) pointAt(i);
  else letGo();
});

show(0);`,
};
