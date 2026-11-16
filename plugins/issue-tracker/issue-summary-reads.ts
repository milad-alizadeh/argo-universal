import type { Issue } from './github-issues';
import { unwrap } from './github-reads';
import type { IssueDeps } from './issue-deps';
import type { IssueLink, TrackerStorage } from './tracker-storage';

// What a Session row and the Session bar say about an Issue: its state, and its title for a tooltip.
export type IssueSummary = Pick<Issue, 'title' | 'status' | 'closedAs'>;

export type Source = Pick<
  IssueDeps,
  'storage' | 'trackers' | 'listProjects' | 'reads' | 'readQuery'
>;

export type Target = Pick<IssueLink, 'projectId' | 'number'>;

// The last summary this Plugin stored for the Issue; `null` until one has loaded.
export type Cached = (target: Target) => Promise<IssueSummary | null>;

export type Read = { summary: IssueSummary; differs: boolean };

// Each Issue's read, in the order asked; `null` for one that could not be read.
export type Together = (targets: readonly Target[]) => Promise<(Read | null)[]>;

type Reading = { source: Source; cached: Cached };

// A summary lives in the Plugin's view cache under the Issue's number.
type CacheKey = Pick<Target, 'projectId'> & { view: string };

export const keyOf = ({ projectId, number }: Target): string =>
  `${projectId}#${number}`;

const cacheKey = ({ projectId, number }: Target): CacheKey => ({
  projectId,
  view: `issue-summary-${number}`,
});

export const storedSummary =
  (storage: TrackerStorage): Cached =>
  (target) =>
    storage.readCache<IssueSummary>(cacheKey(target)).catch(() => null);

async function summaryOf(
  source: Source,
  { projectId, number }: Target,
): Promise<IssueSummary> {
  // The same entry a page's Loader reads, so a Slot and a page asking for the Issue make one read.
  const settled = await source.readQuery(
    source.reads.issue({ projectId, number }),
  );

  const { title, status, closedAs } = unwrap(settled);

  return { title, status, closedAs };
}

// Reads the summary through the Issue's Query and stores it when it differs from the stored one.
async function readAndStore(
  { source, cached }: Reading,
  target: Target,
): Promise<Read> {
  const summary = await summaryOf(source, target);

  const differs =
    JSON.stringify(summary) !== JSON.stringify(await cached(target));

  if (differs) await source.storage.writeCache(cacheKey(target), summary);

  return { summary, differs };
}

const numbersOf = (targets: readonly Pick<Target, 'number'>[]): number[] =>
  [...new Set(targets.map(({ number }) => number))].sort(
    (left, right) => left - right,
  );

/*
 * Every Issue the Project's Sessions are attached to is read in one Tracker call, whichever of them was asked for, so
 * every ask for the Project shares the one kept answer. It answers the numbers GitHub still has, and seeds each
 * Issue's own entry.
 */
async function attachedIn(
  source: Source,
  targets: readonly Target[],
): Promise<Set<number>> {
  const projectId = targets[0]?.projectId ?? '';
  const attached = await source.storage.projectIssues(projectId);
  const numbers = numbersOf([...attached, ...targets]);

  return new Set(
    unwrap(
      await source.readQuery(source.reads.attached({ projectId, numbers })),
    ),
  );
}

// The summary is read from the Issue's own entry, so a page that read the Issue since is never answered with something older.
const readFound = async (
  reading: Reading,
  found: ReadonlySet<number>,
  target: Target,
): Promise<Read | null> =>
  found.has(target.number)
    ? readAndStore(reading, target).catch(() => null)
    : null;

// One Project's Issues, in the order asked.
async function readProject(
  reading: Reading,
  targets: readonly Target[],
): Promise<(Read | null)[]> {
  const found = await attachedIn(reading.source, targets);

  return Promise.all(
    targets.map((target) => readFound(reading, found, target)),
  );
}

const byProject = (targets: readonly Target[]): Target[][] =>
  Object.values(Object.groupBy(targets, ({ projectId }) => projectId)).map(
    (group) => group ?? [],
  );

// Each Project is read alone: one whose Tracker fails leaves only its own Issues unread.
async function readProjects(
  reading: Reading,
  targets: readonly Target[],
): Promise<Map<string, Read | null>> {
  const reads = new Map<string, Read | null>();

  await Promise.all(
    byProject(targets).map(async (group) => {
      const read = await readProject(reading, group).catch(() => []);

      for (const [index, target] of group.entries())
        reads.set(keyOf(target), read[index] ?? null);
    }),
  );

  return reads;
}

// Reads these Issues, each Project's in one Tracker call.
export const readTogether =
  (source: Source, cached: Cached): Together =>
  async (targets) => {
    const reads = await readProjects({ source, cached }, targets);

    return targets.map((target) => reads.get(keyOf(target)) ?? null);
  };
