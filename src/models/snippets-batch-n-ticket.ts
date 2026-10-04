import type { Snippet } from './snippet-utils';

export const snippetsTicket: Record<string, Snippet> = {
  ticket: {
    how: [
      'The ticket is two pieces of paper side by side, the body and the stub, and the perforation is the line where they meet. Each piece cuts its own half of every hole: a <code>mask</code> of three layers, a notch at each corner and a column of small bites repeated down the edge every 10 units, combined with <code>mask-composite: intersect</code> so a pixel shows only where all three let it. At rest the half-bites of both pieces meet and read as round punched holes; torn apart, each edge is left scalloped, the way real perforated paper tears.',
      'The stub\'s <code>transform-origin</code> is on its torn edge just above the bottom notch, at the last hole of the perforation, which is what it still hangs by. Hovered, it turns <code>rotateZ(20deg)</code> about that point, so the tear opens from the top down and the stub droops, then <code>rotateY(38deg)</code> about the same point, so it swings away from you as well. Written in that order, the droop happens in the paper\'s own plane and the swing is about the torn edge.',
      'Tearing, the transition runs on an overshooting <code>cubic-bezier(0.34, 1.5, 0.6, 1)</code>: the stub swings past where it settles and comes back, like paper that has just let go. Going back it eases in without overshooting, since paper cannot swing through the body it tore from: a transition is taken from the state being entered, so each direction has its own. Only <code>transform</code> is transitioned.',
      'The hover is taken by the wrapper, which never moves, and everything inside it has <code>pointer-events: none</code>, so the stub swinging out from under the pointer cannot drop the hover. <code>tabindex="0"</code> and <code>:focus-visible</code> give the keyboard the same tear. Every word sits on the ticket\'s own paper, dark ink on the cream body and white on the deep stub, so it reads the same on a dark stage and a light one.',
      'The ticket lies tilted back and turned a little, so the stub\'s swing reads in depth. Every length is a multiple of one base unit, <code>--u</code>, so the ticket is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="ticket" tabindex="0" role="img" aria-label="Event ticket for Night of Depth: hover or focus to tear off the stub">
    <div class="rig">
      <div class="body">
        <p class="kicker">CSS 3D LAB PRESENTS</p>
        <p class="title">Night of Depth</p>
        <p class="sub">perspective · preserve-3d · backface</p>
        <dl class="info">
          <div><dt>DATE</dt><dd>04 OCT</dd></div>
          <div><dt>DOORS</dt><dd>20:00</dd></div>
          <div><dt>SEAT</dt><dd>F · 12</dd></div>
        </dl>
      </div>
      <div class="stub">
        <p class="admit">ADMIT ONE</p>
        <p class="serial">No. 004127</p>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the ticket is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.28vmin;
  perspective: calc(900 * var(--u));
}

/* the wrapper takes the hover and never moves: its hit box is the ticket's own footprint */
.ticket {
  position: relative;
  width: calc(300 * var(--u));
  height: calc(140 * var(--u));
  cursor: pointer;
  outline: none;
  transform-style: preserve-3d;
}
.ticket:focus-visible {
  outline: 0.6vmin solid #6a45f5;
  outline-offset: 1vmin;
}

/* nothing inside answers the pointer, so the stub swinging out from under it cannot drop the
   hover; every box says which size it means */
.ticket * {
  box-sizing: border-box;
  margin: 0;
  pointer-events: none;
}

/* the ticket lies tilted back and turned a little to the right, so the stub's swing reads in
   depth. The torn stub swings out to the right, so the ticket sits a little left: centred at
   rest and torn alike */
.rig {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translateX(calc(-12 * var(--u))) rotateX(18deg) rotateY(-16deg) rotateZ(-4deg);
}

/* the two pieces of paper. Each cuts its own half of every hole with a mask of three layers: a
   notch at each corner of the perforation, and a bite repeated every 10 units down the edge.
   intersect keeps a pixel only where all three keep it */
.body,
.stub {
  --cut: calc(11 * var(--u));
  --hole: calc(2.6 * var(--u));
  --edge: 100%;
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: calc(8 * var(--u));
  mask:
    radial-gradient(circle at var(--edge) 0, #0000 var(--cut), #000 calc(var(--cut) + 0.6 * var(--u))),
    radial-gradient(circle at var(--edge) 100%, #0000 var(--cut), #000 calc(var(--cut) + 0.6 * var(--u))),
    radial-gradient(circle at var(--edge) 50%, #0000 var(--hole), #000 calc(var(--hole) + 0.6 * var(--u))) 0 0 / 100% calc(10 * var(--u)) repeat-y;
  mask-composite: intersect;
}

/* the body: cream paper, dark ink, and a thin band of the accent along its left end */
.body {
  left: 0;
  width: calc(216 * var(--u));
  padding: calc(16 * var(--u)) calc(18 * var(--u)) 0 calc(26 * var(--u));
  border-radius: calc(8 * var(--u)) 0 0 calc(8 * var(--u));
  background:
    linear-gradient(#8b6cff, #ff4d9d) 0 0 / calc(8 * var(--u)) 100% no-repeat,
    linear-gradient(160deg, #fffaf0, #f6ecda);
  color: #14172b;
}
.kicker {
  font: 700 calc(7 * var(--u)) / 1 'JetBrains Mono', monospace;
  letter-spacing: calc(1.2 * var(--u));
  color: #4424bf;
}
.title {
  margin-top: calc(9 * var(--u));
  font: 700 calc(25 * var(--u)) / 1 Inter, system-ui, sans-serif;
  letter-spacing: calc(-0.5 * var(--u));
}
.sub {
  margin-top: calc(7 * var(--u));
  font: 400 calc(7.5 * var(--u)) / 1 'JetBrains Mono', monospace;
  color: #2c3048;
}
/* the facts along the bottom, a ruled line above them */
.info {
  position: absolute;
  left: calc(26 * var(--u));
  right: calc(18 * var(--u));
  bottom: calc(16 * var(--u));
  display: flex;
  justify-content: space-between;
  padding-top: calc(9 * var(--u));
  border-top: calc(1 * var(--u)) dashed rgb(20 23 43 / 0.3);
}
.info dt {
  font: 400 calc(6.5 * var(--u)) / 1 'JetBrains Mono', monospace;
  letter-spacing: calc(0.8 * var(--u));
  color: #2c3048;
}
.info dd {
  margin-top: calc(4 * var(--u));
  font: 700 calc(12 * var(--u)) / 1 Inter, system-ui, sans-serif;
}

/* the stub: deep violet into pink, white words and a barcode down its right side. Its origin is
   on its left edge just above the bottom notch, at the last hole of the perforation, which is
   what it still hangs by once torn */
.stub {
  --edge: 0%;
  left: calc(216 * var(--u));
  width: calc(84 * var(--u));
  border-radius: 0 calc(8 * var(--u)) calc(8 * var(--u)) 0;
  background:
    repeating-linear-gradient(180deg, rgb(255 255 255 / 0.6) 0 calc(1.5 * var(--u)), transparent 0 calc(3 * var(--u)), rgb(255 255 255 / 0.6) 0 calc(3.8 * var(--u)), transparent 0 calc(6.5 * var(--u))) calc(60 * var(--u)) calc(16 * var(--u)) / calc(12 * var(--u)) calc(108 * var(--u)) no-repeat,
    linear-gradient(160deg, #5a3fd6, #c2186a);
  color: #fff;
  transform-origin: 0 calc(100% - 12 * var(--u));
  /* the same list in both states, so each function turns on its own */
  transform: rotateY(0deg) rotateZ(0deg);
  /* back into place without overshooting: paper cannot swing through the body it tore from */
  transition: transform 0.5s cubic-bezier(0.3, 0, 0.2, 1);
}
/* torn: it droops about the last hole in its own plane, then swings away about the torn edge */
.ticket:hover .stub,
.ticket:focus-visible .stub {
  transform: rotateY(38deg) rotateZ(20deg);
  /* past where it settles and back, like paper that has just let go */
  transition: transform 0.7s cubic-bezier(0.34, 1.5, 0.6, 1);
}
/* the words run up the stub, as on a real one */
.admit {
  position: absolute;
  left: calc(14 * var(--u));
  top: calc(16 * var(--u));
  writing-mode: vertical-rl;
  font: 700 calc(15 * var(--u)) / 1 Inter, system-ui, sans-serif;
  letter-spacing: calc(1.5 * var(--u));
}
.serial {
  position: absolute;
  left: calc(38 * var(--u));
  top: calc(16 * var(--u));
  writing-mode: vertical-rl;
  font: 400 calc(7.5 * var(--u)) / 1 'JetBrains Mono', monospace;
  letter-spacing: calc(0.8 * var(--u));
}`,
  },
};
