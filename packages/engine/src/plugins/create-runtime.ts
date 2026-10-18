import { writeLog } from '@repo/machine-log';
import { PluginAssets } from './assets';
import { macKeychain, type Keychain } from './keychain';
import type { PluginServiceOptions } from './plugin-service-options';
import { PluginServices } from './plugin-services';
import { PluginRuntime } from './runtime';
import { PluginStorage } from './storage';

export type PluginRuntimeOptions = Omit<
  PluginServiceOptions,
  'log' | 'waiting' | 'assets'
> & {
  keychain?: Keychain;
};

type ServiceOptions = Omit<PluginServiceOptions, 'log' | 'assets'> & {
  keychain?: Keychain;
};

// The Plugin host and its Plugins log to `<home>/logs/plugins.log`; storage and secrets stay with each Plugin.
export const createPluginRuntime = (
  home: string,
  options: PluginRuntimeOptions,
): PluginRuntime => {
  const log = (line: string): void =>
    writeLog({ home, label: 'plugins', line });

  const runtime: PluginRuntime = new PluginRuntime(
    log,
    createServices(home, log, {
      ...options,
      waiting: (pluginId, generation) => runtime.waiting(pluginId, generation),
    }),
  );

  return runtime;
};

const createServices = (
  home: string,
  log: (line: string) => void,
  { keychain = macKeychain, ...machine }: ServiceOptions,
): PluginServices =>
  new PluginServices(new PluginStorage(home), keychain, {
    log,
    assets: new PluginAssets(home),
    ...machine,
  });
