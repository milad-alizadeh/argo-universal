import type { ActivatedPlugin } from '../access/plugin-access';
import { PluginBackground } from '../data/plugin-background';
import { PluginData } from '../data/plugin-data';
import type { QueryServices } from '../data/query-types';
import { PluginOperations } from '../operations';
import { PluginDraws } from '../pages';
import type { PluginStatus } from '../protocol/runtime';
import type { PluginServices } from '../services/plugin-services';
import { PluginSlotItems } from '../slots/plugin-slot-items';
import type { OpenView } from '../views/open-view';
import { PluginViews } from '../views/plugin-views';
import type { ViewLifecycle } from '../views/view-registry';
import type { RuntimeCalls } from './calls';
import { PluginFailures } from './failures';
import type { PluginLocation } from './plugin-location';
import { pluginIdentity } from './status';
import { WorkerCalls } from './worker-calls';

// What the runtime's resources are built from: the Queries' services, with the whole of the Plugin services.
export type RuntimeInput = QueryServices & { services: PluginServices };

export class RuntimeResources {
  readonly views;
  readonly data;
  readonly background;
  readonly items;
  readonly operations;
  readonly draws;
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
    this.views = new PluginViews(input.send, input.log, this.lifecycle());
    this.workers = new WorkerCalls(input);
    this.data = this.pluginData(input);
    this.items = new PluginSlotItems(this.workers);
    this.operations = new PluginOperations(this.workers);
    this.draws = new PluginDraws(this.workers, input.log, (pluginId) =>
      this.data.written(pluginId),
    );
    this.background = this.backgroundPasses(input);
    this.unwatch = this.watch(input);
  }

  // A Query answer that changed marks the Page addresses whose draws read it.
  private pluginData(input: QueryServices): PluginData {
    return new PluginData(input, this.workers, (pluginId, addresses) =>
      this.draws.heldChanged(pluginId, addresses),
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
      this.operations.onRan((pluginId) => this.draws.changedBy(pluginId)),
      this.draws.onChanged((pluginId, addresses) => {
        if (!addresses) this.items.changed(pluginId);
      }),
    ];
  }

  // The resources that answer a worker's calls, with the Hooks and services it also reaches.
  calls(core: Pick<RuntimeCalls, 'hooks' | 'services'>): RuntimeCalls {
    const { views, data, items, operations, draws } = this;

    return { ...core, views, data, items, operations, draws };
  }

  private lifecycle(): ViewLifecycle {
    return {
      released: (view, lastOfOpening) => this.releaseView(view, lastOfOpening),
      received: (view) => this.markDrawn(view),
      failed: (view, message) => this.failures.failed(view, message),
    };
  }

  // A removed Project's open views and kept answers end with its passes.
  private projectRemoved(projectId: string): void {
    this.views.endProject(projectId);
    this.data.releaseProject(projectId);
  }

  private releaseView(view: OpenView, lastOfOpening: boolean): void {
    this.data.releaseView(view.opening.viewId);

    if (lastOfOpening) this.failures.clearDrawing(view);
  }

  private markDrawn(view: OpenView): void {
    this.failures.clearDrawing(view);
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

  // A worker that runs reopens its views, and lists ask it for their items.
  running(pluginId: string, generation: number): void {
    this.views.reopen(pluginId);
    this.workers.run(pluginId, generation);
  }

  // A crash does not end a pass: it keeps its timer and activates the Plugin again next interval.
  changed(location: PluginLocation, status: PluginStatus): void {
    this.failures.update(pluginIdentity(location), status);
  }

  release(pluginId: string): void {
    this.views.invalidate(pluginId);
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
    this.views.close();
  }
}
