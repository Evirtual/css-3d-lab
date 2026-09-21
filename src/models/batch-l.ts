/**
 * More charts drawn from JSON, one file per chart in ./charts/ (the gallery entry and its
 * copy-paste snippet side by side, the snippet fed by the file's data const). Collected here for
 * the gallery and the snippet map.
 */
import * as activity from './charts/activity';
import * as candles from './charts/candles';
import * as funnel from './charts/funnel';
import * as radar from './charts/radar';
import * as stackbars from './charts/stackbars';
import * as treemap from './charts/treemap';
import * as waterfall from './charts/waterfall';
import type { Snippet } from './snippet-utils';
import type { Demo } from './types';

const CHARTS = [stackbars, funnel, candles, waterfall, treemap, radar, activity];

export const demosL: Demo[] = CHARTS.map((c) => c.demo);
export const snippetsL: Record<string, Snippet> = Object.fromEntries(CHARTS.map((c) => [c.demo.id, c.snippet]));
