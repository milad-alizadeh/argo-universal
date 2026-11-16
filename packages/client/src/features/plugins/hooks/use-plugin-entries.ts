import type { PluginList } from '@repo/contracts/plugins';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';

export type PluginEntry = PluginList['plugins'][number];

export interface PluginEntries {
  // Undefined until the Server has answered once.
  plugins: PluginEntry[] | undefined;
  isError: boolean;
}

// The connected Server's Plugins.
export function usePluginEntries(): PluginEntries {
  const { data, isError } = useQuery(useTRPC().plugin.list.queryOptions());

  return { plugins: data?.plugins, isError };
}
