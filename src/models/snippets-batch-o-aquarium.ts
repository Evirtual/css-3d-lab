import type { Snippet } from './snippet-utils';

/** One fish: a lane (bobs up and down), the swimmer on its loop, and the fish drawn in CSS. */
const fish = (cls: string, vars: string) =>
  `      <div class="lane" style="${vars}"><div class="swim"><i class="fish ${cls}"></i></div></div>`;

export const snippetsAquarium: Record<string, Snippet> = {
  aquarium: {
    how: [
      'The tank is a box of four see-through walls plus two flat planes laid with <code>rotateX(90deg)</code>: the sand and the water surface. Each wall is one vertical <code>linear-gradient</code> — dark frame, faint glass, water blue from the waterline down, opaque sand at the foot — so one element draws the frame, the glass, the water and the sand behind it.',
      'A fish swims a racetrack with one keyframe list: <code>translateX(x) rotateY(a) translateZ(d)</code>. While <code>x</code> slides and <code>a</code> holds, it swims a straight lane <code>d</code> in front of the centre; while <code>x</code> holds and <code>a</code> turns 180°, the <code>translateZ</code> swings it round a half circle to the back lane, already facing the new way. Each function is interpolated on its own, which is what makes the turn round.',
      'The straight is 2·L long and the turn π·d, so with <code>L = π·d / 2</code> each of the four legs is a quarter of the loop and the fish keeps one speed all the way round. <code>scaleZ(-1)</code> on a lane mirrors it front to back, so that fish circles the other way and the fish cross in front of and behind each other.',
      'The fish are flat side views — an ellipse with a notched tail on <code>::before</code> and an eye on <code>::after</code> — so in the turns they go edge-on, as thin as a real fish seen head-on. Nothing is sorted by hand: the glass, the fish, the plants and the bubbles share one <code>preserve-3d</code> space and the browser orders them by depth.',
      'Only <code>transform</code> and <code>opacity</code> move (bubbles rise and fade, blades sway from their base, tails wag), and every length is a multiple of one base unit, <code>--u</code>, so the tank is the same share of a card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="tank" role="img" aria-label="A glass fish tank with sand, swaying plants, rising bubbles and four fish swimming loops">
    <div class="shadow"></div>
    <div class="wall back"></div>
    <div class="wall left"></div>
    <div class="sand"></div>
    <div class="rock" style="--x:72;--z:-30;--w:46;--h:26"></div>
    <div class="rock" style="--x:226;--z:40;--w:34;--h:20"></div>
    <div class="plant" style="--x:30;--z:-56">
      <i class="blade" style="--ry:0deg;--h:118;--t:3.2s"></i>
      <i class="blade" style="--ry:60deg;--h:92;--t:2.7s"></i>
      <i class="blade" style="--ry:120deg;--h:104;--t:3.6s"></i>
      <i class="blade" style="--ry:160deg;--h:72;--t:2.3s"></i>
    </div>
    <div class="plant" style="--x:262;--z:-52">
      <i class="blade" style="--ry:20deg;--h:96;--t:3s"></i>
      <i class="blade" style="--ry:80deg;--h:126;--t:3.8s"></i>
      <i class="blade" style="--ry:140deg;--h:84;--t:2.6s"></i>
      <i class="blade" style="--ry:50deg;--h:66;--t:3.3s"></i>
    </div>
    <div class="plant short" style="--x:120;--z:52">
      <i class="blade" style="--ry:0deg;--h:58;--t:2.4s"></i>
      <i class="blade" style="--ry:90deg;--h:46;--t:2.9s"></i>
    </div>
    <div class="bubbles" style="--x:214;--z:-50">
      <i style="--d:0s;--s:9"></i><i style="--d:-0.8s;--s:6"></i><i style="--d:-1.6s;--s:8"></i>
      <i style="--d:-2.4s;--s:5"></i><i style="--d:-3.2s;--s:7"></i>
    </div>
    <div class="school">
${fish('clown', '--y:72;--L:78;--d:50;--t:16s;--dl:0s;--b:3.1s')}
${fish('tang', '--y:104;--L:63;--d:40;--t:13s;--dl:-6s;--b:2.6s;--m:-1')}
${fish('gold', '--y:130;--L:47;--d:30;--t:10s;--dl:-3s;--b:2.2s;--cx:34')}
${fish('neon', '--y:52;--L:55;--d:35;--t:9s;--dl:-1s;--b:2.4s;--m:-1;--cx:-30')}
    </div>
    <div class="water"></div>
    <div class="wall right"></div>
    <div class="wall front"></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the tank is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.22vmin;
  perspective: calc(1100 * var(--u));
}

/* the tank: 300 wide, 200 tall, 150 deep, seen from a little above and turning gently */
.tank {
  --W: calc(300 * var(--u));
  --H: calc(200 * var(--u));
  --D: calc(150 * var(--u));
  --line: calc(34 * var(--u)); /* the waterline, down from the top rim */
  --bed: calc(36 * var(--u));  /* how deep the sand is */
  position: relative;
  width: var(--W);
  height: var(--H);
  transform-style: preserve-3d;
  animation: tank-sway 20s ease-in-out infinite;
}
.tank * {
  position: absolute;
  box-sizing: border-box;
  transform-style: preserve-3d;
}

/* each wall is one gradient: frame, glass, water (with a bright line where the surface meets the
   glass), opaque sand, frame. The glass and the water are see-through, so the box shows inside */
.wall {
  top: 0;
  height: var(--H);
  background: linear-gradient(
    #3c4778 0 calc(5 * var(--u)),
    rgb(190 230 255 / 0.12) 0 var(--line),
    rgb(200 245 255 / 0.75) 0 calc(var(--line) + 1.5 * var(--u)),
    rgb(56 170 235 / 0.22) 0,
    rgb(30 110 200 / 0.34) calc(var(--H) - var(--bed)),
    #e2c084 0,
    #b98f52 calc(var(--H) - 9 * var(--u)),
    #2b3359 0
  );
  /* the glass edges: a crisp inset line, no blur */
  box-shadow: inset 0 0 0 calc(1.5 * var(--u)) rgb(150 200 240 / 0.55);
}
.front, .back { left: 0; width: var(--W); }
.front { transform: translateZ(calc(var(--D) / 2)); }
.back  { transform: rotateY(180deg) translateZ(calc(var(--D) / 2)); }
.left, .right { left: calc((var(--W) - var(--D)) / 2); width: var(--D); }
.left  { transform: rotateY(-90deg) translateZ(calc(var(--W) / 2)); }
.right { transform: rotateY(90deg) translateZ(calc(var(--W) / 2)); }

/* the floor planes: a W × D sheet whose middle is moved to the right height, then laid flat */
.sand, .water, .shadow {
  left: 0;
  top: calc((var(--H) - var(--D)) / 2);
  width: var(--W);
  height: var(--D);
}
.sand {
  transform: translateY(calc(var(--H) / 2 - var(--bed))) rotateX(90deg);
  background:
    radial-gradient(circle at 30% 60%, #f0d39a, transparent 40%),
    radial-gradient(circle at 75% 35%, #c99d5c, transparent 45%),
    #dcb877;
}
.water {
  transform: translateY(calc(var(--line) - var(--H) / 2)) rotateX(90deg);
  background:
    repeating-linear-gradient(115deg, rgb(255 255 255 / 0) 0 calc(18 * var(--u)), rgb(220 250 255 / 0.18) 0 calc(24 * var(--u))),
    rgb(90 200 245 / 0.22);
  box-shadow: inset 0 0 0 calc(1.5 * var(--u)) rgb(200 245 255 / 0.7);
}
/* a soft shadow on the table, just under the frame */
.shadow {
  transform: translateY(calc(var(--H) / 2 + 1 * var(--u))) rotateX(90deg) scale(1.12, 1.2);
  background: radial-gradient(closest-side, rgb(10 14 40 / 0.35), transparent);
}

/* rocks and plants stand on the sand: x across the tank, z out from its middle */
.rock, .plant, .bubbles {
  left: calc(var(--x) * var(--u));
  top: calc(var(--H) - var(--bed));
}
.rock {
  width: calc(var(--w) * var(--u));
  height: calc(var(--h) * var(--u));
  border-radius: 50% 50% 12% 12% / 80% 80% 20% 20%;
  background: radial-gradient(circle at 35% 30%, #a9b2c8, #5c6683 70%);
  transform: translate(-50%, calc(-100% + 4 * var(--u))) translateZ(calc(var(--z) * var(--u)));
}
.plant { transform: translateZ(calc(var(--z) * var(--u))); }
/* a blade sways from its foot; a few per plant, turned round the stem so it has depth */
.blade {
  left: calc(-9 * var(--u));
  bottom: calc(-4 * var(--u));
  width: calc(18 * var(--u));
  height: calc(var(--h) * var(--u));
  border-radius: 50% 50% 30% 30% / 95% 95% 5% 5%;
  background: linear-gradient(90deg, #15803d, #3ddc84 50%, #15803d);
  transform-origin: 50% 100%;
  animation: sway var(--t) ease-in-out infinite alternate;
}
.short .blade { background: linear-gradient(90deg, #0f766e, #2ee6d6 50%, #0f766e); }

/* bubbles rise from a stone on the sand to the surface, fading in and out at the ends */
.bubbles { transform: translateZ(calc(var(--z) * var(--u))); }
.bubbles i {
  left: calc(var(--s) * -0.5 * var(--u));
  bottom: 0;
  width: calc(var(--s) * var(--u));
  height: calc(var(--s) * var(--u));
  border-radius: 50%;
  border: calc(1.2 * var(--u)) solid rgb(235 252 255 / 0.9);
  background: radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.9) 0 18%, rgb(200 240 255 / 0.25) 22%);
  opacity: 0;
  animation: rise 4s linear var(--d) infinite;
}

/* every lane's origin is the middle of the tank's depth, at its own height */
.school {
  left: 50%;
  top: 0;
}
.lane {
  --m: 1;
  --cx: 0;
  left: calc(var(--cx) * var(--u));
  top: calc(var(--y) * var(--u));
  animation: bob var(--b) ease-in-out infinite alternate;
}
.swim {
  animation: swim var(--t) linear var(--dl) infinite;
}

/* a fish: a side view facing +x, its tail on ::before, its eye on ::after */
.fish {
  --len: 52;
  --tall: 30;
  left: calc(var(--len) * -0.5 * var(--u));
  top: calc(var(--tall) * -0.5 * var(--u));
  width: calc(var(--len) * var(--u));
  height: calc(var(--tall) * var(--u));
  border-radius: 45% 60% 60% 45% / 50% 55% 55% 50%;
}
.fish::before {
  content: '';
  position: absolute;
  right: calc(100% - 4 * var(--u));
  top: 12%;
  width: 46%;
  height: 76%;
  background: inherit;
  clip-path: polygon(0 0, 100% 42%, 100% 58%, 0 100%, 22% 50%);
  transform-origin: 100% 50%;
  animation: wag 0.7s ease-in-out infinite alternate;
}
.fish::after {
  content: '';
  position: absolute;
  right: 16%;
  top: 30%;
  width: calc(5 * var(--u));
  height: calc(5 * var(--u));
  border-radius: 50%;
  background: #0b0d18;
  box-shadow: 0 0 0 calc(1.2 * var(--u)) #fff;
}
/* a clownfish: orange with white bands edged in black */
.clown {
  background: linear-gradient(90deg,
    #ff7a1a 0 18%, #14172b 0 20%, #fff 0 29%, #14172b 0 31%, #ff7a1a 0 52%,
    #14172b 0 54%, #fff 0 62%, #14172b 0 64%, #ff7a1a 0);
}
.clown::before { background: #ff7a1a; }
.tang {
  --len: 58;
  --tall: 34;
  background: linear-gradient(170deg, #3b6cff, #1d2fb8 70%);
}
.tang::before { background: #ffb547; }
.gold {
  --len: 40;
  --tall: 24;
  background: linear-gradient(160deg, #ffe066, #ffb547 60%, #ff8a1a);
}
.neon {
  --len: 36;
  --tall: 16;
  background: linear-gradient(#1d2fb8 0 30%, #2ee6d6 0 52%, #ff4d9d 0);
}
.neon::before { background: #ff4d9d; }

/* the racetrack: slide along the front lane, turn round a half circle at the right end, slide
   back along the rear lane, turn round the left end. 2·L = π·d, so each leg is a quarter */
@keyframes swim {
  0%   { transform: scaleZ(var(--m)) translateX(calc(var(--L) * -1 * var(--u))) rotateY(0deg)   translateZ(calc(var(--d) * var(--u))); }
  25%  { transform: scaleZ(var(--m)) translateX(calc(var(--L) * var(--u)))      rotateY(0deg)   translateZ(calc(var(--d) * var(--u))); }
  50%  { transform: scaleZ(var(--m)) translateX(calc(var(--L) * var(--u)))      rotateY(180deg) translateZ(calc(var(--d) * var(--u))); }
  75%  { transform: scaleZ(var(--m)) translateX(calc(var(--L) * -1 * var(--u))) rotateY(180deg) translateZ(calc(var(--d) * var(--u))); }
  100% { transform: scaleZ(var(--m)) translateX(calc(var(--L) * -1 * var(--u))) rotateY(360deg) translateZ(calc(var(--d) * var(--u))); }
}
@keyframes bob {
  from { transform: translateY(calc(-5 * var(--u))); }
  to   { transform: translateY(calc(5 * var(--u))); }
}
@keyframes wag {
  from { transform: rotateY(-35deg); }
  to   { transform: rotateY(35deg); }
}
@keyframes sway {
  from { transform: rotateY(var(--ry)) rotate(-7deg); }
  to   { transform: rotateY(var(--ry)) rotate(7deg); }
}
@keyframes rise {
  0%   { transform: translate(0, 0); opacity: 0; }
  10%  { opacity: 1; }
  50%  { transform: translate(calc(5 * var(--u)), calc(-62 * var(--u))); }
  88%  { opacity: 1; }
  100% { transform: translate(0, calc(-128 * var(--u))); opacity: 0; }
}
@keyframes tank-sway {
  0%, 100% { transform: translateY(calc(-13 * var(--u))) rotateX(-20deg) rotateY(-30deg); }
  50%      { transform: translateY(calc(-13 * var(--u))) rotateX(-20deg) rotateY(-18deg); }
}`,
  },
};
