import type { Snippet } from './snippet-utils';

/*
 * bubbles: a 3D bubble chart from JSON. The chart is a box of space tilted a little: a floor grid
 * at the bottom, a wall with the rating's lines at the back. Each point is a shaded disc that
 * undoes the tilt (so it is a sphere facing you), standing on a dashed drop line that ends in its
 * shadow on the floor. JS only turns the data into shares of the axes and a radius; CSS draws
 * every part from them. One tooltip, on a card of its own, glides to the sphere pointed at.
 */

/** The data, shaped like an API's response: cafés by price, rating and cups sold a day. */
const CAFES = [
  { label: 'Station Espresso', x: 2.8, y: 3.4, size: 410 },
  { label: 'Daily Grind', x: 3.6, y: 3.7, size: 320 },
  { label: 'Corner Cup', x: 3.2, y: 4.1, size: 180 },
  { label: 'Northside', x: 4.1, y: 4.3, size: 260 },
  { label: 'Bloom', x: 3.7, y: 4.8, size: 210 },
  { label: 'Kiln', x: 4.6, y: 4.6, size: 140 },
  { label: 'Pour House', x: 5.3, y: 4.4, size: 90 },
  { label: 'Roastery', x: 5.7, y: 3.9, size: 120 },
];

const TEXT = '#eceefb';
const SURFACE = '#141830';

/** The JSON, one point per line. */
const json = JSON.stringify(CAFES, null, 2).replace(/\{\s+([^{}]+?)\s+\}/g, (_, inner: string) => `{ ${inner.replace(/\s*\n\s*/g, ' ')} }`);

/** The chart's tilt. Every sphere and the tooltip undo it in reverse order, so they face you. */
const TILT_X = -14;
const TILT_Y = -18;
const FACE = `rotateY(${-TILT_Y}deg) rotateX(${-TILT_X}deg)`;

