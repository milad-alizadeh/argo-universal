import { discoverPlugins, type PluginsDeps } from './discovery/loader';

export async function isFirstPartyPlugin(
  deps: PluginsDeps,
  pluginId: string,
): Promise<boolean> {
  const { plugins } = await discoverPlugins(deps);

  return plugins.some(
    (plugin) => plugin.manifest.id === pluginId && plugin.firstParty,
  );
}
