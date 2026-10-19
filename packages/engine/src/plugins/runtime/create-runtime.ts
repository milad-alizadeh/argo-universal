import { writeLog } from '@repo/machine-log';
import { PluginAssets } from '../assets/plugin-assets';
import { macKeychain, type Keychain } from '../services/keychain';
import type { PluginServiceOptions } from '../services/plugin-service-options';
import { PluginServices } from '../services/plugin-services';
import { PluginStorage } from '../services/storage';
import { PluginRuntime } from './plugin-runtime';

export type PluginRuntimeOptions = Omit<
  PluginServiceOptions,
  'log' | 'waiting' | 'assets'
> & {
  keychain?: Keychain;
  clockStart?: number;
};

type ServiceOptions = Omit<PluginServiceOptions, 'log' | 'assets'> & {
  keychain?: Keychain;
};

// The Plugin host and its Plugins log to `<home>/logs/plugins.log`; storage and secrets stay with each Plugin.
export const createPluginRuntime = (
  home: string,
  { clockStart, ...serviceOptions }: PluginRuntimeOptions,
): PluginRuntime => {
  const log = pluginLog(home);

  const runtime: PluginRuntime = new PluginRuntime(
    log,
    createServices(home, log, {
      ...serviceOptions,
      waiting: (pluginId, generation) => runtime.waiting(pluginId, generation),
    }),
    clockStart,
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

function pluginLog(home: string): (line: string) => void {
  return (line) => writeLog({ home, label: 'plugins', line });
}
