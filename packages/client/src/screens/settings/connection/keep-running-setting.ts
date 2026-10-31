import type { KeepRunningSetting } from './connection-detail-view';

// The slice of the change mutation that the setting reads.
export interface KeepRunningChange {
  isPending: boolean;
  variables?: { enabled: boolean };
  error: { message: string } | null;
  mutate: (variables: { enabled: boolean }) => void;
}

// What the switch has asked for, while the Server has not yet replied.
const asked = (change: KeepRunningChange): boolean | undefined =>
  change.isPending ? change.variables?.enabled : undefined;

const settingOf = (
  stored: boolean,
  change: KeepRunningChange,
): KeepRunningSetting => ({
  enabled: asked(change) ?? stored,
  error: change.error?.message,
  onChange: (enabled) => change.mutate({ enabled }),
});

/*
 * The Server Device's own setting. A paired Device gets none: the App hides the row now, and the Server will refuse
 * the change itself (#1497). Nor does a Device get one before the Server has said what it is.
 */
export function keepRunningSetting(
  paired: boolean,
  stored: boolean | undefined,
  change: KeepRunningChange,
): KeepRunningSetting | undefined {
  return paired || stored === undefined ? undefined : settingOf(stored, change);
}
