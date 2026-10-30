import type { StateValue } from 'xstate';

// The one way a model tells two state values apart.
export const stateKey = (value: StateValue): string => JSON.stringify(value);

export const sameState = (left: StateValue, right: StateValue): boolean =>
  stateKey(left) === stateKey(right);
