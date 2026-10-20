import { writeLog } from '@repo/machine-log';
import { PluginAssets } from '../assets/plugin-assets';
import { macKeychain, type Keychain } from '../services/keychain';
import {
  PluginServices,
  type PluginServiceOptions,
} from '../services/plugin-services';
import { PluginStorage } from '../services/storage';
import { PluginRuntime } from './plugin-runtime';
import { runtimeClockSource } from './runtime-clock';

export type PluginRuntimeOptions = Omit<
  PluginServiceOptions,
  'log' | 'waiting' | 'assets' | 'clock'
> & { keychain?: Keychain; clockStart?: number };

type ServiceOptions = Omit<PluginServiceOptions, 'assets'> & {
  keychain?: Keychain;
};

export function createPluginRuntime(
  home: string,
  { clockStart, ...options }: PluginRuntimeOptions,
): PluginRuntime {
  const log = pluginLog(home);
  const clock = runtimeClockSource(clockStart);

  const services = createServices(home, {
    ...options,
    clock,
    log,
    waiting: (id, generation) => runtime.waiting(id, generation),
  });

  const runtime = new PluginRuntime(log, services, clock);

  return runtime;
}

function createServices(
  home: string,
  { keychain = macKeychain, ...options }: ServiceOptions,
): PluginServices {
  return new PluginServices(new PluginStorage(home), keychain, {
    ...options,
    assets: new PluginAssets(home),
  });
}

function pluginLog(home: string): (line: string) => void {
  return (line) => writeLog({ home, label: 'plugins', line });
}
