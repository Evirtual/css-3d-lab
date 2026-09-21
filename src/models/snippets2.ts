import { CUBE_FACES, type Snippet } from './snippet-utils';

const lines = (n: number, fn: (i: number) => string, indent = '    '): string =>
  Array.from({ length: n }, (_, i) => indent + fn(i)).join('\n');

/** Deterministic star list, so the snippet text is identical on every load. */
function starShadows(count: number, size: number, seed: number): string {
  let s = seed;
  const next = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => {
    const x = Math.round(next() * size - size / 2);
    const y = Math.round(next() * size - size / 2);
    return `${x}em ${y}em 0 ${next() > 0.5 ? 1 : 0.5}em #fff`;
  })
    .reduce<string[]>((rows, shadow, i) => {
      if (i % 4 === 0) rows.push('    ' + shadow);
      else rows[rows.length - 1] += ', ' + shadow;
      return rows;
    }, [])
    .join(',\n');
}

// Nine characters, not the twenty-four this once had or the thirteen after that: the ring is as
// wide as the band allows, so the fewer characters share it out, the bigger each one is. At
// twenty-four they stood 11vmin tall, at thirteen 25vmin, both under the 40vmin floor.
const RING_TEXT = 'CSS 3D • ';

export const snippets2: Record<string, Snippet> = {
  pyramid: {
    how: [
      "Each side is a rectangle cut into a triangle with <code>clip-path: polygon(50% 0, 0 100%, 100% 100%)</code>.",
      "Like a cube face: <code>rotateY(n × 90deg) translateZ(base / 2)</code> puts it on one side of the floor.",
      "Then <code>rotateX</code> with <code>transform-origin: bottom</code> leans it inward. The angle that makes all four tips meet is <code>asin((base / 2) / slant)</code>: 30° when base and slant height are equal.",
      "The faces are <b>see-through</b> (colours with transparency), so the far faces and the glowing core inside show through. The core spins back against the pyramid (<code>rotateY(-360deg)</code> on the same timing), so it always faces you and stays round.",
      "Every length is a multiple of one base unit, <code>--u</code>, so the pyramid is the same share of a gallery card, the editor and a recording canvas. The base is 140 of those units.",
    ],
    html: `<div class="scene">
  <div class="pyramid">
    <i></i><i></i><i></i><i></i>
    <b></b>
    <u></u>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the pyramid is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.36vmin;
  perspective: calc(800 * var(--u));
}

.pyramid {
  --base: calc(140 * var(--u));
  position: relative;
  width: var(--base);
  height: var(--base);        /* slant height = base → lean is exactly 30deg */
  transform-style: preserve-3d;
  animation: pyramid-spin 12s linear infinite;
}

/* glass faces: see-through, so the far faces and the core show through */
.pyramid i {
  --c: #2ee6d6;
  position: absolute;
  inset: 0;
  clip-path: polygon(50% 0, 0 100%, 100% 100%);
  transform-origin: bottom center;
  background:
    linear-gradient(90deg, transparent 44%, rgb(255 255 255 / 0.18) 50%, transparent 56%),
    linear-gradient(color-mix(in srgb, var(--c) 78%, transparent), rgb(139 108 255 / 0.22));
}

.pyramid i:nth-child(even) {
  --c: #ff4d9d;
}

.pyramid i:nth-child(1) { transform: rotateY(0deg)   translateZ(calc(var(--base) / 2)) rotateX(30deg); }
.pyramid i:nth-child(2) { transform: rotateY(90deg)  translateZ(calc(var(--base) / 2)) rotateX(30deg); }
.pyramid i:nth-child(3) { transform: rotateY(180deg) translateZ(calc(var(--base) / 2)) rotateX(30deg); }
.pyramid i:nth-child(4) { transform: rotateY(270deg) translateZ(calc(var(--base) / 2)) rotateX(30deg); }

/* floor: dark glass with a glowing rim. The rim is an inset line plus a soft shade, not a
   border: the floor is seen nearly side-on, and a 1px border squeezed that flat breaks into dashes */
.pyramid b {
  position: absolute;
  inset: auto 0 0;
  height: var(--base);
  background: rgb(139 108 255 / 0.3);
  box-shadow:
    inset 0 0 0 calc(1.5 * var(--u)) rgb(46 230 214 / 0.7),
    inset 0 0 calc(6 * var(--u)) rgb(46 230 214 / 0.7),
    0 0 calc(34 * var(--u)) rgb(139 108 255 / 0.6);
  transform: translateY(50%) rotateX(90deg);
}

/* the core: a third of the way up (the pyramid stands base × cos 30deg ≈ 121 units tall). It
   turns back against the spin, so it always faces you and stays round. */
.pyramid u {
  position: absolute;
  top: calc(101 * var(--u));
  left: 50%;
  width: calc(36 * var(--u));
  height: calc(36 * var(--u));
  margin: calc(-18 * var(--u)) 0 0 calc(-18 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 18%, #ffb547 42%, transparent 72%);
  animation: face-you 12s linear infinite, pulse 2.4s ease-in-out infinite alternate;
}

@keyframes pyramid-spin {
  from { transform: translateY(calc(-20 * var(--u))) rotateX(-16deg) rotateY(0deg); }
  to   { transform: translateY(calc(-20 * var(--u))) rotateX(-16deg) rotateY(360deg); }
}

@keyframes face-you {
  from { transform: rotateY(0deg); }
  to   { transform: rotateY(-360deg); }
}

@keyframes pulse {
  from { opacity: 0.75; scale: 0.85; }
  to   { opacity: 1; scale: 1.15; }
}`,
  },

  cylinder: {
    how: [
      "There are no curved surfaces in CSS 3D, so approximate: 24 flat strips arranged in a circle.",
      "Every length is a multiple of one base unit, <code>--u</code>, so the tube is the same share of a gallery card, the editor and a recording canvas. The numbers below are those units.",
      "Strip width for a closed ring is <code>2 × r × tan(180° / n)</code>. For r = 80 and n = 24 that is ≈ 21; add 1 so no seams show.",
      "Placement is the carousel trick: <code>rotateY(i × 15deg) translateZ(r)</code>. Semi-transparent strips let the far side show through, which is what makes it read as glass.",
      "The rings of light are circles laid flat with <code>rotateX(90deg)</code>. They rise by animating <code>translate</code>, which is applied before <code>transform</code>, so \"up\" is the tube's own vertical.",
    ],
    html: `<div class="scene">
  <div class="cylinder">
${lines(24, (i) => `<i style="--i:${i}"></i>`)}
    <b></b><s></s>
    <u></u><u></u><u></u>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the tube is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.24vmin;
  perspective: calc(800 * var(--u));
}

.cylinder {
  --r: calc(80 * var(--u));
  --h: calc(180 * var(--u));
  position: relative;
  width: calc(22 * var(--u));  /* 2 × 80 × tan(7.5deg) + 1 */
  height: var(--h);
  transform-style: preserve-3d;
  animation: cylinder-spin 14s linear infinite;
}

/* see-through strips: the far side of the tube shows through the near one */
.cylinder i {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgb(255 255 255 / 0.55) 0 calc(2 * var(--u)), transparent calc(2 * var(--u)) calc(100% - 2 * var(--u)), rgb(255 255 255 / 0.4) calc(100% - 2 * var(--u))),
    linear-gradient(hsl(calc(170 + var(--i) * 6) 85% 62% / 0.5), hsl(calc(250 + var(--i) * 3) 80% 58% / 0.14));
  transform: rotateY(calc(var(--i) * 15deg)) translateZ(var(--r));
}

/* lid (b) and floor (s): glass discs laid flat */
.cylinder b,
.cylinder s {
  position: absolute;
  left: calc(50% - var(--r));
  width: calc(var(--r) * 2);
  height: calc(var(--r) * 2);
  box-sizing: border-box;
  border: calc(1 * var(--u)) solid rgb(255 255 255 / 0.4);
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 255 255 / 0.16), rgb(139 108 255 / 0.22) 70%);
  transform: rotateX(90deg);
}

.cylinder b { top: calc(var(--r) * -1); }

.cylinder s {
  top: calc(var(--h) - var(--r));
  box-shadow: 0 0 calc(40 * var(--u)) rgb(46 230 214 / 0.55);
}

/* rings of light rising through the tube. \`translate\` moves them up the tube's own vertical,
   before the rotateX that lays them flat. */
.cylinder u {
  position: absolute;
  top: calc(var(--h) - var(--r) + 8 * var(--u));
  left: calc(50% - var(--r) + 8 * var(--u));
  width: calc(var(--r) * 2 - 16 * var(--u));
  height: calc(var(--r) * 2 - 16 * var(--u));
  box-sizing: border-box;
  border: calc(2 * var(--u)) solid #2ee6d6;
  border-radius: 50%;
  box-shadow: 0 0 calc(14 * var(--u)) #2ee6d6, inset 0 0 calc(14 * var(--u)) #2ee6d6;
  opacity: 0;
  transform: rotateX(90deg);
  animation: rise 3.6s linear infinite;
}

.cylinder u:nth-of-type(2) { animation-delay: -1.2s; }
.cylinder u:nth-of-type(3) { animation-delay: -2.4s; }

@keyframes cylinder-spin {
  from { transform: rotateX(-20deg) rotateY(0deg); }
  to   { transform: rotateX(-20deg) rotateY(360deg); }
}

@keyframes rise {
  0%       { opacity: 0; translate: 0 calc(-4 * var(--u)); }
  15%, 80% { opacity: 1; }
  100%     { opacity: 0; translate: 0 calc(var(--h) * -1 + 12 * var(--u)); }
}`,
  },

  coin: {
    how: [
      'Every length is a multiple of one base unit, <code>--u</code>, so the coin is the same share of a gallery card, the editor and a recording canvas. The numbers below are those units.',
      'Front and back are two discs pushed apart with <code>translateZ(±5)</code>; the back one is pre-flipped with <code>rotateY(180deg)</code>.',
      '<code>backface-visibility: hidden</code> stops you seeing the front face through the back.',
      'A flat disc has no edge, so seven plain discs are stacked between the faces. Edge-on, they merge into a solid rim.',
      'Spin the parent. That is all.',
    ],
    html: `<div class="scene">
  <div class="coin">
    <b>$</b>
${lines(7, (i) => `<i style="--i:${i}"></i>`)}
    <b>★</b>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the coin is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.39vmin;
  perspective: calc(800 * var(--u));
}

.coin {
  position: relative;
  width: calc(150 * var(--u));
  height: calc(150 * var(--u));
  transform-style: preserve-3d;
  animation: coin-spin 4s linear infinite;
}

.coin b,
.coin i {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

/* the rim: 7 discs spread from -4.2 to +4.2 */
.coin i {
  background: #a8741a;
  transform: translateZ(calc((var(--i) - 3) * 1.4 * var(--u)));
}

.coin b {
  display: grid;
  place-items: center;
  border: calc(6 * var(--u)) solid #e2a93b;
  background: radial-gradient(circle at 35% 30%, #fff1b8, #f1b93d 55%, #c98a1b);
  color: #8a5a0c;
  font: 900 calc(72 * var(--u)) system-ui;
  backface-visibility: hidden;
  transform: translateZ(calc(5 * var(--u)));
}

.coin b:last-child {
  transform: rotateY(180deg) translateZ(calc(5 * var(--u)));
}

@keyframes coin-spin {
  from { transform: rotateX(12deg) rotateY(0deg); }
  to   { transform: rotateX(12deg) rotateY(360deg); }
}`,
  },

  globe: {
    how: [
      'A circle is a square with <code>border-radius: 50%</code> and only an edge line. The line is an inset <code>box-shadow</code> with a soft glow, not a border: a ring turned nearly side-on is squeezed to a pixel or two, and a hard 1.5px border breaks into dots there.',
      'Nine of them, rotated <code>i × 20deg</code> around Y, form the meridians. 9 × 20° = 180° is enough because each ring is visible on both sides.',
      'One more ring laid flat with <code>rotateX(90deg)</code> is the equator.',
      'A static <code>rotateZ</code> before the animated <code>rotateY</code> gives the tilted-axis look.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the globe is the same share of a gallery card, the editor and a recording canvas. The sphere is 200 of those units across, and the camera sits 800 back — close enough that the near side is magnified, which is what the base unit has to leave room for.',
    ],
    html: `<div class="scene">
  <div class="globe">
${lines(9, (i) => `<i style="--i:${i}"></i>`)}
    <b></b>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the globe is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.29vmin;
  perspective: calc(800 * var(--u));
}

.globe {
  position: relative;
  width: calc(200 * var(--u));
  height: calc(200 * var(--u));
  transform-style: preserve-3d;
  animation: globe-spin 14s linear infinite;
}

/* the line is an inset shadow with a soft glow, not a border: a ring nearly side-on is squeezed
   to a pixel or two, and a hard border breaks into dots there. The glow keeps it whole. */
.globe i,
.globe b {
  --c: #2ee6d6;
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 calc(1.5 * var(--u)) var(--c),
    inset 0 0 calc(2 * var(--u)) calc(1.5 * var(--u)) color-mix(in srgb, var(--c) 40%, transparent),
    0 0 calc(2 * var(--u)) color-mix(in srgb, var(--c) 50%, transparent);
}

.globe i { transform: rotateY(calc(var(--i) * 20deg)); }   /* meridians */
.globe b { transform: rotateX(90deg); --c: #ff4d9d; }       /* equator */

@keyframes globe-spin {
  from { transform: rotateZ(18deg) rotateX(-14deg) rotateY(0deg); }
  to   { transform: rotateZ(18deg) rotateX(-14deg) rotateY(360deg); }
}`,
  },

  gyro: {
    how: [
      'Three rings, <b>nested</b>. Each spins around one axis only.',
      'Because a child lives inside its parent’s coordinate space, the rotations stack up into complex motion from trivially simple keyframes.',
      'Every level needs <code>transform-style: preserve-3d</code> or the chain flattens there.',
      'Unequal durations keep the pattern from visibly repeating.',
      'The outer ring is 220 units of one base unit, <code>--u</code>, tied to the canvas, and each ring inside is 84% of the one around it, so the whole gyroscope is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="gyro">
    <div>
      <div>
        <b></b>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the gyroscope is the same share of
     a gallery card, the editor, a full screen and a recording canvas */
  --u: 0.24vmin;
  perspective: calc(800 * var(--u));
}

.gyro,
.gyro div {
  display: grid;
  place-items: center;
  border: calc(4 * var(--u)) solid #8b6cff;
  border-radius: 50%;
  transform-style: preserve-3d;
}

.gyro {
  width: calc(220 * var(--u));
  height: calc(220 * var(--u));
  animation: gyro-x 6s linear infinite;
}

.gyro div {
  width: 84%;
  height: 84%;
}

.gyro > div {
  border-color: #2ee6d6;
  animation: gyro-y 4s linear infinite;
}

.gyro > div > div {
  border-color: #ff4d9d;
  animation: gyro-x 2.6s linear infinite reverse;
}

.gyro b {
  width: 34%;
  height: 34%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff, #ffb547 60%);
  box-shadow: 0 0 calc(22 * var(--u)) #ffb547;
}

@keyframes gyro-x { to { transform: rotateX(360deg); } }
@keyframes gyro-y { to { transform: rotateY(360deg); } }`,
  },

  flipper: {
    how: [
      'One element, no wrapper: the <code>perspective()</code> <b>function</b> goes inside the transform itself.',
      'It must come <b>first</b> in the transform list, and must be repeated in every keyframe.',
      'Step 1 flips on X, step 2 flips on Y while X stays at −180°.',
      'Use this form when you cannot add a parent just to hold <code>perspective</code>.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas — the <code>perspective()</code> distance too, 260 units — so the square and the depth of its flip are the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="loader"></div>`,
    css: `.loader {
  /* one base unit: every length below is a multiple of it, so the loader is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.46vmin;
  width: calc(90 * var(--u));
  height: calc(90 * var(--u));
  border-radius: calc(12 * var(--u));
  background: linear-gradient(135deg, #2ee6d6, #8b6cff);
  box-shadow: 0 0 calc(30 * var(--u)) rgb(139 108 255 / 0.6);
  animation: flip 1.8s ease-in-out infinite;
}

/* the perspective() function scales with the loader too, so the flip keeps its depth */
@keyframes flip {
  0%   { transform: perspective(calc(260 * var(--u))) rotateX(0deg)    rotateY(0deg); }
  50%  { transform: perspective(calc(260 * var(--u))) rotateX(-180deg) rotateY(0deg); }
  100% { transform: perspective(calc(260 * var(--u))) rotateX(-180deg) rotateY(-180deg); }
}`,
  },

  tunnel: {
    how: [
      'Ten identical frames, stacked in the centre, all running the same animation: from 1400 units behind the screen (<code>translateZ</code> −1400) to 200 units in front of it.',
      'Perspective is 320 units. A frame at z = 200 is already magnified 2.7× and off-screen, so stop there and fade out. Never animate all the way to z = perspective: the scale there is infinite and the browser stalls rasterising it.',
      'A negative <code>animation-delay</code> of <code>i × (duration / count)</code> spreads them evenly along the tunnel.',
      'Fading in from 0 opacity hides the moment a frame pops into existence far away.',
      'The tunnel is <code>inset: 0</code>, so it fills the canvas edge to edge. Its lengths are multiples of one base unit, <code>--u</code>, tied to the canvas, so a frame is the same share of a gallery card and of a full screen.',
    ],
    html: `<div class="tunnel">
${lines(10, (i) => `<i style="--i:${i}"></i>`, '  ')}
</div>`,
    css: `.tunnel {
  /* one base unit, tied to the canvas; the tunnel itself fills the canvas edge to edge */
  --u: 0.33vmin;
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  perspective: calc(320 * var(--u));
  background: radial-gradient(circle, #1b0f3a, #05030d 70%);
}

.tunnel i {
  position: absolute;
  width: calc(260 * var(--u));
  height: calc(260 * var(--u));
  border: calc(3 * var(--u)) solid hsl(calc(260 + var(--i) * 14) 90% 65%);
  border-radius: calc(18 * var(--u));
  box-shadow: 0 0 calc(18 * var(--u)) hsl(calc(260 + var(--i) * 14) 90% 65% / 0.7);
  animation: fly 4s linear infinite;
  animation-delay: calc(var(--i) * -0.4s);   /* 4s / 10 frames */
}

/* stop well before z = perspective (320 units): the scale there is infinite */
@keyframes fly {
  from     { opacity: 0; transform: translateZ(calc(-1400 * var(--u))) rotateZ(0deg); }
  25%, 85% { opacity: 1; }
  to       { opacity: 0; transform: translateZ(calc(200 * var(--u))) rotateZ(90deg); }
}`,
  },

  starfield: {
    how: [
      'Hundreds of DOM nodes would be wasteful. Instead each layer is <b>one</b> element a single unit square, and every star is a <code>box-shadow</code> of it.',
      'A box-shadow with zero blur and a spread radius is just a dot at an offset — and you can have as many as you like.',
      'Flying the single element along Z moves all its stars at once, with correct perspective.',
      'Three layers on staggered delays hide the loop. In Sass the list comes from <code>random()</code> at build time (see the SCSS tab); here it is written out.',
      'The field is <code>inset: 0</code>, so it fills the canvas edge to edge. Its lengths are multiples of one base unit, <code>--u</code>, tied to the canvas. Each layer sets <code>font-size: var(--u)</code>, so its star offsets are written in <code>em</code>: one em is one unit, and the list stays short enough to read.',
    ],
    html: `<div class="space">
  <i></i><i></i><i></i>
</div>`,
    css: `.space {
  /* one base unit, tied to the canvas; the field itself fills the canvas edge to edge */
  --u: 0.33vmin;
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  perspective: calc(300 * var(--u));
  background: radial-gradient(circle, #0d1030, #02030a 75%);
}

.space i {
  position: absolute;
  width: 1em;
  height: 1em;
  font-size: var(--u);   /* 1em is one unit, so the star list below is in units */
  border-radius: 50%;
  animation: warp 3s linear infinite;
  box-shadow:
${starShadows(40, 900, 7)};
}

.space i:nth-child(2) {
  animation-delay: -1s;
  box-shadow:
${starShadows(40, 900, 99)};
}

.space i:nth-child(3) {
  animation-delay: -2s;
  box-shadow:
${starShadows(40, 900, 2024)};
}

/* stop at 2/3 of the perspective distance; at z = perspective the scale is infinite */
@keyframes warp {
  from     { opacity: 0; transform: translateZ(calc(-600 * var(--u))); }
  20%, 80% { opacity: 1; }
  to       { opacity: 0; transform: translateZ(calc(200 * var(--u))); }
}`,
  },

  waveletters: {
    how: [
      'Wrap every letter in a <code>&lt;span&gt;</code> with <code>display: inline-block</code> — transforms are ignored on plain inline boxes.',
      'All letters share one keyframe animation: lift toward the camera while flipping 360°.',
      '<code>animation-delay: calc(var(--i) * 0.12s)</code> offsets each letter, and the offsets read as a travelling wave.',
      'Put the real word in <code>aria-label</code> and hide the spans from screen readers, or it is read letter by letter.',
      '<code>--i</code> carries on across the line break, so the wave rolls off the end of one line and into the start of the next.',
      'Every length is a multiple of one base unit, <code>--u</code>, the lift toward the camera included, so the word is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <h1 class="wave" aria-label="WAVE 3D">
    <span class="line">
${[...'WAVE'].map((c, i) => `      <span style="--i:${i}" aria-hidden="true">${c}</span>`).join('\n')}
    </span>
    <span class="line">
${[...'3D'].map((c, i) => `      <span style="--i:${i + 4}" aria-hidden="true">${c}</span>`).join('\n')}
    </span>
  </h1>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the word is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.41vmin;
  perspective: calc(600 * var(--u));
}

/* Two lines, because seven letters in a row are four times wider than they are tall: sized to
   the 92vmin width limit the word would stand 26vmin high, well under the 40vmin floor. Stacked,
   the wave rolls through WAVE and on into 3D. */
.wave {
  display: grid;
  justify-items: center;
  gap: calc(6 * var(--u));
  margin: 0;
  font: 900 calc(64 * var(--u))/1 system-ui;
  transform-style: preserve-3d;
}

.wave .line {
  display: flex;
  gap: calc(2 * var(--u));
  transform-style: preserve-3d;
}

.wave .line span {
  display: inline-block;
  color: hsl(calc(255 + var(--i) * 18) 90% 70%);
  animation: wave 2.8s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.12s);
}

@keyframes wave {
  0%        { transform: translateZ(0)                 rotateY(0deg); }
  22%       { transform: translateZ(calc(60 * var(--u))) rotateY(180deg); }
  45%, 100% { transform: translateZ(0)                 rotateY(360deg); }
}`,
  },

  textring: {
    how: [
      'One <code>&lt;span&gt;</code> per character, all stacked in the same spot.',
      'Each gets <code>rotateY(i × 360° / count) translateZ(radius)</code> — the carousel formula again.',
      '<code>backface-visibility: hidden</code> hides the far side, where letters would otherwise show mirrored.',
      'A monospace font keeps the spacing even. Pick the radius so that <code>2πr ≈ count × character width</code>.',
      'Every length is a multiple of one base unit, <code>--u</code>: the radius is 52 of them, a character cell 36 × 64, so the ring is the same share of a gallery card, the editor and a recording canvas.',
      'The ring is as wide as it is allowed to be, so the number of characters decides how big each one is. Nine of them, <code>CSS 3D •</code>, are big enough to read on a gallery card; the thirteen and the twenty-four it had before were not.',
      'The tilt is the other half of the height. At <code>rotateX(-28deg)</code> you look down on the ring, so the letter in front drops well below the ones at the sides and the word curves round instead of running across.',
      'The letters stand on a rim: a <code>::after</code> circle of the same radius, laid flat with <code>rotateX(90deg)</code>. The letters only show their near half, but the rim shows all of it, so the back of the ring is still there to see.',
      'What is drawn sits low — the near half of the letters and the front of the rim both drop below the middle — so <code>translateY</code> lifts the ring by part of that, which puts it back in the middle of the box. The spin starts at <code>-40deg</code>, so a paused ring faces you with CSS.',
    ],
    html: `<div class="scene">
  <div class="ring" style="--n:${RING_TEXT.length}" aria-label="${RING_TEXT.trim()}">
${[...RING_TEXT].map((c, i) => `    <span style="--i:${i}" aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`).join('\n')}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the ring is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.82vmin;
  perspective: calc(800 * var(--u));
}

