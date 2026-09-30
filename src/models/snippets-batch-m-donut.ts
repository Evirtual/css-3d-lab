import type { Snippet } from './snippet-utils';

/*
 * donut: a thick donut chart from JSON, lying back in 3D. JS turns the segments into the stops of
 * one conic-gradient and writes it into a custom property; a stack of round layers, each with the
 * same gradient and a mask for the hole, gives the disc its thickness. The total stands up in the
 * hole on a plate of the model's own, a legend sits beside the disc in the stage's ink, and the
 * segment buttons under it switch segments off and on. Hovering the still wrapper lifts the disc
 * toward you, with transform only.
 */

/** The data, shaped like an API response: seats per plan. Printed into the snippet's JS. */
const SEATS = {
  unit: 'seats',
  segments: [
    { name: 'Pro', value: 420 },
    { name: 'Team', value: 310 },
    { name: 'Edu', value: 190 },
    { name: 'Free', value: 320 },
  ],
};

const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const AMBER = '#ffb547';
const TEXT = '#eceefb';
const MUTED = '#949bc0';
const SURFACE = '#141830';

/** The JSON, with each segment on one line. */
const json = JSON.stringify(SEATS, null, 2).replace(/\{\s+([^{}]+?)\s+\}/g, (_, inner: string) => `{ ${inner.replace(/\s+/g, ' ')} }`);

