import path from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { startOwnServer } from '@repo/e2e/own-server';
import { type SeededFeed, seededFeed } from './seed-feed.mts';
import { withTemplateSession } from './template-session.mts';

// A Server whose Project holds many Sessions, one of them with a long Feed, for the perf runs.
export interface SeededServer {
  serverUrl: string;
  longSessionTitle: string;
  sessionCount: number;
  feedRowCount: number;
  stop: () => Promise<void>;
}

const longSessionId = 'perf-long-feed';

const titles = [
  'Fix flaky reconnect in the Connection machine',
  'Add search to the Sessions list',
  'Refactor the Feed view model',
  'Explain why the Inspector resizes',
  'Bump Expo and check the native build',
  'Write model-based tests for the drawer',
  'Port the glass sidebar to Electron',
  'Investigate slow catch-up after sleep',
];

const sessionCount = 240;

const feedCopies = 14;

const longSessionTitle = `${titles[0]} 0`;

type SessionRow = typeof session.$inferSelect;

const clone = (
  template: SessionRow,
  index: number,
  now: number,
): SessionRow => ({
  ...template,
  id: `perf-session-${index}`,
  title: `${titles[index % titles.length]} ${index}`,
  titleSource: 'user',
  activityAt: now - index * 60_000,
  vendorSessionId: null,
});

// The long Session, which holds `revision` Feed rows, then older copies of the template.
const clones = (
  template: SessionRow,
  revision: number,
  now: number,
): SessionRow[] =>
  Array.from({ length: sessionCount }, (_, index) =>
    clone(template, index, now),
  ).with(0, {
    ...clone(template, 0, now),
    id: longSessionId,
    maxRevision: revision,
    seenRevision: revision,
  });

function write(
  database: Database,
  sessions: SessionRow[],
  feed: SeededFeed,
): void {
  database.transaction((transaction) => {
    transaction.insert(session).values(sessions).run();
    transaction.insert(turn).values(feed.turns).run();
    transaction.insert(feedRow).values(feed.rows).run();
  });
}

// Clones the template Session `sessionCount` times, the first holding the long Feed.
async function seedDatabase(databasePath: string): Promise<number> {
  const database = openDatabase(databasePath);
  const template = database.select().from(session).limit(1).get();

  if (!template) throw new Error('The template Session is missing');
  const now = Date.now();
  const feed = await seededFeed(longSessionId, feedCopies, now);
  write(database, clones(template, feed.rows.length, now), feed);
  database.$client.close();

  return feed.rows.length;
}

// Starts a fixture Server, gives it one real Session, then clones it into many Sessions and copies of the recorded Feeds.
export async function startSeededServer(
  directory: string,
): Promise<SeededServer> {
  await withTemplateSession(directory);
  const databasePath = path.join(directory, 'server-home', 'argo.db');
  const feedRowCount = await seedDatabase(databasePath);
  const server = await startOwnServer(directory, {});

  return {
    serverUrl: server.serverUrl,
    longSessionTitle,
    sessionCount: sessionCount + 1,
    feedRowCount,
    stop: server.stop,
  };
}
