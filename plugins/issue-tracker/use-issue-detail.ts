import { useMemo } from '@argo/plugin-kit';
import type { GitHubRead } from './github-api';
import { issueQuery, mapIssueDetail } from './github-documents';
import type { Issue, IssueStatus } from './github-issues';
import { githubRepositoryFromOrigin } from './github-repository';
import type { IssueDeps } from './issue-deps';
import { noRemoteMessage, type Project } from './issue-project';
import {
  useAttachedSessions,
  type AttachedSession,
} from './use-attached-sessions';
import { readMessage, useGitHub } from './use-github';
import { useStatusChange } from './use-status-change';

export type DetailSource = {
  project: Project;
  number: number;
  deps: IssueDeps;
};

export type IssueDetailState = {
  // The Issue as far as it is known: the row's title and status at once, the whole Issue once GitHub answers.
  issue: Issue | null;
  // Whether `issue` is GitHub's own answer, or still only what the row said.
  settled: boolean;
  message: string;
  // The Sessions attached to this Issue; empty until they load, and when none are.
  sessions: AttachedSession[];
  // Shows the new status at once, and the old one again when GitHub refuses it.
  onStatus: (status: IssueStatus) => Promise<void>;
  refresh: () => Promise<void>;
};

type DetailRead = {
  repository: string | null;
  read: GitHubRead<Issue>;
  refresh: () => Promise<void>;
};

function useDetailRead({ project, number }: DetailSource): DetailRead {
  const repository = githubRepositoryFromOrigin(project.originUrl);

  const query = useMemo(
    () => (repository ? issueQuery(repository, number) : null),
    [repository, number],
  );

  const data = useGitHub({ projectId: project.id, query }, mapIssueDetail);

  return { repository, ...data };
}

const baseOf = (
  read: GitHubRead<Issue>,
  seed: Issue | undefined,
): Issue | undefined => (read.kind === 'ok' ? read.value : seed);

const withStatus = (
  issue: Issue | undefined,
  ...statuses: (IssueStatus | null | undefined)[]
): Issue | null =>
  issue ? { ...issue, status: statuses.find(Boolean) ?? issue.status } : null;

const messageOf = (
  repository: string | null,
  read: GitHubRead<Issue>,
): string => (repository ? (readMessage(read) ?? '') : noRemoteMessage);

const stateOf = ({
  read,
  repository,
  refresh,
}: DetailRead): Pick<IssueDetailState, 'settled' | 'message' | 'refresh'> => ({
  settled: read.kind === 'ok',
  message: messageOf(repository, read),
  refresh,
});

const issueOf = (
  { project, number, deps }: DetailSource,
  { read }: DetailRead,
  status: IssueStatus | null | undefined,
): Issue | null =>
  withStatus(baseOf(read, deps.seeds.of(project.id, number)), status);

export function useIssueDetail(source: DetailSource): IssueDetailState {
  const { project, number, deps } = source;
  const detail = useDetailRead(source);
  const { status, onStatus } = useStatusChange(source, detail);
  const sessions = useAttachedSessions(deps, project.id, number);
  const issue = issueOf(source, detail, status);

  return { ...stateOf(detail), issue, sessions, onStatus };
}
