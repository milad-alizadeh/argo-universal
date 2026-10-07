import type { Services } from '@repo/api';
import type { Database } from '@repo/db';
import type { ActorRefFrom } from 'xstate';
import { createAgentService } from './agents/agent-service';
import { createBlobService } from './blob/blob-service';
import type { FeedActorRef } from './feed/feed-machine';
import { createFeedService } from './feed/feed-service';
import type { writerMachine } from './feed/writer-machine';
import { createProjectService } from './projects/project-service';
import type { RegistryActorRef } from './sessions/registry-machine';
import type { SessionActorRef } from './sessions/session-machine';
import { createSessionService } from './sessions/session-service';
import { createSystemService } from './system';

export function createServerServices(options: {
  database: Database;
  blobsFolder: string;
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
    blob: createBlobService(options),
    agents: createAgentService(options.sessions),
    projects: createProjectService(options.database),
    system: createSystemService(options),
    session,
    feed: createFeedService({
      database: options.database,
      findSession,
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
