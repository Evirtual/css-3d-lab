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

// The plate is W × H px and every SVG's viewBox is the same, so one SVG unit is one pixel.
const W = 208;
const H = 164;
const CX = W / 2;
const CY = H / 2;
const R = 56; // the web's outer ring
const RINGS = [0.2, 0.4, 0.6, 0.8, 1];
// one colour per series (tokens, so both themes work); each series floats 12px above the last
const COLORS = ['var(--accent-2)', 'var(--hot)'];
const z = (k: number): number => 10 + k * 12;

const n = RADAR.axes.length;
const r1 = (x: number): number => Math.round(x * 10) / 10;
/** A score the way a dashboard writes it: 8/10. */
const score = (v: number): string => `${v}/${RADAR.max}`;
/** Axis i points straight up for i = 0 and goes round clockwise. */
const angle = (i: number): number => -Math.PI / 2 + (i * 2 * Math.PI) / n;
/** The point at distance r from the centre along axis i. */
const at = (i: number, r: number): [number, number] => [r1(CX + Math.cos(angle(i)) * r), r1(CY + Math.sin(angle(i)) * r)];
/** 1 for an axis pointing right, −1 left, 0 for straight up or down. */
const side = (i: number): number => {
  const cos = Math.cos(angle(i));
  return Math.abs(cos) < 0.3 ? 0 : Math.sign(cos);
};

const rings = RINGS.map((f) => 'M' + RADAR.axes.map((_, i) => at(i, R * f).join(' ')).join(' L') + 'Z').join(' ');
const spokes = RADAR.axes.map((_, i) => `M${CX} ${CY} L${at(i, R).join(' ')}`).join(' ');

// The axis names: the side ones start 14px out and read outwards, the top and bottom ones sit
// 18px out, centred. The tooltip sits over the name of the axis it describes (it repeats it).
const nameAt = (i: number): [number, number] => at(i, R + (side(i) ? 14 : 18));
const tipAt = (i: number): [number, number] => at(i, R + (side(i) ? 26 : 14));

/** A series' scores as points: the value decides how far out along its axis. */
const points = (values: number[]): [number, number][] => values.map((v, i) => at(i, (R * v) / RADAR.max));

/** Which of the shown series scores highest on axis i: -1 for a tie or when none is shown. */
const leader = (i: number, on: boolean[]): number => {
  let best = -1;
  let tie = false;
  RADAR.series.forEach((s, k) => {
    if (!on[k]) return;
    const top = best < 0 ? -Infinity : RADAR.series[best].values[i];
    if (s.values[i] > top) [best, tie] = [k, false];
    else if (s.values[i] === top) tie = true;
  });
  return tie ? -1 : best;
};

/** The dock's line: who leads where, for the series that are switched on. */
const summary = (on: boolean[]): string => {
  const shown = RADAR.series.filter((_, k) => on[k]);
  if (shown.length === 0) return 'Nothing shown · press a name to bring it back';
  if (shown.length === 1) {
    const { name, values } = shown[0];
    const hi = Math.max(...values);
    const lo = Math.min(...values);
    return `${name} · best ${RADAR.axes[values.indexOf(hi)]} ${score(hi)}, lowest ${RADAR.axes[values.indexOf(lo)]} ${score(lo)}`;
  }
  const [a, b] = shown;
  const wins = a.values.filter((v, i) => v > b.values[i]).length;
  const losses = a.values.filter((v, i) => v < b.values[i]).length;
  const ties = n - wins - losses;
  return `${a.name} leads on ${wins} of ${n} · ${b.name} on ${losses}${ties ? ` · ${ties} tied` : ''}`;
};

