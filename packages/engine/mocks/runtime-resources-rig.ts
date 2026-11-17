import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import { vi } from 'vitest';
import type { PluginClock } from '../src/plugins/clock';
import type { PluginReply } from '../src/plugins/protocol/runtime';
import { RuntimeResources } from '../src/plugins/runtime/runtime-resources';
import { HeldSecrets } from '../src/plugins/services/held-secrets';

export const pluginId = 'tracker';

export const caller = { pluginId, generation: 1 };

export const address: PageAddress = { pluginId, path: '/', pageState: {} };

const overview = {
  api: 'read',
  name: 'overview',
  args: { projectId: 'p1' },
} as const;

type ReadEvent = Extract<PluginEvent, { type: 'read' }>;

const services = {
  heldSecrets: new HeldSecrets(),
  onStorageWrite: (): void => {},
  watchProjects: (): (() => void) => (): void => {},
  projectIds: async (): Promise<string[]> => ['p1'],
  handle: async (): Promise<PluginReply> => ({ ok: false, error: 'none' }),
  activate: (): void => {},
  release: (): void => {},
};

/*
 * A Plugin's runtime resources with a clock the test turns by hand: what the Server sends the worker is kept, and
 * the test plays the worker's answers.
 */
export class Rig {
  readonly resources: RuntimeResources;
  // The Page addresses marked stale, one entry per mark sent, or `all` for every page.
  readonly marks: Array<PageAddress[] | 'all'> = [];
  private readonly timers = new Set<() => void>();
  private readonly sent: PluginEvent[] = [];

  private readonly clock: PluginClock = {
    now: (): number => 0,
    delay: async (): Promise<void> => {},
    schedule: (callback): (() => void) => {
      this.timers.add(callback);

      return (): void => void this.timers.delete(callback);
    },
  };

  constructor() {
    this.resources = new RuntimeResources({
      services,
      clock: this.clock,
      log: (): void => {},
      during: (call): ReturnType<typeof call> => call(),
      send: (_id, event): void => void this.sent.push(event),
    });
    this.resources.running(pluginId, 1);
    this.resources.changes.listen((_id, addresses) =>
      this.marks.push(addresses ?? 'all'),
    );
    this.marks.length = 0;
  }

  reads(): ReadEvent[] {
    return this.sent.filter(
      (event): event is ReadEvent => event.type === 'read',
    );
  }

  // The number of timers waiting, which is the coalescing windows that are open.
  get windows(): number {
    return this.timers.size;
  }

  // Lets every open coalescing window pass.
  elapse(): void {
    for (const callback of this.timers.values().toArray()) {
      this.timers.delete(callback);
      callback();
    }
  }

  // The worker answers the newest named read.
  async answer(count: number): Promise<void> {
    const { id } = await vi.waitFor(() => {
      const last = this.reads().at(-1);

      if (!last) throw new Error('No read asked');

      return last;
    });

    this.resources.data.reads.receive(caller, {
      action: 'read',
      id,
      value: { count },
    });
  }

  // A page's draw reads the overview.
  drawn(): Promise<PluginReply> {
    return this.resources.data.handle(
      caller,
      { api: 'data', action: 'read', query: overview, fresh: false },
      { drawn: { draw: 1, holder: address } },
    );
  }

  // One run of the Plugin's Operation `discover`, declared with `tier`, which the worker answers.
  async ran(tier: 'read' | 'act'): Promise<void> {
    const running = this.resources.operations.run(pluginId, {
      name: 'discover',
      params: {},
      caller: { person: true },
      tier,
    });

    const id = await vi.waitFor(() => this.lastRun());
    const result = { action: 'result', id, result: null } as const;

    this.resources.operations.receive(caller, result);
    await running;
  }

  private lastRun(): number {
    const last = this.sent.findLast((event) => event.type === 'operation');

    if (last?.type !== 'operation') throw new Error('No run sent');

    return last.id;
  }
}
