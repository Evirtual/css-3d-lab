import type { Snippet } from './snippet-utils';

/*
 * campfire: a ground laid back with rotateX and turning slowly with rotateZ. On it, a ring of
 * odd stones (shaded lumps that always face you), a bed of ash and glowing coals, a loose pile of
 * logs leaning into a teepee (each a real box: a top face, its sides folded down, an underside and
 * two ends, charred and smouldering where it meets the fire), flame tongues of crossed planes
 * flickering out of step, and embers rising on a carrier that undoes the turn, so they face you.
 */

/** The stones: angle, distance out, width, height, grey, outline and a lean. All uneven on
 *  purpose, so the ring reads as stones somebody gathered, not a gear. Distance plus half the
 *  width stays under 94 units, which keeps the ring inside the band's width at every turn. */
const STONES = [
  [4, 79, 29, 17, '#938c84', '50% 46% 30% 34% / 72% 66% 34% 28%', -3],
  [33, 77, 19, 12, '#7b7672', '44% 56% 36% 30% / 64% 70% 30% 36%', 5],
  [51, 85, 13, 8, '#8d8983', '50% 50% 40% 40% / 70% 70% 30% 30%', 0],
  [72, 80, 26, 15, '#9a9086', '38% 62% 28% 40% / 80% 60% 40% 20%', -4],
  [112, 83, 22, 17, '#62636a', '56% 44% 32% 28% / 60% 76% 24% 40%', 3],
  [139, 77, 16, 11, '#7f838a', '48% 52% 34% 30% / 70% 64% 36% 30%', -6],
  [167, 81, 27, 14, '#837e78', '42% 58% 30% 36% / 66% 74% 26% 34%', 2],
  [205, 79, 21, 17, '#8c8579', '60% 40% 34% 30% / 72% 62% 38% 28%', -2],
  [229, 86, 14, 9, '#77736f', '50% 50% 36% 44% / 66% 72% 28% 34%', 6],
  [251, 80, 27, 16, '#8f8a84', '46% 54% 26% 38% / 76% 64% 36% 24%', -5],
  [292, 78, 24, 13, '#a29c92', '52% 48% 40% 30% / 62% 70% 30% 38%', 3],
  [318, 83, 18, 14, '#7a7570', '40% 60% 30% 34% / 74% 66% 34% 26%', -3],
  [341, 79, 15, 10, '#9c968e', '54% 46% 34% 38% / 68% 72% 32% 28%', 4],
] as const;

/**
 * The logs. a/r: where the outer end lies (angle and distance from the middle); yw: how far it is
 * turned off pointing at the middle; z: how high its underside starts (one rests on two others);
 * lean: how steeply its inner end rises; roll: turned about its own length; l/w/th: length, width,
 * thickness; c: how much of it, from the inner end, is burned; k1/k2: where its glowing cracks are;
 * tint: its bark's age; d/dl: the pace and phase of its smoulder (0: char only, no glow layer);
 * up: steep enough that its underside shows from the far side, so it is painted.
 */
