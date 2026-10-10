import type { Snippet } from './snippet-utils';

/** [tag, two lines, colour, edge colour, tilt, nudge x, nudge y] */
const NOTES: [string, string, string, string, number, number, number][] = [
  ['TODO', 'Buy oat<br>milk', '#ffe27a', '#efc443', -4, -3, 2],
  ['MON', 'Call Mia<br>at 6:30', '#ffbcd2', '#f092b2', 3, 2, -3],
  ['WORK', 'Ship v2<br>Friday', '#b5efd6', '#7fd6b0', -2, 4, 3],
  ['HOME', 'Water the<br>plants', '#c0deff', '#8ebff4', 4, -4, -1],
  ['TUE', 'Dentist<br>at 9am', '#ffd0a3', '#f4aa68', -3, 1, 4],
  ['IDEA', 'Peel me,<br>gently', '#dccfff', '#b6a0f4', 2, 3, -2],
];

export const snippetsStickynotes: Record<string, Snippet> = {
  stickynotes: {
    how: [
      'A real sticky note is glued only along its top, so each note here is four strips of paper, each hinged inside the one above: the <b>glue strip</b> stays flat on the board, and below it the <b>flap</b> with the words, the <b>middle</b> and the <b>tip</b> each turn on their own top edge (<code>transform-origin: 50% 0</code>, <code>rotateX</code>). Turned 20°, 24° and 28°, the angles add up to 72° at the tip: three small bends read as a curl, where one big one would read as a stiff card.',
      'Positive <code>rotateX</code> about the top edge brings the bottom towards you, so the flap comes off the cork instead of sinking into it. <code>transform-style: preserve-3d</code> on the note and on every strip keeps each child in 3D inside its parent; without it the curl would be painted flat onto the flap. Each strip is only as tall as its own paper and starts three units up under its parent, in the same colour, so no hairline of cork shows at a hinge. The board is seen from a little above (<code>rotateX(-12deg)</code> brings its top towards you), so a note lifting towards you shows as paper hanging out from the cork.',
      'The shadow is its own element lying on the board under the note: a soft radial gradient, faint and tucked under the paper at rest. On hover it darkens with <code>opacity</code> and stretches down with <code>scaleY</code>, so it reads as the gap under the lifted paper. A light layer on the tip fades in too, where the curl catches the light, and each strip starts a moment after its parent, so the paper rolls outwards. Only <code>transform</code> and <code>opacity</code> move.',
      'The note itself takes the hover and never moves; everything inside it has <code>pointer-events: none</code>, so the lifting paper cannot pull itself out from under the pointer. Each note has <code>tabindex="0"</code> and the same peel on <code>:focus-visible</code>, and its own words for a screen reader.',
      'Going in, the transition overshoots a little (<code>cubic-bezier(0.3, 1.45, 0.5, 1)</code>), which reads as paper springing; going back it eases out with no overshoot, because past flat the paper would go into the board. A transition belongs to the state being entered, which is how one note can lift and settle on different curves.',
    ],
    html: `<div class="scene">
  <div class="board">
    <i class="edge top"></i>
    <i class="edge right"></i>
${NOTES.map(([tag, text, c, e, r, dx, dy], i) => `    <div class="note" tabindex="0" role="note" style="--col:${i % 3};--row:${Math.floor(i / 3)};--c:${c};--e:${e};--r:${r}deg;--dx:${dx};--dy:${dy}">
      <i class="shade"></i>
      <div class="glue">${tag}</div>
      <div class="flap"><p>${text}</p><i class="mid"><i class="tip"></i></i></div>
    </div>`).join('\n')}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it */
  --u: 0.21vmin;
  perspective: calc(1000 * var(--u));
}

/* the cork board, seen from a little above and to the right, so a lifted note shows its depth */
.board {
  position: relative;
  width: calc(396 * var(--u));
  height: calc(276 * var(--u));
  box-sizing: border-box;
  border: calc(10 * var(--u)) solid #a4703f;
  border-radius: calc(6 * var(--u));
  background:
    radial-gradient(circle, rgb(110 62 24 / 0.35) 0 calc(1 * var(--u)), transparent calc(1.6 * var(--u))) 0 0 / calc(9 * var(--u)) calc(9 * var(--u)),
    radial-gradient(circle, rgb(255 236 200 / 0.25) 0 calc(1 * var(--u)), transparent calc(1.6 * var(--u))) calc(4 * var(--u)) calc(5 * var(--u)) / calc(13 * var(--u)) calc(11 * var(--u)),
    linear-gradient(160deg, #d3a46a, #b9844c);
  box-shadow: inset 0 0 0 calc(2 * var(--u)) #8a5a30;
  transform-style: preserve-3d;
  transform: translateX(calc(-12 * var(--u))) rotateX(-12deg) rotateY(-16deg);
  /* coplanar notes have no stable hit-test order in 3D: the board takes no pointer, the notes do */
  pointer-events: none;
}
/* the frame's thickness: the top and right edges, the two the camera can see */
.edge {
  position: absolute;
  background: linear-gradient(#7c5129, #5e3b1c);
}
.edge.top {
  left: calc(-10 * var(--u));
  top: calc(-24 * var(--u));
  width: calc(396 * var(--u));
  height: calc(14 * var(--u));
  transform-origin: 50% 100%;
  transform: rotateX(90deg);
}
.edge.right {
  left: calc(100% + 10 * var(--u));
  top: calc(-10 * var(--u));
  width: calc(14 * var(--u));
  height: calc(276 * var(--u));
  transform-origin: 0 50%;
  transform: rotateY(90deg);
}

/* a note: the static wrapper that takes the hover, one cell of a 3 × 2 grid, tilted a little */
.note {
  position: absolute;
  left: calc((18 + var(--col) * 120 + var(--dx)) * var(--u));
  top: calc((18 + var(--row) * 120 + var(--dy)) * var(--u));
  width: calc(100 * var(--u));
  height: calc(100 * var(--u));
  color: #23212b;
  outline: none;
  cursor: pointer;
  pointer-events: auto;
  transform-style: preserve-3d;
  transform: translateZ(calc(1 * var(--u))) rotate(var(--r));
}
.note:focus-visible {
  outline: calc(3 * var(--u)) solid #6a45f5;
  outline-offset: calc(4 * var(--u));
}
.note * {
  box-sizing: border-box;
  margin: 0;
  pointer-events: none;
}

/* the glued strip along the top: it never moves, and carries a small heading. It reaches 3 units
   under the flap, in the same colour, so no hairline of cork shows at the hinge */
.glue {
  position: absolute;
  inset: 0 0 auto;
  height: calc(25 * var(--u));
  padding: calc(8 * var(--u)) calc(9 * var(--u)) 0;
  background: var(--c);
  font: 600 calc(9 * var(--u)) / 1 'JetBrains Mono', monospace;
  letter-spacing: calc(1 * var(--u));
}

/* the shadow under the note, on the board: faint and tucked under the paper at rest, it
   darkens and stretches down as the flap lifts */
.shade {
  position: absolute;
  left: calc(-8 * var(--u));
  top: calc(16 * var(--u));
  width: calc(116 * var(--u));
  height: calc(100 * var(--u));
  background: radial-gradient(ellipse 50% 60% at 50% 35%, rgb(45 20 2 / 0.75), rgb(45 20 2 / 0.35) 55%, transparent);
  opacity: 0.4;
  transform-origin: 50% 0;
  transform: translateZ(calc(-0.6 * var(--u))) translateY(calc(2 * var(--u))) scaleY(0.84);
  transition: opacity 0.5s, transform 0.6s cubic-bezier(0.3, 0.7, 0.3, 1);
}

/* the paper below the glue is three strips, each hinged on its own top edge inside the one
   above: the flap with the words, the middle, the tip. Each is only as tall as its own paper, so
   nothing is left behind when the next one turns. Each starts 3 units up under its parent, about
   two pixels on a card: with less, the two soft edges let a hairline of cork through */
.flap,
.mid,
.tip {
  position: absolute;
  left: 0;
  width: 100%;
  background: var(--c);
  transform-style: preserve-3d;
  transform-origin: 50% 0;
  transform: rotateX(0deg);
  transition: transform 0.6s cubic-bezier(0.3, 0.7, 0.3, 1);
}
.flap {
  top: calc(22 * var(--u));
  height: calc(40 * var(--u));
  padding: calc(3 * var(--u)) calc(9 * var(--u)) 0;
}
.flap p {
  font: 700 calc(15 * var(--u)) / 1.2 Inter, system-ui, sans-serif;
  letter-spacing: calc(-0.2 * var(--u));
}
.mid {
  top: calc(100% - 3 * var(--u));
  height: calc(21 * var(--u));
}
/* the tip, darker towards its edge where the paper curls */
.tip {
  top: calc(100% - 3 * var(--u));
  height: calc(23 * var(--u));
  background: linear-gradient(var(--c) 15%, var(--e));
}
/* the light the curl catches, faded in as it turns */
.tip::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(rgb(255 255 255 / 0.4), transparent 80%);
  opacity: 0;
  transition: opacity 0.5s;
}

/* peeled: each strip turns a little more than the one above it, 20 + 24 + 28 = 72 degrees at
   the tip, which is a curl; each starts a moment after its parent, so it rolls outwards */
.note:hover .flap,
.note:focus-visible .flap {
  transform: rotateX(20deg);
  transition: transform 0.5s cubic-bezier(0.3, 1.45, 0.5, 1);
}
.note:hover .mid,
.note:focus-visible .mid {
  transform: rotateX(24deg);
  transition: transform 0.5s cubic-bezier(0.3, 1.45, 0.5, 1) 0.04s;
}
.note:hover .tip,
.note:focus-visible .tip {
  transform: rotateX(28deg);
  transition: transform 0.5s cubic-bezier(0.3, 1.45, 0.5, 1) 0.08s;
}
.note:hover .tip::after,
.note:focus-visible .tip::after {
  opacity: 1;
}
.note:hover .shade,
.note:focus-visible .shade {
  opacity: 1;
  transform: translateZ(calc(-0.6 * var(--u))) translateY(calc(12 * var(--u))) scaleY(1);
  transition: opacity 0.35s, transform 0.5s cubic-bezier(0.3, 1.2, 0.5, 1);
}`,
  },
};
