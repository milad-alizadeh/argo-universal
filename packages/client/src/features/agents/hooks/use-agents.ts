import type { AgentInfo } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TRPCClientErrorLike } from '@trpc/client';
import { useTRPC } from '#features/connection';
import { useAgentChanges } from './use-configured-agents';

type AgentsQuery = UseQueryResult<AgentInfo[], TRPCClientErrorLike<AppRouter>>;

// Asks the Server to look for its Agents again, and stores what it finds as the Agents list.
function useRetryProbe(): { retry: () => void; retrying: boolean } {
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
export function useAgents(): AgentsQuery & {
  retry: () => void;
  retrying: boolean;
} {
  useAgentChanges();
  const agents = useQuery(useTRPC().agents.list.queryOptions());
  return { ...agents, ...useRetryProbe() };
}
