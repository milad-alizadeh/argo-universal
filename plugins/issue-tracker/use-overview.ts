import { useCallback, useEffect, useMemo, useState } from '@argo/plugin-kit';
import { githubError } from './github-errors';
import type { Project } from './issue-client';
import type { IssueDeps } from './issue-deps';
import {
  readOverview,
  requestOverview,
  type Overview,
} from './overview-requests';

export type { Overview } from './overview-requests';

type Shown = { projectId: string; overview: Overview | null; message: string };

export type OverviewState = Omit<Shown, 'projectId'> & {
  refresh: () => Promise<void>;
};

type Show = (change: Partial<Omit<Shown, 'projectId'>>) => void;

type SetShown = (update: (shown: Shown) => Shown) => void;

type OverviewSource = { deps: IssueDeps; project: Project; show: Show };

const nothing: Shown = { projectId: '', overview: null, message: '' };

// A Project's filters to navigate by: the cached overview at once, then GitHub's, kept apart by Project.
export function useOverview(
  deps: IssueDeps,
  project: Project | undefined,
  reload: boolean,
): OverviewState {
  const [shown, setShown] = useState(nothing);

  const source = useOverviewSource(deps, project, setShown);
  const refresh = useRefresh(deps, source);

  useEffect(() => {
    if (source) void openOverview(source, reload);
  }, [source, reload]);

  return currentOverview(shown, project?.id, refresh);
}

function useOverviewSource(
  deps: IssueDeps,
  project: Project | undefined,
  setShown: SetShown,
): OverviewSource | undefined {
  return useMemo(
    () => project && { deps, project, show: shower(setShown, project.id) },
    [deps, project, setShown],
  );
}

function currentOverview(
  shown: Shown,
  projectId: string | undefined,
  refresh: OverviewState['refresh'],
): OverviewState {
  return { ...(shown.projectId === projectId ? shown : nothing), refresh };
}

// Loads again on a pull, and when an Issue's status changes on another page.
function useRefresh(
  deps: IssueDeps,
  source: OverviewSource | undefined,
): () => Promise<void> {
  const refresh = useCallback(async () => {
    if (source) await loadOverview(source, true);
  }, [source]);

  useEffect(
    () => deps.changes.subscribe(() => void refresh()),
    [deps, refresh],
  );

  return refresh;
}

// A change for one Project starts from nothing when another Project's overview is shown.
const shower =
  (setShown: SetShown, projectId: string): Show =>
  (change) =>
    setShown((shown) => updatedOverview(shown, projectId, change));

function updatedOverview(
  shown: Shown,
  projectId: string,
  change: Parameters<Show>[0],
): Shown {
  const next = {
    ...(shown.projectId === projectId ? shown : { ...nothing, projectId }),
    ...change,
  };

  return sameOverview(shown, next) ? shown : next;
}

// Identical counts must not publish a new view revision during an Issue action.
function sameOverview(previous: Shown, next: Shown): boolean {
  return (
    next.projectId === previous.projectId &&
    next.message === previous.message &&
    JSON.stringify(next.overview) === JSON.stringify(previous.overview)
  );
}

async function openOverview(
  source: OverviewSource,
  reload: boolean,
): Promise<void> {
  const cached = await readOverview(source.deps, source.project);

  if (cached) {
    source.show({ overview: cached });

    if (!reload) return;
  }

  await loadOverview(source, reload);
}

async function loadOverview(
  { deps, project, show }: OverviewSource,
  reload: boolean,
): Promise<void> {
  try {
    const overview = await requestOverview(deps, project, reload);
    show({ overview, message: '' });
  } catch (error) {
    show({ message: githubError(error) });
  }
}
