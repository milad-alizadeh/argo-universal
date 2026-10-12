import type { ProjectInfo } from '@repo/contracts';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';

// The Server's Projects.
export function useProjects(): UseQueryResult<ProjectInfo[], unknown> {
  const trpc = useTRPC();
  return useQuery(trpc.projects.list.queryOptions());
}
