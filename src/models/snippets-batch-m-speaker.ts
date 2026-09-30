import type { Snippet } from './snippet-utils';

/** n lines of markup, one per index, indented. */
const lines = (n: number, fn: (i: number) => string, indent = '      '): string =>
  Array.from({ length: n }, (_, i) => indent + fn(i)).join('\n');

/** Copy-paste version of the Bluetooth speaker (batch-m-speaker.ts): plain HTML + CSS, no JS. */
export const snippetsSpeaker: Record<string, Snippet> = {
  speaker: {
    how: [
      'The body is a cylinder built the easy way, standing up like a can: sixteen strips at <code>rotateY(i × 22.5deg) translateZ(38 units)</code> with a disc on each end. The whole thing is then laid on its side with one <code>rotateZ(90deg)</code>, so the end caps become the left and right ends and the strip at 270° is the top.',
      'The fabric is a <code>repeating</code> dot pattern (a <code>radial-gradient</code> tile) painted on every strip, under a rubber band at each end. Light is computed, not painted: each strip darkens itself with <code>cos()</code> and <code>sin()</code> of its own angle, so the strips facing up and front are brightest and the underside is in shadow.',
      'The buttons and the logo plate are not part of the cylinder. They sit in the same rig, moved out by the radius: the pad with <code>translateY(-radius) rotateX(90deg)</code> onto the top facet, the plate with <code>translateZ(radius)</code> onto the front one, so they ride along with every turn.',
      'The hovered element is a static wrapper and everything that moves has <code>pointer-events: none</code>, so the hover never flickers. Hover or focus eases the tilt to a pose that looks down at the buttons, and a teal copy of the dots on each strip fades in and pulses, opacity only.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the speaker is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="speaker" tabindex="0" role="img" aria-label="Portable Bluetooth speaker that turns to show its buttons on hover or focus">
    <div class="tilt">
      <div class="rig">
        <i class="shadow"></i>
        <div class="body">
${lines(16, (i) => `<i style="--i:${i}"></i>`, '          ')}
          <b class="cap cap-r"></b><b class="cap cap-l"></b>
        </div>
        <div class="pad"><b class="key key-minus"></b><b class="key key-play"></b><b class="key key-plus"></b></div>
        <b class="logo">C3D</b>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the speaker is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.5vmin;
  perspective: calc(800 * var(--u));
}

/* the static hit area: it never moves, so the hover cannot flicker at its edges */
.speaker {
  --r: 38;   /* the body's radius, in units */
  --len: 130; /* the body's length, in units */
  --fabric: color-mix(in srgb, #8b6cff 28%, #2a2c3e);
  --rubber: #1b1c28;
  --rubber-hi: #33354a;
  --metal: #b8bdd2;
  --glow: #2ee6d6;
  display: grid;
  place-items: center;
  width: calc(170 * var(--u));
  height: calc(120 * var(--u));
  border-radius: calc(12 * var(--u));
  cursor: pointer;
  outline: none;
  transform-style: preserve-3d;
}

.speaker:focus-visible {
  outline: calc(2 * var(--u)) solid #8b6cff;
  outline-offset: calc(2 * var(--u));
}

/* the pose: a little from above and from the right at rest; hovered, it looks down at the top */
.tilt {
  width: 0;
  height: 0;
  pointer-events: none;
  transform-style: preserve-3d;
  transform: rotateX(-18deg) rotateY(-24deg);
  transition: transform 1.1s cubic-bezier(0.45, 0, 0.2, 1);
}

.speaker:hover .tilt,
.speaker:focus-visible .tilt,
.speaker:focus-within .tilt {
  transform: rotateX(-34deg) rotateY(16deg);
}

/* 0 × 0: every part is placed around this point, the middle of the body */
.rig {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: sway 9s ease-in-out infinite alternate;
}

.shadow {
  position: absolute;
  left: calc(-82 * var(--u));
  top: calc(-34 * var(--u));
  width: calc(164 * var(--u));
  height: calc(68 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.42), transparent);
  transform: translateY(calc((var(--r) + 3) * var(--u))) rotateX(90deg);
}

/* --- the body: built standing (axis Y), then laid on its side --- */
.body {
  position: absolute;
  transform-style: preserve-3d;
  transform: rotateZ(90deg);
}

/* 16 strips, radius 38 units: each side of the 16-gon is 15.1 units, drawn a hair wider (no seams) */
.body > i {
  --a: calc(var(--i) * 22.5deg);
  position: absolute;
  left: calc(-7.8 * var(--u));
  top: calc(var(--len) / -2 * var(--u));
  width: calc(15.6 * var(--u));
  height: calc(var(--len) * var(--u));
  backface-visibility: hidden;
  background:
    /* a rubber band at each end, over the fabric */
    linear-gradient(var(--rubber-hi) 0 calc(1 * var(--u)), var(--rubber) calc(1 * var(--u)) calc(9 * var(--u)), var(--rubber-hi) calc(9 * var(--u)) calc(10 * var(--u)), transparent calc(10 * var(--u)) calc(100% - 10 * var(--u)), var(--rubber-hi) calc(100% - 10 * var(--u)) calc(100% - 9 * var(--u)), var(--rubber) calc(100% - 9 * var(--u)) calc(100% - 1 * var(--u)), var(--rubber-hi) calc(100% - 1 * var(--u))),
    /* the weave: one dark dot per 4.4-unit tile */
    radial-gradient(circle, rgb(0 0 0 / 0.55) 0 calc(1.3 * var(--u)), transparent calc(1.7 * var(--u))) 0 0 / calc(4.4 * var(--u)) calc(4.4 * var(--u)),
    var(--fabric);
  transform: rotateY(var(--a)) translateZ(calc(var(--r) * var(--u)));
}

/* the pulse: a teal copy of the dots, off at rest, breathing on hover. Its own layer, so only
   opacity changes */
.body > i::before {
  content: '';
  position: absolute;
  inset: calc(10 * var(--u)) 0;
  background: radial-gradient(circle, var(--glow) 0 calc(1.3 * var(--u)), transparent calc(1.7 * var(--u))) 0 0 / calc(4.4 * var(--u)) calc(4.4 * var(--u));
  opacity: 0;
  transition: opacity 0.6s;
}

/* the light: laid down, strip a faces (0, sin a, cos a), and the lamp is up and in front, so the
   strips near 315deg (up-front) get no shade and the underside and back get most of it */
.body > i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgb(0 0 0 / calc(0.45 - 0.3 * (cos(var(--a)) - sin(var(--a)))));
}

.speaker:hover .body > i::before,
.speaker:focus-visible .body > i::before,
.speaker:focus-within .body > i::before {
  animation: pulse 1.4s ease-in-out infinite alternate;
}

/* the end caps: centred on the end, then laid flat facing outward; a passive radiator in each */
.cap {
  position: absolute;
  left: calc(var(--r) * -1 * var(--u));
  top: calc(var(--r) * -1 * var(--u));
  width: calc(var(--r) * 2 * var(--u));
  height: calc(var(--r) * 2 * var(--u));
  border-radius: 50%;
  backface-visibility: hidden;
  background:
    radial-gradient(circle at 42% 38%, #eef0fa 0 calc(2 * var(--u)), transparent calc(7 * var(--u))),
    radial-gradient(circle, #3a3d5a 0 38%, #14151f 40% 44%, var(--metal) 45% 47%, #2a2c3c 48% 52%, var(--rubber) 54% 90%, var(--rubber-hi) 92% 100%);
}

.cap-r { transform: rotateX(90deg) translateZ(calc(var(--len) / 2 * var(--u))); }
.cap-l { transform: rotateX(-90deg) translateZ(calc(var(--len) / 2 * var(--u))); }

/* --- the button pad, lying on the top facet --- */
.pad {
  position: absolute;
  left: calc(-27 * var(--u));
  top: calc(-7 * var(--u));
  width: calc(54 * var(--u));
  height: calc(14 * var(--u));
  border-radius: calc(7 * var(--u));
  background: linear-gradient(var(--rubber-hi), var(--rubber) 30% 70%, #101119);
  transform-style: preserve-3d;
  transform: translateY(calc((var(--r) + 0.4) * -1 * var(--u))) rotateX(90deg);
}

.key {
  position: absolute;
  top: calc(2 * var(--u));
  width: calc(10 * var(--u));
  height: calc(10 * var(--u));
  border-radius: 50%;
  transform: translateZ(calc(1.5 * var(--u)));
}

/* − and +: a light bar, and two crossed bars, on a dark key */
.key-minus {
  left: calc(6 * var(--u));
  background:
    linear-gradient(var(--metal) 0 0) 50% 50% / calc(5 * var(--u)) calc(1.2 * var(--u)) no-repeat,
    radial-gradient(circle at 40% 35%, #454864, #22233a 70%);
}

.key-plus {
  right: calc(6 * var(--u));
  background:
    linear-gradient(var(--metal) 0 0) 50% 50% / calc(5 * var(--u)) calc(1.2 * var(--u)) no-repeat,
    linear-gradient(var(--metal) 0 0) 50% 50% / calc(1.2 * var(--u)) calc(5 * var(--u)) no-repeat,
    radial-gradient(circle at 40% 35%, #454864, #22233a 70%);
}

/* play: a teal ring, lit on hover */
.key-play {
  left: calc(22 * var(--u));
  background:
    radial-gradient(circle, transparent 0 calc(2.6 * var(--u)), var(--glow) calc(3 * var(--u)) calc(4 * var(--u)), transparent calc(4.4 * var(--u))),
    radial-gradient(circle at 40% 35%, #454864, #22233a 70%);
}

.key-play::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: 0 0 calc(5 * var(--u)) var(--glow);
  opacity: 0;
  transition: opacity 0.6s;
}

.speaker:hover .key-play::after,
.speaker:focus-visible .key-play::after,
.speaker:focus-within .key-play::after {
  opacity: 0.8;
}

/* --- the logo plate, on the front facet; dark, so its letters read whatever the stage is --- */
.logo {
  position: absolute;
  left: calc(-15 * var(--u));
  top: calc(-5.5 * var(--u));
  width: calc(30 * var(--u));
  height: calc(11 * var(--u));
  box-sizing: border-box;
  border: calc(0.8 * var(--u)) solid #8b6cff;
  border-radius: calc(3 * var(--u));
  display: grid;
  place-items: center;
  font: 800 calc(6.5 * var(--u)) / 1 Inter, system-ui, sans-serif;
  letter-spacing: calc(0.6 * var(--u));
  color: #fff;
  background: #14151f;
  backface-visibility: hidden;
  transform: translateZ(calc((var(--r) + 0.4) * var(--u)));
}

/* a slow idle sway, symmetrical, so every moment of it is a whole pose */
@keyframes sway {
  from { transform: rotateY(-5deg); }
  to   { transform: rotateY(5deg); }
}

@keyframes pulse {
  from { opacity: 0.12; }
  to   { opacity: 0.5; }
}`,
  },
};
