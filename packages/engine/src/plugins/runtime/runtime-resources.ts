import type { ActivatedPlugin } from '../access/plugin-access';
import type { PluginClock } from '../clock';
import { PluginData } from '../data/plugin-data';
import { PluginPasses } from '../data/plugin-passes';
import type { QueryServices } from '../data/query-types';
import { PluginOperations } from '../operations';
import { PluginDraws } from '../pages';
import { noRefusals, type Refusals } from '../pages/checked-tree';
import type { PluginStatus } from '../protocol/runtime';
import { PluginSlotItems } from '../slots/plugin-slot-items';
import type { RuntimeCalls } from './calls';
import { ChangeFlow } from './change-flow';
import { PluginFailures } from './failures';
import type { PluginLocation } from './plugin-location';
import { refusalsOf } from './plugin-refusals';
import type { ResourceServices } from './resource-services';
import { pluginIdentity } from './status';
import { WorkerCalls, type WorkerTransport } from './worker-calls';

// What the runtime's resources are built from: the Queries' services, with the whole of the Plugin services and the send to a worker.
export type RuntimeInput = QueryServices &
  Pick<WorkerTransport, 'send'> & {
    services: ResourceServices;
    // The clock a Plugin's changes are coalesced on; the real one unless a test turns its own (ADR-0060).
    changeClock?: PluginClock;
  };

export class RuntimeResources {
  readonly data;
  // The Background passes and the Watches.
  readonly passes;
  readonly items;
  readonly operations;
  readonly draws;
  // Hears each running worker's `argo.changed()` and Operations, and the addresses whose reads changed.
  readonly changes;
  private readonly flow;
  // The running workers, which the change flow and the Plugin's calls share.
  readonly workers;
  private readonly identities = new Map<
    string,
    ReturnType<typeof pluginIdentity>
  >();
  readonly failures = new PluginFailures((pluginId) =>
    this.identities.get(pluginId),
  );
  private readonly unwatch;
  // What the Server refuses in each Plugin's trees, from the manifest and Grants it was activated with.
  private readonly refusals = new Map<string, Refusals>();
  private projectUpdates: Promise<void> = Promise.resolve();

  constructor(private readonly input: RuntimeInput) {
    this.workers = new WorkerCalls(input);
    this.data = this.pluginData(input);
    this.items = new PluginSlotItems(this.workers, input.clock, this.data);
    this.operations = new PluginOperations(
      this.workers,
      input.services.heldSecrets,
    );
    this.flow = new ChangeFlow(input, this);
    this.changes = this.flow.changes;
    this.draws = this.pluginDraws(input);
    this.passes = this.backgroundPasses(input);
    this.unwatch = this.watch(input);
  }

  private pluginDraws(input: RuntimeInput): PluginDraws {
    return new PluginDraws({
      workers: this.workers,
      log: input.log,
      changes: this.changes,
      drawings: this.failures,
      refusals: (pluginId) => this.refusals.get(pluginId) ?? noRefusals,
    });
  }

  // A changed Query answer refreshes Slots and marks the pages that read it.
  private pluginData(input: QueryServices): PluginData {
    return new PluginData(input, this.workers, (pluginId, addresses) => {
      this.items.changed(pluginId);

      this.flow.answerChanged(pluginId, addresses);
    });
  }

  private backgroundPasses(input: QueryServices): PluginPasses {
    return new PluginPasses({
      ...input,
      draws: this.draws,
      projectRemoved: (projectId): void => this.projectRemoved(projectId),
    });
  }

  // `argo.changed()` and every act-tier Operation run reach pages and items Slots alike.
  private watch(input: RuntimeInput): Array<() => void> {
    input.services.onStorageWrite((id) => this.data.storageWritten(id));

    return [
      input.services.watchProjects(() => this.projectsChanged()),
      this.operations.onRan((pluginId) => this.changes.changedBy(pluginId)),
      this.changes.onRestarted((pluginId) => this.items.changed(pluginId)),
    ];
  }

  // The resources that answer a worker's calls, with the Hooks and services it also reaches.
  calls(core: Pick<RuntimeCalls, 'hooks' | 'services'>): RuntimeCalls {
    const { data, items, operations, draws } = this;

    return { ...core, data, items, operations, draws };
  }

  // A removed Project's kept answers end with its passes.
  private projectRemoved(projectId: string): void {
    this.data.releaseProject(projectId);
  }

  activate(
    location: PluginLocation,
    plugin: ActivatedPlugin,
    generation: number,
  ): void {
    const { pluginId } = location.entry;

    this.identities.set(pluginId, pluginIdentity(location));
    this.refusals.set(pluginId, refusalsOf(location, plugin));
    this.input.services.activate(pluginId, plugin);
    this.data.badges.allow(pluginId, generation, location.navIds ?? []);
  }

  // A worker that runs answers the calls held for it.
  running(pluginId: string, generation: number): void {
    this.workers.run(pluginId, generation);
    this.changes.restarted(pluginId);
  }

  // A crash does not end a pass: it keeps its timer and activates the Plugin again next interval.
  changed(location: PluginLocation, status: PluginStatus): void {
    this.failures.update(pluginIdentity(location), status);
  }

  release(pluginId: string): void {
    this.data.release(pluginId);
    this.workers.release(pluginId);
    this.input.services.release(pluginId);
  }

  async refreshProjects(): Promise<void> {
    const updated = Promise.all([
      this.input.services.projectIds(),
      this.projectUpdates,
    ]).then(([projects]) => this.passes.syncProjects(projects));

    this.projectUpdates = updated.catch(() => {});

    return updated;
  }

  private projectsChanged(): void {
    void this.refreshProjects().catch((cause: unknown) =>
      this.input.log(`Plugin Project update failed: ${String(cause)}`),
    );
  }

  changesSettled(): Promise<void> {
    return this.flow.settled();
  }

  close(): void {
    for (const unwatch of this.unwatch) unwatch();
    this.flow.close();
    this.passes.close();
    this.failures.close();
    this.data.badges.close();
    this.workers.close();
    this.items.close();
  }
}
