import type { Snippet } from './snippet-utils';

/** Copy-paste versions of batch N. */
export const snippetsN: Record<string, Snippet> = {
  gamepad: {
    how: [
      'The body is not one shape: a controller is a wide centre plus two tilted grips. Three rounded rectangles in one flat <code>.layer</code> draw that silhouette, and they overlap into a single outline because they all use the same colour.',
      'Thickness is that layer repeated six times, 2.3px apart in Z (<code>--i</code> drives the <code>translateZ</code>). Seen at this angle each step moves less than a pixel sideways, so the stack reads as one solid wall instead of a staircase.',
      'Only the top copy is lit, and it is lit with <code>inset</code> shadows rather than a gradient: an inset shadow follows each shape\'s own rounded outline, so where a grip overlaps the body the shading reads as a moulded seam.',
      'The four buttons are the only things that take the pointer — the body has <code>pointer-events: none</code>. Each button is a static hit area; the cap inside it is what presses, and it ignores the pointer, so the press cannot flicker at the cap\'s edge.',
      'The buttons sit 30px apart and are 26px across, so no two hit areas touch. Coplanar elements in 3D have no reliable hit-test order, and overlapping them would make which button you press a lottery.',
    ],
    html: `<div class="scene">
  <div class="gamepad">
    <div class="pad">
      <i class="shadow"></i>
      <div class="layer" style="--i:5"><i class="body"></i><i class="grip left"></i><i class="grip right"></i></div>
      <div class="layer" style="--i:4"><i class="body"></i><i class="grip left"></i><i class="grip right"></i></div>
      <div class="layer" style="--i:3"><i class="body"></i><i class="grip left"></i><i class="grip right"></i></div>
      <div class="layer" style="--i:2"><i class="body"></i><i class="grip left"></i><i class="grip right"></i></div>
      <div class="layer" style="--i:1"><i class="body"></i><i class="grip left"></i><i class="grip right"></i></div>
      <div class="layer top" style="--i:0"><i class="body"></i><i class="grip left"></i><i class="grip right"></i></div>
      <div class="deck">
        <i class="sheen"></i>
        <i class="well" style="top:30px;left:58px"></i>
        <i class="well" style="top:74px;left:69px"></i>
        <i class="well" style="top:74px;left:117px"></i>
        <div class="dpad" style="top:30px;left:58px"></div>
        <div class="stick" style="top:74px;left:69px"><i></i><i></i><i></i></div>
        <div class="stick" style="top:74px;left:117px"><i></i><i></i><i></i></div>
        <i class="mark" style="top:14px;left:93px"></i>
        <button type="button" class="btn" style="top:9px;left:128px" aria-label="Button Y"><i class="cap" style="--c:#ffb547"></i></button>
        <button type="button" class="btn" style="top:30px;left:149px" aria-label="Button B"><i class="cap" style="--c:#ff4d9d"></i></button>
        <button type="button" class="btn" style="top:51px;left:128px" aria-label="Button A"><i class="cap" style="--c:#2ee6d6"></i></button>
        <button type="button" class="btn" style="top:30px;left:107px" aria-label="Button X"><i class="cap" style="--c:#8b6cff"></i></button>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.gamepad {
  --top: #332e66;
  --side: #1b1735;
  --well: #0b0d18;
  display: grid;
  place-items: center;
  width: 210px;
  height: 168px;
  transform-style: preserve-3d;
}

/* the pose and a slow sway; everything inside ignores the pointer */
.pad {
  position: relative;
  width: 184px;
  height: 118px;
  pointer-events: none;
  transform-style: preserve-3d;
  animation: sway 7s ease-in-out infinite alternate;
}

@keyframes sway {
  from { transform: rotateX(46deg) rotateY(-13deg) rotateZ(2deg); }
  to   { transform: rotateX(42deg) rotateY(-2deg) rotateZ(-2deg); }
}

.shadow {
  position: absolute;
  inset: 22px -10px -18px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.5), transparent);
  transform: translateZ(-30px);
}

/* One slice of the extrusion. Deliberately NOT preserve-3d: its three shapes are
   flattened into the slice's own plane, which is exactly what a slice is. */
.layer {
  position: absolute;
  inset: 0;
  transform: translateZ(calc(var(--i) * -2.3px));
}

.layer > i {
  position: absolute;
  background: var(--side);
}

.body  { top: 0; left: 24px; width: 138px; height: 82px; border-radius: 32px 32px 30px 30px; }
.grip  { top: 28px; width: 62px; height: 90px; border-radius: 28px 24px 26px 26px; }
.left  { left: 0; transform: rotate(15deg); }
.right { right: 0; transform: rotate(-15deg); }

/* the lit top copy: inset shadows follow each rounded outline, a gradient would not */
.layer.top > i {
  background: var(--top);
  box-shadow:
    inset 0 4px 9px rgb(255 255 255 / 0.18),
    inset 0 -16px 22px rgb(0 0 0 / 0.38);
}

.deck {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translateZ(0.6px);
}

/* closest-side: the highlight is fully faded out by the nearest edge of its own
   box, so it can never show up as a rectangle over the body */
.sheen {
  position: absolute;
  top: 4px;
  left: 34px;
  width: 118px;
  height: 62px;
  background: radial-gradient(closest-side, rgb(255 255 255 / 0.2), transparent);
}

/* every control is placed by its centre: the negative margin does that */
.well, .stick, .dpad, .btn {
  position: absolute;
  transform-style: preserve-3d;
}

.well {
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 30%, #1b2038, var(--well) 70%);
  box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.75), 0 0 0 1px rgb(255 255 255 / 0.06);
}

/* a stick is three discs at three heights: floor, post, thumb pad */
.stick { width: 30px; height: 30px; margin: -15px 0 0 -15px; }
.stick i { position: absolute; inset: 0; border-radius: 50%; }
.stick i:nth-child(1) { inset: 6px; background: #06070e; transform: translateZ(3px); }
.stick i:nth-child(2) {
  background:
    radial-gradient(circle at 34% 26%, rgb(255 255 255 / 0.45), transparent 58%),
    linear-gradient(#2a3152, #10142a);
  box-shadow: 0 0 0 1px rgb(46 230 214 / 0.45);
  transform: translateZ(9px);
}
.stick i:nth-child(3) { /* the dished top */
  inset: 7px;
  border: 2px solid rgb(0 0 0 / 0.45);
  transform: translateZ(9.6px);
}

.dpad {
  width: 34px;
  height: 34px;
  margin: -17px 0 0 -17px;
  clip-path: polygon(35% 0, 65% 0, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0 65%, 0 35%, 35% 35%);
  background:
    radial-gradient(circle at 42% 30%, rgb(255 255 255 / 0.4), transparent 62%),
    linear-gradient(#5b649b, #262d55);
  transform: translateZ(7px);
}

/* the hit area: static, and the only thing on the pad that takes the pointer */
.btn {
  width: 26px;
  height: 26px;
  margin: -13px 0 0 -13px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  pointer-events: auto;
  cursor: pointer;
  appearance: none;
}

.btn::before { /* the socket the cap sinks into */
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--well);
  box-shadow: inset 0 1px 3px rgb(0 0 0 / 0.8);
}

.cap {
  position: absolute;
  inset: 3.5px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.55), transparent 62%),
    linear-gradient(var(--c), color-mix(in srgb, var(--c) 55%, #000));
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35);
  pointer-events: none;
  transform: translateZ(5.5px);
  transition: transform 0.16s cubic-bezier(0.3, 0, 0.2, 1);
}

.btn:hover .cap,
.btn:focus-visible .cap,
.btn:active .cap {
  transform: translateZ(0.5px);
}

.mark {
  position: absolute;
  width: 26px;
  height: 7px;
  margin: -3.5px 0 0 -13px;
  border-radius: 4px;
  background: linear-gradient(90deg, #2ee6d6, #8b6cff);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.3);
  transform: translateZ(2px);
}`,
  },

  ticket: {
    how: [
      'Each half is real card stock: four full-size copies of the outline 1.2px apart in Z, centred on the half\'s plane. Together they give the paper a 3.6px edge that stays a clean line from any angle.',
      'The printed side sits on top at <code>translateZ(2.4px)</code> and the plain back at <code>rotateY(180deg) translateZ(2.4px)</code>. Both hide their backface, so each shows only while it faces you.',
      'The stub hinges on the perforation: <code>transform-origin: 0 50%</code> at its left edge. Translating first and rotating after means the lift happens in world space and the swing happens about the hinge.',
      'The perforation is one element per half — a <code>repeating-linear-gradient</code> of dark dashes — so the tear line has two matching rows of holes, as a real ticket does.',
      'The light on the fold is a fixed diagonal gradient that only changes <code>opacity</code>. Nothing repaints a gradient mid-animation: the sheen appears to sweep because the stub turns underneath it.',
    ],
    html: `<div class="scene">
  <div class="ticket" tabindex="0">
    <div class="float">
      <i class="shadow"></i>
      <div class="half main">
        <i class="slab" style="--i:0"></i><i class="slab" style="--i:1"></i><i class="slab" style="--i:2"></i><i class="slab" style="--i:3"></i>
        <i class="back"></i>
        <div class="front"><strong>LUMEN<br>LIVE</strong><small>Sat 12 Jul &middot; 20:00</small><b></b></div>
        <i class="perf"></i>
        <i class="glow"></i>
      </div>
      <div class="half stub">
        <i class="slab" style="--i:0"></i><i class="slab" style="--i:1"></i><i class="slab" style="--i:2"></i><i class="slab" style="--i:3"></i>
        <i class="back"></i>
        <div class="front"><em>ADMIT ONE</em><i>24</i></div>
        <i class="perf"></i>
        <i class="sheen"></i>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.ticket {
  --paper: #f4f1fb;
  display: grid;
  place-items: center;
  width: 216px;
  height: 154px;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  transform-style: preserve-3d;
}

.float {
  position: relative;
  width: 190px;
  height: 86px;
  pointer-events: none; /* the hit area is the static wrapper, never the ticket */
  transform-style: preserve-3d;
  animation: float 7s ease-in-out infinite alternate;
}

@keyframes float {
  from { transform: translateY(2px) rotateX(16deg) rotateY(-16deg) rotateZ(-3deg); }
  to   { transform: translateY(-2px) rotateX(10deg) rotateY(-4deg) rotateZ(1deg); }
}

.shadow {
  position: absolute;
  inset: 12px -8px -18px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.42), transparent);
  transform: translateZ(-34px);
}

.half { position: absolute; top: 0; height: 86px; transform-style: preserve-3d; }
.main { left: 0; width: 132px; }
.stub {
  left: 132px;
  width: 58px;
  transform-origin: 0 50%; /* the perforation line */
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.3, 1);
}

/* the paper core: four copies of the outline, 1.2px apart */
.slab {
  position: absolute;
  inset: 0;
  border-radius: 5px;
  background: var(--paper);
  transform: translateZ(calc((var(--i) - 1.5) * 1.2px));
}

.back, .front {
  position: absolute;
  inset: 0;
  border-radius: 5px;
  backface-visibility: hidden; /* no mirrored print once the stub turns past side-on */
}

.back {
  background: linear-gradient(var(--paper), color-mix(in srgb, var(--paper) 82%, #8b6cff));
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
  transform: rotateY(180deg) translateZ(2.4px);
}

.front {
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden; /* a leaf layer: it has no 3D children, so clipping flattens nothing */
  color: #fff;
  transform: translateZ(2.4px);
}

.main .front {
  padding: 0 16px;
  background:
    radial-gradient(circle at 92% 8%, rgb(255 77 157 / 0.75), transparent 58%),
    linear-gradient(120deg, #8b6cff, #4f4095);
}

.main strong { font-size: 15px; font-weight: 800; letter-spacing: 1.4px; line-height: 1.1; }
.main small { margin-top: 3px; font-size: 7px; font-weight: 600; letter-spacing: 1.6px; text-transform: uppercase; opacity: 0.8; }
.main b { /* the barcode: one element, a gradient of uneven bars */
  margin-top: 9px;
  width: 78px;
  height: 16px;
  background: repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 3px, #fff 3px 5px, transparent 5px 8px);
  opacity: 0.85;
}

.stub .front {
  align-items: center;
  background: linear-gradient(160deg, #ffbe5d, #ff9661);
  color: #12142a;
}

.stub em {
  font-size: 8.5px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 2.6px;
  text-indent: 2.6px;
  white-space: nowrap;
  transform: rotate(-90deg);
}

.stub .front i { position: absolute; right: 7px; bottom: 6px; font-size: 13px; font-style: normal; font-weight: 800; }

/* the punched line, on the facing edge of each half */
.perf {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 2px;
  background: repeating-linear-gradient(rgb(0 0 0 / 0.55) 0 3px, transparent 3px 8px);
  transform: translateZ(2.5px);
}

.main .perf { right: 2px; }
.stub .perf { left: 2px; }

/* the light on the fold: only its opacity ever changes */
.sheen {
  position: absolute;
  inset: 0;
  border-radius: 5px;
  background: linear-gradient(104deg, transparent 12%, rgb(255 255 255 / 0.85) 46%, rgb(255 255 255 / 0.15) 62%, transparent 82%);
  opacity: 0;
  transform: translateZ(2.6px);
  transition: opacity 0.45s ease;
}

/* the warm line along the torn edge of the main half */
.glow {
  position: absolute;
  top: 3px;
  right: 0;
  bottom: 3px;
  width: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, transparent, #ffc063);
  opacity: 0;
  transform: translateZ(2.55px);
  transition: opacity 0.45s ease;
}

/* translate first (world space), then hinge: the stub lifts away and swings open */
.ticket:hover .stub,
.ticket:focus-visible .stub {
  transform: translate3d(4px, -6px, 10px) rotateY(-38deg) rotateZ(-6deg);
  transition: transform 0.55s cubic-bezier(0.3, 1.25, 0.5, 1);
}

.ticket:hover .sheen,
.ticket:focus-visible .sheen,
.ticket:hover .glow,
.ticket:focus-visible .glow {
  opacity: 1;
}`,
  },

  shoppingbag: {
    how: [
      'The bag is a box: front and back at <code>translateZ(±21px)</code>, the two sides turned <code>rotateY(±90deg)</code> and pushed out half the width, and the bottom laid flat with <code>rotateX(-90deg)</code>.',
      'A handle is one element — a rounded box with only its top border drawn is a clean arc. The front one sits on the front panel\'s plane, the back one on the back panel\'s, so they hang where the paper would be folded over them.',
      'The folded rim is a band hinged on the bag\'s top edge (<code>transform-origin: 50% 0</code>) and tipped out 14°. It catches a different amount of light than the panel below it, which is what makes the top read as double thickness.',
      'The creases are part of the paper: a <code>repeating-linear-gradient</code> of faint vertical lines over a top-to-bottom shade, so a flat rectangle looks like something that has been folded before.',
      'The swing is a pendulum — <code>rotateZ</code> around a point 30px above the bag, where a hand would hold the handles. It lives on its own wrapper, outside the 3D pose, so the bag turns in space while the swing stays in the screen plane.',
    ],
    html: `<div class="scene">
  <div class="shoppingbag">
    <div class="swing">
      <div class="bag">
        <i class="shadow"></i>
        <i class="panel back"></i>
        <i class="panel side left"></i>
        <i class="panel side right"></i>
        <i class="panel bottom"></i>
        <i class="handle back-handle"></i>
        <div class="panel front"><i class="mark"></i><span class="name">LUMEN</span></div>
        <i class="lip back-lip"></i>
        <i class="lip front-lip"></i>
        <i class="handle front-handle"></i>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.shoppingbag {
  --paper: #5646a2;
  --paper-lit: #8276ba;
  --paper-side: #342b63;
  display: grid;
  place-items: center;
  width: 200px;
  height: 186px;
  font-family: system-ui, sans-serif;
  transform-style: preserve-3d;
}

/* the pendulum: its pivot is above the bag, where the hand would be */
.swing {
  position: relative;
  width: 84px;
  height: 96px;
  transform-origin: 50% -30px;
  transform-style: preserve-3d;
  animation: swing 4.4s ease-in-out infinite alternate;
}

@keyframes swing {
  from { transform: rotateZ(-3.5deg); }
  to   { transform: rotateZ(3.5deg); }
}

/* the 3D pose, kept off the swing so the two never fight over transform */
.bag {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateX(6deg) rotateY(-28deg);
}

.shadow {
  position: absolute;
  inset: auto -22px -26px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.4), transparent);
  transform: translateZ(-60px);
}

.panel {
  position: absolute;
  background:
    repeating-linear-gradient(90deg, transparent 0 13px, rgb(0 0 0 / 0.07) 13px 14px),
    linear-gradient(var(--paper-lit), var(--paper) 42%, #3e3275);
}

.front, .back { top: 0; left: 0; width: 84px; height: 96px; }

.front {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 5px;
  transform: translateZ(21px);
}

.back { transform: rotateY(180deg) translateZ(21px); }

.side {
  top: 0;
  left: 21px;
  width: 42px;
  height: 96px;
  background: linear-gradient(var(--paper-side), #1f1a3b);
}

.left  { transform: rotateY(-90deg) translateZ(42px); }
.right { transform: rotateY(90deg) translateZ(42px); }

/* laid flat and pushed down to the bottom edge, like the base of a box */
.bottom {
  top: 27px;
  left: 0;
  width: 84px;
  height: 42px;
  background: #1d1836;
  transform: rotateX(-90deg) translateZ(48px);
}

/* the folded rim, hinged on the bag's top edge */
.lip {
  position: absolute;
  top: 0;
  left: 0;
  width: 84px;
  height: 12px;
  background: linear-gradient(#9b91c8, var(--paper-lit));
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.28);
  transform-origin: 50% 0;
}

.front-lip { transform: translateZ(21px) rotateX(14deg); }
.back-lip  { transform: rotateY(180deg) translateZ(21px) rotateX(14deg); }

/* a rounded box with only its top border drawn: the arc of a handle */
.handle {
  position: absolute;
  top: -26px;
  left: 20px;
  width: 44px;
  height: 30px;
  box-sizing: border-box;
  border: 3px solid #ffb547;
  border-bottom: 0;
  border-radius: 22px 22px 0 0 / 26px 26px 0 0;
}

.front-handle { transform: translateZ(21px); }
.back-handle  { border-color: #996d2b; transform: translateZ(-21px); }

.mark {
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  border: 2.5px solid #fff;
  border-radius: 50% 50% 50% 4px;
  opacity: 0.9;
  transform: rotate(-45deg);
}

.name {
  color: #fff;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 3px;
  text-indent: 3px;
  opacity: 0.92;
}`,
  },

  lamp: {
    how: [
      'The shade is a truncated cone made of fourteen trapezoids. Each stands on the mouth circle (<code>rotateY(i × 25.714deg) translateZ(31px)</code>), is hinged on its bottom edge, and leans in by <code>atan((31 − 12) / 33) = 29.93deg</code> — that exact angle is what makes their narrow ends meet on a smaller circle instead of crossing.',
      'A <code>clip-path</code> turns each rectangle into the trapezoid: the top edge is 12/31 of the bottom one, so it starts at 30.6% and ends at 69.4% across the box.',
      'Anything horizontal — the desk, the light pool, the base, the mouth of the shade — is a disc turned <code>rotateX(90deg)</code>. Turning the whole scene instead of each part is the same as moving the camera: the lamp stays upright in its own world.',
      'A rod is two planes crossing along its length (the second is a <code>::before</code> at <code>rotateY(90deg)</code>), so whichever way the scene turns, one of them faces you and a 7px bar never collapses into an invisible line.',
      'The light warms and cools without animating a colour: every glowing part exists twice, warm and cool, and the two cross-fade on <code>opacity</code>. Animating a gradient or a <code>filter</code> would repaint every frame; two opacities do not.',
    ],
    html: `<div class="scene">
  <div class="lamp">
    <div class="world">
      <i class="desk"></i>
      <i class="pool warm"></i>
      <i class="pool cool"></i>
      <i class="base" style="--i:0"></i><i class="base" style="--i:1"></i><i class="base" style="--i:2"></i>
      <i class="rod post"></i>
      <i class="rod arm"></i>
      <i class="joint"></i>
      <i class="beam warm"></i>
      <i class="beam cool"></i>
      <div class="shade">
        <i class="strip" style="--i:0;--lit:100%"></i><i class="strip" style="--i:1;--lit:86%"></i>
        <i class="strip" style="--i:2;--lit:71%"></i><i class="strip" style="--i:3;--lit:57%"></i>
        <i class="strip" style="--i:4;--lit:43%"></i><i class="strip" style="--i:5;--lit:29%"></i>
        <i class="strip" style="--i:6;--lit:14%"></i><i class="strip" style="--i:7;--lit:0%"></i>
        <i class="strip" style="--i:8;--lit:14%"></i><i class="strip" style="--i:9;--lit:29%"></i>
        <i class="strip" style="--i:10;--lit:43%"></i><i class="strip" style="--i:11;--lit:57%"></i>
        <i class="strip" style="--i:12;--lit:71%"></i><i class="strip" style="--i:13;--lit:86%"></i>
        <i class="cap"></i>
        <i class="mouth warm"></i>
        <i class="mouth cool"></i>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.lamp {
  --metal: #272049;
  --metal-lit: #4a3e8d;
  --warm: #ffb547;
  --cool: #2ee6d6;
  display: grid;
  place-items: center;
  width: 216px;
  height: 186px;
  transform-style: preserve-3d;
}

/* turning the whole scene is the same as moving the camera */
.world {
  position: relative;
  width: 180px;
  height: 152px;
  transform-style: preserve-3d;
  transform: rotateX(18deg) rotateY(-14deg);
}

/* the desk: a flat disc, so the pool has a surface to fall on */
.desk {
  position: absolute;
  top: 42px;
  left: 0;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(closest-side, #372c65, transparent 86%);
  transform: rotateX(90deg);
}

.pool {
  position: absolute;
  top: 54px;
  left: 12px;
  width: 156px;
  height: 156px;
  border-radius: 50%;
  transform: rotateX(90deg) translateZ(-1px); /* a hair above the desk, never z-fighting */
  animation: glow 9s ease-in-out infinite;
}

.pool.warm { background: radial-gradient(closest-side, rgb(255 181 71 / 0.88), rgb(255 181 71 / 0.3) 52%, transparent); }
.pool.cool { background: radial-gradient(closest-side, rgb(46 230 214 / 0.72), rgb(46 230 214 / 0.24) 52%, transparent); animation-name: glow-cool; }

/* three discs 2px apart: the base has a rim you can see */
.base {
  position: absolute;
  top: 98px;
  left: 14px;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 34%, var(--metal-lit), var(--metal) 76%);
  transform: rotateX(90deg) translateZ(calc(var(--i) * 2px));
}

/* a rod is two planes crossing along its length */
.rod {
  position: absolute;
  width: 7px;
  background: linear-gradient(90deg, var(--metal), #6e65a4 45%, var(--metal));
  transform-origin: 50% 100%;
  transform-style: preserve-3d;
}

.rod::before {
  content: '';
  position: absolute;
  inset: 0;
  background: inherit;
  transform: rotateY(90deg);
}

.post { top: 36px; left: 45px; height: 96px; transform: translateZ(4px) rotateZ(15deg); }
.arm  { top: 13px; left: 70px; height: 30px; transform: translateZ(4px) rotateZ(68deg); }

.joint {
  position: absolute;
  top: 36px;
  left: 66px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 32%, var(--metal-lit), var(--metal) 78%);
  transform: translateZ(4px);
}

.shade {
  position: absolute;
  top: 32px;
  left: 92.9px; /* 100px minus half a strip */
  width: 14.15px;
  height: 33px;
  transform-style: preserve-3d;
  transform: translateZ(4px);
}

/* the trapezoid: narrow edge = 12/31 of the wide one, so it spans 30.6%..69.4% */
.strip {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 14.15px;
  height: 38.08px; /* the slant: hypot(33, 31 - 12) */
  clip-path: polygon(30.6% 0, 69.4% 0, 100% 100%, 0 100%);
  background: linear-gradient(
    color-mix(in srgb, var(--metal-lit) var(--lit), var(--metal)),
    color-mix(in srgb, var(--metal-lit) var(--lit), #05060c)
  );
  transform-origin: 50% 100%;
  transform: rotateY(calc(var(--i) * 25.714deg)) translateZ(31px) rotateX(29.93deg);
}

/* the cap closing the narrow top */
.cap {
  position: absolute;
  top: -12px;
  left: calc(50% - 12px);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 34%, var(--metal-lit), var(--metal) 80%);
  transform: rotateX(90deg);
}

/* the lit mouth: what tells you the lamp is on */
.mouth {
  position: absolute;
  top: calc(100% - 31px);
  left: calc(50% - 31px);
  width: 62px;
  height: 62px;
  border-radius: 50%;
  transform: rotateX(90deg);
  animation: fade 9s ease-in-out infinite;
}

.mouth.warm { background: radial-gradient(circle, #ffbb56, rgb(255 181 71 / 0.72) 70%, transparent); }
.mouth.cool { background: radial-gradient(circle, #43e9da, rgb(46 230 214 / 0.62) 70%, transparent); animation-name: fade-cool; }

/* the beam: a soft trapezoid from the mouth down to the pool */
.beam {
  position: absolute;
  top: 65px;
  left: 35px;
  width: 130px;
  height: 68px;
  clip-path: polygon(26% 0, 74% 0, 100% 100%, 0 100%);
  transform: translateZ(4px);
  animation: fade 9s ease-in-out infinite;
}

.beam.warm { background: linear-gradient(rgb(255 181 71 / 0.32), transparent 84%); }
.beam.cool { background: linear-gradient(rgb(46 230 214 / 0.26), transparent 84%); animation-name: fade-cool; }

/* one slow breath in two halves; each ends where it started, so there is no seam */
@keyframes glow {
  0%, 100% { opacity: 1; transform: rotateX(90deg) translateZ(-1px) scale(1); }
  50%      { opacity: 0.12; transform: rotateX(90deg) translateZ(-1px) scale(0.88); }
}

@keyframes glow-cool {
  0%, 100% { opacity: 0.08; transform: rotateX(90deg) translateZ(-1px) scale(0.88); }
  50%      { opacity: 1; transform: rotateX(90deg) translateZ(-1px) scale(1); }
}

@keyframes fade {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.12; }
}

@keyframes fade-cool {
  0%, 100% { opacity: 0.08; }
  50%      { opacity: 1; }
}`,
  },

  wallet: {
    how: [
      'Nothing is clipped. The pocket is two slabs of leather at different depths and the cards live in the gap between them; a card is hidden only because the front slab is nearer the camera. <code>overflow: hidden</code> would have flattened the whole 3D scene.',
      'Front and back are three and two copies of the same rounded rectangle, 2px apart in Z, so the leather has a thickness you can see. The topmost copy carries the stitching and the mark, which keeps the edge below one unbroken line.',
      'Each card sits 2px behind the one in front of it, so they never z-fight. On hover each slides further up than the one behind and turns around <code>transform-origin: 50% 190%</code> — a pivot below the wallet — which is what spreads them into a fan instead of just leaning them.',
      'A <code>transition-delay</code> of <code>i × 0.045s</code> makes them leave one after another, and a slightly overshooting easing lands them like real cards.',
      'The wallet itself never moves: the hover is on a static wrapper and the cards have <code>pointer-events: none</code>, so the fan can never pull the wallet out from under the pointer.',
    ],
    html: `<div class="scene">
  <div class="wallet" tabindex="0">
    <div class="float">
      <i class="shadow"></i>
      <i class="back" style="--i:0"></i><i class="back" style="--i:1"></i>
      <i class="card" style="--i:0;--c:#2ee6d6"><b></b><i></i></i>
      <i class="card" style="--i:1;--c:#ffb547"><b></b><i></i></i>
      <i class="card" style="--i:2;--c:#ff4d9d"><b></b><i></i></i>
      <i class="card" style="--i:3;--c:#8b6cff"><b></b><i></i></i>
      <i class="front" style="--i:0"></i><i class="front" style="--i:1"></i><i class="front" style="--i:2"></i>
      <div class="detail"><i class="stitch"></i><i class="mark"></i></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.wallet {
  --leather: #342756;
  --leather-lit: #604b95;
  display: grid;
  place-items: center;
  width: 214px;
  height: 188px;
  cursor: pointer;
  transform-style: preserve-3d;
}

.float {
  position: relative;
  width: 124px;
  height: 82px;
  margin-top: 38px; /* the cards rise above the pocket, so it sits low in the frame */
  pointer-events: none;
  transform-style: preserve-3d;
  animation: float 7s ease-in-out infinite alternate;
}

@keyframes float {
  from { transform: rotateX(14deg) rotateY(-13deg) rotateZ(-2deg); }
  to   { transform: rotateX(8deg) rotateY(6deg) rotateZ(2deg); }
}

.shadow {
  position: absolute;
  inset: 24px -12px -16px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.45), transparent);
  transform: translateZ(-40px);
}

/* two slabs of leather behind the cards */
.back {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: linear-gradient(160deg, var(--leather-lit), var(--leather) 60%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
  transform: translateZ(calc(-10px + var(--i) * 2px));
}

.card {
  position: absolute;
  left: calc(50% - 49px);
  bottom: 4px;
  width: 98px;
  height: 60px;
  border-radius: 7px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--c) 92%, #fff), var(--c) 45%, color-mix(in srgb, var(--c) 55%, #0b0d18));
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.28), 0 4px 10px rgb(0 0 0 / 0.35);
  transform-origin: 50% 190%; /* the pivot below the wallet that turns a slide into a fan */
  transform: translateZ(calc(-4px + var(--i) * 2px));
  transition: transform 0.55s cubic-bezier(0.4, 0, 0.25, 1);
}

.card b { /* the chip */
  position: absolute;
  top: 12px;
  left: 12px;
  width: 20px;
  height: 15px;
  border-radius: 3px;
  background:
    linear-gradient(90deg, transparent 30%, rgb(0 0 0 / 0.3) 30% 34%, transparent 34% 66%, rgb(0 0 0 / 0.3) 66% 70%, transparent 70%),
    linear-gradient(135deg, #ffe9b0, #d9a441 60%, #a3711d);
}

.card i { /* the dark band where a real card has its signature strip */
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 13px;
  height: 7px;
  border-radius: 4px;
  background: rgb(0 0 0 / 0.32);
}

/* three slabs of leather in front; the top one carries the stitching */
.front {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 124px;
  height: 60px;
  border-radius: 8px 8px 10px 10px;
  background: linear-gradient(200deg, var(--leather-lit), var(--leather) 55%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.22);
  transform: translateZ(calc(8px + var(--i) * 2px));
}

.detail {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 124px;
  height: 60px;
  transform: translateZ(12.1px); /* on the face of the top slab, never inside it */
}

.stitch {
  position: absolute;
  inset: 6px;
  border: 1.2px dashed rgb(255 181 71 / 0.38);
  border-radius: 5px;
}

.mark {
  position: absolute;
  right: 14px;
  bottom: 13px;
  width: 15px;
  height: 15px;
  border-radius: 5px;
  background: linear-gradient(135deg, rgb(255 255 255 / 0.5), rgb(255 255 255 / 0.06));
  box-shadow: 0 1px 1px rgb(0 0 0 / 0.4);
  transform: rotate(45deg);
}

.wallet:hover .card,
.wallet:focus-visible .card {
  transform: translate3d(calc((var(--i) - 1.5) * 11px), calc(-46px - var(--i) * 7px), calc(-4px + var(--i) * 2px))
    rotate(calc((var(--i) - 1.5) * 9.5deg));
  transition-timing-function: cubic-bezier(0.25, 1.15, 0.4, 1);
  transition-delay: calc(var(--i) * 0.045s);
}`,
  },
};
