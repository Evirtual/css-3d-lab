import type { Demo } from './types';

const rep = (n: number, fn: (i: number) => string): string =>
  Array.from({ length: n }, (_, i) => fn(i)).join('');
const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/**
 * Side n of a round object with `sides` sides: its angle (--a) and how much shade it gets (--d:
 * 0.02 on the side facing the light, front-left, up to 0.5 round the back). Lighting is baked
 * into the model, so it turns with it.
 */
const side = (n: number, sides: number): string => {
  const a = (360 / sides) * n;
  const d = 0.26 - 0.24 * Math.cos(((a + 35) * Math.PI) / 180);
  return `--a:${+a.toFixed(2)}deg;--d:${d.toFixed(2)}`;
};

// gauge: [label, value 0–100]
const LEVELS: [string, number][] = [
  ['Low', 22],
  ['Mid', 58],
  ['High', 94],
];
const GAUGE_START = 0;

// timeline: [year, event]; cards alternate left (-1) and right (1) of the road
const EVENTS: [string, string][] = [
  ['2016', 'First sketch'],
  ['2019', 'Launch'],
  ['2021', 'Version 2'],
  ['2023', 'Going global'],
  ['2026', 'Today'],
];

export const demosJ: Demo[] = [
  {
    id: 'windmill',
    title: 'Windmill',
    description:
      'A tapered tower of four leaning trapezoids with a pyramid cap, on a grass block. The sails turn with one rotateZ loop while the whole model turns slowly, so the depth reads.',
    category: 'css',
    tags: ['loop', 'sass-loop', 'scene', 'building'],
    technique: ['frustum: rotateY → translateZ → rotateX(lean)', 'clip-path trapezoids and triangles', 'rotateZ sails on a hub in front of the cap', 'one model spun with rotateY'],
    html: `<div class="d-windmill"><div class="d-windmill__spin">
      <div class="d-windmill__hill">${rep(5, () => '<i></i>')}</div>
      <div class="d-windmill__tree" style="--x:-50px;--z:-44px;--k:1"><i></i><i></i></div>
      <div class="d-windmill__tree" style="--x:52px;--z:34px;--k:0.8"><i></i><i></i></div>
      <div class="d-windmill__tower">${rep(4, () => '<i></i>')}</div>
      <div class="d-windmill__cap">${rep(4, () => '<i></i>')}</div>
      <div class="d-windmill__rotor"><div class="d-windmill__sails">${rep(4, () => '<b></b>')}<u></u></div></div>
    </div></div>`,
  },
  {
    id: 'rocket',
    title: 'Rocket launch',
    description:
      'A rocket built from strips and leaning triangles lifts off its pad, leaves the stage and comes back down from the top to land, so the loop has no seam. Flame and smoke are gradient layers that only scale and fade.',
    category: 'css',
    tags: ['loop', 'scene', 'space', 'cylinder'],
    technique: ['cylinder of 10 strips + cone of 10 triangles', 'translateY in % of a full-stage layer', 'flame: crossed planes, scale-only flicker', 'one timeline shared by flight, flame and smoke'],
    fill: true,
    html: `<div class="d-rocket">
      <div class="d-rocket__base">
        <div class="d-rocket__pad"></div><div class="d-rocket__glow"></div>
        <div class="d-rocket__tower"><i></i><i></i></div><div class="d-rocket__arm"></div>
        ${[-1, -0.55, -0.2, 0.25, 0.6, 1].map((x, i) => `<em style="--x:${x};--z:${[8, -10, 14, -6, 12, -12][i]}px;--s:${[1, 0.8, 1.1, 0.9, 1.2, 0.85][i]}"></em>`).join('')}
      </div>
      <div class="d-rocket__flight"><div class="d-rocket__craft"><div class="d-rocket__ship">
        ${rep(10, (n) => `<i style="${side(n, 10)}"></i>`)}
        ${rep(10, (n) => `<b style="${side(n, 10)}"></b>`)}
        ${[90, 210, 330].map((a) => `<s style="--a:${a}deg"></s>`).join('')}
        <u></u><u></u><span class="d-rocket__window"></span>
        <div class="d-rocket__flame"><i></i><i></i></div>
      </div></div></div>
    </div>`,
  },
  {
    id: 'lighthouse',
    title: 'Lighthouse',
    description:
      'A striped tower of leaning strips on a rock in a night sea. Two long translucent planes, crossed, make each light beam; they sweep round with rotateY while a lit wedge on the water turns with them.',
    category: 'css',
    tags: ['loop', 'scene', 'building', 'night'],
    technique: ['frustums of leaning strips', 'beam: two crossed clip-path planes, rotateY', 'sea: flat disc, wave lines slid by one period', 'rotateZ(-a) on the floor = rotateY(a) above it'],
    html: `<div class="d-lighthouse">
      <div class="d-lighthouse__layer"><div class="d-lighthouse__model"><div class="d-lighthouse__sea"><i></i><i></i><u></u></div></div></div>
      <div class="d-lighthouse__layer"><div class="d-lighthouse__model">
        <div class="d-lighthouse__rock">${rep(8, (n) => `<i style="${side(n, 8)}"></i>`)}<b></b></div>
      </div></div>
      <div class="d-lighthouse__layer"><div class="d-lighthouse__model">
      <div class="d-lighthouse__tower">${rep(10, (n) => `<i style="${side(n, 10)}"></i>`)}</div>
      <div class="d-lighthouse__gallery"></div><div class="d-lighthouse__rail"></div>
      <div class="d-lighthouse__room">${rep(6, (n) => `<i style="--a:${n * 60}deg"></i>`)}<b></b></div>
      <div class="d-lighthouse__roof">${rep(6, (n) => `<i style="${side(n, 6)}"></i>`)}<b></b></div>
      <div class="d-lighthouse__beam">${rep(4, () => '<i></i>')}</div>
    </div></div>
    </div>`,
  },
  {
    id: 'gauge',
    title: '3D gauge',
    description:
      'A speedometer dial tilted in perspective, with raised ticks and a needle stacked from four layers. The buttons only set --value; CSS turns it into an angle and an overshooting transition swings the needle there.',
    category: 'js',
    tags: ['controls', 'data', 'chart', 'dial'],
    technique: ['--value → rotate(calc(-120deg + v × 2.4deg))', 'overshoot cubic-bezier transition', 'needle: 4 translateZ layers', 'minor ticks: repeating-conic-gradient + mask'],
    fill: true,
    html: `<div class="d-gauge">
      <div class="d-gauge__view"><div class="d-gauge__dial" style="--value:${LEVELS[GAUGE_START][1]}">
        ${rep(6, () => '<i></i>')}
        <div class="d-gauge__face">
          ${rep(11, (n) => `<b style="--a:${-120 + n * 24}deg"></b>`)}
          ${rep(6, (n) => `<em style="--a:${-120 + n * 48}deg">${n * 20}</em>`)}
          <small>km/h</small>
        </div>
        <div class="d-gauge__needle"><div class="d-gauge__quiver">${rep(4, () => '<i></i>')}</div></div>
        <div class="d-gauge__hub"></div>
        <div class="d-gauge__glass"></div>
      </div></div>
      <div class="d-gauge__bar">
        <output>${LEVELS[GAUGE_START][0]} · ${LEVELS[GAUGE_START][1]} km/h</output>
        <div class="d-gauge__seg">${LEVELS.map(
          ([label, v], i) => `<button type="button" data-value="${v}" aria-pressed="${i === GAUGE_START}">${label}</button>`,
        ).join('')}</div>
      </div>
    </div>`,
    init(scene) {
      const dial = scene.querySelector<HTMLElement>('.d-gauge__dial')!;
      const out = scene.querySelector<HTMLOutputElement>('.d-gauge__bar output')!;
      const seg = scene.querySelector<HTMLElement>('.d-gauge__seg')!;
      const buttons = [...seg.querySelectorAll<HTMLButtonElement>('button')];
      // JS only writes the number; the angle and the swing are CSS
      const pick = (e: Event) => {
        const btn = (e.target as HTMLElement).closest('button');
        if (!btn) return;
        const value = Number(btn.dataset.value);
        dial.style.setProperty('--value', String(value));
        out.textContent = `${btn.textContent} · ${value} km/h`;
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      };
      seg.addEventListener('click', pick);
      return () => seg.removeEventListener('click', pick);
    },
  },
  {
    id: 'timeline',
    title: '3D timeline',
    description:
      'Five event cards stand beside a road, each a step further back in Z. Prev / Next only change one number, --a; the whole track slides toward you by that many steps, so the active card comes to the front.',
    category: 'js',
    tags: ['controls', 'data', 'timeline', 'scene'],
    technique: ['translateZ(--i × -step) per card', 'track translateZ(--a × step) = camera move', 'opacity from --i − --a with clamp()', 'passed cards held back and faded'],
    fill: true,
    html: `<div class="d-timeline">
      <div class="d-timeline__view" style="--a:0">
        <div class="d-timeline__road"><div class="d-timeline__lane">${rep(EVENTS.length, (i) => `<u style="--i:${i}"></u>`)}</div></div>
        <div class="d-timeline__track">
        ${EVENTS.map(
          ([year, text], i) =>
            `<div class="d-timeline__card" style="--i:${i};--s:${i % 2 ? 1 : -1}" aria-current="${i === 0}"><b>${year}</b><span>${text}</span></div>`,
        ).join('')}
      </div></div>
      <div class="d-timeline__bar">
        <output>${EVENTS[0][0]} · ${EVENTS[0][1]}</output>
        <div class="d-timeline__nav">
          <button type="button" data-step="-1" disabled>‹ Prev</button>
          <button type="button" data-step="1">Next ›</button>
        </div>
      </div>
    </div>`,
    init(scene) {
      const view = scene.querySelector<HTMLElement>('.d-timeline__view')!;
      const cards = [...scene.querySelectorAll<HTMLElement>('.d-timeline__card')];
      const out = scene.querySelector<HTMLOutputElement>('.d-timeline__bar output')!;
      const nav = scene.querySelector<HTMLElement>('.d-timeline__nav')!;
      const [prev, next] = [...nav.querySelectorAll<HTMLButtonElement>('button')];
      let active = 0;
      const go = (e: Event) => {
        const btn = (e.target as HTMLElement).closest('button');
        if (!btn) return;
        active = clamp(active + Number(btn.dataset.step), 0, EVENTS.length - 1);
        // one number moves the camera; CSS derives every card's depth and fade from it
        view.style.setProperty('--a', String(active));
        cards.forEach((c, i) => c.setAttribute('aria-current', String(i === active)));
        out.textContent = `${EVENTS[active][0]} · ${EVENTS[active][1]}`;
        prev.disabled = active === 0;
        next.disabled = active === EVENTS.length - 1;
        // a button that just got disabled drops keyboard focus: hand it to the other one
        if (btn.disabled) (btn === prev ? next : prev).focus();
      };
      nav.addEventListener('click', go);
      return () => nav.removeEventListener('click', go);
    },
  },
];
