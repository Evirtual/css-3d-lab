import type { Snippet } from '../snippet-utils';
import type { Demo } from '../types';

/*
 * A bubble chart from JSON. One bubble per channel: what it cost across the plate, how far it
 * reached into it, and what it made as the ball's size and the height it floats at. JS turns a
 * quarter's rows into four numbers per bubble; CSS draws the shadow, the stem and the ball. The
 * same CAMPAIGNS const is printed into the snippet, so the two can never differ.
 */

/** Sample data, shaped like an API response. spend and revenue in $k, reach as % of the audience. */
export const CAMPAIGNS = {
  money: { prefix: '$', suffix: 'k' },
  axes: { x: 'Spend', y: 'Reach', size: 'Revenue' },
  quarters: {
    Q2: [
      { name: 'Search', spend: 36, reach: 60, revenue: 104 },
      { name: 'Social', spend: 58, reach: 40, revenue: 78 },
      { name: 'Email', spend: 16, reach: 78, revenue: 58 },
      { name: 'Video', spend: 76, reach: 28, revenue: 126 },
      { name: 'Events', spend: 30, reach: 16, revenue: 34 },
      { name: 'Partners', spend: 50, reach: 52, revenue: 66 },
    ],
    Q3: [
      { name: 'Search', spend: 44, reach: 66, revenue: 126 },
      { name: 'Social', spend: 64, reach: 44, revenue: 84 },
      { name: 'Email', spend: 20, reach: 82, revenue: 66 },
      { name: 'Video', spend: 84, reach: 32, revenue: 162 },
      { name: 'Events', spend: 34, reach: 18, revenue: 30 },
      { name: 'Partners', spend: 54, reach: 56, revenue: 80 },
    ],
    Q4: [
      { name: 'Search', spend: 52, reach: 72, revenue: 158 },
      { name: 'Social', spend: 70, reach: 48, revenue: 96 },
      { name: 'Email', spend: 24, reach: 86, revenue: 74 },
      { name: 'Video', spend: 92, reach: 36, revenue: 196 },
      { name: 'Events', spend: 40, reach: 22, revenue: 48 },
      { name: 'Partners', spend: 58, reach: 60, revenue: 72 },
    ],
  } as Record<string, { name: string; spend: number; reach: number; revenue: number }[]>,
};

type Row = (typeof CAMPAIGNS.quarters)['Q2'][number];

const QUARTERS = Object.keys(CAMPAIGNS.quarters);
const ROWS = Object.values(CAMPAIGNS.quarters).flat();
/** One scale for every quarter, so switching shows a real move and not a redrawn chart. */
const SPEND_TOP = Math.ceil(Math.max(...ROWS.map((r) => r.spend)) / 20) * 20;
const REV_TOP = Math.ceil(Math.max(...ROWS.map((r) => r.revenue)) / 20) * 20;
// one colour per channel, in tokens so both themes work
const COLORS = [
  'var(--accent)',
  'var(--accent-2)',
  'var(--hot)',
  'var(--warm)',
  'color-mix(in srgb, var(--accent) 55%, var(--accent-2))',
  'color-mix(in srgb, var(--hot) 55%, var(--warm))',
];
// the plate in px: the tooltip is placed in these units, the bubbles in % of them
const PW = 230;
const PH = 168;

const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();
/** Where a row lands and how big it is: --x / --y in % of the plate, --r and --h in px. */
const place = (row: Row) => ({
  x: 10 + (row.spend / SPEND_TOP) * 78, // the y axis is drawn at 10%
  y: 88 - (row.reach / 100) * 74, // the x axis is drawn at 88%, reach counts upward from it
  r: 4 + Math.sqrt(row.revenue / REV_TOP) * 11, // area, not width, carries the value
  h: 6 + (row.revenue / REV_TOP) * 36,
});
const money = (v: number): string => `${CAMPAIGNS.money.prefix}${v}${CAMPAIGNS.money.suffix}`;
const label = (row: Row): string => `${row.name}: ${CAMPAIGNS.axes.size} ${money(row.revenue)}, ${CAMPAIGNS.axes.x.toLowerCase()} ${money(row.spend)}, ${CAMPAIGNS.axes.y.toLowerCase()} ${row.reach}%`;
const tipHtml = (row: Row): string => `${row.name} · ${money(row.revenue)}<small>${money(row.spend)} spend · ${row.reach}% reach</small>`;
const summary = (q: string): string => {
  const rows = CAMPAIGNS.quarters[q];
  const best = rows.reduce((a, b) => (b.revenue / b.spend > a.revenue / a.spend ? b : a));
  const rev = rows.reduce((s, r) => s + r.revenue, 0);
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  return `${q} · ${money(rev)} on ${money(spend)} · best return ${best.name}`;
};

