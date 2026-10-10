import type { Snippet } from './snippet-utils';

/*
 * The solution is worked out here, once, and written into the CSS as plain keyframes: the copied
 * snippet has no script. The loop is 10 slots: a rest, the 7 moves of three disks from peg A to
 * peg C, and two slots in which the board turns a third of a turn, so C stands where A stood.
 */
const SLOTS = 10;
const SLOT = 100 / SLOTS;
const T = 16; // a disk's thickness
const LIFT = 70; // where a disk's underside travels: 7 above the pegs' tops
/** The pegs on the board, 60 from its centre, a third of a turn apart: A front left, C front right, B behind. [x, z] */
const RP = 60;
const PEG: Record<string, [number, number]> = { A: [-52, 30], B: [0, -RP], C: [52, 30] };
/** Where each peg's socket is on the turntable, a 200-unit square laid flat (its y is the board's z). */
const socket = (p: string) => `${n(50 + PEG[p][0] / 2)}% ${n(50 + PEG[p][1] / 2)}%`;
/** Disk 1 is the smallest. [disk, from, to], in the one legal order that takes 7 moves. */
const MOVES: [number, string, string][] = [
  [1, 'A', 'C'], [2, 'A', 'B'], [1, 'C', 'B'], [3, 'A', 'C'], [1, 'B', 'A'], [2, 'B', 'C'], [1, 'A', 'C'],
];

const n = (v: number) => +v.toFixed(2);
const pct = (v: number) => `${n(v)}%`;
const pose = (peg: string, y: number, turn = 0) =>
  `translate3d(calc(${PEG[peg][0]} * var(--u)), calc(${n(y)} * var(--u)), calc(${PEG[peg][1]} * var(--u))) rotateY(${turn}deg)`;

function diskKeyframes(disk: number): string {
  const stacks: Record<string, number[]> = { A: [3, 2, 1], B: [], C: [] };
  const level = (peg: string, d: number) => stacks[peg].indexOf(d);
  const lines: string[] = [`  0% { transform: ${pose('A', -level('A', disk) * T)}; }`];
  MOVES.forEach(([d, from, to], i) => {
    const lf = stacks[from].length - 1;
    stacks[from].pop();
    stacks[to].push(d);
    const lt = stacks[to].length - 1;
    if (d !== disk) return;
    const s = (i + 1) * SLOT;
    lines.push(
      `  ${pct(s)} { transform: ${pose(from, -lf * T)}; animation-timing-function: cubic-bezier(0.3, 0, 0.3, 1); } /* lift */`,
      `  ${pct(s + 0.3 * SLOT)} { transform: ${pose(from, -LIFT)}; animation-timing-function: ease-in-out; } /* across */`,
      `  ${pct(s + 0.7 * SLOT)} { transform: ${pose(to, -LIFT)}; animation-timing-function: cubic-bezier(0.5, 0, 0.75, 0.4); } /* drop */`,
      `  ${pct(s + SLOT)} { transform: ${pose(to, -lt * T)}; }`,
    );
  });
  /* the board turns a third of a turn, and the disk turns back by as much on its own axis, so its
     faces keep their light */
  const end = -level('C', disk) * T;
  lines.push(
    `  ${pct(8 * SLOT)} { transform: ${pose('C', end)}; animation-timing-function: ease-in-out; }`,
    `  100% { transform: ${pose('C', end, 120)}; }`,
  );
  return `@keyframes hanoi-disk${disk} {\n${lines.join('\n')}\n}`;
}

/** How dark a side strip is, by the way it faces (k × 30deg, 0 = towards you): the light is up and to the front left. */
const SHADE: Record<number, number> = { [-3]: 0.22, [-2]: 0.04, [-1]: 0, 0: 0.12, 1: 0.34, 2: 0.52, 3: 0.6 };
/** Only the front half of a round thing is ever seen from this fixed camera: seven strips, -90deg to 90deg. */
const strips = (indent: string) =>
  [-3, -2, -1, 0, 1, 2, 3].map((k) => `${indent}<i style="--k:${k}; --d:${SHADE[k]}"></i>`).join('\n');

const disk = (d: number) => `      <div class="disk d${d}">
${strips('        ')}
        <b></b>
      </div>`;