/* 52 units of radius against a 36-unit character cell: 2πr is a little more than the nine
   characters need, so the band of text closes without the letters touching */
.ring {
  --r: calc(52 * var(--u));
  position: relative;
  width: calc(36 * var(--u));
  height: calc(64 * var(--u));
  font: 800 calc(52 * var(--u))/calc(64 * var(--u)) ui-monospace, monospace;
  transform-style: preserve-3d;
  animation: ring-spin 12s linear infinite;
}

.ring span {
  position: absolute;
  inset: 0;
  text-align: center;
  color: #2ee6d6;
  backface-visibility: hidden;
  transform: rotateY(calc(var(--i) * 360deg / var(--n))) translateZ(var(--r));
}

/* the rim the letters stand on: a flat circle of the same radius, laid down with
   rotateX(90deg) and centred on their feet. Unlike the letters it shows all the way round, so the
   far half of the ring is still there to see */
.ring::after {
  content: '';
  position: absolute;
  top: calc(100% - 52 * var(--u) - 14 * var(--u));
  left: calc(50% - var(--r));
  width: calc(2 * var(--r));
  height: calc(2 * var(--r));
  box-sizing: border-box;
  border: calc(1.5 * var(--u)) solid color-mix(in srgb, #2ee6d6 45%, transparent);
  border-radius: 50%;
  transform: rotateX(90deg);
}

/* The tilt is what lets you see the rim as a ring rather than a line, and it drops the letter in
   front below the ones at the sides, so the word reads as going round. The lift puts what is
   drawn back in the middle; starting at -40deg puts CSS, not the bullet, in front of a paused
   ring. */
@keyframes ring-spin {
  from { transform: translateY(calc(-14 * var(--u))) rotateX(-28deg) rotateY(-40deg); }
  to   { transform: translateY(calc(-14 * var(--u))) rotateX(-28deg) rotateY(-400deg); }
}`,
  },

  layertext: {
    how: [
      'The shadow-stack text is a 2D trick: its "depth" always points the same way. This version has real depth.',
      'Ten copies of the words are stacked with <code>position: absolute</code> and pushed back <code>3 units × i</code> along Z.',
      'The words are two lines, GO over DEEP, and every copy carries the same <code>&lt;br&gt;</code>, so the copies line up and the wall runs down both lines. DEEP alone is nearly three times wider than it is tall, and at the width limit it stood under the 40vmin floor.',
      'Each copy is darker than the one in front of it, which shades the side wall.',
      'Rotate the parent and the side wall appears on the correct side, with true perspective. Cost: more DOM, and the copies need <code>aria-hidden</code>.',
      'The unit is <code>--u</code>, one number on the root that every length here is a multiple of, so the wall is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <h1 class="deep">
    <b>GO<br>DEEP</b>
${lines(10, (i) => `<span style="--i:${i + 1}" aria-hidden="true">GO<br>DEEP</span>`)}
  </h1>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the words are the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.37vmin;
  perspective: calc(800 * var(--u));
}

/* Two lines, because DEEP on its own is nearly three times wider than it is tall: sized to the
   92vmin width limit it stood 28vmin high, under the 40vmin floor. A kicker over the word is what
   a headline does anyway, and every copy carries the same two lines, so the wall runs down both. */
.deep {
  position: relative;
  margin: 0;
  font: 900 calc(90 * var(--u))/0.92 system-ui;
  text-align: center;
  transform-style: preserve-3d;
  animation: deep-rock 5s ease-in-out infinite alternate;
}

.deep b {
  position: relative;
  color: #fff;
}

.deep span {
  position: absolute;
  inset: 0;
  color: color-mix(in srgb, #ff4d9d calc(100% - var(--i) * 7%), #000);
  transform: translateZ(calc(var(--i) * -3 * var(--u)));
}

@keyframes deep-rock {
  from { transform: rotateY(-38deg) rotateX(10deg); }
  to   { transform: rotateY(38deg)  rotateX(-8deg); }
}`,
  },

  sign: {
    how: [
      'A pendulum is a rotation around the point it hangs from: <code>transform-origin: top center</code>.',
      'Animate <code>rotateX</code> from −32° to +32° with <code>animation-direction: alternate</code>.',
      '<code>ease-in-out</code> is what makes it physical — slow at the ends of the swing, fast through the middle.',
      'A constant <code>rotateY</code> in both keyframes turns the sign slightly so you can see the swing.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the sign is 220 × 190 units, so it is the same share of a gallery card, the editor and a recording canvas, and its swing toward you still stays inside the frame.',
    ],
    html: `<div class="scene">
  <div class="sign">
    <div class="board">OPEN</div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the sign is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.3vmin;
  display: grid;
  place-items: center;
  perspective: calc(800 * var(--u));
}

.sign {
  position: relative;
  width: calc(220 * var(--u));
  height: calc(190 * var(--u));
  transform-origin: top center;
  animation: swing 2.2s ease-in-out infinite alternate;
}

/* rail + two cords */
.sign::before {
  content: '';
  position: absolute;
  inset: 0 calc(16 * var(--u)) auto;
  height: calc(80 * var(--u));
  border: solid #949bc0;
  border-width: calc(4 * var(--u)) calc(2 * var(--u)) 0;
}

.board {
  position: absolute;
  inset: calc(80 * var(--u)) 0 0;
  display: grid;
  place-items: center;
  border: calc(3 * var(--u)) solid #ffb547;
  border-radius: calc(12 * var(--u));
  background: #1b1408;
  color: #ffb547;
  font: 900 calc(45 * var(--u)) system-ui;
  letter-spacing: 0.12em;
  text-shadow: 0 0 calc(14 * var(--u)) #ffb547;
  box-shadow: 0 0 calc(24 * var(--u)) rgb(255 181 71 / 0.45);
}

@keyframes swing {
  from { transform: rotateY(-18deg) rotateX(-32deg); }
  to   { transform: rotateY(-18deg) rotateX(32deg); }
}`,
  },

  laptop: {
    how: [
      'First make a floor: <code>rotateX(64deg) rotateZ(28deg)</code> on the base. Everything inside now lives on that tilted plane.',
      'The lid has the same footprint and lies flat on the base when closed. <code>transform-origin: top</code> puts the hinge on the back edge.',
      'A single element has one look from both sides, so the lid is two pseudo-elements: shell on the front, screen pre-flipped with <code>rotateY(180deg)</code>, both <code>backface-visibility: hidden</code>.',
      'Open past vertical (104°) and the screen side turns toward the camera.',
      'The loop <b>starts open</b> and closes, then opens again. A paused card holds the first frame, and an open laptop is the pose that reads as a laptop; shut, it is a slab low in the frame.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the base is 220 × 145 units, so the laptop is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="laptop">
    <div class="lid"></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the laptop is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.27vmin;
  perspective: calc(900 * var(--u));
}

.laptop {
  position: relative;
  width: calc(220 * var(--u));
  height: calc(145 * var(--u));
  border-radius: calc(10 * var(--u));
  background: linear-gradient(#c9cede, #9aa1b8);
  transform-style: preserve-3d;
  /* the lid stands up out of the top of the base, so the base sits below the middle and the
     laptop plus its open lid is what ends up centred, not the shut base on its own */
  transform: translateY(calc(62 * var(--u))) rotateX(64deg) rotateZ(28deg);
}

.lid {
  position: absolute;
  inset: 0;
  transform-origin: top center;
  transform-style: preserve-3d;
  animation: open 3.6s ease-in-out infinite alternate;
}

.lid::before,
.lid::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: calc(10 * var(--u));
  backface-visibility: hidden;
}

/* outer shell */
.lid::before {
  background: linear-gradient(#b9bfd2, #8e95ad);
  transform: translateZ(calc(1 * var(--u)));
}

/* screen — the other side */
.lid::after {
  border: calc(7 * var(--u)) solid #14161f;
  background: linear-gradient(135deg, #8b6cff, #2ee6d6);
  box-shadow: 0 0 calc(30 * var(--u)) #8b6cff;
  transform: rotateY(180deg);
}

/* open first: a paused card holds the pose at 0%, and an open laptop is the one that reads as a
   laptop and as the trick this model is about. Shut, it is a slab low in the frame. */
@keyframes open {
  0%, 12%   { transform: rotateX(104deg); }
  85%, 100% { transform: rotateX(0deg); }
}`,
  },

  cardfan: {
    how: [
      'All five cards sit exactly on top of each other.',
      '<code>transform-origin: 50% 150%</code> moves the pivot below the card, so <code>rotateZ</code> swings it along an arc instead of spinning it in place.',
      'The index runs −2…2, so <code>rotateZ(calc(var(--i) * 16deg))</code> fans symmetrically around an upright middle card.',
      'A few units of <code>translateZ</code> per card gives each its own depth, which avoids flicker where they overlap.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the hand is the same share of a gallery card, the editor and a recording canvas.',
      'How far below the card the pivot sits is what decides the width: the further down, the flatter the arc and the wider the spread. At 170% the open hand was a third wider than the canvas, so the pivot came up to 150% and the same 16° fans into an arc the band can hold. The outer cards also swing downward, so the hand is lifted 23 units with <code>translateY</code> and the open hand and the closed one share the miss rather than one of them being centred and the other not.',
    ],
    html: `<div class="scene">
  <div class="hand">
    <i style="--i:-2">A<small>♠</small></i>
    <i style="--i:-1">K<small>♠</small></i>
    <i style="--i:0">Q<small>♠</small></i>
    <i style="--i:1">J<small>♠</small></i>
    <i style="--i:2">10<small>♠</small></i>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the hand is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.26vmin;
  display: grid;
  place-items: center;
  perspective: calc(800 * var(--u));
}

.hand {
  position: relative;
  width: calc(110 * var(--u));
  height: calc(156 * var(--u));
  transform-style: preserve-3d;
  /* the outer cards swing down as well as out, and their shadows hang lower still: the lift
     splits the difference between the closed hand and the open one, so neither sits off centre */
  transform: translateY(calc(-23 * var(--u))) rotateX(26deg);
}

.hand i {
  position: absolute;
  inset: 0;
  padding: calc(8 * var(--u)) calc(12 * var(--u));
  border-radius: calc(10 * var(--u));
  background: linear-gradient(160deg, #fff, #d9dcec);
  color: #14172b;
  font: 800 calc(26 * var(--u))/1 system-ui;
  box-shadow: 0 calc(8 * var(--u)) calc(16 * var(--u)) calc(-8 * var(--u)) #000;
  /* the pivot is half a card below the bottom edge. Further down flattens the arc and throws
     the outer cards wider — at 170% the open hand ran off the sides of the canvas. */
  transform-origin: 50% 150%;
  animation: fan 3s ease-in-out infinite alternate;
}

.hand small { display: block; font-size: calc(19 * var(--u)); }

@keyframes fan {
  0%, 15%   { transform: translateZ(calc(var(--i) * 1 * var(--u))) rotateZ(0deg); }
  85%, 100% { transform: translateZ(calc(var(--i) * 6 * var(--u))) rotateZ(calc(var(--i) * 16deg)); }
}`,
  },

  door: {
    how: [
      'The frame holds the <code>perspective</code>; the leaf rotates with <code>transform-origin: left</code> (the hinges).',
      '<code>perspective-origin: 120% 50%</code> moves the camera to the right of the frame, so the open door does not collapse into a thin line.',
      'The "light" is simply the frame’s background, revealed as the leaf swings away.',
      '<code>tabindex="0"</code> plus <code>:focus</code> makes it work by tap and by keyboard.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the frame is 150 × 250 units, so the door is the same share of a gallery card, the editor and a recording canvas. The leaf swings out to the left, so the scene is padded on that side and the door plus its swing is what sits in the middle.',
    ],
    html: `<div class="scene">
  <div class="door" tabindex="0">
    <div class="leaf"><i></i></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the door is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.21vmin;
  display: grid;
  place-items: center;
  /* the leaf swings out to the left, so the frame sits right of the middle and the door plus
     its swing is what ends up centred, not the shut frame on its own */
  padding-left: calc(72 * var(--u));
}

.door {
  position: relative;
  width: calc(150 * var(--u));
  height: calc(250 * var(--u));
  border: calc(8 * var(--u)) solid #3a2a1c;
  border-bottom: 0;
  background: radial-gradient(ellipse at 50% 70%, #fff6c9, #ffb547 55%, #7a4a12);
  perspective: calc(700 * var(--u));
  perspective-origin: 120% 50%;
  cursor: pointer;
}

.leaf {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #8a5a33, #6d4424);
  transform-origin: left center;
  transition: transform 0.9s cubic-bezier(0.3, 1.2, 0.5, 1);
}

.door:hover .leaf,
.door:focus .leaf {
  transform: rotateY(-105deg);
}

/* knob */
.leaf i {
  position: absolute;
  top: 50%;
  right: calc(12 * var(--u));
  width: calc(14 * var(--u));
  height: calc(14 * var(--u));
  border-radius: 50%;
  background: #ffd36b;
}`,
  },

  explode: {
    how: [
      'Every face uses <code>translateZ(var(--d))</code> instead of a fixed half-side distance.',
      'Hovering the wrapper changes <code>--d</code> — one declaration moves all six faces.',
      'Because each face has a <code>transition</code> on <code>transform</code>, the change animates even though only a custom property was touched.',
      'Hover is detected on a larger, non-rotating wrapper so the target does not spin out from under the pointer.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the side is 110 units, so <code>--d</code> rests at 55 and hover pushes it to 115. The cube, and how far it flies apart, are the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene" tabindex="0">
  <div class="cube">
    <div></div><div></div><div></div>
    <div></div><div></div><div></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the cube is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.23vmin;
  --s: calc(110 * var(--u));
  --d: calc(var(--s) / 2);     /* distance of each face from the centre */
  display: grid;
  place-items: center;
  /* a hit area wider than the cube, so the pointer does not fall off it between the faces */
  width: calc(300 * var(--u));
  height: calc(300 * var(--u));
  perspective: calc(800 * var(--u));
  cursor: pointer;
}

.scene:hover,
.scene:focus {
  --d: calc(115 * var(--u));
}

.cube {
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  animation: spin 10s linear infinite;
}

.cube > * {
  position: absolute;
  inset: 0;
  border-radius: calc(6 * var(--u));
  background: rgb(255 77 157 / 0.35);
  border: calc(1 * var(--u)) solid rgb(255 77 157 / 0.85);
  transition: transform 0.6s cubic-bezier(0.3, 1.5, 0.5, 1);
}

.cube > :nth-child(1) { transform: rotateY(0deg)   translateZ(var(--d)); }
.cube > :nth-child(2) { transform: rotateY(90deg)  translateZ(var(--d)); }
.cube > :nth-child(3) { transform: rotateY(180deg) translateZ(var(--d)); }
.cube > :nth-child(4) { transform: rotateY(-90deg) translateZ(var(--d)); }
.cube > :nth-child(5) { transform: rotateX(90deg)  translateZ(var(--d)); }
.cube > :nth-child(6) { transform: rotateX(-90deg) translateZ(var(--d)); }

/* The top and bottom are always seen at a slant, squeezed flat, and their edges sit on the
   same spot as the side faces' edges: two lines there step over each other and read as dashes.
   So only the sides draw the edge line. */
.cube > :nth-child(n + 5) { border-color: transparent; }

@keyframes spin {
  from { transform: rotateX(-24deg) rotateY(0deg); }
  to   { transform: rotateX(-24deg) rotateY(360deg); }
}`,
  },

  isotiles: {
    how: [
      'The browser hit-tests in 3D: <code>:hover</code> works on the tile you actually see under the pointer, even on a tilted plane.',
      'The hovered cell itself never moves — only its <code>::before</code> plate lifts. If the hovered element moved, it would slide out from under the pointer and flicker.',
      'The trail effect is two transition speeds. The base rule has a slow 1.4s transition — that one applies when the hover <b>ends</b>.',
      'The <code>:hover</code> rule overrides <code>transition-duration</code> to 0.08s — that one applies when the hover <b>starts</b>.',
      'Result: tiles pop up instantly and sink back slowly.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: a tile is 46 units square and its plate rises 46, so the floor is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="floor">
${lines(5, () => '<i></i><i></i><i></i><i></i><i></i>')}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the floor is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.24vmin;
  perspective: calc(900 * var(--u));
}

.floor {
  display: grid;
  grid-template-columns: repeat(5, calc(46 * var(--u)));
  gap: calc(5 * var(--u));
  transform-style: preserve-3d;
  /* the camera magnifies the near half of the tilted floor, so at rest it draws further below its
     own middle than above; a raised plate at the far corner reaches the other way, up the screen.
     This small lift splits the two, so the floor at rest and the floor with its highest plate up
     are both centred to within a few units */
  transform: translateY(calc(-6 * var(--u))) rotateX(56deg) rotateZ(-45deg);
  /* same plane as its cells: keep the floor itself out of hit-testing, or hover misses in patches */
  pointer-events: none;
}

/* the cell is a fixed hit target; only its ::before plate moves */
.floor i {
  pointer-events: auto;
  position: relative;
  height: calc(46 * var(--u));
  transform-style: preserve-3d;
}

.floor i::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: calc(7 * var(--u));
  background: rgb(139 108 255 / 0.35);
  border: calc(1 * var(--u)) solid rgb(139 108 255 / 0.7);
  pointer-events: none;
  /* slow on the way down */
  transition: transform 1.4s ease-out, background 1.4s ease-out;
}

.floor i:hover::before {
  background: #2ee6d6;
  transform: translateZ(calc(46 * var(--u)));
  /* instant on the way up */
  transition-duration: 0.08s;
}`,
  },

  zones: {
    how: [
      'CSS cannot read pointer coordinates — but it can tell <b>which element</b> is hovered.',
      'Lay a 3 × 3 grid of invisible zones over the area. Each zone knows its row and column.',
      'The card comes <b>after</b> the zones in the markup, so <code>zone:hover ~ .card</code> can set a tilt toward that zone.',
      '<code>pointer-events: none</code> on the card lets the pointer fall through to the zones. More zones = smoother tilt; the JS version is smoother still.',
    ],
    html: `<div class="zones">
  <i></i><i></i><i></i>
  <i></i><i></i><i></i>
  <i></i><i></i><i></i>
  <div class="card">Hover around me</div>
</div>`,
    css: `.zones {
  position: relative;
  display: grid;
  grid-template: repeat(3, 1fr) / repeat(3, 1fr);
  width: 420px;
  height: 300px;
  perspective: 800px;
}

.zones i { z-index: 1; }   /* invisible hover targets, above the card */

.card {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  width: 260px;
  height: 160px;
  margin: auto;
  border-radius: 18px;
  color: #fff;
  font: 800 1.1rem system-ui;
  background: linear-gradient(135deg, #2ee6d6, #8b6cff);
  box-shadow: 0 22px 36px -16px #8b6cff;
  pointer-events: none;
  transition: transform 0.35s ease-out;
}

/* row 1 tilts back, row 3 tilts forward; column 1 turns left, column 3 turns right */
.zones i:nth-child(1):hover ~ .card { transform: rotateX(22deg)  rotateY(-22deg); }
.zones i:nth-child(2):hover ~ .card { transform: rotateX(22deg); }
.zones i:nth-child(3):hover ~ .card { transform: rotateX(22deg)  rotateY(22deg); }
.zones i:nth-child(4):hover ~ .card { transform: rotateY(-22deg); }
.zones i:nth-child(6):hover ~ .card { transform: rotateY(22deg); }
.zones i:nth-child(7):hover ~ .card { transform: rotateX(-22deg) rotateY(-22deg); }
.zones i:nth-child(8):hover ~ .card { transform: rotateX(-22deg); }
.zones i:nth-child(9):hover ~ .card { transform: rotateX(-22deg) rotateY(22deg); }`,
  },

  rollbutton: {
    how: [
      '<b>The hovered element must not be the one that moves.</b> The <code>&lt;button&gt;</code> is a static hit target; the bar inside it rolls and has <code>pointer-events: none</code>. If the button itself rotated, its hit area would turn away from the pointer mid-roll, <code>:hover</code> would drop, and it would snap back and forth.',
      'The bar has two faces: the front, and the bottom (<code>rotateX(-90deg)</code>).',
      'Both are pushed out by half the bar’s height, so together they form two sides of a square prism.',
      'Hover rotates the whole bar <code>rotateX(90deg)</code>, rolling the bottom face up to the front.',
      'The extra <code>translateZ(-h/2)</code> on the bar keeps the front face at z = 0, so the text stays the same size and sharp.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the bar, its type and the depth it rolls through are the same share of a gallery card, the editor and a recording canvas. The numbers below are those units.',
      'The prism is square in section, so halfway through the roll it stands on a corner and sweeps <code>√2 × h</code> tall. That corner, not the resting bar, is what has to fit the band — which is why the bar rests at about 50vmin and touches 70vmin only in passing.',
    ],
    html: `<div class="scene">
  <button class="roll" type="button">
    <span class="bar">
      <span>Hover me</span>
      <span>Let's go →</span>
    </span>
  </button>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the bar is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.32vmin;
  perspective: calc(600 * var(--u));
}

/* the button is the hit target and never moves */
.roll {
  --h: calc(150 * var(--u));
  display: block;
  width: calc(230 * var(--u));
  height: var(--h);
  padding: 0;
  border: 0;
  background: none;
  color: #fff;
  font: 800 calc(24 * var(--u)) system-ui;
  cursor: pointer;
  transform-style: preserve-3d;
}

/* only the bar inside it rolls */
.bar {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--h) / -2));
  transition: transform 0.45s cubic-bezier(0.3, 1.3, 0.5, 1);
}

