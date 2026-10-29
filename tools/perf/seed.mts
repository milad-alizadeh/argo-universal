import path from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { startOwnServer } from '@repo/e2e/own-server';
import type { GroupRelease } from '@repo/process';
import { writeBatches } from './seed-batches.mts';
import {
  datasetCounts,
  type SeedCounts,
  seededDataset,
  type SeededDataset,
} from './seed-dataset.mts';
import { type FeedSize, type SeededFeed, seededFeed } from './seed-feed.mts';
import {
  environmentSeedOptions,
  seedConfiguration,
  type SeedConfiguration,
  type SeedOptions,
} from './seed-options.mts';
import {
  benchmarkTitles,
  longSessionId,
  seedSessionRows,
  type SessionRow,
} from './seed-sessions.mts';
import { withTemplateSession } from './template-session.mts';

// A Server whose Project holds many Sessions, one of them with a long Feed, for the perf runs.
export interface SeededServer extends SeedCounts {
  serverUrl: string;
  longSessionTitle: string;
  shortSessionTitle: string;
  sessionCount: number;
  requested: SeedConfiguration;
  stop: () => Promise<GroupRelease>;
}

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

  const feed = await seededFeed(longSessionId, feedSize(options), context.now);

  return datasetFrom(context, feed);
}

async function seedDatabase(
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

type ServerProcess = Pick<
  Awaited<ReturnType<typeof startOwnServer>>,
  'serverUrl' | 'stop'
>;

function serverView(
  server: ServerProcess,
  counts: SeedCounts,
  requested: SeedConfiguration,
): SeededServer {
  return {
    serverUrl: server.serverUrl,
    ...benchmarkTitles,
    sessionCount: requested.sessions,
    requested,
    ...counts,
    stop: server.stop,
  };
}

// Starts a fixture Server, gives it one real Session, then clones it into many Sessions and copies of the recorded Feeds.
export async function startSeededServer(
  directory: string,
  options: SeedOptions = environmentSeedOptions(),
): Promise<SeededServer> {
  const requested = seedConfiguration(options);
  await withTemplateSession(directory);
  const databasePath = path.join(directory, 'server-home', 'argo.db');
  const counts = await seedDatabase(databasePath, requested);
  const server = await startOwnServer(directory, {});

  return serverView(server, counts, requested);
}
