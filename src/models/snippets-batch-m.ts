/**
 * Batch M's snippets, one file per model (snippets-batch-m-<id>.ts), gathered for the snippet map
 * (src/models/snippets.ts). Kept apart from ./batch-m.ts, which the browser loads for the gallery:
 * a snippet reaches the browser only through its own chunk (scripts/snippet-chunks.mjs).
 */
import { snippetsGear } from './snippets-batch-m-gear';
import { snippetsSpeaker } from './snippets-batch-m-speaker';
import { snippetsRibbontext } from './snippets-batch-m-ribbontext';
import { snippetsKnob } from './snippets-batch-m-knob';
import { snippetsWallet } from './snippets-batch-m-wallet';
import { snippetsCradle } from './snippets-batch-m-cradle';
import { snippetsTrain } from './snippets-batch-m-train';
import { snippetsDonut } from './snippets-batch-m-donut';
import type { Snippet } from './snippet-utils';

export const snippetsM: Record<string, Snippet> = { ...snippetsGear, ...snippetsSpeaker, ...snippetsRibbontext, ...snippetsKnob, ...snippetsWallet, ...snippetsCradle, ...snippetsTrain, ...snippetsDonut };
