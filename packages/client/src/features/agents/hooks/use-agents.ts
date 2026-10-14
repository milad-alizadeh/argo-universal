import type { AgentInfo } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TRPCClientErrorLike } from '@trpc/client';
import { useTRPC } from '#features/connection';
import { useCatalogChanges } from './use-catalog-changes';

type AgentsQuery = UseQueryResult<AgentInfo[], TRPCClientErrorLike<AppRouter>>;

type RetryProbe = { retry: () => void; retrying: boolean };

// Asks the Server to look for its Agents again, and stores what it finds as the Agents list.
function useRetryProbe(): RetryProbe {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const retryProbe = useMutation({
    mutationFn: () =>
      queryClient.fetchQuery(
        trpc.agents.list.queryOptions({ refresh: true }, { staleTime: 0 }),
      ),
    onSuccess: (data) =>
      queryClient.setQueryData(trpc.agents.list.queryKey(), data),
  });

  return { retry: () => retryProbe.mutate(), retrying: retryProbe.isPending };
}

// `retrying` while the Server looks for its Agents again.
export function useAgents(): AgentsQuery & RetryProbe {
  const trpc = useTRPC();
  useCatalogChanges({ filter: trpc.agents.pathFilter() });
  const agents = useQuery(trpc.agents.list.queryOptions());

  return { ...agents, ...useRetryProbe() };
}
