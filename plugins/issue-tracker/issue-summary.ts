import type { Issue } from './github-issues';
import { openClient } from './issue-client';
import type { IssueDeps } from './issue-deps';
import type { IssueLink, TrackerStorage } from './tracker-storage';

// What a Session row and the Session bar say about an Issue: its state, and its title for a tooltip.
export type IssueSummary = Pick<Issue, 'title' | 'status' | 'closedAs'>;

type Source = Pick<IssueDeps, 'storage' | 'trackers' | 'listProjects'>;

type Target = Pick<IssueLink, 'projectId' | 'number'>;

// A Session list asks again whenever a Session changes; one Issue is not fetched twice inside this.
const freshForMs = 60_000;

export type IssueSummaries = {
  // The last summary this Plugin stored for the Issue; `null` until one has loaded.
  cached: (target: Target) => Promise<IssueSummary | null>;
  // Loads each Issue's summary in the background and tells Argo, through `changed`, when one differs from the stored.
  refresh: (targets: readonly Target[]) => void;
  // The Issue's state changed, so the next ask loads it again whatever its age.
  stale: (number: number) => void;
};

type Loads = {
  loadedAt: Map<string, number>;
  load: (target: Target) => Promise<void>;
};

// A summary lives in the Plugin's view cache under the Issue's number.
type CacheKey = Pick<Target, 'projectId'> & { view: string };

const keyOf = ({ projectId, number }: Target): string =>
  `${projectId}#${number}`;

const cacheKey = ({ projectId, number }: Target): CacheKey => ({
  projectId,
  view: `issue-summary-${number}`,
});

/*
 * The batched Slot call answers inside two seconds, and a Tracker call can take longer, so the Slots answer from the
 * stored summary and load a fresh one on the side. A summary that differs is stored and `changed` is called, which
 * asks the Slots again.
 */
export function createIssueSummaries(
  source: Source,
  changed: () => Promise<void>,
): IssueSummaries {
  const loadedAt = new Map<string, number>();
  const cached = storedSummary(source.storage);
  const load = loadSummary(source, cached, changed);

  return {
    cached,
    refresh: (targets) => refreshAll({ loadedAt, load }, targets),
    stale: (number) => forget(loadedAt, number),
  };
}

const storedSummary =
  (storage: TrackerStorage): IssueSummaries['cached'] =>
  (target) =>
    storage.readCache<IssueSummary>(cacheKey(target)).catch(() => null);

function loadSummary(
  source: Source,
  cached: IssueSummaries['cached'],
  changed: () => Promise<void>,
): Loads['load'] {
  return async (target) => {
    const summary = await summaryOf(source, target);

    if (JSON.stringify(summary) === JSON.stringify(await cached(target)))
      return;

    await source.storage.writeCache(cacheKey(target), summary);
    await changed();
  };
}

function refreshAll(loads: Loads, targets: readonly Target[]): void {
  const unique = new Map(targets.map((target) => [keyOf(target), target]));

  for (const target of unique.values()) refreshOne(loads, target);
}

function refreshOne({ loadedAt, load }: Loads, target: Target): void {
  const key = keyOf(target);
  const last = loadedAt.get(key);

  if (last !== undefined && Date.now() - last < freshForMs) return;

  loadedAt.set(key, Date.now());
  void load(target).catch(() => loadedAt.delete(key));
}

function forget(loadedAt: Loads['loadedAt'], number: number): void {
  for (const key of loadedAt.keys())
    if (key.endsWith(`#${number}`)) loadedAt.delete(key);
}

async function summaryOf(
  source: Source,
  { projectId, number }: Target,
): Promise<IssueSummary> {
  const projects = await source.listProjects();
  const project = projects.find(({ id }) => id === projectId);

  if (!project) throw new Error('This Project no longer exists.');

  const client = await openClient({ ...source, project });
  const { title, status, closedAs } = await client.getIssue(number);

  return { title, status, closedAs };
}
