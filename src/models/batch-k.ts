import { COMMITS, niceMax, SALES, TREND } from './chart-data';
import type { Demo } from './types';

/*
 * Charts drawn from JSON. The data lives in chart-data.ts, shaped like an API response; JS turns
 * it into numbers (custom properties, an SVG path) and CSS draws everything.
 */

// neonbars: the wall's lines sit at these fractions of the scale
const TICKS = [0, 0.5, 1];
// its bar geometry, the same numbers as _neonbars.scss ($w, $gap, $h): the tooltip is placed with them
const BAR_W = 19;
const BAR_PITCH = 19 + 10;
const BAR_H = 100;
const YEARS = Object.keys(SALES.years);

/** A value as money: the sign in front, the k right after the number ($88k). */
const money = (v: number): string => `${SALES.prefix}${v}${SALES.suffix}`;

/** One year of SALES as the chart needs it: the scale top, the peak, each bar's height 0–1. */
const year = (y: string) => {
  const rows = SALES.years[y];
  const values = rows.map((r) => r.value);
  const top = niceMax(Math.max(...values));
  const peak = values.indexOf(Math.max(...values));
  return { rows, top, peak, summary: `${y} · peak ${rows[peak].label}, ${money(rows[peak].value)}` };
};
/** A bar's tooltip, and its accessible name. */
const tip = (r: { label: string; value: number }): string => `${r.label} · ${money(r.value)}`;

// heatmap
const CELL_MAX = Math.max(...COMMITS.weeks.flat());
const cellText = (x: number, y: number): string =>
  `${COMMITS.days[x]}, week ${y + 1}: ${COMMITS.weeks[y][x]} commits`;
const commitSummary = (): string => {
  const total = COMMITS.weeks.flat().reduce((a, b) => a + b, 0);
  let best = [0, 0];
  COMMITS.weeks.forEach((row, y) => row.forEach((v, x) => v > COMMITS.weeks[best[1]][best[0]] && (best = [x, y])));
  return `${total} commits in ${COMMITS.weeks.length} weeks · busiest ${COMMITS.days[best[0]]}, week ${best[1] + 1}`;
};

// chartpanel: the panel is PW × PH px and the SVG's viewBox is the same, so one unit = one px
const PW = 200;
const PH = 110;
const PAD = 12;

/** Where each value of TREND lands on the panel, in px. */
const trendPoints = (): [number, number][] => {
  const { values } = TREND;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return values.map((v, i) => [
    +(PAD + (i * (PW - 2 * PAD)) / (values.length - 1)).toFixed(1),
    +(PH - PAD - ((v - lo) / (hi - lo)) * (PH - 2 * PAD - 14)).toFixed(1), // 14px headroom for the title
  ]);
};

