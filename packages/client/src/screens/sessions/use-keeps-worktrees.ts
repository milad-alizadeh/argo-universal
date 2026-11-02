import type { ProjectsListOutput } from '@repo/contracts';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';

const keptBy = (
  projects: ProjectsListOutput | undefined,
  projectId: string | undefined,
): boolean =>
  projects?.find(({ id }) => id === projectId)?.deleteWorktreeOnArchive ===
  false;

function useAskedProjects(enabled: boolean): ProjectsListOutput | undefined {
  const trpc = useTRPC();

  return useQuery(trpc.project.list.queryOptions(undefined, { enabled })).data;
}

function useAskedProjectIds(
  sessionIds: readonly string[],
): (string | undefined)[] {
  const trpc = useTRPC();

  const queries = sessionIds.map((sessionId) =>
    trpc.session.get.queryOptions({ sessionId }),
  );

  return useQueries({ queries }).map(({ data }) => data?.projectId);
}

// Whether every Session the phones' alert asks about is in a Project that keeps worktrees. Until that is known, and for a mix, the alert warns of removal.
export function useKeepsWorktrees(
  sessionIds: readonly string[] | undefined,
): boolean {
  const asking = sessionIds ?? [];
  const projects = useAskedProjects(asking.length > 0);
  const projectIds = useAskedProjectIds(asking);

  return (
    asking.length > 0 &&
    projectIds.every((projectId) => keptBy(projects, projectId))
  );
}
