import { niceMax } from '../chart-data';
import type { Snippet } from '../snippet-utils';
import type { Demo } from '../types';

/*
 * stackbars: quarterly revenue split by product, one stacked column per quarter. JS turns the JSON
 * into two numbers per segment, --base (where it starts) and --v (how tall it is), both fractions of
 * the scale; CSS draws the glass cuboids and moves them with transform only. The same REVENUE const
 * feeds the site model and is printed into the snippet, so the two always show the same numbers.
 */

/** Revenue per quarter and product, in thousands of dollars (shown as $38k), shaped like an API response. */
const REVENUE = {
  prefix: '$',
  suffix: 'k',
  quarters: ['Q1', 'Q2', 'Q3', 'Q4'],
  products: [
    { name: 'Pro', values: [42, 48, 55, 63] },
    { name: 'Team', values: [30, 38, 41, 50] },
    { name: 'Starter', values: [18, 22, 20, 27] },
  ],
};

const { quarters: QUARTERS, products: PRODUCTS } = REVENUE;
// the wall's lines sit at these fractions of the scale
const TICKS = [0, 0.5, 1];
// the column geometry, the same numbers as _stackbars.scss ($w, $gap, $h): the tooltip is placed with them
const COL_W = 24;
const COL_PITCH = 24 + 16;
const COL_H = 100;

/** A value as money: the sign in front, the k right after the number ($38k). */
const money = (v: number): string => `${REVENUE.prefix}${v}${REVENUE.suffix}`;
/** A segment's tooltip, and its accessible name. */
const tip = (q: number, p: number): string => `${QUARTERS[q]} · ${PRODUCTS[p].name} · ${money(PRODUCTS[p].values[q])}`;

/** Escape text from the data before it goes into an HTML template. */
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

interface Seg {
  base: number;
  v: number;
  top: boolean;
}

/**
 * The chart for a set of switched-on products: the scale's top (the tallest column rounded up to a
 * tidy step), and per quarter and product where its segment starts and how tall it is (0–1).
 */
const layout = (on: boolean[]) => {
  const totals = QUARTERS.map((_, q) => PRODUCTS.reduce((s, p, k) => s + (on[k] ? p.values[q] : 0), 0));
  const most = Math.max(...totals);
  const top = Math.max(20, niceMax(most));
  const segs: Seg[][] = QUARTERS.map((_, q) => {
    let base = 0;
    const col = PRODUCTS.map((p, k) => {
      const v = on[k] ? p.values[q] / top : 0;
      const s = { base, v, top: false };
      base += v;
      return s;
    });
    const last = col.map((s) => s.v > 0).lastIndexOf(true);
    if (last >= 0) col[last].top = true; // only the highest segment shows its lid
    return col;
  });
  const names = PRODUCTS.filter((_, k) => on[k]).map((p) => p.name);
  const sum = totals.reduce((a, b) => a + b, 0);
  const best = totals.indexOf(most);
  const summary = !names.length
    ? 'No product shown · switch one on'
    : `${names.length === PRODUCTS.length ? 'All products' : names.join(' + ')} · ${money(sum)} · best ${QUARTERS[best]}, ${money(most)}`;
  return { top, segs, summary };
};

const f = (n: number): string => n.toFixed(4);
const ALL_ON = PRODUCTS.map(() => true);

