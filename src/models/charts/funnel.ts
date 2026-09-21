import type { Snippet } from '../snippet-utils';
import type { Demo } from '../types';

/*
 * A sales funnel drawn from JSON. JS turns each stage into one number, --v: its value divided by
 * the first stage's (0–1). Each stage is a slab whose front and lid are squashed with
 * scaleX(--v) from the middle and whose right side rides out to the new edge, so switching the
 * dataset is only a transition on transform. One shared tooltip glides from stage to stage.
 */

/** The data, shaped like an API response: one list of stages per channel. */
export const FUNNEL = {
  datasets: {
    Web: [
      { label: 'Visitors', value: 12400 },
      { label: 'Sign-ups', value: 3720 },
      { label: 'Trials', value: 1480 },
      { label: 'Paid', value: 410 },
    ],
    App: [
      { label: 'Visitors', value: 8200 },
      { label: 'Sign-ups', value: 3940 },
      { label: 'Trials', value: 2050 },
      { label: 'Paid', value: 780 },
    ],
  } as Record<string, { label: string; value: number }[]>,
};

type Stage = { label: string; value: number };

// the slab geometry, the same numbers as _funnel.scss ($w, $row, $pad): the tooltip is placed with them
const SLAB_W = 132;
const ROW = 26;
const PAD = 5;

const SETS = Object.keys(FUNNEL.datasets);
/** Dashboard numbers: 12,400. */
const fmt = (n: number): string => n.toLocaleString('en-US');
/** A share as a percent, glued to its number: one decimal below 10% (3.3%), whole above (40%). */
const pct = (x: number): string => `${x < 0.1 ? (x * 100).toFixed(1) : Math.round(x * 100)}%`;
/** A stage's tooltip, and its accessible name: the share is of the stage before it. */
const tip = (rows: Stage[], i: number): string =>
  `${rows[i].label} · ${fmt(rows[i].value)} · ${i ? `${pct(rows[i].value / rows[i - 1].value)} of ${rows[i - 1].label.toLowerCase()}` : '100%'}`;
/** The dock's line: first stage → last stage, and the overall conversion. */
const summary = (rows: Stage[]): string => {
  const a = rows[0];
  const z = rows[rows.length - 1];
  return `${fmt(a.value)} ${a.label.toLowerCase()} → ${fmt(z.value)} ${z.label.toLowerCase()} · ${pct(z.value / a.value)} overall`;
};
/** Where a stage sits on the violet → teal → pink ramp, 0–1. */
const ramp = (i: number, n: number): string => (n > 1 ? i / (n - 1) : 0).toFixed(3);

