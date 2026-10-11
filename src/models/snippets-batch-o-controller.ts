/**
 * Paste-anywhere version of the controller model: plain HTML + CSS, no JavaScript, no build step.
 * See snippets.ts for the format this file follows.
 */
import type { Snippet } from './snippet-utils';

/** The body's slices, bottom to top: each one's scale rounds the edge, so the body is a pebble, not a slab. */
const SLICES = [0.9, 0.945, 0.97, 0.985, 0.995, 1, 1, 0.995, 0.985, 0.97, 0.955];

/** The six hover cells behind the pad: three columns by two rows. Hovering one leans the pad (and
    points the sticks) toward it. */
const CELLS = [0, 1, 2].flatMap((c) => [0, 1].map((r) => `<i class="cell c${c} r${r}"></i>`)).join('');

export const snippetsController: Record<string, Snippet> = {
  controller: {
    how: [
      'The body is eleven copies of one outline stacked 2.4 units apart in <code>translateZ</code>, darker toward the bottom and each scaled a touch (smaller at the top and bottom), so the edge is a rounded, shaded wall rather than a flat card. One slice is one element: the middle of the body is its own box, and the two grips are its <code>::before</code> and <code>::after</code>, turned outward by the same angle on either side.',
      'Every control is a real <code>&lt;button&gt;</code> standing a few units proud of the face, with a darker copy of itself on its <code>::before</code> a little lower, which is the side of the cap. Pressed (<code>:active</code>) or focused, the cap drops with <code>translateZ</code>, its side sinks below the opaque face and is hidden, and the button lights: a glowing ring in its own colour round a face button, a teal arrow on the d-pad, a teal rim on a stick.',
      'The pad is posed by custom properties, <code>transform: translateZ(80 + --lift) rotateY(--ry) rotateX(--rx)</code>, with one transition. Six invisible cells lie behind it, three columns by two rows, and <code>.pad:has(.c0:hover)</code> turns it toward the left, <code>.r0</code> tips its top away, and so on: it leans toward the pointer with no script. Each button carries its own cell’s classes, so pointing at a button or focusing it leans the pad the same way. The sticks tip toward the pointer by the same rules.',
      'In 3D the browser hit-tests by depth and drops whatever lies behind the plane of the 3D root, so the pad stands 80 units in front of the cells: tipped and leaning, every button is still in front of them and takes its own click. Nothing drawn takes the pointer (<code>pointer-events: none</code>) except the cells and the buttons.',
      'The wrapper that takes the hover never moves; a slow bob on the layer inside it and a shadow that breathes with it keep it alive at rest. Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas.',
    ],
    html: `<div class="scene">
  <div class="pad">
    ${CELLS}
    <i class="shade"></i>
    <div class="float">
      <div class="tilt">
${SLICES.map((s, k) => `        <i class="slice${k === SLICES.length - 1 ? ' top' : ''}" style="--k:${k};--s:${s}"></i>`).join('\n')}
        <div class="face">
          <span class="hub"></span>
          <button class="dp up c0 r0" style="--x:84;--y:58" aria-label="D-pad up"></button>
          <button class="dp down c0 r0" style="--x:84;--y:94" aria-label="D-pad down"></button>
          <button class="dp left c0 r0" style="--x:66;--y:76" aria-label="D-pad left"></button>
          <button class="dp right c0 r0" style="--x:102;--y:76" aria-label="D-pad right"></button>
          <button class="fb c2 r0" style="--x:236;--y:52;--c:#ffb547">Y</button>
          <button class="fb c2 r0" style="--x:212;--y:76;--c:#8cc2ff">X</button>
          <button class="fb c2 r0" style="--x:260;--y:76;--c:#ff7aa8">B</button>
          <button class="fb c2 r0" style="--x:236;--y:100;--c:#3cf0a0">A</button>
          <button class="pill select c1 r0" style="--x:134;--y:54" aria-label="Select"></button>
          <button class="pill start c1 r0" style="--x:186;--y:54" aria-label="Start"></button>
          <button class="home c1 r1" style="--x:160;--y:104" aria-label="Home"></button>
          <button class="stick c1 r1" style="--x:122;--y:118" aria-label="Left stick"></button>
          <button class="stick c1 r1" style="--x:198;--y:118" aria-label="Right stick"></button>
        </div>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the controller is the same share
     of a card, the editor, a full screen and a recording canvas */
  --u: 0.29vmin;
}

/* the wrapper: it takes the hover and never moves. Its box is the controller's plan, 320 x 222.
   One 3D space for everything, the cells included, so the browser sorts them by depth. Its own
   box is a plane in that space too, so it takes no pointer itself: the cells and the buttons
   inside it do, and hovering them is hovering the pad */
.pad {
  position: relative;
  width: calc(320 * var(--u));
  height: calc(222 * var(--u));
  perspective: calc(900 * var(--u));
  transform-style: preserve-3d;
  pointer-events: none;
  outline: none;
}
.pad * {
  box-sizing: border-box;
}

/* six invisible cells in the pad's plane, behind the controller: three columns, two rows */
.cell {
  position: absolute;
  width: calc(100% / 3);
  height: 50%;
  pointer-events: auto;
}
.cell.c0 { left: 0; }
.cell.c1 { left: calc(100% / 3); }
.cell.c2 { left: calc(200% / 3); }
.cell.r0 { top: 0; }
.cell.r1 { top: 50%; }

/* a soft shadow on the floor under it, breathing with the bob */
.shade {
  position: absolute;
  left: calc(50 * var(--u));
  right: calc(50 * var(--u));
  bottom: calc(-14 * var(--u));
  height: calc(40 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(20 10 60 / 0.3), transparent);
  animation: breathe 4.8s ease-in-out infinite;
}

/* the bob, on its own layer so the pose and the loop never fight over one transform */
.float {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
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
  --rx: 22deg;     /* tipped back a little: you see the face and some of the body's depth */
  --ry: 0deg;      /* the turn toward the pointer */
  --lift: 0;
  --push: 0;       /* 1 while a button is held: the thumb pushes the pad down a little */
  --sx: 0deg;      /* where the sticks point */
  --sy: 0deg;
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  /* 80 units toward you: the browser's hit test drops what lies behind the plane of the pad, and
     tipped back, the top of the controller would be; this keeps every part of it in front */
  transform: translateZ(calc((80 + var(--lift) - var(--push) * 6) * var(--u))) rotateY(var(--ry)) rotateX(calc(var(--rx) + var(--push) * 2deg));
  transition: transform 0.7s cubic-bezier(0.25, 0.8, 0.3, 1);
}
.pad:is(:hover, :focus-within) .tilt { --lift: 6; }
.pad:has(.c0:hover, .c0:focus-visible) .tilt { --ry: -8deg; --sy: -20deg; }
.pad:has(.c2:hover, .c2:focus-visible) .tilt { --ry: 8deg;  --sy: 20deg; }
.pad:has(.r0:hover, .r0:focus-visible) .tilt { --rx: 25deg; --sx: 18deg; }
.pad:has(.r1:hover, .r1:focus-visible) .tilt { --rx: 18deg; --sx: -18deg; }
.pad:has(button:active) .tilt { --push: 1; }

/* ---- the body: eleven slices of one outline, 2.4 units apart ---- */
.slice {
  position: absolute;
  left: calc(34 * var(--u));
  top: calc(16 * var(--u));
  width: calc(252 * var(--u));
  height: calc(128 * var(--u));
  border-radius: calc(96 * var(--u)) calc(96 * var(--u)) calc(56 * var(--u)) calc(56 * var(--u)) / calc(64 * var(--u)) calc(64 * var(--u)) calc(56 * var(--u)) calc(56 * var(--u));
  /* darker toward the bottom: the wall reads as turning away from the light */
  background: hsl(252 56% calc(16% + var(--k) * 2.6%));
  transform-origin: 50% 70%;
  transform: translateZ(calc(var(--k) * 2.4 * var(--u))) scale(var(--s));
}
/* the grips: eggs, fuller at the bottom, turned outward by the same angle either side */
.slice::before,
.slice::after {
  content: '';
  position: absolute;
  top: calc(70 * var(--u));
  width: calc(96 * var(--u));
  height: calc(132 * var(--u));
  border-radius: 50% 50% 47% 47% / 40% 40% 60% 60%;
  background: inherit;
}
.slice::before { left: calc(4 * var(--u));  transform: rotate(18deg); }
.slice::after  { right: calc(4 * var(--u)); transform: rotate(-18deg); }

/* the top face: one colour where body and grips meet, a soft highlight well inside the body */
.slice.top {
  background:
    radial-gradient(ellipse 60% 55% at 50% 28%, rgb(255 255 255 / 0.16), transparent),
    #6a54ee;
}
.slice.top::before,
.slice.top::after {
  background: linear-gradient(transparent 40%, rgb(20 0 60 / 0.18)), #6a54ee;
}

/* ---- the face: the holes are dark rings painted on it, the controls stand on it ---- */
.face {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translateZ(calc(24.4 * var(--u)));
  --hole: #120f2e;
  --lip: #8c7bff;
  background:
    radial-gradient(circle at calc(122 * var(--u)) calc(118 * var(--u)), var(--hole) calc(22 * var(--u)), var(--lip) calc(23 * var(--u)), transparent calc(24.5 * var(--u))),
    radial-gradient(circle at calc(198 * var(--u)) calc(118 * var(--u)), var(--hole) calc(22 * var(--u)), var(--lip) calc(23 * var(--u)), transparent calc(24.5 * var(--u))),
    radial-gradient(circle at calc(84 * var(--u)) calc(76 * var(--u)), rgb(18 15 46 / 0.5) calc(30 * var(--u)), transparent calc(31.5 * var(--u))),
    radial-gradient(circle at calc(236 * var(--u)) calc(76 * var(--u)), rgb(18 15 46 / 0.5) calc(39 * var(--u)), transparent calc(40.5 * var(--u))),
    radial-gradient(circle at calc(160 * var(--u)) calc(104 * var(--u)), var(--hole) calc(14 * var(--u)), transparent calc(15 * var(--u)));
}

/* ---- every control: placed by its middle (--x, --y) and size (--w, --h), standing --z proud ---- */
.tilt button {
  --w: 26;
  --h: 26;
  --z: 6;
  --down: 1;        /* how far proud it is when pressed */
  --cap: linear-gradient(160deg, #30334f, #171930);
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
  font: 800 calc(15 * var(--u)) / 1 Inter, system-ui, sans-serif;
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

/* face buttons: a glowing ring of the letter's colour lights while pressed or focused */
.fb::after {
  content: '';
  position: absolute;
  inset: calc(-3 * var(--u));
  border-radius: 50%;
  border: calc(1.4 * var(--u)) solid var(--c);
  box-shadow: 0 0 calc(6 * var(--u)) var(--c);
  opacity: 0;
  transform: translateZ(calc(-0.4 * var(--u)));
  transition: opacity 0.2s;
  pointer-events: none;
}
.fb:is(:active, :focus)::after {
  opacity: 1;
  transition-duration: 0.05s;
}

/* the d-pad: four arms round a hub, each arm a button with a drawn arrowhead that lights teal */
.tilt .dp {
  --w: 18;
  --h: 18;
  --z: 5;
}
.dp.up    { border-radius: calc(4 * var(--u)) calc(4 * var(--u)) 0 0; }
.dp.down  { border-radius: 0 0 calc(4 * var(--u)) calc(4 * var(--u)); }
.dp.left  { border-radius: calc(4 * var(--u)) 0 0 calc(4 * var(--u)); }
.dp.right { border-radius: 0 calc(4 * var(--u)) calc(4 * var(--u)) 0; }
.dp::after {
  content: '';
  position: absolute;
  inset: calc(5 * var(--u));
  background: #b3b8da;
  pointer-events: none;
}
.dp:is(:active, :focus)::after {
  background: #2ee6d6;
}
.dp.up::after    { clip-path: polygon(50% 10%, 100% 80%, 0 80%); }
.dp.down::after  { clip-path: polygon(50% 90%, 100% 20%, 0 20%); }
.dp.left::after  { clip-path: polygon(10% 50%, 80% 0, 80% 100%); }
.dp.right::after { clip-path: polygon(90% 50%, 20% 0, 20% 100%); }
.hub {
  position: absolute;
  left: calc(75 * var(--u));
  top: calc(67 * var(--u));
  width: calc(18 * var(--u));
  height: calc(18 * var(--u));
  background: radial-gradient(circle, #121428 28%, #26294a 32%);
  transform: translateZ(calc(5 * var(--u)));
}

/* select and start: two light pills, each with a drawn mark */
.tilt .pill {
  --w: 24;
  --h: 12;
  --z: 3.2;
  --down: 0.8;
  --cap: linear-gradient(#eef0fb, #c5c9e4);
  --side: #6f74a0;
  border-radius: calc(6 * var(--u));
}
.pill::after {
  content: '';
  position: absolute;
  inset: calc(3 * var(--u)) calc(8 * var(--u));
  pointer-events: none;
}
/* select: two overlapping windows; start: three lines */
.pill.select::after {
  background:
    linear-gradient(#2a2d4c 0 0) 0 0 / 62% 62% no-repeat,
    linear-gradient(#6d72a0 0 0) 100% 100% / 62% 62% no-repeat;
}
.pill.start::after {
  background:
    linear-gradient(#2a2d4c 0 0) 0 0 / 100% 24% no-repeat,
    linear-gradient(#2a2d4c 0 0) 0 50% / 100% 24% no-repeat,
    linear-gradient(#2a2d4c 0 0) 0 100% / 100% 24% no-repeat;
}
.pill:is(:active, :focus) {
  --cap: linear-gradient(#ffffff, #dfe2f5);
  box-shadow: 0 0 0 calc(1.4 * var(--u)) #2ee6d6;
}

/* home: a glowing disc with a drawn four-point spark, a different kind of button from A B X Y */
.tilt .home {
  --w: 24;
  --h: 24;
  --z: 4;
  --cap: radial-gradient(circle at 40% 35%, #b49cff, #8b6cff 45%, #c2286f);
  --side: #4a1d6e;
  box-shadow: 0 0 calc(7 * var(--u)) rgb(255 77 157 / 0.55);
}
.home::after {
  content: '';
  position: absolute;
  inset: calc(6 * var(--u));
  background: #fff;
  clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
  pointer-events: none;
}
.home:is(:active, :focus) {
  box-shadow: 0 0 calc(12 * var(--u)) #ff4d9d, 0 0 0 calc(1.4 * var(--u)) #ffd0e4;
}

/* the sticks: a rubber boot in the hole, a neck, and a dished cap on top. The whole stick tips
   toward the pointer about its base (--sx, --sy); pressed it sinks into its hole, and its rim
   lights teal */
.tilt .stick {
  --w: 38;
  --h: 38;
  --z: 0.6;
  --down: -3;
  --cap: radial-gradient(circle, #24263e 40%, #1a1c30 70%, #101122);
  transform: translateZ(calc(var(--z) * var(--u))) rotateY(var(--sy)) rotateX(var(--sx));
  transition: transform 0.9s cubic-bezier(0.3, 1.5, 0.5, 1);
}
.tilt .stick:is(:active, :focus-visible) {
  transform: translateZ(calc(var(--down) * var(--u))) rotateY(var(--sy)) rotateX(var(--sx));
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
  inset: calc(12 * var(--u));
  background: #0c0d1c;
  transform: translateZ(calc(6 * var(--u)));
}
.tilt .stick::after {
  inset: calc(1.5 * var(--u));
  background:
    radial-gradient(circle at 50% 46%, #33375a 0 36%, #3f4470 52%, #2a2d4a 64%, #1d2036 72%, #2c2f4c 80%, #181a2e);
  box-shadow: 0 calc(2.4 * var(--u)) 0 #0b0c19;
  transform: translateZ(calc(11 * var(--u)));
}
.tilt .stick:is(:active, :focus)::after {
  box-shadow: 0 calc(2.4 * var(--u)) 0 #0b0c19, 0 0 0 calc(1.6 * var(--u)) #2ee6d6;
}`,
  },
};
