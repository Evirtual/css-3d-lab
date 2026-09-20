import type { Snippet } from '../snippet-utils';
import type { Demo } from '../types';

/*
 * A donut chart with real thickness, from JSON. JS only turns each value into two angles — where
 * the segment starts and how far it goes — and into the clip-path of the still button that catches
 * the pointer for it. CSS draws the arc as a conic-gradient with the hole punched by a mask, and
 * stacks eight copies of it along Z to make the wall. The same REVENUE const is printed into the
 * snippet, so the two can never differ.
 */

/** Sample data, shaped like an API response. value: revenue for the period, in $k. */
export const REVENUE = {
  money: { prefix: '$', suffix: 'k' },
  period: 'Q4',
  label: 'total',
  segments: [
    { name: 'Enterprise', value: 214 },
    { name: 'Teams', value: 148 },
    { name: 'Starter', value: 88 },
    { name: 'Partners', value: 52 },
    { name: 'Other', value: 28 },
  ],
};

// the same numbers as _donut.scss: the geometry has to agree with the CSS
const HOLE = 0.54; // the hole, as a share of the outer radius
const GAP = 1.4; // degrees trimmed off each end of a segment, so the ring has seams
const PUSH = 6; // how far a picked segment slides out along its own middle
const TILT = 54; // the ring's lie-back, in degrees — the same as _donut.scss
const KEY_RX = 108; // how far out a name sits ON SCREEN, across and up/down (the ring is 77 wide)
const KEY_RY = 76;
const KEY_UP = 8; // a little extra clearance for the ring's thickness, which rises on screen
const KEY_Z = 10; // the name's own lift, matching the CSS
const LAYERS = 8;
const COLORS = [
  'var(--accent)',
  'var(--accent-2)',
  'var(--hot)',
  'var(--warm)',
  'color-mix(in srgb, var(--accent) 55%, var(--hot))',
];

const TOTAL = REVENUE.segments.reduce((s, d) => s + d.value, 0);
const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();
const money = (v: number): string => `${REVENUE.money.prefix}${v}${REVENUE.money.suffix}`;
const share = (v: number): string => `${Math.round((v / TOTAL) * 100)}%`;

/** Each segment's slice of the circle: where it starts and how wide it is, both in degrees. */
const ARCS = REVENUE.segments.map((d, i, list) => {
  const start = (list.slice(0, i).reduce((s, x) => s + x.value, 0) / TOTAL) * 360;
  const sweep = (d.value / TOTAL) * 360;
  return { ...d, start, sweep, mid: start + sweep / 2 };
});

/** A point on the ring: 0deg is twelve o'clock, angles run clockwise, as conic-gradient does. */
const at = (deg: number, r: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [Math.cos(a) * r, Math.sin(a) * r];
};
/**
 * Where a name goes, in the ring's own coordinates. It is placed by the SCREEN offset it should
 * end up at, and that is turned back into plate coordinates: the ring is tilted, so a distance
 * along it counts for only cos(tilt) on screen, and the name's own lift for sin(tilt) upwards.
 */
const keyAt = (mid: number): [number, number] => {
  const [dx, dy] = at(mid, 1);
  const sy = KEY_RY * dy - KEY_UP;
  const rad = (TILT * Math.PI) / 180;
  return [KEY_RX * dx, (sy + KEY_Z * Math.sin(rad)) / Math.cos(rad)];
};
/** The same point as a percentage of the plate, for a clip-path. */
const pct = (deg: number, r: number): string => {
  const [x, y] = at(deg, r * 50);
  return `${r1(50 + x)}% ${r1(50 + y)}%`;
};
/** The wedge a segment's button covers: out along the outside, back along the hole. */
const wedge = (start: number, sweep: number): string => {
  const steps = 10;
  const out = Array.from({ length: steps + 1 }, (_, k) => pct(start + (sweep * k) / steps, 1));
  const back = Array.from({ length: steps + 1 }, (_, k) => pct(start + sweep - (sweep * k) / steps, HOLE));
  return `polygon(${[...out, ...back].join(',')})`;
};

const segLabel = (d: (typeof ARCS)[number]): string => `${d.name}: ${money(d.value)}, ${share(d.value)} of ${money(TOTAL)}`;
const BIGGEST = ARCS.reduce((a, b) => (b.value > a.value ? b : a));
const summary = `${REVENUE.period} · ${money(TOTAL)} across ${REVENUE.segments.length} lines · biggest ${BIGGEST.name} ${share(BIGGEST.value)}`;

