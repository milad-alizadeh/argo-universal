import { HostConnection } from './host-connection';
import { RuntimePlugin } from './runtime-plugin';
import {
  notStarted,
  type PluginEntry,
  type PluginStatus,
  type HostMessage,
} from './runtime-protocol';

type PluginLocation = { entry: Omit<PluginEntry, 'generation'>; dev: boolean };

export class PluginRuntime {
  private readonly plugins = new Map<string, RuntimePlugin>();
  private readonly host: HostConnection;
  private hostError: string | null = null;
  private closed = false;

  constructor(private readonly log: (line: string) => void) {
    this.host = new HostConnection({
      log,
      status: (message): void => this.update(message),
      crash: (message): void => this.crashed(message),
    });
  }

  status(pluginId: string): PluginStatus {
    return this.plugins.get(pluginId)?.status ?? notStarted;
  }

  error(): string | null {
    return this.hostError;
  }

  activate(location: PluginLocation): Promise<PluginStatus> {
    if (this.closed) throw new Error('Plugin runtime is closed');
    const { pluginId } = location.entry;
    let plugin = this.plugins.get(pluginId);

    if (!plugin) {
      plugin = new RuntimePlugin({
        ...location,
        host: this.host,
        log: this.log,
      });
      this.plugins.set(pluginId, plugin);
    }

    return plugin.activate();
  }

  async close(): Promise<void> {
    this.closed = true;
    await Promise.all(
      [...this.plugins.values()].map((plugin) => plugin.close()),
    );
    await this.host.close();
  }

  private update(message: Exclude<HostMessage, { type: 'ready' }>): void {
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
