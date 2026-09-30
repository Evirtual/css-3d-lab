/**
 * Batch M: one new model in each of the eight groups, written on 2026-09-30 as a test of the whole
 * pipeline, from a blank file to an approved row on the ledger. Each model has a pair of files of
 * its own, batch-m-<id>.ts (the gallery entry) and snippets-batch-m-<id>.ts (the snippet), so eight
 * could be written at once with no file in common. Collected here for the gallery, the snippet map
 * and the groups.
 */
import { demosGear } from './batch-m-gear';
import { demosSpeaker } from './batch-m-speaker';
import { demosRibbontext } from './batch-m-ribbontext';
import { demosKnob } from './batch-m-knob';
import { demosWallet } from './batch-m-wallet';
import { demosCradle } from './batch-m-cradle';
import { demosTrain } from './batch-m-train';
import { demosDonut } from './batch-m-donut';
import { snippetsGear } from './snippets-batch-m-gear';
import { snippetsSpeaker } from './snippets-batch-m-speaker';
import { snippetsRibbontext } from './snippets-batch-m-ribbontext';
import { snippetsKnob } from './snippets-batch-m-knob';
import { snippetsWallet } from './snippets-batch-m-wallet';
import { snippetsCradle } from './snippets-batch-m-cradle';
import { snippetsTrain } from './snippets-batch-m-train';
import { snippetsDonut } from './snippets-batch-m-donut';
import type { Group } from './groups';
import type { Snippet } from './snippet-utils';
import type { Demo } from './types';

export const demosM: Demo[] = [...demosGear, ...demosSpeaker, ...demosRibbontext, ...demosKnob, ...demosWallet, ...demosCradle, ...demosTrain, ...demosDonut];
export const snippetsM: Record<string, Snippet> = { ...snippetsGear, ...snippetsSpeaker, ...snippetsRibbontext, ...snippetsKnob, ...snippetsWallet, ...snippetsCradle, ...snippetsTrain, ...snippetsDonut };
/** Which group each sits in: merged into MEMBERS by src/models/groups.ts, so this batch edits no shared list. */
export const groupsM: Partial<Record<Group, string[]>> = {
  shapes: ['gear'],
  product: ['speaker'],
  text: ['ribbontext'],
  controls: ['knob'],
  cards: ['wallet'],
  loaders: ['cradle'],
  scenes: ['train'],
  data: ['donut'],
};
