import type { HostConnection } from '../host/connection';
import { PluginHooks } from './plugin-hooks';

export function hostHooks(
  host: HostConnection,
  log: (line: string) => void,
): PluginHooks {
  return new PluginHooks({
    log,
    discard: (pluginId, path): void =>
      host.event(pluginId, { type: 'discardRender', path }),
    send: ({ pluginId, generation }, invocation): void =>
      host.hook({ pluginId, generation, ...invocation }),
  });
}
