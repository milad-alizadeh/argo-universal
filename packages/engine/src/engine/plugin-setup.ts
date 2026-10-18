import { writeLog } from '@repo/machine-log';
import {
  createPluginRuntime,
  HookPort,
  macKeychain,
  pluginManifest,
  PluginService,
  PluginSettings,
  type Keychain,
  type PluginRuntime,
} from '../plugins';
import { readPluginProjects, readProjectPaths } from '../projects';
import type { HttpServerOptions } from './http-server';

export type PluginSetup = {
  pluginRuntime: PluginRuntime;
  pluginSettings: PluginSettings;
  hookPort: HookPort;
};

// The Plugin runtime, with core's Hook events run through the Plugins that hook them, started on first use.
export function startPlugins(options: HttpServerOptions): PluginSetup {
  const hookPort = options.hookPort ?? new HookPort();
  const keychain = options.keychain ?? macKeychain;
  const pluginSettings = settingsFor(options, keychain);

  const pluginRuntime = createPluginRuntime(options.home, {
    keychain,
    network: options.pluginNetwork,
    projects: async () => readProjectPaths(options.database),
    projectInfo: async () => readPluginProjects(options.database),
    hooks: hookPort.hooks,
    settings: async (pluginId, key) => pluginSettings.read(pluginId, key),
  });

  attachHooks(options, { pluginRuntime, pluginSettings, hookPort });

  return { pluginRuntime, pluginSettings, hookPort };
}

// The runtime and the settings it answers `argo.settings` from share one Keychain.
function settingsFor(
  options: HttpServerOptions,
  keychain: Keychain,
): PluginSettings {
  return new PluginSettings({
    ...options,
    keychain,
    manifest: async (pluginId) => pluginManifest(options, pluginId),
  });
}

function attachHooks(options: HttpServerOptions, setup: PluginSetup): void {
  const plugins = new PluginService({ ...options, ...setup });

  setup.hookPort.attach({
    run: (name, event) => plugins.runHooks(name, event),
    log: (line) => writeLog({ home: options.home, label: 'plugins', line }),
  });
}

// Core answers alone again before the runtime closes.
export async function closePlugins(
  setup: Pick<PluginSetup, 'pluginRuntime' | 'hookPort'>,
): Promise<void> {
  setup.hookPort.detach();
  await setup.pluginRuntime.close();
}
