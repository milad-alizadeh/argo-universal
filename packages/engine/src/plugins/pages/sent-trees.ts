import type { WireNode } from '@repo/contracts/plugins/wire';
import type { WorkerCalls } from '../runtime/worker-calls';
import type { DrawAt } from './draw-calls';
import type { DrawnFor } from './drawing-failures';

type SentAt = { last: WireNode | undefined; keep: (root: WireNode) => void };

// Two Apps showing one address with different page counts share one entry, so each may get whole trees.
const sentKey = ({ pages: _pages, pull: _pull, ...address }: DrawAt): string =>
  JSON.stringify(address);

// The most addresses a Plugin keeps a sent tree for; the least recently drawn goes first.
const maxAddresses = 100;

// The trees last sent for each address a Plugin drew, kept until its running generation ends (ADR-0050).
export class SentTrees {
  private readonly sent = new Map<string, Map<string, WireNode>>();

  public constructor(
    private readonly workers: Pick<WorkerCalls, 'generation'>,
  ) {}

  // The tree last sent for an address, and keeping the next; only while a generation runs, so a Plugin released mid-draw keeps nothing.
  public at({ pluginId, at }: DrawnFor): SentAt {
    const key = sentKey(at);

    const keep = (root: WireNode): void => {
      if (this.workers.generation(pluginId) === undefined) return;

      const sent = this.sent.get(pluginId) ?? new Map<string, WireNode>();

      sent.delete(key);
      sent.set(key, root);
      this.sent.set(pluginId, sent);

      for (const [oldest] of sent) {
        if (sent.size <= maxAddresses) break;
        sent.delete(oldest);
      }
    };

    return { last: this.sent.get(pluginId)?.get(key), keep };
  }

  public forget(pluginId: string): void {
    this.sent.delete(pluginId);
  }
}
