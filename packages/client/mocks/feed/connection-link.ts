import type { Connection, ConnectionState } from '#features/connection';

const noop = (): void => {};

export interface Link {
  state: ConnectionState;
  listeners: Set<() => void>;
}

export function connectionOf(link: Link): Connection {
  return {
    state: () => link.state,
    subscribe: (listener) => {
      link.listeners.add(listener);

      return () => void link.listeners.delete(listener);
    },
    nextAttempt: () => Promise.resolve(),
    watch: noop,
    foreground: noop,
    retry: noop,
    refuse: noop,
    stop: noop,
  };
}

export interface ConnectionWatch {
  connect: (state: ConnectionState) => Promise<void>;
  note: (state: ConnectionState) => void;
}

// Moves the Connection, and settles once the screen has drawn the state it moved to.
export function watchConnection(link: Link): ConnectionWatch {
  let drawn: ConnectionState = 'open';
  const waiting: [ConnectionState, () => void][] = [];

  return {
    connect: (state) => {
      link.state = state;

      for (const listener of link.listeners) listener();

      return drawn === state
        ? Promise.resolve()
        : new Promise((resolve) => void waiting.push([state, resolve]));
    },
    note: (state) => {
      drawn = state;

      for (const [wanted, resolve] of waiting.splice(0))
        if (wanted === state) resolve();
        else waiting.push([wanted, resolve]);
    },
  };
}
