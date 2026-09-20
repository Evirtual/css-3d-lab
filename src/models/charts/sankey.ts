import type { Snippet } from '../snippet-utils';
import type { Demo } from '../types';

/*
 * A flow diagram from JSON. JS lays the nodes out once, turns every flow into one SVG path and
 * gives it a depth; CSS turns those depths into real depth by putting the whole thing in a world
 * that slowly turns. Where two ribbons cross you can see which one is in front. The same TRAFFIC
 * const is printed into the snippet, so the two can never differ.
 */

/** Sample data, shaped like an API response: a session count for each step of the journey. */
export const TRAFFIC = {
  unit: 'visits',
  columns: ['Source', 'Section', 'Outcome'],
  nodes: [
    { id: 'search', name: 'Search', col: 0 },
    { id: 'social', name: 'Social', col: 0 },
    { id: 'direct', name: 'Direct', col: 0 },
    { id: 'docs', name: 'Docs', col: 1 },
    { id: 'pricing', name: 'Pricing', col: 1 },
    { id: 'blog', name: 'Blog', col: 1 },
    { id: 'signup', name: 'Sign-up', col: 2 },
    { id: 'left', name: 'Left', col: 2 },
  ],
  flows: [
    { from: 'search', to: 'docs', value: 260 },
    { from: 'search', to: 'pricing', value: 160 },
    { from: 'search', to: 'blog', value: 100 },
    { from: 'social', to: 'docs', value: 50 },
    { from: 'social', to: 'pricing', value: 70 },
    { from: 'social', to: 'blog', value: 120 },
    { from: 'direct', to: 'docs', value: 60 },
    { from: 'direct', to: 'pricing', value: 110 },
    { from: 'direct', to: 'blog', value: 30 },
    { from: 'docs', to: 'signup', value: 150 },
    { from: 'docs', to: 'left', value: 220 },
    { from: 'pricing', to: 'signup', value: 190 },
    { from: 'pricing', to: 'left', value: 150 },
    { from: 'blog', to: 'signup', value: 60 },
    { from: 'blog', to: 'left', value: 190 },
  ],
};

// the same numbers as _sankey.scss: the SVG viewBox is the back plane, so one unit is one px
const W = 260;
const H = 150;
const NODE_W = 11;
const GAP = 8; // between two nodes of a column
const COL_X = [0, 124.5, W - NODE_W];
const COLORS = [
  'var(--accent)',
  'var(--accent-2)',
  'var(--hot)',
  'var(--warm)',
  'color-mix(in srgb, var(--accent) 60%, var(--accent-2))',
  'color-mix(in srgb, var(--hot) 55%, var(--warm))',
  'var(--accent-2)',
  'var(--hot)',
];

const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();

/**
 * The layout. A node is as tall as the bigger of what goes in and what comes out; a column's
 * nodes are stacked with a gap and centred. One scale for every column, so the same number is the
 * same height wherever it appears.
 */
