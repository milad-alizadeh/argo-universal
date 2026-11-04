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

// One Plugin's sent trees by address, the least recently drawn forgotten past the cap.
class BoundedTrees {
  private readonly trees = new Map<string, WireNode>();

  public get(key: string): WireNode | undefined {
    return this.trees.get(key);
  }

  public put(key: string, root: WireNode): void {
    this.trees.delete(key);
    this.trees.set(key, root);

    const surplus = Math.max(0, this.trees.size - maxAddresses);

    for (const oldest of [...this.trees.keys()].slice(0, surplus))
      this.trees.delete(oldest);
  }
}

// The trees last sent for each address a Plugin drew, kept until its running generation ends (ADR-0050).
export class SentTrees {
  private readonly sent = new Map<string, BoundedTrees>();

  public constructor(
    private readonly workers: Pick<WorkerCalls, 'generation'>,
  ) {}

  // The tree last sent for an address, and keeping the next.
  public at({ pluginId, at }: DrawnFor): SentAt {
    const key = sentKey(at);

    return {
      last: this.sent.get(pluginId)?.get(key),
      keep: (root) => this.keep(pluginId, key, root),
    };
  }

  // Only while a generation runs, so a Plugin released mid-draw keeps nothing.
  private keep(pluginId: string, key: string, root: WireNode): void {
    if (this.workers.generation(pluginId) === undefined) return;

    const sent = this.sent.get(pluginId) ?? new BoundedTrees();

    sent.put(key, root);
    this.sent.set(pluginId, sent);
  }

  public forget(pluginId: string): void {
    this.sent.delete(pluginId);
  }
}
