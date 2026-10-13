import type { Snippet } from './snippet-utils';

/**
 * The typebars: [start of the strike in seconds on the 7.2 s clock, fan angle]. Line 1, "Hello,",
 * strikes from 0 s; line 2, "3D world.", from 2.8 s; one letter every 0.3 s. Its space (3.4 s)
 * strikes nothing: the space bar dips instead.
 */
const BARS: [number, number][] = [
  [0, -42], [0.3, 30], [0.6, -6], [0.9, 66], [1.2, -66], [1.5, 18],
  [2.8, -30], [3.1, 54], [3.7, -78], [4.0, 6], [4.3, 42], [4.6, -18], [4.9, 78], [5.2, -54],
];

/** The body is a stack of rounded slices: [height, inset, colour]. The base, bottom up... */
const BASE: [number, number, string][] = [
  [-1, 4, '#3a8170'], [-6, 1.5, '#3f8977'], [-11, 0, '#dfe4ec'], [-16, 0, '#46917f'],
  [-21, 0, '#4b9784'], [-26, 0, '#519d8a'], [-31, 1.2, '#5ea995'], [-36, 3.5, '#8dd2c0'],
];
/** ...and the hood behind the keys, that carries the typebars and the carriage. */
const HOOD: [number, number, string][] = [
  [-40, 0, '#539f8c'], [-45.6, 0, '#56a38f'], [-51.2, 0, '#5aa793'], [-56.8, 0, '#5eab97'],
  [-62.4, 0, '#62af9b'], [-68, 1.2, '#6fbaa6'], [-73.6, 3.5, '#97dac9'],
];

/** The keyboard, back row to front: [the keys, how far the row starts in, in keys]. A real one's
    rows each start a little further right than the row behind (half a key, three quarters, a
    key and a quarter), which is why its columns lean. */
const KEYROWS: [string, number][] = [['1234567890', 0], ['QWERTYUIOP', 0.5], ['ASDFGHJKL', 0.75], ['ZXCVBNM,.', 1.25]];
/** One key to the next across a row, and one row to the next, in units; where the back row's first
    key starts, which centres the widest row (Q to P) in the 256-unit well; how high each row's caps
    stand on their levers, back to front: the back rows higher, as on a typewriter's stepped board. */
const KEY_PITCH = 20.5, ROW_PITCH = 16.5, KEY_LEFT = 20.5;
const KEY_HEIGHT = [10, 9, 8, 7];
/** Each key: its letter, where its centre sits on the well, and how high it stands. */
const KEYCAPS = KEYROWS.flatMap(([keys, start], r) => [...keys].map((ch, i) => ({
  ch, x: +(KEY_LEFT + (start + i + 0.5) * KEY_PITCH).toFixed(2), y: 13 + r * ROW_PITCH, h: KEY_HEIGHT[r],
})));

/** What each typebar in BARS types, in the same order. */
const TYPED = ['H', 'E', 'L', 'L', 'O', ',', '3', 'D', 'W', 'O', 'R', 'L', 'D', '.'];
/** A key's name in a class or a keyframes name: letters and digits as themselves, the two marks spelled. */
const keyName = (ch: string) => (ch === ',' ? 'comma' : ch === '.' ? 'stop' : `k${ch}`);
/** When each typed key goes down, in seconds on the 7.2 s clock: whenever its typebar strikes. */
const PRESSES = Object.fromEntries([...new Set(TYPED)].map((ch) => [ch, BARS.filter((_, i) => TYPED[i] === ch).map(([t]) => t)]));
/** A typed key's own keyframes: down 4 units on its lever in 0.06 s as its bar rises, back up by
    0.2 s as the bar falls back. */
const pct = (s: number) => `${+((s / 7.2) * 100).toFixed(3)}%`;
const UP = 'translateZ(calc(var(--h) * var(--u))) rotateX(-28deg)';
const DOWN = 'translateZ(calc((var(--h) - 4) * var(--u))) rotateX(-28deg)';
const keyFrames = (ch: string) => `@keyframes press-${keyName(ch)} {\n  0%, 100% { transform: ${UP}; }\n${PRESSES[ch]
  .map((t) => `  ${pct(t)}, ${pct(t + 0.2)} { transform: ${UP}; }\n  ${pct(t + 0.06)} { transform: ${DOWN}; }`)
  .join('\n')}\n}`;

