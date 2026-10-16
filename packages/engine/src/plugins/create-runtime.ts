import { writeLog } from '@repo/machine-log';
import { macKeychain, type Keychain } from './keychain';
import { PluginServices, type PluginServiceOptions } from './plugin-services';
import { PluginRuntime } from './runtime';
import { PluginStorage } from './storage';

export type PluginRuntimeOptions = Omit<PluginServiceOptions, 'log'> & {
  keychain?: Keychain;
};

// The Plugin host and its Plugins log to `<home>/logs/plugins.log`; storage and secrets stay with each Plugin.
export const createPluginRuntime = (
  home: string,
  { keychain = macKeychain, ...machine }: PluginRuntimeOptions,
): PluginRuntime => {
  const log = (line: string): void =>
    writeLog({ home, label: 'plugins', line });

  return new PluginRuntime(
    log,
    new PluginServices(new PluginStorage(home), keychain, { log, ...machine }),
  );
};
