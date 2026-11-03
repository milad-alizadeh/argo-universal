import { EventEmitter, on } from 'node:events';
import type { StaleMark } from '@repo/contracts/plugins/page-address';

type MarkEvents = EventEmitter<{ mark: [StaleMark]; close: [] }>;

// Tells every connected App which Loader page patterns an Operation may have changed (ADR-0050).
export class StaleMarks {
  private readonly events: MarkEvents = new EventEmitter();

  public constructor() {
    // Every connected App watches; its subscription releases the listener.
    this.events.setMaxListeners(0);
  }

  public mark(mark: StaleMark): void {
    if (mark.stale.length > 0) this.events.emit('mark', mark);
  }

  public async *watch(signal: AbortSignal): AsyncGenerator<StaleMark> {
    const stream = on(this.events, 'mark', { signal, close: ['close'] });

    try {
      yield* marks(stream, signal);
    } finally {
      await stream.return?.();
    }
  }

  public close(): void {
    this.events.emit('close');
  }
}

// Aborting a subscription ends its stream quietly.
async function* marks(
  stream: AsyncIterable<StaleMark[]>,
  signal: AbortSignal,
): AsyncGenerator<StaleMark> {
  try {
    for await (const mark of stream) yield* mark;
  } catch (error) {
    rethrowUncancelled(signal, error);
  }
}

function rethrowUncancelled(signal: AbortSignal, cause: unknown): void {
  if (!signal.aborted) throw cause;
}
