import type { Foundations, PluginsOptions } from './assemble';
import { pluginLocation } from './located-plugins';
import { projectPorts } from './project-ports';
import { runtimePorts } from './runtime-ports';
import { createPluginRuntime } from './runtime/create-runtime';
import type { PluginLocation } from './runtime/plugin-location';
import type { PluginRuntime } from './runtime/plugin-runtime';

type FoundationPorts = Pick<
  Parameters<typeof createPluginRuntime>[1],
  | 'accounts'
  | 'secretStore'
  | 'heldSecrets'
  | 'hooks'
  | 'settings'
  | 'locate'
  | 'rebuilt'
>;

export function runtimeFor(
  options: PluginsOptions,
  parts: Foundations,
): PluginRuntime {
  return createPluginRuntime(options.home, {
    ...runtimePorts(options),
    ...projectPorts(options),
    ...foundationPorts(parts),
    watch: options.watchPlugins,
  });
}

function foundationPorts(parts: Foundations): FoundationPorts {
  return {
    accounts: parts.accounts,
    secretStore: parts.secretStore,
    heldSecrets: parts.heldSecrets,
    hooks: parts.hookPort.hooks,
    settings: async (pluginId, key) => parts.settings.read(pluginId, key),
    locate: locator(parts),
    // A dev build landing may come with a changed `plugin.json`.
    rebuilt: () => parts.discovery.located.clear(),
  };
}

// A sign-in wakes its account provider the way the service activates any Plugin.
function locator({
  discovery,
  settings,
}: Foundations): (pluginId: string) => Promise<PluginLocation> {
  return (pluginId) =>
    pluginLocation({ ...discovery, pluginSettings: settings }, pluginId);
}
