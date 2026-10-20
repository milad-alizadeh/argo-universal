import { ProjectsBranchesInput } from '@repo/contracts';
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
import {
  readPluginProjects,
  readProjectPath,
  readProjectPaths,
  watchProjectChanges,
} from '../projects';
import { watchTurnActivity } from '../sessions';
import type { HttpServerOptions } from './http-server';

export type PluginSetup = {
  pluginRuntime: PluginRuntime;
  pluginSettings: PluginSettings;
  hookPort: HookPort;
  unwatchTurns: () => void;
};

// The Plugin runtime, with core's Hook events run through the Plugins that hook them, started on first use.
export function startPlugins(options: HttpServerOptions): Promise<PluginSetup> {
  const hookPort = options.hookPort ?? new HookPort();
  const keychain = options.keychain ?? macKeychain;
  const pluginSettings = settingsFor(options, keychain);

  const pluginRuntime = createPluginRuntime(options.home, {
    keychain,
    network: options.pluginNetwork,
    ...projectOptions(options),
    hooks: hookPort.hooks,
    settings: async (pluginId, key) => pluginSettings.read(pluginId, key),
  });

  return connectPlugins(options, { pluginRuntime, pluginSettings, hookPort });
}

function projectOptions(
  options: HttpServerOptions,
): Pick<
  Parameters<typeof createPluginRuntime>[1],
  'watchProjects' | 'projects' | 'projectInfo' | 'projectPath'
> {
  return {
    watchProjects: (changed) =>
      watchProjectChanges(options.database, changed, options.databaseWriter),
    projects: async () => readProjectPaths(options.database),
    projectInfo: async () => readPluginProjects(options.database),
    projectPath: async (projectId) => pluginProjectPath(options, projectId),
  };
}

function pluginProjectPath(
  options: HttpServerOptions,
  projectId: string,
): string {
  return readProjectPath(
    options.database,
    ProjectsBranchesInput.parse({ projectId }).projectId,
  );
}

// Sessions reach Plugins through Hooks; dev Plugins reload only once every Turn has ended (ADR-0027).
async function connectPlugins(
  options: HttpServerOptions,
  setup: Omit<PluginSetup, 'unwatchTurns'>,
): Promise<PluginSetup> {
  const plugins = attachHooks(options, setup);
  await startBackground(plugins, options.home);

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
): PluginService {
  const plugins = new PluginService({ ...options, ...setup });

  setup.hookPort.attach({
    run: (name, event) => plugins.runHooks(name, event),
    log: (line) => writeLog({ home: options.home, label: 'plugins', line }),
  });

  return plugins;
}

async function startBackground(
  plugins: PluginService,
  home: string,
): Promise<void> {
  await plugins.startBackground().catch((cause: unknown) =>
    writeLog({
      home,
      label: 'plugins',
      line: `Background Plugins failed: ${String(cause)}`,
    }),
  );
}

// Core answers alone again before the runtime closes.
export async function closePlugins(
  setup: Pick<PluginSetup, 'pluginRuntime' | 'hookPort' | 'unwatchTurns'>,
): Promise<void> {
  setup.unwatchTurns();
  setup.hookPort.detach();
  await setup.pluginRuntime.close();
}
