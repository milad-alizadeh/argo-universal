// The Session gives up on its Agent after this many crashes within the window.
const crashWindowMs = 600_000;
const maxCrashesInWindow = 3;

export const crashBudgetFailure =
  'The Agent stopped three times in ten minutes';

export const addCrash = (crashes: readonly number[], now: number): number[] => [
  ...crashes.filter((at): boolean => at > now - crashWindowMs),
  now,
];

export const exceedsCrashBudget = (crashes: readonly number[]): boolean =>
  crashes.length >= maxCrashesInWindow;