.roll:hover .bar,
.roll:focus-visible .bar {
  transform: translateZ(calc(var(--h) / -2)) rotateX(90deg);
}

.bar span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: calc(12 * var(--u));
  backface-visibility: hidden;
}

.bar span:first-child {
  background: #8b6cff;
  transform: translateZ(calc(var(--h) / 2));
}

/* hidden at rest, otherwise its edge shows as a thin line under the button */
.bar span:last-child {
  background: #ff4d9d;
  opacity: 0;
  transform: rotateX(-90deg) translateZ(calc(var(--h) / 2));
  transition: opacity 0.1s;
}

.roll:hover .bar span:last-child,
.roll:focus-visible .bar span:last-child {
  opacity: 1;
}`,
  },

  switch: {
    how: [
      'A real <code>&lt;input type="checkbox"&gt;</code> holds the state, so keyboard, forms and screen readers all work.',
      'It is visually hidden (not <code>display: none</code>, which would remove it from the tab order).',
      'The rocker is the next sibling: <code>input:checked + .rocker</code> tips it from <code>rotateX(-22deg)</code> to <code>rotateX(22deg)</code>.',
      'Wrapping everything in a <code>&lt;label&gt;</code> makes the whole switch clickable with zero JavaScript.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas — the rocker, its bezel rings, the gap and the LED — so the switch is the same share of a gallery card, the editor and a recording canvas. The numbers below are those units.',
    ],
    html: `<label class="switch">
  <input type="checkbox">
  <span class="rocker"><b>I</b><b>O</b></span>
  <em></em>
