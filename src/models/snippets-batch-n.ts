/**
 * Batch N's snippets, one file per model (snippets-batch-n-<id>.ts), gathered for the snippet map
 * (src/models/snippets.ts). Kept apart from ./batch-n.ts, which the browser loads for the gallery:
 * a snippet reaches the browser only through its own chunk (scripts/snippet-chunks.mjs).
 */
import { snippetsMobius } from './snippets-batch-n-mobius';
import { snippetsSpring } from './snippets-batch-n-spring';
import { snippetsLipstick } from './snippets-batch-n-lipstick';
import { snippetsFoldphone } from './snippets-batch-n-foldphone';
import { snippetsNeonsign } from './snippets-batch-n-neonsign';
import { snippetsStamptext } from './snippets-batch-n-stamptext';
import { snippetsSlider3d } from './snippets-batch-n-slider3d';
import { snippetsLever } from './snippets-batch-n-lever';
import { snippetsTicket } from './snippets-batch-n-ticket';
import { snippetsEnvelope } from './snippets-batch-n-envelope';
import { snippetsPendulumwave } from './snippets-batch-n-pendulumwave';
import { snippetsBounceball } from './snippets-batch-n-bounceball';
import { snippetsCampfire } from './snippets-batch-n-campfire';
import { snippetsHotair } from './snippets-batch-n-hotair';
import { snippetsPoppyramid } from './snippets-batch-n-poppyramid';
import { snippetsBubbles } from './snippets-batch-n-bubbles';
import { snippetsCoderain } from './snippets-batch-n-coderain';
import { snippetsBullettime } from './snippets-batch-n-bullettime';
import type { Snippet } from './snippet-utils';

export const snippetsN: Record<string, Snippet> = { ...snippetsMobius, ...snippetsSpring, ...snippetsLipstick, ...snippetsFoldphone, ...snippetsNeonsign, ...snippetsStamptext, ...snippetsSlider3d, ...snippetsLever, ...snippetsTicket, ...snippetsEnvelope, ...snippetsPendulumwave, ...snippetsBounceball, ...snippetsCampfire, ...snippetsHotair, ...snippetsPoppyramid, ...snippetsBubbles, ...snippetsCoderain, ...snippetsBullettime };
