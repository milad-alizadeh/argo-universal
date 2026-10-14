import type { ConfiguredAgent } from '@repo/contracts';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useTRPC, type ClientError } from '#features/connection';
import { useCatalogChanges } from './use-catalog-changes';

export function useConfiguredAgents<Result = ConfiguredAgent[]>(
  select?: (agents: ConfiguredAgent[]) => Result,
): UseQueryResult<Result, ClientError> {
  const trpc = useTRPC();
  useCatalogChanges({ filter: trpc.agents.pathFilter() });

  return useQuery({ ...trpc.agents.configured.queryOptions(), select });
}