</label>`,
    css: `.switch {
  /* one base unit: every length below is a multiple of it, so the switch is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.34vmin;
  display: grid;
  justify-items: center;
  gap: calc(22 * var(--u));
  perspective: calc(320 * var(--u));
  cursor: pointer;
}

/* hidden but still focusable */
.switch input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.rocker {
  display: grid;
  grid-template-rows: 1fr 1fr;
  width: calc(90 * var(--u));
  height: calc(146 * var(--u));
  border-radius: calc(14 * var(--u));
  background: linear-gradient(#2b3050, #161a30);
  border: calc(1 * var(--u)) solid #4a5280;
  color: #8d95b3;
  font: 700 calc(25.6 * var(--u)) system-ui;
  text-align: center;
  box-shadow: 0 0 0 calc(9 * var(--u)) #05060c, 0 0 0 calc(10 * var(--u)) #4a5280;
  transform: rotateX(-22deg);                       /* OFF */
  transition: transform 0.18s cubic-bezier(0.3, 1.6, 0.5, 1);
}

.rocker b { display: grid; place-items: center; }

input:checked + .rocker {
  transform: rotateX(22deg);                        /* ON */
  color: #2ee6d6;
}

input:focus-visible + .rocker {
  outline: calc(2 * var(--u)) solid #2ee6d6;
  outline-offset: calc(14 * var(--u));
}

/* status LED */
.switch em {
  width: calc(14 * var(--u));
  height: calc(14 * var(--u));
  border-radius: 50%;
  background: #3a3f5c;
  transition: 0.2s;
}

input:checked ~ em {
  background: #2ee6d6;
  box-shadow: 0 0 calc(14 * var(--u)) #2ee6d6;
}`,
  },

  dropdown: {
    how: [
      'Each item starts folded up: <code>rotateX(-90deg)</code> with <code>transform-origin: top</code>, plus <code>opacity: 0</code>.',
      'On <code>:hover</code> / <code>:focus</code> of the menu they rotate to 0°.',
      '<code>transition-delay: calc(var(--i) * 80ms)</code> opens them one after another.',
      'The non-hover rule uses the <b>reversed</b> delay, so closing runs bottom-up. <code>perspective</code> on the list gives the swing its depth.',
    ],
    html: `<div class="menu" tabindex="0">
  <span>Menu ▾</span>
  <ul>
    <li style="--i:0">Profile</li>
    <li style="--i:1">Projects</li>
    <li style="--i:2">Settings</li>
    <li style="--i:3">Sign out</li>
  </ul>
</div>`,
    css: `body {
  place-items: start center;
  padding-top: 40px;
}

.menu {
  position: relative;
  width: 200px;
  cursor: pointer;
  font-family: system-ui;
}

.menu > span {
  display: block;
  padding: 12px 16px;
  border-radius: 10px;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(120deg, #8b6cff, #ff4d9d);
}

.menu ul {
  position: absolute;
  inset: 100% 0 auto;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  perspective: 500px;
}

.menu li {
  padding: 10px 16px;
  background: #141830;
  border: 1px solid #2a3054;
  opacity: 0;
  transform-origin: top center;
  transform: rotateX(-90deg);
  pointer-events: none;                            /* folded items must not catch the pointer */
  transition: transform 0.35s cubic-bezier(0.3, 1.4, 0.5, 1), opacity 0.2s;
  transition-delay: calc((3 - var(--i)) * 50ms);   /* closing: bottom-up */
}

.menu:hover li,
.menu:focus li {
  opacity: 1;
  pointer-events: auto;
  transform: rotateX(0deg);
  transition-delay: calc(var(--i) * 80ms);         /* opening: top-down */
}`,
  },

  dice: {
    how: [
      'The die is the plain CSS cube. Each value has a known rotation that brings its face to the front.',
      'JS picks a random value, looks up that rotation and adds two more full turns (<code>+720°</code>) on every roll, so it always tumbles instead of taking a shortcut.',
      'It writes two custom properties. The 1.1s <code>transition</code> with an overshoot easing <i>is</i> the roll animation.',
      'A fixed camera tilt comes first in the transform list, so you always see three faces.',
      'Rounded faces leave see-through holes at the cube’s corners. A square plate 8 units behind every face builds a sharp inner cube that fills them.',
      'Every length in the die is a multiple of one base unit, <code>--u</code>, tied to the canvas, so it is the same share of a gallery card, the editor and a recording canvas. The Roll button and its caption are in plain <code>vmin</code> instead: they are the same size in every model.',
    ],
    html: `<div class="table">
  <div class="view">
    <div class="scene">
      <div class="cube">
        <div>1</div><div>2</div><div>6</div>
        <div>5</div><div>3</div><div>4</div>
      </div>
    </div>
  </div>
  <div class="controls">
    <output class="caption">Click roll</output>
    <div class="row">
      <button type="button">Roll</button>
    </div>
  </div>
</div>`,
    css: `.table {
  /* one base unit: every length in the die is a multiple of it, so it is the same share of a
     card, the editor, a full screen and a recording canvas. The control zone under it is in
     plain vmin, because it is the same object in every model. */
  --u: 0.21vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin; /* the band's gap between the model and the control zone */
  font-family: system-ui;
}

/* the model box: the same height in every model that has controls, so the zone below it lands
   in the same place whatever the model is */
.view {
  display: grid;
  place-items: center;
  height: 44vmin;
}

.scene {
  perspective: calc(700 * var(--u));
}

.cube {
  --s: calc(120 * var(--u));
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  transform:
    rotateX(-22deg) rotateY(-28deg)                       /* camera */
    rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));    /* the roll, from JS */
  transition: transform 1.1s cubic-bezier(0.2, 0.9, 0.3, 1.15);
}

.cube > * {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  /* an inner line plus a soft shade instead of a hard border: squeezed side-on, a calc(2 * var(--u)) line
     breaks up, the shade survives */
  box-shadow: inset 0 0 0 calc(1.5 * var(--u)) #c9cbe0, inset 0 0 calc(8 * var(--u)) rgb(150 154 190 / 0.45);
  border-radius: calc(16 * var(--u));
  background: radial-gradient(circle at 30% 30%, #fff, #dfe1f0);
  color: #1a1d33;
  font: 900 calc(54 * var(--u)) system-ui;
  transform-style: preserve-3d;
}

/* Rounded faces leave a hole where three corners meet. A square plate just behind each face
   forms a slightly smaller inner cube that plugs the gaps. */
.cube > *::before {
  content: '';
  position: absolute;
  inset: calc(8 * var(--u));
  background: #d3d6ea;
  transform: translateZ(calc(-8 * var(--u)));
}

${CUBE_FACES}

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the die's own unit. The caption is on its own line above the
   row, and its line box never changes height, so a new result cannot move the die. */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}

.controls .caption {
  font: 500 4.5vmin/1.2 system-ui, sans-serif;
  opacity: 0.7;
}

.controls .row {
  display: flex;
  gap: 2vmin;
}

.controls button {
  height: 8vmin;
  min-width: 8vmin;
  padding: 0 3vmin;
  border: 0;
  border-radius: 999px;
  background: #ffb547;
  color: #1a1d33;
  font: 600 4vmin system-ui;
  cursor: pointer;
}`,
    js: `const cube = document.querySelector('.cube');
const out = document.querySelector('output');

// rotation [x, y] that brings each value to the front
// (faces in the markup: front 1, right 2, back 6, left 5, top 3, bottom 4)
const views = { 1: [0, 0], 2: [0, -90], 6: [0, -180], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };
let turns = 0;

document.querySelector('button').addEventListener('click', () => {
  const value = 1 + Math.floor(Math.random() * 6);
  const [x, y] = views[value];
  turns += 2;   // two extra full turns per roll

  cube.style.setProperty('--rx', x + 360 * turns + 'deg');
  cube.style.setProperty('--ry', y + 360 * turns + 'deg');

  out.textContent = 'Rolling…';
  setTimeout(() => (out.textContent = 'You rolled ' + value), 1100);
});`,
  },

  cardstack: {
    how: [
      'Each card stores its position in the deck in <code>--p</code> (0 = top).',
      'CSS derives everything from it: offset, depth, opacity and even <code>z-index</code> via <code>calc()</code>.',
      'On click, JS adds <code>.is-leaving</code> to the top card (it flies off), waits for the transition, then moves that card to the end of the order and rewrites <code>--p</code> for all.',
      'The other cards glide forward purely because their <code>--p</code> changed.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the deck is the same share of a gallery card, the editor and a recording canvas.',
      'The band has to hold the throw, not just the deck: the card in flight is the widest this model ever gets. So the throw is short, and the scene is padded on the right by the amount it carries the card, which puts the deck <i>and</i> its flight path in the middle rather than the shut deck on its own.',
    ],
    html: `<div class="scene">
  <div class="stack">
    <i style="--hue:255">One</i>
    <i style="--hue:290">Two</i>
    <i style="--hue:325">Three</i>
    <i style="--hue:360">Four</i>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the deck is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.34vmin;
  display: grid;
  place-items: center;
  /* the top card is thrown to the right: a little room on that side splits the difference
     between the shut deck and the deck with a card in flight, so neither is off centre */
  padding-right: calc(30 * var(--u));
  perspective: calc(800 * var(--u));
}

