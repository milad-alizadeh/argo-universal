import { useCallback, useMemo, useRef, useState } from '@argo/plugin-kit';
import { filterMessage, loadingIssues, pageSize } from './filter-shown';
import { listQuery, mapIssueList, searchLimit } from './github-documents';
import type { Issue } from './github-issues';
import { githubRepositoryFromOrigin } from './github-repository';
import { useRecentStatuses } from './issue-changes';
import type { IssueDeps } from './issue-deps';
import type { IssueFilter } from './issue-filters';
import { noRemoteMessage, type Project } from './issue-project';
import { signInNeed, useGitHub, type SignInNeed } from './use-github';

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
  signIn: SignInNeed | null;
};

/*
 * One filter's Issues, newest first: a further page asks for a longer search, as a search has no cursor, and the Issues
 * already shown stay on screen while it loads.
 */
export function useFilterIssues(source: FilterSource): FilterIssues {
  const { project, filter, deps } = source;
  const [limit, setLimit] = useState(pageSize);
  const repository = githubRepositoryFromOrigin(project.originUrl);

  const query = useMemo(
    () => (repository ? listQuery(repository, filter.search, limit) : null),
    [repository, filter.search, limit],
  );

  const { read, refresh } = useGitHub(
    { projectId: project.id, query },
    mapIssueList,
  );

  const shown = useRef<Issue[]>([]);
  const recent = useRecentStatuses(deps.changes);

  if (read.kind === 'ok') shown.current = read.value;

  const issues = shown.current.map((issue) => withRecent(issue, recent));

  const loadMore = useCallback(async (): Promise<void> => {
    setLimit((now) => Math.min(now + pageSize, searchLimit));
  }, []);

  return {
    issues,
    message: repository ? messageOf(read, issues) : noRemoteMessage,
    hasMore:
      read.kind === 'ok' && issues.length >= limit && limit < searchLimit,
    loadMore,
    refresh,
    signIn: query ? signInNeed(read) : null,
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
