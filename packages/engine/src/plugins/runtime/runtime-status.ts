import type { PluginFailure } from '@repo/contracts/plugins/runtime';
import type { z } from 'zod';
import type { PluginLocation } from './plugin-location';
import type { RuntimePlugin } from './runtime-plugin';

type PluginIdentity = Pick<z.input<typeof PluginFailure>, 'pluginId' | 'name'>;

export function pluginIdentity(location: PluginLocation): PluginIdentity {
  return {
    pluginId: location.entry.pluginId,
    name: location.name ?? location.entry.pluginId,
  };
}

export function hostCrashLine(
  message: string,
  plugins: Iterable<[string, RuntimePlugin]>,
): string {
  const active = [...plugins].flatMap(([id, plugin]) =>
    plugin.status.state === 'running' ? [id] : [],
  );

  return `${message}; running Plugins: ${active.join(', ') || '(none)'}`;
}
