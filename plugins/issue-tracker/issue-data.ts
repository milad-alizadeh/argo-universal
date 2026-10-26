import type { Argo } from '@argo/plugin-kit';
import { githubError } from './github-errors';
import type { Issue } from './github-issues';
import type { TrackerClient } from './github-tracker';
import type { TrackerRegistry } from './tracker-registry';
import type { TrackerStorage } from './tracker-storage';

export type Project = Awaited<ReturnType<Argo['projects']['list']>>[number];

// What a Project's Issue list shows, while the view that asked for it is still open.
export type ProjectView = {
  active: () => boolean;
  setIssues: (issues: Issue[]) => void;
  setMessage: (message: string) => void;
  setTrackerId: (id: string | null) => void;
};

export type ProjectIssuesInput = {
  projectId: string;
  projects: Project[];
  storage: TrackerStorage;
  trackers: TrackerRegistry;
  view: ProjectView;
  refreshOnly?: boolean;
};

type ClientInput = {
  projects: Project[];
  projectId: string;
  trackerId: string | null;
  trackers: TrackerRegistry;
};

const chooseTrackerMessage = 'Choose a Tracker in Project details.';

const noRemoteMessage = 'This Project has no GitHub remote.';

const loadingIssuesMessage = 'Loading Issues…';

export async function loadProjectIssues(
  input: ProjectIssuesInput,
): Promise<void> {
  try {
    const client = await projectClient(input);

    if (!client) return;

    await loadCache(input);
    await refreshIssues({ ...input, client });
  } catch (error) {
    report(input.view, githubError(error));
  }
}

async function projectClient(
  input: ProjectIssuesInput,
): Promise<TrackerClient | null> {
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

export function clientFor({
  projects,
  projectId,
  trackerId,
  trackers,
}: ClientInput): TrackerClient | null {
  const project = findProject(projects, projectId);
  const tracker = selectedTracker(trackers, trackerId);

  return openTracker(tracker, project);
}

function findProject(
  projects: Project[],
  projectId: string,
): Project | undefined {
  return projects.find((row) => row.id === projectId);
}

function openTracker(
  tracker: ReturnType<TrackerRegistry['get']>,
  project: Project | undefined,
): TrackerClient | null {
  if (!tracker) return null;

  return tracker.openClient(project?.originUrl);
}

function selectedTracker(
  trackers: TrackerRegistry,
  trackerId: string | null,
): ReturnType<TrackerRegistry['get']> {
  return trackerId === null ? null : trackers.get(trackerId);
}

function unavailableClient(
  input: ProjectIssuesInput,
  trackerId: string | null,
): null {
  if (!input.refreshOnly) input.view.setIssues([]);

  report(input.view, unavailableMessage(trackerId));

  return null;
}

export function unavailableMessage(trackerId: string | null): string {
  return trackerId === null ? chooseTrackerMessage : noRemoteMessage;
}

async function loadCache({
  projectId,
  refreshOnly,
  storage,
  view,
}: ProjectIssuesInput): Promise<void> {
  if (refreshOnly) return;

  report(view, loadingIssuesMessage);

  const cached = await storage.readCache(projectId);

  showCache(view, cached);
}

function showCache(view: ProjectView, cached: Issue[] | null): void {
  if (view.active() && cached) view.setIssues(cached);
}

type RefreshInput = ProjectIssuesInput & { client: TrackerClient };

async function refreshIssues(input: RefreshInput): Promise<void> {
  const { client, projectId, storage, view } = input;

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

function report(view: ProjectView, message: string): void {
  if (view.active()) view.setMessage(message);
}
