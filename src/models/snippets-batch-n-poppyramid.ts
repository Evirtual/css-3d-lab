import type { Snippet } from './snippet-utils';

/*
 * poppyramid: a population pyramid from JSON. Each age band is a row: a bar for men running left
 * from the column of ages and a bar for women running right, each a slab (a front and a lid folded
 * back) on a chart tipped back a little so the lids show. JS turns every count into a share of one
 * fixed scale, --v, and CSS draws the bar with scaleX(--v), so switching the year is only a
 * transition on transform. The row is the hover target; the caption under the chart reads out the
 * band pointed at, and the year buttons sit beside it in the control zone.
 */

/** The data, shaped like a statistics API's response: thousands of people per age band. */
const POP = {
  unit: 'thousands',
  note: 'illustrative figures',
  bands: ['0–9', '10–19', '20–29', '30–39', '40–49', '50–59', '60–69', '70–79', '80+'],
  years: {
    1994: {
      men: [2900, 2850, 2950, 2700, 2300, 1900, 1500, 900, 300],
      women: [2760, 2720, 2860, 2680, 2320, 2000, 1700, 1250, 560],
    },
    2024: {
      men: [2100, 2350, 2600, 2850, 2900, 2750, 2300, 1500, 650],
      women: [2000, 2230, 2500, 2780, 2880, 2800, 2480, 1850, 1150],
    },
  },
};

const YEARS = Object.keys(POP.years);
const START = YEARS[YEARS.length - 1];
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';