export const demo: Demo = {
  id: 'stackbars',
  title: 'Stacked 3D bars from JSON',
  description:
    'Quarterly revenue split by product, each quarter a column of stacked glass cuboids. The legend is a row of toggles: switch a product off and its segments shrink to nothing while the ones above slide down. JS only writes where each segment starts and how tall it is.',
  category: 'js',
  tags: ['controls', 'hover', 'data', 'chart', 'json', 'stacked'],
  technique: [
    'JSON → --base + --v per segment (fractions of the scale)',
    'translateY(--base) then scaleY(--v): stacking with transform only',
    'one shared tooltip gliding on --tx / --ty',
    'tooltip on a twin 3D layer over the chart',
    'legend = <button aria-pressed> toggles',
  ],
  fill: true,
  html: (() => {
    const { top, segs, summary } = layout(ALL_ON);
    return `<div class="d-stackbars">
      <div class="d-stackbars__view"><div class="d-stackbars__chart">
        <div class="d-stackbars__floor"></div>
        <div class="d-stackbars__wall">${TICKS.map((t) => `<b style="--t:${t}"><span>${Math.round(t * top)}</span></b>`).join('')}</div>
        <div class="d-stackbars__cols">${QUARTERS.map(
          (q, i) =>
            `<div class="d-stackbars__col" style="--i:${i}">${PRODUCTS.map((_, k) => {
              const s = segs[i][k];
              return `<div class="d-stackbars__seg${s.top ? ' is-top' : ''}" data-p="${k}" style="--base:${f(s.base)};--v:${f(s.v)}"><i role="img" tabindex="0" aria-label="${esc(tip(i, k))}"></i><i></i><i></i></div>`;
            }).join('')}<span>${esc(q)}</span></div>`,
        ).join('')}</div>
        <b class="d-stackbars__tip" data-p="0" aria-hidden="true"></b>
      </div></div>
      <div class="d-stackbars__dock">
        <output>${esc(summary)}</output>
        <div class="d-stackbars__legend">${PRODUCTS.map(
          (p, k) => `<button type="button" data-p="${k}" aria-pressed="true">${esc(p.name)}</button>`,
        ).join('')}</div>
      </div>
    </div>`;
  })(),
  init(scene) {
    const cols = [...scene.querySelectorAll<HTMLElement>('.d-stackbars__col')];
    const segs = cols.map((c) => [...c.querySelectorAll<HTMLElement>('.d-stackbars__seg')]);
    const all = segs.flat();
    const ticks = [...scene.querySelectorAll<HTMLElement>('.d-stackbars__wall span')];
    const tipEl = scene.querySelector<HTMLElement>('.d-stackbars__tip')!;
    const out = scene.querySelector<HTMLOutputElement>('.d-stackbars__dock output')!;
    const legend = scene.querySelector<HTMLElement>('.d-stackbars__legend')!;
    const buttons = [...legend.querySelectorAll<HTMLButtonElement>('button')];
    const on = [...ALL_ON];
    let shown = layout(on);
    let active: [number, number] | null = null; // [quarter, product] the tooltip is on
    let hideTimer = 0;

    // One tooltip for the whole chart: it glides from segment to segment and its text changes on
    // the way. JS gives it the segment's place (--tx, --ty, the same numbers the CSS uses) and CSS
    // does the glide.
    const place = (q: number, p: number) => {
      clearTimeout(hideTimer);
      const s = shown.segs[q][p];
      const wasOn = tipEl.classList.contains('is-on');
      // from hidden it appears in place, not flying in from where it was last
      if (!wasOn) tipEl.style.transition = 'none';
      tipEl.textContent = tip(q, p);
      tipEl.dataset.p = String(p);
      tipEl.style.setProperty('--tx', `${q * COL_PITCH + COL_W / 2}px`);
      tipEl.style.setProperty('--ty', `${(1 - s.base - s.v) * COL_H}px`);
      if (!wasOn) {
        void tipEl.offsetWidth; // apply the new place before the transition comes back
        tipEl.style.transition = '';
      }
      tipEl.classList.add('is-on');
      all.forEach((el) => el.classList.toggle('is-active', el === segs[q][p]));
      active = [q, p];
    };
    const hideNow = () => {
      clearTimeout(hideTimer);
      tipEl.classList.remove('is-on');
      all.forEach((el) => el.classList.remove('is-active'));
      active = null;
    };
    // a short grace period, so crossing the gap between two segments does not flicker it
    const hide = () => {
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hideNow, 150);
    };
    const segOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.d-stackbars__seg');
    const where = (el: HTMLElement): [number, number] => [cols.indexOf(el.parentElement!), Number(el.dataset.p)];
    const over = (e: Event) => {
      const seg = segOf(e);
      if (seg && !seg.classList.contains('is-off')) place(...where(seg));
    };
    const leave = (e: Event) => {
      const to = (e as PointerEvent | FocusEvent).relatedTarget as HTMLElement | null;
      if (!to?.closest?.('.d-stackbars__seg')) hide();
    };
    // a finger has no hover: a tap on a segment shows its tooltip, a tap elsewhere hides it
    const tap = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const seg = segOf(e);
      if (seg && !seg.classList.contains('is-off')) place(...where(seg));
      else hide();
    };

    // JS writes two numbers per segment; the shrinking, the sliding and the stagger are CSS
    const toggle = (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!btn) return;
      const k = Number(btn.dataset.p);
      on[k] = !on[k];
      shown = layout(on);
      shown.segs.forEach((col, q) =>
        col.forEach((s, p) => {
          const el = segs[q][p];
          const front = el.firstElementChild as HTMLElement;
          el.style.setProperty('--base', f(s.base));
          el.style.setProperty('--v', f(s.v));
          el.classList.toggle('is-top', s.top);
          el.classList.toggle('is-off', !on[p]);
          // a switched-off segment is gone: out of the tab order and the accessibility tree
          front.tabIndex = on[p] ? 0 : -1;
          front.toggleAttribute('aria-hidden', !on[p]);
        }),
      );
      ticks.forEach((t, n) => (t.textContent = String(Math.round(TICKS[n] * shown.top))));
      out.textContent = shown.summary;
      buttons.forEach((b, n) => b.setAttribute('aria-pressed', String(on[n])));
      // the tooltip follows its segment to its new place, or goes if the segment did
      if (active) {
        if (on[active[1]]) place(...active);
        else hideNow();
      }
    };

    const events: [string, EventListener][] = [
      ['pointerover', over],
      ['focusin', over],
      ['pointerout', leave],
      ['focusout', leave],
      ['pointerup', tap as EventListener],
    ];
    events.forEach(([type, fn]) => scene.addEventListener(type, fn));
    legend.addEventListener('click', toggle);
    return () => {
      clearTimeout(hideTimer);
      events.forEach(([type, fn]) => scene.removeEventListener(type, fn));
      legend.removeEventListener('click', toggle);
    };
  },
};

