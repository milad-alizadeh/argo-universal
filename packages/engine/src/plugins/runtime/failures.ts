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
    if (this.keepsDrawing(plugin.pluginId, status)) return;

    if (this.replace(plugin, status))
      this.events.emit('change', [...this.current.values()]);
  }

  private keepsDrawing(pluginId: string, status: PluginStatus): boolean {
    return (
      status.state === 'running' &&
      this.current.get(pluginId)?.kind === 'drawing'
    );
  }

  private replace(plugin: PluginIdentity, status: PluginStatus): boolean {
    if (status.state === 'crashed') {
      this.current.set(plugin.pluginId, createFailure(plugin, status));

      return true;
    }

    return this.current.delete(plugin.pluginId);
  }

  public drawing(plugin: PluginIdentity, message: string): void {
    if (!this.newDrawingFailure(plugin.pluginId, message)) return;
    this.current.set(
      plugin.pluginId,
      PluginFailure.parse({
        ...plugin,
        kind: 'drawing',
        message,
        key: randomUUID(),
      }),
    );
    this.events.emit('change', [...this.current.values()]);
  }

  // A stopped Plugin outranks a drawing failure, and the same message again is not news.
  private newDrawingFailure(pluginId: string, message: string): boolean {
    const current = this.current.get(pluginId);

    if (current?.kind !== 'drawing') return current === undefined;

    return current.message !== message;
  }

  // A view that draws again clears the Plugin's drawing failure; a stopped Plugin's stays.
  public drew(pluginId: string): void {
    if (this.current.get(pluginId)?.kind !== 'drawing') return;
    this.current.delete(pluginId);
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
    kind: 'stopped',
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
