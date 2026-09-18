import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => fn(i)).join('');
const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const rand = (min: number, max: number): number => min + Math.random() * (max - min);

/** Pointer position over the stage → two custom properties on `target`; CSS eases them. */
function pointerLook(
  root: HTMLElement,
  target: HTMLElement,
  stage: HTMLElement,
  apply: (x: number, y: number) => Record<string, string>,
): () => void {
  const move = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
    const y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
    for (const [k, v] of Object.entries(apply(x, y))) target.style.setProperty(k, v);
    target.classList.add('is-live');
    root.classList.add('is-touched');
  };
  const leave = () => {
    target.classList.remove('is-live');
    for (const k of Object.keys(apply(0, 0))) target.style.removeProperty(k);
  };
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerleave', leave);
  return () => {
    stage.removeEventListener('pointermove', move);
    stage.removeEventListener('pointerleave', leave);
  };
}

// city: 4 × 4 heights (in em) and colours, far corner first
const CITY_H = [3.4, 2.6, 3.0, 1.8, 2.4, 1.2, 2.2, 1.4, 2.8, 1.8, 0.9, 1.6, 1.5, 1.1, 1.3, 0.6];
const CITY_C = ['--accent', '--accent-2', '--hot', '--accent', '--warm', '--accent', '--accent-2', '--hot'];

const SOLAR = [
  { r: 34, t: 5, s: 9, c: '--accent-2', d: -1 },
  { r: 54, t: 9, s: 13, c: '--hot', d: -6 },
  { r: 76, t: 14, s: 11, c: '--accent', d: -3 },
  { r: 98, t: 22, s: 16, c: '--warm', d: -15 },
];

const PINS = [
  { x: 24, y: 34, c: '--hot' },
  { x: 58, y: 66, c: '--warm' },
  { x: 80, y: 28, c: '--accent' },
];

