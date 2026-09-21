/** Copy-paste versions of the chart models: plain HTML + CSS + JS, no Sass, the JSON included. */
import { COMMITS, SALES, TREND } from './chart-data';
import type { Snippet } from './snippet-utils';

const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const TEXT = '#eceefb';
const MUTED = '#949bc0';
const SURFACE = '#141830';

/** The data as it would arrive from an API, indented to sit in the snippet's JS. */
const json = (value: unknown): string => JSON.stringify(value, null, 2);
/** Compact JSON for the arrays of numbers, which read better on one line. */
const compactRows = (s: string): string => s.replace(/\[\s+([\d,\s]+?)\s+\]/g, (_, inner: string) => `[${inner.replace(/\s+/g, ' ')}]`);
const compactObjects = (s: string): string =>
  s.replace(/\{\s+"label": ("[^"]+"),\s+"value": (\d+)\s+\}/g, '{ "label": $1, "value": $2 }');

const YEARS = Object.keys(SALES.years);

export const snippetsK: Record<string, Snippet> = {
  neonbars: {
    how: [
      'The data is plain JSON, shaped like an API response. JS turns each value into <b>one number</b>: <code>--v = value ÷ top of the scale</code> (0 to 1), written on the bar. Everything you see is CSS.',
      'A bar is a full-height box. Its front and side are squashed with <code>scaleY(var(--v))</code> from the bottom, and its lid rides down by <code>(1 − --v) × height</code>. Only <code>transform</code> changes, so a new dataset is a smooth transition with no layout work.',
      '<code>transition-delay: calc(var(--i) * 60ms)</code> starts each bar a little after the one before, and a <code>cubic-bezier</code> that goes past 1 makes it overshoot and settle.',
      'The neon look is see-through glass faces with a bright hairline edge and a soft glow (<code>box-shadow</code> inside and out). Colours come from <code>color-mix()</code> along the row, and the tallest bar gets <code>.is-peak</code>. The pointed-at bar fills in and glows: a <code>::after</code> layer on each face whose <code>opacity</code> fades in, so the change is smooth.',
      'The scale on the back wall is rounded up to a tidy step (<code>Math.ceil(max / 20) * 20</code>), so the numbers stay round whatever the data.',
      "There is <b>one</b> tooltip for the whole chart. JS moves it to the pointed-at bar with two custom properties (<code>--tx</code>, <code>--ty</code>) and a <code>transition</code> glides it there, so it slides from bar to bar with its text changing instead of blinking. It floats 40 units towards you: the chart is turned, so each bar to the right stands nearer. A tap does the same on a touch screen, where there is no hover.",
      "Every length is a multiple of one base unit, <code>--u</code>, and JS writes the tooltip's place as <b>plain numbers</b> in the chart's own units, which CSS multiplies by it. A length written in px from JS would stay the same size while the chart scaled around it, and the tooltip would drift off its bar on a big screen. The caption and the year switch are in plain <code>vmin</code>: the control zone is the same object, at the same size, in every model.",
    ],
    html: `<div class="chart">
  <div class="view">
    <div class="scene">
      <div class="bars3d"></div>
    </div>
  </div>
  <div class="controls">
    <output class="caption"></output>
    <div class="row">
${YEARS.map((y) => `      <button type="button" data-year="${y}">${y}</button>`).join('\n')}
    </div>
  </div>
</div>`,
    css: `.chart {
  /* one base unit: every length in the chart is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas. The control zone under it is in
     plain vmin, because it is the same object in every model. */
  --u: 0.3vmin;
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
  /* the scale's numbers and the tooltip reach out past the right of the bars: the extra room on
     the right is what centres what is drawn, not the bars' box */
  padding: calc(30 * var(--u)) calc(72 * var(--u)) calc(40 * var(--u)) calc(40 * var(--u));
  pointer-events: none; /* the chart is turned: only the bars take the pointer */
}

/* 6 bars × 19 + 5 gaps × 10 = 164 units */
.bars3d {
  position: relative;
  width: calc(164 * var(--u));
  height: calc(100 * var(--u)); /* the top of the scale */
  transform-style: preserve-3d;
  transform: rotateX(-18deg) rotateY(-28deg);
}

/* the floor: a neon grid laid flat along the bottom */
.floor {
  position: absolute;
  left: calc(-12 * var(--u));
  top: calc(74 * var(--u));
  width: calc(188 * var(--u));
  height: calc(52 * var(--u));
  border: calc(1 * var(--u)) solid rgb(139 108 255 / 0.45);
  border-radius: calc(6 * var(--u));
  background:
    repeating-linear-gradient(90deg, rgb(139 108 255 / 0.24) 0 calc(1 * var(--u)), transparent calc(1 * var(--u)) calc(17 * var(--u))),
    repeating-linear-gradient(rgb(139 108 255 / 0.24) 0 calc(1 * var(--u)), transparent calc(1 * var(--u)) calc(17 * var(--u))),
    rgb(139 108 255 / 0.1);
  transform: rotateX(90deg);
}

/* the scale: lines at 0, half and the top, along the back of the floor; the numbers at the
   right end, which reaches out past the last bar */
.wall {
  position: absolute;
  top: calc(-10 * var(--u)); /* 10 units of room above the scale, so the top number is not clipped */
  left: calc(-12 * var(--u));
  width: calc(188 * var(--u));
  height: calc(110 * var(--u));
  transform: translateZ(calc(-26 * var(--u)));
}

.wall b {
  position: absolute;
  right: 0;
  bottom: calc(var(--t) * 100 * var(--u));
  left: 0;
  height: calc(1 * var(--u));
  background: rgb(236 238 251 / 0.26);
}

.wall span {
  position: absolute;
  top: calc(-6 * var(--u));
  left: 100%;
  padding-left: calc(6 * var(--u));
  color: ${MUTED};
  font: 700 calc(11 * var(--u))/calc(14 * var(--u)) system-ui, sans-serif;
}

.bars {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  gap: calc(10 * var(--u));
  transform-style: preserve-3d;
}

.bar {
  --v: 0; /* JS writes it: value ÷ top of the scale */
  --c: color-mix(in srgb, ${VIOLET}, ${TEAL} calc(var(--i) * 20%));
  position: relative;
  flex: none;
  width: calc(19 * var(--u));
  height: 100%;
  transform-style: preserve-3d;
}

.bar.is-peak {
  --c: ${PINK};
}

.bar {
  outline: none;
  pointer-events: auto;
  cursor: pointer;
}

/* One tooltip for the whole chart: JS moves it to the pointed-at bar (--tx, --ty, plain numbers
   in the chart's own units, which CSS multiplies by --u) and it glides there, text changing on
   the way. 40 units towards you (the chart is turned, so the bars to the right stand nearer);
   its thickness is a flat edge up and to the right, like the bars' depth */
.tip {
  --c: color-mix(in srgb, ${VIOLET}, ${TEAL} calc(var(--i, 0) * 20%));
  position: absolute;
  top: 0;
  left: 0;
  padding: calc(3 * var(--u)) calc(7 * var(--u));
  border: calc(1 * var(--u)) solid var(--c);
  border-radius: calc(6 * var(--u));
  background: ${SURFACE};
  box-shadow:
    calc(3 * var(--u)) calc(-3 * var(--u)) 0 color-mix(in srgb, var(--c) 55%, #05060c),
    0 0 calc(14 * var(--u)) color-mix(in srgb, var(--c) 40%, transparent);
  color: ${TEXT};
  font: 700 calc(11 * var(--u))/calc(14 * var(--u)) system-ui, sans-serif;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate(calc(var(--tx, 0) * var(--u)), calc((var(--ty, 0) - 30) * var(--u))) translate(-50%, -100%) translateZ(calc(40 * var(--u)));
  transition:
    transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.2s;
}

.tip.is-peak {
  --c: ${PINK};
}

.tip.is-on {
  opacity: 1;
}

/* see-through glass faces with a bright edge: the neon look */
.bar i {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  width: calc(19 * var(--u));
  height: 100%;
  /* a fine edge: under one unit shows as a hairline on sharp screens */
  border: calc(0.6 * var(--u)) solid color-mix(in srgb, color-mix(in srgb, var(--c) 80%, #fff) 75%, transparent);
  background: color-mix(in srgb, var(--c) 58%, transparent);
  box-shadow:
    inset 0 0 calc(8 * var(--u)) color-mix(in srgb, var(--c) 30%, transparent),
    0 0 calc(10 * var(--u)) color-mix(in srgb, var(--c) 22%, transparent);
  transform-origin: bottom center;
  /* past 1: overshoot and settle; each bar 60ms after the one before */
  transition: transform 0.8s cubic-bezier(0.3, 1.3, 0.5, 1) calc(var(--i) * 60ms);
}

/* the pointed-at bar fills in and glows; faded with opacity, so it is smooth */
.bar i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--c) 50%, transparent);
  box-shadow: 0 0 calc(20 * var(--u)) color-mix(in srgb, var(--c) 60%, transparent);
  opacity: 0;
  transition: opacity 0.25s;
}

.bar.is-active i::after {
  opacity: 1;
}

/* front */
.bar i:nth-child(1) {
  transform: translateZ(calc(9.5 * var(--u))) scaleY(var(--v));
}

/* right side, darker glass */
.bar i:nth-child(2) {
  background: color-mix(in srgb, color-mix(in srgb, var(--c) 55%, #05060c) 64%, transparent);
  transform: rotateY(90deg) translateZ(calc(9.5 * var(--u))) scaleY(var(--v));
}

/* the lid: a 19-unit square laid flat, riding down with the value */
.bar i:nth-child(3) {
  height: calc(19 * var(--u));
  background: color-mix(in srgb, var(--c) 80%, transparent);
  transform-origin: center;
  transform: translateY(calc((1 - var(--v)) * 100 * var(--u))) rotateX(90deg) translateZ(calc(9.5 * var(--u)));
}

.bar span {
  position: absolute;
  top: calc(100% + calc(8 * var(--u)));
  left: calc(-7 * var(--u));
  width: calc(33 * var(--u));
  color: ${MUTED};
  font: 700 calc(11 * var(--u))/calc(14 * var(--u)) system-ui, sans-serif;
  text-align: center;
  transform: translateZ(calc(9.5 * var(--u)));
}

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the chart's own unit. The caption's line box never changes
   height, so a new summary cannot move the chart. */
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

.controls button {
  height: 8vmin;
  min-width: 8vmin;
  padding: 0 3vmin;
  border: 0;
  border-radius: 999px;
  background: rgb(140 150 220 / 0.2);
  color: ${MUTED};
  font: 600 4vmin system-ui, sans-serif;
  cursor: pointer;
  transition: background 0.35s, color 0.35s;
}

.controls button[aria-pressed='true'] {
  background: linear-gradient(135deg, ${VIOLET}, ${PINK});
  color: #fff;
}`,
    js: `// The data, as an API would send it back
const SALES = ${compactObjects(json(SALES))};

const chart = document.querySelector('.bars3d');
const out = document.querySelector('.chart output');
const buttons = document.querySelectorAll('.controls .row button');
const TICKS = [0, 0.5, 1]; // the scale's lines, as fractions of its top

// Build the chart once from the data: the floor, the scale, and a bar with three faces per value
const first = Object.values(SALES.years)[0];
chart.innerHTML =
  '<div class="floor"></div>' +
  '<div class="wall">' + TICKS.map((t) => \`<b style="--t:\${t}"><span></span></b>\`).join('') + '</div>' +
  '<div class="bars">' + first.map((_, i) => \`<div class="bar" style="--i:\${i}" tabindex="0"><i></i><i></i><i></i><span></span></div>\`).join('') + '</div>' +
  '<b class="tip" aria-hidden="true"></b>';
const bars = [...chart.querySelectorAll('.bar')];
const ticks = chart.querySelectorAll('.wall span');
const tipEl = chart.querySelector('.tip');
// labels go in as text, never as HTML: data from an API is not trusted markup
first.forEach((d, i) => (bars[i].querySelector('span').textContent = d.label));

// money as most dashboards write it: the sign in front, the k right after the number ($88k)
const money = (v) => SALES.prefix + v + SALES.suffix;
const W = 19, PITCH = 29, H = 100; // a bar's width, width + gap, and the scale's height, in the chart's own units (as in the CSS)
let shown; // the year on screen: { rows, top, peak }
let active = -1; // the bar the tooltip is on
let hideTimer;

// Show one year: each bar gets --v, its value as a fraction of the scale's top. CSS does the rest.
function show(year) {
  const rows = SALES.years[year];
  const values = rows.map((r) => r.value);
  const top = Math.ceil(Math.max(...values) / 20) * 20; // a tidy top for the scale
  const peak = values.indexOf(Math.max(...values));
  shown = { rows, top, peak };
  rows.forEach((r, i) => {
    bars[i].style.setProperty('--v', r.value / top);
    bars[i].classList.toggle('is-peak', i === peak);
    bars[i].setAttribute('aria-label', \`\${r.label} · \${money(r.value)}\`);
  });
  ticks.forEach((t, k) => (t.textContent = Math.round(TICKS[k] * top)));
  out.textContent = \`\${year} · peak \${rows[peak].label}, \${money(rows[peak].value)}\`;
  buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.year === year));
  if (active >= 0) place(active); // the tooltip follows its bar to the new height
}

// One tooltip for the chart: it glides to the bar (--tx, --ty) and its text changes on the way
function place(i) {
  clearTimeout(hideTimer);
  const r = shown.rows[i];
  const wasOn = tipEl.classList.contains('is-on');
  if (!wasOn) tipEl.style.transition = 'none'; // from hidden: appear in place, don't fly in
  tipEl.textContent = \`\${r.label} · \${money(r.value)}\`;
  tipEl.style.setProperty('--i', i);
  // plain numbers in the chart's own units: CSS multiplies them by --u
  tipEl.style.setProperty('--tx', String(i * PITCH + W / 2));
  tipEl.style.setProperty('--ty', String((1 - r.value / shown.top) * H));
  tipEl.classList.toggle('is-peak', i === shown.peak);
  if (!wasOn) {
    void tipEl.offsetWidth; // apply the new place before the transition comes back
    tipEl.style.transition = '';
  }
  tipEl.classList.add('is-on');
  bars.forEach((b, k) => b.classList.toggle('is-active', k === i)); // the bar fills in and glows
  active = i;
}
// a short grace period, so crossing the gap between two bars does not flicker it
function hide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    tipEl.classList.remove('is-on');
    bars.forEach((b) => b.classList.remove('is-active'));
    active = -1;
  }, 150);
}

const over = (e) => {
  const bar = e.target.closest('.bar');
  if (bar) place(bars.indexOf(bar));
};
const leave = (e) => {
  if (!e.relatedTarget?.closest?.('.bar')) hide();
};
chart.addEventListener('pointerover', over);
chart.addEventListener('focusin', over);
chart.addEventListener('pointerout', leave);
chart.addEventListener('focusout', leave);
// a finger has no hover: a tap on a bar shows its tooltip, a tap elsewhere hides it
document.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  const bar = e.target.closest('.bar');
  if (bar) place(bars.indexOf(bar));
  else hide();
});

buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.year)));

show('${YEARS[0]}');`,
  },

  heatmap: {
    how: [
      'The JSON is a list of weeks, each a list of numbers. JS writes one number per block: <code>--v = value ÷ the largest value</code>, plus its grid position <code>--x</code> / <code>--y</code>.',
      'A block is three surfaces: the element itself is the <b>roof</b>, lifted by <code>translateZ(calc(var(--v) * 70 * var(--u)))</code>; <code>::before</code> and <code>::after</code> are the two walls you can see, hanging down from its edges with <code>rotateX(-90deg)</code> and <code>rotateY(90deg)</code>. Their height is the same <code>--v × 70</code> units.',
      'The colour follows the value too: <code>color-mix(in srgb, pink calc(var(--v) * 100%), teal)</code> runs from cold to hot with no colour scale in JS.',
      'Each block sits in a real <code>&lt;button&gt;</code>, so it can be tabbed to and tapped. The floor has <code>pointer-events: none</code>: blocks in 3D share a plane, and only the buttons should be hit.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the grid is the same share of a gallery card, the editor and a recording canvas. The line under it that names the pointed-at block is in plain <code>vmin</code>: it is the caption of the same control zone every model has, and it keeps the zone\'s height whatever it says, so it cannot move the grid.',
    ],
    html: `<div class="heat">
  <div class="view">
    <div class="scene">
      <div class="world"></div>
    </div>
  </div>
  <div class="controls">
    <output class="caption"></output>
  </div>
</div>`,
    css: `/* the model box and the control zone stand in one stack */
.heat {
  /* one base unit: every length of the grid is a multiple of it. The caption under it is in
     plain vmin, because the control zone is the same object in every model. */
  --u: 0.33vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin;
  font-family: system-ui, sans-serif;
}

/* the model box */
.view {
  display: grid;
  place-items: center;
  height: 50vmin;
}

.scene {
  perspective: calc(800 * var(--u));
  /* the blocks rise off the floor, so the drawing reaches higher than the floor's box: the room
     above puts what is drawn, not the box, in the middle of the model box */
  padding-top: calc(12 * var(--u));
  pointer-events: none; /* the floor is tilted back: only the blocks take the pointer */
}

/* 5 columns and 4 rows: a 34-unit pitch, 26-unit blocks, a 10-unit margin */
.world {
  position: relative;
  width: calc(182 * var(--u));
  height: calc(148 * var(--u));
  border: calc(1 * var(--u)) solid rgb(139 108 255 / 0.4);
  border-radius: calc(10 * var(--u));
  background: #1c1d3d;
  transform-style: preserve-3d;
  transform: rotateX(58deg) rotateZ(36deg);
  animation: sway 9s ease-in-out infinite alternate;
  pointer-events: none; /* only the blocks are hit */
}

@keyframes sway {
  to { transform: rotateX(58deg) rotateZ(50deg); }
}

/* the day names, printed on the floor along the edge that faces you */
.world em {
  position: absolute;
  top: calc(140 * var(--u));
  left: calc((10 + var(--x) * 34) * var(--u));
  width: calc(26 * var(--u));
  color: ${MUTED};
  font: 700 calc(10 * var(--u))/calc(12 * var(--u)) system-ui, sans-serif;
  font-style: normal;
  text-align: center;
}

.cell {
  /* cold teal → hot pink with the value */
  --c: color-mix(in srgb, ${PINK} calc(var(--v) * 100%), ${TEAL});
  position: absolute;
  top: calc((10 + var(--y) * 34) * var(--u));
  left: calc((10 + var(--x) * 34) * var(--u));
  width: calc(26 * var(--u));
  height: calc(26 * var(--u));
  padding: 0;
  border: calc(1 * var(--u)) solid color-mix(in srgb, var(--c) 45%, transparent);
  border-radius: calc(3 * var(--u));
  background: color-mix(in srgb, var(--c) 14%, transparent);
  outline: none;
  transform-style: preserve-3d;
  pointer-events: auto;
  cursor: pointer;
}

/* the roof, lifted by the value */
.cell i {
  position: absolute;
  inset: calc(-1 * var(--u));
  background: color-mix(in srgb, var(--c) 68%, ${SURFACE});
  box-shadow: inset 0 0 0 calc(1 * var(--u)) color-mix(in srgb, var(--c) 85%, #fff);
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--v) * 70 * var(--u)));
}

.cell i::before,
.cell i::after {
  content: '';
  position: absolute;
}

/* the wall hanging from the roof's bottom edge */
.cell i::before {
  top: 100%;
  left: 0;
  width: 100%;
  height: calc(var(--v) * 70 * var(--u));
  background: color-mix(in srgb, var(--c) 46%, ${SURFACE});
  transform-origin: top;
  transform: rotateX(-90deg);
}

/* the wall hanging from its right edge, a shade darker */
.cell i::after {
  top: 0;
  left: 100%;
  width: calc(var(--v) * 70 * var(--u));
  height: 100%;
  background: color-mix(in srgb, var(--c) 30%, ${SURFACE});
  transform-origin: left;
  transform: rotateY(90deg);
}

/* pointed at: the roof lights up; the cell itself never moves */
.cell:hover i,
.cell:focus-visible i {
  background: color-mix(in srgb, var(--c) 55%, #fff);
  box-shadow: inset 0 0 0 calc(1 * var(--u)) #fff, 0 0 calc(16 * var(--u)) var(--c);
}

/* the control zone: the same object, at the same size, in every model that has one. It holds
   only the caption here and keeps the zone's full height, so a new line cannot move the grid. */
.controls {
  display: grid;
  align-content: start;
  justify-items: center;
  height: 16vmin;
  text-align: center;
}

.controls .caption {
  font: 500 4.5vmin/1.2 system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  opacity: 0.7;
}`,
    js: `// The data, as an API would send it back
const COMMITS = ${compactRows(json(COMMITS)).replace(/\[\s+("Mon"[^\]]+?)\s+\]/, (_, inner: string) => `[${inner.replace(/\s+/g, ' ')}]`)};

const world = document.querySelector('.world');
const out = document.querySelector('.heat .caption');
const max = Math.max(...COMMITS.weeks.flat());

// One block per value: its place in the grid, and its size as a fraction of the largest value
COMMITS.weeks.forEach((week, y) =>
  week.forEach((value, x) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.style.cssText = \`--x:\${x}; --y:\${y}; --v:\${value / max}\`;
    cell.setAttribute('aria-label', \`\${COMMITS.days[x]}, week \${y + 1}: \${value} commits\`);
    cell.append(document.createElement('i'));
    world.append(cell);
  }),
);
COMMITS.days.forEach((day, x) => {
  const em = document.createElement('em');
  em.style.setProperty('--x', x);
  em.textContent = day;
  world.append(em);
});

// The dock says what the pointed-at block holds, and the total otherwise
const total = COMMITS.weeks.flat().reduce((a, b) => a + b, 0);
const idle = \`\${total} commits in \${COMMITS.weeks.length} weeks\`;
out.textContent = idle;
const show = (e) => {
  const cell = e.target.closest('.cell');
  out.textContent = cell ? cell.getAttribute('aria-label') : idle;
};
const reset = (e) => {
  if (!e.relatedTarget?.closest?.('.cell')) out.textContent = idle;
};
world.addEventListener('pointerover', show);
world.addEventListener('focusin', show);
world.addEventListener('pointerout', reset);
world.addEventListener('focusout', reset);`,
  },

  chartpanel: {
    how: [
      'The chart is ordinary SVG. JS maps each value in the JSON to a point (x along the width, y by where the value sits between the lowest and highest), then joins them into one path: <code>M x y L x y …</code>. The same path, closed down to the bottom, is the shaded area.',
      'The 3D is only on containers: the panel is tilted with <code>rotateX / rotateY / rotateZ</code>, and the area, the line and the dots sit at <code>translateZ</code> 8, 16 and 22 units, so they float over the glass at different depths.',
      'Hovering the still wrapper sets the panel to <code>rotateX(0) rotateY(0) rotateZ(0)</code>: it lies flat, and the values fade in, so you can read it. The wrapper never moves, so the hover never flickers.',
      'The neon glow is the same path drawn again, wide and faint, underneath: cheaper than a blur <code>filter</code> and sharp at any zoom.',
      'Because the tilt is on the container, the same CSS works around a chart from any library that draws SVG or canvas.',
      'Every length is a multiple of one base unit, <code>--u</code>, and the SVG viewBox is the panel\'s size in those units, so one SVG unit is one <code>--u</code>. JS writes each dot\'s place as <b>plain numbers</b> that CSS multiplies by the unit; a px string from JS would stay put while the panel scaled, and the dots would slide off the line on a big screen.',
    ],
    html: `<div class="panel3d" tabindex="0" aria-label="Monthly revenue">
  <div class="panel">
    <div class="glass"></div>
    <svg class="area" viewBox="0 0 200 110" aria-hidden="true"><path /></svg>
    <svg class="line" viewBox="0 0 200 110" aria-hidden="true"><path class="glow" /><path /></svg>
    <div class="dots"></div>
    <b class="title">Revenue <small>${TREND.unit}</small></b>
  </div>
</div>`,
    css: `.panel3d {
  /* one base unit: every length of the panel is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.4vmin;
  position: relative;
  width: calc(200 * var(--u));
  height: calc(110 * var(--u));
  margin: calc(40 * var(--u));
  outline: none;
  transform-style: preserve-3d;
  perspective: calc(800 * var(--u));
  font-family: system-ui, sans-serif;
}

/* the tilt lives here; the wrapper above stays still, so hovering it never flickers */
.panel {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateX(40deg) rotateY(-16deg) rotateZ(5deg);
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
  pointer-events: none;
}

.panel3d:hover .panel,
.panel3d:focus-visible .panel {
  transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
}

/* the glass, with faint value lines */
.glass {
  position: absolute;
  inset: 0;
  border: calc(1 * var(--u)) solid rgb(139 108 255 / 0.5);
  border-radius: calc(12 * var(--u));
  background:
    repeating-linear-gradient(transparent 0 calc(21 * var(--u)), rgb(236 238 251 / 0.1) calc(21 * var(--u)) calc(22 * var(--u))) 0 calc(12 * var(--u)) / 100% calc(100% - calc(24 * var(--u))) no-repeat,
    linear-gradient(150deg, #2a2560, ${SURFACE});
  box-shadow: 0 calc(18 * var(--u)) calc(36 * var(--u)) calc(-14 * var(--u)) rgb(0 0 0 / 0.55);
}

.panel svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.area {
  transform: translateZ(calc(8 * var(--u)));
}

.area path {
  fill: rgb(46 230 214 / 0.16);
}

.line {
  transform: translateZ(calc(16 * var(--u)));
}

.line path {
  fill: none;
  stroke: ${TEAL};
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* the glow: the same path, wide and faint, under the line */
.line .glow {
  stroke-width: 9;
  stroke-opacity: 0.22;
}

.dots {
  position: absolute;
  inset: 0;
  transform: translateZ(calc(22 * var(--u)));
}

.dots i {
  position: absolute;
  /* --x, --y: plain numbers in the panel's own units, from JS */
  top: calc(var(--y) * var(--u));
  left: calc(var(--x) * var(--u));
  width: calc(7 * var(--u));
  height: calc(7 * var(--u));
  margin: calc(-3.5 * var(--u)) 0 0 calc(-3.5 * var(--u));
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 calc(2 * var(--u)) ${TEAL}, 0 0 calc(10 * var(--u)) ${TEAL};
}

/* values: hidden while tilted (except the latest), shown when the panel lies flat */
.dots span {
  position: absolute;
  bottom: calc(9 * var(--u));
  left: 50%;
  padding: calc(1 * var(--u)) calc(3 * var(--u));
  border-radius: calc(4 * var(--u));
  background: rgb(20 24 48 / 0.85);
  color: ${TEXT};
  font: 700 calc(10 * var(--u))/calc(12 * var(--u)) system-ui, sans-serif;
  white-space: nowrap;
  opacity: 0;
  translate: -50% 0;
  transition: opacity 0.3s;
}

.dots i:last-child span,
.panel3d:hover .dots span,
.panel3d:focus-visible .dots span {
  opacity: 1;
}

.title {
  position: absolute;
  top: calc(9 * var(--u));
  left: calc(12 * var(--u));
  color: ${TEXT};
  font: 800 calc(10 * var(--u))/calc(12 * var(--u)) system-ui, sans-serif;
  letter-spacing: 0.04em;
  transform: translateZ(calc(10 * var(--u)));
}

.title small {
  color: ${MUTED};
  font-weight: 700;
}`,
    js: `// The data, as an API would send it back
const TREND = ${compactRows(json(TREND)).replace(/\[\s+("Jan"[^\]]+?)\s+\]/, (_, inner: string) => `[${inner.replace(/\s+/g, ' ')}]`)};

// The panel is 200 × 110 units of --u and the SVG viewBox is the same, so one SVG unit is one --u
const W = 200, H = 110, PAD = 12;
const lo = Math.min(...TREND.values);
const hi = Math.max(...TREND.values);

// JSON → points: x evenly along the width, y by where the value sits between lo and hi
// (14 units of headroom at the top for the title)
const points = TREND.values.map((v, i) => [
  PAD + (i * (W - 2 * PAD)) / (TREND.values.length - 1),
  H - PAD - ((v - lo) / (hi - lo)) * (H - 2 * PAD - 14),
]);

// points → one path: "M x y L x y …"; closed down to the bottom, it is the area
const line = 'M' + points.map(([x, y]) => \`\${x.toFixed(1)} \${y.toFixed(1)}\`).join(' L');
const area = \`\${line} L\${points.at(-1)[0]} \${H} L\${points[0][0]} \${H} Z\`;
document.querySelectorAll('.line path').forEach((p) => p.setAttribute('d', line));
document.querySelector('.area path').setAttribute('d', area);

// a dot per value, with its number (shown when the panel lies flat)
const dots = document.querySelector('.dots');
points.forEach(([x, y], i) => {
  const dot = document.createElement('i');
  dot.style.cssText = \`--x:\${x.toFixed(1)}; --y:\${y.toFixed(1)}\`; // plain numbers: CSS multiplies them by --u
  const label = document.createElement('span');
  label.textContent = TREND.values[i];
  dot.append(label);
  dots.append(dot);
});`,
  },
};
