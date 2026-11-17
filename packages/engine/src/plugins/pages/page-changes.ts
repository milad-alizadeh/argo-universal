import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type { Caller, WorkerCalls } from '../runtime/worker-calls';

/*
 * Hears a Plugin's pages go stale: every one when a new worker runs, which names no addresses, or the
 * addresses whose last draw read a Query answer that changed.
 */
export type ChangeListener = (
  pluginId: string,
  addresses?: PageAddress[],
) => void;

// What a new worker makes due before anyone hears of it, so a page drawn again reads past it.
export type Written = (pluginId: string) => void;

// Where a Plugin's own changes go to be coalesced and settled, so each costs a refresh of what pages hold, not a wipe (ADR-0056).
export type Scoped = (pluginId: string) => void;

/*
 * A Plugin's changes as its pages hear them (ADR-0050, ADR-0056): `argo.changed()` from its running worker and each
 * of its act-tier Operations are handed on to be coalesced; only a worker that starts marks every page, and an
 * answer that changed marks the addresses that read it. A change from an ended worker is ignored.
 */
export class PageChanges {
  private readonly listeners = new Set<ChangeListener>();

  public constructor(
    private readonly workers: WorkerCalls,
    private readonly written: Written,
    private readonly scoped: Scoped,
  ) {}

  // The addresses whose last draw read a Query answer that has since changed.
  public heldChanged(pluginId: string, addresses: PageAddress[]): void {
    for (const listener of this.listeners) listener(pluginId, addresses);
  }

  // What one of the Plugin's act-tier Operations wrote, whoever ran it, changes it as `argo.changed()` does.
  public changedBy(pluginId: string): void {
    if (this.workers.generation(pluginId) !== undefined) this.scoped(pluginId);
  }

  // A new worker of the Plugin runs: what it kept in the App from the one before is stale.
  public restarted(pluginId: string): void {
    this.written(pluginId);

    for (const listener of this.listeners) listener(pluginId);
  }

  // A running worker's `argo.changed()`.
  public changed(caller: Caller): void {
    if (this.workers.current(caller)) this.scoped(caller.pluginId);
  }

  // The answer unsubscribes.
  public listen(listener: ChangeListener): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }
}
