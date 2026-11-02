import { useMemo } from '@argo/plugin-kit';
import { overviewQuery, mapOverview, type Overview } from './github-documents';
import { githubRepositoryFromOrigin } from './github-repository';
import { noRemoteMessage, type Project } from './issue-project';
import {
  readMessage,
  signInNeed,
  useGitHub,
  type SignInNeed,
} from './use-github';

export type { Overview } from './github-documents';

export type OverviewState = {
  overview: Overview | null;
  message: string;
  refresh: () => Promise<void>;
  signIn: SignInNeed | null;
};

/*
 * A Project's filters to navigate by, and every count on them, from one GitHub call. A page opened again inside the
 * freshness window makes none.
 */
export function useOverview(project: Project | undefined): OverviewState {
  const repository = githubRepositoryFromOrigin(project?.originUrl);

  const query = useMemo(
    () => (repository ? overviewQuery(repository) : null),
    [repository],
  );

  const { read, refresh } = useGitHub(
    { projectId: project?.id ?? '', query },
    mapOverview,
  );

  return {
    overview: read.kind === 'ok' ? read.value : null,
    message: overviewMessage(project, repository, readMessage(read)),
    refresh,
    signIn: query ? signInNeed(read) : null,
  };
}

function overviewMessage(
  project: Project | undefined,
  repository: string | null,
  failure: string | undefined,
): string {
  if (project && !repository) return noRemoteMessage;

  return failure ?? '';
}