.stack {
  position: relative;
  width: calc(210 * var(--u));
  height: calc(140 * var(--u));
  cursor: pointer;
  transform-style: preserve-3d;
  transform: rotateX(18deg) rotateY(-14deg);
}

.stack i {
  /* --p = position in the deck, set from JS */
  position: absolute;
  inset: 0;
  z-index: calc(10 - var(--p));
  display: grid;
  place-items: center;
  border-radius: calc(16 * var(--u));
  color: #fff;
  font: 900 calc(26 * var(--u)) system-ui;
  background: linear-gradient(135deg, hsl(var(--hue) 85% 64%), hsl(calc(var(--hue) + 40) 80% 46%));
  box-shadow: 0 calc(12 * var(--u)) calc(22 * var(--u)) calc(-12 * var(--u)) #000;
  opacity: calc(1 - var(--p) * 0.18);
  transform: translateY(calc(var(--p) * -14 * var(--u))) translateZ(calc(var(--p) * -44 * var(--u)));
  transition: transform 0.38s cubic-bezier(0.3, 1.2, 0.5, 1), opacity 0.38s;
}

/* A quarter of a card to the right, tilted and turned away as it goes. It is a short throw on
   purpose: the band is centred on everything drawn, so a card that sails off the right drags the
   whole picture left with it, and the deck at rest ends up nowhere near the middle. */
