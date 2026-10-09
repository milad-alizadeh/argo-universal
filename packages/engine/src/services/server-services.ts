import type { Database } from '@repo/db';
import type { ActorRefFrom } from 'xstate';
import { createAgentService } from './agents';
import { createBlobService } from './blob';
import type { FeedActorRef } from './feed';
import { createFeedService, findDatabaseWriter } from './feed';
import type { writerMachine } from './feed';
import { createProjectService } from './projects';
import type { Services } from './services';
import { createSessionReader, createSessionSnapshotWatcher } from './sessions';
import type { RegistryActorRef } from './sessions';
import type { SessionActorRef } from './sessions';
import { findSessionActor } from './sessions';
import { createSystemService } from './system';

export function createServerServices(options: {
  database: Database;
  blobsFolder: string;
  sessions: RegistryActorRef;
  version: string;
  startedAt: string;
  createId?: () => string;
}): Services {
  const findSession = (sessionId: string): SessionActorRef | undefined =>
    findSessionActor(options.sessions.system, sessionId);
  const findFeed = (sessionId: string): FeedActorRef | undefined =>
    findSession(sessionId)?.getSnapshot().children.feed;
  const findWriter = (): ActorRefFrom<typeof writerMachine> | undefined =>
    findDatabaseWriter(options.sessions.system);
  return {
    blob: createBlobService(options),
    agents: createAgentService(options.sessions),
    projects: createProjectService(options.database),
    system: createSystemService(options),
    feed: createFeedService({
      database: options.database,
      readSession: createSessionReader(options.database),
      watchSessionSnapshot: createSessionSnapshotWatcher({
        sessions: options.sessions,
        database: options.database,
        findSession,
        findFeed,
        findWriter,
      }),
      findFeed,
      findWriter,
    }),
  };
}
