import type { session } from '@repo/db/schema';
import {
  combineFeeds,
  type SeededFeed,
  shortRecordedFeeds,
} from './seed-feed.mts';

type SessionRow = typeof session.$inferSelect;

export interface SeededDataset {
  sessions: SessionRow[];
  feed: SeededFeed;
  feedRowCount: number;
  shortFeedRowCount: number;
}

function revision(row: SessionRow, revisions: Map<string, number>): SessionRow {
  const maxRevision = revisions.get(row.id);

  return maxRevision === undefined
    ? row
    : { ...row, maxRevision, seenRevision: maxRevision };
}

function mergeDataset(
  sessions: SessionRow[],
  longFeed: SeededFeed,
  short: SeededFeed,
): SeededDataset {
  const revisions = new Map(
    short.rows.map((row) => [row.sessionId, row.revision]),
  );

  return {
    sessions: sessions.map((row) => revision(row, revisions)),
    feed: combineFeeds([longFeed, short]),
    feedRowCount: longFeed.rows.length,
    shortFeedRowCount: short.rows.length,
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
  'feedRowCount' | 'shortFeedRowCount'
>;

export const datasetCounts = (dataset: SeededDataset): SeedCounts => ({
  feedRowCount: dataset.feedRowCount,
  shortFeedRowCount: dataset.shortFeedRowCount,
});
