import type { IssueFilter } from './issue-filters';
import type { Overview } from './overview';

// A missing count stays absent; zero is a count on every platform.
export function filterCountText(
  overview: Overview | null,
  filter: IssueFilter,
): string | undefined {
  const count = overview?.counts[filter.id];

  return count === undefined ? undefined : String(count);
}
