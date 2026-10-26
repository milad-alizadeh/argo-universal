import type { Issue, IssueStatus } from './github-issues';
import type { TrackerClient } from './github-tracker';
import { clientFor, type Project, unavailableMessage } from './issue-data';
import type { TrackerRegistry } from './tracker-registry';
import type { TrackerStorage } from './tracker-storage';

// One Issue of a Project, read and changed through the Project's Tracker.
export type IssueRequest = {
  project: Project;
  issue: Issue;
  storage: TrackerStorage;
  trackers: TrackerRegistry;
};

export async function loadIssue(request: IssueRequest): Promise<Issue> {
  const client = await issueClient(request);

  return client.getIssue(request.issue.number);
}

// Sets the Issue's status in its Tracker, then in the cached list.
export async function setIssueStatus(
  request: IssueRequest,
  status: IssueStatus,
): Promise<void> {
  const { project, issue, storage } = request;
  const client = await issueClient(request);

  await client.setStatus(issue.number, status);
  await storage
    .updateCache(project.id, { ...issue, status })
    .catch(refreshLater);
}

async function issueClient({
  project,
  storage,
  trackers,
}: Omit<IssueRequest, 'issue'>): Promise<TrackerClient> {
  const trackerId = await storage.selectedTracker(project.id);

  const client = clientFor({
    projects: [project],
    projectId: project.id,
    trackerId,
    trackers,
  });

  if (client) return client;

  throw new Error(unavailableMessage(trackerId));
}

// The background refresh rewrites the cache, so a failed write only delays the new status there.
function refreshLater(): void {}
