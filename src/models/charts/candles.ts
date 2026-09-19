import type { Snippet } from '../snippet-utils';
import type { Demo } from '../types';

/*
 * candles: a 3D candlestick chart drawn from JSON. JS turns each day's prices into four fractions
 * of the visible price range (--lo, --hi, --o, --c) and CSS draws every part from them with
 * scaleY + translateY, so a new range is only a transition on transform.
 */

/** Daily OHLC prices, shaped like a market API's response. The site model and the snippet both use it. */
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

type Day = (typeof CANDLES)[number];

/** The range switch: how many of the latest days are shown. The last one is the default. */
const RANGES = [7, 12];
/** The price scale is rounded out to whole steps of this, so its numbers stay tidy. */
const STEP = 1000;
/** The chart's size in px: the same numbers as $w and $h in _candles.scss. */
const CHART_W = 180;
const CHART_H = 100;

/** Prices the way trading apps write them. */
const usd = (v: number): string => `$${v.toLocaleString('en-US')}`;
/** The scale's short form: $58.5k. */
const usdK = (v: number): string => `$${(v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k`;
/** A change with its sign in front, and a real minus. */
const pct = (v: number): string => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(1)}%`;
/** A candle's tooltip, and its accessible name. */
const tip = (d: Day): string =>
  `${d.date} · O ${usd(d.open)} H ${usd(d.high)} L ${usd(d.low)} C ${usd(d.close)}`;

/** Everything the chart needs to show the last `n` days. */
const view = (n: number) => {
  const offset = CANDLES.length - n;
  const days = CANDLES.slice(offset);
  const low = Math.min(...days.map((d) => d.low));
  const high = Math.max(...days.map((d) => d.high));
  const min = Math.floor(low / STEP) * STEP;
  const max = Math.ceil(high / STEP) * STEP;
  /** A price as a fraction of the scale: 0 at the bottom, 1 at the top. */
  const f = (p: number): number => (p - min) / (max - min);
  const change = ((days[n - 1].close - days[0].open) / days[0].open) * 100;
  return {
    n,
    offset,
    ticks: [min, (min + max) / 2, max].map(usdK),
    first: days[0].date,
    last: days[n - 1].date,
    summary: `${n} days · ${pct(change)} · high ${usd(high)}`,
    /** Where the tooltip goes for candle i: its middle, its high (px), and how far it hangs left. */
    tipAt: (i: number) => {
      const x = i - offset;
      return {
        tx: `${(((x + 0.5) * CHART_W) / n).toFixed(1)}px`,
        ty: `${((1 - f(CANDLES[i].high)) * CHART_H).toFixed(1)}px`,
        f: (x / (n - 1)).toFixed(3),
      };
    },
    /** The custom properties of candle i (of all of CANDLES). A day outside the range keeps its
     * prices and only sinks (--in: 0) at the left edge. */
    props: (i: number): Record<string, string> => {
      const x = i - offset;
      if (x < 0) return { '--x': '-1', '--in': '0' };
      const d = CANDLES[i];
      return {
        '--x': String(x),
        '--in': '1',
        '--lo': f(d.low).toFixed(3),
        '--hi': f(d.high).toFixed(3),
        '--o': f(d.open).toFixed(3),
        '--c': f(d.close).toFixed(3),
      };
    },
  };
};

const TICK_AT = [0, 0.5, 1];
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
  fill: true,
  html: (() => {
    const v = view(START);
    const style = (i: number) =>
      Object.entries({ '--i': String(i), ...v.props(i) })
        .map(([k, val]) => `${k}:${val}`)
        .join(';');
    return `<div class="d-candles">
      <div class="d-candles__chart" style="--n:${START}">
        <div class="d-candles__floor"></div>
        <div class="d-candles__wall">${TICK_AT.map((t, k) => `<span style="--t:${t}">${v.ticks[k]}</span>`).join('')}</div>
        <span class="d-candles__date">${v.first}</span><span class="d-candles__date">${v.last}</span>
        ${CANDLES.map(
          (d, i) =>
            `<div class="d-candles__candle${d.close < d.open ? ' is-down' : ''}${i < v.offset ? ' is-out' : ''}" style="${style(i)}" tabindex="${i < v.offset ? -1 : 0}" aria-label="${tip(d)}"><i class="d-candles__wick"></i><i class="d-candles__body"></i></div>`,
        ).join('')}
        <b class="d-candles__tip" aria-hidden="true"></b>
      </div>
      <div class="d-candles__dock">
        <output>${v.summary}</output>
        <div class="d-candles__seg">${RANGES.map(
          (n) => `<button type="button" data-days="${n}" aria-pressed="${n === START}">${n}D</button>`,
        ).join('')}</div>
      </div>
    </div>`;
  })(),
  init(scene) {
    const chart = scene.querySelector<HTMLElement>('.d-candles__chart')!;
    const candles = [...scene.querySelectorAll<HTMLElement>('.d-candles__candle')];
    const ticks = [...scene.querySelectorAll<HTMLElement>('.d-candles__wall span')];
    const dates = [...scene.querySelectorAll<HTMLElement>('.d-candles__date')];
    const tipEl = scene.querySelector<HTMLElement>('.d-candles__tip')!;
    const out = scene.querySelector<HTMLOutputElement>('.d-candles__dock output')!;
    const seg = scene.querySelector<HTMLElement>('.d-candles__seg')!;
    const buttons = [...seg.querySelectorAll<HTMLButtonElement>('button')];
    let shown = view(START);
    let active = -1;
    let hideTimer = 0;

    // One tooltip for the whole chart: it glides from candle to candle and its text changes on
    // the way. JS gives it the candle's place (--tx, --ty) and CSS does the glide.
    const place = (i: number) => {
      clearTimeout(hideTimer);
      const at = shown.tipAt(i);
      const wasOn = tipEl.classList.contains('is-on');
      // from hidden it appears in place, not flying in from where it was last
      if (!wasOn) tipEl.style.transition = 'none';
      tipEl.textContent = tip(CANDLES[i]);
      tipEl.style.setProperty('--tx', at.tx);
      tipEl.style.setProperty('--ty', at.ty);
      tipEl.style.setProperty('--f', at.f);
      tipEl.classList.toggle('is-down', CANDLES[i].close < CANDLES[i].open);
      if (!wasOn) {
        void tipEl.offsetWidth; // apply the new place before the transition comes back
        tipEl.style.transition = '';
      }
      tipEl.classList.add('is-on');
      candles.forEach((c, k) => c.classList.toggle('is-active', k === i));
      active = i;
    };
    const hideNow = () => {
      clearTimeout(hideTimer);
      tipEl.classList.remove('is-on');
      candles.forEach((c) => c.classList.remove('is-active'));
      active = -1;
    };
    // a short grace period, so crossing from one candle to the next does not flicker it
    const hide = () => {
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hideNow, 150);
    };
    const candleOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.d-candles__candle:not(.is-out)');
    const over = (e: Event) => {
      const c = candleOf(e);
      if (c) place(candles.indexOf(c));
    };
    const leave = (e: Event) => {
      const to = (e as PointerEvent | FocusEvent).relatedTarget as HTMLElement | null;
      if (!to?.closest?.('.d-candles__candle')) hide();
    };
    // a finger has no hover: a tap on a candle shows its tooltip, a tap elsewhere hides it
    const tap = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const c = candleOf(e);
      if (c) place(candles.indexOf(c));
      else hide();
    };

    // JS writes the numbers; the sliding, sinking and rescaling are CSS transitions on transform
    const pick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (!btn) return;
      shown = view(Number(btn.dataset.days));
      chart.style.setProperty('--n', String(shown.n));
      candles.forEach((el, i) => {
        const gone = i < shown.offset;
        for (const [k, val] of Object.entries(shown.props(i))) el.style.setProperty(k, val);
        el.classList.toggle('is-out', gone);
        el.tabIndex = gone ? -1 : 0;
        el.toggleAttribute('aria-hidden', gone);
      });
      ticks.forEach((t, k) => (t.textContent = shown.ticks[k]));
      dates[0].textContent = shown.first;
      dates[1].textContent = shown.last;
      out.textContent = shown.summary;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      // the tooltip follows its candle to the new place, or goes if the candle left the range
      if (active >= shown.offset) place(active);
      else if (active >= 0) hideNow();
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

/* ---------- the copy-paste snippet ---------- */

const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const VIOLET = '#8b6cff';
const TEXT = '#eceefb';
const MUTED = '#949bc0';
const SURFACE = '#141830';

/** The JSON, one day per line: easier to read than one number per line. */
const json = JSON.stringify(CANDLES, null, 2).replace(/\{\s+([^{}]+?)\s+\}/g, (_, inner: string) => `{ ${inner.replace(/\s*\n\s*/g, ' ')} }`);

export const snippet: Snippet = {
  how: [
    'The data is plain JSON, one object per day, as a market API sends it. JS rounds the lowest low and highest high out to whole thousands for the scale, then turns every price into <b>a fraction of that range</b> (0 at the bottom, 1 at the top): <code>--lo</code>, <code>--hi</code>, <code>--o</code>, <code>--c</code> on each candle. Everything you see is CSS.',
    'Every part is a full-height box, squashed and lifted: the wick is <code>translateY(-lo × 100px) scaleY(hi − lo)</code> from the bottom, the body the same from <code>min(o, c)</code> with a height of <code>max(o − c, c − o)</code>. Only <code>transform</code> changes, so a new range is a smooth transition with no layout work.',
    'The body is one element and two pseudo-elements: the element is the front, <code>::before</code> is hinged on its right edge and turned <code>rotateY(90deg)</code>, <code>::after</code> is hinged on its top edge and laid flat. A flat lid has no height, so the parent\'s <code>scaleY</code> only carries it to the top. The wick is two 2px lines crossed at 90°, so it has depth from any side.',
    'Each candle sits in a column one slot wide, placed with <code>translateX((x + 0.5) × slot)</code>, and <code>slot = width ÷ --n</code>. Switching to 7D sets <code>--n: 7</code>: the last seven slide apart, the scale zooms in, and the older days sink into the floor with <code>scaleY(0)</code>.',
    'The column is the hover target: the full height of the chart, it never moves on hover, and it is the only thing that takes the pointer. The chart is turned, so its left half lies behind the flat boxes around it: they get <code>pointer-events: none</code>.',
    'There is <b>one</b> tooltip for the whole chart. JS moves it to the pointed-at candle with <code>--tx</code> / <code>--ty</code> and a transform transition glides it there while its text changes, so it slides from candle to candle instead of blinking. It floats <code>translateZ(40px)</code> towards you (the nearer candles would cover it) and <code>--f</code> makes the end ones hang inwards. It stays flat: <code>opacity</code> on a <code>preserve-3d</code> element flattens it, so its thickness is a hard <code>box-shadow</code>. A finger has no hover, so a tap shows it.',
  ],
  html: `<div class="chart">
  <div class="scene">
    <div class="candles3d"></div>
  </div>
  <output></output>
  <div class="seg">
