import type { Demo } from './types';

/** Charts drawn from JSON. The data lives in chart-data.ts; each snippet prints it in. */
export const demosK: Demo[] = [
  {
    id: 'neonbars',
    title: '3D bar chart from JSON',
    description:
      'Neon bars drawn from a JSON dataset: switch the year and each bar grows or shrinks to its new value, the scale on the back wall follows, and the peak lights up. Hover or tap a bar for its value. JS only turns the data into one number per bar.',
    category: 'js',
    tags: ['controls', 'hover', 'data', 'chart', 'json'],
    technique: ['JSON → --v per bar (value ÷ scale top)', 'scaleY walls + translateY lid, transitioned', 'staggered transition-delay: calc(var(--i) × 60ms)', 'dark faces, bright edge + inset glow: the neon look'],
  },
  {
    id: 'heatmap',
    title: '3D heatmap from JSON',
    description:
      'A week-by-weekday grid of commits where every value is a block: taller and hotter the bigger it is. Hover or tap a block to read it. JSON sets one number per block; CSS turns it into a height and a colour.',
    category: 'js',
    tags: ['hover', 'data', 'chart', 'json', 'isometric'],
    technique: ['JSON → --v per cell (value ÷ max)', 'roof translateZ(--v × 52 units), walls as ::before / ::after', 'colour: color-mix(hot --v%, teal)', 'real <button> per cell, floor ignores the pointer'],
  },
  {
    id: 'chartpanel',
    title: '3D chart panel (SVG)',
    description:
      'A neon line chart drawn as SVG from a JSON array, floating on a tilted glass panel in layers. Hover and it lies flat so you can read the values. The tilt is on the container, so the same works for a chart from any library.',
    category: 'js',
    tags: ['hover', 'data', 'chart', 'json', 'svg'],
    technique: ['JSON → SVG path (M x y L x y …)', 'layers at translateZ 0 / 5 / 10 / 14 units', 'tilt on :hover of a still wrapper → flat', 'glow = a wide faint stroke under the line (no filter)'],
  },
];
