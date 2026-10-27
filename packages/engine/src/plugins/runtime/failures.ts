import { randomUUID } from 'node:crypto';
import { EventEmitter, on } from 'node:events';
import {
  PluginFailure,
  type PluginStatus,
} from '@repo/contracts/plugins/runtime';
import type { z } from 'zod';
import { openingKey, type Asked } from '../views/opening-key';

export type PluginIdentity = Pick<
  z.input<typeof PluginFailure>,
  'pluginId' | 'name'
>;

type FailureEvents = EventEmitter<{ change: [PluginFailure[]]; close: [] }>;

/*
 * The failures the App shows: a stopped Plugin's, and drawing failures, one per Opening. A Plugin that
 * throws fails what the App asked for and nothing else, so another view of the same Plugin neither clears
 * it nor is cleared by it (ADR-0037). Each drawing failure is keyed by the Opening its view belongs to,
 * so it outlives the view that raised it and the viewId a Plugin reload mints.
 */
export class PluginFailures {
  private readonly stopped = new Map<string, PluginFailure>();
  private readonly drawings = new Map<string, PluginFailure>();
  private readonly events: FailureEvents = new EventEmitter();

  public constructor(
    private readonly identity: (pluginId: string) => PluginIdentity | undefined,
  ) {
    // Every connected App watches failures; its subscription releases the listener.
    this.events.setMaxListeners(0);
  }

  // A stopped Plugin outranks its views' drawing failures and takes their place.
  public update(plugin: PluginIdentity, status: PluginStatus): void {
    if (status.state !== 'crashed') return this.forget(plugin.pluginId);
    const message = status.error ?? 'Plugin stopped unexpectedly';

    this.stopped.set(plugin.pluginId, failure(plugin, 'stopped', message));
    this.endDrawings(plugin.pluginId);
    this.changed();
  }

  private forget(pluginId: string): void {
    if (this.stopped.delete(pluginId)) this.changed();
  }

  public failed(asked: Asked, message: string): void {
    const plugin = this.identity(asked.pluginId);
    const opening = openingKey(asked);

    if (!plugin || this.isRepeat(plugin.pluginId, opening, message)) return;
    this.drawings.set(opening, failure(plugin, 'drawing', message));
    this.changed();
  }

  // A stopped Plugin's views fail nothing more, and the same message on the same Opening is not news.
  private isRepeat(
    pluginId: string,
    opening: string,
    message: string,
  ): boolean {
    return (
      this.stopped.has(pluginId) ||
      this.drawings.get(opening)?.message === message
    );
  }

  // A deactivated Plugin has no Opening left to draw, and its views were removed without drawing.
  public ended(pluginId: string): void {
    if (this.endDrawings(pluginId)) this.changed();
  }

  /*
   * An Opening's drawing failure goes when a view for it draws, and when the App stops asking for it.
   * Another Opening of the same Plugin clears nothing, and the viewId a reload mints keeps the Opening.
   */
  public clearDrawing(asked: Asked): void {
    if (this.drawings.delete(openingKey(asked))) this.changed();
  }

  private endDrawings(pluginId: string): boolean {
    const gone = [...this.drawings].filter(
      ([, { pluginId: id }]) => id === pluginId,
    );

    for (const [opening] of gone) this.drawings.delete(opening);

    return gone.length > 0;
  }

  private changed(): void {
    this.events.emit('change', this.snapshot());
  }

  // The App shows one toast per Plugin, so several failed Openings roll up to the Plugin's latest.
  private snapshot(): PluginFailure[] {
    const latest = new Map(
      this.drawings.values().map((drawing) => [drawing.pluginId, drawing]),
    );

    return [
      ...this.stopped.values(),
      ...latest.values().filter(({ pluginId }) => !this.stopped.has(pluginId)),
    ];
  }

  public async *watch(signal: AbortSignal): AsyncGenerator<PluginFailure[]> {
    const stream = on(this.events, 'change', { signal, close: ['close'] });

    try {
      yield this.snapshot();
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
  stream: AsyncIterable<PluginFailure[][]>,
  signal: AbortSignal,
): AsyncGenerator<PluginFailure[]> {
  try {
    for await (const snapshot of stream) yield* snapshot;
  } catch (error) {
    rethrowUncancelled(signal, error);
  }
}

function rethrowUncancelled(signal: AbortSignal, cause: unknown): void {
  if (!signal.aborted) throw cause;
}

function failure(
  plugin: PluginIdentity,
  kind: PluginFailure['kind'],
  message: string,
): PluginFailure {
  return PluginFailure.parse({ ...plugin, kind, message, key: randomUUID() });
}
