import type { ConfiguredAgent } from '@repo/contracts';
import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import {
  useTRPC,
  type ClientError,
  useResubscribeOnReconnect,
} from '#features/connection';

export function useAgentChanges(): void {
  const trpc = useTRPC(),
    cache = useQueryClient();
  const refresh = (): void => {
    void cache.invalidateQueries(trpc.agents.pathFilter());
  };
  const subscription = useSubscription(
    trpc.agents.catalogChanges.subscriptionOptions(undefined, {
      onStarted: refresh,
      onData: refresh,
    }),
  );
  useResubscribeOnReconnect(subscription);
}
export function useConfiguredAgents<Result = ConfiguredAgent[]>(
  select?: (agents: ConfiguredAgent[]) => Result,
): UseQueryResult<Result, ClientError> {
  useAgentChanges();
  return useQuery({ ...useTRPC().agents.configured.queryOptions(), select });
}
