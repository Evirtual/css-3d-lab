import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => fn(i)).join('');

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Product & branding showcases: the kind of 3D a landing page uses. */
export const demosB: Demo[] = [
  {
    id: 'phone',
    title: 'Phone mockup',
    description:
      'A phone with real thickness: screen, back, four thin walls and a stack of rounded slabs that fills the corners. It turns to show both sides.',
    category: 'css',
    tags: ['loop', 'product', 'mockup', 'device'],
    technique: ['front / back at ±depth/2', 'walls inset by the corner radius', 'rounded slabs plug the corners', 'alternate keyframes'],
    html: `<div class="d-phone">
      ${rep(9, (i) => `<i class="d-phone__slab" style="--i:${i}"></i>`)}
      <i class="d-phone__wall d-phone__wall--l"></i><i class="d-phone__wall d-phone__wall--r"></i>
      <i class="d-phone__wall d-phone__wall--t"></i><i class="d-phone__wall d-phone__wall--b"></i>
      <div class="d-phone__front"><div class="d-phone__screen">
        <span class="d-phone__notch"></span>
        <strong>9:41</strong><small>Friday 18</small>
        <div class="d-phone__widget"><i></i><i></i><i></i></div>
        <div class="d-phone__dock"><i></i><i></i><i></i></div>
      </div></div>
      <div class="d-phone__back"><i></i><b></b></div>
    </div>`,
  },
  {
    id: 'paycard',
    title: 'Payment card tilt',
    description:
      'The card leans toward your pointer and a glare follows it. JS writes four custom properties; CSS does the tilt, the glare and the return to rest.',
    category: 'js',
    tags: ['pointer', 'product', 'card', 'glare'],
    technique: ['pointer → --rx / --ry / --gx / --gy', 'glare = gradient whose centre follows the pointer', 'chip and text lifted with translateZ', 'slow transition at rest, fast while live'],
    html: `<div class="d-paycard">
      <div class="d-paycard__card">
        <i class="d-paycard__shadow"></i>
        <div class="d-paycard__face"><i class="d-paycard__glare"></i></div>
        <span class="d-paycard__chip"></span>
        <span class="d-paycard__brand"><i></i><i></i></span>
        <span class="d-paycard__num">•••• •••• •••• 4242</span>
        <span class="d-paycard__name">ALEX MORGAN</span>
        <span class="d-paycard__exp">09/29</span>
      </div>
    </div>`,
    init(scene, stage) {
      const card = scene.querySelector<HTMLElement>('.d-paycard__card')!;
      const move = (e: PointerEvent) => {
        const r = stage.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
        const y = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
        card.style.setProperty('--ry', `${(x * 44).toFixed(1)}deg`);
        card.style.setProperty('--rx', `${(-y * 34).toFixed(1)}deg`);
        card.style.setProperty('--gx', (x * 50).toFixed(1));
        card.style.setProperty('--gy', (y * 50).toFixed(1));
        card.classList.add('is-live');
      };
      const leave = () => {
        card.classList.remove('is-live');
        for (const p of ['--rx', '--ry', '--gx', '--gy']) card.style.removeProperty(p);
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
    id: 'package',
    title: 'Unboxing',
    description:
      'Hover or focus: the lid swings open on its back edge and the product card rises out. One hinge (transform-origin) and two staggered transitions.',
    category: 'css',
    tags: ['hover', 'product', 'box', 'packaging'],
    technique: ['lid hinged with transform-origin: bottom', 'open-top box from 4 walls + base', 'transition-delay swaps between open and close', 'static hit area'],
    html: `<div class="d-package" tabindex="0" role="group" aria-label="Product box, hover or focus to open it">
      <div class="d-package__box">
        <i class="d-package__wall d-package__wall--back"></i>
        <i class="d-package__wall d-package__wall--left"></i>
        <i class="d-package__wall d-package__wall--right"></i>
        <i class="d-package__base"></i>
        <div class="d-package__card"><b></b><span>NEW</span></div>
        <i class="d-package__wall d-package__wall--front"><em>CUBE · 01</em></i>
        <i class="d-package__lid"></i>
      </div>
    </div>`,
  },
  {
    id: 'can',
    title: 'Drinks can',
    description:
      'Twenty flat strips form the cylinder. Every strip shows the same wide label, shifted by its own index, so the artwork wraps around without a seam.',
    category: 'css',
    tags: ['loop', 'sass-loop', 'product', 'cylinder', 'label'],
    technique: ['rotateY(i × 18°) translateZ(radius)', 'background-position: i × −strip width', 'per-strip shading via animation-delay', 'discs laid flat with rotateX(90deg)'],
    html: `<div class="d-can"><div class="d-can__spin">${rep(20, () => '<i></i>')}<b class="d-can__top"></b><b class="d-can__bottom"></b></div><span class="d-can__streak"></span></div>`,
  },
  {
    id: 'vinyl',
    title: 'Vinyl sleeve',
    description:
      'The record is sandwiched between the two sides of the sleeve. On hover or focus it slides out, its label starts to spin and the sleeve turns its open end to you.',
    category: 'css',
    tags: ['hover', 'product', 'music', 'album'],
    technique: ['three planes at different translateZ', 'animation-play-state toggled by :hover', 'conic + repeating-radial gradients', 'static hit area'],
    html: `<div class="d-vinyl" tabindex="0" role="group" aria-label="Record sleeve, hover or focus to pull the record out">
      <div class="d-vinyl__set">
        <i class="d-vinyl__back"></i>
        <i class="d-vinyl__spine"></i>
        <div class="d-vinyl__disc"><i class="d-vinyl__label"></i></div>
        <div class="d-vinyl__front"><b>NIGHT<br />DRIVE</b><span>Side A · 33⅓</span></div>
      </div>
    </div>`,
  },
  {
    id: 'logo3d',
    title: 'Extruded logo',
    description:
      'One clip-path shape repeated in 14 layers, 2px apart. The stack reads as a solid block; back layers are darker and the front one carries a sweeping shine.',
    category: 'css',
    tags: ['loop', 'sass-loop', 'product', 'logo', 'brand'],
    technique: ['clip-path polygon with a hole (evenodd)', 'translateZ per layer from --i', 'darkening by depth with calc() alpha', 'shine moved with transform only'],
    html: `<div class="d-logo3d">${rep(14, () => '<i></i>')}</div>`,
  },
  {
    id: 'badge',
    title: 'Award medal',
    description:
      'A medal hanging from a neck ribbon: it sways from the neck and twists on its ring, with a real metal edge and a shine that sweeps each time it faces you.',
    category: 'css',
    tags: ['loop', 'product', 'medal', 'award', 'coin'],
    technique: ['bail looped behind a folded tab', 'pendulum from transform-origin: top', 'edge from stacked discs', 'shine synced to the twist'],
    html: `<div class="d-badge">
      <div class="d-badge__swing">
        <i class="d-badge__strap"></i><i class="d-badge__strap"></i>
        <div class="d-badge__medal">
          <i class="d-badge__bail"></i>
          ${rep(5, (i) => `<u style="--i:${i}"></u>`)}
          <div class="d-badge__face"><b></b><small>WINNER</small><em></em></div>
        </div>
        <i class="d-badge__tab"></i>
      </div>
    </div>`,
  },
  {
    id: 'watch',
    title: 'Smartwatch',
    description:
      'A watch with thickness, strap stubs and the real time. Once a second JS writes three angles and two integers; CSS turns the hands and prints the digits with counters.',
    category: 'js',
    tags: ['loop', 'product', 'device', 'clock', 'time'],
    technique: ['setInterval → --h / --m / --s angles', 'digits via counter-reset: var(--hh)', 'straps hinged on the case edge', 'rounded slabs for thickness'],
    html: `<div class="d-watch">
      <div class="d-watch__body">
        <i class="d-watch__strap d-watch__strap--top"></i><i class="d-watch__strap d-watch__strap--bottom"></i>
        ${rep(7, (i) => `<i class="d-watch__slab" style="--i:${i}"></i>`)}
        <i class="d-watch__crown"></i>
        <div class="d-watch__back"></div>
        <div class="d-watch__face">
          <div class="d-watch__dial"><i class="d-watch__hand d-watch__hand--h"></i><i class="d-watch__hand d-watch__hand--m"></i><i class="d-watch__hand d-watch__hand--s"></i></div>
          <div class="d-watch__time" aria-hidden="true"></div>
          <small>live time</small>
        </div>
      </div>
    </div>`,
    init(scene) {
      const root = scene.querySelector<HTMLElement>('.d-watch')!;
      const tick = () => {
        const d = new Date();
        // Seconds since midnight: angles only ever grow, so a hand never sweeps backwards at 59 → 0.
        const t = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
        root.style.setProperty('--s', `${t * 6}deg`);
        root.style.setProperty('--m', `${(t / 10).toFixed(1)}deg`);
        root.style.setProperty('--h', `${(t / 120).toFixed(2)}deg`);
        root.style.setProperty('--hh', String(d.getHours()));
        root.style.setProperty('--mm', String(d.getMinutes()));
      };
      tick();
      const timer = window.setInterval(tick, 1000);
      return () => window.clearInterval(timer);
    },
  },
  {
    id: 'turntable',
    title: 'Product turntable',
    description:
      'Drag sideways to spin the speaker; let go and it coasts to a stop. JS only tracks one angle and one colour, both handed to CSS as custom properties.',
    category: 'js',
    tags: ['controls', 'pointer', 'product', 'drag', 'viewer'],
    technique: ['pointer capture + drag delta → --ry', 'inertia rAF that stops when slow', 'colour swatches set --c', 'touch-action: pan-y'],
    fill: true,
    html: `<div class="d-turntable">
      <div class="d-turntable__view" tabindex="0" aria-label="Speaker. Drag sideways or use the arrow keys to rotate it">
        <div class="d-turntable__product">
          <i class="d-turntable__f d-turntable__f--front"><b></b><b></b></i>
          <i class="d-turntable__f d-turntable__f--back"></i>
          <i class="d-turntable__f d-turntable__f--left"></i>
          <i class="d-turntable__f d-turntable__f--right"></i>
          <i class="d-turntable__f d-turntable__f--top"></i>
          <i class="d-turntable__f d-turntable__f--bottom"></i>
          <i class="d-turntable__shadow"></i>
        </div>
      </div>
      <div class="d-turntable__bar">
        <button type="button" data-c="var(--accent)" style="--sw:var(--accent)" aria-label="Violet" aria-pressed="true"></button>
        <button type="button" data-c="var(--accent-2)" style="--sw:var(--accent-2)" aria-label="Teal" aria-pressed="false"></button>
        <button type="button" data-c="var(--hot)" style="--sw:var(--hot)" aria-label="Pink" aria-pressed="false"></button>
        <output>drag to rotate</output>
      </div>
    </div>`,
    init(scene) {
      const root = scene.querySelector<HTMLElement>('.d-turntable')!;
      const view = scene.querySelector<HTMLElement>('.d-turntable__view')!;
      const product = scene.querySelector<HTMLElement>('.d-turntable__product')!;
      const bar = scene.querySelector<HTMLElement>('.d-turntable__bar')!;
      const out = scene.querySelector<HTMLOutputElement>('output')!;
      let ry = -32;
      let v = 0;
      let last = 0;
      let raf = 0;
      let dragging = false;
      const apply = () => {
        product.style.setProperty('--ry', `${ry.toFixed(1)}deg`);
        out.textContent = `${Math.round(((ry % 360) + 360) % 360)}°`;
      };
      // Inertia: keep turning by the last velocity, lose 6% per frame, stop the loop when slow.
      const glide = () => {
        v *= 0.94;
        ry += v;
        apply();
        raf = Math.abs(v) > 0.05 ? requestAnimationFrame(glide) : 0;
      };
      const down = (e: PointerEvent) => {
        dragging = true;
        last = e.clientX;
        v = 0;
        cancelAnimationFrame(raf);
        view.setPointerCapture(e.pointerId);
        view.classList.add('is-dragging');
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        v = (e.clientX - last) * 0.6;
        last = e.clientX;
        ry += v;
        apply();
      };
      const up = () => {
        if (!dragging) return;
        dragging = false;
        view.classList.remove('is-dragging');
        if (Math.abs(v) > 0.05) raf = requestAnimationFrame(glide);
      };
      const key = (e: KeyboardEvent) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        v = e.key === 'ArrowLeft' ? -5 : 5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(glide);
      };
      const pick = (e: MouseEvent) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-c]');
        if (!btn) return;
        root.style.setProperty('--c', btn.dataset.c!);
        bar.querySelectorAll('[data-c]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      };
      view.addEventListener('pointerdown', down);
      view.addEventListener('pointermove', move);
      view.addEventListener('pointerup', up);
      view.addEventListener('pointercancel', up);
      view.addEventListener('keydown', key);
      bar.addEventListener('click', pick);
      return () => {
        cancelAnimationFrame(raf);
        view.removeEventListener('pointerdown', down);
        view.removeEventListener('pointermove', move);
        view.removeEventListener('pointerup', up);
        view.removeEventListener('pointercancel', up);
        view.removeEventListener('keydown', key);
        bar.removeEventListener('click', pick);
      };
    },
  },
  {
    id: 'browser',
    title: 'Layered browser',
    description:
      'A UI mockup cut into depth layers: window, sidebar, cards and a floating button each sit at their own translateZ. Hover or focus pulls them further apart.',
    category: 'css',
    tags: ['hover', 'loop', 'product', 'mockup', 'ui', 'isometric'],
    technique: ['rotateX + rotateZ isometric tilt', 'translateZ(calc(var(--z) * 1px))', 'one multiplier changes on :hover', 'static hit area, bobbing child'],
    html: `<div class="d-browser" tabindex="0" role="group" aria-label="Layered browser window, hover or focus to separate the layers">
      <div class="d-browser__win">
        <i class="d-browser__shadow"></i>
        <div class="d-browser__frame"><span></span><span></span><span></span><em></em></div>
        <div class="d-browser__side" style="--z:14"><i></i><i></i><i></i><i></i></div>
        <i class="d-browser__card d-browser__card--hero" style="--z:26"></i>
        <i class="d-browser__card d-browser__card--a" style="--z:40"></i>
        <i class="d-browser__card d-browser__card--b" style="--z:40"></i>
        <b class="d-browser__fab" style="--z:58" aria-hidden="true"></b>
      </div>
    </div>`,
  },
];
