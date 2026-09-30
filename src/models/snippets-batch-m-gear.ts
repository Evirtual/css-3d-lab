import type { Snippet } from './snippet-utils';

const lines = (n: number, fn: (i: number) => string, indent = '    '): string =>
  Array.from({ length: n }, (_, i) => indent + fn(i)).join('\n');

/**
 * One gear's outline, in the base unit. Teeth are rectangular blocks of width 2 × HW standing on
 * the root circle (radius rr) out to the tip circle (rt), and the rim between two teeth is one
 * straight chord from flank foot to flank foot, so the front face's clip-path and the standing
 * side pieces meet on exactly the same edges. Both gears share HW and the tooth height, which is
 * what lets them mesh: a tooth of one is the size of a gap in the other.
 */
const HW = 11; // half the tooth width
const T = 16; // the gear's thickness, front face to back face

interface Gear {
  n: number; // teeth
  rr: number; // root radius
  rt: number; // tip radius
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** The rim chord in a gap: its width and its distance from the centre. */
const rim = ({ n, rr }: Gear) => {
  const foot = Math.hypot(HW, rr); // the flank's inner corner sits just outside the root circle
  const half = Math.PI / n - Math.atan2(HW, rr); // its angle from the middle of the gap
  return { width: r2(2 * foot * Math.sin(half)), dist: r2(foot * Math.cos(half)) };
};

/** The gear outline as clip-path polygon percentages of its 2 × rt box. */
const outline = ({ n, rr, rt }: Gear): string => {
  const s = 2 * rt;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    // the tooth's four corners, in its own frame (y up the screen is negative), turned by a
    for (const [x, y] of [[-HW, -rr], [-HW, -rt], [HW, -rt], [HW, -rr]] as const) {
      const px = 50 + (100 * (x * c - y * sn)) / s;
      const py = 50 + (100 * (x * sn + y * c)) / s;
      pts.push(`${r2(px)}% ${r2(py)}%`);
    }
  }
  return `polygon(${pts.join(', ')})`;
};

const BIG: Gear = { n: 8, rr: 62, rt: 80 }; // pitch radius 72
const SMALL: Gear = { n: 5, rr: 35, rt: 53 }; // pitch radius 45: 72 × 5 / 8, the same tooth size
const bigRim = rim(BIG);
const smallRim = rim(SMALL);

/** Two faces, then per tooth: its tip, its two flanks, and the rim chord in the gap after it. */
const gearHtml = (g: Gear, cls: string) => `  <div class="gear ${cls}">
    <b class="face front"></b>
    <b class="face back"></b>
${lines(g.n, (i) => `<i class="tip" style="--i:${i}"></i><i class="fl l" style="--i:${i}"></i><i class="fl r" style="--i:${i}"></i><i class="rim" style="--i:${i}"></i>`)}
  </div>`;

