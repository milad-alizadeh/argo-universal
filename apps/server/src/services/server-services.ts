import type { Services } from '@repo/api';
import type { Database } from '@repo/db';
import type { ActorRefFrom } from 'xstate';
import type { FeedActorRef } from './feed/feed-machine';
import { createFeedService } from './feed/feed-service';
import type { writerMachine } from './feed/writer-machine';
import { notImplemented } from './not-implemented';
import type { RegistryActorRef } from './sessions/registry-machine';
import type { SessionActorRef } from './sessions/session-machine';
import { createSessionService } from './sessions/session-service';
import { createSystemService } from './system';

export function createServerServices(options: {
  database: Database;
  sessions: RegistryActorRef;
  version: string;
  startedAt: string;
  createId?: () => string;
}): Services {
  const findSession = (sessionId: string) =>
    options.sessions.system.get(`session:${sessionId}`) as
      | SessionActorRef
      | undefined;
  const session = createSessionService(options);
  return {
    agents: { list: notImplemented },
    projects: { list: notImplemented },
    system: createSystemService(options),
    session,
    feed: createFeedService({
      database: options.database,
      findSession,
      openSession: session.openSession,
      findFeed: (sessionId) =>
        findSession(sessionId)?.getSnapshot().children.feed as
          | FeedActorRef
          | undefined,
      findWriter: () =>
        options.sessions.system.get('databaseWriter') as
          | ActorRefFrom<typeof writerMachine>
          | undefined,
    }),
  };
}
