import type { Snippet } from './snippet-utils';

/*
 * campfire: a ground laid back with rotateX and turning slowly with rotateZ. On it, ten stones in
 * a ring (shaded lumps that always face you), four logs crossed in an X (a top face with its
 * sides and outer end folded down, tilted so the inner ends lean up into the fire), a flame of
 * three crossed teardrop planes flickering at three different paces, and embers rising out of it
 * on a carrier that undoes the turn, so they always face you.
 */

/** The ring: an angle and a size per stone, uneven on purpose so it reads as stones, not a gear. */
const STONES = [
  [8, 1], [42, 0.86], [74, 1.08], [110, 0.92], [143, 1.04],
  [178, 0.84], [212, 1.02], [247, 0.94], [283, 1.1], [320, 0.88],
] as const;

/** The logs: four, crossed in an X, pointing between the stones. */
const LOGS = [45, 135, 225, 315];

/** The flame: three teardrops crossed round the vertical, each flickering at its own pace. */
const FLAMES = [
  { r: 0, d: 1, s: 1 },
  { r: 60, d: 0.8, s: 0.92 },
  { r: 120, d: 1.25, s: 0.96 },
];

/** The embers: where each starts across the fire, how far it drifts, its pace and its delay. */
const EMBERS = [
  { x: -6, dx: -14, d: 2.5, t: -0.2 },
  { x: 4, dx: 12, d: 4, t: -1.4 },
  { x: -2, dx: 6, d: 2.5, t: -2.1 },
  { x: 8, dx: -8, d: 4, t: -0.9 },
  { x: -9, dx: 4, d: 2.5, t: -1.6 },
  { x: 1, dx: -16, d: 4, t: -3.2 },
];

