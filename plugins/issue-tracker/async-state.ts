import type { Load, Update } from './use-async';

export type State<Value> = {
  owner: Load<Value> | undefined;
  value: Value | undefined;
  error: string | undefined;
};

export const unowned = { owner: undefined, value: undefined, error: undefined };

// A state belongs to the `load` that made it; another `load` starts from nothing.
export const owned = <Value>(
  state: State<Value>,
  load: Load<Value>,
): State<Value> => (state.owner === load ? state : unowned);

// Values are JSON, so equal ones are told apart by their text.
const same = <Value>(left: Value, right: Value): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

// Showing the answer already shown changes nothing, so no new view revision is published.
export function shown<Value>(
  state: State<Value>,
  load: Load<Value>,
  value: Value,
): State<Value> {
  return unchanged(state, load, value)
    ? state
    : { owner: load, value, error: undefined };
}

const unchanged = <Value>(
  state: State<Value>,
  load: Load<Value>,
  value: Value,
): boolean => state.owner === load && !state.error && same(state.value, value);

const repeated = <Value>(
  state: State<Value>,
  load: Load<Value>,
  error: string,
): boolean => state.owner === load && state.error === error;

export function failed<Value>(
  state: State<Value>,
  load: Load<Value>,
  cause: unknown,
): State<Value> {
  const error = cause instanceof Error ? cause.message : String(cause);

  // The same failure again changes nothing, so no new view revision is published.
  if (repeated(state, load, error)) return state;

  return { ...owned(state, load), owner: load, error };
}

// Edits the value of the `load` that owns the state; another `load`'s edit is dropped.
export function edited<Value>(
  state: State<Value>,
  load: Load<Value>,
  update: Update<Value>,
): State<Value> {
  // An edit a replaced `load` made must not take the new `load`'s place.
  if (state.owner !== load) return state;

  return { owner: load, value: update(state.value), error: undefined };
}