export const demo: Demo = {
  id: 'funnel',
  title: '3D sales funnel from JSON',
  description:
    'A conversion funnel drawn from JSON: every stage is a glass slab as wide as its share of the first one. Switch the channel and the slabs narrow or widen to the new numbers; point at a stage and one tooltip glides there with its conversion from the stage before. JS only turns the data into one number per stage.',
  category: 'js',
  tags: ['controls', 'hover', 'data', 'chart', 'json'],
  technique: [
    'JSON → --v per stage (value ÷ first stage)',
    'scaleX front + lid, side rides out with translateX',
    'color-mix(in oklch) ramp violet → teal → pink along --t',
    'one shared tooltip, glided with --tx / --ty',
  ],
  fill: true,
  html: (() => {
    const rows = FUNNEL.datasets[SETS[0]];
    const top = rows[0].value;
    return `<div class="d-funnel">
      <div class="d-funnel__view"><div class="d-funnel__chart">${rows
        .map(
          (r, i) =>
            `<div class="d-funnel__row" style="--i:${i};--t:${ramp(i, rows.length)};--v:${(r.value / top).toFixed(3)}" tabindex="0" aria-label="${tip(rows, i)}"><i></i><i></i><i></i><span><strong>${r.label}</strong><em>${fmt(r.value)}</em></span></div>`,
        )
        .join('')}
        <b class="d-funnel__tip" aria-hidden="true"></b>
      </div></div>
      <div class="d-funnel__dock">
        <output>${summary(rows)}</output>
        <div class="d-funnel__seg">${SETS.map(
          (s, i) => `<button type="button" data-set="${s}" aria-pressed="${i === 0}">${s}</button>`,
        ).join('')}</div>
      </div>
    </div>`;
  })(),
  init(scene) {
    const rows = [...scene.querySelectorAll<HTMLElement>('.d-funnel__row')];
    const tipEl = scene.querySelector<HTMLElement>('.d-funnel__tip')!;
    const out = scene.querySelector<HTMLOutputElement>('.d-funnel__dock output')!;
    const seg = scene.querySelector<HTMLElement>('.d-funnel__seg')!;
    const buttons = [...seg.querySelectorAll<HTMLButtonElement>('button')];
    let data = FUNNEL.datasets[SETS[0]];
    let active = -1;
    let hideTimer = 0;

    // One tooltip for the whole chart: it glides from stage to stage and its text changes on the
    // way. JS gives it the stage's place (--tx: the slab's right edge, --ty: the slab's top, the
    // same numbers the CSS uses) and its colour (--t); CSS does the glide.
    const place = (i: number) => {
      clearTimeout(hideTimer);
      const v = data[i].value / data[0].value;
      const wasOn = tipEl.classList.contains('is-on');
      // from hidden it appears in place, not flying in from where it was last
      if (!wasOn) tipEl.style.transition = 'none';
      tipEl.textContent = tip(data, i);
      tipEl.style.setProperty('--t', ramp(i, data.length));
      tipEl.style.setProperty('--tx', `${((1 + v) * SLAB_W) / 2}px`);
      tipEl.style.setProperty('--ty', `${i * ROW + PAD}px`);
      if (!wasOn) {
        void tipEl.offsetWidth; // apply the new place before the transition comes back
        tipEl.style.transition = '';
      }
      tipEl.classList.add('is-on');
      rows.forEach((r, k) => r.classList.toggle('is-active', k === i));
      active = i;
    };
    // a short grace period, so crossing from one row to the next does not flicker it
    const hide = () => {
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        tipEl.classList.remove('is-on');
        rows.forEach((r) => r.classList.remove('is-active'));
        active = -1;
      }, 150);
    };
    const rowOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.d-funnel__row');
    const over = (e: Event) => {
      const row = rowOf(e);
      if (row) place(rows.indexOf(row));
    };
    const leave = (e: Event) => {
      const to = (e as PointerEvent | FocusEvent).relatedTarget as HTMLElement | null;
      if (!to?.closest?.('.d-funnel__row')) hide();
    };
    // a finger has no hover: a tap on a stage shows its tooltip, a tap elsewhere hides it
    const tap = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const row = rowOf(e);
      if (row) place(rows.indexOf(row));
      else hide();
    };

    // JS writes one number per stage (and the texts, as textContent); the motion is CSS
    const pick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (!btn) return;
      data = FUNNEL.datasets[btn.dataset.set!];
      data.forEach((r, i) => {
        const row = rows[i];
        row.style.setProperty('--v', (r.value / data[0].value).toFixed(3));
        row.setAttribute('aria-label', tip(data, i));
        row.querySelector('strong')!.textContent = r.label;
        row.querySelector('em')!.textContent = fmt(r.value);
      });
      out.textContent = summary(data);
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      if (active >= 0) place(active); // the tooltip follows its slab to the new edge
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

// ---- the copy-paste snippet ----

const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const TEXT = '#eceefb';
const SURFACE = '#141830';

