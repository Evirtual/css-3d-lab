import type { Snippet } from '../snippet-utils';
import type { Demo } from '../types';

/*
 * treemap: a market map drawn from JSON. JS lays the tiles out once (each tile's AREA is its
 * market cap) and writes one number per tile for the move; CSS turns that into a height and a
 * colour. The same MARKET const is printed into the snippet, so the two never differ.
 */

/** Sample data, shaped like an API response. cap: market cap in $B; change: % move per period. */
export const MARKET = {
  periods: ['24h', '7d'],
  coins: [
    { name: 'BTC', cap: 1200, change: { '24h': 2.4, '7d': 6.8 } },
    { name: 'ETH', cap: 420, change: { '24h': -1.8, '7d': 4.2 } },
    { name: 'XRP', cap: 180, change: { '24h': 5.6, '7d': -3.5 } },
    { name: 'BNB', cap: 140, change: { '24h': 0.6, '7d': 2.1 } },
    { name: 'SOL', cap: 120, change: { '24h': -3.9, '7d': 11.4 } },
    { name: 'DOGE', cap: 80, change: { '24h': 8.2, '7d': -9.6 } },
    { name: 'TRX', cap: 70, change: { '24h': -0.4, '7d': 1.3 } },
    { name: 'ADA', cap: 65, change: { '24h': -2.7, '7d': -6.9 } },
    { name: 'LINK', cap: 55, change: { '24h': 3.1, '7d': -4.4 } },
  ] as { name: string; cap: number; change: Record<string, number> }[],
};

type Coin = (typeof MARKET.coins)[number];
type Tile = Coin & { x: number; y: number; w: number; h: number };

// the plate's inner area in px (at card scale): the layout is done in these units, then written
// to CSS as % of it
const W = 184;
const H = 136;

const sum = (list: Coin[]): number => list.reduce((s, d) => s + d.cap, 0);

/** How far from square (1 = square) the worst tile of a row is, laid along a side `side` long. */
const worst = (row: Coin[], side: number, scale: number): number => {
  const depth = (sum(row) * scale) / side; // the row's thickness
  return Math.max(...row.map((d) => Math.max((d.cap * scale) / depth ** 2, depth ** 2 / (d.cap * scale))));
};

/**
 * Squarified treemap. `scale` is px² per unit of cap, so every tile's area is its cap. Items come
 * biggest first. Lay a row of them along the SHORTER side of the space that is left, adding the
 * next one while that makes the row's worst tile more square; then the row takes a strip off
 * that space and the next row starts in what remains.
 */
const treemap = (items: Coin[], x: number, y: number, w: number, h: number): Tile[] => {
  const tiles: Tile[] = [];
  const scale = (w * h) / sum(items);
  let rest = [...items];
  while (rest.length) {
    const side = Math.min(w, h);
    const row = [rest[0]];
    while (row.length < rest.length && worst([...row, rest[row.length]], side, scale) <= worst(row, side, scale)) {
      row.push(rest[row.length]);
    }
    const depth = (sum(row) * scale) / side;
    let at = 0; // where the next tile starts along the row
    for (const d of row) {
      const len = (d.cap * scale) / depth;
      tiles.push(w >= h ? { ...d, x, y: y + at, w: depth, h: len } : { ...d, x: x + at, y, w: len, h: depth });
      at += len;
    }
    if (w >= h) {
      x += depth;
      w -= depth;
    } else {
      y += depth;
      h -= depth;
    }
    rest = rest.slice(row.length);
  }
  return tiles;
};

const TILES = treemap([...MARKET.coins].sort((a, b) => b.cap - a.cap), 0, 0, W, H);
/** The height scale is shared by both periods, so a week's bigger moves stand taller. */
const MAX_MOVE = Math.max(...MARKET.coins.flatMap((c) => Object.values(c.change).map(Math.abs)));
/** Label size by footprint: a big name, a name + %, or only the name on the smallest tiles. */
const size = (t: Tile): string => (t.w >= 70 && t.h >= 46 ? 'is-lg' : t.w >= 38 && t.h >= 26 ? 'is-md' : 'is-sm');

