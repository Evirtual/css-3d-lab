import { groupOf, groupRank, type Group } from './groups';
import { interactiveDemos } from './interactive';
import { interactiveDemos2 } from './interactive2';
import { pureDemos } from './pure';
import { pureDemos2 } from './pure2';
import type { Demo } from './types';

export type GroupedDemo = Demo & { group: Group };

/** Every demo, tagged with its group and ordered so each group's demos sit together. */
export const demos: GroupedDemo[] = [...pureDemos, ...pureDemos2, ...interactiveDemos, ...interactiveDemos2]
  .map((demo) => ({ ...demo, group: groupOf(demo.id) }))
  .sort((a, b) => groupRank(a.id) - groupRank(b.id));
