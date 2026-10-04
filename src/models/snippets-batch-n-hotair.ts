import type { Snippet } from './snippet-utils';

/*
 * hotair: a hot-air balloon whose envelope is twelve gores round the vertical axis, each gore six
 * flat panels following the balloon's outline from the crown ring to the mouth, so the silhouette is round from every side and the stripes really go round. Ropes run
 * from the skirt to a woven basket; the whole balloon turns slowly as it bobs, and clouds drift
 * past at three depths, fading in and out so they never cross the edge of the canvas.
 */

/**
 * The outline, from the crown down: [radius, height] in units, measured from the axis and from the
 * top. Each pair of neighbours is one band of panels. The radius is the panel's distance from the
 * axis (the apothem of a 12-sided ring), so neighbouring panels meet edge to edge.
 */
const OUTLINE: [number, number][] = [
  [22, 5], // the crown ring
  [39, 18],
  [48, 35],
  [50, 52], // the equator
  [44, 72],
  [31, 89],
  [16, 101], // the skirt's mouth
];

const GORES = 12;
const HALF = Math.tan(Math.PI / GORES); // half a panel's width per unit of radius
const OVERLAP = 0.8; // each panel a hair wider and longer, so no seam shows the sky
const COLORS = ['#8b6cff', '#2ee6d6', '#ff4d9d', '#ffb547'];

/** Light from above: white at the crown, through clear at the equator, to shade at the skirt. */
const SHADE = [0.3, 0.2, 0.09, 0, -0.1, -0.22, -0.34];
const tone = (s: number) => (s >= 0 ? `rgb(255 255 255 / ${s.toFixed(2)})` : `rgb(10 8 30 / ${(-s).toFixed(2)})`);

const n = (v: number) => +v.toFixed(2);

interface Band { w: number; h: number; ym: number; rm: number; tilt: number; clip: string; shade: string }

/** One band of panels: its box, where its middle is, how far it tilts and its trapezoid. */
function band(i: number): Band {
  const [r1, y1] = OUTLINE[i];
  const [r2, y2] = OUTLINE[i + 1];
  const top = 2 * r1 * HALF + OVERLAP;
  const bottom = 2 * r2 * HALF + OVERLAP;
  const w = Math.max(top, bottom);
  const l = Math.hypot(r2 - r1, y2 - y1);
  const a = (((w - top) / 2) / w) * 100;
  const b = (((w - bottom) / 2) / w) * 100;
  return {
    w: n(w),
    h: n(l + 2 * OVERLAP), // longer still: a seam across the balloon shows more than one down it
    ym: n((y1 + y2) / 2),
    rm: n((r1 + r2) / 2),
    // a band narrower at its top leans its top in: rotateX by the outline's angle from upright
    tilt: n((Math.atan2(r2 - r1, y2 - y1) * 180) / Math.PI),
    clip: `polygon(${n(a)}% 0, ${n(100 - a)}% 0, ${n(100 - b)}% 100%, ${n(b)}% 100%)`,
    shade: `linear-gradient(${tone(SHADE[i])}, ${tone(SHADE[i + 1])})`,
  };
}

const B = OUTLINE.slice(1).map((_, i) => band(i));

/** The six pseudo-elements that draw a gore's six panels, from the crown down. */
const SEL = ['.gore::before', '.gore::after', '.gore i:first-child::before', '.gore i:first-child::after', '.gore i + i::before', '.gore i + i::after'];
const NOTE = ['the shoulder, out from the crown ring', 'the upper slope', 'the last of the upper half, almost upright', 'under the equator, its top leaning out (a negative tilt)', 'the taper', 'the skirt, narrowing to the mouth'];

/** CSS for one panel: a pseudo-element with its middle on the axis, moved to its band and tilted. */
function leaf(k: number): string {
  const b = B[k];
  return `/* ${NOTE[k]} */
${SEL[k]} {
  left: calc(${n(-b.w / 2)} * var(--u));
  top: calc(${n(-b.h / 2)} * var(--u));
  width: calc(${b.w} * var(--u));
  height: calc(${b.h} * var(--u));
  background: ${b.shade}, var(--c);
  clip-path: ${b.clip};
  transform: translate3d(0, calc(${b.ym} * var(--u)), calc(${b.rm} * var(--u))) rotateX(${b.tilt}deg);
}`;
}

