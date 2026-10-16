/** A value the overlay's readers subscribe to, as React's external stores expect. */
export interface Feed<T> {
  current: () => T;
  subscribe: (listener: () => void) => () => void;
}

export interface Store<T> extends Feed<T> {
  /** Replaces the value unless it is the same, and says whether it changed. */
  set: (next: T) => boolean;
}

interface State<T> {
  value: T;
  listeners: Set<() => void>;
}

function assign<T>(
  state: State<T>,
  same: (a: T, b: T) => boolean,
  next: T,
): boolean {
  if (same(state.value, next)) return false;
  state.value = next;

  for (const listener of state.listeners) listener();

  return true;
}

function subscriber<T>(state: State<T>): Feed<T>['subscribe'] {
  return (listener) => {
    state.listeners.add(listener);

    return (): void => {
      state.listeners.delete(listener);
    };
  };
}

export function createStore<T>(
  initial: T,
  same: (a: T, b: T) => boolean,
): Store<T> {
  const state: State<T> = { value: initial, listeners: new Set() };

  return {
    current: () => state.value,
    subscribe: subscriber(state),
    set: (next) => assign(state, same, next),
  };
}
