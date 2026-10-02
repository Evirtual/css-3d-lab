/**
 * The chart snippets (one file per chart in ./charts/), gathered for the snippet map
 * (src/models/snippets.ts). Kept apart from ./batch-l.ts, which the browser loads for the gallery:
 * a snippet reaches the browser only through its own chunk (scripts/snippet-chunks.mjs).
 */
import { snippet as activity } from './charts/activity';
import { snippet as candles } from './charts/candles';
import { snippet as funnel } from './charts/funnel';
import { snippet as radar } from './charts/radar';
import { snippet as stackbars } from './charts/stackbars';
import { snippet as treemap } from './charts/treemap';
import { snippet as waterfall } from './charts/waterfall';
import type { Snippet } from './snippet-utils';

export const snippetsL: Record<string, Snippet> = { stackbars, funnel, candles, waterfall, treemap, radar, activity };
