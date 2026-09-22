import { icon, type IconName } from '../icons';
import type { Demo } from './types';

/**
 * How a demo is played with, for the badge in the corner of its card. Hover effects need saying
 * most: on a phone there is no hover, so the badge tells touch users to tap instead.
 */
export type Interaction = 'hover' | 'move' | 'drag' | 'click' | 'scroll' | 'none';

// Where the tags alone would guess wrong.
const OVERRIDE: Record<string, Interaction> = {
  drag: 'drag',
  confetti: 'click',
  ripple: 'click',
  scrollspin: 'scroll',
};

/** Every way a demo is played with, most important first (at most two: the badge stays short). */
export function interactionsOf(d: Pick<Demo, 'id' | 'tags'>): Exclude<Interaction, 'none'>[] {
  const only = OVERRIDE[d.id];
  if (only) return only === 'none' ? [] : [only];
  const t = new Set(d.tags);
  const all: Exclude<Interaction, 'none'>[] = [];
  if (t.has('drag')) all.push('drag');
  // following the pointer covers hovering it, and a drag demo is played with the pointer anyway
  if (t.has('pointer')) {
    if (!all.length) all.push('move');
  }
  else if (t.has('hover')) all.push('hover');
  if (t.has('controls') || t.has('form-hack')) all.push('click');
  return all.slice(0, 2);
}

/**
 * A model that IS a small control which opens into something (a menu button, a fold-down menu, a
 * disclosure): at rest it is only the control, at its natural size, and it opens on its
 * interaction. It says so with the tag `'expands'`, never inferred. docs/VIEW-CONTRACT.md, "A
 * control that opens rests small": check-models then judges its resting pose on centring only and
 * requires its OPEN state to reach the 40vmin floor, and the share image (scripts/og-shot.mjs)
 * shows it open. A box, a book or a card is not a control and keeps the resting floor.
 */
export function expands(d: Pick<Demo, 'tags'>): boolean {
  return d.tags.includes('expands');
}

/** The main way (the reels and the checks drive the demo this way). */
export function interactionOf(d: Pick<Demo, 'id' | 'tags'>): Interaction {
  return interactionsOf(d)[0] ?? 'none';
}

// [icon, label with a mouse, label on a touch screen, tooltip]
const LOOK: Record<Exclude<Interaction, 'none'>, [IconName, string, string, string]> = {
  hover: ['hand', 'Hover', 'Tap', 'Hover over it (tap on a touch screen)'],
  move: ['pointer', 'Move pointer', 'Touch & move', 'It follows your pointer (or finger)'],
  drag: ['move', 'Drag', 'Drag', 'Drag it'],
  click: ['click', 'Click', 'Tap', 'Click the controls'],
  scroll: ['mouse', 'Scroll', 'Swipe', 'Scroll inside it'],
};

/** The badge for a card's top-left corner, or '' for demos that simply run on their own. */
export function interactionHtml(d: Pick<Demo, 'id' | 'tags'>): string {
  const ways = interactionsOf(d);
  if (!ways.length) return '';
  const looks = ways.map((w) => LOOK[w]);
  // two ways read "Hover · Click"; on a touch screen both may be "Tap", which is said once
  const mouse = looks.map((l) => l[1]).join(' · ');
  const touch = [...new Set(looks.map((l) => l[2]))].join(' · ');
  const tip = looks.map((l) => l[3]).join('; ');
  return `<span class="card__how card__how--${ways[0]}" title="${tip}">${icon(looks[0][0])}<span class="on-mouse">${mouse}</span><span class="on-touch">${touch}</span></span>`;
}
