import { writeLog } from '@repo/machine-log';
import { onTestFinished } from 'vitest';
import { PluginServices } from '../src/plugins/plugin-services';
import { PluginRuntime } from '../src/plugins/runtime';
import { PluginStorage } from '../src/plugins/storage';
import { MemoryKeychain } from './memory-keychain';

export function startPluginRuntime(home: string): PluginRuntime {
  const runtime = new PluginRuntime(
    (line) => writeLog({ home, label: 'plugins', line }),
    new PluginServices(new PluginStorage(home), new MemoryKeychain()),
  );

  onTestFinished(() => runtime.close());

  return runtime;
}
