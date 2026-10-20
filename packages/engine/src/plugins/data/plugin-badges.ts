import { EventEmitter, on } from 'node:events';
import type { PluginNavBadge } from '@repo/contracts/plugins/argo-calls';
import type { PluginBadge } from '@repo/contracts/plugins/runtime';
import { CapabilityRefusal } from '../access/capability-refusal';

type BadgeOwner = { generation: number; ids: readonly string[] };

export class PluginBadges {
  private readonly allowed = new Map<string, BadgeOwner>();
  private readonly counts = new Map<string, Map<string, number>>();
  private readonly events = new EventEmitter<{
    change: [PluginBadge[]];
    close: [];
  }>();

  constructor(private readonly log: (line: string) => void) {
    this.events.setMaxListeners(0);
  }

  allow(pluginId: string, generation: number, ids: readonly string[]): void {
    this.allowed.set(pluginId, { generation, ids });
  }

  set(
    pluginId: string,
    generation: number,
    { id, count }: PluginNavBadge,
  ): void {
    this.requireOwner(pluginId, generation, id);
    this.log(`Plugin ${pluginId}: argo.nav.badge ${id} ${count}`);
    const counts = this.counts.get(pluginId) ?? new Map<string, number>();
    this.counts.set(pluginId, counts);

    if (count) counts.set(id, count);
    else counts.delete(id);
    this.events.emit('change', this.snapshot());
  }

  private requireOwner(pluginId: string, generation: number, id: string): void {
    if (ownsNav(this.allowed.get(pluginId), generation, id)) return;
    this.log(
      `Plugin ${pluginId}: refused argo.nav.badge ${id}: not this Plugin's nav id`,
    );
    throw new CapabilityRefusal(`${id} is not this Plugin's nav id`);
  }

  release(pluginId: string): void {
    this.allowed.delete(pluginId);

    if (this.counts.delete(pluginId))
      this.events.emit('change', this.snapshot());
  }

  async *watch(signal: AbortSignal): AsyncGenerator<PluginBadge[]> {
    const stream = on(this.events, 'change', { signal, close: ['close'] });

    try {
      yield this.snapshot();

      yield* readBadges(stream, signal);
    } finally {
      await stream.return?.();
    }
  }

  close(): void {
    this.events.emit('close');
  }

  private snapshot(): PluginBadge[] {
    return [...this.counts].flatMap(([pluginId, counts]) =>
      [...counts].map(([id, count]) => ({ pluginId, id, count })),
    );
  }
}

function ownsNav(
  owner: BadgeOwner | undefined,
  generation: number,
  id: string,
): boolean {
  if (!owner) return false;

  return owner.generation === generation && owner.ids.includes(id);
}

async function* readBadges(
  stream: AsyncIterable<PluginBadge[][]>,
  signal: AbortSignal,
): AsyncGenerator<PluginBadge[]> {
  try {
    for await (const changes of stream) yield* changes;
  } catch (error) {
    rethrowUncancelled(signal, error);
  }
}

function rethrowUncancelled(signal: AbortSignal, cause: unknown): void {
  if (!signal.aborted) throw cause;
}
