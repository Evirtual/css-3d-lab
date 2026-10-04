/**
 * Paste-anywhere version of the lever model: plain HTML + CSS, no Sass, no build step.
 * See snippets.ts for the format this file follows.
 */
import type { Snippet } from './snippet-utils';

export const snippetsLever: Record<string, Snippet> = {
  lever: {
    how: [
      'A real <code>&lt;input type="checkbox" role="switch"&gt;</code> holds the state, so Space, forms and screen readers all work. It is hidden with <code>opacity: 0</code>, never <code>display: none</code>, so Tab still reaches it, and the whole <code>&lt;label&gt;</code> round it is the static hit target: nothing the pointer touches ever moves.',
      'The plate is a box seen from above and to the right (<code>rotateX(-12deg) rotateY(-30deg)</code>): a front, and four edges folded back from it with <code>backface-visibility: hidden</code>, so only the top and the right edge, the ones facing you, are drawn.',
      'The arm hangs from an axle between two cheeks, 24 units out from the plate. It is a box of four long faces built round the axle point, and the whole box turns with one <code>rotateX(var(--a))</code>: <code>-40deg</code> is up and out, and <code>input:checked + .rig</code> sets <code>-140deg</code>, down and out. The transition swings it through the air in front of the plate, with a little wind-up and overshoot, and <code>backface-visibility: hidden</code> shows whichever faces of the arm turn toward you as it goes.',
      'The knob is a ball, so it is drawn flat and turned to face you: its transform is the inverse of everything above it, <code>rotateX(calc(-1 * var(--a))) rotateY(30deg) rotateX(12deg)</code>. It runs the same transition as the arm, so the two turns cancel at every moment and the ball stays round all the way down.',
      'The lamp is a lens with a lit copy over it and a glow on the plate round it; checked, both fade in with <code>opacity</code>, timed to land as the arm does. The words on the plate are on the plate’s own dark face, so they read on either stage, and a ring in the stage’s ink shows keyboard focus. Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas.',
    ],
    html: `<label class="lever">
  <input type="checkbox" role="switch" aria-label="Power" />
  <span class="rig" aria-hidden="true">
    <i class="edge top"></i><i class="edge bottom"></i><i class="edge left"></i><i class="edge right"></i>
    <span class="face"><b class="off">OFF</b><b class="on">ON</b></span>
    <i class="glow"></i><i class="bezel"></i><i class="lens"></i><i class="lit"></i>
    <i class="cheek"></i><i class="cheek"></i>
    <span class="pivot">
      <span class="arm"><i class="af"></i><i class="ab"></i><i class="al"></i><i class="ar"></i><i class="cap"></i><i class="ball"></i></span>
    </span>
  </span>
</label>`,
    css: `/* one label: the static hit target round a real checkbox */
.lever {
  /* one base unit: every length below is a multiple of it, so the lever is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.28vmin;
  --a: -40deg;            /* the arm's turn about the axle: up and out */
  position: relative;
  display: grid;
  place-items: center;
  perspective: calc(900 * var(--u));
  cursor: pointer;
  user-select: none;
}
.lever * {
  pointer-events: none;
}

/* hidden but still focusable: Tab reaches it, Space toggles it */
.lever input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
}

/* the plate's space: 150 x 200 units, its front at z = 0, seen from above and to the right */
.rig {
  position: relative;
  display: block;
  width: calc(150 * var(--u));
  height: calc(200 * var(--u));
  border-radius: calc(6 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(-12deg) rotateY(-30deg);
}
.rig i,
.rig b {
  position: absolute;
}

/* the plate's edges: each laid just outside the front's edge and folded back about it, facing
   outward, so the ones turned away from you are not drawn */
.edge {
  backface-visibility: hidden;
  background: linear-gradient(#3b4066, #1d2038);
}
.edge.top,
.edge.bottom {
  left: 0;
  width: 100%;
  height: calc(16 * var(--u));
}
.edge.top    { bottom: 100%; transform-origin: 50% 100%; transform: rotateX(90deg); background: linear-gradient(#272b48, #4b5180); }
.edge.bottom { top: 100%;    transform-origin: 50% 0;    transform: rotateX(-90deg); }
.edge.left,
.edge.right {
  top: 0;
  width: calc(16 * var(--u));
  height: 100%;
  background: linear-gradient(90deg, #343960, #1b1e35);
}
.edge.left  { right: 100%; transform-origin: 100% 50%; transform: rotateY(-90deg); }
.edge.right { left: 100%;  transform-origin: 0 50%;    transform: rotateY(90deg); }

/* the plate's front: dark steel with a screw in each corner. The words are engraved in it, so
   they read against the plate on either stage */
.face {
  position: absolute;
  inset: 0;
  border-radius: calc(4 * var(--u));
  background:
    radial-gradient(circle at calc(14 * var(--u)) calc(14 * var(--u)), #9aa0c4 calc(3 * var(--u)), transparent calc(3.6 * var(--u))),
    radial-gradient(circle at calc(100% - 14 * var(--u)) calc(14 * var(--u)), #9aa0c4 calc(3 * var(--u)), transparent calc(3.6 * var(--u))),
    radial-gradient(circle at calc(14 * var(--u)) calc(100% - 14 * var(--u)), #9aa0c4 calc(3 * var(--u)), transparent calc(3.6 * var(--u))),
    radial-gradient(circle at calc(100% - 14 * var(--u)) calc(100% - 14 * var(--u)), #9aa0c4 calc(3 * var(--u)), transparent calc(3.6 * var(--u))),
    /* the slot the arm swings in front of */
    linear-gradient(#0c0e1c, #0c0e1c) calc(53 * var(--u)) calc(48 * var(--u)) / calc(10 * var(--u)) calc(140 * var(--u)) no-repeat,
    linear-gradient(160deg, #2f3456, #1a1d33 75%);
  box-shadow: inset 0 0 0 calc(1.5 * var(--u)) rgb(255 255 255 / 0.08);
}
/* the words stand in a column on the right, OFF by the arm's up position, ON over the lamp */
.face b {
  left: calc(112 * var(--u));
  transform: translateX(-50%);
  padding-left: 0.14em;   /* letter-spacing adds a space after the last letter: balance it */
  font: 700 calc(13 * var(--u)) / 1 Inter, system-ui, sans-serif;
  letter-spacing: 0.14em;
  color: #c9cde6;
}
.face .off { top: calc(40 * var(--u)); }
.face .on  { top: calc(112 * var(--u)); }

/* the lamp: a bezel on the plate, a lens standing proud of it, a lit copy of the lens and the
   glow it throws on the plate. Off, only the dark lens shows */
.glow {
  left: calc(72 * var(--u));
  top: calc(122 * var(--u));
  width: calc(80 * var(--u));
  height: calc(80 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(255 181 71 / 0.45), transparent);
  transform: translateZ(calc(0.3 * var(--u)));
  opacity: 0;
  transition: opacity 0.3s;
}
.bezel {
  left: calc(94 * var(--u));
  top: calc(144 * var(--u));
  width: calc(36 * var(--u));
  height: calc(36 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle, #10121f 58%, #8e94b8 62%, #4a4f72 100%);
  transform: translateZ(calc(0.6 * var(--u)));
}
.lens,
.lit {
  left: calc(100 * var(--u));
  top: calc(150 * var(--u));
  width: calc(24 * var(--u));
  height: calc(24 * var(--u));
  border-radius: 50%;
  transform: translateZ(calc(4 * var(--u)));
}
.lens { background: radial-gradient(circle at 38% 34%, #8a6a3e, #3b2a14 70%); }
.lit {
  background: radial-gradient(circle at 38% 34%, #fff6df, #ffb547 45%, #e0861a);
  box-shadow: 0 0 calc(10 * var(--u)) #ffb547;
  transform: translateZ(calc(4.2 * var(--u)));
  opacity: 0;
  transition: opacity 0.3s;
}

/* on: the lamp lights as the arm lands */
.lever input:checked + .rig .lit,
.lever input:checked + .rig .glow {
  opacity: 1;
  transition-delay: 0.38s;
}

/* the cheeks: two steel plates standing out of the front, 9 units either side of the arm, with
   the axle's caps on them */
.cheek {
  top: calc(98 * var(--u));
  width: calc(36 * var(--u));
  height: calc(40 * var(--u));
  border-radius: 0 calc(20 * var(--u)) calc(20 * var(--u)) 0;
  background:
    radial-gradient(circle at calc(24 * var(--u)) 50%, #eef0fa calc(3 * var(--u)), #5b6080 calc(4.5 * var(--u)), transparent calc(5 * var(--u))),
    linear-gradient(90deg, #4b5076, #8d93b5);
  transform-origin: 0 50%;
  transform: rotateY(-90deg); /* its width becomes depth, out of the plate */
}
.cheek          { left: calc(49 * var(--u)); }
.cheek + .cheek { left: calc(67 * var(--u)); }

/* the axle: 24 units out from the plate, between the cheeks. The arm turns about it */
.pivot {
  position: absolute;
  left: calc(58 * var(--u));
  top: calc(118 * var(--u));
  transform-style: preserve-3d;
  transform: translateZ(calc(24 * var(--u)));
}
.arm {
  position: absolute;
  transform-style: preserve-3d;
  transform: rotateX(var(--a));
  /* a little wind-up, a swing, a little overshoot: the knob below runs the same curve */
  transition: transform 0.55s cubic-bezier(0.45, -0.25, 0.3, 1.3);
}

/* checked: down and out */
.lever input:checked + .rig {
  --a: -140deg;
}

/* the arm: four long faces round the axle point, 12 x 12 in section, from 10 units behind the
   axle to 72 units out, where it goes into the knob (centred 88 out), and a cap on its end. It
   stops inside the ball's edge: run on to the centre, it would show through the flat ball.
   A face turned away is not drawn */
.arm i:not(.ball) {
  left: calc(-6 * var(--u));
  top: calc(-72 * var(--u));
  width: calc(12 * var(--u));
  height: calc(82 * var(--u));
  backface-visibility: hidden;
}
.af { background: linear-gradient(90deg, #9aa0c0, #eef0fa 45%, #b3b8d4 70%, #6e7392); transform: translateZ(calc(6 * var(--u))); }
.ab { background: linear-gradient(90deg, #7a80a3, #c9cde6 45%, #9399b8 70%, #555a7e); transform: translateZ(calc(-6 * var(--u))) rotateY(180deg); }
.al { background: linear-gradient(90deg, #555a7e, #8d93b5); transform: rotateY(-90deg) translateZ(calc(6 * var(--u))); }
.ar { background: linear-gradient(90deg, #8d93b5, #5b6080); transform: rotateY(90deg) translateZ(calc(6 * var(--u))); }
.arm i.cap {
  top: calc(-78 * var(--u));
  height: calc(12 * var(--u));
  background: #6e7392;
  transform: rotateX(90deg); /* about its own middle, at 72 out: it faces along the arm */
}

/* the knob: a pink ball at the arm's end, drawn flat and turned to face you. Its transform
   undoes the arm's turn and then the plate's, so it is always seen face-on, and it runs the
   arm's own transition so the two cancel at every moment of the swing */
.ball {
  left: calc(-18 * var(--u));
  top: calc(-106 * var(--u));
  width: calc(36 * var(--u));
  height: calc(36 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle at 36% 32%, #ffd3e6, #ff4d9d 34%, #c81e6a 72%, #6e0f3a);
  transform: rotateX(calc(-1 * var(--a))) rotateY(30deg) rotateX(12deg);
  transition: transform 0.55s cubic-bezier(0.45, -0.25, 0.3, 1.3);
}

/* focus from the keyboard: a ring in the stage's own ink round the plate */
.lever input:focus-visible + .rig {
  outline: calc(2.5 * var(--u)) solid currentColor;
  outline-offset: calc(8 * var(--u));
}`,
  },
};
