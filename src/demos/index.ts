import { interactiveDemos } from './interactive';
import { pureDemos } from './pure';
import type { Demo } from './types';

export const demos: Demo[] = [...pureDemos, ...interactiveDemos];