export const demo: Demo = {
  id: 'bubbles',
  title: '3D bubble chart from JSON',
  description:
    'Marketing channels as bubbles floating over a plate: spend across it, reach into it, revenue as the ball’s size and how high it hangs. Switch the quarter and every bubble glides to its new place; hover or tap one for its numbers. JS writes four numbers per bubble, CSS does the rest.',
  category: 'js',
  tags: ['controls', 'hover', 'data', 'chart', 'json', 'marketing'],
  technique: [
    'JSON → --x / --y (% of the plate) + --r / --h per bubble',
    'plate rotateX(46deg), each ball rotateX(-46deg) to face you',
    'stem: 44px tall, scaleY(--h ÷ 44) from the plate',
    'one tooltip that glides: translate3d in the plate’s own units',
  ],
  fill: true,
  html: (() => {
    const q = QUARTERS[0];
    return `<div class="d-bubbles">
      <div class="d-bubbles__view"><div class="d-bubbles__plate">
        <b class="d-bubbles__axis is-y">${CAMPAIGNS.axes.y} ↑</b>
        <b class="d-bubbles__axis is-x">${CAMPAIGNS.axes.x} →</b>
        ${CAMPAIGNS.quarters[q]
          .map((row, i) => {
            const p = place(row);
            return `<div class="d-bubbles__pin" style="--i:${i};--c:${COLORS[i]};--x:${r1(p.x)};--y:${r1(p.y)};--r:${r1(p.r)};--h:${r1(p.h)}"><b class="d-bubbles__shade"></b><em class="d-bubbles__stem"></em><button type="button" class="d-bubbles__ball" aria-label="${label(row)}"><i></i><span>${row.name}</span></button></div>`;
          })
          .join('')}
        <b class="d-bubbles__tip" aria-hidden="true"></b>
      </div></div>
      <div class="d-bubbles__dock">
        <output>${summary(q)}</output>
        <div class="d-bubbles__seg">${QUARTERS.map(
          (name, i) => `<button type="button" data-q="${name}" aria-pressed="${i === 0}">${name}</button>`,
        ).join('')}</div>
      </div>
    </div>`;
  })(),
  init(scene) {
    const pins = [...scene.querySelectorAll<HTMLElement>('.d-bubbles__pin')];
    const balls = [...scene.querySelectorAll<HTMLButtonElement>('.d-bubbles__ball')];
    const tip = scene.querySelector<HTMLElement>('.d-bubbles__tip')!;
    const out = scene.querySelector<HTMLOutputElement>('.d-bubbles__dock output')!;
    const seg = scene.querySelector<HTMLElement>('.d-bubbles__seg')!;
    const buttons = [...seg.querySelectorAll<HTMLButtonElement>('button')];
    let quarter = QUARTERS[0];
    let active = -1;
    let grace = 0;

    // One tooltip for the whole chart: it glides from bubble to bubble with its text changing,
    // instead of one label fading out while the next fades in. JS gives it the bubble's place in
    // the plate's own units (the same numbers the CSS uses) and the transition does the move.
    const show = (i: number) => {
      clearTimeout(grace);
      const row = CAMPAIGNS.quarters[quarter][i];
      const p = place(row);
      const wasOn = tip.classList.contains('is-on');
      if (!wasOn) tip.style.transition = 'none'; // from hidden it appears in place, not flying in
      tip.innerHTML = tipHtml(row);
      tip.style.setProperty('--tx', `${r1((p.x / 100) * PW)}px`);
      tip.style.setProperty('--ty', `${r1((p.y / 100) * PH)}px`);
      tip.style.setProperty('--tz', `${r1(p.h + p.r)}px`); // the top of the ball
      if (!wasOn) {
        void tip.offsetWidth; // apply the new place before the transition comes back
        tip.style.transition = '';
      }
      tip.classList.add('is-on');
      balls.forEach((b, k) => b.classList.toggle('is-on', k === i));
      active = i;
    };
    // a short grace period, so crossing the gap between two bubbles never blinks it
    const hide = () => {
      clearTimeout(grace);
      grace = window.setTimeout(() => {
        tip.classList.remove('is-on');
        balls.forEach((b) => b.classList.remove('is-on'));
        active = -1;
      }, 150);
    };
    const ballOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.d-bubbles__ball');
    const over = (e: Event) => {
      const ball = ballOf(e);
      if (ball) show(balls.indexOf(ball as HTMLButtonElement));
    };
    const leave = (e: Event) => {
      const to = (e as PointerEvent | FocusEvent).relatedTarget as HTMLElement | null;
      if (!to?.closest?.('.d-bubbles__ball')) hide();
    };
    // a finger has no hover: a tap on a bubble shows its numbers, a tap elsewhere hides them
    const tap = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const ball = ballOf(e);
      if (ball) show(balls.indexOf(ball as HTMLButtonElement));
      else hide();
    };

    // a new quarter: four numbers per bubble, and CSS glides every one of them
    const pick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!btn) return;
      quarter = btn.dataset.q!;
      CAMPAIGNS.quarters[quarter].forEach((row, i) => {
        const p = place(row);
        pins[i].style.setProperty('--x', r1(p.x));
        pins[i].style.setProperty('--y', r1(p.y));
        pins[i].style.setProperty('--r', r1(p.r));
        pins[i].style.setProperty('--h', r1(p.h));
        balls[i].setAttribute('aria-label', label(row));
      });
      out.textContent = summary(quarter);
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      if (active >= 0) show(active); // the tooltip follows its bubble to the new place
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
      clearTimeout(grace);
      on.forEach(([type, fn]) => scene.removeEventListener(type, fn));
      seg.removeEventListener('click', pick);
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
const SURFACE = '#141830';
const BG = '#0b0d18';