export const demosE: Demo[] = [
  {
    id: 'solar',
    title: 'Solar system',
    description:
      'Orbits are rings on a tilted plane, each spinning at its own speed. Every planet undoes both rotations, so it always faces the camera.',
    category: 'css',
    tags: ['loop', 'space', 'billboard', 'orbit'],
    technique: ['rotateX tilted plane', 'rotateZ orbit per ring', 'counter-rotation = billboarding', 'negative animation-delay'],
    html: `<div class="d-solar"><div class="d-solar__sun"></div>${SOLAR.map(
      (p, i) =>
        `<div class="d-solar__orbit" style="--r:${p.r}px;--t:${p.t}s;--s:${p.s}px;--c:var(${p.c});--d:${p.d}s"><b${i === 3 ? ' class="is-ringed"' : ''}></b></div>`,
    ).join('')}</div>`,
  },
  {
    id: 'city',
    title: 'Isometric city',
    description:
      'Sixteen buildings on a ground plane. Each one is a single element: the roof is lifted by translateZ and two pseudo-element walls hang down from it. The pointer turns the block.',
    category: 'js',
    tags: ['pointer', 'isometric', 'scene', 'building'],
    technique: ['rotateX + rotateZ isometric view', 'roof translateZ, walls on ::before / ::after', 'windows from layered gradients', 'pointer → --rx / --rz'],
    fill: true,
    html: `<div class="d-city"><div class="d-city__world">${rep(
      16,
      (i) => `<i style="--x:${i % 4};--y:${Math.floor(i / 4)};--h:${CITY_H[i]};--c:var(${CITY_C[i % CITY_C.length]})"></i>`,
    )}</div><b>Move your pointer</b></div>`,
    init(scene, stage) {
      const root = scene.querySelector<HTMLElement>('.d-city')!;
      const world = scene.querySelector<HTMLElement>('.d-city__world')!;
      return pointerLook(root, world, stage, (x, y) => ({
        '--rz': `${(-x * 40).toFixed(1)}deg`,
        '--rx': `${(-y * 16).toFixed(1)}deg`,
      }));
    },
  },
  {
    id: 'room',
    title: 'Look around a room',
    description:
      'A box seen from the inside: floor, ceiling and three walls. The pointer rotates it around the camera position, so it feels like turning your head.',
    category: 'js',
    tags: ['pointer', 'scene', 'interior'],
    technique: ['box faces turned inward', 'transform-origin z = perspective', 'walls extended toward the camera', 'pointer → --rx / --ry'],
    fill: true,
    html: `<div class="d-room">
      <div class="d-room__box">
        <div class="d-room__wall d-room__wall--back"><i class="d-room__window"></i><i class="d-room__picture"></i></div>
        <div class="d-room__wall d-room__wall--left"><i class="d-room__poster"></i></div>
        <div class="d-room__wall d-room__wall--right"><i class="d-room__door"></i></div>
        <div class="d-room__wall d-room__wall--floor"><i class="d-room__light"></i><i class="d-room__rug"></i></div>
        <div class="d-room__wall d-room__wall--ceil"><i class="d-room__lamp"></i></div>
      </div>
      <b>Move your pointer</b>
    </div>`,
    init(scene, stage) {
      const root = scene.querySelector<HTMLElement>('.d-room')!;
      const box = scene.querySelector<HTMLElement>('.d-room__box')!;
      return pointerLook(root, box, stage, (x, y) => ({
        '--ry': `${(x * 16).toFixed(1)}deg`,
        '--rx': `${(-y * 10).toFixed(1)}deg`,
      }));
    },
  },
  {
    id: 'ferris',
    title: 'Ferris wheel',
    description:
      'The wheel turns on Z while every cabin turns the other way by the same amount, so the cabins stay upright. Two rims at different depths give it thickness.',
    category: 'css',
    tags: ['loop', 'sass-loop', 'scene', 'wheel'],
    technique: ['rotate → translate → rotate back', 'counter-rotating keyframes', 'transform-origin at the pivot', 'Sass @for for the angles'],
    html: `<div class="d-ferris">
      <div class="d-ferris__base"></div>
      <div class="d-ferris__stand"><s></s><s></s></div>
      <div class="d-ferris__wheel">${rep(4, () => '<i></i>')}${rep(8, () => '<b></b>')}<u></u></div>
    </div>`,
  },
  {
    id: 'island',
    title: 'Floating island',
    description:
      'A small terrain of block columns in an isometric view. Each block is one element: its top is lifted with translateZ and two pseudo-element walls hang from its edges.',
    category: 'css',
    tags: ['loop', 'sass-loop', 'isometric', 'scene', 'voxel'],
    technique: ['one element per block', 'walls: rotateX(-90deg) / rotateY(90deg) from the top edges', 'Sass @for over a height map', 'bobbing + breathing shadow'],
    html: `<div class="d-island">
      <div class="d-island__shadow"></div>
      <div class="d-island__land">${rep(16, () => '<i></i>')}
        <i class="is-rock" style="--x:0.2;--y:0.2;--w:3.6;--h:1.4;--z:0"></i>
        <i class="is-rock" style="--x:0.7;--y:0.7;--w:2.6;--h:1.3;--z:-1.4"></i>
        <i class="is-rock" style="--x:1.3;--y:1.3;--w:1.4;--h:1.1;--z:-2.7"></i>
        <i class="is-trunk" style="--x:1.35;--y:0.35;--w:0.3;--h:0.7;--z:3.7"></i>
        <i class="is-leaf" style="--x:1.1;--y:0.1;--w:0.8;--h:0.8;--z:4.5"></i>
        <i class="is-trunk" style="--x:0.35;--y:2.35;--w:0.3;--h:0.5;--z:1.5"></i>
        <i class="is-leaf" style="--x:0.15;--y:2.15;--w:0.7;--h:0.7;--z:2.2"></i>
      </div>
    </div>`,
  },
  {
    id: 'road',
    title: 'Endless drive',
    description:
      'A road plane laid flat with rotateX(90deg). The centre line slides by exactly one dash period, and posts travel the whole road with staggered delays, so the loop never shows a seam.',
    category: 'css',
    tags: ['loop', 'scene', 'road', 'synthwave'],
    technique: ['rotateX(90deg) floor + perspective-origin = horizon', 'translate by one pattern period', 'upright posts: rotateX(-90deg), origin bottom', 'flat haze overlay instead of a mask'],
    fill: true,
    html: `<div class="d-road">
      <div class="d-road__sun"></div>
      <div class="d-road__ground"></div>
      <div class="d-road__plane"><div class="d-road__dashes"></div>${rep(12, (i) => `<i class="${i % 2 ? 'is-right' : 'is-left'}" style="--i:${Math.floor(i / 2)}"></i>`)}</div>
      <div class="d-road__haze"></div>
    </div>`,
  },
  {
    id: 'snow',
    title: 'Depth snowfall',
    description:
      'JS creates forty flakes once, each with a random depth, speed and drift in custom properties. One CSS animation does the falling; perspective makes near flakes big and fast.',
    category: 'js',
    tags: ['generated', 'loop', 'particles', 'scene', 'weather'],
    technique: ['random --x / --z / --t / --d per flake', 'translate3d keyframes with var()', 'negative delays = already snowing', 'trees at real depths hide far flakes'],
    fill: true,
    html: `<div class="d-snow">
      <div class="d-snow__moon"></div>
      <div class="d-snow__hill"></div>
      <div class="d-snow__world">
        <b style="--x:8%;--z:-240px"></b><b style="--x:66%;--z:-140px"></b><b style="--x:34%;--z:-20px"></b>
      </div>
    </div>`,
    init(scene) {
      const world = scene.querySelector<HTMLElement>('.d-snow__world')!;
      const flakes: HTMLElement[] = [];
      for (let n = 0; n < 40; n++) {
        const flake = document.createElement('i');
        const z = rand(-300, 150);
        const near = (z + 300) / 450; // 0 = far … 1 = near
        const t = (9 - near * 5) * rand(0.85, 1.15);
        flake.style.setProperty('--x', `${rand(-25, 125).toFixed(1)}%`);
        flake.style.setProperty('--z', `${z.toFixed(0)}px`);
        flake.style.setProperty('--s', `${rand(4, 8).toFixed(1)}px`);
        flake.style.setProperty('--o', (0.45 + near * 0.5).toFixed(2));
        flake.style.setProperty('--drift', `${rand(-40, 40).toFixed(0)}px`);
        flake.style.setProperty('--t', `${t.toFixed(2)}s`);
        flake.style.setProperty('--d', `${(-rand(0, t)).toFixed(2)}s`);
        flakes.push(flake);
      }
      world.append(...flakes);
      return () => flakes.forEach((f) => f.remove());
    },
  },
  {
    id: 'pie',
    title: '3D donut chart',
    description:
      'A conic-gradient disc repeated in twelve translateZ layers. Lower layers are darkened, which reads as a solid wall, and a radial mask on each layer cuts the hole.',
    category: 'css',
    tags: ['loop', 'chart', 'data', 'donut'],
    technique: ['conic-gradient segments', 'stacked translateZ layers', 'darkening by --i', 'mask on the leaf layers only'],
    html: `<div class="d-pie">
      <div class="d-pie__tilt"><div class="d-pie__spin">${rep(12, (i) => `<i style="--i:${i}"></i>`)}</div></div>
      <ul class="d-pie__legend"><li>Design 40%</li><li>Build 25%</li><li>Test 20%</li><li>Ship 15%</li></ul>
    </div>`,
  },
  {
    id: 'scatter',
    title: '3D scatter plot',
    description:
      'Points placed with translate3d inside a wireframe box that spins by CSS. Dragging pauses the spin and adds a manual rotation; every point counter-rotates so it stays a round sphere.',
    category: 'js',
    tags: ['pointer', 'drag', 'chart', 'data', 'generated', 'loop', 'billboard'],
    technique: ['translate3d(x, y, z) per point', 'nested rotations: tilt › spin › drag', 'animation-play-state while dragging', 'billboard: static inverse + animated rotate property'],
    fill: true,
    html: `<div class="d-scatter">
      <div class="d-scatter__tilt"><div class="d-scatter__spin"><div class="d-scatter__box">${rep(6, () => '<u></u>')}<s></s><s></s><s></s><b class="is-label" style="--x:84px;--y:70px;--z:-70px">x</b><b class="is-label" style="--x:-70px;--y:-84px;--z:-70px">y</b><b class="is-label" style="--x:-70px;--y:70px;--z:84px">z</b></div></div></div>
      <small>drag to rotate</small>
    </div>`,
    init(scene) {
      const root = scene.querySelector<HTMLElement>('.d-scatter')!;
      const box = scene.querySelector<HTMLElement>('.d-scatter__box')!;
      // three loose clusters: [centre x, y, z, spread, colour token]
      const clusters: [number, number, number, number, string][] = [
        [-28, -26, -18, 46, '--accent'],
        [32, 8, 30, 40, '--accent-2'],
        [-6, 36, -34, 34, '--hot'],
      ];
      const blob = (c: number, spread: number) => clamp(c + (Math.random() + Math.random() + Math.random() - 1.5) * spread, -62, 62);
      const points: HTMLElement[] = [];
      for (let n = 0; n < 42; n++) {
        const [cx, cy, cz, spread, colour] = clusters[n % 3];
        const p = document.createElement('b');
        p.style.setProperty('--x', `${blob(cx, spread).toFixed(0)}px`);
        p.style.setProperty('--y', `${blob(cy, spread).toFixed(0)}px`);
        p.style.setProperty('--z', `${blob(cz, spread).toFixed(0)}px`);
        p.style.setProperty('--c', `var(${colour})`);
        points.push(p);
      }
      box.append(...points);

      let rx = -18;
      let ry = 0;
      let last: { x: number; y: number } | null = null;
      const down = (e: PointerEvent) => {
        last = { x: e.clientX, y: e.clientY };
        root.setPointerCapture(e.pointerId);
        root.classList.add('is-drag', 'is-touched');
      };
      const move = (e: PointerEvent) => {
        if (!last) return;
        ry += (e.clientX - last.x) * 0.5;
        rx = clamp(rx - (e.clientY - last.y) * 0.4, -80, 80);
        last = { x: e.clientX, y: e.clientY };
        root.style.setProperty('--rx', `${rx.toFixed(1)}deg`);
        root.style.setProperty('--ry', `${ry.toFixed(1)}deg`);
      };
      const up = () => {
        last = null;
        root.classList.remove('is-drag');
      };
      root.addEventListener('pointerdown', down);
      root.addEventListener('pointermove', move);
      root.addEventListener('pointerup', up);
      root.addEventListener('pointercancel', up);
      return () => {
        root.removeEventListener('pointerdown', down);
        root.removeEventListener('pointermove', move);
        root.removeEventListener('pointerup', up);
        root.removeEventListener('pointercancel', up);
        points.forEach((p) => p.remove());
      };
    },
  },
  {
    id: 'map',
    title: 'Map pins',
    description:
      'A map drawn with gradients lies on a tilted plane. The pins undo the plane’s rotation around their tip, so they stand up and face you, then bounce in turn above a pulsing ring.',
    category: 'css',
    tags: ['loop', 'map', 'pin', 'billboard', 'scene'],
    technique: ['map from layered gradients', 'pin: inverse rotation, transform-origin bottom', 'ring stays in the ground plane', 'staggered animation-delay'],
    html: `<div class="d-map"><div class="d-map__plane">${PINS.map(
      (p, i) => `<i style="--x:${p.x}%;--y:${p.y}%;--c:var(${p.c});--i:${i}"><b></b></i>`,
    ).join('')}</div></div>`,
  },
];
