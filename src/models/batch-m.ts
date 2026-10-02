/**
 * Batch M: one new model in each of the eight groups, written on 2026-09-30 as a test of the whole
 * pipeline, from a blank file to an approved row on the ledger. Each model has a pair of files of
 * its own, batch-m-<id>.ts (the gallery entry) and snippets-batch-m-<id>.ts (the snippet), so eight
 * could be written at once with no file in common. Collected here for the gallery and the groups;
 * the snippets are collected in ./snippets-batch-m.ts, which the browser never loads (building the
 * snippet map here kept all eight snippets in the gallery's shared chunk, measured 2026-10-02).
 */
import { demosGear } from './batch-m-gear';
import { demosSpeaker } from './batch-m-speaker';
import { demosRibbontext } from './batch-m-ribbontext';
import { demosKnob } from './batch-m-knob';
import { demosWallet } from './batch-m-wallet';
import { demosCradle } from './batch-m-cradle';
import { demosTrain } from './batch-m-train';
import { demosDonut } from './batch-m-donut';
import type { Group } from './groups';
import type { Demo } from './types';

export const demosM: Demo[] = [...demosGear, ...demosSpeaker, ...demosRibbontext, ...demosKnob, ...demosWallet, ...demosCradle, ...demosTrain, ...demosDonut];
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
