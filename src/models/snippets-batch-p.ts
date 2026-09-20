import type { Snippet } from './snippet-utils';

/** The calendar's four falling pages need four keyframe sets: a page that fell early lies there
 *  longer than one that fell late, so they are not time-shifted copies of one another. */
const CALENDAR_FALLS = [0, 1, 2, 3]
  .map((i) => {
    const start = i * 25;
    return `@keyframes fall${i} {
  /* upright until this page's turn comes round */
  0%, ${start + 0.001}% {
    transform: rotateX(0deg);
    animation-timing-function: cubic-bezier(0.5, 0, 0.85, 0.4); /* gathers speed like gravity */
  }
  ${start + 13}% {
    transform: rotateX(-187deg); /* a little past flat: paper flops */
    animation-timing-function: ease-out;
  }
  ${start + 16}%, 100% { transform: rotateX(-180deg); }
}`;
  })
  .join('\n\n');

const CALENDAR_PAGES = [
  ['MON', '14'],
  ['TUE', '15'],
  ['WED', '16'],
  ['THU', '17'],
  ['MON', '14'],
]
  .map(([day, date], i) => `    <div class="page" style="--i:${i}">
      <div class="leaf${i < 4 ? ` fall${i}` : ''}">
        <i class="face"><b>${day}</b><em>${date}</em></i>
        <i class="back"><span>SEPTEMBER</span></i>
      </div>
    </div>`)
  .join('\n');

/** Each story bubble's pose: how far it is turned away, how far back that puts it, its colour. */
const STORY_SLOTS = [
  ['ada', '40deg', '-35px', '#ff4d9d'],
  ['lin', '20deg', '-9px', '#ffb547'],
  ['noor', '0deg', '0px', '#2ee6d6'],
  ['kai', '-20deg', '-9px', '#8b6cff'],
  ['ivy', '-40deg', '-35px', '#ff4d9d'],
]
  .map(([name, ry, z, c], i) => `  <div class="slot" tabindex="0" style="--ry:${ry};--z:${z};--c:${c};--i:${i}">
    <div class="bubble"><i class="ring"></i><b class="face"></b></div>
    <span class="name">${name}</span>
  </div>`)
  .join('\n');

/** Corner, hinge point, hinge axis, front triangle, back triangle (the front mirrored in x). */
const FOLD_FLAPS: [string, string, string, string][] = [
  ['25% 25%', '1, -1, 0', 'polygon(0 0, 50% 0, 0 50%)', 'polygon(100% 0, 50% 0, 100% 50%)'],
  ['75% 25%', '1, 1, 0', 'polygon(100% 0, 50% 0, 100% 50%)', 'polygon(0 0, 50% 0, 0 50%)'],
  ['75% 75%', '-1, 1, 0', 'polygon(100% 100%, 50% 100%, 100% 50%)', 'polygon(0 100%, 50% 100%, 0 50%)'],
  ['25% 75%', '-1, -1, 0', 'polygon(0 100%, 50% 100%, 0 50%)', 'polygon(100% 100%, 50% 100%, 100% 50%)'],
];

const FOLD_CSS = FOLD_FLAPS.map(([pivot, axis, front, back], i) => `.flap:nth-of-type(${i + 1}) {
  --axis: ${axis};
  transform-origin: ${pivot};
  animation-delay: ${((i + 1) * 0.11).toFixed(2)}s;
}
.flap:nth-of-type(${i + 1}) i:nth-child(1) { clip-path: ${front}; }
.flap:nth-of-type(${i + 1}) i:nth-child(2) { clip-path: ${back}; }`).join('\n\n');