const ariaLabel = `Radar chart. ${RADAR.series
  .map((s) => `${s.name}: ${s.values.map((v, i) => `${RADAR.axes[i]} ${score(v)}`).join(', ')}`)
  .join('. ')}.`;

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
  fill: true,
  html: `<div class="d-radar">
      <div class="d-radar__view">
        <div class="d-radar__chart" tabindex="0" role="img" aria-label="${ariaLabel}">
          <div class="d-radar__plate">
            <div class="d-radar__base"></div>
            <svg class="d-radar__web" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path class="d-radar__rings" d="${rings}" /><path class="d-radar__spokes" d="${spokes}" /></svg>
            ${RADAR.series
              .map((s, k) => {
                const pts = points(s.values);
                const poly = pts.map((p) => p.join(',')).join(' ');
                return `<svg class="d-radar__series" data-layer="${k}" style="--c:${COLORS[k]};--z:${z(k)}px" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polygon class="d-radar__glow" points="${poly}" /><polygon class="d-radar__lit" points="${poly}" /><polygon points="${poly}" /><path class="d-radar__dots" d="${pts.map(([x, y]) => `M${x} ${y}h0`).join('')}" /></svg>`;
              })
              .join('')}
            <div class="d-radar__axes">${RADAR.axes
              .map((a, i) => {
                const [x, y] = nameAt(i);
                return `<span style="--x:${x}px;--y:${y}px;--ax:${side(i)}">${a}</span>`;
              })
              .join('')}</div>
            <b class="d-radar__tip" aria-hidden="true"><em></em>${RADAR.series
              .map((_, k) => `<span data-layer="${k}" style="--c:${COLORS[k]}"></span>`)
              .join('')}</b>
          </div>
        </div>
      </div>
      <div class="d-radar__dock">
        <output>${summary(RADAR.series.map(() => true))}</output>
        <div class="d-radar__toggles">${RADAR.series
          .map((s, k) => `<button type="button" data-series="${k}" aria-pressed="true" style="--c:${COLORS[k]}">${s.name}</button>`)
          .join('')}</div>
      </div>
    </div>`,
  init(scene) {
    const chart = scene.querySelector<HTMLElement>('.d-radar__chart')!;
    const layers = [...scene.querySelectorAll<SVGElement>('.d-radar__series')];
    const tip = scene.querySelector<HTMLElement>('.d-radar__tip')!;
    const tipName = tip.querySelector('em')!;
    const tipValues = [...tip.querySelectorAll('span')];
    const out = scene.querySelector<HTMLOutputElement>('.d-radar__dock output')!;
    const toggles = scene.querySelector<HTMLElement>('.d-radar__toggles')!;
    const buttons = [...toggles.querySelectorAll<HTMLButtonElement>('button')];
    const shown = () => buttons.map((b) => b.getAttribute('aria-pressed') === 'true');
    let active = -1;
    let hideTimer = 0;
    let lead = -1; // the series leading on the pointed axis
    let pointed = -1; // the series whose dock button is pointed at or focused
    // one series at a time fills in and glows more: the pointed button's, else the axis' leader
    // (CSS fades its overlay with opacity)
    const relight = () => {
      const k = pointed >= 0 ? pointed : lead;
      layers.forEach((l, j) => l.classList.toggle('is-active', j === k));
    };

    // One tooltip for the whole chart: it glides from axis to axis and its text changes on the
    // way. JS gives it the axis' place (--tx, --ty) and its leader's colour; CSS does the glide.
    // (refresh: only new text for the same axis, e.g. after a toggle; a pending hide still runs)
    const place = (i: number, refresh = false) => {
      if (!refresh) clearTimeout(hideTimer);
      const wasOn = tip.classList.contains('is-on');
      // from hidden it appears in place, not flying in from where it was last
      if (!wasOn) tip.style.transition = 'none';
      const [x, y] = tipAt(i);
      tip.style.setProperty('--tx', `${x}px`);
      tip.style.setProperty('--ty', `${y}px`);
      lead = leader(i, shown());
      tip.style.setProperty('--c', lead < 0 ? 'var(--accent)' : COLORS[lead]);
      relight();
      tipName.textContent = RADAR.axes[i];
      tipValues.forEach((el, k) => (el.textContent = score(RADAR.series[k].values[i])));
      if (!wasOn) {
        void tip.offsetWidth; // apply the new place before the transition comes back
        tip.style.transition = '';
      }
      tip.classList.add('is-on');
      active = i;
    };
    // a short grace period, so leaving and coming straight back does not blink it
    const hide = () => {
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        tip.classList.remove('is-on');
        active = -1;
        lead = -1;
        relight();
      }, 150);
    };
    /** The axis nearest the pointer's direction from the chart's centre (the wrapper never moves). */
    const axisAt = (e: PointerEvent): number => {
      const r = chart.getBoundingClientRect();
      const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
      return (((Math.round((a + Math.PI / 2) / ((2 * Math.PI) / n)) % n) + n) % n);
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const i = axisAt(e);
      if (i !== active || !tip.classList.contains('is-on')) place(i);
    };
    const leave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') hide();
    };
    // a finger has no hover: a tap lays the chart flat and points at the tapped axis; tapping the
    // same axis again stands it back up
    const tap = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const i = axisAt(e);
      if (chart.classList.contains('is-flat') && i === active) {
        chart.classList.remove('is-flat');
        hide();
      } else {
        chart.classList.add('is-flat');
        place(i);
      }
    };
    // keyboard: focus shows the first axis, the arrow keys walk round
    const focus = () => place(active < 0 ? 0 : active);
    const blur = () => hide();
    const key = (e: KeyboardEvent) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      place((((active < 0 ? 0 : active) + step) % n + n) % n);
    };

    // a button only flips a class; the fade is CSS (opacity)
    const toggle = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (!btn) return;
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      // the series' shape and its value in the tooltip
      scene
        .querySelectorAll(`[data-layer="${btn.dataset.series}"]`)
        .forEach((el) => el.classList.toggle('is-off', !on));
      out.textContent = summary(shown());
      if (tip.classList.contains('is-on')) place(active, true); // the leader may have changed
    };
    // pointing at (or focusing) a series' button lights that series up
    const light = (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('button');
      pointed = btn ? Number(btn.dataset.series) : -1;
      relight();
    };
    const unlight = (e: Event) => {
      const to = (e as PointerEvent | FocusEvent).relatedTarget as HTMLElement | null;
      if (to?.closest?.('.d-radar__toggles button')) return;
      pointed = -1;
      relight();
    };

    const onChart: [string, EventListener][] = [
      ['pointermove', move as EventListener],
      ['pointerleave', leave as EventListener],
      ['pointerup', tap as EventListener],
      ['focus', focus],
      ['blur', blur],
      ['keydown', key as EventListener],
    ];
    const onDock: [string, EventListener][] = [
      ['click', toggle],
      ['pointerover', light],
      ['focusin', light],
      ['pointerout', unlight],
      ['focusout', unlight],
    ];
    onChart.forEach(([type, fn]) => chart.addEventListener(type, fn));
    onDock.forEach(([type, fn]) => toggles.addEventListener(type, fn));
    return () => {
      clearTimeout(hideTimer);
      onChart.forEach(([type, fn]) => chart.removeEventListener(type, fn));
      onDock.forEach(([type, fn]) => toggles.removeEventListener(type, fn));
    };
  },
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
  color: ${TEXT};
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

/* the series buttons: real toggles, each with its colour as a dot */
.controls button {
  display: inline-flex;
  align-items: center;
  gap: 1.5vmin;
  height: 8vmin;
  min-width: 8vmin;
  padding: 0 3vmin;
  border: 0;
  border-radius: 999px;
  background: rgb(140 150 220 / 0.2);
  color: ${MUTED};
  font: 600 4vmin system-ui, sans-serif;
  cursor: pointer;
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
  color: ${TEXT};
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
