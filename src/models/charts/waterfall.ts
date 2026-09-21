import { niceMax } from '../chart-data';
import type { Snippet } from '../snippet-utils';
import type { Demo } from '../types';

/*
 * waterfall: a month of cash flow as a 3D waterfall. A starting balance, the gains and losses of
 * the month, and the ending balance, which JS works out from the rest. Each step is a box floating
 * at the running total; JS turns it into three fractions of the scale and CSS draws the rest.
 */

interface Step {
  label: string;
  /** Totals may leave it out: they then show the running total (the ending balance). */
  value?: number;
  kind?: 'total';
}

/** The JSON, shaped like an API response. The same const drives the model and its snippet. */
export const CASHFLOW = {
  prefix: '$',
  suffix: 'k',
  months: {
    Aug: [
      { label: 'Start', value: 120, kind: 'total' },
      { label: 'Sales', value: 85 },
      { label: 'Refunds', value: -18 },
      { label: 'Salaries', value: -64 },
      { label: 'Ads', value: -22 },
      { label: 'Grants', value: 30 },
      { label: 'End', kind: 'total' },
    ],
    Sep: [
      { label: 'Start', value: 131, kind: 'total' },
      { label: 'Sales', value: 92 },
      { label: 'Refunds', value: -25 },
      { label: 'Salaries', value: -64 },
      { label: 'Ads', value: -41 },
      { label: 'Grants', value: 12 },
      { label: 'End', kind: 'total' },
    ],
  } as Record<string, Step[]>,
};

const MONTHS = Object.keys(CASHFLOW.months);
// the wall's lines sit at these fractions of the scale
const TICKS = [0, 0.5, 1];
// the step geometry, the same numbers as _waterfall.scss ($w, $gap, $h): the tooltip is placed with them
const STEP_W = 18;
const STEP_PITCH = 18 + 9;
const STEP_H = 100;

/** Money the way dashboards write it: sign in front, a real minus, the k glued on ("−$64k"). */
const money = (v: number, sign = false): string =>
  `${v < 0 ? '−' : sign && v > 0 ? '+' : ''}${CASHFLOW.prefix}${Math.abs(v)}${CASHFLOW.suffix}`;

interface Row {
  label: string;
  kind: 'total' | 'gain' | 'loss';
  value: number;
  from: number;
  to: number;
}

/**
 * One month as the chart needs it. Every step runs from one level to another (a total from the
 * floor); `--b` is the box's bottom, `--v` its height, `--e` where the next step starts (the
 * connector), all as fractions of the scale's top.
 */
const month = (m: string) => {
  let run = 0;
  const rows: Row[] = CASHFLOW.months[m].map((s) => {
    if (s.kind === 'total') {
      if (s.value !== undefined) run = s.value;
      return { label: s.label, kind: 'total', value: run, from: 0, to: run };
    }
    const value = s.value ?? 0;
    const from = run;
    run += value;
    return { label: s.label, kind: value < 0 ? 'loss' : 'gain', value, from, to: run };
  });
  const top = niceMax(Math.max(...rows.map((r) => Math.max(r.from, r.to))));
  const start = rows[0].to;
  const end = rows[rows.length - 1].to;
  const pct = Math.round(((end - start) / start) * 100);
  return {
    rows,
    top,
    vars: rows.map((r) => ({
      b: (Math.min(r.from, r.to) / top).toFixed(3),
      v: (Math.abs(r.to - r.from) / top).toFixed(3),
      e: (r.to / top).toFixed(3),
    })),
    summary: `${money(start)} → ${money(end)} · ${pct < 0 ? '−' : pct > 0 ? '+' : ''}${Math.abs(pct)}%`,
  };
};

/** A step's tooltip, and its accessible name: "Salaries · −$64k → $123k". */
const tip = (r: Row): string =>
  r.kind === 'total' ? `${r.label} · ${money(r.to)}` : `${r.label} · ${money(r.value, true)} → ${money(r.to)}`;

