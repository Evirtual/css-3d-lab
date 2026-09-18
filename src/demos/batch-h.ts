import type { Demo } from './types';

/** 24×24 outline icon in the style of the app's icon set (Lucide paths, ISC licence). */
const svg = (paths: string, extra = ''): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${paths}</svg>`;

const MINUS = svg('<path d="M5 12h14"/>');
const PLUS = svg('<path d="M12 5v14"/><path d="M5 12h14"/>');
const SUN = svg(
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
);
const MOON = svg('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', ' fill="currentColor"');

const KEYS: [legend: string, hot: boolean][] = [
  ['C', false],
  ['S', false],
  ['S', false],
  ['3D', true],
];

const STEPPER_MIN = 0;
const STEPPER_MAX = 10;
const STEPPER_START = 3;

const RATING_WORDS = ['Poor', 'Okay', 'Good', 'Great', 'Amazing!'];

const WORD_A = 'CUBE';
const WORD_B = 'ROLL';

/** Batch H: 3D form controls (keycaps, stepper, rating, toggle) and rolling letter cubes. */
export const demosH: Demo[] = [
  {
    id: 'keycaps',
    title: '3D keycaps',
    description:
      'Mechanical keycaps with sloped sides on a tilted plate. Hover or focus a key and its cap sinks into the plate with a glow; the button itself never moves, only the cap inside it.',
    category: 'css',
    tags: ['controls', 'hover', 'button', 'keyboard', 'sass-loop'],
    technique: ['trapezoid sides: clip-path + rotateX(atan(h / inset))', 'rotate each side around the key centre', 'static <button>, cap sinks with translateZ', 'glow faded with opacity'],
    html: `<div class="d-keycaps"><div class="d-keycaps__deck">${KEYS.map(
      ([legend, hot]) =>
        `<button type="button" class="d-keycaps__key${hot ? ' d-keycaps__key--hot' : ''}"><i class="d-keycaps__glow"></i><span class="d-keycaps__cap"><i></i><i></i><i></i><i></i><b>${legend}</b></span></button>`,
    ).join('')}</div></div>`,
  },
  {
    id: 'stepper',
    title: 'Rolling number stepper',
    description:
      'A quantity stepper whose number sits on a cube. − and + roll it a quarter turn down or up; just before each turn JS writes the new number onto the face that is about to come into view.',
    category: 'js',
    tags: ['controls', 'shape', 'number', 'form'],
    technique: ['--a: step × 90deg, never wrapped', 'face index = step mod 4', 'write the next face before the turn', 'restart a nudge animation at the limits'],
    fill: true,
    html: `<div class="d-stepper">
      <div class="d-stepper__view"><div class="d-stepper__nudge"><div class="d-stepper__cube" aria-hidden="true">${[
        STEPPER_START,
        STEPPER_START + 1,
        STEPPER_START + 2,
        STEPPER_START - 1,
      ]
        .map((n) => `<i>${n}</i>`)
        .join('')}<b></b><b></b></div></div></div>
      <div class="d-stepper__bar"><output aria-live="polite">Quantity ${STEPPER_START}</output><div class="d-stepper__buttons"><button type="button" aria-label="Decrease quantity">${MINUS}</button><button type="button" aria-label="Increase quantity">${PLUS}</button></div></div>
    </div>`,
    init(scene) {
      const cube = scene.querySelector<HTMLElement>('.d-stepper__cube')!;
      const nudge = scene.querySelector<HTMLElement>('.d-stepper__nudge')!;
      const faces = [...cube.querySelectorAll<HTMLElement>('i')];
      const out = scene.querySelector<HTMLOutputElement>('output')!;
      const [minus, plus] = [...scene.querySelectorAll<HTMLButtonElement>('.d-stepper__buttons button')];
      let value = STEPPER_START;
      let step = 0; // quarter turns so far; never wrapped, so the cube always turns the short way
      const face = (s: number) => faces[((s % 4) + 4) % 4];
      const label = (n: number) => (n >= STEPPER_MIN && n <= STEPPER_MAX ? String(n) : '');

      const render = () => {
        // The faces around the front always hold the true neighbours (blank past a limit), so
        // whichever way the cube turns next, the number that comes into view is already right.
        face(step).textContent = label(value);
        face(step + 1).textContent = label(value + 1);
        face(step - 1).textContent = label(value - 1);
        face(step + 2).textContent = '';
        cube.style.setProperty('--a', `${step * 90}deg`);
        const limit = value === STEPPER_MIN ? ' (minimum)' : value === STEPPER_MAX ? ' (maximum)' : '';
        out.textContent = `Quantity ${value}${limit}`;
        minus.setAttribute('aria-disabled', String(value === STEPPER_MIN));
        plus.setAttribute('aria-disabled', String(value === STEPPER_MAX));
      };

      const change = (dir: 1 | -1) => {
        const next = value + dir;
        if (next < STEPPER_MIN || next > STEPPER_MAX) {
          // At a limit: a short nudge in that direction instead of a turn. Restart the animation.
          nudge.style.setProperty('--dir', String(dir));
          nudge.classList.remove('is-nudge');
          void nudge.offsetWidth;
          nudge.classList.add('is-nudge');
          return;
        }
        value = next;
        step += dir;
        render();
      };
      const down = () => change(-1);
      const up = () => change(1);
      render();
      minus.addEventListener('click', down);
      plus.addEventListener('click', up);
      return () => {
        minus.removeEventListener('click', down);
        plus.removeEventListener('click', up);
      };
    },
  },
  {
    id: 'rating',
    title: 'Flipping star rating',
    description:
      'Five thin star plates, each a front and a gold back with an edge between them. Radio inputs and labels choose a rating, and every star up to it flips over, one after another.',
    category: 'css',
    tags: ['controls', 'form-hack', 'stars', 'sass-loop'],
    technique: ['radio:nth-of-type(n):checked ~ label:nth-child(-n + n)', 'clip-path star faces, stacked edge layers', 'rotateY(180deg) + backface-visibility', 'transition-delay from --i'],
    html: `<div class="d-rating" role="radiogroup" aria-label="Rate this effect">
      <b class="d-rating__title" aria-hidden="true">Rate this effect</b>
      ${RATING_WORDS.map(
        (word, i) =>
          `<input type="radio" name="rating-{{uid}}" id="rating-{{uid}}-${i + 1}" value="${i + 1}" aria-label="${i + 1} star${i ? 's' : ''}, ${word}"${i === 3 ? ' checked' : ''} />`,
      ).join('')}
      <div class="d-rating__stars">${RATING_WORDS.map(
        (_, i) =>
          `<label for="rating-{{uid}}-${i + 1}" style="--i:${i}"><span class="d-rating__lift"><span class="d-rating__star">${'<i></i>'.repeat(5)}</span></span></label>`,
      ).join('')}</div>
      <p class="d-rating__words" aria-hidden="true"><span>Tap a star</span>${RATING_WORDS.map((w) => `<span>${w}</span>`).join('')}</p>
    </div>`,
  },
  {
    id: 'toggle',
    title: 'Rolling cube toggle',
    description:
      'A chunky switch whose knob is a real cube. Checked, it tips over its right-hand edge onto the other half of the track, bringing the moon face up, and the track changes colour.',
    category: 'css',
    tags: ['controls', 'form-hack', 'switch', 'shape'],
    technique: ['transform-origin on the cube’s bottom edge', 'one rotateY(90deg) = a real roll', 'stacked layers for the track’s depth', 'colour swap by cross-fading opacity'],
    html: `<label class="d-toggle">
      <input type="checkbox" role="switch" />
      <span class="d-toggle__track" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><span class="d-toggle__top"></span><i class="d-toggle__shadow"></i><span class="d-toggle__knob"><span class="d-toggle__cube"><i>${SUN}</i><i></i><i></i><i>${MOON}</i><i></i><i></i></span></span></span>
      <span class="d-toggle__text">Dark mode<small aria-hidden="true"><span>Off</span><span>On</span></small></span>
    </label>`,
  },
  {
    id: 'cubeletters',
    title: 'Rolling letter cubes',
    description: `Every letter sits on its own cube. The cubes roll forward a quarter turn one after another, so ${WORD_A} becomes ${WORD_B} and back; after four turns each cube is where it started, so the loop has no seam.`,
    category: 'css',
    tags: ['text', 'loop', 'shape', 'sass-loop'],
    technique: ['face n: rotateX(n × -90deg) translateZ(s / 2)', 'hold + turn keyframes to 360deg', 'animation-delay from --i', 'backface-visibility: hidden'],
    html: `<div class="d-cubeletters" role="img" aria-label="${WORD_A}, rolling over to ${WORD_B}">${[...WORD_A]
      .map(
        (letter, i) =>
          `<span class="d-cubeletters__cube" style="--i:${i}" aria-hidden="true"><i>${letter}</i><i>${WORD_B[i]}</i><i>${letter}</i><i>${WORD_B[i]}</i><b></b><b></b></span>`,
      )
      .join('')}</div>`,
  },
];
