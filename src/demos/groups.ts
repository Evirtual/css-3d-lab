/**
 * What a demo is FOR. Categories (Pure CSS / CSS + JS) say how it is built; groups say where
 * you would use it. The same groups will organise the Pro library.
 */
export const GROUPS = {
  shapes: 'Shapes & solids',
  product: 'Products & branding',
  text: 'Text effects',
  controls: 'Buttons & forms',
  cards: 'Cards & galleries',
  loaders: 'Loaders & patterns',
  scenes: 'Scenes & objects',
  data: 'Data & tools',
} as const;

export type Group = keyof typeof GROUPS;

export const GROUP_ORDER = Object.keys(GROUPS) as Group[];

const MEMBERS: Record<Group, string[]> = {
  shapes: ['cube', 'pyramid', 'cylinder', 'coin', 'globe', 'orbit', 'layers', 'explode', 'radio', 'drag', 'dice', 'sphere', 'scrollspin',
    'prism', 'octa', 'diamond', 'torus', 'cone', 'stairs', 'rubik', 'cubegrid', 'net', 'shapeshift'],
  product: ['phone', 'paycard', 'package', 'can', 'vinyl', 'logo3d', 'badge', 'watch', 'turntable', 'browser'],
  text: ['text', 'layertext', 'lit', 'waveletters', 'textring', 'flaptext', 'shadowtext', 'wordcube', 'foldtext', 'crawl', 'anaglyph'],
  controls: ['button', 'rollbutton', 'switch', 'dropdown', 'zones', 'tilt', 'check', 'tabs', 'radial', 'magnet'],
  cards: ['flip', 'carousel', 'coverflow', 'boxslider', 'cardstack', 'cardfan', 'book', 'hovercards', 'flipgrid', 'accordion', 'swipe', 'polaroid', 'cubenav', 'pricing'],
  loaders: ['flipper', 'gyro', 'helix', 'tiles', 'wavegrid', 'ripple', 'cubeloader', 'rings', 'equalizer'],
  scenes: ['grid', 'tunnel', 'starfield', 'parallax', 'door', 'laptop', 'sign', 'fold', 'isotiles', 'confetti', 'solar', 'city', 'room', 'ferris', 'island', 'road', 'snow', 'map'],
  data: ['bars', 'clock', 'playground', 'pie', 'scatter'],
};

const GROUP_OF = new Map<string, Group>();
for (const group of GROUP_ORDER) for (const id of MEMBERS[group]) GROUP_OF.set(id, group);

/** Throws for a demo nobody assigned, so a new demo cannot silently fall outside every group. */
export function groupOf(id: string): Group {
  const group = GROUP_OF.get(id);
  if (!group) throw new Error(`Demo "${id}" has no group — add it to MEMBERS in src/demos/groups.ts`);
  return group;
}

/** Position used to keep each group's demos together, in the order listed above. */
export function groupRank(id: string): number {
  const group = groupOf(id);
  return GROUP_ORDER.indexOf(group) * 1000 + MEMBERS[group].indexOf(id);
}
