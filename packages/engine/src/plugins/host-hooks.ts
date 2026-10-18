import { PluginHooks } from './hooks/plugin-hooks';
import type { HostConnection } from './host-connection';

export function hostHooks(
  host: HostConnection,
  log: (line: string) => void,
): PluginHooks {
  return new PluginHooks({
    log,
    send: ({ pluginId, generation }, invocation): void =>
      host.hook({ pluginId, generation, ...invocation }),
  });
}
