import type { Snippet } from './snippet-utils';

/** The twelve tunnel walls: [class, the direction it faces in the turn (degrees, front = 0), what it is]. */
const WALLS: [string, number | null, string][] = [
  ['x floor', null, 'left–right tunnel: floor'],
  ['x ceil', null, 'left–right tunnel: ceiling'],
  ['x near', 180, 'left–right tunnel: near wall, facing back'],
  ['x far', 0, 'left–right tunnel: far wall, facing front'],
  ['y right', 270, 'up–down tunnel: right wall, facing left'],
  ['y left', 90, 'up–down tunnel: left wall, facing right'],
  ['y near', 180, 'up–down tunnel: near wall, facing back'],
  ['y far', 0, 'up–down tunnel: far wall, facing front'],
  ['z right', 270, 'front–back tunnel: right wall, facing left'],
  ['z left', 90, 'front–back tunnel: left wall, facing right'],
  ['z floor', null, 'front–back tunnel: floor'],
  ['z ceil', null, 'front–back tunnel: ceiling'],
];

/* --a is the face's direction plus the 45deg the turn starts at, so it is always 0 to 359 */
const wall = ([cls, dir, what]: [string, number | null, string]) =>
  `      <b class="wall ${cls}"${dir === null ? '' : ` style="--a:${(dir + 45) % 360}"`}></b> <!-- ${what} -->`;

/** Level 2, painted: one small cube's face as a 9 × 9 tile, its middle ninth a square pit whose
    upper and left inner walls are in shadow and lower and right ones catch the light. */
const PIT = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 9'><rect x='3' y='3' width='3' height='3' fill='%230d0a26' fill-opacity='.62'/><path d='M3 3h3l-.5.5h-2z' fill='%230d0a26' fill-opacity='.5'/><path d='M3 3l.5.5v2L3 6z' fill='%230d0a26' fill-opacity='.35'/><path d='M3 6l.5-.5h2l.5.5z' fill='%23fff' fill-opacity='.35'/><path d='M6 3v3l-.5-.5v-2z' fill='%23fff' fill-opacity='.18'/></svg>")`;