const layout = () => {
  const total = (id: string, side: 'from' | 'to'): number =>
    TRAFFIC.flows.filter((f) => f[side] === id).reduce((s, f) => s + f.value, 0);
  const value = Object.fromEntries(TRAFFIC.nodes.map((n) => [n.id, Math.max(total(n.id, 'from'), total(n.id, 'to'))]));
  const cols = TRAFFIC.columns.map((_, c) => TRAFFIC.nodes.filter((n) => n.col === c));
  // the fullest column decides the scale; the others then sit shorter, which is the honest look
  const busiest = Math.max(...cols.map((list) => list.reduce((s, n) => s + value[n.id], 0)));
  const tallest = Math.max(...cols.map((list) => list.length));
  const scale = (H - (tallest - 1) * GAP) / busiest;

  const nodes = cols.flatMap((list, c) => {
    const tall = list.reduce((s, n) => s + value[n.id] * scale, 0) + (list.length - 1) * GAP;
    let y = (H - tall) / 2;
    return list.map((n, i) => {
      const h = value[n.id] * scale;
      const box = { ...n, i, value: value[n.id], x: COL_X[c], y, h, color: COLORS[TRAFFIC.nodes.indexOf(n)] };
      y += h + GAP;
      return box;
    });
  });
  const by = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // Each flow takes a slice of its source's right edge and of its target's left edge. Both are
  // handed out top to bottom in the other end's order, which is what keeps the picture tidy:
  // ribbons only cross where the data really crosses.
  const outAt: Record<string, number> = {};
  const inAt: Record<string, number> = {};
  const flows = TRAFFIC.flows
    .slice()
    .sort((a, b) => by[a.from].y - by[b.from].y || by[a.to].y - by[b.to].y)
    .map((f) => {
      const src = by[f.from];
      const dst = by[f.to];
      const t = f.value * scale;
      const y0 = src.y + (outAt[f.from] ?? 0);
      const y1 = dst.y + (inAt[f.to] ?? 0);
      outAt[f.from] = (outAt[f.from] ?? 0) + t;
      inAt[f.to] = (inAt[f.to] ?? 0) + t;
      return { ...f, src, dst, t, x0: src.x + NODE_W, x1: dst.x, y0, y1 };
    });
  return { nodes, flows, scale };
};

const { nodes: NODES, flows: FLOWS } = layout();

/** A ribbon: out along the top on a curve, down the far edge, back along the bottom, closed. */
const ribbon = (f: (typeof FLOWS)[number]): string => {
  const m = (f.x0 + f.x1) / 2; // where both curves bend
  return `M${r1(f.x0)} ${r1(f.y0)}C${r1(m)} ${r1(f.y0)} ${r1(m)} ${r1(f.y1)} ${r1(f.x1)} ${r1(f.y1)}L${r1(f.x1)} ${r1(f.y1 + f.t)}C${r1(m)} ${r1(f.y1 + f.t)} ${r1(m)} ${r1(f.y0 + f.t)} ${r1(f.x0)} ${r1(f.y0 + f.t)}Z`;
};

const TOTAL = NODES.filter((n) => n.col === 0).reduce((s, n) => s + n.value, 0);
const SIGNUP = NODES.find((n) => n.id === 'signup')!;
const BIGGEST = FLOWS.reduce((a, b) => (b.value > a.value ? b : a));
const flowText = (f: (typeof FLOWS)[number]): string =>
  `${f.src.name} → ${f.dst.name} · ${f.value} ${TRAFFIC.unit} · ${Math.round((f.value / f.src.value) * 100)}% of ${f.src.name}`;
const summary = `${TOTAL} ${TRAFFIC.unit} · ${Math.round((SIGNUP.value / TOTAL) * 100)}% sign up · biggest flow ${BIGGEST.src.name} → ${BIGGEST.dst.name}`;

