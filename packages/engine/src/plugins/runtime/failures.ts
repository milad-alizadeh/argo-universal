import { randomUUID } from 'node:crypto';
import { EventEmitter, on } from 'node:events';
import {
  PluginFailure,
  type PluginStatus,
} from '@repo/contracts/plugins/runtime';
import type { z } from 'zod';

type FailureEvents = EventEmitter<{ change: [PluginFailure[]]; close: [] }>;

type PluginIdentity = Pick<z.input<typeof PluginFailure>, 'pluginId' | 'name'>;

export class PluginFailures {
  private readonly current = new Map<string, PluginFailure>();
  private readonly events: FailureEvents = new EventEmitter();

  public constructor() {
    // Every connected App watches failures; its subscription releases the listener.
    this.events.setMaxListeners(0);
  }

  public update(plugin: PluginIdentity, status: PluginStatus): void {
    if (status.state === 'crashed') {
      this.current.set(plugin.pluginId, createFailure(plugin, status));
    } else if (!this.current.delete(plugin.pluginId)) return;

    this.events.emit('change', [...this.current.values()]);
  }

  public async *watch(signal: AbortSignal): AsyncGenerator<PluginFailure[]> {
    const stream = on(this.events, 'change', { signal, close: ['close'] });

    try {
      yield [...this.current.values()];
      yield* readFailures(stream, signal);
    } finally {
      await stream.return?.();
    }
  }

  public close(): void {
    this.events.emit('close');
  }
}

function createFailure(
  plugin: PluginIdentity,
  status: PluginStatus,
): PluginFailure {
  return PluginFailure.parse({
    ...plugin,
    message: status.error ?? 'Plugin stopped unexpectedly',
    key: randomUUID(),
  });
}

async function* readFailures(
  stream: AsyncIterable<PluginFailure[][]>,
  signal: AbortSignal,
): AsyncGenerator<PluginFailure[]> {
  try {
    for await (const changes of stream) yield* changes;
  } catch (error) {
    rethrowUncancelledFailure(signal, error);
  }
}

function rethrowUncancelledFailure(signal: AbortSignal, cause: unknown): void {
  if (!signal.aborted) throw cause;
}
