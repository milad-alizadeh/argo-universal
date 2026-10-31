import path from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { startOwnServer } from '@repo/e2e/own-server';
import type { AppFixtureAgents } from '@repo/mocks/agent/app-fixtures';
import type { GroupRelease } from '@repo/process';
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
  httpUrl: string;
  // The Project's git repository, which the diff scenarios write their changes into.
  projectPath: string;
  stop: () => Promise<GroupRelease>;
  // Stops the Server, awaits `whileStopped`, then starts it again on the same port and data.
  restart: (whileStopped: () => Promise<void>) => Promise<void>;
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

  const seed = options.feedContent === 'blank' ? blankedFeed : seededFeed;
  const feed = await seed(longSessionId, feedSize(options), context.now);

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
  'serverUrl' | 'httpUrl' | 'stop' | 'restart'
>;

function serverView(
  server: ServerProcess,
  counts: SeedCounts,
  requested: SeedConfiguration,
): Omit<SeededServer, 'projectPath'> {
  return {
    ...server,
    ...benchmarkTitles,
    sessionCount: requested.sessions,
    requested,
    ...counts,
  };
}

/*
 * Starts a fixture Server, gives it one real Session, then clones it into many Sessions and copies of the recorded Feeds.
 * `agents` sets the scenario the Server's Agents play; the template Session always runs the default.
 */
export async function startSeededServer(
  directory: string,
  options: SeedOptions = environmentSeedOptions(),
  agents: AppFixtureAgents = {},
): Promise<SeededServer> {
  const requested = seedConfiguration(options);
  await withTemplateSession(directory);
  const databasePath = path.join(directory, 'server-home', 'argo.db');
  const counts = await seedDatabase(databasePath, requested);
  const server = await startOwnServer(directory, agents);

  return {
    ...serverView(server, counts, requested),
    projectPath: path.join(directory, 'project'),
  };
}
