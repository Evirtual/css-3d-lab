import type { Demo } from '../types';
import type { Snippet } from '../snippet-utils';

/*
 * A radar (spider) chart from JSON. The chart is plain SVG: JS turns each score into a point on
 * its axis and joins them into one polygon per series. The 3D is all on the containers: the plate
 * lies back, each series floats at its own height over the web, and the axis names stand up to
 * face you. Hovering the (still) wrapper lays it flat, and one shared tooltip glides from axis to
 * axis with that axis' scores.
 */

/** The data, shaped like an API response: two products scored 0 to `max` on each axis. */
const RADAR = {
  max: 10,
  axes: ['Speed', 'Design', 'Docs', 'Tests', 'Support', 'Price'],
  series: [
    { name: 'Ours', values: [8, 9, 6, 7, 8, 5] },
    { name: 'Theirs', values: [6, 5, 8, 5, 4, 8] },
  ],
};

export const demo: Demo = {
  id: 'radar',
  title: '3D radar chart from JSON',
  description:
    'Two series compared on six axes, drawn as SVG from a JSON object, on a plate lying back with each series floating at its own height. Switch a series on or off below; hover or tap the chart and it lies flat, with one tooltip gliding from axis to axis.',
  category: 'js',
  tags: ['controls', 'hover', 'data', 'chart', 'json', 'svg'],
  technique: [
    'JSON → points (cos / sin × value) → <polygon>',
    'series layers at translateZ 10 / 22 units',
    'axis names stand up: the plate’s rotation undone',
    'one tooltip that glides: --tx / --ty + transform transition',
  ],
};

// ---------------------------------------------------------------------------------------------
// The copy-paste version: plain HTML + CSS + JS, the same JSON printed at the top of the JS.

const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const TEXT = '#eceefb';
const MUTED = '#949bc0';
const SURFACE = '#141830';

/** The JSON, with its arrays on one line each. */
const json = JSON.stringify(RADAR, null, 2).replace(/\[\s+([^[\]{}]+?)\s+\]/g, (_, inner: string) => `[${inner.replace(/\s+/g, ' ')}]`);