export const demosK: Demo[] = [
  {
    id: 'neonbars',
    title: '3D bar chart from JSON',
    description:
      'Neon bars drawn from a JSON dataset: switch the year and each bar grows or shrinks to its new value, the scale on the back wall follows, and the peak lights up. Hover or tap a bar for its value. JS only turns the data into one number per bar.',
    category: 'js',
    tags: ['controls', 'hover', 'data', 'chart', 'json'],
    technique: ['JSON → --v per bar (value ÷ scale top)', 'scaleY walls + translateY lid, transitioned', 'staggered transition-delay: calc(var(--i) × 60ms)', 'dark faces, bright edge + inset glow: the neon look'],
    fill: true,
    html: (() => {
      const { rows, top, peak, summary } = year(YEARS[0]);
      return `<div class="d-neonbars">
      <div class="d-neonbars__view"><div class="d-neonbars__chart">
        <div class="d-neonbars__floor"></div>
        <div class="d-neonbars__wall">${TICKS.map((t) => `<b style="--t:${t}"><span>${Math.round(t * top)}</span></b>`).join('')}</div>
        <div class="d-neonbars__bars">${rows
          .map(
            (r, i) =>
              `<div class="d-neonbars__bar${i === peak ? ' is-peak' : ''}" style="--i:${i};--v:${(r.value / top).toFixed(3)}" tabindex="0" aria-label="${tip(r)}"><i></i><i></i><i></i><span>${r.label}</span></div>`,
          )
          .join('')}</div>
        <b class="d-neonbars__tip" aria-hidden="true"></b>
      </div></div>
      <div class="d-neonbars__dock">
        <output>${summary}</output>
        <div class="d-neonbars__seg">${YEARS.map(
          (y, i) => `<button type="button" data-year="${y}" aria-pressed="${i === 0}">${y}</button>`,
        ).join('')}</div>
      </div>
    </div>`;
    })(),
    init(scene) {
      const bars = [...scene.querySelectorAll<HTMLElement>('.d-neonbars__bar')];
      const ticks = [...scene.querySelectorAll<HTMLElement>('.d-neonbars__wall span')];
      const tipEl = scene.querySelector<HTMLElement>('.d-neonbars__tip')!;
      const out = scene.querySelector<HTMLOutputElement>('.d-neonbars__dock output')!;
      const seg = scene.querySelector<HTMLElement>('.d-neonbars__seg')!;
      const buttons = [...seg.querySelectorAll<HTMLButtonElement>('button')];
      let shown = year(YEARS[0]);
      let active = -1;
      let hideTimer = 0;

      // One tooltip for the whole chart: it glides from bar to bar and its text changes on the
      // way, instead of one label fading out while the next fades in. JS gives it the bar's
      // place (--tx, --ty, the same numbers the CSS uses) and CSS does the glide.
      const place = (i: number) => {
        clearTimeout(hideTimer);
        const r = shown.rows[i];
        const wasOn = tipEl.classList.contains('is-on');
        // from hidden it appears in place, not flying in from where it was last
        if (!wasOn) tipEl.style.transition = 'none';
        tipEl.textContent = tip(r);
        tipEl.style.setProperty('--i', String(i));
        tipEl.style.setProperty('--tx', `${i * BAR_PITCH + BAR_W / 2}px`);
        tipEl.style.setProperty('--ty', `${(1 - r.value / shown.top) * BAR_H}px`);
        tipEl.classList.toggle('is-peak', i === shown.peak);
        if (!wasOn) {
          void tipEl.offsetWidth; // apply the new place before the transition comes back
          tipEl.style.transition = '';
        }
        tipEl.classList.add('is-on');
        bars.forEach((b, k) => b.classList.toggle('is-active', k === i));
        active = i;
      };
      // a short grace period, so crossing the gap between two bars does not flicker it
      const hide = () => {
        clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => {
          tipEl.classList.remove('is-on');
          bars.forEach((b) => b.classList.remove('is-active'));
          active = -1;
        }, 150);
      };
      const barOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.d-neonbars__bar');
      const over = (e: Event) => {
        const bar = barOf(e);
        if (bar) place(bars.indexOf(bar));
      };
      const leave = (e: Event) => {
        const to = (e as PointerEvent | FocusEvent).relatedTarget as HTMLElement | null;
        if (!to?.closest?.('.d-neonbars__bar')) hide();
      };
      // a finger has no hover: a tap on a bar shows its tooltip, a tap elsewhere hides it
      const tap = (e: PointerEvent) => {
        if (e.pointerType === 'mouse') return;
        const bar = barOf(e);
        if (bar) place(bars.indexOf(bar));
        else hide();
      };

      // JS writes one number per bar; the growth, the stagger and the glow are CSS
      const pick = (e: Event) => {
        const btn = (e.target as HTMLElement).closest('button');
        if (!btn) return;
        shown = year(btn.dataset.year!);
        shown.rows.forEach((r, i) => {
          bars[i].style.setProperty('--v', (r.value / shown.top).toFixed(3));
          bars[i].classList.toggle('is-peak', i === shown.peak);
          bars[i].setAttribute('aria-label', tip(r));
        });
        ticks.forEach((t, k) => (t.textContent = String(Math.round(TICKS[k] * shown.top))));
        out.textContent = shown.summary;
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        if (active >= 0) place(active); // the tooltip follows its bar to the new height
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
  },
  {
    id: 'heatmap',
    title: '3D heatmap from JSON',
    description:
      'A week-by-weekday grid of commits where every value is a block: taller and hotter the bigger it is. Hover or tap a block to read it. JSON sets one number per block; CSS turns it into a height and a colour.',
    category: 'js',
    tags: ['hover', 'data', 'chart', 'json', 'isometric'],
    technique: ['JSON → --v per cell (value ÷ max)', 'roof translateZ(--v × 70px), walls as ::before / ::after', 'colour: color-mix(hot --v%, teal)', 'real <button> per cell, floor ignores the pointer'],
    fill: true,
    html: `<div class="d-heatmap">
      <div class="d-heatmap__view"><div class="d-heatmap__world">
        ${COMMITS.weeks
          .map((row, y) =>
            row
              .map(
                (v, x) =>
                  `<button type="button" class="d-heatmap__cell" style="--x:${x};--y:${y};--v:${(v / CELL_MAX).toFixed(3)}" aria-label="${cellText(x, y)}"><i></i></button>`,
              )
              .join(''),
          )
          .join('')}
        ${COMMITS.days.map((d, x) => `<em style="--x:${x}">${d}</em>`).join('')}
      </div></div>
      <div class="d-heatmap__dock"><output>${commitSummary()}</output></div>
    </div>`,
    init(scene) {
      const out = scene.querySelector<HTMLOutputElement>('.d-heatmap__dock output')!;
      const idle = out.textContent ?? '';
      // a cell's label says what it holds; the dock repeats it while the cell is pointed at
      const show = (e: Event) => {
        const cell = (e.target as HTMLElement).closest<HTMLElement>('.d-heatmap__cell');
        out.textContent = cell ? cell.getAttribute('aria-label') : idle;
      };
      const reset = (e: Event) => {
        const to = (e as FocusEvent | PointerEvent).relatedTarget as HTMLElement | null;
        if (!to?.closest?.('.d-heatmap__cell')) out.textContent = idle;
      };
      scene.addEventListener('pointerover', show);
      scene.addEventListener('focusin', show);
      scene.addEventListener('pointerout', reset);
      scene.addEventListener('focusout', reset);
      return () => {
        scene.removeEventListener('pointerover', show);
        scene.removeEventListener('focusin', show);
        scene.removeEventListener('pointerout', reset);
        scene.removeEventListener('focusout', reset);
      };
    },
  },
  {
    id: 'chartpanel',
    title: '3D chart panel (SVG)',
    description:
      'A neon line chart drawn as SVG from a JSON array, floating on a tilted glass panel in layers. Hover and it lies flat so you can read the values. The tilt is on the container, so the same works for a chart from any library.',
    category: 'js',
    tags: ['hover', 'data', 'chart', 'json', 'svg'],
    technique: ['JSON → SVG path (M x y L x y …)', 'layers at translateZ 0 / 8 / 16 / 22 units', 'tilt on :hover of a still wrapper → flat', 'glow = a wide faint stroke under the line (no filter)'],
    html: `<div class="d-chartpanel" tabindex="0" aria-label="Monthly revenue, ${TREND.labels[0]} to ${TREND.labels.at(-1)}: ${TREND.values.join(', ')} ${TREND.unit}">
      <div class="d-chartpanel__panel">
        <div class="d-chartpanel__glass"></div>
        <svg class="d-chartpanel__area" viewBox="0 0 ${PW} ${PH}" aria-hidden="true"><path /></svg>
        <svg class="d-chartpanel__line" viewBox="0 0 ${PW} ${PH}" aria-hidden="true"><path class="d-chartpanel__glow" /><path /></svg>
        <div class="d-chartpanel__dots">${TREND.values.map((v) => `<i><span>${v}</span></i>`).join('')}</div>
        <b class="d-chartpanel__title">Revenue <small>${TREND.unit}</small></b>
      </div>
    </div>`,
    init(scene) {
      // JSON → points → one path string: "M x y L x y …" for the line, closed down to the floor for the area
      const pts = trendPoints();
      const line = 'M' + pts.map(([x, y]) => `${x} ${y}`).join(' L');
      const area = `${line} L${pts.at(-1)![0]} ${PH} L${pts[0][0]} ${PH} Z`;
      scene.querySelectorAll('.d-chartpanel__line path').forEach((p) => p.setAttribute('d', line));
      scene.querySelector('.d-chartpanel__area path')!.setAttribute('d', area);
      scene.querySelectorAll<HTMLElement>('.d-chartpanel__dots i').forEach((dot, i) => {
        dot.style.setProperty('--x', `${pts[i][0]}px`);
        dot.style.setProperty('--y', `${pts[i][1]}px`);
      });
    },
  },
];
