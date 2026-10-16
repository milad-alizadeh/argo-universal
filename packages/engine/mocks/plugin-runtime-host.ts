import { writeLog } from '@repo/machine-log';
import { onTestFinished } from 'vitest';
import { PluginServices } from '../src/plugins/plugin-services';
import { PluginRuntime } from '../src/plugins/runtime';
import { PluginStorage } from '../src/plugins/storage';
import { MemoryKeychain } from './memory-keychain';

export function startPluginRuntime(home: string): PluginRuntime {
  const log = (line: string): void =>
    writeLog({ home, label: 'plugins', line });

  const runtime = new PluginRuntime(
    log,
    new PluginServices(new PluginStorage(home), new MemoryKeychain(), {
      log,
      projects: async (): Promise<string[]> => [],
    }),
  );

  onTestFinished(() => runtime.close());

  return runtime;
}
