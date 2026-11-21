import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type { Caller, WorkerCalls } from '../runtime/worker-calls';

/*
 * Hears a Plugin's pages go stale: every one when a new worker runs, which names no addresses, or the
 * addresses whose last draw read a Query answer that changed.
 */
export type ChangeListener = (
  pluginId: string,
  addresses?: PageAddress[],
  region?: string,
) => void;

// What a new worker makes due before anyone hears of it, so a page drawn again reads past it.
export type Written = (pluginId: string) => void;

// Where a Plugin's own changes go to be coalesced and settled, so each costs a refresh of what pages hold, not a wipe (ADR-0060).
export type Scoped = (pluginId: string) => void;

/*
 * A Plugin's changes as its pages hear them (ADR-0050, ADR-0060): `argo.changed()` from its running worker and each
 * of its act-tier Operations are handed on to be coalesced; only a worker that starts marks every page, and an
 * answer that changed marks the addresses that read it. A change from an ended worker is ignored.
 */
export class PageChanges {
  private readonly listeners = new Set<ChangeListener>();
  private readonly restarts = new Set<(pluginId: string) => void>();
  // The Draft region the Agent is writing, until the worker that follows has told the Apps (ADR-0057).
  private readonly regions = new Map<string, string>();

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

  // Every page of the Plugin may have changed: it names no addresses, and the Draft region being written when there is one.
  public allChanged(pluginId: string, region?: string): void {
    for (const listener of this.listeners) tell(listener, pluginId, { region });
  }

  // The worker a Draft swaps in next tells the Apps which region the Agent is writing; the answer ends that, as a Draft that swapped no worker does.
  public drawing(pluginId: string, region: string | undefined): () => void {
    if (region !== undefined) this.regions.set(pluginId, region);

    return (): void => void this.regions.delete(pluginId);
  }

  /*
   * A Setting changed: its pages draw again and read it, but no Query is due, since `argo.settings.get` is not one.
   */
  public settingChanged(pluginId: string): void {
    if (this.workers.generation(pluginId) === undefined) return;

    for (const listener of this.listeners) listener(pluginId);
  }

  // A new worker of the Plugin runs: what it kept in the App from the one before is stale.
  public restarted(pluginId: string): void {
    this.written(pluginId);
    this.allChanged(pluginId, this.regions.get(pluginId));
    this.regions.delete(pluginId);

    for (const listener of this.restarts) listener(pluginId);
  }

  // Hears each new worker of a Plugin; the answer unsubscribes.
  public onRestarted(listener: (pluginId: string) => void): () => void {
    this.restarts.add(listener);

    return () => this.restarts.delete(listener);
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

// What a listener is told of a Plugin's change: the addresses it names, and the Draft region being written.
function tell(
  listener: ChangeListener,
  pluginId: string,
  { addresses, region }: { addresses?: PageAddress[]; region?: string },
): void {
  listener(pluginId, addresses, region);
}