.stack i.is-leaving {
  opacity: 0;
  transform: translateX(25%) translateZ(calc(60 * var(--u))) rotateY(-35deg) rotateZ(12deg);
}`,
    js: `const stack = document.querySelector('.stack');
let order = [...stack.querySelectorAll('i')];
let busy = false;

function layout() {
  order.forEach((card, p) => card.style.setProperty('--p', p));
}

stack.addEventListener('click', () => {
  if (busy) return;
  busy = true;

  const top = order[0];
  top.classList.add('is-leaving');

  setTimeout(() => {
    order = [...order.slice(1), top];   // top card goes to the back
    top.classList.remove('is-leaving');
    layout();
    busy = false;
  }, 380);                              // same as the CSS transition
});

layout();`,
  },

  parallax: {
    how: [
      'Every layer has its own <code>translateZ</code>: moon far away (−300 units), mountains, hills, trees in front (+70 units).',
      'Pushing a layer back makes it look smaller, so far layers get a compensating <code>scale()</code> to keep filling the frame: (perspective + depth) / perspective, so 1.6 for the moon at 300 units behind a 500-unit perspective.',
      'JS only rotates the <b>world</b> container a few degrees with the pointer. Real perspective then shifts near layers more than far ones — that is parallax, with no per-layer maths.',
      'Layers are oversized (<code>inset: -20%</code>) so their edges never show while tilting.',
      'The view is <code>inset: 0</code> and the layers are sized in percentages, so the scene fills the canvas edge to edge. Depths, the perspective and the moon are multiples of one base unit, <code>--u</code>, tied to the canvas, so the parallax is the same on a gallery card and on a full screen.',
    ],
    html: `<div class="view">
  <div class="world">
    <i></i><i></i><i></i><i></i>
  </div>