/** CAMPAIGNS as JSON, one row per line. */
const campaignsJson = (): string =>
  JSON.stringify(CAMPAIGNS, null, 2).replace(/\{[^{}]*\}/g, (m) => m.replace(/\s+/g, ' '));

export const snippet: Snippet = {
  how: [
    'The JSON is one row per channel per quarter. JS turns a quarter into <b>four numbers per bubble</b> and writes them as custom properties: <code>--x</code> and <code>--y</code>, where it sits on the plate in %, <code>--r</code>, the ball\'s radius, and <code>--h</code>, how high it floats. Nothing else about the drawing is JavaScript.',
    'The size is <code>√(revenue ÷ top)</code>, not <code>revenue ÷ top</code>: what the eye reads is the ball\'s <i>area</i>, so the radius has to go with the square root or every big number looks twice as big as it is.',
    'The plate lies back with <code>rotateX(46deg)</code> and everything sits on it as a point (<code>left: calc(var(--x) * 1%)</code>). A ball is lifted with <code>translateZ(calc(var(--h) * 1px))</code> and then turned back by <code>rotateX(-46deg)</code> — exactly the plate\'s tilt undone — so it faces you square on while still living in the plate\'s space. Its name rides underneath in the same upright plane.',
    'The stem is a full-length strip stood up from the plate with <code>rotateX(-90deg)</code> and squashed by <code>scaleY(calc(var(--h) / 44))</code>. A new quarter therefore changes <b>only transforms</b>: ball and stem move in step, the stem always reaches the ball, and <code>transition-delay: calc(var(--i) * 50ms)</code> ripples it across the chart.',
    'The ball is the <code>&lt;button&gt;</code> and it never moves; the paint inside it does the breathing and the hover. The plate and the wrappers set <code>pointer-events: none</code> — they are tilted away behind the flat boxes around them, so only the balls and the dock should take the pointer.',
    'There is <b>one</b> tooltip. JS moves it with <code>translate3d(var(--tx), var(--ty), var(--tz))</code> in the plate\'s own units, then <code>rotateX(-46deg)</code> to face you and a last <code>translateZ(30px)</code> towards the camera so it is never buried in the bubbles. A transition glides it from one to the next.',
  ],
  html: `<div class="chart">
  <div class="scene">
    <div class="plate">
      <b class="axis y">Reach &uarr;</b>
      <b class="axis x">Spend &rarr;</b>
      <b class="tip"></b>
    </div>
  </div>
  <output></output>
  <div class="seg">
${QUARTERS.map((q) => `    <button type="button" data-q="${q}">${q}</button>`).join('\n')}
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
  padding: 60px 20px 10px; /* room for the bubbles to float into */
  pointer-events: none; /* the plate is tilted away: only the balls take the pointer */
}

.plate {
  position: relative;
  width: ${PW}px;
  height: ${PH}px;
  border: 1px solid rgb(139 108 255 / 0.4);
  border-radius: 8px;
  /* the grid: a line every tenth, brighter on the two axes */
  background:
    linear-gradient(90deg, rgb(139 108 255 / 0.55) 0 1px, transparent 1px) 10% 0 / 1px 100% no-repeat,
    linear-gradient(rgb(139 108 255 / 0.55) 0 1px, transparent 1px) 0 88% / 100% 1px no-repeat,
    repeating-linear-gradient(90deg, rgb(139 108 255 / 0.18) 0 1px, transparent 1px 10%),
    repeating-linear-gradient(rgb(139 108 255 / 0.18) 0 1px, transparent 1px 10%),
    color-mix(in srgb, ${VIOLET} 12%, ${SURFACE});
  transform-style: preserve-3d;
  transform: rotateX(46deg);
  pointer-events: none;
}

/* the axis names lie on the plate, turned back up so they read */
.axis {
  position: absolute;
  color: ${MUTED};
  font-size: 8px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.axis.x { right: 6px; bottom: 2px; transform-origin: right bottom; transform: rotateX(-46deg); }
/* both origins are at the BOTTOM: with the origin at the top a label tips down, under the plate */
.axis.y { left: 6px; top: 4px; transform-origin: left bottom; transform: rotateX(-46deg); }

/* one bubble: a point on the plate with everything hanging off it */
.pin {
  position: absolute;
  left: calc(var(--x) * 1%);
  top: calc(var(--y) * 1%);
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  pointer-events: none;
}

/* what the ball keeps off the plate: fainter the higher it floats */
.shade {
  position: absolute;
  left: calc(var(--r) * -1.15px);
  top: calc(var(--r) * -0.85px);
  width: calc(var(--r) * 2.3px);
  height: calc(var(--r) * 1.7px);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(11 13 24 / 0.7), transparent);
  opacity: calc(0.85 - var(--h) / 44 * 0.45);
  transition: opacity 0.7s cubic-bezier(0.25, 1, 0.5, 1) calc(var(--i) * 50ms);
}

/* the stem: always 60px long, squashed from the plate to this bubble's height */
.stem {
  position: absolute;
  left: -1px;
  top: -44px;
  width: 2px;
  height: 44px;
  background: linear-gradient(color-mix(in srgb, var(--c) 70%, transparent), color-mix(in srgb, var(--c) 10%, transparent));
  transform-origin: 50% 100%;
  transform: rotateX(-90deg) scaleY(calc(var(--h) / 44));
  transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1) calc(var(--i) * 50ms);
}

/* the ball is the hit target and never moves: the paint inside it does */
.ball {
  position: absolute;
  left: calc(var(--r) * -1px);
  top: calc(var(--r) * -1px);
  width: calc(var(--r) * 2px);
  height: calc(var(--r) * 2px);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  outline: none;
  transform-style: preserve-3d;
  /* up to its height, then the plate's tilt undone so it faces you */
  transform: translateZ(calc(var(--h) * 1px)) rotateX(-46deg);
  transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1) calc(var(--i) * 50ms);
  pointer-events: auto;
  cursor: pointer;
}

.ball i {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--c) 30%, #fff), transparent 55%),
    radial-gradient(circle at 62% 74%, color-mix(in srgb, var(--c) 55%, ${BG}), color-mix(in srgb, var(--c) 85%, transparent) 70%);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--c) 60%, #fff),
    0 0 12px color-mix(in srgb, var(--c) 45%, transparent);
  animation: bob 3.6s ease-in-out infinite alternate;
  animation-delay: calc(var(--i) * -0.5s);
}

/* pointed at or focused: a brighter skin fades in over the ball, which stays put */
.ball i::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 28%, #fff, color-mix(in srgb, var(--c) 80%, #fff));
  box-shadow: 0 0 20px color-mix(in srgb, var(--c) 80%, transparent);
  opacity: 0;
  transition: opacity 0.22s;
}

.ball.on i::after,
.ball:focus-visible i::after {
  opacity: 1;
}

/* over the ball, not under it: a bubble floating low would have its name behind the plate */
.ball span {
  position: absolute;
  bottom: 100%;
  left: 50%;
  margin-bottom: 3px;
  color: ${MUTED};
  font: 700 7px/1 system-ui, sans-serif;
  white-space: nowrap;
  text-shadow: 0 0 3px rgb(11 13 24 / 0.85);
  transform: translateX(-50%);
}

/* the picked name comes towards you too, so a neighbouring ball cannot cover it */
.ball.on span,
.ball:focus-visible span {
  color: ${TEXT};
  transform: translateX(-50%) translateZ(8px);
}

/* the bubble breathing on its stem: small enough that the stem still reaches it */
@keyframes bob {
  from { transform: translateY(2px); }
  to { transform: translateY(-2px); }
}

/* one tooltip, placed in the plate's own units and glided from bubble to bubble */
.tip {
  position: absolute;
  left: 0;
  top: 0;
  padding: 3px 7px;
  border: 1px solid rgb(139 108 255 / 0.55);
  border-radius: 5px;
  background: ${SURFACE};
  color: ${TEXT};
  font: 700 9px/1.35 system-ui, sans-serif;
  white-space: nowrap;
  opacity: 0;
  /* 0 0: the centring translate below has to happen in the upright plane, not the tilted one */
  transform-origin: 0 0;
  transform: translate3d(var(--tx), var(--ty), var(--tz)) rotateX(-46deg) translate(-50%, -100%) translateY(-9px) translateZ(30px);
  transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s;
  pointer-events: none;
}

.tip small {
  display: block;
  color: ${MUTED};
  font-size: 8px;
  font-weight: 600;
}

.tip.on { opacity: 1; }

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
  js: `// The data, as an API would send it back. spend and revenue in $k, reach as % of the audience.
const CAMPAIGNS = ${campaignsJson()};

const plate = document.querySelector('.plate');
const tip = document.querySelector('.tip');
const out = document.querySelector('.chart output');
const buttons = [...document.querySelectorAll('.seg button')];
const PW = ${PW}; // the plate in px: the tooltip is placed in these units
const PH = ${PH};

const quarters = Object.keys(CAMPAIGNS.quarters);
const rows = Object.values(CAMPAIGNS.quarters).flat();
// one scale for every quarter, so switching shows a real move and not a redrawn chart
const spendTop = Math.ceil(Math.max(...rows.map((r) => r.spend)) / 20) * 20;
const revTop = Math.ceil(Math.max(...rows.map((r) => r.revenue)) / 20) * 20;
const colors = ['${VIOLET}', '${TEAL}', '${PINK}', '${AMBER}', 'color-mix(in srgb, ${VIOLET} 55%, ${TEAL})', 'color-mix(in srgb, ${PINK} 55%, ${AMBER})'];
const money = (v) => CAMPAIGNS.money.prefix + v + CAMPAIGNS.money.suffix;

// Where a row lands and how big it is. The radius goes with the SQUARE ROOT of the value: what
// the eye reads is the ball's area.
function place(row) {
  return {
    x: 10 + (row.spend / spendTop) * 78, // the y axis is drawn at 10%
    y: 88 - (row.reach / 100) * 74, // the x axis is drawn at 88%, reach counts up from it
    r: 4 + Math.sqrt(row.revenue / revTop) * 11,
    h: 6 + (row.revenue / revTop) * 36,
  };
}

// One bubble each, built once; only its four numbers change after that
const pins = CAMPAIGNS.quarters[quarters[0]].map((row, i) => {
  const pin = document.createElement('div');
  pin.className = 'pin';
  pin.style.setProperty('--i', i);
  pin.style.setProperty('--c', colors[i % colors.length]);
  pin.innerHTML = '<b class="shade"></b><em class="stem"></em>';
  const ball = document.createElement('button');
  ball.type = 'button';
  ball.className = 'ball';
  const name = document.createElement('span');
  name.textContent = row.name; // text, never HTML: data from an API is not trusted markup
  ball.append(document.createElement('i'), name);
  pin.append(ball);
  plate.append(pin);
  return { pin, ball };
});

let quarter = quarters[0];
let active = -1;
let grace;

function summary() {
  const list = CAMPAIGNS.quarters[quarter];
  const best = list.reduce((a, b) => (b.revenue / b.spend > a.revenue / a.spend ? b : a));
  const rev = list.reduce((s, r) => s + r.revenue, 0);
  const spend = list.reduce((s, r) => s + r.spend, 0);
  return \`\${quarter} · \${money(rev)} on \${money(spend)} · best return \${best.name}\`;
}

// One tooltip for the whole chart: JS gives it the bubble's place in the plate's own units and
// the transition glides it there, text and all.
function show(i) {
  clearTimeout(grace);
  const row = CAMPAIGNS.quarters[quarter][i];
  const p = place(row);
  const wasOn = tip.classList.contains('on');
  if (!wasOn) tip.style.transition = 'none'; // from hidden it appears in place
  tip.textContent = \`\${row.name} · \${money(row.revenue)}\`;
  const sub = document.createElement('small');
  sub.textContent = \`\${money(row.spend)} spend · \${row.reach}% reach\`;
  tip.append(sub);
  tip.style.setProperty('--tx', (p.x / 100) * PW + 'px');
  tip.style.setProperty('--ty', (p.y / 100) * PH + 'px');
  tip.style.setProperty('--tz', p.h + p.r + 'px'); // the top of the ball
  if (!wasOn) {
    void tip.offsetWidth; // apply the new place before the transition comes back
    tip.style.transition = '';
  }
  tip.classList.add('on');
  pins.forEach((b, k) => b.ball.classList.toggle('on', k === i));
  active = i;
}

// a short grace period, so crossing the gap between two bubbles never blinks it
function hide() {
  clearTimeout(grace);
  grace = setTimeout(() => {
    tip.classList.remove('on');
    pins.forEach((b) => b.ball.classList.remove('on'));
    active = -1;
  }, 150);
}

// One quarter: four numbers per bubble. CSS glides every one of them.
function draw(q) {
  quarter = q;
  CAMPAIGNS.quarters[q].forEach((row, i) => {
    const p = place(row);
    pins[i].pin.style.setProperty('--x', p.x);
    pins[i].pin.style.setProperty('--y', p.y);
    pins[i].pin.style.setProperty('--r', p.r);
    pins[i].pin.style.setProperty('--h', p.h);
    pins[i].ball.setAttribute('aria-label', \`\${row.name}: revenue \${money(row.revenue)}, spend \${money(row.spend)}, reach \${row.reach}%\`);
  });
  out.textContent = summary();
  buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.q === q));
  if (active >= 0) show(active); // the tooltip follows its bubble to the new place
}

const ballOf = (e) => e.target.closest('.ball');
const over = (e) => {
  const ball = ballOf(e);
  if (ball) show(pins.findIndex((b) => b.ball === ball));
};
const leave = (e) => {
  if (!e.relatedTarget?.closest?.('.ball')) hide();
};
plate.addEventListener('pointerover', over);
plate.addEventListener('focusin', over);
plate.addEventListener('pointerout', leave);
plate.addEventListener('focusout', leave);
// a finger has no hover: a tap on a bubble shows its numbers, a tap elsewhere hides them
plate.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  const ball = ballOf(e);
  if (ball) show(pins.findIndex((b) => b.ball === ball));
  else hide();
});
buttons.forEach((b) => b.addEventListener('click', () => draw(b.dataset.q)));

draw(quarters[0]);`,
};
