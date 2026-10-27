import { writeLog } from '@repo/machine-log';
import { PluginAssets } from '../assets/plugin-assets';
import type { PluginClock } from '../clock';
import { macKeychain, type Keychain } from '../services/keychain';
import {
  PluginServices,
  type PluginServiceOptions,
} from '../services/plugin-services';
import { PluginStorage } from '../services/storage';
import type { PluginLocation } from './plugin-location';
import { PluginRuntime } from './plugin-runtime';
import { runtimeClockSource } from './test-control';

export type PluginRuntimeOptions = Omit<
  PluginServiceOptions,
  'log' | 'waiting' | 'wakePlugin' | 'assets' | 'clock'
> & {
  keychain?: Keychain;
  clockStart?: number;
  clock?: PluginClock;
  // Where an account provider is found, so a sign-in can wake it; without it, it must already run.
  locate?: (pluginId: string) => Promise<PluginLocation>;
};

type ServiceOptions = Omit<PluginServiceOptions, 'assets'> & {
  keychain?: Keychain;
};

export function createPluginRuntime(
  home: string,
  options: PluginRuntimeOptions,
): PluginRuntime {
  const { clockStart, locate, ...rest } = options;
  const log = pluginLog(home);
  const clock = options.clock ?? runtimeClockSource(clockStart);
  const back = reachBack(() => runtime, locate);
  const services = createServices(home, { ...rest, ...back, clock, log });
  const runtime = new PluginRuntime(log, services, clock);

  return runtime;
}

// The services reach back into the runtime they serve: to keep a Hook waiting, and to wake an account provider.
function reachBack(
  runtime: () => PluginRuntime,
  locate: PluginRuntimeOptions['locate'],
): Pick<PluginServiceOptions, 'waiting' | 'wakePlugin'> {
  return {
    waiting: (id, generation) => runtime().waiting(id, generation),
    wakePlugin: locate && ((id): Promise<void> => wake(runtime(), locate(id))),
  };
}

async function wake(
  runtime: PluginRuntime,
  location: Promise<PluginLocation>,
): Promise<void> {
  const status = await runtime.activate(await location);

  if (status.state !== 'running')
    throw new Error('Account provider is unavailable');
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
