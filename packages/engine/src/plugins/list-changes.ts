import { EventEmitter, on } from 'node:events';
import type { PluginListChange } from '@repo/contracts/plugins/runtime';

type ChangeEvents = EventEmitter<{ change: [PluginListChange]; close: [] }>;

/*
 * Tells every connected App that the Server's Plugin list changed. A Plugin can be turned off from
 * another App, so an App that is drawing its page learns of the stop here rather than carrying on.
 */
export class PluginListChanges {
  private readonly events: ChangeEvents = new EventEmitter();

  public constructor() {
    // Every connected App watches the list; its subscription releases the listener.
    this.events.setMaxListeners(0);
  }

  public changed(pluginId: string): void {
    this.events.emit('change', { pluginId });
  }

  public async *watch(signal: AbortSignal): AsyncGenerator<PluginListChange> {
    const stream = on(this.events, 'change', { signal, close: ['close'] });

    try {
      yield* changes(stream, signal);
    } finally {
      await stream.return?.();
    }
  }

  public close(): void {
    this.events.emit('close');
  }
}

// Aborting a subscription ends its stream quietly.
async function* changes(
  stream: AsyncIterable<PluginListChange[]>,
  signal: AbortSignal,
): AsyncGenerator<PluginListChange> {
  try {
    for await (const change of stream) yield* change;
  } catch (error) {
    rethrowUncancelled(signal, error);
  }
}

function rethrowUncancelled(signal: AbortSignal, cause: unknown): void {
  if (!signal.aborted) throw cause;
}
