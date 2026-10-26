import { useCallback, useEffect, useState } from '@argo/plugin-kit';
import { githubError } from './github-errors';
import type { Issue } from './github-issues';
import { openClient, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import type { IssueFilter } from './issue-filters';

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

type Shown = { issues: Issue[] | null; limit: number };

const unloaded: Shown = { issues: null, limit: pageSize };

type Setters = {
  setShown: (shown: Shown) => void;
  setMessage: (message: string) => void;
};

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
  const [shown, setShown] = useState(unloaded);
  const [message, setMessage] = useState('Loading Issues…');

  const load = useCallback(
    (next: number) => loadIssues(source, { setShown, setMessage }, next),
    [source],
  );

  useEffect(() => {
    void openIssues(source, { setShown, setMessage });
  }, [source]);
  useReloadOnChange(source, () => load(shown.limit));

  return filterIssues(shown, message, load);
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

function filterIssues(
  { issues, limit }: Shown,
  message: string,
  load: (limit: number) => Promise<void>,
): FilterIssues {
  const loaded = issues ?? [];

  return {
    issues: loaded,
    message,
    hasMore: loaded.length >= limit,
    loadMore: () => load(limit + pageSize),
    refresh: () => load(limit),
  };
}

async function openIssues(
  source: FilterSource,
  setters: Setters,
): Promise<void> {
  const cached = await source.deps.storage.readCache<Issue[]>(cacheKey(source));

  if (cached) setters.setShown({ issues: cached, limit: pageSize });

  await loadIssues(source, setters, pageSize);
}

async function loadIssues(
  source: FilterSource,
  setters: Setters,
  limit: number,
): Promise<void> {
  try {
    const client = await openClient({ ...source, ...source.deps });
    const issues = await client.listIssues(source.filter.search, limit);

    setters.setShown({ issues, limit });
    setters.setMessage('');
    await saveFirstPage(source, issues);
  } catch (error) {
    setters.setMessage(githubError(error));
  }
}

const saveFirstPage = (source: FilterSource, issues: Issue[]): Promise<void> =>
  source.deps.storage.writeCache(cacheKey(source), issues.slice(0, pageSize));
