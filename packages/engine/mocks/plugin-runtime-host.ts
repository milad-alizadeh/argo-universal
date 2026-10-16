import { writeLog } from '@repo/machine-log';
import { onTestFinished } from 'vitest';
import { PluginRuntime } from '../src/plugins/runtime';

export function startPluginRuntime(home: string): PluginRuntime {
  const runtime = new PluginRuntime((line) =>
    writeLog({ home, label: 'plugins', line }),
  );

  onTestFinished(() => runtime.close());

  return runtime;
}
