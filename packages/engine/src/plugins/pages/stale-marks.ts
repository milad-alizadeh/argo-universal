import { EventEmitter, on } from 'node:events';
import type { StaleMark } from '@repo/contracts/plugins/page-address';

type MarkEvents = EventEmitter<{ mark: [StaleMark]; close: [] }>;

// One write marks twice (the Plugin's own mark, then its run's); marks this close together go out as one.
const joinMs = 16;

/*
 * Tells every connected App which Loader page patterns may have changed (ADR-0050). A Plugin's marks are
 * joined for joinMs and sent once, with every pattern they named, so one write draws each page once.
 */
export class StaleMarks {
  private readonly events: MarkEvents = new EventEmitter();
  private readonly joining = new Map<string, Set<string>>();

  public constructor() {
    // Every connected App watches; its subscription releases the listener.
    this.events.setMaxListeners(0);
  }

  public mark({ pluginId, stale }: StaleMark): void {
    if (stale.length === 0) return;

    const joined = this.joinedFor(pluginId);

    for (const pattern of stale) joined.add(pattern);
  }

  // The patterns joined for this Plugin so far; the first mark starts the wait before they are sent.
  private joinedFor(pluginId: string): Set<string> {
    const joined = this.joining.get(pluginId) ?? new Set<string>();

    if (joined.size === 0) setTimeout(() => this.send(pluginId), joinMs);
    this.joining.set(pluginId, joined);

    return joined;
  }

  public async *watch(signal: AbortSignal): AsyncGenerator<StaleMark> {
    const stream = on(this.events, 'mark', { signal, close: ['close'] });

    try {
      yield* marks(stream, signal);
    } finally {
      await stream.return?.();
    }
  }

  private send(pluginId: string): void {
    const stale = [...(this.joining.get(pluginId) ?? [])];

    this.joining.delete(pluginId);
    this.events.emit('mark', { pluginId, stale });
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
