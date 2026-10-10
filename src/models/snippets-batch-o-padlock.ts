/**
 * Paste-anywhere version of the padlock model: plain HTML + CSS + a few lines of JS, no build step.
 * See snippets.ts for the format this file follows.
 */
import type { Snippet } from './snippet-utils';

/** Where each wheel's middle is across the lock's face, in units. */
const WHEEL_X = [52, 100, 148];
/** What each wheel shows at rest: one below the code on every wheel, so the code is three "up"s away. */
const START = [2, 0, 3];

const digits = Array.from({ length: 10 }, (_, i) => `<b style="--i:${i}">${i}</b>`).join('');

export const snippetsPadlock: Record<string, Snippet> = {
  padlock: {
    how: [
      'Each wheel is a drum of ten faces round a level axis: face <i>i</i> is <code>rotateX(-i × 36deg) translateZ(30 units)</code>, 19.6 units tall, a hair over <code>2 × 30 × tan(18°)</code>, so the ten close into a ring. The drum turns with <code>rotateX(t × 36deg)</code>, which brings face <i>t</i> to the front, and <code>backface-visibility: hidden</code> drops the faces round the back.',
      'The drum&rsquo;s axis is 20 units behind the lock&rsquo;s front face, so only its front stands out, through a dark slot painted on the face: the reading row whole, the rows above and below it cut off by the face. The face is opaque, so everything of the drum behind it is hidden by ordinary depth sorting, and it reads as a wheel set into the body.',
      'The script keeps one number per wheel and never wraps it: from 9, “up” makes 10, and the drum turns one more step forward instead of spinning back through every digit. It writes that number as <code>--t</code> on the wheel and lets the <code>transition</code> roll it, with a little overshoot, like a detent. The digit shown is the number mod 10.',
      'When all three digits match the code, the script adds one class, <code>.open</code>. CSS does the rest: the shackle springs up out of the body, then swings on its long leg; closing, it swings back first and then drops, because each state carries its own <code>transition-delay</code>. The whole lock sinks by about half of what the shackle rises, so open and shut are both centred.',
      'The arrows are real <code>&lt;button&gt;</code>s, named “Wheel 1 up, now 2” and renamed as they turn; the arrow keys roll a focused wheel too, and a key held down gives the whole lock a small push. The chevrons are drawn with <code>clip-path</code>, not typed. The code is the caption, in the stage&rsquo;s own ink. Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas.',
    ],
    html: `<div class="scene">
  <div class="lock" role="group" aria-label="Combination padlock">
    <div class="hand"><div class="rig">
      <div class="shackle" aria-hidden="true">
        <div class="swing"><i class="u back"></i><i class="u mid"></i><i class="u front"></i><i class="leg"></i></div>
      </div>
      <i class="side top"></i><i class="side right"></i>
      <i class="face"></i>
      <i class="marks"></i>
${WHEEL_X.map((x, w) => `      <span class="wheel" style="--x:${x};--t:${START[w]}" aria-hidden="true">${digits}</span>`).join('\n')}
${WHEEL_X.map((x, w) => `      <button class="roll up" style="--x:${x}" data-w="${w}" data-step="1" aria-label="Wheel ${w + 1} up, now ${START[w]}"></button>`).join('\n')}
${WHEEL_X.map((x, w) => `      <button class="roll down" style="--x:${x}" data-w="${w}" data-step="-1" aria-label="Wheel ${w + 1} down, now ${START[w]}"></button>`).join('\n')}
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
  --u: 0.19vmin;
  display: grid;
  justify-items: center;
  gap: 4vmin;
}
.scene * {
  box-sizing: border-box;
}

/* the lock's box: the body at the bottom, the shackle above it */
.lock {
  position: relative;
  width: calc(220 * var(--u));
  /* 14 units of room under the body, which it sinks into as it opens */
  height: calc(276 * var(--u));
  perspective: calc(1000 * var(--u));
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

/* the body's space: 200 x 150 units, 56 deep, its middle at z = 0, seen from above and to the
   right. Open, it sinks by about half of what the shackle rises, so open and shut are both centred */
.rig {
  position: absolute;
  left: calc(10 * var(--u));
  top: calc(108 * var(--u));
  width: calc(200 * var(--u));
  height: calc(150 * var(--u));
  transform-style: preserve-3d;
  transform: translateY(0) rotateX(-16deg) rotateY(-26deg);
  transition: transform 0.45s cubic-bezier(0.3, 1.4, 0.5, 1) 0.25s;
}
.lock.open .rig {
  transform: translateY(calc(14 * var(--u))) rotateX(-16deg) rotateY(-26deg);
  transition-delay: 0s;
}
.rig > * {
  position: absolute;
}

/* ---- the body: a front, a top and a right side, each facing out ---- */
.face {
  inset: 0;
  border-radius: calc(5 * var(--u));
  /* the three slots the wheels stand out of, then the face itself */
  background:
    linear-gradient(#140d33, #2a1c66 50%, #140d33) calc(29 * var(--u)) calc(53 * var(--u)) / calc(46 * var(--u)) calc(46 * var(--u)) no-repeat,
    linear-gradient(#140d33, #2a1c66 50%, #140d33) calc(77 * var(--u)) calc(53 * var(--u)) / calc(46 * var(--u)) calc(46 * var(--u)) no-repeat,
    linear-gradient(#140d33, #2a1c66 50%, #140d33) calc(125 * var(--u)) calc(53 * var(--u)) / calc(46 * var(--u)) calc(46 * var(--u)) no-repeat,
    radial-gradient(ellipse 70% 40% at 40% 0, rgb(255 255 255 / 0.18), transparent),
    linear-gradient(165deg, #7f63ff, #5636dc);
  box-shadow: inset 0 0 0 calc(1.5 * var(--u)) rgb(255 255 255 / 0.12);
  transform: translateZ(calc(28 * var(--u)));
}
.side {
  backface-visibility: hidden;
}
/* the top, with the two holes the shackle's legs go into */
.side.top {
  /* a hair inside the body and short of the front, so the front face covers the shared edge */
  left: 0;
  top: calc(-27.6 * var(--u));
  width: 100%;
  height: calc(55.6 * var(--u));
  background:
    radial-gradient(circle at calc(40 * var(--u)) 50%, #0e0a24 calc(9 * var(--u)), transparent calc(10 * var(--u))),
    radial-gradient(circle at calc(160 * var(--u)) 50%, #0e0a24 calc(9 * var(--u)), transparent calc(10 * var(--u))),
    linear-gradient(#8a72ff, #a592ff);
  transform: rotateX(90deg);
}
.side.right {
  left: calc(172 * var(--u));
  top: 0;
  width: calc(55.6 * var(--u));
  height: 100%;
  background: linear-gradient(90deg, #4a2fc6, #33208f);
  transform: rotateY(90deg);
}

/* two teal marks either side of the reading row: dim while locked, lit when it opens. Seen from
   above and to the right, the drums stand out of the face toward you, so the reading row is seen a
   little lower than the axis on the left of the face and higher on the right: each mark is set
   where the row is seen */
.marks {
  left: calc(8 * var(--u));
  top: calc(69 * var(--u));
  width: calc(184 * var(--u));
  height: calc(19 * var(--u));
  opacity: 0.35;
  transform: translateZ(calc(28.4 * var(--u)));
  transition: opacity 0.3s;
}
.marks::before,
.marks::after {
  content: '';
  position: absolute;
  top: 0;
  width: calc(12 * var(--u));
  height: calc(12 * var(--u));
  background: #2ee6d6;
}
.marks::before { left: 0;  top: calc(7 * var(--u)); clip-path: polygon(0 0, 100% 50%, 0 100%); }
.marks::after  { right: 0; clip-path: polygon(100% 0, 0 50%, 100% 100%); }
.lock.open .marks {
  opacity: 1;
  transition-delay: 0.2s;
}

/* ---- a wheel: a drum of ten faces round a level axis 20 units behind the front face ---- */
.wheel {
  left: calc((var(--x) - 21) * var(--u));
  top: calc(76 * var(--u));
  width: calc(42 * var(--u));
  height: 0;
  transform-style: preserve-3d;
  transform: translateZ(calc(8 * var(--u))) rotateX(calc(var(--t) * 36deg));
  /* a little overshoot, like a detent clicking in */
  transition: transform 0.45s cubic-bezier(0.3, 1.45, 0.5, 1);
}
.wheel b {
  position: absolute;
  left: 0;
  top: calc(-9.8 * var(--u));
  width: 100%;
  height: calc(19.6 * var(--u));
  display: grid;
  place-items: center;
  border-inline: calc(3 * var(--u)) solid #c9bf9f;
  background: linear-gradient(#fffcf2, #ece4cd);
  color: #1b1530;
  font: 700 calc(16 * var(--u)) / 1 Inter, system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
  backface-visibility: hidden;
  transform: rotateX(calc(var(--i) * -36deg)) translateZ(calc(30 * var(--u)));
}

/* ---- the arrows: raised keys on the face, above and below each wheel ---- */
.roll {
  left: calc((var(--x) - 20) * var(--u));
  width: calc(40 * var(--u));
  height: calc(22 * var(--u));
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: calc(6 * var(--u));
  background: linear-gradient(#34375e, #1e2040);
  cursor: pointer;
  outline: none;
  transform-style: preserve-3d;
  transform: translateZ(calc(33 * var(--u)));
  transition: transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}
.roll.up   { top: calc(23 * var(--u)); }
.roll.down { top: calc(107 * var(--u)); }
/* the key's side: a darker copy just under it, hidden by the face when the key is pressed in */
.roll::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: #110d2c;
  transform: translateZ(calc(-4 * var(--u)));
}
/* the chevron, drawn: a V cut out with clip-path */
.roll::after {
  content: '';
  position: absolute;
  inset: calc(6 * var(--u)) calc(12 * var(--u));
  background: #e8e9f7;
}
.roll.up::after   { clip-path: polygon(0 75%, 50% 0, 100% 75%, 82% 100%, 50% 50%, 18% 100%); }
.roll.down::after { clip-path: polygon(0 25%, 50% 100%, 100% 25%, 82% 0, 50% 50%, 18% 0); }
.roll:active {
  transform: translateZ(calc(29.5 * var(--u)));
  transition-duration: 0.04s;
}
.roll:focus-visible {
  outline: calc(2 * var(--u)) solid #fff;
  outline-offset: calc(2 * var(--u));
}

/* ---- the shackle: a steel U in three layers, the front one narrowest and brightest, so it reads
   as a round bar. Its legs go down into the body; the left one is longer, and stays in ---- */
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
  transform-origin: calc(40 * var(--u)) 0;
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
.u {
  position: absolute;
  border-style: solid;
  border-bottom: 0;
}
.u.back {
  left: calc(32 * var(--u));
  top: calc(-108 * var(--u));
  width: calc(136 * var(--u));
  height: calc(128 * var(--u));
  border-width: calc(16 * var(--u));
  border-color: #4d5374;
  border-radius: calc(68 * var(--u)) calc(68 * var(--u)) 0 0;
  transform: translateZ(calc(-5 * var(--u)));
}
.u.mid {
  left: calc(34.5 * var(--u));
  top: calc(-105.5 * var(--u));
  width: calc(131 * var(--u));
  height: calc(125.5 * var(--u));
  border-width: calc(11 * var(--u));
  border-color: #9ba2c0;
  border-radius: calc(65.5 * var(--u)) calc(65.5 * var(--u)) 0 0;
}
.u.front {
  left: calc(37 * var(--u));
  top: calc(-103 * var(--u));
  width: calc(126 * var(--u));
  height: calc(123 * var(--u));
  border-width: calc(6 * var(--u));
  border-color: #eef0f8;
  border-radius: calc(63 * var(--u)) calc(63 * var(--u)) 0 0;
  transform: translateZ(calc(4 * var(--u)));
}
/* the long leg's lower part: inside the body while shut, the bit that stays in when it opens */
.leg {
  position: absolute;
  left: calc(32 * var(--u));
  top: calc(20 * var(--u));
  width: calc(16 * var(--u));
  height: calc(50 * var(--u));
  background: linear-gradient(90deg, #4d5374, #9ba2c0 30%, #eef0f8 50%, #9ba2c0 70%, #4d5374);
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
