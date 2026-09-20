import * as bubbles from './charts/bubbles';
import * as donut from './charts/donut';
import * as sankey from './charts/sankey';
import type { Group } from './groups';
import type { Snippet } from './snippet-utils';
import type { Demo } from './types';

/** n copies of a bit of markup, numbered from 0. */
const rep = (n: number, fn: (i: number) => string): string => Array.from({ length: n }, (_, i) => fn(i)).join('');

/** The charts keep their demo and their snippet side by side, fed by one data const (see ./charts). */
const CHARTS: { demo: Demo; snippet: Snippet }[] = [bubbles, donut, sankey];

/** Where the four desk legs stand, inset from the corners of the top (x 10–204, y 30–134). */
const LEGS = [
  [18, 38],
  [187, 38],
  [18, 117],
  [187, 117],
];
/** The screen's four bars: how tall each one is at the top of its beat. */
const BARS = [0.55, 1, 0.72, 0.38];
/** The drops on each sheet of glass: how far across (%), how big, how long they take, their offset. */
export const DROPS: Record<string, [number, number, number][]> = {
  far: [
    [14, 0.6, 5.4],
    [38, 0.5, 6.2],
    [61, 0.7, 4.8],
    [84, 0.55, 6.8],
  ],
  mid: [
    [24, 0.85, 4.2],
    [52, 1, 3.4],
    [74, 0.8, 4.9],
  ],
  near: [
    [33, 1.35, 2.6],
    [67, 1.15, 3.1],
  ],
};

const glass = (look: 'far' | 'mid' | 'near', z: number, s: number): string =>
  `<div class="d-rain__glass is-${look}" style="--z:${z}px;--s:${s}">${DROPS[look]
    .map(([x, drop, t], i) => `<i style="--x:${x};--s:${(drop * s).toFixed(2)};--t:${t}s;--i:${i}"></i>`)
    .join('')}</div>`;

export const demosQ: Demo[] = [
  ...CHARTS.map((c) => c.demo),
  {
    id: 'desk',
    title: 'Desk',
    description:
      'A little workspace seen from above and to one side: a lit monitor, a keyboard, a mug and a lamp throwing a warm pool on the wood. The floor is one tilted plane and everything on it is a flat face lifted by translateZ or a panel stood up from its bottom edge; the camera sways on a loop.',
    category: 'css',
    tags: ['loop', 'scene', 'isometric', 'room', 'desk', 'lamp'],
    technique: [
      'floor plane rotateX(58deg) rotateZ(20deg), +Z is up',
      'panel stood up: transform-origin bottom + rotateX(-90deg)',
      'slabs: top face + two walls as ::before / ::after',
      'lamp arm: rotateZ(dir) rotateX(-90deg − lean), shade turned back level',
    ],
    fill: true,
    html: `<div class="d-desk">
      <div class="d-desk__room">
        <div class="d-desk__top"></div>
        ${LEGS.map(([x, y]) => `<i class="d-desk__leg" style="--x:${x}px;--y:${y}px"></i>`).join('')}
        <div class="d-desk__pool"></div>
        <div class="d-desk__foot"></div>
        <div class="d-desk__neck"></div>
        <div class="d-desk__screen">${BARS.map((v, i) => `<i style="--i:${i};--v:${v}"></i>`).join('')}</div>
        <div class="d-desk__keys"></div>
        <div class="d-desk__mug">${rep(6, (i) => `<i style="--a:${i * 60}deg"></i>`)}<b></b><u></u></div>
        <div class="d-desk__lamp">
          <div class="d-desk__base"></div>
          <div class="d-desk__arm" style="--d:-72deg;--l:26deg">
            <i></i><i></i>
            <div class="d-desk__head">${rep(6, (i) => `<i style="--a:${i * 60}deg"></i>`)}<b></b><u></u><u></u></div>
          </div>
        </div>
      </div>
    </div>`,
  },
  {
    id: 'rain',
    title: 'Rain on the window',
    description:
      'A window at an angle on a wet night: three sheets of glass at different depths, each with its own drops running down, and a city out of focus far behind. The camera turns slowly and the sheets slide past each other — that parallax is the depth.',
    category: 'css',
    tags: ['loop', 'scene', 'weather', 'night', 'window', 'parallax'],
    technique: [
      'planes at translateZ −20 … +20 in one turned world',
      'out of focus without filter: soft radial gradients only',
      'drops: uneven keyframes, linear timing, looping off the sheet',
      'rain in the air: stripes cut into dashes by a mask, slid one period',
    ],
    fill: true,
    html: `<div class="d-rain">
      <div class="d-rain__world">
        <div class="d-rain__city"></div>
        <div class="d-rain__fall" style="--z:-14px;--r:8deg;--t:1.1s;--o:0.5"><i></i></div>
        <div class="d-rain__fall" style="--z:-7px;--r:11deg;--t:0.8s;--o:0.8"><i></i></div>
        ${glass('far', 0, 0.7)}
        ${glass('mid', 8, 1)}
        <div class="d-rain__sheen"></div>
        ${glass('near', 16, 1.3)}
        <div class="d-rain__frame"></div>
      </div>
    </div>`,
  },
];

/** Which group each demo in this batch belongs to (merged into MEMBERS in groups.ts). */
export const groupsQ: Partial<Record<Group, string[]>> = {
  scenes: ['desk', 'rain'],
  data: ['bubbles', 'donut', 'sankey'],
};

/** The charts' snippets, re-exported so snippets-batch-q.ts can hand them to the snippet map. */
export const chartSnippetsQ: Record<string, Snippet> = Object.fromEntries(CHARTS.map((c) => [c.demo.id, c.snippet]));
