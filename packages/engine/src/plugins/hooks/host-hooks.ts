import type { PluginClock } from '../clock';
import type { HostConnection } from '../host/connection';
import { PluginHooks } from './plugin-hooks';

export function hostHooks(
  host: HostConnection,
  log: (line: string) => void,
  clock: PluginClock,
): PluginHooks {
  return new PluginHooks({
    log,
    clock,
    send: ({ pluginId, generation }, invocation): void =>
      host.hook({ pluginId, generation, ...invocation }),
  });
}
