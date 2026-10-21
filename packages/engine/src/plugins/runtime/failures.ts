import { randomUUID } from 'node:crypto';
import { EventEmitter, on } from 'node:events';
import {
  PluginFailure,
  type PluginStatus,
} from '@repo/contracts/plugins/runtime';
import { DrawingFailures, type PluginIdentity } from './drawing-failures';

type FailureEvents = EventEmitter<{ change: [PluginFailure[]]; close: [] }>;

export class PluginFailures {
  private readonly stopped = new Map<string, PluginFailure>();
  private readonly drawings = new DrawingFailures();
  private readonly events: FailureEvents = new EventEmitter();

  public constructor() {
    // Every connected App watches failures; its subscription releases the listener.
    this.events.setMaxListeners(0);
  }

  public update(plugin: PluginIdentity, status: PluginStatus): void {
    if (this.replace(plugin, status)) this.changed();
  }

  // A stopped Plugin outranks its views' drawing failures and takes their place.
  private replace(plugin: PluginIdentity, status: PluginStatus): boolean {
    if (status.state !== 'crashed') return this.stopped.delete(plugin.pluginId);
    this.stopped.set(plugin.pluginId, createFailure(plugin, status));
    this.drawings.end(plugin.pluginId);

    return true;
  }

  public drawing(
    plugin: PluginIdentity,
    opening: string,
    message: string,
  ): void {
    if (this.stopped.has(plugin.pluginId)) return;

    if (this.drawings.failed(plugin, opening, message)) this.changed();
  }

  // A deactivated Plugin has no Opening left to draw, and its views were removed without drawing.
  public ended(pluginId: string): void {
    if (this.drawings.end(pluginId)) this.changed();
  }

  /*
   * An Opening's drawing failure goes when a view for it draws, and when the App stops asking for it.
   * Another Opening of the same Plugin clears nothing, and the viewId a reload mints keeps the Opening.
   */
  public cleared(opening: string): void {
    if (this.drawings.cleared(opening)) this.changed();
  }

  private changed(): void {
    this.events.emit('change', this.snapshot());
  }

  private snapshot(): PluginFailure[] {
    return [
      ...this.stopped.values(),
      ...this.drawings
        .rollup()
        .filter((failure) => !this.stopped.has(failure.pluginId)),
    ];
  }

  public async *watch(signal: AbortSignal): AsyncGenerator<PluginFailure[]> {
    const stream = on(this.events, 'change', { signal, close: ['close'] });

    try {
      yield this.snapshot();
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
