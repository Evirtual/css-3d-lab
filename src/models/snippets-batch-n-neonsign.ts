/**
 * Paste-anywhere version of the neonsign model: plain HTML + CSS, no Sass, no build step.
 * See snippets.ts for the format this file follows.
 */
import type { Snippet } from './snippet-utils';

/** The word, and where each letter's stand-off bracket sits under its bottom stroke. */
const LETTERS: [string, string][] = [
  ['O', '50%'],
  ['P', '20%'],
  ['E', '22%'],
  ['N', '17%'],
];

export const snippetsNeonsign: Record<string, Snippet> = {
  neonsign: {
    how: [
      'The board is a real box: a dark front panel and four faces folded back from its edges (<code>rotateX(±90deg)</code> about the top and bottom edges, <code>rotateY(±90deg)</code> about the sides), so as the sign turns on its chains you see its top and the side nearest you, with real thickness.',
      'The tubes do not lie on the board. Each letter is pushed <code>translateZ(22 units)</code> out in front of it and held on a little bracket, two crossed planes running from the board to the tube. As the sign turns, the tubes slide across the board faster than the board itself: that parallax is what makes the gap read as depth.',
      'The light is two layers in two planes. On the tube, a <code>text-shadow</code> halo; on the board, a soft pink ellipse just behind each letter (and a teal one under the frame) that is the light the tube casts. Because the cast sits on the board, it lags behind the tube as the sign turns, the way real light on a wall does.',
      'The letters are near-white with a pink edge (<code>-webkit-text-stroke</code>), the hot core of a tube, and the board behind them is the model’s own dark surface, so the word reads on the dark stage and the light one alike.',
      'The loop is one slow turn, <code>rotateY(-18deg)</code> to <code>18deg</code> and back with symmetrical easing, so its end is its start. Once a loop the E stutters: its tube and its cast glow dip in <b>opacity</b> only, on the leaf elements. Opacity under 1 on a <code>preserve-3d</code> parent would flatten the tube onto the board for the length of the flicker.',
    ],
    html: `<div class="scene">
  <div class="sign" role="img" aria-label="Neon sign: OPEN">
    <i class="chain"></i><i class="chain"></i><i class="ring"></i>
    <i class="side top"></i><i class="side bottom"></i><i class="side left"></i><i class="side right"></i>
    <div class="board"></div>
    <i class="frame-cast"></i>
    <i class="frame"></i>
    <div class="word" aria-hidden="true">
${LETTERS.map(([c, p]) => `      <span class="letter" style="--p:${p}"><i class="cast"></i><i class="post"></i><b>${c}</b></span>`).join('\n')}
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the sign is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.33vmin;
  --d: 18;                /* the board's thickness, in units */
  --z: 22;                /* how far the tubes stand off the board */
  /* the chains hang above the board: this room is part of the scene's box, so the drawn stack,
     chains and board together, is what gets centred */
  padding-top: calc(50 * var(--u));
  perspective: calc(900 * var(--u));
}

/* the board's own box: 240 x 124 units. Everything else is placed on it and turns with it */
.sign {
  position: relative;
  width: calc(240 * var(--u));
  height: calc(124 * var(--u));
  transform-style: preserve-3d;
  animation: sway 12s ease-in-out infinite;
}

/* a slow turn on the chains, seen a little from above. The end is the start: no seam */
@keyframes sway {
  0%, 100% { transform: rotateX(-10deg) rotateY(-18deg); }
  50%      { transform: rotateX(-10deg) rotateY(18deg); }
}

.sign i {
  position: absolute;
}

/* the chains: two dashed metal lines from the board's top to one ring, in the middle of the
   board's thickness so they come out of its top face */
.chain {
  bottom: 100%;
  width: calc(3 * var(--u));
  height: calc(60 * var(--u));
  margin-left: calc(-1.5 * var(--u));
  border-radius: calc(1.5 * var(--u));
  background: repeating-linear-gradient(#a7a2c4 0 calc(5 * var(--u)), #5b5776 calc(5 * var(--u)) calc(7 * var(--u)));
  transform-origin: 50% 100%;
}
.chain:nth-child(1) { left: calc(80 * var(--u));  transform: translateZ(calc(var(--d) * -0.5 * var(--u))) rotate(42deg); }
.chain:nth-child(2) { left: calc(160 * var(--u)); transform: translateZ(calc(var(--d) * -0.5 * var(--u))) rotate(-42deg); }
.ring {
  box-sizing: border-box;
  left: calc(113 * var(--u));
  top: calc(-58 * var(--u));
  width: calc(14 * var(--u));
  height: calc(14 * var(--u));
  border: calc(3 * var(--u)) solid #a7a2c4;
  border-radius: 50%;
  transform: translateZ(calc(var(--d) * -0.5 * var(--u)));
}

/* the four edges of the board, each folded back from the front panel's edge by a quarter turn */
.side { background: #0d0b16; }
.top {
  left: 0;
  top: 0;
  width: 100%;
  height: calc(var(--d) * var(--u));
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
  background: linear-gradient(#3a3352, #231e33); /* the lit top edge */
}
.bottom {
  left: 0;
  bottom: 0;
  width: 100%;
  height: calc(var(--d) * var(--u));
  transform-origin: 50% 100%;
  transform: rotateX(90deg);
}
.left,
.right {
  top: 0;
  width: calc(var(--d) * var(--u));
  height: 100%;
  background: linear-gradient(#1c1729, #0d0b16);
}
.left  { left: 0;  transform-origin: 0 50%;    transform: rotateY(90deg); }
.right { right: 0; transform-origin: 100% 50%; transform: rotateY(-90deg); }

/* the front panel: dark, with a screw in each corner. It is the surface the word is read against */
.board {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at calc(12 * var(--u)) calc(12 * var(--u)), #8c87a8 calc(2.5 * var(--u)), transparent calc(3 * var(--u))),
    radial-gradient(circle at calc(100% - 12 * var(--u)) calc(12 * var(--u)), #8c87a8 calc(2.5 * var(--u)), transparent calc(3 * var(--u))),
    radial-gradient(circle at calc(12 * var(--u)) calc(100% - 12 * var(--u)), #8c87a8 calc(2.5 * var(--u)), transparent calc(3 * var(--u))),
    radial-gradient(circle at calc(100% - 12 * var(--u)) calc(100% - 12 * var(--u)), #8c87a8 calc(2.5 * var(--u)), transparent calc(3 * var(--u))),
    linear-gradient(165deg, #211b33, #100d1b 70%);
  box-shadow: inset 0 0 0 calc(1.5 * var(--u)) rgb(255 255 255 / 0.07);
}

/* the frame tube, teal, and the light it casts on the board just behind it */
.frame,
.frame-cast {
  box-sizing: border-box;
  inset: calc(14 * var(--u)) calc(16 * var(--u));
  border-radius: calc(18 * var(--u));
}
.frame {
  border: calc(3 * var(--u)) solid #d8fffb;
  box-shadow:
    0 0 calc(3 * var(--u)) #2ee6d6,
    0 0 calc(10 * var(--u)) rgb(46 230 214 / 0.6),
    inset 0 0 calc(3 * var(--u)) #2ee6d6;
  /* a unit behind the letters: two planes at the same depth have no stable order */
  transform: translateZ(calc((var(--z) - 1) * var(--u)));
}
.frame-cast {
  box-shadow:
    0 0 calc(18 * var(--u)) rgb(46 230 214 / 0.32),
    inset 0 0 calc(18 * var(--u)) rgb(46 230 214 / 0.32);
  transform: translateZ(calc(0.5 * var(--u)));
}

/* the word, centred on the board; each letter is a 3D group of tube, bracket and cast light */
.word {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: calc(7 * var(--u));
  transform-style: preserve-3d;
  font: 500 calc(58 * var(--u)) / 1 Inter, system-ui, sans-serif;
}
.letter {
  position: relative;
  transform-style: preserve-3d;
}

/* the tube: a hot near-white core with a pink glass edge and a halo, out in front of the board */
.letter b {
  display: block;
  font-weight: inherit;
  color: #fff4fa;
  -webkit-text-stroke: calc(1 * var(--u)) #ff7ab5;
  text-shadow:
    0 0 calc(8 * var(--u)) rgb(255 77 157 / 0.6),
    0 0 calc(20 * var(--u)) rgb(255 77 157 / 0.35);
  transform: translateZ(calc(var(--z) * var(--u)));
}

/* the light the tube throws on the board behind it */
.cast {
  inset: calc(-20 * var(--u)) calc(-24 * var(--u));
  background: radial-gradient(closest-side, rgb(255 77 157 / 0.3), transparent);
  transform: translateZ(calc(0.5 * var(--u)));
}

/* the stand-off bracket under the bottom stroke: two crossed planes from the board to the tube,
   one flat and one upright, so it reads as a rod from either side of the turn */
.post {
  left: var(--p);
  bottom: calc(8.5 * var(--u));   /* centred on the bottom stroke, just above the baseline */
  width: calc(4 * var(--u));
  height: calc(4 * var(--u));
  margin-left: calc(-2 * var(--u));
  transform-style: preserve-3d;
}
.post::before,
.post::after {
  content: '';
  position: absolute;
  background: linear-gradient(#77729a, #3b3651);
}
.post::before {
  /* flat: its height becomes depth with a quarter turn about its top edge */
  left: 0;
  top: calc(2 * var(--u));
  width: calc(4 * var(--u));
  height: calc(var(--z) * var(--u));
  transform-origin: 50% 0;
  transform: rotateX(90deg);
}
.post::after {
  /* upright: its width becomes depth with a quarter turn about its left edge */
  left: calc(2 * var(--u));
  top: 0;
  width: calc(var(--z) * var(--u));
  height: calc(4 * var(--u));
  transform-origin: 0 50%;
  transform: rotateY(-90deg);
}

/* the E stutters once a loop: its tube and its cast dip together, opacity only, on the leaves */
.letter:nth-child(3) b,
.letter:nth-child(3) .cast {
  animation: flicker 12s linear infinite;
}
@keyframes flicker {
  0%, 70%   { opacity: 1; }
  71%       { opacity: 0.25; }
  72%       { opacity: 0.9; }
  73.5%     { opacity: 0.35; }
  75%, 100% { opacity: 1; }
}`,
  },
};