const LOGS = [
  { a: 12, r: 70, yw: 7, z: 0, lean: 22, roll: 8, l: 72, w: 13, th: 12, c: 30, k1: 30, k2: 66, tint: 'rgb(120 80 50 / 0.12)', d: 4, dl: -1.2 },
  { a: 98, r: 62, yw: -11, z: 0, lean: 34, roll: -14, l: 58, w: 11, th: 10, c: 26, k1: 62, k2: 34, tint: 'rgb(150 140 130 / 0.18)', d: 5, dl: -3.1, up: true },
  { a: 168, r: 72, yw: 13, z: 0, lean: 26, roll: 4, l: 66, w: 12.5, th: 12, c: 32, k1: 40, k2: 72, tint: 'rgb(90 50 20 / 0.2)', d: 2.5, dl: -0.7 },
  { a: 236, r: 67, yw: -5, z: 0, lean: 13, roll: -6, l: 70, w: 14, th: 13, c: 36, k1: 24, k2: 58, tint: 'rgb(170 160 150 / 0.14)', d: 4, dl: -2.6 },
  { a: 302, r: 60, yw: 9, z: 0, lean: 40, roll: 18, l: 52, w: 10, th: 9, c: 24, k1: 58, k2: 28, tint: 'rgb(110 60 30 / 0.16)', d: 2, dl: -0.4, up: true },
  /* resting across the first two, high on their outer halves */
  { a: 9, r: 53, yw: -41, z: 19, lean: 3, roll: 10, l: 72, w: 10, th: 9, c: 16, k1: 44, k2: 70, tint: 'rgb(160 150 140 / 0.1)', d: 0, dl: 0 },
  /* a thin branch, propped steeply against the pile */
  { a: 334, r: 47, yw: -16, z: 0, lean: 48, roll: 0, l: 40, w: 4.5, th: 4.5, c: 14, k1: 50, k2: 40, tint: 'rgb(150 120 90 / 0.2)', d: 0, dl: 0, up: true },
];

/** The flame: tongues of crossed planes. x/y: where the tongue rises; fz: how high; r: the plane's
 *  angle about the vertical; s: its size; sw: its lean; k: which flicker; d/t: pace and phase. */
const FLAMES = [
  /* the main tongue: three planes, so it has body from every side */
  { x: 0, y: -2, fz: 4, r: 0, s: 1.45, sw: 0, k: 'a', d: 2, t: -0.3 },
  { x: 0, y: -2, fz: 4, r: 60, s: 1.3, sw: 2, k: 'b', d: 1.6, t: -1.1 },
  { x: 0, y: -2, fz: 4, r: 120, s: 1.38, sw: -2, k: 'a', d: 2.5, t: -1.7 },
  /* smaller tongues licking off the log ends, two planes each */
  { x: -12, y: 5, fz: 8, r: 20, s: 0.8, sw: -9, k: 'b', d: 1.25, t: -0.2 },
  { x: -12, y: 5, fz: 8, r: 110, s: 0.74, sw: -6, k: 'a', d: 1, t: -0.6 },
  { x: 11, y: -8, fz: 10, r: 75, s: 0.7, sw: 10, k: 'a', d: 1.6, t: -0.9 },
  { x: 11, y: -8, fz: 10, r: 165, s: 0.64, sw: 7, k: 'b', d: 1, t: -0.1 },
  { x: 5, y: 12, fz: 5, r: 140, s: 0.5, sw: 5, k: 'b core', d: 0.8, t: -0.5 },
  { x: 5, y: 12, fz: 5, r: 50, s: 0.46, sw: 3, k: 'a core', d: 1.25, t: -0.8 },
];

/** The embers: where each starts across the fire, how far it drifts, its size, pace and delay. */
const EMBERS = [
  { x: -6, dx: -14, z: 3.4, d: 2.5, t: -0.2 },
  { x: 4, dx: 12, z: 2.4, d: 4, t: -1.4 },
  { x: -2, dx: 6, z: 4.2, d: 5, t: -2.1 },
  { x: 8, dx: -8, z: 2.2, d: 2, t: -0.9 },
  { x: -9, dx: 4, z: 3, d: 2.5, t: -1.6 },
  { x: 1, dx: -16, z: 2.6, d: 4, t: -3.2 },
  { x: 6, dx: 18, z: 1.8, d: 2, t: -0.3 },
];

