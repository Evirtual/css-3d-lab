import { interactiveDemos } from './interactive';
import { interactiveDemos2 } from './interactive2';
import { pureDemos } from './pure';
import { pureDemos2 } from './pure2';
import type { Demo } from './types';

export const demos: Demo[] = [...pureDemos, ...pureDemos2, ...interactiveDemos, ...interactiveDemos2];