export const demo: Demo = {
  id: 'sankey',
  title: '3D flow diagram from JSON',
  description:
    'Where visits come from, what they read and how they end, as ribbons between three columns of blocks. Every ribbon floats at its own depth off the back plane, so a crossing shows which way is in front; hover or tab to one and it fills in and comes forward while the camera holds still.',
  category: 'js',
  tags: ['hover', 'data', 'chart', 'json', 'svg', 'sankey', 'flow'],
  technique: [
    'JSON → node layout → one SVG path per ribbon (two cubics)',
    'each ribbon on its own translateZ, so crossings sort in 3D',
    'nodes as blocks 38px off the plane, walls via rotateY(90deg)',
    'the turn pauses while a ribbon is held: a moving hit area flickers',
  ],
  fill: true,
  html: `<div class="d-sankey">
      <div class="d-sankey__view"><div class="d-sankey__world">
        <div class="d-sankey__panel"></div>
        ${TRAFFIC.columns
          .map((name, c) =>
            c === TRAFFIC.columns.length - 1
              ? `<b class="d-sankey__head is-end">${name}</b>`
              : `<b class="d-sankey__head" style="--x:${r1(COL_X[c])}px">${name}</b>`,
          )
          .join('')}
        ${FLOWS.map(
          (f, i) =>
            `<svg class="d-sankey__flow" data-f="${i}" style="--z:${r1(4 + i * 1.5)}px;--c:${f.src.color}" viewBox="0 0 ${W} ${H}"><path d="${ribbon(f)}" tabindex="0" role="img" aria-label="${f.src.name} to ${f.dst.name}: ${f.value} ${TRAFFIC.unit}" /></svg>`,
        ).join('')}
        ${NODES.map(
          (n) =>
            `<i class="d-sankey__node" style="--x:${r1(n.x)}px;--y:${r1(n.y)}px;--nh:${r1(n.h)}px;--c:${n.color}"></i>`,
        ).join('')}
        ${NODES.map((n) => {
          const y = r1(n.y + n.h / 2 - 4);
          return n.col === TRAFFIC.columns.length - 1
            ? `<b class="d-sankey__name is-end" style="--x:${r1(W - n.x + 4)}px;--y:${y}px">${n.name} <small>${n.value}</small></b>`
            : `<b class="d-sankey__name" style="--x:${r1(n.x + NODE_W + 4)}px;--y:${y}px">${n.name} <small>${n.value}</small></b>`;
        }).join('')}
      </div></div>
      <div class="d-sankey__dock"><output>${summary}</output></div>
    </div>`,
  init(scene) {
    const root = scene.querySelector<HTMLElement>('.d-sankey')!;
    const flows = [...scene.querySelectorAll<SVGElement>('.d-sankey__flow')];
    const out = scene.querySelector<HTMLOutputElement>('.d-sankey__dock output')!;
    let grace = 0;

    // Holding a ribbon fills it in, brings it forward, fades the rest and stops the turn. The
    // ribbon the pointer is on never moves sideways, so it cannot flicker at its own edges.
    const hold = (i: number) => {
      flows.forEach((f, k) => f.classList.toggle('is-on', k === i));
      root.classList.toggle('is-held', i >= 0);
      out.textContent = i < 0 ? summary : flowText(FLOWS[i]);
    };
    const flowOf = (e: Event) => (e.target as Element).closest?.('.d-sankey__flow') as SVGElement | null;
    const over = (e: Event) => {
      const flow = flowOf(e);
      if (!flow) return;
      clearTimeout(grace);
      hold(flows.indexOf(flow));
    };
    // a short grace period, so crossing the gap between two ribbons does not blink the read-out
    const leave = (e: Event) => {
      const to = (e as PointerEvent | FocusEvent).relatedTarget as Element | null;
      if (to?.closest?.('.d-sankey__flow')) return;
      clearTimeout(grace);
      grace = window.setTimeout(() => hold(-1), 150);
    };
    // a finger has no hover: a tap on a ribbon holds it, a tap elsewhere lets it go
    const tap = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const flow = flowOf(e);
      clearTimeout(grace);
      hold(flow ? flows.indexOf(flow) : -1);
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
const SURFACE = '#141830';
const BG = '#0b0d18';

/** TRAFFIC as JSON, one node and one flow per line. */
const trafficJson = (): string => JSON.stringify(TRAFFIC, null, 2).replace(/\{[^{}]*\}/g, (m) => m.replace(/\s+/g, ' '));

export const snippet: Snippet = {
  how: [
    'The JSON is a list of nodes and a list of flows between them. JS lays them out once: a node is as tall as the bigger of what goes in and what comes out, a column\'s nodes are stacked with a gap and centred, and <b>one scale</b> serves every column, so the same number is the same height wherever it turns up.',
    'Each flow then takes a slice of its source\'s right edge and a slice of its target\'s left edge. Both are handed out top to bottom <b>in the other end\'s order</b>: that is the whole trick to a tidy diagram — ribbons only cross where the data really crosses.',
    'A ribbon is one SVG path: a cubic out along its top edge (<code>C</code> with both handles at the halfway <code>x</code>, which is what gives the S), straight down the far edge, a second cubic back along the bottom, closed. Two curves, no library.',
    'The 3D is the point. Every ribbon gets its own <code>&lt;svg&gt;</code> on its own <code>translateZ</code>, 1.5px apart, and the nodes stand 38px off the plane. The browser sorts them by depth, so at a crossing you can see which ribbon passes in front, and a ribbon visibly runs behind a node.',
    'The world turns slowly so those gaps open and close. It <b>stops while a ribbon is held</b>: a hit area that keeps moving under a still pointer flickers at its own edges. Holding also lifts that ribbon 8px further forward and fades the others with <code>opacity</code>.',
    'The <code>&lt;svg&gt;</code> covers the whole plane, so it sets <code>pointer-events: none</code> and only the <code>&lt;path&gt;</code> takes the pointer — a filled path is hit-tested by its fill, which is exactly the ribbon\'s shape. The path also carries <code>tabindex="0"</code>, so the same happens on Tab.',
  ],
  html: `<div class="chart">
  <div class="scene">
    <div class="world">
      <div class="panel"></div>
    </div>
  </div>
  <output></output>
</div>`,
  css: `.chart {
  display: grid;
  justify-items: center;
  gap: 14px;
  font-family: system-ui, sans-serif;
}

.scene {
  perspective: 900px;
  padding: 34px 30px 20px;
  pointer-events: none; /* the diagram is turned away: only the ribbons take the pointer */
}

.world {
  position: relative;
  width: ${W}px;
  height: ${H}px;
  transform-style: preserve-3d;
  animation: turn 16s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes turn {
  from { transform: rotateY(-25deg) rotateX(9deg); }
  to { transform: rotateY(-11deg) rotateX(4deg); }
}

/* while a ribbon is held the camera holds still: a moving hit area flickers at its edges */
.chart.held .world {
  animation-play-state: paused;
}

.panel {
  position: absolute;
  inset: -14px -10px;
  border: 1px solid rgb(139 108 255 / 0.35);
  border-radius: 8px;
  background:
    repeating-linear-gradient(rgb(139 108 255 / 0.12) 0 1px, transparent 1px 18px),
    color-mix(in srgb, ${VIOLET} 9%, ${SURFACE});
}

.head {
  position: absolute;
  left: var(--x);
  top: -25px;
  color: ${MUTED};
  font: 700 7px/1 system-ui, sans-serif;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  transform: translateZ(2px);
}

.head.end { left: auto; right: 0; }

/* one ribbon: the svg is the whole plane, so only the path inside it may take the pointer */
.flow {
  position: absolute;
  inset: 0;
  overflow: visible;
  transform: translateZ(var(--z));
  transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s;
  pointer-events: none;
}

.flow path {
  fill: color-mix(in srgb, var(--c) 30%, transparent);
  stroke: color-mix(in srgb, var(--c) 50%, transparent);
  stroke-width: 0.6;
  outline: none;
  transition: fill 0.25s, stroke 0.25s;
  pointer-events: auto; /* a filled path is hit-tested by its fill: the ribbon's own shape */
  cursor: pointer;
}

/* :not() keeps the dimming off the held one, which a plainer rule would out-weigh */
.chart.held .flow:not(.on) { opacity: 0.22; }

.flow.on {
  transform: translateZ(calc(var(--z) + 8px));
}

.flow.on path {
  fill: color-mix(in srgb, var(--c) 72%, transparent);
  stroke: color-mix(in srgb, var(--c) 90%, #fff);
}

/* a node: a block standing off the plane, with the one side wall the camera can see */
.node {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: ${NODE_W}px;
  height: var(--nh);
  border-radius: 2px;
  background: linear-gradient(color-mix(in srgb, var(--c) 92%, #fff), color-mix(in srgb, var(--c) 70%, ${BG}));
  box-shadow: 0 0 10px color-mix(in srgb, var(--c) 40%, transparent);
  transform-style: preserve-3d;
  transform: translateZ(38px);
}

/* the +x wall, hanging back down to the plane: with the world turned this way it faces us */
.node::before {
  content: '';
  position: absolute;
  top: 0;
  left: 100%;
  width: 38px;
  height: 100%;
  background: color-mix(in srgb, var(--c) 40%, ${BG});
  transform-origin: left;
  transform: rotateY(90deg);
}

.name {
  position: absolute;
  left: var(--x);
  top: var(--y);
  color: ${TEXT};
  font: 700 7px/1 system-ui, sans-serif;
  white-space: nowrap;
  text-shadow: 0 0 4px rgb(11 13 24 / 0.92);
  transform: translateZ(39px);
}

.name.end { left: auto; right: var(--x); text-align: right; }

.name small {
  color: ${MUTED};
  font-size: 7px;
}

output {
  color: ${MUTED};
  font-size: 12px;
}`,
  js: `// The data, as an API would send it back: a session count for each step of the journey.
const TRAFFIC = ${trafficJson()};

const chart = document.querySelector('.chart');
const world = document.querySelector('.world');
const out = document.querySelector('.chart output');
const W = ${W}; // the back plane; the SVG viewBox is the same, so one unit is one px
const H = ${H};
const NODE_W = ${NODE_W};
const GAP = ${GAP}; // between two nodes of a column
const COL_X = [${COL_X.join(', ')}];
const colors = ['${VIOLET}', '${TEAL}', '${PINK}', '${AMBER}', 'color-mix(in srgb, ${VIOLET} 60%, ${TEAL})', 'color-mix(in srgb, ${PINK} 55%, ${AMBER})', '${TEAL}', '${PINK}'];

// A node is as tall as the bigger of what goes in and what comes out
const sum = (id, side) => TRAFFIC.flows.filter((f) => f[side] === id).reduce((s, f) => s + f.value, 0);
const value = {};
TRAFFIC.nodes.forEach((n) => (value[n.id] = Math.max(sum(n.id, 'from'), sum(n.id, 'to'))));

// One scale for every column, so the same number is the same height wherever it appears
const cols = TRAFFIC.columns.map((_, c) => TRAFFIC.nodes.filter((n) => n.col === c));
const busiest = Math.max(...cols.map((list) => list.reduce((s, n) => s + value[n.id], 0)));
const tallest = Math.max(...cols.map((list) => list.length));
const scale = (H - (tallest - 1) * GAP) / busiest;

// Stack each column and centre it
const by = {};
cols.forEach((list, c) => {
  const tall = list.reduce((s, n) => s + value[n.id] * scale, 0) + (list.length - 1) * GAP;
  let y = (H - tall) / 2;
  list.forEach((n) => {
    by[n.id] = { ...n, value: value[n.id], x: COL_X[c], y, h: value[n.id] * scale, color: colors[TRAFFIC.nodes.indexOf(n)] };
    y += by[n.id].h + GAP;
  });
});

// Each flow takes a slice of its source's right edge and of its target's left edge, both handed
// out top to bottom IN THE OTHER END'S ORDER: that is what keeps the picture tidy.
const outAt = {};
const inAt = {};
const flows = TRAFFIC.flows
  .slice()
  .sort((a, b) => by[a.from].y - by[b.from].y || by[a.to].y - by[b.to].y)
  .map((f) => {
    const src = by[f.from];
    const dst = by[f.to];
    const t = f.value * scale;
    const y0 = src.y + (outAt[f.from] || 0);
    const y1 = dst.y + (inAt[f.to] || 0);
    outAt[f.from] = (outAt[f.from] || 0) + t;
    inAt[f.to] = (inAt[f.to] || 0) + t;
    return { ...f, src, dst, t, x0: src.x + NODE_W, x1: dst.x, y0, y1 };
  });

// A ribbon: out along the top on a cubic, down the far edge, back along the bottom, closed.
// Both handles sit at the halfway x — that is what gives the S its shape.
function ribbon(f) {
  const m = (f.x0 + f.x1) / 2;
  return \`M\${f.x0} \${f.y0}C\${m} \${f.y0} \${m} \${f.y1} \${f.x1} \${f.y1}L\${f.x1} \${f.y1 + f.t}C\${m} \${f.y1 + f.t} \${m} \${f.y0 + f.t} \${f.x0} \${f.y0 + f.t}Z\`;
}

const SVG = 'http://www.w3.org/2000/svg';
const els = flows.map((f, i) => {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'flow');
  svg.setAttribute('viewBox', \`0 0 \${W} \${H}\`);
  svg.style.setProperty('--z', 4 + i * 1.5 + 'px'); // each ribbon on its own depth
  svg.style.setProperty('--c', f.src.color);
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', ribbon(f));
  path.setAttribute('tabindex', '0'); // the same effect on Tab as on hover
  path.setAttribute('role', 'img');
  path.setAttribute('aria-label', \`\${f.src.name} to \${f.dst.name}: \${f.value} \${TRAFFIC.unit}\`);
  svg.append(path);
  world.append(svg);
  return svg;
});

// the blocks and their names, furthest forward of all
Object.values(by).forEach((n) => {
  const node = document.createElement('i');
  node.className = 'node';
  node.style.cssText = \`--x:\${n.x}px; --y:\${n.y}px; --nh:\${n.h}px\`;
  node.style.setProperty('--c', n.color);
  world.append(node);

  const name = document.createElement('b');
  const end = n.col === TRAFFIC.columns.length - 1;
  name.className = end ? 'name end' : 'name';
  name.style.setProperty('--x', (end ? W - n.x + 4 : n.x + NODE_W + 4) + 'px');
  name.style.setProperty('--y', n.y + n.h / 2 - 4 + 'px');
  name.textContent = n.name + ' '; // text, never HTML: data from an API is not trusted markup
  const count = document.createElement('small');
  count.textContent = n.value;
  name.append(count);
  world.append(name);
});

TRAFFIC.columns.forEach((name, c) => {
  const head = document.createElement('b');
  head.className = c === TRAFFIC.columns.length - 1 ? 'head end' : 'head';
  head.style.setProperty('--x', COL_X[c] + 'px');
  head.textContent = name;
  world.append(head);
});

const total = cols[0].reduce((s, n) => s + value[n.id], 0);
const signup = TRAFFIC.nodes.find((n) => n.col === TRAFFIC.columns.length - 1);
const biggest = flows.reduce((a, b) => (b.value > a.value ? b : a));
const summary = \`\${total} \${TRAFFIC.unit} · \${Math.round((value[signup.id] / total) * 100)}% sign up · biggest flow \${biggest.src.name} → \${biggest.dst.name}\`;

// Holding a ribbon fills it in, brings it forward, fades the rest and stops the turn
function hold(i) {
  els.forEach((f, k) => f.classList.toggle('on', k === i));
  chart.classList.toggle('held', i >= 0);
  if (i < 0) {
    out.textContent = summary;
    return;
  }
  const f = flows[i];
  out.textContent = \`\${f.src.name} → \${f.dst.name} · \${f.value} \${TRAFFIC.unit} · \${Math.round((f.value / f.src.value) * 100)}% of \${f.src.name}\`;
}

let grace;
const flowOf = (e) => e.target.closest?.('.flow');
const over = (e) => {
  const flow = flowOf(e);
  if (!flow) return;
  clearTimeout(grace);
  hold(els.indexOf(flow));
};
// a short grace period, so crossing the gap between two ribbons does not blink the read-out
const leave = (e) => {
  if (e.relatedTarget?.closest?.('.flow')) return;
  clearTimeout(grace);
  grace = setTimeout(() => hold(-1), 150);
};
world.addEventListener('pointerover', over);
world.addEventListener('focusin', over);
world.addEventListener('pointerout', leave);
world.addEventListener('focusout', leave);
// a finger has no hover: a tap on a ribbon holds it, a tap elsewhere lets it go
world.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse') return;
  const flow = flowOf(e);
  clearTimeout(grace);
  hold(flow ? els.indexOf(flow) : -1);
});

hold(-1);`,
};
