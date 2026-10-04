/**
 * Batch N: two new models in each of the eight groups, and two asked for by name (digital rain and
 * bullet time), 2026-10-04. As with batch M, each model has a
 * pair of files of its own, batch-n-<id>.ts (the gallery entry) and snippets-batch-n-<id>.ts (the
 * snippet), so they could be written in parallel with no file in common. Collected here for the
 * gallery and the groups; the snippets are collected in ./snippets-batch-n.ts, which the browser
 * never loads (docs/ADDING-MODELS.md, "Keep snippets out of what the browser loads").
 */
import { demosMobius } from './batch-n-mobius';
import { demosSpring } from './batch-n-spring';
import { demosLipstick } from './batch-n-lipstick';
import { demosFoldphone } from './batch-n-foldphone';
import { demosNeonsign } from './batch-n-neonsign';
import { demosStamptext } from './batch-n-stamptext';
import { demosSlider3d } from './batch-n-slider3d';
import { demosLever } from './batch-n-lever';
import { demosTicket } from './batch-n-ticket';
import { demosEnvelope } from './batch-n-envelope';
import { demosPendulumwave } from './batch-n-pendulumwave';
import { demosBounceball } from './batch-n-bounceball';
import { demosCampfire } from './batch-n-campfire';
import { demosHotair } from './batch-n-hotair';
import { demosPoppyramid } from './batch-n-poppyramid';
import { demosBubbles } from './batch-n-bubbles';
import { demosCoderain } from './batch-n-coderain';
import { demosBullettime } from './batch-n-bullettime';
import type { Group } from './groups';
import type { Demo } from './types';

export const demosN: Demo[] = [...demosMobius, ...demosSpring, ...demosLipstick, ...demosFoldphone, ...demosNeonsign, ...demosStamptext, ...demosSlider3d, ...demosLever, ...demosTicket, ...demosEnvelope, ...demosPendulumwave, ...demosBounceball, ...demosCampfire, ...demosHotair, ...demosPoppyramid, ...demosBubbles, ...demosCoderain, ...demosBullettime];
/** Which group each sits in: merged into MEMBERS by src/models/groups.ts, so this batch edits no shared list. */
export const groupsN: Partial<Record<Group, string[]>> = {
  shapes: ['mobius', 'spring'],
  product: ['lipstick', 'foldphone'],
  text: ['neonsign', 'stamptext', 'coderain'],
  controls: ['slider3d', 'lever'],
  cards: ['ticket', 'envelope'],
  loaders: ['pendulumwave', 'bounceball'],
  scenes: ['campfire', 'hotair', 'bullettime'],
  data: ['poppyramid', 'bubbles'],
};