${RANGES.map((n) => `    <button type="button" data-days="${n}">${n}D</button>`).join('\n')}
  </div>
</div>`,
  css: `.chart {
  display: grid;
  justify-items: center;
  gap: 10px;
  font-family: system-ui, sans-serif;
}

.chart * {
  box-sizing: border-box;
}

.scene {
  perspective: 800px;
  padding: 44px 50px 36px;
  pointer-events: none; /* the chart is turned: only the candles' columns take the pointer */
}

.candles3d {
  --n: 12; /* days shown; JS sets it */
  --slot: calc(180px / var(--n)); /* each day's column */
  position: relative;
  width: 180px;
  height: 100px; /* the price scale */
  transform-style: preserve-3d;
  transform: rotateX(-18deg) rotateY(-26deg);
}

/* the floor: a neon grid laid flat under the candles */
.floor {
  position: absolute;
  left: -10px;
  top: 85px;
  width: 200px;
  height: 30px;
  border: 1px solid rgb(139 108 255 / 0.45);
  border-radius: 6px;
  background:
    repeating-linear-gradient(90deg, rgb(139 108 255 / 0.22) 0 1px, transparent 1px 15px),
    repeating-linear-gradient(rgb(139 108 255 / 0.22) 0 1px, transparent 1px 15px),
    rgb(139 108 255 / 0.09);
  transform: rotateX(90deg);
}

