import { useEffect, useState } from '@argo/plugin-kit';
import { useProjectIssues } from './use-project-issues.js';

export function useIssuePage(argo, storage, trackers) {
  const state = useIssueState();

  useIssueData(argo, state, { storage, trackers });

  return pageModel(state, storage, trackers);
}

function useIssueData(argo, state, dependencies) {
  const { storage, trackers } = dependencies;

  useProjects(argo, state);
  useProjectIssues(
    {
      projectId: state.projectId[0],
      projects: state.projects[0],
      storage,
      trackers,
      setIssues: state.issues[1],
      setMessage: state.message[1],
      setTrackerId: state.trackerId[1],
    },
  );
}

function useIssueState() {
  return {
    projects: useState([]),
    projectId: useState(null),
    selected: useState(null),
    issues: useState([]),
    message: useState('Loading Projects…'),
    trackerId: useState(null),
  };
}

function useProjects(argo, state) {
  const load = argo.projects.list;
  const [, setProjects] = state.projects;
  const [, setProjectId] = state.projectId;
  const [, setMessage] = state.message;

  useEffect(() => {
    return observeProjects(load, { setProjects, setProjectId, setMessage });
  }, [load, setProjects, setProjectId, setMessage]);
}

function observeProjects(load, setters) {
  let active = true;

  void load().then(
    (rows) => showProjects(rows, setters, active),
    () => reportProjectError(active, setters.setMessage),
  );

  return () => {
    active = false;
  };
}

function showProjects(rows, setters, active) {
  if (!active) return;

  updateProjectRows(rows, setters);
}

function updateProjectRows(rows, setters) {
  setters.setProjects(rows);
  selectFirstProject(rows, setters.setProjectId);
  setters.setMessage(projectsMessage(rows));
}

function selectFirstProject(rows, setProjectId) {
  setProjectId(rows[0]?.id ?? null);
}

function projectsMessage(rows) {
  return rows.length === 0 ? 'No Projects yet.' : 'Loading Issues…';
}

function reportProjectError(active, setMessage) {
  if (active) setMessage('Could not load Projects.');
}

function pageModel(state, storage, trackers) {
  return {
    ...pageState(state),
    storage,
    trackers,
    ...pageActions(state),
  };
}

function pageState(state) {
  const [projects] = state.projects;
  const [projectId] = state.projectId;
  const [selected] = state.selected;

  return {
    projects,
    projectId,
    project: projects.find((row) => row.id === projectId),
    trackerId: state.trackerId[0],
    issues: state.issues[0],
    message: state.message[0],
    selected,
  };
}

function pageActions(state) {
  const [, setSelected] = state.selected;

  return {
    setMessage: state.message[1],
    onIssue: (event) => updateSelection(event, state),
    onBack: () => setSelected(null),
  };
}

function updateSelection(event, state) {
  if (event.type === 'project') return selectProject(event.id, state);

  state.selected[1](event);
}

function selectProject(id, state) {
  state.issues[1]([]);
  state.trackerId[1](null);
  state.message[1]('Loading Issues…');
  state.projectId[1](id);
  state.selected[1](null);
}
