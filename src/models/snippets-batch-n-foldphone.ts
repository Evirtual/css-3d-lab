import type { Snippet } from './snippet-utils';

/** The nine app icons on the right half of the inner screen, each a gradient of the house colours. */
const ICONS = [
  ['#8b6cff', '#5a3fd6'],
  ['#2ee6d6', '#12a397'],
  ['#ff4d9d', '#c81f6c'],
  ['#ffb547', '#e07a12'],
  ['#ff4d9d', '#8b6cff'],
  ['#2ee6d6', '#8b6cff'],
  ['#ffb547', '#ff4d9d'],
  ['#8b6cff', '#2ee6d6'],
  ['#eceefb', '#9aa0c8'],
]
  .map(([a, b]) => `<i style="--a:${a}; --b:${b}"></i>`)
  .join('');

/** Copy-paste version of the foldable phone (batch-n-foldphone.ts): plain HTML + CSS, no JS. */
export const snippetsFoldphone: Record<string, Snippet> = {
  foldphone: {
    how: [
      'Each half is a thin slab: the screen side at z = 0, a core halfway in, the back at z = −5 turned <code>rotateY(180deg)</code>, and a strip on its top, bottom and outer edge. The core is the trick for the rounded corners: the edge strips stop where a corner starts to curve, and the core, the same rounded shape, fills the gap so no daylight shows through.',
      'The left half never moves. The right half is a <code>0 × 0</code> wrapper sitting on the hinge line, so its own <code>rotateY()</code> turns it about the hinge: <code>-180deg</code> folds it toward you and face down onto the left half, which is shut, and <code>0deg</code> lays it flat beside it, which is open. Shut, its back is what faces you, so the cover screen lives there, and it reads the right way round because the two half-turns cancel.',
      'The spine is a strip behind the hinge that turns at <b>half</b> the fold angle, <code>-90deg</code> when shut. A hinge cover does exactly that: it sits flat behind the open phone and stands across the fold when it is shut, always on the outside of the bend.',
      'The inner screen is one wallpaper in two pieces: both halves paint the same gradient at <code>background-size: 200% 100%</code>, the left showing its left half and the right its right, so the picture runs straight across the fold. It fades in with <code>opacity</code> as the phone opens, after a short delay, as a real screen wakes.',
      'Shut, the phone is the left half only, so a wrapper slides it right by half a width to centre it, and back to 0 as it opens. The hovered element is a static wrapper with <code>tabindex="0"</code>, so focus opens it too. Every length is a multiple of one base unit, <code>--u</code>.',
    ],
    html: `<div class="scene">
  <div class="phone" tabindex="0" role="img" aria-label="A foldable phone: hover or focus to open it like a book">
    <div class="view">
      <div class="slide">
        <div class="half left">
          <b class="face screen"><span class="display"><b class="time">10:08</b><b class="card"></b></span></b>
          <b class="face core"></b>
          <b class="face back"></b>
          <b class="edge top"></b><b class="edge bottom"></b><b class="edge outer"></b>
        </div>
        <div class="half leaf">
          <b class="face screen"><span class="display"><span class="apps">${ICONS}</span></span></b>
          <b class="face core"></b>
          <b class="face back cover"><span class="glass"><b class="time">10:08</b><b class="rings"></b></span></b>
          <b class="edge top"></b><b class="edge bottom"></b><b class="edge outer"></b>
        </div>
        <b class="spine"></b>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the phone is the same share of a
     card, the editor, a full screen and a recording canvas. A long lens (1100 units), so the half
     that swings toward you mid-fold is not blown up */
  --u: 0.28vmin;
  perspective: calc(1100 * var(--u));
}

/* the static hit area: the shut phone's box. It never moves, so the hover cannot flicker */
.phone {
  --w: calc(100 * var(--u)); /* a half's width */
  --h: calc(210 * var(--u)); /* the phone's height */
  --t: calc(5 * var(--u));   /* a half's thickness */
  --r: calc(14 * var(--u));  /* the outer corners */
  --frame: linear-gradient(90deg, #4b4766, #8e8aad 45%, #3a3752);
  position: relative;
  display: grid;
  place-items: center;
  width: calc(116 * var(--u));
  height: calc(226 * var(--u));
  border-radius: calc(18 * var(--u));
  cursor: pointer;
  outline: none;
  transform-style: preserve-3d;
}

/* the focus ring: round the open phone, since focus opens it; it takes no pointer */
.phone:focus-visible::before {
  content: '';
  position: absolute;
  inset: calc(-6 * var(--u)) calc(-50 * var(--u));
  border: calc(2 * var(--u)) solid #8b6cff;
  border-radius: calc(18 * var(--u));
  pointer-events: none;
}

/* 0 × 0 at the middle of the hinge. Seen from the left, so the half that swings out toward you
   shows you its face all the way round instead of passing edge-on; shut, the cover and both
   halves' edges show. Open, it turns nearer to face you */
.view {
  width: 0;
  height: 0;
  pointer-events: none;
  transform-style: preserve-3d;
  transform: rotateX(-8deg) rotateY(26deg);
  transition: transform 1.4s cubic-bezier(0.45, 0, 0.2, 1);
}

/* shut, the phone is only the left half, -w to 0: slid right by half a width, it is centred */
.slide {
  transform-style: preserve-3d;
  transform: translateX(calc(var(--w) / 2));
  transition: transform 1.4s cubic-bezier(0.45, 0, 0.2, 1);
}

.half {
  position: absolute;
  transform-style: preserve-3d;
}

/* the right half turns about the hinge line, which is its own 0 × 0 origin. Shut: folded toward
   you, face down on the left half */
.leaf {
  transform: rotateY(-180deg);
  transition: transform 1.4s cubic-bezier(0.45, 0, 0.2, 1);
}

/* --- the faces: the screen side, a core halfway in, the back. The left half runs from -w to 0,
   the right from 0 to w; only the outer corners are rounded --- */
.face {
  position: absolute;
  top: calc(var(--h) / -2);
  width: var(--w);
  height: var(--h);
  box-sizing: border-box;
}
.left .face { left: calc(var(--w) * -1); border-radius: var(--r) 0 0 var(--r); }
.leaf .face { left: 0; border-radius: 0 var(--r) var(--r) 0; }

.screen {
  background: #0c0c14;
  backface-visibility: hidden;
}
/* the core: plugs the rounded corners, where the edge strips stop */
.core {
  background: #5d5980;
  transform: translateZ(calc(var(--t) / -2));
}
/* the back: turned round, so its own corners are mirrored */
.back {
  background: linear-gradient(160deg, #3d3863, #262340);
  backface-visibility: hidden;
  transform: translateZ(calc(var(--t) * -1)) rotateY(180deg);
}
.left .back { border-radius: 0 var(--r) var(--r) 0; }
.leaf .back { border-radius: var(--r) 0 0 var(--r); }

/* --- the edges: strips standing on the top, bottom and outer side, stopping where a corner
   curves. Each is centred on its edge, then stood up --- */
.edge {
  position: absolute;
  background: var(--frame);
}
.edge.top,
.edge.bottom {
  width: calc(var(--w) - var(--r));
  height: var(--t);
}
.edge.top { top: calc((var(--h) + var(--t)) / -2); transform: translateZ(calc(var(--t) / -2)) rotateX(90deg); }
.edge.bottom { top: calc((var(--h) - var(--t)) / 2); transform: translateZ(calc(var(--t) / -2)) rotateX(90deg); }
.left .edge.top,
.left .edge.bottom { left: calc((var(--w) - var(--r)) * -1); }
.leaf .edge.top,
.leaf .edge.bottom { left: 0; }
.edge.outer {
  top: calc(var(--h) / -2 + var(--r));
  width: var(--t);
  height: calc(var(--h) - 2 * var(--r));
  background: linear-gradient(#8e8aad, #4b4766);
  transform: translateZ(calc(var(--t) / -2)) rotateY(90deg);
}
.left .edge.outer { left: calc(var(--w) * -1 - var(--t) / 2); }
.leaf .edge.outer { left: calc(var(--w) - var(--t) / 2); }

/* the spine: a rounded strip across the hinge, its face turned away from the screens, half a unit
   behind the hinge line. Open, that is inside the slabs, out of sight; it turns about the hinge
   line at half the fold angle, so shut it stands across the fold, flush with both halves' edges */
.spine {
  position: absolute;
  left: calc(var(--t) * -1);
  top: calc(var(--h) / -2 + 3 * var(--u));
  width: calc(var(--t) * 2);
  height: calc(var(--h) - 6 * var(--u));
  border-radius: calc(4 * var(--u));
  background: linear-gradient(90deg, #2f2c46, #a6a2c4 50%, #2f2c46);
  transform: rotateY(-90deg) translateZ(calc(-0.5 * var(--u))) rotateY(180deg);
  transition: transform 1.4s cubic-bezier(0.45, 0, 0.2, 1);
}

/* --- the inner screen: one wallpaper across both halves, dark until it opens --- */
.display {
  position: absolute;
  inset: calc(4 * var(--u)) 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 88%, rgb(255 77 157 / 0.55), transparent 32%),
    radial-gradient(circle at 86% 12%, rgb(46 230 214 / 0.45), transparent 30%),
    linear-gradient(135deg, #1b1248, #2c176e 45%, #101f4a);
  background-size: 200% 100%;
  opacity: 0;
  transition: opacity 0.7s;
}
.left .display { left: calc(4 * var(--u)); border-radius: calc(var(--r) - 4 * var(--u)) 0 0 calc(var(--r) - 4 * var(--u)); background-position: 0 0; }
.leaf .display { right: calc(4 * var(--u)); border-radius: 0 calc(var(--r) - 4 * var(--u)) calc(var(--r) - 4 * var(--u)) 0; background-position: 100% 0; }
/* the fold itself: a soft shade along the crease */
.display::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(var(--to), rgb(0 0 0 / 0.35), transparent calc(8 * var(--u)));
}
.left .display::after { --to: to left; }
.leaf .display::after { --to: to right; }

/* white on the darkest part of the wallpaper */
.display .time {
  position: absolute;
  left: calc(10 * var(--u));
  top: calc(18 * var(--u));
  font: 700 calc(30 * var(--u)) / 1 Inter, system-ui, sans-serif;
  letter-spacing: calc(-0.6 * var(--u));
  color: #fff;
}
/* a widget: a sun and two lines, no words */
.card {
  position: absolute;
  left: calc(10 * var(--u));
  top: calc(64 * var(--u));
  width: calc(76 * var(--u));
  height: calc(40 * var(--u));
  border-radius: calc(9 * var(--u));
  background:
    radial-gradient(circle at calc(19 * var(--u)) 50%, #ffb547 0 calc(9 * var(--u)), transparent calc(9.5 * var(--u))),
    linear-gradient(rgb(255 255 255 / 0.8) 0 0) calc(36 * var(--u)) calc(13 * var(--u)) / calc(30 * var(--u)) calc(4 * var(--u)) no-repeat,
    linear-gradient(rgb(255 255 255 / 0.45) 0 0) calc(36 * var(--u)) calc(23 * var(--u)) / calc(20 * var(--u)) calc(4 * var(--u)) no-repeat,
    rgb(255 255 255 / 0.12);
}

/* nine app icons, three by three */
.apps {
  position: absolute;
  left: calc(10 * var(--u));
  top: calc(20 * var(--u));
  display: grid;
  grid-template-columns: repeat(3, calc(20 * var(--u)));
  gap: calc(9 * var(--u));
}
.apps i {
  height: calc(20 * var(--u));
  border-radius: calc(6 * var(--u));
  background: linear-gradient(135deg, var(--a), var(--b));
}

/* --- the cover screen, on the right half's back: what faces you when it is shut --- */
.glass {
  position: absolute;
  inset: calc(4 * var(--u));
  border-radius: calc(var(--r) - 4 * var(--u));
  /* a deep violet lock screen with a sheen across the glass: dark enough for white words, and
     never mistakable for the stage behind it */
  background:
    linear-gradient(115deg, transparent 30%, rgb(255 255 255 / 0.06) 30% 46%, transparent 46%),
    #191536;
}
/* the punch-hole camera */
.glass::before {
  content: '';
  position: absolute;
  left: calc(50% - 3 * var(--u));
  top: calc(6 * var(--u));
  width: calc(6 * var(--u));
  height: calc(6 * var(--u));
  border-radius: 50%;
  background: #2b2a40;
}
.glass .time {
  position: absolute;
  inset: calc(34 * var(--u)) 0 auto;
  text-align: center;
  font: 700 calc(30 * var(--u)) / 1 Inter, system-ui, sans-serif;
  letter-spacing: calc(-0.6 * var(--u));
  color: #fff;
}
/* two activity rings: teal and pink arcs on their dim tracks */
.rings {
  position: absolute;
  left: calc(50% - 26 * var(--u));
  top: calc(96 * var(--u));
  width: calc(52 * var(--u));
  height: calc(52 * var(--u));
  border-radius: 50%;
  background:
    radial-gradient(closest-side, #191536 calc(100% - 6 * var(--u)), transparent calc(100% - 5.6 * var(--u))),
    conic-gradient(#2ee6d6 0 72%, rgb(46 230 214 / 0.2) 72%);
}
.rings::after {
  content: '';
  position: absolute;
  inset: calc(9 * var(--u));
  border-radius: 50%;
  background:
    radial-gradient(closest-side, #191536 calc(100% - 6 * var(--u)), transparent calc(100% - 5.6 * var(--u))),
    conic-gradient(#ff4d9d 0 45%, rgb(255 77 157 / 0.2) 45%);
}

/* --- open: on hover or focus --- */
.phone:hover .view,
.phone:focus-visible .view,
.phone:focus-within .view {
  transform: rotateX(-6deg) rotateY(12deg);
}
.phone:hover .slide,
.phone:focus-visible .slide,
.phone:focus-within .slide {
  transform: translateX(0);
}
.phone:hover .leaf,
.phone:focus-visible .leaf,
.phone:focus-within .leaf {
  transform: rotateY(0deg);
}
.phone:hover .spine,
.phone:focus-visible .spine,
.phone:focus-within .spine {
  transform: rotateY(0deg) translateZ(calc(-0.5 * var(--u))) rotateY(180deg);
}
/* the screen wakes as it opens */
.phone:hover .display,
.phone:focus-visible .display,
.phone:focus-within .display {
  opacity: 1;
  transition: opacity 0.6s 0.5s;
}`,
  },
};
