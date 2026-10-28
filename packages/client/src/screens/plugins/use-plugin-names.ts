import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTRPC } from '#features/connection';
import type { PluginOf, RowPlugin } from '#features/settings';
import { pluginSymbol } from '../../lib/product/plugin-symbol';

// A Plugin the list has not sent yet: its id, and the generic Plugin glyph.
const unknownPlugin = (pluginId: string): RowPlugin => ({
  name: pluginId,
  icon: pluginSymbol({}),
});

// Each Plugin's name and glyph from the connected Server's list; the id and a generic glyph until the list arrives.
export function usePluginOf(): PluginOf {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.plugins.list.queryOptions());

  return useMemo(() => {
    const plugins = new Map(
      (data?.plugins ?? []).map(({ manifest }) => [
        manifest.id,
        { name: manifest.name, icon: pluginSymbol(manifest.icon) },
      ]),
    );

    return (pluginId: string): RowPlugin =>
      plugins.get(pluginId) ?? unknownPlugin(pluginId);
  }, [data]);
}

export type NameOf = (pluginId: string) => string;

export function usePluginNames(): NameOf {
  const pluginOf = usePluginOf();

  return useMemo(() => (pluginId) => pluginOf(pluginId).name, [pluginOf]);
}
