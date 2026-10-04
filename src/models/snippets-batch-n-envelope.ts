import type { Snippet } from './snippet-utils';

export const snippetsEnvelope: Record<string, Snippet> = {
  envelope: {
    how: [
      'The envelope is three flat layers a few units apart in depth: the lined back panel at <code>translateZ(0)</code>, the letter at 2 units and the pocket in front at 4. The pocket is one box cut to a V at the top with <code>clip-path</code>, its bottom flap a lighter triangle on its <code>::before</code>, so the letter shows through the V and is hidden everywhere else.',
      'The flap has to be in front of the pocket while it is closed and behind the letter once it is open, and a flat sheet turning about its own edge stays in one plane, so it cannot be both. So the hinge sits at 3 units, and the flap inside it is pushed out <code>translateZ(2)</code>: closed, that puts it at 5, in front of everything; turned <code>rotateX(180deg)</code> about the hinge, the same 2 units land it at 1, behind the letter. The depth sorting does the rest, with no <code>z-index</code>.',
      'The flap is two faces with <code>backface-visibility: hidden</code>: the violet outside with its wax seal, and the striped lining turned <code>rotateX(180deg)</code> to face the other way. Closed you see the outside; open, the lining. The lining\'s triangle is cut upside down, so after its own flip it covers exactly the outside\'s shape.',
      'Each part takes its own transition in each direction, because a transition belongs to the state being entered. Opening, the flap turns at once and the letter waits 0.45 s for it; closing, the letter drops first and the flap waits for it. The rig sinks as it opens, in step with the flap, so the rising letter and the closed envelope are both centred in the canvas.',
      'The wrapper takes the hover and never moves, and everything in it has <code>pointer-events: none</code>; <code>tabindex="0"</code> and <code>:focus-visible</code> open it from the keyboard. Every length is a multiple of one base unit, <code>--u</code>, so the envelope is the same share of a gallery card, the editor and a recording canvas.',
    ],
    html: `<div class="scene">
  <div class="envelope" tabindex="0" role="img" aria-label="A sealed envelope: hover or focus to open it and slide out the invitation">
    <div class="rig">
      <div class="back"></div>
      <div class="letter">
        <p class="kicker">YOU ARE INVITED</p>
        <p class="title">A night<br>of depth</p>
        <p class="when">04 · 10 · 2026 — 20:00</p>
      </div>
      <div class="pocket"></div>
      <div class="hinge">
        <div class="flap out"><i class="seal"></i></div>
        <div class="flap in"></div>
      </div>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the envelope is the same share of
     a gallery card, the editor, a full screen and a recording canvas */
  --u: 0.24vmin;
  perspective: calc(900 * var(--u));
}

/* the wrapper takes the hover and never moves: its hit box is the envelope's own footprint */
.envelope {
  position: relative;
  width: calc(240 * var(--u));
  height: calc(165 * var(--u));
  cursor: pointer;
  outline: none;
  transform-style: preserve-3d;
}
.envelope:focus-visible {
  outline: 0.6vmin solid #6a45f5;
  outline-offset: 1vmin;
}
.envelope * {
  box-sizing: border-box;
  margin: 0;
  pointer-events: none;
}

/* the envelope, tilted back and turned a little. Open, the letter and the flap rise above it,
   so the rig sinks by half of that rise: the closed envelope is centred at rest and the open
   one, letter included, is centred too */
.rig {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: translateY(0) rotateX(12deg) rotateY(-18deg);
  /* in step with the flap, both ways: the flap's tip is the highest thing drawn, and the rig
     sinking with it keeps it from rising above the open pose */
  transition: transform 0.6s cubic-bezier(0.45, 0, 0.25, 1) 0.4s;
}
.envelope:hover .rig,
.envelope:focus-visible .rig {
  transform: translateY(calc(48 * var(--u))) rotateX(12deg) rotateY(-18deg);
  transition-delay: 0s;
}

/* the back panel: envelope paper round the edge, where it peeks past the pocket at an angle,
   and inside it the lining, seen through the pocket's V once the flap is open */
.back {
  position: absolute;
  inset: 0;
  border: calc(4 * var(--u)) solid #5a3fd0;
  border-radius: calc(6 * var(--u));
  background: repeating-linear-gradient(135deg, #3b2a92 0 calc(7 * var(--u)), #2ee6d6 0 calc(9 * var(--u)), #3b2a92 0 calc(16 * var(--u)));
}

/* the letter, between the back and the pocket, narrower than the flap so the open flap's lining
   shows either side of it. Opening, it waits for the flap to be out of
   the way; closing, it goes first */
.letter {
  position: absolute;
  left: calc(30 * var(--u));
  top: calc(8 * var(--u));
  width: calc(180 * var(--u));
  height: calc(150 * var(--u));
  padding: calc(15 * var(--u)) calc(12 * var(--u));
  border-radius: calc(4 * var(--u));
  background: linear-gradient(170deg, #fffdf7, #f3ead8);
  color: #14172b;
  text-align: center;
  transform: translateZ(calc(2 * var(--u))) translateY(0);
  transition: transform 0.45s cubic-bezier(0.5, 0, 0.75, 0);
}
.envelope:hover .letter,
.envelope:focus-visible .letter {
  transform: translateZ(calc(2 * var(--u))) translateY(calc(-92 * var(--u)));
  transition: transform 0.7s cubic-bezier(0.2, 0.9, 0.3, 1) 0.45s;
}
.kicker {
  font: 700 calc(7 * var(--u)) / 1 'JetBrains Mono', monospace;
  letter-spacing: calc(1.6 * var(--u));
  color: #4424bf;
}
.title {
  margin-top: calc(9 * var(--u));
  font: 700 calc(22 * var(--u)) / 1.05 Inter, system-ui, sans-serif;
  letter-spacing: calc(-0.4 * var(--u));
}
.when {
  margin-top: calc(9 * var(--u));
  font: 400 calc(8 * var(--u)) / 1 'JetBrains Mono', monospace;
  color: #2c3048;
}

/* the pocket: the front of the envelope, cut to a V at the top so the letter shows through,
   its side flaps the box itself and its bottom flap a lighter triangle on ::before */
.pocket {
  position: absolute;
  inset: 0;
  border-radius: calc(6 * var(--u));
  background: linear-gradient(#7c5ef2, #6446dc);
  clip-path: polygon(0 0, 50% 54%, 100% 0, 100% 100%, 0 100%);
  transform: translateZ(calc(4 * var(--u)));
}
.pocket::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(#a28cff, #8b6cff);
  clip-path: polygon(0 100%, 50% 46%, 100% 100%);
}

/* the hinge: the top edge, at 3 units, between the letter and the pocket. It turns the flap
   over the top; the flap inside is 2 units in front of it, so closed it lies at 5, over the
   pocket, and open at 1, behind the letter. Opening it turns at once; closing it waits for
   the letter to be back in */
.hinge {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: calc(96 * var(--u));
  transform-style: preserve-3d;
  transform-origin: 50% 0;
  transform: translateZ(calc(3 * var(--u))) rotateX(0deg);
  transition: transform 0.6s cubic-bezier(0.45, 0, 0.25, 1) 0.4s;
}
.envelope:hover .hinge,
.envelope:focus-visible .hinge {
  transform: translateZ(calc(3 * var(--u))) rotateX(180deg);
  transition-delay: 0s;
}

/* the two faces of the flap, each hidden from behind */
.flap {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}
.flap.out {
  background: linear-gradient(#b7a5ff, #9479ff);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  transform: translateZ(calc(2 * var(--u)));
}
/* the lining, turned to face the other way: cut upside down, so after its flip it covers the
   same triangle as the outside */
.flap.in {
  background: repeating-linear-gradient(45deg, #3b2a92 0 calc(7 * var(--u)), #2ee6d6 0 calc(9 * var(--u)), #3b2a92 0 calc(16 * var(--u)));
  clip-path: polygon(0 100%, 100% 100%, 50% 0);
  transform: translateZ(calc(2 * var(--u))) rotateX(180deg);
}

/* the wax seal at the tip of the flap */
.seal {
  position: absolute;
  left: calc(50% - 13 * var(--u));
  bottom: calc(15 * var(--u));
  width: calc(26 * var(--u));
  height: calc(26 * var(--u));
  border-radius: 50%;
  background:
    radial-gradient(circle, transparent 46%, rgb(255 255 255 / 0.35) 48% 53%, transparent 55%),
    radial-gradient(circle at 35% 30%, #ff9cc6, #ff4d9d 45%, #b3165e);
}`,
  },
};