/** The static shading laid in front of the envelope: its outline the narrowest the balloon ever is. */
const SKY_W = 110;
const SKY_H = 144;
const inside = OUTLINE.map(([r, y]) => [r, y]); // the apothem: the narrowest the turning outline ever is
const SHADE_CLIP = `polygon(${[
  ...inside.map(([r, y]) => `${n(((SKY_W / 2 + r) / SKY_W) * 100)}% ${n((y / SKY_H) * 100)}%`),
  ...inside.reverse().map(([r, y]) => `${n(((SKY_W / 2 - r) / SKY_W) * 100)}% ${n((y / SKY_H) * 100)}%`),
].join(', ')})`;
const PERSPECTIVE = 800;
const SHADE_Z = 54; // just in front of the nearest panel corner (50 / cos 15° = 51.8)
const SHADE_SCALE = n((PERSPECTIVE - SHADE_Z) / PERSPECTIVE);

/** Where the ropes run: from the skirt to the basket's corners (11 units out each way). */
const ROPE = { r1: 15, y1: 100, r2: Math.SQRT2 * 11, y2: 128 };
const ropeLen = n(Math.hypot(ROPE.r2 - ROPE.r1, ROPE.y2 - ROPE.y1));
const ropeTilt = n((Math.atan2(ROPE.r2 - ROPE.r1, ROPE.y2 - ROPE.y1) * 180) / Math.PI);