const pct = (v: number): string => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
const tileText = (c: Coin, p: string): string => `${c.name} · $${c.cap}B · ${pct(c.change[p])}`;
const summary = (p: string): string => {
  const moves = MARKET.coins.map((c) => c.change[p]);
  const up = moves.filter((v) => v > 0).length;
  const big = MARKET.coins.reduce((a, c) => (Math.abs(c.change[p]) > Math.abs(a.change[p]) ? c : a));
  return `${p} · ${up} up, ${moves.length - up} down · biggest ${big.name} ${pct(big.change[p])}`;
};
/** The numbers a tile needs for one period: its height (0–1) and whether it fell. */
const move = (c: Coin, p: string) => ({ v: (Math.abs(c.change[p]) / MAX_MOVE).toFixed(3), down: c.change[p] < 0 });

const r = (n: number): string => (Math.round(n * 1000) / 1000).toString();

export const demo: Demo = {
  id: 'treemap',
  title: '3D treemap from JSON',
  description:
    'A crypto market map from JSON: each tile’s area is its market cap, its height and colour are the move, teal up and pink down. Switch 24h / 7d and the blocks rise and sink; hover or tap one for its numbers. JS only lays out the tiles and writes one number per tile.',
  category: 'js',
  tags: ['controls', 'hover', 'data', 'chart', 'json', 'finance', 'isometric'],
  technique: [
    'squarified treemap in JS → --x / --y / --w / --h in %',
    'roof translateZ + walls scaleY / scaleX, transitioned',
    'color-mix(teal | pink, grey) by |change|',
    'real <button> per tile, plate ignores the pointer',
  ],
  fill: true,
  html: (() => {
    const p = MARKET.periods[0];
    return `<div class="d-treemap">
      <div class="d-treemap__view"><div class="d-treemap__plate">${TILES.map((t, i) => {
        const { v, down } = move(t, p);
        return `<button type="button" class="d-treemap__tile ${size(t)}${down ? ' is-down' : ''}" style="--i:${i};--x:${r((t.x / W) * 100)};--y:${r((t.y / H) * 100)};--w:${r((t.w / W) * 100)};--h:${r((t.h / H) * 100)};--v:${v}" aria-label="${tileText(t, p)}"><i><span>${t.name}</span><small>${pct(t.change[p])}</small></i></button>`;
      }).join('')}</div></div>
      <div class="d-treemap__dock">
        <output>${summary(p)}</output>
        <div class="d-treemap__seg">${MARKET.periods
          .map((q, i) => `<button type="button" data-period="${q}" aria-pressed="${i === 0}">${q}</button>`)
          .join('')}</div>
      </div>
    </div>`;
  })(),
  init(scene) {
    const tiles = [...scene.querySelectorAll<HTMLButtonElement>('.d-treemap__tile')];
    const out = scene.querySelector<HTMLOutputElement>('.d-treemap__dock output')!;
    const seg = scene.querySelector<HTMLElement>('.d-treemap__seg')!;
    const buttons = [...seg.querySelectorAll<HTMLButtonElement>('button')];
    let period = MARKET.periods[0];

    // The dock repeats what the pointed-at (or focused, or tapped) tile holds; that tile's roof
    // is lit by .is-on. Otherwise it shows the period's summary.
    const light = (tile: HTMLElement | null) => {
      tiles.forEach((t) => t.classList.toggle('is-on', t === tile));
      out.textContent = tile ? tile.getAttribute('aria-label') : summary(period);
    };
    // back to the summary only after a short grace period, so crossing the gap between two tiles
    // changes the read-out straight from one tile to the next instead of blinking
    let grace = 0;
    const show = (e: Event) => {
      const tile = (e.target as HTMLElement).closest<HTMLElement>('.d-treemap__tile');
      if (!tile) return;
      clearTimeout(grace);
      light(tile);
    };
    const reset = (e: Event) => {
      const to = (e as FocusEvent | PointerEvent).relatedTarget as HTMLElement | null;
      if (to?.closest?.('.d-treemap__tile')) return;
      clearTimeout(grace);
      grace = window.setTimeout(() => light(null), 150);
    };

    // a new period: one number per tile (--v) and a class for the sign; the heights are CSS
    const pick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!btn) return;
      period = btn.dataset.period!;
      TILES.forEach((t, i) => {
        const { v, down } = move(t, period);
        tiles[i].style.setProperty('--v', v);
        tiles[i].classList.toggle('is-down', down);
        tiles[i].setAttribute('aria-label', tileText(t, period));
        tiles[i].querySelector('small')!.textContent = pct(t.change[period]);
      });
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      clearTimeout(grace);
      light(null);
    };

    scene.addEventListener('pointerover', show);
    scene.addEventListener('focusin', show);
    scene.addEventListener('pointerout', reset);
    scene.addEventListener('focusout', reset);
    seg.addEventListener('click', pick);
    return () => {
      scene.removeEventListener('pointerover', show);
      scene.removeEventListener('focusin', show);
      scene.removeEventListener('pointerout', reset);
      scene.removeEventListener('focusout', reset);
      seg.removeEventListener('click', pick);
      clearTimeout(grace);
    };
  },
};

