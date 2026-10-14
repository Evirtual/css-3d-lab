import type { Snippet } from './snippet-utils';

export const snippetsBlackhole: Record<string, Snippet> = {
  blackhole: {
    how: [
      'The event horizon is one black circle facing you, and its edge is the photon ring: the same <code>radial-gradient</code> turns from black to a thin band of white-hot gold in its last few percent, so the brightest line in the picture hugs the dark.',
      'The accretion disk is a square laid back with <code>rotateX(78deg)</code>, nearly edge on, and cut into a ring by a <code>radial-gradient</code> mask: clear in the middle, solid across the ring, fading at the rim. Its colour runs white-hot at the inner edge through amber and orange to a faint rose. Because it is a real plane through the horizon&rsquo;s plane, <code>transform-style: preserve-3d</code> lets the browser sort it: the near half crosses in front of the black disc, the far half goes behind it, and nobody had to cut either one.',
      'The disk spins with <code>rotateZ</code> in its own plane, and its texture runs round the ring as orbiting gas does: fine lanes from a <code>repeating-radial-gradient</code>, and a few soft bright and dark clumps from a <code>conic-gradient</code>, which carry the swirl as they go round; a ring spins about its own centre, so the loop is seamless. Over it lies a ring that does not spin, darker on the right and lit on the left: the side turning toward you is brighter, as the real thing is.',
      'Gravity bends the light from the far side of the disk up over the top of the hole and down under it. That halo is a ring facing you just behind the horizon, masked with a <code>conic-gradient</code> so it is bright at the top, fainter at the bottom and gone at the sides, with streaks of its own turning inside it.',
      'Every length is a multiple of one base unit, <code>--u</code>, tied to the canvas; the glows are gradients, never <code>blur()</code>, and only <code>transform</code> moves.',
    ],
    html: `<div class="scene">
  <div class="bh" role="img" aria-label="A black hole: a glowing accretion disk swirls round its dark centre, its far side bent up over the top and down under the bottom by gravity">
    <i class="glow"></i>
    <div class="halo"><i class="streaks"></i></div>
    <i class="hole"></i>
    <div class="plane">
      <i class="disk"></i>
      <i class="beam"></i>
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the black hole is the same share of
     a gallery card, the editor, a full screen and a recording canvas */
  --u: 0.2vmin;
  perspective: calc(1400 * var(--u));
}

/* everything is centred on one point: the middle of the hole */
.bh {
  position: relative;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
}
.bh > * {
  position: absolute;
}

/* a faint warm haze round the whole thing, wider than tall, like the light the disk throws */
.glow {
  left: calc(-260 * var(--u));
  top: calc(-150 * var(--u));
  width: calc(520 * var(--u));
  height: calc(300 * var(--u));
  background: radial-gradient(closest-side, rgb(255 150 70 / 0.22), rgb(255 110 90 / 0.08) 55%, transparent);
  transform: translateZ(calc(-60 * var(--u)));
}

/* the lensed far side of the disk: a thick ring facing you just behind the horizon, bright over the
   top, fainter under the bottom, gone at the sides. It is what makes a black hole as tall as it is
   wide in the famous pictures, and here it is what stands the model up to its full height */
.halo {
  left: calc(-122 * var(--u));
  top: calc(-122 * var(--u));
  width: calc(244 * var(--u));
  height: calc(244 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle closest-side, transparent 51%, #fff3d6 54%, #ffd88a 60%, #ffa04a 72%, #ff7a3d 82%, rgb(255 77 157 / 0.5) 91%, transparent);
  -webkit-mask: conic-gradient(#000 0 22deg, rgb(0 0 0 / 0.12) 72deg 108deg, rgb(0 0 0 / 0.75) 160deg 200deg, rgb(0 0 0 / 0.12) 252deg 288deg, #000 338deg);
  mask: conic-gradient(#000 0 22deg, rgb(0 0 0 / 0.12) 72deg 108deg, rgb(0 0 0 / 0.75) 160deg 200deg, rgb(0 0 0 / 0.12) 252deg 288deg, #000 338deg);
  transform: translateZ(calc(-2 * var(--u)));
}
/* the halo's own lanes and clumps, turning: the same gas, seen round the hole */
.streaks {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    repeating-radial-gradient(circle, rgb(255 255 255 / 0.1) 0 calc(1.5 * var(--u)), transparent calc(1.5 * var(--u)) calc(6 * var(--u))),
    conic-gradient(rgb(255 255 255 / 0.22), transparent 30deg, rgb(40 8 30 / 0.25) 70deg, transparent 110deg, rgb(255 255 255 / 0.18) 160deg, transparent 200deg, rgb(40 8 30 / 0.2) 245deg, transparent 285deg, rgb(255 255 255 / 0.2) 320deg, rgb(255 255 255 / 0.22));
  -webkit-mask: radial-gradient(circle closest-side, transparent 52%, #000 55%, #000 88%, transparent);
  mask: radial-gradient(circle closest-side, transparent 52%, #000 55%, #000 88%, transparent);
  animation: spin 14s linear infinite reverse;
}

/* the event horizon: black to its edge, where the photon ring burns in a thin white-gold line */
.hole {
  left: calc(-64 * var(--u));
  top: calc(-64 * var(--u));
  width: calc(128 * var(--u));
  height: calc(128 * var(--u));
  border-radius: 50%;
  background: radial-gradient(circle closest-side, #000 0 92%, #ffdca0 94.5%, #fff 96%, rgb(255 190 110 / 0.6) 98%, transparent);
}

/* the disk's plane, laid back nearly edge on: its near half comes toward you below the middle */
.plane {
  left: 0;
  top: 0;
  transform-style: preserve-3d;
  transform: rotateX(78deg);
}
.plane > * {
  position: absolute;
  left: calc(-215 * var(--u));
  top: calc(-215 * var(--u));
  width: calc(430 * var(--u));
  height: calc(430 * var(--u));
  border-radius: 50%;
  /* the ring: clear in the middle, solid across, fading at the rim */
  -webkit-mask: radial-gradient(circle closest-side, transparent 31%, #000 33%, #000 62%, transparent);
  mask: radial-gradient(circle closest-side, transparent 31%, #000 33%, #000 62%, transparent);
}
/* the accretion disk: white-hot inside, amber, orange, a faint rose at the rim. Gas runs in orbits,
   so its texture runs round the ring: fine lanes, and a few soft bright and dark clumps, which carry
   the swirl as it turns (spokes would read as a sunburst) */
.disk {
  background:
    repeating-radial-gradient(circle, rgb(255 255 255 / 0.1) 0 calc(2 * var(--u)), transparent calc(2 * var(--u)) calc(7 * var(--u)), rgb(30 6 20 / 0.12) calc(7 * var(--u)) calc(9 * var(--u)), transparent calc(9 * var(--u)) calc(13 * var(--u))),
    conic-gradient(rgb(255 255 255 / 0.2), transparent 28deg, rgb(30 6 20 / 0.24) 64deg, transparent 100deg, rgb(255 255 255 / 0.16) 145deg, transparent 185deg, rgb(30 6 20 / 0.2) 228deg, transparent 266deg, rgb(255 255 255 / 0.18) 312deg, rgb(255 255 255 / 0.2)),
    radial-gradient(circle closest-side, #fff8e6 32%, #ffe1a3 38%, #ffb547 48%, #ff7a3d 64%, #c8326b 84%, rgb(120 30 90 / 0.4));
  animation: spin 9s linear infinite;
}
/* the side turning toward you burns brighter, the side turning away is dimmer; this ring does not
   spin, so the bright side stays on the left */
.beam {
  background: linear-gradient(90deg, rgb(255 246 225 / 0.42), transparent 42%, transparent 58%, rgb(8 2 18 / 0.5));
}

@keyframes spin {
  to { transform: rotate(360deg); }
}`,
  },
};
