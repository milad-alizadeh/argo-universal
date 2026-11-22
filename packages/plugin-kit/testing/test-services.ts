import { resolve } from 'node:path';
import {
  PluginService,
  type PluginRuntime,
  type PluginServiceDeps,
} from '@repo/engine/plugins';
import type { ConfiguredTest } from './test-configuration';

const unavailable = (): Promise<never> =>
  Promise.reject(new Error('Plugin settings are not available'));

// A Plugin's own tests turn nothing off unless they ask to; other settings reach the runtime through `settings`.
const managedEnablement = (): PluginServiceDeps['pluginSettings'] => {
  const off = new Set<string>();

  return {
    enabled: (pluginId) => !off.has(pluginId),
    setEnabled: async (pluginId, enabled) => {
      if (enabled) off.delete(pluginId);
      else off.add(pluginId);
    },
    values: unavailable,
    change: unavailable,
  };
};

export type ServiceParts = {
  runtime: PluginRuntime;
  accounts: PluginServiceDeps['pluginAccounts'];
};

export function serviceFor(
  home: string,
  options: ConfiguredTest,
  { runtime, accounts }: ServiceParts,
): PluginService {
  return new PluginService({
    home,
    version: options.version,
    firstPartyPluginsDirectory: resolve(options.directory),
    pluginRuntime: runtime,
    pluginSettings: managedEnablement(),
    pluginAccounts: accounts,
  });
}