/** The platen: eight faces round its axis, lit from above (faces 1 and 2 face up). */
const ROLL = ['#30333e', '#4a4e5c', '#3f4350', '#2a2c35', '#1e1f26', '#18191e', '#1a1b21', '#24262e'];

export const snippetsTypewriter: Record<string, Snippet> = {
  typewriter: {
    how: [
      'The body is a stack of flat, rounded slices: eight for the base and seven for the hood, each a rounded rectangle laid flat with <code>rotateX(90deg)</code> a few units above the last. Seen from above, every slice shows a thin band below the one on top of it, so the bands make the wall, shaded darker towards the floor, with round corners and no seam. The top two slices are inset a little, which rounds the top edge; one slice is chrome, which is the trim.',
      'The typing runs on one clock of 7.2 s, one letter every 0.3 s. Every part gets <code>animation-delay: calc(var(--d) + …)</code>: a typebar waits for its own letter (<code>--t</code>), the letters wait the 0.08 s a bar takes to land, the carriage the 0.16 s until the key is let go. Every key is its own round cap on a lever, with its letter and a chrome side, and the ten the text uses go down whenever their letter strikes. <code>--d</code> starts the clock in the middle of line 2, so a paused card shows the words with the carriage centred.',
      'Each line is revealed with <code>steps(n, jump-start)</code>: a window with <code>overflow: hidden</code> steps right one character while the text inside steps left as far, so the text holds still on the paper and one more letter shows each step. The carriage jumps left one character on the same steps. Only <code>transform</code> moves.',
      'At the end of a line the carriage slides back, the knobs turn a ridge and the typed text moves up one line, so it stands on the white sheet above the print line while the next line is typed. After line 2 both lines roll up and fade; the windows snap shut while they are hidden, so the loop ends where it began.',
      'Each typebar lies in a fan round the print point: <code>rotateY(--a)</code> turns it to its place, <code>translateZ(38)</code> sets its pivot on the arc, and a strike is <code>rotateX(90deg → 36deg)</code> about that pivot, the angle whose tip lands right above the fan&rsquo;s centre, at the print line. A second strip across each bar, on <code>::before</code>, keeps a bar seen edge on from vanishing.',
    ],
    html: `<div class="scene">
  <div class="tw" role="img" aria-label="A typewriter typing Hello, then 3D world. one letter at a time">
    <i class="ground"></i>
${BASE.map(([y, n, c], i) => `    <i class="slice base${i === BASE.length - 1 ? " top" : ""}" style="--y:${y};--in:${n};--c:${c}"></i>`).join('\n')}
${HOOD.map(([y, n, c], i) => `    <i class="slice hood${i === HOOD.length - 1 ? " top" : ""}" style="--y:${y};--in:${n};--c:${c}"></i>`).join('\n')}
    <div class="deck">
${KEYCAPS.map(({ ch, x, y, h }) => `      <b class="k${PRESSES[ch] ? ` ${keyName(ch)}` : ''}" style="--x:${x};--y:${y};--h:${h}">${ch}</b>`).join('\n')}
      <i class="spacebar"></i>
    </div>
    <i class="basket"></i>
    <i class="guide"></i>
${BARS.map(([t, a]) => `    <i class="bar" style="--t:${t};--a:${a}deg"></i>`).join('\n')}
    <div class="carriage">
${ROLL.map((c, k) => `      <i class="roll" style="--k:${k};--c:${c}"></i>`).join('\n')}
      <i class="plate" style="--x:-131"></i>
      <i class="plate" style="--x:131"></i>
      <i class="knob" style="--x:-137"></i>
      <i class="knob" style="--x:137"></i>
      <i class="lever"></i>
      <div class="paper">
        <div class="lines">
          <div class="win one"><span class="ink">Hello,</span></div>
          <div class="win two"><span class="ink">3D world.</span></div>
        </div>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it */
  --u: 0.21vmin;
  /* where the 7.2 s clock starts: 4.24 s in, line 2 half typed, the carriage in the middle */
  --d: -4.24s;
  perspective: calc(1300 * var(--u));
}

/* the camera: nearly in front and a little above, turned 7 degrees, so the sheet faces you and its
   text renders sharp, and the keys sit in level rows. Model space: x right, y down (the floor is
   y = 0), z towards you */
.tw {
  position: relative;
  transform-style: preserve-3d;
  transform: translate(calc(0 * var(--u)), calc(91 * var(--u))) rotateX(-24deg) rotateY(-7deg);
}
.tw :where(i, div) {
  position: absolute;
  display: block;
  box-sizing: border-box;
}
.tw .deck,
.tw .carriage,
.tw .bar {
  transform-style: preserve-3d;
}

/* a soft shadow on the floor */
.ground {
  left: calc(-200 * var(--u));
  top: calc(-125 * var(--u));
  width: calc(400 * var(--u));
  height: calc(250 * var(--u));
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.3), rgb(0 0 0 / 0.1) 65%, transparent);
  transform: translateY(calc(0.5 * var(--u))) rotateX(90deg);
}

/* ---- the body: rounded slices laid flat, each centred on its footprint and lifted to --y.
   An inset slice is smaller and rounder, which bevels the edge ---- */
.slice {
  border-radius: calc((var(--R) - var(--in)) * var(--u));
  background: var(--c);
}
.slice.base {
  --R: 30;
  left: calc((-150 + var(--in)) * var(--u));
  top: calc((-95 + var(--in)) * var(--u));
  width: calc((300 - 2 * var(--in)) * var(--u));
  height: calc((190 - 2 * var(--in)) * var(--u));
  transform: translateY(calc(var(--y) * var(--u))) rotateX(90deg);
}
.slice.hood {
  --R: 24;
  left: calc((-140 + var(--in)) * var(--u));
  top: calc((-47.5 + var(--in)) * var(--u));
  width: calc((280 - 2 * var(--in)) * var(--u));
  height: calc((95 - 2 * var(--in)) * var(--u));
  transform: translate3d(0, calc(var(--y) * var(--u)), calc(-47.5 * var(--u))) rotateX(90deg);
}
/* the two top surfaces catch the light along their front edge */
.slice.top {
  background: linear-gradient(transparent 70%, rgb(255 255 255 / 0.22)), var(--c);
}

/* the key well: a dark plate sloping up from the front of the base to the hood, about 23 degrees */
.deck {
  left: calc(-128 * var(--u));
  top: 0;
  width: calc(256 * var(--u));
  height: calc(82.86 * var(--u));
  border-radius: calc(12 * var(--u));
  background: linear-gradient(#1c1e25, #2b2e37);
  transform-origin: 0 0;
  transform: translate3d(0, calc(-70 * var(--u)), calc(2 * var(--u))) rotateX(66.53deg);
}
/* a key: a round cap with its letter, a cream face dished toward the middle in a chrome ring,
   standing on its lever --h units above the well (the back rows higher) and tipped 28 degrees
   toward you, so its face reads as a round key rather than a flat ellipse */
.tw .k {
  position: absolute;
  display: block;
  left: calc((var(--x) - 6.25) * var(--u));
  top: calc((var(--y) - 6.25) * var(--u));
  width: calc(12.5 * var(--u));
  height: calc(12.5 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle closest-side, #fffdf6 0, #f2ecdc 56%, #d6ccb4 68%, #eef1f6 73%, #b4bac6 86%, #7d8391 100%);
  color: #2b2620;
  font: 800 calc(5.4 * var(--u)) / calc(12.5 * var(--u)) 'JetBrains Mono', monospace;
  text-align: center;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--h) * var(--u))) rotateX(-28deg);
  animation: none 7.2s linear var(--d) infinite;
}
/* the cap's chrome side: two discs under its face, darker as they go down, so each key is a short
   cylinder with a side you can see, not a dot painted on the well */
.tw .k::before,
.tw .k::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
}
.tw .k::after {
  background: #9ba1ad;
  transform: translateZ(calc(-1.6 * var(--u)));
}
.tw .k::before {
  background: #4f5562;
  transform: translateZ(calc(-3.2 * var(--u)));
}
/* the keys the text types go down on their levers whenever their letter strikes, on the typebars'
   clock: their keyframes are made from the bars' strike times */
${[...new Set(TYPED)].map((ch) => `.tw .k.${keyName(ch)} { animation-name: press-${keyName(ch)}; }`).join('\n')}
.spacebar {
  /* at the well's front edge, clear of the front row of keys */
  left: calc(68 * var(--u));
  top: calc(76.5 * var(--u));
  width: calc(120 * var(--u));
  height: calc(6.5 * var(--u));
  border-radius: calc(3.25 * var(--u));
  background: linear-gradient(#fffdf6, #d9d1bd);
  box-shadow: inset 0 calc(-1.5 * var(--u)) 0 #b3aa96;
  transform: translateZ(calc(5 * var(--u))) rotateX(-20deg);
  animation: space 7.2s linear var(--d) infinite;
}

/* the typebar basket on top of the hood: a dark half disc round the print point, with the rest
   of the fan painted in */
.basket {
  left: calc(-40 * var(--u));
  top: 0;
  width: calc(80 * var(--u));
  height: calc(40 * var(--u));
  border-radius: 0 0 calc(40 * var(--u)) calc(40 * var(--u));
  background:
    repeating-conic-gradient(from 90deg at 50% 0, rgb(170 178 192 / 0.5) 0 0.8deg, transparent 0.8deg 5deg),
    radial-gradient(circle at 50% 0, #0e0f14 30%, #1d1f26);
  transform-origin: 50% 0;
  transform: translate3d(0, calc(-74.6 * var(--u)), calc(-43 * var(--u))) rotateX(90deg);
}
/* the ribbon guide: a small chrome plate just under the print line. It belongs to the body, so
   the paper moves past it */
.guide {
  left: calc(-20 * var(--u));
  top: calc(-113 * var(--u));
  width: calc(40 * var(--u));
  height: calc(9 * var(--u));
  border-radius: calc(4.5 * var(--u)) calc(4.5 * var(--u)) calc(2 * var(--u)) calc(2 * var(--u));
  background: linear-gradient(#ffffff, #b9bfca 45%, #7a808d);
  transform: translateZ(calc(-40 * var(--u)));
}

/* a typebar: its pivot is the bottom of its box, out on the fan's arc; at rest it lies flat
   pointing back at the print point (rotateX 90deg), a strike swings it up to 36deg */
.bar {
  left: calc(-2.5 * var(--u));
  top: calc(-65 * var(--u));
  width: calc(5 * var(--u));
  height: calc(65 * var(--u));
  border-radius: calc(2.5 * var(--u));
  background: linear-gradient(#2a2d36 0 10%, #ffffff 10% 28%, #c3c8d2 60%, #7d8390);
  transform-origin: 50% 100%;
  transform: translate3d(0, calc(-75.6 * var(--u)), calc(-43 * var(--u))) rotateY(var(--a)) translateZ(calc(38 * var(--u))) rotateX(90deg);
  animation: strike 7.2s linear calc(var(--d) + var(--t) * 1s) infinite;
}
/* a second strip across the first, turned 90deg about the bar's length: a flat strip seen edge
   on vanishes, a cross never does */
.bar::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: inherit;
  transform: rotateY(90deg);
}

/* ---- the carriage: platen, knobs and paper; it moves as one ---- */
.carriage {
  animation: carriage 7.2s linear calc(var(--d) + 0.16s) infinite;
}
.roll {
  left: calc(-130 * var(--u));
  top: calc(-6.9 * var(--u));
  width: calc(260 * var(--u));
  height: calc(13.8 * var(--u));
  background: var(--c);
  transform: translate3d(0, calc(-96 * var(--u)), calc(-62 * var(--u))) rotateX(calc(var(--k) * 45deg)) translateZ(calc(16.6 * var(--u)));
}
/* the end plates of the carriage, which also close the ends of the platen */
.plate {
  left: 0;
  top: 0;
  width: calc(46 * var(--u));
  height: calc(46 * var(--u));
  border-radius: calc(23 * var(--u)) calc(23 * var(--u)) calc(6 * var(--u)) calc(6 * var(--u));
  background: linear-gradient(#5aa694, #3b7d6e);
  transform-origin: 0 0;
  transform: translate3d(calc(var(--x) * var(--u)), calc(-119 * var(--u)), calc(-39 * var(--u))) rotateY(90deg);
}
/* the knobs: ridged discs; twelve ridges, so a turn of 30deg looks like none */
.knob {
  left: calc(-20 * var(--u));
  top: calc(-20 * var(--u));
  width: calc(40 * var(--u));
  height: calc(40 * var(--u));
  border-radius: 50%;
  background:
    radial-gradient(circle, #e2e6ee 0, #a9afbb 13%, #2c2e36 18%, #2c2e36 54%, rgb(44 46 54 / 0) 60%),
    repeating-conic-gradient(#18191e 0 15deg, #4a4e5b 15deg 30deg);
  transform: translate3d(calc(var(--x) * var(--u)), calc(-96 * var(--u)), calc(-62 * var(--u))) rotateY(90deg) rotateZ(0deg);
  animation: feed 7.2s linear var(--d) infinite;
}
/* the carriage return lever, out to the front left */
.lever {
  left: 0;
  top: calc(-3 * var(--u));
  width: calc(56 * var(--u));
  height: calc(6 * var(--u));
  border-radius: calc(3 * var(--u));
  background: linear-gradient(#ffffff, #a6acb8 50%, #6f7582);
  transform-origin: 0 50%;
  transform: translate3d(calc(-124 * var(--u)), calc(-110 * var(--u)), calc(-58 * var(--u))) rotateY(-114deg) rotateZ(-16deg);
}

/* the paper stands on the front of the platen, facing you. The print line is on the white,
   just above the ribbon guide */
.paper {
  left: calc(-100 * var(--u));
  top: calc(-216 * var(--u));
  width: calc(200 * var(--u));
  height: calc(120 * var(--u));
  border-radius: calc(3 * var(--u)) calc(3 * var(--u)) 0 0;
  background: linear-gradient(#fdfbf6 78%, #ece6d8);
  transform: translateZ(calc(-70 * var(--u)));
}
/* both lines; at each carriage return they move up one line (28 units) */
.lines {
  left: calc(34 * var(--u));
  top: calc(74 * var(--u));
  animation: feed-lines 7.2s linear var(--d) infinite;
}
/* the reveal: a window as wide as its line steps right while the text inside steps left as far,
   so the text holds still and one more letter shows each step. 13.2 units is one character of
   JetBrains Mono at 22 */
.win {
  position: relative;
  height: calc(28 * var(--u));
  overflow: hidden;
}
.win.one {
  width: calc(79.2 * var(--u));
  animation: reveal-one 7.2s linear calc(var(--d) + 0.08s) infinite;
}
.win.two {
  width: calc(118.8 * var(--u));
  animation: reveal-two 7.2s linear calc(var(--d) + 0.08s) infinite;
}
.ink {
  display: block;
  white-space: pre;
  color: #191b26;
  font: 600 calc(22 * var(--u)) / calc(28 * var(--u)) 'JetBrains Mono', monospace;
  letter-spacing: 0;
}
.win.one .ink { animation: hold-one 7.2s linear calc(var(--d) + 0.08s) infinite; }
.win.two .ink { animation: hold-two 7.2s linear calc(var(--d) + 0.08s) infinite; }

/* ---- one 7.2 s clock. Line 1, 6 letters: 0 to 1.8 s (25%). Return: 2.0 to 2.6 s. Line 2,
   9 letters: 2.8 to 5.5 s (38.889 to 76.389%). Return: 6.0 to 6.6 s. Blank to 7.2 s ---- */
@keyframes carriage {
  0% { transform: translateX(calc(59.4 * var(--u))); animation-timing-function: steps(6, jump-start); }
  25% { transform: translateX(calc(-19.8 * var(--u))); }
  25.556% { transform: translateX(calc(-19.8 * var(--u))); animation-timing-function: cubic-bezier(0.55, 0, 0.3, 1); }
  33.889% { transform: translateX(calc(59.4 * var(--u))); }
  38.889% { transform: translateX(calc(59.4 * var(--u))); animation-timing-function: steps(9, jump-start); }
  76.389% { transform: translateX(calc(-59.4 * var(--u))); }
  81.111% { transform: translateX(calc(-59.4 * var(--u))); animation-timing-function: cubic-bezier(0.55, 0, 0.3, 1); }
  89.444%, 100% { transform: translateX(calc(59.4 * var(--u))); }
}
@keyframes reveal-one {
  0% { transform: translateX(calc(-79.2 * var(--u))); animation-timing-function: steps(6, jump-start); }
  25% { transform: translateX(0); }
  93% { transform: translateX(0); animation-timing-function: steps(1, jump-start); }
  100% { transform: translateX(calc(-79.2 * var(--u))); }
}
@keyframes hold-one {
  0% { transform: translateX(calc(79.2 * var(--u))); animation-timing-function: steps(6, jump-start); }
  25% { transform: translateX(0); }
  93% { transform: translateX(0); animation-timing-function: steps(1, jump-start); }
  100% { transform: translateX(calc(79.2 * var(--u))); }
}
@keyframes reveal-two {
  0% { transform: translateX(calc(-118.8 * var(--u))); }
  38.889% { transform: translateX(calc(-118.8 * var(--u))); animation-timing-function: steps(9, jump-start); }
  76.389% { transform: translateX(0); }
  93% { transform: translateX(0); animation-timing-function: steps(1, jump-start); }
  100% { transform: translateX(calc(-118.8 * var(--u))); }
}
@keyframes hold-two {
  0% { transform: translateX(calc(118.8 * var(--u))); }
  38.889% { transform: translateX(calc(118.8 * var(--u))); animation-timing-function: steps(9, jump-start); }
  76.389% { transform: translateX(0); }
  93% { transform: translateX(0); animation-timing-function: steps(1, jump-start); }
  100% { transform: translateX(calc(118.8 * var(--u))); }
}
@keyframes feed-lines {
  0%, 27.778% { transform: translateY(0); opacity: 1; }
  33.333%, 83.333% { transform: translateY(calc(-28 * var(--u))); opacity: 1; }
  90.278% { transform: translateY(calc(-56 * var(--u))); opacity: 0; }
  95.833% { transform: translateY(0); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
/* a strike: up in 0.08 s, back by 0.22 s */
@keyframes strike {
  0% { animation-timing-function: cubic-bezier(0.5, 0, 1, 1); }
  1.111% { transform: translate3d(0, calc(-75.6 * var(--u)), calc(-43 * var(--u))) rotateY(var(--a)) translateZ(calc(38 * var(--u))) rotateX(36deg); animation-timing-function: cubic-bezier(0, 0, 0.4, 1); }
  3% { transform: translate3d(0, calc(-75.6 * var(--u)), calc(-43 * var(--u))) rotateY(var(--a)) translateZ(calc(38 * var(--u))) rotateX(90deg); }
}
/* the keys the text types, each going down whenever its typebar strikes (the L three times, the
   O twice) */
${[...new Set(TYPED)].map(keyFrames).join('\n')}
/* the space in line 2, at 3.4 s (47.222%) */
@keyframes space {
  0%, 47.222%, 50%, 100% { transform: translateZ(calc(5 * var(--u))) rotateX(-20deg); }
  48.333% { transform: translateZ(calc(1.5 * var(--u))) rotateX(-20deg); }
}
/* the knobs turn one ridge at each return: 30deg, then 60deg, which looks the same as 0deg */
@keyframes feed {
  0%, 27.778% { transform: translate3d(calc(var(--x) * var(--u)), calc(-96 * var(--u)), calc(-62 * var(--u))) rotateY(90deg) rotateZ(0deg); }
  33.333%, 83.333% { transform: translate3d(calc(var(--x) * var(--u)), calc(-96 * var(--u)), calc(-62 * var(--u))) rotateY(90deg) rotateZ(30deg); }
  90.278%, 100% { transform: translate3d(calc(var(--x) * var(--u)), calc(-96 * var(--u)), calc(-62 * var(--u))) rotateY(90deg) rotateZ(60deg); }
}`,
  },
};
