import { useEffect } from '@argo/plugin-kit';
import {
  loadProjectIssues,
  type ProjectIssuesInput,
  type ProjectView,
} from './issue-data';

const millisecondsPerSecond = 1000;

const secondsPerMinute = 60;

const refreshDelayMinutes = 5;

const refreshInterval =
  refreshDelayMinutes * secondsPerMinute * millisecondsPerSecond;

type ViewSetters = Omit<ProjectView, 'active'>;

type ProjectSource = Pick<
  ProjectIssuesInput,
  'projects' | 'storage' | 'trackers'
> & { projectId: string | null };

export type ProjectIssuesHookInput = ProjectSource & ViewSetters;

type RefreshInput = ProjectIssuesHookInput & { projectId: string };

type StoppableView = ProjectView & { stop: () => void };

type Refresh = () => Promise<void>;

export function useProjectIssues(input: ProjectIssuesHookInput): void {
  const { projectId, projects, storage, trackers } = input;
  const { setIssues, setMessage, setTrackerId: setTracker } = input;

  useEffect(
    () =>
      startProjectRefresh(
        { projectId, projects, storage, trackers },
        { setIssues, setMessage, setTrackerId: setTracker },
      ),
    [projectId, projects, storage, trackers, setIssues, setMessage, setTracker],
  );
}

function startProjectRefresh(
  source: ProjectSource,
  setters: ViewSetters,
): (() => void) | undefined {
  resetProject(setters);

  const { projectId } = source;

  if (projectId === null) return;

  const view = createProjectView(setters);
  const refresh = createRefresh({ ...source, ...setters, projectId }, view);

  return scheduleRefresh(refresh, view);
}

function resetProject({ setIssues, setTrackerId }: ViewSetters): void {
  setIssues([]);
  setTrackerId(null);
}

function createProjectView(setters: ViewSetters): StoppableView {
  let active = true;

  return {
    active: () => active,
    stop: () => {
      active = false;
    },
    setIssues: setters.setIssues,
    setMessage: setters.setMessage,
    setTrackerId: setters.setTrackerId,
  };
}

function createRefresh(input: RefreshInput, view: ProjectView): Refresh {
  let refreshing = false;

  return async function refresh() {
    if (!view.active() || refreshing) return;

    refreshing = true;

    try {
      await loadProjectIssues({ ...input, view });
    } finally {
      refreshing = false;
    }
  };
}

function scheduleRefresh(refresh: Refresh, view: StoppableView): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  void refresh().finally(() => {
    if (view.active()) timer = setTimeout(refreshLater, refreshInterval);
  });

  return () => {
    view.stop();

    if (timer !== undefined) clearTimeout(timer);
  };

  function refreshLater(): void {
    void refresh().finally(() => {
      if (view.active()) timer = setTimeout(refreshLater, refreshInterval);
    });
  }
}
