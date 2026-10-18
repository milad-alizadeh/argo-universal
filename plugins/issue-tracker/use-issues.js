import { useEffect, useState } from '@argo/plugin-kit';
import { tracker } from './tracker-registry.js';
import { readCache, selectedTracker, writeCache } from './tracker-storage.js';

export function useProjects(argo, setProjectId) {
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState('Loading Projects…');
  const load = argo.projects.list;

  useEffect(() => {
    void load()
      .then((rows) =>
        receiveProjects({ rows, setProjects, setProjectId, setMessage }),
      )
      .catch(() => setMessage('Could not load Projects.'));
  }, [load, setProjectId]);

  return { projects, message, setMessage };
}

export function useIssuePage(argo) {
  return pageState(usePageInputs(argo));
}

function usePageInputs(argo) {
  return useProjectState(argo, useSelectionState());
}

function useSelectionState() {
  const [projectId, setProjectId] = useState(null);
  const [selected, setSelected] = useState(null);

  return { projectId, selected, setProjectId, setSelected };
}

function useProjectState(argo, selected) {
  const projectData = useProjects(argo, selected.setProjectId);

  const issues = useProjectIssues(
    projectData.projects,
    selected.projectId,
    projectData.setMessage,
  );

  return combinePageState(selected, projectData, issues);
}

function combinePageState(selected, projectData, issues) {
  return { ...selected, ...projectData, ...issues };
}

function pageState(state) {
  return {
    ...state,
    project: state.projects.find((row) => row.id === state.projectId),
    onIssue: (event) => selectIssueEvent(event, state),
    onBack: () => state.setSelected(null),
    onChanged: (issue) => updateSelectedIssue(issue, state),
  };
}

function selectIssueEvent(event, state) {
  if (event.type === 'project') {
    state.setProjectId(event.id);
    state.setSelected(null);

    return;
  }

  state.setSelected(event);
}

function updateSelectedIssue(issue, state) {
  state.setSelected({ type: 'issue', issue });
  state.setIssues((current) =>
    current.map((entry) => (entry.number === issue.number ? issue : entry)),
  );
}

function receiveProjects({ rows, setProjects, setProjectId, setMessage }) {
  setProjects(rows);
  setProjectId(rows[0]?.id ?? null);
  setMessage(projectMessage(rows));
}

const projectMessage = (rows) => (rows.length === 0 ? 'No Projects yet.' : '');

export function useProjectIssues(projects, projectId, setMessage) {
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    if (projectId === null) return;

    let active = true;
    const view = { active: () => active, setIssues, setMessage };
    void loadProjectIssues(projects, projectId, view);

    return () => {
      active = false;
    };
  }, [projectId, projects, setMessage]);

  return { issues, setIssues };
}

async function loadProjectIssues(projects, projectId, view) {
  report(view, 'Loading Issues…');
  const id = await selectedTracker(projectId);

  if (!view.active()) return;
  await loadTrackerIssues({ projects, projectId, id, view });
}

async function loadTrackerIssues(input) {
  const connection = connectionOf(input);

  if (!connection) return report(input.view, missingConnectionMessage(input));

  await showCache(input.projectId, connection, input.view);
}

function connectionOf({ projects, projectId, id }) {
  const project = projects.find((row) => row.id === projectId);

  return connectionFor(project, id);
}

function connectionFor(project, id) {
  if (id === null) return null;

  return connectionForProject(project, id);
}

function connectionForProject(project, id) {
  if (!project?.repository) return null;

  return tracker(id).createConnection(project.repository);
}

const missingConnectionMessage = ({ id }) =>
  id === null
    ? 'Choose a Tracker in Project details.'
    : 'This Project has no GitHub remote.';

async function showCache(projectId, connection, view) {
  const cached = await readCache(projectId);

  if (!view.active()) return;

  if (cached) view.setIssues(cached);
  await refreshIssues(projectId, connection, view);
}

async function refreshIssues(projectId, connection, view) {
  try {
    await connection.authStatus();
    const fresh = await connection.listIssues();
    await writeCache(projectId, fresh);

    if (view.active()) view.setIssues(fresh);
    report(view, '');
  } catch (error) {
    report(view, githubError(error));
  }
}

const report = (view, message) => {
  if (view.active()) view.setMessage(message);
};

export async function loadIssue(project, issue) {
  return tracker('github')
    .createConnection(project.repository)
    .getIssue(issue.number);
}

export function githubError(error) {
  const detail = String(error?.message ?? error);

  const messages = [
    [/not found|enoent|no such file/i, 'GitHub CLI (gh) is not installed.'],
    [/auth|login|not logged|token/i, 'Sign in to GitHub with gh auth login.'],
  ];

  return errorMessage(messages, detail);
}

function errorMessage(messages, detail) {
  const match = messages.find(([pattern]) => pattern.test(detail));

  return match ? match[1] : detail;
}