export const snippetsCampfire: Record<string, Snippet> = {
  campfire: {
    how: [
      'The ground is a square laid back with <code>rotateX(58deg)</code> and turned once every 40 seconds with <code>rotateZ</code>. The firelight, a bed of ash and coals and the logs lie on it, so they turn with it and the fire shows every side. A stone is round from every side, so each stone is a shaded lump walked out with <code>rotateZ(a) translateY(-r)</code>, turned back by its own angle and by the ground’s turn, and stood up: it always faces you. Every stone gets its own distance, size, grey and <code>border-radius</code>, so the ring is gathered, not machined.',
      'Each log is a real box, placed by one <code>transform</code> read from its own custom properties: walked out to its outer end, turned off the centre (<code>--yw</code>), lifted (<code>--z</code>, the one resting on two others), leaned up into the fire (<code>rotateX(-lean)</code>) and rolled about its length. The element is the top face; <code>::before</code> and <code>::after</code> fold its sides down, and a child at <code>translateZ(-thickness)</code> is the underside, whose own pseudo-elements fold the two ends up.',
      'The burn is painted, not modelled: one gradient goes from black char with grey ash flecks at the inner end into bark, whose ridges are a <code>repeating-linear-gradient</code>, and the inner end is a glowing ember. A thin layer over the char holds the orange cracks and fades in and out on <code>opacity</code>, each log at its own pace, so the wood smoulders. The coal bed does the same: a still layer of ash and charcoal, with two layers of hot spots breathing out of step over it.',
      'The flame is several tongues, each two or three planes crossed about the vertical, so it has volume from any side. Every plane flickers on its own uneven keyframes (stretch, squeeze, sway, opacity) at its own pace and phase, so no two move together. Every pace (0.8 to 5 s) goes a whole number of times into the 40 s turn, so the whole scene repeats exactly once a turn.',
      'The embers live on a <b>carrier</b> that turns the other way exactly as fast as the ground, so they always face you. Each rises, drifts and fades from <code>opacity: 0</code> back to 0, so its loop has no seam. Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas: the stones set the width and the flame the height, and both stay put while the ground turns.',
    ],
    html: `<div class="scene">
  <div class="world">
    <div class="glow"></div>
    <div class="bed"></div>
    <div class="heat"></div>
    <div class="heat two"></div>
${STONES.map(([a, r, w, h, g, br, tl]) => `    <i class="lump" style="--a:${a}deg;--r:${r};--w:${w};--h:${h};--g:${g};--br:${br};--tl:${tl}deg"></i>`).join('\n')}
${LOGS.map((g) => `    <div class="log${g.up ? ' up' : ''}" style="--a:${g.a}deg;--r:${g.r};--yw:${g.yw}deg;--z:${g.z};--lean:${g.lean}deg;--roll:${g.roll}deg;--l:${g.l};--w:${g.w};--th:${g.th};--c:${g.c};--k1:${g.k1}%;--k2:${g.k2}%;--tint:${g.tint}${g.d ? `;--d:${g.d}s;--dl:${g.dl}s` : ''}"><i></i>${g.d ? '<b></b>' : ''}</div>`).join('\n')}
${FLAMES.map((f) => `    <i class="flame ${f.k}" style="--x:${f.x};--y:${f.y};--fz:${f.fz};--r:${f.r}deg;--s:${f.s};--sw:${f.sw}deg;--d:${f.d}s;--t:${f.t}s"></i>`).join('\n')}
    <div class="sparks">
      <i class="lick" style="--x:-7;--d:1.6s;--t:-0.4s"></i>
      <i class="lick" style="--x:8;--d:2s;--t:-1.1s"></i>
${EMBERS.map((e) => `      <i class="ember" style="--x:${e.x};--dx:${e.dx};--z:${e.z};--d:${e.d}s;--t:${e.t}s"></i>`).join('\n')}
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the fire is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.45vmin;
  display: grid;
  place-items: center;
  perspective: calc(800 * var(--u));
}

.scene *,
.scene *::before,
.scene *::after {
  box-sizing: border-box;
}

/* the ground: a square laid back and turning. Everything stands on it, so everything turns */
.world {
  position: relative;
  width: calc(200 * var(--u));
  height: calc(200 * var(--u));
  transform-style: preserve-3d;
  animation: turn 40s linear infinite;
}

@keyframes turn {
  from { transform: translateY(calc(12 * var(--u))) rotateX(58deg) rotateZ(0deg); }
  to   { transform: translateY(calc(12 * var(--u))) rotateX(58deg) rotateZ(360deg); }
}

/* the firelight on the ground: a warm pool that swells and sinks unevenly with the flame */
.glow {
  position: absolute;
  inset: calc(26 * var(--u));
  border-radius: 50%;
  background: radial-gradient(closest-side, rgb(255 210 140 / 0.42), rgb(255 140 60 / 0.26) 34%, rgb(255 77 100 / 0.1) 64%, transparent);
  animation: breathe 4s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { opacity: 0.75; transform: scale(0.95); }
  30%      { opacity: 1;    transform: scale(1.04); }
  55%      { opacity: 0.82; transform: scale(0.98); }
  80%      { opacity: 0.95; transform: scale(1.02); }
}

/* the bed: grey-white ash round the edge, charcoal and dull embers inside. An uneven outline,
   a hair above the glow so the two never fight over the same plane */
.bed {
  position: absolute;
  left: calc(50% - 38 * var(--u));
  top: calc(50% - 34 * var(--u));
  width: calc(76 * var(--u));
  height: calc(68 * var(--u));
  border-radius: 48% 52% 44% 56% / 55% 47% 53% 45%;
  background:
    radial-gradient(circle at 36% 42%, rgb(255 140 60 / 0.8) 0, transparent calc(5 * var(--u))),
    radial-gradient(circle at 60% 58%, rgb(255 110 40 / 0.7) 0, transparent calc(6 * var(--u))),
    radial-gradient(circle at 55% 32%, #1c120e 0 calc(3.4 * var(--u)), transparent calc(4 * var(--u))),
    radial-gradient(circle at 30% 62%, #241713 0 calc(2.8 * var(--u)), transparent calc(3.4 * var(--u))),
    radial-gradient(circle at 70% 44%, #2b1c16 0 calc(2.4 * var(--u)), transparent calc(3 * var(--u))),
    radial-gradient(circle at 24% 34%, rgb(190 185 178 / 0.7) 0, transparent calc(6 * var(--u))),
    radial-gradient(circle at 78% 70%, rgb(170 165 158 / 0.6) 0, transparent calc(7 * var(--u))),
    radial-gradient(circle at 70% 20%, rgb(150 146 140 / 0.5) 0, transparent calc(6 * var(--u))),
    radial-gradient(circle at 30% 80%, rgb(130 126 120 / 0.55) 0, transparent calc(8 * var(--u))),
    radial-gradient(closest-side, #6a2410, #2a140c 42%, rgb(48 38 32 / 0.9) 66%, rgb(90 84 78 / 0.45) 84%, transparent);
  transform: translateZ(calc(0.6 * var(--u)));
}

/* hot spots in the bed, two layers breathing out of step: only their opacity moves */
.heat {
  position: absolute;
  left: calc(50% - 30 * var(--u));
  top: calc(50% - 27 * var(--u));
  width: calc(60 * var(--u));
  height: calc(54 * var(--u));
  border-radius: 50%;
  background:
    radial-gradient(circle at 40% 46%, #ffe7a0 0, rgb(255 150 60 / 0.9) calc(2 * var(--u)), transparent calc(6 * var(--u))),
    radial-gradient(circle at 62% 38%, #ffcf70 0, rgb(255 110 40 / 0.85) calc(1.6 * var(--u)), transparent calc(4.6 * var(--u))),
    radial-gradient(circle at 30% 64%, rgb(255 120 50 / 0.9) 0, transparent calc(4 * var(--u))),
    radial-gradient(closest-side, rgb(255 120 50 / 0.45), transparent 70%);
  transform: translateZ(calc(1.2 * var(--u)));
  animation: coals 2.5s ease-in-out infinite;
}

.heat.two {
  background:
    radial-gradient(circle at 56% 62%, #ffe08a 0, rgb(255 130 50 / 0.9) calc(2 * var(--u)), transparent calc(5.5 * var(--u))),
    radial-gradient(circle at 70% 52%, rgb(255 160 70 / 0.9) 0, transparent calc(3.6 * var(--u))),
    radial-gradient(circle at 46% 30%, rgb(255 100 40 / 0.85) 0, transparent calc(4.4 * var(--u)));
  transform: translateZ(calc(1.8 * var(--u)));
  animation: coals 1.6s ease-in-out -0.7s infinite;
}

@keyframes coals {
  0%, 100% { opacity: 0.35; }
  22%      { opacity: 0.9; }
  41%      { opacity: 0.6; }
  63%      { opacity: 1; }
  84%      { opacity: 0.5; }
}

/* a stone of the ring, standing on the ground and always facing you.
   Its bottom middle is placed on the ground's centre, turned to its angle and walked out; then it
   turns back by its own angle and by the ground's turn, stands up and leans a little */
.lump {
  position: absolute;
  left: calc(50% - var(--w) * var(--u) / 2);
  top: calc(50% - var(--h) * var(--u));
  width: calc(var(--w) * var(--u));
  height: calc(var(--h) * var(--u));
  border-radius: var(--br);
  /* firelight on its upper edge, a sheen, its foot in shadow, over its own grey */
  background:
    radial-gradient(90% 60% at 46% 8%, rgb(255 170 110 / 0.35), transparent 62%),
    radial-gradient(120% 110% at 36% 22%, rgb(255 255 255 / 0.18), transparent 55%),
    radial-gradient(circle at 28% 48%, rgb(0 0 0 / 0.1) 0 6%, transparent 7%),
    radial-gradient(circle at 70% 60%, rgb(0 0 0 / 0.12) 0 8%, transparent 9%),
    linear-gradient(to bottom, transparent 45%, rgb(20 16 14 / 0.5)),
    var(--g);
  transform-origin: 50% 100%;
  transform: rotateZ(var(--a)) translateY(calc(var(--r) * -1 * var(--u))) rotateZ(calc(0deg - var(--a))) rotateX(-90deg) rotate(var(--tl));
  animation: face 40s linear infinite;
}

/* the same placement, with the ground's turn undone as it turns */
@keyframes face {
  from { transform: rotateZ(var(--a)) translateY(calc(var(--r) * -1 * var(--u))) rotateZ(calc(0deg - var(--a))) rotateX(-90deg) rotate(var(--tl)); }
  to   { transform: rotateZ(var(--a)) translateY(calc(var(--r) * -1 * var(--u))) rotateZ(calc(-360deg - var(--a))) rotateX(-90deg) rotate(var(--tl)); }
}

/* a log's top face, which carries the rest of it. Its bottom edge is the outer end, and that is
   the point every turn and tilt is about */
.log {
  position: absolute;
  left: calc(50% - var(--w) * var(--u) / 2);
  top: calc(50% - var(--l) * var(--u));
  width: calc(var(--w) * var(--u));
  height: calc(var(--l) * var(--u));
  transform-style: preserve-3d;
  transform-origin: 50% 100%;
  transform: rotateZ(var(--a)) translateY(calc(var(--r) * var(--u))) rotateZ(var(--yw)) translateZ(calc((var(--z) + var(--th)) * var(--u))) rotateX(calc(0deg - var(--lean))) rotateY(var(--roll));
  /* from the inner end: grey ash on black char, the char fading into bark (ridges along it,
     cracks across it, darker at the edges so it reads round, and its own age on top) */
  background:
    radial-gradient(30% calc(1.6 * var(--u)) at 30% calc(var(--c) * 0.4 * var(--u)), rgb(170 165 158 / 0.5), transparent),
    radial-gradient(22% calc(1.2 * var(--u)) at 70% calc(var(--c) * 0.75 * var(--u)), rgb(160 156 150 / 0.4), transparent),
    linear-gradient(to bottom, #120b08 0, #1d120c calc(var(--c) * 0.7 * var(--u)), rgb(40 22 12 / 0.85) calc(var(--c) * var(--u)), transparent calc((var(--c) + 12) * var(--u))),
    linear-gradient(var(--tint), var(--tint)),
    repeating-linear-gradient(90deg, transparent 0 calc(1.7 * var(--u)), rgb(25 12 6 / 0.5) calc(1.7 * var(--u)) calc(2.3 * var(--u)), transparent calc(2.3 * var(--u)) calc(3.1 * var(--u)), rgb(170 120 80 / 0.2) calc(3.1 * var(--u)) calc(3.5 * var(--u))),
    repeating-linear-gradient(to bottom, transparent 0 calc(9 * var(--u)), rgb(20 10 5 / 0.4) calc(9 * var(--u)) calc(9.6 * var(--u)), transparent calc(9.6 * var(--u)) calc(14 * var(--u))),
    linear-gradient(90deg, #26160d, #5a3820 22%, #8a5a34 48%, #6a4226 70%, #24140b);
}

/* the sides, folded down from the long edges: the same burn and bark, a shade darker, lit at
   the top edge. ::after folds from the right edge, so its gradient runs the other way */
.log::before,
.log::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: calc(var(--th) * var(--u));
  height: 100%;
  background:
    radial-gradient(26% calc(1.4 * var(--u)) at 50% calc(var(--c) * 0.55 * var(--u)), rgb(160 155 148 / 0.45), transparent),
    linear-gradient(to bottom, #0e0806 0, #1a0f0a calc(var(--c) * 0.75 * var(--u)), rgb(30 16 10 / 0.85) calc(var(--c) * var(--u)), transparent calc((var(--c) + 10) * var(--u))),
    linear-gradient(var(--tint), var(--tint)),
    repeating-linear-gradient(90deg, transparent 0 calc(1.9 * var(--u)), rgb(20 10 6 / 0.5) calc(1.9 * var(--u)) calc(2.6 * var(--u))),
    linear-gradient(var(--sd, 90deg), #5e3a23, #3e2416 60%, #24150c);
  transform-origin: 0 50%;
  transform: rotateY(90deg);
}

.log::after {
  left: auto;
  right: 0;
  --sd: 270deg;
  transform-origin: 100% 50%;
  transform: rotateY(-90deg);
}

/* the underside, the log's thickness below the top face. It always carries the two ends; it is
   painted only on a steep log (.up), whose underside shows from the far side: on a low one it is
   never seen, and an unpainted face costs nothing to draw. Dark bark, glowing over the coals */
.log i {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--th) * -1 * var(--u)));
}

.log.up i {
  background:
    linear-gradient(to bottom, #3a1408 0, rgb(220 90 30 / 0.9) calc(var(--c) * 0.3 * var(--u)), #1a0e09 calc(var(--c) * 0.8 * var(--u)), transparent calc((var(--c) + 8) * var(--u))),
    repeating-linear-gradient(90deg, transparent 0 calc(2 * var(--u)), rgb(20 10 6 / 0.5) calc(2 * var(--u)) calc(2.7 * var(--u))),
    linear-gradient(90deg, #2a180e, #42281a 50%, #2a180e);
}

/* the two ends, folded up from the underside to meet the top face: sawn grain at the outer
   end, a glowing ember in grey ash at the burned inner end */
.log i::before,
.log i::after {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  height: calc(var(--th) * var(--u));
  border-radius: calc(var(--th) * 0.3 * var(--u));
}

.log i::before {
  bottom: 0;
  background:
    radial-gradient(closest-side, transparent 78%, #3f2517 82%),
    repeating-radial-gradient(circle at 46% 54%, #e8bd86 0 calc(1 * var(--u)), #bf8550 calc(1 * var(--u)) calc(2 * var(--u))),
    #3f2517;
  transform-origin: 50% 100%;
  transform: rotateX(-90deg);
}

.log i::after {
  top: 0;
  background: radial-gradient(closest-side, #ffe08a, #ff9a3c 30%, #d8481c 55%, #3a140a 78%, #8c8780 92%);
  transform-origin: 50% 0;
  transform: rotateX(90deg);
}

/* the smoulder: orange cracks in the char, a hair over the top face. Only its opacity moves,
   each log at its own pace, so the wood glows and dims */
.log b {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(var(--c) * var(--u));
  background:
    radial-gradient(80% calc(5 * var(--u)) at 50% 0, #ffd98a, rgb(255 130 45 / 0.85) 45%, transparent),
    radial-gradient(22% calc(1.8 * var(--u)) at var(--k1) 38%, rgb(255 160 70 / 0.95), transparent),
    radial-gradient(26% calc(1.4 * var(--u)) at var(--k2) 58%, rgb(255 110 40 / 0.9), transparent),
    radial-gradient(16% calc(1.2 * var(--u)) at var(--k1) 80%, rgb(255 90 40 / 0.7), transparent),
    linear-gradient(to bottom, rgb(255 90 30 / 0.35), transparent 60%);
  transform: translateZ(calc(0.3 * var(--u)));
  animation: smoulder var(--d) ease-in-out var(--dl) infinite;
}

@keyframes smoulder {
  0%, 100% { opacity: 0.4; }
  33%      { opacity: 1; }
  58%      { opacity: 0.68; }
  79%      { opacity: 0.94; }
}

/* one plane of a flame tongue: stands up where the tongue rises, turned about the vertical to its
   angle, and flickers from its foot on its own uneven keyframes (stretch, squeeze, sway, fade) */
.flame {
  position: absolute;
  left: calc(50% - 14 * var(--u));
  top: calc(50% - 28 * var(--u));
  width: calc(28 * var(--u));
  height: calc(28 * var(--u));
  transform-origin: 50% 100%;
  animation: flick-a var(--d) ease-in-out var(--t) infinite;
}

.flame.b {
  animation-name: flick-b;
}

@keyframes flick-a {
  0%, 100% { opacity: 1;    transform: translate3d(calc(var(--x) * var(--u)), calc(var(--y) * var(--u)), calc(var(--fz) * var(--u))) rotateX(-90deg) rotateY(var(--r)) rotate(var(--sw)) scale(calc(var(--s) * 0.92), calc(var(--s) * 1.5)); }
  27%      { opacity: 0.86; transform: translate3d(calc(var(--x) * var(--u)), calc(var(--y) * var(--u)), calc(var(--fz) * var(--u))) rotateX(-90deg) rotateY(var(--r)) rotate(calc(var(--sw) + 4deg)) scale(calc(var(--s) * 0.78), calc(var(--s) * 1.84)); }
  52%      { opacity: 0.97; transform: translate3d(calc(var(--x) * var(--u)), calc(var(--y) * var(--u)), calc(var(--fz) * var(--u))) rotateX(-90deg) rotateY(var(--r)) rotate(calc(var(--sw) - 3deg)) scale(calc(var(--s) * 1), calc(var(--s) * 1.4)); }
  74%      { opacity: 0.9;  transform: translate3d(calc(var(--x) * var(--u)), calc(var(--y) * var(--u)), calc(var(--fz) * var(--u))) rotateX(-90deg) rotateY(var(--r)) rotate(calc(var(--sw) + 1deg)) scale(calc(var(--s) * 0.85), calc(var(--s) * 1.7)); }
}

@keyframes flick-b {
  0%, 100% { opacity: 0.94; transform: translate3d(calc(var(--x) * var(--u)), calc(var(--y) * var(--u)), calc(var(--fz) * var(--u))) rotateX(-90deg) rotateY(var(--r)) rotate(calc(var(--sw) - 2deg)) scale(calc(var(--s) * 0.88), calc(var(--s) * 1.62)); }
  18%      { opacity: 1;    transform: translate3d(calc(var(--x) * var(--u)), calc(var(--y) * var(--u)), calc(var(--fz) * var(--u))) rotateX(-90deg) rotateY(var(--r)) rotate(calc(var(--sw) + 3deg)) scale(calc(var(--s) * 0.96), calc(var(--s) * 1.38)); }
  46%      { opacity: 0.82; transform: translate3d(calc(var(--x) * var(--u)), calc(var(--y) * var(--u)), calc(var(--fz) * var(--u))) rotateX(-90deg) rotateY(var(--r)) rotate(calc(var(--sw) - 5deg)) scale(calc(var(--s) * 0.74), calc(var(--s) * 1.9)); }
  70%      { opacity: 0.96; transform: translate3d(calc(var(--x) * var(--u)), calc(var(--y) * var(--u)), calc(var(--fz) * var(--u))) rotateX(-90deg) rotateY(var(--r)) rotate(calc(var(--sw) + 2deg)) scale(calc(var(--s) * 0.9), calc(var(--s) * 1.55)); }
}

/* the teardrop: a square with three round corners turned 45°, its point up. Pale at the foot,
   amber, then orange and a red-pink tip */
.flame::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 0 50% 50% 50%;
  background: radial-gradient(circle at 66% 66%, #fffbe8 0, #ffeaa6 10%, #ffc65a 26%, #ff9a3d 44%, #ff6a2e 62%, #f04a3a 80%, rgb(220 50 90 / 0.8) 100%);
  transform: rotate(45deg);
}

/* the hottest little tongues, low in the fire: nearly white */
.flame.core::before {
  background: radial-gradient(circle at 66% 66%, #ffffff 0, #fff6cc 22%, #ffe08a 46%, #ffb547 70%, rgb(255 120 60 / 0.9) 100%);
}

/* the carrier for the embers and the licks: turns back exactly as the ground turns, then stands
   up, so everything on it faces you all the way round */
.sparks {
  position: absolute;
  left: calc(50% - 30 * var(--u));
  top: calc(50% - 110 * var(--u));
  width: calc(60 * var(--u));
  height: calc(110 * var(--u));
  transform-style: preserve-3d;
  transform-origin: 50% 100%;
  animation: unturn 40s linear infinite;
}

@keyframes unturn {
  from { transform: rotateZ(0deg) rotateX(-90deg); }
  to   { transform: rotateZ(-360deg) rotateX(-90deg); }
}

/* a lick: a small teardrop that breaks off the flame, rises and fades */
.lick {
  position: absolute;
  left: calc(50% - 5 * var(--u) + var(--x) * var(--u));
  bottom: calc(54 * var(--u));
  width: calc(10 * var(--u));
  height: calc(10 * var(--u));
  border-radius: 0 50% 50% 50%;
  background: radial-gradient(circle at 64% 64%, #ffe9a8, #ffb547 40%, #ff6a5a 75%, #ff4d9d);
  opacity: 0;
  animation: lick var(--d) ease-out var(--t) infinite;
}

@keyframes lick {
  0%   { opacity: 0; transform: translateY(0) rotate(45deg) scale(1); }
  20%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(calc(-24 * var(--u))) rotate(45deg) scale(0.3); }
}

/* an ember: a hot fleck of its own size that rises out of the flame, drifts and goes out */
.ember {
  position: absolute;
  left: calc(50% + var(--x) * var(--u));
  bottom: calc(30 * var(--u));
  width: calc(var(--z) * var(--u));
  height: calc(var(--z) * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle, #fff1c4 0 30%, #ffb547 55%, #ff6a3d);
  box-shadow: 0 0 calc(var(--z) * 0.9 * var(--u)) calc(0.4 * var(--u)) rgb(255 120 60 / 0.8);
  opacity: 0;
  animation: rise var(--d) linear var(--t) infinite;
}

@keyframes rise {
  0%   { opacity: 0; transform: translate(0, 0); }
  15%  { opacity: 1; }
  60%  { opacity: 0.85; transform: translate(calc(var(--dx) * 0.6 * var(--u)), calc(-46 * var(--u))); }
  100% { opacity: 0; transform: translate(calc(var(--dx) * var(--u)), calc(-74 * var(--u))) scale(0.5); }
}`,
  },
};
