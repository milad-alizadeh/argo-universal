import { useCallback, useEffect } from '@argo/plugin-kit';
import { githubError } from './github-errors';
import type { Issue } from './github-issues';
import { openClient, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import type { IssueFilter } from './issue-filters';
import { useAsync, type Async, type Show } from './use-async';

// Issues a page loads at a time, and again for each further page.
const pageSize = 30;

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

type Shown = { issues: Issue[]; limit: number };

const unloaded: Shown = { issues: [], limit: pageSize };

type CacheKey = Parameters<IssueDeps['storage']['readCache']>[0];

const cacheKey = ({ project, filter }: FilterSource): CacheKey => ({
  projectId: project.id,
  view: `filter:${filter.id}`,
});

/*
 * One filter's Issues, newest page first: the cached first page at once, then GitHub's. A further
 * page asks for a longer list, as gh has no cursor.
 */
export function useFilterIssues(source: FilterSource): FilterIssues {
  const { value, error, reload } = useFirstPage(source);
  const { issues, limit } = value ?? unloaded;
  const load = useLoad(source, reload);
  const refresh = useCallback(() => load(limit), [load, limit]);

  useReloadOnChange(source, refresh);

  return {
    issues,
    message: filterMessage(value, error),
    hasMore: issues.length >= limit,
    loadMore: () => load(limit + pageSize),
    refresh,
  };
}

function useFirstPage(source: FilterSource): Async<Shown> {
  return useAsync(
    useCallback(
      async (show) => {
        const key = cacheKey(source);
        const cached = await source.deps.storage.readCache<Issue[]>(key);

        if (cached) show({ issues: cached, limit: pageSize });

        return fetchIssues(source, pageSize, show);
      },
      [source],
    ),
  );
}

// Loads again with a longer or the same list, keeping the Issues on screen.
function useLoad(
  source: FilterSource,
  reload: Async<Shown>['reload'],
): (limit: number) => Promise<void> {
  return useCallback(
    (limit) => reload((show) => fetchIssues(source, limit, show)),
    [reload, source],
  );
}

function filterMessage(
  shown: Shown | undefined,
  error: string | undefined,
): string {
  if (error !== undefined) return githubError(error);

  return shown === undefined ? 'Loading Issues…' : '';
}

// An Issue whose status changed on its own page may have left this filter, or joined it.
function useReloadOnChange(
  source: FilterSource,
  reload: () => Promise<void>,
): void {
  useEffect(
    () => source.deps.changes.subscribe(() => void reload()),
    [source, reload],
  );
}

async function fetchIssues(
  source: FilterSource,
  limit: number,
  show: Show<Shown>,
): Promise<Shown> {
  const client = await openClient({ ...source, ...source.deps });
  const issues = await client.listIssues(source.filter.search, limit);
  const shown = { issues, limit };

  show(shown);
  await source.deps.storage.writeCache(
    cacheKey(source),
    issues.slice(0, pageSize),
  );

  return shown;
}
