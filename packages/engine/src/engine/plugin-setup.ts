import { writeLog } from '@repo/machine-log';
import { HookPort, PluginService } from '../plugins';
import { watchTurnActivity } from '../sessions';
import type { HttpServerOptions } from './http-server';
import { startBackgroundPlugins } from './plugin-background';
import { createPluginParts } from './plugin-parts';

type PluginParts = ReturnType<typeof createPluginParts>;

type PluginRouterDeps = PluginParts & { hooks: HookPort['hooks'] };

// Engine owns the lifetime. This module owns Plugin assembly and the ordering of its finite operations.
export class EnginePlugins {
  private readonly hookPort;
  private readonly parts;
  private readonly plugins;
  private readonly unwatchTurns;
  private readonly home;
  private backgroundStarted?: Promise<void>;

  constructor(options: HttpServerOptions) {
    this.home = options.home;
    this.hookPort = options.hookPort ?? new HookPort();
    this.parts = createPluginParts(options, this.hookPort);
    this.plugins = attachHooks(options, this.parts, this.hookPort);
    this.unwatchTurns = watchTurnActivity(options.sessions, (active) => {
      this.parts.pluginRuntime.turns.changed(active);
    });
  }

  get router(): PluginRouterDeps {
    return { ...this.parts, hooks: this.hookPort.hooks };
  }

  readonly openAsset: PluginParts['pluginRuntime']['openAsset'] = (reference) =>
    this.parts.pluginRuntime.openAsset(reference);

  // Called after HTTP binds. Background work cannot delay readiness or start twice.
  listening(): void {
    this.backgroundStarted ??= startBackgroundPlugins(this.plugins, this.home);
  }

  async close(): Promise<void> {
    await this.backgroundStarted;
    this.unwatchTurns();
    this.hookPort.detach();
    await this.parts.pluginRuntime.close();
  }
}

function attachHooks(
  options: HttpServerOptions,
  parts: PluginParts,
  hookPort: HookPort,
): PluginService {
  const plugins = new PluginService({ ...options, ...parts });

  hookPort.attach({
    run: (name, event) => plugins.runHooks(name, event),
    log: (line) => writeLog({ home: options.home, label: 'plugins', line }),
  });

  return plugins;
}
