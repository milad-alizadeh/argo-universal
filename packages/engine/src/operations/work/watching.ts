import type { Observer, Subscription } from 'xstate';
import type { SessionWorkWatcher } from '../../sessions';

export type WatchInput = { watch: SessionWorkWatcher; sessionId: string };

type WatchEvent =
  | { type: 'work.changed' }
  | { type: 'work.failed'; cause: unknown };

type SendBack = (event: WatchEvent) => void;

// Watches one Session's work; a change is read once actor publication and its command receipts settle.
export function watchWork(input: WatchInput, sendBack: SendBack): () => void {
  const changes = new SettledChanges(() => sendBack({ type: 'work.changed' }));

  const subscription = subscribe(input, {
    next: changes.add,
    complete: changes.add,
    error: (cause) => sendBack({ type: 'work.failed', cause }),
  });

  return (): void => {
    subscription?.unsubscribe();
    changes.clear();
  };
}

function subscribe(
  { watch, sessionId }: WatchInput,
  observer: Observer<void>,
): Subscription | undefined {
  try {
    return watch(sessionId, observer);
  } catch (cause) {
    observer.error?.(cause);

    return undefined;
  }
}

class SettledChanges {
  private readonly pending = new Set<NodeJS.Immediate>();
  public constructor(private readonly changed: () => void) {}
  public readonly add = (): void => {
    const immediate = setImmediate(() => {
      this.pending.delete(immediate);
      this.changed();
    });

    this.pending.add(immediate);
  };
  public clear(): void {
    for (const immediate of this.pending) clearImmediate(immediate);
    this.pending.clear();
  }
}

// A disconnected caller ends its wait, even one disconnected before observation began.
export function onDisconnect(
  signal: AbortSignal | undefined,
  disconnected: () => void,
): () => void {
  if (!signal) return (): void => {};

  if (signal.aborted) disconnected();
  else signal.addEventListener('abort', disconnected, { once: true });

  return (): void => signal.removeEventListener('abort', disconnected);
}
