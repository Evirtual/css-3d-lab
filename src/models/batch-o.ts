/**
 * Batch O: eight new models, one per group, 2026-10-10. As with batch N, each model has a pair of
 * files of its own, batch-o-<id>.ts (the gallery entry) and snippets-batch-o-<id>.ts (the snippet),
 * so they could be written in parallel with no file in common. Collected here for the gallery and
 * the groups; the snippets are collected in ./snippets-batch-o.ts, which the browser never loads
 * (docs/ADDING-MODELS.md, "Keep snippets out of what the browser loads").
 */
import { demosController } from './batch-o-controller';
import { demosMenger } from './batch-o-menger';
import { demosAquarium } from './batch-o-aquarium';
import { demosTypewriter } from './batch-o-typewriter';
import { demosStickynotes } from './batch-o-stickynotes';
import { demosFlightglobe } from './batch-o-flightglobe';
import { demosHanoi } from './batch-o-hanoi';
import { demosPadlock } from './batch-o-padlock';
import type { Group } from './groups';
import type { Demo } from './types';

export const demosO: Demo[] = [...demosController, ...demosMenger, ...demosAquarium, ...demosTypewriter, ...demosStickynotes, ...demosFlightglobe, ...demosHanoi, ...demosPadlock];
/** Which group each sits in: merged into MEMBERS by src/models/groups.ts, so this batch edits no shared list. */
export const groupsO: Partial<Record<Group, string[]>> = {
  product: ['controller'],
  shapes: ['menger'],
  scenes: ['aquarium'],
  text: ['typewriter'],
  cards: ['stickynotes'],
  data: ['flightglobe'],
  loaders: ['hanoi'],
  controls: ['padlock'],
};