export const demo: Demo = {
  id: 'waterfall',
  title: '3D waterfall chart from JSON',
  description:
    'A month of cash flow as floating neon glass boxes: the starting balance, each gain stepping up and each loss stepping down, and the ending balance JS works out. Switch the month and every box glides to its new place. JS only turns the data into three fractions per step.',
  category: 'js',
  tags: ['controls', 'hover', 'data', 'chart', 'json', 'finance'],
  technique: [
    'JSON → running total → --b, --v, --e per step',
    'translateY(−--b × height) then scaleY(--v), transitioned',
    'connector line: ::after riding at the running total',
    'still full-height column per step + one gliding tooltip',
  ],
  fill: true,
  html: (() => {
    const { rows, top, vars, summary } = month(MONTHS[0]);
    return `<div class="d-waterfall">
      <div class="d-waterfall__view"><div class="d-waterfall__chart">
        <div class="d-waterfall__floor"></div>
        <div class="d-waterfall__wall">${TICKS.map((t) => `<b style="--t:${t}"><span>${Math.round(t * top)}</span></b>`).join('')}</div>
        ${rows
          .map(
            (r, i) =>
              `<div class="d-waterfall__step is-${r.kind}" style="--i:${i};--b:${vars[i].b};--v:${vars[i].v};--e:${vars[i].e}" tabindex="0" aria-label="${tip(r)}"><i></i><i></i><i></i><span>${r.label}</span></div>`,
          )
          .join('')}
        <b class="d-waterfall__tip" aria-hidden="true"></b>
      </div></div>
      <div class="d-waterfall__dock">
        <output>${summary}</output>
        <div class="d-waterfall__seg">${MONTHS.map(
          (m, i) => `<button type="button" data-month="${m}" aria-pressed="${i === 0}">${m}</button>`,
        ).join('')}</div>
      </div>
    </div>`;
  })(),
  init(scene) {
    const steps = [...scene.querySelectorAll<HTMLElement>('.d-waterfall__step')];
    const ticks = [...scene.querySelectorAll<HTMLElement>('.d-waterfall__wall span')];
    const tipEl = scene.querySelector<HTMLElement>('.d-waterfall__tip')!;
    const out = scene.querySelector<HTMLOutputElement>('.d-waterfall__dock output')!;
    const seg = scene.querySelector<HTMLElement>('.d-waterfall__seg')!;
    const buttons = [...seg.querySelectorAll<HTMLButtonElement>('button')];
    let shown = month(MONTHS[0]);
    let active = -1;
    let hideTimer = 0;

    // One tooltip for the whole chart: it glides from step to step and its text changes on the
    // way. JS gives it the top of the step's box (--tx, --ty, the same numbers the CSS uses) and
    // CSS does the glide.
    const place = (i: number) => {
      clearTimeout(hideTimer);
      const r = shown.rows[i];
      const wasOn = tipEl.classList.contains('is-on');
      // from hidden it appears in place, not flying in from where it was last
      if (!wasOn) tipEl.style.transition = 'none';
      tipEl.textContent = tip(r);
      tipEl.style.setProperty('--tx', `${i * STEP_PITCH + STEP_W / 2}px`);
      tipEl.style.setProperty('--ty', `${(1 - Math.max(r.from, r.to) / shown.top) * STEP_H}px`);
      tipEl.classList.remove('is-total', 'is-gain', 'is-loss');
      tipEl.classList.add(`is-${r.kind}`);
      if (!wasOn) {
        void tipEl.offsetWidth; // apply the new place before the transition comes back
        tipEl.style.transition = '';
      }
      tipEl.classList.add('is-on');
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      active = i;
    };
    // a short grace period, so crossing the gap between two steps does not flicker it
    const hide = () => {
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        tipEl.classList.remove('is-on');
        steps.forEach((s) => s.classList.remove('is-active'));
        active = -1;
      }, 150);
    };
    const stepOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.d-waterfall__step');
    const over = (e: Event) => {
      const step = stepOf(e);
      if (step) place(steps.indexOf(step));
    };
    const leave = (e: Event) => {
      const to = (e as PointerEvent | FocusEvent).relatedTarget as HTMLElement | null;
      if (!to?.closest?.('.d-waterfall__step')) hide();
    };
    // a finger has no hover: a tap on a step shows its tooltip, a tap elsewhere hides it
    const tap = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const step = stepOf(e);
      if (step) place(steps.indexOf(step));
      else hide();
    };

    // JS writes three numbers per step; the glide, the stagger and the colours are CSS
    const pick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (!btn) return;
      shown = month(btn.dataset.month!);
      shown.rows.forEach((r, i) => {
        const s = steps[i];
        s.style.setProperty('--b', shown.vars[i].b);
        s.style.setProperty('--v', shown.vars[i].v);
        s.style.setProperty('--e', shown.vars[i].e);
        s.classList.remove('is-total', 'is-gain', 'is-loss');
        s.classList.add(`is-${r.kind}`);
        s.setAttribute('aria-label', tip(r));
        s.querySelector('span')!.textContent = r.label;
      });
      ticks.forEach((t, k) => (t.textContent = String(Math.round(TICKS[k] * shown.top))));
      out.textContent = shown.summary;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      if (active >= 0) place(active); // the tooltip follows its step to the new place
    };

    const on: [string, EventListener][] = [
      ['pointerover', over],
      ['focusin', over],
      ['pointerout', leave],
      ['focusout', leave],
      ['pointerup', tap as EventListener],
    ];
    on.forEach(([type, fn]) => scene.addEventListener(type, fn));
    seg.addEventListener('click', pick);
    return () => {
      clearTimeout(hideTimer);
      on.forEach(([type, fn]) => scene.removeEventListener(type, fn));
      seg.removeEventListener('click', pick);
    };
  },
};

