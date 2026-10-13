/**
 * Paste-anywhere version of the padlock model: plain HTML + CSS + a few lines of JS, no build step.
 * See snippets.ts for the format this file follows.
 */
import type { Snippet } from './snippet-utils';

/** Where each wheel's middle is across the lock's face, in units. */
const WHEEL_X = [58, 110, 162];
/** What each wheel shows at rest: one below the code on every wheel, so the code is three "up"s away. */
const START = [2, 0, 3];
/** The body's slices behind the face plate, back to front: [z, scale]. Smaller at the back and just
    behind the plate, so the edge is rounded and the plate has a lit rim round it. */
const SLICES: [number, number][] = [
  [-24, 0.935], [-16, 0.975], [-8, 0.995], [1, 1], [10, 0.995], [18, 0.985],
];
/** The shackle's layers, back to front: [bar width, z, colour]. Each is the same U round the same
    centre line, narrower and brighter toward you, so together they read as a round steel bar. */
const BARS: [number, number, string][] = [
  [16, -5, '#4b5172'],
  [11.5, 0, '#8e95b4'],
  [7, 4, '#c9cee3'],
  [2.6, 6.5, '#ffffff'],
];

const digits = Array.from({ length: 10 }, (_, i) => `<b style="--i:${i}">${i}</b>`).join('');

