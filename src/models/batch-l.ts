/**
 * More charts drawn from JSON, one file per chart in ./charts/ (the gallery entry and its
 * copy-paste snippet side by side, the snippet fed by the file's data const). Collected here for
 * the gallery; their snippets are collected in ./snippets-batch-l.ts.
 *
 * Only each chart's `demo` is imported, by name. This file is in the browser's JavaScript, and
 * importing a chart as a whole namespace, or building the snippet map here, kept every chart's
 * entire snippet in the gallery's shared chunk: 7 charts' code on every page, downloaded again from
 * their own chunks when they mounted (measured 2026-10-02).
 */
import { demo as activity } from './charts/activity';
import { demo as candles } from './charts/candles';
import { demo as funnel } from './charts/funnel';
import { demo as radar } from './charts/radar';
import { demo as stackbars } from './charts/stackbars';
import { demo as treemap } from './charts/treemap';
import { demo as waterfall } from './charts/waterfall';
import type { Demo } from './types';

export const demosL: Demo[] = [stackbars, funnel, candles, waterfall, treemap, radar, activity];
