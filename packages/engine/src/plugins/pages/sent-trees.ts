import type { WireNode } from '@repo/contracts/plugins/wire';
import type { WorkerCalls } from '../runtime/worker-calls';
import type { DrawAt } from './draw-calls';

type SentAt = { last: WireNode | undefined; keep: (root: WireNode) => void };

// Two Apps showing one address with different page counts share one entry, so each may get whole trees.
const sentKey = ({ pages: _pages, pull: _pull, ...address }: DrawAt): string =>
  JSON.stringify(address);

// The trees last sent for each address a Plugin drew, kept until its running generation ends (ADR-0050).
export class SentTrees {
  private readonly sent = new Map<string, Map<string, WireNode>>();

  public constructor(
    private readonly workers: Pick<WorkerCalls, 'generation'>,
  ) {}

  // The tree last sent for an address, and keeping the next; only while a generation runs, so a Plugin released mid-draw keeps nothing.
  public at(pluginId: string, address: DrawAt): SentAt {
    const key = sentKey(address);

    const keep = (root: WireNode): void => {
      if (this.workers.generation(pluginId) === undefined) return;

      const sent = this.sent.get(pluginId) ?? new Map<string, WireNode>();

      this.sent.set(pluginId, sent.set(key, root));
    };

    return { last: this.sent.get(pluginId)?.get(key), keep };
  }

  public forget(pluginId: string): void {
    this.sent.delete(pluginId);
  }
}
