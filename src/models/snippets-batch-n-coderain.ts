import type { Snippet } from './snippet-utils';

/**
 * Digital rain: columns of green code falling through the dark, each at a depth of its own in one
 * perspective. A column is one element holding its glyphs as one word one character wide, so
 * thirty-four columns cost thirty-four elements. The columns are written out here once, from a
 * seeded random, so the rain is the same on every load and in every copy.
 *
 * Every glyph sits on the scene's own black, never on another glyph: the columns are placed so that
 * no two of them overlap, at any depth, at any moment of the sway, on any canvas shape. Perspective
 * draws a column at depth z (perspective 200) 200 / (200 - z) times its size, and the sway turns the
 * whole field, so a near column and a far one slide against each other (parallax). The columns are
 * laid left to right, each one as close to the ones before as lets their 1ch-wide boxes clear by
 * GAP at every angle of the sway, on the narrowest canvas the rain is drawn on (a square or a
 * portrait one, 200 units wide). A wider canvas spreads the same percentages further apart.
 */

/** A small seeded random (mulberry32): the same columns every build. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Only glyphs the latin subset of JetBrains Mono has: the export's render service carries that
   face and no other, so katakana would come back in some other font. No &, < or >, so a string
   sits in the HTML as it is, and no %, the one glyph whose ink reaches past its 1ch box (every
   other one here stays inside it, so boxes that never overlap mean glyphs that never touch). */
const GLYPHS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ$+-*=:.|_!?#@^~';
const COUNT = 34;
/** The layers, in units of depth (perspective 200): far, near, middle, near-middle. */
const DEPTHS = [-140, 10, -90, -45];
const PERSPECTIVE = 200;
/** The font size, in units, and how far the field sways each way, in degrees. */
const FONT = 9;
const SWAY = 1.5;
/** The least space between two columns' boxes, in units, and the narrowest canvas, in units across. */
const GAP = 0.3;
const NARROW = 200;
/** From the first column's centre to the last one's, in % of the canvas: a little past both edges. */
const SPAN = 104;

interface Column { x: number; z: number; t: number; d: number; m: boolean; g: string }

/** Where a column's box lies across the screen, left and right edge in units from the middle, for a
    column at s (units from the middle, unturned) and depth z, with the field turned by a radians. */
function edges(s: number, z: number, a: number): [number, number] {
  const X = (s * (PERSPECTIVE - z)) / PERSPECTIVE; // where it stands in the field
  const x = X * Math.cos(a) + z * Math.sin(a); // turned with the field
  const scale = PERSPECTIVE / (PERSPECTIVE + X * Math.sin(a) - z * Math.cos(a));
  const half = (0.6 * FONT * scale) / 2; // 1ch of JetBrains Mono is 0.6em
  return [x * scale - half, x * scale + half];
}

const columns: Column[] = (() => {
  const rand = seeded(1999);
  const angles = Array.from({ length: 17 }, (_, i) => ((SWAY * (i - 8)) / 8) * (Math.PI / 180));
  const placed: { s: number; z: number }[] = [];
  for (let i = 0; i < COUNT; i++) {
    // the layers take turns, so two near columns are never neighbours
    const z = DEPTHS[i % 4] + Math.round((rand() - 0.5) * 20);
    let s = 0;
    if (placed.length) {
      // the nearest place right of the columns before that clears them by GAP at every angle
      const clears = (at: number) => placed.slice(-4).every((c) => angles.every((a) => edges(at, z, a)[0] - edges(c.s, c.z, a)[1] >= GAP));
      let lo = placed[placed.length - 1].s, hi = lo + 40;
      while (hi - lo > 0.01) { const mid = (lo + hi) / 2; if (clears(mid)) hi = mid; else lo = mid; }
      s = hi;
    }
    placed.push({ s, z });
  }
  // the row is laid out at its tightest; it is spread over SPAN % of the canvas, which on the
  // narrowest canvas is at least as wide as the row (a check, not a hope)
  const row = placed[placed.length - 1].s;
  if (row > (SPAN / 100) * NARROW) throw new Error(`coderain: ${COUNT} columns need ${row.toFixed(1)} units, wider than the narrowest canvas gives`);
  return placed.map(({ s, z }) => {
    const x = 50 - SPAN / 2 + (s / row) * SPAN;
    const k = (PERSPECTIVE - z) / PERSPECTIVE; // how much smaller perspective draws it: 0.95 near … 1.75 far
    // near columns fall fast and far ones slowly, as rain seen at depth does
    const t = (2.9 + (k - 0.75) * 3.6) * (0.9 + rand() * 0.2);
    const n = 8 + Math.floor(rand() * 13);
    const g = Array.from({ length: n }, () => GLYPHS[Math.floor(rand() * GLYPHS.length)]).join('');
    return { x: Math.round(x * 100) / 100, z, t: Math.round(t * 10) / 10, d: -Math.round(rand() * t * 10) / 10, m: rand() < 0.4, g };
  });
})();

