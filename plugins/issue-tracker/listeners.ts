// Who hears one kind of change: `subscribe` returns the way to stop hearing it, and `tell` tells everyone.
export type Listeners<Args extends unknown[] = []> = {
  subscribe: (listener: (...args: Args) => void) => () => void;
  tell: (...args: Args) => void;
};

type Listener<Args extends unknown[]> = (...args: Args) => void;

const subscription =
  <Args extends unknown[]>(listeners: Set<Listener<Args>>) =>
  (listener: Listener<Args>): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };

export function createListeners<
  Args extends unknown[] = [],
>(): Listeners<Args> {
  const listeners = new Set<Listener<Args>>();

  return {
    subscribe: subscription(listeners),
    tell: (...args) => {
      for (const listener of listeners) listener(...args);
    },
  };
}
