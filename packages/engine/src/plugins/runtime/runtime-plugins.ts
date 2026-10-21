import type { PluginHooks } from '../hooks/plugin-hooks';
import type { HostConnection } from '../host/connection';
import {
  notStarted,
  type PluginStatus,
  type HostMessage,
} from '../protocol/runtime';
import { RuntimePlugin } from './plugin';
import type { RuntimePluginInput } from './plugin-input';
import {
  activatedPlugin,
  hookAllowance,
  type PluginLocation,
} from './plugin-location';
import type { RuntimeClock } from './runtime-clock';
import type { RuntimeResources } from './runtime-resources';
import { hostCrashLine } from './status';

type Dependencies = {
  host: HostConnection;
  hooks: PluginHooks;
  clock: RuntimeClock;
  resources: RuntimeResources;
  turnsRunning: () => boolean;
  log: (line: string) => void;
};

export class RuntimePlugins {
  private readonly plugins = new Map<string, RuntimePlugin>();
  private closed = false;

  constructor(private readonly input: Dependencies) {}

  values(): MapIterator<RuntimePlugin> {
    return this.plugins.values();
  }

  runningIds(): string[] {
    return this.plugins
      .entries()
      .filter(([, plugin]) => plugin.status.state === 'running')
      .map(([id]) => id)
      .toArray();
  }

  status(pluginId: string): PluginStatus {
    return this.plugins.get(pluginId)?.status ?? notStarted;
  }

  activate(location: PluginLocation): Promise<PluginStatus> {
    if (this.closed) throw new Error('Plugin runtime is closed');
    const { pluginId } = location.entry;
    const plugin = this.pluginFor(location);
    this.input.hooks.allow(pluginId, hookAllowance(location));
    const activated = plugin.activate(activatedPlugin(location));
    this.configureBackground(location);

    return activated;
  }

  private pluginFor(location: PluginLocation): RuntimePlugin {
    const existing = this.plugins.get(location.entry.pluginId);

    if (existing) return existing;
    const plugin = new RuntimePlugin(this.pluginInput(location));
    this.plugins.set(location.entry.pluginId, plugin);

    return plugin;
  }

  private configureBackground(location: PluginLocation): void {
    if (!location.background) return;
    this.input.resources.background.configure(
      location.entry.pluginId,
      location.background,
      () => this.requireRunning(location),
    );
  }

  // The pass owns the retry: its interval is the backoff, so a crash is not final.
  private async requireRunning(location: PluginLocation): Promise<void> {
    this.plugins.get(location.entry.pluginId)?.restartAfterCrash();

    requireStarted(await this.activate(location));
  }

  private pluginInput(location: PluginLocation): RuntimePluginInput {
    const { host, clock, resources, turnsRunning, log } = this.input;

    return {
      ...location,
      host,
      log,
      clockStart: () => clock.workerStart(),
      deferReload: turnsRunning,
      grant: (plugin, generation) =>
        resources.activate(location, plugin, generation),
      release: () => this.release(location.entry.pluginId),
      changed: (status) => resources.changed(location, status),
    };
  }

  private release(pluginId: string): void {
    this.input.resources.release(pluginId);
    this.input.hooks.release(pluginId);
  }

  async deactivate(pluginId: string): Promise<void> {
    this.input.resources.background.remove(pluginId);
    this.input.resources.failures.ended(pluginId);
    const plugin = this.plugins.get(pluginId);

    if (!plugin) return;
    this.plugins.delete(pluginId);
    this.input.resources.views.end(pluginId);
    await plugin.stop();
  }

  update({
    pluginId,
    generation,
    state,
    hanging,
    error,
  }: Extract<HostMessage, { type: 'status' }>): void {
    if (state === 'running') this.input.resources.views.reopen(pluginId);
    this.plugins.get(pluginId)?.update({ state, hanging, error }, generation);
  }

  crashed(message: string): void {
    this.input.log(hostCrashLine(message, this.plugins));

    for (const plugin of this.plugins.values()) plugin.hostCrashed(message);
  }

  async close(): Promise<void> {
    this.closed = true;
    await Promise.all(
      [...this.plugins.values()].map((plugin) => plugin.close()),
    );
  }
}

function requireStarted(status: PluginStatus): void {
  if (status.state !== 'running')
    throw new Error(status.error ?? 'Plugin did not start');
}
