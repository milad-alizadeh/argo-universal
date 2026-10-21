// The listeners of a small external store, for useSyncExternalStore.
export interface ListenerSet {
  subscribe: (listener: () => void) => () => void;
  notify: () => void;
}

export function listenerSet(): ListenerSet {
  const listeners = new Set<() => void>();

  return {
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    notify: () => listeners.forEach((listener) => listener()),
  };
}
