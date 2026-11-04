import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type { Caller, WorkerCalls } from '../runtime/worker-calls';

/*
 * Hears a Plugin's pages go stale: every one after a write, which names no addresses, or the addresses
 * whose last draw read a Query answer that changed.
 */
export type ChangeListener = (
  pluginId: string,
  addresses?: PageAddress[],
) => void;

// What a write makes due before anyone hears of it, so a page drawn again reads past it.
export type Written = (pluginId: string) => void;

/*
 * A Plugin's changes as its pages hear them (ADR-0050): `argo.changed()` from its running worker, each of its
 * Operations, and the addresses whose read answer changed. A change from an ended worker is ignored.
 */
export class PageChanges {
  private readonly listeners = new Set<ChangeListener>();

  public constructor(
    private readonly workers: WorkerCalls,
    private readonly written: Written,
  ) {}

  // The addresses whose last draw read a Query answer that has since changed.
  public heldChanged(pluginId: string, addresses: PageAddress[]): void {
    for (const listener of this.listeners) listener(pluginId, addresses);
  }

  // What one of the Plugin's Operations wrote, whoever ran it, changes it as `argo.changed()` does.
  public changedBy(pluginId: string): void {
    if (this.workers.generation(pluginId) !== undefined) this.notify(pluginId);
  }

  // A running worker's `argo.changed()`.
  public changed(caller: Caller): void {
    if (this.workers.current(caller)) this.notify(caller.pluginId);
  }

  // The answer unsubscribes.
  public listen(listener: ChangeListener): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  private notify(pluginId: string): void {
    this.written(pluginId);

    for (const listener of this.listeners) listener(pluginId);
  }
}
