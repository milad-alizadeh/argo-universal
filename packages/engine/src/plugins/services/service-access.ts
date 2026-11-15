import { CapabilityRefusal } from '../access/capability-refusal';
import { PluginAccess, type ActivatedPlugin } from '../access/plugin-access';
import type { PluginServiceOptions } from './plugin-services';
import type { PluginStorage } from './storage';

type AccessInput = {
  pluginId: string;
  plugin: ActivatedPlugin | undefined;
  storage: PluginStorage;
  options: PluginServiceOptions;
};

export function serviceAccess({
  pluginId,
  plugin,
  storage,
  options,
}: AccessInput): PluginAccess {
  // A call can still arrive while the Plugin stops; refuse it as stopped, not as an undeclared Capability.
  if (!plugin) throw new CapabilityRefusal('Plugin is stopped');

  return new PluginAccess({
    ...plugin,
    dataFolder: storage.folderOf(pluginId),
    projects: options.projects,
    environment: options.environment,
  });
}
