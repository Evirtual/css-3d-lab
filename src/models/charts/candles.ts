import type { Snippet } from '../snippet-utils';
import type { Demo } from '../types';

/*
 * candles: a 3D candlestick chart drawn from JSON. JS turns each day's prices into four fractions
 * of the visible price range (--lo, --hi, --o, --c) and CSS draws every part from them with
 * scaleY + translateY, so a new range is only a transition on transform.
 */

/** Daily OHLC prices, shaped like a market API's response. The snippet prints it in. */
export const CANDLES = [
  { date: 'Sep 08', open: 57120, high: 58450, low: 56800, close: 58100 },
  { date: 'Sep 09', open: 58100, high: 58900, low: 57350, close: 57540 },
  { date: 'Sep 10', open: 57540, high: 57980, low: 56120, close: 56480 },
  { date: 'Sep 11', open: 56480, high: 57700, low: 55900, close: 57390 },
  { date: 'Sep 12', open: 57390, high: 59100, low: 57210, close: 58860 },
  { date: 'Sep 13', open: 58860, high: 60250, low: 58400, close: 59980 },
  { date: 'Sep 14', open: 59980, high: 60400, low: 58950, close: 59240 },
  { date: 'Sep 15', open: 59240, high: 61200, low: 59020, close: 60870 },
  { date: 'Sep 16', open: 60870, high: 61050, low: 59600, close: 59820 },
  { date: 'Sep 17', open: 59820, high: 60340, low: 58710, close: 58990 },
  { date: 'Sep 18', open: 58990, high: 60120, low: 58600, close: 59770 },
  { date: 'Sep 19', open: 59770, high: 60480, low: 59310, close: 59860 },
];

/** The range switch: how many of the latest days are shown. The last one is the default. */
const RANGES = [7, 12];

const START = RANGES[RANGES.length - 1];

export const demo: Demo = {
  id: 'candles',
  title: '3D candlestick chart from JSON',
  description:
    'Twelve days of prices from a JSON response as glass 3D candles: teal for a day that closed up, pink for down. Point at or tap a candle and one tooltip glides to it with its open, high, low and close; switch to 7 days and the scale zooms in. JS only turns each price into a fraction of the scale.',
  category: 'js',
  tags: ['controls', 'hover', 'data', 'chart', 'json', 'finance'],
  technique: [
    'JSON → --lo / --hi / --o / --c per candle (fractions of the price range)',
    'wick and body: translateY(bottom) scaleY(height), transitioned',
    'cuboid body from one element: ::before side, ::after lid',
    'one shared tooltip gliding on --tx / --ty; slot = width ÷ --n',
  ],
};

/* ---------- the copy-paste snippet ---------- */

const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const TEXT = '#eceefb';
const SURFACE = '#141830';

/** The JSON, one day per line: easier to read than one number per line. */
const json = JSON.stringify(CANDLES, null, 2).replace(/\{\s+([^{}]+?)\s+\}/g, (_, inner: string) => `{ ${inner.replace(/\s*\n\s*/g, ' ')} }`);

