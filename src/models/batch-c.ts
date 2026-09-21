import type { Demo } from './types';

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** 24×24 outline icon in the style of the app's icon set (Lucide paths, ISC licence). */
const svg = (paths: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const TICK = svg('<path d="M20 6 9 17l-5-5"/>');
const PLUS = svg('<path d="M12 5v14"/><path d="M5 12h14"/>');

const RADIAL_ITEMS: [label: string, colour: string, paths: string][] = [
  ['Like', 'var(--hot)', '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.500c0 2.300 1.500 4 3 5.500l7 7Z"/>'],
  ['Edit', 'var(--warm)', '<path d="M12 20h9"/><path d="M16.500 3.500a2.120 2.120 0 0 1 3 3L7 19l-4 1 1-4Z"/>'],
  ['Share', 'var(--accent-2)', '<path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>'],
  ['Copy', 'var(--accent)', '<rect width="13" height="13" x="8" y="8" rx="2"/><path d="M5 16a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2"/>'],
  ['Search', 'var(--hot)', '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.500-4.500"/>'],
];

const FLAP_WORDS = ['NEW YORK', 'HELSINKI', 'LISBON', 'BANGKOK', 'SAN JOSE', 'CSS 3D'];
const FLAP_CELLS = 8;

const TAB_FACES: [tab: string, colour: string, title: string, text: string][] = [
  ['Front', 'var(--accent)', 'rotateX(0deg)', 'The face you start on. It sits at z = 0, so its text stays sharp.'],
  ['Bottom', 'var(--accent-2)', 'rotateX(90deg)', 'A quarter turn forward brings the bottom face up to the front.'],
  ['Back', 'var(--hot)', 'rotateX(180deg)', 'Half a turn. Placed with a half turn too, so it reads upright.'],
  ['Top', 'var(--warm)', 'rotateX(270deg)', 'Three quarter turns, all driven by one custom property.'],
];

const CRAWL_TEXT = `<h4>Episode 3D</h4>
<p>It is a period of flat design. Rebel stylesheets, striking from a hidden folder, have won their first victory against the evil Canvas Empire.</p>
<p>During the battle, a single rotateX managed to tip an entire paragraph back into the distance, using nothing but perspective and a parent that owns it.</p>
<p>Pursued by heavy JavaScript bundles, the text now scrolls home along its plane, with no script on board at all...</p>`;

/** Batch C: 3D text effects and 3D form controls. */
export const demosC: Demo[] = [
  {
    id: 'flaptext',
    title: 'Split-flap board',
    description:
      'A departure board: each character is four half-height leaves, and a change drops the old top half and lands the new bottom half. JS only swaps the letters and restarts the CSS animation.',
    category: 'js',
    tags: ['text', 'loop', 'generated'],
    technique: ['two hinged half-leaves per cell', 'content: attr(data-c)', 'restart animation by re-adding a class', 'animation-fill-mode: both'],
    html: `<div class="d-flaptext">
      <div class="d-flaptext__head"><span>Departures</span><b>Gate 3D</b></div>
      <div class="d-flaptext__row" role="img" aria-label="Split-flap display cycling through city names">${Array.from(
        { length: FLAP_CELLS },
        (_, i) =>
          `<span class="d-flaptext__cell" style="--i:${i}"><i class="d-flaptext__top"></i><i class="d-flaptext__bottom"></i><i class="d-flaptext__fall"></i><i class="d-flaptext__land"></i></span>`,
      ).join('')}</div>
    </div>`,
    init(scene) {
      const cells = [...scene.querySelectorAll<HTMLElement>('.d-flaptext__cell')].map((cell) => ({
        cell,
        leaves: [...cell.querySelectorAll<HTMLElement>('i')], // top, bottom, fall, land
        char: ' ',
      }));
      const show = (word: string, animate: boolean) => {
        const text = word.padEnd(cells.length);
        cells.forEach((c, i) => {
          const next = text[i];
          if (next === c.char && animate) return;
          const [top, bottom, fall, land] = c.leaves;
          top.dataset.c = next; // revealed as the old top half falls
          land.dataset.c = next; // lands on top of the old bottom half
          fall.dataset.c = c.char;
          bottom.dataset.c = c.char;
          c.char = next;
          if (!animate) return;
          // Restart the CSS animation: drop the class, force a style flush, add it again.
          c.cell.classList.remove('is-flip');
          void c.cell.offsetWidth;
          c.cell.classList.add('is-flip');
        });
      };
      let index = 0;
      show(FLAP_WORDS[0], false);
      const timer = window.setInterval(() => {
        index = (index + 1) % FLAP_WORDS.length;
        show(FLAP_WORDS[index], true);
      }, 2600);
      return () => window.clearInterval(timer);
    },
  },
  {
    id: 'shadowtext',
    title: 'Isometric block text',
    description: 'One word stacked twenty times along the Z axis. Laid on a tilted floor, the copies merge into a solid extrusion under a gradient front.',
    category: 'css',
    tags: ['text', 'loop', 'layers'],
    technique: ['translateZ(calc(var(--i) * -1.2 * var(--u)))', 'rotateX + rotateZ floor', 'lightness from --i', 'background-clip: text'],
    html: `<div class="d-shadowtext"><span style="--i:0">Depth</span>${Array.from({ length: 20 }, (_, i) => `<span aria-hidden="true" style="--i:${i + 1}">Depth</span>`).join('')}</div>`,
  },
  {
    id: 'wordcube',
    title: 'Rotating word prism',
    description: 'Four words on the four long sides of a prism that turns a quarter at a time, pausing on each. After 360° it is back where it started, so the loop has no seam.',
    category: 'css',
    tags: ['text', 'loop', 'shape'],
    technique: ['rotateX(n × -90deg) translateZ(h / 2)', 'hold + turn keyframes', 'backface-visibility: hidden', 'per-keyframe easing'],
    html: `<div class="d-wordcube"><span>We make</span><span class="d-wordcube__prism">${[
      ['design', 'var(--accent)'],
      ['code', 'var(--accent-2)'],
      ['motion', 'var(--hot)'],
      ['brands', 'var(--warm)'],
    ]
      .map(([word, colour], i) => `<span style="--i:${i};--c:${colour}">${word}</span>`)
      .join('')}</span></div>`,
  },
  {
    id: 'foldtext',
    title: 'Z-fold headline',
    description: 'A headline printed across three panels folded like a brochure. Each panel is a window onto the same wide sheet; hover or focus flattens the paper.',
    category: 'css',
    tags: ['text', 'hover', 'paper'],
    technique: ['nested hinges with transform-origin', 'same sheet offset by --i × -100%', 'clip the leaf, never the hinge', 'shading faded with opacity'],
    html: `<div class="d-foldtext" tabindex="0" aria-label="Unfold: a headline on folded paper, flattens on hover or focus">
      <div class="d-foldtext__panel d-foldtext__panel--mid">
        <b style="--i:1" aria-hidden="true"><span><small>HOVER TO</small>UNFOLD</span></b>
        <div class="d-foldtext__panel d-foldtext__panel--left"><b style="--i:0" aria-hidden="true"><span><small>HOVER TO</small>UNFOLD</span></b></div>
        <div class="d-foldtext__panel d-foldtext__panel--right"><b style="--i:2" aria-hidden="true"><span><small>HOVER TO</small>UNFOLD</span></b></div>
      </div>
    </div>`,
  },
  {
    id: 'crawl',
    title: 'Opening crawl',
    description: 'Paragraphs scroll away on a plane tipped back 55°. The fade into the distance is an overlay on top, because a mask on a 3D ancestor would flatten the scene.',
    category: 'css',
    tags: ['text', 'loop', 'scene'],
    technique: ['perspective-origin at the bottom edge', 'rotateX(55deg) hinged on the bottom', 'translateY loop, two copies half a loop apart', 'gradient overlay instead of mask'],
    fill: true,
    html: `<div class="d-crawl">
      <div class="d-crawl__plane"><div class="d-crawl__text">${CRAWL_TEXT}</div><div class="d-crawl__text" aria-hidden="true">${CRAWL_TEXT}</div></div>
      <div class="d-crawl__fade"></div>
    </div>`,
  },
  {
    id: 'anaglyph',
    title: 'Anaglyph 3D text',
    description: 'A red and a cyan copy of one word, blended with screen. The pointer sets how far apart they sit and turns the card, like old red/cyan cinema glasses.',
    category: 'js',
    tags: ['text', 'pointer', 'blend'],
    technique: ['mix-blend-mode: screen on the leaves', 'pointer → --sx / --ry / --rx', 'flat card, no preserve-3d around a blend', 'fast transition live, springy on release'],
    html: `<div class="d-anaglyph"><div class="d-anaglyph__word"><span>STEREO</span><span aria-hidden="true">STEREO</span></div><small>move your pointer</small></div>`,
    init(scene, stage) {
      const card = scene.querySelector<HTMLElement>('.d-anaglyph')!;
      const move = (e: PointerEvent) => {
        const r = stage.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
        const y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
        card.style.setProperty('--sx', `${(x * 16).toFixed(2)}px`);
        card.style.setProperty('--sy', `${(y * 5).toFixed(2)}px`);
        card.style.setProperty('--ry', `${(x * 44).toFixed(1)}deg`);
        card.style.setProperty('--rx', `${(-y * 30).toFixed(1)}deg`);
        card.classList.add('is-live');
      };
      const leave = () => {
        card.classList.remove('is-live');
        for (const p of ['--sx', '--sy', '--ry', '--rx']) card.style.removeProperty(p);
      };
      stage.addEventListener('pointermove', move);
      stage.addEventListener('pointerdown', move);
      stage.addEventListener('pointerleave', leave);
      stage.addEventListener('pointercancel', leave);
      return () => {
        stage.removeEventListener('pointermove', move);
        stage.removeEventListener('pointerdown', move);
        stage.removeEventListener('pointerleave', leave);
        stage.removeEventListener('pointercancel', leave);
      };
    },
  },
  {
    id: 'check',
    title: '3D checkboxes',
    description: 'Each checkbox is a small glass cube with the tick on its bottom face. :checked rolls the cube a quarter turn forward; the inputs are real, so keyboard and forms just work.',
    category: 'css',
    tags: ['controls', 'form-hack', 'shape'],
    technique: ['input:checked + label', 'cube rolls rotateX(90deg)', 'static label = hit target', 'strike-through with scaleX'],
    html: `<ul class="d-check">${['Set the perspective', 'Preserve the 3D', 'Flip the cube']
      .map(
        (text, i) =>
          `<li><input type="checkbox" id="check-{{uid}}-${i}"${i === 0 ? ' checked' : ''} /><label for="check-{{uid}}-${i}"><span class="d-check__box"><span class="d-check__cube">${'<i></i>'.repeat(5)}<i>${TICK}</i></span></span><span class="d-check__text">${text}</span></label></li>`,
      )
      .join('')}</ul>`,
  },
  {
    id: 'tabs',
    title: 'Prism tabs',
    description: 'The tab panels are the four long sides of a prism. Radio inputs and labels pick a tab; each one sets a step count and the prism turns to that face.',
    category: 'css',
    tags: ['controls', 'form-hack', 'shape', 'sass-loop'],
    technique: ['radio:checked ~ sibling', '--step × 90deg', 'translateZ(-h / 2) keeps the front at z = 0', 'backface-visibility: hidden'],
    html: `<div class="d-tabs">
      ${TAB_FACES.map(([tab], i) => `<input type="radio" name="tabs-{{uid}}" id="tabs-{{uid}}-${i}" aria-label="${tab}"${i === 0 ? ' checked' : ''} />`).join('')}
      <div class="d-tabs__nav">${TAB_FACES.map(([tab], i) => `<label for="tabs-{{uid}}-${i}">${tab}</label>`).join('')}</div>
      <div class="d-tabs__view"><div class="d-tabs__prism">${TAB_FACES.map(
        ([, colour, title, text], i) => `<section style="--i:${i};--c:${colour}"><b>${title}</b><p>${text}</p></section>`,
      ).join('')}</div></div>
    </div>`,
  },
  {
    id: 'radial',
    title: 'Radial action menu',
    description: 'A floating action button built from a checkbox and its label. Checked, five actions walk out along their spokes onto an arc, flipping up as they come forward, one after another.',
    category: 'css',
    tags: ['controls', 'form-hack', 'menu'],
    technique: ['rotate(a) translateX(r) rotate(-a)', 'matching transform lists animate per function', 'transition-delay from --i', 'checkbox + label toggle'],
    html: `<div class="d-radial">
      <input type="checkbox" id="radial-{{uid}}" aria-label="Open the action menu" />
      <span class="d-radial__ring"></span>
      ${RADIAL_ITEMS.map(([label, colour, paths], i) => `<button type="button" class="d-radial__item" style="--i:${i};--c:${colour}" aria-label="${label}" title="${label}">${svg(paths)}</button>`).join('')}
      <label class="d-radial__fab" for="radial-{{uid}}" title="Actions">${PLUS}</label>
    </div>`,
  },
  {
    id: 'magnet',
    title: 'Magnetic button',
    description: 'Inside its field the button shifts and leans toward the pointer while its label floats higher, so the two slide apart. JS only reports the pointer position; release it and a springy transition takes it home.',
    category: 'js',
    tags: ['controls', 'pointer', 'button'],
    technique: ['pointer → --mx / --my', 'translate3d + rotate from the same two numbers', 'label at translateZ for parallax', 'overshoot easing as a spring'],
    html: `<div class="d-magnet"><i class="d-magnet__glow"></i><button type="button" class="d-magnet__btn"><span>Pull me</span></button></div>`,
    init(scene) {
      const field = scene.querySelector<HTMLElement>('.d-magnet')!;
      const move = (e: PointerEvent) => {
        // A ratio of the on-screen box, so any CSS scale on the stage cancels out.
        const r = field.getBoundingClientRect();
        field.style.setProperty('--mx', clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1).toFixed(3));
        field.style.setProperty('--my', clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1).toFixed(3));
        field.classList.add('is-live');
      };
      const release = () => {
        field.classList.remove('is-live');
        field.style.removeProperty('--mx');
        field.style.removeProperty('--my');
      };
      field.addEventListener('pointermove', move);
      field.addEventListener('pointerdown', move);
      field.addEventListener('pointerleave', release);
      field.addEventListener('pointercancel', release);
      return () => {
        field.removeEventListener('pointermove', move);
        field.removeEventListener('pointerdown', move);
        field.removeEventListener('pointerleave', release);
        field.removeEventListener('pointercancel', release);
      };
    },
  },
];
