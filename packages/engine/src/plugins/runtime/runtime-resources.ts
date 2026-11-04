import type { ActivatedPlugin } from '../access/plugin-access';
import { PluginBackground } from '../data/plugin-background';
import { PluginData } from '../data/plugin-data';
import type { QueryServices } from '../data/query-types';
import { PluginOperations } from '../operations';
import { PageChanges, PluginDraws } from '../pages';
import type { PluginStatus } from '../protocol/runtime';
import type { PluginServices } from '../services/plugin-services';
import { PluginSlotItems } from '../slots/plugin-slot-items';
import type { RuntimeCalls } from './calls';
import { PluginFailures } from './failures';
import type { PluginLocation } from './plugin-location';
import { pluginIdentity } from './status';
import { WorkerCalls, type WorkerTransport } from './worker-calls';

// What the runtime's resources are built from: the Queries' services, with the whole of the Plugin services and the send to a worker.
export type RuntimeInput = QueryServices &
  Pick<WorkerTransport, 'send'> & { services: PluginServices };

export class RuntimeResources {
  readonly data;
  readonly background;
  readonly items;
  readonly operations;
  readonly draws;
  // Hears each running worker's `argo.changed()` and Operations, and the addresses whose reads changed.
  readonly changes;
  private readonly workers;
  private readonly identities = new Map<
    string,
    ReturnType<typeof pluginIdentity>
  >();
  readonly failures = new PluginFailures((pluginId) =>
    this.identities.get(pluginId),
  );
  private readonly unwatch;
  private projectUpdates: Promise<void> = Promise.resolve();

  constructor(private readonly input: RuntimeInput) {
    this.workers = new WorkerCalls(input);
    this.data = this.pluginData(input);
    this.items = new PluginSlotItems(this.workers);
    this.operations = new PluginOperations(this.workers);
    this.changes = this.pageChanges();
    this.draws = this.pluginDraws(input);
    this.background = this.backgroundPasses(input);
    this.unwatch = this.watch(input);
  }

  // A write makes the Plugin's Queries due before its pages hear of it.
  private pageChanges(): PageChanges {
    return new PageChanges(this.workers, (pluginId): void =>
      this.data.written(pluginId),
    );
  }

  private pluginDraws(input: RuntimeInput): PluginDraws {
    return new PluginDraws({
      workers: this.workers,
      log: input.log,
      changes: this.changes,
      drawings: this.failures,
    });
  }

  // A Query answer that changed marks the Page addresses whose draws read it.
  private pluginData(input: QueryServices): PluginData {
    return new PluginData(input, this.workers, (pluginId, addresses) =>
      this.changes.heldChanged(pluginId, addresses),
    );
  }

  private backgroundPasses(input: QueryServices): PluginBackground {
    return new PluginBackground({
      ...input,
      draws: this.draws,
      projectRemoved: (projectId): void => this.projectRemoved(projectId),
    });
  }

  // `argo.changed()` and every Operation run reach pages and items Slots alike.
  private watch(input: RuntimeInput): Array<() => void> {
    input.services.onStorageWrite((id) => this.data.storageWritten(id));

    return [
      input.services.watchProjects(() => this.projectsChanged()),
      this.operations.onRan((pluginId) => this.changes.changedBy(pluginId)),
      this.changes.listen((pluginId, addresses) => {
        if (!addresses) this.items.changed(pluginId);
      }),
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
      this.input.services.projectInfo(),
      this.projectUpdates,
    ]).then(([projects]) =>
      this.background.syncProjects(projects.map(({ id }) => id)),
    );

    this.projectUpdates = updated.catch(() => {});

    return updated;
  }

  private projectsChanged(): void {
    void this.refreshProjects().catch((cause: unknown) =>
      this.input.log(`Plugin Project update failed: ${String(cause)}`),
    );
  }

  close(): void {
    for (const unwatch of this.unwatch) unwatch();
    this.background.close();
    this.failures.close();
    this.data.badges.close();
    this.workers.close();
    this.items.close();
  }
}
