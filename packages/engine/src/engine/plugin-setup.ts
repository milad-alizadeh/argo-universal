import { writeLog } from '@repo/machine-log';
import {
  createPluginRuntime,
  HookPort,
  PluginService,
  type PluginRuntime,
} from '../plugins';
import { readProjectPaths } from '../projects';
import type { HttpServerOptions } from './http-server';

export type PluginSetup = { pluginRuntime: PluginRuntime; hookPort: HookPort };

// The Plugin runtime, with core's Hook events run through the Plugins that hook them, started on first use.
export function startPlugins(options: HttpServerOptions): PluginSetup {
  const hookPort = options.hookPort ?? new HookPort();

  const pluginRuntime = createPluginRuntime(options.home, {
    keychain: options.keychain,
    network: options.pluginNetwork,
    projects: async () => readProjectPaths(options.database),
    hooks: hookPort.hooks,
  });

  attachHooks(options, { pluginRuntime, hookPort });

  return { pluginRuntime, hookPort };
}

function attachHooks(options: HttpServerOptions, setup: PluginSetup): void {
  const plugins = new PluginService({ ...options, ...setup });

  setup.hookPort.attach({
    run: (name, event) => plugins.runHooks(name, event),
    log: (line) => writeLog({ home: options.home, label: 'plugins', line }),
  });
}

// Core answers alone again before the runtime closes.
export async function closePlugins(setup: PluginSetup): Promise<void> {
  setup.hookPort.detach();
  await setup.pluginRuntime.close();
}
