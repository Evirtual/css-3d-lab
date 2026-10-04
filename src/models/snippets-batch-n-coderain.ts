import type { Snippet } from './snippet-utils';

/**
 * Digital rain: columns of green code falling through the dark, each at a depth of its own in one
 * perspective. A column is one element holding its glyphs as one word one character wide, so
 * forty-eight columns cost forty-eight elements. The columns are written out here once, from a
 * seeded random, so the rain is the same on every load and in every copy.
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
   sits in the HTML as it is. */
const GLYPHS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ$+-*=:.|_!?#%@^~';
const COUNT = 48;
/** The layers, in units of depth (perspective 200): far, near, near-middle, middle. */
const DEPTHS = [-150, 30, -40, -95];

interface Column { x: number; z: number; t: number; d: number; m: boolean; g: string }

const columns: Column[] = (() => {
  const rand = seeded(1999);
  return Array.from({ length: COUNT }, (_, i) => {
    // across: evenly spread a little past both edges, so the sides are never bare
    const x = -3 + ((i + 0.5) * 106) / COUNT + (rand() - 0.5) * 1.6;
    // the layers take turns, so two near columns are never neighbours
    const z = DEPTHS[i % 4] + Math.round((rand() - 0.5) * 30);
    const k = (200 - z) / 200; // how much smaller perspective draws it: 0.8 near … 1.8 far
    // near columns fall fast and far ones slowly, as rain seen at depth does
    const t = (2.9 + (k - 0.75) * 3.6) * (0.9 + rand() * 0.2);
    const n = 8 + Math.floor(rand() * 13);
    const g = Array.from({ length: n }, () => GLYPHS[Math.floor(rand() * GLYPHS.length)]).join('');
    return { x: Math.round(x * 10) / 10, z, t: Math.round(t * 10) / 10, d: -Math.round(rand() * t * 10) / 10, m: rand() < 0.4, g };
  });
})();

export const snippetsCoderain: Record<string, Snippet> = {
  coderain: {
    how: [
      'A column is <b>one</b> element one character wide (<code>width: 1ch</code>), holding its glyphs as a single word that <code>word-break: break-all</code> breaks after every letter. Forty-eight columns are forty-eight elements, and each falls with one <code>translate3d</code>.',
      'The bright head and the dimming tail are one gradient clipped to the letters, under a second layer clipped to the whole box: <code>background-clip: text, border-box</code>. The top layer is a steady green brightening down the column to a near-white last line, the glyph leading the fall; the bottom one is a black strip, so a near column hides the far ones behind it and its letters are always read on black. The tail dims only as far as a green still 6:1 on black: every glyph is text you can read, not a smear.',
      'Every column sits at a depth of its own, <code>translateZ</code> from 165 units behind the screen to 45 in front, in one <code>perspective</code>. Perspective draws the far ones smaller and nearer the middle, so each column works out <code>--k</code>, how much smaller it is drawn, and multiplies its place across and its fall by it: it lands at the share of the canvas it names and falls from just above the top edge to just below the bottom one, at any depth.',
      'Near columns fall in about 3 seconds and far ones in about 7, so the speeds alone read as depth, and the whole field sways ±6° about the vertical so the near columns slide past the far ones. Each column has its own negative <code>animation-delay</code>, so the rain is already falling on the first frame, and every fall starts and ends out of sight: no seam.',
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
  perspective: calc(200 * var(--u));
  background: #000;
}

/* the whole field sways a little about the vertical, so near columns slide past far ones */
.field {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: sway 24s ease-in-out infinite;
}

/* a column: a black strip one character wide, its glyphs one per line. --x is where it lands, in
   % of the canvas width; --z its depth in units; --k how much smaller perspective draws it there */
.field i {
  --k: calc((200 - var(--z)) / 200);
  position: absolute;
  top: 0;
  /* perspective pulls a far column towards the middle by --k, so it is placed --k further out */
  left: calc(50% + (var(--x) - 50) * var(--k) * 1%);
  width: 1ch;
  font: 600 calc(10 * var(--u)) / 1.12 'JetBrains Mono', ui-monospace, monospace;
  font-style: normal;
  text-align: center;
  word-break: break-all; /* one character wide, so every letter starts a line */
  /* two layers, each with its own clip: a green that brightens down the column to a near-white
     head, clipped to the letters, over a black strip that fills the box and hides whatever is
     behind it, so the glyphs are always read on black. The darkest green, #14a64c, is 6:1 on it */
  background:
    linear-gradient(#14a64c, #22c55e 50%, #74ffa6 calc(100% - 1.12em), #e9fff1 calc(100% - 1.12em)),
    linear-gradient(#000, #000);
  -webkit-background-clip: text, border-box;
  background-clip: text, border-box;
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
  0%, 100% { transform: rotateY(-6deg); }
  50%      { transform: rotateY(6deg); }
}`,
  },
};
