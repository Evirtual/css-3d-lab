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
    return `${x}px ${y}px 0 ${next() > 0.5 ? 1 : 0.5}px #fff`;
  })
    .reduce<string[]>((rows, shadow, i) => {
      if (i % 4 === 0) rows.push('    ' + shadow);
      else rows[rows.length - 1] += ', ' + shadow;
      return rows;
    }, [])
    .join(',\n');
}

const RING_TEXT = 'CSS 3D LAB • NO WEBGL • ';

export const snippets2: Record<string, Snippet> = {
  pyramid: {
    how: [
      "Each side is a rectangle cut into a triangle with <code>clip-path: polygon(50% 0, 0 100%, 100% 100%)</code>.",
      "Like a cube face: <code>rotateY(n × 90deg) translateZ(base / 2)</code> puts it on one side of the floor.",
      "Then <code>rotateX</code> with <code>transform-origin: bottom</code> leans it inward. The angle that makes all four tips meet is <code>asin((base / 2) / slant)</code>: 30° when base and slant height are equal.",
      "The faces are <b>see-through</b> (colours with transparency), so the far faces and the glowing core inside show through. The core spins back against the pyramid (<code>rotateY(-360deg)</code> on the same timing), so it always faces you and stays round.",
    ],
    html: `<div class="scene">
  <div class="pyramid">
    <i></i><i></i><i></i><i></i>
    <b></b>
    <u></u>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.pyramid {
  --base: 140px;
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
    inset 0 0 0 1.5px rgb(46 230 214 / 0.7),
    inset 0 0 6px rgb(46 230 214 / 0.7),
    0 0 34px rgb(139 108 255 / 0.6);
  transform: translateY(50%) rotateX(90deg);
}

/* the core: a third of the way up (the pyramid stands base × cos 30deg ≈ 121px tall). It turns
   back against the spin, so it always faces you and stays round. */
.pyramid u {
  position: absolute;
  top: 101px;
  left: 50%;
  width: 36px;
  height: 36px;
  margin: -18px 0 0 -18px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 18%, #ffb547 42%, transparent 72%);
  animation: face-you 12s linear infinite, pulse 2.4s ease-in-out infinite alternate;
}

@keyframes pyramid-spin {
  from { transform: translateY(-20px) rotateX(-16deg) rotateY(0deg); }
  to   { transform: translateY(-20px) rotateX(-16deg) rotateY(360deg); }
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
      "Strip width for a closed ring is <code>2 × r × tan(180° / n)</code>. For r = 80px and n = 24 that is ≈ 21px; add 1px so no seams show.",
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
  perspective: 800px;
}

.cylinder {
  --r: 80px;
  --h: 180px;
  position: relative;
  width: 22px;                 /* 2 × 80 × tan(7.5deg) + 1px */
  height: var(--h);
  transform-style: preserve-3d;
  animation: cylinder-spin 14s linear infinite;
}

/* see-through strips: the far side of the tube shows through the near one */
.cylinder i {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgb(255 255 255 / 0.55) 0 2px, transparent 2px calc(100% - 2px), rgb(255 255 255 / 0.4) calc(100% - 2px)),
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
  border: 1px solid rgb(255 255 255 / 0.4);
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 255 255 / 0.16), rgb(139 108 255 / 0.22) 70%);
  transform: rotateX(90deg);
}

.cylinder b { top: calc(var(--r) * -1); }

.cylinder s {
  top: calc(var(--h) - var(--r));
  box-shadow: 0 0 40px rgb(46 230 214 / 0.55);
}

/* rings of light rising through the tube. \`translate\` moves them up the tube's own vertical,
   before the rotateX that lays them flat. */
.cylinder u {
  position: absolute;
  top: calc(var(--h) - var(--r) + 8px);
  left: calc(50% - var(--r) + 8px);
  width: calc(var(--r) * 2 - 16px);
  height: calc(var(--r) * 2 - 16px);
  box-sizing: border-box;
  border: 2px solid #2ee6d6;
  border-radius: 50%;
  box-shadow: 0 0 14px #2ee6d6, inset 0 0 14px #2ee6d6;
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
  0%       { opacity: 0; translate: 0 -4px; }
  15%, 80% { opacity: 1; }
  100%     { opacity: 0; translate: 0 calc(var(--h) * -1 + 12px); }
}`,
  },

  coin: {
    how: [
      'Front and back are two discs pushed apart with <code>translateZ(±5px)</code>; the back one is pre-flipped with <code>rotateY(180deg)</code>.',
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
  perspective: 800px;
}

.coin {
  position: relative;
  width: 150px;
  height: 150px;
  transform-style: preserve-3d;
  animation: coin-spin 4s linear infinite;
}

.coin b,
.coin i {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

/* the rim: 7 discs spread from -4.2px to +4.2px */
.coin i {
  background: #a8741a;
  transform: translateZ(calc((var(--i) - 3) * 1.4px));
}

.coin b {
  display: grid;
  place-items: center;
  border: 6px solid #e2a93b;
  background: radial-gradient(circle at 35% 30%, #fff1b8, #f1b93d 55%, #c98a1b);
  color: #8a5a0c;
  font: 900 4.5rem system-ui;
  backface-visibility: hidden;
  transform: translateZ(5px);
}

.coin b:last-child {
  transform: rotateY(180deg) translateZ(5px);
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
    ],
    html: `<div class="scene">
  <div class="globe">
${lines(9, (i) => `<i style="--i:${i}"></i>`)}
    <b></b>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.globe {
  position: relative;
  width: 200px;
  height: 200px;
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
    inset 0 0 0 1.5px var(--c),
    inset 0 0 2px 1.5px color-mix(in srgb, var(--c) 40%, transparent),
    0 0 2px color-mix(in srgb, var(--c) 50%, transparent);
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
  perspective: 800px;
}

.gyro,
.gyro div {
  display: grid;
  place-items: center;
  border: 4px solid #8b6cff;
  border-radius: 50%;
  transform-style: preserve-3d;
}

.gyro {
  width: 220px;
  height: 220px;
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
  box-shadow: 0 0 22px #ffb547;
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
    ],
    html: `<div class="loader"></div>`,
    css: `.loader {
  width: 90px;
  height: 90px;
  border-radius: 12px;
  background: linear-gradient(135deg, #2ee6d6, #8b6cff);
  box-shadow: 0 0 30px rgb(139 108 255 / 0.6);
  animation: flip 1.8s ease-in-out infinite;
}

@keyframes flip {
  0%   { transform: perspective(260px) rotateX(0deg)    rotateY(0deg); }
  50%  { transform: perspective(260px) rotateX(-180deg) rotateY(0deg); }
  100% { transform: perspective(260px) rotateX(-180deg) rotateY(-180deg); }
}`,
  },

  tunnel: {
    how: [
      'Ten identical frames, stacked in the centre, all running the same animation: <code>translateZ(-1400px)</code> → <code>translateZ(320px)</code>.',
      'Perspective is 320px. A frame at z = 200px is already magnified 2.7× and off-screen, so stop there and fade out. Never animate all the way to z = perspective: the scale there is infinite and the browser stalls rasterising it.',
      'A negative <code>animation-delay</code> of <code>i × (duration / count)</code> spreads them evenly along the tunnel.',
      'Fading in from 0 opacity hides the moment a frame pops into existence far away.',
    ],
    html: `<div class="tunnel">
${lines(10, (i) => `<i style="--i:${i}"></i>`, '  ')}
</div>`,
    css: `.tunnel {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  perspective: 320px;
  background: radial-gradient(circle, #1b0f3a, #05030d 70%);
}

.tunnel i {
  position: absolute;
  width: 260px;
  height: 260px;
  border: 3px solid hsl(calc(260 + var(--i) * 14) 90% 65%);
  border-radius: 18px;
  box-shadow: 0 0 18px hsl(calc(260 + var(--i) * 14) 90% 65% / 0.7);
  animation: fly 4s linear infinite;
  animation-delay: calc(var(--i) * -0.4s);   /* 4s / 10 frames */
}

/* stop well before z = perspective (320px): the scale there is infinite */
@keyframes fly {
  from     { opacity: 0; transform: translateZ(-1400px) rotateZ(0deg); }
  25%, 85% { opacity: 1; }
  to       { opacity: 0; transform: translateZ(200px) rotateZ(90deg); }
}`,
  },

  starfield: {
    how: [
      'Hundreds of DOM nodes would be wasteful. Instead each layer is <b>one</b> 1×1px element, and every star is a <code>box-shadow</code> of it.',
      'A box-shadow with zero blur and a spread radius is just a dot at an offset — and you can have as many as you like.',
      'Flying the single element along Z moves all its stars at once, with correct perspective.',
      'Three layers on staggered delays hide the loop. In Sass the list comes from <code>random()</code> at build time (see the SCSS tab); here it is written out.',
    ],
    html: `<div class="space">
  <i></i><i></i><i></i>
</div>`,
    css: `.space {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  perspective: 300px;
  background: radial-gradient(circle, #0d1030, #02030a 75%);
}

.space i {
  position: absolute;
  width: 1px;
  height: 1px;
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
  from     { opacity: 0; transform: translateZ(-600px); }
  20%, 80% { opacity: 1; }
  to       { opacity: 0; transform: translateZ(200px); }
}`,
  },

  waveletters: {
    how: [
      'Wrap every letter in a <code>&lt;span&gt;</code> with <code>display: inline-block</code> — transforms are ignored on plain inline boxes.',
      'All letters share one keyframe animation: lift toward the camera while flipping 360°.',
      '<code>animation-delay: calc(var(--i) * 0.12s)</code> offsets each letter, and the offsets read as a travelling wave.',
      'Put the real word in <code>aria-label</code> and hide the spans from screen readers, or it is read letter by letter.',
    ],
    html: `<div class="scene">
  <h1 class="wave" aria-label="WAVE 3D">
${[...'WAVE·3D'].map((c, i) => `    <span style="--i:${i}" aria-hidden="true">${c}</span>`).join('\n')}
  </h1>
</div>`,
    css: `.scene {
  perspective: 600px;
}

.wave {
  display: flex;
  gap: 2px;
  margin: 0;
  font: 900 4rem system-ui;
  transform-style: preserve-3d;
}

.wave span {
  display: inline-block;
  color: hsl(calc(255 + var(--i) * 18) 90% 70%);
  animation: wave 2.8s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.12s);
}

@keyframes wave {
  0%        { transform: translateZ(0)    rotateY(0deg); }
  22%       { transform: translateZ(60px) rotateY(180deg); }
  45%, 100% { transform: translateZ(0)    rotateY(360deg); }
}`,
  },

  textring: {
    how: [
      'One <code>&lt;span&gt;</code> per character, all stacked in the same spot.',
      'Each gets <code>rotateY(i × 360° / count) translateZ(radius)</code> — the carousel formula again.',
      '<code>backface-visibility: hidden</code> hides the far side, where letters would otherwise show mirrored.',
      'A monospace font keeps the spacing even. Pick the radius so that <code>2πr ≈ count × character width</code>.',
    ],
    html: `<div class="scene">
  <div class="ring" style="--n:${RING_TEXT.length}" aria-label="${RING_TEXT.trim()}">
${[...RING_TEXT].map((c, i) => `    <span style="--i:${i}" aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`).join('\n')}
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.ring {
  --r: 125px;
  position: relative;
  width: 26px;
  height: 44px;
  font: 800 2.1rem ui-monospace, monospace;
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

@keyframes ring-spin {
  from { transform: rotateX(-12deg) rotateY(0deg); }
  to   { transform: rotateX(-12deg) rotateY(-360deg); }
}`,
  },

  layertext: {
    how: [
      'The shadow-stack text is a 2D trick: its "depth" always points the same way. This version has real depth.',
      'Ten copies of the word are stacked with <code>position: absolute</code> and pushed back <code>3px × i</code> along Z.',
      'Each copy is darker than the one in front of it, which shades the side wall.',
      'Rotate the parent and the side wall appears on the correct side, with true perspective. Cost: more DOM, and the copies need <code>aria-hidden</code>.',
    ],
    html: `<div class="scene">
  <h1 class="deep">
    <b>DEEP</b>
${lines(10, (i) => `<span style="--i:${i + 1}" aria-hidden="true">DEEP</span>`)}
  </h1>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.deep {
  position: relative;
  margin: 0;
  font: 900 5.5rem system-ui;
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
  transform: translateZ(calc(var(--i) * -3px));
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
    ],
    html: `<div class="scene">
  <div class="sign">
    <div class="board">OPEN</div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.sign {
  position: relative;
  width: 220px;
  height: 190px;
  transform-origin: top center;
  animation: swing 2.2s ease-in-out infinite alternate;
}

/* rail + two cords */
.sign::before {
  content: '';
  position: absolute;
  inset: 0 16px auto;
  height: 80px;
  border: solid #949bc0;
  border-width: 4px 2px 0;
}

.board {
  position: absolute;
  inset: 80px 0 0;
  display: grid;
  place-items: center;
  border: 3px solid #ffb547;
  border-radius: 12px;
  background: #1b1408;
  color: #ffb547;
  font: 900 2.8rem system-ui;
  letter-spacing: 0.12em;
  text-shadow: 0 0 14px #ffb547;
  box-shadow: 0 0 24px rgb(255 181 71 / 0.45);
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
    ],
    html: `<div class="scene">
  <div class="laptop">
    <div class="lid"></div>
  </div>
</div>`,
    css: `.scene {
  perspective: 900px;
}

.laptop {
  position: relative;
  width: 220px;
  height: 145px;
  border-radius: 10px;
  background: linear-gradient(#c9cede, #9aa1b8);
  transform-style: preserve-3d;
  transform: translateY(40px) rotateX(64deg) rotateZ(28deg);
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
  border-radius: 10px;
  backface-visibility: hidden;
}

/* outer shell */
.lid::before {
  background: linear-gradient(#b9bfd2, #8e95ad);
  transform: translateZ(1px);
}

/* screen — the other side */
.lid::after {
  border: 7px solid #14161f;
  background: linear-gradient(135deg, #8b6cff, #2ee6d6);
  box-shadow: 0 0 30px #8b6cff;
  transform: rotateY(180deg);
}

@keyframes open {
  0%, 12%   { transform: rotateX(0deg); }
  85%, 100% { transform: rotateX(104deg); }
}`,
  },

  cardfan: {
    how: [
      'All five cards sit exactly on top of each other.',
      '<code>transform-origin: 50% 170%</code> moves the pivot far below the card, so <code>rotateZ</code> swings it along an arc instead of spinning it in place.',
      'The index runs −2…2, so <code>rotateZ(calc(var(--i) * 16deg))</code> fans symmetrically around an upright middle card.',
      'A few px of <code>translateZ</code> per card gives each its own depth, which avoids flicker where they overlap.',
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
  perspective: 800px;
}

.hand {
  position: relative;
  width: 110px;
  height: 156px;
  transform-style: preserve-3d;
  transform: rotateX(26deg);
}

.hand i {
  position: absolute;
  inset: 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: linear-gradient(160deg, #fff, #d9dcec);
  color: #14172b;
  font: 800 1.6rem/1 system-ui;
  box-shadow: 0 8px 16px -8px #000;
  transform-origin: 50% 170%;
  animation: fan 3s ease-in-out infinite alternate;
}

.hand small { display: block; font-size: 1.2rem; }

@keyframes fan {
  0%, 15%   { transform: translateZ(calc(var(--i) * 1px)) rotateZ(0deg); }
  85%, 100% { transform: translateZ(calc(var(--i) * 6px)) rotateZ(calc(var(--i) * 16deg)); }
}`,
  },

  door: {
    how: [
      'The frame holds the <code>perspective</code>; the leaf rotates with <code>transform-origin: left</code> (the hinges).',
      '<code>perspective-origin: 120% 50%</code> moves the camera to the right of the frame, so the open door does not collapse into a thin line.',
      'The "light" is simply the frame’s background, revealed as the leaf swings away.',
      '<code>tabindex="0"</code> plus <code>:focus</code> makes it work by tap and by keyboard.',
    ],
    html: `<div class="door" tabindex="0">
  <div class="leaf"><i></i></div>
</div>`,
    css: `.door {
  position: relative;
  width: 150px;
  height: 250px;
  border: 8px solid #3a2a1c;
  border-bottom: 0;
  background: radial-gradient(ellipse at 50% 70%, #fff6c9, #ffb547 55%, #7a4a12);
  perspective: 700px;
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
  right: 12px;
  width: 14px;
  height: 14px;
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
    ],
    html: `<div class="scene" tabindex="0">
  <div class="cube">
    <div></div><div></div><div></div>
    <div></div><div></div><div></div>
  </div>
</div>`,
    css: `.scene {
  --s: 110px;
  --d: calc(var(--s) / 2);     /* distance of each face from the centre */
  display: grid;
  place-items: center;
  width: 300px;
  height: 300px;
  perspective: 800px;
  cursor: pointer;
}

.scene:hover,
.scene:focus {
  --d: 115px;
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
  border-radius: 6px;
  background: rgb(255 77 157 / 0.35);
  border: 1px solid rgb(255 77 157 / 0.85);
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
    ],
    html: `<div class="scene">
  <div class="floor">
${lines(5, () => '<i></i><i></i><i></i><i></i><i></i>')}
  </div>
</div>`,
    css: `.scene {
  perspective: 900px;
}

.floor {
  display: grid;
  grid-template-columns: repeat(5, 46px);
  gap: 5px;
  transform-style: preserve-3d;
  transform: rotateX(56deg) rotateZ(-45deg);
  /* same plane as its cells: keep the floor itself out of hit-testing, or hover misses in patches */
  pointer-events: none;
}

/* the cell is a fixed hit target; only its ::before plate moves */
.floor i {
  pointer-events: auto;
  position: relative;
  height: 46px;
  transform-style: preserve-3d;
}

.floor i::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 7px;
  background: rgb(139 108 255 / 0.35);
  border: 1px solid rgb(139 108 255 / 0.7);
  pointer-events: none;
  /* slow on the way down */
  transition: transform 1.4s ease-out, background 1.4s ease-out;
}

.floor i:hover::before {
  background: #2ee6d6;
  transform: translateZ(46px);
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
  perspective: 600px;
}

/* the button is the hit target and never moves */
.roll {
  --h: 56px;
  display: block;
  width: 220px;
  height: var(--h);
  padding: 0;
  border: 0;
  background: none;
  color: #fff;
  font: 800 1.1rem system-ui;
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
  border-radius: 6px;
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
    ],
    html: `<label class="switch">
  <input type="checkbox">
  <span class="rocker"><b>I</b><b>O</b></span>
  <em></em>
</label>`,
    css: `.switch {
  display: grid;
  justify-items: center;
  gap: 22px;
  perspective: 320px;
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
  width: 90px;
  height: 146px;
  border-radius: 14px;
  background: linear-gradient(#2b3050, #161a30);
  border: 1px solid #4a5280;
  color: #8d95b3;
  font: 700 1.6rem system-ui;
  text-align: center;
  box-shadow: 0 0 0 9px #05060c, 0 0 0 10px #4a5280;
  transform: rotateX(-22deg);                       /* OFF */
  transition: transform 0.18s cubic-bezier(0.3, 1.6, 0.5, 1);
}

.rocker b { display: grid; place-items: center; }

input:checked + .rocker {
  transform: rotateX(22deg);                        /* ON */
  color: #2ee6d6;
}

input:focus-visible + .rocker {
  outline: 2px solid #2ee6d6;
  outline-offset: 14px;
}

/* status LED */
.switch em {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3a3f5c;
  transition: 0.2s;
}

input:checked ~ em {
  background: #2ee6d6;
  box-shadow: 0 0 14px #2ee6d6;
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
      'Rounded faces leave see-through holes at the cube’s corners. A square plate 8px behind every face builds a sharp inner cube that fills them.',
    ],
    html: `<div class="table">
  <div class="scene">
    <div class="cube">
      <div>1</div><div>2</div><div>6</div>
      <div>5</div><div>3</div><div>4</div>
    </div>
  </div>
  <button type="button">Roll</button>
  <output>Click roll</output>
</div>`,
    css: `.table {
  /* one base unit: every length is a multiple of it, so the die is the same share of a card,
     the editor, a full screen and a recording canvas */
  --u: 0.21vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin;
  font-family: system-ui;
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
  transform: translateZ(-calc(8 * var(--u)));
}

${CUBE_FACES}

button {
  height: 8vmin;
  min-width: 8vmin;
  padding: 0 3vmin;
  border: 0;
  border-radius: 999px;
  background: #ffb547;
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
  perspective: 800px;
}

.stack {
  position: relative;
  width: 230px;
  height: 150px;
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
  border-radius: 16px;
  color: #fff;
  font: 900 1.6rem system-ui;
  background: linear-gradient(135deg, hsl(var(--hue) 85% 64%), hsl(calc(var(--hue) + 40) 80% 46%));
  box-shadow: 0 12px 22px -12px #000;
  opacity: calc(1 - var(--p) * 0.18);
  transform: translateY(calc(var(--p) * -14px)) translateZ(calc(var(--p) * -44px));
  transition: transform 0.38s cubic-bezier(0.3, 1.2, 0.5, 1), opacity 0.38s;
}

.stack i.is-leaving {
  opacity: 0;
  transform: translateX(130%) translateZ(60px) rotateY(-35deg) rotateZ(18deg);
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
      'Every layer has its own <code>translateZ</code>: moon far away (−300px), mountains, hills, trees in front (+70px).',
      'Pushing a layer back makes it look smaller, so far layers get a compensating <code>scale()</code> to keep filling the frame.',
      'JS only rotates the <b>world</b> container a few degrees with the pointer. Real perspective then shifts near layers more than far ones — that is parallax, with no per-layer maths.',
      'Layers are oversized (<code>inset: -20%</code>) so their edges never show while tilting.',
    ],
    html: `<div class="view">
  <div class="world">
    <i></i><i></i><i></i><i></i>
  </div>
</div>`,
    css: `.view {
  position: fixed;
  inset: 0;
  overflow: hidden;
  perspective: 500px;
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
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #fff4d1;
  box-shadow: 0 0 40px #fff4d1;
  transform: translateZ(-300px) scale(1.6);
}

/* far mountains */
.world i:nth-child(2) {
  background: #4a2a73;
  clip-path: polygon(0 100%, 0 62%, 18% 44%, 34% 60%, 52% 38%, 70% 58%, 86% 42%, 100% 60%, 100% 100%);
  transform: translateZ(-160px) scale(1.32);
}

/* near hills */
.world i:nth-child(3) {
  background: #2a1648;
  clip-path: polygon(0 100%, 0 70%, 22% 58%, 44% 72%, 66% 56%, 84% 70%, 100% 62%, 100% 100%);
  transform: translateZ(-40px) scale(1.08);
}

/* foreground trees */
.world i:nth-child(4) {
  background: #0d0820;
  clip-path: polygon(0 100%, 0 78%, 6% 78%, 10% 60%, 14% 78%, 80% 80%, 85% 58%, 90% 80%, 100% 80%, 100% 100%);
  transform: translateZ(70px) scale(0.9);
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
  <nav>
    <button type="button" data-dir="-1" aria-label="Previous">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <button type="button" data-dir="1" aria-label="Next">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  </nav>
</div>`,
    css: `.slider {
  display: grid;
  justify-items: center;
  gap: 50px;
}

.scene {
  perspective: 800px;
}

.box {
  --w: 280px;
  position: relative;
  width: var(--w);
  height: 170px;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--w) / -2)) rotateY(calc(var(--step, 0) * -90deg));
  transition: transform 0.7s cubic-bezier(0.3, 1.25, 0.5, 1);
}

.box i {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  font: 900 2rem system-ui;
  background: linear-gradient(135deg, hsl(var(--hue) 85% 62%), hsl(var(--hue) 75% 38%));
  backface-visibility: hidden;
  transform-style: preserve-3d;
}

/* plugs the see-through notches where the rounded corners of two slides meet */
.box i::before {
  content: '';
  position: absolute;
  inset: 6px;
  background: hsl(var(--hue) 75% 34%);
  transform: translateZ(-6px);
}

.box i:nth-child(1) { transform: rotateY(0deg)   translateZ(calc(var(--w) / 2)); }
.box i:nth-child(2) { transform: rotateY(90deg)  translateZ(calc(var(--w) / 2)); }
.box i:nth-child(3) { transform: rotateY(180deg) translateZ(calc(var(--w) / 2)); }
.box i:nth-child(4) { transform: rotateY(270deg) translateZ(calc(var(--w) / 2)); }

nav { display: flex; gap: 8px; }

nav button {
  width: 44px;
  height: 36px;
  border: 1px solid #5a6188;
  border-radius: 8px;
  display: grid;
  place-items: center;
  padding: 0;
  background: #161a2e;
  color: #fff;
  cursor: pointer;
}

/* SVG arrows, not text like ‹ ›: a glyph sits on the font's baseline, so it never centres */
nav svg {
  width: 18px;
  height: 18px;
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
    ],
    html: `<div class="scene">
  <div class="grid"></div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(var(--n), 1fr);
  gap: 4px;
  width: 260px;
  height: 260px;
  transform-style: preserve-3d;
  transform: rotateX(58deg) rotateZ(-45deg);
}

.grid i {
  border-radius: 3px;
  background: #ffb547;
  animation: bob 2.4s ease-in-out infinite;
  animation-delay: calc(var(--d) * -0.22s);
}

/* opacity + transform only: both run on the compositor, even with 100+ cells */
@keyframes bob {
  0%, 100% { transform: translateZ(-14px); opacity: 0.4; }
  50%      { transform: translateZ(40px);  opacity: 1; }
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
      'On click, JS creates 36 particles at the pointer position. Each gets a random vector in custom properties: <code>--x</code>, <code>--y</code>, <code>--z</code>, <code>--spin</code>, <code>--hue</code>.',
      'There is only <b>one</b> keyframe rule. It reads those variables, so every particle flies somewhere different.',
      '<code>--z</code> is what makes it 3D: particles coming toward the camera grow, the others shrink away.',
      'Each particle removes itself on <code>animationend</code>, so the DOM never fills up.',
    ],
    html: `<div class="party">click anywhere</div>`,
    css: `.party {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  perspective: 500px;
  color: #949bc0;
  font-family: system-ui;
  cursor: pointer;
  user-select: none;
}

.party i {
  position: absolute;
  width: 10px;
  height: 14px;
  margin: -7px 0 0 -5px;
  border-radius: 2px;
  background: hsl(var(--hue) 90% 62%);
  pointer-events: none;
  animation: fly 1.3s cubic-bezier(0.1, 0.7, 0.3, 1) forwards;
}

@keyframes fly {
  to {
    opacity: 0;
    /* + 160px on Y is the "gravity" */
    transform:
      translate3d(var(--x), calc(var(--y) + 160px), var(--z))
      rotate3d(1, 1, 0.4, var(--spin));
  }
}`,
    js: `const party = document.querySelector('.party');
const rand = (min, max) => min + Math.random() * (max - min);

party.addEventListener('pointerdown', (e) => {
  for (let i = 0; i < 36; i++) {
    const p = document.createElement('i');
    p.style.left = e.clientX + 'px';
    p.style.top = e.clientY + 'px';
    p.style.setProperty('--x', rand(-220, 220) + 'px');
    p.style.setProperty('--y', rand(-240, 80) + 'px');
    p.style.setProperty('--z', rand(-200, 300) + 'px');
    p.style.setProperty('--spin', rand(360, 1080) + 'deg');
    p.style.setProperty('--hue', rand(0, 360));
    p.addEventListener('animationend', () => p.remove(), { once: true });
    party.append(p);
  }
});`,
  },

  scrollspin: {
    how: [
      'JS turns the scroll position into one number, <code>--p</code>, from 0 to 1.',
      'CSS does the mapping: <code>rotateY(calc(var(--p) * 720deg))</code>. Change the feel by editing CSS only.',
      '<code>position: sticky</code> keeps the cube in view while the tall page scrolls past.',
      'Where supported, CSS can do this alone with <code>animation-timeline: scroll()</code> — check browser support before relying on it; the JS version works everywhere.',
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
  position: sticky;
  top: 0;
  display: grid;
  place-items: center;
  height: 100vh;
  perspective: 700px;
}

.spacer {
  height: 300vh;
}

.cube {
  --s: 130px;
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
  border: 1px solid rgb(255 181 71 / 0.85);
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
    ],
    html: `<div class="scene">
  <div class="tiles"></div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(7, 42px);
  gap: 5px;
  transform-style: preserve-3d;
  transform: rotateX(30deg);
  /* the grid is on the same 3D plane as its tiles; coplanar surfaces have no stable order, so
     in patches the browser would hit-test the grid instead of the tile (wrong cursor, dead clicks) */
  pointer-events: none;
}

.tiles i {
  position: relative;
  height: 42px;
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
  border-radius: 7px;
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