/** depth, the scale that cancels it ((420 + depth) / 420), silhouette, top colour, base colour */
const RIDGES: [number, number, string, string, string][] = [
  [-330, 1.786, 'polygon(0 100%, 0 55%, 6% 50%, 12% 54%, 19% 40%, 25% 50%, 32% 46%, 39% 53%, 47% 37%, 54% 49%, 61% 45%, 68% 52%, 76% 42%, 83% 51%, 91% 46%, 100% 53%, 100% 100%)', '#953175', '#612158'],
  [-210, 1.5, 'polygon(0 100%, 0 58%, 8% 53%, 15% 57%, 23% 47%, 31% 56%, 38% 52%, 46% 58%, 55% 48%, 63% 57%, 71% 53%, 79% 58%, 88% 50%, 100% 56%, 100% 100%)', '#5c40a8', '#3d286f'],
  [-120, 1.286, 'polygon(0 100%, 0 65%, 9% 60%, 17% 65%, 26% 56%, 35% 64%, 43% 61%, 52% 66%, 61% 57%, 70% 65%, 79% 61%, 88% 66%, 100% 62%, 100% 100%)', '#452f7e', '#2b1c4e'],
  [-50, 1.119, 'polygon(0 100%, 0 72%, 11% 67%, 21% 73%, 31% 65%, 42% 72%, 52% 69%, 63% 74%, 74% 66%, 85% 73%, 100% 70%, 100% 100%)', '#2e1f55', '#1a1030'],
  [10, 0.976, 'polygon(0 100%, 0 84%, 10% 78%, 20% 86%, 31% 79%, 43% 87%, 55% 82%, 67% 88%, 79% 81%, 90% 88%, 100% 84%, 100% 100%)', '#0c0618', '#060310'],
];

const MISTS: [number, number, number, number][] = [
  [-268, 1.638, 44, 20],
  [-166, 1.395, 52, 20],
  [-86, 1.205, 60, 20],
  [-18, 1.043, 70, 22],
];