export const snippetsGear: Record<string, Snippet> = {
  gear: {
    how: [
      'A gear face is <b>one element</b> cut to the outline with <code>clip-path: polygon()</code>: eight rectangular teeth on a circle, and a straight chord across each gap. Two copies, front and back, are pushed apart with <code>translateZ(±8)</code>. That is the whole silhouette for four elements, where teeth built as boxes would cost dozens.',
      'A flat face seen edge-on draws nothing, so the thickness is real: a standing rectangle on every straight edge of the outline. The tip of tooth <i>i</i> is <code>rotateZ(i × 45deg) translateY(-80) rotateX(90deg)</code>, its two flanks are <code>translate(±11, -71) rotateY(90deg)</code> in the same turned frame, and the rim chord in the gap after it sits at the half step. The chord is exactly as long and as far out as the clip-path edge it stands on, so the pieces meet with no seam.',
      'Two gears mesh when their teeth are the same size, so the small one has the same tooth width and height and a pitch radius in the ratio of the tooth counts: 72 × 5 / 8 = 45. Their centres are one pitch radius each apart, 117, and the small gear starts turned 45° so a gap of its faces the big tooth that points at it.',
      'The big gear turns 360° in 12 s; the small one turns <code>-576deg</code>, 8/5 of a turn the other way, in the same 12 s. 576° is exactly eight teeth of a five-tooth gear, so the end pose is the start pose and the <code>linear</code> loop has no join.',
      'The tilt is a static <code>rotateX(55deg)</code> on a wrapper and only the gears spin inside it, both with <code>preserve-3d</code>. Every length is a multiple of one base unit, <code>--u</code>, so the pair is the same share of a gallery card, the editor and a recording canvas; the numbers above are those units.',
    ],
    html: `<div class="scene">
  <div class="rig">
${gearHtml(BIG, 'big')}
${gearHtml(SMALL, 'small')}
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the pair is the same share of a
     card, the editor, a full screen and a recording canvas */
  --u: 0.38vmin;
  position: relative;
  width: calc(216 * var(--u));
  height: calc(216 * var(--u));
  perspective: calc(800 * var(--u));
}

/* the static tilt; the gears spin inside it. The inner translate, in the gears' own plane,
   centres the pair (the small gear hangs off the big one's top right); the outer one, in screen
   space, is the last few units the perspective pulls it off by (the near, bottom side is drawn
   larger than the far one) */
.rig {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translate(calc(5 * var(--u)), calc(-8 * var(--u))) rotateX(55deg) translate(calc(-28 * var(--u)), calc(28 * var(--u)));
}

.gear {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-style: preserve-3d;
  animation: 12s linear infinite;
}

/* 8 teeth, tip radius 80, root 62: a 160 box. The tooth step is 45deg */
.big {
  --step: 45deg;
  --rt: 80;
  --rm: 71;           /* half way between root and tip: where a flank's middle sits */
  --rw: ${bigRim.width};        /* the rim chord in a gap: its length ... */
  --rd: ${bigRim.dist};        /* ... and how far out it stands */
  width: calc(160 * var(--u));
  height: calc(160 * var(--u));
  margin: calc(-80 * var(--u)) 0 0 calc(-80 * var(--u));
  animation-name: gear-cw;
}

/* 5 teeth, tip 53, root 35: a 106 box, its centre 117 up-right of the big one's at 45deg
   (117 × sin 45 = 82.7). Pitch radii 72 + 45 = 117 is what makes the teeth mesh */
.small {
  --step: 72deg;
  --rt: 53;
  --rm: 44;
  --rw: ${smallRim.width};
  --rd: ${smallRim.dist};
  width: calc(106 * var(--u));
  height: calc(106 * var(--u));
  margin: calc(-135.7 * var(--u)) 0 0 calc(29.7 * var(--u));
  animation-name: gear-ccw;
}

/* the two faces: one polygon each, 8 apart in depth */
.face {
  position: absolute;
  inset: 0;
}
.big .face { clip-path: ${outline(BIG)}; }
.small .face { clip-path: ${outline(SMALL)}; }
.front { transform: translateZ(calc(8 * var(--u))); }
.back { transform: translateZ(calc(-8 * var(--u))); }

/* the top face carries a painted hub ring, so the eye has a centre to see the turn against */
.big .front { background: radial-gradient(circle, #c9bcff 0 7%, #4a2fb8 7.5% 12%, #a390ff 12.5%, #8b6cff 55%, #7657f0); }
.big .back, .big .rim, .big .tip { background: #5f42d6; }
.big .fl { background: #4e33be; }
.small .front { background: radial-gradient(circle, #d6fffb 0 9%, #12857a 9.5% 15%, #7cf2e8 15.5%, #2ee6d6 55%, #22ccbd); }
.small .back, .small .rim, .small .tip { background: #159c90; }
.small .fl { background: #117f75; }

/* every standing piece starts centred on the gear, then is turned to its tooth, moved out and
   stood up. rotateX(90deg) stands a piece on a tangent (its height becomes depth, centred on the
   faces); rotateY(90deg) stands one on a radius */
.gear i {
  position: absolute;
  top: 50%;
  left: 50%;
}

/* a tooth's tip: 22 wide, the thickness tall, at the tip radius */
.tip {
  width: calc(22 * var(--u));
  height: calc(${T} * var(--u));
  margin: calc(${-T / 2} * var(--u)) 0 0 calc(-11 * var(--u));
  transform: rotateZ(calc(var(--i) * var(--step))) translateY(calc(-1 * var(--rt) * var(--u))) rotateX(90deg);
}

/* a flank: the thickness wide, the tooth height (18) tall, 11 either side of the tooth's centre
   line, its middle half way out the tooth */
.fl {
  width: calc(${T} * var(--u));
  height: calc(18 * var(--u));
  margin: calc(-9 * var(--u)) 0 0 calc(${-T / 2} * var(--u));
}
.fl.l { transform: rotateZ(calc(var(--i) * var(--step))) translate(calc(-11 * var(--u)), calc(-1 * var(--rm) * var(--u))) rotateY(90deg); }
.fl.r { transform: rotateZ(calc(var(--i) * var(--step))) translate(calc(11 * var(--u)), calc(-1 * var(--rm) * var(--u))) rotateY(90deg); }

/* the rim in the gap after tooth i: a chord at the half step, sized to meet both flanks' feet */
.rim {
  width: calc(var(--rw) * var(--u));
  height: calc(${T} * var(--u));
  margin: calc(${-T / 2} * var(--u)) 0 0 calc(-0.5 * var(--rw) * var(--u));
  transform: rotateZ(calc((var(--i) + 0.5) * var(--step))) translateY(calc(-1 * var(--rd) * var(--u))) rotateX(90deg);
}

@keyframes gear-cw {
  from { transform: rotateZ(0deg); }
  to   { transform: rotateZ(360deg); }
}

/* starts at 45deg so a gap faces the big gear's tooth; -576deg is 8/5 of a turn, eight of its
   five teeth, so it ends on the pose it started in */
@keyframes gear-ccw {
  from { transform: rotateZ(45deg); }
  to   { transform: rotateZ(-531deg); }
}`,
  },
};
