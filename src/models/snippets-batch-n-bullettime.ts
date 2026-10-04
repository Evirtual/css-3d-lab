import type { Snippet } from './snippet-utils';

/**
 * Bullet time: a bullet frozen mid-flight, rings of rippled air and a few motion streaks behind it,
 * and the camera circling the frozen moment. The bullet is a solid of revolution built from flat
 * facets: twelve round its axis for the body, twelve for the curve of the nose, twelve for the tip.
 * There is no light in CSS 3D, so each facet's colour is worked out here, once, from the way it
 * faces a light fixed in the world; the camera turning round it then shows the lit side and the
 * dark side in turn, as a real one would.
 */

const N = 12; // facets round the axis
const STEP = 360 / N;
const TAN = Math.tan(Math.PI / N); // half a facet's width over the distance to it

/** The profile, along the axis from the base (x = 0) to the tip, in units: [x, distance to a facet]. */
const BODY = { x0: 0, x1: 40, r0: 10.5, r1: 10.5 };
const NOSE = { x0: 40, x1: 55, r0: 10.5, r1: 7.2 };
const TIP = { x0: 55, x1: 70, r0: 7.2, r1: 0 };

const r2 = (v: number) => Math.round(v * 100) / 100;
/** A ring of facets narrowing from r0 to r1: the length of its slant and how far it tips inwards. */
const slant = (p: { x0: number; x1: number; r0: number; r1: number }) => {
  const h = p.x1 - p.x0, d = p.r0 - p.r1, s = Math.hypot(h, d);
  return { s: r2(s), tilt: r2((Math.atan2(d, h) * 180) / Math.PI) };
};
const nose = slant(NOSE), tip = slant(TIP);
// a facet's width at its wide end, a little over the exact polygon so neighbours overlap a hair
const W_BODY = r2(2 * BODY.r0 * TAN + 0.1);
const W_TIP = r2(2 * TIP.r0 * TAN + 0.1);
// the nose narrows from the body's width to the tip's: its trapezoid's top and bottom are cut by this share
const NOSE_CUT = r2(((W_BODY - W_TIP) / 2 / W_BODY) * 100);

/* ---------- the paint: a light fixed in the world ---------- */
type V = [number, number, number];
const unit = (v: V): V => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; };
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const KEY = unit([0.35, -0.8, 0.5]); // from above, ahead and in front (CSS y points down)
const BOUNCE = unit([-0.2, 0.9, -0.3]); // green light from below and behind, the film's colour
const hexOf = (c: V) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const rgb = (h: string): V => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as V;
const mix = (a: V, b: V, t: number): V => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as V;
const BRASS: [V, V] = [rgb('#3a2608'), rgb('#ffe7a3')];
const COPPER: [V, V] = [rgb('#3b1a0a'), rgb('#ffc89e')];
const GREEN = rgb('#2fd27a');

/** The colour of the facet at angle a (deg) round the axis, tipped inwards by tilt (deg). */
function paint(a: number, tilt: number, metal: [V, V]): string {
  const ar = (a * Math.PI) / 180, tr = (tilt * Math.PI) / 180;
  // rotateX(a) then rotateY(tilt) turn the facet's outward normal (0, 0, 1) to this
  const n: V = [Math.sin(tr), -Math.cos(tr) * Math.sin(ar), Math.cos(tr) * Math.cos(ar)];
  const lit = Math.max(0, dot(n, KEY));
  // a broad diffuse light and a tight highlight, as polished metal has
  const c = mix(metal[0], metal[1], Math.min(1, 0.22 + 0.62 * lit + 0.5 * lit ** 12));
  return hexOf(mix(c, GREEN, 0.38 * Math.max(0, dot(n, BOUNCE))));
}

const ring = (cls: string, metal: [V, V], tilt: number) =>
  Array.from({ length: N }, (_, i) => `      <i class="${cls}" style="--a:${i * STEP}deg;--c:${paint(i * STEP, tilt, metal)}"></i>`).join('\n');

