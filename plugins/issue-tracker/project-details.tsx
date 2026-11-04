import type { ProjectDetailsItem } from '@argo/plugin-kit';
import type { TrackerRegistry } from './tracker-registry';
import type { TrackerStorage } from './tracker-storage';

/*
 * Project details takes items, so the row only names the chosen Tracker and the choice itself is a page
 * of this Plugin's own, which the row drills into (ADR-0046).
 */
export const trackerPath = '/tracker';

export const noTracker = 'None';

export type TrackerDeps = {
  storage: TrackerStorage;
  trackers: TrackerRegistry;
};

// What one batched call names: the Projects whose rows the App is drawing.
type ProjectContexts = Readonly<{
  contexts: readonly Readonly<{ projectId: string }>[];
}>;

function trackerName(trackers: TrackerRegistry, chosen: string | null): string {
  if (chosen === null) return noTracker;

  const tracker = trackers.get(chosen);

  return tracker ? tracker.name : noTracker;
}

// One row per Project: the Tracker it chose, or None while it has chosen none or the choice cannot be read.
async function trackerRows(
  { storage, trackers }: TrackerDeps,
  projectId: string,
): Promise<ProjectDetailsItem[]> {
  const chosen = await storage.selectedTracker(projectId).catch(() => null);

  return [
    {
      title: 'Issue tracker',
      value: trackerName(trackers, chosen),
      action: { path: trackerPath },
    },
  ];
}

// The Plugin's answer for Project details: one row for each Project asked about, keyed by its id.
export async function projectDetailsItems(
  deps: TrackerDeps,
  { contexts }: ProjectContexts,
): Promise<Record<string, ProjectDetailsItem[]>> {
  const answered = await Promise.all(
    contexts.map(
      async ({ projectId }) =>
        [projectId, await trackerRows(deps, projectId)] as const,
    ),
  );

  return Object.fromEntries(answered);
}
