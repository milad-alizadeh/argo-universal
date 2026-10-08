export interface SubscriptionPublisher<Value> {
  reset: () => void;
  publish: (value: Value) => void;
  subscribe: (signal: AbortSignal) => AsyncGenerator<Value, void>;
}

// Feeds a subscription fixture: each published value goes to the open subscription, as the Server sends a change.
export function createSubscriptionPublisher<
  Value,
>(): SubscriptionPublisher<Value> {
  let active = false;
  let generation = 0;
  const queued: Value[] = [];
  let send: ((value: Value) => void) | undefined;
  return {
    reset(): void {
      generation += 1;
      send = undefined;
      active = false;
      queued.length = 0;
    },
    publish(value: Value): void {
      if (!active) return;
      if (send) send(value);
      else queued.push(value);
    },
    async *subscribe(signal: AbortSignal): AsyncGenerator<Value, void> {
      const current = ++generation;
      active = true;
      try {
        while (generation === current && !signal.aborted) {
          const value = queued.length
            ? queued.shift()
            : await new Promise<Value | undefined>((resolve) => {
                const cleanup = (): void => {
                  signal.removeEventListener('abort', abort);
                  if (send === deliver) send = undefined;
                };
                const abort = (): void => {
                  cleanup();
                  resolve(undefined);
                };
                const deliver = (next: Value): void => {
                  cleanup();
                  resolve(next);
                };
                if (signal.aborted) return resolve(undefined);
                send = deliver;
                signal.addEventListener('abort', abort, { once: true });
              });
          if (value === undefined) return;
          yield value;
        }
      } finally {
        if (generation === current) {
          active = false;
          queued.length = 0;
        }
      }
    },
  };
}
