/**
 * Paste-anywhere version of the controller model: plain HTML + CSS, no JavaScript, no build step.
 * See snippets.ts for the format this file follows.
 */
import type { Snippet } from './snippet-utils';

/** The body's slices, bottom to top: each one's scale rounds the edge, so the body is a pebble, not a slab. */
const SLICES = [0.9, 0.94, 0.965, 0.98, 0.99, 1, 1, 1, 0.997, 0.99, 0.98, 0.965, 0.95];

export const snippetsController: Record<string, Snippet> = {
  controller: {
    how: [
      'The body is thirteen copies of one outline stacked 2.2 units apart in <code>translateZ</code>, darker toward the bottom and each scaled a touch (smaller at the top and bottom), so seen from the side the edge is a rounded, shaded wall rather than a flat card. One slice is one element: the middle of the body is its own box, and the two grips are its <code>::before</code> and <code>::after</code>, rotated outward.',
      'Every button, the two sticks included, is a real <code>&lt;button&gt;</code> standing a few units proud of the top face, with a darker copy of itself on its <code>::before</code> a little lower: that copy is the side of the cap. Pressed (<code>:active</code>, or focused from the keyboard) the cap drops with <code>translateZ</code>; its side copy sinks below the face and the face, opaque, hides it, so the button really goes into its hole. The holes are dark rings painted on the face.',
      'The whole controller is posed by custom properties, <code>transform: translateZ(--lift) rotateY(--ry) rotateX(--rx) rotateZ(--rz)</code>, with a transition. Hover or focus anywhere on it changes <code>--rx</code> and <code>--lift</code>, and it rises toward you; while a button is held, <code>.pad:has(button:active)</code> sets <code>--push</code> and the hand pushes it down a little. The transform follows because changing a variable changes the computed transform.',
      'It turns toward the pointer with no script: two invisible halves lie behind it, and the controller stands 90 units in front of them (the browser’s hit test drops whatever is behind the plane of the pad, so tipped back without that, the top buttons could not be clicked), and <code>.pad:has(.zl:hover, .l:hover)</code> sets <code>--ry</code> one way, <code>.zr</code> the other. The drawn body has <code>pointer-events: none</code> and only the buttons take the pointer, so a button on the left counts as the left half (and a focused one too, so the keyboard leans it as well). The sticks lean the same way about their base.',
      'The wrapper that takes the hover never moves; a slow bob on the layer inside it and a shadow that breathes with it keep it alive at rest. Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas.',
    ],
    html: `<div class="scene">
  <div class="pad">
    <i class="zone zl"></i><i class="zone zr"></i>
    <i class="shade"></i>
    <div class="float">
      <div class="tilt">
        <button class="bump l" style="--x:88;--y:-4;--r:-13deg" aria-label="Left bumper"></button>
        <button class="bump r" style="--x:212;--y:-4;--r:13deg" aria-label="Right bumper"></button>
${SLICES.map((s, k) => `        <i class="slice${k === SLICES.length - 1 ? ' top' : ''}" style="--k:${k};--s:${s}"></i>`).join('\n')}
        <div class="face">
          <button class="stick l" style="--x:82;--y:60" aria-label="Left stick"></button>
          <button class="stick r" style="--x:186;--y:110" aria-label="Right stick"></button>
          <span class="hub"></span>
          <button class="dp up l" style="--x:114;--y:93" aria-label="D-pad up"></button>
          <button class="dp down l" style="--x:114;--y:127" aria-label="D-pad down"></button>
          <button class="dp left l" style="--x:97;--y:110" aria-label="D-pad left"></button>
          <button class="dp right l" style="--x:131;--y:110" aria-label="D-pad right"></button>
          <button class="fb r" style="--x:218;--y:35;--c:#ffb547">Y</button>
          <button class="fb r" style="--x:193;--y:60;--c:#8cc2ff">X</button>
          <button class="fb r" style="--x:243;--y:60;--c:#ff7aa8">B</button>
          <button class="fb r" style="--x:218;--y:85;--c:#3cf0a0">A</button>
          <button class="sys view l" style="--x:129;--y:64" aria-label="View"></button>
          <button class="sys home" style="--x:150;--y:34" aria-label="Home"></button>
          <button class="sys menu r" style="--x:171;--y:64" aria-label="Menu"></button>
        </div>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the controller is the same share
     of a card, the editor, a full screen and a recording canvas */
  --u: 0.27vmin;
}

/* the wrapper: it takes the hover and never moves. Its box is the controller's plan, 300 x 200 */
.pad {
  position: relative;
  width: calc(300 * var(--u));
  height: calc(200 * var(--u));
  perspective: calc(900 * var(--u));
  /* one 3D space for everything, the hover halves included, so the browser sorts them by depth.
     The pad's own box is a flat plane in that space too, in front of whatever tilts back behind
     it (the bumpers, the top buttons), so it takes no pointer itself: the halves and the buttons
     inside it do, and hovering them is hovering the pad */
  transform-style: preserve-3d;
  pointer-events: none;
  outline: none;
}
.pad * {
  box-sizing: border-box;
}

/* two invisible halves behind the controller, in the pad's plane: hovering one turns it that way.
   The controller stands 90 units in front of that plane (see .tilt), so in every pose every
   button is in front of them and takes its own click */
.zone {
  position: absolute;
  top: calc(-20 * var(--u));
  bottom: calc(-20 * var(--u));
  width: 50%;
  pointer-events: auto;
}
.zl { left: 0; }
.zr { right: 0; }

/* a soft shadow on the floor under it, breathing with the bob */
.shade {
  position: absolute;
  left: calc(40 * var(--u));
  right: calc(40 * var(--u));
  bottom: calc(-6 * var(--u));
  height: calc(40 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(20 10 60 / 0.3), transparent);
  pointer-events: none;
  animation: breathe 4.8s ease-in-out infinite;
}

/* the bob, on its own layer so the hover pose and the loop never fight over one transform.
   Nothing drawn takes the pointer but the buttons */
.float {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  pointer-events: none;
  animation: bob 4.8s ease-in-out infinite;
}
@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(calc(-6 * var(--u))); }
}
@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(0.9); opacity: 0.7; }
}

/* the pose: a few numbers, changed by the states below, and one transition that follows them */
.tilt {
  --rx: 34deg;     /* tipped back, so you look down on the face, but not so far that it squashes */
  --rz: -11deg;    /* turned in its own plane: the three-quarter view */
  --ry: 0deg;      /* the turn toward the pointer */
  --lift: 0;
  --sy: 0deg;      /* the sticks' lean */
  --push: 0;       /* 1 while a button is held: the hand pushes the whole controller down a little */
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  /* 90 units toward you: the browser's hit test drops what lies behind the plane of the pad, and
     tipped back, the top of the controller would; this keeps every part of it in front */
  transform: translateZ(calc((90 + var(--lift) - var(--push) * 6) * var(--u))) rotateY(var(--ry)) rotateX(calc(var(--rx) + var(--push) * 2deg)) rotateZ(var(--rz));
  transition: transform 0.7s cubic-bezier(0.25, 0.8, 0.3, 1);
}
.pad:is(:hover, :focus-within) .tilt {
  --rx: 31deg;
  --lift: 4;
}
.pad:has(.zl:hover, .l:hover, .l:focus-visible) .tilt {
  --ry: -9deg;
  --sy: -22deg;
}
.pad:has(.zr:hover, .r:hover, .r:focus-visible) .tilt {
  --ry: 9deg;
  --sy: 22deg;
}
.pad:has(button:active) .tilt {
  --push: 1;
}

/* ---- the body: thirteen slices of one outline, 2.2 units apart ---- */
.slice {
  position: absolute;
  left: calc(32 * var(--u));
  top: calc(8 * var(--u));
  width: calc(236 * var(--u));
  height: calc(136 * var(--u));
  border-radius: calc(72 * var(--u)) calc(72 * var(--u)) calc(44 * var(--u)) calc(44 * var(--u)) / calc(60 * var(--u)) calc(60 * var(--u)) calc(44 * var(--u)) calc(44 * var(--u));
  /* darker toward the bottom: the wall reads as turning away from the light */
  background: hsl(252 58% calc(15% + var(--k) * 2.2%));
  transform-origin: 50% 64%;
  transform: translateZ(calc(var(--k) * 2.2 * var(--u))) scale(var(--s));
}
/* the grips: rounded bars splayed outward, part of the same slice */
.slice::before,
.slice::after {
  content: '';
  position: absolute;
  top: calc(72 * var(--u));
  width: calc(88 * var(--u));
  height: calc(122 * var(--u));
  border-radius: 50% 50% 47% 47% / 40% 40% 60% 60%; /* an egg: fuller at the bottom, where the hand is */
  background: inherit;
}
.slice::before { left: calc(1 * var(--u));   transform: rotate(19deg); }
.slice::after  { right: calc(1 * var(--u));  transform: rotate(-19deg); }

/* the top face: one colour where body and grips meet, a highlight well inside the body */
.slice.top {
  background:
    radial-gradient(ellipse 58% 52% at 50% 30%, rgb(255 255 255 / 0.17), transparent),
    #6a54ee;
}
.slice.top::before,
.slice.top::after {
  background: linear-gradient(transparent 45%, rgb(20 0 60 / 0.16)), #6a54ee;
}

/* ---- the top face: the holes are dark rings painted on it, the parts stand on it ---- */
.face {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translateZ(calc(26.8 * var(--u)));
  --hole: #120f2e;
  --lip: #8c7bff;
  background:
    radial-gradient(circle at calc(82 * var(--u)) calc(60 * var(--u)), var(--hole) calc(22 * var(--u)), var(--lip) calc(23 * var(--u)), transparent calc(24.5 * var(--u))),
    radial-gradient(circle at calc(186 * var(--u)) calc(110 * var(--u)), var(--hole) calc(22 * var(--u)), var(--lip) calc(23 * var(--u)), transparent calc(24.5 * var(--u))),
    radial-gradient(circle at calc(114 * var(--u)) calc(110 * var(--u)), rgb(18 15 46 / 0.55) calc(27 * var(--u)), transparent calc(28.5 * var(--u))),
    radial-gradient(circle at calc(218 * var(--u)) calc(35 * var(--u)), var(--hole) calc(13.5 * var(--u)), transparent calc(14.5 * var(--u))),
    radial-gradient(circle at calc(193 * var(--u)) calc(60 * var(--u)), var(--hole) calc(13.5 * var(--u)), transparent calc(14.5 * var(--u))),
    radial-gradient(circle at calc(243 * var(--u)) calc(60 * var(--u)), var(--hole) calc(13.5 * var(--u)), transparent calc(14.5 * var(--u))),
    radial-gradient(circle at calc(218 * var(--u)) calc(85 * var(--u)), var(--hole) calc(13.5 * var(--u)), transparent calc(14.5 * var(--u))),
    radial-gradient(circle at calc(150 * var(--u)) calc(34 * var(--u)), var(--hole) calc(12.5 * var(--u)), transparent calc(13.5 * var(--u)));
}

/* ---- every button: placed by its middle (--x, --y) and size (--w, --h), standing --z proud ---- */
.tilt button {
  --w: 24;
  --h: 24;
  --z: 5.5;
  --down: 1;        /* how far proud it is when pressed */
  --cap: linear-gradient(160deg, #2c2f4c, #171930);
  --side: #0a0b18;
  position: absolute;
  left: calc((var(--x) - var(--w) / 2) * var(--u));
  top: calc((var(--y) - var(--h) / 2) * var(--u));
  width: calc(var(--w) * var(--u));
  height: calc(var(--h) * var(--u));
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--cap);
  color: var(--c, #c9cde6);
  font: 800 calc(14 * var(--u)) / 1 Inter, system-ui, sans-serif;
  cursor: pointer;
  pointer-events: auto;
  outline: none;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--z) * var(--u)));
  transition: transform 0.12s cubic-bezier(0.3, 0.7, 0.4, 1);
  -webkit-tap-highlight-color: transparent;
}
/* the side of the cap: a darker copy just under it. Pressed, it sinks below the face and is hidden */
.tilt button::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--side);
  transform: translateZ(calc(var(--z) * -0.5 * var(--u)));
  pointer-events: none;
}
.tilt button:is(:active, :focus-visible) {
  transform: translateZ(calc(var(--down) * var(--u)));
  transition-duration: 0.06s;
}
/* keyboard focus: a ring in white, which reads on the violet body on either stage */
.tilt button:focus-visible {
  outline: calc(1.6 * var(--u)) solid #fff;
  outline-offset: calc(2 * var(--u));
}

/* the face buttons: a lit ring of the letter's colour comes on round the last one pressed */
.fb::after {
  content: '';
  position: absolute;
  inset: calc(-2.6 * var(--u));
  border-radius: 50%;
  border: calc(1.2 * var(--u)) solid var(--c);
  box-shadow: 0 0 calc(5 * var(--u)) var(--c);
  opacity: 0;
  transform: translateZ(calc(-0.4 * var(--u)));
  transition: opacity 0.25s;
  pointer-events: none;
}
.fb:focus::after {
  opacity: 1;
}

/* the d-pad: four arms round a hub, each arm a button with a drawn arrowhead */
.tilt .dp {
  --w: 17;
  --h: 17;
  --z: 4.6;
  --down: 1;
}
.dp.up    { border-radius: calc(3 * var(--u)) calc(3 * var(--u)) 0 0; }
.dp.down  { border-radius: 0 0 calc(3 * var(--u)) calc(3 * var(--u)); }
.dp.left  { border-radius: calc(3 * var(--u)) 0 0 calc(3 * var(--u)); }
.dp.right { border-radius: 0 calc(3 * var(--u)) calc(3 * var(--u)) 0; }
.dp::after {
  content: '';
  position: absolute;
  inset: calc(5 * var(--u));
  background: #b3b8da;
  pointer-events: none;
}
.dp.up::after    { clip-path: polygon(50% 10%, 100% 80%, 0 80%); }
.dp.down::after  { clip-path: polygon(50% 90%, 100% 20%, 0 20%); }
.dp.left::after  { clip-path: polygon(10% 50%, 80% 0, 80% 100%); }
.dp.right::after { clip-path: polygon(90% 50%, 20% 0, 20% 100%); }
.hub {
  position: absolute;
  left: calc(105.5 * var(--u));
  top: calc(101.5 * var(--u));
  width: calc(17 * var(--u));
  height: calc(17 * var(--u));
  background: radial-gradient(circle, #121428 30%, #22253f 34%);
  transform: translateZ(calc(4.6 * var(--u)));
  pointer-events: none;
}

/* home, view and menu: a ringed round button between two little pills with drawn icons */
.tilt .sys.home {
  --w: 22;
  --h: 22;
}
.sys.home {
  background: radial-gradient(circle, #171930 30%, #2ee6d6 33% 45%, #171930 48%);
  box-shadow: 0 0 calc(5 * var(--u)) rgb(46 230 214 / 0.55);
}
.sys.view,
.sys.menu {
  --w: 17;
  --h: 11;
  --z: 2.8;
  --down: 0.6;
  border-radius: calc(5.5 * var(--u));
}
.sys.view::after,
.sys.menu::after {
  content: '';
  position: absolute;
  inset: calc(2.5 * var(--u)) calc(5 * var(--u));
  pointer-events: none;
}
/* view: two overlapping windows */
.sys.view::after {
  background:
    linear-gradient(#c9cde6 0 0) 0 0 / 65% 65% no-repeat,
    linear-gradient(#6d72a0 0 0) 100% 100% / 65% 65% no-repeat;
}
/* menu: three lines */
.sys.menu::after {
  background:
    linear-gradient(#c9cde6 0 0) 0 0 / 100% 22% no-repeat,
    linear-gradient(#c9cde6 0 0) 0 50% / 100% 22% no-repeat,
    linear-gradient(#c9cde6 0 0) 0 100% / 100% 22% no-repeat;
}

/* the bumpers: rounded tabs on the top edge, halfway down the body's side, that press in toward it */
.tilt .bump {
  --w: 66;
  --h: 22;
  --cap: linear-gradient(#5a49d0, #3a2d98);
  --side: #241b66;
  border-radius: calc(11 * var(--u)) calc(11 * var(--u)) calc(4 * var(--u)) calc(4 * var(--u));
  transform: translateZ(calc(15 * var(--u))) rotate(var(--r));
}
.tilt .bump::before {
  transform: translateZ(calc(-7 * var(--u)));
}
.tilt .bump:is(:active, :focus-visible) {
  transform: translateZ(calc(15 * var(--u))) rotate(var(--r)) translateY(calc(5 * var(--u)));
}

/* the sticks: buttons too (a stick clicks in). A rubber boot in the hole, a neck, and a dished cap
   on top; the whole stick leans about its base with --sy, and pressed it sinks into its hole */
.tilt .stick {
  --w: 36;
  --h: 36;
  --z: 0.6;
  --down: -3;
  --cap: radial-gradient(circle, #24263e 40%, #1a1c30 70%, #101122);
  transform: translateZ(calc(var(--z) * var(--u))) rotateY(var(--sy)) rotateX(calc(var(--sy) * -0.3));
  transition: transform 0.9s cubic-bezier(0.3, 1.5, 0.5, 1);
}
.tilt .stick:is(:active, :focus-visible) {
  transform: translateZ(calc(var(--down) * var(--u))) rotateY(var(--sy)) rotateX(calc(var(--sy) * -0.3));
  transition-duration: 0.08s;
}
.tilt .stick::before,
.tilt .stick::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.tilt .stick::before {
  inset: calc(11 * var(--u));
  background: #0c0d1c;
  transform: translateZ(calc(6 * var(--u)));
}
.tilt .stick::after {
  inset: calc(1.5 * var(--u));
  background:
    radial-gradient(circle at 50% 46%, #33375a 0 36%, #3f4470 52%, #2a2d4a 64%, #1d2036 72%, #2c2f4c 80%, #181a2e);
  box-shadow: 0 calc(2.4 * var(--u)) 0 #0b0c19;
  transform: translateZ(calc(11 * var(--u)));
}`,
  },
};