export const demo: Demo = {
  id: 'donut',
  title: '3D donut chart from JSON',
  description:
    'A revenue mix from JSON, drawn as a ring with real thickness: each segment is a conic-gradient arc with a masked hole, stacked eight deep so its wall is solid. Hover or tap a segment and it lifts out of the ring while the middle reads its number.',
  category: 'js',
  tags: ['hover', 'data', 'chart', 'json', 'donut', 'pie'],
  technique: [
    'JSON → --a0 / --span per segment (conic-gradient angles)',
    'hole: radial-gradient mask at 54% of the radius',
    'thickness: 8 copies stacked on translateZ, shaded by depth',
    'hit area: a still <button> clipped to the wedge with clip-path',
  ],
  fill: true,
  html: `<div class="d-donut">
      <div class="d-donut__view"><div class="d-donut__plate" role="img" aria-label="${REVENUE.period} revenue, ${money(TOTAL)}: ${ARCS.map((d) => `${d.name} ${money(d.value)}`).join(', ')}.">
        <div class="d-donut__shade"></div>
        ${ARCS.map((d, i) => {
          const [mx, my] = at(d.mid, PUSH);
          return `<div class="d-donut__seg" style="--i:${i};--hue:${COLORS[i]};--a0:${r1(d.start + GAP)}deg;--span:${r1(d.sweep - GAP * 2)}deg;--mx:${r1(mx)}px;--my:${r1(my)}px">${Array.from(
            { length: LAYERS },
            (_, k) => `<i style="--k:${k}"></i>`,
          ).join('')}</div>`;
        }).join('')}
        <div class="d-donut__sheen"></div>
        ${ARCS.map((d, i) => {
          const [lx, ly] = keyAt(d.mid);
          return `<b class="d-donut__key" style="--hue:${COLORS[i]};--lx:${r1(lx)}px;--ly:${r1(ly)}px">${d.name}<small>${share(d.value)}</small></b>`;
        }).join('')}
        <div class="d-donut__mid"><span>${money(TOTAL)}</span><small>${REVENUE.label}</small></div>
        ${ARCS.map(
          (d, i) =>
            `<button type="button" class="d-donut__hit" data-seg="${i}" style="clip-path:${wedge(d.start, d.sweep)}" aria-label="${segLabel(d)}"></button>`,
        ).join('')}
      </div></div>
      <div class="d-donut__dock"><output>${summary}</output></div>
    </div>`,
  init(scene) {
    const segs = [...scene.querySelectorAll<HTMLElement>('.d-donut__seg')];
    const keys = [...scene.querySelectorAll<HTMLElement>('.d-donut__key')];
    const mid = scene.querySelector<HTMLElement>('.d-donut__mid')!;
    const out = scene.querySelector<HTMLOutputElement>('.d-donut__dock output')!;
    let grace = 0;

    // Picking a segment lifts it, lights its name, puts its number in the hole and repeats it in
    // the dock. Nothing else moves — the buttons themselves never do.
    const light = (i: number) => {
      segs.forEach((s, k) => s.classList.toggle('is-on', k === i));
      keys.forEach((s, k) => s.classList.toggle('is-on', k === i));
      const d = i < 0 ? null : ARCS[i];
      mid.firstElementChild!.textContent = d ? money(d.value) : money(TOTAL);
      mid.lastElementChild!.textContent = d ? `${d.name} · ${share(d.value)}` : REVENUE.label;
      out.textContent = d ? segLabel(d) : summary;
    };
    const hitOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.d-donut__hit');
    const over = (e: Event) => {
      const hit = hitOf(e);
      if (!hit) return;
      clearTimeout(grace);
      light(Number(hit.dataset.seg));
    };
    // a short grace period, so crossing the seam between two segments never blinks the readout
    const leave = (e: Event) => {
      const to = (e as PointerEvent | FocusEvent).relatedTarget as HTMLElement | null;
      if (to?.closest?.('.d-donut__hit')) return;
      clearTimeout(grace);
      grace = window.setTimeout(() => light(-1), 150);
    };
    // a finger has no hover: a tap on a segment picks it, a tap elsewhere lets it go
    const tap = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const hit = hitOf(e);
      clearTimeout(grace);
      light(hit ? Number(hit.dataset.seg) : -1);
    };

    const on: [string, EventListener][] = [
      ['pointerover', over],
      ['focusin', over],
      ['pointerout', leave],
      ['focusout', leave],
      ['pointerup', tap as EventListener],
    ];
    on.forEach(([type, fn]) => scene.addEventListener(type, fn));
    return () => {
      clearTimeout(grace);
      on.forEach(([type, fn]) => scene.removeEventListener(type, fn));
    };
  },
};