/** The JSON, with each series on one line. */
const json = JSON.stringify(POP, null, 2).replace(/\[\s+([^[\]]+?)\s+\]/g, (_, inner: string) => `[${inner.replace(/\s+/g, ' ')}]`);

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export const snippetsPoppyramid: Record<string, Snippet> = {
  poppyramid: {
    how: [
      'The data is a JSON object, as a statistics API would send it: the age bands, then per year a list of men and a list of women, in thousands. JS finds the biggest count across <b>both</b> years, rounds it up to a tidy scale (3 million), and turns every count into a share of it, <code>--v</code>, a plain number from 0 to 1 on each bar. One scale for both years is what makes the switch honest: a band that shrank looks smaller.',
      'Each bar is the full width of its side, drawn with <code>transform: scaleX(var(--v))</code> from the axis (<code>transform-origin</code> on its inner end). Switching the year only writes new numbers; a <code>transition</code> on transform, delayed a little more per row, does the motion, and nothing is laid out again.',
      'A bar is a slab from one element: the element is the front, and its <code>::after</code> is the lid, hinged on the top edge and folded back with <code>rotateX(-90deg)</code>. The parent’s <code>scaleX</code> carries the lid with it. The chart is tipped back <code>rotateX(-20deg)</code>, so the lids face you a little and every bar reads as a block; the scale’s lines stand on a wall behind them.',
      'The row is the hover target: the full width of the chart, it never moves, and the bars in it ignore the pointer. Pointing at a row or focusing it with the keyboard lights its bars and writes its numbers into the caption; the caption is never empty (it says the total when nothing is pointed at) and never wraps, so it cannot move the chart. The ages and the scale are the stage’s own ink, so they read on the dark stage and the light one.',
      'Every length in the chart is a multiple of one base unit, <code>--u</code>, tied to the canvas; the caption and the year buttons under it are in plain <code>vmin</code>, the same control zone as every other model’s.',
    ],
    html: `<div class="pyramid">
  <div class="view">
    <div class="scene">
      <div class="chart">
        <div class="head" aria-hidden="true">
          <span class="key" style="--c:${TEAL}">Men <em></em></span>
          <span></span>
          <span class="key" style="--c:${PINK}">Women <em></em></span>
        </div>
        <div class="rows"></div>
        <div class="scale" aria-hidden="true">
          <span><i style="--t:1">3M</i><i style="--t:0.667">2M</i><i style="--t:0.333">1M</i></span>
          <span></span>
          <span><i style="--t:0.333">1M</i><i style="--t:0.667">2M</i><i style="--t:1">3M</i></span>
        </div>
      </div>
    </div>
  </div>
  <div class="controls">
    <output class="caption"></output>
    <div class="row years">
${YEARS.map((y) => `      <button type="button" data-year="${y}">${y}</button>`).join('\n')}
    </div>
  </div>
</div>`,
    css: `.pyramid {
  /* one base unit: every length in the chart is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas. The control zone under it is in
     plain vmin, because it is the same object in every model. */
  --u: 0.33vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin; /* the band's gap between the model and the control zone */
  font-family: Inter, system-ui, sans-serif;
}

.pyramid * {
  box-sizing: border-box;
}

/* the model box: the same height in every model that has controls */
.view {
  display: grid;
  place-items: center;
  height: 50vmin;
}

.scene {
  perspective: calc(800 * var(--u));
  /* the chart is tipped, and in 3D boxes on one plane have no steady order for the pointer: only
     the age bands take it, so nothing round them can catch it first */
  pointer-events: none;
}

/* three columns all the way down: men's bars, the ages, women's bars */
.chart {
  --bar: calc(100 * var(--u)); /* a full bar: the top of the scale */
  --mid: calc(40 * var(--u)); /* the column of ages */
  display: grid;
  gap: calc(3 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(-20deg); /* tipped back: the lids face you */
}

.head,
.scale,
.band {
  display: grid;
  grid-template-columns: var(--bar) var(--mid) var(--bar);
  align-items: center;
}

/* the two series, at the outer ends: a dot of the bar's colour, the name, the year's total. The
   stage's own ink, so they read on the dark stage and the light one */
.head {
  font: 700 calc(11 * var(--u)) / calc(14 * var(--u)) Inter, system-ui, sans-serif;
  white-space: nowrap;
}

.key {
  display: flex;
  align-items: center;
  gap: calc(4 * var(--u));
}

.key:last-child {
  justify-content: flex-end;
}

.key::before {
  content: '';
  width: calc(7 * var(--u));
  height: calc(7 * var(--u));
  border-radius: 50%;
  background: var(--c);
}

.key em {
  font-style: normal;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}

/* the rows: a column of age bands, the scale's wall behind them */
.rows {
  position: relative;
  display: grid;
  transform-style: preserve-3d;
}

/* the scale's lines, on a wall behind the bars: at 3M, 2M and 1M on each side, in the stage's ink */
.rows::before,
.rows::after {
  content: '';
  position: absolute;
  top: calc(-2 * var(--u));
  bottom: calc(-2 * var(--u));
  left: 0;
  width: var(--bar);
  background: repeating-linear-gradient(90deg, currentColor 0 calc(0.6 * var(--u)), transparent calc(0.6 * var(--u)) 33.333%);
  opacity: 0.2;
  transform: translateZ(calc(-13 * var(--u))); /* just behind the lids */
}

.rows::after {
  left: auto;
  right: 0;
  background: repeating-linear-gradient(270deg, currentColor 0 calc(0.6 * var(--u)), transparent calc(0.6 * var(--u)) 33.333%);
}

/* one age band: the hover target, the full width of the chart. It never moves */
.band {
  height: calc(12 * var(--u));
  outline: none;
  cursor: pointer;
  pointer-events: auto;
  transform-style: preserve-3d;
}

/* the age, the stage's ink, softened until its row is pointed at */
.age {
  font: 700 calc(11 * var(--u)) / 1 Inter, system-ui, sans-serif;
  text-align: center;
  white-space: nowrap;
  opacity: 0.72;
  transition: opacity 0.25s;
}

/* a bar: the front of a slab, the full width of its side, squashed to its share from the axis.
   Men run left (their origin on the right), women right */
.bar {
  position: relative;
  height: calc(9 * var(--u));
  background: linear-gradient(rgb(255 255 255 / 0.22), rgb(255 255 255 / 0) 45%, rgb(10 8 30 / 0.16)), var(--c);
  pointer-events: none;
  transform-style: preserve-3d;
  transform-origin: 100% 50%;
  transform: scaleX(var(--v, 0));
  transition: transform 0.8s ${EASE} calc(var(--i) * 40ms);
}

.bar.m { --c: ${TEAL}; }
.bar.f { --c: ${PINK}; transform-origin: 0 50%; }

/* the lid: hinged on the front's top edge and folded back, a paler tone of the bar */
.bar::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: calc(12 * var(--u));
  background: color-mix(in srgb, var(--c) 62%, #fff);
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
}

/* the light on a pointed-at row: a sheen over the front, faded in */
.bar::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(rgb(255 255 255 / 0.45), rgb(255 255 255 / 0.15));
  box-shadow: 0 0 calc(10 * var(--u)) color-mix(in srgb, var(--c) 70%, transparent);
  opacity: 0;
  transition: opacity 0.25s;
}

.band:hover .bar::before,
.band:focus-visible .bar::before,
.band.is-on .bar::before {
  opacity: 1;
}

.band:hover .age,
.band:focus-visible .age,
.band.is-on .age {
  opacity: 1;
}

/* a keyboard focus ring round the age, in the controls' violet */
.band:focus-visible .age {
  outline: calc(1.6 * var(--u)) solid #6a45f5;
  outline-offset: calc(1 * var(--u));
  border-radius: calc(3 * var(--u));
}

/* the scale's numbers, under its lines and on the same wall, so each sits under its own line */
.scale {
  transform: translateZ(calc(-13 * var(--u)));
  font: 700 calc(10 * var(--u)) / 1 Inter, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.scale span {
  position: relative;
  height: calc(10 * var(--u));
  opacity: 0.65;
}

.scale i {
  position: absolute;
  top: 0;
  font-style: normal;
  right: calc(var(--t) * 100%);
  translate: 50% 0;
}

.scale span:last-child i {
  right: auto;
  left: calc(var(--t) * 100%);
  translate: -50% 0;
}

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the chart's own unit. The caption keeps its one line, so a new
   readout cannot move the chart. */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}

.controls .caption {
  font: 500 4.5vmin/1.2 Inter, system-ui, sans-serif;
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
  font: 600 4vmin Inter, system-ui, sans-serif;
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

/* the pill already chosen answers the pointer too: darker, since the gradient above is as pale
   as it can be with white text still passing */
.controls [aria-pressed='true']:hover {
  background-image: linear-gradient(135deg, #5730dd, #b31859);
}`,
    js: `// The data, as a statistics API would send it back (thousands of people per age band)
const POP = ${json};

const rowsEl = document.querySelector('.pyramid .rows');
const out = document.querySelector('.pyramid .caption');
const totals = document.querySelectorAll('.pyramid .key em');
const buttons = document.querySelectorAll('.pyramid .years button');
const years = Object.keys(POP.years);

// One scale for every year, rounded up to half a million: a band that shrank looks smaller
const STEP = 500;
const MAX = Math.ceil(Math.max(...years.flatMap((y) => [...POP.years[y].men, ...POP.years[y].women])) / STEP) * STEP;

// 2,900 thousand → 2.90M; 37,150 thousand → 37.2M
const millions = (k, digits) => (k / 1000).toFixed(digits) + 'M';
const sum = (list) => list.reduce((a, b) => a + b, 0);

// Build the rows once, oldest band at the top. The age goes in as text, never as HTML: an API's
// response is not trusted markup.
const rows = POP.bands.map((band, k) => {
  const row = document.createElement('div');
  row.className = 'band';
  row.tabIndex = 0;
  row.style.setProperty('--i', POP.bands.length - 1 - k); // the stagger runs from the top
  const men = document.createElement('i');
  men.className = 'bar m';
  const age = document.createElement('b');
  age.className = 'age';
  age.textContent = band;
  const women = document.createElement('i');
  women.className = 'bar f';
  row.append(men, age, women);
  rowsEl.prepend(row); // youngest last: the pyramid's base
  return { row, men, women, band };
});

let year = years[years.length - 1];
let active = -1;

function readout(k) {
  const d = POP.years[year];
  return \`\${POP.bands[k]} · men \${millions(d.men[k], 2)} · women \${millions(d.women[k], 2)}\`;
}

function idle() {
  const d = POP.years[year];
  return \`\${millions(sum(d.men) + sum(d.women), 1)} people in \${year}\`;
}

// Every count becomes a share of the scale, a plain number; CSS draws the bar from it
function show(y) {
  year = y;
  const d = POP.years[y];
  rows.forEach((r, k) => {
    r.men.style.setProperty('--v', (d.men[k] / MAX).toFixed(4));
    r.women.style.setProperty('--v', (d.women[k] / MAX).toFixed(4));
    r.row.setAttribute('aria-label', \`Age \${r.band} in \${y}: \${millions(d.men[k], 2)} men, \${millions(d.women[k], 2)} women\`);
  });
  totals[0].textContent = millions(sum(d.men), 1);
  totals[1].textContent = millions(sum(d.women), 1);
  buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.year === y));
  out.textContent = active >= 0 ? readout(active) : idle();
}

function point(k) {
  active = k;
  rows.forEach((r, j) => r.row.classList.toggle('is-on', j === k));
  out.textContent = k >= 0 ? readout(k) : idle();
}

const rowOf = (e) => rows.findIndex((r) => r.row === e.target.closest?.('.band'));
rowsEl.addEventListener('pointerover', (e) => point(rowOf(e)));
rowsEl.addEventListener('focusin', (e) => point(rowOf(e)));
rowsEl.addEventListener('pointerleave', () => point(-1));
rowsEl.addEventListener('focusout', (e) => { if (!rowsEl.contains(e.relatedTarget)) point(-1); });

buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.year)));

show('${START}');`,
  },
};
