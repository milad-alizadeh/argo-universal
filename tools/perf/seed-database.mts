import { type Database, openDatabase } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { writeBatches } from './seed-batches.mts';
import {
  datasetCounts,
  type SeedCounts,
  seededDataset,
  type SeededDataset,
} from './seed-dataset.mts';
import {
  blankedFeed,
  type FeedSize,
  type SeededFeed,
  seededFeed,
} from './seed-feed.mts';
import type { SeedConfiguration } from './seed-options.mts';
import {
  longSessionId,
  seedSessionRows,
  type SessionRow,
} from './seed-sessions.mts';

/*
 * Clones the one real Session a launcher left behind into the dataset a perf run scrolls: many
 * Sessions, one of them holding copies of the recorded Feeds. It writes only columns the Server
 * itself wrote, so the clones carry whatever the template carried, its Agent and its pinned
 * configuration included.
 */

const feedCopies = 14;

type SeedData = Pick<SeededDataset, 'sessions' | 'feed'>;

function write(database: Database, data: SeedData): void {
  database.transaction((transaction) => {
    writeBatches(data.sessions, (rows) =>
      transaction.insert(session).values(rows).run(),
    );
    writeBatches(data.feed.turns, (rows) =>
      transaction.insert(turn).values(rows).run(),
    );
    writeBatches(data.feed.rows, (rows) =>
      transaction.insert(feedRow).values(rows).run(),
    );
  });
}

interface DatasetContext {
  template: SessionRow;
  options: SeedConfiguration;
  now: number;
}

function readTemplate(database: Database): SessionRow {
  const template = database.select().from(session).limit(1).get();

  if (!template) throw new Error('The template Session is missing');

  return template;
}

const feedSize = (options: SeedConfiguration): FeedSize =>
  options.feedRows ? { rows: options.feedRows } : { copies: feedCopies };

function datasetFrom(
  context: DatasetContext,
  feed: SeededFeed,
): Promise<SeededDataset> {
  const { template, options, now } = context;

  const sessions = seedSessionRows({
    template,
    revision: feed.rows.length,
    now,
    count: options.sessions,
  });

  return seededDataset(sessions, feed, now);
}

// The requested Session total includes the original template; one clone holds the long Feed.
async function prepareDataset(
  database: Database,
  options: SeedConfiguration,
): Promise<SeededDataset> {
  const context = {
    template: readTemplate(database),
    options,
    now: Date.now(),
  };

  const seed = options.feedContent === 'blank' ? blankedFeed : seededFeed;
  const feed = await seed(longSessionId, feedSize(options), context.now);

  return datasetFrom(context, feed);
}

export async function seedDatabase(
  databasePath: string,
  options: SeedConfiguration,
): Promise<SeedCounts> {
  const database = openDatabase(databasePath);

  try {
    const dataset = await prepareDataset(database, options);
    write(database, dataset);

    return datasetCounts(dataset);
  } finally {
    database.$client.close();
  }
}
