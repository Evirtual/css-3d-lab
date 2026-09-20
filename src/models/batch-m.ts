import type { Group } from './groups';
import type { Demo } from './types';

/** Batch M: new demos. Each one also lists its group below. */
export const demosM: Demo[] = [];

/** Which group each demo in this batch belongs to (merged into MEMBERS in groups.ts). */
export const groupsM: Partial<Record<Group, string[]>> = {};
