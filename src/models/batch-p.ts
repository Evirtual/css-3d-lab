import type { Group } from './groups';
import type { Demo } from './types';

/** Batch P: new demos. Each one also lists its group below. */
export const demosP: Demo[] = [];

/** Which group each demo in this batch belongs to (merged into MEMBERS in groups.ts). */
export const groupsP: Partial<Record<Group, string[]>> = {};
