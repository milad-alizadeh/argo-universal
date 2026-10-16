import type { PluginCapability } from '@repo/contracts/plugins';
import type { PluginFailure } from '@repo/contracts/plugins/runtime';
import { PluginFailures } from './failures';
import { HostConnection } from './host-connection';
import type { PluginServices } from './plugin-services';
import { RuntimePlugin } from './runtime-plugin';
import type { PluginReply } from './runtime-protocol';
import {
  notStarted,
  type PluginEntry,
  type PluginStatus,
  type HostMessage,
} from './runtime-protocol';
import { PluginViews } from './views';

type PluginLocation = {
  entry: Omit<PluginEntry, 'generation'>;
  dev: boolean;
  name?: string;
  // The manifest's declared Capabilities; without them the Plugin is granted nothing.
  capabilities?: readonly PluginCapability[];
};

export class PluginRuntime {
  private readonly failures = new PluginFailures();
  private readonly plugins = new Map<string, RuntimePlugin>();
  private readonly host: HostConnection;
  readonly views: PluginViews;
  private hostError: string | null = null;
  private closed = false;

  constructor(
    private readonly log: (line: string) => void,
    private readonly services: PluginServices,
  ) {
    this.views = new PluginViews((pluginId, event) =>
      this.host.event(pluginId, event),
    );
    this.host = new HostConnection(this.callbacks());
  }

  private callbacks(): ConstructorParameters<typeof HostConnection>[0] {
    return {
      log: this.log,
      call: (message): Promise<PluginReply> => this.answer(message),
      status: (message): void => this.update(message),
      crash: (message): void => this.crashed(message),
    };
  }

  private async answer(
    message: Extract<HostMessage, { type: 'call' }>,
  ): Promise<PluginReply> {
    const { pluginId, generation, request } = message;

    if (request.api !== 'view')
      return this.services.handle(pluginId, generation, request);
    this.views.receive(pluginId, request.path, request.message);

    return { ok: true };
  }

  status(pluginId: string): PluginStatus {
    return this.plugins.get(pluginId)?.status ?? notStarted;
  }

  error(): string | null {
    return this.hostError;
  }

  public watchFailures(signal: AbortSignal): AsyncGenerator<PluginFailure[]> {
    return this.failures.watch(signal);
  }

  activate(location: PluginLocation): Promise<PluginStatus> {
    if (this.closed) throw new Error('Plugin runtime is closed');
    const { pluginId } = location.entry;

    this.grant(location);
    let plugin = this.plugins.get(pluginId);

    if (!plugin) {
      plugin = this.createPlugin(location);
      this.plugins.set(pluginId, plugin);
    }

    return plugin.activate();
  }

  private grant({ entry, capabilities = [] }: PluginLocation): void {
    this.services.grant(entry.pluginId, {
      capabilities,
      codeFolder: entry.directory,
    });
  }

  private createPlugin(location: PluginLocation): RuntimePlugin {
    const identity = {
      pluginId: location.entry.pluginId,
      name: location.name ?? location.entry.pluginId,
    };

    return new RuntimePlugin({
      ...location,
      host: this.host,
      release: (): void => this.services.release(location.entry.pluginId),
      log: this.log,
      changed: (status): void => this.failures.update(identity, status),
    });
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
