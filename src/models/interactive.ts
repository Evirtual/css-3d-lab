import type { Demo } from './types';

/** Demos where JavaScript feeds values in — CSS still does all the rendering. */
export const interactiveDemos: Demo[] = [
  {
    id: 'tilt',
    title: 'Pointer tilt card',
    description: 'JS writes the pointer position into custom properties; CSS turns them into tilt, pop-out and glare.',
    category: 'js',
    tags: ['pointer'],
    technique: ['CSS custom properties set from JS', 'translateZ pop-out layers', 'radial-gradient glare'],
  },
  {
    id: 'drag',
    title: 'Drag-to-rotate cube',
    description: 'Drag to spin it, release to let it coast. JS only tracks two angles and some inertia.',
    category: 'js',
    tags: ['pointer', 'drag'],
    technique: ['Pointer Events + setPointerCapture', 'requestAnimationFrame inertia', 'touch-action: none'],
  },
  {
    id: 'coverflow',
    title: 'Coverflow',
    description: 'JS gives each cover its offset from the active one; CSS calc() does the placement and easing.',
    category: 'js',
    tags: ['controls'],
    technique: ['calc() with per-item custom properties', 'transition', 'keyboard arrows'],
  },
  {
    id: 'playground',
    title: 'Perspective playground',
    description: 'Sliders feed perspective and rotation straight into CSS, with the current values shown live.',
    category: 'js',
    tags: ['controls'],
    technique: ['perspective', 'rotateX / rotateY', 'range inputs → custom properties'],
  },
  {
    id: 'lit',
    title: 'Pointer-lit text',
    description: 'The extrusion is a stack of text-shadows whose direction follows your pointer.',
    category: 'js',
    tags: ['pointer', 'text', 'faux-3d'],
    technique: ['text-shadow with calc(var() × n)', 'works without JS: default direction', 'pointer → custom properties'],
  },
  {
    id: 'sphere',
    title: 'Point sphere',
    description: 'JS places the dots on a Fibonacci sphere once; the spin itself is a plain CSS animation.',
    category: 'js',
    tags: ['generated', 'loop'],
    technique: ['DOM generated from a formula', 'rotateY · rotateX · translateZ per dot', 'CSS keyframe spin'],
  },
  {
    id: 'clock',
    title: 'Flip clock',
    description: 'Real time needs JS. Each pair that changes re-triggers a CSS rotateX flip.',
    category: 'js',
    tags: ['generated', 'wide'],
    technique: ['setInterval for the time', 'animation restart via reflow', 'rotateX flip keyframes'],
  },
];
