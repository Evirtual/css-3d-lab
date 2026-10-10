import type { Snippet } from './snippet-utils';

/** The typebars: [letter index, fan angle]. Spaces (6 and 9) strike nothing: the space bar dips. */
const BARS: [number, number][] = [
  [0, -42], [1, 30], [2, -6], [3, 66], [4, -66], [5, 18], [7, -30],
  [8, 54], [10, -78], [11, 6], [12, 42], [13, -18], [14, 78], [15, -54],
];

/** The platen: eight faces round its axis, lit from above (faces 1 and 2 face up). */
const ROLL = ['#2c2f39', '#454956', '#3b3f4b', '#262830', '#1b1c22', '#16171c', '#18191e', '#202228'];

export const snippetsTypewriter: Record<string, Snippet> = {
  typewriter: {
    how: [
      'The machine is a handful of flat faces placed in 3D: front, sloped key deck, top and one side cut to the body\'s profile with <code>clip-path</code>. The platen is an eight-sided prism (<code>rotateX(k × 45deg) translateZ(apothem)</code>) and the paper a plane standing on its front. Only the faces the camera can see are drawn.',
      'The whole loop runs on one clock of 7.2 s, with one letter every 0.3 s. Every part gets <code>animation-delay: calc(var(--d) + …)</code>: the typebar for letter <code>--i</code> waits <code>--i × 0.3s</code>, the letters wait the 0.08 s a bar takes to land, the carriage the 0.16 s until the key is let go. <code>--d</code> starts the clock mid-line, so a paused card shows "Hello, 3D" with the carriage in the middle.',
      'Typing is <code>steps(16, jump-start)</code>. The carriage jumps one character width left per step. The letters are revealed by a window with <code>overflow: hidden</code> that steps right while the text inside steps left by the same amount, so the text stays put on the paper and one more letter shows each step. Only <code>transform</code> moves, never a width.',
      'Each typebar sits in a fan: <code>rotateY(--a)</code> turns it to its place around the print point, <code>translateZ(40)</code> sets its pivot out on the arc, and a strike is <code>rotateX(90deg → 47deg)</code> about that pivot. That angle is the one whose tip lands right above the fan\'s centre, so all fourteen bars hit the same spot on the paper.',
      'At the end of the line the carriage slides back, the knobs turn one ridge (30°, so the jump back to 0° cannot be seen) and the typed line rolls up and fades. The window snaps shut while the line is hidden, so the loop ends where it began.',
    ],
    html: `<div class="scene">
  <div class="tw" role="img" aria-label="A typewriter typing Hello, 3D world. one letter at a time">
    <i class="ground"></i>
    <i class="front"></i>
    <i class="side"></i>
    <i class="top"></i>
    <i class="rail"></i>
    <i class="basket"></i>
    <div class="deck">
      <i class="keys" style="--r:0"></i>
      <i class="keys" style="--r:1"></i>
      <i class="keys" style="--r:2"></i>
      <i class="keys" style="--r:3"></i>
      <i class="spacebar"></i>
    </div>
${BARS.map(([i, a]) => `    <i class="bar" style="--i:${i};--a:${a}deg"></i>`).join('\n')}
    <div class="carriage">
${ROLL.map((c, k) => `      <i class="roll" style="--k:${k};--c:${c}"></i>`).join('\n')}
      <i class="plate" style="--x:-111"></i>
      <i class="plate" style="--x:111"></i>
      <i class="knob" style="--x:-117"></i>
      <i class="knob" style="--x:117"></i>
      <i class="lever"></i>
      <div class="paper">
        <div class="line"><div class="win"><span class="ink">Hello, 3D world.</span></div></div>
      </div>
      <i class="bail"></i>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it */
  --u: 0.21vmin;
  /* where the 7.2 s clock starts: 2.64 s in, between "D" and the space, carriage in the middle */
  --d: -2.64s;
  perspective: calc(1100 * var(--u));
}

/* the camera: a little above and to the right of the machine. Model space: x right, y down,
   z towards you; the top of the body is at y = -10 */
.tw {
  position: relative;
  transform-style: preserve-3d;
  transform: translate(calc(-6 * var(--u)), calc(35 * var(--u))) rotateX(-24deg) rotateY(-26deg);
}
.tw :where(i, div) {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
  box-sizing: border-box;
}
.tw .deck,
.tw .carriage {
  transform-style: preserve-3d;
}

/* a soft shadow on the floor, under the body */
.ground {
  left: calc(-190 * var(--u));
  top: calc(-130 * var(--u));
  width: calc(380 * var(--u));
  height: calc(260 * var(--u));
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.32), rgb(0 0 0 / 0.12) 60%, transparent);
  transform: translate3d(0, calc(60 * var(--u)), calc(5 * var(--u))) rotateX(90deg);
}

/* ---- the body: four faces, each placed by its top-left corner ---- */
.front,
.side,
.top,
.deck,
.basket,
.rail {
  transform-origin: 0 0;
}
/* front: 260 wide, 30 high, at z = 100, with a chrome trim */
.front {
  width: calc(260 * var(--u));
  height: calc(30 * var(--u));
  border-radius: 0 0 calc(4 * var(--u)) calc(4 * var(--u));
  background:
    linear-gradient(transparent 22%, #e4e8ef 22% 30%, #8d93a0 30% 34%, transparent 34%),
    linear-gradient(#56a090, #3f8172);
  transform: translate3d(calc(-130 * var(--u)), calc(30 * var(--u)), calc(100 * var(--u)));
}
/* the key deck rises 40 over a run of 90, back to the top: rotateX(66.04deg) lays it on that slope */
.deck {
  width: calc(260 * var(--u));
  height: calc(98.5 * var(--u));
  background: linear-gradient(#73bcaa, #62ab99);
  transform: translate3d(calc(-130 * var(--u)), calc(-10 * var(--u)), calc(10 * var(--u))) rotateX(66.04deg);
}
/* top: flat, from the back (z = -90) to the deck (z = 10), a dark carriage bed at the back */
.top {
  width: calc(260 * var(--u));
  height: calc(100 * var(--u));
  background: linear-gradient(#2a2d36 0 14%, #5c9e8f 14% 16%, #86ccbb 16%);
  transform: translate3d(calc(-130 * var(--u)), calc(-10 * var(--u)), calc(-90 * var(--u))) rotateX(90deg);
}
/* the right side, turned to face +x, cut to the profile: low front, sloped deck, flat top */
.side {
  width: calc(190 * var(--u));
  height: calc(70 * var(--u));
  background: linear-gradient(#468a7b, #356c60);
  clip-path: polygon(0 57.14%, 47.37% 0, 100% 0, 100% 100%, 0 100%);
  transform: translate3d(calc(130 * var(--u)), calc(-10 * var(--u)), calc(100 * var(--u))) rotateY(90deg);
}
/* the rail the carriage rides on, along the back */
.rail {
  width: calc(240 * var(--u));
  height: calc(5 * var(--u));
  border-radius: calc(2.5 * var(--u));
  background: linear-gradient(#f1f3f7, #7d8390);
  transform: translate3d(calc(-120 * var(--u)), calc(-17 * var(--u)), calc(-74 * var(--u)));
}

/* the typebar basket: a dark half disc round the print point, with the rest of the fan painted in */
.basket {
  width: calc(84 * var(--u));
  height: calc(42 * var(--u));
  border-radius: 0 0 calc(42 * var(--u)) calc(42 * var(--u));
  background:
    repeating-conic-gradient(from 90deg at 50% 0, rgb(170 178 192 / 0.55) 0 0.7deg, transparent 0.7deg 5deg),
    radial-gradient(circle at 50% 0, #101116 30%, #1d1f26);
  transform: translate3d(calc(-42 * var(--u)), calc(-11 * var(--u)), calc(-33 * var(--u))) rotateX(90deg);
}

/* four staggered rows of round keys, standing 4 units off the deck */
.keys {
  left: calc((30 + var(--r) * 5) * var(--u));
  top: calc((10 + var(--r) * 19) * var(--u));
  width: calc(200 * var(--u));
  height: calc(18 * var(--u));
  background: radial-gradient(circle closest-side, #3a3d47 0 50%, #22242b 56% 64%, #e7eaf0 67% 80%, #6f7480 84% 92%, transparent 95%) 0 0 / calc(20 * var(--u)) 100% repeat-x;
  transform: translateZ(calc(4 * var(--u)));
}
.spacebar {
  left: calc(75 * var(--u));
  top: calc(86 * var(--u));
  width: calc(110 * var(--u));
  height: calc(8 * var(--u));
  border-radius: calc(4 * var(--u));
  background: linear-gradient(#4a4e5a, #1f2128);
  transform: translateZ(calc(4 * var(--u)));
  animation: space 7.2s linear var(--d) infinite;
}

/* a typebar: its pivot is the bottom of its box, out on the fan's arc; at rest it lies flat
   pointing back at the print point (rotateX 90deg), a strike swings it up to 47deg */
.bar {
  left: calc(-2.5 * var(--u));
  top: calc(-55 * var(--u));
  width: calc(5 * var(--u));
  height: calc(55 * var(--u));
  border-radius: calc(2.5 * var(--u));
  background: linear-gradient(#2a2d36 0 12%, #ffffff 12% 30%, #c3c8d2 60%, #7d8390);
  transform-origin: 50% 100%;
  transform: translate3d(0, calc(-12 * var(--u)), calc(-33 * var(--u))) rotateY(var(--a)) translateZ(calc(40 * var(--u))) rotateX(90deg);
  transform-style: preserve-3d;
  animation: strike 7.2s linear calc(var(--d) + var(--i) * 0.3s) infinite;
}
/* a second strip across the first, turned 90deg about the bar's length: a flat strip seen edge
   on vanishes, a cross never does, whichever way its bar points in the fan */
.bar::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: inherit;
  transform: rotateY(90deg);
}

/* ---- the carriage: platen, knobs, paper; it moves as one ---- */
.carriage {
  animation: carriage 7.2s linear calc(var(--d) + 0.16s) infinite;
}
.roll {
  left: calc(-110 * var(--u));
  top: calc(-6.2 * var(--u));
  width: calc(220 * var(--u));
  height: calc(12.4 * var(--u));
  background: var(--c);
  transform: translate3d(0, calc(-36 * var(--u)), calc(-50 * var(--u))) rotateX(calc(var(--k) * 45deg)) translateZ(calc(14.8 * var(--u)));
}
/* the end plates of the carriage, which also close the ends of the platen */
.plate {
  width: calc(42 * var(--u));
  height: calc(42 * var(--u));
  border-radius: calc(21 * var(--u)) calc(21 * var(--u)) calc(4 * var(--u)) calc(4 * var(--u));
  background: linear-gradient(#4c8f80, #366e62);
  transform-origin: 0 0;
  transform: translate3d(calc(var(--x) * var(--u)), calc(-57 * var(--u)), calc(-29 * var(--u))) rotateY(90deg);
}
/* the knobs: ridged discs; twelve ridges, so a 30deg turn looks like none */
.knob {
  left: calc(-16 * var(--u));
  top: calc(-16 * var(--u));
  width: calc(32 * var(--u));
  height: calc(32 * var(--u));
  border-radius: 50%;
  background:
    radial-gradient(circle, #c9ced8 0 14%, #2c2e36 17% 56%, transparent 58%),
    repeating-conic-gradient(#17181d 0 15deg, #444855 15deg 30deg);
  transform: translate3d(calc(var(--x) * var(--u)), calc(-36 * var(--u)), calc(-50 * var(--u))) rotateY(90deg) rotateZ(0deg);
  animation: feed 7.2s linear var(--d) infinite;
}
/* the carriage return lever, out to the front left */
.lever {
  top: calc(-2.5 * var(--u));
  width: calc(50 * var(--u));
  height: calc(5 * var(--u));
  border-radius: calc(2.5 * var(--u));
  background: linear-gradient(#f4f6f9, #8a909c);
  transform-origin: 0 50%;
  transform: translate3d(calc(-104 * var(--u)), calc(-50 * var(--u)), calc(-48 * var(--u))) rotateY(-112deg) rotateZ(-14deg);
}

/* the paper stands on the front of the platen; the typed line is just above it */
.paper {
  left: calc(-90 * var(--u));
  top: calc(-166 * var(--u));
  width: calc(180 * var(--u));
  height: calc(130 * var(--u));
  border-radius: calc(2 * var(--u)) calc(2 * var(--u)) 0 0;
  background: linear-gradient(#fcfaf4 70%, #ece6d8);
  transform: translateZ(calc(-34 * var(--u)));
}
/* the line rolls up and fades at the end, while the carriage returns */
.line {
  left: calc(13.5 * var(--u));
  top: calc(107 * var(--u));
  animation: clear 7.2s linear var(--d) infinite;
}
/* the reveal: a window 16 characters wide steps right while the text inside steps left as far,
   so the text holds still and one more letter shows each step. 9 units is one character of
   JetBrains Mono at 15 */
.win {
  position: relative;
  width: calc(144 * var(--u));
  height: calc(18 * var(--u));
  overflow: hidden;
  animation: reveal 7.2s linear calc(var(--d) + 0.08s) infinite;
}
.ink {
  display: block;
  white-space: pre;
  color: #1b1d29;
  font: 600 calc(15 * var(--u)) / calc(18 * var(--u)) 'JetBrains Mono', monospace;
  letter-spacing: 0;
  animation: hold 7.2s linear calc(var(--d) + 0.08s) infinite;
}
/* the paper bail, a chrome rod with two rubber rollers, above the line */
.bail {
  left: calc(-100 * var(--u));
  top: calc(-74 * var(--u));
  width: calc(200 * var(--u));
  height: calc(4 * var(--u));
  border-radius: calc(2 * var(--u));
  background:
    linear-gradient(90deg, transparent 27%, #1f2026 27% 33%, transparent 33% 67%, #1f2026 67% 73%, transparent 73%),
    linear-gradient(#f4f6f9, #858b97);
  transform: translateZ(calc(-30 * var(--u)));
}

/* ---- one 7.2 s clock: 16 letters at 0.3 s (0 to 66.667%), a pause, the return (77.778 to
   88.889%), a blank paper ---- */
@keyframes carriage {
  0% { transform: translateX(calc(72 * var(--u))); animation-timing-function: steps(16, jump-start); }
  66.667% { transform: translateX(calc(-72 * var(--u))); }
  77.778% { transform: translateX(calc(-72 * var(--u))); animation-timing-function: cubic-bezier(0.55, 0, 0.3, 1); }
  88.889%, 100% { transform: translateX(calc(72 * var(--u))); }
}
@keyframes reveal {
  0% { transform: translateX(calc(-144 * var(--u))); animation-timing-function: steps(16, jump-start); }
  66.667% { transform: translateX(0); }
  92% { transform: translateX(0); animation-timing-function: steps(1, jump-start); }
  100% { transform: translateX(calc(-144 * var(--u))); }
}
@keyframes hold {
  0% { transform: translateX(calc(144 * var(--u))); animation-timing-function: steps(16, jump-start); }
  66.667% { transform: translateX(0); }
  92% { transform: translateX(0); animation-timing-function: steps(1, jump-start); }
  100% { transform: translateX(calc(144 * var(--u))); }
}
@keyframes clear {
  0%, 77.778% { transform: translateY(0); opacity: 1; }
  86.111% { transform: translateY(calc(-18 * var(--u))); opacity: 0; }
  95% { transform: translateY(0); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
/* a strike: up in 0.08 s, back by 0.22 s */
@keyframes strike {
  0% { animation-timing-function: cubic-bezier(0.5, 0, 1, 1); }
  1.111% { transform: translate3d(0, calc(-12 * var(--u)), calc(-33 * var(--u))) rotateY(var(--a)) translateZ(calc(40 * var(--u))) rotateX(47deg); animation-timing-function: cubic-bezier(0, 0, 0.4, 1); }
  3% { transform: translate3d(0, calc(-12 * var(--u)), calc(-33 * var(--u))) rotateY(var(--a)) translateZ(calc(40 * var(--u))) rotateX(90deg); }
}
/* the two spaces: letters 6 and 9, at 25% and 37.5% */
@keyframes space {
  0%, 25%, 27.778%, 37.5%, 40.278%, 100% { transform: translateZ(calc(4 * var(--u))); }
  26.111%, 38.611% { transform: translateZ(calc(1 * var(--u))); }
}
@keyframes feed {
  0%, 77.778% { transform: translate3d(calc(var(--x) * var(--u)), calc(-36 * var(--u)), calc(-50 * var(--u))) rotateY(90deg) rotateZ(0deg); }
  86.111%, 100% { transform: translate3d(calc(var(--x) * var(--u)), calc(-36 * var(--u)), calc(-50 * var(--u))) rotateY(90deg) rotateZ(30deg); }
}`,
  },
};