const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export const snippet: Snippet = {
  how: [
    'The chart is ordinary SVG. Axis <code>i</code> points at angle <code>i × 360° ÷ n</code>, so a score becomes the point <code>(cos a, sin a) × radius × value ÷ max</code>. Join a series’ points and you have its <code>&lt;polygon&gt;</code>; the same maths at fixed fractions draws the rings of the web.',
    'The 3D is only on containers: the plate lies back with <code>rotateX(50deg) rotateZ(-12deg)</code>, and each series is its own layer at <code>translateZ</code> 10 and 22 units, so the two see-through shapes float over the web at different heights instead of blending into one plane.',
    'The axis names would be squashed by the tilt, so each one stands up: <code>rotateZ(12deg) rotateX(-50deg)</code> is the plate’s rotation in reverse order, which cancels it and leaves the text facing you.',
    'Hovering the still wrapper sets every rotation to 0: the plate lies flat and the layers sink onto the web so the points meet the rings. The wrapper never moves, so the hover never flickers, and the pointer’s angle from its centre says which axis you point at.',
    'There is <b>one</b> tooltip for the chart. JS writes the axis’ place into <code>--tx / --ty</code> and changes its text; a <code>transform</code> transition makes it glide from axis to axis instead of labels blinking in and out. From hidden it is placed with the transition off, so it does not fly in.',
    'The series buttons are real <code>&lt;button aria-pressed&gt;</code>; switching one only toggles a class that fades its layer with <code>opacity</code>. The series you point at (its button, or the leader on the axis the tooltip shows) fades in a fuller, glowing copy of its polygon. The glow is the polygon drawn again, wide and faint, underneath: no blur <code>filter</code>.',
    "Every length is a multiple of one base unit, <code>--u</code>, and the SVGs' viewBox is the plate in those units. JS writes every place (the layers' heights, the axis names, the tooltip) as <b>plain numbers</b> in the chart's own units, which CSS multiplies by it. A length written in px from JS would stay the same size while the chart scaled around it, and the names and the tooltip would drift off the web. The caption and the series buttons are in plain <code>vmin</code>: the control zone is the same object, at the same size, in every model.",
  ],
  html: `<div class="radar">
  <div class="view">
    <div class="scene">
      <div class="chart3d" tabindex="0" role="img" aria-label="Radar chart">
        <div class="plate">
          <div class="base"></div>
          <svg class="web" viewBox="0 0 208 164" aria-hidden="true"><path class="rings" /><path class="spokes" /></svg>
          <div class="axes"></div>
          <b class="tip" aria-hidden="true"><em></em></b>
        </div>
      </div>
    </div>
  </div>
  <div class="controls">
    <output class="caption"></output>
    <div class="row toggles"></div>
  </div>
</div>`,
  css: `.radar {
  /* one base unit: every length in the chart is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas. The control zone under it is in
     plain vmin, because it is the same object in every model. */
  --u: 0.27vmin;
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
  padding: calc(16 * var(--u)) calc(30 * var(--u)) calc(10 * var(--u));
  pointer-events: none; /* the plate lies back, partly behind this box: only the wrapper takes the pointer */
}

/* the still wrapper: it takes the hover and never moves, so the hover never flickers */
.chart3d {
  position: relative;
  width: calc(208 * var(--u));
  height: calc(164 * var(--u));
  outline: none;
  transform-style: preserve-3d;
  pointer-events: auto;
}

/* the tilt lives here */
.plate {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateX(50deg) rotateZ(-12deg);
  transition: transform 0.7s ${EASE};
  pointer-events: none;
}

.chart3d:hover .plate,
.chart3d:focus-visible .plate,
.chart3d.is-flat .plate {
  transform: rotateX(0deg) rotateZ(0deg);
}

.base {
  position: absolute;
  inset: 0;
  border: calc(1 * var(--u)) solid rgb(139 108 255 / 0.5);
  border-radius: calc(14 * var(--u));
  background: linear-gradient(150deg, #2a2560, ${SURFACE});
  box-shadow: 0 calc(18 * var(--u)) calc(36 * var(--u)) calc(-14 * var(--u)) rgb(0 0 0 / 0.55);
}

.plate svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.web {
  transform: translateZ(calc(1 * var(--u)));
}

.rings {
  fill: none;
  stroke: rgb(139 108 255 / 0.45);
  stroke-width: 1;
}

.spokes {
  fill: none;
  stroke: rgb(236 238 251 / 0.16);
  stroke-width: 1;
}

/* one SVG layer per series, floating at its own height (--z, in units); --c is its colour */
.series {
  transform: translateZ(calc(var(--z) * var(--u)));
  transition:
    transform 0.7s ${EASE},
    opacity 0.35s;
}

/* lying flat, the layers sink onto the web so the points meet the rings */
.chart3d:hover .series,
.chart3d:focus-visible .series,
.chart3d.is-flat .series {
  transform: translateZ(calc(var(--z) * var(--u) / 8));
}

/* see-through glass with a bright one-unit edge */
.series polygon {
  fill: color-mix(in srgb, var(--c) 46%, transparent);
  stroke: color-mix(in srgb, color-mix(in srgb, var(--c) 80%, #fff) 75%, transparent);
  stroke-width: 1;
  stroke-linejoin: round;
}

/* the glow: the same polygon, wide and faint, underneath (cheaper than a blur filter) */
.series .glow {
  fill: none;
  stroke: var(--c);
  stroke-width: 8;
  stroke-opacity: 0.22;
}

/* the series lit up (its button pointed at, or the leader on the pointed axis): a fuller,
   glowing copy that fades in */
.series .lit {
  fill: color-mix(in srgb, var(--c) 28%, transparent);
  stroke: var(--c);
  stroke-width: 14;
  stroke-opacity: 0.3;
  opacity: 0;
  transition: opacity 0.25s;
}

.series.is-active .lit {
  opacity: 1;
}

/* a dot at every point: zero-length segments ("M x y h0") with round caps */
.series .dots {
  fill: none;
  stroke: color-mix(in srgb, var(--c) 60%, ${TEXT});
  stroke-width: 5;
  stroke-linecap: round;
}

/* a series switched off in the dock fades out */
.series.is-off {
  opacity: 0;
}

/* the axis names stand up: the plate's rotation, reversed, cancels it */
.axes {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

.axes span {
  position: absolute;
  top: calc(var(--y) * var(--u)); /* JS writes plain numbers in the chart's own units */
  left: calc(var(--x) * var(--u));
  /* written on the plate, so in the plate's own light ink; a long name ("Support") runs past
     its edge and a standing name rises over it, so a halo of the plate's colour keeps the part
     that is off the plate readable on a light stage too */
  color: ${TEXT};
  text-shadow:
    0 0 calc(1.5 * var(--u)) ${SURFACE},
    0 0 calc(1.5 * var(--u)) ${SURFACE},
    0 0 calc(3 * var(--u)) ${SURFACE};
  font: 700 calc(12 * var(--u))/calc(14 * var(--u)) system-ui, sans-serif;
  white-space: nowrap;
  /* --ax: 1 reads rightwards from the anchor, -1 leftwards, 0 is centred on it */
  translate: calc((var(--ax) - 1) * 50%) -50%;
  transform: translateZ(calc(6 * var(--u))) rotateZ(12deg) rotateX(-50deg);
  transition: transform 0.7s ${EASE};
}

.chart3d:hover .axes span,
.chart3d:focus-visible .axes span,
.chart3d.is-flat .axes span {
  transform: translateZ(calc(2 * var(--u))) rotateZ(0deg) rotateX(0deg);
}

/* ONE tooltip for the chart: JS sets its place (--tx, --ty, plain numbers in the chart's own
   units that CSS multiplies by --u), its text and its colour (--c, the
   axis' leader); the transform transition makes it glide from axis to axis. Its thickness is
   a hard shadow below it, not a 3D box. */
.tip {
  --c: ${VIOLET};
  position: absolute;
  top: 0;
  left: 0;
  padding: calc(3 * var(--u)) calc(7 * var(--u));
  border: calc(1 * var(--u)) solid var(--c);
  border-radius: calc(6 * var(--u));
  background: ${SURFACE};
  box-shadow:
    0 calc(3 * var(--u)) 0 color-mix(in srgb, var(--c) 55%, #05060c),
    0 0 calc(14 * var(--u)) color-mix(in srgb, var(--c) 40%, transparent);
  color: ${TEXT};
  font: 700 calc(12 * var(--u))/calc(14 * var(--u)) system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  text-align: center;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate(calc(var(--tx, 0) * var(--u)), calc(var(--ty, 0) * var(--u))) translate(-50%, -50%) translateZ(calc(8 * var(--u)));
  transition:
    transform 0.35s ${EASE},
    opacity 0.2s;
}

.tip.is-on {
  opacity: 1;
}

.tip em {
  display: block;
  color: ${MUTED};
  font-size: calc(10 * var(--u));
  font-style: normal;
  line-height: calc(12 * var(--u));
}

.tip span {
  margin: 0 calc(3 * var(--u));
  color: color-mix(in srgb, var(--c) 75%, ${TEXT});
}

/* a series switched off has no value in the tooltip */
.tip span.is-off {
  display: none;
}

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the chart's own unit. The caption is on its own line above
   the row, and its line box never changes height, so a new summary cannot move the chart. */
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
}

/* the series buttons: real toggles, each with its colour as a dot */
.controls button {
  display: inline-flex;
  align-items: center;
  gap: 1.5vmin;
}

/* the series' colour as a dot: hollow when off, filled when on */
.toggles button::before {
  content: '';
  box-sizing: border-box;
  width: 2.6vmin;
  height: 2.6vmin;
  border: 0.6vmin solid var(--c);
  border-radius: 50%;
}

.toggles button[aria-pressed='true'] {
  background: color-mix(in srgb, var(--c) 22%, transparent);
  box-shadow: inset 0 0 0 0.3vmin color-mix(in srgb, var(--c) 60%, transparent);
  color: inherit;
}

.toggles button[aria-pressed='true']::before {
  background: var(--c);
}`,
  js: `// The data, as an API would send it back
const RADAR = ${json};

const COLORS = ['${TEAL}', '${PINK}']; // one per series
const W = 208, H = 164, CX = W / 2, CY = H / 2; // the plate in the chart's own units; the SVG viewBox is the same
const R = 56; // the web's outer ring
const n = RADAR.axes.length;
const score = (v) => \`\${v}/\${RADAR.max}\`; // the way a dashboard writes it: 8/10

// Axis i points straight up for i = 0 and goes round clockwise
const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
// the point at distance r from the centre along axis i
const at = (i, r) => [CX + Math.cos(angle(i)) * r, CY + Math.sin(angle(i)) * r];
const fix = ([x, y]) => \`\${x.toFixed(1)} \${y.toFixed(1)}\`;
// 1 for an axis pointing right, -1 left, 0 straight up or down
const side = (i) => (Math.abs(Math.cos(angle(i))) < 0.3 ? 0 : Math.sign(Math.cos(angle(i))));

// The web: a ring every fifth of the scale, and a spoke per axis
document.querySelector('.rings').setAttribute('d',
  [0.2, 0.4, 0.6, 0.8, 1].map((f) => 'M' + RADAR.axes.map((_, i) => fix(at(i, R * f))).join(' L') + 'Z').join(' '));
document.querySelector('.spokes').setAttribute('d',
  RADAR.axes.map((_, i) => \`M\${CX} \${CY} L\${fix(at(i, R))}\`).join(' '));

const chart = document.querySelector('.chart3d');
const plate = chart.querySelector('.plate');
const axes = plate.querySelector('.axes');
const tip = plate.querySelector('.tip');
const SVG = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs) => {
  const el = document.createElementNS(SVG, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
};

// One SVG layer per series: a glow, the lit-up copy (hidden until its button is pointed at),
// the glass polygon and its dots
const layers = RADAR.series.map((s, k) => {
  const pts = s.values.map((v, i) => at(i, (R * v) / RADAR.max));
  const poly = pts.map((p) => fix(p).replace(' ', ',')).join(' ');
  const svg = svgEl('svg', { class: 'series', viewBox: \`0 0 \${W} \${H}\`, 'aria-hidden': 'true' });
  svg.style.cssText = \`--c:\${COLORS[k]}; --z:\${10 + k * 12}\`; // each series 12 units above the last (a plain number: CSS multiplies it by --u)
  svg.append(
    svgEl('polygon', { class: 'glow', points: poly }),
    svgEl('polygon', { class: 'lit', points: poly }),
    svgEl('polygon', { points: poly }),
    svgEl('path', { class: 'dots', d: pts.map((p) => \`M\${fix(p)}h0\`).join('') }),
  );
  plate.insertBefore(svg, axes);
  return svg;
});

// The axis names, just outside the web: the side ones start 14 units out and read outwards
// (--ax: 1 or -1), the top and bottom ones sit 18 units out, centred (--ax: 0).
// Text from the data always goes in with textContent, never as HTML: an API is not trusted markup.
RADAR.axes.forEach((a, i) => {
  const [x, y] = at(i, R + (side(i) ? 14 : 18));
  const label = document.createElement('span');
  label.textContent = a;
  label.style.cssText = \`--x:\${x}; --y:\${y}; --ax:\${side(i)}\`; // plain numbers: CSS multiplies them by --u
  axes.append(label);
});

// The tooltip: the axis' name, then one value per series in its colour
const tipName = tip.querySelector('em');
const tipValues = RADAR.series.map((_, k) => {
  const span = document.createElement('span');
  span.style.setProperty('--c', COLORS[k]);
  tip.append(span);
  return span;
});

chart.setAttribute('aria-label', 'Radar chart. ' +
  RADAR.series.map((s) => \`\${s.name}: \${s.values.map((v, i) => \`\${RADAR.axes[i]} \${score(v)}\`).join(', ')}\`).join('. '));

// The series buttons: real buttons with aria-pressed
const toggles = document.querySelector('.toggles');
const buttons = RADAR.series.map((s, k) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = s.name;
  btn.style.setProperty('--c', COLORS[k]);
  btn.setAttribute('aria-pressed', 'true');
  toggles.append(btn);
  return btn;
});
const shown = () => buttons.map((b) => b.getAttribute('aria-pressed') === 'true');

// Which shown series scores highest on axis i (-1 for a tie, or when none is shown)
function leader(i, on) {
  let best = -1, tie = false;
  RADAR.series.forEach((s, k) => {
    if (!on[k]) return;
    const top = best < 0 ? -Infinity : RADAR.series[best].values[i];
    if (s.values[i] > top) { best = k; tie = false; }
    else if (s.values[i] === top) tie = true;
  });
  return tie ? -1 : best;
}

// The dock's line: who leads where, for the series that are switched on
const out = document.querySelector('.radar output');
function summary(on) {
  const list = RADAR.series.filter((_, k) => on[k]);
  if (list.length === 0) return 'Nothing shown · press a name'; // short: the caption is one line
  if (list.length === 1) {
    const { name, values } = list[0];
    const hi = Math.max(...values), lo = Math.min(...values);
    return \`\${name} · best \${RADAR.axes[values.indexOf(hi)]} \${hi} · worst \${RADAR.axes[values.indexOf(lo)]} \${lo}\`;
  }
  const [a, b] = list;
  const wins = a.values.filter((v, i) => v > b.values[i]).length;
  const losses = a.values.filter((v, i) => v < b.values[i]).length;
  const ties = n - wins - losses;
  return \`\${a.name} leads on \${wins} of \${n} · \${b.name} on \${losses}\` + (ties ? \` · \${ties} tied\` : '');
}
out.textContent = summary(shown());

// ONE tooltip for the chart. JS writes the axis' place into --tx / --ty and changes the text;
// the CSS transition makes it glide from axis to axis.
let active = -1;
let hideTimer = 0;
let lead = -1; // the series leading on the pointed axis
let pointed = -1; // the series whose button is pointed at or focused
// One series at a time fills in and glows more: the pointed button's, else the axis' leader.
// CSS fades its brighter copy in and out with opacity.
function relight() {
  const k = pointed >= 0 ? pointed : lead;
  layers.forEach((l, j) => l.classList.toggle('is-active', j === k));
}

// (refresh: only new text for the same axis, e.g. after a toggle; a pending hide still runs)
function place(i, refresh = false) {
  if (!refresh) clearTimeout(hideTimer);
  const wasOn = tip.classList.contains('is-on');
  // from hidden it appears in place, not flying in from where it was last
  if (!wasOn) tip.style.transition = 'none';
  const [x, y] = at(i, R + (side(i) ? 26 : 14)); // over the axis' name
  tip.style.setProperty('--tx', x); // plain numbers: CSS multiplies them by --u
  tip.style.setProperty('--ty', y);
  lead = leader(i, shown());
  tip.style.setProperty('--c', lead < 0 ? '${VIOLET}' : COLORS[lead]);
  relight();
  tipName.textContent = RADAR.axes[i];
  tipValues.forEach((el, k) => (el.textContent = score(RADAR.series[k].values[i])));
  if (!wasOn) {
    void tip.offsetWidth; // apply the new place before the transition comes back
    tip.style.transition = '';
  }
  tip.classList.add('is-on');
  active = i;
}
// a short grace period, so leaving and coming straight back does not blink it
function hide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    tip.classList.remove('is-on');
    active = -1;
    lead = -1;
    relight();
  }, 150);
}
// the axis nearest the pointer's direction from the centre of the (still) wrapper
function axisAt(e) {
  const r = chart.getBoundingClientRect();
  const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  return ((Math.round((a + Math.PI / 2) / ((2 * Math.PI) / n)) % n) + n) % n;
}

chart.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const i = axisAt(e);
  if (i !== active || !tip.classList.contains('is-on')) place(i);
});
chart.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'mouse') hide();
});
// a finger has no hover: a tap lays the chart flat and points at the tapped axis;
// tapping the same axis again stands it back up
chart.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  const i = axisAt(e);
  if (chart.classList.contains('is-flat') && i === active) {
    chart.classList.remove('is-flat');
    hide();
  } else {
    chart.classList.add('is-flat');
    place(i);
  }
});
// keyboard: focus shows the first axis, the arrow keys walk round
chart.addEventListener('focus', () => place(active < 0 ? 0 : active));
chart.addEventListener('blur', hide);
chart.addEventListener('keydown', (e) => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!step) return;
  e.preventDefault();
  place((((active < 0 ? 0 : active) + step) % n + n) % n);
});

// A button only flips classes; CSS fades the layer (opacity). Pointing at one lights its series up.
buttons.forEach((btn, k) => {
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', on);
    layers[k].classList.toggle('is-off', !on);
    tipValues[k].classList.toggle('is-off', !on);
    out.textContent = summary(shown());
    if (tip.classList.contains('is-on')) place(active, true); // the leader may have changed
  });
  const light = (on) => () => {
    pointed = on ? k : -1;
    relight();
  };
  btn.addEventListener('pointerenter', light(true));
  btn.addEventListener('pointerleave', light(false));
  btn.addEventListener('focus', light(true));
  btn.addEventListener('blur', light(false));
});`,
};