// ---- the copy-paste snippet: plain HTML + CSS + JS, the same JSON printed at the top of its JS ----

const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const TEXT = '#eceefb';
const MUTED = '#949bc0';
const SURFACE = '#141830';

/** The JSON as an API would send it, each step on one line. */
const printed = JSON.stringify(CASHFLOW, null, 2).replace(
  /\{\s+("label"[^{}]*?)\s+\}/g,
  (_, inner: string) => `{ ${inner.replace(/,\s+/g, ', ')} }`,
);

export const snippet: Snippet = {
  how: [
    'The data is plain JSON: a starting balance, the gains and losses, and an ending balance with no value. JS walks the steps keeping a <b>running total</b>, so the end is always the sum and can never disagree with the steps.',
    "Every step runs from one level to another (a total from the floor). JS writes three fractions of the scale: <code>--b</code> the box's bottom, <code>--v</code> its height, <code>--e</code> the level the next step starts from. CSS does the drawing.",
    'A box is three see-through faces the full height of the chart, moved with <code>translateY(calc(var(--b) * -100 units))</code> and <b>then</b> squashed with <code>scaleY(var(--v))</code> from the bottom: translate first, or the lift would be squashed too. Only <code>transform</code> changes, so a new month is a smooth glide, each step 60ms after the last.',
    "The dashed connector is the step's <code>::after</code>, riding at <code>--e</code>: at the top of a gain or a total, at the bottom of a loss. That is what makes it read as a waterfall.",
    "The chart is turned, so the flat boxes around it would catch the pointer first: they get <code>pointer-events: none</code>, and only each step's <b>still, full-height column</b> takes it. It stands in the plane of the box fronts and never moves, so hovering it never flickers mid-glide.",
    'There is <b>one</b> tooltip. JS moves it to the pointed-at step with <code>--tx</code> / <code>--ty</code> and a transition glides it there while its text changes (put in with <code>textContent</code>, never as HTML). It floats 40 units towards you, or the nearer steps on the right would cover it, and a 150ms grace timer keeps it up while you cross a gap.',
    "Every length is a multiple of one base unit, <code>--u</code>, and JS writes the tooltip's place as <b>plain numbers</b> in the chart's own units, which CSS multiplies by it. A length written in px from JS would stay the same size while the chart scaled around it, and the tooltip would drift off its step. The caption and the month switch are in plain <code>vmin</code>: the control zone is the same object, at the same size, in every model.",
  ],
  html: `<div class="waterfall">
  <div class="view">
    <div class="scene">
      <div class="fall3d"></div>
    </div>
  </div>
  <div class="controls">
    <output class="caption"></output>
    <div class="row">
${MONTHS.map((m) => `      <button type="button" data-month="${m}">${m}</button>`).join('\n')}
    </div>
  </div>
</div>`,
  css: `.waterfall {
  /* one base unit: every length in the chart is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas. The control zone under it is in
     plain vmin, because it is the same object in every model. */
  --u: 0.29vmin;
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
  /* the scale's numbers stand off the right end: the room on the right balances them, so the
     drawing is centred in the model box */
  padding: calc(36 * var(--u)) calc(60 * var(--u)) calc(44 * var(--u)) calc(40 * var(--u));
  pointer-events: none; /* the chart is turned: only the steps take the pointer */
}

/* 7 steps × 18 + 6 gaps × 9 = 180 units */
.fall3d {
  position: relative;
  width: calc(180 * var(--u));
  height: calc(100 * var(--u)); /* the top of the scale */
  transform-style: preserve-3d;
  transform: rotateX(-18deg) rotateY(-28deg);
}

/* the floor: a neon grid laid flat along the bottom */
.floor {
  position: absolute;
  left: calc(-12 * var(--u));
  top: calc(76 * var(--u));
  width: calc(204 * var(--u));
  height: calc(48 * var(--u));
  border: calc(1 * var(--u)) solid rgb(139 108 255 / 0.45);
  border-radius: calc(6 * var(--u));
  background:
    repeating-linear-gradient(90deg, rgb(139 108 255 / 0.22) 0 calc(1 * var(--u)), transparent calc(1 * var(--u)) calc(16 * var(--u))),
    repeating-linear-gradient(rgb(139 108 255 / 0.22) 0 calc(1 * var(--u)), transparent calc(1 * var(--u)) calc(16 * var(--u))),
    rgb(139 108 255 / 0.09);
  transform: rotateX(90deg);
}

/* the scale: lines at 0, half and the top, along the back of the floor, numbers at the right.
   Its box starts 10 units above the scale: a turned layer is clipped at its box, and the top
   number pokes out above its line. */
.wall {
  position: absolute;
  top: calc(-10 * var(--u));
  left: calc(-12 * var(--u));
  width: calc(204 * var(--u));
  height: calc(110 * var(--u));
  transform: translateZ(calc(-24 * var(--u)));
}

.wall b {
  position: absolute;
  right: 0;
  bottom: calc(var(--t) * calc(100 * var(--u)));
  left: 0;
  height: calc(1 * var(--u));
  background: rgb(236 238 251 / 0.24);
}

.wall span {
  position: absolute;
  top: calc(-6 * var(--u));
  left: 100%;
  padding-left: calc(6 * var(--u));
  color: ${MUTED};
  font: 700 calc(12 * var(--u))/calc(14 * var(--u)) system-ui, sans-serif;
}

/* A step is a still, full-height column: the hit target. It stands in the plane of the box
   fronts (half a box forward), so it covers exactly the front you see. */
.step {
  --b: 0; /* JS writes these three: the box's bottom, its height, where the next step starts */
  --v: 0;
  --e: 0;
  --c: ${VIOLET}; /* totals violet */
  position: absolute;
  top: 0;
  left: calc(var(--i) * calc(27 * var(--u)));
  width: calc(18 * var(--u));
  height: 100%;
  outline: none;
  transform-style: preserve-3d;
  transform: translateZ(calc(9 * var(--u)));
  pointer-events: auto;
  cursor: pointer;
}

.step.is-gain,
.tip.is-gain {
  --c: ${TEAL};
}

.step.is-loss,
.tip.is-loss {
  --c: ${PINK};
}

/* the connector: a dashed line at the running total, over to the next step */
.step::after {
  content: '';
  position: absolute;
  top: 0;
  left: calc(18 * var(--u));
  width: calc(9 * var(--u));
  border-top: calc(1 * var(--u)) dashed rgb(236 238 251 / 0.6);
  pointer-events: none;
  transform: translateY(calc((1 - var(--e)) * calc(100 * var(--u))));
  transition: transform 0.8s cubic-bezier(0.3, 1.25, 0.5, 1) calc(var(--i) * 60ms);
}

.step:last-of-type::after {
  content: none;
}

/* see-through glass faces with a bright edge: the neon look */
.step i {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  width: calc(18 * var(--u));
  height: 100%;
  border: calc(1 * var(--u)) solid color-mix(in srgb, var(--c) 85%, #fff);
  background: color-mix(in srgb, var(--c) 40%, transparent);
  box-shadow:
    inset 0 0 calc(10 * var(--u)) color-mix(in srgb, var(--c) 40%, transparent),
    0 0 calc(10 * var(--u)) color-mix(in srgb, var(--c) 22%, transparent);
  pointer-events: none; /* the faces move: only the still column is hovered */
  transform-origin: bottom center;
  /* past 1: overshoot and settle; each step 60ms after the one before */
  transition: transform 0.8s cubic-bezier(0.3, 1.25, 0.5, 1) calc(var(--i) * 60ms);
}

/* the pointed-at step fills in and glows (.is-active, set with the tooltip) */
.step i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--c) 50%, transparent);
  box-shadow: 0 0 calc(20 * var(--u)) color-mix(in srgb, var(--c) 60%, transparent);
  opacity: 0;
  transition: opacity 0.25s;
}

.step.is-active i::after {
  opacity: 1;
}

/* front: lifted to the box's bottom FIRST, then squashed to its height */
.step i:nth-child(1) {
  transform: translateY(calc(var(--b) * calc(-100 * var(--u)))) scaleY(var(--v));
}

/* right side, darker: back to the box's middle, turned, out to its right edge */
.step i:nth-child(2) {
  background: color-mix(in srgb, color-mix(in srgb, var(--c) 55%, #05060c) 48%, transparent);
  transform: translateY(calc(var(--b) * calc(-100 * var(--u)))) translateZ(calc(-9 * var(--u))) rotateY(90deg) translateZ(calc(9 * var(--u))) scaleY(var(--v));
}

/* the lid: an 18-unit square laid flat on the box's top */
.step i:nth-child(3) {
  height: calc(18 * var(--u));
  background: color-mix(in srgb, var(--c) 66%, transparent);
  transform-origin: center;
  transform: translateY(calc((1 - var(--b) - var(--v)) * calc(100 * var(--u)))) translateZ(calc(-9 * var(--u))) rotateX(90deg) translateZ(calc(9 * var(--u)));
}

/* the label, in front of the step, tilted so the long ones do not collide */
.step span {
  position: absolute;
  top: calc(100% + calc(6 * var(--u)));
  right: 50%;
  color: ${MUTED};
  font: 700 calc(13 * var(--u))/calc(15 * var(--u)) system-ui, sans-serif;
  white-space: nowrap;
  transform-origin: 100% 0;
  transform: rotate(-38deg);
}

/* ONE tooltip for the chart: JS sets --tx / --ty (the top of the pointed-at box, as plain
   numbers in the chart's own units that CSS multiplies by --u) and it glides there. 40 units
   towards you, because the steps on the right stand nearer; +18 undoes the
   sideways drift that lift gets from the 28deg turn. Kept flat: its thickness is a hard shadow
   up and to the right, the way the boxes' depth runs on screen. */
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
    calc(3 * var(--u)) calc(-3 * var(--u)) 0 color-mix(in srgb, var(--c) 55%, #05060c),
    0 0 calc(14 * var(--u)) color-mix(in srgb, var(--c) 40%, transparent);
  color: ${TEXT};
  font: 700 calc(12 * var(--u))/calc(14 * var(--u)) system-ui, sans-serif;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate(calc((var(--tx, 0) + 18) * var(--u)), calc((var(--ty, 0) - 14) * var(--u))) translate(-50%, -100%) translateZ(calc(40 * var(--u)));
  transition:
    transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.2s;
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
  white-space: nowrap;
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
  js: `// The data, as an API would send it back. "End" has no value: it is worked out below.
const CASHFLOW = ${printed};

const chart = document.querySelector('.fall3d');
const out = document.querySelector('.waterfall output');
const buttons = document.querySelectorAll('.controls .row button');
const TICKS = [0, 0.5, 1]; // the scale's lines, as fractions of its top
const W = 18, PITCH = 27, H = 100; // a step's width, its pitch and the scale's height, in the chart's own units (as in the CSS)

// money the way dashboards write it: sign in front, a real minus (−), the k glued on
const money = (v, sign) =>
  (v < 0 ? '−' : sign && v > 0 ? '+' : '') + CASHFLOW.prefix + Math.abs(v) + CASHFLOW.suffix;

// Build the chart once: the floor, the scale, a column with three faces per step, one tooltip
const first = Object.values(CASHFLOW.months)[0];
chart.innerHTML =
  '<div class="floor"></div>' +
  '<div class="wall">' + TICKS.map((t) => \`<b style="--t:\${t}"><span></span></b>\`).join('') + '</div>' +
  first.map((_, i) => \`<div class="step" style="--i:\${i}" tabindex="0"><i></i><i></i><i></i><span></span></div>\`).join('') +
  '<b class="tip" aria-hidden="true"></b>';
const steps = [...chart.querySelectorAll('.step')];
const ticks = chart.querySelectorAll('.wall span');
const tipEl = chart.querySelector('.tip');
let rows = [];
let scaleTop = 1; // (not "top": that is window.top in a plain script)
let active = -1;
let hideTimer = 0;

// Show one month: walk the steps with a running total, then give each step three fractions of the
// scale. CSS turns them into a lift, a height and a connector, and animates the change.
function show(month) {
  let run = 0;
  rows = CASHFLOW.months[month].map((s) => {
    if (s.kind === 'total') {
      if (s.value !== undefined) run = s.value; // a total with no value is the running total
      return { label: s.label, kind: 'total', value: run, from: 0, to: run };
    }
    const from = run;
    run += s.value;
    return { label: s.label, kind: s.value < 0 ? 'loss' : 'gain', value: s.value, from, to: run };
  });
  scaleTop = Math.ceil(Math.max(...rows.map((r) => Math.max(r.from, r.to))) / 20) * 20; // a tidy top
  rows.forEach((r, i) => {
    const s = steps[i];
    s.style.setProperty('--b', Math.min(r.from, r.to) / scaleTop); // the box's bottom
    s.style.setProperty('--v', Math.abs(r.to - r.from) / scaleTop); // its height
    s.style.setProperty('--e', r.to / scaleTop); // where the next step starts
    s.classList.remove('is-total', 'is-gain', 'is-loss');
    s.classList.add('is-' + r.kind);
    // text from the data goes in as text, never as HTML: data from an API is not trusted markup
    s.querySelector('span').textContent = r.label;
    s.setAttribute('aria-label', tipText(r));
  });
  ticks.forEach((t, k) => (t.textContent = Math.round(TICKS[k] * scaleTop)));
  const start = rows[0].to;
  const end = rows[rows.length - 1].to;
  const pct = Math.round(((end - start) / start) * 100);
  out.textContent = \`\${money(start)} → \${money(end)} · \${pct < 0 ? '−' : pct > 0 ? '+' : ''}\${Math.abs(pct)}%\`;
  buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.month === month));
  if (active >= 0) place(active); // the tooltip follows its step to the new place
}

function tipText(r) {
  return r.kind === 'total' ? \`\${r.label} · \${money(r.to)}\` : \`\${r.label} · \${money(r.value, true)} → \${money(r.to)}\`;
}

// One tooltip: JS gives it the top of the step's box, CSS glides it there
function place(i) {
  clearTimeout(hideTimer);
  const r = rows[i];
  const wasOn = tipEl.classList.contains('is-on');
  if (!wasOn) tipEl.style.transition = 'none'; // from hidden: appear in place, don't fly in
  tipEl.textContent = tipText(r);
  tipEl.style.setProperty('--tx', i * PITCH + W / 2); // plain numbers: CSS multiplies them by --u
  tipEl.style.setProperty('--ty', (1 - Math.max(r.from, r.to) / scaleTop) * H);
  tipEl.className = 'tip is-on is-' + r.kind;
  if (!wasOn) {
    void tipEl.offsetWidth; // apply the new place before the transition comes back
    tipEl.style.transition = '';
  }
  steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
  active = i;
}

// a short grace period, so crossing the gap between two steps does not flicker it
function hide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    tipEl.classList.remove('is-on');
    steps.forEach((s) => s.classList.remove('is-active'));
    active = -1;
  }, 150);
}

const over = (e) => {
  const step = e.target.closest('.step');
  if (step) place(steps.indexOf(step));
};
const leave = (e) => {
  if (!e.relatedTarget?.closest?.('.step')) hide();
};
chart.addEventListener('pointerover', over);
chart.addEventListener('focusin', over);
chart.addEventListener('pointerout', leave);
chart.addEventListener('focusout', leave);
// a finger has no hover: a tap on a step shows its tooltip, a tap elsewhere hides it
document.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  const step = e.target.closest('.step');
  if (step) place(steps.indexOf(step));
  else hide();
});

buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.month)));
show('${MONTHS[0]}');`,
};
