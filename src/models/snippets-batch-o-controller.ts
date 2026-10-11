/**
 * Paste-anywhere version of the controller model: plain HTML + CSS, no JavaScript, no build step.
 * See snippets.ts for the format this file follows.
 */
import type { Snippet } from './snippet-utils';

/** The body's slices, bottom to top: each one's scale rounds the edge, so the body is a soft
    pebble, not a slab. */
const SLICES = [0.93, 0.96, 0.978, 0.99, 0.997, 1, 1, 0.997, 0.99, 0.978, 0.965];

/** The six hover cells behind the pad: three columns by two rows. Hovering one leans the pad
    toward it. */
const CELLS = [0, 1, 2].flatMap((c) => [0, 1].map((r) => `<i class="cell c${c} r${r}"></i>`)).join('');

export const snippetsController: Record<string, Snippet> = {
  controller: {
    how: [
      'The body is a 90s “dog-bone”: two round ends joined by a slimmer middle. One outline is one element, the middle its own box and the two ends its <code>::before</code> and <code>::after</code> circles, and eleven copies of it are stacked 2.4 units apart in <code>translateZ</code>, darker toward the bottom and scaled a touch smaller at the top and bottom, so the edge is a soft, rounded wall with real thickness.',
      'Every control is a real <code>&lt;button&gt;</code> standing a few units proud of the face, with a darker copy of itself on its <code>::before</code> a little lower: that copy is the side of the cap. Pressed (<code>:active</code>) or focused, the cap drops with <code>translateZ</code>, its side sinks below the opaque face and is hidden, and the button lights: a ring in its own colour round a face button, a white arrow on the d-pad, a pale rubber pill for Select and Start.',
      'The pad is posed by custom properties, <code>transform: translateZ(70 + --lift) rotateY(--ry) rotateX(--rx)</code>, with one transition. Six invisible cells lie behind it, three columns by two rows: <code>.pad:has(.c0:hover)</code> turns it toward the left, <code>.r0</code> tips its top away, and so on, so it leans toward the pointer with no script. Each button carries its own cell’s classes, so pointing at it or focusing it leans the pad the same way.',
      'In 3D the browser hit-tests by depth and drops whatever lies behind the plane of the 3D root, so the pad stands 70 units in front of the cells: tipped and leaning, every button is still in front of them and takes its own click. Nothing drawn takes the pointer (<code>pointer-events: none</code>) except the cells and the buttons.',
      'The words SELECT and START are printed on the pad’s own grey, in a dark ink that reads on either stage. A slow bob and a shadow that breathes with it keep it alive at rest. Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas.',
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
          <button class="dp down c0 r1" style="--x:84;--y:102" aria-label="D-pad down"></button>
          <button class="dp left c0 r0" style="--x:62;--y:80" aria-label="D-pad left"></button>
          <button class="dp right c0 r0" style="--x:106;--y:80" aria-label="D-pad right"></button>
          <button class="fb c2 r0" style="--x:236;--y:54;--c:#2852c0;--ink:#fff">X</button>
          <button class="fb c2 r0" style="--x:210;--y:80;--c:#36b35a;--ink:#0f2a16">Y</button>
          <button class="fb c2 r0" style="--x:262;--y:80;--c:#c41f30;--ink:#fff">A</button>
          <button class="fb c2 r1" style="--x:236;--y:106;--c:#f2c230;--ink:#3a2a00">B</button>
          <button class="pill c1 r1" style="--x:144;--y:86" aria-label="Select"></button>
          <button class="pill c1 r1" style="--x:176;--y:86" aria-label="Start"></button>
          <span class="word" style="--x:141;--y:104" aria-hidden="true">SELECT</span>
          <span class="word" style="--x:173;--y:104" aria-hidden="true">START</span>
        </div>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the pad is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.26vmin;
}

/* the wrapper: it takes the hover and never moves. Its box is the pad's plan, 320 x 160.
   One 3D space for everything, the cells included, so the browser sorts them by depth. Its own
   box is a plane in that space too, so it takes no pointer itself: the cells and the buttons
   inside it do, and hovering them is hovering the pad */
.pad {
  position: relative;
  width: calc(320 * var(--u));
  height: calc(160 * var(--u));
  perspective: calc(900 * var(--u));
  transform-style: preserve-3d;
  pointer-events: none;
  outline: none;
}
.pad * {
  box-sizing: border-box;
}

/* six invisible cells in the pad's plane, behind the pad: three columns, two rows */
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
  left: calc(30 * var(--u));
  right: calc(30 * var(--u));
  bottom: calc(-26 * var(--u));
  height: calc(36 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(20 10 60 / 0.28), transparent);
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
  --rx: 22deg;     /* a gentle look down on the face, enough to see the body's depth */
  --ry: 0deg;      /* the turn toward the pointer */
  --lift: 0;
  --push: 0;       /* 1 while a button is held: the thumb pushes the pad down a little */
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  /* 70 units toward you: the browser's hit test drops what lies behind the plane of the pad, and
     tipped back, the top of the pad would be; this keeps every part of it in front */
  transform: translateZ(calc((70 + var(--lift) - var(--push) * 6) * var(--u))) rotateY(var(--ry)) rotateX(calc(var(--rx) + var(--push) * 2deg));
  transition: transform 0.7s cubic-bezier(0.25, 0.8, 0.3, 1);
}
.pad:is(:hover, :focus-within) .tilt { --lift: 6; }
.pad:has(.c0:hover, .c0:focus-visible) .tilt { --ry: -8deg; }
.pad:has(.c2:hover, .c2:focus-visible) .tilt { --ry: 8deg; }
.pad:has(.r0:hover, .r0:focus-visible) .tilt { --rx: 26deg; }
.pad:has(.r1:hover, .r1:focus-visible) .tilt { --rx: 18deg; }
.pad:has(button:active) .tilt { --push: 1; }

/* ---- the body: eleven slices of one dog-bone outline, 2.4 units apart ---- */
.slice {
  position: absolute;
  left: calc(84 * var(--u));
  top: calc(22 * var(--u));
  width: calc(152 * var(--u));
  height: calc(116 * var(--u));
  /* darker toward the bottom: the wall reads as turning away from the light */
  background: hsl(246 9% calc(46% + var(--k) * 3.3%));
  transform-origin: 50% 50%;
  transform: translateZ(calc(var(--k) * 2.4 * var(--u))) scale(var(--s));
}
/* the two round ends, part of the same slice */
.slice::before,
.slice::after {
  content: '';
  position: absolute;
  top: calc(-22 * var(--u));
  width: calc(152 * var(--u));
  height: calc(160 * var(--u));
  border-radius: 50%;
  background: inherit;
}
.slice::before { left: calc(-76 * var(--u)); }
.slice::after  { right: calc(-76 * var(--u)); }

/* the top face: one flat off-white, so the middle and the ends meet with no seam; the shading is
   the slices' own, round the edge */
.slice.top {
  background: #dcdbe5;
}

/* ---- the face: the darker grey inlays are painted on it, the controls stand on it ---- */
.face {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translateZ(calc(24.4 * var(--u)));
  background:
    /* a dished ring round the d-pad, and the deeper grey disc the face buttons sit in */
    radial-gradient(circle at calc(84 * var(--u)) calc(80 * var(--u)), #c3c1cf calc(40 * var(--u)), #b0aec0 calc(41.5 * var(--u)), transparent calc(42.5 * var(--u))),
    radial-gradient(circle at calc(236 * var(--u)) calc(80 * var(--u)), #8f8aa6 calc(44 * var(--u)), #7b7694 calc(45.5 * var(--u)), transparent calc(46.5 * var(--u)));
}

/* ---- every control: placed by its middle (--x, --y) and size (--w, --h), standing --z proud ---- */
.tilt button {
  --w: 28;
  --h: 28;
  --z: 6;
  --down: 1;        /* how far proud it is when pressed */
  --side: rgb(0 0 0 / 0.55);
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
  color: var(--ink, #fff);
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
/* keyboard focus: a ring in near-black, which reads on the light grey pad on either stage */
.tilt button:focus-visible {
  outline: calc(1.6 * var(--u)) solid #1d1b2e;
  outline-offset: calc(2 * var(--u));
}

/* face buttons: round, glossy, each its own colour; a ring of that colour lights round the one
   pressed or focused */
.tilt .fb {
  --cap: radial-gradient(circle at 38% 32%, rgb(255 255 255 / 0.4), transparent 45%), var(--c);
  --side: color-mix(in srgb, var(--c) 55%, #000);
}
.fb::after {
  content: '';
  position: absolute;
  inset: calc(-3.5 * var(--u));
  border-radius: 50%;
  border: calc(1.6 * var(--u)) solid var(--c);
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

/* the d-pad: a chunky black cross, four arms round a hub, each arm a button with an embossed
   arrow that turns white while pressed or focused */
.tilt .dp {
  --w: 22;
  --h: 22;
  --z: 5;
  --cap: linear-gradient(160deg, #3a3846, #1c1b24);
  --side: #0c0b12;
}
.dp.up    { border-radius: calc(4 * var(--u)) calc(4 * var(--u)) 0 0; }
.dp.down  { border-radius: 0 0 calc(4 * var(--u)) calc(4 * var(--u)); }
.dp.left  { border-radius: calc(4 * var(--u)) 0 0 calc(4 * var(--u)); }
.dp.right { border-radius: 0 calc(4 * var(--u)) calc(4 * var(--u)) 0; }
.dp::after {
  content: '';
  position: absolute;
  inset: calc(6.5 * var(--u));
  background: #5d5b6c;
  pointer-events: none;
}
.dp:is(:active, :focus)::after {
  background: #fff;
}
.dp.up::after    { clip-path: polygon(50% 10%, 100% 80%, 0 80%); }
.dp.down::after  { clip-path: polygon(50% 90%, 100% 20%, 0 20%); }
.dp.left::after  { clip-path: polygon(10% 50%, 80% 0, 80% 100%); }
.dp.right::after { clip-path: polygon(90% 50%, 20% 0, 20% 100%); }
.hub {
  position: absolute;
  left: calc(73 * var(--u));
  top: calc(69 * var(--u));
  width: calc(22 * var(--u));
  height: calc(22 * var(--u));
  background: radial-gradient(circle, #15141c 26%, #2a2934 32%);
  transform: translateZ(calc(5 * var(--u)));
}

/* select and start: two slanted rubber pills; pressed or focused, the rubber goes pale */
.tilt .pill {
  --w: 28;
  --h: 10;
  --z: 3.2;
  --down: 0.8;
  --cap: linear-gradient(#6c6a7c, #4a4858);
  --side: #2c2b36;
  border-radius: calc(5 * var(--u));
  transform: translateZ(calc(var(--z) * var(--u))) rotate(-28deg);
}
.tilt .pill:is(:active, :focus-visible) {
  transform: translateZ(calc(var(--down) * var(--u))) rotate(-28deg);
}
.tilt .pill:is(:active, :focus) {
  --cap: linear-gradient(#b9b6cc, #9a97b0);
}

/* the printed words under the pills: dark ink on the pad's own off-white */
.word {
  position: absolute;
  left: calc(var(--x) * var(--u));
  top: calc(var(--y) * var(--u));
  font: 800 calc(9 * var(--u)) / 1 Inter, system-ui, sans-serif;
  letter-spacing: calc(0.4 * var(--u));
  color: #4a4760;
  white-space: nowrap;
  transform: translate(-50%, -50%) translateZ(calc(0.2 * var(--u))) rotate(-28deg);
}`,
  },
};
