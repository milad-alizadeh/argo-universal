import { useCallback, useEffect, useMemo, useState } from '@argo/plugin-kit';
import { githubError } from './github-errors';
import type { TrackerClient } from './github-tracker';
import { openClient, type Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import { builtInFilters } from './issue-filters';

// The repository's labels and each counted filter's Issue count, by filter id.
export type Overview = { labels: string[]; counts: Record<string, number> };

type Shown = { projectId: string; overview: Overview | null; message: string };

export type OverviewState = Omit<Shown, 'projectId'> & {
  refresh: () => Promise<void>;
};

type Show = (change: Partial<Omit<Shown, 'projectId'>>) => void;

type OverviewSource = { deps: IssueDeps; project: Project; show: Show };

const nothing: Shown = { projectId: '', overview: null, message: '' };

type CacheKey = Parameters<IssueDeps['storage']['readCache']>[0];

const cacheKey = (project: Project): CacheKey => ({
  projectId: project.id,
  view: 'overview',
});

// A Project's filters to navigate by: the cached overview at once, then GitHub's, kept apart by Project.
export function useOverview(
  deps: IssueDeps,
  project: Project | undefined,
): OverviewState {
  const [shown, setShown] = useState(nothing);

  const source = useMemo(
    () => project && { deps, project, show: shower(setShown, project.id) },
    [deps, project],
  );

  const refresh = useRefresh(deps, source);

  useEffect(() => {
    if (source) void openOverview(source);
  }, [source]);

  return { ...(shown.projectId === project?.id ? shown : nothing), refresh };
}

// Loads again on a pull, and when an Issue's status changes on another page.
function useRefresh(
  deps: IssueDeps,
  source: OverviewSource | undefined,
): () => Promise<void> {
  const refresh = useCallback(async () => {
    if (source) await loadOverview(source);
  }, [source]);

  useEffect(
    () => deps.changes.subscribe(() => void refresh()),
    [deps, refresh],
  );

  return refresh;
}

// A change for one Project starts from nothing when another Project's overview is shown.
const shower =
  (
    setShown: (update: (shown: Shown) => Shown) => void,
    projectId: string,
  ): Show =>
  (change) =>
    setShown((shown) => ({
      ...(shown.projectId === projectId ? shown : { ...nothing, projectId }),
      ...change,
    }));

async function openOverview(source: OverviewSource): Promise<void> {
  const cached = await source.deps.storage.readCache<Overview>(
    cacheKey(source.project),
  );

  if (cached) source.show({ overview: cached });

  await loadOverview(source);
}

async function loadOverview({
  deps,
  project,
  show,
}: OverviewSource): Promise<void> {
  try {
    const client = await openClient({ project, ...deps });

    await client.authStatus();

    const overview = await fetchOverview(client);

    show({ overview, message: '' });
    await deps.storage.writeCache(cacheKey(project), overview);
  } catch (error) {
    show({ message: githubError(error) });
  }
}

async function fetchOverview(client: TrackerClient): Promise<Overview> {
  const [labels, counts] = await Promise.all([
    client.listLabels(),
    countFilters(client),
  ]);

  return { labels, counts };
}

// A count GitHub refuses, such as past its search rate limit, only leaves its row without one.
async function countFilters(
  client: TrackerClient,
): Promise<Overview['counts']> {
  const counted = builtInFilters().filter((filter) => filter.counted);

  const entries = await Promise.all(
    counted.map((filter) =>
      client.countIssues(filter.search).then(
        (count): [string, number][] => [[filter.id, count]],
        () => [],
      ),
    ),
  );

  return Object.fromEntries(entries.flat());
}
