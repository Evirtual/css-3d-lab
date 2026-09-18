import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => fn(i)).join('');

const CUBENAV_SLIDES = ['Dawn', 'Reef', 'Dusk', 'Night'];

/** Batch D: card interactions and loaders. */
export const demosD: Demo[] = [
  {
    id: 'hovercards',
    title: 'Hover card fan',
    description:
      'Three overlapping cards: the one you point at straightens and comes toward you while the others dim and lean away. Static strips catch the pointer, so nothing flickers.',
    category: 'css',
    tags: ['hover', 'cards', 'ui'],
    technique: ['static hit strips + pointer-events: none cards', 'one transform fed by custom properties', ':has() for "siblings before"', 'translateZ per card (never coplanar)'],
    html: `<div class="d-hovercards">${['Design', 'Build', 'Ship']
      .map(
        (t) => `<div class="d-hovercards__slot" tabindex="0" role="group" aria-label="${t} card">
        <div class="d-hovercards__card"><i></i><b>${t}</b><span></span><span></span></div>
      </div>`,
      )
      .join('')}</div>`,
  },
  {
    id: 'flipgrid',
    title: 'Flip tile grid',
    description:
      'Six tiles that lift and flip to show their back. Odd tiles turn sideways, even ones head over heels, from a single custom property holding the rotation.',
    category: 'css',
    tags: ['hover', 'cards', 'grid', 'ui'],
    technique: ['a transform function stored in --flip', 'static tile, flipping inner', 'container pointer-events: none', 'backface-visibility: hidden'],
    html: `<div class="d-flipgrid">${[
      ['tilt', '--accent'],
      ['flip', '--hot'],
      ['spin', '--accent-2'],
      ['lift', '--warm'],
      ['fold', '--accent'],
      ['zoom', '--hot'],
    ]
      .map(
        ([label, token], i) => `<div class="d-flipgrid__tile" tabindex="0" role="group" aria-label="Tile ${i + 1}: ${label}" style="--c:var(${token})">
        <div class="d-flipgrid__inner"><b>0${i + 1}</b><span>${label}</span></div>
      </div>`,
      )
      .join('')}</div>`,
  },
  {
    id: 'accordion',
    title: 'Hinged accordion',
    description:
      'Radio buttons open one section at a time: its panel swings down on its top edge like a flap while the headers below slide out of the way. No height is animated.',
    category: 'css',
    tags: ['form-hack', 'controls', 'cards', 'ui'],
    technique: [':checked ~ sibling selectors', 'rotateX on transform-origin: top', 'translateY instead of height', 'fixed-size frame'],
    html: `<div class="d-accordion">
      ${rep(3, (i) => `<input type="radio" name="acc-{{uid}}" id="acc-{{uid}}-${i}"${i === 0 ? ' checked' : ''} />`)}
      ${[
        ['Perspective', 'The camera distance. Put it on the parent; smaller values look more dramatic.'],
        ['Preserve-3d', 'Without it, children are flattened into the plane of their parent.'],
        ['Backface', 'Hide the reverse side of a face so text never shows mirrored.'],
      ]
        .map(
          ([title, text], i) => `<div class="d-accordion__sec" style="--i:${i}">
        <label for="acc-{{uid}}-${i}">${title}</label>
        <div class="d-accordion__panel">${text}</div>
      </div>`,
        )
        .join('')}
    </div>`,
  },
  {
    id: 'swipe',
    title: 'Swipe deck',
    description:
      'Drag the top card left or right. Past a threshold it flies off and rejoins at the back, and the cards behind move up through real depth. JS only writes numbers; CSS does every motion.',
    category: 'js',
    tags: ['pointer', 'drag', 'cards', 'controls'],
    technique: ['Pointer Events + setPointerCapture', 'stack position --p → translateZ', 'transition: none while dragging', 'class swap for the fly-off'],
    html: `<div class="d-swipe" tabindex="0" role="group" aria-label="Swipe deck. Drag the top card, or use the left and right arrow keys">${[
      ['Cube', 'six faces', 262],
      ['Ring', 'rotate, then translate', 320],
      ['Flap', 'hinged on an edge', 175],
      ['Lens', 'perspective: 800px', 28],
    ]
      .map(([t, s, hue]) => `<i style="--hue:${hue}"><b>LIKE</b><b>NOPE</b><strong>${t}</strong><small>${s}</small></i>`)
      .join('')}</div>`,
    init(scene) {
      const root = scene.querySelector<HTMLElement>('.d-swipe')!;
      let order = [...root.querySelectorAll<HTMLElement>('i')];
      let drag: { id: number; x: number; y: number; scale: number; dx: number } | null = null;
      let busy = false;
      let timer = 0;
      const THRESHOLD = 60;

      const layout = (cards: HTMLElement[]) =>
        cards.forEach((el, p) => {
          el.style.setProperty('--p', String(p));
          el.classList.toggle('is-top', p === 0);
        });
      const pose = (card: HTMLElement, dx: number, dy: number) => {
        card.style.setProperty('--dx', `${dx.toFixed(1)}px`);
        card.style.setProperty('--dy', `${dy.toFixed(1)}px`);
        card.style.setProperty('--rot', `${(dx * 0.08).toFixed(2)}deg`);
        card.style.setProperty('--tilt', `${(dx * 0.12).toFixed(2)}deg`);
        card.style.setProperty('--like', Math.min(1, Math.max(0, dx / THRESHOLD)).toFixed(2));
        card.style.setProperty('--nope', Math.min(1, Math.max(0, -dx / THRESHOLD)).toFixed(2));
      };
      const unpose = (card: HTMLElement) =>
        ['--dx', '--dy', '--rot', '--tilt', '--like', '--nope'].forEach((p) => card.style.removeProperty(p));

      const fling = (dir: number, dy = 0) => {
        if (busy) return;
        busy = true;
        const card = order[0];
        const rest = order.slice(1);
        card.classList.remove('is-top');
        card.classList.add('is-leaving');
        pose(card, dir * 260, dy);
        layout(rest); // the others move up right away
        timer = window.setTimeout(() => {
          // jump to the back invisibly (no transition), then let it fade in there
          card.classList.add('is-back');
          card.classList.remove('is-leaving');
          unpose(card);
          order = [...rest, card];
          layout(order);
          void card.offsetWidth;
          card.classList.remove('is-back');
          busy = false;
        }, 360);
      };

      const down = (e: PointerEvent) => {
        if (busy || drag || e.button > 0) return;
        const card = (e.target as HTMLElement).closest('i');
        if (card !== order[0]) return;
        e.preventDefault();
        root.focus({ preventScroll: true });
        root.setPointerCapture(e.pointerId);
        // screen pixels → CSS pixels (the large stage scales the scene)
        const scale = root.getBoundingClientRect().width / root.offsetWidth || 1;
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, scale, dx: 0 };
        order[0].classList.add('is-dragging');
      };
      const move = (e: PointerEvent) => {
        if (!drag || e.pointerId !== drag.id) return;
        drag.dx = (e.clientX - drag.x) / drag.scale;
        pose(order[0], drag.dx, ((e.clientY - drag.y) / drag.scale) * 0.4);
      };
      const up = (e: PointerEvent) => {
        if (!drag || e.pointerId !== drag.id) return;
        const { dx, scale, y } = drag;
        drag = null;
        const card = order[0];
        card.classList.remove('is-dragging');
        if (e.type === 'pointerup' && Math.abs(dx) > THRESHOLD) {
          fling(Math.sign(dx), ((e.clientY - y) / scale) * 0.4);
        } else {
          unpose(card); // the transition is back on, so it springs home
        }
      };
      const key = (e: KeyboardEvent) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        fling(e.key === 'ArrowLeft' ? -1 : 1);
      };

      layout(order);
      root.addEventListener('pointerdown', down);
      root.addEventListener('pointermove', move);
      root.addEventListener('pointerup', up);
      root.addEventListener('pointercancel', up);
      root.addEventListener('keydown', key);
      return () => {
        window.clearTimeout(timer);
        root.removeEventListener('pointerdown', down);
        root.removeEventListener('pointermove', move);
        root.removeEventListener('pointerup', up);
        root.removeEventListener('pointercancel', up);
        root.removeEventListener('keydown', key);
      };
    },
  },
  {
    id: 'polaroid',
    title: 'Polaroid scatter',
    description:
      'Four photos lying on a tilted table at different angles and heights. Point at one and it rises off the table, straightens and turns to face you, leaving its shadow behind.',
    category: 'css',
    tags: ['hover', 'cards', 'photo', 'gallery'],
    technique: ['tilted plane + counter-rotation on hover', 'translateZ = height above the table', 'static slots as hit targets', 'matching transform lists for clean interpolation'],
    html: `<div class="d-polaroid">${['sunset', 'seaside', 'peaks', 'midnight']
      .map(
        (t) => `<div class="d-polaroid__slot" tabindex="0" role="group" aria-label="Photo: ${t}">
        <div class="d-polaroid__photo"><i></i><small>${t}</small></div>
      </div>`,
      )
      .join('')}</div>`,
  },
  {
    id: 'cubenav',
    title: 'Cube gallery',
    description:
      'A gallery on the four sides of a cube. JS keeps one ever-growing angle, so Prev, Next and the dots always turn the short way round and never unwind.',
    category: 'js',
    tags: ['controls', 'shape', 'cards', 'gallery'],
    technique: ['accumulated --angle (never reset to 0)', 'shortest path: ((target − current + 4) % 4), 3 → −1', 'translateZ(−s/2) keeps the front at z = 0', 'transition on transform'],
    fill: true,
    html: `<div class="d-cubenav">
      <div class="d-cubenav__view"><div class="d-cubenav__cube">${CUBENAV_SLIDES.map(
        (t, i) => `<i style="--hue:${[28, 178, 300, 240][i]}">${t}<small>0${i + 1}</small></i>`,
      ).join('')}<i></i><i></i></div></div>
      <div class="d-cubenav__bar">
        <button type="button" data-dir="-1">Prev</button>
        <span class="d-cubenav__dots">${CUBENAV_SLIDES.map((t, i) => `<button type="button" data-go="${i}" aria-label="Go to ${t}"></button>`).join('')}</span>
        <button type="button" data-dir="1">Next</button>
        <output>1 / 4 · Dawn</output>
      </div>
    </div>`,
    init(scene) {
      const cube = scene.querySelector<HTMLElement>('.d-cubenav__cube')!;
      const bar = scene.querySelector<HTMLElement>('.d-cubenav__bar')!;
      const out = scene.querySelector<HTMLOutputElement>('output')!;
      const dots = [...scene.querySelectorAll<HTMLElement>('[data-go]')];
      const n = CUBENAV_SLIDES.length;
      let index = 0; // unbounded: …, -1, 0, 1, 2, … 7, 8, …
      const render = () => {
        const current = ((index % n) + n) % n;
        // face k sits at +90° × k around the cube, so showing it means turning by −90° × k
        cube.style.setProperty('--angle', `${index * -90}deg`);
        out.textContent = `${current + 1} / ${n} · ${CUBENAV_SLIDES[current]}`;
        dots.forEach((d, i) => d.setAttribute('aria-current', String(i === current)));
      };
      const click = (e: MouseEvent) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('button');
        if (!btn) return;
        if (btn.dataset.dir) {
          index += Number(btn.dataset.dir);
        } else if (btn.dataset.go) {
          const current = ((index % n) + n) % n;
          let delta = (Number(btn.dataset.go) - current + n) % n; // 0…3 steps forward
          if (delta > n / 2) delta -= n; // 3 forward is really 1 back
          index += delta;
        }
        render();
      };
      render();
      bar.addEventListener('click', click);
      return () => bar.removeEventListener('click', click);
    },
  },
  {
    id: 'pricing',
    title: 'Pricing arc',
    description:
      'Three pricing cards standing in an arc: the outer two turn to face the centre, the featured one stands in front. The one you point at squares up and steps forward.',
    category: 'css',
    tags: ['hover', 'cards', 'ui', 'product'],
    technique: ['rotateY toward the centre', 'translateZ for emphasis instead of scale', 'static columns as hit targets', 'variables drive one transform'],
    html: `<div class="d-pricing">${[
      ['Solo', '9', 'Start'],
      ['Team', '29', 'Popular'],
      ['Org', '99', 'Talk'],
    ]
      .map(
        ([name, price, cta]) => `<div class="d-pricing__slot" tabindex="0" role="group" aria-label="${name} plan, ${price} dollars">
        <div class="d-pricing__card"><small>${name}</small><b><sup>$</sup>${price}</b><span></span><span></span><span></span><em>${cta}</em></div>
      </div>`,
      )
      .join('')}</div>`,
  },
  {
    id: 'cubeloader',
    title: 'Folding-square loader',
    description:
      'The classic fold loader laid on a floor in real perspective: each quadrant swings up over one edge, rests, then folds away over the next, a quarter-beat after its neighbour.',
    category: 'css',
    tags: ['loop', 'loader', 'spinner'],
    technique: ['one quadrant rotated 4× with --i', 'transform-origin on the shared corner', 'negative animation-delay chase', 'invisible at both ends = seamless'],
    html: `<div class="d-cubeloader" role="img" aria-label="Loading">${['--accent', '--hot', '--accent-2', '--warm']
      .map((c, i) => `<i style="--i:${i};--c:var(${c})"></i>`)
      .join('')}</div>`,
  },
  {
    id: 'rings',
    title: 'Chasing rings loader',
    description:
      'Three rings of paired arcs, each tumbling around a different axis while its arcs chase each other around the ring, circling a breathing core.',
    category: 'css',
    tags: ['loop', 'loader', 'spinner'],
    technique: ['transparent border + two coloured sides = arcs', 'rotateZ(tilt) rotateX(tumble) rotateZ(spin)', 'var() inside @keyframes', 'whole turns only = seamless'],
    html: `<div class="d-rings" role="img" aria-label="Loading"><b></b><i></i><i></i><i></i></div>`,
  },
  {
    id: 'equalizer',
    title: '3D equalizer',
    description:
      'Seven real cuboids bouncing like an audio meter. Walls are squashed with scaleY and each lid rides down by the same amount, so nothing but transforms ever changes.',
    category: 'css',
    tags: ['loop', 'loader', 'sass-loop', 'music', 'chart'],
    technique: ['scaleY walls + translateY lid (no layout)', 'shared keyframe stops keep lid and walls glued', 'Sass @each builds the keyframes from one map', 'per-bar delay and duration'],
    html: `<div class="d-equalizer" role="img" aria-label="Equalizer animation">${[70, 96, 118, 88, 108, 80, 60]
      .map((h) => `<div class="d-equalizer__bar" style="--hn:${h}"><i></i><i></i><i></i></div>`)
      .join('')}</div>`,
  },
];
