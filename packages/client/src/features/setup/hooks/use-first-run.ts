import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';

// The Server has said it has no Projects; while they load, or when the list fails, the window keeps its usual shell.
export function useFirstRun(): boolean {
  const projects = useQuery(useTRPC().projects.list.queryOptions());
  return projects.data?.length === 0;
}
