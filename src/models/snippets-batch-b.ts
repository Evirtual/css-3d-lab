import type { Snippet } from './snippet-utils';

/** Copy-paste versions of the "Products & branding" demos (batch-b.ts). */
export const snippetsB: Record<string, Snippet> = {
  phone: {
    how: [
      'The screen and the back are two panels at <code>translateZ(±depth / 2)</code>. The back is turned with <code>rotateY(180deg)</code> and both hide their backface, so each is only drawn while it faces you.',
      'Four thin walls close the sides. Each one only covers the <b>straight</b> part of its edge: it is inset by the corner radius, because a flat plane cannot follow a rounded corner.',
      'The corners are filled by nine rounded slabs, one base unit apart, stacked through the body. From any angle their edges overlap into a solid rounded rim.',
      'Every length is a multiple of that one unit, <code>--u</code>, so the phone — screen type included — is the same share of a gallery card, the editor and a recording canvas.',
      'The turn uses <code>alternate</code> with <code>ease-in-out</code>: it lingers on the front view and on the back view, and it is seamless without matching start and end.',
    ],
    html: `<div class="scene">
  <div class="phone">
    <i class="slab" style="--i:0"></i><i class="slab" style="--i:1"></i><i class="slab" style="--i:2"></i>
    <i class="slab" style="--i:3"></i><i class="slab" style="--i:4"></i><i class="slab" style="--i:5"></i>
    <i class="slab" style="--i:6"></i><i class="slab" style="--i:7"></i><i class="slab" style="--i:8"></i>
    <i class="wall wall-l"></i><i class="wall wall-r"></i>
    <i class="wall wall-t"></i><i class="wall wall-b"></i>
    <div class="front">
      <div class="screen">
        <span class="notch"></span>
        <strong>9:41</strong><small>Friday 18</small>
        <div class="widget"><i></i><i></i><i></i></div>
        <div class="dock"><i></i><i></i><i></i></div>
      </div>
    </div>
    <div class="back"><i></i><b></b></div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the phone is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.36vmin;
  perspective: calc(800 * var(--u));
}

/* 84 × 168, 10 thick, 15 corner radius */
.phone {
  --metal: #5a607f;
  --shine: color-mix(in srgb, #eceefb 60%, var(--metal));
  position: relative;
  width: calc(84 * var(--u));
  height: calc(168 * var(--u));
  transform-style: preserve-3d;
  animation: turn 7s ease-in-out infinite alternate;
}

/* nine rounded slabs, one unit apart, fill the body so the corners look solid */
.slab {
  position: absolute;
  inset: calc(0.5 * var(--u));
  border-radius: calc(15 * var(--u));
  background: var(--metal);
  transform: translateZ(calc((var(--i) - 4) * var(--u)));
}

/* walls cover only the straight part of each edge: inset by the radius */
.wall {
  position: absolute;
  background: linear-gradient(90deg, var(--metal), var(--shine) 50%, var(--metal));
}

.wall-l,
.wall-r {
  left: calc(50% - 5 * var(--u));
  top: calc(15 * var(--u));
  width: calc(10 * var(--u));
  height: calc(138 * var(--u));
}

.wall-t,
.wall-b {
  left: calc(15 * var(--u));
  top: calc(50% - 5 * var(--u));
  width: calc(54 * var(--u));
  height: calc(10 * var(--u));
  background: linear-gradient(var(--metal), var(--shine) 50%, var(--metal));
}

.wall-l { transform: rotateY(-90deg) translateZ(calc(42 * var(--u))); } /* half the width */
.wall-r { transform: rotateY(90deg) translateZ(calc(42 * var(--u))); }
.wall-t { transform: rotateX(90deg) translateZ(calc(84 * var(--u))); }  /* half the height */
.wall-b { transform: rotateX(-90deg) translateZ(calc(84 * var(--u))); }

.front,
.back {
  position: absolute;
  inset: 0;
  border-radius: calc(15 * var(--u));
  backface-visibility: hidden;
}

.front {
  padding: calc(4 * var(--u)); /* the bezel */
  background: #05060c;
  transform: translateZ(calc(5 * var(--u))); /* half the thickness */
}

.screen {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  height: 100%;
  padding: calc(18 * var(--u)) calc(7 * var(--u)) calc(7 * var(--u));
  overflow: hidden;
  border-radius: calc(11 * var(--u));
  background:
    radial-gradient(circle at 80% 8%, rgb(255 181 71 / 0.8), transparent 45%),
    linear-gradient(165deg, #8b6cff, #ff4d9d 70%, #ffb547 120%);
  color: #fff;
}

.screen strong {
  font-size: calc(21 * var(--u));
  font-weight: 800;
  line-height: 1;
  letter-spacing: calc(-0.5 * var(--u));
}

.screen small { margin-top: calc(2 * var(--u)); font-size: calc(8 * var(--u)); opacity: 0.85; }

.notch {
  position: absolute;
  top: calc(5 * var(--u));
  left: calc(50% - 12 * var(--u));
  width: calc(24 * var(--u));
  height: calc(6 * var(--u));
  border-radius: calc(3 * var(--u));
  background: #05060c;
}

.widget {
  display: grid;
  gap: calc(4 * var(--u));
  box-sizing: border-box;
  width: 100%;
  margin-top: calc(12 * var(--u));
  padding: calc(7 * var(--u));
  border: calc(1 * var(--u)) solid rgb(255 255 255 / 0.35);
  border-radius: calc(8 * var(--u));
  background: rgb(255 255 255 / 0.18);
}

.widget i { height: calc(4 * var(--u)); border-radius: calc(2 * var(--u)); background: rgb(255 255 255 / 0.85); }
.widget i:nth-child(2) { width: 70%; opacity: 0.6; }
.widget i:nth-child(3) { width: 45%; opacity: 0.6; }

.dock {
  display: flex;
  gap: calc(5 * var(--u));
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  margin-top: auto;
  padding: calc(5 * var(--u));
  border-radius: calc(9 * var(--u));
  background: rgb(255 255 255 / 0.2);
}

.dock i { width: calc(13 * var(--u)); height: calc(13 * var(--u)); border-radius: calc(4 * var(--u)); background: rgb(255 255 255 / 0.9); }
.dock i:nth-child(2) { background: #2ee6d6; }
.dock i:nth-child(3) { background: #05060c; }

.back {
  /* an inner line plus a soft shade instead of a hard border: turning, the back passes
     side-on, where a one-unit line breaks up; the shade survives */
  box-shadow:
    inset 0 0 0 calc(1 * var(--u)) rgb(236 238 251 / 0.25),
    inset 0 0 calc(8 * var(--u)) rgb(236 238 251 / 0.1);
  background:
    linear-gradient(125deg, transparent 40%, rgb(255 255 255 / 0.14) 50%, transparent 60%),
    linear-gradient(160deg, #5546a2, #26254f);
  transform: rotateY(180deg) translateZ(calc(5 * var(--u)));
}

/* camera island with two lenses */
.back i {
  position: absolute;
  top: calc(9 * var(--u));
  left: calc(9 * var(--u));
  width: calc(30 * var(--u));
  height: calc(30 * var(--u));
  border-radius: calc(9 * var(--u));
  background:
    radial-gradient(circle at calc(9 * var(--u)) calc(9 * var(--u)), #4a5078 0 calc(2 * var(--u)), #05060c calc(2.5 * var(--u)) calc(6 * var(--u)), transparent calc(6.5 * var(--u))),
    radial-gradient(circle at calc(21 * var(--u)) calc(21 * var(--u)), #4a5078 0 calc(2 * var(--u)), #05060c calc(2.5 * var(--u)) calc(6 * var(--u)), transparent calc(6.5 * var(--u))),
    #2f2957;
}

/* logo */
.back b {
  position: absolute;
  top: calc(50% - 8 * var(--u));
  left: calc(50% - 8 * var(--u));
  box-sizing: border-box;
  width: calc(16 * var(--u));
  height: calc(16 * var(--u));
  border: calc(3 * var(--u)) solid rgb(255 255 255 / 0.55);
  border-radius: 50%;
}

/* 215° = 180° + 35°: the back, seen from the mirrored angle */
@keyframes turn {
  from { transform: rotateX(-8deg) rotateY(-35deg); }
  to   { transform: rotateX(-8deg) rotateY(215deg); }
}`,
  },

  paycard: {
    how: [
      'JS turns the pointer position into four numbers and writes them as custom properties: <code>--rx</code> / <code>--ry</code> for the tilt, <code>--gx</code> / <code>--gy</code> for the glare. CSS does everything else.',
      'The glare is one radial gradient on a layer the size of the card, and the pointer only moves <b>where its circle is centred</b>. <code>--gx</code> / <code>--gy</code> are registered with <code>@property</code> as numbers, so they interpolate: the glide back to rest is a transition on two numbers, and the layer never grows past the card.',
      '<code>overflow: hidden</code> would flatten the 3D card, so only the flat face clips (the glare lives inside it). The chip and the text are siblings lifted with <code>translateZ(14px)</code>, so they parallax.',
      'One transition, two speeds: fast while the pointer is over the card (<code>.is-live</code>), slow and springy when it leaves, which is the glide back to rest.',
      'A gentle idle sway sits on the <b>wrapper</b>, the tilt on the card inside, so the two never fight over <code>transform</code>.',
    ],
    html: `<div class="scene">
  <div class="paycard">
    <div class="card">
      <i class="shadow"></i>
      <div class="face"><i class="glare"></i></div>
      <span class="chip"></span>
      <span class="brand"><i></i><i></i></span>
      <span class="num">•••• •••• •••• 4242</span>
      <span class="name">ALEX MORGAN</span>
      <span class="exp">09/29</span>
    </div>
  </div>
</div>`,
    css: `/* the bright spot's centre, as two plain numbers. Registering them makes them interpolate,
   so the glare glides back to rest on a transition like any length would */
@property --gx { syntax: '<number>'; inherits: true; initial-value: -14; }
@property --gy { syntax: '<number>'; inherits: true; initial-value: -16; }

/* the scene is the whole canvas, so the pointer is tracked everywhere and the card is centred */
.scene {
  /* one base unit: every length below is a multiple of it, so the card is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.4vmin;
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
  perspective: calc(800 * var(--u));
  touch-action: none;
}

.paycard {
  width: calc(196 * var(--u));
  height: calc(124 * var(--u));
  transform-style: preserve-3d;
  animation: idle 6s ease-in-out infinite alternate;
}

.card {
  position: relative;
  width: 100%;
  height: 100%;
  color: #fff;
  font-family: system-ui, sans-serif;
  transform-style: preserve-3d;
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  /* the tilt and the glare's centre glide together, so one duration drives both */
  transition:
    transform 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2),
    --gx 0.6s ease-out,
    --gy 0.6s ease-out;
}

.card.is-live {
  transition-duration: 0.12s;
  transition-timing-function: ease-out;
}

/* embossed details float above the surface */
.card > span {
  position: absolute;
  transform: translateZ(calc(14 * var(--u)));
  pointer-events: none;
}

.shadow {
  position: absolute;
  inset: calc(6 * var(--u)) calc(-4 * var(--u)) calc(-14 * var(--u));
  background: radial-gradient(ellipse at center, rgb(0 0 0 / 0.55), transparent 68%);
  transform: translateZ(calc(-40 * var(--u)));
}

/* only this flat layer clips; clipping the card itself would flatten it */
.face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border: calc(1 * var(--u)) solid rgb(255 255 255 / 0.28);
  border-radius: calc(14 * var(--u));
  background:
    radial-gradient(circle at 0% 100%, rgb(46 230 214 / 0.7), transparent 55%),
    radial-gradient(circle at 100% 0%, rgb(255 77 157 / 0.85), transparent 60%),
    linear-gradient(135deg, #8b6cff, #453880);
}

/* exactly the card: only the circle's centre walks, from one edge to the other */
.glare {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at calc(50% + var(--gx) * 2%) calc(50% + var(--gy) * 2%),
    rgb(255 255 255 / 0.6), rgb(255 255 255 / 0.12) 56%, transparent 96%);
}

.chip {
  top: calc(34 * var(--u));
  left: calc(18 * var(--u));
  width: calc(32 * var(--u));
  height: calc(24 * var(--u));
  border-radius: calc(5 * var(--u));
  background:
    linear-gradient(90deg, transparent 31%, rgb(0 0 0 / 0.35) 31% 34%, transparent 34% 66%, rgb(0 0 0 / 0.35) 66% 69%, transparent 69%),
    linear-gradient(transparent 46%, rgb(0 0 0 / 0.35) 46% 54%, transparent 54%),
    linear-gradient(135deg, #ffe9b0, #ffb547 55%, #b97a1c);
}

.brand {
  top: calc(14 * var(--u));
  right: calc(16 * var(--u));
  width: calc(40 * var(--u));
  height: calc(24 * var(--u));
}

.brand i {
  position: absolute;
  top: 0;
  box-sizing: border-box;
  width: calc(24 * var(--u));
  height: calc(24 * var(--u));
  border: calc(4 * var(--u)) solid #fff;
  border-radius: 50%;
}

.brand i:first-child { left: 0; }
.brand i:last-child { right: 0; border-color: #2ee6d6; }

.num {
  left: calc(18 * var(--u));
  bottom: calc(36 * var(--u));
  font: 600 calc(13 * var(--u))/1 ui-monospace, Consolas, monospace;
  letter-spacing: calc(1.5 * var(--u));
  text-shadow: 0 calc(1 * var(--u)) calc(2 * var(--u)) rgb(0 0 0 / 0.45);
  white-space: nowrap;
}

.name,
.exp {
  bottom: calc(15 * var(--u));
  font-size: calc(9 * var(--u));
  font-weight: 700;
  letter-spacing: calc(1.2 * var(--u));
  opacity: 0.85;
}

.name { left: calc(18 * var(--u)); }
.exp { right: calc(18 * var(--u)); }

@keyframes idle {
  from { transform: rotateX(7deg) rotateY(-12deg); }
  to   { transform: rotateX(3deg) rotateY(12deg); }
}`,
    js: `const scene = document.querySelector('.scene');
const card = document.querySelector('.card');
const clamp = (v) => Math.min(0.5, Math.max(-0.5, v));

function move(e) {
  const r = scene.getBoundingClientRect();
  // -0.5 … 0.5 across the scene
  const x = clamp((e.clientX - r.left) / r.width - 0.5);
  const y = clamp((e.clientY - r.top) / r.height - 0.5);
  card.style.setProperty('--ry', (x * 44).toFixed(1) + 'deg');
  card.style.setProperty('--rx', (-y * 34).toFixed(1) + 'deg');
  card.style.setProperty('--gx', (x * 50).toFixed(1)); // plain numbers, CSS makes them %
  card.style.setProperty('--gy', (y * 50).toFixed(1));
  card.classList.add('is-live');
}

function leave() {
  card.classList.remove('is-live');
  for (const p of ['--rx', '--ry', '--gx', '--gy']) card.style.removeProperty(p);
}

scene.addEventListener('pointermove', move);
scene.addEventListener('pointerdown', move);
scene.addEventListener('pointerleave', leave);
scene.addEventListener('pointercancel', leave);`,
  },

  package: {
    how: [
      'An open-top box: four walls around the centre and a base laid flat with <code>rotateX(-90deg)</code>, pushed down by half the wall height.',
      'The lid stands <b>above</b> the back wall and is hinged on its bottom edge with <code>transform-origin: 50% 100%</code>. <code>rotateX(-90deg)</code> lays it over the opening; <code>rotateX(24deg)</code> swings it open past vertical.',
      'Two transitions, swapped delays: opening, the lid goes first and the card rises 0.3s later; closing, the card drops first and the lid waits 0.3s. Each state carries the delay for the move <i>into</i> it.',
      'The hovered element is a static wrapper; the box inside has <code>pointer-events: none</code>. A hovered element that moves away from the pointer would flicker.',
    ],
    html: `<div class="scene">
  <div class="package" tabindex="0">
    <div class="box">
      <i class="wall back"></i>
      <i class="wall left"></i>
      <i class="wall right"></i>
      <i class="base"></i>
      <div class="card"><b></b><span>NEW</span></div>
      <i class="wall front"><em>CUBE · 01</em></i>
      <i class="lid"></i>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

/* the static hit area */
.package {
  --card: #4a3e8d;
  --card-dark: #2e2a5e;
  display: grid;
  place-items: center;
  width: 200px;
  height: 186px;
  border-radius: 16px;
  outline-offset: -4px;
  cursor: pointer;
  transform-style: preserve-3d;
}

/* 88 wide, 88 deep, 60 tall */
.box {
  position: relative;
  width: 88px;
  height: 60px;
  pointer-events: none;
  transform-style: preserve-3d;
  animation: sway 5s ease-in-out infinite alternate;
}

.wall {
  position: absolute;
  inset: 0;
  /* an inner line plus a soft shade instead of a hard border: squeezed side-on, a 1px line
     breaks up, the shade survives */
  box-shadow: inset 0 0 0 1px #a893fe, inset 0 0 8px rgb(168 147 254 / 0.18);
  /* a ribbon down the middle */
  background:
    linear-gradient(90deg, transparent 42%, #ff4d9d 42% 58%, transparent 58%),
    linear-gradient(var(--card), var(--card-dark));
}

.front {
  display: grid;
  place-items: end start;
  padding: 6px 7px;
  backface-visibility: hidden; /* from behind you look INTO the box */
  transform: translateZ(44px);
}

.back { transform: rotateY(180deg) translateZ(44px); }
.left { transform: rotateY(-90deg) translateZ(44px); }
.right { transform: rotateY(90deg) translateZ(44px); }

.left,
.right {
  background: linear-gradient(var(--card-dark), #201d42);
}

.front em {
  color: #fff;
  font: normal 800 7px system-ui;
  letter-spacing: 1px;
}

/* an 88 × 88 square centred on the box, laid flat at the bottom edge */
.base {
  position: absolute;
  top: calc(50% - 44px);
  left: 0;
  width: 88px;
  height: 88px;
  background: #1c1938;
  transform: rotateX(-90deg) translateZ(30px);
}

/* stands above the back wall, hinged on its bottom edge = the top-back edge of the box */
.lid {
  position: absolute;
  top: -88px;
  left: 0;
  box-sizing: border-box;
  width: 88px;
  height: 88px;
  box-shadow: inset 0 0 0 1px #a48cff, inset 0 0 8px rgb(164 140 255 / 0.18); /* like the walls */
  background:
    linear-gradient(90deg, transparent 42%, #ff4d9d 42% 58%, transparent 58%),
    linear-gradient(#6e65a4, var(--card));
  transform-origin: 50% 100%;
  transform: translateZ(-44px) rotateX(-90deg);
  transition: transform 0.55s ease-in-out 0.3s; /* closing: wait for the card */
}

.card {
  position: absolute;
  top: 5px;
  left: calc(50% - 31px);
  display: grid;
  place-items: center;
  align-content: center;
  gap: 5px;
  box-sizing: border-box;
  width: 62px;
  height: 52px;
  border: 1px solid rgb(255 255 255 / 0.5);
  border-radius: 8px;
  background: linear-gradient(140deg, #2ee6d6, #8b6cff 60%, #ff4d9d);
  box-shadow: inset 0 0 14px rgb(255 255 255 / 0.25);
  color: #fff;
  font: 900 9px system-ui;
  letter-spacing: 1.5px;
  transition: transform 0.5s ease-in-out;
}

/* the "product": a little gem */
.card b {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: linear-gradient(135deg, #fff, rgb(255 255 255 / 0.35));
  transform: rotate(45deg);
}

.package:hover .lid,
.package:focus-visible .lid {
  transform: translateZ(-44px) rotateX(24deg); /* past vertical, leaning back */
  transition: transform 0.7s cubic-bezier(0.3, 1.35, 0.5, 1);
}

/* opening: the card waits until the lid is out of the way */
.package:hover .card,
.package:focus-visible .card {
  transform: translateY(-64px);
  transition: transform 0.6s cubic-bezier(0.3, 1.3, 0.5, 1) 0.3s;
}

@keyframes sway {
  from { transform: translateY(40px) rotateX(-24deg) rotateY(-38deg); }
  to   { transform: translateY(40px) rotateX(-24deg) rotateY(-22deg); }
}`,
  },

  can: {
    how: [
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, so the can is the same share of a gallery card, the editor and a recording canvas. The numbers below are those units.',
      'Twenty strips are the sides of a regular 20-gon: strip <i>i</i> gets <code>rotateY(i × 18°) translateZ(r)</code>, with <code>r = (width / 2) / tan(180° / 20)</code> ≈ 34.7 units for 11-unit strips.',
      'Every strip carries the <b>whole</b> label (<code>background-size</code> = one lap, 220 units) and shifts it left by its own index: <code>background-position: i × −11</code> units. Neighbours line up, so the artwork wraps without a seam.',
      'The light must not turn with the can. Each strip has a dark overlay that fades in and out over one lap; a negative <code>animation-delay</code> of <code>i × −(8s / 20)</code> starts strip <i>i</i> already at its place on the way round.',
      'Top and bottom are discs centred <b>on</b> the edge and laid flat with <code>rotateX(±90deg)</code>. The white streak is outside the spinning element, so it stays where the lamp is.',
    ],
    html: `<div class="scene">
  <div class="can">
    <div class="spin">
      <i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i><i style="--i:4"></i>
      <i style="--i:5"></i><i style="--i:6"></i><i style="--i:7"></i><i style="--i:8"></i><i style="--i:9"></i>
      <i style="--i:10"></i><i style="--i:11"></i><i style="--i:12"></i><i style="--i:13"></i><i style="--i:14"></i>
      <i style="--i:15"></i><i style="--i:16"></i><i style="--i:17"></i><i style="--i:18"></i><i style="--i:19"></i>
      <b class="top"></b><b class="bottom"></b>
    </div>
    <span class="streak"></span>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the can is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.42vmin;
  perspective: calc(800 * var(--u));
}

.can {
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(-16deg) rotateZ(-9deg);
}

.spin {
  position: relative;
  width: calc(70 * var(--u));
  height: calc(118 * var(--u));
  transform-style: preserve-3d;
  animation: spin 8s linear infinite;
}

.spin > i {
  position: absolute;
  top: 0;
  /* 0.75 units wider than its 11-unit slice on each side, so no seams show. The can is tilted, so
     the seams run at a slant: with less overlap they show as rows of dark dots. */
  left: calc(50% - 6.25 * var(--u));
  width: calc(12.5 * var(--u));
  height: 100%;
  backface-visibility: hidden;
  /* the whole label on every strip, one lap (220 units) long */
  background-image:
    linear-gradient(#e6e9f5 0 3%, #9aa1bd 5%, transparent 5% 95%, #9aa1bd 95%, #e6e9f5 97%),
    radial-gradient(circle at calc(55 * var(--u)) 50%, #ff4d9d 0 calc(8 * var(--u)), #fff calc(8.5 * var(--u)) calc(15 * var(--u)), transparent calc(15.5 * var(--u))),
    radial-gradient(circle at calc(165 * var(--u)) 50%, #2ee6d6 0 calc(8 * var(--u)), #fff calc(8.5 * var(--u)) calc(15 * var(--u)), transparent calc(15.5 * var(--u))),
    linear-gradient(100deg, transparent 0 18%, rgb(255 255 255 / 0.28) 18% 24%, transparent 24% 68%, rgb(255 255 255 / 0.28) 68% 74%, transparent 74%),
    linear-gradient(90deg, #8b6cff, #ff4d9d 50%, #8b6cff); /* same colour at both ends: no seam */
  background-size: calc(220 * var(--u)) 100%;
  /* strip i shows slice i */
  background-position: calc(var(--i) * -11 * var(--u) + 0.75 * var(--u)) 0;
  transform: rotateY(calc(var(--i) * 18deg)) translateZ(calc(34.7 * var(--u)));
}

/* fixed lighting: each strip darkens and brightens once per lap, started i/20 of the way round */
.spin > i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #05060f;
  animation: shade 8s linear infinite;
  animation-delay: calc(var(--i) * -0.4s);
}

.top,
.bottom {
  position: absolute;
  left: 0;
  width: calc(70 * var(--u));
  height: calc(70 * var(--u));
  border-radius: 50%;
}

/* centred on the top edge, then laid flat */
.top {
  top: calc(-35 * var(--u));
  background:
    radial-gradient(ellipse calc(9 * var(--u)) calc(13 * var(--u)) at 50% 68%, #3a3f5c 0 95%, transparent 100%),
    radial-gradient(circle, #cfd3e6 0 52%, #8f96b3 54% 60%, #eef0fa 62% 86%, #a3a9c4 88%);
  transform: rotateX(90deg);
}

.bottom {
  top: calc(100% - 35 * var(--u));
  background: radial-gradient(circle, #6d7391 0 50%, #a3a9c4 52%);
  transform: rotateX(-90deg);
}

/* a specular streak just in front of the surface; it does not spin */
.streak {
  position: absolute;
  top: 9%;
  left: calc(50% - 19 * var(--u));
  width: calc(8 * var(--u));
  height: 82%;
  border-radius: calc(4 * var(--u));
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.55), transparent);
  transform: translateZ(calc(35.7 * var(--u)));
  pointer-events: none;
}

@keyframes spin {
  to { transform: rotateY(360deg); }
}

/* 0% = facing you. Brightest near 330° (lamp front-left); 25–75% faces away and is hidden */
@keyframes shade {
  0%      { opacity: 0.08; }
  6.25%   { opacity: 0.23; }
  12.5%   { opacity: 0.44; }
  25%, 50% { opacity: 0.62; }
  75%     { opacity: 0.34; }
  87.5%   { opacity: 0.04; }
  91.5%   { opacity: 0; }
  100%    { opacity: 0.08; }
}`,
  },

  vinyl: {
    how: [
      'The sleeve is a real sandwich in Z: back board at <code>translateZ(-3px)</code>, record at 0, front board at <code>translateZ(3px)</code>. The record hides behind the front board with no <code>z-index</code> at all.',
      'Sliding out is one transition on the record: <code>translateX(70px)</code>. The whole set turns at the same time, so the open end swings toward you.',
      'The label spins with an animation that starts <code>paused</code>; <code>:hover</code> only flips <code>animation-play-state</code> to <code>running</code>, so it stops where it is instead of snapping back.',
      'The grooves are a <code>repeating-radial-gradient</code>; the reflections are a <code>conic-gradient</code> on the same element that does <b>not</b> spin, like light on a real record.',
    ],
    html: `<div class="scene">
  <div class="vinyl" tabindex="0">
    <div class="set">
      <i class="back"></i>
      <i class="spine"></i>
      <div class="disc"><i class="label"></i></div>
      <div class="front"><b>NIGHT<br>DRIVE</b><span>Side A · 33⅓</span></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

/* static hit area */
.vinyl {
  display: grid;
  place-items: center;
  width: 216px;
  height: 160px;
  border-radius: 16px;
  outline-offset: -4px;
  cursor: pointer;
  transform-style: preserve-3d;
}

.set {
  position: relative;
  width: 120px;
  height: 120px;
  pointer-events: none;
  transform-style: preserve-3d;
  transform: translateX(-8px) rotateX(4deg) rotateY(18deg);
  transition: transform 0.7s cubic-bezier(0.3, 1.2, 0.5, 1);
}

.front,
.back {
  position: absolute;
  inset: 0;
  border-radius: 3px;
}

.back {
  background: #312a5d;
  transform: translateZ(-3px);
}

.front {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  padding: 10px;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 0.22);
  background:
    radial-gradient(circle at 78% 72%, transparent 0 17px, rgb(255 255 255 / 0.9) 17.5px 19px, transparent 19.5px 27px, rgb(255 255 255 / 0.55) 27.5px 29px, transparent 29.5px 38px, rgb(255 255 255 / 0.3) 38.5px 40px, transparent 40.5px),
    radial-gradient(circle at 78% 72%, #ffb547 0 17px, transparent 17.5px),
    linear-gradient(150deg, #8b6cff, #ff4d9d 85%);
  color: #fff;
  font-family: system-ui, sans-serif;
  backface-visibility: hidden;
  transform: translateZ(3px);
}

.front b { font-size: 17px; font-weight: 900; line-height: 0.95; letter-spacing: -0.5px; }
.front span { font-size: 7px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; opacity: 0.85; }

/* closes the left side: centred on the left edge, turned side-on */
.spine {
  position: absolute;
  top: 0;
  left: -3px;
  width: 6px;
  height: 100%;
  background: #5846a3;
  transform: rotateY(90deg);
}

.disc {
  position: absolute;
  inset: 6px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background:
    conic-gradient(from 35deg, transparent 0 6%, rgb(255 255 255 / 0.22) 11%, transparent 17% 56%, rgb(255 255 255 / 0.16) 61%, transparent 67%),
    repeating-radial-gradient(circle, #0c0c12 0 1.5px, #1f1f2a 1.5px 3px);
  transform: translateX(12px);
  transition: transform 0.7s cubic-bezier(0.3, 1.1, 0.5, 1);
}

.label {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background:
    radial-gradient(circle, #0c0c12 0 2.5px, transparent 3px),
    conic-gradient(#ffb547 0 25%, #ff4d9d 0 50%, #ffb547 0 75%, #ff4d9d 0);
  animation: spin 1.8s linear infinite paused;
}

.vinyl:hover .set,
.vinyl:focus-visible .set {
  transform: translateX(-36px) rotateX(6deg) rotateY(-22deg);
}

.vinyl:hover .disc,
.vinyl:focus-visible .disc {
  transform: translateX(70px);
}

.vinyl:hover .label,
.vinyl:focus-visible .label {
  animation-play-state: running;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}`,
  },

  logo3d: {
    how: [
      'The mark is one <code>clip-path: polygon(evenodd, …)</code>. The path runs round the hexagon, jumps in and traces the triangle; with <code>evenodd</code> the area enclosed twice becomes a hole.',
      'Every length is a multiple of one base unit, <code>--u</code>, so the mark is the same share of a gallery card, the editor and a recording canvas.',
      'Fourteen copies of that shape are stacked two units apart with <code>translateZ(calc((var(--i) - 6.5) * 2 * var(--u)))</code>. Seen at an angle their edges overlap into a solid side, and the hole gets inner walls for free.',
      'Each layer lays a dark gradient over the colour, with an alpha that shrinks as <code>--i</code> grows: <code>rgb(6 7 20 / calc(0.6 - var(--i) * 0.033))</code>. The side fades from bright to dark like a lit extrusion.',
      'The front layer is the face. Its shine is a pseudo-element moved with <code>translateX</code> only; the layer’s <code>clip-path</code> clips it to the logo, so it never spills out.',
    ],
    html: `<div class="scene">
  <div class="logo">
    <i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i><i style="--i:4"></i>
    <i style="--i:5"></i><i style="--i:6"></i><i style="--i:7"></i><i style="--i:8"></i><i style="--i:9"></i>
    <i style="--i:10"></i><i style="--i:11"></i><i style="--i:12"></i><i style="--i:13"></i>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the mark is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.48vmin;
  perspective: calc(800 * var(--u));
}

.logo {
  position: relative;
  width: calc(116 * var(--u));
  height: calc(116 * var(--u));
  transform-style: preserve-3d;
  animation: sway 6s ease-in-out infinite alternate;
}

/* soft glow far behind the mark */
.logo::before {
  content: '';
  position: absolute;
  inset: calc(-26 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(139 108 255 / 0.38), transparent);
  transform: translateZ(calc(-60 * var(--u)));
}

.logo > i {
  /* back layers darker */
  --shade: calc(0.6 - var(--i) * 0.033);
  position: absolute;
  inset: 0;
  /* hexagon, then a jump in to trace the "play" triangle: evenodd makes it a hole */
  clip-path: polygon(evenodd,
    50% 0, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%, 50% 0,
    39% 31%, 71% 50%, 39% 69%, 39% 31%);
  background:
    linear-gradient(rgb(6 7 20 / var(--shade)), rgb(6 7 20 / var(--shade))),
    linear-gradient(135deg, #8b6cff, #ff4d9d);
  /* 14 layers, 2 units apart, centred on the middle */
  transform: translateZ(calc((var(--i) - 6.5) * 2 * var(--u)));
}

/* the front layer is the face */
.logo > i:last-child {
  background:
    radial-gradient(circle at 30% 18%, rgb(255 255 255 / 0.45), transparent 45%),
    linear-gradient(135deg, #a28aff, #ff4d9d 70%, #ffb547);
}

/* the shine: clipped by the layer's clip-path, moved with transform only */
.logo > i:last-child::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgb(255 255 255 / 0.7) 50%, transparent 65%);
  transform: translateX(-100%);
  animation: shine 4s ease-in-out infinite;
}

@keyframes sway {
  from { transform: rotateX(-10deg) rotateY(-40deg); }
  to   { transform: rotateX(-4deg) rotateY(40deg); }
}

/* both ends are off the logo, so the jump back is never seen */
@keyframes shine {
  0%, 45%   { transform: translateX(-100%); }
  80%, 100% { transform: translateX(100%); }
}`,
  },

  badge: {
    how: [
      'Build it the way a real medal hangs: two ribbon <b>straps</b> meet in a folded <b>tab</b>, and the medal has its own ring (the <b>bail</b>) whose top loop sits just behind the tab. Ribbon and medal read as one object.',
      'The whole piece sways from the neck: <code>transform-origin: 50% 0</code> on a wrapper and a small <code>rotateZ</code> swing, <code>alternate</code>.',
      'The medal twists on its ring between <code>rotateY(-50deg)</code> and <code>rotateY(50deg)</code>, never edge-on, while the bail stays flat: as a child of the medal it runs the <b>opposite</b> twist, which cancels it, so it never swings through the ribbon.',
      'The edge is five discs 1.2px apart behind the face, so a turned medal shows a band of metal. The shine runs on the same 5s cycle as the twist, so each sweep is centred on the moment the face looks at you.',
    ],
    html: `<div class="scene">
  <div class="badge">
    <div class="swing">
      <i class="strap"></i><i class="strap"></i>
      <div class="medal">
        <i class="bail"></i>
        <u style="--i:0"></u><u style="--i:1"></u><u style="--i:2"></u><u style="--i:3"></u><u style="--i:4"></u>
        <div class="face"><b></b><small>WINNER</small><em></em></div>
      </div>
      <i class="tab"></i>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.badge {
  --gold: #ffd28f;
  --gold-deep: #aa7519;
  position: relative;
  width: 120px;
  height: 196px;
  transform-style: preserve-3d;
}

/* sways from the top, like something hanging from a neck */
.swing {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform-origin: 50% 0;
  animation: sway 2.5s ease-in-out infinite alternate;
}

/* two straps pinned at the tab, splayed toward the neck, slightly behind everything */
.strap {
  position: absolute;
  top: 0;
  left: calc(50% - 12px);
  width: 24px;
  height: 92px;
  background:
    linear-gradient(90deg, rgb(0 0 0 / 0.28), transparent 30% 70%, rgb(0 0 0 / 0.28)),
    linear-gradient(90deg, #8b6cff 0 30%, #fff 30% 36%, #ff4d9d 36% 64%, #fff 64% 70%, #8b6cff 70%);
  transform-origin: 50% 100%;
  transform: translateX(-7px) translateZ(-3px) rotate(-20deg);
}

.strap + .strap {
  transform: translateX(7px) translateZ(-2px) rotate(20deg);
}

/* the folded end of the ribbon, in front of the bail so the bail looks looped through it */
.tab {
  position: absolute;
  top: 80px;
  left: calc(50% - 19px);
  width: 38px;
  height: 14px;
  border-radius: 3px;
  background:
    linear-gradient(rgb(255 255 255 / 0.25), transparent 40%, rgb(0 0 0 / 0.3)),
    linear-gradient(90deg, #8b6cff, #ff4d9d 50%, #8b6cff);
  box-shadow: 0 2px 4px rgb(0 0 0 / 0.35);
  transform: translateZ(2px);
}

.medal {
  position: absolute;
  top: 100px;
  left: calc(50% - 48px);
  width: 96px;
  height: 96px;
  transform-style: preserve-3d;
  animation: twist 5s ease-in-out infinite alternate;
}

/* the edge: five discs 1.2px apart */
.medal u {
  position: absolute;
  inset: 0.5px;
  border-radius: 50%;
  background: linear-gradient(90deg, var(--gold-deep), var(--gold) 50%, var(--gold-deep));
  transform: translateZ(calc((var(--i) - 2) * 1.2px));
}

/* the bail hangs flat from the tab while the medal turns on it: as the medal's child it runs
   the opposite twist with the same timing, which cancels it (turning with the medal would swing
   it through the tab and show a hard cut) */
.bail {
  position: absolute;
  top: -16px;
  left: calc(50% - 9px);
  width: 18px;
  height: 20px;
  box-sizing: border-box;
  border: 3px solid var(--gold);
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px var(--gold-deep), 0 0 0 1px var(--gold-deep);
  animation: untwist 5s ease-in-out infinite alternate;
}

.face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 2px;
  overflow: hidden; /* fine: the face itself is flat */
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 26%, rgb(255 255 255 / 0.55), transparent 42%),
    conic-gradient(from 20deg, var(--gold), var(--gold-deep), var(--gold), #c89445, var(--gold));
  box-shadow:
    inset 0 0 0 4px #ffe3b8,
    inset 0 0 0 6px var(--gold-deep),
    inset 0 0 0 12px rgb(170 117 25 / 0.25);
  color: #5a3a10;
  font-family: system-ui, sans-serif;
  transform: translateZ(3px);
}

.face b {
  width: 40px;
  height: 40px;
  clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
  background: linear-gradient(160deg, #fff8de, var(--gold) 45%, var(--gold-deep));
}

.face small {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 2px;
}

/* one sweep per twist, centred on the moment the face looks straight at you */
.face em {
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 38%, rgb(255 255 255 / 0.7) 50%, transparent 62%);
  transform: translateX(-120%);
  animation: shine 5s linear infinite;
}

@keyframes sway {
  from { transform: rotateZ(-3deg); }
  to   { transform: rotateZ(3deg); }
}

@keyframes twist {
  from { transform: rotateY(-50deg); }
  to   { transform: rotateY(50deg); }
}

@keyframes untwist {
  from { transform: rotateY(50deg); }
  to   { transform: rotateY(-50deg); }
}

@keyframes shine {
  0%, 35%   { transform: translateX(-120%); }
  65%, 100% { transform: translateX(120%); }
}`,
  },

  watch: {
    how: [
      'Once a second JS writes <code>--h</code>, <code>--m</code>, <code>--s</code> as angles. Each hand stands on the centre (<code>bottom: 50%</code>), turns about its foot and reads its own variable.',
      'The angles count from midnight, so they only ever grow: at 59 → 0 seconds the hand keeps going forward instead of sweeping back.',
      'The digits need no DOM writes: JS also sets two integers, <code>counter-reset: hh var(--hh) mm var(--mm)</code> turns them into counters and <code>content: counter(hh, decimal-leading-zero)</code> prints 09:05.',
      'The case is seven rounded slabs 1.5px apart (they make the rounded sides), with the face and back at <code>±5px</code>. The straps are hinged on the case edge with <code>transform-origin</code> and tilted away with <code>rotateX</code>.',
    ],
    html: `<div class="scene">
  <div class="watch">
    <div class="body">
      <i class="strap top"></i><i class="strap bottom"></i>
      <i class="slab" style="--i:0"></i><i class="slab" style="--i:1"></i><i class="slab" style="--i:2"></i>
      <i class="slab mid" style="--i:3"></i>
      <i class="slab" style="--i:4"></i><i class="slab" style="--i:5"></i><i class="slab" style="--i:6"></i>
      <i class="crown"></i>
      <div class="back"></div>
      <div class="face">
        <div class="dial"><i class="hand h"></i><i class="hand m"></i><i class="hand s"></i></div>
        <div class="time"></div>
        <small>live time</small>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.watch {
  --metal: #5a607f;
  --band: #6550ba;
  transform-style: preserve-3d;
  animation: sway 7s ease-in-out infinite alternate;
}

/* 88 × 104, 10px thick, 24px corners */
.body {
  position: relative;
  width: 88px;
  height: 104px;
  transform-style: preserve-3d;
}

/* hinged on the back edge of the case, then tilted away round an invisible wrist */
.strap {
  position: absolute;
  left: 16px;
  width: 56px;
  height: 44px;
  background:
    linear-gradient(90deg, rgb(0 0 0 / 0.35), transparent 22% 78%, rgb(0 0 0 / 0.35)),
    var(--band);
}

.strap.top {
  bottom: 100%;
  border-radius: 10px 10px 0 0;
  transform-origin: 50% 100%;
  transform: translateZ(-4px) rotateX(38deg);
}

.strap.bottom {
  top: 100%;
  border-radius: 0 0 10px 10px;
  background:
    radial-gradient(circle, rgb(0 0 0 / 0.45) 0 2px, transparent 2.5px) 50% 8px / 100% 10px repeat-y,
    linear-gradient(90deg, rgb(0 0 0 / 0.35), transparent 22% 78%, rgb(0 0 0 / 0.35)),
    var(--band);
  transform-origin: 50% 0;
  transform: translateZ(-4px) rotateX(-38deg);
}

/* rounded slabs fill the case, corners included */
.slab {
  position: absolute;
  inset: 0.5px;
  border-radius: 24px;
  background: var(--metal);
  transform: translateZ(calc((var(--i) - 3) * 1.5px));
}

.slab.mid {
  background: color-mix(in srgb, #eceefb 45%, var(--metal)); /* a polished band */
}

/* ribbed crown plate, plus its end face turned side-on */
.crown {
  position: absolute;
  top: 30px;
  left: calc(100% - 3px);
  width: 7px;
  height: 20px;
  border-radius: 2px;
  background: repeating-linear-gradient(var(--metal) 0 1.5px, #a3a7bd 1.5px 3px);
  transform-style: preserve-3d;
  transform: translateZ(0.75px);
}

.crown::before {
  content: '';
  position: absolute;
  top: 0;
  left: calc(100% - 4px);
  width: 8px;
  height: 100%;
  border-radius: 2px;
  background: inherit;
  transform: rotateY(90deg);
}

.back,
.face {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border-radius: 24px;
  backface-visibility: hidden;
}

.back {
  background:
    radial-gradient(circle, #05060c 0 10px, #1e8c85 11px 13px, transparent 14px),
    radial-gradient(circle, #868ba4 0 30px, var(--metal) 31px);
  transform: rotateY(180deg) translateZ(5px);
}

/* black glass, the border is the bezel */
.face {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 9px 6px 6px;
  overflow: hidden;
  border: 5px solid #05060c;
  background: radial-gradient(circle at 50% 30%, #231c42, #05060c 70%);
  color: #fff;
  font-family: system-ui, sans-serif;
  transform: translateZ(5px);
}

.face::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(125deg, rgb(255 255 255 / 0.16), transparent 38%);
}

.face small {
  margin-top: 1px;
  color: #2ee6d6;
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
}

/* 12 ticks from a repeating conic gradient, a dark disc on top, an activity arc behind */
.dial {
  position: relative;
  flex: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background:
    radial-gradient(circle, #0b0d18 0 19px, transparent 19.5px),
    repeating-conic-gradient(from -1.5deg, rgb(255 255 255 / 0.85) 0 3deg, transparent 3deg 30deg),
    conic-gradient(#ff4d9d 0 68%, rgb(255 77 157 / 0.25) 0);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.12);
}

.dial::after {
  content: '';
  position: absolute;
  top: calc(50% - 2.5px);
  left: calc(50% - 2.5px);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #2ee6d6;
}

/* stands on the centre, turns about its foot */
.hand {
  position: absolute;
  bottom: 50%;
  border-radius: 2px;
  background: #fff;
  transform-origin: 50% 100%;
}

.hand.h { left: calc(50% - 1.5px); width: 3px; height: 12px; transform: rotate(var(--h, 300deg)); }
.hand.m { left: calc(50% - 1px); width: 2px; height: 18px; transform: rotate(var(--m, 54deg)); }
.hand.s { left: calc(50% - 0.5px); width: 1px; height: 21px; background: #2ee6d6; transform: rotate(var(--s, 180deg)); }

/* two integers from JS become counters; decimal-leading-zero pads them */
.time {
  margin-top: 5px;
  counter-reset: hh var(--hh, 10) mm var(--mm, 9);
  font: 700 15px/1 ui-monospace, Consolas, monospace;
  letter-spacing: -0.5px;
}

.time::before {
  content: counter(hh, decimal-leading-zero) ':' counter(mm, decimal-leading-zero);
}

@keyframes sway {
  from { transform: rotateX(10deg) rotateY(-30deg); }
  to   { transform: rotateX(6deg) rotateY(30deg); }
}`,
    js: `const watch = document.querySelector('.watch');

function tick() {
  const d = new Date();
  // seconds since midnight: the angles only grow, so no hand sweeps backwards at 59 → 0
  const t = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  watch.style.setProperty('--s', t * 6 + 'deg');
  watch.style.setProperty('--m', (t / 10).toFixed(1) + 'deg');
  watch.style.setProperty('--h', (t / 120).toFixed(2) + 'deg');
  // integers for the digital readout (CSS counters)
  watch.style.setProperty('--hh', d.getHours());
  watch.style.setProperty('--mm', d.getMinutes());
}

tick();
setInterval(tick, 1000);`,
  },

  turntable: {
    how: [
      'The speaker is a box, not a cube: every face gets its own width and height, turns outward and steps out by <b>half the dimension it faces</b> (front by depth / 2, sides by width / 2, top by height / 2).',
      'JS tracks one number. On <code>pointerdown</code> it captures the pointer, each <code>pointermove</code> adds the sideways delta to the angle and writes it as <code>--ry</code>; CSS does the rotating.',
      'On release it keeps the last delta as a velocity and runs a short <code>requestAnimationFrame</code> loop that loses 6% per frame and <b>stops itself</b> once the speed is tiny: inertia without a loop running forever.',
      '<code>touch-action: pan-y</code> gives sideways drags to the viewer and leaves vertical swipes to the page. The swatches just set <code>--c</code>, and every face mixes its colour from it.',
    ],
    html: `<div class="viewer">
  <div class="view" tabindex="0" aria-label="Speaker. Drag sideways or use the arrow keys to rotate it">
    <div class="product">
      <i class="f front"><b></b><b></b></i>
      <i class="f back"></i>
      <i class="f left"></i>
      <i class="f right"></i>
      <i class="f top"></i>
      <i class="f bottom"></i>
      <i class="shadow"></i>
    </div>
  </div>
  <div class="controls">
    <output class="caption">drag to rotate</output>
    <div class="row">
      <button type="button" data-c="#8b6cff" style="--sw:#8b6cff" aria-label="Violet" aria-pressed="true"></button>
      <button type="button" data-c="#2ee6d6" style="--sw:#2ee6d6" aria-label="Teal" aria-pressed="false"></button>
      <button type="button" data-c="#ff4d9d" style="--sw:#ff4d9d" aria-label="Pink" aria-pressed="false"></button>
    </div>
  </div>
</div>`,
    css: `.viewer {
  /* one base unit: every length below is a multiple of it, so the speaker is the same share of
     a card, the editor, a full screen and a recording canvas. The control row under it is in
     plain vmin, because it is the same object in every model. */
  --u: 0.22vmin;
  --c: #8b6cff;
  display: grid;
  justify-items: center;
  gap: 4vmin; /* the band's gap between the model and the control zone */
  font-family: system-ui, sans-serif;
}

/* the model box: the same height in every model that has controls, so the zone below it lands
   in the same place whatever the model is */
.view {
  box-sizing: border-box;
  display: grid;
  place-items: center;
  height: 44vmin;
  /* the round shadow hangs below the box: the room for it keeps the speaker centred */
  padding-bottom: calc(26 * var(--u));
  border-radius: calc(14 * var(--u));
  outline-offset: calc(-4 * var(--u));
  perspective: calc(1200 * var(--u)); /* a camera well back, so the verticals stay upright */
  cursor: grab;
  user-select: none;
  touch-action: pan-y; /* sideways drags are ours, vertical ones scroll the page */
}

.view.is-dragging {
  cursor: grabbing;
}

/* 86 units wide, 124 tall, 72 deep. No transition: JS sets a new angle every frame */
.product {
  position: relative;
  width: calc(86 * var(--u));
  height: calc(124 * var(--u));
  pointer-events: none;
  transform-style: preserve-3d;
  transform: rotateX(-14deg) rotateY(var(--ry, -32deg));
}

.f {
  position: absolute;
  box-sizing: border-box;
  border: calc(1 * var(--u)) solid color-mix(in srgb, var(--c) 55%, #fff);
  /* a transparent line outside the border: the turned face's hard outer edge stays invisible,
     so the light edge line is smoothed instead of stair-stepping */
  outline: calc(1 * var(--u)) solid transparent;
  /* woven fabric: a fine dot grid over a light falloff */
  background:
    radial-gradient(rgb(0 0 0 / 0.22) calc(0.7 * var(--u)), transparent calc(1.2 * var(--u))) 0 0 / calc(4 * var(--u)) calc(4 * var(--u)),
    linear-gradient(color-mix(in srgb, var(--c) 85%, #fff), color-mix(in srgb, var(--c) 70%, #0b0d18));
}

.front,
.back {
  inset: 0;
}

.front {
  display: grid;
  place-items: center;
  align-content: space-evenly;
  transform: translateZ(calc(36 * var(--u))); /* depth / 2 */
}

.back {
  background:
    radial-gradient(circle at 50% 72%, #05060c 0 calc(9 * var(--u)), color-mix(in srgb, var(--c) 40%, #05060c) calc(10 * var(--u)) calc(12 * var(--u)), transparent calc(12.5 * var(--u))),
    linear-gradient(color-mix(in srgb, var(--c) 55%, #0b0d18), color-mix(in srgb, var(--c) 35%, #0b0d18));
  transform: rotateY(180deg) translateZ(calc(36 * var(--u)));
}

/* depth-wide, centred on the box */
.left,
.right {
  top: 0;
  left: calc(7 * var(--u));
  width: calc(72 * var(--u));
  height: calc(124 * var(--u));
  background:
    radial-gradient(rgb(0 0 0 / 0.22) calc(0.7 * var(--u)), transparent calc(1.2 * var(--u))) 0 0 / calc(4 * var(--u)) calc(4 * var(--u)),
    linear-gradient(color-mix(in srgb, var(--c) 65%, #0b0d18), color-mix(in srgb, var(--c) 45%, #0b0d18));
}

/* the sides are squeezed hard on a small canvas: a two-unit highlight inside both upright edges
   survives it where a one-unit line breaks up */
.left,
.right {
  box-shadow:
    inset calc(2 * var(--u)) 0 0 color-mix(in srgb, color-mix(in srgb, var(--c) 55%, #fff) 70%, transparent),
    inset calc(-2 * var(--u)) 0 0 color-mix(in srgb, color-mix(in srgb, var(--c) 55%, #fff) 70%, transparent);
}

.left { transform: rotateY(-90deg) translateZ(calc(43 * var(--u))); }  /* width / 2 */
.right { transform: rotateY(90deg) translateZ(calc(43 * var(--u))); }

.top,
.bottom {
  top: calc(26 * var(--u));
  left: 0;
  width: calc(86 * var(--u));
  height: calc(72 * var(--u));
}

/* lighter, with three buttons */
.top {
  background:
    radial-gradient(circle at 30% 50%, rgb(255 255 255 / 0.8) 0 calc(3 * var(--u)), transparent calc(3.5 * var(--u))),
    radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.8) 0 calc(3 * var(--u)), transparent calc(3.5 * var(--u))),
    radial-gradient(circle at 70% 50%, rgb(255 255 255 / 0.8) 0 calc(3 * var(--u)), transparent calc(3.5 * var(--u))),
    color-mix(in srgb, var(--c) 70%, #fff);
  transform: rotateX(90deg) translateZ(calc(62 * var(--u))); /* height / 2 */
}

.bottom {
  background: color-mix(in srgb, var(--c) 30%, #05060c);
  transform: rotateX(-90deg) translateZ(calc(62 * var(--u)));
}

/* tweeter and woofer */
.front b {
  width: calc(24 * var(--u));
  height: calc(24 * var(--u));
  border-radius: 50%;
  background:
    radial-gradient(circle at 40% 35%, rgb(255 255 255 / 0.5), transparent 30%),
    radial-gradient(circle, #d4d7ea 0 18%, #1a1c2b 22% 58%, #34374f 62% 72%, #05060c 76% 84%, color-mix(in srgb, var(--c) 40%, #fff) 88%);
}

.front b + b {
  width: calc(58 * var(--u));
  height: calc(58 * var(--u));
  background:
    radial-gradient(circle at 40% 35%, rgb(255 255 255 / 0.3), transparent 30%),
    radial-gradient(circle, #d4d7ea 0 12%, #1a1c2b 15% 50%, #2b2e44 52% 60%, #1a1c2b 62% 72%, #05060c 76% 86%, color-mix(in srgb, var(--c) 40%, #fff) 90%);
}

/* round, so the rotation does not matter; laid flat just under the bottom */
.shadow {
  position: absolute;
  top: calc(50% - 80 * var(--u));
  left: calc(50% - 80 * var(--u));
  width: calc(160 * var(--u));
  height: calc(160 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.5), rgb(0 0 0 / 0.18) 60%, transparent);
  transform: rotateX(90deg) translateZ(calc(-64 * var(--u)));
}

/* the control zone: the same object, at the same size, in every model that has one — so it is
   written in plain vmin and not in the speaker's own unit. The caption is on its own line above
   the row, and its line box never changes height, so a new angle cannot move the speaker. */
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
  box-sizing: border-box;
  width: 8vmin;
  height: 8vmin;
  min-width: 8vmin;
  padding: 0;
  border: 0.6vmin solid #141830;
  border-radius: 999px;
  background: var(--sw);
  box-shadow: 0 0 0 0.3vmin rgb(140 150 220 / 0.34);
  font: 600 4vmin system-ui, sans-serif;
  cursor: pointer;
}

.controls button[aria-pressed='true'] {
  box-shadow: 0 0 0 0.6vmin #eceefb;
}`,
    js: `const viewer = document.querySelector('.viewer');
const view = viewer.querySelector('.view');
const product = viewer.querySelector('.product');
const controls = viewer.querySelector('.controls');
const out = viewer.querySelector('output');
let ry = -32, v = 0, last = 0, raf = 0, dragging = false;

function apply() {
  product.style.setProperty('--ry', ry.toFixed(1) + 'deg');
  out.textContent = Math.round(((ry % 360) + 360) % 360) + '°';
}

// inertia: keep turning, lose 6% per frame, stop the loop when slow
function glide() {
  v *= 0.94;
  ry += v;
  apply();
  raf = Math.abs(v) > 0.05 ? requestAnimationFrame(glide) : 0;
}

view.addEventListener('pointerdown', (e) => {
  dragging = true;
  last = e.clientX;
  v = 0;
  cancelAnimationFrame(raf);
  view.setPointerCapture(e.pointerId); // keep getting moves outside the view
  view.classList.add('is-dragging');
});

view.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  v = (e.clientX - last) * 0.6;
  last = e.clientX;
  ry += v;
  apply();
});

function up() {
  if (!dragging) return;
  dragging = false;
  view.classList.remove('is-dragging');
  if (Math.abs(v) > 0.05) raf = requestAnimationFrame(glide);
}
view.addEventListener('pointerup', up);
view.addEventListener('pointercancel', up);

view.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  v = e.key === 'ArrowLeft' ? -5 : 5;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(glide);
});

controls.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-c]');
  if (!btn) return;
  viewer.style.setProperty('--c', btn.dataset.c);
  controls.querySelectorAll('[data-c]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
});`,
  },

  browser: {
    how: [
      'The window is tilted like an isometric drawing: <code>rotateX(55deg) rotateZ(-38deg)</code>. Its layers are flat siblings inside it, each lifted along the window’s own Z axis.',
      'Each layer declares its depth once in the markup (<code>style="--z:40"</code>) and shares a single rule: <code>translateZ(calc(var(--z) * var(--k) * 1px))</code>.',
      'Hover changes only the multiplier <code>--k</code> on the wrapper (0.45 → 1). Every layer’s transform changes with it and its own <code>transition</code> animates it; a delay of <code>--z × 2ms</code> lets the top layers rise last.',
      'The bob sits on the window, the hover on a static wrapper, and the window has <code>pointer-events: none</code>, so the bobbing never slides out from under the pointer.',
    ],
    html: `<div class="scene">
  <div class="browser" tabindex="0">
    <div class="win">
      <i class="shadow"></i>
      <div class="frame"><span></span><span></span><span></span><em></em></div>
      <div class="side" style="--z:14"><i></i><i></i><i></i><i></i></div>
      <i class="card hero" style="--z:26"></i>
      <i class="card a" style="--z:40"></i>
      <i class="card b" style="--z:40"></i>
      <b class="fab" style="--z:58"></b>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

/* static hit area: it only changes the multiplier --k */
.browser {
  --k: 0.45;
  display: grid;
  place-items: center;
  width: 210px;
  height: 184px;
  border-radius: 16px;
  outline-offset: -4px;
  cursor: pointer;
  transform-style: preserve-3d;
}

.browser:hover,
.browser:focus-visible {
  --k: 1;
}

/* 152 × 112, tilted and bobbing */
.win {
  position: relative;
  width: 152px;
  height: 112px;
  pointer-events: none;
  transform-style: preserve-3d;
  animation: bob 3.2s ease-in-out infinite alternate;
}

/* every depth layer: one transform from --z × --k, staggered by depth */
.win > [style] {
  position: absolute;
  box-sizing: border-box;
  transform: translateZ(calc(var(--z) * var(--k) * 1px));
  transition: transform 0.6s cubic-bezier(0.3, 1.3, 0.5, 1);
  transition-delay: calc(var(--z) * 2ms);
}

.shadow {
  position: absolute;
  inset: 4px -6px -8px 4px;
  border-radius: 14px;
  background: radial-gradient(closest-side, rgb(0 0 0 / 0.45), transparent);
  transform: translateZ(calc(var(--k) * -24px)); /* sinks as the layers rise */
  transition: transform 0.6s cubic-bezier(0.3, 1.3, 0.5, 1);
}

/* the window at z = 0: title bar with traffic lights and an address bar */
.frame {
  position: absolute;
  inset: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  align-content: flex-start;
  gap: 3px;
  padding: 5px 6px;
  border: 1px solid rgb(140 150 220 / 0.34);
  border-radius: 10px;
  background:
    linear-gradient(#2a2d44 0 16px, transparent 16px),
    #222249;
}

.frame span { width: 6px; height: 6px; border-radius: 50%; background: #ff4d9d; }
.frame span:nth-child(2) { background: #ffb547; }
.frame span:nth-child(3) { background: #2ee6d6; }

.frame em {
  width: 62px;
  height: 7px;
  margin-left: 14px;
  border-radius: 4px;
  background: rgb(236 238 251 / 0.16);
}

.side {
  top: 23px;
  left: 7px;
  display: grid;
  align-content: start;
  gap: 6px;
  width: 30px;
  height: 82px;
  padding: 6px 5px;
  border: 1px solid rgb(139 108 255 / 0.45);
  border-radius: 6px;
  background: #2e2a5e;
}

.side i { height: 4px; border-radius: 2px; background: rgb(236 238 251 / 0.3); }
.side i:first-child { background: #8b6cff; }
.side i:nth-child(3) { width: 70%; }

.card {
  border: 1px solid rgb(255 255 255 / 0.35);
  border-radius: 6px;
}

/* hero banner with two lines of "text" */
.hero {
  top: 23px;
  left: 44px;
  width: 101px;
  height: 32px;
  background:
    linear-gradient(rgb(255 255 255 / 0.9) 0 0) 8px 9px / 42% 4px no-repeat,
    linear-gradient(rgb(255 255 255 / 0.55) 0 0) 8px 17px / 28% 3px no-repeat,
    linear-gradient(120deg, #8b6cff, #ff4d9d);
}

.a,
.b {
  top: 62px;
  width: 47px;
  height: 43px;
}

/* mini bar chart */
.a {
  left: 44px;
  padding: 7px 0 5px;
  background:
    linear-gradient(0deg, #2ee6d6 0 45%, transparent 45%) 7px 100% / 5px 100% no-repeat,
    linear-gradient(0deg, #2ee6d6 0 70%, transparent 70%) 15px 100% / 5px 100% no-repeat,
    linear-gradient(0deg, #2ee6d6 0 55%, transparent 55%) 23px 100% / 5px 100% no-repeat,
    linear-gradient(0deg, #2ee6d6 0 85%, transparent 85%) 31px 100% / 5px 100% no-repeat,
    #193d4e;
  background-origin: content-box;
}

/* donut: a conic square rounded off by two radial layers in the card colour */
.b {
  --paper: #3e3434;
  right: 7px;
  background:
    radial-gradient(circle, var(--paper) 0 6px, transparent 6.5px 11px, var(--paper) 11.5px),
    conic-gradient(#ffb547 0 70%, #785b3a 0) 50% 50% / 24px 24px no-repeat,
    var(--paper);
}

/* the floating button; rotate(38deg) undoes the window's rotateZ so "+" stays a plus */
.win > .fab {
  right: 12px;
  bottom: 12px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff4d9d, #8b6cff);
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.35);
  transform: translateZ(calc(var(--z) * var(--k) * 1px)) rotate(38deg);
}

/* the "+" is two bars in one grid cell: exactly centred, unlike a text glyph */
.win > .fab::before,
.win > .fab::after {
  content: '';
  grid-area: 1 / 1;
  width: 10px;
  height: 2px;
  border-radius: 1px;
  background: #fff;
}

.win > .fab::after {
  rotate: 90deg;
}

/* translateY first: the bob is straight up and down on screen */
@keyframes bob {
  from { transform: translateY(8px) rotateX(55deg) rotateZ(-38deg); }
  to   { transform: translateY(0) rotateX(55deg) rotateZ(-38deg); }
}`,
  },
};
