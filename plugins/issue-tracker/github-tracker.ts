import type { Argo } from '@argo/plugin-kit';
import { graphqlData, type GitHubRequest } from './github-api';
import { readIssues } from './github-attached';
import {
  issueQuery,
  listQuery,
  mapIssueDetail,
  mapIssueList,
  mapOverview,
  overviewQuery,
} from './github-documents';
import type { Issue, IssueStatus } from './github-issues';
import { setIssueStatus } from './github-write';
import type { Json } from './json';
import type { Overview } from './overview';

// Each list is a GitHub search, as `is:open label:bug`.
export type TrackerClient = {
  overview: () => Promise<Overview>;
  listIssues: (search: string, limit: number) => Promise<Issue[]>;
  getIssue: (number: number) => Promise<Issue>;
  // The Issues with these numbers that GitHub still has, read together; one that is gone is left out.
  getIssues: (numbers: readonly number[]) => Promise<Issue[]>;
  setStatus: (number: number, status: IssueStatus) => Promise<void>;
};

type Source = { projectId: string; repository: string };

type Read = (request: GitHubRequest) => Promise<Json>;

const readerOf =
  (fetch: Argo['fetch'], projectId: string): Read =>
  (request) =>
    graphqlData(fetch, projectId, request);

const readsOf = (
  read: Read,
  repository: string,
): Omit<TrackerClient, 'setStatus'> => ({
  overview: async () => mapOverview(await read(overviewQuery(repository))),
  listIssues: async (search, limit) =>
    mapIssueList(await read(listQuery(repository, search, limit))),
  getIssue: async (number) =>
    mapIssueDetail(await read(issueQuery(repository, number))),
  getIssues: (numbers) => readIssues(read, repository, numbers),
});

/*
 * The Tracker talks to GitHub only through `argo.fetch`, borrowing the Account the Project chose (ADR-0036); the
 * Plugin never holds a token. An unavailable Account or a rejected token is `SignInRequired`.
 */
export function createGitHubTracker(
  fetch: Argo['fetch'],
  { projectId, repository }: Source,
): TrackerClient {
  return {
    ...readsOf(readerOf(fetch, projectId), repository),
    setStatus: (number, status) =>
      setIssueStatus(fetch, { repository, number, status, projectId }),
  };
}
