import type { session } from '@repo/db/schema';
import {
  combineFeeds,
  type SeededFeed,
  shortRecordedFeeds,
} from './seed-feed.mts';
import { rowKindCounts, type RowKindCounts } from './seed-statistics.mts';

type SessionRow = typeof session.$inferSelect;

export interface SeededDataset {
  sessions: SessionRow[];
  feed: SeededFeed;
  feedRowCount: number;
  shortFeedRowCount: number;
  rowKinds: RowKindCounts;
}

function revision(row: SessionRow, revisions: Map<string, number>): SessionRow {
  const maxRevision = revisions.get(row.id);

  return maxRevision === undefined
    ? row
    : { ...row, maxRevision, seenRevision: maxRevision };
}

const revisionsOf = (feed: SeededFeed): Map<string, number> =>
  new Map(feed.rows.map((row) => [row.sessionId, row.revision]));

function mergeDataset(
  sessions: SessionRow[],
  longFeed: SeededFeed,
  short: SeededFeed,
): SeededDataset {
  const revisions = revisionsOf(short);

  return {
    sessions: sessions.map((row) => revision(row, revisions)),
    feed: combineFeeds([longFeed, short]),
    feedRowCount: longFeed.rows.length,
    shortFeedRowCount: short.rows.length,
    rowKinds: rowKindCounts(longFeed),
  };
}

export async function seededDataset(
  sessions: SessionRow[],
  longFeed: SeededFeed,
  now: number,
): Promise<SeededDataset> {
  const short = await shortRecordedFeeds(
    sessions.slice(1).map(({ id }) => id),
    now,
  );

  return mergeDataset(sessions, longFeed, short);
}

export type SeedCounts = Pick<
  SeededDataset,
  'feedRowCount' | 'shortFeedRowCount' | 'rowKinds'
>;

export const datasetCounts = (dataset: SeededDataset): SeedCounts => ({
  feedRowCount: dataset.feedRowCount,
  shortFeedRowCount: dataset.shortFeedRowCount,
  rowKinds: dataset.rowKinds,
});
