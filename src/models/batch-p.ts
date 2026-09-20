import type { Group } from './groups';
import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => fn(i)).join('');

/** The dates on the flip calendar. The last one repeats the first: it is the page the eye is
 *  reading while the four that have fallen snap back upright behind it. */
const DATES = [
  ['MON', '14'],
  ['TUE', '15'],
  ['WED', '16'],
  ['THU', '17'],
  ['MON', '14'],
];

const STORIES = ['ada', 'lin', 'noor', 'kai', 'ivy'];

/** Batch P: new demos. Each one also lists its group below. */
export const demosP: Demo[] = [
  {
    id: 'calendar',
    title: 'Flip calendar',
    description: 'A desk calendar whose top leaf drops on the spiral to show the next date. The loop resets under the fallen pages, where nothing can be seen.',
    category: 'css',
    tags: ['loop', 'sass-loop', 'calendar', 'paper'],
    technique: ['transform-origin on the hinge line', 'backface-visibility for the page back', 'a stack hidden by perspective', 'Sass-generated @keyframes'],
    html: `<div class="d-calendar">
      <div class="d-calendar__lower"><span>SEPTEMBER</span></div>
      <div class="d-calendar__stack">
        ${DATES.map(([day, date], i) => `<div class="d-calendar__page" style="--i:${i}">
          <div class="d-calendar__leaf">
            <i class="d-calendar__face"><b>${day}</b><em>${date}</em></i>
            <i class="d-calendar__back"><span>SEPTEMBER</span></i>
          </div>
        </div>`).join('')}
      </div>
      <div class="d-calendar__rings">${rep(7, (i) => `<i style="--i:${i}"></i>`)}</div>
      <div class="d-calendar__base"><i></i><i></i><i></i></div>
    </div>`,
  },
  {
    id: 'stories',
    title: 'Story ring',
    description: 'Avatars standing on a shallow arc. Point at one and it turns to face you, rises and grows while the rest lean aside.',
    category: 'css',
    tags: ['hover', 'sass-loop', 'social', 'avatar'],
    technique: ['rotateY + translateZ arc', 'pointer-events on static slots', 'conic-gradient ring turned by rotate', ':has() for the slots before the pointer'],
    html: `<div class="d-stories">
      ${STORIES.map((name, i) => `<div class="d-stories__slot" tabindex="0" role="button" aria-label="Open ${name}'s story" style="--i:${i}">
        <div class="d-stories__bubble"><i class="d-stories__ring"></i><b class="d-stories__face"></b></div>
        <span class="d-stories__name">${name}</span>
      </div>`).join('')}
    </div>`,
  },
  {
    id: 'foldloader',
    title: 'Folding sheet',
    description: 'A square folds its four corners into the middle and opens again. Each hinge is a diagonal, so the fold is a rotate3d around an axis the box does not have.',
    category: 'css',
    tags: ['loop', 'sass-loop', 'paper', 'origami'],
    technique: ['rotate3d around a diagonal axis', 'clip-path triangles', 'mirrored clip-path for the back face', 'backface-visibility'],
    html: `<div class="d-foldloader"><div class="d-foldloader__sheet">
      <i class="d-foldloader__core"></i>
      ${rep(4, () => `<div class="d-foldloader__flap"><i></i><i></i></div>`)}
    </div></div>`,
  },
  {
    id: 'pulse',
    title: 'Sonar pulse',
    description: 'Rings leaving a dish laid almost flat to the camera, growing outward and rising as they fade.',
    category: 'css',
    tags: ['loop', 'radar', 'minimal'],
    technique: ['rotateX(70deg) ground plane', 'scale + translateZ in one keyframe', 'negative animation-delay stagger'],
    html: `<div class="d-pulse">${rep(6, (i) => `<i style="--i:${i}"></i>`)}<b></b><u></u></div>`,
  },
  {
    id: 'mountains',
    title: 'Misty ridges',
    description: 'Five ridges at five depths with mist in the valleys. The world slides sideways and perspective alone turns that into parallax.',
    category: 'css',
    tags: ['loop', 'sass-loop', 'landscape', 'parallax'],
    technique: ['translateZ layers + scale that cancels it', 'perspective-driven parallax', 'clip-path silhouettes', 'repeating background slid by one tile'],
    fill: true,
    html: `<div class="d-mountains"><div class="d-mountains__world">
      <i class="d-mountains__moon"></i>
      <i class="d-mountains__cloud"></i>
      ${rep(5, () => `<b class="d-mountains__ridge"></b>`)}
      ${rep(4, () => `<u class="d-mountains__mist"></u>`)}
    </div></div>`,
  },
];

/** Which group each demo in this batch belongs to (merged into MEMBERS in groups.ts). */
export const groupsP: Partial<Record<Group, string[]>> = {
  cards: ['calendar', 'stories'],
  loaders: ['foldloader', 'pulse'],
  scenes: ['mountains'],
};
