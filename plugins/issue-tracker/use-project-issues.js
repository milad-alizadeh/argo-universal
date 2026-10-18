import { useEffect } from '@argo/plugin-kit';
import { loadProjectIssues } from './issue-data.js';

const millisecondsPerSecond = 1000;

const secondsPerMinute = 60;

const refreshDelayMinutes = 5;

const refreshInterval =
  refreshDelayMinutes * secondsPerMinute * millisecondsPerSecond;

export function useProjectIssues(
  input,
) {
  const { projectId, projects, storage, trackers, setIssues, setMessage, setTrackerId } = input;

  useEffect(() => startProjectRefresh({ projectId, projects, storage, trackers, setIssues, setMessage, setTrackerId }), [projectId, projects, storage, trackers, setIssues, setMessage, setTrackerId]);
}

function startProjectRefresh(input) {
  resetProject(input);

  if (input.projectId === null) return;

  const view = createProjectView(input);
  const refresh = createRefresh(input, view);

  return scheduleRefresh(refresh, view);
}

function resetProject({ setIssues, setTrackerId }) {
  setIssues([]);
  setTrackerId(null);
}

function createProjectView({ setIssues, setMessage, setTrackerId }) {
  let active = true;

  return {
    active: () => active,
    stop: () => {
      active = false;
    },
    setIssues,
    setMessage,
    setTrackerId,
  };
}

function createRefresh(input, view) {
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

function scheduleRefresh(refresh, view) {
  let timer;

  void refresh().finally(() => {
    if (view.active()) timer = setTimeout(refreshLater, refreshInterval);
  });

  return () => {
    view.stop();

    if (timer !== undefined) clearTimeout(timer);
  };

  function refreshLater() {
    void refresh().finally(() => {
      if (view.active()) timer = setTimeout(refreshLater, refreshInterval);
    });
  }
}
