import { icon } from '../icons';
import type { Demo } from './types';

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const rand = (min: number, max: number): number => min + Math.random() * (max - min);

/** Second batch of demos where JavaScript supplies values and CSS renders them. */
export const interactiveDemos2: Demo[] = [
  {
    id: 'dice',
    title: 'Dice roll',
    description: 'JS picks a random face and adds full turns; a CSS transition does the tumbling.',
    category: 'js',
    tags: ['controls', 'shape'],
    technique: ['Math.random() → target rotation', 'accumulating 360° turns', 'transition with overshoot easing'],
    fill: true,
    html: `<div class="d-dice">
      <div class="d-dice__view"><div class="d-dice__cube">${[1, 2, 6, 5, 3, 4].map((n) => `<i>${n}</i>`).join('')}</div></div>
      <div class="d-dice__bar"><button type="button">Roll</button><output>Click roll</output></div>
    </div>`,
    init(scene) {
      const cube = scene.querySelector<HTMLElement>('.d-dice__cube')!;
      const out = scene.querySelector<HTMLOutputElement>('output')!;
      const btn = scene.querySelector<HTMLButtonElement>('button')!;
      // Rotation that brings each value to the front (faces: front 1, right 2, back 6, left 5, top 3, bottom 4).
      const views: Record<number, [number, number]> = { 1: [0, 0], 2: [0, -90], 6: [0, -180], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };
      let turns = 0;
      let timer = 0;
      const roll = () => {
        const value = 1 + Math.floor(Math.random() * 6);
        turns += 2;
        const [x, y] = views[value];
        cube.style.setProperty('--rx', `${x + 360 * turns}deg`);
        cube.style.setProperty('--ry', `${y + 360 * turns}deg`);
        out.textContent = 'Rolling…';
        window.clearTimeout(timer);
        timer = window.setTimeout(() => (out.textContent = `You rolled ${value}`), 1100);
      };
      btn.addEventListener('click', roll);
      return () => {
        window.clearTimeout(timer);
        btn.removeEventListener('click', roll);
      };
    },
  },
  {
    id: 'cardstack',
    title: 'Card stack',
    description: 'Click the deck: the top card flies off and returns at the back. JS only reassigns positions.',
    category: 'js',
    tags: ['controls'],
    technique: ['position index in --p', 'calc() for offset, depth and z-index', 'class toggle for the exit'],
    html: `<div class="d-cardstack" role="button" tabindex="0" aria-label="Card stack, click for next card">${['One', 'Two', 'Three', 'Four']
      .map((t, i) => `<i style="--hue:${255 + i * 35}">${t}</i>`)
      .join('')}</div>`,
    init(scene) {
      const root = scene.querySelector<HTMLElement>('.d-cardstack')!;
      let order = [...root.querySelectorAll<HTMLElement>('i')];
      let busy = false;
      let timer = 0;
      const layout = () => order.forEach((el, p) => el.style.setProperty('--p', String(p)));
      const next = () => {
        if (busy) return;
        busy = true;
        const top = order[0];
        top.classList.add('is-leaving');
        timer = window.setTimeout(() => {
          order = [...order.slice(1), top];
          top.classList.remove('is-leaving');
          layout();
          busy = false;
        }, 380);
      };
      const key = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          next();
        }
      };
      layout();
      root.addEventListener('click', next);
      root.addEventListener('keydown', key);
      return () => {
        window.clearTimeout(timer);
        root.removeEventListener('click', next);
        root.removeEventListener('keydown', key);
      };
    },
  },
  {
    id: 'parallax',
    title: 'Depth parallax',
    description: 'Layers sit at different translateZ depths; tilting the scene with the pointer makes them slide apart.',
    category: 'js',
    tags: ['pointer'],
    technique: ['translateZ per layer', 'scale() to compensate for distance', 'pointer → two rotation variables'],
    fill: true,
    html: `<div class="d-parallax"><div class="d-parallax__world"><i></i><i></i><i></i><i></i></div><b>Move your pointer</b></div>`,
    init(scene, stage) {
      const world = scene.querySelector<HTMLElement>('.d-parallax__world')!;
      const move = (e: PointerEvent) => {
        const r = stage.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
        const y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
        world.style.setProperty('--ry', `${x * 30}deg`);
        world.style.setProperty('--rx', `${-y * 20}deg`);
        world.classList.add('is-live');
        world.parentElement!.classList.add('is-touched');
      };
      const leave = () => {
        world.classList.remove('is-live');
        world.style.removeProperty('--rx');
        world.style.removeProperty('--ry');
      };
      stage.addEventListener('pointermove', move);
      stage.addEventListener('pointerleave', leave);
      return () => {
        stage.removeEventListener('pointermove', move);
        stage.removeEventListener('pointerleave', leave);
      };
    },
  },
  {
    id: 'boxslider',
    title: 'Box slideshow',
    description: 'Four slides on the sides of a box. JS counts steps; CSS turns the box by 90° per step.',
    category: 'js',
    tags: ['controls', 'shape'],
    technique: ['rotateY(calc(var(--step) * -90deg))', 'unbounded counter = endless rotation', 'translateZ(-w/2) keeps the front at z = 0'],
    fill: true,
    html: `<div class="d-boxslider">
      <div class="d-boxslider__view"><div class="d-boxslider__box">${['Design', 'Build', 'Ship', 'Repeat'].map((t, i) => `<i style="--hue:${250 + i * 40}">${t}</i>`).join('')}</div></div>
      <div class="d-boxslider__nav"><button type="button" data-dir="-1" aria-label="Previous">${icon('chevron-left')}</button><button type="button" data-dir="1" aria-label="Next">${icon('chevron-right')}</button></div>
    </div>`,
    init(scene) {
      const box = scene.querySelector<HTMLElement>('.d-boxslider__box')!;
      const nav = scene.querySelector<HTMLElement>('.d-boxslider__nav')!;
      let step = 0;
      const click = (e: MouseEvent) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-dir]');
        if (!btn) return;
        step += Number(btn.dataset.dir);
        box.style.setProperty('--step', String(step));
      };
      nav.addEventListener('click', click);
      return () => nav.removeEventListener('click', click);
    },
  },
  {
    id: 'wavegrid',
    title: 'Wave grid',
    description: 'JS builds the grid and gives each cell its distance from the centre; CSS turns that into a ripple.',
    category: 'js',
    tags: ['generated', 'controls', 'loop'],
    technique: ['generated DOM', 'animation-delay from distance', 'one shared @keyframes'],
    fill: true,
    html: `<div class="d-wavegrid">
      <div class="d-wavegrid__view"><div class="d-wavegrid__grid"></div></div>
      <label>size <output>9</output><input type="range" min="5" max="11" step="2" value="9" /></label>
    </div>`,
    init(scene) {
      const grid = scene.querySelector<HTMLElement>('.d-wavegrid__grid')!;
      const input = scene.querySelector<HTMLInputElement>('input')!;
      const output = scene.querySelector<HTMLOutputElement>('output')!;
      const build = () => {
        const n = Number(input.value);
        const mid = (n - 1) / 2;
        output.textContent = `${n}×${n}`;
        grid.style.setProperty('--n', String(n));
        const frag = document.createDocumentFragment();
        for (let row = 0; row < n; row++) {
          for (let col = 0; col < n; col++) {
            const cell = document.createElement('i');
            cell.style.setProperty('--d', Math.hypot(row - mid, col - mid).toFixed(2));
            frag.append(cell);
          }
        }
        grid.replaceChildren(frag);
      };
      build();
      input.addEventListener('input', build);
      return () => input.removeEventListener('input', build);
    },
  },
  {
    id: 'confetti',
    title: 'Confetti burst',
    description: 'Click anywhere. JS spawns particles with random 3D vectors; one CSS animation flies them all.',
    category: 'js',
    tags: ['generated', 'pointer'],
    technique: ['random --x / --y / --z / --spin per particle', 'translate3d + rotate3d keyframes', 'remove on animationend'],
    fill: true,
    html: `<div class="d-confetti"><span>click anywhere</span></div>`,
    init(scene, stage) {
      const root = scene.querySelector<HTMLElement>('.d-confetti')!;
      const burstAt = (x: number, y: number) => {
        for (let i = 0; i < 36; i++) {
          const p = document.createElement('i');
          p.style.left = `${x}px`;
          p.style.top = `${y}px`;
          p.style.setProperty('--x', `${rand(-140, 140).toFixed(0)}px`);
          p.style.setProperty('--y', `${rand(-150, 60).toFixed(0)}px`);
          p.style.setProperty('--z', `${rand(-200, 260).toFixed(0)}px`);
          p.style.setProperty('--spin', `${rand(360, 1080).toFixed(0)}deg`);
          p.style.setProperty('--hue', rand(0, 360).toFixed(0));
          p.addEventListener('animationend', () => p.remove(), { once: true });
          root.append(p);
        }
      };
      const burst = (e: PointerEvent) => {
        const r = root.getBoundingClientRect();
        // getBoundingClientRect is in screen pixels; divide out any CSS scale on the stage.
        const scale = r.width / root.offsetWidth || 1;
        burstAt((e.clientX - r.left) / scale, (e.clientY - r.top) / scale);
      };
      // One burst on arrival, so the card shows what it does before anyone clicks. (Only one: a
      // card off screen is paused, so a repeating burst would pile up particles that never finish.)
      const hello = window.setTimeout(() => burstAt(root.offsetWidth / 2, root.offsetHeight * 0.55), 250);
      stage.addEventListener('pointerdown', burst);
      return () => {
        window.clearTimeout(hello);
        stage.removeEventListener('pointerdown', burst);
      };
    },
  },
  {
    id: 'scrollspin',
    title: 'Scroll-linked spin',
    description: 'Scroll inside the box. JS turns scroll progress into one number; CSS maps it to rotation.',
    category: 'js',
    tags: ['controls', 'shape'],
    technique: ['scroll progress 0…1 in --p', 'position: sticky stage', 'CSS-only alternative: animation-timeline: scroll()'],
    fill: true,
    html: `<div class="d-scrollspin" tabindex="0" aria-label="Scrollable area">
      <div class="d-scrollspin__sticky"><div class="d-scrollspin__cube">${'<i></i>'.repeat(6)}</div><small>scroll ↓</small></div>
      <div class="d-scrollspin__spacer"></div>
    </div>`,
    init(scene) {
      const box = scene.querySelector<HTMLElement>('.d-scrollspin')!;
      const onScroll = () => {
        const max = box.scrollHeight - box.clientHeight;
        box.style.setProperty('--p', max > 0 ? (box.scrollTop / max).toFixed(4) : '0');
      };
      box.addEventListener('scroll', onScroll, { passive: true });
      return () => box.removeEventListener('scroll', onScroll);
    },
  },
  {
    id: 'ripple',
    title: 'Ripple flip',
    description: 'Click any tile: every tile flips, delayed by its distance from the one you clicked.',
    category: 'js',
    tags: ['pointer', 'generated'],
    technique: ['distance → --d → transition-delay', 'one data attribute flips everything', 'two-sided tiles'],
    html: `<div class="d-ripple">${'<i></i>'.repeat(35)}</div>`,
    init(scene) {
      const root = scene.querySelector<HTMLElement>('.d-ripple')!;
      const tiles = [...root.querySelectorAll<HTMLElement>('i')];
      const cols = 7;
      const click = (e: MouseEvent) => {
        const index = tiles.indexOf(e.target as HTMLElement);
        if (index < 0) return;
        const [r0, c0] = [Math.floor(index / cols), index % cols];
        tiles.forEach((tile, i) => {
          const d = Math.hypot(Math.floor(i / cols) - r0, (i % cols) - c0);
          tile.style.setProperty('--d', d.toFixed(2));
        });
        root.toggleAttribute('data-flipped');
      };
      root.addEventListener('click', click);
      return () => root.removeEventListener('click', click);
    },
  },
];
