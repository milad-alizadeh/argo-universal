import type { LocalAccessSetting } from './connection-controls';

// The slice of the change mutation that the setting reads.
export interface LocalAccessChange {
  isPending: boolean;
  variables?: { enabled: boolean };
  error: { message: string } | null;
  mutate: (variables: { enabled: boolean }) => void;
}

// What the switch has asked for, while the Server has not yet replied.
const asked = (change: LocalAccessChange): boolean | undefined =>
  change.isPending ? change.variables?.enabled : undefined;

interface Known {
  stored: boolean;
  computerName?: string;
}

const settingOf = (
  known: Known,
  change: LocalAccessChange,
): LocalAccessSetting => ({
  enabled: asked(change) ?? known.stored,
  computerName: known.computerName,
  error: change.error?.message,
  onChange: (enabled) => change.mutate({ enabled }),
});

/*
 * The Server Device's own setting, like keeping the Server running: a Paired Device gets none, never asks, and the Server refuses it with `serverDeviceProcedure`. Nor does a Device get one before the Server has said what it is.
 */
export function localAccessSetting(
  paired: boolean,
  known: { stored?: boolean; computerName?: string },
  change: LocalAccessChange,
): LocalAccessSetting | undefined {
  const { stored, computerName } = known;

  return paired || stored === undefined
    ? undefined
    : settingOf({ stored, computerName }, change);
}
