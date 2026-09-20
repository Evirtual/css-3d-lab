import { icon } from '../icons';
import type { Group } from './groups';
import type { Demo } from './types';

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** The word on the drum. Its length is the number of drum faces, so one turn = one loop. */
const DRUM_TEXT = 'ROLLING·CSS·3D·LAB';

/** Batch O: new demos. Each one also lists its group below. */
export const demosO: Demo[] = [
  {
    id: 'marquee',
    title: 'Drum marquee',
    description:
      'The word is wrapped around a many-sided cylinder. One slow turn rolls every letter past the front, like the drum of an airport sign.',
    category: 'css',
    tags: ['loop', 'text', 'cylinder', 'sign', 'marquee'],
    technique: ['rotateY(i·360°/n) translateZ(r)', 'panel width = 2r·tan(180°/n)', 'backface-visibility hides the far letters', 'static gradient over a turning drum = fixed light'],
    html: `<div class="d-marquee">
      <div class="d-marquee__view">
        <div class="d-marquee__drum" style="--n:${DRUM_TEXT.length}">${[...DRUM_TEXT]
          .map((ch, i) => `<i style="--i:${i}">${ch}</i>`)
          .join('')}<b></b><b></b></div>
      </div>
      <span class="d-marquee__light"></span>
    </div>`,
  },
  {
    id: 'outlinetext',
    title: 'Outline extrusion',
    description:
      'One word copied eight times and pushed apart in Z: the front copy is solid, the ones behind are outlines that fade into the distance. Hover deepens the stack.',
    category: 'css',
    tags: ['loop', 'hover', 'text', 'depth', 'outline'],
    technique: ['translateZ(-i · --spread) per copy', '-webkit-text-stroke for the outlines', 'opacity falls off with the index', 'hover only changes a custom property'],
    html: `<div class="d-outlinetext" tabindex="0" aria-label="The word DEPTH extruded into the screen">
      <div class="d-outlinetext__stack">${Array.from({ length: 8 }, (_, i) => `<span style="--i:${i}">DEPTH</span>`).join('')}</div>
    </div>`,
  },
  {
    id: 'knob',
    title: 'Rotary knob',
    description:
      'A ridged cylinder you grab and turn. JS converts the pointer’s travel around the centre into one angle; CSS spins the knob and lights the ring of ticks up to it.',
    category: 'js',
    tags: ['controls', 'pointer', 'drag', 'ui', 'cylinder'],
    technique: ['rotateZ(a) translateY(-R) rotateX(90deg) builds the rim', 'atan2 delta → --a and --v', 'clamp() lights each tick past the value', 'static gloss plate over a turning knob'],
    fill: true,
    html: `<div class="d-knob">
      <div class="d-knob__view">
        <div class="d-knob__dial" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="62">
          <div class="d-knob__ticks">${Array.from({ length: 11 }, (_, i) => `<i style="--i:${i};--t:${(i / 10).toFixed(2)}"></i>`).join('')}</div>
          <div class="d-knob__body">
            ${Array.from({ length: 24 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}
            <b class="d-knob__back"></b>
            <b class="d-knob__face"><u></u></b>
          </div>
          <span class="d-knob__gloss"></span>
        </div>
      </div>
      <div class="d-knob__bar"><output>62</output><small>drag the knob · arrow keys</small></div>
    </div>`,
    init(scene) {
      const dial = scene.querySelector<HTMLElement>('.d-knob__dial')!;
      const out = scene.querySelector<HTMLOutputElement>('output')!;
      // The knob sweeps 280°: -140° is empty, +140° is full, the dead zone points down.
      const SWEEP = 280;
      let value = 62;
      let last = 0;
      let dragging = false;
      const show = () => {
        dial.style.setProperty('--a', `${(value * (SWEEP / 100) - SWEEP / 2).toFixed(1)}deg`);
        dial.style.setProperty('--v', (value / 100).toFixed(3));
        dial.setAttribute('aria-valuenow', String(Math.round(value)));
        out.textContent = String(Math.round(value));
      };
      const set = (v: number) => {
        value = clamp(v, 0, 100);
        show();
      };
      const angleAt = (e: PointerEvent): number => {
        const r = dial.getBoundingClientRect();
        return (Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180) / Math.PI;
      };
      const down = (e: PointerEvent) => {
        dragging = true;
        last = angleAt(e);
        dial.setPointerCapture(e.pointerId);
        dial.classList.add('is-dragging');
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        // Measure against the previous angle, not the one at pointerdown: after the knob has been
        // held at an end the two would have drifted apart and it would jump when you turn back.
        const a = angleAt(e);
        let d = a - last;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        last = a;
        set(value + d * (100 / SWEEP));
      };
      const up = () => {
        dragging = false;
        dial.classList.remove('is-dragging');
      };
      const key = (e: KeyboardEvent) => {
        const step =
          e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 2 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -2 : e.key === 'PageUp' ? 10 : e.key === 'PageDown' ? -10 : 0;
        if (step) set(value + step);
        else if (e.key === 'Home') set(0);
        else if (e.key === 'End') set(100);
        else return;
        e.preventDefault();
      };
      show();
      dial.addEventListener('pointerdown', down);
      dial.addEventListener('pointermove', move);
      dial.addEventListener('pointerup', up);
      dial.addEventListener('pointercancel', up);
      dial.addEventListener('keydown', key);
      return () => {
        dial.removeEventListener('pointerdown', down);
        dial.removeEventListener('pointermove', move);
        dial.removeEventListener('pointerup', up);
        dial.removeEventListener('pointercancel', up);
        dial.removeEventListener('keydown', key);
      };
    },
  },
  {
    id: 'slider',
    title: 'Sunken slider',
    description:
      'A groove cut into a tilted desk with a chunky handle riding in it. A real range input lies invisibly over the rail, so dragging, tapping and the arrow keys all work.',
    category: 'js',
    tags: ['controls', 'pointer', 'drag', 'ui', 'form'],
    technique: ['four surface plates leave a slot; the floor sits 16px lower', 'rotateX(-90deg) hinges the groove walls', 'scaleX(--v) fills the rail', 'an opacity:0 range input supplies the value'],
    fill: true,
    html: `<div class="d-slider">
      <div class="d-slider__view">
        <input type="range" min="0" max="100" value="64" aria-label="Level" />
        <div class="d-slider__desk">
          <i class="d-slider__plate d-slider__plate--top"></i>
          <i class="d-slider__plate d-slider__plate--bottom"></i>
          <i class="d-slider__plate d-slider__plate--left"></i>
          <i class="d-slider__plate d-slider__plate--right"></i>
          <i class="d-slider__floor"><u></u></i>
          <i class="d-slider__wall d-slider__wall--far"></i>
          <i class="d-slider__wall d-slider__wall--near"></i>
          <i class="d-slider__grip">
            <b class="d-slider__cap"><u></u><u></u><u></u><u></u></b>
          </i>
        </div>
      </div>
      <div class="d-slider__bar"><output>64</output><small>drag the handle · arrow keys</small></div>
    </div>`,
    init(scene) {
      const root = scene.querySelector<HTMLElement>('.d-slider')!;
      const input = scene.querySelector<HTMLInputElement>('input')!;
      const out = scene.querySelector<HTMLOutputElement>('output')!;
      // The input is the only state. JS just republishes it as a 0…1 number for the CSS to draw.
      const show = () => {
        root.style.setProperty('--v', (Number(input.value) / 100).toFixed(3));
        out.textContent = input.value;
      };
      show();
      input.addEventListener('input', show);
      return () => input.removeEventListener('input', show);
    },
  },
  {
    id: 'fab',
    title: 'Fanning action button',
    description:
      'Hover the pad: the round button lifts out of the surface and three actions swing out along an arc, each turning from edge-on to face you.',
    category: 'css',
    tags: ['hover', 'controls', 'ui', 'menu', 'button'],
    technique: ['rotate(a) translateX(r) rotate(-a) keeps a fanned chip upright', 'rotateY turns each chip to face you', 'hover on the static pad, the buttons move', 'reversed transition-delay folds them back in order'],
    html: `<div class="d-fab">
      <div class="d-fab__world">
        <span class="d-fab__shadow"></span>
        <button class="d-fab__main" type="button" aria-label="Actions"><span></span></button>
        <button class="d-fab__act" type="button" style="--a:-150deg;--i:0" aria-label="Share">${icon('share')}</button>
        <button class="d-fab__act" type="button" style="--a:-90deg;--i:1" aria-label="Mail">${icon('mail')}</button>
        <button class="d-fab__act" type="button" style="--a:-30deg;--i:2" aria-label="Copy">${icon('copy')}</button>
      </div>
    </div>`,
  },
];

/** Which group each demo in this batch belongs to (merged into MEMBERS in groups.ts). */
export const groupsO: Partial<Record<Group, string[]>> = {
  text: ['marquee', 'outlinetext'],
  controls: ['knob', 'slider', 'fab'],
};
