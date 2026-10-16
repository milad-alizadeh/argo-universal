import type { AgentServer } from '@repo/contracts';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useTRPC, type ClientError } from '#features/connection';

export function useAgents(): UseQueryResult<AgentServer[], ClientError> {
  return useQuery({
    ...useTRPC().agents.servers.queryOptions(),
    select: (agents) =>
      [...agents].sort((a, b) => a.name.localeCompare(b.name)),
  });
}
