import type { Group } from './groups';
import type { Demo } from './types';

/** Batch O: new demos. Each one also lists its group below. */
export const demosO: Demo[] = [];

/** Which group each demo in this batch belongs to (merged into MEMBERS in groups.ts). */
export const groupsO: Partial<Record<Group, string[]>> = {};