/** A regular 12-gon, flat sides facing every 30deg, for the caps. */
const DODECAGON = Array.from({ length: 12 }, (_, i) => {
  const a = ((15 + 30 * i) * Math.PI) / 180;
  return `${n(50 + 50 * Math.cos(a))}% ${n(50 + 50 * Math.sin(a))}%`;
}).join(', ');

export const snippetsHanoi: Record<string, Snippet> = {
  hanoi: {
    how: [
      'Three disks go from peg A to peg C in the only 7-move legal order (never a bigger disk on a smaller one). Each disk has one <code>@keyframes</code> of <code>translate3d</code> stops, four per move: on its peg, lifted clear of the pegs, over the new peg, dropped onto the stack. Between its moves a disk has no stops, so it simply waits. The stops were worked out once from the move list and written in as plain CSS.',
      'To loop without solving it backwards, the pegs stand a third of a turn apart on a round board. When the stack reaches C, the board turns <code>rotateY(-120deg)</code> and C lands exactly where A stood, so the last frame is the first. The base slab and its rim are round and never move; only the turntable on top turns, with its three peg sockets.',
      'A disk is a 12-sided prism with real thickness, but the camera never moves, so only its front seven strips are drawn: each <code>rotateY(k × 30deg) translateZ(r)</code>, with a darkness from its direction baked in. The cap is one square cut to a 12-gon with <code>clip-path</code>, its dark centre the hole the peg comes up through.',
      'So the light stays put, everything that rides the turning board turns back by the same 120deg on its own axis: the disks in their last keyframe, the pegs in an animation of their own. A peg is one flat bar, a billboard that always faces you, which a thin cylinder looks like from any side.',
      'Every length is a multiple of one base unit, <code>--u</code>; the paused first moment is the full stack on A, at rest.',
    ],
    html: `<div class="scene">
  <div class="view" role="img" aria-label="Loading: the Tower of Hanoi solving itself">
    <div class="base">
${strips('      ')}
      <b></b>
    </div>
    <div class="board">
      <div class="turntable"></div>
      <div class="peg" style="--x:${PEG.A[0]}; --z:${PEG.A[1]}"></div>
      <div class="peg" style="--x:${PEG.B[0]}; --z:${PEG.B[1]}"></div>
      <div class="peg" style="--x:${PEG.C[0]}; --z:${PEG.C[1]}"></div>
${[3, 2, 1].map(disk).join('\n')}
    </div>
  </div>
</div>`,
    css: `.scene {
  /* one base unit: every length below is a multiple of it, so the puzzle is the same share of a
     gallery card, the editor, a full screen and a recording canvas */
  --u: 0.32vmin;
  perspective: calc(800 * var(--u));
}

/* the camera looks down on the board; its origin is the middle of the board's top. It sits a
   little low, since the pegs and the lifted disks rise above the board and nothing goes below */
.view {
  position: relative;
  transform-style: preserve-3d;
  transform: translateY(calc(8 * var(--u))) rotateX(-30deg);
}
.view * {
  position: absolute;
  transform-style: preserve-3d;
}

/* ---- the base: a 12-sided slab that never moves ---- */
.base {
  --r: 108;
  --c: #3b4078;
}
/* a side strip: k × 30deg round, pushed out to the rim, shaded by the way it faces */
.base > i,
.disk > i {
  left: calc((var(--r) * -0.26795 - 0.5) * var(--u));
  width: calc((var(--r) * 0.5359 + 1) * var(--u)); /* 2r × tan 15deg, and a unit over the seam */
  background:
    linear-gradient(rgb(255 255 255 / 0.35) 0 calc(1 * var(--u)), transparent 0),
    linear-gradient(rgb(13 10 38 / var(--d)), rgb(13 10 38 / var(--d))),
    var(--c);
  backface-visibility: hidden;
  transform: rotateY(calc(var(--k) * 30deg)) translateZ(calc(var(--r) * var(--u)));
}
.base > i {
  top: 0;
  height: calc(16 * var(--u));
  background:
    linear-gradient(rgb(255 255 255 / 0.25) 0 calc(1 * var(--u)), transparent 0),
    linear-gradient(rgb(13 10 38 / var(--d)), rgb(13 10 38 / var(--d))),
    linear-gradient(var(--c), #262a52);
}
/* a cap: a square cut to a 12-gon (2 / cos 15deg = 2.0706 times the strips' distance across) */
.base > b,
.disk > b {
  left: calc(var(--r) * -1.0353 * var(--u));
  top: calc(var(--r) * -1.0353 * var(--u));
  width: calc(var(--r) * 2.0706 * var(--u));
  height: calc(var(--r) * 2.0706 * var(--u));
  clip-path: polygon(${DODECAGON});
}
.base > b {
  background: #4a5094;
  transform: rotateX(90deg);
}

/* ---- the board: everything on it turns a third of a turn at the end of each solve ---- */
.board {
  animation: hanoi-board 7s linear infinite;
}

/* the turntable, a hair above the base's top, with a socket under each peg. It is the same after
   a third of a turn, so the loop shows no jump */
.turntable {
  left: calc(-100 * var(--u));
  top: calc(-100 * var(--u));
  width: calc(200 * var(--u));
  height: calc(200 * var(--u));
  border-radius: 50%;
  background:
    radial-gradient(circle at ${socket('A')}, #191b3b 0 calc(5 * var(--u)), #8c92d6 0 calc(7 * var(--u)), transparent 0 calc(12 * var(--u))),
    radial-gradient(circle at ${socket('B')}, #191b3b 0 calc(5 * var(--u)), #8c92d6 0 calc(7 * var(--u)), transparent 0 calc(12 * var(--u))),
    radial-gradient(circle at ${socket('C')}, #191b3b 0 calc(5 * var(--u)), #8c92d6 0 calc(7 * var(--u)), transparent 0 calc(12 * var(--u))),
    radial-gradient(circle, #6c72c0 0 calc(10 * var(--u)), #585ea8 calc(30 * var(--u)), #4c5298 calc(100 * var(--u)));
  box-shadow: inset 0 0 0 calc(1.5 * var(--u)) rgb(255 255 255 / 0.18);
  transform: translateY(calc(-0.5 * var(--u))) rotateX(90deg);
}

/* a peg: one flat bar that always faces you, which is what a thin rod looks like from any side.
   It rides the board, so it turns back as the board turns */
.peg {
  left: calc(-4 * var(--u));
  top: calc(-63 * var(--u));
  width: calc(8 * var(--u));
  height: calc(63 * var(--u));
  border-radius: calc(4 * var(--u)) calc(4 * var(--u)) 0 0;
  background: linear-gradient(90deg, #9aa0d8, #f4f3ff 35%, #d2d0ee 60%, #6d7099);
  transform: translate3d(calc(var(--x) * var(--u)), 0, calc(var(--z) * var(--u))) rotateY(0deg);
  animation: hanoi-peg 7s linear infinite;
}

/* ---- the disks: seven front strips and a cap with the hole ---- */
.disk {
  --t: calc(${T} * var(--u)); /* thickness */
}
.disk > i {
  top: calc(-1 * var(--t));
  height: var(--t);
}
.disk > b {
  background: radial-gradient(circle, #191b3b 0 calc(5.5 * var(--u)), color-mix(in srgb, var(--c) 70%, #fff) calc(6.5 * var(--u)), color-mix(in srgb, var(--c) 85%, #fff));
  transform: translateY(calc(-1 * var(--t))) rotateX(90deg);
}
.d3 { --r: 42; --c: #8b6cff; animation: hanoi-disk3 7s linear infinite; }
.d2 { --r: 32; --c: #2ee6d6; animation: hanoi-disk2 7s linear infinite; }
.d1 { --r: 22; --c: #ff4d9d; animation: hanoi-disk1 7s linear infinite; }

/* a rest, seven moves, then a third of a turn: C comes round to where A was */
@keyframes hanoi-board {
  0%, ${pct(8 * SLOT)} { transform: rotateY(0deg); animation-timing-function: ease-in-out; }
  100% { transform: rotateY(-120deg); }
}
@keyframes hanoi-peg {
  0%, ${pct(8 * SLOT)} { transform: translate3d(calc(var(--x) * var(--u)), 0, calc(var(--z) * var(--u))) rotateY(0deg); animation-timing-function: ease-in-out; }
  100% { transform: translate3d(calc(var(--x) * var(--u)), 0, calc(var(--z) * var(--u))) rotateY(120deg); }
}

/* each disk: on its peg, lifted clear, across, dropped; worked out from the 7 moves */
${[1, 2, 3].map(diskKeyframes).join('\n\n')}`,
  },
};
