import { demosA } from './batch-a';
import { demosB } from './batch-b';
import { demosC } from './batch-c';
import { demosD } from './batch-d';
import { demosE } from './batch-e';
import { demosF } from './batch-f';
import { demosG } from './batch-g';
import { demosH } from './batch-h';
import { demosI } from './batch-i';
import { demosJ } from './batch-j';
import { demosK } from './batch-k';
import { groupOf, groupRank, type Group } from './groups';
import { interactiveDemos } from './interactive';
import { interactiveDemos2 } from './interactive2';
import { pureDemos } from './pure';
import { pureDemos2 } from './pure2';
import type { Demo } from './types';

export type GroupedDemo = Demo & { group: Group };

/**
 * The gallery opens with the strongest pieces, mixing groups and Pure CSS / CSS + JS so the first
 * screen shows the range. Everything else follows, each group's demos together.
 */
const FEATURED = [
  'phone', 'rubik', 'paycard', 'solar', 'flaptext', 'package', 'city', 'hovercards', 'can', 'dice',
  'wordcube', 'turntable', 'neonbars', 'equalizer', 'vinyl', 'swipe', 'diamond', 'logo3d', 'magnet', 'ferris', 'pricing',
  'browser', 'watch', 'shadowtext', 'polaroid', 'island', 'coverflow', 'badge', 'torus', 'crawl', 'cubenav', 'chartpanel',
];
const rank = (id: string): number => {
  const i = FEATURED.indexOf(id);
  return i === -1 ? 100_000 + groupRank(id) : i;
};

/** Every demo, tagged with its group, best first (see FEATURED). */
export const demos: GroupedDemo[] = [...pureDemos, ...pureDemos2, ...interactiveDemos, ...interactiveDemos2, ...demosA, ...demosB, ...demosC, ...demosD, ...demosE, ...demosF, ...demosG, ...demosH, ...demosI, ...demosJ, ...demosK]
  .map((demo) => ({ ...demo, group: groupOf(demo.id) }))
  .sort((a, b) => rank(a.id) - rank(b.id));