export const snippetsMenger: Record<string, Snippet> = {
  menger: {
    how: [
      'A level-1 Menger sponge is a cube cut 3×3×3 with the centre and the six face centres taken out: 20 small cubes, which as boxes would be 120 faces. Almost all of those faces are hidden against a neighbour, so draw only the surfaces you can ever see: <b>6 outer faces and 12 tunnel walls</b>, 18 elements.',
      'Each outer face is ONE square. Its 3×3 grid of small cubes is painted with gradients sized <code>33.333%</code>, and the hole in the middle is a real hole: a <code>mask</code> of two crossing gradients shows the left and right thirds plus the top and bottom thirds, so the centre square is see-through. The next level down is painted, not cut: a small SVG tile puts a shaded square pit in the middle of every small cube, since a real hole there would need tunnels of its own.',
      'Each tunnel wall is one long strip the length of the cube, masked open in its middle third, where the centre cube is missing and the other tunnels cross. Placed with <code>translate</code> and <code>rotate</code> half a small cube off the axis, four strips line each tunnel; walls that share a plane never overlap, so the 3D sorting stays clean. Every face has <code>backface-visibility: hidden</code>, since its back is always inside the solid.',
      'Shading per face direction: the walls get darker towards the middle (less light gets in), floors are lighter than ceilings, and the light stays still while the sponge turns. Each side surface has a dark <code>::after</code> whose <code>opacity</code> follows one shared keyframe list; <code>animation-delay</code> from <code>--a</code>, the direction it faces, puts it at the right phase, so a face brightens as it turns towards the light.',
      'Two nested animations make the turn: the sponge spins once round its vertical in 18 s, and its parent nods between looking down on a corner and looking almost level, four times a turn, in step, so each tunnel lines up with your eye as its face comes round and you see through to the far side. Every length is a multiple of one base unit, <code>--u</code>.',
    ],
    html: `<div class="scene">
  <div class="tilt">
    <div class="sponge" role="img" aria-label="A Menger sponge turning slowly: a cube with a square tunnel through each axis">
      <i class="face front" style="--a:45"></i>
      <i class="face right" style="--a:135"></i>
      <i class="face back" style="--a:225"></i>
      <i class="face left" style="--a:315"></i>
      <i class="face top"></i>
      <i class="face bottom"></i>
${WALLS.map(wall).join('\n')}
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the sponge is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.22vmin;
  perspective: calc(700 * var(--u));
  /* looking down on a corner, the near bottom corner is the closest point and the perspective
     magnifies it, so the drawing hangs low of the cube's centre: lift it by that much */
  transform: translateY(calc(-10 * var(--u)));
}

/* the nod: from looking down on a corner to looking almost level and back, four times a turn */
.tilt {
  transform-style: preserve-3d;
  transform: rotateX(-34deg);
  animation: menger-nod 4.5s ease-in-out infinite;
}

.sponge {
  --s: calc(180 * var(--u)); /* the cube */
  --h: calc(30 * var(--u));  /* half a small cube: where each tunnel's walls stand */
  /* level 2, painted rather than cut: a pit in the middle of every small cube's face */
  --pit: ${PIT};
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  transform: rotateY(45deg);
  animation: menger-spin 18s linear infinite;
}

.sponge > * {
  position: absolute;
  backface-visibility: hidden; /* the back of every surface is inside the solid */
}

/* the dark layer that shades a surface by the way it faces; it is cut by the same mask */
.sponge > *::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #0d0a26;
  opacity: 0;
}

/* side surfaces: the shade follows the turn, phase-shifted by the direction each one faces */
.sponge > [style*='--a']::after {
  animation: menger-shade 18s linear infinite;
  animation-delay: calc(var(--a) * -0.05s); /* 18 s / 360deg */
}

/* ---- the six outer faces: one element each, with the middle square cut out ---- */
.face {
  inset: 0;
  background:
    /* the next level down: a small square pit in the middle of every small cube */
    var(--pit) 0 0 / 33.333% 33.333%,
    /* each small cube: a lit top-left edge and a shaded bottom-right one. Repeating gradients
       rather than tiles: tile seams sparkle when a face is seen edge-on */
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.3) 0 calc(1.5 * var(--u)), transparent 0 calc(60 * var(--u) - 1.5 * var(--u)), rgb(13 10 38 / 0.3) 0 calc(60 * var(--u))),
    repeating-linear-gradient(rgb(255 255 255 / 0.36) 0 calc(1.5 * var(--u)), transparent 0 calc(60 * var(--u) - 1.5 * var(--u)), rgb(13 10 38 / 0.36) 0 calc(60 * var(--u))),
    linear-gradient(135deg, rgb(255 255 255 / 0.14), transparent 70%),
    var(--c, #8b6cff);
  /* left and right thirds, plus top and bottom thirds: everything but the middle square. The
     hole is a hair smaller than a third, so its rim laps over the tunnel walls' ends */
  mask:
    linear-gradient(90deg, #000 calc(33.333% + 1 * var(--u)), transparent 0 calc(66.667% - 1 * var(--u)), #000 0),
    linear-gradient(#000 calc(33.333% + 1 * var(--u)), transparent 0 calc(66.667% - 1 * var(--u)), #000 0);
}
.front  { transform: translateZ(calc(var(--s) / 2)); }
.right  { transform: rotateY(90deg)  translateZ(calc(var(--s) / 2)); }
.back   { transform: rotateY(180deg) translateZ(calc(var(--s) / 2)); }
.left   { transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
.top    { --c: #b4a3ff; transform: rotateX(90deg)  translateZ(calc(var(--s) / 2)); }
.bottom { --c: #4a32b8; transform: rotateX(-90deg) translateZ(calc(var(--s) / 2)); }

/* ---- the twelve tunnel walls: a strip the cube's length, open in its middle third ----
   Drawn lying left-right, facing you, centred on the cube; each is then turned into place. One
   unit wider than a small cube each side, tucked into the solid, so no seam shows at the corners */
.wall {
  left: 0;
  top: calc(59 * var(--u));
  width: var(--s);
  height: calc(62 * var(--u));
  background:
    var(--pit) 0 calc(1 * var(--u)) / calc(60 * var(--u)) calc(60 * var(--u)) repeat-x,
    /* the seam between the two small cubes of each arm is the solid's edge; deeper is darker */
    linear-gradient(90deg, rgb(255 255 255 / 0.3) 0 calc(1.5 * var(--u)), transparent 0 calc(100% - 1.5 * var(--u)), rgb(255 255 255 / 0.3) 0),
    linear-gradient(90deg, var(--c1) 0, var(--c2) 33.333% 66.667%, var(--c1) 100%);
  mask: linear-gradient(90deg, #000 33.333%, transparent 0 66.667%, #000 0);
  --c1: #2bc9bb;
  --c2: #0c4f5a;
}
/* floors catch light, ceilings are in shadow */
.floor { --c1: #5ff0e2; --c2: #157a7a; }
.ceil  { --c1: #157a7a; --c2: #08303c; }

.x.floor { transform: translateY(var(--h)) rotateX(90deg); }
.x.ceil  { transform: translateY(calc(-1 * var(--h))) rotateX(-90deg); }
.x.near  { transform: translateZ(var(--h)) rotateY(180deg); }
.x.far   { transform: translateZ(calc(-1 * var(--h))); }

.y.right { transform: translateX(var(--h)) rotateY(-90deg) rotateZ(90deg); }
.y.left  { transform: translateX(calc(-1 * var(--h))) rotateY(90deg) rotateZ(90deg); }
.y.near  { transform: translateZ(var(--h)) rotateY(180deg) rotateZ(90deg); }
.y.far   { transform: translateZ(calc(-1 * var(--h))) rotateZ(90deg); }

.z.right { transform: translateX(var(--h)) rotateY(-90deg); }
.z.left  { transform: translateX(calc(-1 * var(--h))) rotateY(90deg); }
.z.floor { transform: translateY(var(--h)) rotateX(90deg) rotateZ(90deg); }
.z.ceil  { transform: translateY(calc(-1 * var(--h))) rotateX(-90deg) rotateZ(90deg); }

@keyframes menger-spin {
  from { transform: rotateY(45deg); }
  to   { transform: rotateY(405deg); }
}

/* a corner towards you at 0% and 100%, a face square on at 50% */
@keyframes menger-nod {
  0%, 100% { transform: rotateX(-34deg); }
  50%      { transform: rotateX(-7deg); }
}

/* how dark a side is when it faces each way, the light up and to the front-left:
   0% facing you, 25% facing right, 50% away, 75% facing left */
@keyframes menger-shade {
  0%    { opacity: 0.2; }
  12.5% { opacity: 0.42; }
  25%   { opacity: 0.58; }
  37.5%, 62.5% { opacity: 0.62; }
  75%   { opacity: 0.26; }
  87.5% { opacity: 0; }
  100%  { opacity: 0.2; }
}`,
  },
};