const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export const snippetsDonut: Record<string, Snippet> = {
  donut: {
    how: [
      'The chart is one <code>conic-gradient</code>. JS walks the segments that are on, turns each value into a share of the total and writes a pair of stops per segment (<code>colour A% B%</code>, so the edges are hard); the whole gradient goes into one custom property, <code>--pie</code>, and every layer paints <code>background: var(--pie)</code>. Nothing is drawn per segment.',
      'The thickness is a stack of eight round layers at <code>translateZ(--i × 2 units)</code> inside a disc that lies back with <code>rotateX(42deg)</code>. The lower ones paint a dark tint over the same gradient, so the rim reads as the side of each colour; only the top layer is full strength. A real extrusion would need a wall per segment; a stack needs nothing to change when a segment goes.',
      'The hole is a <code>mask</code> on every layer, a <code>radial-gradient</code> that is clear to the hole’s radius and solid past it. It cuts the far side’s inner wall out too, so you see the inside of the ring through the hole, which is what makes it a donut rather than a disc with a badge.',
      'The total stands up in the hole: <code>rotateX(-42deg)</code> is the disc’s own tilt in reverse, so the plate faces you while its foot stays on the disc, and it rides the stack (<code>translateZ</code> to the top layer) before the turn so it stands on the surface, not in it.',
      'Hover and focus lift the disc toward you, <code>translateZ</code> on a wrapper that itself never takes the pointer (<code>pointer-events: none</code>): the still box round it does, so the hover cannot flicker at the edges. The buttons are real <code>&lt;button aria-pressed&gt;</code>; a click only flips which segments are on and JS writes the gradient again. Every length is a multiple of one base unit, <code>--u</code>, and the control zone under it is in plain <code>vmin</code>, the same object in every model.',
    ],
    html: `<div class="donut">
  <div class="view">
    <div class="scene">
      <div class="chart3d" tabindex="0" role="img" aria-label="Donut chart">
        <div class="lift">
          <div class="disc">
            <i class="layer" style="--i:0"></i><i class="layer" style="--i:1"></i>
            <i class="layer" style="--i:2"></i><i class="layer" style="--i:3"></i>
            <i class="layer" style="--i:4"></i><i class="layer" style="--i:5"></i>
            <i class="layer" style="--i:6"></i><i class="layer" style="--i:7"></i>
            <b class="total" aria-hidden="true"><span></span><em></em></b>
          </div>
        </div>
      </div>
      <div class="legend" aria-hidden="true"></div>
    </div>
  </div>
  <div class="controls">
    <div class="row toggles"></div>
  </div>
</div>`,
    css: `.donut {
  /* one base unit: every length in the chart is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas. The control zone under it is in
     plain vmin, because it is the same object in every model. */
  --u: 0.36vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin; /* the band's gap between the model and the control zone */
  font-family: Inter, system-ui, sans-serif;
}

/* the model box: the same height in every model that has controls */
.view {
  display: grid;
  place-items: center;
  height: 50vmin;
}

/* the disc and the legend side by side. The scene must fit the 50vmin box: taller than it, the
   grid row grows past the box from its top and nothing is centred any more */
.scene {
  display: flex;
  align-items: center;
  gap: calc(14 * var(--u));
  perspective: calc(800 * var(--u));
}

/* the still wrapper: it takes the hover and the focus and never moves, so the hover never
   flickers at its edges. Its box is the disc's drawn height (the tilted ellipse and the rim),
   not the disc's square, so the scene fits the model box and the drawn stack is centred */
.chart3d {
  position: relative;
  width: calc(160 * var(--u));
  height: calc(130 * var(--u));
  outline: none;
  transform-style: preserve-3d;
  cursor: pointer;
}

/* what moves on hover: lifted toward you, transform only */
.lift {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.6s ${EASE};
  pointer-events: none;
}

.chart3d:hover .lift,
.chart3d:focus-visible .lift {
  transform: translateZ(calc(28 * var(--u)));
}

/* the disc, a 160-unit square centred in the wrapper, lies back like a plate on a table */
.disc {
  position: absolute;
  top: 50%;
  left: 0;
  width: calc(160 * var(--u));
  height: calc(160 * var(--u));
  margin-top: calc(-80 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(42deg);
}

/* the stack: eight round layers, 2 units apart, every one the same gradient with a hole
   masked out. The lower ones carry a dark tint, so the rim reads as the side of each colour */
.layer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(rgb(5 6 12 / 0.45), rgb(5 6 12 / 0.45)), var(--pie);
  -webkit-mask: radial-gradient(circle, transparent calc(44 * var(--u)), #000 calc(44.6 * var(--u)));
  mask: radial-gradient(circle, transparent calc(44 * var(--u)), #000 calc(44.6 * var(--u)));
  transform: translateZ(calc(var(--i) * 2 * var(--u)));
}

/* the top layer: full colour, with a hairline of light on its edge */
.layer:nth-child(8) {
  background: var(--pie);
  box-shadow: inset 0 0 0 calc(0.6 * var(--u)) rgb(255 255 255 / 0.25);
}

/* the total, standing in the hole on a plate of its own. rotateX(-42deg) undoes the disc's
   tilt so it faces you; the translateZ before it lifts its foot onto the top layer */
.total {
  position: absolute;
  top: 50%;
  left: 50%;
  box-sizing: border-box;
  padding: calc(3 * var(--u)) calc(8 * var(--u)) calc(4 * var(--u));
  border-radius: calc(6 * var(--u));
  background: ${SURFACE};
  box-shadow: 0 0 0 calc(1 * var(--u)) rgb(139 108 255 / 0.55);
  color: ${TEXT};
  font: 700 calc(15 * var(--u)) / calc(17 * var(--u)) Inter, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  text-align: center;
  white-space: nowrap;
  transform-origin: 50% 100%;
  transform: translate(-50%, -100%) translateZ(calc(15 * var(--u))) rotateX(-42deg);
}

.total span {
  display: block;
}

.total em {
  display: block;
  color: ${MUTED};
  font-size: calc(9 * var(--u));
  font-style: normal;
  line-height: calc(11 * var(--u));
}

/* the legend beside the disc: the stage's own ink, softened as the caption is, so it reads on
   the dark stage and the light one */
.legend {
  display: grid;
  gap: calc(7 * var(--u));
  opacity: 0.7;
  font: 700 calc(11 * var(--u)) / calc(13 * var(--u)) Inter, system-ui, sans-serif;
  white-space: nowrap;
}

.legend div {
  display: flex;
  align-items: center;
  gap: calc(5 * var(--u));
}

/* the name over the value: two short lines keep the legend narrow beside the disc */
.legend span {
  display: grid;
}

/* the segment's colour as a dot: filled when on, a ring when off */
.legend i {
  box-sizing: border-box;
  flex: none;
  width: calc(8 * var(--u));
  height: calc(8 * var(--u));
  border: calc(2.5 * var(--u)) solid var(--c);
  border-radius: 50%;
  background: var(--c);
}

.legend .is-off i {
  background: transparent;
}

.legend em {
  display: block;
  font-weight: 500;
  font-style: normal;
  font-size: calc(10 * var(--u));
  line-height: calc(12 * var(--u));
  font-variant-numeric: tabular-nums;
}

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the chart's own unit */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}
.controls .caption { font: 500 4.5vmin/1.2 Inter, system-ui, sans-serif; opacity: 0.7; }
.controls .row { display: flex; gap: 2vmin; }
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
}

/* the segment buttons: real toggles, each with its colour as a dot. Its word stays the stage's
   ink, on a tint of the segment's colour light enough to keep it readable on both stages */
.controls button {
  display: inline-flex;
  align-items: center;
  gap: 1.5vmin;
}

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

/* a segment that is on answers the pointer in its own colours: deeper tint, same ink */
.toggles button[aria-pressed='true']:hover {
  background: color-mix(in srgb, var(--c) 34%, transparent);
}

.toggles button[aria-pressed='true']::before {
  background: var(--c);
}`,
    js: `// The data, as an API would send it back
const SEATS = ${json};

const COLORS = ['${VIOLET}', '${TEAL}', '${PINK}', '${AMBER}']; // one per segment
const chart = document.querySelector('.chart3d');
const disc = chart.querySelector('.disc');
const totalNum = disc.querySelector('.total span');
const totalUnit = disc.querySelector('.total em');
const legend = document.querySelector('.legend');
const toggles = document.querySelector('.toggles');
const on = SEATS.segments.map(() => true); // which segments are shown
const num = (n) => n.toLocaleString('en-US'); // 1,240

// The legend and the buttons, built once. Names go in as text, never as HTML: an API is not
// trusted markup.
const rows = SEATS.segments.map((s, k) => {
  const row = document.createElement('div');
  row.style.setProperty('--c', COLORS[k]);
  const dot = document.createElement('i');
  const text = document.createElement('span');
  const name = document.createElement('b');
  name.textContent = s.name;
  const value = document.createElement('em');
  text.append(name, value);
  row.append(dot, text);
  legend.append(row);
  return { row, value };
});
const buttons = SEATS.segments.map((s, k) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = s.name;
  btn.style.setProperty('--c', COLORS[k]);
  toggles.append(btn);
  return btn;
});

// The chart is one conic-gradient: a pair of stops per segment that is on, hard-edged, going
// clockwise from the top. JS writes the whole gradient into --pie; every layer paints it.
function render() {
  const sum = SEATS.segments.reduce((t, s, k) => t + (on[k] ? s.value : 0), 0);
  const stops = [];
  let from = 0;
  SEATS.segments.forEach((s, k) => {
    const share = on[k] && sum ? s.value / sum : 0;
    const to = from + share;
    if (on[k]) stops.push(\`\${COLORS[k]} \${(from * 100).toFixed(2)}% \${(to * 100).toFixed(2)}%\`);
    rows[k].value.textContent = on[k] ? \`\${num(s.value)} · \${Math.round(share * 100)}%\` : 'hidden';
    rows[k].row.classList.toggle('is-off', !on[k]);
    buttons[k].setAttribute('aria-pressed', on[k]);
    from = to;
  });
  // with nothing on, an empty ring in the pill's own tint, so the shape stays
  disc.style.setProperty('--pie', stops.length ? \`conic-gradient(from -90deg, \${stops.join(', ')})\` : 'conic-gradient(rgb(140 150 220 / 0.3) 0 100%)');
  totalNum.textContent = num(sum);
  totalUnit.textContent = SEATS.unit;
  chart.setAttribute('aria-label', \`Donut chart. \${num(sum)} \${SEATS.unit} in all. \` +
    SEATS.segments.map((s, k) => on[k] ? \`\${s.name} \${num(s.value)}, \${Math.round((s.value / sum) * 100)}%\` : \`\${s.name} hidden\`).join('. '));
}

// A button only flips a segment; render writes the gradient again
buttons.forEach((btn, k) => btn.addEventListener('click', () => {
  on[k] = !on[k];
  render();
}));

render();`,
  },
};
