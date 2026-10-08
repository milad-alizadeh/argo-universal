import type { AgentInfo } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TRPCClientErrorLike } from '@trpc/client';
import { useTRPC } from '../trpc/context';

type AgentsQuery = UseQueryResult<AgentInfo[], TRPCClientErrorLike<AppRouter>>;

export function useAgents(): AgentsQuery & { retry: () => void } {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const agents = useQuery(trpc.agents.list.queryOptions());
  const retryProbe = useMutation({
    mutationFn: () =>
      queryClient.fetchQuery(
        trpc.agents.list.queryOptions({ refresh: true }, { staleTime: 0 }),
      ),
    onSuccess: (data) =>
      queryClient.setQueryData(trpc.agents.list.queryKey(), data),
  });
  return { ...agents, retry: () => retryProbe.mutate() };
}
