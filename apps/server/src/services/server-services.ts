import type { Services } from '@repo/api';
import type { Database } from '@repo/db';
import type { ActorRefFrom } from 'xstate';
import { createAgentService } from './agents';
import { createBlobService } from './blob';
import type { FeedActorRef } from './feed';
import { createFeedService } from './feed';
import type { writerMachine } from './feed';
import { createProjectService } from './projects';
import { createSessionReader, createSessionSnapshotWatcher } from './sessions';
import type { RegistryActorRef } from './sessions';
import type { SessionActorRef } from './sessions';
import { createSessionService } from './sessions';
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
    options.sessions.system.get(`session:${sessionId}`) as
      | SessionActorRef
      | undefined;
  const findFeed = (sessionId: string): FeedActorRef | undefined =>
    findSession(sessionId)?.getSnapshot().children.feed as
      | FeedActorRef
      | undefined;
  const findWriter = (): ActorRefFrom<typeof writerMachine> | undefined =>
    options.sessions.system.get('databaseWriter') as
      | ActorRefFrom<typeof writerMachine>
      | undefined;
  const session = createSessionService(options);
  return {
    blob: createBlobService(options),
    agents: createAgentService(options.sessions),
    projects: createProjectService(options.database),
    system: createSystemService(options),
    session,
    feed: createFeedService({
      database: options.database,
      readSession: createSessionReader(options.database),
      watchSessionSnapshot: createSessionSnapshotWatcher({
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
