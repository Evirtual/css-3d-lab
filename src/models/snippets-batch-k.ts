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
      'The neon look is dark faces with a bright 1px edge and a glow (<code>box-shadow</code> inside and out). Colours come from <code>color-mix()</code> along the row, and the tallest bar gets <code>.is-peak</code>.',
      'The scale on the back wall is rounded up to a tidy step (<code>Math.ceil(max / 20) * 20</code>), so the numbers stay round whatever the data.',
      "Each bar has a tooltip that rides on its lid (the same transform and timing) and fades in on <code>:hover</code> or <code>:focus-visible</code>. A finger has no hover, so a tap adds <code>.is-tip</code> instead. The bar's box is the whole column and never moves, so the space above a short bar counts too.",
    ],
    html: `<div class="chart">
  <div class="scene">
    <div class="bars3d"></div>
  </div>
  <output></output>
  <div class="seg">
${YEARS.map((y) => `    <button type="button" data-year="${y}">${y}</button>`).join('\n')}
  </div>
</div>`,
    css: `.chart {
  display: grid;
  justify-items: center;
  gap: 10px;
  font-family: system-ui, sans-serif;
}

.scene {
  perspective: 800px;
  padding: 30px 40px 40px;
  pointer-events: none; /* the chart is turned: only the bars take the pointer */
}

/* 6 bars × 19px + 5 gaps × 10px = 164px */
.bars3d {
  position: relative;
  width: 164px;
  height: 100px; /* the top of the scale */
  transform-style: preserve-3d;
  transform: rotateX(-18deg) rotateY(-28deg);
}

/* the floor: a neon grid laid flat along the bottom */
.floor {
  position: absolute;
  left: -12px;
  top: 74px;
  width: 188px;
  height: 52px;
  border: 1px solid rgb(139 108 255 / 0.45);
  border-radius: 6px;
  background:
    repeating-linear-gradient(90deg, rgb(139 108 255 / 0.24) 0 1px, transparent 1px 17px),
    repeating-linear-gradient(rgb(139 108 255 / 0.24) 0 1px, transparent 1px 17px),
    rgb(139 108 255 / 0.1);
  transform: rotateX(90deg);
}

/* the scale: lines at 0, half and the top, along the back of the floor; the numbers at the
   right end, which reaches out past the last bar */
.wall {
  position: absolute;
  top: 0;
  left: -12px;
  width: 188px;
  height: 100px;
  transform: translateZ(-26px);
}

.wall b {
  position: absolute;
  right: 0;
  bottom: calc(var(--t) * 100%);
  left: 0;
  height: 1px;
  background: rgb(236 238 251 / 0.26);
}

.wall span {
  position: absolute;
  top: -6px;
  left: 100%;
  padding-left: 6px;
  color: ${MUTED};
  font: 700 9px/12px system-ui, sans-serif;
}

.bars {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  transform-style: preserve-3d;
}

.bar {
  --v: 0; /* JS writes it: value ÷ top of the scale */
  --c: color-mix(in srgb, ${VIOLET}, ${TEAL} calc(var(--i) * 20%));
  position: relative;
  flex: none;
  width: 19px;
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

/* the tooltip: rides on the lid, shown on hover, focus, or a tap (.is-tip) */
.bar b {
  position: absolute;
  top: 0;
  left: 50%;
  padding: 3px 7px;
  border: 1px solid var(--c);
  border-radius: 6px;
  background: rgb(20 24 48 / 0.88);
  box-shadow: 0 0 10px color-mix(in srgb, var(--c) 45%, transparent);
  color: ${TEXT};
  font: 700 9px/12px system-ui, sans-serif;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, calc((1 - var(--v)) * 100px - 100% - 8px)) translateZ(9.5px);
  transition:
    transform 0.8s cubic-bezier(0.3, 1.3, 0.5, 1) calc(var(--i) * 60ms),
    opacity 0.2s;
}

.bar:hover b,
.bar:focus-visible b,
.bar.is-tip b {
  opacity: 1;
}

/* dark faces, a bright edge and a glow: the neon look */
.bar i {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  width: 19px;
  height: 100%;
  border: 1px solid color-mix(in srgb, var(--c) 85%, #fff);
  background: color-mix(in srgb, var(--c) 36%, ${SURFACE});
  box-shadow:
    inset 0 0 10px color-mix(in srgb, var(--c) 55%, transparent),
    0 0 12px color-mix(in srgb, var(--c) 35%, transparent);
  transform-origin: bottom center;
  /* past 1: overshoot and settle; each bar 60ms after the one before */
  transition: transform 0.8s cubic-bezier(0.3, 1.3, 0.5, 1) calc(var(--i) * 60ms);
}

/* front */
.bar i:nth-child(1) {
  transform: translateZ(9.5px) scaleY(var(--v));
}

/* right side, darker */
.bar i:nth-child(2) {
  background: color-mix(in srgb, var(--c) 22%, ${SURFACE});
  transform: rotateY(90deg) translateZ(9.5px) scaleY(var(--v));
}

/* the lid: a 19px square laid flat, riding down with the value */
.bar i:nth-child(3) {
  height: 19px;
  background: color-mix(in srgb, var(--c) 72%, ${SURFACE});
  transform-origin: center;
  transform: translateY(calc((1 - var(--v)) * 100px)) rotateX(90deg) translateZ(9.5px);
}

.bar span {
  position: absolute;
  top: calc(100% + 8px);
  left: -7px;
  width: 33px;
  color: ${MUTED};
  font: 700 9px/12px system-ui, sans-serif;
  text-align: center;
  transform: translateZ(9.5px);
}

output {
  color: ${MUTED};
  font-size: 12px;
}

.seg {
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 999px;
}

.seg button {
  padding: 4px 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: ${MUTED};
  font: 700 12px system-ui, sans-serif;
  cursor: pointer;
}

.seg button[aria-pressed='true'] {
  background: linear-gradient(135deg, ${VIOLET}, ${PINK});
  color: #fff;
}`,
    js: `// The data, as an API would send it back
const SALES = ${compactObjects(json(SALES))};

const chart = document.querySelector('.bars3d');
const out = document.querySelector('.chart output');
const buttons = document.querySelectorAll('.seg button');
const TICKS = [0, 0.5, 1]; // the scale's lines, as fractions of its top

// Build the chart once from the data: the floor, the scale, and a bar with three faces per value
const first = Object.values(SALES.years)[0];
chart.innerHTML =
  '<div class="floor"></div>' +
  '<div class="wall">' + TICKS.map((t) => \`<b style="--t:\${t}"><span></span></b>\`).join('') + '</div>' +
  '<div class="bars">' + first.map((_, i) => \`<div class="bar" style="--i:\${i}" tabindex="0"><i></i><i></i><i></i><span></span><b></b></div>\`).join('') + '</div>';
const bars = chart.querySelectorAll('.bar');
const ticks = chart.querySelectorAll('.wall span');
// labels go in as text, never as HTML: data from an API is not trusted markup
first.forEach((d, i) => (bars[i].querySelector('span').textContent = d.label));

// Show one year: each bar gets --v, its value as a fraction of the scale's top. CSS does the rest.
function show(year) {
  const rows = SALES.years[year];
  const values = rows.map((r) => r.value);
  const top = Math.ceil(Math.max(...values) / 20) * 20; // a tidy top for the scale
  const peak = values.indexOf(Math.max(...values));
  rows.forEach((r, i) => {
    const tip = \`\${r.label} · \${r.value} \${SALES.unit}\`;
    bars[i].style.setProperty('--v', r.value / top);
    bars[i].classList.toggle('is-peak', i === peak);
    bars[i].setAttribute('aria-label', tip);
    bars[i].querySelector('b').textContent = tip;
  });
  ticks.forEach((t, k) => (t.textContent = Math.round(TICKS[k] * top)));
  out.textContent = \`\${year} · peak \${rows[peak].label}, \${rows[peak].value} \${SALES.unit}\`;
  buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.year === year));
}

buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.year)));

// a mouse shows a tooltip on hover (CSS); a finger has no hover, so a tap pins one
chart.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  const bar = e.target.closest('.bar');
  bars.forEach((b) => b.classList.toggle('is-tip', b === bar));
});

show('${YEARS[0]}');`,
  },

  heatmap: {
    how: [
      'The JSON is a list of weeks, each a list of numbers. JS writes one number per block: <code>--v = value ÷ the largest value</code>, plus its grid position <code>--x</code> / <code>--y</code>.',
      'A block is three surfaces: the element itself is the <b>roof</b>, lifted by <code>translateZ(calc(var(--v) * 70px))</code>; <code>::before</code> and <code>::after</code> are the two walls you can see, hanging down from its edges with <code>rotateX(-90deg)</code> and <code>rotateY(90deg)</code>. Their height is the same <code>--v × 70px</code>.',
      'The colour follows the value too: <code>color-mix(in srgb, pink calc(var(--v) * 100%), teal)</code> runs from cold to hot with no colour scale in JS.',
      'Each block sits in a real <code>&lt;button&gt;</code>, so it can be tabbed to and tapped. The floor has <code>pointer-events: none</code>: blocks in 3D share a plane, and only the buttons should be hit.',
    ],
    html: `<div class="heat">
  <div class="scene">
    <div class="world"></div>
  </div>
  <output></output>
</div>`,
    css: `.heat {
  display: grid;
  justify-items: center;
  gap: 18px;
  font-family: system-ui, sans-serif;
}

.scene {
  perspective: 800px;
  padding: 50px 30px 10px;
  pointer-events: none; /* the floor is tilted back: only the blocks take the pointer */
}

/* 5 columns and 4 rows: a 34px pitch, 26px blocks, 10px margin */
.world {
  position: relative;
  width: 182px;
  height: 148px;
  border: 1px solid rgb(139 108 255 / 0.4);
  border-radius: 10px;
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
  top: 140px;
  left: calc(10px + var(--x) * 34px);
  width: 26px;
  color: ${MUTED};
  font: 700 8px/10px system-ui, sans-serif;
  font-style: normal;
  text-align: center;
}

.cell {
  /* cold teal → hot pink with the value */
  --c: color-mix(in srgb, ${PINK} calc(var(--v) * 100%), ${TEAL});
  position: absolute;
  top: calc(10px + var(--y) * 34px);
  left: calc(10px + var(--x) * 34px);
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
  border-radius: 3px;
  background: color-mix(in srgb, var(--c) 14%, transparent);
  outline: none;
  transform-style: preserve-3d;
  pointer-events: auto;
  cursor: pointer;
}

/* the roof, lifted by the value */
.cell i {
  position: absolute;
  inset: -1px;
  background: color-mix(in srgb, var(--c) 68%, ${SURFACE});
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 85%, #fff);
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--v) * 70px));
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
  height: calc(var(--v) * 70px);
  background: color-mix(in srgb, var(--c) 46%, ${SURFACE});
  transform-origin: top;
  transform: rotateX(-90deg);
}

/* the wall hanging from its right edge, a shade darker */
.cell i::after {
  top: 0;
  left: 100%;
  width: calc(var(--v) * 70px);
  height: 100%;
  background: color-mix(in srgb, var(--c) 30%, ${SURFACE});
  transform-origin: left;
  transform: rotateY(90deg);
}

/* pointed at: the roof lights up; the cell itself never moves */
.cell:hover i,
.cell:focus-visible i {
  background: color-mix(in srgb, var(--c) 55%, #fff);
  box-shadow: inset 0 0 0 1px #fff, 0 0 16px var(--c);
}

output {
  color: ${MUTED};
  font-size: 12px;
}`,
    js: `// The data, as an API would send it back
const COMMITS = ${compactRows(json(COMMITS)).replace(/\[\s+("Mon"[^\]]+?)\s+\]/, (_, inner: string) => `[${inner.replace(/\s+/g, ' ')}]`)};

const world = document.querySelector('.world');
const out = document.querySelector('.heat output');
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
      'The 3D is only on containers: the panel is tilted with <code>rotateX / rotateY / rotateZ</code>, and the area, the line and the dots sit at <code>translateZ</code> 8, 16 and 22px, so they float over the glass at different depths.',
      'Hovering the still wrapper sets the panel to <code>rotateX(0) rotateY(0) rotateZ(0)</code>: it lies flat, and the values fade in, so you can read it. The wrapper never moves, so the hover never flickers.',
      'The neon glow is the same path drawn again, wide and faint, underneath: cheaper than a blur <code>filter</code> and sharp at any zoom.',
      'Because the tilt is on the container, the same CSS works around a chart from any library that draws SVG or canvas.',
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
  position: relative;
  width: 200px;
  height: 110px;
  margin: 40px;
  outline: none;
  transform-style: preserve-3d;
  perspective: 800px;
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
  border: 1px solid rgb(139 108 255 / 0.5);
  border-radius: 12px;
  background:
    repeating-linear-gradient(transparent 0 21px, rgb(236 238 251 / 0.1) 21px 22px) 0 12px / 100% calc(100% - 24px) no-repeat,
    linear-gradient(150deg, #2a2560, ${SURFACE});
  box-shadow: 0 18px 36px -14px rgb(0 0 0 / 0.55);
}

.panel svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.area {
  transform: translateZ(8px);
}

.area path {
  fill: rgb(46 230 214 / 0.16);
}

.line {
  transform: translateZ(16px);
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
  transform: translateZ(22px);
}

.dots i {
  position: absolute;
  top: var(--y);
  left: var(--x);
  width: 7px;
  height: 7px;
  margin: -3.5px 0 0 -3.5px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 2px ${TEAL}, 0 0 10px ${TEAL};
}

/* values: hidden while tilted (except the latest), shown when the panel lies flat */
.dots span {
  position: absolute;
  bottom: 9px;
  left: 50%;
  padding: 1px 3px;
  border-radius: 4px;
  background: rgb(20 24 48 / 0.85);
  color: ${TEXT};
  font: 700 8px/10px system-ui, sans-serif;
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
  top: 9px;
  left: 12px;
  color: ${TEXT};
  font: 800 10px/12px system-ui, sans-serif;
  letter-spacing: 0.04em;
  transform: translateZ(10px);
}

.title small {
  color: ${MUTED};
  font-weight: 700;
}`,
    js: `// The data, as an API would send it back
const TREND = ${compactRows(json(TREND)).replace(/\[\s+("Jan"[^\]]+?)\s+\]/, (_, inner: string) => `[${inner.replace(/\s+/g, ' ')}]`)};

// The panel is 200 × 110px and the SVG viewBox is the same, so one SVG unit is one pixel
const W = 200, H = 110, PAD = 12;
const lo = Math.min(...TREND.values);
const hi = Math.max(...TREND.values);

// JSON → points: x evenly along the width, y by where the value sits between lo and hi
// (14px of headroom at the top for the title)
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
  dot.style.cssText = \`--x:\${x}px; --y:\${y}px\`;
  const label = document.createElement('span');
  label.textContent = TREND.values[i];
  dot.append(label);
  dots.append(dot);
});`,
  },
};