// ── the copy-paste snippet ──────────────────────────────────────────────────────────────────────
const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const AMBER = '#ffb547';
const TEXT = '#eceefb';
const MUTED = '#949bc0';
const BG = '#0b0d18';

/** REVENUE as JSON, one segment per line. */
const revenueJson = (): string => JSON.stringify(REVENUE, null, 2).replace(/\{[^{}]*\}/g, (m) => m.replace(/\s+/g, ' '));

export const snippet: Snippet = {
  how: [
    'JS does almost nothing: it turns each value into <b>two angles</b>, <code>--a0</code> (where the segment starts) and <code>--span</code> (how far it goes), both running clockwise from twelve o\'clock — which is exactly how <code>conic-gradient</code> counts.',
    'One segment is <code>conic-gradient(from var(--a0), var(--c) 0 var(--span), transparent var(--span))</code>: colour up to the span, nothing after it. One <code>mask: radial-gradient(closest-side, transparent 54%, #000 54.6% 99%, transparent)</code> does two jobs: it erases the middle <b>and</b> the outside, because a conic-gradient otherwise fills its whole square box right into the corners.',
    'The thickness is real. The same arc is drawn <b>eight times</b>, each copy one step further along Z (<code>translateZ(calc(var(--k) * 1.7px))</code>) and one shade lighter as it comes towards you. Their outer edges are only 1.4px apart on screen, so they read as one solid wall with the top face lit and the bottom in shade.',
    'A segment cannot catch the pointer: a <code>conic-gradient</code> is paint, and the transparent part of the disc still takes clicks. So there is a separate empty <code>&lt;button&gt;</code> per segment, <b>clipped to the wedge</b> with a <code>clip-path</code> polygon that JS traces out along the outside and back along the hole. <code>clip-path</code> changes hit testing, so the buttons never overlap — which matters, because coplanar boxes in 3D have no reliable hit-test order.',
    'The button never moves; the segment does. Hovering it adds a class that slides the stack out along its own middle and 11px towards you (<code>translate3d(var(--mx), var(--my), 11px)</code>), so the picked wedge leaves the ring instead of just rising out of it.',
    'The names and the readout in the hole undo the ring\'s tilt with <code>rotateX(-54deg)</code>, so they face you square on while still sitting in the ring\'s own space. The travelling highlight is the same disc and the same mask turned by <code>1turn</code>: a loop with no seam.',
  ],
  html: `<div class="chart">
  <div class="scene">
    <div class="ring">
      <div class="shade"></div>
      <div class="sheen"></div>
      <div class="mid"><span></span><small></small></div>
    </div>
  </div>
  <output></output>
</div>`,
  css: `.chart {
  display: grid;
  justify-items: center;
  gap: 12px;
  font-family: system-ui, sans-serif;
}

.scene {
  perspective: 800px;
  padding: 26px 40px;
  pointer-events: none; /* the ring is tilted away: only the wedge buttons take the pointer */
}

.ring {
  position: relative;
  width: 154px;
  height: 154px;
  transform-style: preserve-3d;
  transform: rotateX(54deg);
  pointer-events: none;
}

/* it settles the ring in space; it is not a real shadow */
.shade {
  position: absolute;
  left: -6%;
  top: 4%;
  width: 112%;
  height: 106%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(11 13 24 / 0.45) 62%, transparent 84%);
  transform: translateZ(-2px);
}

/* one segment: the stack of arcs, moved as a whole when it is picked */
.seg {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translate3d(0, 0, 0);
  transition: transform 0.28s cubic-bezier(0.25, 1, 0.5, 1);
  pointer-events: none;
}

/* --mx / --my push it out along its own middle, so it leaves the ring rather than just rising */
.seg.on {
  transform: translate3d(var(--mx), var(--my), 11px);
}

.seg i {
  /* k counts up towards you, and the colour lightens with it: the wall is in shade, the top is not */
  --c: color-mix(in srgb, var(--hue) calc(46% + var(--k) * 7.5%), ${BG});
  position: absolute;
  inset: 0;
  background: conic-gradient(from var(--a0), var(--c) 0 var(--span), #0000 var(--span));
  /* the hole AND the outside: a conic-gradient fills its whole square box otherwise */
  mask: radial-gradient(closest-side, #0000 54%, #000 54.6% 99%, #0000 100%);
  transform: translateZ(calc(var(--k) * 1.7px));
}

/* the hit area: still, empty, and clipped to the wedge so no two overlap */
.hit {
  position: absolute;
  inset: 0;
  padding: 0;
  border: 0;
  background: none;
  outline: none;
  transform: translateZ(12.4px);
  pointer-events: auto;
  cursor: pointer;
}

.hit:focus-visible {
  background: rgb(236 238 251 / 0.14);
}

/* a highlight travelling round the ring: the same disc and mask, turned one whole revolution */
.sheen {
  position: absolute;
  inset: 0;
  background: conic-gradient(#0000 0 22%, rgb(236 238 251 / 0.22) 30%, #0000 40%);
  mask: radial-gradient(closest-side, #0000 54%, #000 54.6% 99%, #0000 100%);
  transform: translateZ(12.1px);
  animation: sweep 9s linear infinite;
  pointer-events: none;
}

@keyframes sweep {
  to { transform: translateZ(12.1px) rotate(1turn); }
}

/* a name, stood back up at the end of its segment's middle line */
.key {
  position: absolute;
  left: 50%;
  top: 50%;
  color: ${MUTED};
  font: 700 8px/1.25 system-ui, sans-serif;
  text-align: center;
  white-space: nowrap;
  text-shadow: 0 0 3px rgb(11 13 24 / 0.85);
  /* 0 0: the centring translate has to happen in the upright plane, not the ring’s tilted one */
  transform-origin: 0 0;
  transform: translate3d(var(--lx), var(--ly), 10px) rotateX(-54deg) translate(-50%, -50%);
  transition: color 0.2s;
  pointer-events: none;
}

.key small {
  display: block;
  color: color-mix(in srgb, var(--hue) 85%, ${TEXT});
  font-size: 9px;
}

.key.on { color: ${TEXT}; }

/* the readout in the hole, facing you */
.mid {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  justify-items: center;
  gap: 1px;
  color: ${TEXT};
  font: 700 17px/1 system-ui, sans-serif;
  white-space: nowrap;
  text-shadow: 0 0 6px rgb(11 13 24 / 0.9);
  transform-origin: 0 0;
  transform: translateZ(18px) rotateX(-54deg) translate(-50%, -50%);
  pointer-events: none;
}

.mid small {
  color: ${MUTED};
  font-size: 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

output {
  color: ${MUTED};
  font-size: 12px;
}`,
  js: `// The data, as an API would send it back. value: revenue for the period, in $k.
const REVENUE = ${revenueJson()};

const ring = document.querySelector('.ring');
const mid = document.querySelector('.mid');
const out = document.querySelector('.chart output');
const HOLE = 0.54; // the hole, as a share of the outer radius — the same number the CSS masks with
const GAP = 1.4; // degrees trimmed off each end, so the ring has seams
const PUSH = 6; // how far a picked segment slides out along its own middle
const TILT = 54; // the ring's lie-back in degrees — the same number the CSS turns it by
const KEY_RX = 108; // how far out a name sits ON SCREEN (the ring's outside is 77)
const KEY_RY = 76;
const KEY_UP = 8; // extra clearance for the ring's thickness, which rises on screen
const KEY_Z = 10; // the name's own lift, matching the CSS
const LAYERS = 8;
const colors = ['${VIOLET}', '${TEAL}', '${PINK}', '${AMBER}', 'color-mix(in srgb, ${VIOLET} 55%, ${PINK})'];

const total = REVENUE.segments.reduce((s, d) => s + d.value, 0);
const money = (v) => REVENUE.money.prefix + v + REVENUE.money.suffix;
const share = (v) => Math.round((v / total) * 100) + '%';

// Each segment's slice of the circle: where it starts and how wide it is, in degrees
let at0 = 0;
const arcs = REVENUE.segments.map((d) => {
  const arc = { ...d, start: at0, sweep: (d.value / total) * 360 };
  at0 += arc.sweep;
  return { ...arc, mid: arc.start + arc.sweep / 2 };
});

// A point on the ring. 0deg is twelve o'clock and angles run clockwise, as conic-gradient counts.
function at(deg, r) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

// Where a name goes, in the RING's coordinates. It is placed by the screen offset it should end
// up at, and that is turned back: the ring is tilted, so a distance along it counts for only
// cos(tilt) on screen, and the name's own lift for sin(tilt) upwards.
function keyAt(mid) {
  const [dx, dy] = at(mid, 1);
  const sy = KEY_RY * dy - KEY_UP;
  const rad = (TILT * Math.PI) / 180;
  return [KEY_RX * dx, (sy + KEY_Z * Math.sin(rad)) / Math.cos(rad)];
}

// The wedge a button covers: out along the outside, then back along the hole.
function wedge(start, sweep) {
  const steps = 10;
  const p = [];
  for (let k = 0; k <= steps; k++) p.push(at(start + (sweep * k) / steps, 50));
  for (let k = 0; k <= steps; k++) p.push(at(start + sweep - (sweep * k) / steps, 50 * HOLE));
  return 'polygon(' + p.map(([x, y]) => \`\${50 + x}% \${50 + y}%\`).join(',') + ')';
}

// One stack of arcs, one name and one button per segment
const segs = [];
const keys = [];
arcs.forEach((d, i) => {
  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.style.setProperty('--hue', colors[i % colors.length]);
  seg.style.setProperty('--a0', d.start + GAP + 'deg');
  seg.style.setProperty('--span', d.sweep - GAP * 2 + 'deg');
  const [mx, my] = at(d.mid, PUSH);
  seg.style.setProperty('--mx', mx + 'px');
  seg.style.setProperty('--my', my + 'px');
  for (let k = 0; k < LAYERS; k++) {
    const layer = document.createElement('i');
    layer.style.setProperty('--k', k);
    seg.append(layer);
  }
  ring.prepend(seg); // behind the sheen and the readout

  const key = document.createElement('b');
  key.className = 'key';
  key.style.setProperty('--hue', colors[i % colors.length]);
  const [lx, ly] = keyAt(d.mid);
  key.style.setProperty('--lx', lx + 'px');
  key.style.setProperty('--ly', ly + 'px');
  key.textContent = d.name; // text, never HTML: data from an API is not trusted markup
  const pct = document.createElement('small');
  pct.textContent = share(d.value);
  key.append(pct);
  ring.append(key);
  keys.push(key);

  const hit = document.createElement('button');
  hit.type = 'button';
  hit.className = 'hit';
  hit.dataset.seg = i;
  hit.style.clipPath = wedge(d.start, d.sweep);
  hit.setAttribute('aria-label', \`\${d.name}: \${money(d.value)}, \${share(d.value)} of \${money(total)}\`);
  ring.append(hit);
  segs.push(seg);
});

const biggest = arcs.reduce((a, b) => (b.value > a.value ? b : a));
const summary = \`\${REVENUE.period} · \${money(total)} across \${arcs.length} lines · biggest \${biggest.name} \${share(biggest.value)}\`;

// Picking a segment lifts it, lights its name and puts its number in the hole. The button that
// caught the pointer never moves.
function light(i) {
  segs.forEach((s, k) => s.classList.toggle('on', k === i));
  keys.forEach((s, k) => s.classList.toggle('on', k === i));
  const d = i < 0 ? null : arcs[i];
  mid.firstElementChild.textContent = d ? money(d.value) : money(total);
  mid.lastElementChild.textContent = d ? \`\${d.name} · \${share(d.value)}\` : REVENUE.label;
  out.textContent = d ? \`\${d.name}: \${money(d.value)}, \${share(d.value)} of \${money(total)}\` : summary;
}

let grace;
const hitOf = (e) => e.target.closest('.hit');
ring.addEventListener('pointerover', (e) => {
  const hit = hitOf(e);
  if (!hit) return;
  clearTimeout(grace);
  light(+hit.dataset.seg);
});
ring.addEventListener('focusin', (e) => {
  const hit = hitOf(e);
  if (hit) light(+hit.dataset.seg);
});
// a short grace period, so crossing the seam between two segments never blinks the readout
const leave = (e) => {
  if (e.relatedTarget?.closest?.('.hit')) return;
  clearTimeout(grace);
  grace = setTimeout(() => light(-1), 150);
};
ring.addEventListener('pointerout', leave);
ring.addEventListener('focusout', leave);
// a finger has no hover: a tap on a segment picks it, a tap elsewhere lets it go
ring.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  const hit = hitOf(e);
  clearTimeout(grace);
  light(hit ? +hit.dataset.seg : -1);
});

light(-1);`,
};
