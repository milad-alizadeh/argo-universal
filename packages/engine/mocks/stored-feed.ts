import type { FeedDeps } from '../src/feed';
import {
  createSessionReader,
  createSessionSnapshotWatcher,
} from '../src/sessions';
import { startSnapshotHost } from './session-snapshot';

// Feed sources for the closed `session-1` on a real database and Session snapshots; the test supplies its stored Checkout totals.
export function storedFeedSources(
  readStoredChangesSummary: FeedDeps['readStoredChangesSummary'],
): FeedDeps {
  const { sources, database } = startSnapshotHost();

  return {
    ...sources,
    readSession: createSessionReader(database),
    readStoredChangesSummary,
    watchSessionSnapshot: createSessionSnapshotWatcher(sources),
  };
}