/** The air ripples behind the bullet: x along the path (units), diameter, and opacity. */
const RIPPLES = [
  { x: 8, d: 32, o: 1 },
  { x: -14, d: 50, o: 0.95 },
  { x: -37, d: 70, o: 0.85 },
  { x: -63, d: 92, o: 0.75 },
];
/** The motion streaks: angle round the path, distance from it and length, all ending at the base. */
const STREAKS = [
  { a: 20, r: 12, l: 80 },
  { a: 95, r: 14, l: 62 },
  { a: 170, r: 11, l: 90 },
  { a: 245, r: 13, l: 70 },
  { a: 320, r: 15, l: 56 },
];

export const snippetsBullettime: Record<string, Snippet> = {
  bullettime: {
    how: [
      'The bullet is a solid of revolution made of flat facets. Each facet starts on the bullet’s axis and is turned round it, then pushed out: <code>rotateX(a) translateZ(r)</code>, with <code>a</code> a step of 30° for each of twelve. Twelve rectangles make the body, a twelve-sided cylinder.',
      'The nose and the tip are the same ring, tipped inwards. After the push, <code>rotateY(θ)</code> about the facet’s back edge swings its front end towards the axis: a slight angle and a trapezoid <code>clip-path</code> for the curve of the nose, a steeper one and a triangle for the point. The angle and the slant length come from the profile (how far along, how far out), so every ring meets the next edge to edge.',
      'CSS 3D has no light, so each facet is painted by the way it faces one: the colour is worked out once, from the facet’s normal against a light fixed in the world, with a tight highlight for polished brass and a green bounce from below. The light stays put while the camera goes round, so the bright side and the dark side come into view in turn, as on a real object.',
      'The air ripples are four rings standing across the path (<code>rotateY(90deg)</code>), wider and fainter the further back, and the streaks are thin gradients along it. Nothing in the scene moves but the camera: the whole scene turns once about the vertical, <code>rotateX(-8deg) rotateY(-30deg → 330deg)</code>, which is the bullet-time shot. Linear, and the end is the start, so the loop has no seam.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas, and the camera turns about a point a little behind the bullet, where the small bullet and the wide ripples balance: the first frame, the three-quarter view a paused card shows, is centred, and so is everything the turn sweeps, since a full turn reaches as far to one side as to the other.',
    ],
    html: `<div class="scene" role="img" aria-label="A bullet frozen mid-flight with rings of rippled air behind it, the camera circling it">
  <div class="orbit">
${RIPPLES.map((r) => `    <b class="ripple" style="--x:${r.x};--d:${r.d};--o:${r.o}"></b>`).join('\n')}
${STREAKS.map((s) => `    <b class="streak" style="--a:${s.a}deg;--r:${s.r};--l:${s.l}"></b>`).join('\n')}
    <div class="bullet">
${ring('body', BRASS, 0)}
${ring('nose', BRASS, nose.tilt)}
${ring('tip', COPPER, tip.tilt)}
      <b class="base"></b>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the scene is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.5vmin;
  position: relative;
  width: 0;
  height: 0;
  perspective: calc(800 * var(--u));
}

.scene * {
  box-sizing: border-box;
}

/* the camera: the whole scene turns once about the vertical, seen a little from above. It turns
   about a point a little behind the bullet, where the bullet and the wide ripples balance */
.orbit {
  position: absolute;
  transform-style: preserve-3d;
  animation: orbit 16s linear infinite;
}

/* the bullet: its axis is the x axis, its base 13 units right of the centre and its tip 83 */
.bullet {
  position: absolute;
  transform-style: preserve-3d;
  transform: translateX(calc(13 * var(--u)));
}

/* a facet: hinged on its back edge, on the axis. rotateX turns it round the axis, translateZ
   pushes it out to the surface, rotateY tips its front end in. Painted by the way it faces the
   light (--c), and hidden from behind, so the inside of the solid never shows */
.bullet i {
  position: absolute;
  transform-origin: 0 50%;
  background: var(--c);
  backface-visibility: hidden;
  transform: rotateX(var(--a)) translateZ(calc(var(--r) * var(--u))) rotateY(var(--tilt));
}

/* the body: a twelve-sided cylinder, ${BODY.x1 - BODY.x0} units long, with a darker groove near the nose and a
   darker edge at the base */
.bullet .body {
  --r: ${BODY.r0};
  --tilt: 0deg;
  left: 0;
  top: calc(${-W_BODY / 2} * var(--u));
  width: calc(${BODY.x1 - BODY.x0} * var(--u));
  height: calc(${W_BODY} * var(--u));
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--c) 55%, #000) 0 4%, var(--c) 9% 68%,
    color-mix(in srgb, var(--c) 50%, #000) 70% 76%, var(--c) 78%);
}

/* the nose: the same ring tipped ${nose.tilt}° in, narrowing from ${NOSE.r0} to ${NOSE.r1} units from the axis */
.bullet .nose {
  --r: ${NOSE.r0};
  --tilt: ${nose.tilt}deg;
  left: calc(${NOSE.x0} * var(--u));
  top: calc(${-W_BODY / 2} * var(--u));
  width: calc(${nose.s} * var(--u));
  height: calc(${W_BODY} * var(--u));
  clip-path: polygon(0 0, 100% ${NOSE_CUT}%, 100% ${r2(100 - NOSE_CUT)}%, 0 100%);
}

/* the tip: tipped ${tip.tilt}° in, so its twelve triangles meet in a point on the axis */
.bullet .tip {
  --r: ${TIP.r0};
  --tilt: ${tip.tilt}deg;
  left: calc(${TIP.x0} * var(--u));
  top: calc(${-W_TIP / 2} * var(--u));
  width: calc(${tip.s} * var(--u));
  height: calc(${W_TIP} * var(--u));
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

/* the base: a disc standing across the axis at x = 0, facing back down the path */
.bullet .base {
  position: absolute;
  left: calc(-10.7 * var(--u));
  top: calc(-10.7 * var(--u));
  width: calc(21.4 * var(--u));
  height: calc(21.4 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle, #8a6424 0 34%, #5e4115 40% 70%, #3a2608);
  backface-visibility: hidden;
  transform: rotateY(-90deg);
}

/* an air ripple: a ring standing across the path at --x, --d units wide. A green that reads on a
   dark stage and a light one, with a faint shimmer inside the rim */
.ripple {
  position: absolute;
  left: calc(var(--d) * var(--u) / -2);
  top: calc(var(--d) * var(--u) / -2);
  width: calc(var(--d) * var(--u));
  height: calc(var(--d) * var(--u));
  border: calc(1.4 * var(--u)) solid rgb(31 168 90 / 0.9);
  border-radius: 50%;
  background: radial-gradient(closest-side, transparent 74%, rgb(46 210 125 / 0.22) 92%, transparent);
  opacity: var(--o);
  transform: translateX(calc(var(--x) * var(--u))) rotateY(90deg);
}

/* a motion streak: a thin line along the path, --r units off it, fading out behind; it ends at
   the bullet’s base (x = 13). Its middle line is on the axis, so rotateX turns it round the path */
.streak {
  position: absolute;
  left: calc((13 - var(--l)) * var(--u));
  top: calc(-0.4 * var(--u));
  width: calc(var(--l) * var(--u));
  height: calc(0.8 * var(--u));
  background: linear-gradient(90deg, transparent, rgb(31 168 90 / 0.85));
  transform: rotateX(var(--a)) translateZ(calc(var(--r) * var(--u)));
}

/* one turn of the camera, starting on the classic three-quarter view: the bullet coming at you,
   its ripples trailing off behind. Linear, and the end is the start: no seam */
@keyframes orbit {
  from { transform: rotateX(-8deg) rotateY(-30deg); }
  to   { transform: rotateX(-8deg) rotateY(330deg); }
}`,
  },
};
