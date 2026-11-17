import type { PluginProjectInfo } from '@repo/contracts/plugins';
import { writeLog } from '@repo/machine-log';
import { onTestFinished } from 'vitest';
import { PluginAssets } from '../src/plugins/assets/plugin-assets';
import {
  PluginRuntime,
  type PluginBuilds,
} from '../src/plugins/runtime/plugin-runtime';
import {
  PluginServices,
  type PluginServiceOptions,
} from '../src/plugins/services/plugin-services';
import { PluginStorage } from '../src/plugins/services/storage';
import { MemorySecretStore } from './memory-secret-store';

export function startPluginRuntime(
  home: string,
  options: Pick<PluginServiceOptions, 'oauth' | 'clock'> = {},
  builds?: PluginBuilds,
): PluginRuntime {
  const log = (line: string): void =>
    writeLog({ home, label: 'plugins', line });

  const runtime = new PluginRuntime(
    log,
    pluginServices(home, options, log),
    options.clock,
    builds,
  );

  onTestFinished(() => runtime.close());

  return runtime;
}

const pluginServices = (
  home: string,
  options: Pick<PluginServiceOptions, 'oauth' | 'clock'>,
  log: (line: string) => void,
): PluginServices =>
  new PluginServices(new PluginStorage(home), new MemorySecretStore(), {
    ...options,
    log,
    assets: new PluginAssets(home),
    projects: async (): Promise<string[]> => [],
    projectInfo: async (): Promise<PluginProjectInfo[]> => [],
  });
