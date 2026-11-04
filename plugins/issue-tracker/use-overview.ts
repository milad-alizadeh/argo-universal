import { useData } from '@argo/plugin-kit';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import type { Overview } from './overview';

export type { Overview } from './overview';

export type OverviewState = {
  overview: Overview | null;
  message: string;
  refresh: () => Promise<void>;
};

const overviewOf = (
  deps: IssueDeps,
  project: Project | undefined,
): ReturnType<IssueDeps['overview']> | null =>
  project ? deps.overview({ projectId: project.id }) : null;

// A Project's filters to navigate by: the overview Argo keeps for the Project, read again on a pull.
export function useOverview(
  deps: IssueDeps,
  project: Project | undefined,
): OverviewState {
  const { data, error, refresh } = useData(overviewOf(deps, project));

  return { overview: data ?? null, message: error ?? '', refresh };
}
