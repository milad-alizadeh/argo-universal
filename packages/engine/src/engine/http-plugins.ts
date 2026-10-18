import type { Database } from '@repo/db';
import {
  createPluginRuntime,
  macKeychain,
  pluginManifest,
  PluginSettings,
  type Keychain,
  type PluginNetwork,
  type PluginRuntime,
} from '../plugins';
import { readProjectPaths } from '../projects';
import type { WriterActorRef } from '../storage';

export type HttpPluginOptions = {
  home: string;
  version: string;
  database: Database;
  databaseWriter: WriterActorRef;
  firstPartyPluginsDirectory?: string;
  keychain?: Keychain;
  pluginNetwork?: PluginNetwork;
};

export type HttpPlugins = {
  pluginRuntime: PluginRuntime;
  pluginSettings: PluginSettings;
};

// The Plugin runtime and the settings it answers `argo.settings` from share one Keychain.
export function prepareHttpPlugins(options: HttpPluginOptions): HttpPlugins {
  const keychain = options.keychain ?? macKeychain;
  const pluginSettings = new PluginSettings({
    ...options,
    keychain,
    manifest: async (pluginId) => pluginManifest(options, pluginId),
  });

  return {
    pluginSettings,
    pluginRuntime: createPluginRuntime(options.home, {
      keychain,
      network: options.pluginNetwork,
      projects: async () => readProjectPaths(options.database),
      settings: async (pluginId, key) => pluginSettings.read(pluginId, key),
    }),
  };
}