export const snippetsBubbles: Record<string, Snippet> = {
  bubbles: {
    how: [
      'The data is a JSON array of points, <code>{ label, x, y, size }</code>. JS rounds the axes out to whole numbers, then gives each point three plain numbers: <code>--x</code> and <code>--y</code>, its place as a share of each axis (0 to 1), and <code>--r</code>, its radius in units, from the <b>square root</b> of its size, so a sphere’s area (what the eye compares) grows with the value. CSS multiplies them by the chart’s size and by <code>--u</code>.',
      'The chart is a box of space tilted with <code>rotateX(-14deg) rotateY(-18deg)</code>: a floor grid laid flat at the bottom with <code>rotateX(90deg)</code>, its lines at every dollar, and a wall at the back with a line every half star. Each sphere is a disc painted with a <code>radial-gradient</code> lit from the upper left, and it turns <code>rotateY(18deg) rotateX(14deg)</code>: the tilt undone in reverse order, so it faces you square and stays round.',
      'Under each sphere hangs a dashed <b>drop line</b> to the floor, in the chart’s own plane, and its <code>::after</code> is the shadow: a soft disc at the line’s foot, laid flat on the floor. The line and the floor’s grid are what place the sphere in depth; the shadow’s size echoes the sphere’s.',
      'The sphere is the hover target and never moves: its <code>::before</code> is the painted ball, which swells when it is pointed at or focused. There is <b>one</b> tooltip for the chart, on a card of its own (so its text reads on either stage), 30 units nearer than the spheres and facing you like them; JS moves it with <code>--tx</code> / <code>--ty</code>, to the side of the sphere with more room, and a transition glides it there.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, and JS only ever writes plain numbers, which CSS multiplies by <code>--u</code>: a length in px from JS would stay put while the chart scaled around it.',
    ],
    html: `<div class="bubbles">
  <div class="scene">
    <div class="chart">
      <div class="floor"></div>
      <div class="wall"></div>
      <div class="ticks" aria-hidden="true"></div>
      <b class="title y" aria-hidden="true">Rating</b>
      <b class="title x" aria-hidden="true">Price · size = cups a day</b>
      <div class="points"></div>
      <b class="tip" aria-hidden="true"></b>
    </div>
  </div>
</div>`,
    css: `.bubbles {
  /* one base unit: every length in the chart is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.36vmin;
  display: grid;
  place-items: center;
  font-family: Inter, system-ui, sans-serif;
}

.bubbles * {
  box-sizing: border-box;
}

/* room round the chart for its labels; the turn brings the right end nearer, so it is moved left
   a little to sit in the middle. Only the spheres take the pointer: in a tilted chart the boxes
   round them would catch it first */
.scene {
  padding: calc(16 * var(--u)) calc(14 * var(--u)) calc(30 * var(--u)) calc(30 * var(--u));
  perspective: calc(800 * var(--u));
  pointer-events: none;
}

/* the chart: 180 × 110 units of price by rating, tilted a little. --xs and --ys are how many
   whole steps each axis has (JS sets them) */
.chart {
  --W: 180;
  --H: 110;
  position: relative;
  width: calc(var(--W) * var(--u));
  height: calc(var(--H) * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(${TILT_X}deg) rotateY(${TILT_Y}deg);
}

/* the floor: 50 units deep, laid flat along the bottom, a line at every step of the price and
   every 12.5 units of depth. One line's width wider than the chart, so the last line is drawn */
.floor {
  position: absolute;
  left: 0;
  top: calc((var(--H) - 25) * var(--u));
  width: calc((var(--W) + 0.8) * var(--u));
  height: calc(50.8 * var(--u));
  background:
    repeating-linear-gradient(90deg, rgb(139 108 255 / 0.5) 0 calc(0.8 * var(--u)), transparent calc(0.8 * var(--u)) calc(var(--W) / var(--xs, 4) * var(--u))),
    repeating-linear-gradient(rgb(139 108 255 / 0.3) 0 calc(0.8 * var(--u)), transparent calc(0.8 * var(--u)) calc(12.5 * var(--u))),
    rgb(139 108 255 / 0.1);
  transform: rotateX(90deg);
}

/* the wall at the back of the floor: a line every half step of the rating */
.wall {
  position: absolute;
  left: 0;
  top: calc(-0.8 * var(--u));
  width: calc((var(--W) + 0.8) * var(--u));
  height: calc((var(--H) + 0.8) * var(--u));
  background:
    repeating-linear-gradient(to top, rgb(139 108 255 / 0.4) 0 calc(0.8 * var(--u)), transparent calc(0.8 * var(--u)) calc(var(--H) / var(--ys, 2) / 2 * var(--u))),
    linear-gradient(rgb(139 108 255 / 0.05), rgb(139 108 255 / 0.1));
  transform: translateZ(calc(-25 * var(--u)));
}

/* the axes' numbers and titles: the stage's own ink, softened as a caption is, so they read on
   the dark stage and the light one. 11 units is 4vmin, the controls' size */
.ticks span,
.title {
  position: absolute;
  font: 700 calc(11 * var(--u)) / 1 Inter, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  opacity: 0.72;
}

/* the chart's own box again (preserve-3d makes it the box its numbers are placed in), so the
   numbers keep their own depth: the price at the front of the floor, the rating on the wall */
.ticks {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

/* the price, along the front edge of the floor */
.ticks .x {
  left: calc(var(--t) * var(--W) * var(--u));
  top: calc((var(--H) + 6) * var(--u));
  transform: translateZ(calc(25 * var(--u))) translateX(-50%);
}

/* the rating, up the left edge of the wall */
.ticks .y {
  right: calc(100% + calc(6 * var(--u)));
  bottom: calc(var(--t) * var(--H) * var(--u));
  transform: translateZ(calc(-25 * var(--u))) translateY(50%);
}

.title {
  font-weight: 400;
  font-size: calc(10 * var(--u));
  opacity: 0.66;
}

.title.y {
  right: calc(100% + calc(4 * var(--u)));
  bottom: calc(100% + calc(8 * var(--u)));
  transform: translateZ(calc(-25 * var(--u)));
}

.title.x {
  left: 50%;
  top: calc((var(--H) + 21) * var(--u));
  transform: translateZ(calc(25 * var(--u))) translateX(-50%);
}

.points {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

/* the drop line: dashed, in the chart's plane, from the sphere's middle down to the floor */
.stem {
  position: absolute;
  left: calc((var(--x) * var(--W) - 0.4) * var(--u));
  top: calc((1 - var(--y)) * var(--H) * var(--u));
  width: calc(0.8 * var(--u));
  height: calc(var(--y) * var(--H) * var(--u));
  background: repeating-linear-gradient(var(--c) 0 calc(2.4 * var(--u)), transparent calc(2.4 * var(--u)) calc(4.4 * var(--u)));
  transform-style: preserve-3d;
}

/* its shadow on the floor: a soft disc at the foot of the line, laid flat */
.stem::after {
  content: '';
  position: absolute;
  left: calc(50% - var(--r) * 1.1 * var(--u));
  bottom: calc(var(--r) * -1.1 * var(--u));
  width: calc(var(--r) * 2.2 * var(--u));
  height: calc(var(--r) * 2.2 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--c) 55%, transparent), color-mix(in srgb, var(--c) 20%, transparent) 60%, transparent);
  transform: rotateX(90deg);
}

/* the sphere: the hover target, round, centred on its point and turned to face you, then brought
   forward by its own radius, to where a real sphere's front would be. Turned but left at its point,
   half of the disc tilted behind the chart's plane, and another sphere's drop line, which runs in
   that plane, cut across it. It never moves: its ::before is the ball, which swells when pointed at */
.pt {
  position: absolute;
  left: calc((var(--x) * var(--W) - var(--r)) * var(--u));
  top: calc(((1 - var(--y)) * var(--H) - var(--r)) * var(--u));
  width: calc(var(--r) * 2 * var(--u));
  height: calc(var(--r) * 2 * var(--u));
  border-radius: 50%;
  outline: none;
  cursor: pointer;
  pointer-events: auto;
  transform: ${FACE} translateZ(calc(var(--r) * var(--u)));
}

/* lit from the upper left: a hot spot, the colour, and its own shade on the far side */
.pt::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #fff 0 5%, color-mix(in srgb, var(--c) 45%, #fff) 16%, var(--c) 48%, color-mix(in srgb, var(--c) 55%, #0b0820) 100%);
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pt:hover::before,
.pt:focus-visible::before,
.pt.is-on::before {
  transform: scale(1.14);
}

.pt:focus-visible {
  outline: calc(1.4 * var(--u)) solid #6a45f5;
  outline-offset: calc(3 * var(--u));
}

/* ONE tooltip: JS sets --tx / --ty (its near edge and its top, as plain numbers in the chart's
   units) and --side (1: right of the sphere, -1: left of it). 30 units nearer than the spheres,
   facing you like them, on a card of its own so its words read on either stage */
.tip {
  position: absolute;
  top: 0;
  left: 0;
  padding: calc(4 * var(--u)) calc(7 * var(--u));
  border: calc(1 * var(--u)) solid var(--c, #8b6cff);
  border-radius: calc(6 * var(--u));
  background: ${SURFACE};
  color: ${TEXT};
  font: 400 calc(10 * var(--u)) / calc(13 * var(--u)) Inter, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: pre;
  opacity: 0;
  pointer-events: none;
  transform: translate3d(calc(var(--tx, 0) * var(--u)), calc(var(--ty, 0) * var(--u)), calc(30 * var(--u))) ${FACE} translateX(calc((var(--side, 1) - 1) * 50%));
  transition:
    transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.2s;
}

.tip::first-line {
  font-weight: 700;
}

.tip.is-on {
  opacity: 1;
}`,
    js: `// The data, as an API would send it back: one object per café
const CAFES = ${json};

const COLORS = ['#8b6cff', '#2ee6d6', '#ff4d9d', '#ffb547'];
const chart = document.querySelector('.bubbles .chart');
const points = chart.querySelector('.points');
const ticks = chart.querySelector('.ticks');
const tip = chart.querySelector('.tip');
const W = 180, H = 110; // the chart's size in its own units (--u), as in the CSS
const R = 16; // the biggest sphere's radius, in the same units
const TIP_H = 47; // the tooltip's height: three lines of 13, padding and border

// The axes, rounded out to whole numbers: $2 to $6, 3 to 5 stars
const xs = CAFES.map((d) => d.x), ys = CAFES.map((d) => d.y);
const x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs));
const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
const big = Math.max(...CAFES.map((d) => d.size));
chart.style.setProperty('--xs', x1 - x0);
chart.style.setProperty('--ys', y1 - y0);

const fx = (v) => (v - x0) / (x1 - x0); // a price → a share of the floor's width
const fy = (v) => (v - y0) / (y1 - y0); // a rating → a share of the wall's height
const usd = (v) => '$' + v.toFixed(2);
const text = (d) => \`\${d.label}\\n\${usd(d.x)} · \${d.y.toFixed(1)}★\\n\${d.size} cups a day\`;

// The numbers on the axes. Only text goes in, never HTML.
function tick(cls, t, words) {
  const s = document.createElement('span');
  s.className = cls;
  s.style.setProperty('--t', t);
  s.textContent = words;
  ticks.append(s);
}
for (let v = x0; v <= x1; v++) tick('x', fx(v), '$' + v);
for (let v = y0; v <= y1; v++) tick('y', fy(v), v + '★');

// A drop line and a sphere per café: three plain numbers each, and CSS draws them. The label goes
// in as text (an attribute), never as HTML: an API's response is not trusted markup.
const balls = CAFES.map((d, i) => {
  const r = (Math.sqrt(d.size / big) * R).toFixed(2); // area, not radius, grows with the value
  const vars = { '--x': fx(d.x).toFixed(4), '--y': fy(d.y).toFixed(4), '--r': r, '--c': COLORS[i % COLORS.length] };
  const stem = document.createElement('i');
  stem.className = 'stem';
  const pt = document.createElement('b');
  pt.className = 'pt';
  pt.tabIndex = 0;
  pt.setAttribute('role', 'img');
  pt.setAttribute('aria-label', text(d).replace('\\n', ': ').replace('\\n', ', '));
  for (const [k, v] of Object.entries(vars)) { stem.style.setProperty(k, v); pt.style.setProperty(k, v); }
  points.append(stem, pt);
  return pt;
});

let hideTimer = 0;

// One tooltip: it glides from sphere to sphere (a transform transition) and its words change on
// the way. JS gives it only the sphere's place, in the chart's own units.
function show(i) {
  clearTimeout(hideTimer);
  const d = CAFES[i];
  const r = Math.sqrt(d.size / big) * R;
  const wasOn = tip.classList.contains('is-on');
  if (!wasOn) tip.style.transition = 'none'; // from hidden: appear in place, do not fly in
  tip.textContent = text(d);
  const side = fx(d.x) < 0.5 ? 1 : -1; // on the side with more room
  tip.style.setProperty('--side', side);
  tip.style.setProperty('--tx', (fx(d.x) * W + side * (r * 1.14 + 4)).toFixed(1));
  const top = (1 - fy(d.y)) * H - TIP_H / 2;
  tip.style.setProperty('--ty', Math.min(Math.max(top, -10), H - TIP_H).toFixed(1));
  tip.style.setProperty('--c', COLORS[i % COLORS.length]);
  if (!wasOn) {
    void tip.offsetWidth; // the new place first, then the transition back
    tip.style.transition = '';
  }
  tip.classList.add('is-on');
  balls.forEach((b, k) => b.classList.toggle('is-on', k === i));
}

function hideNow() {
  tip.classList.remove('is-on');
  balls.forEach((b) => b.classList.remove('is-on'));
}

// a short grace, so crossing from one sphere to the next does not blink it
function hide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideNow, 150);
}

const ballOf = (e) => balls.indexOf(e.target.closest?.('.pt'));
function over(e) {
  const i = ballOf(e);
  if (i >= 0) show(i);
}
function leave(e) {
  if (!e.relatedTarget?.closest?.('.pt')) hide();
}
points.addEventListener('pointerover', over);
points.addEventListener('focusin', over);
points.addEventListener('pointerout', leave);
points.addEventListener('focusout', leave);
// a finger has no hover: a tap on a sphere shows it, a tap elsewhere hides it
document.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  const i = ballOf(e);
  if (i >= 0) show(i);
  else hide();
});`,
  },
};
