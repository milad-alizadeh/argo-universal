import type { SessionUpdateKind } from '@repo/contracts';
import type { SeededFeed } from './seed-feed.mts';

export type RowKindCounts = Partial<Record<SessionUpdateKind, number>>;

export function rowKindCounts(feed: SeededFeed): RowKindCounts {
  const counts: RowKindCounts = {};

  for (const row of feed.rows)
    counts[row.sessionUpdate] = (counts[row.sessionUpdate] ?? 0) + 1;

  return counts;
}