export const snippetsCampfire: Record<string, Snippet> = {
  campfire: {
    how: [
      'The ground is a square laid back with <code>rotateX(58deg)</code> and turned once every 40 seconds with <code>rotateZ</code>. Nothing is painted as a backdrop: the glow, the logs and the flame are placed on it, so they turn with it and the scene shows every side. A stone is round from every side, so each stone is a shaded lump that is walked out to the ring with <code>rotateZ(a) translateY(-80 units)</code> and then turned back by its own angle and by the ground’s turn before it stands up: it rides the ring and always faces you.',
      'Each log is a <b>top face</b> lying on the ground, with its two sides (<code>::before</code>, <code>::after</code>, <code>rotateY(±90deg)</code> from the long edges) and its outer end (<code>rotateX(-90deg)</code> from the short edge) folded down. The whole face is tilted with <code>rotateX(14deg)</code> about its outer end, so the inner ends lean up into the fire, and the folded faces follow because they are its children. Bark is a gradient across the width; the end grain is a <code>repeating-radial-gradient</code>. No bottom and no inner end: from above they are never seen.',
      'The flame is three planes standing at the centre, turned <code>rotateY</code> 0°, 60° and 120°, so from any side of the turn there is a teardrop facing you and two more giving it body. Each teardrop is a square with three round corners turned 45°, stretched upward with <code>scale</code>. Each plane flickers on its own <code>alternate</code> loop of a different length (scale and opacity only), so the three seldom move together. Every pace (2, 1.6 and 2.5 s a flicker, there and back) goes a whole number of times into the 40 s turn, so the whole scene repeats exactly once a turn.',
      'The embers live on a <b>carrier</b> that turns the other way exactly as fast as the ground, <code>rotateZ(-a)</code> before standing up, so they always face you, like the flame’s licks. Each rises, drifts and fades from <code>opacity: 0</code> back to 0, so its loop has no seam; their lengths, 2.5 and 4 s, also divide the turn.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas. The ring of stones sets the width and the flame the height, and both stay put while the ground turns, so the picture keeps its size and centre at every moment.',
    ],
    html: `<div class="scene">
  <div class="world">
    <div class="glow"></div>
${STONES.map(([a, s]) => `    <i class="stone" style="--a:${a}deg;--s:${s}"></i>`).join('\n')}
${LOGS.map((a) => `    <div class="log" style="--a:${a}deg"><div class="beam"><i></i></div></div>`).join('\n')}
${FLAMES.map((f) => `    <i class="flame" style="--r:${f.r}deg;--d:${f.d}s;--s:${f.s}"></i>`).join('\n')}
    <div class="sparks">
      <i class="lick" style="--x:-7;--d:1.6s;--t:-0.4s"></i>
      <i class="lick" style="--x:8;--d:2s;--t:-1.1s"></i>
${EMBERS.map((e) => `      <i class="ember" style="--x:${e.x};--dx:${e.dx};--d:${e.d}s;--t:${e.t}s"></i>`).join('\n')}
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the fire is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.45vmin;
  display: grid;
  place-items: center;
  perspective: calc(800 * var(--u));
}

.scene * {
  box-sizing: border-box;
}

/* the ground: a square laid back and turning. Everything stands on it, so everything turns */
.world {
  position: relative;
  width: calc(200 * var(--u));
  height: calc(200 * var(--u));
  transform-style: preserve-3d;
  animation: turn 40s linear infinite;
}

@keyframes turn {
  from { transform: translateY(calc(12 * var(--u))) rotateX(58deg) rotateZ(0deg); }
  to   { transform: translateY(calc(12 * var(--u))) rotateX(58deg) rotateZ(360deg); }
}

/* the firelight on the ground: a warm pool under the logs that breathes with the flame */
.glow {
  position: absolute;
  inset: calc(30 * var(--u));
  border-radius: 50%;
  background:
    radial-gradient(closest-side, rgb(255 230 160 / 0.45), rgb(255 150 60 / 0.3) 30%, rgb(255 77 157 / 0.14) 62%, transparent);
  animation: breathe 1.25s ease-in-out infinite alternate;
}

@keyframes breathe {
  from { opacity: 0.7; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1.04); }
}

/* a stone: a rounded lump standing on the ring. Its bottom middle is placed on the ground's
   centre, turned to its angle and walked out to the ring; then it turns back by its own angle and
   by the ground's turn, and stands up, so it always faces you. A stone is round from every side,
   so a picture of one that faces you is a stone from every side */
.stone {
  position: absolute;
  left: calc(50% - calc(13 * var(--u)));
  top: calc(50% - calc(16 * var(--u)));
  width: calc(26 * var(--u));
  height: calc(16 * var(--u));
  border-radius: 46% 54% 30% 34% / 70% 66% 34% 30%;
  /* lit from above, with the fire's warmth on its upper edge and its foot in shadow */
  background:
    radial-gradient(90% 70% at 44% 12%, rgb(255 200 150 / 0.4), transparent 60%),
    radial-gradient(120% 120% at 40% 20%, #b7b1c8, #8a84a0 38%, #5a5672 70%, #3a3750);
  transform-origin: 50% 100%;
  transform: rotateZ(var(--a)) translateY(calc(-80 * var(--u))) rotateZ(calc(0deg - var(--a))) rotateX(-90deg) scale(var(--s));
  animation: face 40s linear infinite;
}

/* every other stone a different lump, so the ring is not one stone ten times */
.stone:nth-of-type(even) {
  border-radius: 58% 42% 36% 28% / 62% 74% 26% 38%;
}

.stone:nth-of-type(3n) {
  border-radius: 40% 60% 34% 40% / 80% 60% 40% 20%;
}

/* the same placement, with the ground's turn undone as it turns */
@keyframes face {
  from { transform: rotateZ(var(--a)) translateY(calc(-80 * var(--u))) rotateZ(calc(0deg - var(--a))) rotateX(-90deg) scale(var(--s)); }
  to   { transform: rotateZ(var(--a)) translateY(calc(-80 * var(--u))) rotateZ(calc(-360deg - var(--a))) rotateX(-90deg) scale(var(--s)); }
}

/* a log: a zero-size carrier on the ground's centre, turned to the log's angle */
.log {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-style: preserve-3d;
  transform: rotateZ(var(--a));
}

/* the top face, from 10 to 70 units out. It tilts about its outer end, so the inner end rises
   into the fire, and is lifted the log's thickness; the sides and end below hang from it */
.beam {
  position: absolute;
  left: calc(-7 * var(--u));
  top: calc(-70 * var(--u));
  width: calc(14 * var(--u));
  height: calc(60 * var(--u));
  background:
    linear-gradient(to top, rgb(255 140 50 / 0.75), rgb(255 77 157 / 0.25) 24%, transparent 42%),
    repeating-linear-gradient(90deg, transparent 0 calc(2.6 * var(--u)), rgb(30 14 8 / 0.35) calc(2.6 * var(--u)) calc(3.4 * var(--u))),
    linear-gradient(90deg, #4a2c1c, #7b4c2e 35%, #8d5a36 52%, #6a4027 75%, #3f2517);
  transform-style: preserve-3d;
  transform-origin: 50% 0;
  transform: rotateX(14deg) translateZ(calc(14 * var(--u)));
}

/* the two sides, folded down from the long edges: bark, a shade darker than the top */
.beam::before,
.beam::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: calc(14 * var(--u));
  height: 100%;
  background:
    linear-gradient(to top, rgb(255 120 40 / 0.6), transparent 34%),
    repeating-linear-gradient(90deg, transparent 0 calc(3 * var(--u)), rgb(20 10 6 / 0.4) calc(3 * var(--u)) calc(3.8 * var(--u))),
    linear-gradient(90deg, #6a4027, #4a2c1c 70%, #2e1a10);
  transform-origin: 0 50%;
  transform: rotateY(90deg);
}

.beam::after {
  left: auto;
  right: 0;
  transform-origin: 100% 50%;
  transform: rotateY(-90deg);
}

/* the outer end, folded down from the short edge: end grain, rings round a pale heart, in bark */
.beam i {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(14 * var(--u));
  border: calc(1.6 * var(--u)) solid #3f2517;
  border-radius: calc(3 * var(--u));
  background: repeating-radial-gradient(circle at 50% 50%, #f0c58d 0 calc(1.1 * var(--u)), #c48a52 calc(1.1 * var(--u)) calc(2.2 * var(--u)));
  transform-origin: 50% 0;
  transform: rotateX(-90deg);
}

/* one plane of the flame: stands up at the centre, turned about the vertical to its angle, and
   flickers (scale and opacity) from its foot at its own pace */
.flame {
  position: absolute;
  left: calc(50% - calc(23 * var(--u)));
  top: calc(50% - calc(56 * var(--u)));
  width: calc(46 * var(--u));
  height: calc(56 * var(--u));
  transform-style: preserve-3d;
  transform-origin: 50% 100%;
  animation: flicker var(--d) ease-in-out infinite alternate;
}

@keyframes flicker {
  from { opacity: 1;    transform: translateZ(calc(8 * var(--u))) rotateX(-90deg) rotateY(var(--r)) scale(var(--s), 1.55); }
  50%  { opacity: 0.9;  transform: translateZ(calc(8 * var(--u))) rotateX(-90deg) rotateY(var(--r)) scale(calc(var(--s) * 0.9), 1.8); }
  to   { opacity: 0.96; transform: translateZ(calc(8 * var(--u))) rotateX(-90deg) rotateY(var(--r)) scale(calc(var(--s) * 1.04), 1.62); }
}

/* the teardrop: a square with three round corners turned 45°, its point up. Bright and pale at
   the foot, amber, then orange and pink to the tip */
.flame::before {
  content: '';
  position: absolute;
  left: calc(50% - calc(20 * var(--u)));
  bottom: 0;
  width: calc(40 * var(--u));
  height: calc(40 * var(--u));
  border-radius: 0 50% 50% 50%;
  background: radial-gradient(circle at 64% 64%, #fffbe8 0, #ffe9a8 calc(6 * var(--u)), #ffc65a calc(12 * var(--u)), #ff8a3d calc(19 * var(--u)), #ff4d9d calc(29 * var(--u)), rgb(214 40 120 / 0.9) calc(40 * var(--u)));
  transform: rotate(45deg);
}

/* the carrier for the embers and the licks: turns back exactly as the ground turns, then stands
   up, so everything on it faces you all the way round */
.sparks {
  position: absolute;
  left: calc(50% - calc(30 * var(--u)));
  top: calc(50% - calc(110 * var(--u)));
  width: calc(60 * var(--u));
  height: calc(110 * var(--u));
  transform-style: preserve-3d;
  transform-origin: 50% 100%;
  animation: unturn 40s linear infinite;
}

@keyframes unturn {
  from { transform: rotateZ(0deg) rotateX(-90deg); }
  to   { transform: rotateZ(-360deg) rotateX(-90deg); }
}

/* a lick: a small teardrop that breaks off the flame, rises and fades */
.lick {
  position: absolute;
  left: calc(50% - calc(5 * var(--u)) + var(--x) * var(--u));
  bottom: calc(54 * var(--u));
  width: calc(10 * var(--u));
  height: calc(10 * var(--u));
  border-radius: 0 50% 50% 50%;
  background: radial-gradient(circle at 64% 64%, #ffe9a8, #ffb547 40%, #ff6a5a 75%, #ff4d9d);
  opacity: 0;
  animation: lick var(--d) ease-out var(--t) infinite;
}

@keyframes lick {
  0%   { opacity: 0; transform: translateY(0) rotate(45deg) scale(1); }
  20%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(calc(-24 * var(--u))) rotate(45deg) scale(0.3); }
}

/* an ember: a hot fleck that rises out of the flame, drifts and goes out */
.ember {
  position: absolute;
  left: calc(50% + var(--x) * var(--u));
  bottom: calc(30 * var(--u));
  width: calc(3.4 * var(--u));
  height: calc(3.4 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle, #fff1c4 0 30%, #ffb547 55%, #ff6a3d);
  box-shadow: 0 0 calc(3 * var(--u)) calc(0.4 * var(--u)) rgb(255 120 60 / 0.8);
  opacity: 0;
  animation: rise var(--d) linear var(--t) infinite;
}

@keyframes rise {
  0%   { opacity: 0; transform: translate(0, 0); }
  15%  { opacity: 1; }
  60%  { opacity: 0.85; transform: translate(calc(var(--dx) * 0.6 * var(--u)), calc(-46 * var(--u))); }
  100% { opacity: 0; transform: translate(calc(var(--dx) * var(--u)), calc(-74 * var(--u))) scale(0.5); }
}`,
  },
};
