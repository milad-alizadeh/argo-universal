import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTRPC } from '#features/connection';
import { pluginSymbol } from '../../lib/product/plugin-symbol';
import type { PluginIdentity, PluginLookup } from './slot-items';

// A Plugin the list has not sent yet: its id, and the generic Plugin glyph.
const unknownPlugin = (pluginId: string): PluginIdentity => ({
  name: pluginId,
  icon: pluginSymbol({}),
});

// Each Plugin's name and glyph from the connected Server's list; the id and a generic glyph until the list arrives.
export function usePluginLookup(): PluginLookup {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.plugin.list.queryOptions());

  return useMemo(() => {
    const plugins = new Map(
      (data?.plugins ?? []).map(({ manifest }) => [
        manifest.id,
        { name: manifest.name, icon: pluginSymbol(manifest.icon) },
      ]),
    );

    return (pluginId: string): PluginIdentity =>
      plugins.get(pluginId) ?? unknownPlugin(pluginId);
  }, [data]);
}

export type PluginNameLookup = (pluginId: string) => string;

export function usePluginNames(): PluginNameLookup {
  const lookup = usePluginLookup();

  return useMemo(() => (pluginId) => lookup(pluginId).name, [lookup]);
}
