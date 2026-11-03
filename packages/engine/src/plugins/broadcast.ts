import { EventEmitter, on } from 'node:events';

type Events<Event> = EventEmitter<{ event: [Event]; close: [] }>;

/*
 * Sends each event to every connected App watching it. A watch hears what is sent from the moment it is
 * asked for; aborting it ends its stream quietly, and closing ends every watch.
 */
export class Broadcast<Event> {
  private readonly events: Events<Event> = new EventEmitter();

  public constructor() {
    // Every connected App watches; its subscription releases the listener.
    this.events.setMaxListeners(0);
  }

  public send(event: Event): void {
    this.events.emit('event', event);
  }

  public watch(signal: AbortSignal): AsyncGenerator<Event> {
    return quietly(
      on(this.events, 'event', { signal, close: ['close'] }),
      signal,
    );
  }

  public close(): void {
    this.events.emit('close');
  }
}

async function* quietly<Event>(
  stream: AsyncIterableIterator<Event[]>,
  signal: AbortSignal,
): AsyncGenerator<Event> {
  try {
    yield* flattened(stream, signal);
  } finally {
    await stream.return?.();
  }
}

// Aborting a watch ends its stream quietly.
async function* flattened<Event>(
  stream: AsyncIterable<Event[]>,
  signal: AbortSignal,
): AsyncGenerator<Event> {
  try {
    for await (const events of stream) yield* events;
  } catch (error) {
    rethrowUncancelled(signal, error);
  }
}

function rethrowUncancelled(signal: AbortSignal, cause: unknown): void {
  if (!signal.aborted) throw cause;
}
