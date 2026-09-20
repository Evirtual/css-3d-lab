import type { Group } from './groups';
import type { Demo } from './types';

/** Batch N: new demos. Each one also lists its group below. */
export const demosN: Demo[] = [];

/** Which group each demo in this batch belongs to (merged into MEMBERS in groups.ts). */
export const groupsN: Partial<Record<Group, string[]>> = {};
