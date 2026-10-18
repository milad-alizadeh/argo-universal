import { githubError } from './github-tracker.js';

const chooseTrackerMessage = 'Choose a Tracker in Project details.';

const noRemoteMessage = 'This Project has no GitHub remote.';

const loadingIssuesMessage = 'Loading Issues…';

export async function loadProjectIssues(input) {
  try {
    const client = await projectClient(input);

    if (!client) return;

    await loadCache(input);
    await refreshIssues({ ...input, client });
  } catch (error) {
    report(input.view, githubError(error));
  }
}

async function projectClient(input) {
  const trackerId = await input.storage.selectedTracker(input.projectId);

  if (!input.view.active()) return null;

  input.view.setTrackerId(trackerId);

  const client = clientFor({
    projects: input.projects,
    projectId: input.projectId,
    trackerId,
    trackers: input.trackers,
  });

  if (client) return client;

  return unavailableClient(input, trackerId);
}

function clientFor({ projects, projectId, trackerId, trackers }) {
  const project = findProject(projects, projectId);
  const tracker = selectedTracker(trackers, trackerId);

  return openTracker(tracker, project);
}

function findProject(projects, projectId) {
  return projects.find((row) => row.id === projectId);
}

function openTracker(tracker, project) {
  if (!tracker) return null;

  return tracker.openClient(project?.originUrl);
}

function selectedTracker(trackers, trackerId) {
  return trackerId === null ? null : trackers.get(trackerId);
}

function unavailableClient(input, trackerId) {
  if (!input.refreshOnly) input.view.setIssues([]);

  report(input.view, unavailableMessage(trackerId));

  return null;
}

function unavailableMessage(trackerId) {
  return trackerId === null ? chooseTrackerMessage : noRemoteMessage;
}

async function loadCache({ projectId, refreshOnly, storage, view }) {
  if (refreshOnly) return;

  report(view, loadingIssuesMessage);

  const cached = await storage.readCache(projectId);

  showCache(view, cached);
}

function showCache(view, cached) {
  if (view.active() && cached) view.setIssues(cached);
}

async function refreshIssues({ client, projectId, storage, view }) {
  try {
    await client.authStatus();

    const fresh = await client.listIssues();

    await storage.writeCache(projectId, fresh);

    if (view.active()) view.setIssues(fresh);

    report(view, '');
  } catch (error) {
    report(view, githubError(error));
  }
}

function report(view, message) {
  if (view.active()) view.setMessage(message);
}

export async function loadIssue({ project, issue, storage, trackers }) {
  const trackerId = await storage.selectedTracker(project.id);

  const client = clientFor({
    projects: [project],
    projectId: project.id,
    trackerId,
    trackers,
  });

  if (client) return client.getIssue(issue.number);

  throw new Error(unavailableMessage(trackerId));
}
