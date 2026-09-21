import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => fn(i)).join('');

// [spine label, cover title, thickness, height, colour]
const BOOKS: [string, string, number, number, string][] = [
  ['Depth', 'Depth of field', 20, 112, 'var(--accent)'],
  ['Z', 'The Z axis', 16, 98, 'var(--warm)'],
  ['Perspective', 'Perspective', 24, 122, 'var(--accent-2)'],
  ['Faces', 'Six faces', 18, 92, 'var(--hot)'],
  ['Origin', 'Transform origin', 22, 106, 'color-mix(in srgb, var(--accent) 55%, #1c2a6b)'],
];

// dots per ring (8 in total); each dot is a head plus two fading trail copies
const ORBIT_DOTS = [3, 3, 2];

/** Batch I: cards that open, lift and slide out, and two 3D loaders. */
export const demosI: Demo[] = [
  {
    id: 'greeting',
    title: 'Pop-up greeting card',
    description:
      'A greeting card standing half open. Point at it and the cover swings round on its spine, the card turns toward you and a heart pops up out of the fold: a floating layer whose two halves each ride on their own page.',
    category: 'css',
    tags: ['hover', 'cards', 'paper', 'fold'],
    technique: ['transform-origin on the spine', 'pop-up halves = children of each page, translateZ in front', 'meeting line --x0 = lift × cot(angle ÷ 2)', 'static hit target, card inside moves'],
    html: `<div class="d-greeting" tabindex="0" role="group" aria-label="Greeting card: hover or focus to open it">
      <div class="d-greeting__card">
        <i class="d-greeting__shadow"></i>
        <div class="d-greeting__page"><b>Happy<br />day!</b><span></span><span></span><small>with love, C.</small></div>
        <i class="d-greeting__pop"></i>
        <div class="d-greeting__cover">
          <div class="d-greeting__front"><b>For<br />you</b></div>
          <div class="d-greeting__inside"><small>open me</small></div>
          <i class="d-greeting__pop d-greeting__pop--l"></i>
        </div>
      </div>
    </div>`,
  },
  {
    id: 'tiltgallery',
    title: 'Tilting photo wall',
    description:
      'Six photos on a board that leans toward your pointer, while the photo nearest to it lifts off the board and its neighbours rise a little less. JS only measures distances and writes numbers; CSS does all the motion.',
    category: 'js',
    tags: ['pointer', 'cards', 'gallery', 'photo'],
    technique: ['pointer → --rx / --ry on a static wrapper', 'per-tile --lift from distance → translateZ', 'measured on the untransformed wrapper (no feedback)', 'short transition while live, long ease back'],
    html: `<div class="d-tiltgallery" role="group" aria-label="Photo wall: move your pointer over it">
      <div class="d-tiltgallery__plane">${rep(6, () => `<div class="d-tiltgallery__cell"><i></i></div>`)}</div>
    </div>`,
    init(scene, stage) {
      const root = scene.querySelector<HTMLElement>('.d-tiltgallery')!;
      const cells = [...root.querySelectorAll<HTMLElement>('.d-tiltgallery__cell')];
      const COLS = 3;
      const ROWS = 2;
      const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

      const move = (e: PointerEvent) => {
        // The wrapper itself never moves (only the plane inside it tilts), so its box is a
        // stable ruler: 0…1 across the gallery, beyond that outside it.
        const r = root.getBoundingClientRect();
        const u = (e.clientX - r.left) / r.width;
        const v = (e.clientY - r.top) / r.height;
        // the board turns to face the pointer
        root.style.setProperty('--ry', `${(clamp(u * 2 - 1, -1.4, 1.4) * 11).toFixed(2)}deg`);
        root.style.setProperty('--rx', `${(clamp(1 - v * 2, -1.4, 1.4) * 9).toFixed(2)}deg`);
        // each tile lifts by how close the pointer is to its centre, measured in tile sizes
        cells.forEach((cell, i) => {
          const dx = u * COLS - ((i % COLS) + 0.5);
          const dy = v * ROWS - (Math.floor(i / COLS) + 0.5);
          const t = clamp(1 - Math.hypot(dx, dy) / 1.25, 0, 1);
          cell.style.setProperty('--lift', (t * t * (3 - 2 * t)).toFixed(3)); // smoothstep
        });
        root.classList.add('is-live');
      };
      const leave = () => {
        root.classList.remove('is-live'); // the long transition is back: everything eases home
        root.style.removeProperty('--rx');
        root.style.removeProperty('--ry');
        cells.forEach((cell) => cell.style.removeProperty('--lift'));
      };

      stage.addEventListener('pointerdown', move);
      stage.addEventListener('pointermove', move);
      stage.addEventListener('pointerleave', leave);
      stage.addEventListener('pointercancel', leave);
      return () => {
        stage.removeEventListener('pointerdown', move);
        stage.removeEventListener('pointermove', move);
        stage.removeEventListener('pointerleave', leave);
        stage.removeEventListener('pointercancel', leave);
      };
    },
  },
  {
    id: 'bookshelf',
    title: 'Bookshelf',
    description:
      'Five real books on a shelf, each a box with a spine, two covers and a block of pages. Point at one and it slides out toward you and turns to show its front cover, while its slot on the shelf stays put as the hit target.',
    category: 'css',
    tags: ['hover', 'cards', 'gallery', 'shape'],
    technique: ['cuboid from 4 faces sized by --t / --h', 'transform-origin at the book’s 3D centre', 'static slots, pointer-events: none books', 'translateZ + rotateY to pull out'],
    html: `<div class="d-bookshelf" role="group" aria-label="Bookshelf">
      <i class="d-bookshelf__board"></i><i class="d-bookshelf__edge"></i><i class="d-bookshelf__end"></i>
      ${BOOKS.map(
        ([spine, title, t, h, c]) => `<div class="d-bookshelf__slot" tabindex="0" role="img" aria-label="Book: ${title}" style="--t:${t}px;--h:${h}px;--c:${c}">
        <div class="d-bookshelf__book"><i>${spine}</i><i></i><i><b>${title}</b></i><i></i></div>
      </div>`,
      ).join('')}
    </div>`,
  },
  {
    id: 'dotorbit',
    title: 'Orbiting dots loader',
    description:
      'Eight glowing dots with comet trails circle a core on three tilted orbits, while the whole atom slowly turns. Every dot counter-rotates so it always faces you, yet still passes behind the core.',
    category: 'css',
    tags: ['loop', 'loader', 'spinner', 'particles'],
    technique: ['rotateZ(θ) translateX(r) rotateZ(−θ): orbit without turning', 'undo the plane’s tilt = billboard', 'trail copies = same animation, a little later', 'var() inside @keyframes'],
    html: `<div class="d-dotorbit" role="img" aria-label="Loading"><b></b>${ORBIT_DOTS.map(
      (n, k) => `<div class="d-dotorbit__ring" style="--k:${k}">${rep(n * 3, (j) => `<i style="--p:${(Math.floor(j / 3) / n).toFixed(3)};--lag:${j % 3}"></i>`)}</div>`,
    ).join('')}</div>`,
  },
  {
    id: 'blockstack',
    title: 'Stacking blocks loader',
    description:
      'Eight blocks pop into the air and drop one by one onto an isometric floor until they form a 2×2×2 cube, then the cube comes apart column by column and floats away, and it all starts again.',
    category: 'css',
    tags: ['loop', 'loader', 'shape', 'isometric'],
    technique: ['rotateX(58deg) rotateZ(45deg) = isometric floor', 'block = 3 visible faces only', 'two nested animations: block drops, column leaves', 'shared keyframes + delays from --i'],
    html: `<div class="d-blockstack" role="img" aria-label="Loading">${rep(
      4,
      (c) => `<div class="d-blockstack__col" style="--c:${c}">${rep(2, (l) => `<div class="d-blockstack__block" style="--i:${c + 4 * l};--l:${l}"><i></i><i></i><i></i></div>`)}</div>`,
    )}</div>`,
  },
];