/* ---------------------------------------------------------------- the copy-paste snippet */

const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const TEXT = '#eceefb';
const MUTED = '#949bc0';
const SURFACE = '#141830';

/** The data as it would arrive from an API; the arrays of numbers on one line. */
const json = JSON.stringify(REVENUE, null, 2).replace(
  /\[\s+([^[\]{}]+?)\s+\]/g,
  (_, inner: string) => `[${inner.replace(/\s+/g, ' ')}]`,
);

export const snippet: Snippet = {
  how: [
    "The data is plain JSON: quarters, and per product one value per quarter. JS turns each value into <b>two numbers</b>, both fractions of the scale's top: <code>--base</code>, the sum of the segments below it, and <code>--v</code>, its own height.",
    'A segment is a full-height front and side squashed from the bottom: <code>translateY(--base × −100 units) … scaleY(--v)</code>. The move comes first, so it is not squashed. Only <code>transform</code> changes, so a new layout is a transition with no layout work.',
    'Switch a product off and JS sets its <code>--v</code> to 0 and recomputes every <code>--base</code> above it. Collapse and slide use the <b>same duration and easing</b>, so the stack stays glued while it moves (an easing that overshoots would turn a shrinking face inside out, so this one does not). Only the highest segment (<code>.is-top</code>) shows its lid.',
    'The faces are see-through glass: the colour mixed with <code>transparent</code>, a hairline edge and a soft glow. The pointed-at segment fills in and glows: a <code>::after</code> layer on each face whose <code>opacity</code> fades in.',
    'The chart is turned, so parts of it sit behind the flat boxes around it: <code>pointer-events: none</code> on everything, <code>auto</code> only on the faces.',
    "The tooltip is not in the chart's 3D context. Inside it, the browser splits every plane against the columns' faces, and slivers of the neighbouring bar showed through across its text. It sits in a second layer with the chart's own box and turn, laid over it: the same place, painted after the chart, so no bar can cross it.",
    "There is <b>one</b> tooltip for the whole chart. JS moves it to the pointed-at segment with <code>--tx</code> / <code>--ty</code> and a <code>transition</code> glides it there while its text changes; it hides 150ms after the pointer leaves, so crossing a gap doesn't flicker. A tap does the same on a touch screen. Names go in with <code>textContent</code>, never as HTML.",
    "Every length is a multiple of one base unit, <code>--u</code>, and JS writes the tooltip's place as <b>plain numbers</b> in the chart's own units, which CSS multiplies by it. A length written in px from JS would stay the same size while the chart scaled around it, and the tooltip would drift off its segment. The caption and the legend are in plain <code>vmin</code>: the control zone is the same object, at the same size, in every model.",
  ],
  html: `<div class="chart">
  <div class="view">
    <div class="scene">
      <div class="stack3d"></div>
      <div class="float"><b class="tip" data-p="0" aria-hidden="true"></b></div>
    </div>
  </div>
  <div class="controls">
    <output class="caption"></output>
    <div class="row legend"></div>
  </div>
</div>`,
  css: `.chart {
  /* one base unit: every length in the chart is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas. The control zone under it is in
     plain vmin, because it is the same object in every model. */
  --u: 0.33vmin;
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
  position: relative; /* the tooltip's layer is laid over the chart */
  perspective: calc(800 * var(--u));
  /* the floor and the quarter labels hang below the columns: more room under them than over
     them keeps the drawing centred in the model box and clear of the caption */
  padding: calc(22 * var(--u)) calc(40 * var(--u)) calc(50 * var(--u));
  pointer-events: none; /* the chart is turned: only the faces take the pointer */
}

/* 4 columns × 24 + 3 gaps × 16 = 144 units */
.stack3d {
  position: relative;
  width: calc(144 * var(--u));
  height: calc(100 * var(--u)); /* the top of the scale */
  transform-style: preserve-3d;
  transform: rotateX(-18deg) rotateY(-28deg);
}

/* the floor: a grid laid flat along the bottom of the columns */
.floor {
  position: absolute;
  left: calc(-12 * var(--u));
  top: calc(74 * var(--u));
  width: calc(168 * var(--u));
  height: calc(52 * var(--u));
  border: calc(1 * var(--u)) solid rgb(139 108 255 / 0.45);
  border-radius: calc(6 * var(--u));
  background:
    repeating-linear-gradient(90deg, rgb(139 108 255 / 0.22) 0 calc(1 * var(--u)), transparent calc(1 * var(--u)) calc(14 * var(--u))),
    repeating-linear-gradient(rgb(139 108 255 / 0.22) 0 calc(1 * var(--u)), transparent calc(1 * var(--u)) calc(13 * var(--u))),
    rgb(139 108 255 / 0.08);
  transform: rotateX(90deg);
}

/* the scale: lines at 0, half and the top, along the back of the floor; the numbers at the
   right end, which reaches out past the last column */
.wall {
  position: absolute;
  top: calc(-12 * var(--u)); /* the box holds the numbers too: text spilling out of a 3D layer gets cut */
  left: calc(-12 * var(--u));
  width: calc(194 * var(--u));
  height: calc(112 * var(--u));
  transform: translateZ(calc(-26 * var(--u)));
}

.wall b {
  position: absolute;
  right: calc(26 * var(--u));
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

.cols {
  position: absolute;
  inset: 0;
  display: flex;
  gap: calc(16 * var(--u));
  transform-style: preserve-3d;
}

.col {
  position: relative;
  flex: none;
  width: calc(24 * var(--u));
  height: 100%;
  transform-style: preserve-3d;
}

/* the quarter, standing in front of the column */
.col span {
  position: absolute;
  top: calc(100% + calc(8 * var(--u)));
  left: calc(-6 * var(--u));
  width: calc(36 * var(--u));
  color: ${MUTED};
  font: 700 calc(12 * var(--u))/calc(14 * var(--u)) system-ui, sans-serif;
  text-align: center;
  transform: translateZ(calc(12 * var(--u)));
}

/* one colour per product */
[data-p='0'] { --c: ${VIOLET}; }
[data-p='1'] { --c: ${TEAL}; }
[data-p='2'] { --c: ${PINK}; }

/* A segment only groups its three faces and carries --base / --v: it draws no box itself */
.seg {
  --base: 0; /* JS writes both: fractions of the scale */
  --v: 0;
  display: contents;
}

/* see-through glass faces with a fine bright edge */
.seg i {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  width: calc(24 * var(--u));
  height: 100%;
  border: calc(0.6 * var(--u)) solid color-mix(in srgb, color-mix(in srgb, var(--c) 80%, #fff) 75%, transparent);
  background: color-mix(in srgb, var(--c) 58%, transparent);
  box-shadow:
    inset 0 0 calc(8 * var(--u)) color-mix(in srgb, var(--c) 30%, transparent),
    0 0 calc(10 * var(--u)) color-mix(in srgb, var(--c) 22%, transparent);
  outline: none;
  pointer-events: auto;
  cursor: pointer;
  transform-origin: bottom center;
  /* each column 50ms after the one before; no overshoot, so a face never turns inside out */
  transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * 50ms), opacity 0.25s;
}

/* the pointed-at segment fills in and glows: a layer on each face that fades in */
.seg i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--c) 50%, transparent);
  box-shadow: 0 0 calc(20 * var(--u)) color-mix(in srgb, var(--c) 60%, transparent);
  opacity: 0;
  transition: opacity 0.25s;
}

.seg.is-active i::after {
  opacity: 1;
}

/* front: lift by the segments below, step out to the front, then squash to its value */
.seg i:nth-child(1) {
  transform: translateY(calc(var(--base) * calc(-100 * var(--u)))) translateZ(calc(12 * var(--u))) scaleY(var(--v));
}

/* right side, darker */
.seg i:nth-child(2) {
  background: color-mix(in srgb, color-mix(in srgb, var(--c) 55%, #05060c) 64%, transparent);
  transform: translateY(calc(var(--base) * calc(-100 * var(--u)))) rotateY(90deg) translateZ(calc(12 * var(--u))) scaleY(var(--v));
}

/* the lid: a 24-unit square laid flat on the segment's top. Only the highest segment shows it */
.seg i:nth-child(3) {
  height: calc(24 * var(--u));
  background: color-mix(in srgb, var(--c) 80%, transparent);
  opacity: 0;
  pointer-events: none;
  transform-origin: center;
  transform: translateY(calc((1 - var(--base) - var(--v)) * calc(100 * var(--u)))) rotateX(90deg) translateZ(calc(12 * var(--u)));
}

.seg.is-top i:nth-child(3) {
  opacity: 1;
  pointer-events: auto;
}

.seg.is-off i {
  pointer-events: none; /* collapsed: nothing to point at */
}

/* The tooltip's own layer: the chart's box and turn again, laid exactly over it. It is a second
   3D context, painted after the chart, so no face of a column can ever cross the tooltip. In the
   chart's own context, the faces' planes split it, and slivers of the bar beside it showed
   through across the text */
.float {
  position: absolute;
  top: calc(22 * var(--u)); /* the scene's padding: the same box as .stack3d */
  left: calc(40 * var(--u));
  width: calc(144 * var(--u));
  height: calc(100 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(-18deg) rotateY(-28deg);
}

/* One tooltip for the whole chart: JS moves it to the pointed-at segment (--tx, --ty) and it
   glides there. It floats 40 units towards you (the columns to the right stand nearer); its
   thickness is a flat edge offset up and to the right, the way the columns' depth runs */
/* JS writes --tx / --ty as plain numbers in the chart's own units, and CSS multiplies them by
   --u: a length written in px from JS would stay put while the chart scaled around it */
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
  font: 700 calc(12 * var(--u))/calc(14 * var(--u)) system-ui, sans-serif;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate(calc(var(--tx, 0) * var(--u)), calc((var(--ty, 0) - 30) * var(--u))) translate(-50%, -100%) translateZ(calc(40 * var(--u)));
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

/* the legend is the switches: one real button per product, in the product's colour when on.
   Its word stays the stage's ink, on a tint light enough to keep it readable on both stages */
.controls button {
  display: inline-flex;
  align-items: center;
  gap: 1.5vmin;
}

.legend button[aria-pressed='true'] {
  background: color-mix(in srgb, var(--c) 22%, transparent);
  box-shadow: inset 0 0 0 0.3vmin color-mix(in srgb, var(--c) 60%, transparent);
  color: inherit;
}

/* the swatch: filled when on, a hollow ring when off */
.legend button::before {
  content: '';
  width: 2.6vmin;
  height: 2.6vmin;
  border-radius: 50%;
  background: var(--c);
  box-shadow: inset 0 0 0 0.5vmin var(--c);
}

/* off: the block's plain pill, a little faded */
.legend button[aria-pressed='false'] {
  opacity: 0.75;
}

.legend button[aria-pressed='false']::before {
  background: transparent;
}`,
  js: `// The data, as an API would send it back
const REVENUE = ${json};

const { quarters, products } = REVENUE;
const chart = document.querySelector('.stack3d');
const out = document.querySelector('.chart output');
const legend = document.querySelector('.legend');
const TICKS = [0, 0.5, 1]; // the scale's lines, as fractions of its top
const W = 24, PITCH = 40, H = 100; // a column's width, width + gap, and the scale's height, in the chart's own units (as in the CSS)
const on = products.map(() => true); // which products are shown

// money as most dashboards write it: the sign in front, the k right after the number ($38k)
const money = (v) => REVENUE.prefix + v + REVENUE.suffix;
const tipText = (q, p) => \`\${quarters[q]} · \${products[p].name} · \${money(products[p].values[q])}\`;

// Build the chart once: the floor, the scale, per quarter a column with one segment (front, side,
// lid) per product. The tooltip is in the HTML, on a layer of its own over the chart
chart.innerHTML =
  '<div class="floor"></div>' +
  '<div class="wall">' + TICKS.map((t) => \`<b style="--t:\${t}"><span></span></b>\`).join('') + '</div>' +
  '<div class="cols">' +
  quarters.map((_, q) => \`<div class="col" style="--i:\${q}">\` +
    products.map((_, p) => \`<div class="seg" data-p="\${p}"><i role="img" tabindex="0"></i><i></i><i></i></div>\`).join('') +
    '<span></span></div>').join('') +
  '</div>';
legend.innerHTML = products.map((_, p) => \`<button type="button" data-p="\${p}"></button>\`).join('');

const cols = [...chart.querySelectorAll('.col')];
const segs = cols.map((c) => [...c.querySelectorAll('.seg')]);
const ticks = chart.querySelectorAll('.wall span');
const tipEl = document.querySelector('.tip');
const buttons = [...legend.querySelectorAll('button')];

// names and labels go in as text, never as HTML: data from an API is not trusted markup
cols.forEach((c, q) => (c.querySelector('span').textContent = quarters[q]));
buttons.forEach((b, p) => (b.textContent = products[p].name));
segs.forEach((col, q) => col.forEach((s, p) => s.firstElementChild.setAttribute('aria-label', tipText(q, p))));

let active = null; // [quarter, product] the tooltip is on
let hideTimer;

// Lay out the shown products: each segment gets --base (the sum below it) and --v (its value),
// both as fractions of the scale's top. CSS does the rest.
function render() {
  const totals = quarters.map((_, q) => products.reduce((s, p, k) => s + (on[k] ? p.values[q] : 0), 0));
  const most = Math.max(...totals);
  const top = Math.max(20, Math.ceil(most / 20) * 20); // a tidy top for the scale
  segs.forEach((col, q) => {
    let base = 0;
    let highest = null;
    col.forEach((s, p) => {
      const v = on[p] ? products[p].values[q] / top : 0;
      s.style.setProperty('--base', base);
      s.style.setProperty('--v', v);
      s.classList.remove('is-top');
      s.classList.toggle('is-off', !on[p]);
      s.firstElementChild.tabIndex = on[p] ? 0 : -1; // a switched-off segment leaves the tab order
      s.firstElementChild.toggleAttribute('aria-hidden', !on[p]);
      if (v > 0) highest = s;
      base += v;
    });
    if (highest) highest.classList.add('is-top'); // only the highest segment shows its lid
  });
  ticks.forEach((t, k) => (t.textContent = Math.round(TICKS[k] * top)));
  const names = products.filter((_, k) => on[k]).map((p) => p.name);
  const sum = totals.reduce((a, b) => a + b, 0);
  const best = quarters[totals.indexOf(most)];
  out.textContent = !names.length
    ? 'No product shown · switch one on'
    : \`\${names.length === products.length ? 'All products' : names.join(' + ')} · \${money(sum)} · best \${best}, \${money(most)}\`;
  buttons.forEach((b, k) => b.setAttribute('aria-pressed', on[k]));
  // the tooltip follows its segment to its new place, or goes if the segment did
  if (active) on[active[1]] ? place(...active) : hideNow();
}

// One tooltip for the chart: it glides to the segment (--tx, --ty) and its text changes on the way
function place(q, p) {
  clearTimeout(hideTimer);
  const seg = segs[q][p];
  const wasOn = tipEl.classList.contains('is-on');
  if (!wasOn) tipEl.style.transition = 'none'; // from hidden: appear in place, don't fly in
  tipEl.textContent = tipText(q, p);
  tipEl.dataset.p = p; // its colour
  const topOf = parseFloat(seg.style.getPropertyValue('--base')) + parseFloat(seg.style.getPropertyValue('--v'));
  tipEl.style.setProperty('--tx', q * PITCH + W / 2); // plain numbers: CSS multiplies them by --u
  tipEl.style.setProperty('--ty', (1 - topOf) * H);
  if (!wasOn) {
    void tipEl.offsetWidth; // apply the new place before the transition comes back
    tipEl.style.transition = '';
  }
  tipEl.classList.add('is-on');
  segs.flat().forEach((s) => s.classList.toggle('is-active', s === seg)); // it fills in and glows
  active = [q, p];
}
function hideNow() {
  clearTimeout(hideTimer);
  tipEl.classList.remove('is-on');
  segs.flat().forEach((s) => s.classList.remove('is-active'));
  active = null;
}
// a short grace period, so crossing the gap between two segments does not flicker it
function hide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideNow, 150);
}

const segOf = (e) => {
  const s = e.target.closest?.('.seg');
  return s && !s.classList.contains('is-off') ? s : null;
};
const pointAt = (s) => place(cols.indexOf(s.parentElement), +s.dataset.p);
chart.addEventListener('pointerover', (e) => segOf(e) && pointAt(segOf(e)));
chart.addEventListener('focusin', (e) => segOf(e) && pointAt(segOf(e)));
const leave = (e) => {
  if (!e.relatedTarget?.closest?.('.seg')) hide();
};
chart.addEventListener('pointerout', leave);
chart.addEventListener('focusout', leave);
// a finger has no hover: a tap on a segment shows its tooltip, a tap elsewhere hides it
document.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  const s = segOf(e);
  if (s) pointAt(s);
  else hide();
});

// the legend is the switches
legend.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  on[b.dataset.p] = !on[b.dataset.p];
  render();
});

render();`,
};
