import type { PluginFailure } from '@repo/contracts/plugins/runtime';
import { PluginFailures } from './failures';
import { keepWaiting } from './hooks/keep-waiting';
import type { PluginHooks } from './hooks/plugin-hooks';
import { HostConnection } from './host-connection';
import { hostHooks } from './host-hooks';
import {
  activatedPlugin,
  hookAllowance,
  type PluginLocation,
} from './plugin-location';
import type { PluginServices } from './plugin-services';
import { oncePerRenderFallback, renderFallbackLine } from './render-fallback';
import { answerPluginCall } from './runtime-calls';
import { RuntimePlugin } from './runtime-plugin';
import type { PluginReply } from './runtime-protocol';
import {
  notStarted,
  type PluginStatus,
  type HostMessage,
} from './runtime-protocol';
import { PluginViews } from './views';

export class PluginRuntime {
  private readonly failures = new PluginFailures();
  private readonly plugins = new Map<string, RuntimePlugin>();
  private readonly host: HostConnection;
  readonly views: PluginViews;
  readonly hooks: PluginHooks;
  private hostError: string | null = null;
  private closed = false;

  constructor(
    private readonly log: (line: string) => void,
    private readonly services: PluginServices,
  ) {
    this.log = oncePerRenderFallback(log);
    this.views = new PluginViews(
      (pluginId, event) => this.host.event(pluginId, event),
      this.log,
    );
    this.host = new HostConnection(this.callbacks());
    this.hooks = hostHooks(this.host, this.log);
  }

  public renderFallback(
    pluginId: string,
    slotId: string,
    reason: string,
  ): void {
    this.log(renderFallbackLine(pluginId, slotId, reason));
  }

  private callbacks(): ConstructorParameters<typeof HostConnection>[0] {
    return {
      log: this.log,
      call: (message): Promise<PluginReply> =>
        answerPluginCall(
          { hooks: this.hooks, services: this.services, views: this.views },
          message,
        ),
      status: (message): void => this.update(message),
      crash: (message): void => this.crashed(message),
    };
  }

  waiting(pluginId: string, generation: number): () => void {
    return keepWaiting((command) => this.host.tell(command), {
      pluginId,
      generation,
    });
  }

  status(pluginId: string): PluginStatus {
    return this.plugins.get(pluginId)?.status ?? notStarted;
  }

  public readonly openAsset: PluginServices['openAsset'] = (reference) =>
    this.services.openAsset(reference);

  error(): string | null {
    return this.hostError;
  }

  public watchFailures(signal: AbortSignal): AsyncGenerator<PluginFailure[]> {
    return this.failures.watch(signal);
  }

  activate(location: PluginLocation): Promise<PluginStatus> {
    if (this.closed) throw new Error('Plugin runtime is closed');
    const { pluginId } = location.entry;

    let plugin = this.plugins.get(pluginId);

    if (!plugin) {
      plugin = this.createPlugin(location);
      this.plugins.set(pluginId, plugin);
    }

    this.hooks.allow(pluginId, hookAllowance(location));

    return plugin.activate(activatedPlugin(location));
  }

  // A Plugin turned off loses its worker and its build; activating it later starts both afresh.
  async deactivate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) return;
    this.plugins.delete(pluginId);
    this.views.end(pluginId);
    await plugin.stop();
  }

  private createPlugin(location: PluginLocation): RuntimePlugin {
    const identity = {
      pluginId: location.entry.pluginId,
      name: location.name ?? location.entry.pluginId,
    };

    return new RuntimePlugin({
      ...location,
      host: this.host,
      grant: (plugin): void =>
        this.services.activate(location.entry.pluginId, plugin),
      release: (): void => this.release(location.entry.pluginId),
      log: this.log,
      changed: (status): void => this.failures.update(identity, status),
    });
  }

  // Reload, turning off and a crash end the Plugin's resources and its Hooks.
  private release(pluginId: string): void {
    this.views.invalidate(pluginId);
    this.services.release(pluginId);
    this.hooks.release(pluginId);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.failures.close();
    this.views.close();
    await Promise.all(
      [...this.plugins.values()].map((plugin) => plugin.close()),
    );
    await this.host.close();
    this.services.close();
  }

  private update(message: Extract<HostMessage, { type: 'status' }>): void {
    if (message.state === 'running') this.views.reopen(message.pluginId);
    this.plugins.get(message.pluginId)?.update(
      {
        state: message.state,
        hanging: message.hanging,
        error: message.error,
      },
      message.generation,
    );
  }

  private crashed(message: string): void {
    this.hostError = message;

    const active = [...this.plugins].filter(
      ([, plugin]) => plugin.status.state === 'running',
    );

    this.log(
      `${message}; running Plugins: ${active.map(([id]) => id).join(', ') || '(none)'}`,
    );

    for (const plugin of this.plugins.values()) plugin.hostCrashed(message);
  }
}