export const snippetsPadlock: Record<string, Snippet> = {
  padlock: {
    how: [
      'Each wheel is a drum of ten faces round a level axis: face <i>i</i> is <code>rotateX(-i × 36deg) translateZ(34 units)</code>, 22.2 units tall, a hair over <code>2 × 34 × tan(18°)</code>, so the ten close into a ring. The drum turns with <code>rotateX(t × 36deg)</code>, which brings face <i>t</i> to the front, and <code>backface-visibility: hidden</code> drops the faces round the back. Its axis is 27 units behind the face plate, so the reading row stands out whole; in front of each wheel a frame with an opening one face tall covers the half digits above and below it, so a wheel shows one number and the numbers roll through the window.',
      'The body is the face plate and six rounded slices behind it, 8 or 9 units apart in depth, each a little smaller toward the back and just behind the plate. Seen from a little above and to the right, their edges stack into a smooth, rounded wall, and the slice just behind the plate shows as a lit rim round it: a body with real thickness and no hard box edges.',
      'The script keeps one number per wheel and never wraps it: from 9, “up” makes 10, and the drum turns one more step forward instead of spinning back through every digit. It writes that number as <code>--t</code> on the wheel and lets the <code>transition</code> roll it, with a little overshoot, like a detent. The digit shown is the number mod 10.',
      'When all three digits match the code, the script adds one class, <code>.open</code>. CSS does the rest: the shackle springs up out of the body, then swings on its long leg; closing, it swings back first and then drops, because each state carries its own <code>transition-delay</code>. The lock sinks by about half of what the shackle rises, so open and shut are both centred.',
      'The arrows are real <code>&lt;button&gt;</code>s, named “Wheel 1 up, now 2” and renamed as they turn; the arrow keys roll a focused wheel too. Every other part has <code>pointer-events: none</code>: in 3D the browser hit-tests by depth, and a flat wrapper the size of the lock lies in front of the keys on the side turned away from you, so it would take their clicks. The chevrons are drawn with <code>clip-path</code>, not typed. Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas.',
    ],
    html: `<div class="scene">
  <div class="lock" role="group" aria-label="Combination padlock">
    <div class="hand"><div class="rig">
      <div class="shackle" aria-hidden="true">
        <div class="swing">${BARS.map(([w, z, c]) => `<i class="bar" style="--w:${w};--zb:${z};--c:${c}"></i><i class="leg" style="--w:${w};--zb:${z};--c:${c}"></i>`).join('')}</div>
      </div>
${SLICES.map(([z, s], k) => `      <i class="slice" style="--z:${z};--s:${s};--k:${k}"></i>`).join('\n')}
      <div class="plate">
        <i class="marks"></i>
${WHEEL_X.map((x, w) => `        <span class="wheel" style="--x:${x};--t:${START[w]}" aria-hidden="true">${digits}</span>`).join('\n')}
${WHEEL_X.map((x) => `        <i class="bezel" style="--x:${x}"></i>`).join('\n')}
${WHEEL_X.map((x, w) => `        <button class="roll up" style="--x:${x}" data-w="${w}" data-step="1" aria-label="Wheel ${w + 1} up, now ${START[w]}"></button>`).join('\n')}
${WHEEL_X.map((x, w) => `        <button class="roll down" style="--x:${x}" data-w="${w}" data-step="-1" aria-label="Wheel ${w + 1} down, now ${START[w]}"></button>`).join('\n')}
      </div>
    </div></div>
  </div>
  <div class="controls">
    <p class="caption">Code 3 · 1 · 4</p>
    <output class="status" aria-live="polite">Locked</output>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the lock is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.205vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin;
}
.scene * {
  box-sizing: border-box;
}

/* the lock's box: the shackle above, the body below, and 14 units of room under the body, which
   it sinks into as it opens */
.lock {
  position: relative;
  width: calc(240 * var(--u));
  height: calc(266 * var(--u));
  perspective: calc(1100 * var(--u));
}
/* in 3D the browser hit-tests by depth, and a flat wrapper lies in front of whatever is turned
   away behind its plane: nothing but the keys takes the pointer */
.lock * {
  pointer-events: none;
}
.lock .roll {
  pointer-events: auto;
}

/* a key held down gives the whole lock a little push, as a thumb on a real one would */
.hand {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.25s cubic-bezier(0.3, 1.5, 0.5, 1);
}
.lock:has(.roll:active) .hand {
  transform: translateY(calc(4 * var(--u))) rotateX(5deg);
  transition-duration: 0.08s;
}

/* the body's space: 220 x 150 units, 50 deep, its middle at z = 0, seen a little from above and
   from the right: turned enough to show its depth, not so much that the digits squash. Open, it
   sinks by about half of what the shackle rises, so open and shut are both centred */
.rig {
  position: absolute;
  left: calc(10 * var(--u));
  top: calc(100 * var(--u));
  width: calc(220 * var(--u));
  height: calc(150 * var(--u));
  transform-style: preserve-3d;
  transform: translateY(0) rotateX(-9deg) rotateY(-15deg);
  transition: transform 0.45s cubic-bezier(0.3, 1.4, 0.5, 1) 0.25s;
}
.lock.open .rig {
  transform: translateY(calc(14 * var(--u))) rotateX(-9deg) rotateY(-15deg);
  transition-delay: 0s;
}
.rig > * {
  position: absolute;
}

/* ---- the body: rounded slices behind the face plate, darker toward the back ---- */
.slice {
  inset: 0;
  border-radius: calc(26 * var(--u));
  background: hsl(254 58% calc(16% + var(--k) * 5.6%));
  transform: translateZ(calc(var(--z) * var(--u))) scale(var(--s));
}
/* the face plate: the three slots the wheels stand out of, a soft light from the top left, and
   the violet face. Everything on the face is a child of the plate, so it shares its scale */
.plate {
  inset: 0;
  border-radius: calc(24 * var(--u));
  background:
    linear-gradient(#120b30, #2b1c6e 50%, #120b30) calc(33 * var(--u)) calc(56 * var(--u)) / calc(50 * var(--u)) calc(42 * var(--u)) no-repeat,
    linear-gradient(#120b30, #2b1c6e 50%, #120b30) calc(85 * var(--u)) calc(56 * var(--u)) / calc(50 * var(--u)) calc(42 * var(--u)) no-repeat,
    linear-gradient(#120b30, #2b1c6e 50%, #120b30) calc(137 * var(--u)) calc(56 * var(--u)) / calc(50 * var(--u)) calc(42 * var(--u)) no-repeat,
    radial-gradient(ellipse 80% 60% at 30% 0, rgb(255 255 255 / 0.2), transparent 70%),
    linear-gradient(170deg, #8467ff, #5b3be2);
  transform-style: preserve-3d;
  transform: translateZ(calc(24 * var(--u))) scale(0.965);
}
.plate > * {
  position: absolute;
}

/* two teal marks either side of the reading row: dim while locked, lit when it opens */
.marks {
  left: calc(10 * var(--u));
  top: calc(70 * var(--u));
  width: calc(200 * var(--u));
  height: calc(14 * var(--u));
  opacity: 0.4;
  transform: translateZ(calc(0.4 * var(--u)));
  transition: opacity 0.3s;
}
.marks::before,
.marks::after {
  content: '';
  position: absolute;
  top: 0;
  width: calc(12 * var(--u));
  height: 100%;
  background: #2ee6d6;
}
.marks::before { left: 0;  clip-path: polygon(0 0, 100% 50%, 0 100%); }
.marks::after  { right: 0; clip-path: polygon(100% 0, 0 50%, 100% 100%); }
.lock.open .marks {
  opacity: 1;
  transition-delay: 0.2s;
}

/* ---- a wheel: a drum of ten faces round a level axis 27 units behind the plate ---- */
.wheel {
  left: calc((var(--x) - 24) * var(--u));
  top: calc(77 * var(--u));
  width: calc(48 * var(--u));
  height: 0;
  transform-style: preserve-3d;
  transform: translateZ(calc(-27 * var(--u))) rotateX(calc(var(--t) * 36deg));
  /* a little overshoot, like a detent clicking in */
  transition: transform 0.45s cubic-bezier(0.3, 1.45, 0.5, 1);
}
.wheel b {
  position: absolute;
  left: 0;
  top: calc(-11.1 * var(--u));
  width: 100%;
  height: calc(22.2 * var(--u));
  display: grid;
  place-items: center;
  /* lit across the middle and a little darker toward its edges, as a face on a drum is */
  background: linear-gradient(#e6dfca, #fffdf8 30% 70%, #e6dfca);
  color: #0c0a18;
  font: 800 calc(20 * var(--u)) / 1 Inter, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  backface-visibility: hidden;
  transform: rotateX(calc(var(--i) * -36deg)) translateZ(calc(34 * var(--u)));
}

/* ---- the window in front of each wheel: a frame whose opening is one face tall. The faces above
   and below the reading row still stand out of the plate for half their height, and at a card's
   size those half digits read as two more rows of numbers; the frame covers them, so each wheel
   shows one digit, and the digits roll through the window ---- */
.bezel {
  /* a little wider than the drum and only slightly rounded: a rounder corner left the square corners
     of the faces above and below poking out past it */
  left: calc((var(--x) - 28) * var(--u));
  top: calc(54 * var(--u));
  width: calc(56 * var(--u));
  height: calc(46 * var(--u));
  border: solid #3a2896;
  border-width: calc(12.5 * var(--u)) calc(5 * var(--u));
  border-radius: calc(4 * var(--u));
  box-shadow: inset 0 calc(1.5 * var(--u)) 0 rgb(0 0 0 / 0.35), 0 calc(1 * var(--u)) 0 rgb(255 255 255 / 0.18);
  transform: translateZ(calc(8 * var(--u)));
}

/* ---- the arrows: raised keys on the plate, above and below each wheel ---- */
.roll {
  left: calc((var(--x) - 23) * var(--u));
  width: calc(46 * var(--u));
  height: calc(26 * var(--u));
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: calc(8 * var(--u));
  background: linear-gradient(#383b64, #1e2042);
  cursor: pointer;
  outline: none;
  transform-style: preserve-3d;
  transform: translateZ(calc(5 * var(--u)));
  transition: transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}
.roll.up   { top: calc(16 * var(--u)); }
.roll.down { top: calc(112 * var(--u)); }
/* the key's side: a darker copy just under it, hidden by the plate when the key is pressed in */
.roll::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: #100c2a;
  transform: translateZ(calc(-4 * var(--u)));
}
/* the chevron, drawn: a V cut out with clip-path */
.roll::after {
  content: '';
  position: absolute;
  inset: calc(7 * var(--u)) calc(14 * var(--u));
  background: #eceefa;
}
.roll.up::after   { clip-path: polygon(0 75%, 50% 0, 100% 75%, 82% 100%, 50% 50%, 18% 100%); }
.roll.down::after { clip-path: polygon(0 25%, 50% 100%, 100% 25%, 82% 0, 50% 50%, 18% 0); }
.roll:active {
  transform: translateZ(calc(1.5 * var(--u)));
  transition-duration: 0.04s;
}
.roll:focus-visible {
  outline: calc(2 * var(--u)) solid #fff;
  outline-offset: calc(2 * var(--u));
}

/* ---- the shackle: a steel U in four layers round one centre line, narrower and brighter toward
   you, so it reads as a round bar. Its legs go down behind the plate; the left one is longer,
   and stays in when it opens ---- */
.shackle {
  left: 0;
  top: 0;
  width: 100%;
  height: 0;
  transform-style: preserve-3d;
  transform: translateY(0);
  /* closing: it waits for the swing back, then drops */
  transition: transform 0.35s cubic-bezier(0.5, 0, 0.75, 0) 0.3s;
}
.swing {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform-origin: calc(42 * var(--u)) 0;
  transform: rotateY(0deg);
  transition: transform 0.35s cubic-bezier(0.45, 0, 0.3, 1);
}
.lock.open .shackle {
  transform: translateY(calc(-28 * var(--u)));
  /* opening: it springs up at once */
  transition: transform 0.5s cubic-bezier(0.25, 1.35, 0.4, 1) 0s;
}
.lock.open .swing {
  transform: rotateY(55deg);
  transition: transform 0.6s cubic-bezier(0.3, 1.3, 0.5, 1) 0.35s;
}
/* one U: its centre line runs up the legs at x = 42 and 178 and over an arc of radius 68 whose top
   is at y = -88; the bar is --w wide about that line. Its legs end at y = 12, behind the plate,
   less half of what the layer is narrower than the back one: the narrow bright layers in front
   stop a little short, so the free end, seen when it opens, tapers like a round bar's end
   instead of stopping in four steps */
.bar {
  position: absolute;
  left: calc((42 - var(--w) / 2) * var(--u));
  top: calc((-88 - var(--w) / 2) * var(--u));
  width: calc((136 + var(--w)) * var(--u));
  height: calc((100 + var(--w) / 2 - (16 - var(--w)) / 2) * var(--u));
  border: calc(var(--w) * var(--u)) solid var(--c);
  border-bottom: 0;
  border-radius: calc((68 + var(--w) / 2) * var(--u)) calc((68 + var(--w) / 2) * var(--u)) 0 0;
  transform: translateZ(calc(var(--zb) * var(--u)));
}
/* the long leg's lower part, the bit that stays in the body when it opens: the same four layers,
   each going on from where its bar's leg ends, so the leg has no joint. It was one flat strip
   with a painted shine, a different width from the bar above it, and showed as a step when the
   shackle lifted */
.leg {
  position: absolute;
  left: calc((42 - var(--w) / 2) * var(--u));
  /* 2 units up into the bar's leg: two edges that only meet show a hairline between them */
  top: calc((10 - (16 - var(--w)) / 2) * var(--u));
  height: calc((52 + (16 - var(--w)) / 2) * var(--u));
  /* drawn as a border, as the bar's leg is: a border's width is snapped to whole pixels and a
     box's is not, so a box beside the bar's border sat a pixel off it */
  width: 0;
  border-left: calc(var(--w) * var(--u)) solid var(--c);
  transform: translateZ(calc(var(--zb) * var(--u)));
}

/* ---- the caption under it: the code, in the stage's own ink ---- */
.controls {
  display: grid;
  justify-items: center;
  gap: 2vmin;
  text-align: center;
  position: relative;
}
.controls .caption {
  margin: 0;
  font: 500 4.5vmin / 1.2 Inter, system-ui, sans-serif;
  opacity: 0.7;
  white-space: nowrap;
}
/* said to a screen reader when it opens or shuts; not drawn. It sits inside the caption's own box
   in the caption's own size: a word left at the browser's 16px is a box in px, which does not
   scale with the canvas like everything else */
.status {
  position: absolute;
  left: 0;
  top: 0;
  font: 500 4.5vmin / 1.2 Inter, system-ui, sans-serif;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}`,
    js: `const lock = document.querySelector('.lock');
const status = document.querySelector('.status');
const CODE = [3, 1, 4];
const wheels = [...lock.querySelectorAll('.wheel')];
// one number per wheel, never wrapped: 9 then "up" is 10, so the drum turns one step forward
const turns = wheels.map((w) => Number(w.style.getPropertyValue('--t')));
const digit = (t) => ((t % 10) + 10) % 10;

function roll(w, step) {
  turns[w] += step;
  wheels[w].style.setProperty('--t', turns[w]);
  const now = digit(turns[w]);
  for (const b of lock.querySelectorAll('[data-w="' + w + '"]'))
    b.setAttribute('aria-label', 'Wheel ' + (w + 1) + (b.dataset.step > 0 ? ' up' : ' down') + ', now ' + now);
  const open = turns.every((t, i) => digit(t) === CODE[i]);
  if (open !== lock.classList.contains('open')) {
    lock.classList.toggle('open', open);
    status.textContent = open ? 'Open' : 'Locked';
  }
}

lock.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-w]');
  if (b) roll(Number(b.dataset.w), Number(b.dataset.step));
});
// the arrow keys roll the wheel whose key has focus
lock.addEventListener('keydown', (e) => {
  const b = e.target.closest('button[data-w]');
  if (!b || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  roll(Number(b.dataset.w), e.key === 'ArrowUp' ? 1 : -1);
});`,
  },
};
