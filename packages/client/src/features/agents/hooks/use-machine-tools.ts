import type { MachineTools } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useTRPC } from '#features/connection';
import { onForeground } from '../../../lib/generic/app-foreground';

export type MachineToolsLookup = {
  tools?: MachineTools;
  rechecking: boolean;
  // Looks for the tools again, as after installing one outside Argo.
  onRecheck: () => void;
};

// The tools on the Server's PATH, looked for again when the page mounts, the window regains focus or the App comes back.
export function useMachineTools(): MachineToolsLookup {
  const query = useQuery({
    ...useTRPC().agents.tools.queryOptions(),
    staleTime: 0,
    refetchOnWindowFocus: 'always',
  });

  const { refetch } = query;

  useEffect(() => onForeground(AppState, () => void refetch()), [refetch]);

  return {
    tools: query.data,
    rechecking: query.isFetching,
    onRecheck: () => void refetch(),
  };
}
