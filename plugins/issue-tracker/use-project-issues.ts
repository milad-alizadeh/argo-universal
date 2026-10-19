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

export type ProjectIssuesHookInput = Pick<
  ProjectIssuesInput,
  'projects' | 'storage' | 'trackers'
> &
  ViewSetters & { projectId: string | null };

type RefreshInput = ProjectIssuesHookInput & { projectId: string };

type StoppableView = ProjectView & { stop: () => void };

type Refresh = () => Promise<void>;

// oxlint-disable-next-line max-lines-per-function -- Keep the effect dependencies literal for exhaustive-deps.
export function useProjectIssues(input: ProjectIssuesHookInput): void {
  const {
    projectId,
    projects,
    storage,
    trackers,
    setIssues,
    setMessage,
    setTrackerId,
  } = input;

  useEffect(
    () =>
      startProjectRefresh({
        projectId,
        projects,
        storage,
        trackers,
        setIssues,
        setMessage,
        setTrackerId,
      }),
    [
      projectId,
      projects,
      storage,
      trackers,
      setIssues,
      setMessage,
      setTrackerId,
    ],
  );
}

function startProjectRefresh(
  input: ProjectIssuesHookInput,
): (() => void) | undefined {
  resetProject(input);

  const { projectId } = input;

  if (projectId === null) return;

  const view = createProjectView(input);
  const refresh = createRefresh({ ...input, projectId }, view);

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
