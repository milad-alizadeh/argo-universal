import type { PluginStatus } from '@repo/contracts/plugins/runtime';
import {
  requireRuntime,
  refuseTurnedOff,
  type LocatedPlugin,
  type PluginServiceDeps,
} from './located-plugins';

export function startPlugin(
  deps: PluginServiceDeps,
  { plugin, directory }: LocatedPlugin,
): Promise<PluginStatus> {
  const runtime = requireRuntime(deps);
  const { manifest } = plugin;
  refuseTurnedOff(deps, manifest.id);

  return runtime.activate({
    entry: { pluginId: manifest.id, directory, main: manifest.main },
    name: manifest.name,
    capabilities: manifest.capabilities ?? [],
    hooks: manifest.contributes.hooks ?? [],
  });
}

export type StartedPlugins = { running: string[]; stopped: string[] };

export async function startPlugins(
  deps: PluginServiceDeps,
  declaring: readonly LocatedPlugin[],
): Promise<StartedPlugins> {
  const isRunning = await Promise.all(
    declaring.map((located) => isStarted(deps, located)),
  );

  const pluginIds = declaring.map(({ plugin }) => plugin.manifest.id);

  return {
    running: pluginIds.filter((_, index) => isRunning[index]),
    stopped: pluginIds.filter((_, index) => !isRunning[index]),
  };
}

async function isStarted(
  deps: PluginServiceDeps,
  located: LocatedPlugin,
): Promise<boolean> {
  const status = await startPlugin(deps, located).catch(() => null);

  return status?.state === 'running';
}
