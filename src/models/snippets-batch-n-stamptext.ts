/**
 * Paste-anywhere version of the stamptext model: plain HTML + CSS, no Sass, no build step.
 * See snippets.ts for the format this file follows.
 */
import type { Snippet } from './snippet-utils';

export const snippetsStamptext: Record<string, Snippet> = {
  stamptext: {
    how: [
      'The paper card lies on a desk seen from above: the desk is one element turned <code>rotateX(52deg) rotateZ(-8deg)</code>, and the card, its ink, the stamp’s shadow and the stamp all live in that one tilted space, so “down” for the stamp is plain <code>translateZ</code> toward the card.',
      'The stamp is two boxes, a rubber pad and a wooden block, each built from its footprint: the top is pushed up with <code>translateZ</code>, the four sides are folded up from the footprint’s edges with a quarter turn (<code>rotateX(±90deg)</code>, <code>rotateY(±90deg)</code>) and <code>backface-visibility: hidden</code>, so only the sides facing you are drawn as the stamp turns with the desk.',
      'The handle is round, so it looks the same from every side: it is drawn flat, as a <b>billboard</b> turned to face you. Its transform is the inverse of the desk’s and the stamp’s turns, <code>rotateZ(12deg) … rotateX(-52deg)</code>, and it stands a little forward and up so its round foot sits on the top face instead of sinking into it.',
      'One 5-second timeline drives everything. The stamp drops with an ease-in, sits for a beat and lifts with an ease-out; its shadow tightens and darkens as it lands. The ink is switched on in a single step at the moment of contact, while the pad covers it, so it is simply there when the stamp lifts. It fades out while the stamp hovers, before the next press, and the end of the loop is its start.',
      'The ink sits on the card, the model’s own cream surface, so the word is deep crimson on paper on the dark stage and the light one alike. Only <code>transform</code> and <code>opacity</code> animate, and every length is a multiple of one base unit, <code>--u</code>, tied to the canvas.',
    ],
    html: `<div class="scene">
  <div class="desk">
    <div class="sheet">
      <i class="shade"></i>
      <p class="ink">APPROVED</p>
    </div>
    <div class="stamp" aria-hidden="true">
      <div class="box pad"><i class="bk"></i><i class="lf"></i><i class="rt"></i><i class="fr"></i></div>
      <div class="box block"><i class="bk"></i><i class="lf"></i><i class="rt"></i><i class="fr"></i><i class="t"></i></div>
      <div class="handle"><i class="collar"></i><i class="neck"></i><i class="knob"></i></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the stamp is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.245vmin;
  --tilt: 52deg;          /* how far the desk is tipped back from facing you */
  --turn: -8deg;          /* how far the card is turned on the desk */
  --skew: -4deg;          /* how crooked the stamp comes down, and so the word */
  /* the lifted stamp stands up out of the desk, so the scene's box gets room above the card:
     this is what centres the drawn stack, stamp and card together (and a little on the right,
     since the turned card and the perspective lean the drawing that way) */
  padding: calc(134 * var(--u)) calc(16 * var(--u)) 0 0;
  perspective: calc(900 * var(--u));
}

/* the desk's space: 240 x 160 units, tipped back so you look down at it */
.desk {
  position: relative;
  width: calc(240 * var(--u));
  height: calc(160 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(var(--tilt)) rotateZ(var(--turn));
}

/* the card: cream paper with a title bar and ruled lines, a hard edge for its thickness and a
   soft shadow. It is the surface the ink is read against */
.sheet {
  position: absolute;
  inset: 0;
  border-radius: calc(4 * var(--u));
  background:
    linear-gradient(#cfc8ec, #cfc8ec) calc(20 * var(--u)) calc(18 * var(--u)) / calc(84 * var(--u)) calc(9 * var(--u)) no-repeat,
    linear-gradient(#e3dccb, #e3dccb) calc(20 * var(--u)) calc(34 * var(--u)) / calc(128 * var(--u)) calc(4 * var(--u)) no-repeat,
    repeating-linear-gradient(transparent 0 calc(13 * var(--u)), #e6e0d1 calc(13 * var(--u)) calc(15 * var(--u))) calc(20 * var(--u)) calc(46 * var(--u)) / calc(200 * var(--u)) calc(96 * var(--u)) no-repeat,
    #f8f4ea;
  box-shadow:
    0 calc(2 * var(--u)) 0 #cfc5ad,
    0 calc(8 * var(--u)) calc(16 * var(--u)) rgb(0 0 0 / 0.22);
}

/* the stamp's shadow on the card: wide and faint while it hovers, tight and dark as it lands */
.shade {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(190 * var(--u));
  height: calc(92 * var(--u));
  margin: calc(-46 * var(--u)) 0 0 calc(-95 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(40 20 30 / 0.55), transparent);
  animation: shade 5s infinite;
}

/* the word: crimson ink in a double frame, as crooked as the stamp that made it */
.ink {
  position: absolute;
  left: 50%;
  top: 50%;
  box-sizing: border-box;
  width: calc(150 * var(--u));
  height: calc(54 * var(--u));
  margin: calc(-27 * var(--u)) 0 0 calc(-75 * var(--u));
  display: grid;
  place-items: center;
  padding-left: 0.08em;   /* letter-spacing adds a space after the last letter: balance it */
  border: calc(3.5 * var(--u)) solid currentColor;
  border-radius: calc(7 * var(--u));
  outline: calc(1.5 * var(--u)) solid currentColor;
  outline-offset: calc(-8 * var(--u));
  color: #a10f48;
  font: 800 calc(22 * var(--u)) / 1 Inter, system-ui, sans-serif;
  letter-spacing: 0.08em;
  transform: rotate(var(--skew));
  animation: ink 5s linear infinite;
}

/* the stamp stands on the card's middle; the animation lifts it */
.stamp {
  position: absolute;
  left: calc(35 * var(--u));
  top: calc(44 * var(--u));
  width: calc(170 * var(--u));
  height: calc(72 * var(--u));
  transform-style: preserve-3d;
  animation: press 5s infinite;
}

/* a box from its footprint: --w x --d units, --h tall, its floor --z0 above the stamp's foot */
.box {
  position: absolute;
  left: calc(50% - var(--w) * 0.5 * var(--u));
  top: calc(50% - var(--d) * 0.5 * var(--u));
  width: calc(var(--w) * var(--u));
  height: calc(var(--d) * var(--u));
  transform-style: preserve-3d;
}
.box > i {
  position: absolute;
  backface-visibility: hidden; /* a side facing away is not drawn */
}
.box > .t {
  inset: 0;
  transform: translateZ(calc((var(--z0) + var(--h)) * var(--u)));
}
/* each side is folded up from an edge of the footprint by a quarter turn about that edge */
.box > .fr,
.box > .bk {
  left: 0;
  width: 100%;
  height: calc(var(--h) * var(--u));
}
.box > .fr { bottom: 0; transform-origin: 50% 100%; transform: translateZ(calc(var(--z0) * var(--u))) rotateX(-90deg); }
.box > .bk { top: 0;    transform-origin: 50% 0;    transform: translateZ(calc(var(--z0) * var(--u))) rotateX(90deg); }
.box > .lf,
.box > .rt {
  top: 0;
  width: calc(var(--h) * var(--u));
  height: 100%;
}
.box > .lf { left: 0;  transform-origin: 0 50%;    transform: translateZ(calc(var(--z0) * var(--u))) rotateY(-90deg); }
.box > .rt { right: 0; transform-origin: 100% 50%; transform: translateZ(calc(var(--z0) * var(--u))) rotateY(90deg); }

/* the rubber: dark, with the inked face showing as a crimson line along its foot */
.pad { --w: 160; --d: 64; --h: 7; --z0: 0; }
.pad > i { background: linear-gradient(#2a1a26 70%, #b3124e 0); }
.pad > .lf { background: linear-gradient(-90deg, #2a1a26 70%, #b3124e 0); }
.pad > .rt { background: linear-gradient(90deg, #2a1a26 70%, #b3124e 0); }

/* the wooden block: grain on every face, lit from the top, darker on the ends */
.block { --w: 170; --d: 72; --h: 30; --z0: 7; }
.block > i {
  background:
    repeating-linear-gradient(90deg, rgb(90 45 15 / 0.16) 0 calc(2 * var(--u)), transparent 0 calc(9 * var(--u))),
    linear-gradient(#c58a55, #8f5a31);
}
.block > .lf,
.block > .rt {
  background:
    repeating-linear-gradient(0deg, rgb(90 45 15 / 0.16) 0 calc(2 * var(--u)), transparent 0 calc(9 * var(--u))),
    #7a4a27;
}
.block > .t {
  border-radius: calc(2 * var(--u));
  background:
    /* a violet label on the top, as a real stamp has */
    linear-gradient(#8b6cff, #6a45f5) 50% 50% / calc(70 * var(--u)) calc(30 * var(--u)) no-repeat,
    repeating-linear-gradient(90deg, rgb(90 45 15 / 0.14) 0 calc(2 * var(--u)), transparent 0 calc(9 * var(--u))),
    linear-gradient(#e2ab74, #cf945e);
}

/* the handle, drawn flat and turned to face you: the inverse of the desk's and the stamp's turns.
   The block's top is 37 units up. The foot is a circle of radius 23 seen at --tilt, an ellipse
   14 units deep, so the billboard stands 14 forward and 11 up (23 sin² 52°, 23 sin 52° cos 52°)
   and its round foot lands on the top face rather than sinking into the block */
.handle {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translateZ(calc(37 * var(--u))) rotateZ(calc(-1 * (var(--turn) + var(--skew)))) translate3d(0, calc(14.3 * var(--u)), calc(11.2 * var(--u))) rotateX(calc(-1 * var(--tilt)));
}
.handle > i {
  position: absolute;
  left: 50%;
}
/* the brass collar, with the round foot as the bottom half of an ellipse */
.collar {
  bottom: calc(-14.2 * var(--u));
  width: calc(46 * var(--u));
  height: calc(28 * var(--u));
  margin-left: calc(-23 * var(--u));
  border-radius: 0 0 50% 50% / 0 0 calc(14.2 * var(--u)) calc(14.2 * var(--u));
  background: linear-gradient(90deg, #6b4a1c, #e7c27a 35%, #f6dca0 45%, #a77b35 80%, #6b4a1c);
}
/* the collar's flat top, the same ellipse seen from above, with the neck rising out of it */
.collar::before {
  content: '';
  position: absolute;
  left: 0;
  top: calc(-14.2 * var(--u));
  width: 100%;
  height: calc(28.4 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, #8a6427 40%, #e9c886 75%, #c99a4c);
}
/* the turned wooden neck: a cylinder, so its light runs down it */
.neck {
  bottom: calc(10 * var(--u));
  width: calc(24 * var(--u));
  height: calc(52 * var(--u));
  margin-left: calc(-12 * var(--u));
  border-radius: calc(10 * var(--u));
  background: linear-gradient(90deg, #6e3f1d, #d79a5f 35%, #eebb83 45%, #a76a38 80%, #6e3f1d);
}
/* the knob: a violet ball, lit from the upper left */
.knob {
  bottom: calc(54 * var(--u));
  width: calc(52 * var(--u));
  height: calc(52 * var(--u));
  margin-left: calc(-26 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 36% 32%, #d9ccff, #8b6cff 32%, #5a3fd0 68%, #2f1f78);
}

/* the press: hover, drop (ease-in), a beat on the card, lift (ease-out), hover. The end is the
   start. --skew turns the stamp the same way as the word it leaves */
@keyframes press {
  0%, 30% {
    transform: rotateZ(var(--skew)) translateZ(calc(70 * var(--u)));
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.4);
  }
  44% {
    transform: rotateZ(var(--skew)) translateZ(calc(-0.5 * var(--u)));
    animation-timing-function: ease-in-out;
  }
  47% {
    transform: rotateZ(var(--skew)) translateZ(calc(1 * var(--u)));
    animation-timing-function: ease-in-out;
  }
  52% {
    transform: rotateZ(var(--skew)) translateZ(0);
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
  }
  72%, 100% {
    transform: rotateZ(var(--skew)) translateZ(calc(70 * var(--u)));
  }
}

/* the shadow follows the stamp's height on the same clock */
@keyframes shade {
  0%, 30% {
    transform: rotate(var(--skew)) scale(1.2);
    opacity: 0.35;
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.4);
  }
  44%, 52% {
    transform: rotate(var(--skew)) scale(0.92);
    opacity: 1;
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
  }
  72%, 100% {
    transform: rotate(var(--skew)) scale(1.2);
    opacity: 0.35;
  }
}

/* the ink: there at the start (the last press), fading while the stamp hovers, gone until the
   pad touches the card at 44%, then on in one step, under the pad where no one sees it switch */
@keyframes ink {
  0%, 10%  { opacity: 1; }
  26%      { opacity: 0; }
  43.9%    { opacity: 0; }
  44%, 100% { opacity: 1; }
}`,
  },
};