/* the price scale: lines at the bottom, middle and top, along the back of the floor; the numbers
   at the right end, which reaches out past the last candle. The wall reaches 8px past the scale
   at both ends (a label sticking out of a 3D-placed box gets its top half cut), so its lines
   are 1px gradients at 8px, 58px and 107px */
.wall {
  --line: rgb(236 238 251 / 0.24);
  position: absolute;
  top: -8px;
  left: -10px;
  width: 200px;
  height: 116px;
  background:
    linear-gradient(var(--line), var(--line)) 0 8px / 100% 1px no-repeat,
    linear-gradient(var(--line), var(--line)) 0 58px / 100% 1px no-repeat,
    linear-gradient(var(--line), var(--line)) 0 107px / 100% 1px no-repeat;
  transform: translateZ(-15px);
}

.wall span {
  position: absolute;
  bottom: calc(8px + var(--t) * 100px);
  left: 100%;
  padding-left: 6px;
  color: ${MUTED};
  font: 700 9px/12px system-ui, sans-serif;
  white-space: nowrap;
  transform: translateY(50%);
}

/* the first and last day shown, at the front edge of the floor */
.date {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  color: ${MUTED};
  font: 700 9px/12px system-ui, sans-serif;
  transform: translateZ(15px);
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
  outline: none;
  cursor: pointer;
  pointer-events: auto;
  transform-origin: bottom center;
  transform-style: preserve-3d;
  /* --in: 1 in the range, 0 outside it (sunk into the floor) */
  transform: translateX(calc((var(--x) + 0.5) * var(--slot))) scaleY(var(--in));
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
  width: 2px;
  margin-left: -1px;
  background: var(--tone);
  box-shadow: 0 0 6px color-mix(in srgb, var(--tone) 70%, transparent);
  transform: translateY(calc(var(--lo) * -100px)) scaleY(calc(var(--hi) - var(--lo)));
}

