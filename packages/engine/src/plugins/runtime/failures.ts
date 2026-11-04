import { randomUUID } from 'node:crypto';
import { EventEmitter, on } from 'node:events';
import type { PageAddress } from '@repo/contracts/plugins/page-address';
import { canonicalWireJson } from '@repo/contracts/plugins/query-normalisation';
import {
  PluginFailure,
  type PluginStatus,
} from '@repo/contracts/plugins/runtime';
import type { z } from 'zod';

export type PluginIdentity = Pick<
  z.input<typeof PluginFailure>,
  'pluginId' | 'name'
>;

type FailureEvents = EventEmitter<{ change: [PluginFailure[]]; close: [] }>;

// A Page address as one string; the Connection that asked is not part of it, so two Apps share one failure.
const addressKey = ({
  pluginId,
  path,
  pageState,
  projectId,
  sessionId,
}: PageAddress): string =>
  canonicalWireJson([
    pluginId,
    path,
    pageState,
    projectId ?? null,
    sessionId ?? null,
  ]);

// The most drawing failures held at once; the oldest goes first, so an App asking for endless addresses cannot grow them.
const maxDrawings = 200;

/*
 * The failures the App shows: a stopped Plugin's, and drawing failures, one per Page address. A Plugin
 * that throws fails what the App asked for and nothing else, so another page of the same Plugin neither
 * clears it nor is cleared by it (ADR-0037). Each drawing failure is keyed by its Page address, so it
 * outlives a Plugin reload until that address draws.
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

  // A stopped Plugin outranks its pages' drawing failures and takes their place.
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

  // Whether the failure is news: a stopped Plugin's pages fail nothing more, and a repeat is not news.
  public failed(address: PageAddress, message: string): boolean {
    const plugin = this.identity(address.pluginId);
    const at = addressKey(address);

    if (!plugin || this.isRepeat(plugin.pluginId, at, message)) return false;
    this.holdDrawing(at, failure(plugin, 'drawing', message));
    this.changed();

    return true;
  }

  // The newest failure of an address is the last held; past the most held, the oldest goes.
  private holdDrawing(at: string, held: PluginFailure): void {
    this.drawings.delete(at);
    this.drawings.set(at, held);

    for (const [oldest] of this.drawings) {
      if (this.drawings.size <= maxDrawings) break;
      this.drawings.delete(oldest);
    }
  }

  private isRepeat(pluginId: string, at: string, message: string): boolean {
    return (
      this.stopped.has(pluginId) || this.drawings.get(at)?.message === message
    );
  }

  // A deactivated Plugin has no page left to draw.
  public ended(pluginId: string): void {
    if (this.endDrawings(pluginId)) this.changed();
  }

  // An address's drawing failure goes when it draws; another address of the same Plugin clears nothing.
  public clearDrawing(address: PageAddress): void {
    if (this.drawings.delete(addressKey(address))) this.changed();
  }

  private endDrawings(pluginId: string): boolean {
    const gone = [...this.drawings].filter(
      ([, { pluginId: id }]) => id === pluginId,
    );

    for (const [at] of gone) this.drawings.delete(at);

    return gone.length > 0;
  }

  private changed(): void {
    this.events.emit('change', this.snapshot());
  }

  // The App shows one toast per Plugin, so several failed addresses roll up to the Plugin's latest.
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