/** The JSON as it sits at the top of the snippet: one stage per line. */
const json = JSON.stringify(FUNNEL, null, 2).replace(
  /\{\s+"label": ("[^"]+"),\s+"value": (\d+)\s+\}/g,
  '{ "label": $1, "value": $2 }',
);

export const snippet: Snippet = {
  how: [
    'The data is plain JSON, shaped like an API response. JS turns each stage into <b>one number</b>: <code>--v = value ÷ first stage</code> (0 to 1), written on its row. Everything you see is CSS.',
    'A stage is a slab of three glass faces. The front and the lid are full width and squashed with <code>scaleX(var(--v))</code> from the middle; the right side has a fixed size and rides out to the new edge with <code>translateX(--v × half the width)</code>. Only <code>transform</code> changes, so a new dataset is a smooth transition with no layout work.',
    'The colour comes from where a stage sits, <code>--t</code> from 0 to 1: two nested <code>color-mix(in oklch, …)</code> go violet → teal over the first half and teal → pink over the second, so any number of stages gets a clean ramp (<code>srgb</code> would pass through grey between teal and pink). Mixing with <code>transparent</code> makes the faces glass.',
    'The chart is turned, so part of it lies behind the flat boxes around it and they would catch the pointer. They get <code>pointer-events: none</code>; only the rows take it. A row is the full width of the chart and never moves: the slab inside it is what changes, so pointing never flickers.',
    '<b>One tooltip</b> serves the whole chart. JS writes the pointed-at slab\'s middle and top into <code>--tx</code> / <code>--ty</code> and a <code>transform</code> transition glides it there while the text changes. It floats 40 units towards you so nearer slabs never cover it, and hides 150ms after the pointer leaves every row, so moving between rows never blinks. A finger has no hover, so a tap does the same.',
    "Every length is a multiple of one base unit, <code>--u</code>, and JS writes the tooltip's place as <b>plain numbers</b> in the chart's own units, which CSS multiplies by it. A length written in px from JS would stay the same size while the chart scaled around it, and the tooltip would drift off its slab. The caption and the channel switch are in plain <code>vmin</code>: the control zone is the same object, at the same size, in every model.",
  ],
  html: `<div class="funnel">
  <div class="view">
    <div class="scene">
      <div class="funnel3d"></div>
    </div>
  </div>
  <div class="controls">
    <output class="caption"></output>
    <div class="row">
${SETS.map((s) => `      <button type="button" data-set="${s}">${s}</button>`).join('\n')}
    </div>
  </div>
</div>`,
  css: `.funnel {
  /* one base unit: every length in the chart is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas. The control zone under it is in
     plain vmin, because it is the same object in every model. */
  --u: 0.38vmin;
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
  /* the last stage's label hangs below the chart: more room under it than over it keeps the
     drawing centred in the model box and clear of the caption */
  padding: calc(24 * var(--u)) calc(20 * var(--u)) calc(44 * var(--u));
  pointer-events: none; /* the chart is turned: only the rows take the pointer */
}

/* 132 units for the widest slab, 58 on its right for the labels */
.funnel3d {
  position: relative;
  width: calc(190 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(-22deg) rotateY(-18deg);
}

/* violet → teal over the first half of --t, teal → pink over the second; oklch goes round
   the hue wheel instead of through grey as srgb would */
.stage,
.tip {
  --c: color-mix(in oklch,
    color-mix(in oklch, ${VIOLET}, ${TEAL} clamp(0%, var(--t, 0) * 200%, 100%)),
    ${PINK} clamp(0%, (var(--t, 0) * 2 - 1) * 100%, 100%));
}

/* one row per stage: the hit target, full width, never moves */
.stage {
  --v: 1; /* JS writes it: value ÷ first stage */
  position: relative;
  height: calc(26 * var(--u));
  outline: none;
  transform-style: preserve-3d;
  pointer-events: auto;
  cursor: pointer;
}

.stage > * {
  position: absolute;
  pointer-events: none; /* the moving parts never catch the pointer */
}

/* coloured glass: the colour mixed with transparent, a fine bright edge, a small inner glow */
.stage i {
  /* under one unit shows as a hairline on sharp screens */
  border: calc(0.6 * var(--u)) solid color-mix(in srgb, color-mix(in srgb, var(--c) 80%, #fff) 75%, transparent);
  background: color-mix(in srgb, var(--c) 58%, transparent);
  box-shadow:
    inset 0 0 calc(8 * var(--u)) color-mix(in srgb, var(--c) 30%, transparent),
    0 0 calc(10 * var(--u)) color-mix(in srgb, var(--c) 22%, transparent);
  /* past 1: overshoot and settle; each stage 60ms after the one before */
  transition:
    transform 0.8s cubic-bezier(0.3, 1.3, 0.5, 1) calc(var(--i) * 60ms),
    opacity 0.25s;
}

/* the pointed-at stage fills in and glows: an overlay faded in with opacity */
.stage i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--c) 50%, transparent);
  box-shadow: 0 0 calc(20 * var(--u)) color-mix(in srgb, var(--c) 60%, transparent);
  opacity: 0;
  transition: opacity 0.25s;
}

.stage.is-active i::after {
  opacity: 1;
}

/* but not round the side: that face stands almost edge-on and its glow reaches out towards you
   far enough to cut through the tooltip floating over it, leaving a slash across its text */
.stage i:nth-child(3)::after {
  box-shadow: none;
}

/* and the others step back */
.funnel3d:has(.is-active) .stage:not(.is-active) i {
  opacity: 0.45;
}

/* front: full width, squashed from the middle. It reaches one unit above the lid: on the same spot
   as the lid's (nearly side-on) front edge, the two lines would step over each other as dashes */
.stage i:nth-child(1) {
  top: calc(4 * var(--u));
  left: 0;
  width: calc(132 * var(--u));
  height: calc(17 * var(--u));
  transform: translateZ(calc(14 * var(--u))) scaleX(var(--v));
}

/* the lid: 28 units deep, laid flat on top, squashed the same way */
.stage i:nth-child(2) {
  top: calc(-9 * var(--u));
  left: 0;
  width: calc(132 * var(--u));
  height: calc(28 * var(--u));
  background: color-mix(in srgb, var(--c) 80%, transparent);
  transform: rotateX(90deg) scaleX(var(--v));
}

/* the right side, darker, keeps its size and rides out to the slab's edge */
.stage i:nth-child(3) {
  top: calc(5 * var(--u));
  left: calc(52 * var(--u));
  width: calc(28 * var(--u));
  height: calc(16 * var(--u));
  background: color-mix(in srgb, color-mix(in srgb, var(--c) 55%, #05060c) 64%, transparent);
  transform: translateX(calc(var(--v) * calc(66 * var(--u)))) rotateY(90deg);
}

/* the name and value, following the slab's right edge */
.stage span {
  top: calc(1 * var(--u));
  left: calc(66 * var(--u));
  /* no colour of its own: the names are written on the stage, so they take the stage's ink */
  font: 700 calc(12 * var(--u))/calc(13 * var(--u)) system-ui, sans-serif;
  white-space: nowrap;
  transform: translateX(calc(var(--v) * calc(66 * var(--u)) + calc(12 * var(--u)))) translateZ(calc(14 * var(--u)));
  transition:
    transform 0.8s cubic-bezier(0.3, 1.3, 0.5, 1) calc(var(--i) * 60ms),
    opacity 0.25s;
}

/* while the tooltip is up it says the pointed-at stage's name and value itself, and it floats
   over the names of the stages around it: the names step aside so no two texts overlap */
.funnel3d:has(.is-active) .stage span {
  opacity: 0;
}

.stage strong {
  display: block;
  font-weight: inherit;
}

.stage em {
  display: block;
  /* the stage's ink, softened (by opacity: a colour mixed from currentColor here kept the old
     stage's ink when the stage changed theme) */
  opacity: 0.7;
  font-style: normal;
  font-weight: 600;
}

/* One tooltip for the chart: JS moves it to the pointed-at slab (--tx = its middle,
   --ty = its top, as plain numbers in the chart's own units that CSS multiplies by --u) and the
   transition glides it there. It floats 40 units towards you; its
   thickness is a hard shadow offset up and right, the way the slabs' depth runs on screen. */
.tip {
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
  font: 700 calc(10 * var(--u))/calc(13 * var(--u)) system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate(calc(var(--tx, 0) * var(--u)), calc((var(--ty, 0) - 4) * var(--u))) translate(-50%, -100%) translateZ(calc(40 * var(--u)));
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

.controls button,
.controls label {
  height: 8vmin;
  min-width: 8vmin;
  padding: 0 3vmin;
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
  js: `// The data, as an API would send it back
const FUNNEL = ${json};

const chart = document.querySelector('.funnel3d');
const out = document.querySelector('.funnel output');
const buttons = document.querySelectorAll('.controls .row button');
const W = 132, ROW = 26, PAD = 5; // the slab width, row height and slab top, in the chart's own units (as in the CSS)

const fmt = (n) => n.toLocaleString('en-US'); // 12,400
// one decimal below 10% (3.3%), whole numbers above (40%)
const pct = (x) => (x < 0.1 ? (x * 100).toFixed(1) : Math.round(x * 100)) + '%';

// Build the chart once: a row per stage, each with three faces and a label, plus ONE tooltip.
// --t is the stage's place on the colour ramp (0 = first, 1 = last).
const first = Object.values(FUNNEL.datasets)[0];
chart.innerHTML =
  first.map((_, i) => \`<div class="stage" style="--i:\${i};--t:\${i / (first.length - 1)}" tabindex="0"><i></i><i></i><i></i><span><strong></strong><em></em></span></div>\`).join('') +
  '<b class="tip" aria-hidden="true"></b>';
const rows = [...chart.querySelectorAll('.stage')];
const tipEl = chart.querySelector('.tip');
let data = first;
let active = -1;
let hideTimer = 0;

const tipText = (i) => {
  const r = data[i], prev = data[i - 1];
  return \`\${r.label} · \${fmt(r.value)} · \${prev ? pct(r.value / prev.value) + ' of ' + prev.label.toLowerCase() : '100%'}\`;
};

// Move the one tooltip to stage i: JS writes the slab's middle and top, CSS glides it there.
function place(i) {
  clearTimeout(hideTimer);
  const wasOn = tipEl.classList.contains('is-on');
  if (!wasOn) tipEl.style.transition = 'none'; // from hidden: appear in place, no fly-in
  tipEl.textContent = tipText(i); // text, never HTML: data from an API is not trusted markup
  tipEl.style.setProperty('--t', i / (data.length - 1));
  tipEl.style.setProperty('--tx', W / 2); // plain numbers: CSS multiplies them by --u
  tipEl.style.setProperty('--ty', i * ROW + PAD);
  if (!wasOn) {
    void tipEl.offsetWidth; // apply the new place before the transition comes back
    tipEl.style.transition = '';
  }
  tipEl.classList.add('is-on');
  rows.forEach((r, k) => r.classList.toggle('is-active', k === i));
  active = i;
}

// hide after a short grace period, so moving from one row to the next never blinks
function hide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    tipEl.classList.remove('is-on');
    rows.forEach((r) => r.classList.remove('is-active'));
    active = -1;
  }, 150);
}

const rowOf = (e) => e.target.closest('.stage');
const over = (e) => rowOf(e) && place(rows.indexOf(rowOf(e)));
const leave = (e) => { if (!e.relatedTarget?.closest?.('.stage')) hide(); };
chart.addEventListener('pointerover', over);
chart.addEventListener('focusin', over);
chart.addEventListener('pointerout', leave);
chart.addEventListener('focusout', leave);
// a finger has no hover: a tap on a stage shows its tooltip, a tap elsewhere hides it
document.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  if (rowOf(e)) place(rows.indexOf(rowOf(e)));
  else hide();
});

// Show one dataset: each row gets --v, its value as a fraction of the first stage. CSS does the rest.
// Names and numbers go in with textContent, never as HTML.
function show(name) {
  data = FUNNEL.datasets[name];
  data.forEach((r, i) => {
    rows[i].style.setProperty('--v', r.value / data[0].value);
    rows[i].setAttribute('aria-label', tipText(i));
    rows[i].querySelector('strong').textContent = r.label;
    rows[i].querySelector('em').textContent = fmt(r.value);
  });
  const a = data[0];
  const z = data[data.length - 1];
  out.textContent = \`\${fmt(a.value)} \${a.label.toLowerCase()} → \${fmt(z.value)} \${z.label.toLowerCase()} · \${pct(z.value / a.value)} overall\`;
  buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.set === name));
  if (active >= 0) place(active); // the tooltip follows its slab to the new edge
}

buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.set)));

show('${SETS[0]}');`,
};
