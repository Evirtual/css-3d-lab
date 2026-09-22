/**
 * Paste-anywhere versions of batch I: cards that open, lift and slide out, and two 3D loaders.
 * Plain HTML + CSS (+ JS), no Sass, no build step — see docs/ADDING-MODELS.md.
 */
import type { Snippet } from './snippet-utils';

const BOOKS: [string, string, number, number, string][] = [
  ['Depth', 'Depth of field', 20, 112, '#8b6cff'],
  ['Z', 'The Z axis', 16, 98, '#ffb547'],
  ['Perspective', 'Perspective', 24, 122, '#2ee6d6'],
  ['Faces', 'Six faces', 18, 92, '#ff4d9d'],
  ['Origin', 'Transform origin', 22, 106, '#5846b8'],
];

// [colour, lap time, direction, axis angle, dots]
const ORBITS: [string, string, string, string, number][] = [
  ['#2ee6d6', '1.6s', 'normal', '0deg', 3],
  ['#ff4d9d', '2.4s', 'reverse', '60deg', 3],
  ['#ffb547', '3.3s', 'normal', '120deg', 2],
];

export const snippetsI: Record<string, Snippet> = {
  greeting: {
    how: [
      'The card\'s left edge is its spine. The cover is a two-faced panel (front art, inside pattern, each with <code>backface-visibility: hidden</code>) with <code>transform-origin: 0 50%</code>, so <code>rotateY(var(--open))</code> swings it round the spine.',
      'The hover target is the static wrapper; the card inside is <code>pointer-events: none</code>. Hovering only changes custom properties: the cover angle, the viewing angle, <code>--x0</code>, the heart, and <code>--shift</code>, which slides the half-shut card back left so it is centred shut as well as open. Every part transitions with the same easing, so they stay in step.',
      'The heart is a <b>floating layer</b>, like in a real pop-up book: each half rides on its own page (the left half is a child of the cover, so it turns with it) and floats 16 units in front of it with <code>translateZ</code>.',
      'Two planes each 16 units in front of their page meet on a line <code>16 units × cot(half the opening angle)</code> from the spine: 14 units when the card is half open, 2 units when it is flat. That is <code>--x0</code>, and it is why the halves always join into one heart.',
      'The left half is turned round with <code>rotateY(180deg)</code> to face the right half, which mirrors it, so its shape is the mirror image of the right half\'s. Each half is cut out by a <code>mask</code>, an SVG path stretched over its box, not by <code>clip-path: path()</code>: a path is in pixels, and would stay the same size while the card scaled round it.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, text included, so the card is the same share of a gallery card, the editor and a recording canvas. It is sized for the card fully open, the pop-up standing.',
    ],
    html: `<div class="scene">
  <div class="greeting" tabindex="0">
    <div class="card">
      <i class="shadow"></i>
      <div class="page"><b>Happy<br>day!</b><span></span><span></span><small>with love, C.</small></div>
      <i class="pop"></i>
      <div class="cover">
        <div class="front"><b>For<br>you</b></div>
        <div class="inside"><small>open me</small></div>
        <i class="pop pop-left"></i>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the card is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.38vmin;
  perspective: calc(800 * var(--u));
}

/* the static hit target: hovering it only changes numbers */
.greeting {
  --open: -96deg;  /* cover angle: half open */
  --view: 40deg;   /* how far round we look at the card */
  --x0: calc(14 * var(--u));      /* where the two heart halves meet (see below) */
  --pop: 0;        /* the heart: hidden while the card is closed */
  --shift: calc(-34 * var(--u)); /* half shut, the card is all on the spine's right: slide it back */
  display: grid;
  place-items: center;
  width: calc(210 * var(--u));
  height: calc(180 * var(--u));
  outline: none;
  cursor: pointer;
  transform-style: preserve-3d;
}

.greeting:hover,
.greeting:focus-visible {
  --open: -166deg; /* almost flat, so it still stands */
  --view: 24deg;   /* the card turns to face you as it opens */
  --x0: calc(2 * var(--u));
  --pop: 1;
  --shift: 0px;    /* open, it spreads both ways from the spine, so the spine goes in the middle */
}

/* the card's left edge is the spine: move it to the middle (less --shift while it is shut, so the
   shut card is centred too), look from above and the left */
.card {
  position: relative;
  width: calc(92 * var(--u));
  height: calc(124 * var(--u));
  pointer-events: none;
  transform-style: preserve-3d;
  transform-origin: 0 50%;
  transform: translate(calc(46 * var(--u) + var(--shift)), calc(-4 * var(--u))) rotateX(-18deg) rotateY(var(--view));
  transition: transform 0.9s cubic-bezier(0.3, 1.15, 0.45, 1);
}

/* a soft shadow lying on the table */
.shadow {
  position: absolute;
  top: calc(84 * var(--u));
  left: calc(-101 * var(--u));
  width: calc(202 * var(--u));
  height: calc(80 * var(--u));
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.45), transparent);
  transform: rotateX(90deg);
}

/* the inside right page: it stays put */
.page {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: start;
  gap: calc(3 * var(--u));
  /* the rows 3 units apart and the words 64 units down, so the signature ends on the page and the
     heart stays clear of the title: 6 apart from 68 down, it hung off the page's bottom edge, dark
     on the dark stage */
  padding: calc(64 * var(--u)) calc(10 * var(--u)) 0 calc(16 * var(--u));
  border-radius: 0 calc(6 * var(--u)) calc(6 * var(--u)) 0;
  background:
    radial-gradient(circle at 78% 16%, #ffb547 0 calc(2.5 * var(--u)), transparent calc(3.5 * var(--u))),
    radial-gradient(circle at 60% 9%, #2ee6d6 0 calc(2 * var(--u)), transparent calc(3 * var(--u))),
    radial-gradient(circle at 88% 30%, #ff4d9d 0 calc(2 * var(--u)), transparent calc(3 * var(--u))),
    linear-gradient(90deg, #e4ddcf, #fbf7ef 18%);
  color: #5a44b8;
  backface-visibility: hidden;
}

.page b { font-size: calc(17 * var(--u)); font-weight: 800; line-height: 0.95; }
.page span { height: calc(3 * var(--u)); border-radius: calc(2 * var(--u)); background: rgb(20 20 40 / 0.16); }
.page span:nth-of-type(2) { width: 70%; }
.page small { color: #6b6478; font-size: calc(7 * var(--u)); font-style: italic; }

/* the heart's shadow on the page, stronger once it has popped up */
.page::before {
  content: '';
  position: absolute;
  top: calc(18 * var(--u));
  left: calc(8 * var(--u));
  width: calc(40 * var(--u));
  height: calc(46 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(40 10 50 / 0.4), transparent);
  opacity: 0.4;
  transition: opacity 0.9s;
}

/* the half-open cover shades the page */
.page::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(20 10 40 / 0.55), rgb(20 10 40 / 0.1) 85%);
  transition: opacity 0.9s;
}

.greeting:is(:hover, :focus-visible) .page::before { opacity: 1; }
.greeting:is(:hover, :focus-visible) .page::after { opacity: 0.12; }

/* The pop-up is a floating layer: each half stays parallel to its own page, 16 units in front of it.
   Two such planes meet 16 units × cot(half the opening angle) from the spine: that is --x0. */
.pop {
  position: absolute;
  top: calc(12 * var(--u));
  left: 0;
  width: calc(28 * var(--u));
  height: calc(48 * var(--u));
  background:
    radial-gradient(circle at 50% 22%, rgb(255 255 255 / 0.75) 0 calc(2.5 * var(--u)), transparent calc(6 * var(--u))),
    linear-gradient(170deg, #ff4d9d, #ff817a);
  /* the right half of a heart: its middle line is the left edge. A mask, not clip-path: path(),
     because path() is in pixels and would not scale with --u; the SVG's viewBox is the box, 28 × 48,
     stretched to whatever size the box is */
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 48'%3E%3Cpath d='M0 9 C 3 3 7 0 12 0 C 21 0 28 6 28 16 C 28 28 16 38 0 48 Z'/%3E%3C/svg%3E") 0 0 / 100% 100% no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 48'%3E%3Cpath d='M0 9 C 3 3 7 0 12 0 C 21 0 28 6 28 16 C 28 28 16 38 0 48 Z'/%3E%3C/svg%3E") 0 0 / 100% 100% no-repeat;
  transform: translate3d(var(--x0), 0, calc(16 * var(--u)));
  opacity: var(--pop); /* fades in as it rises; behind the closed cover it is never meant to show */
  transition: transform 0.9s cubic-bezier(0.3, 1.15, 0.45, 1), opacity 0.35s;
}

/* the left half rides on the cover's inside, turned round to face the right half
   (turning it round mirrors it, so its middle line is drawn on its right edge) */
.pop-left {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 48'%3E%3Cpath d='M28 9 C 25 3 21 0 16 0 C 7 0 0 6 0 16 C 0 28 12 38 28 48 Z'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 48'%3E%3Cpath d='M28 9 C 25 3 21 0 16 0 C 7 0 0 6 0 16 C 0 28 12 38 28 48 Z'/%3E%3C/svg%3E");
  transform: translate3d(var(--x0), 0, calc(-16 * var(--u))) rotateY(180deg);
}

/* the front cover: two faces back to back, hinged on the spine */
.cover {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform-origin: 0 50%;
  transform: translateZ(calc(2 * var(--u))) rotateY(var(--open));
  transition: transform 0.9s cubic-bezier(0.3, 1.15, 0.45, 1);
}

.front,
.inside {
  position: absolute;
  inset: 0;
  display: grid;
  border-radius: 0 calc(6 * var(--u)) calc(6 * var(--u)) 0;
  backface-visibility: hidden;
}

.front {
  place-items: center;
  background:
    radial-gradient(circle at 22% 18%, rgb(255 255 255 / 0.75) 0 calc(2 * var(--u)), transparent calc(3 * var(--u))),
    radial-gradient(circle at 76% 26%, #ffb547 0 calc(3 * var(--u)), transparent calc(4 * var(--u))),
    radial-gradient(circle at 30% 80%, #2ee6d6 0 calc(2.5 * var(--u)), transparent calc(3.5 * var(--u))),
    linear-gradient(150deg, #6a45f5, #d1206f); /* deep enough for the white words, 5.1:1 at the worst end */
}

.front b {
  padding: calc(10 * var(--u)) calc(12 * var(--u));
  border: calc(2 * var(--u)) solid rgb(255 255 255 / 0.85);
  border-radius: 50%;
  color: #fff;
  font-size: calc(15 * var(--u));
  line-height: 1;
  text-align: center;
}

/* the inside of the cover, seen once it swings past 90° */
.inside {
  place-items: end center;
  padding-bottom: calc(14 * var(--u));
  border-radius: calc(6 * var(--u)) 0 0 calc(6 * var(--u));
  background:
    repeating-linear-gradient(135deg, rgb(139 108 255 / 0.12) 0 calc(6 * var(--u)), transparent calc(6 * var(--u)) calc(12 * var(--u))),
    linear-gradient(270deg, #e4ddcf, #fbf7ef 18%);
  color: #5a44b8;
  font-size: calc(7 * var(--u));
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transform: rotateY(180deg);
}`,
  },

  tiltgallery: {
    how: [
      'CSS cannot read the pointer, so JS does exactly two things on <code>pointermove</code>: write <code>--rx</code> / <code>--ry</code> for the board and a <code>--lift</code> between 0 and 1 on every photo. All motion is CSS.',
      'The pointer is measured against the <b>wrapper</b>, which never moves — only the board inside it tilts. Measuring the tilted board itself would change the numbers you are measuring, and the wall would wobble.',
      'A photo\'s lift is how close the pointer is to its centre, in tile sizes, eased with a smoothstep: <code>t * t * (3 - 2 * t)</code>. CSS turns it into <code>translateZ(calc(var(--lift) * 42 units))</code>, so the nearest photo rises most and its neighbours a little.',
      'Each photo\'s shadow is a separate layer that stays on the board: as the photo rises, the shadow only fades in and slides away. That gap between them is what reads as height.',
      'One custom property sets every transition\'s duration: 0.14s while the pointer drives (it tracks tightly), 0.7s after it leaves, so everything eases home together.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, text included, so the wall is the same share of a gallery card, the editor and a recording canvas. JS writes only angles and a 0-to-1 lift, never a length, so nothing it sets escapes the scale.',
    ],
    html: `<div class="scene" tabindex="0" role="img" aria-label="Wall of photos that turns toward the pointer, the nearest photo lifting off it">
  <div class="wall">
    <div class="board">
      <div class="cell"><i></i></div>
      <div class="cell"><i></i></div>
      <div class="cell"><i></i></div>
      <div class="cell"><i></i></div>
      <div class="cell"><i></i></div>
      <div class="cell"><i></i></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the wall is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.37vmin;
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
  perspective: calc(800 * var(--u));
}

/* the wrapper never moves: JS measures the pointer against it */
.wall {
  --rx: 0deg;  /* set from JS */
  --ry: 0deg;
  --t: 0.7s;   /* long, soft ease back to rest… */
  touch-action: none;
  transform-style: preserve-3d;
}

.wall.is-live { --t: 0.14s; } /* …but tight while the pointer is driving */

/* the board: leans back a little at rest, then turns to face the pointer */
.board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, calc(62 * var(--u)));
  grid-auto-rows: calc(62 * var(--u));
  gap: calc(9 * var(--u));
  padding: calc(10 * var(--u));
  border-radius: calc(14 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(calc(12deg + var(--rx))) rotateY(var(--ry));
  transition: transform var(--t) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.board::before {
  content: '';
  position: absolute;
  inset: 0;
  border: calc(1 * var(--u)) solid rgb(140 150 220 / 0.34);
  border-radius: inherit;
  background: rgb(20 24 48 / 0.7);
  transform: translateZ(calc(-1 * var(--u))); /* a hair behind the photos, never in their plane */
}

.cell {
  --lift: 0; /* set from JS, 0…1 */
  position: relative;
  transform-style: preserve-3d;
}

/* the shadow stays on the board and spreads as the photo rises */
.cell::before {
  content: '';
  position: absolute;
  inset: calc(6 * var(--u));
  border-radius: calc(10 * var(--u));
  background: rgb(0 0 0 / 0.3);
  box-shadow: 0 0 calc(10 * var(--u)) calc(5 * var(--u)) rgb(0 0 0 / 0.3); /* static blur: only opacity and position move */
  opacity: calc(var(--lift) * 0.9);
  transform: translate3d(calc(var(--lift) * 5 * var(--u)), calc(var(--lift) * 9 * var(--u)), calc(1 * var(--u)));
  transition: transform var(--t), opacity var(--t);
}

/* the photo: a white print with a gradient "picture" */
.cell i {
  position: absolute;
  inset: 0;
  border: calc(3 * var(--u)) solid #fdfcf8;
  border-radius: calc(7 * var(--u));
  transform: translateZ(calc(2 * var(--u) + var(--lift) * 42 * var(--u))) scale(calc(1 + var(--lift) * 0.06));
  transition: transform var(--t) cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* a sheen that brightens as the photo comes up */
.cell i::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: calc(4 * var(--u));
  background: linear-gradient(125deg, rgb(255 255 255 / 0.5), transparent 45%);
  opacity: var(--lift);
  transition: opacity var(--t);
}

.cell:nth-child(1) i {
  background:
    radial-gradient(circle at 50% 72%, #fff3c4 0 8%, transparent 9%),
    linear-gradient(180deg, #8b6cff 0%, #ff4d9d 55%, #ffb547 74%, #2a1840 75%);
}

.cell:nth-child(2) i {
  background:
    radial-gradient(circle at 74% 26%, #fff 0 7%, transparent 8%),
    linear-gradient(180deg, #8fdcff 0 50%, #2ee6d6 51%, #0b5f78 100%);
}

.cell:nth-child(3) i {
  background:
    conic-gradient(from 148deg at 34% 34%, #3b2a78 0 64deg, transparent 0),
    conic-gradient(from 144deg at 70% 48%, #5a3fb0 0 72deg, transparent 0),
    linear-gradient(180deg, #ffd9a0, #ff4d9d);
}

.cell:nth-child(4) i {
  background:
    radial-gradient(circle at 26% 30%, #fff 0 calc(2 * var(--u)), transparent calc(3 * var(--u))),
    radial-gradient(circle at 62% 18%, #fff 0 calc(1.5 * var(--u)), transparent calc(2.5 * var(--u))),
    radial-gradient(circle at 82% 52%, #fff 0 calc(2 * var(--u)), transparent calc(3 * var(--u))),
    radial-gradient(circle at 70% 76%, #f4f1d0 0 calc(7 * var(--u)), transparent calc(8 * var(--u))),
    linear-gradient(180deg, #0b0d2a, #3a2a7a);
}

.cell:nth-child(5) i {
  background:
    radial-gradient(ellipse 90% 40% at 20% 100%, #c9761e 0 60%, transparent 61%),
    radial-gradient(ellipse 80% 45% at 85% 96%, #e39a3b 0 60%, transparent 61%),
    radial-gradient(circle at 70% 30%, #fff6d8 0 9%, transparent 10%),
    linear-gradient(180deg, #ffcf7a, #ffb547);
}

.cell:nth-child(6) i {
  background:
    linear-gradient(170deg, transparent 30%, rgb(46 230 214 / 0.7) 38%, transparent 52%),
    linear-gradient(160deg, transparent 44%, rgb(139 108 255 / 0.8) 54%, transparent 66%),
    linear-gradient(180deg, #06142a 0 80%, #0c2a2a 80%);
}

/* the keyboard: Tab to it and it leans as it would for a pointer near the top right, even with
   the pointer resting on the canvas (!important beats the pose the script writes inline) */
.scene:focus-visible .wall { --rx: 4deg !important; --ry: 6deg !important; }
.scene:focus-visible .cell { --lift: 0 !important; }
.scene:focus-visible .cell:nth-child(3) { --lift: 1 !important; }`,
    js: `const scene = document.querySelector('.scene');
const wall = document.querySelector('.wall');
const cells = [...wall.querySelectorAll('.cell')];
const COLS = 3;
const ROWS = 2;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function move(e) {
  // the wrapper never moves, so its box is a stable ruler: 0…1 across the wall
  const r = wall.getBoundingClientRect();
  const u = (e.clientX - r.left) / r.width;
  const v = (e.clientY - r.top) / r.height;

  // the board turns to face the pointer
  wall.style.setProperty('--ry', clamp(u * 2 - 1, -1.4, 1.4) * 11 + 'deg');
  wall.style.setProperty('--rx', clamp(1 - v * 2, -1.4, 1.4) * 9 + 'deg');

  // each photo lifts by how close the pointer is to its centre, in tile sizes
  cells.forEach((cell, i) => {
    const dx = u * COLS - ((i % COLS) + 0.5);
    const dy = v * ROWS - (Math.floor(i / COLS) + 0.5);
    const t = clamp(1 - Math.hypot(dx, dy) / 1.25, 0, 1);
    cell.style.setProperty('--lift', t * t * (3 - 2 * t)); // smoothstep
  });
  wall.classList.add('is-live');
}

function leave() {
  wall.classList.remove('is-live'); // the long transition is back: all eases home
  wall.style.removeProperty('--rx');
  wall.style.removeProperty('--ry');
  cells.forEach((cell) => cell.style.removeProperty('--lift'));
}

scene.addEventListener('pointerdown', move);
scene.addEventListener('pointermove', move);
scene.addEventListener('pointerleave', leave);
scene.addEventListener('pointercancel', leave);`,
  },

  bookshelf: {
    how: [
      'Each book is a box from four faces around its spine: the spine at the front, two covers turned ±90° on the spine\'s edges with <code>transform-origin</code>, and the page block laid flat on top. The bottom and the back are never seen, so they are not drawn. Every face is <code>box-sizing: border-box</code>, so the front cover’s padding and the page block’s border sit inside it: the covers are exactly the spine’s height and the pages’ depth.',
      'The slots (one per book, laid out by flexbox on the tilted shelf) are the hit targets. They are all in one plane, so the shelf gets <code>pointer-events: none</code> and only the slots <code>auto</code>; the books inside are <code>pointer-events: none</code> and free to move. The one book that is out turns <code>pointer-events</code> back on: it is drawn in front of its neighbours’ slots, and a pointer moving onto it must stay on it, not land on the slot behind it.',
      'A forced hover (the checks make every <code>:hover</code> match, to judge the hover pose) holds <code>:hover</code> on every slot at once. <code>.slot:hover:not(:has(~ .slot:hover))</code> pulls out only the last of them, so the held pose is one a pointer can make; with a real pointer only one slot is hovered and the rule reads as plain <code>:hover</code>.',
      'The book turns around its own middle: <code>transform-origin: 50% 50% -36 units</code> puts the pivot half its depth <i>behind</i> the spine.',
      'Pulling out uses the separate <code>translate</code> and <code>rotate</code> properties instead of one <code>transform</code>, so each gets its own transition and delay: slide out first, then turn; on the way back, turn first, then slide in. It never swings through its neighbours.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, text included, so the shelf is the same share of a gallery card, the editor and a recording canvas. Each book\'s thickness and height come from its style attribute as plain numbers, and CSS multiplies them by <code>--u</code>.',
    ],
    html: `<div class="scene">
  <div class="shelf">
    <i class="board"></i><i class="edge"></i><i class="end"></i>
${BOOKS.map(
  ([spine, title, t, h, c]) => `    <div class="slot" tabindex="0" style="--t:${t}; --h:${h}; --c:${c}">
      <div class="book"><i>${spine}</i><i></i><i><b>${title}</b></i><i></i></div>
    </div>`,
).join('\n')}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the shelf is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.31vmin;
  perspective: calc(800 * var(--u));
}

/* one plane seen at an angle; its slots are coplanar, so only they catch the pointer */
.shelf {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: calc(3 * var(--u));
  padding: 0 calc(12 * var(--u));
  pointer-events: none;
  transform-style: preserve-3d;
  /* turned, the shelf reaches further out on the right than on the left, and a pulled-out book
     further still: move it left by that much, so it is centred */
  translate: calc(-15 * var(--u)) 0;
  transform: rotateX(-16deg) rotateY(-28deg);
}

/* the back of the bookcase, behind the books (they are 72 units deep) */
.shelf::before {
  content: '';
  position: absolute;
  inset: calc(-18 * var(--u)) calc(-6 * var(--u)) 0;
  border-radius: calc(6 * var(--u)) calc(6 * var(--u)) 0 0;
  background: linear-gradient(180deg, #1c1f3c, #262650);
  transform: translateZ(calc(-80 * var(--u)));
}

/* the board: its top (laid flat), its front edge and its right end */
.board, .edge, .end {
  position: absolute;
  left: calc(-6 * var(--u));
}

.board {
  right: calc(-6 * var(--u));
  bottom: 0;
  height: calc(90 * var(--u));
  background: linear-gradient(0deg, #b77a33, #6e4520);
  transform-origin: 50% 100%;
  transform: translateZ(calc(10 * var(--u))) rotateX(90deg);
}

.edge {
  top: 100%;
  right: calc(-6 * var(--u));
  height: calc(10 * var(--u));
  background: #d9953f;
  transform: translateZ(calc(10 * var(--u)));
}

.end {
  top: 100%;
  left: calc(100% + 6 * var(--u));
  width: calc(90 * var(--u));
  height: calc(10 * var(--u));
  background: #8a5a28;
  transform-origin: 0 50%;
  transform: translateZ(calc(10 * var(--u))) rotateY(90deg);
}

/* a slot is exactly the book's spine at rest, and never moves */
.slot {
  position: relative;
  flex: none;
  /* --t and --h come from the style attribute as plain numbers; the unit is the model's */
  width: calc(var(--t) * var(--u));
  height: calc(var(--h) * var(--u));
  outline: none;
  cursor: pointer;
  pointer-events: auto;
  transform-style: preserve-3d;
}

/* the book turns around its own middle, 36 units behind the spine */
.book {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform-style: preserve-3d;
  transform-origin: 50% 50% calc(-36 * var(--u));
  translate: 0 0 0;
  rotate: y 0deg;
  /* going back: turn straight first, then slide in */
  transition:
    translate 0.4s cubic-bezier(0.3, 0.7, 0.4, 1) 0.35s,
    rotate 0.35s ease-in-out;
}

/* only the last slot that reads as hovered comes out: a pointer only ever hovers one, but a
   pose check forces :hover on all of them, and five books out at once is a pose no visitor
   can make (every book in the air, turned into its neighbour, the shelf left behind) */
.slot:hover:not(:has(~ .slot:hover)) .book,
.slot:focus-visible .book {
  /* the book that is out is drawn over its neighbours' slots, so it catches the pointer itself:
     otherwise moving onto it hovers the slot behind it and swaps it for a neighbour */
  pointer-events: auto;
  /* out further than the book is deep (72 units), so it is clear of its neighbours before it turns */
  translate: 0 calc(-5 * var(--u)) calc(86 * var(--u));
  rotate: y -36deg;
  /* coming out: slide all the way first, then turn */
  transition:
    translate 0.4s cubic-bezier(0.3, 0.7, 0.4, 1),
    rotate 0.5s cubic-bezier(0.3, 1.2, 0.5, 1) 0.4s;
}

/* every face is exactly the size it is given: the front cover's padding and the page block's
   border are inside it (border-box), so the covers are the spine's height and the pages' depth, and
   nothing sticks out past the page block. The frame is the whole page, so no site stylesheet sets
   this for the model: it says it itself */
.book i {
  position: absolute;
  top: 0;
  box-sizing: border-box;
  height: 100%;
}

/* the spine */
.book i:nth-child(1) {
  left: 0;
  width: 100%;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: calc(2 * var(--u));
  background:
    linear-gradient(180deg, transparent calc(10 * var(--u)), rgb(255 255 255 / 0.55) calc(10 * var(--u)) calc(12 * var(--u)), transparent calc(12 * var(--u)) calc(100% - 12 * var(--u)), rgb(255 255 255 / 0.55) calc(100% - 12 * var(--u)) calc(100% - 10 * var(--u)), transparent 0),
    linear-gradient(90deg, color-mix(in srgb, var(--c) 60%, #000), var(--c) 30%, var(--c) 65%, color-mix(in srgb, var(--c) 70%, #000));
  color: #fff;
  /* a dark halo round the white words, so they read on the brightest spines and covers too: on the
     teal and the amber they were 1.6:1 */
  text-shadow: 0 0 calc(1 * var(--u)) rgb(0 0 0 / 0.75), 0 0 calc(3 * var(--u)) rgb(0 0 0 / 0.55);
  font-size: calc(8 * var(--u));
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  writing-mode: vertical-rl;
  backface-visibility: hidden;
}

/* back cover: hinged on the spine's left edge, turned to face left */
.book i:nth-child(2) {
  left: calc(-72 * var(--u));
  width: calc(72 * var(--u));
  background: color-mix(in srgb, var(--c) 55%, #000);
  transform-origin: 100% 50%;
  transform: rotateY(-90deg);
}

/* front cover: hinged on the right edge, turned to face right */
.book i:nth-child(3) {
  left: 100%;
  display: grid;
  place-items: center;
  width: calc(72 * var(--u));
  padding: calc(8 * var(--u));
  border-radius: 0 calc(3 * var(--u)) calc(3 * var(--u)) 0;
  background:
    radial-gradient(circle at 50% 36%, rgb(255 255 255 / 0.35) 0 calc(12 * var(--u)), transparent calc(13 * var(--u))),
    linear-gradient(160deg, color-mix(in srgb, var(--c) 85%, #fff), color-mix(in srgb, var(--c) 70%, #000));
  color: #fff;
  text-shadow: 0 0 calc(1 * var(--u)) rgb(0 0 0 / 0.75), 0 0 calc(3 * var(--u)) rgb(0 0 0 / 0.55); /* see the spine */
  font-size: calc(9 * var(--u));
  text-align: center;
  transform-origin: 0 50%;
  transform: rotateY(90deg);
  backface-visibility: hidden;
}

/* the top of the page block, laid flat, running back from the spine */
.book i:nth-child(4) {
  top: calc(-72 * var(--u));
  left: 0;
  width: 100%;
  height: calc(72 * var(--u));
  border: solid color-mix(in srgb, var(--c) 70%, #000);
  border-width: 0 calc(2 * var(--u)) calc(2 * var(--u));
  background: repeating-linear-gradient(90deg, #f3ecdc 0 calc(2 * var(--u)), #d9cfb8 calc(2 * var(--u)) calc(3 * var(--u)));
  transform-origin: 50% 100%;
  transform: rotateX(90deg);
}`,
  },

  dotorbit: {
    how: [
      'Each orbit is a circle laid over with <code>rotateX(72deg)</code> and turned with <code>rotateZ(--phi)</code>; the dots live inside it, so they share its tilt and pass in front of and behind the core in real depth.',
      'A dot goes round with <code>rotateZ(θ) translateX(r) rotateZ(−θ)</code>: step out to the orbit, go round, and turn back by the same angle, so it travels without spinning. Then <code>rotateX(-72deg) rotateZ(-phi)</code> undoes the orbit\'s tilt so it faces the viewer.',
      'The whole atom turns slowly around Y. The core and every glow turn back by exactly as much with a second animation of the same length (reverse order, reverse signs), so nothing flat ever goes edge-on.',
      'A trail is just more copies of a dot running the same animation a little later (<code>--lag</code>), each smaller and fainter. Every delay has one full lap subtracted, so all of them are negative and no dot waits at the centre when the page loads.',
      'Laps are whole turns and the animations are <code>linear</code>, so the loop has no seam; three lap times (1.6s, 2.4s, 3.3s) and one reversed ring keep it from ever looking in sync.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the orbits are 76 units in radius and a dot 12 across, so the atom is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="atom" role="img" aria-label="Loading">
    <b></b>
${ORBITS.map(
  ([c, dur, dir, phi, n]) => `    <div class="orbit" style="--c:${c}; --dur:${dur}; --dir:${dir}; --phi:${phi}">
${Array.from({ length: n }, (_, d) =>
  [0, 1, 2].map((lag) => `      <i style="--p:${(d / n).toFixed(3)}; --lag:${lag}"></i>`).join('\n'),
).join('\n')}
    </div>`,
).join('\n')}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the atom is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.39vmin;
  /* where the loop starts: every animation is set 36s into its run, one shared moment, so the
     timing between them is kept. There the dots are spread round the core, and a paused atom
     (which shows this first frame) is centred; at 0s they bunch on one side */
  --t0: -36s;
  perspective: calc(800 * var(--u));
}

/* the whole atom turns slowly; everything flat inside turns back by the same amount */
.atom {
  position: relative;
  width: calc(152 * var(--u));
  height: calc(152 * var(--u));
  transform-style: preserve-3d;
  animation: atom-turn 16s linear var(--t0) infinite;
}

/* the core */
.atom b {
  position: absolute;
  inset: calc(50% - 20 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 40% 36%, #fff 0 7%, #c5b6ff 20%, #8b6cff 46%, #463680 70%, transparent 72%);
  animation: atom-face 16s linear var(--t0) infinite;
}

/* a soft halo that breathes (a gradient, no blur) */
.atom b::before {
  content: '';
  position: absolute;
  inset: calc(-16 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(139 108 255 / 0.45), transparent);
  animation: atom-breathe 1.6s ease-in-out var(--t0) infinite alternate;
}

/* an orbit: a circle laid over by 72°, its axis turned by --phi */
.orbit {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  transform-style: preserve-3d;
  transform: rotateZ(var(--phi)) rotateX(72deg);
}

/* the dashed track */
.orbit::before {
  content: '';
  position: absolute;
  inset: 0;
  border: calc(1 * var(--u)) dashed color-mix(in srgb, var(--c) 45%, transparent);
  border-radius: 50%;
}

/* a dot: an invisible carrier going round; --p spaces the dots, --lag makes the trail
   (same animation, a little later). One whole lap is subtracted so every delay is negative. */
.orbit i {
  position: absolute;
  top: calc(50% - 6 * var(--u));
  left: calc(50% - 6 * var(--u));
  width: calc(12 * var(--u));
  height: calc(12 * var(--u));
  transform-style: preserve-3d;
  animation: dot-orbit var(--dur) linear infinite var(--dir);
  animation-delay: calc(var(--t0) + var(--lag) * var(--dur) * 0.017 - var(--p) * var(--dur) - var(--dur));
}

/* the glow; trail copies are smaller and fainter */
.orbit i::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle,
    color-mix(in srgb, var(--c) 30%, #fff) 0 7%,
    var(--c) 24% 38%,
    color-mix(in srgb, var(--c) 30%, transparent) 56%,
    transparent 70%);
  opacity: calc(1 - var(--lag) * 0.3);
  scale: calc(1.25 - var(--lag) * 0.25);
  animation: atom-face 16s linear var(--t0) infinite;
}

@keyframes atom-turn {
  from { transform: rotateX(-16deg) rotateY(0deg); }
  to   { transform: rotateX(-16deg) rotateY(360deg); }
}

/* exactly undoes atom-turn: same duration, reversed order and signs */
@keyframes atom-face {
  from { transform: rotateY(0deg) rotateX(16deg); }
  to   { transform: rotateY(-360deg) rotateX(16deg); }
}

/* read right to left: undo the orbit's tilt, cancel the lap, step out, go round */
@keyframes dot-orbit {
  from { transform: rotateZ(0deg) translateX(calc(76 * var(--u))) rotateZ(0deg) rotateX(-72deg) rotateZ(calc(var(--phi) * -1)); }
  to   { transform: rotateZ(360deg) translateX(calc(76 * var(--u))) rotateZ(-360deg) rotateX(-72deg) rotateZ(calc(var(--phi) * -1)); }
}

@keyframes atom-breathe {
  from { opacity: 0.55; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1.1); }
}`,
  },

  blockstack: {
    how: [
      '<code>rotateX(58deg) rotateZ(45deg)</code> turns a flat 2×2 grid into an isometric floor; from then on "up" is simply <code>translateZ</code>. A block only needs the three faces this camera can ever see: the top, the +x side and the +y side.',
      'Blocks must arrive one by one but leave in whole columns (a bottom block cannot fly off from under the one on top of it). So the timing is split over <b>two nested animations</b>: the block drops in, and its column (the parent, holding a bottom and a top block) lifts away.',
      'Both are shared keyframes staggered with <code>animation-delay</code> from <code>--i</code> (block 0…7) and <code>--c</code> (column 0…3), so eight blocks need only one "arrive" and one "leave" animation.',
      'The invisible resets are timed to happen while something else hides them: a block snaps back up while its column is gone, and the column snaps back while both its blocks are scaled to 0 — so the loop never shows a jump.',
      'Every keyframe keeps the same function list (<code>translateZ … scale3d</code>), and <code>scale3d(0, 0, 0)</code> rather than <code>scale(0)</code>, because a 2D scale would leave a block\'s height standing as a line.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: a block is 34 units, and it drops in from 20 above its place, low enough that a drop onto the top layer stays inside the canvas, so the stack is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="stack" role="img" aria-label="Loading">
${Array.from(
  { length: 4 },
  (_, c) => `    <div class="col" style="--c:${c}">
      <div class="block" style="--i:${c}; --l:0"><i></i><i></i><i></i></div>
      <div class="block" style="--i:${c + 4}; --l:1"><i></i><i></i><i></i></div>
    </div>`,
).join('\n')}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the stack is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.44vmin;
  perspective: calc(800 * var(--u));
}

/* the floor is the stack's own plane, turned isometric; "up" is translateZ.
   The blocks and the columns all fly upwards and nothing ever goes below the plate, so the
   drawing sits well above its own layout box. translateY pushes the plate back down by that
   much, which centres what is actually drawn rather than what is laid out: the solid blocks,
   over the whole loop, since the eye places the stack by them and not by the faint plate. */
.stack {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, calc(38 * var(--u)));
  grid-auto-rows: calc(38 * var(--u));
  transform-style: preserve-3d;
  transform: translateY(calc(30 * var(--u))) rotateX(58deg) rotateZ(45deg);
}

/* the floor plate with the four landing places */
.stack::before {
  content: '';
  position: absolute;
  inset: calc(-8 * var(--u));
  border: calc(1 * var(--u)) dashed rgb(140 150 220 / 0.34);
  border-radius: calc(10 * var(--u));
  background:
    linear-gradient(90deg, transparent calc(50% - 1 * var(--u)), rgb(140 150 220 / 0.16) 0 calc(50% + 1 * var(--u)), transparent 0),
    linear-gradient(0deg, transparent calc(50% - 1 * var(--u)), rgb(140 150 220 / 0.16) 0 calc(50% + 1 * var(--u)), transparent 0),
    rgb(139 108 255 / 0.1);
  transform: translateZ(calc(-1 * var(--u)));
}

/* a column: lifts away once the cube is complete, one after the other */
.col {
  position: relative;
  margin: calc(2 * var(--u));
  transform-style: preserve-3d;
  transform-origin: 50% 50% calc(34 * var(--u)); /* the middle of the two-block column */
  animation: stack-leave 5s linear infinite;
  /* 3s further on than the blocks' own start, like them (see .block) */
  animation-delay: calc(var(--c) * 0.275s - 4.6s);
}

/* a block: pops up in the air, falls, bounces, sits; bottom layer first */
.block {
  --z: calc(var(--l) * 34 * var(--u)); /* resting height */
  --color: #8b6cff;
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform-origin: 50% 50% calc(17 * var(--u));
  animation: stack-arrive 5s linear infinite;
  /* 3s into the loop on load: the cube is built and has not begun to come apart, so the stack
     looks finished when it is paused, and every block is already mid-cycle */
  animation-delay: calc(var(--i) * 0.275s - 3s);
}

.block:nth-child(2) { --color: #2ee6d6; }

/* only the three faces we can ever see */
.block i {
  position: absolute;
  inset: 0;
  border-radius: calc(2 * var(--u));
}

.block i:nth-child(1) { /* top */
  background: color-mix(in srgb, var(--color) 55%, #fff);
  transform: translateZ(calc(34 * var(--u)));
}

.block i:nth-child(2) { /* +x side, stood up on its right edge */
  background: color-mix(in srgb, var(--color) 65%, #000);
  transform-origin: 100% 50%;
  transform: rotateY(90deg);
}

.block i:nth-child(3) { /* +y side, stood up on its bottom edge */
  background: var(--color);
  transform-origin: 50% 100%;
  transform: rotateX(-90deg);
}

@keyframes stack-arrive {
  0% {
    transform: translateZ(calc(var(--z) + 20 * var(--u))) scale3d(0, 0, 0);
    animation-timing-function: ease-out;
  }
  3% {
    transform: translateZ(calc(var(--z) + 20 * var(--u))) scale3d(1, 1, 1);
    animation-timing-function: ease-in; /* gravity */
  }
  10% {
    transform: translateZ(var(--z)) scale3d(1, 1, 1);
    animation-timing-function: ease-out;
  }
  12.5% {
    transform: translateZ(calc(var(--z) + 5 * var(--u))) scale3d(1, 1, 1);
    animation-timing-function: ease-in;
  }
  15%, 76.5% {
    transform: translateZ(var(--z)) scale3d(1, 1, 1);
  }
  /* its column is gone by now: reset out of sight */
  76.6%, 100% {
    transform: translateZ(calc(var(--z) + 20 * var(--u))) scale3d(0, 0, 0);
  }
}

@keyframes stack-leave {
  0% {
    transform: translateZ(0) rotateZ(0deg) scale3d(1, 1, 1);
    animation-timing-function: ease-in;
  }
  7%, 31.25% {
    transform: translateZ(calc(56 * var(--u))) rotateZ(90deg) scale3d(0, 0, 0);
  }
  /* both its blocks have reset by now: come back, still empty */
  31.35%, 100% {
    transform: translateZ(0) rotateZ(0deg) scale3d(1, 1, 1);
  }
}`,
  },
};