export const snippetsCoderain: Record<string, Snippet> = {
  coderain: {
    how: [
      'A column is <b>one</b> element one character wide (<code>width: 1ch</code>), holding its glyphs as a single word that <code>word-break: break-all</code> breaks after every letter. Thirty-four columns are thirty-four elements, and each falls with one <code>translate3d</code>.',
      'The bright head and the dimming tail are one gradient clipped to the letters (<code>background-clip: text</code>): a steady green brightening down the column to a near-white last line, the glyph leading the fall. Nothing is behind the letters but the scene’s own black, and the tail dims only as far as a green still 6:1 on it: every glyph is text you can read, not a smear.',
      'Every column sits at a depth of its own, <code>translateZ</code> from 150 units behind the screen to 20 in front, in one <code>perspective</code>. Perspective draws the far ones smaller and nearer the middle, so each column works out <code>--k</code>, how much smaller it is drawn, and multiplies its place across and its fall by it: it lands at the share of the canvas it names and falls from just above the top edge to just below the bottom one, at any depth.',
      'The columns never cross. Near and far ones take turns across the canvas, and each is placed, when the page is written, as close to its neighbours as lets their boxes clear at every angle of the sway, on the narrowest canvas: a near column falls in the gap between two far ones, never over them, so every glyph is read on black.',
      'Near columns fall in about 3 seconds and far ones in about 7, so the speeds alone read as depth, and the whole field sways ±1.5° about the vertical, so the layers shift against each other, never far enough to touch. Each column has its own negative <code>animation-delay</code>, so the rain is already falling on the first frame, and every fall starts and ends out of sight: no seam.',
      'The rain is <code>inset: 0</code> and a size container, so the fall is counted in <code>cqh</code> (shares of the canvas’ height) and the places in percentages: a tall canvas shows the same rain, not more of it. Its sizes are multiples of one base unit, <code>--u</code>, tied to the canvas, so a glyph is the same share of a card and of a full screen.',
    ],
    html: `<div class="rain" role="img" aria-label="Columns of green code falling at different depths, like digital rain">
  <div class="field" aria-hidden="true">
${columns.map((c) => `    <i style="--x:${c.x};--z:${c.z};--t:${c.t}s;--d:${c.d}s${c.m ? ';--m:-1' : ''}">${c.g}</i>`).join('\n')}
  </div>
</div>`,
    css: `.rain {
  /* one base unit, tied to the canvas; the rain itself fills the canvas edge to edge, placed in
     percentages of it and falling in shares of its height */
  --u: 0.5vmin;
  position: fixed;
  inset: 0;
  overflow: hidden;
  container-type: size; /* inside it, 1cqh is 1% of the canvas's height */
  perspective: calc(${PERSPECTIVE} * var(--u));
  background: #000;
}

/* the whole field sways a little about the vertical, so the layers shift against each other; the
   columns are placed far enough apart that at ±${SWAY}° none slides onto another */
.field {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: sway 18s ease-in-out infinite;
}

/* a column: one character wide, its glyphs one per line, on nothing but the scene's black. --x is
   where it lands, in % of the canvas width; --z its depth in units; --k how much smaller
   perspective draws it there */
.field i {
  --k: calc((${PERSPECTIVE} - var(--z)) / ${PERSPECTIVE});
  position: absolute;
  top: 0;
  /* perspective pulls a far column towards the middle by --k, so it is placed --k further out */
  left: calc(50% + (var(--x) - 50) * var(--k) * 1%);
  width: 1ch;
  font: 600 calc(${FONT} * var(--u)) / 1.12 'JetBrains Mono', ui-monospace, monospace;
  font-style: normal;
  text-align: center;
  word-break: break-all; /* one character wide, so every letter starts a line */
  /* a green that brightens down the column to a near-white head, clipped to the letters; the
     darkest green, #14a64c, is 6:1 on the black behind it */
  background: linear-gradient(#14a64c, #22c55e 50%, #74ffa6 calc(100% - 1.12em), #e9fff1 calc(100% - 1.12em));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: fall var(--t) linear var(--d) infinite;
}

/* from just above the top edge to just below the bottom one, as perspective draws it at --z:
   50cqh is the vanishing point, and a column drawn --k smaller has --k as far to go each way.
   --m: -1 mirrors a column's glyphs, for the look of the film */
@keyframes fall {
  from { transform: translate3d(-50%, calc(50cqh * (1 - var(--k)) - 100% - 6cqh * var(--k)), calc(var(--z) * var(--u))) scaleX(var(--m, 1)); }
  to   { transform: translate3d(-50%, calc(50cqh * (1 + var(--k)) + 6cqh * var(--k)), calc(var(--z) * var(--u))) scaleX(var(--m, 1)); }
}

/* symmetrical easing, and the end is the start: no seam */
@keyframes sway {
  0%, 100% { transform: rotateY(-${SWAY}deg); }
  50%      { transform: rotateY(${SWAY}deg); }
}`,
  },
};