</div>`,
    css: `.view {
  /* one base unit, tied to the canvas; the view itself fills the canvas edge to edge */
  --u: 0.33vmin;
  position: fixed;
  inset: 0;
  overflow: hidden;
  perspective: calc(500 * var(--u));
  background: linear-gradient(#0c1033, #3a1d5e 60%, #ff7a59);
}

.world {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  /* slow ease back to rest... */
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* ...but nearly instant while the pointer is driving: a long transition restarts on every
   pointer event and makes the scene lag behind the hand */
.world.is-live {
  transition-duration: 0.1s;
}

.world i {
  position: absolute;
  inset: -20%;
}

/* moon */
.world i:nth-child(1) {
  inset: 14% auto auto 62%;
  width: calc(70 * var(--u));
  height: calc(70 * var(--u));
  border-radius: 50%;
  background: #fff4d1;
  box-shadow: 0 0 calc(40 * var(--u)) #fff4d1;
  transform: translateZ(calc(-300 * var(--u))) scale(1.6);
}

/* far mountains */
.world i:nth-child(2) {
  background: #4a2a73;
  clip-path: polygon(0 100%, 0 62%, 18% 44%, 34% 60%, 52% 38%, 70% 58%, 86% 42%, 100% 60%, 100% 100%);
  transform: translateZ(calc(-160 * var(--u))) scale(1.32);
}

/* near hills */
.world i:nth-child(3) {
  background: #2a1648;
  clip-path: polygon(0 100%, 0 70%, 22% 58%, 44% 72%, 66% 56%, 84% 70%, 100% 62%, 100% 100%);
  transform: translateZ(calc(-40 * var(--u))) scale(1.08);
}

/* foreground trees */
.world i:nth-child(4) {
  background: #0d0820;
  clip-path: polygon(0 100%, 0 78%, 6% 78%, 10% 60%, 14% 78%, 80% 80%, 85% 58%, 90% 80%, 100% 80%, 100% 100%);
  transform: translateZ(calc(70 * var(--u))) scale(0.9);
}`,
    js: `const view = document.querySelector('.view');
const world = document.querySelector('.world');

view.addEventListener('pointermove', (e) => {
  const x = e.clientX / innerWidth - 0.5;    // -0.5 … 0.5
  const y = e.clientY / innerHeight - 0.5;
  world.style.setProperty('--ry', x * 30 + 'deg');
  world.style.setProperty('--rx', -y * 20 + 'deg');
  world.classList.add('is-live');
});

view.addEventListener('pointerleave', () => {
  world.classList.remove('is-live');
  world.style.removeProperty('--rx');
  world.style.removeProperty('--ry');
});`,
  },

  boxslider: {
    how: [
      'Four slides are the four side faces of a box: <code>rotateY(n × 90deg) translateZ(width / 2)</code>.',
      'The box is pulled back by <code>translateZ(-width / 2)</code>, so whichever face is in front sits at z = 0 and renders at its true size.',
      'JS keeps a plain counter that never wraps. CSS multiplies it: <code>rotateY(calc(var(--step) * -90deg))</code>.',
      'Because the angle keeps growing instead of resetting, "next" always turns the same way — no rewind from slide 4 to slide 1.',
      'Every length in the box is a multiple of one base unit, <code>--u</code>, tied to the canvas: a slide is 280 × 170 of them, so the box is the same share of a gallery card, the editor and a recording canvas. The arrows are in plain <code>vmin</code>, the same size in every model that has controls.',
    ],
    html: `<div class="slider">
  <div class="scene">
    <div class="box">
      <i style="--hue:250">Design</i>
      <i style="--hue:290">Build</i>
      <i style="--hue:330">Ship</i>
      <i style="--hue:10">Repeat</i>
    </div>
  </div>
  <div class="controls">
    <nav class="row">
      <button type="button" data-dir="-1" aria-label="Previous">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <button type="button" data-dir="1" aria-label="Next">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </nav>
  </div>
</div>`,
    css: `.slider {
  /* one base unit: every length in the box below is a multiple of it, so the slideshow is the
     same share of a gallery card, the editor, a full screen and a recording canvas. The control
     row under it is in plain vmin, because it is the same object in every model. */
  --u: 0.25vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin;
}

.scene {
  perspective: calc(800 * var(--u));
}

.box {
  --w: calc(280 * var(--u));
  position: relative;
  width: var(--w);
  height: calc(170 * var(--u));
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--w) / -2)) rotateY(calc(var(--step, 0) * -90deg));
  transition: transform 0.7s cubic-bezier(0.3, 1.25, 0.5, 1);
}

.box i {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: calc(8 * var(--u));
  color: #fff;
  font: 900 calc(32 * var(--u)) system-ui;
  background: linear-gradient(135deg, hsl(var(--hue) 85% 62%), hsl(var(--hue) 75% 38%));
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

/* plugs the see-through notches where the rounded corners of two slides meet */
.box i::before {
  content: '';
  position: absolute;
  inset: calc(6 * var(--u));
  background: hsl(var(--hue) 75% 34%);
  transform: translateZ(calc(-6 * var(--u)));
}

.box i:nth-child(1) { transform: rotateY(0deg)   translateZ(calc(var(--w) / 2)); }
.box i:nth-child(2) { transform: rotateY(90deg)  translateZ(calc(var(--w) / 2)); }
.box i:nth-child(3) { transform: rotateY(180deg) translateZ(calc(var(--w) / 2)); }
.box i:nth-child(4) { transform: rotateY(270deg) translateZ(calc(var(--w) / 2)); }

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the box's own unit */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
}

.controls .row {
  display: flex;
  gap: 2vmin;
}

.controls button {
  display: grid;
  place-items: center;
  box-sizing: border-box;
  height: 8vmin;
  min-width: 8vmin;
  padding: 0 3vmin;
  border: 0.3vmin solid #5a6188;
  border-radius: 999px;
  background: #161a2e;
  color: #fff;
  font: 600 4vmin system-ui, sans-serif;
  cursor: pointer;
}

/* SVG arrows, not text like ‹ ›: a glyph sits on the font's baseline, so it never centres */
.controls svg {
  width: 4.5vmin;
  height: 4.5vmin;
}`,
    js: `const box = document.querySelector('.box');
let step = 0;   // never wraps, so the box keeps turning the same way

