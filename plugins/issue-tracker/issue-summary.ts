import type { Issue } from './github-issues';
import { unwrap } from './github-reads';
import type { IssueDeps } from './issue-deps';
import type { IssueLink } from './tracker-storage';

// What a Session row and the Session bar say about an Issue.
export type IssueSummary = Pick<Issue, 'title' | 'status' | 'closedAs'>;

type Source = Pick<IssueDeps, 'reads' | 'readQuery'>;

type Target = Pick<IssueLink, 'projectId' | 'number'>;

export type IssueSummaries = {
  answer: (target: Target) => Promise<IssueSummary | null>;
  refresh: (
    targets: readonly Target[],
    read: Source['readQuery'],
  ) => Promise<void>;
};

// Slots and pages read the same Query entry; no stored copy can outlive that entry.
export function createIssueSummaries(source: Source): IssueSummaries {
  return {
    answer: (target) => answer(source, target),
    refresh: async (targets, readQuery) => {
      await Promise.all(
        targets.map((target) =>
          summaryOf({ ...source, readQuery }, target).catch(() => null),
        ),
      );
    },
  };
}

const slotBudgetMs = 1500;

const late = Symbol('late');

// A slow first read leaves the state unknown, then asks the Slots again when it lands.
async function answer(
  source: Source,
  target: Target,
): Promise<IssueSummary | null> {
  const loading = summaryOf(source, target).catch(() => null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<typeof late>((done) => {
    timer = setTimeout(() => done(late), slotBudgetMs);
  });

  const winner = await Promise.race([loading, timeout]);
  clearTimeout(timer);

  if (winner !== late) return winner;

  return null;
}

async function summaryOf(
  source: Source,
  { projectId, number }: Target,
): Promise<IssueSummary> {
  const settled = await source.readQuery(
    source.reads.issue({ projectId, number }),
  );

  const { title, status, closedAs } = unwrap(settled);

  return { title, status, closedAs };
}
