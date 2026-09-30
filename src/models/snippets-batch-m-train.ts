import type { Snippet } from './snippet-utils';

/**
 * Model train: a toy locomotive and two wagons circling a tree on a round track. The ground is one
 * plane laid back with rotateX; the track is a ring on it; the carriages stand on a carrier that
 * turns about the track's centre, so they ride the rails, face along them and stay upright with no
 * counter-rotation at all: a box standing on a turning floor simply turns with it.
 */
export const snippetsTrain: Record<string, Snippet> = {
  train: {
    how: [
      'The ground is a square laid back with <code>rotateX(58deg)</code>. Everything on it (the track, the tree, the train) is laid out flat in that square and then stood up with <code>translateZ</code> or a 90° fold, so the whole scene shares one floor and one light.',
      'The track is one element: sleepers are a <code>repeating-conic-gradient</code> (a stripe every 5°), cut down to a ring with a radial <code>mask</code>; the two rails are its <code>::before</code> and <code>::after</code>, two thinner rings with a border. A mask flattens 3D children, so it sits on a leaf, never on a wrapper.',
      'The train is a <b>carrier</b> square centred on the track that turns <code>rotateZ</code> once a lap. Each carriage is placed on the rim with <code>rotate(a) translateY(-85 units)</code>: turn, then walk out. Its local x axis is then the tangent, so a box built along x faces along the rails, and it stays upright because it stands on the floor that turns. Nothing needs undoing, unlike a billboard.',
      'A carriage is a roof lifted by <code>translateZ</code> with four walls folded down from its edges (<code>rotateX(±90deg)</code> from the long edges, <code>rotateY(±90deg)</code> from the ends). All four exist because the train shows every side as it goes round. The wheels cost no elements: they are radial gradients painted on the side walls, which reach 4 units below the body.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas. The tree is taller than the far rail plus a carriage, so the scene’s top edge never moves while the train goes round, and the near rail is its bottom edge: the picture stays the same size and centre at every moment.',
    ],
    html: `<div class="scene">
  <div class="world">
    <div class="track"></div>
    <div class="tree"></div>
    <div class="train">
      <div class="car" style="--a:0deg;--w:16;--hb:9;--c:#ff4d9d"><i></i><i></i><i></i><i></i><u></u></div>
      <div class="car cab" style="--a:9.1deg;--w:9;--hb:15;--c:#8b6cff"><i></i><i></i><i></i><i></i></div>
      <div class="car" style="--a:20.9deg;--w:20;--hb:10;--c:#2ee6d6"><i></i><i></i><i></i><i></i></div>
      <div class="car" style="--a:36.4deg;--w:20;--hb:10;--c:#ffb547"><i></i><i></i><i></i><i></i></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the scene is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.4vmin;
  display: grid;
  place-items: center;
  perspective: calc(800 * var(--u));
}

.scene * {
  box-sizing: border-box;
}

/* the ground: a square laid back. Everything is laid out flat in it, then stood up */
.world {
  position: relative;
  width: calc(200 * var(--u));
  height: calc(200 * var(--u));
  transform-style: preserve-3d;
  transform: translateY(calc(6 * var(--u))) rotateX(58deg);
}

/* the track: sleepers as a conic stripe every 5°, masked to a ring; the rails are two thinner
   rings on the pseudo-elements. The mask flattens nothing: this element has no 3D children */
.track {
  position: absolute;
  inset: calc(50% - calc(94 * var(--u)));
  border-radius: 50%;
  background: repeating-conic-gradient(rgb(139 108 255 / 0.55) 0deg 1.6deg, transparent 1.6deg 5deg);
  mask: radial-gradient(closest-side, transparent calc(100% - calc(18 * var(--u))), #000 calc(100% - calc(17 * var(--u))));
}

.track::before,
.track::after {
  content: '';
  position: absolute;
  inset: calc(3 * var(--u));
  border: calc(1.4 * var(--u)) solid #8b6cff;
  border-radius: 50%;
}

.track::after {
  inset: calc(13 * var(--u));
}

/* the tree: three crossed planes standing up from the centre, the same cone-and-trunk shape on
   each, so it reads as a cone from every side of the loop. Tall enough to top the far rail plus a
   carriage, which keeps the scene's top edge still while the train goes round */
.tree {
  position: absolute;
  left: calc(50% - calc(20 * var(--u)));
  top: calc(50% - calc(78 * var(--u)));
  width: calc(40 * var(--u));
  height: calc(78 * var(--u));
  transform-style: preserve-3d;
  transform-origin: 50% 100%;
  transform: rotateX(-90deg);
}

.tree,
.tree::before,
.tree::after {
  background: linear-gradient(#ffb547 0 5%, #6ff3e6 5%, #1aa79c 76%, #7a5cc4 76%);
  clip-path: polygon(50% 0, 100% 76%, 55% 76%, 55% 100%, 45% 100%, 45% 76%, 0 76%);
}

/* the two crossed planes are a shade darker, so the cone facets instead of reading as one flat
   triangle: there is no light in CSS 3D, so the shading is painted on */
.tree::before,
.tree::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(#ffb547 0 5%, #4fd6c8 5%, #128a80 76%, #64489f 76%);
  transform: rotateY(60deg);
}

.tree::after {
  transform: rotateY(-60deg);
}

/* the carrier: turns once a lap about the track's centre, and every carriage rides on it */
.train {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: lap 16s linear infinite;
}

/* a carriage: this element is the roof, lifted 4 units (the wheels) plus the body height. Placed
   on the rim by turning first and walking out second, so its x axis is the tangent of the track */
.car {
  --side: color-mix(in srgb, var(--c) 72%, #000);
  --end: color-mix(in srgb, var(--c) 52%, #000);
  position: absolute;
  left: calc(50% - var(--w) * var(--u) / 2);
  top: calc(50% - calc(6 * var(--u)));
  width: calc(var(--w) * var(--u));
  height: calc(12 * var(--u));
  background: var(--c);
  transform-style: preserve-3d;
  transform: rotate(var(--a)) translateY(calc(-85 * var(--u))) translateZ(calc((var(--hb) + 4) * var(--u)));
}

.car > i {
  position: absolute;
  background: var(--side);
}

/* the long sides fold down from the roof's long edges. They run 4 units below the body, where the
   wheels are painted as two discs: a pale rim round a dark hub, then nothing */
.car > i:nth-child(1),
.car > i:nth-child(2) {
  left: 0;
  top: 0;
  width: 100%;
  height: calc((var(--hb) + 4) * var(--u));
  background:
    radial-gradient(circle at 25% calc(100% - calc(3.2 * var(--u))), #2a2350 0 calc(1 * var(--u)), #d8d2ff calc(1 * var(--u)) calc(3.2 * var(--u)), transparent calc(3.4 * var(--u))),
    radial-gradient(circle at 75% calc(100% - calc(3.2 * var(--u))), #2a2350 0 calc(1 * var(--u)), #d8d2ff calc(1 * var(--u)) calc(3.2 * var(--u)), transparent calc(3.4 * var(--u))),
    linear-gradient(var(--side) 0 calc(var(--hb) * var(--u)), transparent 0);
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
}

.car > i:nth-child(2) {
  top: auto;
  bottom: 0;
  transform-origin: 50% 100%;
  transform: rotateX(90deg);
}

/* the ends fold down from the short edges, body height only */
.car > i:nth-child(3),
.car > i:nth-child(4) {
  left: 0;
  top: 0;
  width: calc(var(--hb) * var(--u));
  height: 100%;
  background: var(--end);
  transform-origin: 0 50%;
  transform: rotateY(90deg);
}

.car > i:nth-child(4) {
  left: auto;
  right: 0;
  transform-origin: 100% 50%;
  transform: rotateY(-90deg);
}

/* the cab is short and has no wheels of its own: its sides stop at the body, with a window */
.cab > i:nth-child(1),
.cab > i:nth-child(2) {
  height: calc(var(--hb) * var(--u));
  background:
    linear-gradient(#ffb547 0 0) 50% 32% / 44% 34% no-repeat,
    var(--side);
}

/* the chimney: two crossed planes standing on the front of the boiler */
.car > u {
  position: absolute;
  left: calc(2 * var(--u));
  top: calc(50% - calc(7 * var(--u)));
  width: calc(4 * var(--u));
  height: calc(7 * var(--u));
  background: linear-gradient(#c9bfff, #5b46b8);
  transform-style: preserve-3d;
  transform-origin: 50% 100%;
  transform: rotateX(-90deg);
}

.car > u::after {
  content: '';
  position: absolute;
  inset: 0;
  background: inherit;
  transform: rotateY(90deg);
}

/* one lap, counter-clockwise, so the boiler leads; it starts at the near edge, in full view */
@keyframes lap {
  from { transform: rotateZ(180deg); }
  to   { transform: rotateZ(-180deg); }
}`,
  },
};
