import type { StatusControlsProps } from './composer-status';

// A fixture stays plain data, so the chips' presses do nothing here.
const press = (): void => {};

// Subagents still running read in the success tone; the Shells chip is settled beside them.
export const runningWork = {
  status: {
    subagents: { count: 2, running: true, onPress: press },
    shells: { count: 1, running: false, onPress: press },
  },
  disabled: false,
} satisfies StatusControlsProps;

// Nothing running: both counts read muted.
export const settledWork = {
  status: {
    subagents: { count: 2, running: false, onPress: press },
    shells: { count: 1, running: false, onPress: press },
  },
  disabled: false,
} satisfies StatusControlsProps;