export const snippet: Snippet = {
  how: [
    'The data is plain JSON, one object per day, as a market API sends it. JS rounds the lowest low and highest high out to half-thousands for the scale (and to a whole number of thousands across, so the middle number is tidy too), which leaves the candles most of its height, then turns every price into <b>a fraction of that range</b> (0 at the bottom, 1 at the top): <code>--lo</code>, <code>--hi</code>, <code>--o</code>, <code>--c</code> on each candle. Everything you see is CSS.',
    'Every part is a full-height box, squashed and lifted: the wick is <code>translateY(-lo × 100 units) scaleY(hi − lo)</code> from the bottom, the body the same from <code>min(o, c)</code> with a height of <code>max(o − c, c − o)</code>. Only <code>transform</code> changes, so a new range is a smooth transition with no layout work.',
    'The body is one element and two pseudo-elements: the element is the front, <code>::before</code> is hinged on its right edge and turned <code>rotateY(90deg)</code>, <code>::after</code> is hinged on its top edge and laid flat. A flat lid has no height, so the parent\'s <code>scaleY</code> only carries it to the top. The wick is two 2-unit lines crossed at 90°, so it has depth from any side.',
    'Each candle sits in a column one slot wide, placed with <code>translateX((x + 0.5) × slot)</code>, and <code>slot = width ÷ --n</code>. Switching to 7D sets <code>--n: 7</code>: the last seven slide apart, the scale zooms in, and the older days sink into the floor with <code>scale3d(1, 0, 0)</code> <b>where they stood</b> (depth as well as height, or the flat lid would stay lying on the floor). JS leaves their <code>--x</code> alone and pins the <code>--n</code> they were laid out with on the candle itself, and the candle works its slot out from its own <code>--n</code>, so a day leaving the range never slides off past the edge of the floor. Switching back, it rises in the same place.',
    'The column is the hover target: the full height of the chart, it never moves on hover, and it is the only thing that takes the pointer. The chart is turned, so its left half lies behind the flat boxes around it: they get <code>pointer-events: none</code>.',
    'There is <b>one</b> tooltip for the whole chart. JS moves it to the pointed-at candle with <code>--tx</code> / <code>--ty</code> and a transform transition glides it there while its text changes, so it slides from candle to candle instead of blinking. It hangs beside the candle on the side with more room (<code>--side</code>), level with its high but clamped inside the scale, so it never covers the candle it describes and never grows the chart upwards. It floats 40 units towards you with <code>translateZ</code> (the nearer candles would cover it). It stays flat: <code>opacity</code> on a <code>preserve-3d</code> element flattens it, so its thickness is a hard <code>box-shadow</code>. A finger has no hover, so a tap shows it.',
    'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the chart is 180 × 100 of them, and its labels are 11 and the tooltip 10, which is 4vmin and 3.6vmin: the size of the control text, so they read on a card. JS writes the tooltip\'s place as <b>plain numbers</b> in those units, which CSS multiplies by <code>--u</code>; a length in px from JS would stay put while the chart scaled around it. The caption and the 7D / 12D switch are in plain <code>vmin</code>, the same control zone as every other model\'s.',
  ],
  html: `<div class="chart">
  <div class="view">
    <div class="scene">
      <div class="candles3d"></div>
    </div>
  </div>
  <div class="controls">
    <output class="caption"></output>
    <div class="row">
${RANGES.map((n) => `      <button type="button" data-days="${n}">${n}D</button>`).join('\n')}
    </div>
  </div>
</div>`,
  css: `.chart {
  /* one base unit: every length in the chart is a multiple of it, so it is the same share
     of a card, the editor, a full screen and a recording canvas. The control zone under it is
     in plain vmin, because it is the same object in every model. */
  --u: 0.36vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin; /* the band's gap between the model and the control zone */
  font-family: system-ui, sans-serif;
}

.chart * {
  box-sizing: border-box;
}

/* the model box: the same height in every model that has controls, so the zone below it lands
   in the same place whatever the model is */
.view {
  display: grid;
  place-items: center;
  height: 50vmin;
}

.scene {
  perspective: calc(800 * var(--u));
  /* the price labels sit off the right edge and the floor and the dates hang below the chart,
     further on the near (right) side: the room below is what keeps the last date clear of the
     caption under the model box. The tooltip never rises above the scale, so little is needed on top.
     Only the difference between the sides moves the chart (19 units left); the sides together are
     kept small enough that the box, 270 units, is narrower than a square canvas: a box wider than
     the canvas does not centre, it hangs off the right, 7vmin off the middle on 1:1 and 9:16 */
  padding: calc(8 * var(--u)) calc(64 * var(--u)) calc(57 * var(--u)) calc(26 * var(--u));
  /* the turn brings the right end nearer, so it draws larger: moved left by this much, the
     chart, its labels and its floor together sit in the middle */
  translate: calc(-11 * var(--u)) 0;
  pointer-events: none; /* the chart is turned: only the candles' columns take the pointer */
}

.candles3d {
  --n: 12; /* days shown; JS sets it */
  --slot: calc(calc(180 * var(--u)) / var(--n)); /* each day's column */
  position: relative;
  width: calc(180 * var(--u));
  height: calc(100 * var(--u)); /* the price scale */
  transform-style: preserve-3d;
  transform: rotateX(-18deg) rotateY(-26deg);
}

/* the floor: a neon grid laid flat under the candles */
.floor {
  position: absolute;
  left: calc(-10 * var(--u));
  top: calc(85 * var(--u));
  width: calc(200 * var(--u));
  height: calc(30 * var(--u));
  border: calc(1 * var(--u)) solid rgb(139 108 255 / 0.45);
  border-radius: calc(6 * var(--u));
  background:
    repeating-linear-gradient(90deg, rgb(139 108 255 / 0.22) 0 calc(1 * var(--u)), transparent calc(1 * var(--u)) calc(15 * var(--u))),
    repeating-linear-gradient(rgb(139 108 255 / 0.22) 0 calc(1 * var(--u)), transparent calc(1 * var(--u)) calc(15 * var(--u))),
    rgb(139 108 255 / 0.09);
  transform: rotateX(90deg);
}

/* the price scale: lines at the bottom, middle and top, along the back of the floor; the numbers
   at the right end, which reaches out past the last candle. The wall reaches calc(8 * var(--u)) past the scale
   at both ends (a label sticking out of a 3D-placed box gets its top half cut), so its lines
   are calc(1 * var(--u)) gradients at calc(8 * var(--u)), calc(58 * var(--u)) and calc(107 * var(--u)) */
.wall {
  --line: color-mix(in srgb, currentColor 24%, transparent); /* the stage's ink: reads on dark and light */
  position: absolute;
  top: calc(-8 * var(--u));
  left: calc(-10 * var(--u));
  width: calc(200 * var(--u));
  height: calc(116 * var(--u));
  background:
    linear-gradient(var(--line), var(--line)) 0 calc(8 * var(--u)) / 100% calc(1 * var(--u)) no-repeat,
    linear-gradient(var(--line), var(--line)) 0 calc(58 * var(--u)) / 100% calc(1 * var(--u)) no-repeat,
    linear-gradient(var(--line), var(--line)) 0 calc(107 * var(--u)) / 100% calc(1 * var(--u)) no-repeat;
  transform: translateZ(calc(-15 * var(--u)));
}

.wall span {
  position: absolute;
  bottom: calc(calc(8 * var(--u)) + var(--t) * calc(100 * var(--u)));
  left: 100%;
  padding-left: calc(6 * var(--u));
  color: color-mix(in srgb, currentColor 65%, transparent);
  font: 700 calc(11 * var(--u))/calc(13 * var(--u)) system-ui, sans-serif; /* 4vmin, the controls' size */
  white-space: nowrap;
  transform: translateY(50%);
}

/* the first and last day shown, at the front edge of the floor */
.date {
  position: absolute;
  top: calc(100% + calc(6 * var(--u)));
  left: 0;
  color: color-mix(in srgb, currentColor 65%, transparent);
  font: 700 calc(11 * var(--u))/calc(13 * var(--u)) system-ui, sans-serif; /* 4vmin, the controls' size */
  transform: translateZ(calc(15 * var(--u)));
}

.date:last-of-type {
  right: 0;
  left: auto;
}

/* One day: a column the full height of the chart and a slot wide. It is the hover target and
   never moves on hover. Centred on its x, so a new slot width changes only the transform. */
.candle {
  --tone: ${TEAL}; /* closed up */
  --b: min(var(--o), var(--c)); /* the body's bottom… */
  --bh: max(var(--o) - var(--c), var(--c) - var(--o), 0.012); /* …and its height, never 0 */
  position: absolute;
  top: 0;
  left: 0;
  width: var(--slot);
  height: 100%;
  margin-left: calc(var(--slot) * -0.5);
  /* its own slot, from its own --n: the chart's, or, for a day that has left the range, the one
     it was laid out with, so it sinks where it stood instead of sliding off the floor */
  --slot: calc(calc(180 * var(--u)) / var(--n));
  outline: none;
  cursor: pointer;
  pointer-events: auto;
  transform-origin: bottom center;
  transform-style: preserve-3d;
  /* --in: 1 in the range, 0 outside it (sunk into the floor). Depth goes with height: the lid
     lies flat and has no height to lose, so scaleY alone would leave it lying on the floor */
  transform: translateX(calc((var(--x) + 0.5) * var(--slot))) scale3d(1, var(--in), var(--in));
  transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * 30ms);
}

.candle.is-down {
  --tone: ${PINK};
}

.candle.is-out {
  pointer-events: none;
}

.candle i {
  position: absolute;
  top: 0;
  left: 50%;
  height: 100%;
  pointer-events: none;
  transform-origin: bottom center; /* scaleY grows up from the floor */
  transform-style: preserve-3d;
  transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * 30ms);
}

.candle i::before,
.candle i::after {
  content: '';
  position: absolute;
}

/* the wick: low → high, and a second line crossed at 90° so it has depth */
.wick {
  width: calc(2 * var(--u));
  margin-left: calc(-1 * var(--u));
  background: var(--tone);
  box-shadow: 0 0 calc(6 * var(--u)) color-mix(in srgb, var(--tone) 70%, transparent);
  transform: translateY(calc(var(--lo) * calc(-100 * var(--u)))) scaleY(calc(var(--hi) - var(--lo)));
}

.wick::before {
  inset: 0;
  background: inherit;
  transform: rotateY(90deg);
}

/* the body: open ↔ close, coloured glass (the wick shows through). The element is the front,
   pushed half its depth towards you */
.body {
  /* a fine edge: under calc(1 * var(--u)) shows as a hairline on sharp screens */
  --edge: calc(0.6 * var(--u)) solid color-mix(in srgb, color-mix(in srgb, var(--tone) 80%, #fff) 75%, transparent);
  width: calc(9 * var(--u));
  margin-left: calc(-4.5 * var(--u));
  border: var(--edge);
  background: color-mix(in srgb, var(--tone) 58%, transparent);
  box-shadow:
    inset 0 0 calc(8 * var(--u)) color-mix(in srgb, var(--tone) 30%, transparent),
    0 0 calc(10 * var(--u)) color-mix(in srgb, var(--tone) 22%, transparent);
  transform: translateY(calc(var(--b) * calc(-100 * var(--u)))) scaleY(var(--bh)) translateZ(calc(4.5 * var(--u)));
}

/* right side, darker: hinged on the front's right edge, turned back */
.body::before {
  top: calc(-0.6 * var(--u));
  left: 100%;
  width: calc(9 * var(--u));
  height: calc(100% + calc(1.2 * var(--u)));
  border: var(--edge);
  background: color-mix(in srgb, color-mix(in srgb, var(--tone) 55%, #05060c) 64%, transparent);
  transform-origin: left center;
  transform: rotateY(90deg);
}

/* the lid: hinged on the front's top edge, laid flat; scaleY only carries it up */
.body::after {
  top: calc(-0.6 * var(--u));
  left: calc(-0.6 * var(--u));
  width: calc(9 * var(--u));
  height: calc(9 * var(--u));
  border: var(--edge);
  background: color-mix(in srgb, var(--tone) 80%, transparent);
  transform-origin: center top;
  transform: rotateX(-90deg);
}

/* the pointed-at candle (.is-active) fills in and glows: an overlay on the body's front, the
   same transform a hair nearer, faded with opacity */
.candle::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: calc(9 * var(--u));
  height: 100%;
  margin-left: calc(-4.5 * var(--u));
  background: color-mix(in srgb, var(--tone) 50%, transparent);
  box-shadow: 0 0 calc(20 * var(--u)) color-mix(in srgb, var(--tone) 60%, transparent);
  opacity: 0;
  pointer-events: none;
  transform-origin: bottom center;
  transform: translateY(calc(var(--b) * calc(-100 * var(--u)))) scaleY(var(--bh)) translateZ(calc(4.7 * var(--u)));
  transition:
    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * 30ms),
    opacity 0.25s;
}

.candle.is-active::after {
  opacity: 1;
}

/* ONE tooltip for the chart: JS sets --tx / --ty (the edge beside the candle and the tooltip's
   top, level with the candle's high but kept inside the scale, as plain numbers in the chart's
   own units, which CSS multiplies by --u) and --side (1: it hangs to the right of the candle,
   -1: to the left), and it glides there. calc(40 * var(--u)) towards you.
   Flat on purpose: its thickness is a hard edge up and to the right, where the depth runs. */
.tip {
  --tone: ${TEAL};
  position: absolute;
  top: 0;
  left: 0;
  padding: calc(4 * var(--u)) calc(8 * var(--u));
  border: calc(1 * var(--u)) solid var(--tone);
  border-radius: calc(6 * var(--u));
  background: ${SURFACE};
  box-shadow:
    calc(3 * var(--u)) calc(-3 * var(--u)) 0 color-mix(in srgb, var(--tone) 55%, #05060c),
    0 0 calc(14 * var(--u)) color-mix(in srgb, var(--tone) 40%, transparent);
  color: ${TEXT}; /* on its own dark card, so it reads on a light stage too */
  /* 10 units is 3.6vmin: it reads on a card. Three lines of 13 + padding + border = TIP_H in the JS */
  font: 700 calc(10 * var(--u))/calc(13 * var(--u)) system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: pre; /* three short lines: the date, then open and high, then low and close */
  opacity: 0;
  pointer-events: none;
  transform: translate(calc(var(--tx, 0) * var(--u)), calc(var(--ty, 0) * var(--u))) translate(calc((var(--side, 1) - 1) * 50%), 0) translateZ(calc(40 * var(--u)));
  transition:
    transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.2s;
}

.tip.is-down {
  --tone: ${PINK};
}

.tip.is-on {
  opacity: 1;
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
  js: `// The data, as a market API would send it back: one object per day
const CANDLES = ${json};

const chart = document.querySelector('.candles3d');
const out = document.querySelector('.chart output');
const buttons = document.querySelectorAll('.controls .row button');
const STEP = 500; // the scale is rounded out to half-thousands…
const W = 180, H = 100; // the chart's size in its own units (--u), as in the CSS
const TIP_H = 49; // the tooltip's height in the same units: 3 lines of 13, padding and border

// …and to a whole number of thousands across, so its middle number is tidy too
function bounds(low, high) {
  let min = Math.floor(low / STEP) * STEP;
  let max = Math.ceil(high / STEP) * STEP;
  if ((max - min) % (2 * STEP)) {
    if (low - min < max - high) min -= STEP;
    else max += STEP;
  }
  return [min, max];
}

// Prices the way trading apps write them: $61,200, $58.5k, +4.8%, −1.2% (a real minus)
const usd = (v) => '$' + v.toLocaleString('en-US');
const usdK = (v) => '$' + (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'k';
const pct = (v) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(1) + '%';
const tipText = (d) => \`\${d.date} · O \${usd(d.open)} H \${usd(d.high)} L \${usd(d.low)} C \${usd(d.close)}\`;
// the tooltip shows the same words on three short lines, so they can be big enough to read on a card
const tipLines = (d) => \`\${d.date}\\nO \${usd(d.open)}  H \${usd(d.high)}\\nL \${usd(d.low)}  C \${usd(d.close)}\`;

// Build the chart once: the floor, the scale, two date labels, a column per day holding a wick
// and a body, and ONE tooltip. Only empty markup goes in as HTML.
chart.innerHTML =
  '<div class="floor"></div>' +
  '<div class="wall">' + [0, 0.5, 1].map((t) => \`<span style="--t:\${t}"></span>\`).join('') + '</div>' +
  '<span class="date"></span><span class="date"></span>' +
  CANDLES.map((_, i) => \`<div class="candle" style="--i:\${i}"><i class="wick"></i><i class="body"></i></div>\`).join('') +
  '<b class="tip" aria-hidden="true"></b>';
const candles = [...chart.querySelectorAll('.candle')];
const ticks = chart.querySelectorAll('.wall span');
const dates = chart.querySelectorAll('.date');
const tip = chart.querySelector('.tip');

// The words come from the data, so they go in with textContent (or an attribute), never as
// HTML: an API's response is not trusted markup
CANDLES.forEach((d, i) => {
  candles[i].setAttribute('aria-label', tipText(d));
  candles[i].classList.toggle('is-down', d.close < d.open);
});

let view; // what is shown now: n, offset and the price → fraction function
let active = -1;
let hideTimer = 0;

// Show the last n days: every price becomes a fraction of the visible range. CSS does the rest.
function show(n) {
  const offset = CANDLES.length - n;
  const days = CANDLES.slice(offset);
  const low = Math.min(...days.map((d) => d.low));
  const high = Math.max(...days.map((d) => d.high));
  const [min, max] = bounds(low, high);
  const f = (p) => (p - min) / (max - min);
  view = { n, offset, f };

  const before = chart.style.getPropertyValue('--n') || n; // the layout the candles stand in now
  chart.style.setProperty('--n', n);
  candles.forEach((el, i) => {
    const x = i - offset; // its slot; below 0: outside the range
    const d = CANDLES[i];
    const shown = x >= 0;
    if (shown) {
      el.style.setProperty('--x', x);
      el.style.removeProperty('--n'); // the chart's --n, so the chart's slot
    } else if (!el.classList.contains('is-out')) {
      // leaving: it keeps its --x and the --n it stood in, so it sinks where it is
      if (!el.style.getPropertyValue('--x')) el.style.setProperty('--x', i - CANDLES.length + Number(before));
      el.style.setProperty('--n', before);
    }
    el.style.setProperty('--in', shown ? 1 : 0); // 0: sinks into the floor
    if (shown) {
      el.style.setProperty('--lo', f(d.low).toFixed(3));
      el.style.setProperty('--hi', f(d.high).toFixed(3));
      el.style.setProperty('--o', f(d.open).toFixed(3));
      el.style.setProperty('--c', f(d.close).toFixed(3));
    }
    el.classList.toggle('is-out', !shown);
    el.tabIndex = shown ? 0 : -1;
    el.toggleAttribute('aria-hidden', !shown);
  });

  [min, (min + max) / 2, max].forEach((p, k) => (ticks[k].textContent = usdK(p)));
  dates[0].textContent = days[0].date;
  dates[1].textContent = days[n - 1].date;
  const change = ((days[n - 1].close - days[0].open) / days[0].open) * 100;
  out.textContent = \`\${n} days · \${pct(change)} · high \${usd(high)}\`;
  buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.days === String(n)));

  // the tooltip follows its candle to the new place, or goes if the candle left the range
  if (active >= offset) place(active);
  else if (active >= 0) hideNow();
}

// One tooltip: it glides from candle to candle (a transform transition) and its text changes on
// the way. JS only gives it the candle's place.
function place(i) {
  clearTimeout(hideTimer);
  const d = CANDLES[i];
  const x = i - view.offset;
  const wasOn = tip.classList.contains('is-on');
  if (!wasOn) tip.style.transition = 'none'; // from hidden: appear in place, don't fly in
  tip.textContent = tipLines(d);
  // beside the candle, on the side with more room, so it never covers the candle it describes
  const side = x < view.n / 2 ? 1 : -1;
  const slot = W / view.n;
  tip.style.setProperty('--side', side);
  tip.style.setProperty('--tx', ((x + 0.5) * slot + side * (slot / 2 + 2)).toFixed(1)); // its near edge, in the chart's own units
  // level with the candle's high, but never above the top of the scale or below the floor
  const top = (1 - view.f(d.high)) * H - TIP_H / 2;
  tip.style.setProperty('--ty', Math.min(Math.max(top, 0), H - TIP_H).toFixed(1));
  tip.classList.toggle('is-down', d.close < d.open);
  if (!wasOn) {
    void tip.offsetWidth; // apply the new place before the transition comes back
    tip.style.transition = '';
  }
  tip.classList.add('is-on');
  candles.forEach((c, k) => c.classList.toggle('is-active', k === i));
  active = i;
}

function hideNow() {
  clearTimeout(hideTimer);
  tip.classList.remove('is-on');
  candles.forEach((c) => c.classList.remove('is-active'));
  active = -1;
}

// a short grace period, so crossing from one candle to the next does not flicker it
function hide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideNow, 150);
}

const candleOf = (e) => e.target.closest('.candle:not(.is-out)');
function over(e) {
  const c = candleOf(e);
  if (c) place(candles.indexOf(c));
}
function leave(e) {
  if (!e.relatedTarget?.closest?.('.candle')) hide();
}
chart.addEventListener('pointerover', over);
chart.addEventListener('focusin', over);
chart.addEventListener('pointerout', leave);
chart.addEventListener('focusout', leave);
// a finger has no hover: a tap on a candle shows its tooltip, a tap elsewhere hides it
document.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  const c = candleOf(e);
  if (c) place(candles.indexOf(c));
  else hide();
});

buttons.forEach((b) => b.addEventListener('click', () => show(Number(b.dataset.days))));

show(${START});`,
};
