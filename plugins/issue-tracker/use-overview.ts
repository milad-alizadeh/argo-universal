import { useCallback, useMemo } from '@argo/plugin-kit';
import { useReloadOnChange } from './issue-changes';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import {
  readOverview,
  requestOverview,
  type Overview,
} from './overview-requests';
import { useAsync, type Async, type Show } from './use-async';

export type { Overview } from './overview-requests';

export type OverviewState = {
  overview: Overview | null;
  message: string;
  refresh: () => Promise<void>;
};

type OverviewSource = { deps: IssueDeps; project: Project };

// A Project's filters to navigate by: the cached overview at once, then GitHub's, kept apart by Project.
export function useOverview(
  deps: IssueDeps,
  project: Project | undefined,
  shouldRefetch: boolean,
): OverviewState {
  const source = useOverviewSource(deps, project);
  const loaded = useFirstOverview(source, shouldRefetch);
  const refresh = useRefresh(source, loaded.reload);

  return {
    overview: loaded.value ?? null,
    message: loaded.error ?? '',
    refresh,
  };
}

const useOverviewSource = (
  deps: IssueDeps,
  project: Project | undefined,
): OverviewSource | undefined =>
  useMemo(() => project && { deps, project }, [deps, project]);

function useFirstOverview(
  source: OverviewSource | undefined,
  shouldRefetch: boolean,
): Async<Overview | null> {
  return useAsync(
    useCallback(
      (show) =>
        source
          ? openOverview(source, shouldRefetch, show)
          : Promise.resolve(null),
      [source, shouldRefetch],
    ),
  );
}

async function openOverview(
  { deps, project }: OverviewSource,
  shouldRefetch: boolean,
  show: Show<Overview | null>,
): Promise<Overview> {
  const cached = await readOverview(deps, project);

  if (!cached) return requestOverview(deps, project, shouldRefetch);

  show(cached);

  return shouldRefetch ? requestOverview(deps, project, shouldRefetch) : cached;
}

// Loads again on a pull, and when an Issue's status changes on another page.
function useRefresh(
  source: OverviewSource | undefined,
  reload: Async<Overview | null>['reload'],
): () => Promise<void> {
  const refresh = useCallback(async () => {
    if (source)
      await reload(() => requestOverview(source.deps, source.project, true));
  }, [source, reload]);

  useReloadOnChange(source?.deps.changes, refresh);

  return refresh;
}
