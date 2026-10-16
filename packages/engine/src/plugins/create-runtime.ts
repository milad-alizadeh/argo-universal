import { writeLog } from '@repo/machine-log';
import { macKeychain, type Keychain } from './keychain';
import { PluginServices } from './plugin-services';
import { PluginRuntime } from './runtime';
import { PluginStorage } from './storage';

// The Plugin host and its Plugins log to `<home>/logs/plugins.log`; storage and secrets stay with each Plugin.
export const createPluginRuntime = (
  home: string,
  keychain: Keychain = macKeychain,
): PluginRuntime =>
  new PluginRuntime(
    (line) => writeLog({ home, label: 'plugins', line }),
    new PluginServices(new PluginStorage(home), keychain),
  );
