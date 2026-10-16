import type { ConfiguredAgent } from '@repo/contracts';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useTRPC, type ClientError } from '#features/connection';

export function useConfiguredAgents<Result = ConfiguredAgent[]>(
  select?: (agents: ConfiguredAgent[]) => Result,
): UseQueryResult<Result, ClientError> {
  return useQuery({ ...useTRPC().agents.configured.queryOptions(), select });
}
