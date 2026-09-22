/**
 * Paste-anywhere versions of the batch-c demos: plain HTML + CSS (+ JS), no Sass, no build step.
 * See snippets.ts for the format this file follows.
 */
import type { Snippet } from './snippet-utils';

export const snippetsC: Record<string, Snippet> = {
  flaptext: {
    how: [
      'Every cell is four half-height leaves: static <code>top</code>/<code>bottom</code> show the current split, and <code>fall</code>/<code>land</code> are the ones that animate between the old and new character.',
      'All four leaves read the same letter from <code>content: attr(data-c)</code>, so JS never touches a text node — it only ever writes a <code>data-c</code> attribute.',
      'To replay a CSS animation, JS removes the <code>.is-flip</code> class, reads a layout property to force the browser to flush styles, then re-adds the class.',
      '<code>animation-fill-mode: both</code> matters: outside its delay the falling leaf sits parked edge-on at <code>rotateX(-90deg)</code>, and the landing leaf holds its open pose until its own delay ends.',
      '<code>--i</code> staggers each cell by 45ms so the flips ripple across the row instead of firing together, and it carries on into the second row, so the board cascades.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: a cell is 21 × 34 of them, so the board is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="board" role="img" aria-label="Split-flap departure board cycling through city names">
  <div class="board-head"><span>Departures</span><b>Gate 3D</b></div>
  <div class="board-row">
    <span class="cell" style="--i:0"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:1"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:2"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:3"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:4"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:5"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:6"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:7"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
  </div>
  <div class="board-row">
    <span class="cell" style="--i:8"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:9"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:10"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:11"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:12"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:13"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:14"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
    <span class="cell" style="--i:15"><i class="cell-top"></i><i class="cell-bottom"></i><i class="cell-fall"></i><i class="cell-land"></i></span>
  </div>
</div>`,
    css: `/* One row of eight cells is a shape the band cannot hold: it draws three times wider than it
   is tall, so at the 92vmin width limit the board stands 30vmin high, under the 40vmin floor.
   Two destinations is what a departure board shows anyway. */
.board {
  /* one base unit: every length below is a multiple of it, so the board is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.40vmin;
  display: grid;
  gap: calc(8 * var(--u));
  padding: calc(12 * var(--u)) calc(12 * var(--u)) calc(10 * var(--u));
  border: calc(1 * var(--u)) solid #3a4070;
  border-radius: calc(12 * var(--u));
  background: linear-gradient(160deg, #211c3c, #0b0d18 70%);
  box-shadow: 0 calc(18 * var(--u)) calc(30 * var(--u)) calc(-18 * var(--u)) rgb(0 0 0 / 0.8);
}

.board-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #949bc0;
  font-size: calc(9 * var(--u));
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.board-head b {
  color: #ffb547;
  font-weight: 800;
}

.board-row {
  display: flex;
  gap: calc(3 * var(--u));
}

.cell {
  position: relative;
  width: calc(21 * var(--u));
  height: calc(34 * var(--u));
  perspective: calc(140 * var(--u)); /* its own close camera: a 17-unit leaf needs a strong one to read as falling */
}

/* the slit between the two halves */
.cell::after {
  content: '';
  position: absolute;
  top: calc(50% - 0.5 * var(--u));
  right: 0;
  left: 0;
  height: calc(1 * var(--u));
  background: #05060c;
}

.cell i {
  position: absolute;
  right: 0;
  left: 0;
  height: 50%;
  overflow: hidden; /* a leaf, so clipping here flattens nothing */
  backface-visibility: hidden;
}

/* the whole character, twice the leaf's height; the leaf shows one half of it */
.cell i::before {
  content: attr(data-c);
  position: absolute;
  right: 0;
  left: 0;
  height: 200%;
  color: #f4f1e6;
  font: 800 calc(22 * var(--u))/calc(34 * var(--u)) ui-monospace, monospace;
  text-align: center;
}

.cell-top,
.cell-fall {
  top: 0;
  border-radius: calc(4 * var(--u)) calc(4 * var(--u)) 0 0;
  background: #1a1e36;
}

.cell-top::before,
.cell-fall::before {
  top: 0;
}

/* bottom halves: slightly lighter, as if lit from above */
.cell-bottom,
.cell-land {
  bottom: 0;
  border-radius: 0 0 calc(4 * var(--u)) calc(4 * var(--u));
  background: #20254a;
}

.cell-bottom::before,
.cell-land::before {
  bottom: 0;
}

.cell-fall {
  transform: rotateX(-90deg); /* parked edge-on = invisible */
  transform-origin: 50% 100%;
}

.cell-land {
  transform-origin: 50% 0;
}

/* "both": during its delay the landing leaf waits edge-on at 90deg, afterwards it stays down
   and simply covers the static bottom half */
.cell.is-flip .cell-fall {
  animation: flap-fall 0.17s ease-in calc(var(--i) * 45ms) both;
}

.cell.is-flip .cell-land {
  animation: flap-land 0.17s ease-out calc(var(--i) * 45ms + 0.17s) both;
}

@keyframes flap-fall {
  from { transform: rotateX(0deg); }
  to   { transform: rotateX(-90deg); }
}

@keyframes flap-land {
  from { transform: rotateX(90deg); }
  to   { transform: rotateX(0deg); }
}`,
    js: `var WORDS = ['NEW YORK', 'HELSINKI', 'LISBON', 'BANGKOK', 'SAN JOSE', 'CSS 3D'];

// one list of cells per row; the two rows show two destinations, one behind the other
var rows = Array.prototype.map.call(document.querySelectorAll('.board-row'), function (row) {
  return Array.prototype.map.call(row.querySelectorAll('.cell'), function (cell) {
    return { cell: cell, leaves: cell.querySelectorAll('i'), char: ' ' }; // top, bottom, fall, land
  });
});

function show(cells, word, animate) {
  var text = word + '        '; // pad so every cell always has a character
  cells.forEach(function (c, i) {
    var next = text[i];
    if (next === c.char && animate) return;
    var top = c.leaves[0];
    var bottom = c.leaves[1];
    var fall = c.leaves[2];
    var land = c.leaves[3];
    top.dataset.c = next; // revealed as the old top half falls
    land.dataset.c = next; // lands on top of the old bottom half
    fall.dataset.c = c.char;
    bottom.dataset.c = c.char;
    c.char = next;
    if (!animate) return;
    // restart the CSS animation: drop the class, force a style flush, add it again
    c.cell.classList.remove('is-flip');
    void c.cell.offsetWidth;
    c.cell.classList.add('is-flip');
  });
}

var index = 0;
rows.forEach(function (cells, r) {
  show(cells, WORDS[r % WORDS.length], false);
});

// The site pauses a model by marking the frame's <html data-paused>; a visitor may ask for less
// motion. Either way the board holds its word.
var calm = matchMedia('(prefers-reduced-motion: reduce)');
setInterval(function () {
  if (document.documentElement.hasAttribute('data-paused') || calm.matches) return;
  index = (index + 1) % WORDS.length;
  rows.forEach(function (cells, r) {
    show(cells, WORDS[(index + r) % WORDS.length], true);
  });
}, 2600);`,
  },

  shadowtext: {
    how: [
      'The same word is stacked 21 times, each copy one step further down the Z axis via <code>translateZ(calc(var(--i) * -1.2 * var(--u)))</code>, where <code>--u</code> is the one base unit every length here is a multiple of. Seen at an angle the copies merge into a solid extrusion.',
      '<code>rotateX(54deg) rotateZ(-32deg)</code> lays the whole stack on an isometric-looking floor: tip it back, then turn it on the floor.',
      'Each copy gets slightly darker as <code>--i</code> grows (<code>hsl(... calc(46% - var(--i) * 1.3%))</code>) — a cheap ambient shadow down the "sides" with no lighting math.',
      'The front copy carries a gradient clipped to the text with <code>background-clip: text</code>; the last, deepest copy is blurred into a floor shadow instead.',
      '<code>alternate</code> + <code>ease-in-out</code> makes the sway loop seamless: the way back is the mirror image of the way there.',
      'The floor shadow hangs below the word, so the whole stack is lifted by half of it. What is drawn is then centred on the model box, which the word on its own would not be.',
    ],
    html: `<div class="scene">
  <div class="depth">
    <span style="--i:0">Depth</span>
    <span aria-hidden="true" style="--i:1">Depth</span>
    <span aria-hidden="true" style="--i:2">Depth</span>
    <span aria-hidden="true" style="--i:3">Depth</span>
    <span aria-hidden="true" style="--i:4">Depth</span>
    <span aria-hidden="true" style="--i:5">Depth</span>
    <span aria-hidden="true" style="--i:6">Depth</span>
    <span aria-hidden="true" style="--i:7">Depth</span>
    <span aria-hidden="true" style="--i:8">Depth</span>
    <span aria-hidden="true" style="--i:9">Depth</span>
    <span aria-hidden="true" style="--i:10">Depth</span>
    <span aria-hidden="true" style="--i:11">Depth</span>
    <span aria-hidden="true" style="--i:12">Depth</span>
    <span aria-hidden="true" style="--i:13">Depth</span>
    <span aria-hidden="true" style="--i:14">Depth</span>
    <span aria-hidden="true" style="--i:15">Depth</span>
    <span aria-hidden="true" style="--i:16">Depth</span>
    <span aria-hidden="true" style="--i:17">Depth</span>
    <span aria-hidden="true" style="--i:18">Depth</span>
    <span aria-hidden="true" style="--i:19">Depth</span>
    <span aria-hidden="true" style="--i:20">Depth</span>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the word is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.51vmin;
  perspective: calc(800 * var(--u));
}

.depth {
  position: relative;
  transform-style: preserve-3d;
  transform: translateY(calc(-17 * var(--u))) rotateX(54deg) rotateZ(-32deg);
  animation: sway 7s ease-in-out infinite alternate;
  font-size: calc(50 * var(--u));
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  user-select: none;
}

.depth span {
  position: absolute;
  inset: 0;
  /* 1.2 units per step: at this tilt that is about one screen pixel on a card, so no gaps show */
  transform: translateZ(calc(var(--i) * -1.2 * var(--u)));
  color: hsl(252 62% calc(46% - var(--i) * 1.3%));
}

/* the front copy gives the element its size and carries the gradient */
.depth span:first-child {
  position: relative;
  display: block;
  background: linear-gradient(100deg, #2ee6d6, #8b6cff 45%, #ff4d9d);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* the last copy is the soft shadow on the floor: static, so the blur costs nothing per frame */
.depth span:last-child {
  color: rgb(0 0 0 / 0.55);
  text-shadow: 0 0 calc(10 * var(--u)) rgb(0 0 0 / 0.6);
  transform: translateZ(calc(-25 * var(--u))) translate(calc(-5 * var(--u)), calc(7 * var(--u)));
}

/* the 17-unit lift answers the floor shadow and the extrusion, which both hang below the word:
   the word plus what it casts is what has to sit in the middle of the box */
@keyframes sway {
  from { transform: translateY(calc(-17 * var(--u))) rotateX(56deg) rotateZ(-40deg); }
  to   { transform: translateY(calc(-17 * var(--u))) rotateX(48deg) rotateZ(-22deg); }
}`,
  },

  wordcube: {
    how: [
      'Face <code>n</code> is turned <code>n</code> quarter turns backwards around X, then pushed out with <code>translateZ</code> by half the prism’s depth — the same "turn, then push" recipe as a basic cube, just on one axis.',
      'The whole prism is pulled back by half its depth (<code>translateZ(calc(-18 * var(--u)))</code>) so the face currently in front sits exactly at z&nbsp;=&nbsp;0 and stays crisp. <code>--u</code> is the one base unit every length here is a multiple of.',
      'The keyframes hold on each face for a stretch, then turn 90deg with their own <code>cubic-bezier</code> — a snappy, springy turn rather than a constant spin.',
      '<code>backface-visibility: hidden</code> stops a word from showing mirrored through the box while it turns.',
      '<code>360deg</code> looks exactly like <code>0deg</code>, so the loop has no seam.',
      'Mid-turn the prism stands on an edge and sweeps <code>√2 × 36</code> units tall, half of that above the resting face and half below. That corner, not the face, is what the band has to hold.',
    ],
    html: `<div class="scene">
  <div class="wordcube">
    <span>We make</span>
    <span class="prism">
      <span style="--i:0;--c:#8b6cff">design</span>
      <span style="--i:1;--c:#2ee6d6">code</span>
      <span style="--i:2;--c:#ff4d9d">motion</span>
      <span style="--i:3;--c:#ffb547">brands</span>
    </span>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the line is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.83vmin;
  perspective: calc(800 * var(--u));
}

/* The lead-in sits over the prism, not beside it: side by side the line is five times wider
   than it is tall, so at the 92vmin width limit it stands 18vmin high, well under the 40vmin
   floor. Stacked, it is the shape of the headline it is imitating anyway. */
.wordcube {
  display: grid;
  justify-items: center;
  gap: calc(9 * var(--u));
  /* no colour of its own: the lead-in is written on the stage, so it takes the stage's ink */
  font-size: calc(21 * var(--u));
  font-weight: 800;
  white-space: nowrap;
  transform-style: preserve-3d;
  /* measured by what it paints, the turning prism reaches further below the line than the lead-in
     does above it, so the drawing hangs below the layout box; this lift centres it */
  transform: translateY(calc(-5 * var(--u)));
}

.prism {
  position: relative;
  display: inline-block;
  width: calc(104 * var(--u));
  height: calc(36 * var(--u)); /* face height = prism depth: its cross-section is a square */
  transform-style: preserve-3d;
  animation: cube-turn 9s infinite;
}

.prism span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding-left: calc(13 * var(--u));
  border-radius: calc(8 * var(--u));
  background: color-mix(in srgb, var(--c) 26%, transparent);
  /* the edge is an inner line, not a border: turning, a face passes side-on, where a hairline
     border breaks up; the inner glow is the soft shade that survives */
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) color-mix(in srgb, var(--c) 80%, transparent),
    inset 0 0 calc(18 * var(--u)) color-mix(in srgb, var(--c) 32%, transparent);
  /* the face is see-through, so the word is really on the stage: its colour leans towards the
     stage's ink, lighter on a dark stage and darker on a light one, so it reads on both */
  color: color-mix(in srgb, var(--c) 55%, currentColor);
  backface-visibility: hidden;
  transform: rotateX(calc(var(--i) * -90deg)) translateZ(calc(18 * var(--u)));
}

@keyframes cube-turn {
  0%, 19% {
    transform: translateZ(calc(-18 * var(--u))) rotateX(0deg);
    animation-timing-function: cubic-bezier(0.6, -0.3, 0.3, 1.3);
  }

  25%, 44% {
    transform: translateZ(calc(-18 * var(--u))) rotateX(90deg);
    animation-timing-function: cubic-bezier(0.6, -0.3, 0.3, 1.3);
  }

  50%, 69% {
    transform: translateZ(calc(-18 * var(--u))) rotateX(180deg);
    animation-timing-function: cubic-bezier(0.6, -0.3, 0.3, 1.3);
  }

  75%, 94% {
    transform: translateZ(calc(-18 * var(--u))) rotateX(270deg);
    animation-timing-function: cubic-bezier(0.6, -0.3, 0.3, 1.3);
  }

  100% {
    transform: translateZ(calc(-18 * var(--u))) rotateX(360deg);
  }
}`,
  },

  foldtext: {
    how: [
      'Panels are nested inside a fixed "hinge": the middle panel swings <code>rotateY(52deg)</code>, and its left/right neighbours hang off its edges and swing back <b>twice</b> as far — so in absolute terms they land at <code>-52deg</code>, folding like a &ldquo;Z&rdquo; seen from above.',
      'Every hinge needs <code>transform-style: preserve-3d</code> or the fold flattens at that level; the visible paper inside each hinge is a separate element that is allowed to clip.',
      'All three panels are windows onto the <b>same</b> sheet, three panels wide, each shifted left by <code>calc(var(--i) * -100%)</code> — so the printed headline lines up across the folds.',
      'A shading gradient over each panel (dark on the outer two, a light sheen on the middle one) fades to <code>opacity: 0</code> on hover/focus — cheap, since only opacity is animating, not the gradient itself.',
      'On <code>:hover</code>/<code>:focus-visible</code> every panel’s <code>transform</code> resets to <code>none</code>, flattening the whole sheet in one shared transition.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the headline is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="fold" tabindex="0" aria-label="Unfold: a headline on folded paper, flattens on hover or focus">
    <div class="panel panel-mid">
      <b style="--i:1" aria-hidden="true"><span><small>HOVER TO</small>UNFOLD</span></b>
      <div class="panel panel-left"><b style="--i:0" aria-hidden="true"><span><small>HOVER TO</small>UNFOLD</span></b></div>
      <div class="panel panel-right"><b style="--i:2" aria-hidden="true"><span><small>HOVER TO</small>UNFOLD</span></b></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the headline is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.45vmin;
  perspective: calc(800 * var(--u));
}

/* the static hit area: it takes :hover / :focus and never moves (the paper inside does) */
.fold {
  display: grid;
  place-items: center;
  width: calc(214 * var(--u)); /* 3 panels x 66 units, plus a little breathing room */
  height: calc(144 * var(--u));
  border-radius: calc(12 * var(--u));
  cursor: pointer;
  transform-style: preserve-3d;
}

.fold:focus-visible {
  outline: calc(2 * var(--u)) solid #2ee6d6;
  outline-offset: calc(2 * var(--u));
}

/* every panel is a hinge that may hold the next panel; the visible paper is its <b> */
.panel {
  position: relative;
  width: calc(66 * var(--u));
  height: calc(104 * var(--u));
  pointer-events: none;
  transform-style: preserve-3d;
  transition: transform 0.9s cubic-bezier(0.3, 1.25, 0.5, 1);
}

/* the middle panel is the root: it swings one way... */
.panel-mid {
  transform: rotateX(8deg) rotateY(52deg);
}

/* ...and its neighbours hang on its edges and swing back twice as far */
.panel-left,
.panel-right {
  position: absolute;
  top: 0;
  transform: rotateY(-104deg);
}

.panel-left {
  right: 100%;
  transform-origin: 100% 50%;
}

.panel-right {
  left: 100%;
  transform-origin: 0 50%;
}

.fold:hover .panel,
.fold:focus-visible .panel {
  transform: none;
}

/* the paper: a window one panel wide... */
.panel > b {
  position: absolute;
  inset: 0;
  overflow: hidden;
  backface-visibility: hidden;
}

/* ...onto a sheet three panels wide, shifted left by --i panels, so the same sheet lines up */
.panel > b > span {
  position: absolute;
  top: 0;
  left: calc(var(--i) * -100%);
  display: grid;
  place-content: center;
  gap: calc(4 * var(--u));
  width: 300%;
  height: 100%;
  /* deep enough for its white words: the bright #8b6cff, #ff4d9d, #ffb547 were 2.5:1 */
  background: linear-gradient(115deg, #6a45f5, #d1206f 60%, #c96f00);
  color: #fff;
  font-size: calc(41 * var(--u));
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.03em;
  text-align: center;
}

.panel > b > span small {
  font-size: calc(10 * var(--u));
  font-weight: 700;
  letter-spacing: 0.3em; /* full white: at 0.85, under the middle panel's sheen, it was 2.9:1 */
}

/* shading that sells the fold: fades out as the paper flattens (opacity is cheap to animate) */
.panel > b::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgb(0 0 0 / 0.45), rgb(0 0 0 / 0.1));
  transition: opacity 0.9s;
}

.panel-mid > b::after {
  background: linear-gradient(90deg, rgb(255 255 255 / 0.12), rgb(255 255 255 / 0));
}

.fold:hover .panel > b::after,
.fold:focus-visible .panel > b::after {
  opacity: 0;
}`,
  },

  crawl: {
    how: [
      'The camera is moved to the bottom edge with <code>perspective-origin: 50% 100%</code>, instead of the default centre, so everything converges toward a vanishing point above the text rather than the middle of the box.',
      'The "floor" is hinged on its own bottom edge (<code>transform-origin: 50% 100%</code>) and tipped away from the viewer with <code>rotateX(55deg)</code>.',
      'Two copies of the text sit on that floor, half an animation apart (<code>animation-delay</code> <code>-7s</code> and <code>-22s</code>), so the crawl is never empty while one copy finishes and the other is only half way up. The 7s is where the loop starts: the first copy’s title and opening paragraph already in view, so a paused card shows the crawl’s opening, not its illegible far end.',
      'The fade into the distance is a plain gradient overlay <b>on top of</b> the tipped plane, not a mask on it — masking a 3D ancestor would flatten the whole scene.',
      'Only <code>transform: translateY(...)</code> animates the text, so the scroll runs on the compositor even though the paragraphs are long.',
      'The crawl fills the canvas (<code>inset: 0</code>); the plane, the text and the fade are multiples of one base unit, <code>--u</code>, tied to the canvas, so the crawl reads the same on a gallery card and on a full screen.',
    ],
    html: `<div class="crawl">
  <div class="plane">
    <div class="text">
      <h4>Episode 3D</h4>
      <p>It is a period of flat design. Rebel stylesheets, striking from a hidden folder, have won their first victory against the evil Canvas Empire.</p>
      <p>During the battle, a single rotateX managed to tip an entire paragraph back into the distance, using nothing but perspective and a parent that owns it.</p>
      <p>Pursued by heavy JavaScript bundles, the text now scrolls home along its plane, with no script on board at all...</p>
    </div>
    <div class="text" aria-hidden="true">
      <h4>Episode 3D</h4>
      <p>It is a period of flat design. Rebel stylesheets, striking from a hidden folder, have won their first victory against the evil Canvas Empire.</p>
      <p>During the battle, a single rotateX managed to tip an entire paragraph back into the distance, using nothing but perspective and a parent that owns it.</p>
      <p>Pursued by heavy JavaScript bundles, the text now scrolls home along its plane, with no script on board at all...</p>
    </div>
  </div>
  <div class="fade"></div>
</div>`,
    css: `.crawl {
  /* one base unit: every length below is a multiple of it, so the crawl is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.36vmin;
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #05060f;
  /* the camera sits at the bottom edge; with the plane tipped back 55deg the text converges on
     a vanishing line above the bottom, whatever the box's own size */
  perspective: calc(420 * var(--u));
  perspective-origin: 50% 100%;
}

/* hinged on the bottom edge and tipped away from the viewer; it clips its own flat content
   (fine here: nothing 3D lives inside it), so text never passes in front of the hinge */
.plane {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  /* a fixed number of units, not a share of the canvas: a column that narrowed with a square or
     tall canvas broke its lines in other places, so the text ran longer and a different part of
     it was in view at the same moment. 240 units is 86vmin, inside even a 9:16 canvas */
  width: calc(240 * var(--u));
  height: calc(950 * var(--u));
  margin: 0 auto;
  overflow: hidden;
  transform: rotateX(55deg);
  transform-origin: 50% 100%;
}

/* two copies of the text, half a loop apart, so the floor is never empty: each one starts just
   below the near edge and leaves completely past the far edge, so both ends stay invisible. The
   first is 7s in at the first frame, its EPISODE 3D title mid-canvas, which a paused card shows */
.text {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  margin: 0;
  color: #ffb547;
  font-size: calc(17 * var(--u));
  font-weight: 700;
  line-height: 1.45;
  text-align: justify;
  animation: crawl-roll 30s linear -7s infinite;
}

.text + .text {
  animation-delay: -22s;
}

.text h4 {
  margin: 0 0 0.6em;
  font-size: 1.5em;
  letter-spacing: 0.08em;
  text-align: center;
  text-transform: uppercase;
}

.text p {
  margin: 0 0 1em;
}

/* the fade is a plain overlay ABOVE the plane: a mask on the plane's ancestor would flatten it */
.fade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 18%, #fff calc(0.7 * var(--u)), transparent calc(1.3 * var(--u))),
    radial-gradient(circle at 31% 9%, #cfd6ff calc(0.7 * var(--u)), transparent calc(1.3 * var(--u))),
    radial-gradient(circle at 55% 22%, #fff calc(1 * var(--u)), transparent calc(1.7 * var(--u))),
    radial-gradient(circle at 72% 12%, #ffe9c2 calc(0.7 * var(--u)), transparent calc(1.3 * var(--u))),
    radial-gradient(circle at 88% 27%, #fff calc(0.7 * var(--u)), transparent calc(1.3 * var(--u))),
    radial-gradient(circle at 22% 34%, #cfd6ff calc(0.7 * var(--u)), transparent calc(1.3 * var(--u))),
    radial-gradient(circle at 93% 6%, #fff calc(1 * var(--u)), transparent calc(1.7 * var(--u))),
    linear-gradient(to top, transparent calc(90 * var(--u)), #05060f calc(185 * var(--u)));
  pointer-events: none;
}

@keyframes crawl-roll {
  from { transform: translateY(calc(950 * var(--u))); }
  to   { transform: translateY(-100%); }
}`,
  },

  anaglyph: {
    how: [
      'Two copies of the word sit in the same spot, one red and one cyan, each shifted apart with <code>translate()</code> and blended with <code>mix-blend-mode: screen</code> — like old red/cyan 3D glasses, where the overlap reads near-white and the fringes stay coloured.',
      'The card itself is a single flat plane that only rotates (<code>rotateY</code> / <code>rotateX</code>); it is deliberately <b>not</b> <code>preserve-3d</code>, because a blend mode only combines elements painted into the same flat surface.',
      'JS reports one thing — the pointer position over the stage — and writes it into four custom properties (<code>--sx</code>, <code>--sy</code>, <code>--ry</code>, <code>--rx</code>); every animated value in the CSS just reads one of them. The shifts are plain numbers, not lengths: CSS multiplies them by <code>--u</code>, the one base unit every length here is a multiple of, so the card is the same share of a gallery card, the editor and a recording canvas.',
      'While the pointer is over the card the transition is fast, 0.12s with <code>ease-out</code> (<code>.is-live</code>); once it leaves, the slower springy transition takes over for the way back to rest.',
    ],
    html: `<div class="scene" tabindex="0" role="img" aria-label="STEREO in red and cyan layers that shift apart with the pointer">
  <div class="anaglyph">
    <div class="word">
      <span>STEREO</span>
      <span aria-hidden="true">STEREO</span>
    </div>
    <small>move your pointer</small>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the card is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.41vmin;
  perspective: calc(800 * var(--u));
}

.anaglyph {
  box-sizing: content-box; /* its padding and edge are round the words */
  display: grid;
  place-items: center;
  gap: calc(2 * var(--u));
  width: calc(214 * var(--u));
  padding: calc(24 * var(--u)) 0 calc(16 * var(--u));
  border: calc(1 * var(--u)) solid #3a4070;
  border-radius: calc(16 * var(--u));
  background: radial-gradient(circle at 50% 30%, #171b38, #07080f 75%);
  box-shadow: 0 calc(22 * var(--u)) calc(34 * var(--u)) calc(-22 * var(--u)) rgb(0 0 0 / 0.85);
  /* the card turns as ONE flat plane in the stage's perspective; not preserve-3d, because the
     screen blend below only works among elements painted into the same flat surface */
  transform: rotateY(var(--ry, -14deg)) rotateX(var(--rx, 6deg));
  transition: transform 0.7s cubic-bezier(0.3, 1.3, 0.5, 1);
}

.word {
  position: relative;
  font-size: calc(43 * var(--u));
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.02em;
  user-select: none;
}

/* two copies of the word, one per eye, pushed apart horizontally; screen adds their light,
   so where red and cyan overlap you get near-white and the fringes stay coloured */
.word span {
  display: block;
  color: #ff1744;
  mix-blend-mode: screen;
  /* --sx / --sy are plain numbers from JS; the unit is the model's, like every other length */
  transform: translate(calc(var(--sx, 3) * -1 * var(--u)), calc(var(--sy, 0) * -1 * var(--u)));
  transition: transform 0.7s cubic-bezier(0.3, 1.3, 0.5, 1);
}

.word span + span {
  position: absolute;
  inset: 0;
  color: #00e5ff;
  transform: translate(calc(var(--sx, 3) * var(--u)), calc(var(--sy, 0) * var(--u)));
}

.anaglyph small {
  color: #949bc0;
  font-size: calc(9.5 * var(--u));
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/* while the pointer is over the stage, follow it almost directly; the slow springy transition
   above is only used on the way back */
.anaglyph.is-live,
.anaglyph.is-live span {
  transition-duration: 0.12s;
  transition-timing-function: ease-out;
}

/* the keyboard: Tab to it and it leans as it would for a pointer near the top right, even with
   the pointer resting on the canvas (!important beats the pose the script writes inline) */
.scene:focus-visible .anaglyph { --rx: -4deg !important; --ry: 12deg !important; --sx: -4 !important; --sy: 1 !important; }`,
    js: `var stage = document.querySelector('.scene');
var card = document.querySelector('.anaglyph');

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function move(e) {
  var r = stage.getBoundingClientRect();
  var x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
  var y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
  // plain numbers for the shift: CSS multiplies them by --u, so it scales with the canvas
  card.style.setProperty('--sx', (x * 16).toFixed(2));
  card.style.setProperty('--sy', (y * 5).toFixed(2));
  card.style.setProperty('--ry', (x * 44).toFixed(1) + 'deg');
  card.style.setProperty('--rx', (-y * 30).toFixed(1) + 'deg');
  card.classList.add('is-live');
}

function leave() {
  card.classList.remove('is-live');
  ['--sx', '--sy', '--ry', '--rx'].forEach(function (p) {
    card.style.removeProperty(p);
  });
}

stage.addEventListener('pointermove', move);
stage.addEventListener('pointerdown', move);
stage.addEventListener('pointerleave', leave);
stage.addEventListener('pointercancel', leave);`,
  },

  check: {
    how: [
      'The real <code>&lt;input type="checkbox"&gt;</code> stays in the page — keyboard, forms and screen readers all keep working — it is only made invisible with <code>opacity: 0</code>. The <code>&lt;label&gt;</code> next to it is the static hit target, since the pressed element must never be the one that moves.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas — the rows, the cubes, the tick and the strike-through — so the list is the same share of a gallery card, the editor and a recording canvas. The numbers below are those units.',
      'Each cube is placed with the same "turn, then push half a side out" recipe as a plain CSS cube, in its own tiny <code>perspective: 160 units</code> stage so all three read from the same angle.',
      'The 6th face is the cube’s <b>bottom</b>: it carries the tick and starts out of sight, tucked underneath.',
      '<code>input:checked + label .cube</code> adds one more <code>rotateX(90deg)</code> on top of the resting view angle — a quarter turn forward brings that bottom face round to the front.',
      'The strike-through line animates <code>scaleX(0 → 1)</code> from a fixed-width element instead of animating <code>width</code>, so it costs only a compositor transform.',
    ],
    html: `<ul class="check-list">
  <li>
    <input type="checkbox" id="check-0" checked />
    <label for="check-0">
      <span class="box">
        <span class="cube"><i></i><i></i><i></i><i></i><i></i><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></i></span>
      </span>
      <span class="text">Set the perspective</span>
    </label>
  </li>
  <li>
    <input type="checkbox" id="check-1" />
    <label for="check-1">
      <span class="box">
        <span class="cube"><i></i><i></i><i></i><i></i><i></i><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></i></span>
      </span>
      <span class="text">Preserve the 3D</span>
    </label>
  </li>
  <li>
    <input type="checkbox" id="check-2" />
    <label for="check-2">
      <span class="box">
        <span class="cube"><i></i><i></i><i></i><i></i><i></i><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></i></span>
      </span>
      <span class="text">Flip the cube</span>
    </label>
  </li>
</ul>`,
    css: `.check-list {
  /* one base unit: every length below is a multiple of it, so the list is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.37vmin;
  display: grid;
  gap: calc(7 * var(--u));
  /* the row is as wide as its longest line, so the width is what the band binds on. The cube is
     30 units and the row padding 12, not 22 and 8: at the old sizes the list came out 86 x 54
     vmin, a third short of the box it is allowed to fill */
  width: calc(220 * var(--u));
  margin: 0;
  padding: 0;
  list-style: none;
}

.check-list li {
  position: relative;
}

/* the real checkbox stays for keyboard/forms/screen readers, only made invisible */
.check-list input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

/* the label is the static hit target: nothing the pointer can touch ever moves */
.check-list label {
  display: flex;
  align-items: center;
  gap: calc(12 * var(--u));
  padding: calc(12 * var(--u)) calc(14 * var(--u));
  border: calc(1 * var(--u)) solid #262b4a;
  border-radius: calc(12 * var(--u));
  /* opaque, so its light words read on either stage: see-through, on the light stage the card was
     mid grey and the words on it 2.4:1 */
  background: #11142a;
  color: #eceefb;
  font-size: calc(13 * var(--u));
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s;
}

.check-list label:hover {
  border-color: #3a4070;
}

.check-list input:focus-visible + label {
  outline: calc(2 * var(--u)) solid #2ee6d6;
  outline-offset: calc(2 * var(--u));
}

/* a tiny stage of its own for every box, so all three cubes are seen from the same angle */
.box {
  flex: none;
  width: calc(30 * var(--u));
  height: calc(30 * var(--u));
  perspective: calc(160 * var(--u));
  pointer-events: none;
}

.cube {
  position: relative;
  display: block;
  width: calc(30 * var(--u));
  height: calc(30 * var(--u));
  transform-style: preserve-3d;
  /* view angle first, then the flip happens around the cube's own X axis */
  transform: rotateX(-16deg) rotateY(-24deg) rotateX(0deg);
  transition: transform 0.55s cubic-bezier(0.3, 1.5, 0.5, 1);
}

/* turn each face outward, then push it half a side out from the centre */
.cube i:nth-child(1) { transform: rotateY(0deg)   translateZ(calc(15 * var(--u))); }
.cube i:nth-child(2) { transform: rotateY(90deg)  translateZ(calc(15 * var(--u))); }
.cube i:nth-child(3) { transform: rotateY(180deg) translateZ(calc(15 * var(--u))); }
.cube i:nth-child(4) { transform: rotateY(-90deg) translateZ(calc(15 * var(--u))); }
.cube i:nth-child(5) { transform: rotateX(90deg)  translateZ(calc(15 * var(--u))); }
.cube i:nth-child(6) { transform: rotateX(-90deg) translateZ(calc(15 * var(--u))); }

.cube i {
  position: absolute;
  inset: 0;
  border-radius: calc(4 * var(--u));
  background: rgb(139 108 255 / 0.22);
  /* the edge is an inner line, not a border: squeezed side-on, a 1-unit border breaks up; the
     glass's own inner glow is the soft shade that survives */
  box-shadow: inset 0 0 0 calc(1 * var(--u)) rgb(139 108 255 / 0.75), inset 0 0 calc(16 * var(--u)) rgb(139 108 255 / 0.3);
}

/* the 6th face is the BOTTOM of the cube: it carries the tick and is out of sight at rest */
.cube i:last-child {
  display: grid;
  place-items: center;
  background: #2ee6d6;
  box-shadow: 0 0 calc(16 * var(--u)) rgb(46 230 214 / 0.6);
  color: #062b28;
  backface-visibility: hidden; /* looking down into the glass cube you'd see the inside otherwise */
}

.cube i:last-child svg {
  width: calc(20 * var(--u));
  height: calc(20 * var(--u));
}

/* a quarter turn forward brings the bottom face to the front */
.check-list input:checked + label .cube {
  transform: rotateX(-16deg) rotateY(-24deg) rotateX(90deg);
}

.text {
  position: relative;
  transition: opacity 0.3s;
}

/* the strike-through is a line scaled from 0 to 1: transform only, no layout, no repaint */
.text::after {
  content: '';
  position: absolute;
  top: 52%;
  right: calc(-3 * var(--u));
  left: calc(-3 * var(--u));
  height: calc(1.5 * var(--u));
  border-radius: calc(1 * var(--u));
  background: #2ee6d6;
  transform: scaleX(0);
  transform-origin: 0 50%;
  transition: transform 0.35s ease-out;
}

.check-list input:checked + label .text {
  opacity: 0.55;
}

.check-list input:checked + label .text::after {
  transform: scaleX(1);
  transition-delay: 0.15s;
}`,
  },

  tabs: {
    how: [
      'Four real radios come <b>before</b> the content in the markup, invisible but focusable, so the <code>~</code> general sibling combinator can reach both the nav and the prism from any of them.',
      'Each tab panel is a face of a prism, placed with the same "turn backwards, then push out" recipe as a cube: face <code>n</code> gets <code>rotateX(n * -90deg) translateZ(46 units)</code>.',
      'The prism is pulled back by half its own depth (<code>translateZ(-46 units)</code>) so the panel currently in front sits exactly at z&nbsp;=&nbsp;0 and its text stays sharp.',
      'Checking radio <code>n</code> sets <code>--step</code> to <code>n - 1</code> on the prism; <code>rotateX(calc(var(--step) * 90deg))</code> turns to that face, and one shared <code>transition</code> animates every possible jump.',
      '<code>backface-visibility: hidden</code> on the panels stops the back faces from showing through as the prism turns.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, text included, so the tabs are the same share of a gallery card, the editor and a recording canvas. The tabs are the model, so there is no separate control row: the whole thing fills the frame.',
    ],
    html: `<div class="tabs">
  <input type="radio" name="tabs" id="tab-0" aria-label="Front" checked />
  <input type="radio" name="tabs" id="tab-1" aria-label="Bottom" />
  <input type="radio" name="tabs" id="tab-2" aria-label="Back" />
  <input type="radio" name="tabs" id="tab-3" aria-label="Top" />
  <div class="tabs-nav">
    <label for="tab-0">Front</label>
    <label for="tab-1">Bottom</label>
    <label for="tab-2">Back</label>
    <label for="tab-3">Top</label>
  </div>
  <div class="tabs-view">
    <div class="tabs-prism">
      <section style="--i:0;--c:#8b6cff"><b>Front</b><p>The face you start on. It sits at z = 0, so its text stays sharp.</p></section>
      <section style="--i:1;--c:#2ee6d6"><b>Bottom</b><p>A quarter turn forward brings the bottom face up to the front.</p></section>
      <section style="--i:2;--c:#ff4d9d"><b>Back</b><p>Half a turn. Placed with a half turn too, so it reads upright.</p></section>
      <section style="--i:3;--c:#ffb547"><b>Top</b><p>Three quarter turns, all driven by one custom property.</p></section>
    </div>
  </div>
</div>`,
    css: `.tabs {
  /* one base unit: every length below is a multiple of it, so the tabs are the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.42vmin;
  position: relative;
  display: grid;
  gap: calc(20 * var(--u));
  width: calc(204 * var(--u));
}

/* real radios, invisible but focusable; they come first so ~ can reach everything else */
.tabs input {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(1 * var(--u));
  height: calc(1 * var(--u));
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.tabs-nav {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: calc(3 * var(--u));
  padding: calc(3 * var(--u));
  border: calc(1 * var(--u)) solid #262b4a;
  border-radius: calc(10 * var(--u));
  /* opaque, so the tab names read on either stage: see-through, on the light stage the bar was mid
     grey and the names on it 1.8:1 */
  background: #11142a;
}

.tabs-nav label {
  padding: calc(5 * var(--u)) 0;
  border-radius: calc(7 * var(--u));
  color: #949bc0;
  font-size: calc(11 * var(--u));
  font-weight: 700;
  text-align: center;
  cursor: pointer;
  transition: background 0.25s, color 0.25s;
}

.tabs-nav label:hover {
  color: #eceefb;
}

/* the window the prism is seen through: static, and NOT clipped (clipping would flatten it) */
.tabs-view {
  height: calc(92 * var(--u));
  perspective: calc(520 * var(--u));
  pointer-events: none;
}

/* pulled back by half its depth so the face in front sits exactly at z = 0 */
.tabs-prism {
  position: relative;
  height: 100%;
  transform-style: preserve-3d;
  transform: translateZ(calc(-46 * var(--u))) rotateX(calc(var(--step, 0) * 90deg));
  transition: transform 0.75s cubic-bezier(0.3, 1.2, 0.4, 1);
}

/* face n: n quarter turns backward, then out by half the depth -> front, bottom, back, top */
.tabs-prism section {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  gap: calc(4 * var(--u));
  padding: 0 calc(17 * var(--u));
  /* an inner line plus a soft shade instead of a hard border: turning, a face passes
     side-on, where a 1 units line breaks up; the shade survives */
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) color-mix(in srgb, var(--c) 70%, transparent),
    inset 0 0 calc(8 * var(--u)) color-mix(in srgb, var(--c) 28%, transparent);
  border-radius: calc(10 * var(--u));
  background:
    linear-gradient(140deg, color-mix(in srgb, var(--c) 34%, transparent), transparent 70%),
    rgb(11 13 24); /* opaque: its words read the same on either stage */
  backface-visibility: hidden;
  transform: rotateX(calc(var(--i) * -90deg)) translateZ(calc(46 * var(--u)));
}

.tabs-prism section b {
  color: var(--c);
  font-size: calc(15 * var(--u));
  font-weight: 800;
}

.tabs-prism section p {
  margin: 0;
  color: #949bc0;
  font-size: calc(11.5 * var(--u));
  line-height: 1.4;
}

/* one rule per tab: the nth radio turns the prism n-1 steps */
.tabs input:nth-of-type(1):checked ~ .tabs-view .tabs-prism { --step: 0; }
.tabs input:nth-of-type(2):checked ~ .tabs-view .tabs-prism { --step: 1; }
.tabs input:nth-of-type(3):checked ~ .tabs-view .tabs-prism { --step: 2; }
.tabs input:nth-of-type(4):checked ~ .tabs-view .tabs-prism { --step: 3; }

/* ...and lights the matching label */
.tabs input:nth-of-type(1):checked ~ .tabs-nav label:nth-of-type(1),
.tabs input:nth-of-type(2):checked ~ .tabs-nav label:nth-of-type(2),
.tabs input:nth-of-type(3):checked ~ .tabs-nav label:nth-of-type(3),
.tabs input:nth-of-type(4):checked ~ .tabs-nav label:nth-of-type(4) {
  background: #6a45f5; /* deep enough for white words, 5.9:1: #8b6cff was 3.7:1 */
  color: #fff;
}

.tabs input:nth-of-type(1):focus-visible ~ .tabs-nav label:nth-of-type(1),
.tabs input:nth-of-type(2):focus-visible ~ .tabs-nav label:nth-of-type(2),
.tabs input:nth-of-type(3):focus-visible ~ .tabs-nav label:nth-of-type(3),
.tabs input:nth-of-type(4):focus-visible ~ .tabs-nav label:nth-of-type(4) {
  outline: calc(2 * var(--u)) solid #2ee6d6;
  outline-offset: calc(2 * var(--u));
}`,
  },

  radial: {
    how: [
      'A real checkbox holds the open/closed state and takes the keyboard; the button visitors see is its <code>&lt;label&gt;</code>, which is why only the plus icon inside needs to rotate on <code>:checked</code>, not the whole button.',
      'Closed, it is only the button: every item waits hidden directly behind it, centre on centre, shrunk (<code>scale(0.4)</code>) and pulled back in Z. <code>:checked</code> swaps in a transform list with the <b>same functions</b> but different numbers, so the browser animates each one independently.',
      '<code>rotate(a) translateX(r) rotate(-a)</code> walks a point out along a straight spoke at angle <code>a</code> while the trailing <code>rotate(-a)</code> cancels the turn, so every icon stays upright as it travels. Of those three, only <code>r</code> changes between closed and open (0 to 70 units), so each item moves straight out along its spoke; the <code>translateZ</code> and <code>scale</code> after them bring it forward and up to full size as it goes. The five spokes are 72° apart, a full ring round the button.',
      '<code>--i</code> staggers the opening so the items fan out one after another; on close the delay is reversed (<code>(4 - var(--i))</code>) so the <b>last</b> item to open is the <b>first</b> to leave.',
      'Closed items get <code>opacity: 0</code>, <code>visibility: hidden</code> and <code>pointer-events: none</code>, so they are not seen and Tab and clicks skip them until the menu is actually open.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, text included, so the menu is the same share of a gallery card, the editor and a recording canvas. The button sits in the middle and the items open into a full ring round it, so the menu is centred closed and open alike, and opening never moves the button. At rest it is only the button, at the size of a button: a control that opens into something rests small by design and fills the frame open.',
    ],
    html: `<div class="scene">
  <div class="radial">
    <input type="checkbox" id="radial-toggle" aria-label="Open the action menu" />
    <label class="fab" for="radial-toggle" title="Actions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg></label>
    <span class="ring"></span>
    <button type="button" class="item" style="--i:0;--c:#ff4d9d" aria-label="Like" title="Like"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/></svg></button>
    <button type="button" class="item" style="--i:1;--c:#ffb547" aria-label="Edit" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
    <button type="button" class="item" style="--i:2;--c:#2ee6d6" aria-label="Share" title="Share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg></button>
    <button type="button" class="item" style="--i:3;--c:#8b6cff" aria-label="Copy" title="Copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="13" height="13" x="8" y="8" rx="2"/><path d="M5 16a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2"/></svg></button>
    <button type="button" class="item" style="--i:4;--c:#ff4d9d" aria-label="Search" title="Search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.5-4.5"/></svg></button>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the menu is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.39vmin;
  perspective: calc(800 * var(--u));
}

.radial {
  position: relative;
  width: calc(200 * var(--u));
  height: calc(200 * var(--u));
  transform-style: preserve-3d;
  /* lean the whole menu back a little so the depth can be seen; the five spokes reach further up
     than down (one straight up, two at the bottom corners), so it sits a little low to be centred */
  transform: translateY(calc(6 * var(--u))) rotateX(16deg);
}

/* the real checkbox: invisible, but it holds the open/closed state and takes the keyboard */
.radial > input {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: calc(1 * var(--u));
  height: calc(1 * var(--u));
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

/* the button is the label: it is the hit target and stays put in the middle, only the plus
   inside turns */
.fab {
  position: absolute;
  top: calc(50% - 32 * var(--u));
  left: calc(50% - 32 * var(--u));
  display: grid;
  place-items: center;
  width: calc(64 * var(--u));
  height: calc(64 * var(--u));
  border-radius: 50%;
  background: linear-gradient(140deg, #8b6cff, #ff4d9d);
  box-shadow: 0 calc(10 * var(--u)) calc(22 * var(--u)) calc(-8 * var(--u)) rgb(139 108 255 / 0.8);
  color: #fff;
  cursor: pointer;
  transform: translateZ(calc(1 * var(--u))); /* just in front of the items' resting place */
}

.fab svg {
  width: calc(28 * var(--u));
  height: calc(28 * var(--u));
  pointer-events: none;
  transition: transform 0.45s cubic-bezier(0.3, 1.5, 0.5, 1);
}

.radial > input:focus-visible ~ .fab {
  outline: calc(2 * var(--u)) solid #2ee6d6;
  outline-offset: calc(3 * var(--u));
}

.radial > input:checked ~ .fab svg {
  transform: rotate(135deg);
}

/* a faint ring that shows the circle the items travel to, all the way round the button */
.ring {
  position: absolute;
  top: calc(50% - 70 * var(--u));
  left: calc(50% - 70 * var(--u));
  width: calc(140 * var(--u));
  height: calc(140 * var(--u));
  border: calc(1 * var(--u)) dashed rgb(139 108 255 / 0.55);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.3);
  transition: transform 0.5s cubic-bezier(0.3, 1.3, 0.5, 1), opacity 0.3s;
}

.radial > input:checked ~ .ring {
  opacity: 1;
  transform: scale(1);
}

/* every item waits hidden behind the button, centre on centre; its place on the ring is
   turn-to-angle, walk out, turn back (so the icon stays upright) */
.item {
  --a: calc(-90deg + var(--i) * 72deg); /* five spokes, 72deg apart, the first straight up */
  position: absolute;
  top: calc(50% - 18 * var(--u));
  left: calc(50% - 18 * var(--u));
  display: grid;
  place-items: center;
  width: calc(36 * var(--u));
  height: calc(36 * var(--u));
  padding: 0;
  border: calc(1 * var(--u)) solid color-mix(in srgb, var(--c) 80%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--c) 30%, #0b0d18);
  color: #eceefb;
  cursor: pointer;
  opacity: 0;
  visibility: hidden; /* closed items must not be reachable by Tab */
  pointer-events: none;
  transform: rotate(var(--a)) translateX(0) rotate(calc(var(--a) * -1)) translateZ(calc(-30 * var(--u))) rotateX(0deg) scale(0.4);
  /* closing: the last item leaves first */
  transition:
    transform 0.35s ease-in calc((4 - var(--i)) * 35ms),
    opacity 0.25s linear calc((4 - var(--i)) * 35ms + 0.1s),
    visibility 0s linear 0.55s;
}

.item svg {
  width: calc(17 * var(--u));
  height: calc(17 * var(--u));
}

.item:hover,
.item:focus-visible {
  background: color-mix(in srgb, var(--c) 65%, #0b0d18);
}

.radial > input:checked ~ .item {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: rotate(var(--a)) translateX(calc(70 * var(--u))) rotate(calc(var(--a) * -1)) translateZ(calc(26 * var(--u))) rotateX(0deg) scale(1);
  /* opening: staggered by index, with a little overshoot */
  transition:
    transform 0.55s cubic-bezier(0.3, 1.5, 0.5, 1) calc(var(--i) * 45ms),
    opacity 0.2s linear calc(var(--i) * 45ms),
    visibility 0s;
}`,
  },

  magnet: {
    how: [
      'JS only ever reports one thing: the pointer’s position inside the field, remapped to two numbers <code>--mx</code> / <code>--my</code> from -1 to 1. Every visible motion is CSS reading those two custom properties.',
      '<code>translate3d(...)</code> plus two <code>rotate</code>s built from the same <code>--mx</code>/<code>--my</code> shift the button toward the pointer and lean it the way it is being pulled, all in one <code>transform</code>.',
      'The label is lifted another 30 units off the button’s face with <code>translateZ</code>. It shares the tilt but stands further from the pivot, so it travels further and visibly slides apart from its cap: parallax from one shared tilt.',
      'While the pointer is inside the field (<code>.is-live</code>) the transition is a quick 0.14s <code>ease-out</code> so it tracks closely; on release a long <code>cubic-bezier</code> with overshoot takes over, reading as a spring pulling the button home.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas — the field, the button, its lift and how far it travels — so the whole thing is the same share of a gallery card, the editor and a recording canvas. The numbers below are those units. The button is the model, so it is a big 150 × 112 tile with its label on two lines, and the field round it is a faint violet pad that reads on a dark stage and a light one alike.',
    ],
    html: `<div class="magnet">
  <i class="glow"></i>
  <button type="button" class="btn"><span>Pull<br />me</span></button>
</div>`,
    css: `.magnet {
  /* one base unit: every length below is a multiple of it, so the field is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.38vmin;
  position: relative;
  display: grid;
  place-items: center;
  /* 220 × 160 outside, its border included: the glow's travel below stops at this edge */
  box-sizing: border-box;
  width: calc(220 * var(--u));
  height: calc(160 * var(--u));
  /* the field: a faint violet pad, the same tint on a dark stage and a light one (a grey dashed
     line was near invisible on dark and a hard black box on light) */
  border: calc(1.5 * var(--u)) solid rgb(139 108 255 / 0.3);
  border-radius: calc(26 * var(--u));
  background: radial-gradient(ellipse at 50% 50%, rgb(139 108 255 / 0.14), rgb(139 108 255 / 0.04) 72%);
  perspective: calc(800 * var(--u));
  transform-style: preserve-3d;
  touch-action: none; /* let a finger drag inside the field instead of scrolling the page */
}

/* the glow lies on the floor of the field, behind the button, and runs further than it */
.glow {
  position: absolute;
  top: calc(50% - 70 * var(--u));
  left: calc(50% - 95 * var(--u));
  width: calc(190 * var(--u));
  height: calc(140 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle, rgb(46 230 214 / 0.55), transparent 68%);
  opacity: 0;
  pointer-events: none;
  /* the glow is 190 × 140 and the field 220 × 160, so it may travel 15 and 10: at full deflection
     it reaches the edge of the field and stops there, and the band holds the field, not the glow */
  transform: translate3d(calc(var(--mx, 0) * 15 * var(--u)), calc(var(--my, 0) * 10 * var(--u)), 0);
  transition: transform 0.7s cubic-bezier(0.3, 1.6, 0.5, 1), opacity 0.4s;
}

/* the button is the model, so it is big: a 150 × 112 tile, the label on two lines. It shifts toward
   the pointer and leans the way it is pulled; it floats 34 units above the field so its far,
   tipped-back edge still stays in front of the field's own plane */
.btn {
  position: relative;
  width: calc(150 * var(--u));
  height: calc(112 * var(--u));
  padding: 0;
  border: calc(1 * var(--u)) solid #a996ff;
  border-radius: calc(24 * var(--u));
  background: linear-gradient(140deg, #8b6cff, #bf5ed3);
  box-shadow: 0 calc(16 * var(--u)) calc(26 * var(--u)) calc(-14 * var(--u)) rgb(139 108 255 / 0.9);
  color: #fff;
  font: inherit;
  font-size: calc(34 * var(--u));
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transform-style: preserve-3d;
  transform:
    translate3d(calc(var(--mx, 0) * 24 * var(--u)), calc(var(--my, 0) * 16 * var(--u)), calc(34 * var(--u)))
    rotateY(calc(var(--mx, 0) * 20deg))
    rotateX(calc(var(--my, 0) * -18deg));
  /* the way home: slow, with a big overshoot = a spring */
  transition: transform 0.7s cubic-bezier(0.3, 1.9, 0.5, 1);
}

.btn:focus-visible {
  outline: calc(2 * var(--u)) solid #2ee6d6;
  outline-offset: calc(4 * var(--u));
}

/* the label floats above the button's face; same tilt, more depth = it slides further than
   the face under it: parallax */
.btn span {
  display: block;
  pointer-events: none;
  text-shadow: 0 calc(6 * var(--u)) calc(10 * var(--u)) rgb(0 0 0 / 0.35);
  transform: translateZ(calc(30 * var(--u)));
  transition: transform 0.2s;
}

.btn:active span {
  transform: translateZ(calc(8 * var(--u))); /* pressed flat */
}

/* while the pointer is inside, follow it closely; the springy transitions above are the release */
.magnet.is-live .btn,
.magnet.is-live .glow {
  transition-duration: 0.14s, 0.4s;
  transition-timing-function: ease-out;
}

.magnet.is-live .glow {
  opacity: 1;
}`,
    js: `var field = document.querySelector('.magnet');

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function move(e) {
  // a ratio of the on-screen box, so any CSS scale on the page cancels out
  var r = field.getBoundingClientRect();
  field.style.setProperty('--mx', clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1).toFixed(3));
  field.style.setProperty('--my', clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1).toFixed(3));
  field.classList.add('is-live');
}

function release() {
  field.classList.remove('is-live');
  field.style.removeProperty('--mx');
  field.style.removeProperty('--my');
}

field.addEventListener('pointermove', move);
field.addEventListener('pointerdown', move);
field.addEventListener('pointerleave', release);
field.addEventListener('pointercancel', release);`,
  },
};
