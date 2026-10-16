import type { PluginList } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import { type NavigationSection } from '../../lib/product/navigation/sections';

export interface PluginSection extends NavigationSection {
  pluginId: string;
  name: string;
  path: string;
  segments: string[];
}

const noPlugins: PluginList['plugins'] = [];

// Manifest contributions retain their order; the connected Server owns this list.
export function usePluginSections(): PluginSection[] {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.plugins.list.queryOptions());

  return (data?.plugins ?? noPlugins)
    .filter((plugin) => plugin.enabled)
    .flatMap(({ manifest }) => pluginSections(manifest));
}

function pluginSections(
  manifest: PluginList['plugins'][number]['manifest'],
): PluginSection[] {
  return manifest.contributes.nav.map((nav) => ({
    id: `plugins/${manifest.id}/${nav.id}`,
    pluginId: manifest.id,
    name: manifest.name,
    title: nav.title,
    icon: manifest.icon,
    path: nav.path,
    segments: [manifest.id, nav.id, ...nav.path.split('/').filter(Boolean)],
  }));
}
