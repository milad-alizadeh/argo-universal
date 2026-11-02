import { useMemo } from '@argo/plugin-kit';
import type { GitHubRead } from './github-api';
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

type OverviewRead = {
  repository: string | null;
  query: ReturnType<typeof overviewQuery> | null;
  read: GitHubRead<Overview>;
  refresh: () => Promise<void>;
};

const repositoryOf = (project: Project | undefined): string | null =>
  githubRepositoryFromOrigin(project?.originUrl);

const projectIdOf = (project: Project | undefined): string => project?.id ?? '';

function useOverviewRead(project: Project | undefined): OverviewRead {
  const repository = repositoryOf(project);

  const query = useMemo(
    () => (repository ? overviewQuery(repository) : null),
    [repository],
  );

  const projectId = projectIdOf(project);
  const data = useGitHub({ projectId, query }, mapOverview);

  return { repository, query, ...data };
}

/*
 * A Project's filters to navigate by, and every count on them, from one GitHub call. A page opened again inside the
 * freshness window makes none.
 */
export function useOverview(project: Project | undefined): OverviewState {
  const { repository, query, read, refresh } = useOverviewRead(project);

  return {
    overview: read.kind === 'ok' ? read.value : null,
    message: overviewMessage(project, repository, readMessage(read)),
    refresh,
    signIn: query ? signInNeed(read) : null,
  };
}

const lacksRemote = (
  project: Project | undefined,
  repository: string | null,
): boolean => Boolean(project) && !repository;

const overviewMessage = (
  project: Project | undefined,
  repository: string | null,
  failure: string | undefined,
): string =>
  lacksRemote(project, repository) ? noRemoteMessage : (failure ?? '');
