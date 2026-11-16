import type { Issue } from './github-issues';
import { unwrap } from './github-reads';
import type { IssueDeps } from './issue-deps';
import type { IssueLink } from './tracker-storage';

// What a Session row and the Session bar say about an Issue: its state, and its title for a tooltip.
export type IssueSummary = Pick<Issue, 'title' | 'status' | 'closedAs'>;

export type Source = Pick<IssueDeps, 'storage' | 'reads' | 'readQuery'>;

export type Target = Pick<IssueLink, 'projectId' | 'number'>;

// Each Issue's shared Query answer, in the order asked.
export type Together = (
  targets: readonly Target[],
) => Promise<(IssueSummary | null)[]>;

export const keyOf = ({ projectId, number }: Target): string =>
  `${projectId}#${number}`;

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
  source: Source,
  found: ReadonlySet<number>,
  target: Target,
): Promise<IssueSummary | null> =>
  found.has(target.number) ? summaryOf(source, target).catch(() => null) : null;

// One Project's Issues, in the order asked.
async function readProject(
  source: Source,
  targets: readonly Target[],
): Promise<(IssueSummary | null)[]> {
  const found = await attachedIn(source, targets);

  return Promise.all(targets.map((target) => readFound(source, found, target)));
}

const byProject = (targets: readonly Target[]): Target[][] =>
  Object.values(Object.groupBy(targets, ({ projectId }) => projectId)).map(
    (group) => group ?? [],
  );

// Each Project is read alone: one whose Tracker fails leaves only its own Issues unread.
async function readProjects(
  source: Source,
  targets: readonly Target[],
): Promise<Map<string, IssueSummary | null>> {
  const reads = new Map<string, IssueSummary | null>();

  await Promise.all(
    byProject(targets).map(async (group) => {
      const read = await readProject(source, group).catch(() => []);

      for (const [index, target] of group.entries())
        reads.set(keyOf(target), read[index] ?? null);
    }),
  );

  return reads;
}

// Reads these Issues, each Project's in one Tracker call.
export const readTogether =
  (source: Source): Together =>
  async (targets) => {
    const reads = await readProjects(source, targets);

    return targets.map((target) => reads.get(keyOf(target)) ?? null);
  };