/** Copy-paste versions of batch P. */
export const snippetsP: Record<string, Snippet> = {
  calendar: {
    how: [
      'The card is split at the spiral. The lower half never moves; the upper half is a <b>stack</b> of pages hinged on that line with <code>transform-origin: 50% 100%</code>.',
      'A page falls with <code>rotateX(-180deg)</code>, so it ends face down exactly on the lower half. <code>backface-visibility: hidden</code> swaps the printed date for the page’s back halfway through.',
      'That back is drawn <i>exactly</i> like the lower half — so a pile of fallen pages is indistinguishable from the panel under it.',
      'Which is what lets the loop reset in plain sight: at 100% all four pages snap upright at once. What you are actually reading is a fifth page, a copy of the first date, standing at the back of the stack where the pages in front hide it completely (perspective makes it smaller, so it never peeks out).',
      'Each page needs its own keyframes. A page that fell early lies there longer than one that fell late, so they are not time-shifted copies.',
    ],
    html: `<div class="scene">
  <div class="calendar">
    <div class="lower"><span>SEPTEMBER</span></div>
    <div class="stack">
${CALENDAR_PAGES}
    </div>
    <div class="rings">
      <i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i>
      <i style="--i:4"></i><i style="--i:5"></i><i style="--i:6"></i>
    </div>
    <div class="base"><i></i><i></i><i></i></div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.calendar {
  position: relative;
  width: 116px;
  height: 104px;
  transform-style: preserve-3d;
  transform: rotateX(15deg) rotateY(-21deg);
}

/* The printed lower panel AND the back of every page: one rule, so a fallen page and the
   panel under it are the same picture. That is what hides the reset. */
.lower,
.back {
  position: absolute;
  display: grid;
  align-content: end;
  justify-items: center;
  padding-bottom: 6px;
  border-radius: 0 0 8px 8px;
  background:
    linear-gradient(rgb(236 238 251 / 0.22) 0 1px, transparent 1px),
    linear-gradient(200deg, #332e66, #23273e);
  box-shadow: inset 0 0 0 1px rgb(140 150 220 / 0.34);
  color: #949bc0;
  font: 800 8px/1 system-ui, sans-serif;
  letter-spacing: 0.22em;
}

.lower {
  inset: 52px 0 0;
  transform: translateZ(-3px); /* one step behind the last page in the stack */
}

.stack {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}

/* A page holds only its place in the stack: 0.6px apart is enough to sort them and
   too little to see. Its child does the falling, so two pages never share a plane. */
.page {
  position: absolute;
  inset: 0 0 52px;
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--i) * -0.6px));
}

.leaf {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform-origin: 50% 100%; /* the spiral line */
  animation: 6.4s linear infinite;
}

.fall0 { animation-name: fall0; }
.fall1 { animation-name: fall1; }
.fall2 { animation-name: fall2; }
.fall3 { animation-name: fall3; }

.face {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 1px;
  padding-bottom: 9px; /* keeps the date clear of the spiral */
  border-radius: 8px 8px 0 0;
  background:
    linear-gradient(0deg, rgb(236 238 251 / 0.22) 0 1px, transparent 1px),
    linear-gradient(160deg, #2e3248, #2e2a5e);
  box-shadow: inset 0 0 0 1px rgb(140 150 220 / 0.34);
  /* without this the date would show through, mirrored, once the page is face down */
  backface-visibility: hidden;
}

.face b { color: #ff4d9d; font: 800 9px/1 system-ui, sans-serif; letter-spacing: 0.2em; }
.face em { color: #eceefb; font: 800 28px/1 system-ui, sans-serif; font-style: normal; }

.back {
  inset: 0;
  backface-visibility: hidden;
  transform: rotateX(180deg); /* pre-flipped, so it reads upright once the page has landed */
}

/* The depth is on the container: the rings stay flat and can never z-fight the page behind. */
.rings {
  position: absolute;
  inset: 0;
  transform: translateZ(7px);
}

.rings i {
  position: absolute;
  top: 45px;
  left: calc(10px + var(--i) * 16px);
  width: 9px;
  height: 14px;
  border: 2px solid rgb(236 238 251 / 0.4);
  border-top-color: rgb(236 238 251 / 0.62);
  border-radius: 50%;
}

/* the stand: the three faces of a block that can be seen from this angle */
.base {
  position: absolute;
  top: 104px;
  left: -7px;
  width: 130px;
  height: 14px;
  transform-style: preserve-3d;
}

.base i { position: absolute; border-radius: 2px; }
.base i:nth-child(1) { inset: 0; background: linear-gradient(#8b6cff, #4c3b8c); transform: translateZ(11px); }

/* top and right end, each folded backwards from an edge of the front face */
.base i:nth-child(2) {
  top: 0; left: 0; width: 100%; height: 22px;
  background: linear-gradient(#ad98ff, #9c82ff);
  transform-origin: 50% 0;
  transform: translateZ(11px) rotateX(-90deg);
}

.base i:nth-child(3) {
  top: 0; left: 100%; width: 22px; height: 100%;
  background: #3f3173;
  transform-origin: 0 50%;
  transform: translateZ(11px) rotateY(90deg);
}

${CALENDAR_FALLS}`,
  },

  stories: {
    how: [
      'Each bubble sits on an arc: <code>rotateY()</code> turns it away from you and <code>translateZ()</code> pushes it back by as much as that turn would carry it round a cylinder.',
      'Coplanar things have no reliable hit-test order in 3D, so the row hands the pointer on — <code>pointer-events: none</code> on the row, <code>auto</code> on five static slots.',
      'A slot never moves; the bubble inside it does, and the bubble is <code>pointer-events: none</code>. So what is under the pointer cannot slide out from under it and flicker.',
      'The ring is a <code>conic-gradient</code> on a circle. Turning the circle turns the gradient — that is the whole idle animation, and it needs no pointer.',
      '<code>.slot:has(~ .slot:hover)</code> catches the slots <b>before</b> the pointer and <code>.slot:hover ~ .slot</code> the ones after. The hovered rule is written last, so it wins.',
    ],
    html: `<div class="scene">
  <div class="row">
${STORY_SLOTS}
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.row {
  display: flex;
  gap: 2px;
  transform-style: preserve-3d;
  pointer-events: none; /* the row gives the pointer up; the slots take it */
}

.slot {
  position: relative;
  width: 42px;
  height: 54px;
  outline: none;
  cursor: pointer;
  pointer-events: auto;
  transform-style: preserve-3d;
}

.bubble {
  position: absolute;
  top: 0;
  left: 3px;
  width: 36px;
  height: 36px;
  pointer-events: none;
  /* one transform for every state; the rules below only change the numbers it reads */
  transform: translate3d(var(--x, 0px), var(--y, 0px), var(--z)) rotateY(var(--ry)) scale(var(--s, 1));
  transition: transform 0.45s cubic-bezier(0.3, 1.3, 0.5, 1);
}

/* the glow that switches on under the lifted bubble */
.bubble::before {
  content: '';
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--c) 55%, transparent), transparent);
  opacity: var(--glow, 0);
  transition: opacity 0.35s;
}

.ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: conic-gradient(#ffb547, #ff4d9d, #8b6cff, #2ee6d6, #ffb547);
  opacity: var(--o, 1);
  animation: turn 7s linear infinite;
  animation-delay: calc(var(--i) * -1.1s);
  transition: opacity 0.35s;
}

/* the avatar: a head and a pair of shoulders painted with two radial gradients */
.face {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 36%, rgb(255 255 255 / 0.85) 0 15%, transparent 16%),
    radial-gradient(ellipse 30% 24% at 50% 90%, rgb(255 255 255 / 0.85) 0 99%, transparent 100%),
    linear-gradient(150deg, color-mix(in srgb, var(--c) 85%, #fff), color-mix(in srgb, var(--c) 70%, #000));
  box-shadow: 0 0 0 2px #0b0d18; /* the gap between avatar and ring, in the page colour */
  opacity: var(--o, 1);
  transition: opacity 0.35s;
}

.name {
  position: absolute;
  inset: auto 0 0;
  color: #949bc0;
  font: 700 8px/1 system-ui, sans-serif;
  text-align: center;
  opacity: var(--o, 1);
  transition: opacity 0.35s;
}

/* something is being pointed at: everything dims... */
.row:hover .slot,
.row:focus-within .slot { --o: 0.42; }

/* ...its neighbours lean out of the way... */
.slot:hover ~ .slot,
.slot:focus-visible ~ .slot { --x: 7px; }

.slot:has(~ .slot:hover),
.slot:has(~ .slot:focus-visible) { --x: -7px; }

/* ...and the one under the pointer turns to face you, rises and comes forward (last, so it wins) */
.row .slot:is(:hover, :focus-visible) {
  --o: 1;
  --x: 0px;
  --y: -9px;
  --z: 48px;
  --ry: 0deg;
  --s: 1.14;
  --glow: 1;
}

@keyframes turn {
  to { transform: rotate(1turn); }
}`,
  },

  foldloader: {
    how: [
      'Each corner is a triangle cut with <code>clip-path</code>. Its hinge is the line between two edge midpoints — a <b>diagonal</b>, which is not an axis of the box.',
      'So the fold is <code>rotate3d(1, -1, 0, -180deg)</code> about that flap’s own midpoint (<code>transform-origin: 25% 25%</code>). Half a turn about that line lands the corner exactly on the centre.',
      'The back of the paper is a second triangle, mirrored in x and pre-rotated <code>rotateY(180deg)</code> — which mirrors it a second time, so it lands on top of the front. <code>backface-visibility: hidden</code> then draws whichever side faces you.',
      'The four folded flaps tile the diamond underneath without overlapping, so nothing z-fights. The diamond is cut a hair smaller than the hole so the creases read as shadow rather than as a stripe of it showing through.',
      'The sheet turns a full 360° per loop, so the end state is the start state and the loop is seamless.',
    ],
    html: `<div class="scene">
  <div class="fold">
    <div class="sheet">
      <i class="core"></i>
      <div class="flap"><i></i><i></i></div>
      <div class="flap"><i></i><i></i></div>
      <div class="flap"><i></i><i></i></div>
      <div class="flap"><i></i><i></i></div>
    </div>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.fold {
  width: 124px;
  height: 124px;
  transform-style: preserve-3d;
  /* looking down on the sheet, so the flaps lifting towards you are what you read */
  transform: rotateX(54deg);
}

.sheet {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: turn 5.6s linear infinite;
}

/* the diamond the flaps land on, and what shows between them while the sheet is open */
.core {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #6f56cc, #20a196);
  box-shadow: inset 0 0 26px rgb(0 0 0 / 0.55);
  clip-path: polygon(50% 1.5%, 98.5% 50%, 50% 98.5%, 1.5% 50%);
  transform: translateZ(-0.8px);
}

.flap {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: fold 5.6s ease-in-out infinite;
}

.flap i {
  position: absolute;
  inset: 0;
  backface-visibility: hidden; /* exactly one side of the paper is ever drawn */
}

.flap i:nth-child(1) { background: linear-gradient(135deg, #fff, #ffe6c0 80%); }

/* the side you only see once the flap is over: the back of the sheet, cool and in shade */
.flap i:nth-child(2) {
  background: linear-gradient(135deg, #d8cdff, #b29eff 85%);
  transform: rotateY(180deg);
}

${FOLD_CSS}

/* Only the angle changes; the axis comes from the flap, so one keyframe set serves all four. */
@keyframes fold {
  0%, 10%   { transform: rotate3d(var(--axis), 0deg); }
  42%, 58%  { transform: rotate3d(var(--axis), -180deg); }
  90%, 100% { transform: rotate3d(var(--axis), 0deg); }
}

@keyframes turn {
  to { transform: rotateZ(360deg); }
}`,
  },

  pulse: {
    how: [
      '<code>rotateX(70deg)</code> lays the whole thing almost flat, putting the camera about twenty degrees above it. Every ring is still a plain circle — the slant is what makes the ellipse.',
      'A ring is drawn at full size and scaled <b>down</b> to nothing at the start of its trip, so the animation only ever touches <code>transform</code> and <code>opacity</code> — never <code>width</code>/<code>height</code>, which would run layout on every frame.',
      'Inside a plane tilted like this, <code>translateZ</code> is "up". Adding it to the same keyframe makes a ring rise as it spreads, so the far edge of a big ring sits higher on screen than the near edge of a small one.',
      'Six rings share one animation and are spread round the cycle by negative delays — no second keyframe set, no JavaScript.',
      'Opacity is 0 at both ends of the keyframes, so the loop closes on itself with nothing to see.',
    ],
    html: `<div class="scene">
  <div class="sonar">
    <i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i>
    <i style="--i:3"></i><i style="--i:4"></i><i style="--i:5"></i>
    <b></b>
    <u></u>
  </div>
</div>`,
    css: `.scene {
  perspective: 800px;
}

.sonar {
  position: relative;
  display: grid;
  place-items: center;
  width: 150px;
  height: 150px;
  transform-style: preserve-3d;
  transform: rotateX(70deg) rotateZ(-8deg);
}

/* the dish: a disc with range circles and a cross-hair painted straight into it */
.sonar::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    linear-gradient(90deg, transparent calc(50% - 0.5px), rgb(46 230 214 / 0.14) 0 calc(50% + 0.5px), transparent 0),
    linear-gradient(0deg, transparent calc(50% - 0.5px), rgb(46 230 214 / 0.14) 0 calc(50% + 0.5px), transparent 0),
    repeating-radial-gradient(circle at 50% 50%, transparent 0 20px, rgb(139 108 255 / 0.24) 20px 21px),
    radial-gradient(circle at 50% 50%, rgb(139 108 255 / 0.26), transparent 72%);
  box-shadow: inset 0 0 0 1px rgb(140 150 220 / 0.34);
  transform: translateZ(-1px);
}

.sonar i {
  grid-area: 1 / 1;
  width: 130px;
  height: 130px;
  border: 2px solid #2ee6d6;
  border-radius: 50%;
  animation: ping 3.6s linear infinite;
  animation-delay: calc(var(--i) * -0.6s);
}

.sonar i:nth-child(odd) { border-color: #8b6cff; }

/* the emitter, beating once per ring */
.sonar b {
  grid-area: 1 / 1;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 22%, #2ee6d6 55%, rgb(46 230 214 / 0.35) 80%, transparent 82%);
  transform: translateZ(2px);
  animation: beat 0.6s ease-out infinite;
}

/* a mast standing out of the plane, so "up" is visible even between pings */
.sonar u {
  grid-area: 1 / 1;
  align-self: center;
  width: 2px;
  height: 32px;
  border-radius: 1px;
  background: linear-gradient(transparent, rgb(46 230 214 / 0.2) 55%, #2ee6d6);
  transform-origin: 50% 100%;
  /* stand it up out of the plane, then slide it back so its foot is on the centre */
  transform: translateY(-16px) rotateX(-90deg);
}

@keyframes ping {
  0%   { opacity: 0; transform: translateZ(0) scale(0.06); }
  12%  { opacity: 1; }
  62%  { opacity: 0.72; }
  100% { opacity: 0; transform: translateZ(30px) scale(1.42); }
}

@keyframes beat {
  0%        { transform: translateZ(2px) scale(1.5); }
  60%, 100% { transform: translateZ(2px) scale(1); }
}`,
  },

  mountains: {
    how: [
      'Every layer sits at its own <code>translateZ</code>, then is scaled by <code>(perspective + depth) / perspective</code> — which is exactly the amount perspective shrank it — so it covers the frame again whatever depth it is at.',
      'The drift is <b>one</b> sideways slide of the whole world. Perspective divides it up for you: the near ridge sweeps right across, the far one barely stirs. Rotating the world instead would move the far layers more, which reads backwards.',
      'The frame has <code>overflow: hidden</code> and only <code>perspective</code> — never <code>transform-style: preserve-3d</code> on the same box. Clipping a preserve-3d box flattens every layer inside it.',
      'A ridge is one div: a <code>clip-path</code> silhouette over a vertical gradient, lighter at the skyline and darker at its base.',
      'The cloud band repeats every 190px, so sliding it exactly 190px and starting over has no seam.',
    ],
    html: `<div class="sky">
  <div class="world">
    <i class="moon"></i>
    <i class="cloud"></i>
${RIDGES.map(([z, k]) => `    <b class="ridge" style="--z:${z}px;--k:${k}"></b>`).join('\n')}
${MISTS.map(([z, k, top, h]) => `    <u class="mist" style="--z:${z}px;--k:${k};--top:${top}%;--h:${h}%"></u>`).join('\n')}
  </div>
</div>`,
    css: `.sky {
  position: fixed;
  inset: 0;
  overflow: hidden;
  /* a close camera, so the layers separate hard */
  perspective: 420px;
  background:
    radial-gradient(1.4px 1.4px at 14% 12%, #fff 0 99%, transparent),
    radial-gradient(1.2px 1.2px at 31% 22%, #ffffffcc 0 99%, transparent),
    radial-gradient(1.6px 1.6px at 47% 9%, #fff 0 99%, transparent),
    radial-gradient(1.2px 1.2px at 72% 17%, #ffffffb3 0 99%, transparent),
    radial-gradient(1.4px 1.4px at 87% 8%, #fff 0 99%, transparent),
    radial-gradient(1.2px 1.2px at 63% 29%, #ffffff99 0 99%, transparent),
    radial-gradient(1.2px 1.2px at 22% 33%, #ffffff99 0 99%, transparent),
    linear-gradient(#090620, #3d2b78 34%, #922d6d 58%, #a86944 74%);
}

.world {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: drift 22s ease-in-out infinite alternate;
}

/* every layer carries its own depth and the scale that cancels it */
.moon,
.cloud,
.ridge,
.mist {
  position: absolute;
  transform: translate3d(var(--dx, 0px), 0, var(--z)) scale(var(--k));
}

.moon {
  top: 14%;
  left: 62%;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 33%, #fff 0 52%, #ffe7c4 100%);
  box-shadow: 0 0 40px 8px rgb(255 181 71 / 0.4);
  --z: -400px;
  --k: 1.952;
}

.cloud {
  top: 30%;
  left: -40%;
  width: 180%;
  height: 40px;
  background: radial-gradient(ellipse 74px 7px at 50% 50%, rgb(236 226 255 / 0.16), transparent 80%);
  background-size: 190px 40px;
  background-repeat: repeat-x;
  --z: -290px;
  --k: 1.69;
  animation: blow 40s linear infinite;
}

.ridge { inset: 0 -18%; }

/* mist in the valley: brightest where it meets the ridge behind it, thinning upward */
.mist {
  left: -18%;
  right: -18%;
  top: var(--top);
  height: var(--h);
  background: linear-gradient(to top, rgb(236 226 255 / 0) 0%, rgb(236 226 255 / 0.34) 40%, rgb(236 226 255 / 0.14) 70%, rgb(236 226 255 / 0) 100%);
}

${RIDGES.map(([, , clip, top, low], i) => `.ridge:nth-of-type(${i + 1}) {
  background: linear-gradient(${top}, ${low});
  clip-path: ${clip};
}`).join('\n\n')}

/* the whole world slides; perspective turns that one movement into parallax */
@keyframes drift {
  from { transform: translate3d(-17px, 0, 0); }
  to   { transform: translate3d(17px, 0, 0); }
}

@keyframes blow {
  /* exactly one tile of the repeating cloud, so starting over is invisible */
  to { transform: translate3d(-190px, 0, var(--z)) scale(var(--k)); }
}`,
  },
};
