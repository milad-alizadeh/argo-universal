import { useCallback, useMemo, useState } from '@argo/plugin-kit';
import { filterMessage, loadingIssues, pageSize } from './filter-shown';
import type { GitHubRead } from './github-api';
import { listQuery, mapIssueList, searchLimit } from './github-documents';
import type { Issue } from './github-issues';
import { githubRepositoryFromOrigin } from './github-repository';
import { useRecentStatuses } from './issue-changes';
import type { IssueDeps } from './issue-deps';
import type { IssueFilter } from './issue-filters';
import { noRemoteMessage, type Project } from './issue-project';
import { useGitHub } from './use-github';

export type FilterSource = {
  project: Project;
  filter: IssueFilter;
  deps: IssueDeps;
};

export type FilterIssues = {
  issues: Issue[];
  message: string;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
};

type FilterRead = {
  repository: string | null;
  read: GitHubRead<Issue[]>;
  refresh: () => Promise<void>;
};

function useFilterRead(
  { project, filter }: FilterSource,
  limit: number,
): FilterRead {
  const repository = githubRepositoryFromOrigin(project.originUrl);

  const query = useMemo(
    () => (repository ? listQuery(repository, filter.search, limit) : null),
    [repository, filter.search, limit],
  );

  const data = useGitHub({ projectId: project.id, query }, mapIssueList);

  return { repository, ...data };
}

// The Issues already shown stay on screen while a longer search loads.
function useLastIssues(read: GitHubRead<Issue[]>): Issue[] {
  const [last, setLast] = useState<Issue[]>([]);
  const current = read.kind === 'ok' ? read.value : last;

  if (current !== last) setLast(current);

  return current;
}

function useLimit(): [number, () => Promise<void>] {
  const [limit, setLimit] = useState(pageSize);

  const loadMore = useCallback(async (): Promise<void> => {
    setLimit((now) => Math.min(now + pageSize, searchLimit));
  }, []);

  return [limit, loadMore];
}

const hasMoreOf = (
  read: GitHubRead<Issue[]>,
  issues: Issue[],
  limit: number,
): boolean =>
  [read.kind === 'ok', issues.length >= limit, limit < searchLimit].every(
    Boolean,
  );

/*
 * One filter's Issues, newest first: a further page asks for a longer search, as a search has no cursor.
 */
export function useFilterIssues(source: FilterSource): FilterIssues {
  const [limit, loadMore] = useLimit();
  const { repository, read, refresh } = useFilterRead(source, limit);
  const recent = useRecentStatuses(source.deps.changes);
  const issues = useLastIssues(read).map((issue) => withRecent(issue, recent));

  return {
    issues,
    message: repository ? messageOf(read, issues) : noRemoteMessage,
    hasMore: hasMoreOf(read, issues, limit),
    loadMore,
    refresh,
  };
}

// A status changed on another page shows here before GitHub's next answer carries it.
const withRecent = (
  issue: Issue,
  recent: ReadonlyMap<number, Issue['status']>,
): Issue => ({ ...issue, status: recent.get(issue.number) ?? issue.status });

function messageOf(
  read: Parameters<typeof filterMessage>[0],
  issues: Issue[],
): string {
  const message = filterMessage(read);

  return message === loadingIssues && issues.length > 0 ? '' : message;
}
