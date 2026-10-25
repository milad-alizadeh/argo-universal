import { resolve } from 'node:path';
import {
  PluginService,
  type PluginRuntime,
  type PluginServiceDeps,
} from '@repo/engine/plugins';
import type { ConfiguredTest } from './test-configuration';

const unavailable = (): Promise<never> =>
  Promise.reject(new Error('Plugin settings are not available'));

// A Plugin's own tests turn nothing off and hold no Accounts; settings reach the runtime through `settings`.
const unmanagedSettings: PluginServiceDeps['pluginSettings'] = {
  enabled: () => true,
  setEnabled: () =>
    Promise.reject(new Error('Plugin settings are not available')),
  values: unavailable,
  change: unavailable,
};

const noAccounts: PluginServiceDeps['pluginAccounts'] = {
  list: () => [],
  grants: () => [],
  removePlugin: () => Promise.resolve(),
};

export function serviceFor(
  home: string,
  options: ConfiguredTest,
  runtime: PluginRuntime,
): PluginService {
  return new PluginService({
    home,
    version: options.version,
    firstPartyPluginsDirectory: resolve(options.directory),
    pluginRuntime: runtime,
    pluginSettings: unmanagedSettings,
    pluginAccounts: noAccounts,
  });
}
