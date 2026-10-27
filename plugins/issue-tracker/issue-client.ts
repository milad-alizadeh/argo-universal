import type { Argo } from '@argo/plugin-kit';
import {
  githubRepositoryFromOrigin,
  type TrackerClient,
} from './github-tracker';
import type { TrackerRegistry } from './tracker-registry';
import type { TrackerStorage } from './tracker-storage';

export type Project = Awaited<ReturnType<Argo['projects']['list']>>[number];

export type ClientSource = {
  project: Project;
  storage: TrackerStorage;
  trackers: TrackerRegistry;
};

const chooseTrackerMessage = 'Choose a Tracker in Project details.';

const noRemoteMessage = 'This Project has no GitHub remote.';

// The Project's chosen Tracker, open on its repository; its failure says what to set up.
export async function openClient(source: ClientSource): Promise<TrackerClient> {
  const tracker = await chosenTracker(source);
  const client = tracker.openClient(source.project.originUrl);

  if (!client) throw new Error(noRemoteMessage);

  return client;
}

type DepsSource = {
  project: Project;
  deps: Omit<ClientSource, 'project'>;
};

// The Tracker client for a page's Project, opened with the deps its pages share.
export const openDepsClient = ({
  project,
  deps,
}: DepsSource): Promise<TrackerClient> => openClient({ ...deps, project });

async function chosenTracker({
  project,
  storage,
  trackers,
}: ClientSource): Promise<NonNullable<ReturnType<TrackerRegistry['get']>>> {
  const trackerId = await storage.selectedTracker(project.id);
  const tracker = trackerId === null ? null : trackers.get(trackerId);

  if (!tracker) throw new Error(chooseTrackerMessage);

  return tracker;
}

// A page's footer: the Project and the repository its Issues come from.
export function repositoryText(project: Project): string {
  const repository = githubRepositoryFromOrigin(project.originUrl);

  return [project.name, repository ?? 'No GitHub remote']
    .filter(Boolean)
    .join(' · ');
}
