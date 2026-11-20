import { writeLog } from '@repo/machine-log';
import { PluginAssets } from '../assets/plugin-assets';
import type { PluginClock } from '../clock';
import { HeldSecrets } from '../services/held-secrets';
import {
  PluginServices,
  type PluginServiceOptions,
} from '../services/plugin-services';
import { osSecretStore, type SecretStore } from '../services/secret-store';
import { PluginStorage } from '../services/storage';
import type { PluginLocation } from './plugin-location';
import { PluginRuntime } from './plugin-runtime';
import { buildsWithDefaults } from './runtime-setup';
import { runtimeClockSource } from './test-control';

export type PluginRuntimeOptions = Omit<
  PluginServiceOptions,
  'log' | 'waiting' | 'wakePlugin' | 'assets' | 'clock'
> & {
  secretStore?: SecretStore;
  clockStart?: number;
  clock?: PluginClock;
  // Where an account provider is found, so a sign-in can wake it; without it, it must already run.
  locate?: (pluginId: string) => Promise<PluginLocation>;
  // Told whenever a Plugin's dev build lands.
  rebuilt?: () => void;
  // Whether a Plugin's build watches its sources, as a dev Server's does; otherwise it builds once.
  watch?: boolean;
};

type ServiceOptions = Omit<PluginServiceOptions, 'assets'> & {
  secretStore?: SecretStore;
};

export function createPluginRuntime(
  home: string,
  options: PluginRuntimeOptions,
): PluginRuntime {
  const { clockStart, locate, rebuilt, watch, ...rest } = options;
  const held = heldLog(home, options);
  const clock = options.clock ?? runtimeClockSource(clockStart);
  const back = reachBack(() => runtime, locate);
  const services = createServices(home, { ...rest, ...back, ...held, clock });

  const runtime = new PluginRuntime(held.log, services, {
    clock,
    ...buildsWithDefaults({ rebuilt, watch }),
  });

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
  { secretStore = osSecretStore, ...options }: ServiceOptions,
): PluginServices {
  return new PluginServices(new PluginStorage(home), secretStore, {
    ...options,
    assets: new PluginAssets(home),
  });
}

type LogOptions = Pick<PluginRuntimeOptions, 'environment' | 'heldSecrets'>;

// The log never writes a held secret value (ADR-0051).
function heldLog(
  home: string,
  { environment = process.env, heldSecrets = new HeldSecrets() }: LogOptions,
): Required<Pick<PluginServiceOptions, 'heldSecrets' | 'log'>> {
  const trace = environment.ARGO_PLUGIN_TRACE === '1';
  const write = heldSecrets.scrubbing(pluginLog(home));

  return {
    heldSecrets,
    log: (line, level) => {
      if (level !== 'trace' || trace) write(line);
    },
  };
}

function pluginLog(home: string): (line: string) => void {
  return (line) => writeLog({ home, label: 'plugins', line });
}