.wick::before {
  inset: 0;
  background: inherit;
  transform: rotateY(90deg);
}

/* the body: open ↔ close, coloured glass (the wick shows through). The element is the front,
   pushed half its depth towards you */
.body {
  /* a fine edge: under 1px shows as a hairline on sharp screens */
  --edge: 0.6px solid color-mix(in srgb, color-mix(in srgb, var(--tone) 80%, #fff) 75%, transparent);
  width: 9px;
  margin-left: -4.5px;
  border: var(--edge);
  background: color-mix(in srgb, var(--tone) 58%, transparent);
  box-shadow:
    inset 0 0 8px color-mix(in srgb, var(--tone) 30%, transparent),
    0 0 10px color-mix(in srgb, var(--tone) 22%, transparent);
  transform: translateY(calc(var(--b) * -100px)) scaleY(var(--bh)) translateZ(4.5px);
}

/* right side, darker: hinged on the front's right edge, turned back */
.body::before {
  top: -0.6px;
  left: 100%;
  width: 9px;
  height: calc(100% + 1.2px);
  border: var(--edge);
  background: color-mix(in srgb, color-mix(in srgb, var(--tone) 55%, #05060c) 64%, transparent);
  transform-origin: left center;
  transform: rotateY(90deg);
}

/* the lid: hinged on the front's top edge, laid flat; scaleY only carries it up */
.body::after {
  top: -0.6px;
  left: -0.6px;
  width: 9px;
  height: 9px;
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
  width: 9px;
  height: 100%;
  margin-left: -4.5px;
  background: color-mix(in srgb, var(--tone) 50%, transparent);
  box-shadow: 0 0 20px color-mix(in srgb, var(--tone) 60%, transparent);
  opacity: 0;
  pointer-events: none;
  transform-origin: bottom center;
  transform: translateY(calc(var(--b) * -100px)) scaleY(var(--bh)) translateZ(4.7px);
  transition:
    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * 30ms),
    opacity 0.25s;
}

.candle.is-active::after {
  opacity: 1;
}

/* ONE tooltip for the chart: JS sets --tx / --ty (the candle's middle and its high, in px) and
   it glides there. 40px towards you; --f (0 first day … 1 last) makes the ends hang inwards.
   Flat on purpose: its thickness is a hard edge up and to the right, where the depth runs. */
.tip {
  --tone: ${TEAL};
  position: absolute;
  top: 0;
  left: 0;
  padding: 3px 7px;
  border: 1px solid var(--tone);
  border-radius: 6px;
  background: ${SURFACE};
  box-shadow:
    3px -3px 0 color-mix(in srgb, var(--tone) 55%, #05060c),
    0 0 14px color-mix(in srgb, var(--tone) 40%, transparent);
  color: ${TEXT};
  font: 700 9px/12px system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate(var(--tx, 0px), calc(var(--ty, 0px) - 12px)) translate(calc(var(--f, 0) * -100%), -100%) translateZ(40px);
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

output {
  color: ${MUTED};
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

/* two buttons and one pill behind them that slides to the pressed one */
.seg {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 3px;
  border: 1px solid rgb(140 150 220 / 0.34);
  border-radius: 999px;
}

.seg::before {
  content: '';
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc(50% - 4px);
  border-radius: 999px;
  background: linear-gradient(135deg, ${VIOLET}, ${PINK});
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.seg:has(button:last-child[aria-pressed='true'])::before {
  transform: translateX(calc(100% + 2px));
}

.seg button {
  position: relative; /* above the pill */
  padding: 4px 16px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: ${MUTED};
  font: 700 12px system-ui, sans-serif;
  cursor: pointer;
}

.seg button[aria-pressed='true'] {
  color: #fff;
}`,
  js: `// The data, as a market API would send it back: one object per day
const CANDLES = ${json};

const chart = document.querySelector('.candles3d');
const out = document.querySelector('.chart output');
const buttons = document.querySelectorAll('.seg button');
const STEP = 1000; // the scale is rounded out to whole thousands
const W = 180, H = 100; // the chart's size in px, as in the CSS

// Prices the way trading apps write them: $61,200, $58.5k, +4.8%, −1.2% (a real minus)
const usd = (v) => '$' + v.toLocaleString('en-US');
const usdK = (v) => '$' + (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'k';
const pct = (v) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(1) + '%';
const tipText = (d) => \`\${d.date} · O \${usd(d.open)} H \${usd(d.high)} L \${usd(d.low)} C \${usd(d.close)}\`;

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
  const min = Math.floor(low / STEP) * STEP;
  const max = Math.ceil(high / STEP) * STEP;
  const f = (p) => (p - min) / (max - min);
  view = { n, offset, f };

  chart.style.setProperty('--n', n);
  candles.forEach((el, i) => {
    const x = i - offset; // its slot; below 0: outside the range
    const d = CANDLES[i];
    const shown = x >= 0;
    el.style.setProperty('--x', shown ? x : -1);
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
  tip.textContent = tipText(d);
  tip.style.setProperty('--tx', ((x + 0.5) * W) / view.n + 'px'); // the candle's middle
  tip.style.setProperty('--ty', (1 - view.f(d.high)) * H + 'px'); // its high
  tip.style.setProperty('--f', x / (view.n - 1)); // 0 first … 1 last: how far it hangs left
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
