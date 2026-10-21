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
  // Started once the port is bound, never awaited before it: a slow Plugin must not keep the Server off the air.
  startBackground: () => Promise<void>;
};

// What the runtime is built from, before watching Turns and starting background passes attach to it.
type PluginParts = Omit<PluginSetup, 'unwatchTurns' | 'startBackground'>;

// Shutdown waits for the start it kicked off, so a Plugin that never answers must not hold the Server open forever.
const backgroundStartLimitMs = 30000;

// The Plugin runtime, with core's Hook events run through the Plugins that hook them, started on first use.
export function startPlugins(options: HttpServerOptions): PluginSetup {
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
function connectPlugins(
  options: HttpServerOptions,
  setup: PluginParts,
): PluginSetup {
  const plugins = attachHooks(options, setup);

  const unwatchTurns = watchTurnActivity(options.sessions, (active) => {
    void setup.pluginRuntime.turns.changed(active);
  });

  return {
    ...setup,
    unwatchTurns,
    startBackground: () => startBackground(plugins, options.home),
  };
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
  setup: PluginParts,
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
  const line = await Promise.race([
    plugins.startBackground().then(
      () => null,
      (cause: unknown) => `Background Plugins failed: ${String(cause)}`,
    ),
    limit(
      `Background Plugins still starting after ${backgroundStartLimitMs} ms`,
    ),
  ]);

  if (line) reportBackground(home, line);
}

// Shutdown awaits this start long after it began, so even a failed log must not surface as a rejection.
function reportBackground(home: string, line: string): void {
  try {
    writeLog({ home, label: 'plugins', line });
  } catch (cause) {
    process.stderr.write(
      `Background Plugins could not be logged: ${String(cause)}\n`,
    );
  }
}

// The passes carry on starting after this resolves; only the wait for them ends.
function limit(line: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(line), backgroundStartLimitMs).unref();
  });
}

type ClosingPlugins = Pick<
  PluginSetup,
  'pluginRuntime' | 'hookPort' | 'unwatchTurns'
> & { backgroundStarted?: Promise<void> };

// Core answers alone again before the runtime closes, which waits for a background start still in flight.
export async function closePlugins(setup: ClosingPlugins): Promise<void> {
  await setup.backgroundStarted;
  setup.unwatchTurns();
  setup.hookPort.detach();
  await setup.pluginRuntime.close();
}