document.querySelector('nav').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-dir]');
  if (!btn) return;
  step += Number(btn.dataset.dir);
  box.style.setProperty('--step', step);
});`,
  },

  wavegrid: {
    how: [
      'JS builds an n × n grid and, for each cell, stores its distance from the centre in <code>--d</code>.',
      'All cells run the same bobbing animation on <code>translateZ</code>.',
      '<code>animation-delay: calc(var(--d) * -0.22s)</code> offsets each cell by its distance, so the motion reads as a ripple spreading outward.',
      'Negative delays mean the wave is already in full swing on the first frame.',
      'The grid is 11 × 11 cells in a square 260 units of one base unit, <code>--u</code>, across, and the cells rise 40 of them. Tied to the canvas, that keeps the wave the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="grid"></div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the wave is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.24vmin;
  /* a cell rising towards you is nearer the camera, and the near half of a plane tilted this far
     is its bottom: the wave spreads further down than up. This lifts the grid by half of that,
     so the wave is what sits in the middle of the canvas, not the flat grid */
  padding-bottom: calc(36 * var(--u));
  perspective: calc(800 * var(--u));
}

.grid {
  display: grid;
  grid-template-columns: repeat(var(--n), 1fr);
  gap: calc(4 * var(--u));
  width: calc(260 * var(--u));
  height: calc(260 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(58deg) rotateZ(-45deg);
}

.grid i {
  border-radius: calc(3 * var(--u));
  background: #ffb547;
  animation: bob 2.4s ease-in-out infinite;
  animation-delay: calc(var(--d) * -0.22s);
}

/* opacity + transform only: both run on the compositor, even with 100+ cells */
@keyframes bob {
  0%, 100% { transform: translateZ(calc(-14 * var(--u))); opacity: 0.4; }
  50%      { transform: translateZ(calc(40 * var(--u)));  opacity: 1; }
}`,
    js: `const grid = document.querySelector('.grid');
const N = 11;
const mid = (N - 1) / 2;

grid.style.setProperty('--n', N);

for (let row = 0; row < N; row++) {
  for (let col = 0; col < N; col++) {
    const cell = document.createElement('i');
    cell.style.setProperty('--d', Math.hypot(row - mid, col - mid).toFixed(2));
    grid.append(cell);
  }
}`,
  },

  confetti: {
    how: [
      'On click, JS creates 36 particles in the middle of the canvas. Each gets a random vector in custom properties: <code>--x</code>, <code>--y</code>, <code>--z</code>, <code>--spin</code>, <code>--hue</code>. The vectors come in mirrored pairs, one to the left and one to the right, so the burst is always balanced.',
      'There is only <b>one</b> keyframe rule. It reads those variables, so every particle flies somewhere different.',
      '<code>--z</code> is what makes it 3D: particles coming toward the camera grow, the others shrink away.',
      'Each particle removes itself on <code>animationend</code>, so the DOM never fills up.',
      'The whole canvas is the click target (<code>inset: 0</code>), but the burst always starts from the words in the middle, so it stays inside the frame wherever you click. JS writes the vector as plain numbers and the keyframe multiplies them by one base unit, <code>--u</code>, tied to the canvas, so the burst is the same share of a gallery card and a full screen.',
    ],
    html: `<div class="party">click anywhere</div>`,
    css: `.party {
  /* one base unit, tied to the canvas: the burst is measured in it */
  --u: 0.1vmin;
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  perspective: calc(850 * var(--u));
  color: #949bc0;
  font: 600 calc(54 * var(--u)) system-ui, sans-serif;
  cursor: pointer;
  user-select: none;
}

/* every burst starts from the middle, where the words are, so it stays inside the frame
   wherever the click lands */
.party i {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(30 * var(--u));
  height: calc(42 * var(--u));
  margin: calc(-21 * var(--u)) 0 0 calc(-15 * var(--u));
  border-radius: calc(6 * var(--u));
  background: hsl(var(--hue) 90% 62%);
  pointer-events: none;
  animation: fly 1.3s cubic-bezier(0.1, 0.7, 0.3, 1) forwards;
}

/* JS writes --x, --y and --z as plain numbers; they are counted in units here */
@keyframes fly {
  to {
    opacity: 0;
    /* + 200 units on Y is the "gravity" */
    transform:
      translate3d(calc(var(--x) * var(--u)), calc((var(--y) + 200) * var(--u)), calc(var(--z) * var(--u)))
      rotate3d(1, 1, 0.4, var(--spin));
  }
}`,
    js: `const party = document.querySelector('.party');
const rand = (min, max) => min + Math.random() * (max - min);

party.addEventListener('pointerdown', () => {
  // 18 random vectors, each thrown twice, once to the left and once to the right, so the burst
  // is balanced around the middle however the dice fall; a little jitter keeps the two from
  // reading as a mirror image. Each height is drawn from its own eighteenth of the range, so
  // the burst always reaches as high and as low.
  for (let i = 0; i < 18; i++) {
    const x = rand(0, 340), y = -505 + (i + rand(0.2, 0.8)) * 640 / 18, z = rand(-100, 100);
    for (const side of [-1, 1]) {
      const p = document.createElement('i');
      // plain numbers: the CSS multiplies them by --u, so the burst scales with the canvas
      p.style.setProperty('--x', side * x + rand(-30, 30));
      p.style.setProperty('--y', y + rand(-15, 15));
      p.style.setProperty('--z', z);
      p.style.setProperty('--spin', rand(360, 1080) + 'deg');
      p.style.setProperty('--hue', rand(0, 360));
      p.addEventListener('animationend', () => p.remove(), { once: true });
      party.append(p);
    }
  }
});`,
  },

  scrollspin: {
    how: [
      'JS turns the scroll position into one number, <code>--p</code>, from 0 to 1.',
      'CSS does the mapping: <code>rotateY(calc(var(--p) * 720deg))</code>. Change the feel by editing CSS only.',
      '<code>position: sticky</code> keeps the cube in view while the tall page scrolls past.',
      'Where supported, CSS can do this alone with <code>animation-timeline: scroll()</code> — check browser support before relying on it; the JS version works everywhere.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the cube is the same share of a gallery card, the editor and a recording canvas. It is sized for the worst angle the scroll turns it to — corner-on, where it spans its body diagonal — not for the rest pose.',
    ],
    html: `<div class="sticky">
  <div class="cube">
    <div></div><div></div><div></div>
    <div></div><div></div><div></div>
  </div>
</div>
<div class="spacer"></div>`,
    css: `body {
  display: block;        /* let the page scroll normally */
  overflow: auto;
}

.sticky {
  /* one base unit: every length below is a multiple of it, so the cube is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.27vmin;
  position: sticky;
  top: 0;
  display: grid;
  place-items: center;
  height: 100vh;
  perspective: calc(700 * var(--u));
}

.spacer {
  height: 300vh;
}

.cube {
  --s: calc(130 * var(--u));
  position: relative;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  /* --p is scroll progress 0…1, set on <html> from JS */
  transform:
    rotateX(calc(-20deg + var(--p, 0) * 360deg))
    rotateY(calc(var(--p, 0) * 720deg));
}

.cube > * {
  position: absolute;
  inset: 0;
  background: rgb(255 181 71 / 0.32);
  border: calc(1 * var(--u)) solid rgb(255 181 71 / 0.85);
}

${CUBE_FACES}`,
    js: `const root = document.documentElement;

function onScroll() {
  const max = root.scrollHeight - innerHeight;
  root.style.setProperty('--p', max > 0 ? scrollY / max : 0);
}

addEventListener('scroll', onScroll, { passive: true });
onScroll();`,
  },

  ripple: {
    how: [
      'Tiles are two-sided (<code>::before</code> / <code>::after</code>, <code>backface-visibility: hidden</code>) and flip when the grid gets <code>data-flipped</code>.',
      'That single attribute would flip them all at once. The ripple comes from <code>transition-delay: calc(var(--d) * 70ms)</code>.',
      'On click, JS works out each tile’s distance from the clicked one, writes it to <code>--d</code>, <b>then</b> toggles the attribute.',
      'Order matters: the delays must be in place before the change that triggers the transition.',
      'The grid has <code>pointer-events: none</code> and the tiles <code>auto</code>. Both lie on the same 3D plane, and coplanar surfaces have no stable front-to-back order — without this the browser hit-tests the invisible grid in patches, and the cursor and clicks fail there.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the 7 × 5 tiles are 42 units square, so the grid is the same share of a gallery card, the editor and a recording canvas. The distance JS writes is a plain number of tiles, never a length.',
    ],
    html: `<div class="scene">
  <div class="tiles"></div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the grid is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.25vmin;
  perspective: calc(800 * var(--u));
}

.tiles {
  display: grid;
  grid-template-columns: repeat(7, calc(42 * var(--u)));
  gap: calc(5 * var(--u));
  transform-style: preserve-3d;
  transform: rotateX(30deg);
  /* the grid is on the same 3D plane as its tiles; coplanar surfaces have no stable order, so
     in patches the browser would hit-test the grid instead of the tile (wrong cursor, dead clicks) */
  pointer-events: none;
}

.tiles i {
  position: relative;
  height: calc(42 * var(--u));
  pointer-events: auto;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.3, 1.3, 0.5, 1);
  transition-delay: calc(var(--d, 0) * 70ms);
}

.tiles i::before,
.tiles i::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: calc(7 * var(--u));
  backface-visibility: hidden;
}

.tiles i::before { background: #ffb547; }
.tiles i::after  { background: #ff4d9d; transform: rotateY(180deg); }

.tiles[data-flipped] i {
  transform: rotateY(180deg);
}`,
    js: `const grid = document.querySelector('.tiles');
const COLS = 7, ROWS = 5;

for (let i = 0; i < COLS * ROWS; i++) grid.append(document.createElement('i'));
const tiles = [...grid.children];

grid.addEventListener('click', (e) => {
  const index = tiles.indexOf(e.target);
  if (index < 0) return;
  const r0 = Math.floor(index / COLS), c0 = index % COLS;

  // 1) delays first…
  tiles.forEach((tile, i) => {
    const d = Math.hypot(Math.floor(i / COLS) - r0, (i % COLS) - c0);
    tile.style.setProperty('--d', d.toFixed(2));
  });

  // 2) …then the change that triggers the transitions
  grid.toggleAttribute('data-flipped');
});`,
  },
};
