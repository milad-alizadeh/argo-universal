import { EventEmitter, on } from 'node:events';
import type { PluginListChange } from '@repo/contracts/plugins/runtime';

type ChangeEvents = EventEmitter<{ change: [PluginListChange]; close: [] }>;

/*
 * Tells every connected App that a Plugin changed in a way it cannot see for itself. A Plugin can be turned off from
 * another App, so an App that is drawing its page learns of the stop here rather than carrying on. A reload, a removal
 * or an Account signing in or out means what the App kept of that Plugin's pages is no longer true (ADR-0048).
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
