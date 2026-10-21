import { writeLog } from '@repo/machine-log';
import {
  HookPort,
  PluginService,
  type PluginSettings,
  type PluginAccounts,
  type PluginRuntime,
} from '../plugins';
import { watchTurnActivity } from '../sessions';
import type { HttpServerOptions } from './http-server';
import { createPluginParts } from './plugin-parts';

export type PluginSetup = {
  pluginAccounts: PluginAccounts;
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

  return connectPlugins(options, {
    ...createPluginParts(options, hookPort),
    hookPort,
  });
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

type PluginDeps = Pick<
  PluginSetup,
  'pluginRuntime' | 'pluginSettings' | 'pluginAccounts'
> & {
  hooks: HookPort['hooks'];
};

export const pluginRouterDeps = (setup: PluginSetup): PluginDeps => ({
  pluginAccounts: setup.pluginAccounts,
  pluginRuntime: setup.pluginRuntime,
  pluginSettings: setup.pluginSettings,
  hooks: setup.hookPort.hooks,
});
