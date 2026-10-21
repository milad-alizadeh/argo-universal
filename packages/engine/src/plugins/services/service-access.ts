import {
  PluginAccess,
  type ActivatedPlugin,
  type AccessScope,
} from '../access/plugin-access';
import type { PluginServiceOptions } from './plugin-services';
import type { PluginStorage } from './storage';

const notActivated: Pick<AccessScope, 'grants' | 'codeFolder'> = {
  grants: [],
  codeFolder: null,
};

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
  return new PluginAccess({
    ...(plugin ?? notActivated),
    dataFolder: storage.folderOf(pluginId),
    projects: options.projects,
    environment: options.environment,
  });
}
