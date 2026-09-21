import { icon } from '../icons';
import type { Demo } from './types';

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Pointer position inside `el`, normalised to -0.5 … 0.5 on both axes. */
const pointerIn = (e: PointerEvent, el: HTMLElement): { x: number; y: number } => {
  const r = el.getBoundingClientRect();
  return {
    x: clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5),
    y: clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5),
  };
};

/** Demos where JavaScript feeds values in — CSS still does all the rendering. */
export const interactiveDemos: Demo[] = [
  {
    id: 'tilt',
    title: 'Pointer tilt card',
    description: 'JS writes the pointer position into custom properties; CSS turns them into tilt, pop-out and glare.',
    category: 'js',
    tags: ['pointer'],
    technique: ['CSS custom properties set from JS', 'translateZ pop-out layers', 'radial-gradient glare'],
    fill: true,
    html: `<div class="d-tilt"><div class="d-tilt__card"><span class="d-tilt__chip"></span><b>Move your pointer</b><small>tilt · depth · glare</small></div></div>`,
    init(scene, stage) {
      const card = scene.querySelector<HTMLElement>('.d-tilt__card')!;
      const move = (e: PointerEvent) => {
        const { x, y } = pointerIn(e, stage);
        card.style.setProperty('--ry', `${x * 40}deg`);
        card.style.setProperty('--rx', `${-y * 40}deg`);
        card.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
        card.style.setProperty('--my', `${(y + 0.5) * 100}%`);
        card.classList.add('is-live');
      };
      const leave = () => {
        card.classList.remove('is-live');
        for (const p of ['--rx', '--ry']) card.style.removeProperty(p);
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
    id: 'drag',
    title: 'Drag-to-rotate cube',
    description: 'Drag to spin it, release to let it coast. JS only tracks two angles and some inertia.',
    category: 'js',
    tags: ['pointer'],
    technique: ['Pointer Events + setPointerCapture', 'requestAnimationFrame inertia', 'touch-action: none'],
    fill: true,
    html: `<div class="d-drag"><div class="d-drag__cube">${'<i></i>'.repeat(6)}</div><small>drag me</small></div>`,
    init(scene, stage) {
      const cube = scene.querySelector<HTMLElement>('.d-drag__cube')!;
      let rx = -24;
      let ry = 32;
      let vx = 0;
      let vy = 0;
      let dragging = false;
      let raf = 0;
      const apply = () => {
        cube.style.setProperty('--rx', `${rx}deg`);
        cube.style.setProperty('--ry', `${ry}deg`);
      };
      const coast = () => {
        if (dragging) return;
        vx *= 0.95;
        vy *= 0.95;
        rx = clamp(rx + vx, -89, 89);
        ry += vy;
        apply();
        if (Math.abs(vx) + Math.abs(vy) > 0.05) raf = requestAnimationFrame(coast);
      };
      const down = (e: PointerEvent) => {
        dragging = true;
        cancelAnimationFrame(raf);
        stage.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        vy = e.movementX * 0.6;
        vx = -e.movementY * 0.6;
        rx = clamp(rx + vx, -89, 89);
        ry += vy;
        apply();
      };
      const up = () => {
        if (!dragging) return;
        dragging = false;
        raf = requestAnimationFrame(coast);
      };
      apply();
      stage.style.touchAction = 'none';
      stage.addEventListener('pointerdown', down);
      stage.addEventListener('pointermove', move);
      stage.addEventListener('pointerup', up);
      stage.addEventListener('pointercancel', up);
      return () => {
        cancelAnimationFrame(raf);
        stage.style.touchAction = '';
        stage.removeEventListener('pointerdown', down);
        stage.removeEventListener('pointermove', move);
        stage.removeEventListener('pointerup', up);
        stage.removeEventListener('pointercancel', up);
      };
    },
  },
  {
    id: 'coverflow',
    title: 'Coverflow',
    description: 'JS gives each cover its offset from the active one; CSS calc() does the placement and easing.',
    category: 'js',
    tags: ['controls'],
    technique: ['calc() with per-item custom properties', 'transition', 'keyboard arrows'],
    fill: true,
    html: `<div class="d-coverflow" tabindex="0" aria-label="Coverflow, use arrow keys">
      <div class="d-coverflow__track">${Array.from({ length: 7 }, (_, i) => `<i style="--hue:${250 + i * 22}">${i + 1}</i>`).join('')}</div>
      <div class="d-coverflow__nav"><button type="button" data-dir="-1" aria-label="Previous">${icon('chevron-left')}</button><button type="button" data-dir="1" aria-label="Next">${icon('chevron-right')}</button></div>
    </div>`,
    init(scene) {
      const root = scene.querySelector<HTMLElement>('.d-coverflow')!;
      const items = [...root.querySelectorAll<HTMLElement>('.d-coverflow__track i')];
      let active = 3;
      const layout = () => {
        items.forEach((el, i) => {
          const o = i - active;
          el.style.setProperty('--o', String(o));
          el.style.setProperty('--abs', String(Math.abs(o)));
          el.style.setProperty('--sign', String(Math.sign(o)));
          el.style.zIndex = String(items.length - Math.abs(o));
        });
      };
      const go = (dir: number) => {
        active = clamp(active + dir, 0, items.length - 1);
        layout();
      };
      const click = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest<HTMLElement>('[data-dir]');
        if (btn) return go(Number(btn.dataset.dir));
        const idx = items.indexOf(target);
        if (idx >= 0) go(idx - active);
      };
      const key = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') go(-1);
        else if (e.key === 'ArrowRight') go(1);
        else return;
        e.preventDefault();
      };
      layout();
      root.addEventListener('click', click);
      root.addEventListener('keydown', key);
      return () => {
        root.removeEventListener('click', click);
        root.removeEventListener('keydown', key);
      };
    },
  },
  {
    id: 'playground',
    title: 'Perspective playground',
    description: 'Sliders feed perspective and rotation straight into CSS, with the resulting declaration shown live.',
    category: 'js',
    tags: ['controls'],
    technique: ['perspective', 'rotateX / rotateY', 'range inputs → custom properties'],
    fill: true,
    html: `<div class="d-play">
      <div class="d-play__view"><div class="d-play__box">3D</div></div>
      <div class="d-play__controls">
        <label>perspective<input type="range" data-var="p" data-unit="px" min="120" max="1200" value="400" /></label>
        <label>rotateX<input type="range" data-var="rx" data-unit="deg" min="-80" max="80" value="20" /></label>
        <label>rotateY<input type="range" data-var="ry" data-unit="deg" min="-80" max="80" value="-35" /></label>
      </div>
      <code class="d-play__out"></code>
    </div>`,
    init(scene) {
      const root = scene.querySelector<HTMLElement>('.d-play')!;
      const out = root.querySelector<HTMLElement>('.d-play__out')!;
      const inputs = [...root.querySelectorAll<HTMLInputElement>('input[type=range]')];
      const update = () => {
        const v: Record<string, string> = {};
        for (const input of inputs) {
          v[input.dataset.var!] = `${input.value}${input.dataset.unit}`;
          root.style.setProperty(`--${input.dataset.var}`, v[input.dataset.var!]);
        }
        out.textContent = `perspective: ${v.p}; transform: rotateX(${v.rx}) rotateY(${v.ry});`;
      };
      update();
      root.addEventListener('input', update);
      return () => root.removeEventListener('input', update);
    },
  },
  {
    id: 'lit',
    title: 'Pointer-lit text',
    description: 'The extrusion is a Sass-generated shadow stack whose direction follows your pointer.',
    category: 'js',
    tags: ['pointer', 'text', 'faux-3d', 'sass-loop'],
    technique: ['text-shadow with calc(var() × n)', 'Sass @function', 'pointer → custom properties'],
    fill: true,
    html: `<div class="d-lit"><span>SHADOW</span></div>`,
    init(scene, stage) {
      const el = scene.querySelector<HTMLElement>('.d-lit')!;
      const move = (e: PointerEvent) => {
        const { x, y } = pointerIn(e, stage);
        // The shadow falls away from the pointer, as if the pointer were the light.
        el.style.setProperty('--dx', (-x * 2).toFixed(3));
        el.style.setProperty('--dy', (-y * 2).toFixed(3));
      };
      stage.addEventListener('pointermove', move);
      return () => stage.removeEventListener('pointermove', move);
    },
  },
  {
    id: 'sphere',
    title: 'Point sphere',
    description: 'JS places the dots on a Fibonacci sphere once; the spin itself is a plain CSS animation.',
    category: 'js',
    tags: ['generated', 'loop'],
    technique: ['DOM generated from a formula', 'rotateY · rotateX · translateZ per dot', 'CSS keyframe spin'],
    fill: true,
    html: `<div class="d-sphere">
      <div class="d-sphere__view"><div class="d-sphere__ball"></div></div>
      <label>dots <output>100</output><input type="range" min="20" max="200" step="10" value="100" /></label>
    </div>`,
    init(scene) {
      const ball = scene.querySelector<HTMLElement>('.d-sphere__ball')!;
      const input = scene.querySelector<HTMLInputElement>('input')!;
      const output = scene.querySelector<HTMLOutputElement>('output')!;
      const golden = Math.PI * (3 - Math.sqrt(5));
      const build = () => {
        const n = Number(input.value);
        output.textContent = String(n);
        const frag = document.createDocumentFragment();
        for (let i = 0; i < n; i++) {
          const lat = Math.asin(1 - (i / (n - 1)) * 2);
          const dot = document.createElement('i');
          dot.style.transform = `rotateY(${(i * golden).toFixed(4)}rad) rotateX(${lat.toFixed(4)}rad) translateZ(var(--r))`;
          frag.append(dot);
        }
        ball.replaceChildren(frag);
      };
      build();
      input.addEventListener('input', build);
      return () => input.removeEventListener('input', build);
    },
  },
  {
    id: 'clock',
    title: 'Flip clock',
    description: 'Real time needs JS. Each pair that changes re-triggers a CSS rotateX flip.',
    category: 'js',
    tags: ['generated'],
    technique: ['setInterval for the time', 'animation restart via reflow', 'rotateX flip keyframes'],
    html: `<div class="d-clock" role="timer" aria-label="Current time"><span></span><em>:</em><span></span><em>:</em><span></span></div>`,
    init(scene) {
      const parts = [...scene.querySelectorAll<HTMLElement>('.d-clock span')];
      const tick = () => {
        const d = new Date();
        [d.getHours(), d.getMinutes(), d.getSeconds()].forEach((n, i) => {
          const text = String(n).padStart(2, '0');
          const el = parts[i];
          if (el.textContent === text) return;
          const first = el.textContent === '';
          el.textContent = text;
          if (first) return;
          el.classList.remove('is-flipping');
          void el.offsetWidth; // force reflow so the animation restarts
          el.classList.add('is-flipping');
        });
      };
      tick();
      const timer = window.setInterval(tick, 250);
      return () => window.clearInterval(timer);
    },
  },
];
