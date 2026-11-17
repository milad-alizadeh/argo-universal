import {
  readTogether,
  type IssueSummary,
  type Source,
  type Target,
} from './issue-summary-reads';

export type { IssueSummary } from './issue-summary-reads';

export type IssueSummaries = {
  answer: (targets: readonly Target[]) => Promise<(IssueSummary | null)[]>;
  refresh: (
    targets: readonly Target[],
    read: Source['readQuery'],
  ) => Promise<void>;
};

// Slots and pages read the same Query entries; no stored copy can outlive them.
export function createIssueSummaries(source: Source): IssueSummaries {
  return {
    answer: (targets) => answer(source, targets),
    refresh: async (targets, readQuery) => {
      await readTogether({ ...source, readQuery })(targets);
    },
  };
}

const slotBudgetMs = 1500;

// Query completion refreshes the Slots if their bounded wait expires first.
async function answer(
  source: Source,
  targets: readonly Target[],
): Promise<(IssueSummary | null)[]> {
  const loading = readTogether(source)(targets);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<null>((done) => {
    timer = setTimeout(() => done(null), slotBudgetMs);
  });

  const winner = await Promise.race([loading, timeout]);
  clearTimeout(timer);

  return winner ?? targets.map(() => null);
}