export const snippetsHotair: Record<string, Snippet> = {
  hotair: {
    how: [
      'CSS has no curved surfaces, so the envelope is <b>twelve gores</b>, each a carrier at the axis turned <code>rotateY(k × 30deg)</code>, and each gore is <b>six flat panels</b> following the outline down from the crown ring to the mouth. A panel is moved to the middle of its band with <code>translate3d(0, y, r)</code> and tilted with <code>rotateX</code> by the outline’s angle there, so its edges land exactly on its neighbours’ and the silhouette is round from every side.',
      'A panel is as wide as a side of a 12-sided ring at its radius, <code>2 r tan 15°</code>, which differs at its top and bottom, so each is a trapezoid cut with <code>clip-path</code>. A clip flattens anything 3D inside an element, so only leaves are clipped: the panels are the <code>::before</code> and <code>::after</code> of the gore and of two plain <code>&lt;i&gt;</code> carriers inside it. Panels facing away are hidden with <code>backface-visibility</code>.',
      'There is no light in CSS 3D, so it is painted on, twice. Each band carries a gradient from white at the crown to shade at the skirt, meeting its neighbours at the same value; that light turns with the stripes. And a plane that does <b>not</b> turn lies just in front of the envelope, cut to its outline, with a sheen up on the left and shade round the edge: pushed toward you by <code>translateZ(54 units)</code> and shrunk by <code>(800 − 54) ÷ 800</code> about the point the perspective looks from, it lands exactly on the balloon, so the stripes turn under a light that stays put.',
      'Ropes are two crossed lines each, so they never vanish edge-on; the basket is four woven walls (crossed <code>repeating-linear-gradient</code>s) round a floor, turning with the balloon. It turns once every 40 s and bobs on a separate wrapper, so the two motions add up without either knowing of the other; the bob (10 s there and back), the burner and the clouds (20 and 40 s) all divide the turn, so the whole scene repeats exactly once a turn.',
      'The clouds drift at three depths, one in front of the balloon and two behind it, fading in and out with <code>opacity</code>, so their loops have no seam and they never reach the edge of the canvas. Every length is a multiple of one base unit, <code>--u</code>.',
    ],
    html: `<div class="scene">
  <div class="sky">
    <i class="cloud far" style="--y:18;--z:-160;--d:40s;--t:-20s"></i>
    <i class="cloud" style="--y:66;--z:-90;--d:40s;--t:-10s"></i>
    <div class="flight">
      <div class="balloon">
        <b class="crown"></b>
${Array.from({ length: GORES }, (_, k) => `        <b class="gore" style="--k:${k};--c:${COLORS[k % COLORS.length]}"><i></i><i></i></b>`).join('\n')}
${[0, 1, 2, 3].map((k) => `        <b class="rope" style="--k:${k}"></b>`).join('\n')}
        <b class="burner"></b>
        <div class="basket"><i></i><i></i><i></i><i></i></div>
      </div>
      <i class="shade"></i>
    </div>
    <i class="cloud near" style="--y:120;--z:70;--d:20s;--t:-14s"></i>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the balloon is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.42vmin;
  display: grid;
  place-items: center;
  perspective: calc(800 * var(--u));
}

.scene * {
  box-sizing: border-box;
}

/* the sky: the balloon and the clouds share one 3D space, so a cloud can pass in front */
.sky {
  position: relative;
  width: calc(110 * var(--u));
  height: calc(144 * var(--u));
  transform-style: preserve-3d;
  /* the low cloud hangs under the basket: lifted this much, balloon and clouds together sit in
     the middle */
  transform: translateY(calc(-7 * var(--u)));
}

/* the bob, on its own wrapper, so it adds to the turn without either knowing of the other */
.flight {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: bob 5s ease-in-out infinite alternate;
}

@keyframes bob {
  from { transform: translateY(calc(3 * var(--u))); }
  to   { transform: translateY(calc(-5 * var(--u))); }
}

/* the balloon's axis: a zero-size point at the crown, in the middle of the sky. Everything that
   turns is placed from it */
.balloon {
  position: absolute;
  left: 50%;
  top: 0;
  transform-style: preserve-3d;
  animation: turn 40s linear infinite;
}

@keyframes turn {
  from { transform: rotateY(0deg); }
  to   { transform: rotateY(360deg); }
}

/* the crown: a flat disc closing the top of the gores, laid level */
.crown {
  position: absolute;
  left: calc(-23.5 * var(--u));
  top: calc(-18.5 * var(--u));
  width: calc(47 * var(--u));
  height: calc(47 * var(--u));
  border-radius: 50%;
  background: conic-gradient(${COLORS.map((c, k) => `${c} ${k * 90}deg ${(k + 1) * 90}deg`).join(', ')});
  transform: rotateX(90deg);
}

/* a gore: a carrier at the axis, turned to its place round the ring, with two more carriers in
   it (its <i>s, untransformed). None draws anything: the six panels are their pseudo-elements,
   because a panel is clipped and a clip flattens anything 3D inside it */
.gore,
.gore i {
  position: absolute;
  transform-style: preserve-3d;
}

.gore {
  transform: rotateY(calc(var(--k) * ${360 / GORES}deg));
}

.gore::before,
.gore::after,
.gore i::before,
.gore i::after {
  content: '';
  position: absolute;
  backface-visibility: hidden; /* the far side's panels are not drawn through the near side */
}

${B.map((_, k) => leaf(k)).join('\n\n')}

/* the light, which does not turn: a sheen up and to the left and shade round the edge, on a
   plane just in front of the envelope, cut to its outline. It is pushed toward you and shrunk by
   the same ratio about the point the perspective looks from, so it lands exactly on the balloon */
.shade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(30% 22% at 38% 22%, rgb(255 255 255 / 0.34), transparent),
    radial-gradient(48% 40% at 47% 37%, transparent 52%, rgb(12 8 40 / 0.42));
  clip-path: ${SHADE_CLIP};
  transform-origin: 50% 50%;
  transform: translateZ(calc(${SHADE_Z} * var(--u))) scale(${SHADE_SCALE});
}

/* a rope: from the skirt down to a corner of the basket, at 45° between the gores. A second
   line crossed through it (::before), so it never vanishes edge-on */
.rope {
  position: absolute;
  left: calc(-0.5 * var(--u));
  top: calc(${n(-ropeLen / 2)} * var(--u));
  width: calc(1 * var(--u));
  height: calc(${ropeLen} * var(--u));
  background: #9d7f5c;
  transform-style: preserve-3d;
  transform: rotateY(calc(45deg + var(--k) * 90deg)) translate3d(0, calc(${n((ROPE.y1 + ROPE.y2) / 2)} * var(--u)), calc(${n((ROPE.r1 + ROPE.r2) / 2)} * var(--u))) rotateX(${ropeTilt}deg);
}

.rope::before {
  content: '';
  position: absolute;
  inset: 0;
  background: inherit;
  transform: rotateY(90deg);
}

/* the burner's flame, under the mouth: two crossed teardrops, flickering */
.burner {
  position: absolute;
  left: calc(-4 * var(--u));
  top: calc(104 * var(--u));
  width: calc(8 * var(--u));
  height: calc(12 * var(--u));
  transform-style: preserve-3d;
  transform-origin: 50% 100%;
  animation: flare 0.5s ease-in-out infinite alternate;
}

.burner::before,
.burner::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50% 50% 50% 50% / 70% 70% 30% 30%;
  background: radial-gradient(60% 50% at 50% 72%, #fffbe8, #ffd36b 40%, #ff8a3d 70%, rgb(255 77 157 / 0.6));
}

.burner::after {
  transform: rotateY(90deg);
}

@keyframes flare {
  from { transform: scale(0.9, 0.8); }
  to   { transform: scale(1, 1.1); } /* scale only: opacity on it would flatten its crossed plane */
}

/* the basket: a zero-size point under the axis; four woven walls stand round it */
.basket {
  position: absolute;
  top: calc(128 * var(--u));
  transform-style: preserve-3d;
}

.basket i {
  position: absolute;
  left: calc(-11 * var(--u));
  top: 0;
  width: calc(22 * var(--u));
  height: calc(16 * var(--u));
  border-top: calc(2.4 * var(--u)) solid #5e3a1f;
  border-radius: 0 0 calc(2 * var(--u)) calc(2 * var(--u));
  /* the weave: light strands across, darker ones up, over the wicker's own brown */
  background:
    repeating-linear-gradient(90deg, rgb(70 40 18 / 0.45) 0 calc(0.8 * var(--u)), transparent calc(0.8 * var(--u)) calc(3.6 * var(--u))),
    repeating-linear-gradient(rgb(255 225 170 / 0.35) 0 calc(1.4 * var(--u)), transparent calc(1.4 * var(--u)) calc(2.8 * var(--u))),
    linear-gradient(#c08a4e, #8a5a2e);
  transform: rotateY(calc(var(--k, 0) * 90deg)) translateZ(calc(11 * var(--u)));
}

.basket i:nth-child(2) { --k: 1; }
.basket i:nth-child(3) { --k: 2; }
.basket i:nth-child(4) { --k: 3; }

/* the floor, seen inside from above and under from below */
.basket::before {
  content: '';
  position: absolute;
  left: calc(-11 * var(--u));
  top: calc(5 * var(--u));
  width: calc(22 * var(--u));
  height: calc(22 * var(--u));
  background: #4a2c16;
  transform: rotateX(90deg);
}

/* a cloud: a long base and two puffs, one gradient across all three (sized to the whole cloud and
   shifted by each piece's top), so it reads as one body: bright above, lilac in its belly, which
   keeps it visible on a light stage. It drifts across at its own depth and fades at both ends */
.cloud,
.cloud::before,
.cloud::after {
  background: linear-gradient(#ffffff 22%, #dfe1f7 60%, #a9afe0) 0 var(--gy, calc(-14 * var(--u))) / 100% calc(30 * var(--u));
}

/* the element is the base, the bottom 16 of the cloud's 30 units */
.cloud {
  position: absolute;
  left: calc(50% - calc(30 * var(--u)));
  top: calc((var(--y) + 14) * var(--u));
  width: calc(60 * var(--u));
  height: calc(16 * var(--u));
  border-radius: 999px;
  opacity: 0;
  animation: drift var(--d) linear var(--t) infinite;
}

/* the two puffs on its back, their feet on its bottom edge */
.cloud::before,
.cloud::after {
  content: '';
  position: absolute;
  bottom: 0;
  border-radius: 50%;
}

.cloud::before {
  --gy: calc(-6 * var(--u));
  left: calc(7 * var(--u));
  width: calc(26 * var(--u));
  height: calc(24 * var(--u));
}

.cloud::after {
  --gy: calc(0 * var(--u));
  left: calc(25 * var(--u));
  width: calc(28 * var(--u));
  height: calc(30 * var(--u));
}

.cloud.far { --s: 0.8; }
.cloud.near { --s: 0.9; }

@keyframes drift {
  0%   { opacity: 0; transform: translate3d(calc(62 * var(--u)), 0, calc(var(--z) * var(--u))) scale(var(--s, 1)); }
  18%  { opacity: 0.94; }
  82%  { opacity: 0.94; }
  100% { opacity: 0; transform: translate3d(calc(-62 * var(--u)), 0, calc(var(--z) * var(--u))) scale(var(--s, 1)); }
}`,
  },
};