// ── the copy-paste snippet ──────────────────────────────────────────────────────────────────────
const VIOLET = '#8b6cff';
const TEAL = '#2ee6d6';
const PINK = '#ff4d9d';
const MUTED = '#949bc0';
const TEXT = '#eceefb';
const SURFACE = '#141830';

/** MARKET as JSON, one coin per line (the periods on one line too). */
const marketJson = (): string =>
  JSON.stringify(MARKET, null, 2)
    .replace(/\{[^{}]*\{[^{}]*\}[^{}]*\}/g, (m) => m.replace(/\s+/g, ' '))
    .replace(/\[\s+("[^\]]*?)\s+\]/, (_, inner: string) => `[${inner.replace(/\s+/g, ' ')}]`);

export const snippet: Snippet = {
  how: [
    'The JSON is a list of coins with a market cap and a % move per period. JS does two jobs: it <b>lays the tiles out once</b>, and per period it writes <b>one number per tile</b>, <code>--v = |move| ÷ the largest move</code> (0 to 1). Everything you see is CSS.',
    'The layout is a <b>squarified treemap</b>. Sorted biggest first, the coins are laid in rows along the <i>shorter</i> side of the space that is left; a row takes the next coin as long as that makes its worst tile more square, then the row takes its strip off the space and the next row starts in the rest. Each tile gets <code>area = cap × (plate area ÷ total cap)</code>, so area is proportional to cap, and it is written as <code>--x / --y / --w / --h</code> in % of the plate.',
    'A tile is a still <code>&lt;button&gt;</code> on the plate (its footprint), and its <code>&lt;i&gt;</code> is the roof, lifted by <code>translateZ((2 + --v × 38) units)</code>. The two walls you see are the button\'s <code>::before</code> / <code>::after</code>, stood up from its front edges with <code>rotateX(-90deg)</code> and <code>rotateY(90deg)</code>.',
    'The walls are full height and squashed with <code>scaleY</code> / <code>scaleX</code> by the same fraction the roof rises, from the edge they stand on. So a new period changes only <code>transform</code>: roof and walls move in step, the walls always meet the roof, and <code>transition-delay: calc(var(--i) * 45ms)</code> ripples it across the map.',
    'The colour is <code>color-mix()</code>: teal for a gain, pink for a loss (<code>.down</code> swaps it), mixed with grey by <code>30% + --v × 70%</code>, so small moves are dull and big ones glow. The faces are glass: the colour mixed with <code>transparent</code> (roof 80%, walls about 60%), with a 0.6-unit bright edge and a soft inner glow.',
    'The plate and the wrappers ignore the pointer (it is tilted back, behind their plane); only the tiles take it. Hovering, focusing or tapping one prints its numbers in the <code>&lt;output&gt;</code> and fades in a brighter layer on its roof (<code>::after</code>, <code>opacity</code>). Leaving waits 150ms before the summary comes back, so moving across the gap between two tiles never blinks.',
    "Every length is a multiple of one base unit, <code>--u</code>. JS writes only plain numbers (the layout in % of the plate, the move as 0 to 1) and CSS multiplies them by it, so the map scales as one piece. The caption and the period switch are in plain <code>vmin</code>: the control zone is the same object, at the same size, in every model.",
  ],
  html: `<div class="market">
  <div class="view">
    <div class="scene">
      <div class="plate"></div>
    </div>
  </div>
  <div class="controls">
    <output class="caption"></output>
    <div class="row">
${MARKET.periods.map((p) => `      <button type="button" data-period="${p}">${p}</button>`).join('\n')}
    </div>
  </div>
</div>`,
  css: `.market {
  /* one base unit: every length in the map is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas. The control zone under it is in
     plain vmin, because it is the same object in every model. */
  --u: 0.3vmin;
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
  padding: calc(4 * var(--u)) calc(30 * var(--u)) calc(30 * var(--u)); /* more room under the plate keeps it clear of the caption */
  pointer-events: none; /* the plate is tilted back: only the tiles take the pointer */
}

/* the layout's area is 184 × 136 units, plus a 6-unit margin */
.plate {
  position: relative;
  width: calc(196 * var(--u));
  height: calc(148 * var(--u));
  border: calc(1 * var(--u)) solid rgb(139 108 255 / 0.4);
  border-radius: calc(9 * var(--u));
  background: color-mix(in srgb, ${VIOLET} 10%, ${SURFACE});
  transform-style: preserve-3d;
  transform: translateY(calc(14 * var(--u))) rotateX(46deg) rotateZ(28deg);
  pointer-events: none;
}

/* the footprint: --x / --y / --w / --h are % of the 184 × 136 area, with a 3-unit gap between tiles */
.tile {
  --hue: ${TEAL};
  /* grey for a small move, full colour for the largest */
  --c: color-mix(in srgb, var(--hue) calc(30% + var(--v) * 70%), ${MUTED});
  /* a fine edge: under one unit shows as a hairline on sharp screens */
  --edge: calc(0.6 * var(--u)) solid color-mix(in srgb, color-mix(in srgb, var(--c) 80%, #fff) 75%, transparent);
  position: absolute;
  top: calc(calc(7.5 * var(--u)) + var(--y) * calc(1.36 * var(--u)));
  left: calc(calc(7.5 * var(--u)) + var(--x) * calc(1.84 * var(--u)));
  width: calc(var(--w) * calc(1.84 * var(--u)) - calc(3 * var(--u)));
  height: calc(var(--h) * calc(1.36 * var(--u)) - calc(3 * var(--u)));
  padding: 0;
  border: calc(1 * var(--u)) solid color-mix(in srgb, var(--c) 35%, transparent);
  border-radius: calc(2 * var(--u));
  background: color-mix(in srgb, var(--c) 12%, transparent);
  color: ${TEXT};
  font: 700 calc(10 * var(--u))/1 system-ui, sans-serif;
  outline: none;
  transform-style: preserve-3d;
  pointer-events: auto;
  cursor: pointer;
}

.tile.down {
  --hue: ${PINK};
}

/* the two walls you see, glass: each is 40 units (the tallest block), turned up from an edge of the
   footprint and squashed to this block's height from that edge, so it always meets the roof */
.tile::before,
.tile::after {
  content: '';
  position: absolute;
  border: var(--edge);
  box-shadow: inset 0 0 calc(8 * var(--u)) color-mix(in srgb, var(--c) 30%, transparent);
  transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1) calc(var(--i) * 45ms);
}

.tile::before {
  top: calc(100% + calc(1 * var(--u)) - calc(40 * var(--u)));
  left: calc(-1 * var(--u));
  width: calc(100% + calc(2 * var(--u)));
  height: calc(40 * var(--u));
  background: color-mix(in srgb, var(--c) 64%, transparent);
  transform-origin: bottom;
  transform: rotateX(-90deg) scaleY(calc((2 + var(--v) * 38) / 40));
}

.tile::after {
  top: calc(-1 * var(--u));
  left: calc(100% + calc(1 * var(--u)) - calc(40 * var(--u)));
  width: calc(40 * var(--u));
  height: calc(100% + calc(2 * var(--u)));
  background: color-mix(in srgb, color-mix(in srgb, var(--c) 55%, #05060c) 58%, transparent);
  transform-origin: right;
  transform: rotateY(90deg) scaleX(calc((2 + var(--v) * 38) / 40));
}

/* the roof, glass too, lifted by the move; the labels sit on it, top left (the corner least hidden) */
.tile i {
  position: absolute;
  inset: calc(-1 * var(--u));
  z-index: 0; /* its own stacking context: the glow below (z -1) stays under the text */
  display: grid;
  align-content: start;
  justify-items: start;
  gap: calc(2 * var(--u));
  padding: calc(3 * var(--u)) calc(4 * var(--u));
  border: var(--edge);
  background: color-mix(in srgb, var(--c) 80%, transparent);
  box-shadow:
    inset 0 0 calc(8 * var(--u)) color-mix(in srgb, var(--c) 30%, transparent),
    0 0 calc(10 * var(--u)) color-mix(in srgb, var(--c) 22%, transparent);
  font-style: normal;
  text-shadow: 0 0 calc(3 * var(--u)) rgb(11 13 24 / 0.85);
  transform: translateZ(calc(calc(2 * var(--u)) + var(--v) * calc(38 * var(--u))));
  transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1) calc(var(--i) * 45ms);
}

/* pointed at, focused or tapped: the roof fills in and glows, faded with opacity */
.tile i::after {
  content: '';
  position: absolute;
  inset: calc(-0.6 * var(--u));
  z-index: -1;
  background: color-mix(in srgb, color-mix(in srgb, var(--c) 70%, #fff) 60%, transparent);
  box-shadow: inset 0 0 0 calc(1 * var(--u)) color-mix(in srgb, var(--c) 30%, #fff), 0 0 calc(22 * var(--u)) color-mix(in srgb, var(--c) 75%, transparent);
  opacity: 0;
  transition: opacity 0.25s;
}

.tile.on i::after,
.tile:focus-visible i::after {
  opacity: 1; /* the tile itself never moves */
}

.tile small {
  color: rgb(236 238 251 / 0.8);
  font-size: calc(9 * var(--u));
}

.tile.sm i { padding: calc(2 * var(--u)); }
.tile.sm span { font-size: calc(9 * var(--u)); }
.tile.sm small { display: none; } /* the smallest tiles only have room for the name */
.tile.md span { font-size: calc(12 * var(--u)); }
.tile.lg i { padding: calc(6 * var(--u)) calc(7 * var(--u)); }
.tile.lg span { font-size: calc(20 * var(--u)); }
.tile.lg small { font-size: calc(12 * var(--u)); }

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the map's own unit. The caption is on its own line above
   the row, and its line box never changes height, so a new read-out cannot move the map. */
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
  js: `// The data, as an API would send it back. cap: market cap in $B; change: % move per period.
const MARKET = ${marketJson()};

const plate = document.querySelector('.plate');
const out = document.querySelector('.market output');
const buttons = document.querySelectorAll('.controls .row button');
const W = 184; // the plate's inner area in the map's own units: the layout is done in them,
const H = 136; // then written to CSS as % of it

const sum = (list) => list.reduce((s, d) => s + d.cap, 0);

// How far from square (1 = square) the worst tile of a row is, laid along a side \`side\` long
function worst(row, side, scale) {
  const depth = (sum(row) * scale) / side; // the row's thickness
  return Math.max(...row.map((d) => Math.max((d.cap * scale) / depth ** 2, depth ** 2 / (d.cap * scale))));
}

// Squarified treemap. \`scale\` is square units per unit of cap, so every tile's area is its cap. Items come
// biggest first. Lay a row of them along the SHORTER side of the space that is left, adding the
// next one while that makes the row's worst tile more square; then the row takes a strip off
// that space and the next row starts in what remains.
function treemap(items, x, y, w, h) {
  const tiles = [];
  const scale = (w * h) / sum(items);
  let rest = [...items];
  while (rest.length) {
    const side = Math.min(w, h);
    const row = [rest[0]];
    while (row.length < rest.length && worst([...row, rest[row.length]], side, scale) <= worst(row, side, scale)) {
      row.push(rest[row.length]);
    }
    const depth = (sum(row) * scale) / side;
    let at = 0; // where the next tile starts along the row
    for (const d of row) {
      const len = (d.cap * scale) / depth;
      tiles.push(w >= h ? { ...d, x, y: y + at, w: depth, h: len } : { ...d, x: x + at, y, w: len, h: depth });
      at += len;
    }
    if (w >= h) {
      x += depth;
      w -= depth;
    } else {
      y += depth;
      h -= depth;
    }
    rest = rest.slice(row.length);
  }
  return tiles;
}

const tiles = treemap([...MARKET.coins].sort((a, b) => b.cap - a.cap), 0, 0, W, H);
// the height scale is shared by both periods, so a week's bigger moves stand taller
const maxMove = Math.max(...MARKET.coins.flatMap((c) => Object.values(c.change).map(Math.abs)));
const pct = (v) => \`\${v > 0 ? '+' : v < 0 ? '\\u2212' : ''}\${Math.abs(v).toFixed(1)}%\`;

// One button per tile, placed once; its roof <i> carries the name and the move
const els = tiles.map((t, i) => {
  const tile = document.createElement('button');
  tile.type = 'button';
  // label size by footprint: a big name, a name + %, or only the name
  tile.className = 'tile ' + (t.w >= 70 && t.h >= 46 ? 'lg' : t.w >= 38 && t.h >= 26 ? 'md' : 'sm');
  tile.style.cssText = \`--i:\${i}; --x:\${(t.x / W) * 100}; --y:\${(t.y / H) * 100}; --w:\${(t.w / W) * 100}; --h:\${(t.h / H) * 100}\`;
  const roof = document.createElement('i');
  const name = document.createElement('span');
  name.textContent = t.name; // text, never HTML: data from an API is not trusted markup
  roof.append(name, document.createElement('small'));
  tile.append(roof);
  plate.append(tile);
  return tile;
});

let period;
function summary() {
  const moves = MARKET.coins.map((c) => c.change[period]);
  const up = moves.filter((v) => v > 0).length;
  const big = MARKET.coins.reduce((a, c) => (Math.abs(c.change[period]) > Math.abs(a.change[period]) ? c : a));
  return \`\${period} · \${up} up, \${moves.length - up} down · biggest \${big.name} \${pct(big.change[period])}\`;
}

// The dock repeats what the pointed-at (or focused, or tapped) tile holds, and lights its roof
function light(tile) {
  els.forEach((t) => t.classList.toggle('on', t === tile));
  out.textContent = tile ? tile.getAttribute('aria-label') : summary();
}

// One period: each tile gets --v (its height, 0–1) and .down for a loss. CSS does the rest.
function show(p) {
  period = p;
  tiles.forEach((t, i) => {
    const change = t.change[p];
    els[i].style.setProperty('--v', Math.abs(change) / maxMove);
    els[i].classList.toggle('down', change < 0);
    els[i].setAttribute('aria-label', \`\${t.name} · $\${t.cap}B · \${pct(change)}\`);
    els[i].querySelector('small').textContent = pct(change);
  });
  buttons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.period === p));
  clearTimeout(grace);
  light(null);
}

// Back to the summary only after a short grace period, so crossing the gap between two tiles
// changes the read-out straight from one tile to the next instead of blinking
let grace;
const point = (e) => {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  clearTimeout(grace);
  light(tile);
};
const leave = (e) => {
  if (e.relatedTarget?.closest?.('.tile')) return;
  clearTimeout(grace);
  grace = setTimeout(() => light(null), 150);
};
plate.addEventListener('pointerover', point);
plate.addEventListener('focusin', point);
plate.addEventListener('pointerout', leave);
plate.addEventListener('focusout', leave);
buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.period)));

show(MARKET.periods[0]);`,
};
