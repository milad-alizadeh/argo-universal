import type { ActivatedPlugin } from '../access/plugin-access';
import { PluginBackground } from '../data/plugin-background';
import { PluginData } from '../data/plugin-data';
import type { QueryServices } from '../data/query-types';
import type { PluginStatus } from '../protocol/runtime';
import { PluginSlotItems } from '../slots/plugin-slot-items';
import type { OpenView } from '../views/open-view';
import { PluginViews } from '../views/plugin-views';
import type { ViewLifecycle } from '../views/view-registry';
import { PluginFailures } from './failures';
import type { PluginLocation } from './plugin-location';
import { pluginIdentity } from './status';
import { ViewFailures } from './view-failures';

export class RuntimeResources {
  readonly failures = new PluginFailures();
  readonly views;
  readonly data;
  readonly background;
  readonly items;
  private readonly identities = new Map<
    string,
    ReturnType<typeof pluginIdentity>
  >();
  private readonly viewFailures = new ViewFailures(this.failures, (pluginId) =>
    this.identities.get(pluginId),
  );
  private readonly unwatch;
  private projectUpdates: Promise<void> = Promise.resolve();

  constructor(private readonly input: QueryServices) {
    this.views = new PluginViews(input.send, input.log, this.lifecycle());
    this.data = new PluginData(input, this.views);
    this.background = new PluginBackground({
      ...input,
      views: this.views,
      data: this.data,
    });
    this.items = new PluginSlotItems(input);
    input.services.onStorageWrite((id) => this.data.storageWritten(id));
    this.unwatch = input.services.watchProjects(() => this.projectsChanged());
  }

  private lifecycle(): ViewLifecycle {
    return {
      opened: (view) => this.data.opened(view.pluginId),
      released: (view, lastOfOpening) => this.releaseView(view, lastOfOpening),
      received: (view) => this.drew(view),
      failed: (view, message) => this.viewFailures.failed(view, message),
    };
  }

  private releaseView(view: OpenView, lastOfOpening: boolean): void {
    this.data.releaseView(view.opening.viewId);
    this.background.released(view.opening.viewId);
    this.viewFailures.released(view, lastOfOpening);
  }

  private drew(view: OpenView): void {
    this.viewFailures.drew(view);
    this.background.rendered(view.opening.viewId);
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
    this.items.activate(pluginId, generation);
  }

  // A worker that runs reopens its views, and lists ask it for their items.
  running(pluginId: string, generation: number): void {
    this.views.reopen(pluginId);
    this.items.running(pluginId, generation);
  }

  // A crash does not end a pass: it keeps its timer and activates the Plugin again next interval.
  changed(location: PluginLocation, status: PluginStatus): void {
    this.failures.update(pluginIdentity(location), status);
  }

  release(pluginId: string): void {
    this.views.invalidate(pluginId);
    this.data.release(pluginId);
    this.items.release(pluginId);
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
    this.unwatch();
    this.background.close();
    this.failures.close();
    this.data.badges.close();
    this.items.close();
    this.views.close();
  }
}
