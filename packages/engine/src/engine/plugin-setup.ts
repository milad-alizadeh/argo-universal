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
import { watchTurnActivity } from '../sessions';
import type { HttpServerOptions } from './http-server';

export type PluginSetup = {
  pluginRuntime: PluginRuntime;
  pluginSettings: PluginSettings;
  hookPort: HookPort;
  unwatchTurns: () => void;
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

  return connectPlugins(options, { pluginRuntime, pluginSettings, hookPort });
}

// Sessions reach Plugins through Hooks; dev Plugins reload only once every Turn has ended (ADR-0027).
function connectPlugins(
  options: HttpServerOptions,
  setup: Omit<PluginSetup, 'unwatchTurns'>,
): PluginSetup {
  attachHooks(options, setup);

  const unwatchTurns = watchTurnActivity(options.sessions, (active) => {
    void setup.pluginRuntime.turns.changed(active);
  });

  return { ...setup, unwatchTurns };
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

function attachHooks(
  options: HttpServerOptions,
  setup: Omit<PluginSetup, 'unwatchTurns'>,
): void {
  const plugins = new PluginService({ ...options, ...setup });

  setup.hookPort.attach({
    run: (name, event) => plugins.runHooks(name, event),
    log: (line) => writeLog({ home: options.home, label: 'plugins', line }),
  });
}

// Core answers alone again before the runtime closes.
export async function closePlugins(
  setup: Pick<PluginSetup, 'pluginRuntime' | 'hookPort' | 'unwatchTurns'>,
): Promise<void> {
  setup.unwatchTurns();
  setup.hookPort.detach();
  await setup.pluginRuntime.close();
}
