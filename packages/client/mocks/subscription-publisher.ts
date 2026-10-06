// Feeds a subscription fixture: each published value goes to the open subscription, as the Server sends a change.
export function createSubscriptionPublisher<Value>() {
  let send: ((value: Value) => void) | undefined;
  return {
    reset() {
      send = undefined;
    },
    publish(value: Value) {
      send?.(value);
    },
    async *subscribe(signal: AbortSignal): AsyncGenerator<Value> {
      while (!signal.aborted) {
        const value = await new Promise<Value | undefined>((resolve) => {
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
    },
  };
}
