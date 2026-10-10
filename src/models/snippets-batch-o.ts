/**
 * Batch O's snippets, one file per model (snippets-batch-o-<id>.ts), gathered for the snippet map
 * (src/models/snippets.ts). Kept apart from ./batch-o.ts, which the browser loads for the gallery:
 * a snippet reaches the browser only through its own chunk (scripts/snippet-chunks.mjs).
 */
import { snippetsController } from './snippets-batch-o-controller';
import { snippetsMenger } from './snippets-batch-o-menger';
import { snippetsAquarium } from './snippets-batch-o-aquarium';
import { snippetsTypewriter } from './snippets-batch-o-typewriter';
import { snippetsStickynotes } from './snippets-batch-o-stickynotes';
import { snippetsFlightglobe } from './snippets-batch-o-flightglobe';
import { snippetsHanoi } from './snippets-batch-o-hanoi';
import { snippetsPadlock } from './snippets-batch-o-padlock';
import type { Snippet } from './snippet-utils';

export const snippetsO: Record<string, Snippet> = { ...snippetsController, ...snippetsMenger, ...snippetsAquarium, ...snippetsTypewriter, ...snippetsStickynotes, ...snippetsFlightglobe, ...snippetsHanoi, ...snippetsPadlock };
