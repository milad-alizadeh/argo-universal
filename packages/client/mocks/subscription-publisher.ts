// Feeds a subscription fixture: each published value goes to the open subscription, as the Server sends a change.
export function createSubscriptionPublisher<Value>() {
  let active = false;
  const queued: Value[] = [];
  let send: ((value: Value) => void) | undefined;
  return {
    reset() {
      send = undefined;
      active = false;
      queued.length = 0;
    },
    publish(value: Value) {
      if (!active) return;
      if (send) send(value);
      else queued.push(value);
    },
    async *subscribe(signal: AbortSignal): AsyncGenerator<Value> {
      active = true;
      try {
        while (!signal.aborted) {
          const value = queued.length
            ? queued.shift()
            : await new Promise<Value | undefined>((resolve) => {
                const cleanup = () => {
                  signal.removeEventListener('abort', abort);
                  if (send === deliver) send = undefined;
                };
                const abort = () => {
                  cleanup();
                  resolve(undefined);
                };
                const deliver = (next: Value) => {
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
        active = false;
        queued.length = 0;
      }
    },
  };
}
