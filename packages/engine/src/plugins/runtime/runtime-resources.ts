import type { ActivatedPlugin } from '../access/plugin-access';
import { PluginBackground } from '../data/plugin-background';
import { PluginData } from '../data/plugin-data';
import type { QueryServices } from '../data/query-types';
import type { PluginStatus } from '../protocol/runtime';
import type { OpenView } from '../views/open-view';
import { PluginViews } from '../views/plugin-views';
import type { ViewLifecycle } from '../views/view-registry';
import { PluginFailures } from './failures';
import type { PluginLocation } from './plugin-location';
import { pluginIdentity } from './status';

export class RuntimeResources {
  readonly failures = new PluginFailures();
  readonly views;
  readonly data;
  readonly background;
  private readonly identities = new Map<
    string,
    ReturnType<typeof pluginIdentity>
  >();
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
    input.services.onStorageWrite((id) => this.data.storageWritten(id));
    this.unwatch = input.services.watchProjects(() => this.projectsChanged());
  }

  private lifecycle(): ViewLifecycle {
    return {
      opened: (pluginId) => this.data.opened(pluginId),
      released: (viewId) => {
        this.data.releaseView(viewId);
        this.background.released(viewId);
      },
      received: (view) => this.drew(view),
      failed: (pluginId, message) => this.drawingFailed(pluginId, message),
    };
  }

  private drew(view: OpenView): void {
    this.failures.drew(view.pluginId);
    this.background.rendered(view.opening.viewId);
  }

  private drawingFailed(pluginId: string, message: string): void {
    const identity = this.identities.get(pluginId);

    if (identity) this.failures.drawing(identity, message);
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

  // A crash does not end a pass: it keeps its timer and activates the Plugin again next interval.
  changed(location: PluginLocation, status: PluginStatus): void {
    this.failures.update(pluginIdentity(location), status);
  }

  release(pluginId: string): void {
    this.views.invalidate(pluginId);
    this.data.release(pluginId);
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
    this.views.close();
  }
}
