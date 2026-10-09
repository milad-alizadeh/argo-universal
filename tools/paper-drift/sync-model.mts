import type { Styles } from './snapshot-model.mts';

// What a sync does to one copy: replace it with a fresh clone of the master and put back what the copy may own.
export interface SyncPlan {
  masterId: string;
  copyId: string;
  copyPath: string;
  parentId: string;
  // Fixed style differences, for the dry run.
  fixes: number;
  placement: Styles;
  // Text layers, master id → copy id, whose copy text is read and put back.
  texts: [string, string][];
  // Master layer id → the display value the copy gave it.
  display: [string, string][];
  // Nested masters the copy keeps: master layer id → copy layer id moved in its place.
  kept: [string, string][];
}

export interface Blocked {
  copyId: string;
  copyPath: string;
  reason: string;
}

export interface SyncPlans {
  plans: SyncPlan[];
  blocked: Blocked[];
}
