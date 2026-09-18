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

export function interactionOf(d: Pick<Demo, 'id' | 'tags'>): Interaction {
  if (OVERRIDE[d.id]) return OVERRIDE[d.id];
  const t = new Set(d.tags);
  if (t.has('drag')) return 'drag';
  if (t.has('hover')) return 'hover';
  if (t.has('pointer')) return 'move';
  if (t.has('controls') || t.has('form-hack')) return 'click';
  return 'none';
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
  const how = interactionOf(d);
  if (how === 'none') return '';
  const [name, mouse, touch, tip] = LOOK[how];
  return `<span class="card__how card__how--${how}" title="${tip}">${icon(name)}<span class="on-mouse">${mouse}</span><span class="on-touch">${touch}</span></span>`;
}
