import {
  readTogether,
  type IssueSummary,
  type Reading,
  type Source,
  type Target,
} from './issue-summary-reads';
import { readRetry } from './read-retry';

export type { IssueSummary } from './issue-summary-reads';

export type IssueSummaries = {
  answer: (targets: readonly Target[]) => Promise<(IssueSummary | null)[]>;
  refresh: (
    targets: readonly Target[],
    read: Source['readQuery'],
  ) => Promise<void>;
};

// Slots and pages read the same Query entries; no stored copy can outlive them. A failed read asks the Slots again.
export function createIssueSummaries(
  source: Source,
  changed: () => void,
): IssueSummaries {
  const reading = { ...source, retry: readRetry(changed) };

  return {
    answer: (targets) => answer(reading, targets),
    refresh: async (targets, readQuery) => {
      await readTogether({ ...reading, readQuery })(targets);
    },
  };
}

const slotBudgetMs = 1500;

// Query completion refreshes the Slots if their bounded wait expires first.
async function answer(
  source: Reading,
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
