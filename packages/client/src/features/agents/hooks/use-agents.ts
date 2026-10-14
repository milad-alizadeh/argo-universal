import type { AgentInfo } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TRPCClientErrorLike } from '@trpc/client';
import { useTRPC } from '#features/connection';
import { useErrorToast } from '#lib/generic/primitives/overlays/toast/toast';
import { useAgentChanges } from './use-configured-agents';

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
  useAgentChanges();
  const agents = useQuery(useTRPC().agents.list.queryOptions());

  return { ...agents, ...useRetryProbe() };
}

type Recheck = { run: () => void; pending: boolean };

// Checks one Agent's Readiness again; the list shows Checking… at once and the result when it lands.
export function useRecheck(agentId: string): Recheck {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries(trpc.agents.list.pathFilter());

  const recheck = useMutation(
    trpc.agents.recheck.mutationOptions({ onSettled: invalidate }),
  );

  useErrorToast(recheckFailure(recheck.error));

  return { run: () => recheck.mutate({ agentId }), pending: recheck.isPending };
}

const recheckFailure = (
  error: { message: string } | null,
): { title: string; message: string } | undefined =>
  error ? { title: 'Couldn’t recheck', message: error.message } : undefined;
